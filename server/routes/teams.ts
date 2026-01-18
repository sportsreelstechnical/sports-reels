import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";

export function registerTeamRoutes(app: Express): void {
  app.get(
    "/api/teams/current",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const user = req.user as { id: number } | undefined;
        if (!user?.id) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const teams = await storage.getTeamsByUser(String(user.id));
        const currentTeam = teams[0] || null;

        // If we want to return null instead of 404 when no team found
        res.json(currentTeam);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        res.status(500).json({ error: message });
      }
    },
  );
}
