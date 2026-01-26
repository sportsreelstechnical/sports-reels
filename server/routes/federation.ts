import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { insertFederationLetterRequestSchema } from "@shared/schema";

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
        const teamId = req.session.teamId;
        if (!teamId) return res.json([]);

        const requests = await storage.getFederationLetterRequests(teamId);
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

        if (!teamId || !userId) {
          return res
            .status(401)
            .json({ error: "Unauthorized: Team and user session required" });
        }

        const requestNumber = `REQ-${Date.now().toString().slice(-6)}`;
        const requestData = insertFederationLetterRequestSchema.parse({
          ...req.body,
          requestNumber,
          teamId,
          status: "pending",
          paymentStatus: "unpaid",
          // Default fees could be fetched from a centralized config or DB in future
          feeAmount: 1000,
          serviceCharge: 150,
          totalAmount: 1150,
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

  // Confirm Payment
  app.post(
    "/api/federation-letter-requests/:id/confirm-payment",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const request = await storage.getFederationLetterRequest(id);
        if (!request)
          return res.status(404).json({ error: "Request not found" });

        const updatedRequest = await storage.updateFederationLetterRequest(id, {
          paymentStatus: "paid",
          paymentId: req.body.paymentId,
          paymentConfirmedAt: new Date(),
        });

        res.json(updatedRequest);
      } catch (error) {
        handleError(res, error);
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
          (sum, r) => sum + (r.totalAmount || 0),
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
