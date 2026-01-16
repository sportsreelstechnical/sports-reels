import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";

export function registerDashboardRoutes(app: Express): void {
  app.get(
    "/api/dashboard/stats",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const players = await storage.getPlayers();
        const videos = await storage.getVideos();

        const publishedPlayers = players.filter((p) => p.isPublishedToScouts);
        const totalMinutesAnalyzed = videos.reduce(
          (sum, v) => sum + (v.minutesPlayed || 0),
          0,
        );

        res.json({
          totalPlayers: players.length,
          publishedPlayers: publishedPlayers.length,
          totalVideos: videos.length,
          totalMinutesAnalyzed,
          recentActivity: [],
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );

  app.get(
    "/api/dashboard/map-data",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const players = await storage.getPlayers();

        const countryData: Record<
          string,
          { players: number; destinations: number }
        > = {};

        for (const player of players) {
          if (player.nationality) {
            if (!countryData[player.nationality]) {
              countryData[player.nationality] = { players: 0, destinations: 0 };
            }
            countryData[player.nationality].players++;
          }
        }

        res.json({
          countries: Object.entries(countryData).map(([country, data]) => ({
            country,
            ...data,
          })),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );
}
