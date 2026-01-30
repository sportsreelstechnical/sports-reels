import type { Express } from "express";
import fs from "fs";
import path from "path";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Extract the storage key from the upload URL
      // The uploadURL is a presigned URL like: https://account.r2.cloudflarestorage.com/bucket/path/to/file?signature...
      console.log("=== UPLOAD URL DEBUG ===");
      console.log("Upload URL:", uploadURL);

      const url = new URL(uploadURL);
      const pathParts = url.pathname.split("/");
      console.log("Path parts:", pathParts);

      const storageKey = pathParts.slice(1).join("/"); // This is the actual R2 key
      console.log("Extracted storage key:", storageKey);

      const objectPath = `/objects/uploads/${uploadURL.split("/").pop()?.split("?")[0]}`;
      console.log("Object path:", objectPath);
      console.log("=======================");

      res.json({
        uploadURL,
        objectPath,
        storageKey, // Add the actual R2 storage key
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // R2 Presign endpoint for document uploads
  app.post("/api/object-storage/presign", async (req, res) => {
    try {
      const { filename, contentType, folder } = req.body;
      const { generatePresignedPutUrl } = await import("../../services/r2");
      const { randomUUID } = await import("crypto");

      // Generate unique key
      const fileExt = filename?.split(".").pop() || "bin";
      const uniqueId = randomUUID();
      const storageKey = folder
        ? `${folder}/${uniqueId}.${fileExt}`
        : `uploads/${uniqueId}.${fileExt}`;

      // Generate R2 presigned PUT URL
      const url = await generatePresignedPutUrl(
        storageKey,
        contentType || "application/octet-stream",
      );

      // For backwards compatibility with local storage
      const objectPath = storageKey;

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

  app.put("/api/uploads/:id", async (req, res) => {
    try {
      const objectId = req.params.id;
      const STORAGE_DIR = path.join(process.cwd(), "storage_data");

      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }

      const filePath = path.join(STORAGE_DIR, objectId);
      const writeStream = fs.createWriteStream(filePath);

      req.pipe(writeStream);

      writeStream.on("finish", () => {
        res.status(200).json({ success: true, id: objectId });
      });

      writeStream.on("error", (err: unknown) => {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Upload failed" });
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const { generatePresignedGetUrl } = await import("../../services/r2");
      const objectPath = req.params.objectPath;

      console.log("=== OBJECT DOWNLOAD REQUEST ===");
      console.log("Requested path:", objectPath);
      console.log("Full path:", req.path);

      // Generate R2 presigned GET URL
      const downloadUrl = await generatePresignedGetUrl(objectPath, 300); // 5 minutes

      console.log("Generated R2 URL:", downloadUrl);
      console.log("==============================");

      // Redirect to R2 presigned URL
      res.redirect(downloadUrl);
    } catch (error) {
      console.error("Error serving object from R2:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}
