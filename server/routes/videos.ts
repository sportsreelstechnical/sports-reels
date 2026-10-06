import type { Express, Request, Response } from "express";

import { storage, tokensRepository, videosRepository } from "../storage";
import { requireAuth, requireTeamRole } from "../middleware/auth";
import { MAX_PLAYERS_PER_VIDEO } from "../constants";
import { updatePlayerStatsFromVideos } from "../utils/helpers";
import axios from "axios";
import { asyncHandler } from "../utils/catchAsync";
import { insertVideoSchema } from "../shared/schema";

export function registerVideoRoutes(app: Express): void {
  app.post(
    "/api/videos/initiate-upload",
    requireAuth,
    requireTeamRole,
    asyncHandler(async (req: Request, res: Response) => {
      // validate request body

      /* const userId = req.session.userId;
      when payment is back on we finalize tokenization
      let balance = await storage.getTokenBalance(userId);

      if (balance.balance < 50) {
        return res
          .status(400)
          .json({ message: "You don't have enough tokens for this action" });
      }
     */
      console.log("Initiating upload"); // use pino
      // create a row in Video
      const videoData = insertVideoSchema.parse({
        ...req.body.storage_data,
        processed: false,
        teamId: req.session?.teamId,
      });
      const video = await storage.createVideo(videoData);

      // send request to internal microservice
      const response = await axios.post(
        `${process.env.VIDEO_SERVICE_BASE_URL}/api/v1/upload/initiate`,
        {
          // user_id: userId,
          job_type: req.body.job_type,
          filename: req.body.filename,
          total_chunks: req.body.total_chunks,
          // storage_data: req.body.storage_data ?? null,
          content_type: req.body.content_type,
        },
        {
          headers: {
            "X-Internal-API-Secret": process.env.INTERNAL_API_SECRET,
            "Content-Type": "application/json",
          },
        }
      );
      const data = {
        ...response.data,
        video_id: video.id,
      };

      return res.json(data);
    })
  );

  app.post(
    "/api/videos/:id/complete",
    requireAuth,
    requireTeamRole,
    asyncHandler(async (req: Request, res: Response) => {
      const videoId = req.params.id;
      console.log("Completing upload"); // use pino

      // validate request body

      // send request to internal microservice
      const response = await axios.post(
        `${process.env.VIDEO_SERVICE_BASE_URL}/api/v1/upload/complete`,
        {
          // user_id: userId, for payment case
          video_id: videoId,
          job_type: req.body.job_type,
          upload_id: req.body.upload_id,
          video_key: req.body.video_key,
          parts: req.body.parts,
          // storage_data: req.body.storage_data ?? null,
        },
        {
          headers: {
            "X-Internal-API-Secret": process.env.INTERNAL_API_SECRET,
            "Content-Type": "application/json",
          },
        }
      );
      return res.json(response.data);
    })
  );

  app.get(
    "/api/videos/:id/event_tags",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const videoId = req.params.id;
      const { player_id, event_type, data_point_category, verified_only } =
        req.query;

      const queryParams = {};
      // @ts-ignore
      if (player_id) queryParams.player_id = player_id;
      // @ts-ignore
      if (event_type) queryParams.event_type = event_type;
      if (data_point_category)
        // @ts-ignore
        queryParams.data_point_category = data_point_category;
      if (typeof verified_only === "boolean")
        // @ts-ignore
        queryParams.verified_only = verified_only;

      console.log(queryParams);
      const response = await axios.get(
        `${process.env.VIDEO_SERVICE_BASE_URL}/api/v1/videos/${videoId}/event_tags`,
        {
          params: queryParams,
          headers: {
            "X-Internal-API-Secret": process.env.INTERNAL_API_SECRET,
            Accept: "application/json",
          },
        }
      );

      return res.json(response.data);
    })
  );

  app.post(
    "/api/videos/:id/verify_tags",
    requireAuth,
    requireTeamRole,
    asyncHandler(async (req: Request, res: Response) => {
      const videoId = req.params.id;

      // send request to internal microservice
      const response = await axios.post(
        `${process.env.VIDEO_SERVICE_BASE_URL}/api/v1/videos/${videoId}/verify_tags`,
        {},
        {
          headers: {
            "X-Internal-API-Secret": process.env.INTERNAL_API_SECRET,
            "Content-Type": "application/json",
          },
        }
      );
      return res.json(response.data);
    })
  );

  app.get(
    "/api/videos/:id/export_tags",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      // validate request body
      const videoId = req.params.id;
      const { format } = req.query;

      console.log("Initiating export"); // use pino

      // send request to internal microservice
      const response = await axios.get(
        `${process.env.VIDEO_SERVICE_BASE_URL}/api/v1/matches/${videoId}/export`,
        {
          params: { format: format },
          headers: {
            "X-Internal-API-Secret": process.env.INTERNAL_API_SECRET,
            Accept: "*/*",
          },
          responseType: "stream",
        }
      );

      if (response.headers["content-type"]) {
        // @ts-ignore
        res.setHeader("Content-Type", response.headers["content-type"]);
      }

      if (response.headers["content-disposition"]) {
        res.setHeader(
          "Content-Disposition",
          response.headers["content-disposition"]
        );
      }

      response.data.pipe(res);
    })
  );

  app.get("/api/videos", requireAuth, async (req: Request, res: Response) => {
    try {
      const { playerId, processed } = req.query;
      const videos = playerId
        ? await storage.getProfileVideos(playerId as string)
        : processed
        ? await storage.getVideos(playerId, Boolean(processed))
        : await storage.getVideos();
      res.json(videos);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Unknown error" });
      }
    }
  });

  app.get(
    "/api/videos/by-title",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { title, teamId } = req.query;

        if (!title || typeof title !== "string") {
          return res.status(400).json({ error: "Title is required" });
        }

        const videos = await storage.getVideosByTitle(
          title,
          teamId as string | undefined
        );
        res.json(videos);
      } catch (error) {
        if (error instanceof Error) {
          res.status(500).json({ error: error.message });
        } else {
          res.status(500).json({ error: "Unknown error" });
        }
      }
    }
  );

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
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Unknown error" });
      }
    }
  });

  app.put(
    "/api/videos/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        // @ts-ignore
        const video = await storage.getVideo(req.params.id);
        if (!video) {
          return res.status(404).json({ error: "Video not found" });
        }
        // @ts-ignore
        const updatedVideo = await storage.updateVideo(req.params.id, req.body);

        if (updatedVideo && updatedVideo.playerId) {
          await updatePlayerStatsFromVideos(updatedVideo.playerId);
        }

        res.json(updatedVideo);
      } catch (error) {
        if (error instanceof Error) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(400).json({ error: "Unknown error" });
        }
      }
    }
  );

  app.delete(
    "/api/videos/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        //@ts-ignore
        const video = await storage.getVideo(req.params.id);
        if (!video) {
          return res.status(404).json({ error: "Video not found" });
        }

        // Delete from R2 if it's an R2 file (simple check or always try)
        if (video.fileUrl && !video.fileUrl.startsWith("/objects/")) {
          // It's likely an R2 key
          try {
            // Dynamically import to avoid circular dependencies if any, or just standard import above
            const { deleteFile } = await import("../services/r2");
            await deleteFile(video.fileUrl);

            // Also try to delete thumbnail if it exists and is not local
            if (
              video.thumbnailUrl &&
              !video.thumbnailUrl.startsWith("/objects/")
            ) {
              await deleteFile(video.thumbnailUrl);
            }
          } catch (e) {
            console.error("Failed to delete R2 file:", e);
            // Continue to delete from DB even if R2 delete fails?
            // Yes, to keep DB clean, but maybe warn
          }
        }

        //@ts-ignore
        await storage.deleteVideo(req.params.id);
        res.json({ success: true });
      } catch (error) {
        if (error instanceof Error) {
          res.status(500).json({ error: error.message });
        } else {
          res.status(500).json({ error: "Unknown error" });
        }
      }
    }
  );

  app.get(
    "/api/videos/:id/player-tags",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        //@ts-ignore
        const tags = await storage.getVideoPlayerTags(req.params.id);
        res.json(tags);
      } catch (error) {
        if (error instanceof Error) {
          res.status(500).json({ error: error.message });
        } else {
          res.status(500).json({ error: "Unknown error" });
        }
      }
    }
  );

  app.post(
    "/api/videos/:id/player-tags",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        //@ts-ignore
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
          videoId: req.params.id, //@ts-ignore
          playerId,
          minutesPlayed: minutesPlayed || 0,
          position,
        });

        if (playerId && minutesPlayed && minutesPlayed > 0) {
          await updatePlayerStatsFromVideos(playerId);
        }

        res.json(tag);
      } catch (error) {
        if (error instanceof Error) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(400).json({ error: "Unknown error" });
        }
      }
    }
  );

  app.put(
    "/api/video-player-tags/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        //@ts-ignore
        const tag = await storage.updateVideoPlayerTag(req.params.id, req.body);
        if (!tag) {
          return res.status(404).json({ error: "Tag not found" });
        }

        if (tag.playerId && tag.minutesPlayed && tag.minutesPlayed > 0) {
          await updatePlayerStatsFromVideos(tag.playerId);
        }

        res.json(tag);
      } catch (error) {
        if (error instanceof Error) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(400).json({ error: "Unknown error" });
        }
      }
    }
  );

  app.delete(
    "/api/video-player-tags/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        //@ts-ignore
        const tag = await storage.getVideoPlayerTag(req.params.id);
        if (!tag) {
          return res.status(404).json({ error: "Tag not found" });
        }

        // await storage.deleteVideoPlayerTag(req.params.id);

        //@ts-ignore

        await storage.deleteVideoPlayerTag(req.params.id);

        if (tag.playerId) {
          await updatePlayerStatsFromVideos(tag.playerId);
        }

        res.json({ success: true });
      } catch (error) {
        if (error instanceof Error) {
          res.status(500).json({ error: error.message });
        } else {
          res.status(500).json({ error: "Unknown error" });
        }
      }
    }
  );
}
