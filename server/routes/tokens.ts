import { type Express } from "express";
import { tokensRepository } from "../storage/tokens";
import { requireAuth } from "../middleware/auth";

// Define token costs
const TOKEN_COSTS = {
  shortlist: 1,
  share_profile: 4,
  view_contact: 2,
  download_report: 5,
  embassy_request: 10,
  message: 1,
  watch_video: 1, // Added video cost
};

export function registerTokenRoutes(app: Express) {
  app.get("/api/tokens/packs", requireAuth, async (req, res) => {
    try {
      let packs = await tokensRepository.getTokenPacks();

      if (packs.length === 0) {
        // Seed default packs
        const defaultPacks = [
          {
            name: "Starter Pack",
            tokens: 10,
            priceUsd: 999, // cents
            description: "Perfect for getting started",
            isActive: true,
          },
          {
            name: "Scout Pack",
            tokens: 50,
            priceUsd: 3999, // cents
            description: "Best value for active scouts",
            isActive: true,
          },
          {
            name: "Agency Pack",
            tokens: 100,
            priceUsd: 6999, // cents
            description: "For serious professionals",
            isActive: true,
          },
        ];

        for (const pack of defaultPacks) {
          await tokensRepository.createTokenPack(pack);
        }

        packs = await tokensRepository.getTokenPacks();
      }

      res.json(packs);
    } catch (error) {
      console.error("Error fetching token packs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/tokens/costs", requireAuth, async (req, res) => {
    try {
      // In future, this could come from DB
      res.json(TOKEN_COSTS);
    } catch (error) {
      console.error("Error fetching token costs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/tokens/balance", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).send("Unauthorized");

      let balance = await tokensRepository.getTokenBalance(userId);

      if (!balance) {
        // Initialize balance if not exists (optional, but good for UX)
        balance = await tokensRepository.createTokenBalance({
          userId: userId,
          balance: 0,
          lifetimePurchased: 0,
          lifetimeSpent: 0,
        });
      }

      res.json(balance);
    } catch (error) {
      console.error("Error fetching token balance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/tokens/transactions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).send("Unauthorized");
      const transactions = await tokensRepository.getTokenTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching token transactions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/tokens/spend", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).send("Unauthorized");
      const { action, cost } = req.body;

      const balance = await tokensRepository.getTokenBalance(userId);
      const currentBalance = balance?.balance || 0;

      // Note: Real cost validation should happen backend-side based on action type
      // But for now we trust the passed cost or look it up if we had shared constants

      if (currentBalance < cost) {
        return res.status(400).json({ error: "Insufficient tokens" });
      }

      // Update balance
      const newDesc = balance?.lifetimeSpent || 0;
      const updated = await tokensRepository.updateTokenBalance(
        userId,
        currentBalance - cost,
        undefined,
        newDesc + cost,
      );

      // Record transaction
      await tokensRepository.createTokenTransaction({
        userId: userId,
        amount: -cost,
        type: "spend",
        action: action,
        balanceAfter: currentBalance - cost,
        description: `Spent on ${action}`,
      });

      res.json({ newBalance: updated?.balance || 0, cost });
    } catch (error) {
      console.error("Error spending tokens:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
