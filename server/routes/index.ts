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
import { registerFederationRoutes } from "./federation";

export async function registerAllRoutes(
  httpServer: Server,
  app: Express,
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
    } catch (error) {
      console.error("Error getting upload URL:", error);
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: message });
    }
  });

  // R2 Presign endpoint for document uploads
  app.post("/api/object-storage/presign", requireAuth, async (req, res) => {
    try {
      const { filename, contentType, folder } = req.body;
      const { generatePresignedPutUrl } = await import("../services/r2");

      // Generate unique key
      const { randomUUID } = await import("crypto");
      const fileExt = filename.split(".").pop();
      const uniqueId = randomUUID();
      const storageKey = folder
        ? `${folder}/${uniqueId}.${fileExt}`
        : `uploads/${uniqueId}.${fileExt}`;

      // Generate R2 presigned PUT URL
      const url = await generatePresignedPutUrl(storageKey, contentType);

      // For backwards compatibility with local storage
      const objectPath = `/objects/${storageKey}`;

      console.log("=== PRESIGN DEBUG ===");
      console.log("Filename:", filename);
      console.log("Content Type:", contentType);
      console.log("Folder:", folder);
      console.log("Storage Key:", storageKey);
      console.log("Presigned URL:", url);
      console.log("Object Path:", objectPath);
      console.log("====================");

      res.json({ url, objectPath, storageKey });
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: message });
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
  registerFederationRoutes(app);

  return httpServer;
}
