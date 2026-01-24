import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";

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
        // If no team ID (e.g. admin or player), return empty or appropriate response
        if (!teamId) {
          // For now, let's return all if it's a demo or just empty
          // But adhering to the requested route availability:
          // If this is for the "Federation Letters" page in Team Portal, it needs data.
          // Let's fallback to "demo-team" if that's the convention, or return empty.
          // Checking invitation-letters.ts: const teamId = req.session.teamId || "demo-team";
          // I ll use the same convention.
          const demoTeamId = "demo-team";
          const requests =
            await storage.getFederationLetterRequests(demoTeamId);
          return res.json(requests);
        }

        const requests = await storage.getFederationLetterRequests(teamId);
        res.json(requests);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  // Get Team's Request Summary
  app.get(
    "/api/federation-letter-requests/summary",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const teamId = req.session.teamId || "demo-team";
        const requests = await storage.getFederationLetterRequests(teamId);

        const summary = {
          total: requests.length,
          pending: requests.filter(
            (r) => r.status === "processing" || r.status === "submitted",
          ).length,
          issued: requests.filter((r) => r.status === "issued").length,
          rejected: requests.filter((r) => r.status === "rejected").length,
        };

        res.json(summary);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  // Federation Admin - Dashboard Stats
  app.get(
    "/api/federation-admin/dashboard-stats",
    requireAuth, // Add requireFederationAdmin later if needed
    async (req: Request, res: Response) => {
      try {
        const requests = await storage.getFederationLetterRequests();
        const processed = requests.filter((r) => r.status === "issued").length;
        const pending = requests.filter(
          (r) => r.status === "submitted" || r.status === "processing",
        ).length;

        // Calculate revenue
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
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  // Federation Admin - Get All Requests
  app.get(
    "/api/federation-admin/requests",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const requests = await storage.getFederationLetterRequests();
        // Filter by status if query param exists
        const status = req.query.status as string;
        if (status && status !== "all") {
          return res.json(requests.filter((r) => r.status === status));
        }
        res.json(requests);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  // Federation Admin - Fee Schedules
  app.get(
    "/api/federation-admin/fee-schedules",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const schedules = await storage.getAllFederationFeeSchedules();
        res.json(schedules);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
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
          federationId: req.session.userId || "demo-federation", // Fallback for demo
          platformServiceCharge: 25, // Default platform charge
          isActive: true,
        });
        res.json(schedule);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  // Fee Schedule Delete
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
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  // Accept Request
  app.post(
    "/api/federation-admin/requests/:id/accept",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const request = await storage.updateFederationLetterRequest(
          req.params.id,
          {
            status: "processing",
          },
        );

        await storage.createFederationRequestActivity({
          requestId: req.params.id,
          activityType: "status_change",
          description: "Request accepted and moved to processing",
          actorId: req.session.userId,
          actorName: "Federation Admin",
          actorRole: "federation_admin",
        });

        res.json(request);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  // Reject Request
  app.post(
    "/api/federation-admin/requests/:id/reject",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { rejectionReason } = req.body;
        const request = await storage.updateFederationLetterRequest(
          req.params.id,
          {
            status: "rejected",
            rejectionReason,
          },
        );

        await storage.createFederationRequestActivity({
          requestId: req.params.id,
          activityType: "rejected",
          description: `Request rejected: ${rejectionReason}`,
          actorId: req.session.userId,
          actorName: "Federation Admin",
          actorRole: "federation_admin",
        });

        res.json(request);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  // Issue Document (Complete Request)
  app.post(
    "/api/federation-admin/requests/:id/issue",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const {
          issuedDocumentStorageKey,
          issuedDocumentObjectPath,
          issuedDocumentOriginalName,
          mimeType,
          fileSize,
        } = req.body;

        // Update request status
        const request = await storage.updateFederationLetterRequest(
          req.params.id,
          {
            status: "issued",
            issuedDocumentObjectPath: issuedDocumentObjectPath, // Correct field
            issuedAt: new Date(),
          },
        );
        // Create issued document record
        await storage.createFederationIssuedDocument({
          requestId: req.params.id,
          documentType: "invitation_letter",
          storageKey: issuedDocumentStorageKey,
          objectPath: issuedDocumentObjectPath,
          originalName: issuedDocumentOriginalName,
          mimeType,
          fileSize,
          issuedBy: req.session.userId!,
        });

        await storage.createFederationRequestActivity({
          requestId: req.params.id,
          activityType: "document_issued",
          description: "Federation letter issued",
          actorId: req.session.userId,
          actorName: "Federation Admin",
          actorRole: "federation_admin",
        });

        res.json(request);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
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
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  app.post(
    "/api/federation-requests/:id/messages",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const message = await storage.createFederationRequestMessage({
          requestId: req.params.id,
          senderId: req.session.userId!,
          senderName: req.body.senderName || "User",
          senderPortal: req.body.senderPortal || "federation",
          senderRole: "federation_admin",
          recipientPortal: "team",
          content: req.body.content,
          isRead: false,
        });

        await storage.createFederationRequestActivity({
          requestId: req.params.id,
          activityType: "message_sent",
          description: "New message sent",
          actorId: req.session.userId,
          actorName: "Federation Admin",
          actorRole: "federation_admin",
        });

        res.json(message);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );
}
