import type { Express } from "express";
import { type Server } from "http";
import {
  registerObjectStorageRoutes,
  ObjectStorageService,
} from "./replit_integrations/object_storage";

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
import { requireAuth } from "./middleware/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Register object storage routes
  registerObjectStorageRoutes(app);
  const objectStorageService = new ObjectStorageService();

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

  // Object storage upload URL endpoint
  app.get("/api/object-storage/upload-url", requireAuth, async (req, res) => {
    try {
      const signedUrl = await objectStorageService.getObjectEntityUploadURL();
      const url = new URL(signedUrl);
      const pathParts = url.pathname.split("/");
      const objectName = pathParts.slice(2).join("/");

      res.json({
        signedUrl,
        key: `${pathParts[1]}/${objectName}`,
        objectPath: `/objects/uploads/${objectName.split("/").pop()}`,
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
