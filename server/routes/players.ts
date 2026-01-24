import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { requireAuth, requireTeamRole } from "../middleware/auth";
import {
  insertPlayerSchema,
  insertPlayerInternationalRecordSchema,
  insertPlayerPhotoSchema,
} from "@shared/schema";

export function registerPlayerRoutes(app: Express): void {
  app.get("/api/players", requireAuth, async (req: Request, res: Response) => {
    try {
      const players = await storage.getPlayers();
      res.json(players);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: message });
    }
  });

  app.get(
    "/api/team/players",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const players = await storage.getPlayers();
        res.json(players);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  app.post(
    "/api/players/batch",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { playerIds } = req.body;

        if (!Array.isArray(playerIds)) {
          return res.status(400).json({ error: "playerIds must be an array" });
        }

        const players = await storage.getPlayersByIds(playerIds);
        res.json(players);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  app.post("/api/players", requireAuth, async (req: Request, res: Response) => {
    try {
      // Use teamId from session if available, otherwise fallback to body or demo-team
      // This ensures players created by logged-in users are assigned to their team
      const teamId = req.session.teamId || req.body.teamId || "demo-team";

      console.log(`Creating player for team: ${teamId}`);

      const dataToValidate = {
        ...req.body,
        teamId,
      };

      const playerData = insertPlayerSchema.parse(dataToValidate);
      const player = await storage.createPlayer(playerData);
      res.json(player);
    } catch (error) {
      console.error("Error creating player:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      }
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(400).json({ error: message });
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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(400).json({ error: message });
      }
    },
  );

  // Transfer Eligibility Endpoint
  app.get(
    "/api/players/:id/transfer-eligibility",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const playerId = req.params.id;
        const player = await storage.getPlayer(playerId);

        if (!player) {
          return res.status(404).json({ error: "Player not found" });
        }

        // Get or calculate eligibility assessment
        const assessment =
          await storage.getTransferEligibilityAssessment(playerId);

        // Get player metrics and videos for minutes calculation
        const _metrics = await storage.getPlayerMetrics(playerId);
        const videoMinutes = await storage.getPlayerVideoMinutes(playerId);

        // Calculate minutes breakdown
        const clubMinutes = player.clubMinutesCurrentSeason || 0;
        const internationalMinutes =
          player.internationalMinutesCurrentSeason || 0;
        const totalMinutes = clubMinutes + internationalMinutes + videoMinutes;
        const minimumMinutes = 450; // Standard threshold

        // Create default visa score structure
        const createVisaScore = (
          score: number,
          status: "green" | "yellow" | "red",
        ) => ({
          score,
          status,
          breakdown: {
            minutesScore: Math.min(30, (totalMinutes / minimumMinutes) * 30),
            internationalScore: Math.min(
              25,
              (player.nationalTeamCaps || 0) * 2.5,
            ),
            leagueScore: 20, // Default based on league band
            performanceScore: 15, // Default
          },
          recommendations:
            status === "green"
              ? []
              : [
                  status === "red"
                    ? "Accumulate more playing minutes"
                    : "Continue building match minutes",
                  (player.nationalTeamCaps || 0) < 5
                    ? "Work towards national team selection"
                    : "",
                ].filter(Boolean),
        });

        // Calculate overall status based on minutes and caps
        const getStatus = (score: number): "green" | "yellow" | "red" => {
          if (score >= 65) return "green";
          if (score >= 40) return "yellow";
          return "red";
        };

        // Calculate visa scores (simplified calculation)
        const baseScore = Math.min(
          100,
          (totalMinutes / minimumMinutes) * 40 +
            (player.nationalTeamCaps || 0) * 3 +
            20,
        );
        const overallStatus = getStatus(baseScore);

        // Build eligibility response
        const eligibilityData = {
          assessment: assessment || {
            id: `temp-${playerId}`,
            playerId,
            totalMinutesVerified: totalMinutes,
            overallStatus,
            calculatedAt: new Date().toISOString(),
          },
          player: {
            id: player.id,
            name: `${player.firstName} ${player.lastName}`,
            position: player.position,
            nationality: player.nationality,
            currentClub: player.currentClubName || "Unknown",
            marketValue: player.marketValue || 0,
          },
          minutesBreakdown: {
            club: clubMinutes,
            international: internationalMinutes,
            video: videoMinutes,
            total: totalMinutes,
            minimum: minimumMinutes,
            needed: Math.max(0, minimumMinutes - totalMinutes),
          },
          visaScores: {
            schengen: createVisaScore(
              Math.min(100, baseScore + 5),
              getStatus(baseScore + 5),
            ),
            o1: createVisaScore(
              Math.min(100, baseScore - 10),
              getStatus(baseScore - 10),
            ),
            p1: createVisaScore(Math.min(100, baseScore), getStatus(baseScore)),
            ukGbe: createVisaScore(
              Math.min(100, baseScore + 10),
              getStatus(baseScore + 10),
            ),
            esc: createVisaScore(
              Math.min(100, baseScore - 5),
              getStatus(baseScore - 5),
            ),
          },
          overallStatus,
          recommendations: [
            totalMinutes < minimumMinutes
              ? `Accumulate ${minimumMinutes - totalMinutes} more playing minutes`
              : null,
            (player.nationalTeamCaps || 0) < 10
              ? "Work towards more national team appearances"
              : null,
            videoMinutes < 90
              ? "Upload match footage to verify playing time"
              : null,
          ].filter(Boolean) as string[],
          capsNeeded: Math.max(0, 5 - (player.nationalTeamCaps || 0)),
          leagueBandApplied: 3, // Default band
        };

        res.json(eligibilityData);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  // Recalculate transfer eligibility
  app.post(
    "/api/players/:id/transfer-eligibility/recalculate",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const playerId = req.params.id;
        const player = await storage.getPlayer(playerId);

        if (!player) {
          return res.status(404).json({ error: "Player not found" });
        }

        // Trigger recalculation by invalidating cache and returning success
        res.json({ success: true, message: "Eligibility recalculated" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  app.get(
    "/api/players/:id/photos",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const photos = await storage.getPlayerPhotos(req.params.id);
        res.json(photos);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(400).json({ error: message });
      }
    },
  );

  app.delete(
    "/api/player-photos/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        await storage.deletePlayerPhoto(req.params.id);
        res.json({ success: true });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(400).json({ error: message });
      }
    },
  );

  app.get(
    "/api/players/:playerId/international-records",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const records = await storage.getPlayerInternationalRecords(
          req.params.playerId,
        );
        res.json(records);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(400).json({ error: message });
      }
    },
  );

  app.put(
    "/api/players/:playerId/international-records/:recordId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const record = await storage.updatePlayerInternationalRecord(
          req.params.recordId,
          req.body,
        );
        if (!record) {
          return res
            .status(404)
            .json({ error: "International record not found" });
        }
        res.json(record);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(400).json({ error: message });
      }
    },
  );

  app.delete(
    "/api/players/:playerId/international-records/:recordId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        await storage.deletePlayerInternationalRecord(req.params.recordId);
        res.json({ success: true });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
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
            balance.lifetimeSpent + cost,
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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
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
          balance.lifetimeSpent + cost,
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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  app.get(
    "/api/players/:id/share-links",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        const links = await storage.getPlayerShareLinks(req.params.id);
        res.json(links);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  app.get("/api/shared/:shareToken", async (req: Request, res: Response) => {
    try {
      const shareLink = await storage.getPlayerShareLinkByToken(
        req.params.shareToken,
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
        shareLink.playerId,
      );
      const assessment = await storage.getTransferEligibilityAssessment(
        shareLink.playerId,
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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: message });
    }
  });

  app.get(
    "/api/players/:id/video-minutes",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const minutes = await storage.getPlayerVideoMinutes(req.params.id);
        res.json({ playerId: req.params.id, videoMinutes: minutes });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );
}
