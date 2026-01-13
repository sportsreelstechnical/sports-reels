import type { Express, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: { baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL },
});

export function registerEligibilityRoutes(app: Express): void {
  app.get(
    "/api/eligibility/:playerId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const scores = await storage.getEligibilityScores(req.params.playerId);
        res.json(scores);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/eligibility/:playerId/calculate",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const player = await storage.getPlayer(req.params.playerId);
        if (!player) {
          return res.status(404).json({ error: "Player not found" });
        }

        const metrics = await storage.getPlayerMetrics(player.id);
        const latestMetrics = metrics[0];

        const eligibilityPrompt = `Calculate visa eligibility scores for this football player across multiple visa types.

Player Profile:
- Name: ${player.firstName} ${player.lastName}
- Nationality: ${player.nationality}
- Position: ${player.position}
- National Team Caps: ${player.nationalTeamCaps || 0}
- International Caps: ${player.internationalCaps || 0}
- Continental Games: ${player.continentalGames || 0}
- Current Season Minutes: ${latestMetrics?.currentSeasonMinutes || 0}
- Total Career Minutes: ${latestMetrics?.totalCareerMinutes || 0}
- Games Played: ${latestMetrics?.gamesPlayed || 0}
- Goals: ${latestMetrics?.goals || 0}
- Assists: ${latestMetrics?.assists || 0}
- Club League Position: ${latestMetrics?.clubLeaguePosition || "Unknown"}

Calculate eligibility scores (0-100) for each visa type with detailed breakdown.

Respond in JSON format:
{
  "scores": [
    {
      "visaType": "schengen_sports",
      "score": number,
      "status": "green" | "yellow" | "red",
      "breakdown": [
        {"criteria": "string", "points": number, "maxPoints": number, "description": "string"}
      ],
      "recommendation": "string"
    }
  ]
}`;

        const response = await gemini.models.generateContent({
          model: "gemini-2.5-flash",
          contents: eligibilityPrompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        const result = JSON.parse(response.text || "{}");

        const savedScores = [];
        for (const scoreData of result.scores || []) {
          const saved = await storage.createEligibilityScore({
            playerId: player.id,
            visaType: scoreData.visaType,
            score: scoreData.score,
            status: scoreData.status,
            breakdown: scoreData.breakdown,
            leagueBandApplied: 3,
          });
          savedScores.push({
            ...saved,
            recommendation: scoreData.recommendation,
          });
        }

        res.json({ eligibilityScores: savedScores });
      } catch (error: any) {
        console.error("Eligibility calculation error:", error);
        res.status(500).json({ error: error.message });
      }
    }
  );
}
