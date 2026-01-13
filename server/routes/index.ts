import type { Express } from "express";
import type { Server } from "http";
import {
  registerObjectStorageRoutes,
  ObjectStorageService,
} from "../replit_integrations/object_storage";
import { requireAuth } from "../middleware/auth";

import { registerAuthRoutes } from "./auth";
import { registerPlayerRoutes } from "./players";
import { registerVideoRoutes } from "./videos";
import { registerMessagingRoutes } from "./messaging";
import { registerDashboardRoutes } from "./dashboard";
import { registerEligibilityRoutes } from "./eligibility";
import { registerComplianceRoutes } from "./compliance";
import { registerScoutingRoutes } from "./scouting";

export async function registerAllRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerObjectStorageRoutes(app);
  const objectStorageService = new ObjectStorageService();

  app.get("/api/object-storage/upload-url", requireAuth, async (req, res) => {
    try {
      const signedUrl = await objectStorageService.getObjectEntityUploadURL();
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

  registerAuthRoutes(app);
  registerPlayerRoutes(app);
  registerVideoRoutes(app);
  registerMessagingRoutes(app);
  registerDashboardRoutes(app);
  registerEligibilityRoutes(app);
  registerComplianceRoutes(app);
  registerScoutingRoutes(app);

  return httpServer;
}
