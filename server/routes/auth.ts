import argon2 from "argon2";
import type { Express, Request, Response } from "express";
import { jwtVerify } from "jose";
import passport from "passport";
import { z } from "zod";
import { storage } from "../storage";
import { HttpError } from "../utils/AppError";
import { asyncHandler } from "../utils/catchAsync";
import { grantSignupBonus } from "../utils/helpers";
import { createResetToken } from "../utils/security";
import { enqueuePasswordRecoveryEmail } from "../queues/email.queue";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/google", (req, res, next) => {
    const role = req.query.role as string;
    if (role) {
      (req.session as any).intendedRole = role;
    }
    passport.authenticate("google", { scope: ["profile", "email"] })(
      req,
      res,
      next
    );
  });

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/dashboard" }), // TODO: Redirect to login page on failure
    (req, res) => {
      const user = req.user as any;
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.teamId = user.teamId || undefined;

      // Handle extra session data for specific roles if needed
      if (user.role === "embassy") {
        // We might need to fetch profile here if it's not on the user object
        // For now, let's rely on the subsequent /me call or login logic to handle it fully
        // Or we can duplicate the login logic here.
        // Let's keep it simple for now and redirect.
      }

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.redirect(
            `${process.env.FRONTEND_URL || ""}/dashboard?error=session_error`
          );
        }
        res.redirect(`${process.env.FRONTEND_URL || ""}/dashboard`);
      });
    }
  );
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
              // "admin", // Admin role restricted from public signup
              "agent",
              "embassy",
              "federation_admin",
            ])
            .optional()
            .default("scout"),
          teamName: z.string().optional(),
          sportType: z.string().optional(),
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

      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      let teamId: string | undefined;

      if (data.role === "embassy") {
        const hashedPassword = await argon2.hash(data.password);
        const user = await storage.createUser({
          username: data.username,
          password: hashedPassword,
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
              email: data.email,
              role: "embassy",
              user: {
                id: user.id,
                email: data.email,
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
        const hashedPassword = await argon2.hash(data.password);
        const user = await storage.createUser({
          username: data.username,
          password: hashedPassword,
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
              user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: data.role,
              },
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
          sportType: data.sportType,
        });
        teamId = team.id;
      }

      const hashedPassword = await argon2.hash(data.password);
      const user = await storage.createUser({
        username: data.username,
        password: hashedPassword,
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
              email: user.email,
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

      const validatePassword = await argon2.verify(user.password, password);

      if (!validatePassword) {
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

  app.post(
    "/api/recover-password",
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.body.email) {
        return res.status(400).json({ error: "Email required" });
      }

      const genericResponse = {
        message: "If that email is registered, a recovery link has been sent.",
      };
      const user = await storage.getUserByEmail(req.body.email);

      if (user) {
        const resetToken = await createResetToken(user.id);
        await storage.updateUser(user.id, { pswdResetToken: resetToken });

        try {
          await enqueuePasswordRecoveryEmail(user.email as string, resetToken);

          console.info(`Password recovery email queued for user ${user.id}`);
        } catch (error: unknown) {
          console.error(
            `Failed to enqueue password recovery email for user ${user.id}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
        console.info(`Password reset triggered for user ${user.id}`);
      }

      return res.json(genericResponse);
    })
  );

  app.post("/api/reset-password", async (req: Request, res: Response) => {
    const { resetToken } = req.query;

    let userId: string;

    // Verify and decode the JWT.
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET_KEY);

      const { payload } = await jwtVerify(resetToken as string, secret, {
        algorithms: [process.env.ALGORITHM as string],
      });

      const tokenType = payload.type;
      const subject = payload.sub;

      if (typeof subject !== "string" || tokenType !== "reset-password") {
        return res.status(400).json({ error: "Invalid token payload" });

        // throw new HttpError(400, "Invalid token payload");
      }

      userId = subject;
    } catch (error: unknown) {
      // Preserve our own validation error.
      // if (error instanceof HttpError) {
      //   throw error;
      // }

      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ERR_JWT_EXPIRED"
      ) {
        return res
          .status(400)
          .json({ error: "Password reset link has expired" });

        // throw new HttpError(400, "Password reset link has expired.");
      }

      console.warn(
        `Malformed JWT token submitted: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return res.status(400).json({ error: "Invalid reset token JWT." });

      // throw new HttpError(400, "Invalid reset token JWT.");
    }

    // Find the user and validate.
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ error: "User account not found" });

      // throw new HttpError(404, "User account not found.");
    }

    if (user.pswdResetToken !== resetToken) {
      return res.status(400).json({ error: "Invalid reset token" });

      // throw new HttpError(400, "Invalid reset token.");
    }

    // Hash the new password and save the changes.
    try {
      const hashedPassword = await argon2.hash(req.body.password);

      await storage.updateUser(user.id, {
        password: hashedPassword,
        pswdResetToken: null,
      });

      return res.json({
        message: "Password has been reset successfully. You can now log in.",
      });
    } catch (error: unknown) {
      console.error(
        `Failed to save new password for user ${user.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      return res
        .status(500)
        .json({ error: "An error occurred while resetting your password." });

      // throw new HttpError(
      //   500,
      //   "An error occurred while resetting your password."
      // );
    }
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
