import fs from "fs";
import path from "path";
import { Response } from "express";
import { randomUUID } from "crypto";

// Ensure storage directory exists
const STORAGE_DIR = path.join(process.cwd(), "server", "storage_data");
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}
export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    return [STORAGE_DIR];
  }

  getPrivateObjectDir(): string {
    return STORAGE_DIR;
  }

  async searchPublicObject(
    filePath: string,
  ): Promise<{ name: string; path: string } | null> {
    const fullPath = path.join(STORAGE_DIR, filePath);
    if (fs.existsSync(fullPath)) {
      return {
        name: filePath,
        path: fullPath,
      };
    }
    return null;
  }

  // Streaming download from local file system
  async downloadObject(
    file: { path: string; name: string },
    res: Response,
    cacheTtlSec: number = 3600,
  ) {
    try {
      if (!fs.existsSync(file.path)) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      res.sendFile(file.path, {
        maxAge: cacheTtlSec * 1000,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    // Use relative path for local development, or BACKEND_URL if available
    const baseUrl = process.env.BACKEND_URL || "http://localhost:5001";
    return `${baseUrl}/api/uploads/${objectId}`;
  }

  async getObjectEntityFile(
    objectPath: string,
  ): Promise<{ name: string; path: string }> {
    const filename = objectPath.split("/").pop();
    if (!filename) throw new ObjectNotFoundError();

    const fullPath = path.join(STORAGE_DIR, filename);
    if (!fs.existsSync(fullPath)) {
      throw new ObjectNotFoundError();
    }

    return {
      name: filename,
      path: fullPath,
    };
  }

  // Simplified no-op for local
  normalizeObjectEntityPath(rawPath: string): string {
    return rawPath;
  }

  // Simplified no-op for local
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    _aclPolicy: unknown,
  ): Promise<string> {
    return rawPath;
  }

  // Allow all access for local dev
  async canAccessObjectEntity({
    userId: _userId,
  }: {
    userId?: string;
  }): Promise<boolean> {
    return true;
  }
}

// Dummy client export to satisfy imports
export const objectStorageClient = {};
