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
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}
