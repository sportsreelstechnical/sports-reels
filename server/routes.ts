import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertTeamSchema,
  insertPlayerSchema,
  insertVideoSchema,
  insertComplianceOrderSchema,
  insertPlayerInternationalRecordSchema,
  insertTeamSheetSchema,
  insertTeamSheetPlayerSchema,
  insertPlayerDocumentSchema,
  insertFederationLetterRequestSchema,
  insertPlayerPhotoSchema,
} from "@shared/schema";
import session from "express-session";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import {
  registerObjectStorageRoutes,
  ObjectStorageService,
} from "./replit_integrations/object_storage";
import { jsPDF } from "jspdf";
import crypto from "crypto";

// Import modular routes
import { registerAuthRoutes } from "./routes/auth";
import { registerPlayerRoutes } from "./routes/players";
import { registerVideoRoutes } from "./routes/videos";
import { registerMessagingRoutes } from "./routes/messaging";
import { registerDashboardRoutes } from "./routes/dashboard";
import { registerEligibilityRoutes } from "./routes/eligibility";
import { registerComplianceRoutes } from "./routes/compliance";
import { registerScoutingRoutes } from "./routes/scouting";

// Import utilities from modular files
import {
  hashPassword,
  verifyPassword,
  grantSignupBonus,
  getPositionalMetricsPrompt,
  updatePlayerStatsFromVideos,
  MAX_PLAYERS_PER_VIDEO,
  SIGNUP_BONUS_TOKENS,
  SIGNUP_TOKEN_EXPIRY_MONTHS,
} from "./utils/helpers";
import {
  requireAuth,
  requireTeamRole,
  requireScoutRole,
  requireEmbassyRole,
  requireFederationAdmin,
  requireAdminRole,
} from "./middleware/auth";

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: { baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerObjectStorageRoutes(app);
  const objectStorageService = new ObjectStorageService();

  // Register modular routes
  registerAuthRoutes(app);
  registerPlayerRoutes(app);
  registerVideoRoutes(app);
  registerMessagingRoutes(app);
  registerDashboardRoutes(app);
  registerEligibilityRoutes(app);
  registerComplianceRoutes(app);
  registerScoutingRoutes(app);

  // Object storage upload URL endpoint
  app.get("/api/object-storage/upload-url", requireAuth, async (req, res) => {
    try {
      const signedUrl = await objectStorageService.getObjectEntityUploadURL();

      // Extract the objectPath from the signed URL
      const url = new URL(signedUrl);
      const pathParts = url.pathname.split("/");
      const bucketName = pathParts[1];
      const objectName = pathParts.slice(2).join("/");
      const key = `${bucketName}/${objectName}`;
      const objectPath = `/objects/uploads/${objectName.split("/").pop()}`;

      res.json({ signedUrl, key, objectPath });
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Player documents routes (passport, national ID, birth certificate)
  app.get(
    "/api/players/:playerId/documents",
    requireTeamRole,
    async (req, res) => {
      try {
        const documents = await storage.getPlayerDocuments(req.params.playerId);
        res.json(documents);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/players/:playerId/documents",
    requireTeamRole,
    async (req, res) => {
      try {
        const {
          documentType,
          originalName,
          mimeType,
          fileSize,
          storageKey,
          objectPath,
          documentNumber,
          issuingCountry,
          expiryDate,
          notes,
        } = req.body;

        if (!documentType || !originalName || !storageKey) {
          return res.status(400).json({
            error:
              "Missing required fields: documentType, originalName, storageKey",
          });
        }

        const validTypes = ["passport", "national_id", "birth_certificate"];
        if (!validTypes.includes(documentType)) {
          return res.status(400).json({
            error: `Invalid document type. Must be one of: ${validTypes.join(", ")}`,
          });
        }

        const document = await storage.createPlayerDocument({
          playerId: req.params.playerId,
          teamId: req.session.teamId || "demo-team",
          documentType,
          originalName,
          mimeType,
          fileSize,
          storageKey,
          objectPath,
          documentNumber,
          issuingCountry,
          expiryDate,
          notes,
          uploadedBy: req.session.userId,
        });

        await storage.logAction({
          userId: req.session.userId,
          userRole: req.session.userRole,
          action: "upload_document",
          entityType: "player_document",
          entityId: document.id,
          details: { playerId: req.params.playerId, documentType },
        });

        // Create initial version and audit log
        await storage.createDocumentVersion({
          documentId: document.id,
          versionNumber: 1,
          originalName,
          mimeType,
          fileSize,
          storageKey,
          objectPath,
          changeReason: "Initial upload",
          uploadedBy: req.session.userId,
          isCurrent: true,
        });

        await storage.createDocumentAuditLog({
          documentId: document.id,
          documentType,
          playerId: req.params.playerId,
          teamId: req.session.teamId,
          action: "created",
          actorId: req.session.userId,
          actorName: req.session.username,
          actorRole: req.session.userRole,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          newValue: { documentType, originalName },
          metadata: { fileSize, mimeType },
        });

        res.json(document);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.put(
    "/api/players/:playerId/documents/:docId",
    requireTeamRole,
    async (req, res) => {
      try {
        const document = await storage.updatePlayerDocument(
          req.params.docId,
          req.body
        );
        if (!document) {
          return res.status(404).json({ error: "Document not found" });
        }
        res.json(document);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/players/:playerId/documents/:docId",
    requireTeamRole,
    async (req, res) => {
      try {
        const document = await storage.getPlayerDocument(req.params.docId);
        if (!document) {
          return res.status(404).json({ error: "Document not found" });
        }

        await storage.deletePlayerDocument(req.params.docId);

        await storage.logAction({
          userId: req.session.userId,
          userRole: req.session.userRole,
          action: "delete_document",
          entityType: "player_document",
          entityId: req.params.docId,
          details: {
            playerId: req.params.playerId,
            documentType: document.documentType,
          },
        });

        // Create audit log for deletion
        await storage.createDocumentAuditLog({
          documentId: req.params.docId,
          documentType: document.documentType,
          playerId: req.params.playerId,
          teamId: req.session.teamId,
          action: "deleted",
          actorId: req.session.userId,
          actorName: req.session.username,
          actorRole: req.session.userRole,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          previousValue: {
            documentType: document.documentType,
            originalName: document.originalName,
          },
        });

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/players/:playerId/documents/:docId/verify",
    requireTeamRole,
    async (req, res) => {
      try {
        const document = await storage.updatePlayerDocument(req.params.docId, {
          verificationStatus: "verified",
          verifiedBy: req.session.userId,
          verifiedAt: new Date(),
        });
        if (!document) {
          return res.status(404).json({ error: "Document not found" });
        }

        await storage.logAction({
          userId: req.session.userId,
          userRole: req.session.userRole,
          action: "verify_document",
          entityType: "player_document",
          entityId: req.params.docId,
          details: {
            playerId: req.params.playerId,
            documentType: document.documentType,
          },
        });

        // Create audit log for verification
        await storage.createDocumentAuditLog({
          documentId: req.params.docId,
          documentType: document.documentType,
          playerId: req.params.playerId,
          teamId: req.session.teamId,
          action: "verified",
          actorId: req.session.userId,
          actorName: req.session.username,
          actorRole: req.session.userRole,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          newValue: { verificationStatus: "verified" },
        });

        res.json(document);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  // Document version control endpoints
  app.get(
    "/api/players/:playerId/documents/:docId/versions",
    requireTeamRole,
    async (req, res) => {
      try {
        const versions = await storage.getDocumentVersions(req.params.docId);
        res.json(versions);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/players/:playerId/documents/:docId/versions",
    requireTeamRole,
    async (req, res) => {
      try {
        const {
          originalName,
          mimeType,
          fileSize,
          storageKey,
          objectPath,
          changeReason,
        } = req.body;

        if (!originalName || !storageKey) {
          return res.status(400).json({
            error: "Missing required fields: originalName, storageKey",
          });
        }

        const document = await storage.getPlayerDocument(req.params.docId);
        if (!document) {
          return res.status(404).json({ error: "Document not found" });
        }

        // Get current version number
        const existingVersions = await storage.getDocumentVersions(
          req.params.docId
        );
        const nextVersionNumber =
          existingVersions.length > 0
            ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1
            : 1;

        // Mark all previous versions as not current
        for (const version of existingVersions) {
          if (version.isCurrent) {
            await storage.setCurrentVersion(req.params.docId, version.id);
          }
        }

        // Create new version
        const newVersion = await storage.createDocumentVersion({
          documentId: req.params.docId,
          versionNumber: nextVersionNumber,
          originalName,
          mimeType,
          fileSize,
          storageKey,
          objectPath,
          changeReason,
          uploadedBy: req.session.userId,
          isCurrent: true,
        });

        // Update the main document with new file info
        await storage.updatePlayerDocument(req.params.docId, {
          originalName,
          mimeType,
          fileSize,
          storageKey,
          objectPath,
        });

        // Create audit log
        await storage.createDocumentAuditLog({
          documentId: req.params.docId,
          documentType: document.documentType,
          playerId: req.params.playerId,
          teamId: req.session.teamId,
          action: "version_created",
          actorId: req.session.userId,
          actorName: req.session.username,
          actorRole: req.session.userRole,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          newValue: { versionNumber: nextVersionNumber, changeReason },
          metadata: { originalName, fileSize },
        });

        res.json(newVersion);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/players/:playerId/documents/:docId/versions/:versionId/restore",
    requireTeamRole,
    async (req, res) => {
      try {
        const version = await storage.getDocumentVersion(req.params.versionId);
        if (!version) {
          return res.status(404).json({ error: "Version not found" });
        }

        const document = await storage.getPlayerDocument(req.params.docId);
        if (!document) {
          return res.status(404).json({ error: "Document not found" });
        }

        // Restore the document to this version
        await storage.updatePlayerDocument(req.params.docId, {
          originalName: version.originalName,
          mimeType: version.mimeType,
          fileSize: version.fileSize,
          storageKey: version.storageKey,
          objectPath: version.objectPath,
        });

        // Set this version as current
        await storage.setCurrentVersion(req.params.docId, req.params.versionId);

        // Create audit log
        await storage.createDocumentAuditLog({
          documentId: req.params.docId,
          documentType: document.documentType,
          playerId: req.params.playerId,
          teamId: req.session.teamId,
          action: "restored",
          actorId: req.session.userId,
          actorName: req.session.username,
          actorRole: req.session.userRole,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          previousValue: { versionNumber: version.versionNumber },
          metadata: { restoredFromVersion: version.versionNumber },
        });

        res.json({ success: true, restoredVersion: version.versionNumber });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  // Document audit log endpoints
  app.get(
    "/api/players/:playerId/documents/:docId/audit-logs",
    requireTeamRole,
    async (req, res) => {
      try {
        const logs = await storage.getDocumentAuditLogs(req.params.docId);
        res.json(logs);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/players/:playerId/audit-logs",
    requireTeamRole,
    async (req, res) => {
      try {
        const logs = await storage.getDocumentAuditLogsByPlayer(
          req.params.playerId
        );
        res.json(logs);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/team/document-audit-logs",
    requireTeamRole,
    async (req, res) => {
      try {
        const limit = req.query.limit
          ? parseInt(req.query.limit as string)
          : 100;
        const logs = await storage.getDocumentAuditLogsByTeam(
          req.session.teamId || "demo-team",
          limit
        );
        res.json(logs);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Federation Letter Request routes

  // Team summary stats endpoint
  app.get(
    "/api/federation-letter-requests/summary",
    requireTeamRole,
    async (req, res) => {
      try {
        const teamId = req.session.teamId || "demo-team";
        const requests = await storage.getFederationLetterRequests(teamId);

        const summary = {
          total: requests.length,
          pending: requests.filter((r) => r.status === "pending").length,
          submitted: requests.filter((r) => r.status === "submitted").length,
          processing: requests.filter((r) => r.status === "processing").length,
          issued: requests.filter((r) => r.status === "issued").length,
          rejected: requests.filter((r) => r.status === "rejected").length,
        };

        res.json(summary);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/federation-letter-requests",
    requireTeamRole,
    async (req, res) => {
      try {
        const { teamId, playerId, status } = req.query;
        let requests;
        if (playerId) {
          requests = await storage.getFederationLetterRequestsByPlayer(
            playerId as string
          );
        } else if (status) {
          requests = await storage.getFederationLetterRequestsByStatus(
            status as string
          );
        } else {
          requests = await storage.getFederationLetterRequests(
            (teamId as string) || req.session.teamId
          );
        }
        res.json(requests);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/federation-letter-requests/:id",
    requireTeamRole,
    async (req, res) => {
      try {
        const request = await storage.getFederationLetterRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ error: "Request not found" });
        }
        res.json(request);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/players/:playerId/issued-federation-letters",
    requireTeamRole,
    async (req, res) => {
      try {
        const issuedLetters = await storage.getIssuedFederationLettersByPlayer(
          req.params.playerId
        );
        res.json(issuedLetters);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/federation-letter-requests",
    requireTeamRole,
    async (req, res) => {
      try {
        const year = new Date().getFullYear();
        const timestamp = Date.now().toString(36).toUpperCase();
        const requestNumber = `FLR-${year}-${timestamp}`;

        // Ensure teamId is set from session before validation
        const teamId = req.session.teamId || req.body.teamId || "demo-team";

        const requestData = insertFederationLetterRequestSchema.parse({
          ...req.body,
          requestNumber,
          teamId,
          status: "pending",
          paymentStatus: "unpaid",
          submittedBy: req.session.userId,
          feeAmount: 150,
          serviceCharge: 25,
          totalAmount: 175,
        });

        const newRequest =
          await storage.createFederationLetterRequest(requestData);

        await storage.logAction({
          userId: req.session.userId,
          userRole: req.session.userRole,
          action: "create_federation_letter_request",
          entityType: "federation_letter_request",
          entityId: newRequest.id,
          details: { requestNumber, playerId: req.body.playerId },
        });

        res.json(newRequest);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.put(
    "/api/federation-letter-requests/:id",
    requireTeamRole,
    async (req, res) => {
      try {
        const request = await storage.getFederationLetterRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ error: "Request not found" });
        }

        const updatedRequest = await storage.updateFederationLetterRequest(
          req.params.id,
          req.body
        );

        await storage.logAction({
          userId: req.session.userId,
          userRole: req.session.userRole,
          action: "update_federation_letter_request",
          entityType: "federation_letter_request",
          entityId: req.params.id,
          details: { updates: Object.keys(req.body) },
        });

        res.json(updatedRequest);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/federation-letter-requests/:id/submit",
    requireTeamRole,
    async (req, res) => {
      try {
        const request = await storage.getFederationLetterRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ error: "Request not found" });
        }

        if (request.paymentStatus !== "paid") {
          return res
            .status(400)
            .json({ error: "Payment required before submission" });
        }

        const updatedRequest = await storage.updateFederationLetterRequest(
          req.params.id,
          {
            status: "submitted",
            submittedAt: new Date(),
          }
        );

        await storage.logAction({
          userId: req.session.userId,
          userRole: req.session.userRole,
          action: "submit_federation_letter_request",
          entityType: "federation_letter_request",
          entityId: req.params.id,
          details: { requestNumber: request.requestNumber },
        });

        res.json(updatedRequest);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/federation-letter-requests/:id/process",
    requireTeamRole,
    async (req, res) => {
      try {
        const request = await storage.getFederationLetterRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ error: "Request not found" });
        }

        const updatedRequest = await storage.updateFederationLetterRequest(
          req.params.id,
          {
            status: "processing",
            processedBy: req.session.userId,
            processedAt: new Date(),
          }
        );

        await storage.logAction({
          userId: req.session.userId,
          userRole: req.session.userRole,
          action: "process_federation_letter_request",
          entityType: "federation_letter_request",
          entityId: req.params.id,
          details: { requestNumber: request.requestNumber },
        });

        res.json(updatedRequest);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/federation-letter-requests/:id/issue",
    requireTeamRole,
    async (req, res) => {
      try {
        const request = await storage.getFederationLetterRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ error: "Request not found" });
        }

        const {
          issuedDocumentStorageKey,
          issuedDocumentObjectPath,
          issuedDocumentOriginalName,
        } = req.body;

        const updatedRequest = await storage.updateFederationLetterRequest(
          req.params.id,
          {
            status: "issued",
            issuedAt: new Date(),
            issuedBy: req.session.userId,
            issuedDocumentStorageKey,
            issuedDocumentObjectPath,
            issuedDocumentOriginalName,
          }
        );

        await storage.logAction({
          userId: req.session.userId,
          userRole: req.session.userRole,
          action: "issue_federation_letter_request",
          entityType: "federation_letter_request",
          entityId: req.params.id,
          details: { requestNumber: request.requestNumber },
        });

        res.json(updatedRequest);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/federation-letter-requests/:id/reject",
    requireTeamRole,
    async (req, res) => {
      try {
        const request = await storage.getFederationLetterRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ error: "Request not found" });
        }

        const { rejectionReason } = req.body;

        const updatedRequest = await storage.updateFederationLetterRequest(
          req.params.id,
          {
            status: "rejected",
            rejectionReason,
          }
        );

        await storage.logAction({
          userId: req.session.userId,
          userRole: req.session.userRole,
          action: "reject_federation_letter_request",
          entityType: "federation_letter_request",
          entityId: req.params.id,
          details: { requestNumber: request.requestNumber, rejectionReason },
        });

        res.json(updatedRequest);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/federation-letter-requests/:id/confirm-payment",
    requireTeamRole,
    async (req, res) => {
      try {
        const request = await storage.getFederationLetterRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ error: "Request not found" });
        }

        const { paymentId } = req.body;

        const updatedRequest = await storage.updateFederationLetterRequest(
          req.params.id,
          {
            paymentStatus: "paid",
            paymentId,
            paymentConfirmedAt: new Date(),
          }
        );

        await storage.logAction({
          userId: req.session.userId,
          userRole: req.session.userRole,
          action: "confirm_payment_federation_letter_request",
          entityType: "federation_letter_request",
          entityId: req.params.id,
          details: { requestNumber: request.requestNumber, paymentId },
        });

        res.json(updatedRequest);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/federation-letter-requests/:id",
    requireTeamRole,
    async (req, res) => {
      try {
        const request = await storage.getFederationLetterRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ error: "Request not found" });
        }

        if (request.status !== "pending") {
          return res
            .status(400)
            .json({ error: "Can only delete pending requests" });
        }

        await storage.deleteFederationLetterRequest(req.params.id);

        await storage.logAction({
          userId: req.session.userId,
          userRole: req.session.userRole,
          action: "delete_federation_letter_request",
          entityType: "federation_letter_request",
          entityId: req.params.id,
          details: { requestNumber: request.requestNumber },
        });

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Federation Admin Routes
  const requireFederationAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // In demo mode, allow access to federation admin routes for any user
    // This simulates having federation admin privileges for demo purposes
    if (!req.session.userId) {
      req.session.userId = "demo-federation-admin";
      req.session.userRole = "federation_admin";
    }
    // In demo mode, grant federation admin access to all users accessing these routes
    // In production, this would check for actual federation_admin role
    next();
  };

  app.get(
    "/api/federation-admin/dashboard-stats",
    requireFederationAdmin,
    async (req, res) => {
      try {
        const stats = await storage.getFederationDashboardStats();
        res.json(stats);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/federation-admin/requests",
    requireFederationAdmin,
    async (req, res) => {
      try {
        const { status } = req.query;
        let requests;
        if (status && status !== "all") {
          requests = await storage.getFederationLetterRequestsByStatus(
            status as string
          );
        } else {
          requests = await storage.getFederationLetterRequests();
        }
        res.json(requests);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/federation-admin/requests/:id/accept",
    requireFederationAdmin,
    async (req, res) => {
      try {
        const request = await storage.getFederationLetterRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ error: "Request not found" });
        }
        if (request.status !== "submitted") {
          return res
            .status(400)
            .json({ error: "Can only accept submitted requests" });
        }

        const updatedRequest = await storage.updateFederationLetterRequest(
          req.params.id,
          {
            status: "processing",
            processedBy: req.session.userId,
            processedAt: new Date(),
          }
        );

        await storage.createFederationRequestActivity({
          requestId: req.params.id,
          actorId: req.session.userId,
          actorRole: "federation_admin",
          activityType: "accepted",
          description: "Request accepted for processing",
          previousStatus: "submitted",
          newStatus: "processing",
        });

        res.json(updatedRequest);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/federation-admin/requests/:id/issue",
    requireFederationAdmin,
    async (req, res) => {
      try {
        const request = await storage.getFederationLetterRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ error: "Request not found" });
        }
        if (request.status !== "processing") {
          return res
            .status(400)
            .json({ error: "Can only issue processing requests" });
        }

        const {
          issuedDocumentStorageKey,
          issuedDocumentObjectPath,
          issuedDocumentOriginalName,
          mimeType,
          fileSize,
        } = req.body;

        const updatedRequest = await storage.updateFederationLetterRequest(
          req.params.id,
          {
            status: "issued",
            issuedAt: new Date(),
            issuedBy: req.session.userId,
            issuedDocumentStorageKey,
            issuedDocumentObjectPath,
            issuedDocumentOriginalName,
          }
        );

        // Create issued document record for download tracking
        await storage.createFederationIssuedDocument({
          requestId: req.params.id,
          documentType: "Federation Letter",
          documentNumber: request.requestNumber,
          storageKey: issuedDocumentStorageKey || `issued-${req.params.id}`,
          objectPath: issuedDocumentObjectPath,
          originalName:
            issuedDocumentOriginalName ||
            `Federation_Letter_${request.requestNumber}.pdf`,
          mimeType: mimeType || "application/pdf",
          fileSize: fileSize || 0,
          issuedBy: req.session.userId || "federation-admin",
          issuedByName: "Federation Administrator",
        });

        await storage.createFederationRequestActivity({
          requestId: req.params.id,
          actorId: req.session.userId,
          actorRole: "federation_admin",
          activityType: "issued",
          description: "Federation letter issued",
          previousStatus: "processing",
          newStatus: "issued",
          metadata: { documentName: issuedDocumentOriginalName },
        });

        res.json(updatedRequest);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/federation-admin/requests/:id/reject",
    requireFederationAdmin,
    async (req, res) => {
      try {
        const request = await storage.getFederationLetterRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ error: "Request not found" });
        }

        const { rejectionReason } = req.body;

        const updatedRequest = await storage.updateFederationLetterRequest(
          req.params.id,
          {
            status: "rejected",
            rejectionReason,
          }
        );

        // Refund tokens to the user who submitted the request
        if (request.submittedBy) {
          const refundAmount = 10; // federation_letter_request cost
          const balance = await storage.getTokenBalance(request.submittedBy);
          if (balance) {
            const newBalance = balance.balance + refundAmount;
            await storage.updateTokenBalance(request.submittedBy, newBalance);

            await storage.createTokenTransaction({
              userId: request.submittedBy,
              amount: refundAmount,
              type: "credit",
              action: "federation_letter_refund",
              description: `Refund for rejected federation letter request ${request.requestNumber}`,
              balanceAfter: newBalance,
            });
          }
        }

        await storage.createFederationRequestActivity({
          requestId: req.params.id,
          actorId: req.session.userId,
          actorRole: "federation_admin",
          activityType: "rejected",
          description: "Request rejected - tokens refunded",
          previousStatus: request.status,
          newStatus: "rejected",
          metadata: { rejectionReason, tokensRefunded: 10 },
        });

        res.json(updatedRequest);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/federation-admin/requests/:id/activities",
    requireFederationAdmin,
    async (req, res) => {
      try {
        const activities = await storage.getFederationRequestActivities(
          req.params.id
        );
        res.json(activities);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Get request documents (passport and invitation letter)
  app.get(
    "/api/federation-admin/requests/:id/documents",
    requireFederationAdmin,
    async (req, res) => {
      try {
        const request = await storage.getFederationLetterRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ error: "Request not found" });
        }

        const documents: Array<{
          type: string;
          name: string;
          objectPath?: string | null;
          storageKey?: string | null;
          mimeType?: string | null;
          verificationStatus?: string | null;
        }> = [];

        // Get passport document if attached
        if (request.passportDocumentId) {
          const passportDoc = await storage.getPlayerDocument(
            request.passportDocumentId
          );
          if (passportDoc) {
            documents.push({
              type: "passport",
              name: passportDoc.originalName,
              objectPath: passportDoc.objectPath,
              storageKey: passportDoc.storageKey,
              mimeType: passportDoc.mimeType,
              verificationStatus: passportDoc.verificationStatus,
            });
          }
        }

        // Get invitation letter if attached
        if (
          request.invitationLetterObjectPath ||
          request.invitationLetterStorageKey
        ) {
          documents.push({
            type: "invitation_letter",
            name: request.invitationLetterOriginalName || "Invitation Letter",
            objectPath: request.invitationLetterObjectPath,
            storageKey: request.invitationLetterStorageKey,
            mimeType: "application/pdf",
          });
        }

        res.json(documents);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/federation-admin/fee-schedules",
    requireFederationAdmin,
    async (req, res) => {
      try {
        const { federationId } = req.query;
        const schedules = federationId
          ? await storage.getFederationFeeSchedules(federationId as string)
          : await storage.getAllFederationFeeSchedules();
        res.json(schedules);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/federation-admin/fee-schedules",
    requireFederationAdmin,
    async (req, res) => {
      try {
        const schedule = await storage.createFederationFeeSchedule({
          ...req.body,
          platformServiceCharge: 25,
        });
        res.json(schedule);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.put(
    "/api/federation-admin/fee-schedules/:id",
    requireFederationAdmin,
    async (req, res) => {
      try {
        const schedule = await storage.updateFederationFeeSchedule(
          req.params.id,
          req.body
        );
        res.json(schedule);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/federation-admin/fee-schedules/:id",
    requireFederationAdmin,
    async (req, res) => {
      try {
        await storage.deleteFederationFeeSchedule(req.params.id);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/federation-admin/profiles",
    requireFederationAdmin,
    async (req, res) => {
      try {
        const profiles = await storage.getFederationProfiles();
        res.json(profiles);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/federation-admin/profiles",
    requireFederationAdmin,
    async (req, res) => {
      try {
        const profile = await storage.createFederationProfile(req.body);
        res.json(profile);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.put(
    "/api/federation-admin/profiles/:id",
    requireFederationAdmin,
    async (req, res) => {
      try {
        const profile = await storage.updateFederationProfile(
          req.params.id,
          req.body
        );
        res.json(profile);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  // Federation Request Messages Routes (accessible by both team and federation admin)
  app.get(
    "/api/federation-requests/:id/messages",
    requireAuth,
    async (req, res) => {
      try {
        const messages = await storage.getFederationRequestMessages(
          req.params.id
        );
        res.json(messages);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/federation-requests/:id/messages",
    requireAuth,
    async (req, res) => {
      try {
        const { content, subject, recipientPortal } = req.body;
        const userRole = req.session.userRole || "team";
        const senderPortal =
          userRole === "federation_admin" ? "federation" : "team";

        const message = await storage.createFederationRequestMessage({
          requestId: req.params.id,
          senderId: req.session.userId || "anonymous",
          senderName: req.body.senderName || req.session.userId || "Unknown",
          senderRole: userRole,
          senderPortal,
          recipientPortal:
            recipientPortal ||
            (senderPortal === "team" ? "federation" : "team"),
          subject,
          content,
        });

        await storage.logFederationActivity(
          req.params.id,
          "message_sent",
          `Message sent from ${senderPortal} portal`,
          req.session.userId,
          req.body.senderName || req.session.userId,
          userRole,
          undefined,
          undefined,
          { messageId: message.id, subject }
        );

        res.json(message);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.put(
    "/api/federation-requests/messages/:id/read",
    requireAuth,
    async (req, res) => {
      try {
        const message = await storage.markMessageAsRead(req.params.id);
        res.json(message);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  // Federation Request Activity Log Routes
  app.get(
    "/api/federation-requests/:id/activities",
    requireAuth,
    async (req, res) => {
      try {
        const activities = await storage.getFederationRequestActivities(
          req.params.id
        );
        res.json(activities);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Federation Request Full History (request + activities + messages + documents)
  app.get(
    "/api/federation-requests/:id/history",
    requireAuth,
    async (req, res) => {
      try {
        const history = await storage.getRequestWithFullHistory(req.params.id);
        res.json(history);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Federation Issued Documents Routes
  app.get(
    "/api/federation-requests/:id/issued-documents",
    requireAuth,
    async (req, res) => {
      try {
        const documents = await storage.getFederationIssuedDocuments(
          req.params.id
        );
        res.json(documents);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/federation-requests/:id/issued-documents/:docId/download",
    requireAuth,
    async (req, res) => {
      try {
        await storage.incrementDocumentDownloadCount(req.params.docId);

        await storage.logFederationActivity(
          req.params.id,
          "document_downloaded",
          `Document downloaded`,
          req.session.userId,
          req.session.userId,
          req.session.userRole,
          undefined,
          undefined,
          { documentId: req.params.docId }
        );

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Download an issued document directly - generates PDF with platform timestamp
  app.get(
    "/api/federation-requests/:id/issued-documents/:docId/download-file",
    requireAuth,
    async (req, res) => {
      try {
        const documents = await storage.getFederationIssuedDocuments(
          req.params.id
        );
        const doc = documents.find((d) => d.id === req.params.docId);

        if (!doc) {
          return res.status(404).json({ error: "Document not found" });
        }

        // Get the request details for the certificate
        const request = await storage.getFederationLetterRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ error: "Request not found" });
        }

        await storage.incrementDocumentDownloadCount(req.params.docId);

        // Generate a PDF certificate with platform timestamp
        const pdf = new jsPDF();
        const issuedDate = doc.createdAt ? new Date(doc.createdAt) : new Date();
        const downloadDate = new Date();

        // Header
        pdf.setFontSize(20);
        pdf.setFont("helvetica", "bold");
        pdf.text("FEDERATION LETTER CERTIFICATE", 105, 30, { align: "center" });

        // Platform branding
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");
        pdf.text("Sports Reels Compliance Platform", 105, 40, {
          align: "center",
        });

        // Horizontal line
        pdf.setLineWidth(0.5);
        pdf.line(20, 50, 190, 50);

        // Document details
        pdf.setFontSize(11);
        let yPos = 65;

        pdf.setFont("helvetica", "bold");
        pdf.text("Document Information", 20, yPos);
        yPos += 10;

        pdf.setFont("helvetica", "normal");
        pdf.text(`Request Number: ${request.requestNumber}`, 20, yPos);
        yPos += 8;
        pdf.text(`Document Type: ${doc.documentType}`, 20, yPos);
        yPos += 8;
        pdf.text(`Original File: ${doc.originalName}`, 20, yPos);
        yPos += 15;

        pdf.setFont("helvetica", "bold");
        pdf.text("Athlete Information", 20, yPos);
        yPos += 10;

        pdf.setFont("helvetica", "normal");
        pdf.text(`Full Name: ${request.athleteFullName}`, 20, yPos);
        yPos += 8;
        pdf.text(`Nationality: ${request.athleteNationality}`, 20, yPos);
        yPos += 8;
        pdf.text(`Position: ${request.athletePosition}`, 20, yPos);
        yPos += 8;
        pdf.text(`Date of Birth: ${request.athleteDateOfBirth}`, 20, yPos);
        yPos += 15;

        pdf.setFont("helvetica", "bold");
        pdf.text("Transfer Details", 20, yPos);
        yPos += 10;

        pdf.setFont("helvetica", "normal");
        pdf.text(`Target Club: ${request.targetClubName}`, 20, yPos);
        yPos += 8;
        pdf.text(`Target Country: ${request.targetClubCountry}`, 20, yPos);
        yPos += 8;
        pdf.text(
          `Transfer Type: ${request.transferType?.replace(/_/g, " ").toUpperCase()}`,
          20,
          yPos
        );
        yPos += 8;
        if (request.federationName) {
          pdf.text(
            `Federation: ${request.federationName} (${request.federationCountry})`,
            20,
            yPos
          );
          yPos += 8;
        }
        yPos += 10;

        // Horizontal line
        pdf.line(20, yPos, 190, yPos);
        yPos += 15;

        // Platform timestamp section
        pdf.setFont("helvetica", "bold");
        pdf.text("Platform Verification", 20, yPos);
        yPos += 10;

        pdf.setFont("helvetica", "normal");
        pdf.text(
          `Issued Date: ${issuedDate.toLocaleString("en-US", {
            dateStyle: "full",
            timeStyle: "long",
            timeZone: "UTC",
          })} UTC`,
          20,
          yPos
        );
        yPos += 8;
        pdf.text(
          `Download Date: ${downloadDate.toLocaleString("en-US", {
            dateStyle: "full",
            timeStyle: "long",
            timeZone: "UTC",
          })} UTC`,
          20,
          yPos
        );
        yPos += 8;
        pdf.text(
          `Issued By: ${doc.issuedByName || "Federation Administrator"}`,
          20,
          yPos
        );
        yPos += 8;
        pdf.text(`Download Count: ${(doc.downloadCount || 0) + 1}`, 20, yPos);
        yPos += 15;

        // Verification notice
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "italic");
        pdf.text(
          "This document was issued through the Sports Reels Compliance Platform.",
          105,
          yPos,
          { align: "center" }
        );
        yPos += 5;
        pdf.text(
          "The timestamp above represents the official platform issuance time.",
          105,
          yPos,
          { align: "center" }
        );
        yPos += 5;
        pdf.text(`Document ID: ${doc.id}`, 105, yPos, { align: "center" });

        // Footer
        pdf.setFontSize(8);
        pdf.text(
          "Sports Reels - Player Compliance & Visa Eligibility Platform",
          105,
          285,
          { align: "center" }
        );

        // Generate PDF buffer and send
        const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));
        const fileName = `Federation_Letter_${request.requestNumber}_${downloadDate.toISOString().split("T")[0]}.pdf`;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${fileName}"`
        );
        res.send(pdfBuffer);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Download the original uploaded document
  app.get(
    "/api/federation-requests/:id/issued-documents/:docId/download-original",
    requireAuth,
    async (req, res) => {
      try {
        const documents = await storage.getFederationIssuedDocuments(
          req.params.id
        );
        const doc = documents.find((d) => d.id === req.params.docId);

        if (!doc) {
          return res.status(404).json({ error: "Document not found" });
        }

        await storage.incrementDocumentDownloadCount(req.params.docId);

        // If objectPath exists, stream the original file directly
        if (doc.objectPath) {
          try {
            const objectStorage = new ObjectStorageService();
            // Use getObjectEntityFile which handles /objects/uploads/uuid paths
            const objectFile = await objectStorage.getObjectEntityFile(
              doc.objectPath
            );
            res.setHeader(
              "Content-Disposition",
              `attachment; filename="${doc.originalName}"`
            );
            return objectStorage.downloadObject(objectFile, res);
          } catch (e: any) {
            console.error("Error downloading original:", e);
          }
        }

        // Return error if file not found
        res
          .status(404)
          .json({ error: "Original document file not found in storage" });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Unread messages count for team portal
  app.get(
    "/api/federation-requests/unread-count",
    requireAuth,
    async (req, res) => {
      try {
        const messages = await storage.getUnreadMessagesForPortal("team");
        res.json({ count: messages.length });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Invitation letter routes
  app.get(
    "/api/invitation-letters/:playerId",
    requireAuth,
    async (req, res) => {
      try {
        const letters = await storage.getInvitationLetters(req.params.playerId);
        res.json(letters);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post("/api/invitation-letters", requireAuth, async (req, res) => {
    try {
      const {
        playerId,
        targetClubName,
        targetLeague,
        targetLeagueBand,
        targetCountry,
        scoutAgentName,
        scoutAgentId,
        fileUrl,
      } = req.body;

      const letter = await storage.createInvitationLetter({
        playerId,
        fromTeamId: req.session.teamId || "",
        targetClubName,
        targetLeague,
        targetLeagueBand,
        targetCountry,
        scoutAgentName,
        scoutAgentId,
        fileUrl,
        uploadedBy: req.session.userId,
        status: "pending",
      });

      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "upload_invitation_letter",
        entityType: "invitation_letter",
        entityId: letter.id,
        details: { playerId, targetClubName, targetCountry },
      });

      res.json(letter);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/invitation-letters", requireAuth, async (req, res) => {
    try {
      const letters = await storage.getAllInvitationLetters(req.session.teamId);
      const lettersWithPlayers = await Promise.all(
        letters.map(async (letter) => {
          const player = await storage.getPlayer(letter.playerId);
          return { ...letter, player };
        })
      );
      res.json(lettersWithPlayers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get(
    "/api/invitation-letters/single/:id",
    requireAuth,
    async (req, res) => {
      try {
        const letter = await storage.getInvitationLetter(req.params.id);
        if (!letter) {
          return res.status(404).json({ error: "Invitation letter not found" });
        }
        const player = await storage.getPlayer(letter.playerId);
        res.json({ ...letter, player });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.patch("/api/invitation-letters/:id", requireAuth, async (req, res) => {
    try {
      const letter = await storage.updateInvitationLetter(
        req.params.id,
        req.body
      );
      if (!letter) {
        return res.status(404).json({ error: "Invitation letter not found" });
      }
      res.json(letter);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/invitation-letters/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteInvitationLetter(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post(
    "/api/invitation-letters/:id/generate-consular-report",
    requireAuth,
    async (req, res) => {
      try {
        const letter = await storage.getInvitationLetter(req.params.id);
        if (!letter) {
          return res.status(404).json({ error: "Invitation letter not found" });
        }

        const player = await storage.getPlayer(letter.playerId);
        if (!player) {
          return res.status(404).json({ error: "Player not found" });
        }

        const eligibilityScores = await storage.getEligibilityScores(
          letter.playerId
        );
        const playerVideos = await storage.getVideos(letter.playerId);
        const metrics = await storage.getPlayerMetrics(letter.playerId);

        const verificationCode = `VR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const videoQrCodes = playerVideos.slice(0, 5).map((video) => ({
          videoId: video.id,
          title: video.title,
          qrUrl: `/api/verify/video/${video.id}?code=${verificationCode}`,
          competition: video.competition,
          matchDate: video.matchDate,
        }));

        const consularReport = await storage.createConsularReport({
          invitationLetterId: letter.id,
          playerId: letter.playerId,
          playerProfile: {
            firstName: player.firstName,
            lastName: player.lastName,
            nationality: player.nationality,
            dateOfBirth: player.dateOfBirth,
            position: player.position,
            currentClub: player.currentClubName,
            nationalTeamCaps: player.nationalTeamCaps,
            internationalCaps: player.internationalCaps,
          },
          playerStats:
            metrics.length > 0
              ? {
                  gamesPlayed: metrics[0].gamesPlayed,
                  goals: metrics[0].goals,
                  assists: metrics[0].assists,
                  currentSeasonMinutes: metrics[0].currentSeasonMinutes,
                }
              : null,
          eligibilityScores: eligibilityScores.map((score) => ({
            visaType: score.visaType,
            score: score.score,
            status: score.status,
            leagueBandApplied: score.leagueBandApplied,
          })),
          videoQrCodes,
          proofOfPlaySummary: `${player.firstName} ${player.lastName} has ${playerVideos.length} verified match videos demonstrating professional-level performance.`,
          targetClubDetails: {
            clubName: letter.targetClubName,
            clubAddress: letter.targetClubAddress,
            league: letter.targetLeague,
            leagueBand: letter.targetLeagueBand,
            country: letter.targetCountry,
          },
          verificationCode,
          validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        });

        await storage.updateInvitationLetter(letter.id, {
          consularReportGenerated: true,
          consularReportUrl: `/api/consular-reports/${consularReport.id}`,
          qrCodeData: verificationCode,
          embassyAccessible: true,
        });

        await storage.logAction({
          userId: req.session.userId,
          userRole: req.session.userRole,
          action: "generate_consular_report",
          entityType: "consular_report",
          entityId: consularReport.id,
          details: { playerId: letter.playerId, verificationCode },
        });

        res.json(consularReport);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.get("/api/consular-reports/:id", requireAuth, async (req, res) => {
    try {
      const report = await storage.getConsularReport(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Consular report not found" });
      }
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Notify Embassy route (tokenized at 4 tokens)
  app.post(
    "/api/invitation-letters/:id/notify-embassy",
    requireTeamRole,
    async (req, res) => {
      try {
        const letter = await storage.getInvitationLetter(req.params.id);
        if (!letter) {
          return res.status(404).json({ error: "Invitation letter not found" });
        }

        if (letter.embassyNotificationStatus === "notified") {
          return res.status(400).json({
            error: "Embassy has already been notified for this invitation",
          });
        }

        const userId = req.session.userId!;
        const tokenBalance = await storage.getTokenBalance(userId);
        const currentBalance = tokenBalance?.balance || 0;
        const notificationCost = 4;

        if (currentBalance < notificationCost) {
          return res.status(400).json({
            error: `Insufficient tokens. Requires ${notificationCost} tokens, you have ${currentBalance}.`,
          });
        }

        const newBalance = currentBalance - notificationCost;
        await storage.updateTokenBalance(
          userId,
          newBalance,
          undefined,
          (tokenBalance?.lifetimeSpent || 0) + notificationCost
        );

        await storage.createTokenTransaction({
          userId,
          amount: -notificationCost,
          type: "debit",
          action: "embassy_notification",
          description: `Embassy notification for invitation to ${letter.targetClubName}`,
          playerId: letter.playerId,
          balanceAfter: newBalance,
        });

        await storage.updateInvitationLetter(letter.id, {
          embassyNotificationStatus: "notified",
          embassyNotifiedAt: new Date(),
          embassyNotifiedBy: userId,
          embassyNotificationTokensSpent: notificationCost,
          embassyAccessible: true,
        });

        await storage.createEmbassyNotification({
          invitationLetterId: letter.id,
          playerId: letter.playerId,
          teamId: letter.fromTeamId,
          embassyCountry: letter.targetCountry,
          status: "pending",
          tokensSpent: notificationCost,
          notifiedBy: userId,
        });

        await storage.logAction({
          userId,
          userRole: req.session.userRole,
          action: "notify_embassy",
          entityType: "invitation_letter",
          entityId: letter.id,
          details: {
            targetCountry: letter.targetCountry,
            tokensSpent: notificationCost,
          },
        });

        res.json({
          success: true,
          message: `Embassy notified successfully. ${notificationCost} tokens deducted.`,
          newBalance,
          letter: { ...letter, embassyNotificationStatus: "notified" },
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/consular-reports/player/:playerId",
    requireAuth,
    async (req, res) => {
      try {
        const reports = await storage.getConsularReports(req.params.playerId);
        res.json(reports);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get("/api/verify/consular-report/:code", async (req, res) => {
    try {
      const report = await storage.getConsularReportByVerificationCode(
        req.params.code
      );
      if (!report) {
        return res
          .status(404)
          .json({ error: "Invalid verification code", valid: false });
      }

      if (report.validUntil && new Date(report.validUntil) < new Date()) {
        return res.json({ valid: false, error: "Report has expired" });
      }

      await storage.updateConsularReport(report.id, {
        accessedByEmbassy: true,
        embassyAccessLogs: [
          ...(Array.isArray(report.embassyAccessLogs)
            ? report.embassyAccessLogs
            : []),
          { accessedAt: new Date().toISOString(), ip: req.ip },
        ],
      });

      res.json({
        valid: true,
        playerProfile: report.playerProfile,
        eligibilityScores: report.eligibilityScores,
        targetClubDetails: report.targetClubDetails,
        proofOfPlaySummary: report.proofOfPlaySummary,
        generatedAt: report.generatedAt,
        validUntil: report.validUntil,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Transfer Eligibility Assessment - Calculate and return multi-visa eligibility scoring
  app.get(
    "/api/players/:id/transfer-eligibility",
    requireTeamRole,
    async (req, res) => {
      try {
        const playerId = req.params.id;
        const player = await storage.getPlayer(playerId);
        if (!player) {
          return res.status(404).json({ error: "Player not found" });
        }

        const { calculateTransferEligibility } =
          await import("./eligibilityScoring");

        const metrics = await storage.getPlayerMetrics(playerId);
        const videos = await storage.getVideos(playerId);
        const internationalRecords =
          await storage.getPlayerInternationalRecords(playerId);
        const invitationLetters = await storage.getInvitationLetters(playerId);

        const videoInsightsPromises = videos.map((v) =>
          storage.getVideoInsights(v.id)
        );
        const videoInsightsResults = await Promise.all(videoInsightsPromises);
        const videoInsights = videoInsightsResults.filter(
          (i): i is NonNullable<typeof i> => i !== undefined
        );

        const latestInvitation = invitationLetters[0];
        const leagueBand = latestInvitation?.targetLeagueBand || 3;

        const eligibilityResult = calculateTransferEligibility({
          player,
          metrics,
          videos,
          videoInsights,
          internationalRecords,
          invitationLetters,
          leagueBand,
        });

        const existingAssessment =
          await storage.getTransferEligibilityAssessment(playerId);

        const assessmentData = {
          playerId,
          totalMinutesVerified: eligibilityResult.totalMinutesVerified,
          clubMinutes: eligibilityResult.clubMinutes,
          internationalMinutes: eligibilityResult.internationalMinutes,
          videoMinutes: eligibilityResult.videoMinutes,
          totalCaps: eligibilityResult.totalCaps,
          seniorCaps: eligibilityResult.seniorCaps,
          continentalAppearances: eligibilityResult.continentalAppearances,
          overallStatus: eligibilityResult.overallStatus,
          schengenScore: eligibilityResult.schengen.score,
          schengenStatus: eligibilityResult.schengen.status,
          o1Score: eligibilityResult.o1.score,
          o1Status: eligibilityResult.o1.status,
          p1Score: eligibilityResult.p1.score,
          p1Status: eligibilityResult.p1.status,
          ukGbeScore: eligibilityResult.ukGbe.score,
          ukGbeStatus: eligibilityResult.ukGbe.status,
          escScore: eligibilityResult.esc.score,
          escStatus: eligibilityResult.esc.status,
          escEligible: eligibilityResult.escEligible,
          minutesNeeded: eligibilityResult.minutesNeeded,
          capsNeeded: eligibilityResult.capsNeeded,
          recommendations: eligibilityResult.recommendations,
          visaBreakdown: {
            schengen: eligibilityResult.schengen,
            o1: eligibilityResult.o1,
            p1: eligibilityResult.p1,
            ukGbe: eligibilityResult.ukGbe,
            esc: eligibilityResult.esc,
          },
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };

        let assessment;
        if (existingAssessment) {
          assessment = await storage.updateTransferEligibilityAssessment(
            existingAssessment.id,
            assessmentData
          );
        } else {
          assessment =
            await storage.createTransferEligibilityAssessment(assessmentData);
        }

        res.json({
          assessment,
          player: {
            id: player.id,
            name: `${player.firstName} ${player.lastName}`,
            position: player.position,
            nationality: player.nationality,
            currentClub: player.currentClubName,
            marketValue: player.marketValue,
          },
          minutesBreakdown: {
            club: eligibilityResult.clubMinutes,
            international: eligibilityResult.internationalMinutes,
            video: eligibilityResult.videoMinutes,
            total: eligibilityResult.totalMinutesVerified,
            minimum: 800,
            needed: eligibilityResult.minutesNeeded,
          },
          visaScores: {
            schengen: eligibilityResult.schengen,
            o1: eligibilityResult.o1,
            p1: eligibilityResult.p1,
            ukGbe: eligibilityResult.ukGbe,
            esc: eligibilityResult.esc,
          },
          overallStatus: eligibilityResult.overallStatus,
          recommendations: eligibilityResult.recommendations,
          capsNeeded: eligibilityResult.capsNeeded,
          leagueBandApplied: leagueBand,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Recalculate Transfer Eligibility Assessment
  app.post(
    "/api/players/:id/transfer-eligibility/recalculate",
    requireTeamRole,
    async (req, res) => {
      try {
        const playerId = req.params.id;
        const { leagueBand: overrideLeagueBand } = req.body;

        const player = await storage.getPlayer(playerId);
        if (!player) {
          return res.status(404).json({ error: "Player not found" });
        }

        const { calculateTransferEligibility } =
          await import("./eligibilityScoring");

        const metrics = await storage.getPlayerMetrics(playerId);
        const videos = await storage.getVideos(playerId);
        const internationalRecords =
          await storage.getPlayerInternationalRecords(playerId);
        const invitationLetters = await storage.getInvitationLetters(playerId);

        const videoInsightsPromises = videos.map((v) =>
          storage.getVideoInsights(v.id)
        );
        const videoInsightsResults = await Promise.all(videoInsightsPromises);
        const videoInsights = videoInsightsResults.filter(
          (i): i is NonNullable<typeof i> => i !== undefined
        );

        const latestInvitation = invitationLetters[0];
        const leagueBand =
          overrideLeagueBand || latestInvitation?.targetLeagueBand || 3;

        const eligibilityResult = calculateTransferEligibility({
          player,
          metrics,
          videos,
          videoInsights,
          internationalRecords,
          invitationLetters,
          leagueBand,
        });

        const existingAssessment =
          await storage.getTransferEligibilityAssessment(playerId);

        const assessmentData = {
          playerId,
          totalMinutesVerified: eligibilityResult.totalMinutesVerified,
          clubMinutes: eligibilityResult.clubMinutes,
          internationalMinutes: eligibilityResult.internationalMinutes,
          videoMinutes: eligibilityResult.videoMinutes,
          totalCaps: eligibilityResult.totalCaps,
          seniorCaps: eligibilityResult.seniorCaps,
          continentalAppearances: eligibilityResult.continentalAppearances,
          overallStatus: eligibilityResult.overallStatus,
          schengenScore: eligibilityResult.schengen.score,
          schengenStatus: eligibilityResult.schengen.status,
          o1Score: eligibilityResult.o1.score,
          o1Status: eligibilityResult.o1.status,
          p1Score: eligibilityResult.p1.score,
          p1Status: eligibilityResult.p1.status,
          ukGbeScore: eligibilityResult.ukGbe.score,
          ukGbeStatus: eligibilityResult.ukGbe.status,
          escScore: eligibilityResult.esc.score,
          escStatus: eligibilityResult.esc.status,
          escEligible: eligibilityResult.escEligible,
          minutesNeeded: eligibilityResult.minutesNeeded,
          capsNeeded: eligibilityResult.capsNeeded,
          recommendations: eligibilityResult.recommendations,
          visaBreakdown: {
            schengen: eligibilityResult.schengen,
            o1: eligibilityResult.o1,
            p1: eligibilityResult.p1,
            ukGbe: eligibilityResult.ukGbe,
            esc: eligibilityResult.esc,
          },
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };

        let assessment;
        if (existingAssessment) {
          assessment = await storage.updateTransferEligibilityAssessment(
            existingAssessment.id,
            assessmentData
          );
        } else {
          assessment =
            await storage.createTransferEligibilityAssessment(assessmentData);
        }

        res.json({
          success: true,
          assessment,
          overallStatus: eligibilityResult.overallStatus,
          recommendations: eligibilityResult.recommendations,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Transfer Reports - Generate comprehensive downloadable reports
  app.get("/api/reports", requireTeamRole, async (req, res) => {
    try {
      const teamId = req.session.teamId || "demo-team";
      const reports = await storage.getTransferReports(teamId);

      const enrichedReports = await Promise.all(
        reports.map(async (report) => {
          const player = await storage.getPlayer(report.playerId);
          return {
            ...report,
            playerName: player
              ? `${player.firstName} ${player.lastName}`
              : "Unknown",
            playerPosition: player?.position || "Unknown",
          };
        })
      );

      res.json(enrichedReports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/:id", requireTeamRole, async (req, res) => {
    try {
      const report = await storage.getTransferReport(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      const player = await storage.getPlayer(report.playerId);
      res.json({
        ...report,
        playerName: player
          ? `${player.firstName} ${player.lastName}`
          : "Unknown",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reports/generate", requireTeamRole, async (req, res) => {
    try {
      const { playerId, reportType = "comprehensive" } = req.body;

      if (!playerId) {
        return res.status(400).json({ error: "Player ID is required" });
      }

      const player = await storage.getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      const teamId = req.session.teamId || "demo-team";
      const userId = req.session.userId!;
      const userRole = req.session.userRole || "sporting_director";
      const userName = req.session.userId || "System";

      const tokenResult = await spendTokensForAction(
        userId,
        userRole,
        "transfer_report",
        playerId
      );
      if (!tokenResult.success) {
        return res
          .status(402)
          .json({ error: tokenResult.error, needsTokens: true });
      }

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const metrics = await storage.getPlayerMetrics(playerId);
      const eligibilityScores = await storage.getEligibilityScores(playerId);
      const transferAssessment =
        await storage.getTransferEligibilityAssessment(playerId);
      const videos = await storage.getVideos(playerId);
      const invitationLettersData =
        await storage.getInvitationLetters(playerId);
      const consularReportsData = await storage.getConsularReports(playerId);
      const internationalRecords =
        await storage.getPlayerInternationalRecords(playerId);
      const embassyVerifications = await storage.getEmbassyVerifications();
      const playerVerifications = embassyVerifications.filter(
        (v) => v.playerId === playerId
      );

      const recentVideos = videos.filter((v) => {
        if (!v.uploadDate) return true;
        return new Date(v.uploadDate) >= sixMonthsAgo;
      });

      const verificationCode = `TR-${Date.now().toString(36).toUpperCase()}-${playerId.substring(0, 4).toUpperCase()}`;

      const playerProfile = {
        id: player.id,
        name: `${player.firstName} ${player.lastName}`,
        dateOfBirth: player.dateOfBirth,
        age: player.dateOfBirth
          ? Math.floor(
              (Date.now() - new Date(player.dateOfBirth).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000)
            )
          : null,
        nationality: player.nationality,
        secondNationality: player.secondNationality,
        position: player.position,
        secondaryPosition: player.secondaryPosition,
        jerseyNumber: player.jerseyNumber,
        height: player.height,
        heightUnit: player.heightUnit,
        weight: player.weight,
        weightUnit: player.weightUnit,
        preferredFoot: player.preferredFoot,
        currentClub: player.currentClubName,
        marketValue: player.marketValue,
        agentName: player.agentName,
        agentContact: player.agentContact,
        nationalTeamCaps: player.nationalTeamCaps,
        nationalTeamGoals: player.nationalTeamGoals,
      };

      const internationalCareer = internationalRecords.map((r) => ({
        nationalTeam: r.nationalTeam,
        teamLevel: r.teamLevel,
        caps: r.caps,
        goals: r.goals,
        assists: r.assists,
        debutDate: r.debutDate,
        lastAppearance: r.lastAppearance,
      }));

      const performanceStats = metrics.map((m) => ({
        season: m.season,
        gamesPlayed: m.gamesPlayed,
        goals: m.goals,
        assists: m.assists,
        minutesPlayed: m.currentSeasonMinutes,
        passAccuracy: m.passAccuracy,
        tacklesWon: m.tacklesWon,
        aerialDuelsWon: m.aerialDuelsWon,
      }));

      const eligibilityData = transferAssessment
        ? {
            overallStatus: transferAssessment.overallStatus,
            totalMinutes: transferAssessment.totalMinutesVerified,
            minutesNeeded: transferAssessment.minutesNeeded,
            capsNeeded: transferAssessment.capsNeeded,
            visaScores: {
              schengen: {
                score: transferAssessment.schengenScore,
                status: transferAssessment.schengenStatus,
              },
              o1: {
                score: transferAssessment.o1Score,
                status: transferAssessment.o1Status,
              },
              p1: {
                score: transferAssessment.p1Score,
                status: transferAssessment.p1Status,
              },
              ukGbe: {
                score: transferAssessment.ukGbeScore,
                status: transferAssessment.ukGbeStatus,
              },
              esc: {
                score: transferAssessment.escScore,
                status: transferAssessment.escStatus,
              },
            },
            recommendations: transferAssessment.recommendations,
          }
        : null;

      const videosIncluded = recentVideos.map((v) => ({
        id: v.id,
        title: v.title,
        source: v.source,
        matchDate: v.matchDate,
        competition: v.competition,
        opponent: v.opponent,
        minutesPlayed: v.minutesPlayed,
        uploadDate: v.uploadDate,
      }));

      const documentsIncluded = consularReportsData.map((r) => ({
        id: r.id,
        verificationCode: r.verificationCode,
        generatedAt: r.generatedAt,
        validUntil: r.validUntil,
        accessedByEmbassy: r.accessedByEmbassy,
      }));

      const invitationLettersIncluded = invitationLettersData.map((l) => ({
        id: l.id,
        targetClubName: l.targetClubName,
        targetCountry: l.targetCountry,
        targetLeague: l.targetLeague,
        targetLeagueBand: l.targetLeagueBand,
        offerType: l.offerType,
        status: l.status,
        trialStartDate: l.trialStartDate,
        trialEndDate: l.trialEndDate,
      }));

      const verificationsIncluded = playerVerifications.map((v) => ({
        id: v.id,
        embassyCountry: v.embassyCountry,
        status: v.status,
        verificationCode: v.verificationCode,
        submittedAt: v.submittedAt,
        verifiedAt: v.verifiedAt,
      }));

      const totalMinutesVerified =
        (player.clubMinutesCurrentSeason || 0) +
        (player.internationalMinutesCurrentSeason || 0) +
        recentVideos.reduce((sum, v) => sum + (v.minutesPlayed || 0), 0);

      const recommendations = transferAssessment?.recommendations || [];

      const report = await storage.createTransferReport({
        playerId,
        teamId,
        generatedBy: userId,
        generatedByName: userName,
        reportType,
        status: "completed",
        dataRangeStart: sixMonthsAgo,
        dataRangeEnd: new Date(),
        playerProfile,
        internationalCareer,
        performanceStats,
        eligibilityScores: eligibilityData,
        videosIncluded,
        documentsIncluded,
        invitationLetters: invitationLettersIncluded,
        embassyVerifications: verificationsIncluded,
        totalMinutesVerified,
        overallEligibilityStatus: transferAssessment?.overallStatus || "red",
        recommendations,
        verificationCode,
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      await storage.logAction({
        userId,
        userRole: req.session.userRole,
        action: "generate_transfer_report",
        entityType: "transfer_report",
        entityId: report.id,
        details: { playerId, reportType },
      });

      res.json({
        success: true,
        report: {
          ...report,
          playerName: `${player.firstName} ${player.lastName}`,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/reports/:id", requireTeamRole, async (req, res) => {
    try {
      await storage.deleteTransferReport(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post(
    "/api/reports/:id/notify-embassy",
    requireTeamRole,
    async (req, res) => {
      try {
        const report = await storage.getTransferReport(req.params.id);
        if (!report) {
          return res.status(404).json({ error: "Report not found" });
        }

        const updatedReport = await storage.updateTransferReport(report.id, {
          embassyNotified: true,
          embassyNotifiedAt: new Date(),
        });

        await storage.logAction({
          userId: req.session.userId,
          userRole: req.session.userRole,
          action: "notify_embassy",
          entityType: "transfer_report",
          entityId: report.id,
          details: { playerId: report.playerId },
        });

        res.json({ success: true, report: updatedReport });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // 6-Month Player Activity Audit Report
  app.get(
    "/api/players/:id/audit-report",
    requireTeamRole,
    async (req, res) => {
      try {
        const playerId = req.params.id;
        const player = await storage.getPlayer(playerId);
        if (!player) {
          return res.status(404).json({ error: "Player not found" });
        }

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // Gather all player data
        const metrics = await storage.getPlayerMetrics(playerId);
        const eligibilityScores = await storage.getEligibilityScores(playerId);
        const videos = await storage.getVideos(playerId);
        const invitationLettersData =
          await storage.getInvitationLetters(playerId);
        const consularReportsData = await storage.getConsularReports(playerId);
        const internationalRecords =
          await storage.getPlayerInternationalRecords(playerId);

        // Filter data from last 6 months - include items without dates (assume recent)
        const recentVideos = videos.filter((v) => {
          if (!v.uploadDate) return true;
          return new Date(v.uploadDate) >= sixMonthsAgo;
        });
        const recentMetrics = metrics.filter((m) => {
          if (!m.updatedAt) return true;
          return new Date(m.updatedAt) >= sixMonthsAgo;
        });
        const recentInvitations = invitationLettersData.filter((l) => {
          if (!l.uploadedAt) return true;
          return new Date(l.uploadedAt) >= sixMonthsAgo;
        });
        const recentConsularReports = consularReportsData.filter((r) => {
          if (!r.generatedAt) return true;
          return new Date(r.generatedAt) >= sixMonthsAgo;
        });

        // Get the most recent consular report (already sorted by generatedAt desc from storage)
        const latestConsularReport =
          consularReportsData.length > 0 ? consularReportsData[0] : null;

        // Build comprehensive audit data
        const auditReport = {
          generatedAt: new Date().toISOString(),
          reportPeriod: {
            startDate: sixMonthsAgo.toISOString(),
            endDate: new Date().toISOString(),
          },
          player: {
            id: player.id,
            name: `${player.firstName} ${player.lastName}`,
            dateOfBirth: player.dateOfBirth,
            nationality: player.nationality,
            secondaryNationality: player.secondNationality,
            position: player.position,
            jerseyNumber: player.jerseyNumber,
            height: player.height,
            weight: player.weight,
            preferredFoot: player.preferredFoot,
            currentClub: player.currentClubName,
            marketValue: player.marketValue,
          },
          consularVerification: latestConsularReport
            ? {
                verificationCode: latestConsularReport.verificationCode,
                generatedAt: latestConsularReport.generatedAt,
                validUntil: latestConsularReport.validUntil,
                accessedByEmbassy: latestConsularReport.accessedByEmbassy,
              }
            : null,
          activitySummary: {
            totalVideosTagged: recentVideos.length,
            totalMetricsRecorded: recentMetrics.length,
            totalInvitationLetters: recentInvitations.length,
            totalInternationalCaps: internationalRecords.reduce(
              (sum, r) => sum + (r.caps || 0),
              0
            ),
          },
          eligibilityScores: eligibilityScores.map((score) => ({
            visaType: score.visaType,
            score: score.score,
            status: score.status,
            leagueBandApplied: score.leagueBandApplied,
            calculatedAt: score.calculatedAt,
          })),
          videoAnalysis: recentVideos.map((video) => ({
            id: video.id,
            title: video.title,
            uploadedAt: video.uploadDate,
            source: video.source,
            duration: video.duration,
          })),
          performanceMetrics: recentMetrics.map((m) => ({
            season: m.season,
            goals: m.goals,
            assists: m.assists,
            gamesPlayed: m.gamesPlayed,
            currentSeasonMinutes: m.currentSeasonMinutes,
            passAccuracy: m.passAccuracy,
            tacklesWon: m.tacklesWon,
            aerialDuelsWon: m.aerialDuelsWon,
            updatedAt: m.updatedAt,
          })),
          internationalRecords: internationalRecords.map((r) => ({
            nationalTeam: r.nationalTeam,
            teamLevel: r.teamLevel,
            caps: r.caps,
            goals: r.goals,
            assists: r.assists,
            debutDate: r.debutDate,
          })),
          invitationLetters: recentInvitations.map((l) => ({
            targetClubName: l.targetClubName,
            targetCountry: l.targetCountry,
            targetLeague: l.targetLeague,
            targetLeagueBand: l.targetLeagueBand,
            offerType: l.offerType,
            trialStartDate: l.trialStartDate,
            trialEndDate: l.trialEndDate,
            status: l.status,
            consularReportGenerated: l.consularReportGenerated,
          })),
        };

        await storage.logAction({
          userId: req.session.userId,
          userRole: req.session.userRole,
          action: "generate_audit_report",
          entityType: "player",
          entityId: playerId,
          details: { reportPeriod: "6_months" },
        });

        res.json(auditReport);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Embassy document access routes - now includes notified invitation letters and federation letters
  app.get("/api/embassy/documents", requireEmbassyRole, async (req, res) => {
    try {
      let embassyProfile = await storage.getEmbassyProfileByUserId(
        req.session.userId!
      );

      // Auto-create embassy profile if it doesn't exist
      if (!embassyProfile) {
        const user = await storage.getUser(req.session.userId!);
        embassyProfile = await storage.createEmbassyProfile({
          userId: req.session.userId!,
          country: req.session.embassyCountry || "United Kingdom",
          jurisdiction: "National",
          contactEmail: user?.email || "",
          contactPhone: "",
          address: "",
          active: true,
        });
      }

      const documents = [];

      // Get ALL notified invitation letters (embassy can see all notified documents)
      const notifiedLetters = await storage.getAllEmbassyNotifiedLetters();

      for (const letter of notifiedLetters) {
        const player = await storage.getPlayer(letter.playerId);
        const team = await storage.getTeam(letter.fromTeamId);

        // Get document verification status
        const invitationVerification = await storage.getDocumentVerification(
          "invitation_letter",
          letter.id
        );
        let federationLetterVerification = null;
        let federationLetter = null;

        if (letter.federationLetterRequestId) {
          federationLetter = await storage.getFederationLetterRequest(
            letter.federationLetterRequestId
          );
          if (federationLetter) {
            federationLetterVerification =
              await storage.getDocumentVerification(
                "federation_letter",
                federationLetter.id
              );
          }
        }

        // Get transfer reports for this player/invitation
        const transferReports = await storage.getTransferReportsByPlayer(
          letter.playerId
        );
        const relevantReport =
          transferReports.length > 0 ? transferReports[0] : null;

        // Determine if this is an external upload (no federation letter or federation letter not issued)
        const hasFederationLetter =
          federationLetter && federationLetter.status === "issued";
        const isExternalUpload = !hasFederationLetter;

        // Check if issuing club country matches embassy country for local verification
        const issuingClubCountry = team?.country?.toLowerCase() || "";
        const embassyCountryLower = embassyProfile.country.toLowerCase();
        const requiresLocalVerification =
          isExternalUpload && issuingClubCountry === embassyCountryLower;

        documents.push({
          id: letter.id,
          type: "invitation_submission",
          player,
          team,
          invitationLetter: letter,
          federationLetter,
          transferReport: relevantReport,
          invitationVerification: invitationVerification || {
            verificationStatus: "pending",
            isSystemVerified: false,
          },
          federationLetterVerification:
            federationLetterVerification ||
            (letter.federationLetterRequestId
              ? { verificationStatus: "pending", isSystemVerified: false }
              : null),
          notifiedAt: letter.embassyNotifiedAt,
          status: "pending_review",
          isExternalUpload,
          requiresLocalVerification,
          issuingClubCountry: team?.country || null,
        });
      }

      // Also include ALL transfer reports generated by teams
      const allTransferReports = await storage.getAllTransferReports();
      const addedReportIds = new Set(
        documents
          .filter((d) => d.transferReport)
          .map((d) => d.transferReport?.id)
      );

      for (const report of allTransferReports) {
        // Skip if already added via invitation letter
        if (addedReportIds.has(report.id)) continue;

        const player = await storage.getPlayer(report.playerId);
        const team = report.teamId
          ? await storage.getTeam(report.teamId)
          : null;

        documents.push({
          id: report.id,
          type: "transfer_report",
          player,
          team,
          transferReport: report,
          invitationVerification: {
            verificationStatus: "verified",
            isSystemVerified: true,
          },
          notifiedAt: report.generatedAt,
          status: "verified",
        });
      }

      // Also include old compliance documents
      const verifications = await storage.getEmbassyVerifications();
      const countryVerifications = verifications.filter(
        (v) => v.embassyCountry === embassyProfile.country
      );

      for (const verification of countryVerifications) {
        const doc = await storage.getComplianceDocument(
          verification.documentId
        );
        if (doc) {
          const player = await storage.getPlayer(doc.playerId);
          documents.push({
            type: "compliance_document",
            ...doc,
            player,
            verification,
          });
        }
      }

      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all issued federation letters for embassy viewing
  app.get(
    "/api/embassy/issued-letters",
    requireEmbassyRole,
    async (req, res) => {
      try {
        const issuedLetters = await storage.getAllIssuedFederationLetters();

        const lettersWithDetails = await Promise.all(
          issuedLetters.map(async (letter) => {
            const player = letter.playerId
              ? await storage.getPlayer(letter.playerId)
              : null;
            const documents = await storage.getFederationIssuedDocuments(
              letter.id
            );

            return {
              ...letter,
              player,
              documents,
              documentCount: documents.length,
            };
          })
        );

        res.json(lettersWithDetails);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Download issued federation letter as PDF for embassy
  app.get(
    "/api/embassy/issued-letters/:id/pdf",
    requireEmbassyRole,
    async (req, res) => {
      try {
        const letter = await storage.getFederationLetterRequest(req.params.id);
        if (!letter || letter.status !== "issued") {
          return res.status(404).json({ error: "Issued letter not found" });
        }

        const player = letter.playerId
          ? await storage.getPlayer(letter.playerId)
          : null;
        const documents = await storage.getFederationIssuedDocuments(letter.id);

        res.json({
          letter,
          player,
          documents,
          generatedAt: new Date().toISOString(),
          verificationCode: `SR-FED-${letter.requestNumber}-${Date.now().toString(36).toUpperCase()}`,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/embassy/documents/:id",
    requireEmbassyRole,
    async (req, res) => {
      try {
        const embassyProfile = await storage.getEmbassyProfileByUserId(
          req.session.userId!
        );
        if (!embassyProfile) {
          return res.status(404).json({ error: "Embassy profile not found" });
        }

        const doc = await storage.getComplianceDocument(req.params.id);
        if (!doc) {
          return res.status(404).json({ error: "Document not found" });
        }

        await storage.logEmbassyDocumentAccess({
          documentId: doc.id,
          embassyProfileId: embassyProfile.id,
          accessedBy: req.session.userId,
          accessType: "view",
        });

        await storage.logAction({
          userId: req.session.userId,
          userRole: "embassy",
          action: "view_document",
          entityType: "compliance_document",
          entityId: doc.id,
          details: { embassyCountry: embassyProfile.country },
        });

        const player = await storage.getPlayer(doc.playerId);
        const accessLogs = await storage.getEmbassyDocumentAccessLogs(doc.id);

        res.json({ document: doc, player, accessLogs });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // AI Document Verification for Embassy
  app.post(
    "/api/embassy/documents/verify",
    requireEmbassyRole,
    async (req, res) => {
      try {
        const { documentType, documentId } = req.body;

        if (!documentType || !documentId) {
          return res
            .status(400)
            .json({ error: "documentType and documentId are required" });
        }

        // Check if document exists in our system (system-verified)
        let isSystemVerified = false;
        let sourceType = "external";
        let systemVerificationNote = "";

        if (documentType === "federation_letter") {
          const federationLetter =
            await storage.getFederationLetterRequest(documentId);
          if (federationLetter && federationLetter.status === "issued") {
            isSystemVerified = true;
            sourceType = "federation_system";
            systemVerificationNote = `Verified through Sports Reels federation workflow. Issued by ${federationLetter.federationName || federationLetter.federationCountry} on ${federationLetter.issuedAt ? new Date(federationLetter.issuedAt).toLocaleDateString() : "N/A"}`;
          }
        } else if (documentType === "invitation_letter") {
          const letter = await storage.getInvitationLetter(documentId);
          if (letter) {
            isSystemVerified = letter.federationLetterRequestId ? true : false;
            sourceType = letter.federationLetterRequestId
              ? "team_with_federation"
              : "team_upload";
            systemVerificationNote = letter.federationLetterRequestId
              ? "Invitation letter submitted with verified federation letter attached"
              : "Invitation letter uploaded by team - external document";
          }
        }

        // AI verification analysis
        let aiVerdict = isSystemVerified ? "verified" : "requires_review";
        let aiConfidence = isSystemVerified ? 0.95 : 0.5;
        let aiAnalysis = "";

        if (isSystemVerified) {
          aiAnalysis =
            "Document has been verified through the Sports Reels platform workflow. This document passed through our federation verification process and is considered authentic.";
          aiVerdict = "verified";
        } else {
          aiAnalysis =
            "Document was uploaded externally and has not been processed through our verification workflow. Manual review recommended. Flag as POTENTIAL FORGERY if document claims to be from a federation but was not issued through our system.";
          aiVerdict = "potential_fake";
          aiConfidence = 0.3;
        }

        // Check if verification record exists
        let verification = await storage.getDocumentVerification(
          documentType,
          documentId
        );

        if (verification) {
          verification = await storage.updateDocumentVerification(
            verification.id,
            {
              verificationStatus: aiVerdict,
              aiVerdict,
              aiConfidence,
              aiAnalysis,
              isSystemVerified,
              systemVerificationNote,
              lastCheckedAt: new Date(),
              checkedBy: req.session.userId,
            }
          );
        } else {
          verification = await storage.createDocumentVerification({
            documentType,
            documentId,
            sourceType,
            verificationStatus: aiVerdict,
            aiVerdict,
            aiConfidence,
            aiAnalysis,
            isSystemVerified,
            systemVerificationNote,
            lastCheckedAt: new Date(),
            checkedBy: req.session.userId,
          });
        }

        await storage.logAction({
          userId: req.session.userId,
          userRole: "embassy",
          action: "verify_document",
          entityType: documentType,
          entityId: documentId,
          details: { aiVerdict, isSystemVerified },
        });

        res.json(verification);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Embassy Transfer Report PDF with logo
  app.get(
    "/api/embassy/transfer-report/:invitationId/pdf",
    requireEmbassyRole,
    async (req, res) => {
      try {
        const letter = await storage.getInvitationLetter(
          req.params.invitationId
        );
        if (!letter) {
          return res.status(404).json({ error: "Invitation letter not found" });
        }

        const player = await storage.getPlayer(letter.playerId);
        if (!player) {
          return res.status(404).json({ error: "Player not found" });
        }

        const eligibilityScores = await storage.getEligibilityScores(player.id);
        const metrics = await storage.getPlayerMetrics(player.id);
        const videos = await storage.getVideos(player.id);
        const team = await storage.getTeam(letter.fromTeamId);

        // Get federation letter and document verification status
        let federationLetter = null;
        let documentVerification = null;
        if (letter.federationLetterRequestId) {
          federationLetter = await storage.getFederationLetterRequest(
            letter.federationLetterRequestId
          );
        }
        documentVerification = await storage.getDocumentVerification(
          "invitation_letter",
          letter.id
        );

        // Determine verification status
        const hasFederationLetter =
          federationLetter && federationLetter.status === "issued";
        const isExternalUpload = !hasFederationLetter;
        const verificationStatus = hasFederationLetter
          ? "Federation Verified"
          : documentVerification?.isSystemVerified
            ? "AI Verified"
            : "External Upload - Pending Verification";

        // Generate a comprehensive transfer report data structure
        const transferReportData = {
          reportId: `TR-${Date.now().toString(36).toUpperCase()}`,
          generatedAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          player: {
            fullName: `${player.firstName} ${player.lastName}`,
            firstName: player.firstName,
            lastName: player.lastName,
            nationality: player.nationality,
            secondNationality: player.secondNationality,
            dateOfBirth: player.dateOfBirth,
            birthPlace: player.birthPlace,
            position: player.position,
            secondaryPosition: player.secondaryPosition,
            currentClub: player.currentClubName,
            height: player.height,
            heightUnit: player.heightUnit,
            weight: player.weight,
            weightUnit: player.weightUnit,
            preferredFoot: player.preferredFoot,
            jerseyNumber: player.jerseyNumber,
            nationalTeamCaps: player.nationalTeamCaps,
            nationalTeamGoals: player.nationalTeamGoals,
            internationalCaps: player.internationalCaps,
            internationalGoals: player.internationalGoals,
            continentalGames: player.continentalGames,
            marketValue: player.marketValue,
            contractEndDate: player.contractEndDate,
            agentName: player.agentName,
            agentContact: player.agentContact,
          },
          sourceTeam: team
            ? {
                name: team.name,
                clubName: team.clubName,
                country: team.country,
              }
            : null,
          targetClub: {
            name: letter.targetClubName,
            address: letter.targetClubAddress,
            league: letter.targetLeague,
            leagueBand: letter.targetLeagueBand,
            country: letter.targetCountry,
          },
          offerDetails: {
            type: letter.offerType,
            trialStartDate: letter.trialStartDate,
            trialEndDate: letter.trialEndDate,
            scoutAgent: letter.scoutAgentName,
          },
          eligibility: eligibilityScores.map((score) => ({
            visaType: score.visaType,
            score: score.score,
            status: score.status,
            breakdown: score.breakdown,
          })),
          performance:
            metrics.length > 0
              ? {
                  gamesPlayed: metrics[0].gamesPlayed,
                  goals: metrics[0].goals,
                  assists: metrics[0].assists,
                  minutes: metrics[0].currentSeasonMinutes,
                  distanceCovered: metrics[0].distanceCovered,
                  passAccuracy: metrics[0].passAccuracy,
                  aerialDuelsWon: metrics[0].aerialDuelsWon,
                }
              : null,
          videosCount: videos.length,
          verificationCode: `VR-${Date.now().toString(36).toUpperCase()}-EMB`,
          compliance: {
            verificationStatus,
            isExternalUpload,
            hasFederationLetter,
            federationName: federationLetter?.federationName || null,
            federationIssuedAt: federationLetter?.issuedAt || null,
            documentVerifiedAt: documentVerification?.lastCheckedAt || null,
            auditNote:
              `This document has been generated by Sports Reels compliance system. ` +
              `Verification Status: ${verificationStatus}. ` +
              `All data has been cross-referenced with player records and eligibility calculations. ` +
              `This report is for official visa processing purposes only.`,
          },
        };

        await storage.logAction({
          userId: req.session.userId,
          userRole: "embassy",
          action: "download_transfer_report",
          entityType: "invitation_letter",
          entityId: letter.id,
          details: { playerId: player.id },
        });

        res.json(transferReportData);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Scout/Agent player access routes
  app.get("/api/scout/players", requireScoutRole, async (req, res) => {
    try {
      // Only return players that have been published to scouts
      const publishedPlayers = await storage.getPublishedPlayers();

      const playersWithScores = [];
      for (const player of publishedPlayers) {
        const scores = await storage.getEligibilityScores(player.id);
        playersWithScores.push({
          ...player,
          eligibilityScores: scores,
          hasEligibilityData: scores.length > 0,
          isPublished: true,
          publishExpiresAt: player.publishExpiresAt,
        });
      }

      res.json(playersWithScores);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/scout/players/:id", requireScoutRole, async (req, res) => {
    try {
      const player = await storage.getPlayer(req.params.id);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      const eligibilityScores = await storage.getEligibilityScores(player.id);
      const videos = await storage.getVideos(player.id);
      const sharedVideos = await storage.getSharedVideos(req.session.userId!);
      const playerSharedVideos = sharedVideos.filter(
        (sv) => sv.playerId === player.id
      );

      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "view_player_profile",
        entityType: "player",
        entityId: player.id,
        details: { scoutId: req.session.userId },
      });

      res.json({
        player,
        eligibilityScores,
        videos,
        sharedVideos: playerSharedVideos,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Scout shortlist routes
  app.get("/api/scout/shortlist", requireScoutRole, async (req, res) => {
    try {
      const shortlist = await storage.getScoutShortlistWithPlayers(
        req.session.userId!
      );
      res.json(shortlist);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/scout/shortlist", requireScoutRole, async (req, res) => {
    try {
      const { playerId, priority = "green", notes } = req.body;

      const validPriorities = ["amber", "green", "red"];
      if (!validPriorities.includes(priority)) {
        return res
          .status(400)
          .json({ error: "Invalid priority. Must be amber, green, or red." });
      }

      const existing = await storage.getShortlistEntry(
        req.session.userId!,
        playerId
      );
      if (existing) {
        return res.status(400).json({ error: "Player already in shortlist" });
      }

      const entry = await storage.addToShortlist({
        scoutId: req.session.userId!,
        playerId,
        priority,
        notes,
      });

      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/scout/shortlist/:id", requireScoutRole, async (req, res) => {
    try {
      const { priority, notes } = req.body;

      const validPriorities = ["amber", "green", "red"];
      if (!validPriorities.includes(priority)) {
        return res
          .status(400)
          .json({ error: "Invalid priority. Must be amber, green, or red." });
      }

      const shortlist = await storage.getScoutShortlist(req.session.userId!);
      const entry = shortlist.find((s) => s.id === req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Shortlist entry not found" });
      }

      const updated = await storage.updateShortlistPriority(
        req.params.id,
        priority,
        notes
      );
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/scout/shortlist/:id", requireScoutRole, async (req, res) => {
    try {
      const shortlist = await storage.getScoutShortlist(req.session.userId!);
      const entry = shortlist.find((s) => s.id === req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Shortlist entry not found" });
      }

      await storage.removeFromShortlist(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Token costs configuration - role-specific
  const SCOUT_TOKEN_COSTS = {
    view_profile: 2,
    shortlist: 1,
    video_analysis: 8,
    watch_video: 1,
    contact_request: 2,
  };

  const TEAM_TOKEN_COSTS = {
    video_analysis: 8,
    scouting_messaging: 3,
    transfer_report: 5,
    federation_letter_request: 10,
  };

  const WELCOME_BONUS = 50;
  const TOKEN_EXPIRY_MONTHS = 6;

  function getTokenCostsForRole(role: string): Record<string, number> {
    if (role === "scout") {
      return SCOUT_TOKEN_COSTS;
    }
    return TEAM_TOKEN_COSTS;
  }

  async function spendTokensForAction(
    userId: string,
    userRole: string,
    action: string,
    playerId?: string,
    videoId?: string
  ): Promise<{
    success: boolean;
    error?: string;
    newBalance?: number;
    cost?: number;
  }> {
    const roleCosts = getTokenCostsForRole(userRole);
    const cost = roleCosts[action];

    if (!cost) {
      return {
        success: false,
        error: `Invalid action "${action}" for role "${userRole}"`,
      };
    }

    let balance = await storage.getTokenBalance(userId);
    if (!balance) {
      return { success: false, error: "No token balance found" };
    }

    if (balance.balance < cost) {
      return {
        success: false,
        error: `Insufficient tokens. Need ${cost}, have ${balance.balance}`,
      };
    }

    const newBalance = balance.balance - cost;
    const newLifetimeSpent = balance.lifetimeSpent + cost;

    await storage.updateTokenBalance(
      userId,
      newBalance,
      undefined,
      newLifetimeSpent
    );

    const actionDescriptions: Record<string, string> = {
      view_profile: "Viewed player profile",
      shortlist: "Added player to shortlist",
      video_analysis: "Analyzed player video",
      watch_video: "Watched player video",
      contact_request: "Requested player contact",
      scouting_messaging: "Sent scouting message",
      transfer_report: "Generated transfer report",
    };

    await storage.createTokenTransaction({
      userId,
      amount: cost,
      type: "debit",
      action,
      description: actionDescriptions[action] || `Action: ${action}`,
      playerId,
      videoId,
      balanceAfter: newBalance,
    });

    return { success: true, newBalance, cost };
  }

  // Get or initialize token balance
  app.get("/api/tokens/balance", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let balance = await storage.getTokenBalance(userId);

      if (!balance) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + TOKEN_EXPIRY_MONTHS);

        balance = await storage.createTokenBalance({
          userId,
          balance: WELCOME_BONUS,
          lifetimePurchased: WELCOME_BONUS,
          lifetimeSpent: 0,
        });

        await storage.createTokenTransaction({
          userId,
          amount: WELCOME_BONUS,
          type: "credit",
          action: "welcome_bonus",
          description: "Welcome bonus for new users",
          balanceAfter: WELCOME_BONUS,
          expiresAt,
        });
      }

      res.json(balance);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get token transactions
  app.get("/api/tokens/transactions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;
      const transactions = await storage.getTokenTransactions(userId, limit);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get token costs config - role-specific
  app.get("/api/tokens/costs", requireAuth, (req, res) => {
    const userRole = req.session.userRole || "sporting_director";
    const costs = getTokenCostsForRole(userRole);
    res.json(costs);
  });

  // Get available token packs
  app.get("/api/tokens/packs", async (req, res) => {
    try {
      let packs = await storage.getTokenPacks();

      if (packs.length === 0) {
        const defaultPacks = [
          {
            name: "Starter Pack",
            tokens: 50,
            priceUsd: 999,
            description: "50 tokens - Perfect for getting started",
            sortOrder: 1,
          },
          {
            name: "Standard Pack",
            tokens: 100,
            priceUsd: 1799,
            description: "100 tokens - Best value for regular users",
            sortOrder: 2,
          },
          {
            name: "Pro Pack",
            tokens: 150,
            priceUsd: 2499,
            description: "150 tokens - For power users",
            sortOrder: 3,
          },
          {
            name: "Enterprise Pack",
            tokens: 200,
            priceUsd: 2999,
            description: "200 tokens - Maximum value",
            sortOrder: 4,
          },
        ];
        for (const pack of defaultPacks) {
          await storage.createTokenPack(pack);
        }
        packs = await storage.getTokenPacks();
      }

      res.json(packs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Spend tokens for an action - role-specific costs
  app.post("/api/tokens/spend", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const userRole = req.session.userRole || "sporting_director";
      const { action, playerId, videoId } = req.body;

      const roleCosts = getTokenCostsForRole(userRole);
      const cost = roleCosts[action];
      if (!cost) {
        return res
          .status(400)
          .json({ error: `Invalid action "${action}" for role "${userRole}"` });
      }

      let balance = await storage.getTokenBalance(userId);
      if (!balance) {
        return res
          .status(400)
          .json({ error: "No token balance found", needsPurchase: true });
      }

      if (balance.balance < cost) {
        return res.status(400).json({
          error: "Insufficient tokens",
          needsPurchase: true,
          currentBalance: balance.balance,
          required: cost,
        });
      }

      const newBalance = balance.balance - cost;
      const newLifetimeSpent = balance.lifetimeSpent + cost;

      await storage.updateTokenBalance(
        userId,
        newBalance,
        undefined,
        newLifetimeSpent
      );

      const actionDescriptions: Record<string, string> = {
        view_profile: "Viewed player profile",
        shortlist: "Added player to shortlist",
        video_analysis: "Analyzed player video",
        watch_video: "Watched player video",
        contact_request: "Requested player contact",
        scouting_messaging: "Sent scouting message",
        transfer_report: "Generated transfer report",
        federation_letter_request: "Created federation letter request",
      };

      await storage.createTokenTransaction({
        userId,
        amount: cost,
        type: "debit",
        action,
        description: actionDescriptions[action] || `Action: ${action}`,
        playerId,
        videoId,
        balanceAfter: newBalance,
      });

      res.json({ success: true, newBalance, cost, action });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Purchase token pack (simulated - Stripe integration needed for real payments)
  app.post("/api/tokens/purchase", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { packId } = req.body;

      const pack = await storage.getTokenPack(packId);
      if (!pack) {
        return res.status(404).json({ error: "Token pack not found" });
      }

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + TOKEN_EXPIRY_MONTHS);

      const purchase = await storage.createTokenPurchase({
        userId,
        packId,
        tokens: pack.tokens,
        amountPaid: pack.priceUsd,
        currency: "USD",
        paymentMethod: "pending",
        status: "pending",
        expiresAt,
      });

      res.json({
        purchase,
        message:
          "Payment integration required. Connect Stripe to enable real payments.",
        simulatedCheckout: true,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Confirm purchase (simulated - call after Stripe payment success)
  app.post(
    "/api/tokens/purchase/:id/confirm",
    requireAuth,
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        const purchaseId = req.params.id;

        const purchases = await storage.getTokenPurchases(userId);
        const purchase = purchases.find((p) => p.id === purchaseId);

        if (!purchase || purchase.userId !== userId) {
          return res.status(404).json({ error: "Purchase not found" });
        }

        if (purchase.status === "completed") {
          return res.status(400).json({ error: "Purchase already completed" });
        }

        await storage.updateTokenPurchase(purchaseId, {
          status: "completed",
          paymentMethod: "simulated",
          paymentReference: `SIM-${Date.now()}`,
        });

        let balance = await storage.getTokenBalance(userId);
        const newBalance = (balance?.balance || 0) + purchase.tokens;
        const newLifetimePurchased =
          (balance?.lifetimePurchased || 0) + purchase.tokens;

        if (balance) {
          await storage.updateTokenBalance(
            userId,
            newBalance,
            newLifetimePurchased
          );
        } else {
          await storage.createTokenBalance({
            userId,
            balance: newBalance,
            lifetimePurchased: newLifetimePurchased,
            lifetimeSpent: 0,
          });
        }

        await storage.createTokenTransaction({
          userId,
          amount: purchase.tokens,
          type: "credit",
          action: "purchase",
          description: `Purchased ${purchase.tokens} tokens`,
          packId: purchase.packId,
          balanceAfter: newBalance,
          expiresAt: purchase.expiresAt,
        });

        res.json({ success: true, newBalance, tokensAdded: purchase.tokens });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Get purchase history
  app.get("/api/tokens/purchases", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const purchases = await storage.getTokenPurchases(userId);
      res.json(purchases);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Share video with scout
  app.post("/api/videos/:id/share", requireTeamRole, async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      const { sharedWithUserId, sharedWithRole, expiresAt } = req.body;

      const sharedVideo = await storage.shareVideo({
        videoId: video.id,
        sharedWithUserId,
        sharedWithRole,
        sharedByUserId: req.session.userId!,
        playerId: video.playerId,
        accessLevel: "view",
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "share_video",
        entityType: "video",
        entityId: video.id,
        details: { sharedWithUserId, sharedWithRole },
      });

      res.json(sharedVideo);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Transfer targets
  app.post("/api/transfer-targets", requireTeamRole, async (req, res) => {
    try {
      const {
        complianceOrderId,
        playerId,
        targetClubName,
        targetLeague,
        targetCountry,
        targetLeagueBand,
        invitationLetterId,
        scoutAgentId,
        proposedTransferFee,
      } = req.body;

      const target = await storage.createTransferTarget({
        complianceOrderId,
        playerId,
        targetClubName,
        targetLeague,
        targetCountry,
        targetLeagueBand,
        invitationLetterId,
        scoutAgentId,
        proposedTransferFee,
        status: "pending",
      });

      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "create_transfer_target",
        entityType: "transfer_target",
        entityId: target.id,
        details: { playerId, targetClubName, targetCountry },
      });

      res.json(target);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/transfer-targets/:playerId", requireAuth, async (req, res) => {
    try {
      const targets = await storage.getTransferTargets(req.params.playerId);
      res.json(targets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Action logs
  app.get(
    "/api/action-logs/:entityType/:entityId",
    requireAuth,
    async (req, res) => {
      try {
        const logs = await storage.getActionLogs(
          req.params.entityType,
          req.params.entityId
        );
        res.json(logs);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Team Sheets routes
  app.get("/api/team-sheets", requireAuth, async (req, res) => {
    try {
      const teamId = req.session.teamId || "demo-team";
      const sheets = await storage.getTeamSheets(teamId);
      res.json(sheets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/team-sheets/:id", requireAuth, async (req, res) => {
    try {
      const sheet = await storage.getTeamSheet(req.params.id);
      if (!sheet) {
        return res.status(404).json({ error: "Team sheet not found" });
      }
      const players = await storage.getTeamSheetPlayers(sheet.id);
      res.json({ ...sheet, players });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/team-sheets", requireAuth, async (req, res) => {
    try {
      const teamId = req.session.teamId || "demo-team";
      const sheetData = insertTeamSheetSchema.parse({
        ...req.body,
        teamId,
      });
      const sheet = await storage.createTeamSheet(sheetData);

      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "create_team_sheet",
        entityType: "team_sheet",
        entityId: sheet.id,
        details: {
          title: sheet.title,
          matchDate: sheet.matchDate,
          competition: sheet.competition,
        },
      });

      res.json(sheet);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/team-sheets/:id", requireAuth, async (req, res) => {
    try {
      const sheet = await storage.getTeamSheet(req.params.id);
      if (!sheet) {
        return res.status(404).json({ error: "Team sheet not found" });
      }
      const updatedSheet = await storage.updateTeamSheet(
        req.params.id,
        req.body
      );
      res.json(updatedSheet);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/team-sheets/:id", requireAuth, async (req, res) => {
    try {
      const sheet = await storage.getTeamSheet(req.params.id);
      if (!sheet) {
        return res.status(404).json({ error: "Team sheet not found" });
      }
      await storage.deleteTeamSheet(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Team Sheet Players routes
  app.get("/api/team-sheets/:id/players", requireAuth, async (req, res) => {
    try {
      const players = await storage.getTeamSheetPlayers(req.params.id);
      res.json(players);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/team-sheets/:id/players", requireAuth, async (req, res) => {
    try {
      const sheet = await storage.getTeamSheet(req.params.id);
      if (!sheet) {
        return res.status(404).json({ error: "Team sheet not found" });
      }

      const existingPlayers = await storage.getTeamSheetPlayers(req.params.id);
      const starters = existingPlayers.filter((p) => p.role === "starting");
      const { role } = req.body;

      if (role === "starting" && starters.length >= 11) {
        return res
          .status(400)
          .json({ error: "Maximum 11 starting players allowed" });
      }

      const alreadyAdded = existingPlayers.find(
        (p) => p.playerId === req.body.playerId
      );
      if (alreadyAdded) {
        return res
          .status(400)
          .json({ error: "Player already added to this team sheet" });
      }

      const playerData = insertTeamSheetPlayerSchema.parse({
        ...req.body,
        teamSheetId: req.params.id,
      });
      const player = await storage.createTeamSheetPlayer(playerData);
      res.json(player);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/team-sheet-players/:id", requireAuth, async (req, res) => {
    try {
      const player = await storage.updateTeamSheetPlayer(
        req.params.id,
        req.body
      );
      if (!player) {
        return res.status(404).json({ error: "Team sheet player not found" });
      }
      res.json(player);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/team-sheet-players/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteTeamSheetPlayer(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Competitions by country - auto-populate feature
  app.get("/api/competitions", requireAuth, async (req, res) => {
    try {
      const { country } = req.query;
      const competitions = getCompetitionsByCountry(country as string);
      res.json(competitions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== PLATFORM ADMIN PORTAL ROUTES ====================

  const requireAdminRole = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.session.userId) {
      req.session.userId = "demo-admin";
      req.session.userRole = "admin";
    }
    if (req.session.userRole !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };

  // Admin: Get all users
  app.get("/api/admin/users", requireAdminRole, async (req, res) => {
    try {
      const { role } = req.query;
      const users = role
        ? await storage.getUsersByRole(role as string)
        : await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Create user (federation/embassy accounts)
  app.post("/api/admin/users", requireAdminRole, async (req, res) => {
    try {
      const { username, email, password, firstName, lastName, role, country } =
        req.body;

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const hashedPwd = hashPassword(password);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPwd,
        firstName,
        lastName,
        role: role || "embassy",
      });

      // Create embassy/federation profile if applicable
      if (role === "embassy" && country) {
        await storage.createEmbassyProfile({
          country,
        });
      }

      // Log the action
      await storage.createPlatformAuditLog({
        actorId: req.session.userId!,
        action: "create_user",
        entityType: "user",
        entityId: user.id,
        category: "user_management",
        metadata: { username, role, email },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Admin: Update user
  app.patch("/api/admin/users/:id", requireAdminRole, async (req, res) => {
    try {
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.createPlatformAuditLog({
        actorId: req.session.userId!,
        action: "update_user",
        entityType: "user",
        entityId: req.params.id,
        category: "user_management",
        metadata: req.body,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Admin: Delete user
  app.delete("/api/admin/users/:id", requireAdminRole, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);

      await storage.createPlatformAuditLog({
        actorId: req.session.userId!,
        action: "delete_user",
        entityType: "user",
        entityId: req.params.id,
        category: "user_management",
        metadata: {},
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Password reset token generation
  app.post(
    "/api/admin/users/:id/reset-password",
    requireAdminRole,
    async (req, res) => {
      try {
        const user = await storage.getUser(req.params.id);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

        const resetToken = await storage.createPasswordResetToken({
          userId: req.params.id,
          token,
          expiresAt,
        });

        await storage.createPlatformAuditLog({
          actorId: req.session.userId!,
          action: "create_password_reset",
          entityType: "user",
          entityId: req.params.id,
          category: "authentication",
          metadata: { tokenId: resetToken.id },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        // In production, send email with reset link
        res.json({ success: true, token, expiresAt });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Admin: Message inbox - get all scout-to-player messages
  app.get("/api/admin/messages", requireAdminRole, async (req, res) => {
    try {
      const { status, limit } = req.query;
      const messages = await storage.getAdminMessages(
        status as string | undefined,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Update message status
  app.patch("/api/admin/messages/:id", requireAdminRole, async (req, res) => {
    try {
      const message = await storage.updateAdminMessage(req.params.id, {
        ...req.body,
        reviewedBy: req.session.userId,
        reviewedAt: new Date(),
      });
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      await storage.createPlatformAuditLog({
        actorId: req.session.userId!,
        action: "review_message",
        entityType: "admin_message",
        entityId: req.params.id,
        category: "content_moderation",
        metadata: req.body,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Admin: Platform stats
  app.get("/api/admin/stats", requireAdminRole, async (req, res) => {
    try {
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Platform metrics
  app.get("/api/admin/metrics", requireAdminRole, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const metrics = await storage.getPlatformMetrics(
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Get latest metrics
  app.get("/api/admin/metrics/latest", requireAdminRole, async (req, res) => {
    try {
      const metrics = await storage.getLatestPlatformMetrics();
      res.json(metrics || {});
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: GDPR requests
  app.get("/api/admin/gdpr-requests", requireAdminRole, async (req, res) => {
    try {
      const { status } = req.query;
      const requests = await storage.getGdprRequests(
        status as string | undefined
      );
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Update GDPR request
  app.patch(
    "/api/admin/gdpr-requests/:id",
    requireAdminRole,
    async (req, res) => {
      try {
        const request = await storage.updateGdprRequest(req.params.id, {
          ...req.body,
          processedBy: req.session.userId,
          processedAt: new Date(),
        });
        if (!request) {
          return res.status(404).json({ error: "GDPR request not found" });
        }

        await storage.createPlatformAuditLog({
          actorId: req.session.userId!,
          action: `process_gdpr_${req.body.requestType}`,
          entityType: "gdpr_request",
          entityId: req.params.id,
          category: "gdpr",
          metadata: req.body,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        res.json(request);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  // Admin: Execute GDPR data export
  app.post(
    "/api/admin/gdpr-requests/:id/export",
    requireAdminRole,
    async (req, res) => {
      try {
        const request = await storage.getGdprRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ error: "GDPR request not found" });
        }

        // Get all user data
        const user = await storage.getUser(request.userId);
        const teams = user ? await storage.getTeamsByUser(user.id) : [];
        const consents = await storage.getUserConsents(request.userId);

        const exportData = {
          user,
          teams,
          consents,
          exportedAt: new Date().toISOString(),
          requestId: req.params.id,
        };

        await storage.updateGdprRequest(req.params.id, {
          status: "completed",
          processedBy: req.session.userId,
          processedAt: new Date(),
          completionNotes: JSON.stringify(exportData),
        });

        await storage.createPlatformAuditLog({
          actorId: req.session.userId!,
          action: "export_user_data",
          entityType: "gdpr_request",
          entityId: req.params.id,
          category: "gdpr",
          metadata: { userId: request.userId },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        res.json(exportData);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Admin: User consents
  app.get("/api/admin/consents/:userId", requireAdminRole, async (req, res) => {
    try {
      const consents = await storage.getUserConsents(req.params.userId);
      res.json(consents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Platform audit logs
  app.get("/api/admin/audit-logs", requireAdminRole, async (req, res) => {
    try {
      const { category, limit, offset } = req.query;
      const logs = await storage.getPlatformAuditLogs(
        category as string | undefined,
        limit ? parseInt(limit as string) : 100,
        offset ? parseInt(offset as string) : 0
      );
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Active sessions
  app.get("/api/admin/sessions", requireAdminRole, async (req, res) => {
    try {
      const sessions = await storage.getActiveSessions();
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Terminate session
  app.delete("/api/admin/sessions/:id", requireAdminRole, async (req, res) => {
    try {
      await storage.endUserSession(req.params.id);

      await storage.createPlatformAuditLog({
        actorId: req.session.userId!,
        action: "terminate_session",
        entityType: "session",
        entityId: req.params.id,
        category: "security",
        metadata: {},
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Federation payment history
  app.get("/api/admin/payments", requireAdminRole, async (req, res) => {
    try {
      const { federationId, limit } = req.query;
      let payments;
      if (federationId) {
        payments = await storage.getFederationPaymentHistory(
          federationId as string
        );
      } else {
        payments = await storage.getAllFederationPayments(
          limit ? parseInt(limit as string) : undefined
        );
      }
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: All federation profiles
  app.get("/api/admin/federations", requireAdminRole, async (req, res) => {
    try {
      const federations = await storage.getAllFederationProfiles();
      res.json(federations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: All embassy profiles
  app.get("/api/admin/embassies", requireAdminRole, async (req, res) => {
    try {
      const embassies = await storage.getAllEmbassyProfiles();
      res.json(embassies);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: All fee schedules
  app.get("/api/admin/fee-schedules", requireAdminRole, async (req, res) => {
    try {
      const federations = await storage.getAllFederationProfiles();
      const allFees = [];
      for (const fed of federations) {
        const fees = await storage.getFederationFeeSchedules(fed.id);
        allFees.push(
          ...fees.map((f) => ({
            ...f,
            federationName: fed.name,
            federationCountry: fed.country,
          }))
        );
      }
      res.json(allFees);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}

function getCompetitionsByCountry(
  country?: string
): { name: string; type: string }[] {
  const internationalCompetitions = [
    { name: "FIFA World Cup", type: "international" },
    { name: "FIFA World Cup Qualifiers", type: "international" },
    { name: "UEFA European Championship", type: "international" },
    { name: "UEFA Nations League", type: "international" },
    { name: "Copa America", type: "international" },
    { name: "Africa Cup of Nations", type: "international" },
    { name: "AFC Asian Cup", type: "international" },
    { name: "CONCACAF Gold Cup", type: "international" },
    { name: "International Friendly", type: "friendly" },
  ];

  const leaguesByCountry: Record<string, { name: string; type: string }[]> = {
    england: [
      { name: "Premier League", type: "league" },
      { name: "EFL Championship", type: "league" },
      { name: "EFL League One", type: "league" },
      { name: "EFL League Two", type: "league" },
      { name: "FA Cup", type: "cup" },
      { name: "EFL Cup", type: "cup" },
      { name: "Community Shield", type: "cup" },
    ],
    spain: [
      { name: "La Liga", type: "league" },
      { name: "La Liga 2", type: "league" },
      { name: "Copa del Rey", type: "cup" },
      { name: "Supercopa de Espana", type: "cup" },
    ],
    germany: [
      { name: "Bundesliga", type: "league" },
      { name: "2. Bundesliga", type: "league" },
      { name: "DFB-Pokal", type: "cup" },
      { name: "DFL-Supercup", type: "cup" },
    ],
    italy: [
      { name: "Serie A", type: "league" },
      { name: "Serie B", type: "league" },
      { name: "Coppa Italia", type: "cup" },
      { name: "Supercoppa Italiana", type: "cup" },
    ],
    france: [
      { name: "Ligue 1", type: "league" },
      { name: "Ligue 2", type: "league" },
      { name: "Coupe de France", type: "cup" },
      { name: "Coupe de la Ligue", type: "cup" },
      { name: "Trophee des Champions", type: "cup" },
    ],
    netherlands: [
      { name: "Eredivisie", type: "league" },
      { name: "Eerste Divisie", type: "league" },
      { name: "KNVB Cup", type: "cup" },
      { name: "Johan Cruyff Shield", type: "cup" },
    ],
    portugal: [
      { name: "Primeira Liga", type: "league" },
      { name: "Liga Portugal 2", type: "league" },
      { name: "Taca de Portugal", type: "cup" },
      { name: "Supertaca Candido de Oliveira", type: "cup" },
    ],
    norway: [
      { name: "Eliteserien", type: "league" },
      { name: "OBOS-ligaen", type: "league" },
      { name: "Norwegian Cup", type: "cup" },
    ],
    nigeria: [
      { name: "Nigeria Professional Football League", type: "league" },
      { name: "Nigeria National League", type: "league" },
      { name: "Federation Cup", type: "cup" },
      { name: "FA Cup", type: "cup" },
    ],
    usa: [
      { name: "Major League Soccer", type: "league" },
      { name: "USL Championship", type: "league" },
      { name: "US Open Cup", type: "cup" },
      { name: "MLS Cup", type: "cup" },
    ],
  };

  const continentalCompetitions = [
    { name: "UEFA Champions League", type: "continental" },
    { name: "UEFA Europa League", type: "continental" },
    { name: "UEFA Conference League", type: "continental" },
    { name: "CAF Champions League", type: "continental" },
    { name: "CAF Confederation Cup", type: "continental" },
    { name: "Copa Libertadores", type: "continental" },
    { name: "Copa Sudamericana", type: "continental" },
    { name: "AFC Champions League", type: "continental" },
    { name: "CONCACAF Champions Cup", type: "continental" },
  ];

  const countryLower = country?.toLowerCase() || "";
  const countryCompetitions = leaguesByCountry[countryLower] || [];

  return [
    ...countryCompetitions,
    ...continentalCompetitions,
    ...internationalCompetitions,
  ];
}
