import { Router } from "express";
import {
  generatePresignedGetUrl,
  generatePresignedPutUrl,
} from "../services/r2";

export const registerR2Routes = (app: Router) => {
  const router = Router();

  router.post("/presigned-get-url", async (req, res) => {
    try {
      const { key, expiresIn } = req.body;
      if (!key) {
        return res
          .status(400)
          .json({ success: false, error: "Key is required" });
      }

      const url = await generatePresignedGetUrl(key, expiresIn);
      res.json({ success: true, presignedUrl: url });
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      res.status(500).json({ success: false, error: "Failed to generate URL" });
    }
  });

  router.post("/signed-media-urls", async (req, res) => {
    try {
      const { videoKey, thumbnailKey, expiresIn } = req.body;

      const response: any = { success: true };

      if (videoKey) {
        response.videoUrl = await generatePresignedGetUrl(videoKey, expiresIn);
      }

      if (thumbnailKey) {
        response.thumbnailUrl = await generatePresignedGetUrl(
          thumbnailKey,
          expiresIn,
        );
      }

      res.json(response);
    } catch (error) {
      console.error("Error generating signed media URLs:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to generate URLs" });
    }
  });

  router.post("/presigned-put-url", async (req, res) => {
    try {
      const { key, contentType, expiresIn } = req.body;
      if (!key || !contentType) {
        return res
          .status(400)
          .json({ success: false, error: "Key and ContentType are required" });
      }

      const url = await generatePresignedPutUrl(key, contentType, expiresIn);
      res.json({ success: true, presignedUrl: url });
    } catch (error) {
      console.error("Error generating presigned PUT URL:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to generate PUT URL" });
    }
  });

  app.use("/api/r2", router);
};
