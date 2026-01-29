import type { Express } from "express";
import { type Server } from "http";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

// Import modular routes
import { registerAuthRoutes } from "./routes/auth";
import { registerR2Routes } from "./routes/r2";
import { registerCompressionRoutes } from "./routes/compression";
import { registerPlayerRoutes } from "./routes/players";
import { registerVideoRoutes } from "./routes/videos";
import { registerMessagingRoutes } from "./routes/messaging";
import { registerReportRoutes } from "./routes/reports";
import { registerDashboardRoutes } from "./routes/dashboard";
import { registerTeamRoutes } from "./routes/teams";
import { registerEligibilityRoutes } from "./routes/eligibility";
import { registerComplianceRoutes } from "./routes/compliance";
import { registerScoutingRoutes } from "./routes/scouting";
import { registerPlayerDocumentsRoutes } from "./routes/player-documents";
import { registerEmbassyRoutes } from "./routes/embassy";
import { registerTokenRoutes } from "./routes/tokens";
import { registerNotificationRoutes } from "./routes/notifications";
import { registerInvitationLetterRoutes } from "./routes/invitation-letters";
import { registerFederationRoutes } from "./routes/federation";
import { requireAuth } from "./middleware/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Register object storage routes
  registerObjectStorageRoutes(app);

  // Register all domain-specific routes
  registerR2Routes(app);
  registerCompressionRoutes(app);
  registerAuthRoutes(app);
  registerPlayerRoutes(app);
  registerVideoRoutes(app);
  registerMessagingRoutes(app);
  registerReportRoutes(app);

  registerDashboardRoutes(app);
  registerTeamRoutes(app);
  registerEligibilityRoutes(app);
  registerComplianceRoutes(app);
  registerScoutingRoutes(app);
  registerPlayerDocumentsRoutes(app);
  registerEmbassyRoutes(app);
  registerTokenRoutes(app);
  registerNotificationRoutes(app);
  registerInvitationLetterRoutes(app);
  registerFederationRoutes(app);

  // Object storage upload URL endpoint - uses Cloudflare R2
  app.get("/api/object-storage/upload-url", requireAuth, async (req, res) => {
    try {
      const { folder, contentType } = req.query;

      if (!contentType || typeof contentType !== "string") {
        return res
          .status(400)
          .json({ error: "contentType query parameter is required" });
      }

      // Import R2 service
      const { generatePresignedPutUrl } = await import("./services/r2");
      const { randomUUID } = await import("crypto");

      // Generate a unique key for the file
      const fileId = randomUUID();
      const folderPath =
        folder && typeof folder === "string" ? folder : "uploads";
      const key = `${folderPath}/${fileId}`;

      // Generate presigned URL for uploading to R2
      const signedUrl = await generatePresignedPutUrl(key, contentType, 3600);

      res.json({
        signedUrl,
        key,
        objectPath: key, // The path in R2 where the file will be stored
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: errorMessage });
    }
  });

  return httpServer;
}
