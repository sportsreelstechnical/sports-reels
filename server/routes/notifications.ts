import { type Express } from "express";
import { requireAuth } from "../middleware/auth";
import { db } from "../db";
import { eq, desc, and } from "drizzle-orm";
import {
  notifications,
  notificationPreferences,
  insertNotificationSchema,
  insertNotificationPreferenceSchema,
} from "../shared/schema";

export function registerNotificationRoutes(app: Express) {
  // Get notifications
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).send("Unauthorized");

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const type = req.query.type as string;

      const whereClause = type
        ? and(eq(notifications.userId, userId), eq(notifications.type, type))
        : eq(notifications.userId, userId);

      const results = await db
        .select()
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      res.json(results);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Get notification stats
  app.get("/api/notifications/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).send("Unauthorized");

      const allNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId));

      const unreadCount = allNotifications.filter((n) => !n.isRead).length;

      const byType = allNotifications.reduce(
        (acc, curr) => {
          acc[curr.type] = (acc[curr.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      res.json({
        total: allNotifications.length,
        unread: unreadCount,
        by_type: byType,
      });
    } catch (error) {
      console.error("Error fetching notification stats:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Get unread count
  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).send("Unauthorized");

      // Count is a bit tricky with Drizzle without count(), let's just fetch unread
      const unread = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false),
          ),
        );

      const count = unread.length;

      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Get preferences
  app.get("/api/notification-preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).send("Unauthorized");

      const [prefs] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId));

      if (!prefs) {
        return res.json({
          userId,
          emailNotifications: true,
          inAppNotifications: true,
          messageNotifications: true,
          transferUpdates: true,
          profileChanges: true,
          loginNotifications: true,
          newsletterSubscription: true,
        });
      }

      res.json(prefs);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create preferences
  app.post("/api/notification-preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).send("Unauthorized");

      const data = insertNotificationPreferenceSchema.parse({
        ...req.body,
        userId,
      });

      const [prefs] = await db
        .insert(notificationPreferences)
        .values(data)
        .onConflictDoUpdate({
          target: notificationPreferences.userId,
          set: data,
        })
        .returning();

      res.json(prefs);
    } catch (error) {
      console.error("Error creating preferences:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update preferences
  app.patch("/api/notification-preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).send("Unauthorized");

      const data = insertNotificationPreferenceSchema
        .omit({ userId: true })
        .partial()
        .parse(req.body);

      const [updated] = await db
        .update(notificationPreferences)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(notificationPreferences.userId, userId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Mark as read
  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      if (!userId) return res.status(401).send("Unauthorized");

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id));

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking as read:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Mark all as read
  app.patch("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).send("Unauthorized");

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all as read:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(notifications).where(eq(notifications.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Create notification
  app.post("/api/notifications", requireAuth, async (req, res) => {
    try {
      const data = insertNotificationSchema.parse(req.body);
      const [notif] = await db.insert(notifications).values(data).returning();
      res.json(notif);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}
