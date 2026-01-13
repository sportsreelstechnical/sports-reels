import type { Express } from "express";
import fs from "fs";
import path from "path";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "/api/uploads/uuid",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   */
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Extract object path from the URL
      // For local storage, uploadURL IS the path we want to use, but let's normalize it
      const objectPath = `/objects/uploads/${uploadURL.split("/").pop()}`;

      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Handle actual file upload (PUT) for local storage.
   * This mimics the GCS signed URL behavior but works locally.
   */
  app.put("/api/uploads/:id", async (req, res) => {
    try {
      const objectId = req.params.id;
      // removing leading slash if present in uploadURL logic,
      // but here we construct path manually to match objectStorage logic
      // We need to save to storage_data/objectId (or filename)

      // objectStorage.ts uses simple logic: storage_data/filename
      // So let's save it as that ID.

      // We need to import fs and path here or delegate to service.
      // Let's delegate to service if possible, or just do it here since it's simple local logic.
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

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   */
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path
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
