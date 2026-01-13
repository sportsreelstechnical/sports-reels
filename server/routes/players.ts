import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth, requireTeamRole } from "../middleware/auth";
import {
  insertPlayerSchema,
  insertPlayerInternationalRecordSchema,
  insertPlayerPhotoSchema,
  insertPlayerDocumentSchema,
} from "@shared/schema";

export function registerPlayerRoutes(app: Express): void {
  app.get("/api/players", requireAuth, async (req: Request, res: Response) => {
    try {
      const players = await storage.getPlayers();
      res.json(players);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get(
    "/api/team/players",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const players = await storage.getPlayers();
        res.json(players);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/players/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const player = await storage.getPlayer(req.params.id);
        if (!player) {
          return res.status(404).json({ error: "Player not found" });
        }

        const metrics = await storage.getPlayerMetrics(player.id);
        const eligibilityScores = await storage.getEligibilityScores(player.id);
        const medicalRecords = await storage.getMedicalRecords(player.id);
        const biometricData = await storage.getBiometricData(player.id);
        const videos = await storage.getVideos(player.id);

        res.json({
          player,
          metrics,
          eligibilityScores,
          medicalRecords,
          biometricData,
          videos,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post("/api/players", requireAuth, async (req: Request, res: Response) => {
    try {
      const playerData = insertPlayerSchema.parse({
        ...req.body,
        teamId: req.body.teamId || "demo-team",
      });
      const player = await storage.createPlayer(playerData);
      res.json(player);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put(
    "/api/players/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const player = await storage.updatePlayer(req.params.id, req.body);
        if (!player) {
          return res.status(404).json({ error: "Player not found" });
        }
        res.json(player);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/players/:id/photos",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const photos = await storage.getPlayerPhotos(req.params.id);
        res.json(photos);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/players/:id/photos",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const data = insertPlayerPhotoSchema.parse({
          ...req.body,
          playerId: req.params.id,
        });
        const photo = await storage.createPlayerPhoto(data);
        res.json(photo);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/player-photos/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        await storage.deletePlayerPhoto(req.params.id);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/players/:id/metrics",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const metrics = await storage.createPlayerMetrics({
          playerId: req.params.id,
          ...req.body,
        });
        res.json(metrics);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/players/:playerId/international-records",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const records = await storage.getPlayerInternationalRecords(
          req.params.playerId
        );
        res.json(records);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/players/:playerId/international-records",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const recordData = insertPlayerInternationalRecordSchema.parse({
          ...req.body,
          playerId: req.params.playerId,
        });
        const record =
          await storage.createPlayerInternationalRecord(recordData);
        res.json(record);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.put(
    "/api/players/:playerId/international-records/:recordId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const record = await storage.updatePlayerInternationalRecord(
          req.params.recordId,
          req.body
        );
        if (!record) {
          return res
            .status(404)
            .json({ error: "International record not found" });
        }
        res.json(record);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/players/:playerId/international-records/:recordId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        await storage.deletePlayerInternationalRecord(req.params.recordId);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/players/:id/publish",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        const playerId = req.params.id;
        const userId = req.session.userId || "demo-user";
        const { publish } = req.body;

        const player = await storage.getPlayer(playerId);
        if (!player) {
          return res.status(404).json({ error: "Player not found" });
        }

        if (publish) {
          const balance = await storage.getTokenBalance(userId);
          const cost = 4;

          if (!balance || balance.balance < cost) {
            return res.status(402).json({
              error: "Insufficient tokens",
              required: cost,
              current: balance?.balance || 0,
              needsTokens: true,
            });
          }

          const newBalance = balance.balance - cost;
          await storage.updateTokenBalance(
            userId,
            newBalance,
            undefined,
            balance.lifetimeSpent + cost
          );

          await storage.createTokenTransaction({
            userId,
            amount: cost,
            type: "debit",
            action: "publish_profile",
            description: `Published ${player.firstName} ${player.lastName} to scout network`,
            playerId,
            balanceAfter: newBalance,
          });

          const publishExpiresAt = new Date();
          publishExpiresAt.setDate(publishExpiresAt.getDate() + 30);

          await storage.updatePlayer(playerId, {
            isPublishedToScouts: true,
            publishedAt: new Date(),
            publishExpiresAt,
          });

          res.json({
            success: true,
            published: true,
            expiresAt: publishExpiresAt,
            tokensSpent: cost,
            newBalance,
          });
        } else {
          await storage.updatePlayer(playerId, {
            isPublishedToScouts: false,
            publishedAt: null,
            publishExpiresAt: null,
          });

          res.json({ success: true, published: false });
        }
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/players/:id/share",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        const playerId = req.params.id;
        const userId = req.session.userId || "demo-user";
        const teamId = req.session.teamId || "demo-team";

        const player = await storage.getPlayer(playerId);
        if (!player) {
          return res.status(404).json({ error: "Player not found" });
        }

        const balance = await storage.getTokenBalance(userId);
        const cost = 10;

        if (!balance || balance.balance < cost) {
          return res.status(402).json({
            error: "Insufficient tokens",
            required: cost,
            current: balance?.balance || 0,
            needsTokens: true,
          });
        }

        const newBalance = balance.balance - cost;
        await storage.updateTokenBalance(
          userId,
          newBalance,
          undefined,
          balance.lifetimeSpent + cost
        );

        const shareToken = `sr_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90);

        await storage.createTokenTransaction({
          userId,
          amount: cost,
          type: "debit",
          action: "share_profile",
          description: `Created shareable link for ${player.firstName} ${player.lastName}`,
          playerId,
          balanceAfter: newBalance,
        });

        await storage.createPlayerShareLink({
          playerId,
          teamId,
          shareToken,
          createdBy: userId,
          tokensSpent: cost,
          isActive: true,
          expiresAt,
        });

        res.json({
          success: true,
          shareToken,
          shareUrl: `/shared/player/${shareToken}`,
          expiresAt,
          tokensSpent: cost,
          newBalance,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/players/:id/share-links",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        const links = await storage.getPlayerShareLinks(req.params.id);
        res.json(links);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.get("/api/shared/:shareToken", async (req: Request, res: Response) => {
    try {
      const shareLink = await storage.getPlayerShareLinkByToken(
        req.params.shareToken
      );

      if (!shareLink) {
        return res.status(404).json({ error: "Share link not found" });
      }

      if (!shareLink.isActive) {
        return res
          .status(410)
          .json({ error: "Share link has been deactivated" });
      }

      if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Share link has expired" });
      }

      await storage.incrementShareLinkViewCount(shareLink.id);

      const player = await storage.getPlayer(shareLink.playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      const eligibilityScores = await storage.getEligibilityScores(
        shareLink.playerId
      );
      const assessment = await storage.getTransferEligibilityAssessment(
        shareLink.playerId
      );
      const metrics = await storage.getPlayerMetrics(shareLink.playerId);
      const videos = await storage.getVideos(shareLink.playerId);

      const videoPreview = videos.map((v) => ({
        id: v.id,
        title: v.title,
        thumbnailUrl: v.thumbnailUrl,
        duration: v.duration,
        source: v.source,
      }));

      res.json({
        player: {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          nationality: player.nationality,
          secondNationality: player.secondNationality,
          position: player.position,
          secondaryPosition: player.secondaryPosition,
          currentClubName: player.currentClubName,
          profileImageUrl: player.profileImageUrl,
          height: player.height,
          heightUnit: player.heightUnit,
          weight: player.weight,
          weightUnit: player.weightUnit,
          nationalTeamCaps: player.nationalTeamCaps,
          nationalTeamGoals: player.nationalTeamGoals,
          continentalGames: player.continentalGames,
          dateOfBirth: player.dateOfBirth,
          preferredFoot: player.preferredFoot,
          clubMinutesCurrentSeason: player.clubMinutesCurrentSeason,
          internationalMinutesCurrentSeason:
            player.internationalMinutesCurrentSeason,
        },
        eligibilityScores,
        assessment,
        metrics,
        videos: videoPreview,
        videoCount: videos.length,
        requiresSignupForVideos: true,
        sharedBy: shareLink.teamId,
        shareLink: {
          expiresAt: shareLink.expiresAt,
          viewCount: (shareLink.viewCount || 0) + 1,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get(
    "/api/players/:id/video-minutes",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const minutes = await storage.getPlayerVideoMinutes(req.params.id);
        res.json({ playerId: req.params.id, videoMinutes: minutes });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );
}
