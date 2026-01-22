import { type Express } from "express";
import { embassyRepository } from "../storage/embassy";
import { requireAuth } from "../middleware/auth";

export function registerEmbassyRoutes(app: Express) {
  app.get("/api/embassy/verifications", requireAuth, async (req, res) => {
    try {
      // Logic from similar handlers - fetch all for now, or filter by user/team if needed
      // repository signature: getEmbassyVerifications(teamId?)
      const verifications = await embassyRepository.getEmbassyVerifications();
      res.json(verifications);
    } catch (error) {
      console.error("Error fetching embassy verifications:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
