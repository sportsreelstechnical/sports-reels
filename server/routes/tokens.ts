import { type Express } from "express";
import { tokensRepository } from "../storage/tokens";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import axios from "axios";

// Define token costs
const TOKEN_COSTS = {
  shortlist: 1,
  share_profile: 4,
  view_contact: 2,
  download_report: 5,
  embassy_request: 10,
  message: 1,
  watch_video: 1,
  federation_letter_request: 10,
};

export function registerTokenRoutes(app: Express) {
  app.get("/api/tokens/packs", requireAuth, async (req, res) => {
    try {
      const defaultPacks = [
        {
          name: "Starter Pack",
          tokens: 50,
          priceUsd: 999, // cents
          description: "Perfect for getting started",
          isActive: true,
        },
        {
          name: "Standard Pack",
          tokens: 100,
          priceUsd: 1799, // cents
          description: "Best value for regular users",
          isActive: true,
        },
        {
          name: "Pro Pack",
          tokens: 150,
          priceUsd: 2499, // cents
          description: "For power users",
          isActive: true,
        },
        {
          name: "Enterprise Pack",
          tokens: 200,
          priceUsd: 2999, // cents
          description: "Maximum value",
          isActive: true,
        },
      ];

      // Sync packs: Ensure all default packs exist and have correct values
      for (const packDef of defaultPacks) {
        const existingPack = await tokensRepository.getTokenPackByName(
          packDef.name,
        );
        if (existingPack) {
          // Update if changed
          if (
            existingPack.tokens !== packDef.tokens ||
            existingPack.priceUsd !== packDef.priceUsd
          ) {
            await tokensRepository.updateTokenPack(existingPack.id, {
              tokens: packDef.tokens,
              priceUsd: packDef.priceUsd,
              description: packDef.description,
              isActive: packDef.isActive,
            });
          }
        } else {
          // Create if missing
          await tokensRepository.createTokenPack(packDef);
        }
      }

      // Hide old packs that are not in the current list
      const allPacks = await tokensRepository.getTokenPacks();
      const currentPackNames = defaultPacks.map((p) => p.name);

      for (const p of allPacks) {
        if (!currentPackNames.includes(p.name)) {
          await tokensRepository.updateTokenPack(p.id, { isActive: false });
        }
      }

      const packs = await tokensRepository.getTokenPacks();
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

  // Paystack: Initialize transaction
  app.post("/api/tokens/purchase/initialize", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).send("Unauthorized");

      const { packId } = req.body;
      if (!packId) {
        return res.status(400).json({ error: "Pack ID is required" });
      }

      const pack = await tokensRepository.getTokenPack(packId);
      if (!pack) {
        return res.status(404).json({ error: "Token pack not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
      const PAYSTACK_CURRENCY = process.env.PAYSTACK_CURRENCY || "USD";

      if (
        !PAYSTACK_SECRET_KEY ||
        PAYSTACK_SECRET_KEY === "sk_test_placeholder"
      ) {
        return res.status(400).json({
          error:
            "Paystack API key is not configured. Please add a valid PAYSTACK_SECRET_KEY to your .env file.",
        });
      }

      // Paystack initialization
      console.log(
        `Initializing Paystack payment for user ${user.id}, pack ${pack.name} in ${PAYSTACK_CURRENCY}`,
      );

      const response = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: user.email || `${user.username}@sportsreels.ai`,
          amount: Math.round(pack.priceUsd), // Amount in cents/kobo, must be integer
          currency: PAYSTACK_CURRENCY,
          callback_url: `${process.env.FRONTEND_URL}/token-bank?status=verify`,
          metadata: {
            userId: user.id,
            packId: pack.id,
            tokens: pack.tokens,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      res.json(response.data);
    } catch (error: any) {
      const errorDetail = error.response?.data || error.message;
      console.error(
        "Paystack initialization error:",
        JSON.stringify(errorDetail, null, 2),
      );
      res.status(500).json({
        error: "Failed to initialize payment",
        details:
          typeof errorDetail === "object" ? errorDetail.message : errorDetail,
      });
    }
  });

  // Paystack: Verify transaction
  app.get(
    "/api/tokens/purchase/verify/:reference",
    requireAuth,
    async (req, res) => {
      try {
        const { reference } = req.params;
        const userId = req.session.userId;
        if (!userId) return res.status(401).send("Unauthorized");

        const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

        const response = await axios.get(
          `https://api.paystack.co/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
          },
        );

        const data = response.data.data;

        if (data.status === "success") {
          const { packId, tokens } = data.metadata;

          // Check if this transaction was already processed
          const existingPurchases =
            await tokensRepository.getTokenPurchases(userId);
          const alreadyProcessed = existingPurchases.find(
            (p) => p.paymentReference === reference,
          );

          if (alreadyProcessed) {
            return res.json({ success: true, message: "Already processed" });
          }

          // Get current balance
          let balance = await tokensRepository.getTokenBalance(userId);
          if (!balance) {
            balance = await tokensRepository.createTokenBalance({
              userId,
              balance: 0,
              lifetimePurchased: 0,
              lifetimeSpent: 0,
            });
          }

          const newBalanceVal = (balance.balance || 0) + Number(tokens);
          const newLifetimePurchased =
            (balance.lifetimePurchased || 0) + Number(tokens);

          await tokensRepository.updateTokenBalance(
            userId,
            newBalanceVal,
            newLifetimePurchased,
            undefined,
          );

          // Record purchase
          const pack = await tokensRepository.getTokenPack(packId);
          await tokensRepository.createTokenPurchase({
            userId,
            packId: packId,
            amountPaid: data.amount,
            tokens: Number(tokens),
            status: "completed",
            paymentMethod: "paystack",
            paymentReference: reference,
            expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months as per UI description
          });

          // Record transaction ledger
          await tokensRepository.createTokenTransaction({
            userId,
            amount: Number(tokens),
            type: "credit",
            action: "purchase",
            balanceAfter: newBalanceVal,
            description: `Purchased ${pack?.name || "Token Pack"}`,
            packId: packId,
          });

          return res.json({ success: true, newBalance: newBalanceVal });
        } else {
          return res
            .status(400)
            .json({ error: "Payment was not successful", status: data.status });
        }
      } catch (error: any) {
        console.error(
          "Paystack verification error:",
          error.response?.data || error.message,
        );
        res.status(500).json({ error: "Failed to verify payment" });
      }
    },
  );

  app.post("/api/tokens/spend", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).send("Unauthorized");
      const { action, cost: rawCost } = req.body;

      let cost = Number(rawCost);

      // If cost is not provided or invalid, try to look it up based on action
      if (isNaN(cost) && action) {
        const actionCost = TOKEN_COSTS[action as keyof typeof TOKEN_COSTS];
        if (typeof actionCost === "number") {
          cost = actionCost;
        }
      }

      if (isNaN(cost) || cost < 0) {
        return res.status(400).json({ error: "Invalid cost" });
      }

      const balance = await tokensRepository.getTokenBalance(userId);
      const currentBalance = balance?.balance || 0;
      const lifetimeSpent = balance?.lifetimeSpent || 0;

      // Note: Real cost validation should happen backend-side based on action type
      // But for now we trust the passed cost or look it up if we had shared constants

      if (currentBalance < cost) {
        return res.status(400).json({ error: "Insufficient tokens" });
      }

      // Update balance
      const updated = await tokensRepository.updateTokenBalance(
        userId,
        currentBalance - cost,
        undefined,
        lifetimeSpent + cost,
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
