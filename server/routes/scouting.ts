import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";

export function registerScoutingRoutes(app: Express): void {
  app.get(
    "/api/scouting/inquiries",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const inquiries = await storage.getScoutingInquiries(
          req.session.userId!
        );
        res.json(inquiries);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/scouting/inquiries",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { playerId, message, buyingClubName, sellingClubName } = req.body;

        const inquiry = await storage.createScoutingInquiry({
          playerId,
          buyingClubName: buyingClubName || "Unknown Club",
          sellingClubName: sellingClubName || "Unknown Club",
          message,
          status: "pending",
        });

        res.json(inquiry);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );
}
