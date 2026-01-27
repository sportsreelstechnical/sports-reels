import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { insertFederationLetterRequestSchema } from "@shared/schema";
import axios from "axios";

/**
 * Standard error handler helper
 */
const handleError = (res: Response, error: unknown, status = 500) => {
  const message =
    error instanceof Error ? error.message : "An unknown error occurred";
  res.status(status).json({ error: message });
};

/**
 * Helper to log federation activities
 */
const logActivity = async (
  requestId: string,
  activityType: string,
  description: string,
  sessionInfo: { userId?: string; role?: string; name?: string },
  metadata?: any,
) => {
  try {
    const { userId, role = "team_admin", name = "Team User" } = sessionInfo;
    await storage.createFederationRequestActivity({
      requestId,
      activityType,
      description,
      actorId: userId,
      actorName: name,
      actorRole: role,
      ...metadata,
    });
  } catch (err) {
    console.error(`Failed to log activity for request ${requestId}:`, err);
  }
};

export function registerFederationRoutes(app: Express): void {
  // ==========================================
  // Team Portal Routes
  // ==========================================

  // Get Team's Federation Letter Requests
  app.get(
    "/api/federation-letter-requests",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { teamId, userId } = req.session;
        if (!teamId && !userId) return res.json([]); // Ensure at least one identifier is present

        const requests = await storage.getFederationLetterRequests(
          (teamId || userId) as string,
        );
        res.json(requests);
      } catch (error) {
        handleError(res, error);
      }
    },
  );

  // Create Federation Letter Request
  app.post(
    "/api/federation-letter-requests",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { teamId, userId } = req.session;

        if (!userId) {
          return res
            .status(401)
            .json({ error: "Unauthorized: User session required" });
        }

        const requestNumber = `REQ-${Date.now().toString().slice(-6)}`;
        const requestData = insertFederationLetterRequestSchema.parse({
          ...req.body,
          requestNumber,
          teamId: (teamId || userId) as string, // Use teamId if available, otherwise userId
          status: "pending",
          paymentStatus: "unpaid",
          // Default fees could be fetched from a centralized config or DB in future
          feeAmount: 225000, // NGN 225,000
          serviceCharge: 37500, // NGN 37,500
          totalAmount: 262500, // NGN 262,500
        });

        const request =
          await storage.createFederationLetterRequest(requestData);

        await logActivity(
          request.id,
          "status_change",
          "Request created (Draft)",
          {
            userId,
            name: "Team User",
            role: "team_admin",
          },
          { newStatus: "pending" },
        );

        res.status(201).json(request);
      } catch (error) {
        handleError(res, error, 400);
      }
    },
  );

  // Paystack: Initialize Payment for Federation Request
  app.post(
    "/api/federation-letter-requests/:id/pay/initialize",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { userId } = req.session;

        const request = await storage.getFederationLetterRequest(id);
        if (!request)
          return res.status(404).json({ error: "Request not found" });

        const user = await storage.getUser(userId || "");
        if (!user) return res.status(404).json({ error: "User not found" });

        const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
        const PAYSTACK_CURRENCY = process.env.PAYSTACK_CURRENCY || "NGN";

        if (
          !PAYSTACK_SECRET_KEY ||
          PAYSTACK_SECRET_KEY === "sk_test_placeholder"
        ) {
          return res.status(400).json({
            error: "Paystack API key is not configured.",
          });
        }

        const amountInCents = Math.round((request.totalAmount || 0) * 100);

        const response = await axios.post(
          "https://api.paystack.co/transaction/initialize",
          {
            email: user.email || `${user.username}@sportsreels.ai`,
            amount: amountInCents,
            currency: PAYSTACK_CURRENCY,
            // TODO: Add subaccount/split code here for automatic splitting
            // subaccount: "ACCT_xxxx",
            // transaction_charge: 3750000, // charge in kobo
            // bearer: "subaccount",
            callback_url: `${process.env.FRONTEND_URL}/federation-letters?status=verify&requestId=${id}`,
            metadata: {
              requestId: id,
              userId: userId,
              type: "federation_letter_request",
            },
          },
          {
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
          },
        );

        res.json(response.data);
      } catch (error: any) {
        const message = error.response?.data?.message || error.message;
        console.error("Paystack init error:", message);
        res
          .status(500)
          .json({ error: "Failed to initialize payment", details: message });
      }
    },
  );

  // Paystack: Verify Payment
  app.get(
    "/api/federation-letter-requests/pay/verify/:reference",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { reference } = req.params;
        const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

        const response = await axios.get(
          `https://api.paystack.co/transaction/verify/${reference}`,
          {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
          },
        );

        const data = response.data.data;

        if (data.status === "success") {
          const requestId = data.metadata.requestId;

          await storage.updateFederationLetterRequest(requestId, {
            paymentStatus: "paid",
            paymentId: reference,
            paymentConfirmedAt: new Date(),
          });

          await logActivity(
            requestId,
            "status_change",
            "Payment confirmed via Paystack",
            {
              userId: req.session.userId,
              name: "System",
              role: "system",
            },
          );

          res.json({ success: true, requestId });
        } else {
          res.status(400).json({
            error: "Payment verification failed",
            status: data.status,
          });
        }
      } catch (error: any) {
        const message = error.response?.data?.message || error.message;
        res
          .status(500)
          .json({ error: "Failed to verify payment", details: message });
      }
    },
  );

  // Submit Request
  app.post(
    "/api/federation-letter-requests/:id/submit",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { userId } = req.session;
        const request = await storage.getFederationLetterRequest(id);

        if (!request)
          return res.status(404).json({ error: "Request not found" });
        if (request.paymentStatus !== "paid") {
          return res
            .status(400)
            .json({ error: "Payment required before submission" });
        }

        const updatedRequest = await storage.updateFederationLetterRequest(id, {
          status: "submitted",
          submittedAt: new Date(),
        });

        await logActivity(
          id,
          "status_change",
          "Request submitted for processing",
          {
            userId,
            name: "Team User",
            role: "team_admin",
          },
          { previousStatus: "pending", newStatus: "submitted" },
        );

        // Auto-create initial message
        await storage.createFederationRequestMessage({
          requestId: id,
          senderId: userId || "system",
          senderName: "System",
          senderPortal: "team",
          senderRole: "system",
          recipientPortal: "federation",
          content: `New request submitted for ${request.athleteFullName} to ${request.targetClubName}.`,
          isRead: false,
        });

        res.json(updatedRequest);
      } catch (error) {
        handleError(res, error);
      }
    },
  );

  // Delete Request
  app.delete(
    "/api/federation-letter-requests/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { teamId } = req.session;

        if (!teamId) return res.status(401).json({ error: "Unauthorized" });

        const request = await storage.getFederationLetterRequest(id);
        if (!request)
          return res.status(404).json({ error: "Request not found" });

        if (request.teamId !== teamId) {
          return res.status(403).json({ error: "Access denied" });
        }

        await storage.deleteFederationLetterRequest(id);
        res.json({ success: true });
      } catch (error) {
        handleError(res, error);
      }
    },
  );

  // Summary Stats
  app.get(
    "/api/federation-letter-requests/summary",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const teamId = req.session.teamId;
        if (!teamId)
          return res.json({ total: 0, pending: 0, issued: 0, rejected: 0 });

        const requests = await storage.getFederationLetterRequests(teamId);
        const summary = {
          total: requests.length,
          pending: requests.filter((r) =>
            ["processing", "submitted"].includes(r.status),
          ).length,
          issued: requests.filter((r) => r.status === "issued").length,
          rejected: requests.filter((r) => r.status === "rejected").length,
        };

        res.json(summary);
      } catch (error) {
        handleError(res, error);
      }
    },
  );

  // ==========================================
  // Federation Admin Portal Routes
  // ==========================================

  // Dashboard Stats
  app.get(
    "/api/federation-admin/dashboard-stats",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const requests = await storage.getFederationLetterRequests();
        const processed = requests.filter((r) => r.status === "issued").length;
        const pending = requests.filter((r) =>
          ["submitted", "processing"].includes(r.status),
        ).length;
        const totalRevenue = requests.reduce(
          (sum, r) => sum + (r.feeAmount || 0), // Only count federation fee portion
          0,
        );

        res.json({
          totalRequests: requests.length,
          processed,
          pending,
          totalRevenue,
        });
      } catch (error) {
        handleError(res, error);
      }
    },
  );

  // Get All Requests (Admin)
  app.get(
    "/api/federation-admin/requests",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const requests = await storage.getFederationLetterRequests();
        const status = req.query.status as string;

        if (status && status !== "all") {
          return res.json(requests.filter((r) => r.status === status));
        }
        res.json(requests);
      } catch (error) {
        handleError(res, error);
      }
    },
  );

  // Fee Schedules
  app.get(
    "/api/federation-admin/fee-schedules",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const schedules = await storage.getAllFederationFeeSchedules();
        res.json(schedules);
      } catch (error) {
        handleError(res, error);
      }
    },
  );

  app.post(
    "/api/federation-admin/fee-schedules",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const schedule = await storage.createFederationFeeSchedule({
          ...req.body,
          federationId: req.session.userId || "demo-federation",
          platformServiceCharge: 25,
          isActive: true,
        });
        res.json(schedule);
      } catch (error) {
        handleError(res, error);
      }
    },
  );

  app.delete(
    "/api/federation-admin/fee-schedules/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        await storage.updateFederationFeeSchedule(req.params.id, {
          isActive: false,
        });
        res.json({ success: true });
      } catch (error) {
        handleError(res, error);
      }
    },
  );

  // Accept Request
  app.post(
    "/api/federation-admin/requests/:id/accept",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const request = await storage.updateFederationLetterRequest(id, {
          status: "processing",
        });

        await logActivity(
          id,
          "status_change",
          "Request accepted and moved to processing",
          {
            userId: req.session.userId,
            name: "Federation Admin",
            role: "federation_admin",
          },
        );

        res.json(request);
      } catch (error) {
        handleError(res, error);
      }
    },
  );

  // Reject Request
  app.post(
    "/api/federation-admin/requests/:id/reject",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { rejectionReason } = req.body;
        const request = await storage.updateFederationLetterRequest(id, {
          status: "rejected",
          rejectionReason,
        });

        await logActivity(
          id,
          "rejected",
          `Request rejected: ${rejectionReason}`,
          {
            userId: req.session.userId,
            name: "Federation Admin",
            role: "federation_admin",
          },
        );

        res.json(request);
      } catch (error) {
        handleError(res, error);
      }
    },
  );

  // Issue Document
  app.post(
    "/api/federation-admin/requests/:id/issue",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const {
          issuedDocumentStorageKey,
          issuedDocumentObjectPath,
          issuedDocumentOriginalName,
          mimeType,
          fileSize,
        } = req.body;

        const request = await storage.updateFederationLetterRequest(id, {
          status: "issued",
          issuedDocumentObjectPath,
          issuedAt: new Date(),
        });

        await storage.createFederationIssuedDocument({
          requestId: id,
          documentType: "invitation_letter",
          storageKey: issuedDocumentStorageKey,
          objectPath: issuedDocumentObjectPath,
          originalName: issuedDocumentOriginalName,
          mimeType,
          fileSize,
          issuedBy: req.session.userId!,
        });

        await logActivity(id, "document_issued", "Federation letter issued", {
          userId: req.session.userId,
          name: "Federation Admin",
          role: "federation_admin",
        });

        res.json(request);
      } catch (error) {
        handleError(res, error);
      }
    },
  );

  // Messages
  app.get(
    "/api/federation-requests/:id/messages",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const messages = await storage.getFederationRequestMessages(
          req.params.id,
        );
        res.json(messages);
      } catch (error) {
        handleError(res, error);
      }
    },
  );

  app.post(
    "/api/federation-requests/:id/messages",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { userId } = req.session;

        const message = await storage.createFederationRequestMessage({
          requestId: id,
          senderId: userId!,
          senderName: req.body.senderName || "User",
          senderPortal: req.body.senderPortal || "federation",
          senderRole: "federation_admin", // This might need to be dynamic depending on who hits this endpoint
          recipientPortal: "team",
          content: req.body.content,
          isRead: false,
        });

        await logActivity(id, "message_sent", "New message sent", {
          userId,
          name: "Federation Admin",
          role: "federation_admin",
        });

        res.json(message);
      } catch (error) {
        handleError(res, error);
      }
    },
  );
}
