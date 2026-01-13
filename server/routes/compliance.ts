import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { insertComplianceOrderSchema } from "@shared/schema";

export function registerComplianceRoutes(app: Express): void {
  app.get(
    "/api/compliance/orders",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const orders = await storage.getComplianceOrders(req.session.teamId!);
        res.json(orders);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/compliance/orders",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const orderData = insertComplianceOrderSchema.parse({
          ...req.body,
          teamId: req.session.teamId,
          requestedBy: req.session.userId,
          amount: 49.99,
          status: "pending_payment",
        });
        const order = await storage.createComplianceOrder(orderData);
        res.json(order);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/compliance/orders/:id/pay",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const order = await storage.getComplianceOrder(req.params.id);
        if (!order) {
          return res.status(404).json({ error: "Order not found" });
        }

        const payment = await storage.createPayment({
          orderId: order.id,
          amount: order.amount,
          currency: order.currency || "USD",
          status: "succeeded",
        });

        await storage.updateComplianceOrder(order.id, {
          status: "paid",
          paidAt: new Date(),
        } as any);

        res.json({ success: true, payment });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );
}
