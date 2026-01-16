import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireTeamRole } from "../middleware/auth";

export function registerPlayerDocumentsRoutes(app: Express): void {
  // Get player documents
  app.get(
    "/api/players/:playerId/documents",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        const documents = await storage.getPlayerDocuments(req.params.playerId);
        res.json(documents);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  // Upload player document
  app.post(
    "/api/players/:playerId/documents",
    requireTeamRole,
    async (req: Request, res: Response) => {
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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(400).json({ error: message });
      }
    },
  );

  // Update player document
  app.put(
    "/api/players/:playerId/documents/:docId",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        const document = await storage.updatePlayerDocument(
          req.params.docId,
          req.body,
        );
        if (!document) {
          return res.status(404).json({ error: "Document not found" });
        }
        res.json(document);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(400).json({ error: message });
      }
    },
  );

  // Delete player document
  app.delete(
    "/api/players/:playerId/documents/:docId",
    requireTeamRole,
    async (req: Request, res: Response) => {
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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  // Verify document
  app.post(
    "/api/players/:playerId/documents/:docId/verify",
    requireTeamRole,
    async (req: Request, res: Response) => {
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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(400).json({ error: message });
      }
    },
  );

  // Get document versions
  app.get(
    "/api/players/:playerId/documents/:docId/versions",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        const versions = await storage.getDocumentVersions(req.params.docId);
        res.json(versions);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  // Create new document version
  app.post(
    "/api/players/:playerId/documents/:docId/versions",
    requireTeamRole,
    async (req: Request, res: Response) => {
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

        const existingVersions = await storage.getDocumentVersions(
          req.params.docId,
        );
        const nextVersionNumber =
          existingVersions.length > 0
            ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1
            : 1;

        for (const version of existingVersions) {
          if (version.isCurrent) {
            await storage.setCurrentVersion(req.params.docId, version.id);
          }
        }

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

        await storage.updatePlayerDocument(req.params.docId, {
          originalName,
          mimeType,
          fileSize,
          storageKey,
          objectPath,
        });

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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(400).json({ error: message });
      }
    },
  );

  // Restore document version
  app.post(
    "/api/players/:playerId/documents/:docId/versions/:versionId/restore",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        const version = await storage.getDocumentVersion(req.params.versionId);
        if (!version) {
          return res.status(404).json({ error: "Version not found" });
        }

        const document = await storage.getPlayerDocument(req.params.docId);
        if (!document) {
          return res.status(404).json({ error: "Document not found" });
        }

        await storage.updatePlayerDocument(req.params.docId, {
          originalName: version.originalName,
          mimeType: version.mimeType,
          fileSize: version.fileSize,
          storageKey: version.storageKey,
          objectPath: version.objectPath,
        });

        await storage.setCurrentVersion(req.params.docId, req.params.versionId);

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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(400).json({ error: message });
      }
    },
  );

  // Document audit logs
  app.get(
    "/api/players/:playerId/documents/:docId/audit-logs",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        const logs = await storage.getDocumentAuditLogs(req.params.docId);
        res.json(logs);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  app.get(
    "/api/players/:playerId/audit-logs",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        const logs = await storage.getDocumentAuditLogsByPlayer(
          req.params.playerId,
        );
        res.json(logs);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  app.get(
    "/api/team/document-audit-logs",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        const limit = req.query.limit
          ? parseInt(req.query.limit as string)
          : 100;
        const logs = await storage.getDocumentAuditLogsByTeam(
          req.session.teamId || "demo-team",
          limit,
        );
        res.json(logs);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );
}
