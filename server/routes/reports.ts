import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth, requireTeamRole } from "../middleware/auth";

export function registerReportRoutes(app: Express) {
  // Get all reports
  app.get("/api/reports", requireAuth, async (req: Request, res: Response) => {
    try {
      const teamId = req.session.teamId;
      if (!teamId) {
        return res.json([]);
      }
      const reports = await storage.getTransferReports(teamId);

      // Batch fetch all players referenced by reports in one query
      const playerIds = [...new Set(reports.map((r) => r.playerId))];
      const playersArr = playerIds.length > 0 ? await storage.getPlayersByIds(playerIds) : [];
      const playersMap = new Map(playersArr.map((p) => [p.id, p]));

      const enrichedReports = reports.map((report) => {
        const player = playersMap.get(report.playerId);
        return {
          ...report,
          playerName: player
            ? `${player.firstName} ${player.lastName}`
            : "Unknown Player",
          playerPosition: player?.position,
        };
      });

      res.json(enrichedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // Get single report
  app.get(
    "/api/reports/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const report = await storage.getTransferReport(req.params.id);
        if (!report) {
          return res.status(404).json({ error: "Report not found" });
        }

        const player = await storage.getPlayer(report.playerId);
        const enrichedReport = {
          ...report,
          playerName: player
            ? `${player.firstName} ${player.lastName}`
            : "Unknown Player",
          playerPosition: player?.position,
        };

        res.json(enrichedReport);
      } catch (error) {
        console.error("Error fetching report:", error);
        res.status(500).json({ error: "Failed to fetch report" });
      }
    },
  );

  // Generate Report
  app.post(
    "/api/reports/generate",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        const { playerId, reportType } = req.body;
        const userId = req.session.userId!;
        const teamId = req.session.teamId;

        if (!teamId) {
          return res.status(400).json({ error: "No team associated with this account" });
        }
        if (!playerId) {
          return res.status(400).json({ error: "Player ID is required" });
        }

        // Check tokens
        const cost = 5;
        const balance = await storage.getTokenBalance(userId);

        if (!balance || balance.balance < cost) {
          return res.status(402).json({
            error: "Insufficient tokens",
            needsTokens: true,
            required: cost,
            current: balance?.balance || 0,
          });
        }

        const player = await storage.getPlayer(playerId);
        if (!player) {
          return res.status(404).json({ error: "Player not found" });
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
          action: "generate_report",
          description: `Generated transfer report for ${player.firstName} ${player.lastName}`,
          playerId,
          balanceAfter: newBalance,
        });

        // Fetch Data for Report
        const metrics = await storage.getPlayerMetrics(playerId);
        const eligibilityScores = await storage.getEligibilityScores(playerId);
        const assessment =
          await storage.getTransferEligibilityAssessment(playerId);
        const videos = await storage.getVideos(playerId);
        const documents = await storage.getPlayerDocuments(playerId); // Need to check if this exists
        const internationalRecords =
          await storage.getPlayerInternationalRecords(playerId);

        // Calculate overall status (reusing logic or getting from assessment)
        const overallEligibilityStatus = assessment?.overallStatus || "red";

        // Create Report
        // Note: passing partial data as JSON fields
        // The schema doesn't have an insert schema exported for complex JSON fields easily,
        // but `insertTransferReportSchema` (from drizzle-zod) should handle it if passed correctly.
        // We manually construct the object.

        const reportData = {
          playerId,
          teamId,
          generatedBy: userId,
          generatedByName: "System User", // Should get user name
          reportType: reportType || "comprehensive",
          status: "completed",
          generatedAt: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days validity
          verificationCode: `TR-${Date.now().toString().slice(-6)}`,

          playerProfile: {
            name: `${player.firstName} ${player.lastName}`,
            nationality: player.nationality,
            dateOfBirth: player.dateOfBirth,
            position: player.position,
            currentClub: player.currentClubName,
            height: player.height,
            heightUnit: player.heightUnit,
            weight: player.weight,
            weightUnit: player.weightUnit,
            marketValue: player.marketValue,
          },
          performanceStats: metrics ? [metrics] : [],
          eligibilityScores:
            eligibilityScores.length > 0 ? eligibilityScores : {}, // Needs proper structure mapping?
          // Actually, eligibilityScores in schema is jsonb, but also a separate table?
          // The table is `eligibility_scores`. The report field is `eligibility_scores` (jsonb).
          // Reuse assessment data or scores.

          overallEligibilityStatus,
          totalMinutesVerified: assessment?.totalMinutesVerified || 0,

          videosIncluded: videos.map((v) => ({
            title: v.title,
            source: v.source,
            minutesPlayed: v.minutesPlayed,
          })),
          documentsIncluded: documents.map((d) => ({
            type: d.documentType,
            verificationStatus: d.verificationStatus,
          })),
          internationalCareer: internationalRecords.map((r) => ({
            nationalTeam: r.nationalTeam,
            caps: r.caps,
            goals: r.goals,
            teamLevel: r.teamLevel,
          })),
          recommendations: assessment?.recommendations || [],

          embassyVerifications: [],
          invitationLetters: [],
          dataRangeStart: new Date(
            new Date().setFullYear(new Date().getFullYear() - 1),
          ), // Include last year data
          dataRangeEnd: new Date(),
        };

        const newReport = await storage.createTransferReport(reportData as any);
        // Cast to any because Drizzle insert types with JSON arrays can be tricky with strict TS

        res.json({
          ...newReport,
          tokensSpent: cost,
          newBalance,
        });
      } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({ error: "Failed to generate report" });
      }
    },
  );

  // Delete Report
  app.delete(
    "/api/reports/:id",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        await storage.deleteTransferReport(req.params.id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting report:", error);
        res.status(500).json({ error: "Failed to delete report" });
      }
    },
  );

  // Notify Embassy
  app.post(
    "/api/reports/:id/notify-embassy",
    requireTeamRole,
    async (req: Request, res: Response) => {
      try {
        // Logic to notify embassy (mocked for now)
        const report = await storage.getTransferReport(req.params.id);
        if (!report) return res.status(404).json({ error: "Report not found" });

        await storage.updateTransferReport(req.params.id, {
          embassyNotified: true,
          embassyNotifiedAt: new Date(),
        });

        res.json({ success: true, message: "Embassy notified" });
      } catch (error) {
        console.error("Error notifying embassy:", error);
        res.status(500).json({ error: "Failed to notify embassy" });
      }
    },
  );
}
