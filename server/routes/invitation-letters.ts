import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth, requireTeamRole } from "../middleware/auth";

export function registerInvitationLetterRoutes(app: Express) {
  // Get invitation letters for a team
  app.get(
    "/api/invitation-letters",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        const teamId = req.session.teamId;
        if (!teamId) {
          return res.status(400).json({ error: "No team associated with this account" });
        }
        const letters = await storage.getAllInvitationLetters(teamId);

        // Batch fetch all players referenced by letters in one query
        const playerIds = Array.from(new Set(letters.map((l) => l.playerId)));
        const playersArr = playerIds.length > 0 ? await storage.getPlayersByIds(playerIds) : [];
        const playersMap = new Map(playersArr.map((p) => [p.id, p]));

        const enrichedLetters = letters.map((letter) => ({
          ...letter,
          player: playersMap.get(letter.playerId),
        }));

        res.json(enrichedLetters);
      } catch (error) {
        console.error("Error fetching invitation letters:", error);
        res.status(500).json({ error: "Failed to fetch invitation letters" });
      }
    },
  );

  // Create invitation letter
  app.post(
    "/api/invitation-letters",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        const body = req.body;
        const userId = req.session.userId;
        const teamId = req.session.teamId;
        if (!teamId) {
          return res.status(400).json({ error: "No team associated with this account" });
        }

        const newLetter = await storage.createInvitationLetter({
          ...body,
          fromTeamId: teamId,
          uploadedBy: userId,
        });

        res.json(newLetter);
      } catch (error) {
        console.error("Error creating invitation letter:", error);
        res.status(500).json({ error: "Failed to create invitation letter" });
      }
    },
  );

  // Get issued federation letters for a player
  app.get(
    "/api/players/:id/issued-federation-letters",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const playerId = req.params.id;
        const requests = await storage.getFederationLetterRequests();

        // Filter for issued ones for this specific player
        const issuedLetters = requests.filter(
          (r) => r.playerId === playerId && r.status === "issued",
        );

        res.json(issuedLetters);
      } catch (error) {
        console.error("Error fetching issued federation letters:", error);
        res.status(500).json({ error: "Failed to fetch federation letters" });
      }
    },
  );

  // Generate Consular Report from Invitation Letter
  app.post(
    "/api/invitation-letters/:id/generate-consular-report",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        const letterId = req.params.id;
        const letter = await storage.getInvitationLetter(letterId);

        if (!letter) {
          return res.status(404).json({ error: "Invitation letter not found" });
        }

        const player = await storage.getPlayer(letter.playerId);
        if (!player) {
          return res.status(404).json({ error: "Player not found" });
        }

        // Fetch additional data
        const metrics = await storage.getPlayerMetrics(player.id);
        const eligibilityScores = await storage.getEligibilityScores(player.id);
        const assessment = await storage.getTransferEligibilityAssessment(
          player.id,
        );

        // Create the consular report
        const consularReport = await storage.createConsularReport({
          invitationLetterId: letterId,
          playerId: player.id,
          verificationCode: `CR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          generatedAt: new Date(),
          validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days validity
          playerProfile: {
            name: `${player.firstName} ${player.lastName}`,
            nationality: player.nationality,
            position: player.position,
            dateOfBirth: player.dateOfBirth,
          },
          playerStats: metrics ? [metrics] : [],
          eligibilityScores: {
            scores: eligibilityScores || {},
            assessment: assessment || null,
          },
          targetClubDetails: {
            name: letter.targetClubName,
            country: letter.targetCountry,
            league: letter.targetLeague,
          },
        } as any);

        // Update invitation letter status
        await storage.updateInvitationLetter(letterId, {
          consularReportGenerated: true,
          consularReportUrl: `/reports/consular/${consularReport.verificationCode}`,
        });

        res.json(consularReport);
      } catch (error) {
        console.error("Error generating consular report:", error);
        res.status(500).json({ error: "Failed to generate consular report" });
      }
    },
  );

  // Delete invitation letter
  app.delete(
    "/api/invitation-letters/:id",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        await storage.deleteInvitationLetter(req.params.id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting invitation letter:", error);
        res.status(500).json({ error: "Failed to delete invitation letter" });
      }
    },
  );

  // Notify Embassy
  app.post(
    "/api/invitation-letters/:id/notify-embassy",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        const letterId = req.params.id;
        const letter = await storage.getInvitationLetter(letterId);
        if (!letter) {
          return res.status(404).json({ error: "Invitation letter not found" });
        }

        const userId = req.session.userId!;
        const cost = 4;
        const balance = await storage.getTokenBalance(userId);

        if (!balance || balance.balance < cost) {
          return res.status(402).json({
            error: "Insufficient tokens",
            needsTokens: true,
            required: cost,
            current: balance?.balance || 0,
          });
        }

        // Deduct tokens
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
          action: "notify_embassy",
          description: `Notified embassy of invitation letter for player visibility`,
          balanceAfter: newBalance,
        });

        // Update letter status
        await storage.updateInvitationLetter(letterId, {
          embassyNotifiedAt: new Date(),
          embassyNotificationStatus: "notified",
          embassyNotificationTokensSpent: cost,
          embassyNotifiedBy: userId,
        });

        res.json({ success: true, newBalance });
      } catch (error) {
        console.error("Error notifying embassy:", error);
        res.status(500).json({ error: "Failed to notify embassy" });
      }
    },
  );
}
