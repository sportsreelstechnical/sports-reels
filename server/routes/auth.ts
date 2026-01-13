import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { grantSignupBonus } from "../utils/helpers";

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const signupSchema = z
        .object({
          username: z.string().min(3),
          password: z.string().min(8),
          email: z.string().email(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          role: z
            .enum([
              "sporting_director",
              "legal",
              "scout",
              "coach",
              "admin",
              "agent",
              "embassy",
            ])
            .optional()
            .default("scout"),
          teamName: z.string().optional(),
          clubName: z.string().optional(),
          country: z.string().optional(),
          leagueBand: z.coerce.number().min(1).max(5).optional().default(3),
          embassyCountry: z.string().optional(),
          jurisdiction: z.string().optional(),
        })
        .transform((data) => ({
          ...data,
          role: data.role || "scout",
          leagueBand: data.leagueBand || 3,
        }));

      const data = signupSchema.parse(req.body);

      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      let teamId: string | undefined;

      if (data.role === "embassy") {
        const user = await storage.createUser({
          username: data.username,
          password: data.password,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: "embassy",
        });

        const embassyProfile = await storage.createEmbassyProfile({
          country: data.embassyCountry || data.country || "Unknown",
          jurisdiction: data.jurisdiction,
          contactEmail: data.email,
          userId: user.id,
        });

        req.session.userId = user.id;
        req.session.userRole = "embassy";
        req.session.embassyCountry = embassyProfile.country;

        return new Promise((resolve) => {
          req.session.save((err) => {
            if (err) {
              console.error("Session save error:", err);
              return res.status(500).json({ error: "Session error" });
            }
            res.json({
              success: true,
              userId: user.id,
              role: "embassy",
              user: {
                id: user.id,
                username: user.username,
                role: "embassy",
                embassyCountry: embassyProfile.country,
              },
            });
            resolve(undefined);
          });
        });
      }

      if (data.role === "scout" || data.role === "agent") {
        const user = await storage.createUser({
          username: data.username,
          password: data.password,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
        });

        await grantSignupBonus(user.id, data.role);

        req.session.userId = user.id;
        req.session.userRole = data.role;

        return new Promise((resolve) => {
          req.session.save((err) => {
            if (err) {
              console.error("Session save error:", err);
              return res.status(500).json({ error: "Session error" });
            }
            res.json({
              success: true,
              userId: user.id,
              role: data.role,
              user: { id: user.id, username: user.username, role: data.role },
            });
            resolve(undefined);
          });
        });
      }

      if (data.teamName && data.clubName) {
        const team = await storage.createTeam({
          name: data.teamName,
          clubName: data.clubName,
          country: data.country,
          leagueBand: data.leagueBand,
        });
        teamId = team.id;
      }

      const user = await storage.createUser({
        username: data.username,
        password: data.password,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        teamId,
      });

      await grantSignupBonus(user.id, data.role);

      req.session.userId = user.id;
      req.session.teamId = teamId;
      req.session.userRole = data.role;

      return new Promise((resolve) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ error: "Session error" });
          }
          res.json({
            success: true,
            userId: user.id,
            teamId,
            role: data.role,
            user: {
              id: user.id,
              username: user.username,
              role: data.role,
              teamId,
            },
          });
          resolve(undefined);
        });
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;
      req.session.teamId = user.teamId || undefined;
      req.session.userRole = user.role;

      let embassyProfile = null;
      if (user.role === "embassy") {
        embassyProfile = await storage.getEmbassyProfileByUserId(user.id);
        if (embassyProfile) {
          req.session.embassyCountry = embassyProfile.country;
        }
      }

      return new Promise((resolve) => {
        req.session.save(async (err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ error: "Session error" });
          }

          try {
            await storage.logAction({
              userId: user.id,
              userRole: user.role,
              action: "login",
              entityType: "user",
              entityId: user.id,
              details: { timestamp: new Date().toISOString() },
            });
          } catch (e) {
            console.error("Log action error:", e);
          }

          res.json({
            success: true,
            user: {
              id: user.id,
              username: user.username,
              role: user.role,
              teamId: user.teamId,
              embassyCountry: embassyProfile?.country,
            },
          });
          resolve(undefined);
        });
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const team = user.teamId ? await storage.getTeam(user.teamId) : null;
    let embassyProfile = null;
    if (user.role === "embassy") {
      embassyProfile = await storage.getEmbassyProfileByUserId(user.id);
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        teamId: user.teamId,
        embassyCountry: embassyProfile?.country,
      },
      team,
      embassyProfile,
    });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });
}
