import { Router } from "express";
import { randomUUID } from "crypto";
import { copyFile, getFileInfo, generatePresignedGetUrl } from "../services/r2";

const jobs = new Map<
  string,
  { status: string; progress: number; compressedKey?: string; error?: string }
>();

export const registerCompressionRoutes = (app: Router) => {
  // Accept app: Express or add to app directly? Usually app passed is Express/Router
  const router = Router();

  router.post("/compress-video", async (req, res) => {
    try {
      const { originalKey } = req.body;
      if (!originalKey)
        return res.status(400).json({ error: "originalKey required" });

      const jobId = randomUUID();
      jobs.set(jobId, { status: "processing", progress: 0 });

      // Simulate compression
      (async () => {
        try {
          // Update progress
          jobs.set(jobId, { status: "processing", progress: 10 });
          await new Promise((r) => setTimeout(r, 1000));

          jobs.set(jobId, { status: "processing", progress: 30 });

          // "Compress" by copying to a new key
          // If originalKey is 'originals/videos/...', change to 'compressed/videos/...'
          const compressedKey = originalKey.includes("originals/")
            ? originalKey.replace("originals/", "compressed/")
            : `compressed/${originalKey}`;

          await copyFile(originalKey, compressedKey);

          jobs.set(jobId, { status: "processing", progress: 80 });
          await new Promise((r) => setTimeout(r, 1000));

          jobs.set(jobId, {
            status: "completed",
            progress: 100,
            compressedKey,
          });
        } catch (err) {
          console.error("Compression job failed:", err);
          jobs.set(jobId, {
            status: "failed",
            progress: 0,
            error: "Compression failed",
          });
        }
      })();

      res.json({ jobId });
    } catch (error) {
      console.error("Compression start error:", error);
      res.status(500).json({ error: "Failed to start compression" });
    }
  });

  router.get("/compression-status/:jobId", (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });

  router.post("/compressed-file-info", async (req, res) => {
    try {
      const { key } = req.body;
      const info = await getFileInfo(key);
      if (!info) return res.status(404).json({ error: "File not found" });

      const url = await generatePresignedGetUrl(key);
      res.json({ size: info.size, url });
    } catch (error) {
      console.error("Get compressed info error:", error);
      res.status(500).json({ error: "Failed to get info" });
    }
  });

  app.use("/api", router);
};
