import type { Express, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { insertVideoSchema } from "@shared/schema";
import {
  updatePlayerStatsFromVideos,
  MAX_PLAYERS_PER_VIDEO,
  getPositionalMetricsPrompt,
} from "../utils/helpers";

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: { baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL },
});

export function registerVideoRoutes(app: Express): void {
  app.get("/api/videos", requireAuth, async (req: Request, res: Response) => {
    try {
      const { playerId } = req.query;
      const videos = await storage.getVideos(playerId as string | undefined);
      res.json(videos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/videos", requireAuth, async (req: Request, res: Response) => {
    try {
      const videoData = insertVideoSchema.parse({
        ...req.body,
        teamId: req.session.teamId,
      });
      const video = await storage.createVideo(videoData);

      if (video.playerId && video.minutesPlayed && video.minutesPlayed > 0) {
        await updatePlayerStatsFromVideos(video.playerId);
      }

      res.json(video);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put(
    "/api/videos/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const video = await storage.getVideo(req.params.id);
        if (!video) {
          return res.status(404).json({ error: "Video not found" });
        }
        const updatedVideo = await storage.updateVideo(req.params.id, req.body);

        if (updatedVideo && updatedVideo.playerId) {
          await updatePlayerStatsFromVideos(updatedVideo.playerId);
        }

        res.json(updatedVideo);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/videos/:id/player-tags",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const tags = await storage.getVideoPlayerTags(req.params.id);
        res.json(tags);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/videos/:id/player-tags",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const existingTags = await storage.getVideoPlayerTags(req.params.id);
        if (existingTags.length >= MAX_PLAYERS_PER_VIDEO) {
          return res.status(400).json({
            error: `Maximum ${MAX_PLAYERS_PER_VIDEO} players can be tagged per video`,
          });
        }

        const { playerId, minutesPlayed, position } = req.body;

        const alreadyTagged = existingTags.find((t) => t.playerId === playerId);
        if (alreadyTagged) {
          return res
            .status(400)
            .json({ error: "This player is already tagged to this video" });
        }

        const tag = await storage.createVideoPlayerTag({
          videoId: req.params.id,
          playerId,
          minutesPlayed: minutesPlayed || 0,
          position,
        });

        if (playerId && minutesPlayed && minutesPlayed > 0) {
          await updatePlayerStatsFromVideos(playerId);
        }

        res.json(tag);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.put(
    "/api/video-player-tags/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const tag = await storage.updateVideoPlayerTag(req.params.id, req.body);
        if (!tag) {
          return res.status(404).json({ error: "Tag not found" });
        }

        if (tag.playerId && tag.minutesPlayed && tag.minutesPlayed > 0) {
          await updatePlayerStatsFromVideos(tag.playerId);
        }

        res.json(tag);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/video-player-tags/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const tag = await storage.getVideoPlayerTag(req.params.id);
        if (!tag) {
          return res.status(404).json({ error: "Tag not found" });
        }

        await storage.deleteVideoPlayerTag(req.params.id);

        if (tag.playerId) {
          await updatePlayerStatsFromVideos(tag.playerId);
        }

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );
}
