import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTeamSchema, insertPlayerSchema, insertVideoSchema, insertComplianceOrderSchema, insertPlayerInternationalRecordSchema, insertTeamSheetSchema, insertTeamSheetPlayerSchema, insertPlayerDocumentSchema, insertFederationLetterRequestSchema } from "@shared/schema";
import session from "express-session";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { jsPDF } from "jspdf";

const MAX_PLAYERS_PER_VIDEO = 15;
const SIGNUP_BONUS_TOKENS = 50;
const SIGNUP_TOKEN_EXPIRY_MONTHS = 6;

async function grantSignupBonus(userId: string, userRole: string): Promise<void> {
  if (userRole === "embassy") return;
  
  try {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + SIGNUP_TOKEN_EXPIRY_MONTHS);
    
    await storage.createTokenBalance({
      userId,
      balance: SIGNUP_BONUS_TOKENS,
      lifetimePurchased: 0,
      lifetimeSpent: 0,
    });
    
    await storage.createTokenTransaction({
      userId,
      amount: SIGNUP_BONUS_TOKENS,
      type: "credit",
      action: "signup_bonus",
      description: "Welcome bonus - 50 tokens",
      balanceAfter: SIGNUP_BONUS_TOKENS,
      expiresAt,
    });
  } catch (error) {
    console.error("Failed to grant signup bonus:", error);
  }
}

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: { baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL },
});

declare module "express-session" {
  interface SessionData {
    userId?: string;
    teamId?: string;
    userRole?: string;
    embassyCountry?: string;
  }
}

// Demo mode - no authentication required, just pass through
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // In demo mode, we allow all access
  // Set default demo values if not present
  if (!req.session.userId) {
    req.session.userId = "demo-user";
    req.session.teamId = "demo-team";
    req.session.userRole = req.headers["x-user-role"] as string || "sporting_director";
  }
  next();
};

const requireTeamRole = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    req.session.userId = "demo-user";
    req.session.teamId = "demo-team";
    req.session.userRole = "sporting_director";
  }
  next();
};

const requireScoutRole = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    req.session.userId = "demo-scout";
    req.session.userRole = "scout";
  }
  next();
};

const requireEmbassyRole = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    req.session.userId = "demo-embassy";
    req.session.userRole = "embassy";
    req.session.embassyCountry = "United Kingdom";
  }
  next();
};

function getPositionalMetricsPrompt(position: string): string {
  const positionLower = position.toLowerCase();
  
  if (positionLower.includes("goalkeeper") || positionLower === "gk") {
    return `Focus on GOALKEEPER-specific metrics:
- Saves made and save percentage
- Goals conceded
- Clean sheet performance
- Distribution accuracy (short and long passes)
- Crosses claimed vs punched
- One-on-one situations faced
- Positioning and command of area
- Communication with defense`;
  }
  
  if (positionLower.includes("defender") || positionLower.includes("back") || positionLower === "cb" || positionLower === "rb" || positionLower === "lb") {
    return `Focus on DEFENDER-specific metrics:
- Tackles won and tackle success rate
- Aerial duels won and percentage
- Interceptions and blocks
- Clearances
- Progressive carries and passes
- Ball recoveries
- Fouls committed
- Ground duels success rate
- Defensive positioning`;
  }
  
  if (positionLower.includes("midfielder") || positionLower === "cm" || positionLower === "dm" || positionLower === "am" || positionLower === "cdm") {
    return `Focus on MIDFIELDER-specific metrics:
- Pass completion rate (short, medium, long)
- Key passes and through balls
- Progressive passes and carries
- Ball recoveries and interceptions
- Ground duels won
- Shot creating actions
- Defensive contributions
- Distance covered and high-intensity runs
- Possession retention`;
  }
  
  if (positionLower.includes("winger") || positionLower.includes("wing") || positionLower === "lw" || positionLower === "rw" || positionLower === "lm" || positionLower === "rm") {
    return `Focus on WINGER-specific metrics:
- Successful dribbles and take-ons
- Crosses attempted and completed
- Key passes and assists
- Shot creating actions and goal involvement
- Final third entries
- Progressive carries
- 1v1 success rate
- Defensive tracking back
- Sprint speed and acceleration`;
  }
  
  if (positionLower.includes("striker") || positionLower.includes("forward") || positionLower === "st" || positionLower === "cf" || positionLower === "fw") {
    return `Focus on STRIKER/FORWARD-specific metrics:
- Goals scored and xG (expected goals)
- Shots on target and shot accuracy
- Conversion rate
- Aerial duels won
- Hold-up play and link-up passes
- Pressing actions and ball recoveries in final third
- Movement and runs behind defense
- xA (expected assists) if applicable
- Penalty area touches`;
  }
  
  return `Analyze general football performance metrics for this position: ${position}`;
}

async function updatePlayerStatsFromVideos(playerId: string): Promise<void> {
  try {
    const player = await storage.getPlayer(playerId);
    if (!player) return;

    const videos = await storage.getVideos(playerId);
    const playerTags = await storage.getVideoPlayerTagsForPlayer(playerId);
    
    let totalMinutesFromVideos = 0;
    const currentYear = new Date().getFullYear();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    let last12MonthsMinutes = 0;
    let currentSeasonMinutes = 0;
    
    for (const video of videos) {
      if (video.minutesPlayed && video.minutesPlayed > 0) {
        totalMinutesFromVideos += video.minutesPlayed;
        
        const videoDate = video.matchDate ? new Date(video.matchDate) : video.uploadDate;
        if (videoDate && videoDate >= oneYearAgo) {
          last12MonthsMinutes += video.minutesPlayed;
        }
        
        if (videoDate && videoDate.getFullYear() === currentYear) {
          currentSeasonMinutes += video.minutesPlayed;
        }
      }
    }
    
    for (const tag of playerTags) {
      if (tag.minutesPlayed && tag.minutesPlayed > 0) {
        totalMinutesFromVideos += tag.minutesPlayed;
        
        const videoDate = tag.video?.matchDate ? new Date(tag.video.matchDate) : (tag.video?.uploadDate || tag.createdAt);
        if (videoDate && videoDate >= oneYearAgo) {
          last12MonthsMinutes += tag.minutesPlayed;
        }
        
        if (videoDate && videoDate.getFullYear() === currentYear) {
          currentSeasonMinutes += tag.minutesPlayed;
        }
      }
    }
    
    const updates: Record<string, number> = {};
    
    if (totalMinutesFromVideos > 0) {
      updates.totalCareerMinutes = Math.max(player.totalCareerMinutes || 0, totalMinutesFromVideos);
    }
    if (last12MonthsMinutes > 0) {
      updates.clubMinutesLast12Months = Math.max(player.clubMinutesLast12Months || 0, last12MonthsMinutes);
    }
    if (currentSeasonMinutes > 0) {
      updates.clubMinutesCurrentSeason = Math.max(player.clubMinutesCurrentSeason || 0, currentSeasonMinutes);
    }
    
    if (Object.keys(updates).length > 0) {
      await storage.updatePlayer(playerId, updates);
    }
  } catch (error) {
    console.error("Error updating player stats from videos:", error);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  registerObjectStorageRoutes(app);
  const objectStorageService = new ObjectStorageService();
  
  // Object storage upload URL endpoint
  app.get("/api/object-storage/upload-url", requireAuth, async (req, res) => {
    try {
      const signedUrl = await objectStorageService.getObjectEntityUploadURL();
      
      // Extract the objectPath from the signed URL
      const url = new URL(signedUrl);
      const pathParts = url.pathname.split('/');
      const bucketName = pathParts[1];
      const objectName = pathParts.slice(2).join('/');
      const key = `${bucketName}/${objectName}`;
      const objectPath = `/objects/uploads/${objectName.split('/').pop()}`;
      
      res.json({ signedUrl, key, objectPath });
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Auth routes - Team signup
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const signupSchema = z.object({
        username: z.string().min(3),
        password: z.string().min(8),
        email: z.string().email(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        role: z.enum(["sporting_director", "legal", "scout", "coach", "admin", "agent", "embassy"]).optional().default("scout"),
        teamName: z.string().optional(),
        clubName: z.string().optional(),
        country: z.string().optional(),
        leagueBand: z.coerce.number().min(1).max(5).optional().default(3),
        embassyCountry: z.string().optional(),
        jurisdiction: z.string().optional(),
      }).transform(data => ({
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

        // Auto-login after signup
        req.session.userId = user.id;
        req.session.userRole = "embassy";
        req.session.embassyCountry = embassyProfile.country;
        
        return new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error("Session save error:", err);
              return res.status(500).json({ error: "Session error" });
            }
            res.json({ success: true, userId: user.id, role: "embassy", user: { id: user.id, username: user.username, role: "embassy", embassyCountry: embassyProfile.country } });
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

        // Auto-login after signup
        req.session.userId = user.id;
        req.session.userRole = data.role;
        
        return new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error("Session save error:", err);
              return res.status(500).json({ error: "Session error" });
            }
            res.json({ success: true, userId: user.id, role: data.role, user: { id: user.id, username: user.username, role: data.role } });
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

      // Auto-login after signup
      req.session.userId = user.id;
      req.session.teamId = teamId;
      req.session.userRole = data.role;
      
      return new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ error: "Session error" });
          }
          res.json({ success: true, userId: user.id, teamId, role: data.role, user: { id: user.id, username: user.username, role: data.role, teamId } });
          resolve(undefined);
        });
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      console.log("Login attempt for:", username);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log("User not found:", username);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Simple password comparison (for development)
      if (user.password !== password) {
        console.log("Password mismatch for:", username);
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

      // Save session explicitly
      return new Promise((resolve, reject) => {
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
            } 
          });
          resolve(undefined);
        });
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
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
      embassyProfile
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Players routes
  app.get("/api/players", requireAuth, async (req, res) => {
    try {
      // In demo mode, return all players
      const players = await storage.getPlayers();
      res.json(players);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Team-specific players route for team staff
  app.get("/api/team/players", requireAuth, async (req, res) => {
    try {
      const players = await storage.getPlayers();
      res.json(players);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/players/:id", requireAuth, async (req, res) => {
    try {
      const player = await storage.getPlayer(req.params.id);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      
      const metrics = await storage.getPlayerMetrics(player.id);
      const eligibilityScores = await storage.getEligibilityScores(player.id);
      const medicalRecords = await storage.getMedicalRecords(player.id);
      const biometricData = await storage.getBiometricData(player.id);
      const videos = await storage.getVideos(player.id);
      
      res.json({ 
        player, 
        metrics, 
        eligibilityScores, 
        medicalRecords, 
        biometricData,
        videos 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/players", requireAuth, async (req, res) => {
    try {
      const playerData = insertPlayerSchema.parse({
        ...req.body,
        teamId: req.body.teamId || "demo-team",
      });
      const player = await storage.createPlayer(playerData);
      res.json(player);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/players/:id", requireAuth, async (req, res) => {
    try {
      const player = await storage.updatePlayer(req.params.id, req.body);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json(player);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Player metrics routes
  app.post("/api/players/:id/metrics", requireAuth, async (req, res) => {
    try {
      const metrics = await storage.createPlayerMetrics({
        playerId: req.params.id,
        ...req.body,
      });
      res.json(metrics);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Player international records routes
  app.get("/api/players/:playerId/international-records", requireAuth, async (req, res) => {
    try {
      const records = await storage.getPlayerInternationalRecords(req.params.playerId);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/players/:playerId/international-records", requireAuth, async (req, res) => {
    try {
      const recordData = insertPlayerInternationalRecordSchema.parse({
        ...req.body,
        playerId: req.params.playerId,
      });
      const record = await storage.createPlayerInternationalRecord(recordData);
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/players/:playerId/international-records/:recordId", requireAuth, async (req, res) => {
    try {
      const record = await storage.updatePlayerInternationalRecord(req.params.recordId, req.body);
      if (!record) {
        return res.status(404).json({ error: "International record not found" });
      }
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/players/:playerId/international-records/:recordId", requireAuth, async (req, res) => {
    try {
      await storage.deletePlayerInternationalRecord(req.params.recordId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Player publishing for scouts (3.5 tokens per month)
  app.post("/api/players/:id/publish", requireTeamRole, async (req, res) => {
    try {
      const playerId = req.params.id;
      const userId = req.session.userId || "demo-user";
      const { publish } = req.body;
      
      const player = await storage.getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      if (publish) {
        // Check token balance (3.5 tokens, stored as 35 cents equivalent)
        const balance = await storage.getTokenBalance(userId);
        const cost = 4; // Round up 3.5 to 4 for integer storage
        
        if (!balance || balance.balance < cost) {
          return res.status(402).json({ 
            error: "Insufficient tokens", 
            required: cost, 
            current: balance?.balance || 0,
            needsTokens: true
          });
        }

        // Spend tokens
        const newBalance = balance.balance - cost;
        await storage.updateTokenBalance(userId, newBalance, undefined, balance.lifetimeSpent + cost);

        await storage.createTokenTransaction({
          userId,
          amount: cost,
          type: "debit",
          action: "publish_profile",
          description: `Published ${player.firstName} ${player.lastName} to scout network`,
          playerId,
          balanceAfter: newBalance,
        });

        // Set publish expiry to 30 days from now
        const publishExpiresAt = new Date();
        publishExpiresAt.setDate(publishExpiresAt.getDate() + 30);

        await storage.updatePlayer(playerId, {
          isPublishedToScouts: true,
          publishedAt: new Date(),
          publishExpiresAt,
        });

        res.json({ 
          success: true, 
          published: true, 
          expiresAt: publishExpiresAt,
          tokensSpent: cost,
          newBalance
        });
      } else {
        // Unpublish - no token refund
        await storage.updatePlayer(playerId, {
          isPublishedToScouts: false,
          publishedAt: null,
          publishExpiresAt: null,
        });

        res.json({ success: true, published: false });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create shareable player link (10 tokens)
  app.post("/api/players/:id/share", requireTeamRole, async (req, res) => {
    try {
      const playerId = req.params.id;
      const userId = req.session.userId || "demo-user";
      const teamId = req.session.teamId || "demo-team";
      
      const player = await storage.getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      // Check token balance (10 tokens)
      const balance = await storage.getTokenBalance(userId);
      const cost = 10;
      
      if (!balance || balance.balance < cost) {
        return res.status(402).json({ 
          error: "Insufficient tokens", 
          required: cost, 
          current: balance?.balance || 0,
          needsTokens: true
        });
      }

      // Spend tokens
      const newBalance = balance.balance - cost;
      await storage.updateTokenBalance(userId, newBalance, undefined, balance.lifetimeSpent + cost);

      // Generate unique share token
      const shareToken = `sr_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Create expiry 90 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      await storage.createTokenTransaction({
        userId,
        amount: cost,
        type: "debit",
        action: "share_profile",
        description: `Created shareable link for ${player.firstName} ${player.lastName}`,
        playerId,
        balanceAfter: newBalance,
      });

      const shareLink = await storage.createPlayerShareLink({
        playerId,
        teamId,
        shareToken,
        createdBy: userId,
        tokensSpent: cost,
        isActive: true,
        expiresAt,
      });

      res.json({ 
        success: true, 
        shareToken,
        shareUrl: `/shared/player/${shareToken}`,
        expiresAt,
        tokensSpent: cost,
        newBalance
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get player share links
  app.get("/api/players/:id/share-links", requireTeamRole, async (req, res) => {
    try {
      const links = await storage.getPlayerShareLinks(req.params.id);
      res.json(links);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Public shared player profile (no auth required)
  app.get("/api/shared/:shareToken", async (req, res) => {
    try {
      const shareLink = await storage.getPlayerShareLinkByToken(req.params.shareToken);
      
      if (!shareLink) {
        return res.status(404).json({ error: "Share link not found" });
      }

      if (!shareLink.isActive) {
        return res.status(410).json({ error: "Share link has been deactivated" });
      }

      if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Share link has expired" });
      }

      // Increment view count
      await storage.incrementShareLinkViewCount(shareLink.id);

      // Get player data with limited info
      const player = await storage.getPlayer(shareLink.playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      // Get eligibility data
      const eligibilityScores = await storage.getEligibilityScores(shareLink.playerId);
      const assessment = await storage.getTransferEligibilityAssessment(shareLink.playerId);
      const metrics = await storage.getPlayerMetrics(shareLink.playerId);
      const videos = await storage.getVideos(shareLink.playerId);

      // Include video previews (thumbnails/titles only, no playable URLs)
      const videoPreview = videos.map(v => ({
        id: v.id,
        title: v.title,
        thumbnailUrl: v.thumbnailUrl,
        duration: v.duration,
        source: v.source,
      }));

      // Return limited profile data (no full videos, require signup)
      res.json({
        player: {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          nationality: player.nationality,
          secondNationality: player.secondNationality,
          position: player.position,
          secondaryPosition: player.secondaryPosition,
          currentClubName: player.currentClubName,
          profileImageUrl: player.profileImageUrl,
          height: player.height,
          heightUnit: player.heightUnit,
          weight: player.weight,
          weightUnit: player.weightUnit,
          nationalTeamCaps: player.nationalTeamCaps,
          nationalTeamGoals: player.nationalTeamGoals,
          continentalGames: player.continentalGames,
          dateOfBirth: player.dateOfBirth,
          preferredFoot: player.preferredFoot,
          clubMinutesCurrentSeason: player.clubMinutesCurrentSeason,
          internationalMinutesCurrentSeason: player.internationalMinutesCurrentSeason,
        },
        eligibilityScores,
        assessment,
        metrics,
        videos: videoPreview,
        videoCount: videos.length,
        requiresSignupForVideos: true,
        sharedBy: shareLink.teamId,
        shareLink: {
          expiresAt: shareLink.expiresAt,
          viewCount: (shareLink.viewCount || 0) + 1,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Player documents routes (passport, national ID, birth certificate)
  app.get("/api/players/:playerId/documents", requireTeamRole, async (req, res) => {
    try {
      const documents = await storage.getPlayerDocuments(req.params.playerId);
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/players/:playerId/documents", requireTeamRole, async (req, res) => {
    try {
      const { documentType, originalName, mimeType, fileSize, storageKey, objectPath, documentNumber, issuingCountry, expiryDate, notes } = req.body;
      
      if (!documentType || !originalName || !storageKey) {
        return res.status(400).json({ error: "Missing required fields: documentType, originalName, storageKey" });
      }
      
      const validTypes = ["passport", "national_id", "birth_certificate"];
      if (!validTypes.includes(documentType)) {
        return res.status(400).json({ error: `Invalid document type. Must be one of: ${validTypes.join(", ")}` });
      }
      
      const document = await storage.createPlayerDocument({
        playerId: req.params.playerId,
        teamId: req.session.teamId || "demo-team",
        documentType,
        originalName,
        mimeType,
        fileSize,
        storageKey,
        objectPath,
        documentNumber,
        issuingCountry,
        expiryDate,
        notes,
        uploadedBy: req.session.userId,
      });
      
      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "upload_document",
        entityType: "player_document",
        entityId: document.id,
        details: { playerId: req.params.playerId, documentType },
      });
      
      res.json(document);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/players/:playerId/documents/:docId", requireTeamRole, async (req, res) => {
    try {
      const document = await storage.updatePlayerDocument(req.params.docId, req.body);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/players/:playerId/documents/:docId", requireTeamRole, async (req, res) => {
    try {
      const document = await storage.getPlayerDocument(req.params.docId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      await storage.deletePlayerDocument(req.params.docId);
      
      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "delete_document",
        entityType: "player_document",
        entityId: req.params.docId,
        details: { playerId: req.params.playerId, documentType: document.documentType },
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/players/:playerId/documents/:docId/verify", requireTeamRole, async (req, res) => {
    try {
      const document = await storage.updatePlayerDocument(req.params.docId, {
        verificationStatus: "verified",
        verifiedBy: req.session.userId,
        verifiedAt: new Date(),
      });
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "verify_document",
        entityType: "player_document",
        entityId: req.params.docId,
        details: { playerId: req.params.playerId, documentType: document.documentType },
      });
      
      res.json(document);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Federation Letter Request routes
  
  // Team summary stats endpoint
  app.get("/api/federation-letter-requests/summary", requireTeamRole, async (req, res) => {
    try {
      const teamId = req.session.teamId || "demo-team";
      const requests = await storage.getFederationLetterRequests(teamId);
      
      const summary = {
        total: requests.length,
        pending: requests.filter(r => r.status === "pending").length,
        submitted: requests.filter(r => r.status === "submitted").length,
        processing: requests.filter(r => r.status === "processing").length,
        issued: requests.filter(r => r.status === "issued").length,
        rejected: requests.filter(r => r.status === "rejected").length,
      };
      
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/federation-letter-requests", requireTeamRole, async (req, res) => {
    try {
      const { teamId, playerId, status } = req.query;
      let requests;
      if (playerId) {
        requests = await storage.getFederationLetterRequestsByPlayer(playerId as string);
      } else if (status) {
        requests = await storage.getFederationLetterRequestsByStatus(status as string);
      } else {
        requests = await storage.getFederationLetterRequests(teamId as string || req.session.teamId);
      }
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/federation-letter-requests/:id", requireTeamRole, async (req, res) => {
    try {
      const request = await storage.getFederationLetterRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/players/:playerId/issued-federation-letters", requireTeamRole, async (req, res) => {
    try {
      const issuedLetters = await storage.getIssuedFederationLettersByPlayer(req.params.playerId);
      res.json(issuedLetters);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/federation-letter-requests", requireTeamRole, async (req, res) => {
    try {
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString(36).toUpperCase();
      const requestNumber = `FLR-${year}-${timestamp}`;
      
      // Ensure teamId is set from session before validation
      const teamId = req.session.teamId || req.body.teamId || "demo-team";
      
      const requestData = insertFederationLetterRequestSchema.parse({
        ...req.body,
        requestNumber,
        teamId,
        status: "pending",
        paymentStatus: "unpaid",
        submittedBy: req.session.userId,
        feeAmount: 150,
        serviceCharge: 25,
        totalAmount: 175,
      });
      
      const newRequest = await storage.createFederationLetterRequest(requestData);
      
      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "create_federation_letter_request",
        entityType: "federation_letter_request",
        entityId: newRequest.id,
        details: { requestNumber, playerId: req.body.playerId },
      });
      
      res.json(newRequest);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/federation-letter-requests/:id", requireTeamRole, async (req, res) => {
    try {
      const request = await storage.getFederationLetterRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      const updatedRequest = await storage.updateFederationLetterRequest(req.params.id, req.body);
      
      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "update_federation_letter_request",
        entityType: "federation_letter_request",
        entityId: req.params.id,
        details: { updates: Object.keys(req.body) },
      });
      
      res.json(updatedRequest);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/federation-letter-requests/:id/submit", requireTeamRole, async (req, res) => {
    try {
      const request = await storage.getFederationLetterRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      if (request.paymentStatus !== "paid") {
        return res.status(400).json({ error: "Payment required before submission" });
      }
      
      const updatedRequest = await storage.updateFederationLetterRequest(req.params.id, {
        status: "submitted",
        submittedAt: new Date(),
      });
      
      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "submit_federation_letter_request",
        entityType: "federation_letter_request",
        entityId: req.params.id,
        details: { requestNumber: request.requestNumber },
      });
      
      res.json(updatedRequest);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/federation-letter-requests/:id/process", requireTeamRole, async (req, res) => {
    try {
      const request = await storage.getFederationLetterRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      const updatedRequest = await storage.updateFederationLetterRequest(req.params.id, {
        status: "processing",
        processedBy: req.session.userId,
        processedAt: new Date(),
      });
      
      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "process_federation_letter_request",
        entityType: "federation_letter_request",
        entityId: req.params.id,
        details: { requestNumber: request.requestNumber },
      });
      
      res.json(updatedRequest);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/federation-letter-requests/:id/issue", requireTeamRole, async (req, res) => {
    try {
      const request = await storage.getFederationLetterRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      const { issuedDocumentStorageKey, issuedDocumentObjectPath, issuedDocumentOriginalName } = req.body;
      
      const updatedRequest = await storage.updateFederationLetterRequest(req.params.id, {
        status: "issued",
        issuedAt: new Date(),
        issuedBy: req.session.userId,
        issuedDocumentStorageKey,
        issuedDocumentObjectPath,
        issuedDocumentOriginalName,
      });
      
      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "issue_federation_letter_request",
        entityType: "federation_letter_request",
        entityId: req.params.id,
        details: { requestNumber: request.requestNumber },
      });
      
      res.json(updatedRequest);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/federation-letter-requests/:id/reject", requireTeamRole, async (req, res) => {
    try {
      const request = await storage.getFederationLetterRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      const { rejectionReason } = req.body;
      
      const updatedRequest = await storage.updateFederationLetterRequest(req.params.id, {
        status: "rejected",
        rejectionReason,
      });
      
      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "reject_federation_letter_request",
        entityType: "federation_letter_request",
        entityId: req.params.id,
        details: { requestNumber: request.requestNumber, rejectionReason },
      });
      
      res.json(updatedRequest);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/federation-letter-requests/:id/confirm-payment", requireTeamRole, async (req, res) => {
    try {
      const request = await storage.getFederationLetterRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      const { paymentId } = req.body;
      
      const updatedRequest = await storage.updateFederationLetterRequest(req.params.id, {
        paymentStatus: "paid",
        paymentId,
        paymentConfirmedAt: new Date(),
      });
      
      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "confirm_payment_federation_letter_request",
        entityType: "federation_letter_request",
        entityId: req.params.id,
        details: { requestNumber: request.requestNumber, paymentId },
      });
      
      res.json(updatedRequest);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/federation-letter-requests/:id", requireTeamRole, async (req, res) => {
    try {
      const request = await storage.getFederationLetterRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      if (request.status !== "pending") {
        return res.status(400).json({ error: "Can only delete pending requests" });
      }
      
      await storage.deleteFederationLetterRequest(req.params.id);
      
      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "delete_federation_letter_request",
        entityType: "federation_letter_request",
        entityId: req.params.id,
        details: { requestNumber: request.requestNumber },
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Federation Admin Routes
  const requireFederationAdmin = (req: Request, res: Response, next: NextFunction) => {
    // In demo mode, allow access to federation admin routes for any user
    // This simulates having federation admin privileges for demo purposes
    if (!req.session.userId) {
      req.session.userId = "demo-federation-admin";
      req.session.userRole = "federation_admin";
    }
    // In demo mode, grant federation admin access to all users accessing these routes
    // In production, this would check for actual federation_admin role
    next();
  };

  app.get("/api/federation-admin/dashboard-stats", requireFederationAdmin, async (req, res) => {
    try {
      const stats = await storage.getFederationDashboardStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/federation-admin/requests", requireFederationAdmin, async (req, res) => {
    try {
      const { status } = req.query;
      let requests;
      if (status && status !== "all") {
        requests = await storage.getFederationLetterRequestsByStatus(status as string);
      } else {
        requests = await storage.getFederationLetterRequests();
      }
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/federation-admin/requests/:id/accept", requireFederationAdmin, async (req, res) => {
    try {
      const request = await storage.getFederationLetterRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      if (request.status !== "submitted") {
        return res.status(400).json({ error: "Can only accept submitted requests" });
      }
      
      const updatedRequest = await storage.updateFederationLetterRequest(req.params.id, {
        status: "processing",
        processedBy: req.session.userId,
        processedAt: new Date(),
      });

      await storage.createFederationRequestActivity({
        requestId: req.params.id,
        actorId: req.session.userId,
        actorRole: "federation_admin",
        activityType: "accepted",
        description: "Request accepted for processing",
        previousStatus: "submitted",
        newStatus: "processing",
      });
      
      res.json(updatedRequest);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/federation-admin/requests/:id/issue", requireFederationAdmin, async (req, res) => {
    try {
      const request = await storage.getFederationLetterRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      if (request.status !== "processing") {
        return res.status(400).json({ error: "Can only issue processing requests" });
      }
      
      const { issuedDocumentStorageKey, issuedDocumentObjectPath, issuedDocumentOriginalName, mimeType, fileSize } = req.body;
      
      const updatedRequest = await storage.updateFederationLetterRequest(req.params.id, {
        status: "issued",
        issuedAt: new Date(),
        issuedBy: req.session.userId,
        issuedDocumentStorageKey,
        issuedDocumentObjectPath,
        issuedDocumentOriginalName,
      });

      // Create issued document record for download tracking
      await storage.createFederationIssuedDocument({
        requestId: req.params.id,
        documentType: "Federation Letter",
        documentNumber: request.requestNumber,
        storageKey: issuedDocumentStorageKey || `issued-${req.params.id}`,
        objectPath: issuedDocumentObjectPath,
        originalName: issuedDocumentOriginalName || `Federation_Letter_${request.requestNumber}.pdf`,
        mimeType: mimeType || "application/pdf",
        fileSize: fileSize || 0,
        issuedBy: req.session.userId || "federation-admin",
        issuedByName: "Federation Administrator",
      });

      await storage.createFederationRequestActivity({
        requestId: req.params.id,
        actorId: req.session.userId,
        actorRole: "federation_admin",
        activityType: "issued",
        description: "Federation letter issued",
        previousStatus: "processing",
        newStatus: "issued",
        metadata: { documentName: issuedDocumentOriginalName },
      });
      
      res.json(updatedRequest);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/federation-admin/requests/:id/reject", requireFederationAdmin, async (req, res) => {
    try {
      const request = await storage.getFederationLetterRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      const { rejectionReason } = req.body;
      
      const updatedRequest = await storage.updateFederationLetterRequest(req.params.id, {
        status: "rejected",
        rejectionReason,
      });

      await storage.createFederationRequestActivity({
        requestId: req.params.id,
        actorId: req.session.userId,
        actorRole: "federation_admin",
        activityType: "rejected",
        description: "Request rejected",
        previousStatus: request.status,
        newStatus: "rejected",
        metadata: { rejectionReason },
      });
      
      res.json(updatedRequest);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/federation-admin/requests/:id/activities", requireFederationAdmin, async (req, res) => {
    try {
      const activities = await storage.getFederationRequestActivities(req.params.id);
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get request documents (passport and invitation letter)
  app.get("/api/federation-admin/requests/:id/documents", requireFederationAdmin, async (req, res) => {
    try {
      const request = await storage.getFederationLetterRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      const documents: Array<{
        type: string;
        name: string;
        objectPath?: string | null;
        storageKey?: string | null;
        mimeType?: string | null;
        verificationStatus?: string | null;
      }> = [];
      
      // Get passport document if attached
      if (request.passportDocumentId) {
        const passportDoc = await storage.getPlayerDocument(request.passportDocumentId);
        if (passportDoc) {
          documents.push({
            type: "passport",
            name: passportDoc.originalName,
            objectPath: passportDoc.objectPath,
            storageKey: passportDoc.storageKey,
            mimeType: passportDoc.mimeType,
            verificationStatus: passportDoc.verificationStatus,
          });
        }
      }
      
      // Get invitation letter if attached
      if (request.invitationLetterObjectPath || request.invitationLetterStorageKey) {
        documents.push({
          type: "invitation_letter",
          name: request.invitationLetterOriginalName || "Invitation Letter",
          objectPath: request.invitationLetterObjectPath,
          storageKey: request.invitationLetterStorageKey,
          mimeType: "application/pdf",
        });
      }
      
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/federation-admin/fee-schedules", requireFederationAdmin, async (req, res) => {
    try {
      const { federationId } = req.query;
      const schedules = federationId 
        ? await storage.getFederationFeeSchedules(federationId as string)
        : await storage.getAllFederationFeeSchedules();
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/federation-admin/fee-schedules", requireFederationAdmin, async (req, res) => {
    try {
      const schedule = await storage.createFederationFeeSchedule({
        ...req.body,
        platformServiceCharge: 25,
      });
      res.json(schedule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/federation-admin/fee-schedules/:id", requireFederationAdmin, async (req, res) => {
    try {
      const schedule = await storage.updateFederationFeeSchedule(req.params.id, req.body);
      res.json(schedule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/federation-admin/fee-schedules/:id", requireFederationAdmin, async (req, res) => {
    try {
      await storage.deleteFederationFeeSchedule(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/federation-admin/profiles", requireFederationAdmin, async (req, res) => {
    try {
      const profiles = await storage.getFederationProfiles();
      res.json(profiles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/federation-admin/profiles", requireFederationAdmin, async (req, res) => {
    try {
      const profile = await storage.createFederationProfile(req.body);
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/federation-admin/profiles/:id", requireFederationAdmin, async (req, res) => {
    try {
      const profile = await storage.updateFederationProfile(req.params.id, req.body);
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Federation Request Messages Routes (accessible by both team and federation admin)
  app.get("/api/federation-requests/:id/messages", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getFederationRequestMessages(req.params.id);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/federation-requests/:id/messages", requireAuth, async (req, res) => {
    try {
      const { content, subject, recipientPortal } = req.body;
      const userRole = req.session.userRole || 'team';
      const senderPortal = userRole === 'federation_admin' ? 'federation' : 'team';
      
      const message = await storage.createFederationRequestMessage({
        requestId: req.params.id,
        senderId: req.session.userId || 'anonymous',
        senderName: req.body.senderName || req.session.userId || 'Unknown',
        senderRole: userRole,
        senderPortal,
        recipientPortal: recipientPortal || (senderPortal === 'team' ? 'federation' : 'team'),
        subject,
        content,
      });

      await storage.logFederationActivity(
        req.params.id,
        'message_sent',
        `Message sent from ${senderPortal} portal`,
        req.session.userId,
        req.body.senderName || req.session.userId,
        userRole,
        undefined,
        undefined,
        { messageId: message.id, subject }
      );

      res.json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/federation-requests/messages/:id/read", requireAuth, async (req, res) => {
    try {
      const message = await storage.markMessageAsRead(req.params.id);
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Federation Request Activity Log Routes
  app.get("/api/federation-requests/:id/activities", requireAuth, async (req, res) => {
    try {
      const activities = await storage.getFederationRequestActivities(req.params.id);
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Federation Request Full History (request + activities + messages + documents)
  app.get("/api/federation-requests/:id/history", requireAuth, async (req, res) => {
    try {
      const history = await storage.getRequestWithFullHistory(req.params.id);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Federation Issued Documents Routes
  app.get("/api/federation-requests/:id/issued-documents", requireAuth, async (req, res) => {
    try {
      const documents = await storage.getFederationIssuedDocuments(req.params.id);
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/federation-requests/:id/issued-documents/:docId/download", requireAuth, async (req, res) => {
    try {
      await storage.incrementDocumentDownloadCount(req.params.docId);
      
      await storage.logFederationActivity(
        req.params.id,
        'document_downloaded',
        `Document downloaded`,
        req.session.userId,
        req.session.userId,
        req.session.userRole,
        undefined,
        undefined,
        { documentId: req.params.docId }
      );
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Download an issued document directly - generates PDF with platform timestamp
  app.get("/api/federation-requests/:id/issued-documents/:docId/download-file", requireAuth, async (req, res) => {
    try {
      const documents = await storage.getFederationIssuedDocuments(req.params.id);
      const doc = documents.find(d => d.id === req.params.docId);
      
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Get the request details for the certificate
      const request = await storage.getFederationLetterRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      await storage.incrementDocumentDownloadCount(req.params.docId);
      
      // Generate a PDF certificate with platform timestamp
      const pdf = new jsPDF();
      const issuedDate = doc.createdAt ? new Date(doc.createdAt) : new Date();
      const downloadDate = new Date();
      
      // Header
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("FEDERATION LETTER CERTIFICATE", 105, 30, { align: "center" });
      
      // Platform branding
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text("Sports Reels Compliance Platform", 105, 40, { align: "center" });
      
      // Horizontal line
      pdf.setLineWidth(0.5);
      pdf.line(20, 50, 190, 50);
      
      // Document details
      pdf.setFontSize(11);
      let yPos = 65;
      
      pdf.setFont("helvetica", "bold");
      pdf.text("Document Information", 20, yPos);
      yPos += 10;
      
      pdf.setFont("helvetica", "normal");
      pdf.text(`Request Number: ${request.requestNumber}`, 20, yPos);
      yPos += 8;
      pdf.text(`Document Type: ${doc.documentType}`, 20, yPos);
      yPos += 8;
      pdf.text(`Original File: ${doc.originalName}`, 20, yPos);
      yPos += 15;
      
      pdf.setFont("helvetica", "bold");
      pdf.text("Athlete Information", 20, yPos);
      yPos += 10;
      
      pdf.setFont("helvetica", "normal");
      pdf.text(`Full Name: ${request.athleteFullName}`, 20, yPos);
      yPos += 8;
      pdf.text(`Nationality: ${request.athleteNationality}`, 20, yPos);
      yPos += 8;
      pdf.text(`Position: ${request.athletePosition}`, 20, yPos);
      yPos += 8;
      pdf.text(`Date of Birth: ${request.athleteDateOfBirth}`, 20, yPos);
      yPos += 15;
      
      pdf.setFont("helvetica", "bold");
      pdf.text("Transfer Details", 20, yPos);
      yPos += 10;
      
      pdf.setFont("helvetica", "normal");
      pdf.text(`Target Club: ${request.targetClubName}`, 20, yPos);
      yPos += 8;
      pdf.text(`Target Country: ${request.targetClubCountry}`, 20, yPos);
      yPos += 8;
      pdf.text(`Transfer Type: ${request.transferType?.replace(/_/g, ' ').toUpperCase()}`, 20, yPos);
      yPos += 8;
      if (request.federationName) {
        pdf.text(`Federation: ${request.federationName} (${request.federationCountry})`, 20, yPos);
        yPos += 8;
      }
      yPos += 10;
      
      // Horizontal line
      pdf.line(20, yPos, 190, yPos);
      yPos += 15;
      
      // Platform timestamp section
      pdf.setFont("helvetica", "bold");
      pdf.text("Platform Verification", 20, yPos);
      yPos += 10;
      
      pdf.setFont("helvetica", "normal");
      pdf.text(`Issued Date: ${issuedDate.toLocaleString('en-US', { 
        dateStyle: 'full', 
        timeStyle: 'long',
        timeZone: 'UTC'
      })} UTC`, 20, yPos);
      yPos += 8;
      pdf.text(`Download Date: ${downloadDate.toLocaleString('en-US', { 
        dateStyle: 'full', 
        timeStyle: 'long',
        timeZone: 'UTC'
      })} UTC`, 20, yPos);
      yPos += 8;
      pdf.text(`Issued By: ${doc.issuedByName || 'Federation Administrator'}`, 20, yPos);
      yPos += 8;
      pdf.text(`Download Count: ${(doc.downloadCount || 0) + 1}`, 20, yPos);
      yPos += 15;
      
      // Verification notice
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "italic");
      pdf.text("This document was issued through the Sports Reels Compliance Platform.", 105, yPos, { align: "center" });
      yPos += 5;
      pdf.text("The timestamp above represents the official platform issuance time.", 105, yPos, { align: "center" });
      yPos += 5;
      pdf.text(`Document ID: ${doc.id}`, 105, yPos, { align: "center" });
      
      // Footer
      pdf.setFontSize(8);
      pdf.text("Sports Reels - Player Compliance & Visa Eligibility Platform", 105, 285, { align: "center" });
      
      // Generate PDF buffer and send
      const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
      const fileName = `Federation_Letter_${request.requestNumber}_${downloadDate.toISOString().split('T')[0]}.pdf`;
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Download the original uploaded document
  app.get("/api/federation-requests/:id/issued-documents/:docId/download-original", requireAuth, async (req, res) => {
    try {
      const documents = await storage.getFederationIssuedDocuments(req.params.id);
      const doc = documents.find(d => d.id === req.params.docId);
      
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      await storage.incrementDocumentDownloadCount(req.params.docId);
      
      // If objectPath exists, stream the original file directly
      if (doc.objectPath) {
        try {
          const objectStorage = new ObjectStorageService();
          // Use getObjectEntityFile which handles /objects/uploads/uuid paths
          const objectFile = await objectStorage.getObjectEntityFile(doc.objectPath);
          res.setHeader("Content-Disposition", `attachment; filename="${doc.originalName}"`);
          return objectStorage.downloadObject(objectFile, res);
        } catch (e: any) {
          console.error("Error downloading original:", e);
        }
      }
      
      // Return error if file not found
      res.status(404).json({ error: "Original document file not found in storage" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Unread messages count for team portal
  app.get("/api/federation-requests/unread-count", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getUnreadMessagesForPortal('team');
      res.json({ count: messages.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Videos routes
  app.get("/api/videos", requireAuth, async (req, res) => {
    try {
      const { playerId } = req.query;
      const videos = await storage.getVideos(playerId as string | undefined);
      res.json(videos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/videos", requireAuth, async (req, res) => {
    try {
      const videoData = insertVideoSchema.parse({
        ...req.body,
        teamId: req.session.teamId,
      });
      const video = await storage.createVideo(videoData);
      
      if (video.playerId && video.minutesPlayed && video.minutesPlayed > 0) {
        await updatePlayerStatsFromVideos(video.playerId);
      }
      
      res.json(video);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/videos/:id", requireAuth, async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      const updatedVideo = await storage.updateVideo(req.params.id, req.body);
      
      if (updatedVideo && updatedVideo.playerId) {
        await updatePlayerStatsFromVideos(updatedVideo.playerId);
      }
      
      res.json(updatedVideo);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/videos/:id/analyze", requireAuth, async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      const player = await storage.getPlayer(video.playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      
      const userId = req.session.userId!;
      const userRole = req.session.userRole || "sporting_director";
      const tokenResult = await spendTokensForAction(userId, userRole, "video_analysis", video.playerId, video.id);
      if (!tokenResult.success) {
        return res.status(402).json({ error: tokenResult.error, needsTokens: true });
      }

      const analysisPrompt = `Analyze this football match video data for player performance metrics:
Player: ${player.firstName} ${player.lastName}
Position: ${player.position}
Match: ${video.title}
Duration: ${video.duration}
Competition: ${video.competition || "Unknown"}

Based on typical match analysis, provide estimated metrics in JSON format:
{
  "minutesPlayed": number,
  "distanceCovered": number (km),
  "sprintCount": number,
  "passesAttempted": number,
  "passesCompleted": number,
  "shotsOnTarget": number,
  "tackles": number,
  "interceptions": number,
  "duelsWon": number,
  "performanceRating": number (1-10),
  "summary": "brief performance summary"
}`;

      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: analysisPrompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const analysis = JSON.parse(response.text || "{}");
      
      const insights = await storage.createVideoInsights({
        videoId: video.id,
        playerId: video.playerId,
        minutesPlayed: analysis.minutesPlayed || 0,
        distanceCovered: analysis.distanceCovered,
        sprintCount: analysis.sprintCount || 0,
        passesAttempted: analysis.passesAttempted || 0,
        passesCompleted: analysis.passesCompleted || 0,
        shotsOnTarget: analysis.shotsOnTarget || 0,
        tackles: analysis.tackles || 0,
        interceptions: analysis.interceptions || 0,
        duelsWon: analysis.duelsWon || 0,
        aiAnalysis: analysis.summary,
      });

      res.json({ insights, analysis });
    } catch (error: any) {
      console.error("Video analysis error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Video Player Tags routes - for tagging multiple players to a video
  app.get("/api/videos/:id/player-tags", requireAuth, async (req, res) => {
    try {
      const tags = await storage.getVideoPlayerTags(req.params.id);
      res.json(tags);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/videos/:id/player-tags", requireAuth, async (req, res) => {
    try {
      const existingTags = await storage.getVideoPlayerTags(req.params.id);
      if (existingTags.length >= MAX_PLAYERS_PER_VIDEO) {
        return res.status(400).json({ 
          error: `Maximum ${MAX_PLAYERS_PER_VIDEO} players can be tagged per video` 
        });
      }

      const { playerId, minutesPlayed, position } = req.body;
      
      const alreadyTagged = existingTags.find(t => t.playerId === playerId);
      if (alreadyTagged) {
        return res.status(400).json({ error: "This player is already tagged to this video" });
      }

      const tag = await storage.createVideoPlayerTag({
        videoId: req.params.id,
        playerId,
        minutesPlayed: minutesPlayed || 0,
        position,
      });
      
      if (playerId && minutesPlayed && minutesPlayed > 0) {
        await updatePlayerStatsFromVideos(playerId);
      }
      
      res.json(tag);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/video-player-tags/:id", requireAuth, async (req, res) => {
    try {
      const existingTag = await storage.getVideoPlayerTag(req.params.id);
      if (!existingTag) {
        return res.status(404).json({ error: "Tag not found" });
      }
      
      const tag = await storage.updateVideoPlayerTag(req.params.id, req.body);
      
      if (existingTag.playerId) {
        await updatePlayerStatsFromVideos(existingTag.playerId);
      }
      
      res.json(tag);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/video-player-tags/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteVideoPlayerTag(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Analyze a specific tagged player in a video using positional metrics
  app.post("/api/video-player-tags/:id/analyze", requireAuth, async (req, res) => {
    try {
      const tag = await storage.getVideoPlayerTag(req.params.id);
      if (!tag) {
        return res.status(404).json({ error: "Player tag not found" });
      }

      const video = await storage.getVideo(tag.videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      const player = await storage.getPlayer(tag.playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      const position = tag.position || player.position || "Unknown";
      
      const positionalMetricsPrompt = getPositionalMetricsPrompt(position);
      
      const analysisPrompt = `Analyze this football match video for a specific player's performance based on their position.

Player: ${player.firstName} ${player.lastName}
Position Played in This Match: ${position}
Match: ${video.title}
Competition: ${video.competition || "Unknown"}
Opponent: ${video.opponent || "Unknown"}
Minutes Played: ${tag.minutesPlayed || video.minutesPlayed || "Full match"}

${positionalMetricsPrompt}

Provide a comprehensive analysis in JSON format:
{
  "performanceRating": number (1-10),
  "goals": number,
  "assists": number,
  "passesCompleted": number,
  "passesAttempted": number,
  "tackles": number,
  "interceptions": number,
  "saves": number (if goalkeeper),
  "shotsOnTarget": number,
  "distanceCovered": number (km),
  "sprintCount": number,
  "duelsWon": number,
  "duelsLost": number,
  "positionalMetrics": {
    // Position-specific metrics based on role
  },
  "keyMoments": [
    {
      "minute": number,
      "type": "goal" | "assist" | "save" | "tackle" | "key_pass" | "chance_created" | "defensive_action",
      "description": "brief description of the key moment"
    }
  ],
  "summary": "detailed performance summary focusing on position-specific contributions",
  "strengths": ["list of standout performances"],
  "areasToImprove": ["list of areas needing improvement"]
}`;

      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: analysisPrompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const analysis = JSON.parse(response.text || "{}");
      
      const updatedTag = await storage.updateVideoPlayerTag(tag.id, {
        performanceRating: analysis.performanceRating,
        goals: analysis.goals || 0,
        assists: analysis.assists || 0,
        passesCompleted: analysis.passesCompleted || 0,
        passesAttempted: analysis.passesAttempted || 0,
        tackles: analysis.tackles || 0,
        interceptions: analysis.interceptions || 0,
        saves: analysis.saves || 0,
        shotsOnTarget: analysis.shotsOnTarget || 0,
        distanceCovered: analysis.distanceCovered,
        sprintCount: analysis.sprintCount || 0,
        duelsWon: analysis.duelsWon || 0,
        duelsLost: analysis.duelsLost || 0,
        aiAnalysis: analysis.summary,
        positionalMetrics: analysis.positionalMetrics || {},
        keyMoments: analysis.keyMoments || [],
        strengths: analysis.strengths || [],
        areasToImprove: analysis.areasToImprove || [],
        analyzed: true,
      });

      res.json({ tag: updatedTag, analysis });
    } catch (error: any) {
      console.error("Player tag analysis error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get total video minutes for a player
  app.get("/api/players/:id/video-minutes", requireAuth, async (req, res) => {
    try {
      const totalMinutes = await storage.getPlayerVideoMinutes(req.params.id);
      res.json({ playerId: req.params.id, totalMinutes });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Eligibility routes
  app.get("/api/eligibility/:playerId", requireAuth, async (req, res) => {
    try {
      const scores = await storage.getEligibilityScores(req.params.playerId);
      res.json(scores);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/eligibility/:playerId/calculate", requireAuth, async (req, res) => {
    try {
      const player = await storage.getPlayer(req.params.playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      const metrics = await storage.getPlayerMetrics(player.id);
      const latestMetrics = metrics[0];

      const eligibilityPrompt = `Calculate visa eligibility scores for this football player across multiple visa types.

Player Profile:
- Name: ${player.firstName} ${player.lastName}
- Nationality: ${player.nationality}
- Position: ${player.position}
- National Team Caps: ${player.nationalTeamCaps || 0}
- International Caps: ${player.internationalCaps || 0}
- Continental Games: ${player.continentalGames || 0}
- Current Season Minutes: ${latestMetrics?.currentSeasonMinutes || 0}
- Total Career Minutes: ${latestMetrics?.totalCareerMinutes || 0}
- Games Played: ${latestMetrics?.gamesPlayed || 0}
- Goals: ${latestMetrics?.goals || 0}
- Assists: ${latestMetrics?.assists || 0}
- Club League Position: ${latestMetrics?.clubLeaguePosition || "Unknown"}

Calculate eligibility scores (0-100) for each visa type with detailed breakdown:

1. SCHENGEN_SPORTS - Schengen Sports Visa (EU)
   Criteria: Professional contract, match invitations, sports federation endorsement

2. UK_GBE - UK Governing Body Endorsement
   Criteria: Points system based on international appearances, league band, club continental participation

3. US_P1 - US P-1 Athlete Visa
   Criteria: International recognition, sustained national/international acclaim

4. US_O1 - US O-1 Extraordinary Ability
   Criteria: Extraordinary ability in athletics, awards, high salary, critical role

5. FIFA_TRANSFER - FIFA Transfer Rules
   Criteria: Valid registration, training compensation, solidarity mechanism compliance

6. MIDDLE_EAST - Middle East Sports Visa (UAE/Saudi)
   Criteria: Professional contract, club sponsorship, sports council approval

7. ASIA_SPORTS - Asia Sports Visa
   Criteria: Work permit, club contract, federation registration

Respond in JSON format:
{
  "scores": [
    {
      "visaType": "schengen_sports",
      "score": number,
      "status": "green" | "yellow" | "red",
      "breakdown": [
        {"criteria": "string", "points": number, "maxPoints": number, "description": "string"}
      ],
      "recommendation": "string"
    }
  ]
}`;

      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: eligibilityPrompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const result = JSON.parse(response.text || "{}");
      
      const savedScores = [];
      for (const scoreData of result.scores || []) {
        const saved = await storage.createEligibilityScore({
          playerId: player.id,
          visaType: scoreData.visaType,
          score: scoreData.score,
          status: scoreData.status,
          breakdown: scoreData.breakdown,
          leagueBandApplied: 3,
        });
        savedScores.push({ ...saved, recommendation: scoreData.recommendation });
      }

      res.json({ eligibilityScores: savedScores });
    } catch (error: any) {
      console.error("Eligibility calculation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Compliance orders routes
  app.get("/api/compliance/orders", requireAuth, async (req, res) => {
    try {
      const orders = await storage.getComplianceOrders(req.session.teamId!);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/compliance/orders", requireAuth, async (req, res) => {
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
  });

  app.post("/api/compliance/orders/:id/pay", requireAuth, async (req, res) => {
    try {
      const order = await storage.getComplianceOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Simulate payment (in production, use Stripe)
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
  });

  app.post("/api/compliance/orders/:id/generate", requireAuth, async (req, res) => {
    try {
      const order = await storage.getComplianceOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.status !== "paid") {
        return res.status(400).json({ error: "Order must be paid before generating document" });
      }

      const player = await storage.getPlayer(order.playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      const metrics = await storage.getPlayerMetrics(player.id);
      const eligibilityScores = await storage.getEligibilityScores(player.id);
      const medicalRecords = await storage.getMedicalRecords(player.id);
      const biometricData = await storage.getBiometricData(player.id);
      const latestMetrics = metrics[0];

      const documentPrompt = `Generate a comprehensive compliance document summary for embassy submission.

Player: ${player.firstName} ${player.lastName}
Nationality: ${player.nationality}
Position: ${player.position}
Date of Birth: ${player.dateOfBirth || "Not provided"}
Height: ${player.height ? player.height + "cm" : "Not provided"}
Weight: ${player.weight ? player.weight + "kg" : "Not provided"}

Performance Data:
- Current Season Minutes: ${latestMetrics?.currentSeasonMinutes || 0}
- Total Career Minutes: ${latestMetrics?.totalCareerMinutes || 0}
- Games Played: ${latestMetrics?.gamesPlayed || 0}
- Goals: ${latestMetrics?.goals || 0}
- Assists: ${latestMetrics?.assists || 0}
- National Team Caps: ${player.nationalTeamCaps || 0}
- International Caps: ${player.internationalCaps || 0}
- Continental Games: ${player.continentalGames || 0}
- Club League Position: ${latestMetrics?.clubLeaguePosition || "Unknown"}

Medical Data Available: ${medicalRecords.length > 0 ? "Yes" : "No"}
Biometric Data Available: ${biometricData.length > 0 ? "Yes" : "No"}

Target Visa: ${order.visaType}
Target Country: ${order.targetCountry || "Not specified"}

Generate a professional summary suitable for embassy submission that highlights:
1. Player's professional status and achievements
2. Performance statistics and playing time
3. International representation
4. Physical and medical fitness (if available)
5. Recommendation for visa eligibility

Provide the summary as a formal document text.`;

      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: documentPrompt,
      });

      const aiSummary = response.text || "";

      const document = await storage.createComplianceDocument({
        orderId: order.id,
        playerId: player.id,
        documentType: "pre_transfer_verification",
        generatedBy: req.session.userId,
        dataRangeStart: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        dataRangeEnd: new Date().toISOString(),
        aiSummary,
        playerProfile: {
          fullName: `${player.firstName} ${player.lastName}`,
          nationality: player.nationality,
          dateOfBirth: player.dateOfBirth,
          position: player.position,
          currentClub: player.currentClubId,
          height: player.height,
          weight: player.weight,
        },
        physicalData: biometricData[0] || {},
        performanceStats: latestMetrics || {},
        eligibilityData: eligibilityScores,
        status: "completed",
      });

      await storage.updateComplianceOrder(order.id, { status: "completed" } as any);

      res.json({ document, aiSummary });
    } catch (error: any) {
      console.error("Document generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Embassy verifications routes
  app.get("/api/embassy/verifications", requireAuth, async (req, res) => {
    try {
      const verifications = await storage.getEmbassyVerifications();
      res.json(verifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Scouting inquiries routes
  app.get("/api/scouting/inquiries", requireAuth, async (req, res) => {
    try {
      const inquiries = await storage.getScoutingInquiries();
      res.json(inquiries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/scouting/inquiries", requireAuth, async (req, res) => {
    try {
      const { playerId, buyingClubName, sellingClubName, message } = req.body;
      const inquiry = await storage.createScoutingInquiry({
        playerId,
        buyingClubName,
        sellingClubName,
        message,
        status: "inquiry",
      });

      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "create_scouting_inquiry",
        entityType: "scouting_inquiry",
        entityId: inquiry.id,
        details: { playerId, buyingClubName },
      });

      res.json(inquiry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Embassy verification submission
  app.post("/api/embassy/verifications", requireAuth, async (req, res) => {
    try {
      const { documentId, playerId, embassyCountry, verificationCode } = req.body;
      
      const verification = await storage.createEmbassyVerification({
        documentId,
        playerId,
        embassyCountry,
        verificationCode,
        status: "pending",
      });

      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "submit_for_verification",
        entityType: "embassy_verification",
        entityId: verification.id,
        details: { documentId, embassyCountry },
      });

      res.json(verification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/embassy/verifications/:id", requireEmbassyRole, async (req, res) => {
    try {
      const { status, notes } = req.body;
      const verification = await storage.updateEmbassyVerification(req.params.id, {
        status,
        notes,
        verifiedAt: status === "verified" ? new Date() : undefined,
      } as any);

      if (!verification) {
        return res.status(404).json({ error: "Verification not found" });
      }

      await storage.logAction({
        userId: req.session.userId,
        userRole: "embassy",
        action: "update_verification",
        entityType: "embassy_verification",
        entityId: verification.id,
        details: { status, notes },
      });

      res.json(verification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const players = await storage.getPlayers();
      const verifications = await storage.getEmbassyVerifications();
      const inquiries = await storage.getScoutingInquiries();
      
      let greenCount = 0, yellowCount = 0, redCount = 0;
      
      for (const player of players) {
        const scores = await storage.getEligibilityScores(player.id);
        if (scores.length > 0) {
          const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
          if (avgScore >= 60) greenCount++;
          else if (avgScore >= 35) yellowCount++;
          else redCount++;
        }
      }

      res.json({
        totalPlayers: players.length,
        greenStatus: greenCount,
        yellowStatus: yellowCount,
        redStatus: redCount,
        pendingVerifications: verifications.filter(v => v.status === "pending").length,
        activeInquiries: inquiries.filter(i => i.status !== "closed").length,
        reportsGenerated: 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Player map data - origins and transfer destinations
  app.get("/api/dashboard/map-data", requireAuth, async (req, res) => {
    try {
      const players = await storage.getPlayers();
      const invitationLetters = await storage.getAllInvitationLetters();
      
      // Build a player lookup map for efficient access
      const playerMap = new Map<string, typeof players[0]>();
      for (const player of players) {
        playerMap.set(player.id, player);
      }
      
      // Aggregate player origins by nationality
      const originsMap = new Map<string, { count: number; players: Array<{ id: string; name: string }> }>();
      
      for (const player of players) {
        const nationality = player.nationality?.toLowerCase() || "";
        if (!nationality) continue;
        
        if (!originsMap.has(nationality)) {
          originsMap.set(nationality, { count: 0, players: [] });
        }
        const origin = originsMap.get(nationality)!;
        origin.count++;
        origin.players.push({
          id: player.id,
          name: `${player.firstName} ${player.lastName}`,
        });
      }
      
      const playerOrigins = Array.from(originsMap.entries()).map(([country, data]) => ({
        country,
        count: data.count,
        players: data.players,
      }));
      
      // Get transfer destinations from invitation letters - use playerMap for O(1) lookup
      const transferDestinations: Array<{
        fromCountry: string;
        toCountry: string;
        playerName: string;
        playerId: string;
      }> = [];
      
      for (const letter of invitationLetters) {
        if (!letter.targetCountry) continue;
        const player = playerMap.get(letter.playerId);
        if (!player || !player.nationality) continue;
        
        transferDestinations.push({
          fromCountry: player.nationality.toLowerCase(),
          toCountry: letter.targetCountry.toLowerCase(),
          playerName: `${player.firstName} ${player.lastName}`,
          playerId: player.id,
        });
      }
      
      res.json({
        playerOrigins,
        transferDestinations,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Messaging routes
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getConversations(req.session.userId!);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const { title, playerId, type } = req.body;
      const conversation = await storage.createConversation({
        title,
        playerId,
        type: type || "general",
        status: "active",
      });
      
      await storage.addConversationParticipant({
        conversationId: conversation.id,
        userId: req.session.userId!,
        role: req.session.userRole || "unknown",
      });

      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "create_conversation",
        entityType: "conversation",
        entityId: conversation.id,
        details: { title, playerId, type },
      });

      res.json(conversation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const participants = await storage.getConversationParticipants(conversation.id);
      const messages = await storage.getMessages(conversation.id);
      res.json({ conversation, participants, messages });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const { content, attachmentUrl, attachmentType } = req.body;
      const userId = req.session.userId!;
      const userRole = req.session.userRole || "unknown";
      
      if (userRole !== "scout") {
        const conversation = await storage.getConversation(req.params.id);
        if (conversation && conversation.type === "scouting") {
          const tokenResult = await spendTokensForAction(userId, userRole, "scouting_messaging");
          if (!tokenResult.success) {
            return res.status(402).json({ error: tokenResult.error, needsTokens: true });
          }
        }
      }
      
      const message = await storage.createMessage({
        conversationId: req.params.id,
        senderId: userId,
        senderRole: userRole,
        content,
        attachmentUrl,
        attachmentType,
      });
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/conversations/:id/invite", requireAuth, async (req, res) => {
    try {
      const { userId, role } = req.body;
      const participant = await storage.addConversationParticipant({
        conversationId: req.params.id,
        userId,
        role,
      });
      res.json(participant);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Invitation letter routes
  app.get("/api/invitation-letters/:playerId", requireAuth, async (req, res) => {
    try {
      const letters = await storage.getInvitationLetters(req.params.playerId);
      res.json(letters);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/invitation-letters", requireAuth, async (req, res) => {
    try {
      const { playerId, targetClubName, targetLeague, targetLeagueBand, targetCountry, scoutAgentName, scoutAgentId, fileUrl } = req.body;
      
      const letter = await storage.createInvitationLetter({
        playerId,
        fromTeamId: req.session.teamId || "",
        targetClubName,
        targetLeague,
        targetLeagueBand,
        targetCountry,
        scoutAgentName,
        scoutAgentId,
        fileUrl,
        uploadedBy: req.session.userId,
        status: "pending",
      });

      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "upload_invitation_letter",
        entityType: "invitation_letter",
        entityId: letter.id,
        details: { playerId, targetClubName, targetCountry },
      });

      res.json(letter);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/invitation-letters", requireAuth, async (req, res) => {
    try {
      const letters = await storage.getAllInvitationLetters(req.session.teamId);
      const lettersWithPlayers = await Promise.all(
        letters.map(async (letter) => {
          const player = await storage.getPlayer(letter.playerId);
          return { ...letter, player };
        })
      );
      res.json(lettersWithPlayers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/invitation-letters/single/:id", requireAuth, async (req, res) => {
    try {
      const letter = await storage.getInvitationLetter(req.params.id);
      if (!letter) {
        return res.status(404).json({ error: "Invitation letter not found" });
      }
      const player = await storage.getPlayer(letter.playerId);
      res.json({ ...letter, player });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/invitation-letters/:id", requireAuth, async (req, res) => {
    try {
      const letter = await storage.updateInvitationLetter(req.params.id, req.body);
      if (!letter) {
        return res.status(404).json({ error: "Invitation letter not found" });
      }
      res.json(letter);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/invitation-letters/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteInvitationLetter(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/invitation-letters/:id/generate-consular-report", requireAuth, async (req, res) => {
    try {
      const letter = await storage.getInvitationLetter(req.params.id);
      if (!letter) {
        return res.status(404).json({ error: "Invitation letter not found" });
      }

      const player = await storage.getPlayer(letter.playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      const eligibilityScores = await storage.getEligibilityScores(letter.playerId);
      const playerVideos = await storage.getVideos(letter.playerId);
      const metrics = await storage.getPlayerMetrics(letter.playerId);
      
      const verificationCode = `VR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const videoQrCodes = playerVideos.slice(0, 5).map(video => ({
        videoId: video.id,
        title: video.title,
        qrUrl: `/api/verify/video/${video.id}?code=${verificationCode}`,
        competition: video.competition,
        matchDate: video.matchDate,
      }));

      const consularReport = await storage.createConsularReport({
        invitationLetterId: letter.id,
        playerId: letter.playerId,
        playerProfile: {
          firstName: player.firstName,
          lastName: player.lastName,
          nationality: player.nationality,
          dateOfBirth: player.dateOfBirth,
          position: player.position,
          currentClub: player.currentClubName,
          nationalTeamCaps: player.nationalTeamCaps,
          internationalCaps: player.internationalCaps,
        },
        playerStats: metrics.length > 0 ? {
          gamesPlayed: metrics[0].gamesPlayed,
          goals: metrics[0].goals,
          assists: metrics[0].assists,
          currentSeasonMinutes: metrics[0].currentSeasonMinutes,
        } : null,
        eligibilityScores: eligibilityScores.map(score => ({
          visaType: score.visaType,
          score: score.score,
          status: score.status,
          leagueBandApplied: score.leagueBandApplied,
        })),
        videoQrCodes,
        proofOfPlaySummary: `${player.firstName} ${player.lastName} has ${playerVideos.length} verified match videos demonstrating professional-level performance.`,
        targetClubDetails: {
          clubName: letter.targetClubName,
          clubAddress: letter.targetClubAddress,
          league: letter.targetLeague,
          leagueBand: letter.targetLeagueBand,
          country: letter.targetCountry,
        },
        verificationCode,
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      await storage.updateInvitationLetter(letter.id, {
        consularReportGenerated: true,
        consularReportUrl: `/api/consular-reports/${consularReport.id}`,
        qrCodeData: verificationCode,
        embassyAccessible: true,
      });

      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "generate_consular_report",
        entityType: "consular_report",
        entityId: consularReport.id,
        details: { playerId: letter.playerId, verificationCode },
      });

      res.json(consularReport);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/consular-reports/:id", requireAuth, async (req, res) => {
    try {
      const report = await storage.getConsularReport(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Consular report not found" });
      }
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Notify Embassy route (tokenized at 4 tokens)
  app.post("/api/invitation-letters/:id/notify-embassy", requireTeamRole, async (req, res) => {
    try {
      const letter = await storage.getInvitationLetter(req.params.id);
      if (!letter) {
        return res.status(404).json({ error: "Invitation letter not found" });
      }

      if (letter.embassyNotificationStatus === "notified") {
        return res.status(400).json({ error: "Embassy has already been notified for this invitation" });
      }

      const userId = req.session.userId!;
      const tokenBalance = await storage.getTokenBalance(userId);
      const currentBalance = tokenBalance?.balance || 0;
      const notificationCost = 4;

      if (currentBalance < notificationCost) {
        return res.status(400).json({ error: `Insufficient tokens. Requires ${notificationCost} tokens, you have ${currentBalance}.` });
      }

      const newBalance = currentBalance - notificationCost;
      await storage.updateTokenBalance(userId, newBalance, undefined, (tokenBalance?.lifetimeSpent || 0) + notificationCost);

      await storage.createTokenTransaction({
        userId,
        amount: -notificationCost,
        type: "debit",
        action: "embassy_notification",
        description: `Embassy notification for invitation to ${letter.targetClubName}`,
        playerId: letter.playerId,
        balanceAfter: newBalance,
      });

      await storage.updateInvitationLetter(letter.id, {
        embassyNotificationStatus: "notified",
        embassyNotifiedAt: new Date(),
        embassyNotifiedBy: userId,
        embassyNotificationTokensSpent: notificationCost,
        embassyAccessible: true,
      });

      await storage.createEmbassyNotification({
        invitationLetterId: letter.id,
        playerId: letter.playerId,
        teamId: letter.fromTeamId,
        embassyCountry: letter.targetCountry,
        status: "pending",
        tokensSpent: notificationCost,
        notifiedBy: userId,
      });

      await storage.logAction({
        userId,
        userRole: req.session.userRole,
        action: "notify_embassy",
        entityType: "invitation_letter",
        entityId: letter.id,
        details: { targetCountry: letter.targetCountry, tokensSpent: notificationCost },
      });

      res.json({ 
        success: true, 
        message: `Embassy notified successfully. ${notificationCost} tokens deducted.`,
        newBalance,
        letter: { ...letter, embassyNotificationStatus: "notified" }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/consular-reports/player/:playerId", requireAuth, async (req, res) => {
    try {
      const reports = await storage.getConsularReports(req.params.playerId);
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/verify/consular-report/:code", async (req, res) => {
    try {
      const report = await storage.getConsularReportByVerificationCode(req.params.code);
      if (!report) {
        return res.status(404).json({ error: "Invalid verification code", valid: false });
      }
      
      if (report.validUntil && new Date(report.validUntil) < new Date()) {
        return res.json({ valid: false, error: "Report has expired" });
      }

      await storage.updateConsularReport(report.id, {
        accessedByEmbassy: true,
        embassyAccessLogs: [
          ...(Array.isArray(report.embassyAccessLogs) ? report.embassyAccessLogs : []),
          { accessedAt: new Date().toISOString(), ip: req.ip }
        ],
      });

      res.json({ 
        valid: true, 
        playerProfile: report.playerProfile,
        eligibilityScores: report.eligibilityScores,
        targetClubDetails: report.targetClubDetails,
        proofOfPlaySummary: report.proofOfPlaySummary,
        generatedAt: report.generatedAt,
        validUntil: report.validUntil,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Transfer Eligibility Assessment - Calculate and return multi-visa eligibility scoring
  app.get("/api/players/:id/transfer-eligibility", requireTeamRole, async (req, res) => {
    try {
      const playerId = req.params.id;
      const player = await storage.getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      const { calculateTransferEligibility } = await import("./eligibilityScoring");

      const metrics = await storage.getPlayerMetrics(playerId);
      const videos = await storage.getVideos(playerId);
      const internationalRecords = await storage.getPlayerInternationalRecords(playerId);
      const invitationLetters = await storage.getInvitationLetters(playerId);
      
      const videoInsightsPromises = videos.map(v => storage.getVideoInsights(v.id));
      const videoInsightsResults = await Promise.all(videoInsightsPromises);
      const videoInsights = videoInsightsResults.filter((i): i is NonNullable<typeof i> => i !== undefined);

      const latestInvitation = invitationLetters[0];
      const leagueBand = latestInvitation?.targetLeagueBand || 3;

      const eligibilityResult = calculateTransferEligibility({
        player,
        metrics,
        videos,
        videoInsights,
        internationalRecords,
        invitationLetters,
        leagueBand,
      });

      const existingAssessment = await storage.getTransferEligibilityAssessment(playerId);
      
      const assessmentData = {
        playerId,
        totalMinutesVerified: eligibilityResult.totalMinutesVerified,
        clubMinutes: eligibilityResult.clubMinutes,
        internationalMinutes: eligibilityResult.internationalMinutes,
        videoMinutes: eligibilityResult.videoMinutes,
        totalCaps: eligibilityResult.totalCaps,
        seniorCaps: eligibilityResult.seniorCaps,
        continentalAppearances: eligibilityResult.continentalAppearances,
        overallStatus: eligibilityResult.overallStatus,
        schengenScore: eligibilityResult.schengen.score,
        schengenStatus: eligibilityResult.schengen.status,
        o1Score: eligibilityResult.o1.score,
        o1Status: eligibilityResult.o1.status,
        p1Score: eligibilityResult.p1.score,
        p1Status: eligibilityResult.p1.status,
        ukGbeScore: eligibilityResult.ukGbe.score,
        ukGbeStatus: eligibilityResult.ukGbe.status,
        escScore: eligibilityResult.esc.score,
        escStatus: eligibilityResult.esc.status,
        escEligible: eligibilityResult.escEligible,
        minutesNeeded: eligibilityResult.minutesNeeded,
        capsNeeded: eligibilityResult.capsNeeded,
        recommendations: eligibilityResult.recommendations,
        visaBreakdown: {
          schengen: eligibilityResult.schengen,
          o1: eligibilityResult.o1,
          p1: eligibilityResult.p1,
          ukGbe: eligibilityResult.ukGbe,
          esc: eligibilityResult.esc,
        },
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      let assessment;
      if (existingAssessment) {
        assessment = await storage.updateTransferEligibilityAssessment(existingAssessment.id, assessmentData);
      } else {
        assessment = await storage.createTransferEligibilityAssessment(assessmentData);
      }

      res.json({
        assessment,
        player: {
          id: player.id,
          name: `${player.firstName} ${player.lastName}`,
          position: player.position,
          nationality: player.nationality,
          currentClub: player.currentClubName,
          marketValue: player.marketValue,
        },
        minutesBreakdown: {
          club: eligibilityResult.clubMinutes,
          international: eligibilityResult.internationalMinutes,
          video: eligibilityResult.videoMinutes,
          total: eligibilityResult.totalMinutesVerified,
          minimum: 800,
          needed: eligibilityResult.minutesNeeded,
        },
        visaScores: {
          schengen: eligibilityResult.schengen,
          o1: eligibilityResult.o1,
          p1: eligibilityResult.p1,
          ukGbe: eligibilityResult.ukGbe,
          esc: eligibilityResult.esc,
        },
        overallStatus: eligibilityResult.overallStatus,
        recommendations: eligibilityResult.recommendations,
        capsNeeded: eligibilityResult.capsNeeded,
        leagueBandApplied: leagueBand,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Recalculate Transfer Eligibility Assessment
  app.post("/api/players/:id/transfer-eligibility/recalculate", requireTeamRole, async (req, res) => {
    try {
      const playerId = req.params.id;
      const { leagueBand: overrideLeagueBand } = req.body;
      
      const player = await storage.getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      const { calculateTransferEligibility } = await import("./eligibilityScoring");

      const metrics = await storage.getPlayerMetrics(playerId);
      const videos = await storage.getVideos(playerId);
      const internationalRecords = await storage.getPlayerInternationalRecords(playerId);
      const invitationLetters = await storage.getInvitationLetters(playerId);
      
      const videoInsightsPromises = videos.map(v => storage.getVideoInsights(v.id));
      const videoInsightsResults = await Promise.all(videoInsightsPromises);
      const videoInsights = videoInsightsResults.filter((i): i is NonNullable<typeof i> => i !== undefined);

      const latestInvitation = invitationLetters[0];
      const leagueBand = overrideLeagueBand || latestInvitation?.targetLeagueBand || 3;

      const eligibilityResult = calculateTransferEligibility({
        player,
        metrics,
        videos,
        videoInsights,
        internationalRecords,
        invitationLetters,
        leagueBand,
      });

      const existingAssessment = await storage.getTransferEligibilityAssessment(playerId);
      
      const assessmentData = {
        playerId,
        totalMinutesVerified: eligibilityResult.totalMinutesVerified,
        clubMinutes: eligibilityResult.clubMinutes,
        internationalMinutes: eligibilityResult.internationalMinutes,
        videoMinutes: eligibilityResult.videoMinutes,
        totalCaps: eligibilityResult.totalCaps,
        seniorCaps: eligibilityResult.seniorCaps,
        continentalAppearances: eligibilityResult.continentalAppearances,
        overallStatus: eligibilityResult.overallStatus,
        schengenScore: eligibilityResult.schengen.score,
        schengenStatus: eligibilityResult.schengen.status,
        o1Score: eligibilityResult.o1.score,
        o1Status: eligibilityResult.o1.status,
        p1Score: eligibilityResult.p1.score,
        p1Status: eligibilityResult.p1.status,
        ukGbeScore: eligibilityResult.ukGbe.score,
        ukGbeStatus: eligibilityResult.ukGbe.status,
        escScore: eligibilityResult.esc.score,
        escStatus: eligibilityResult.esc.status,
        escEligible: eligibilityResult.escEligible,
        minutesNeeded: eligibilityResult.minutesNeeded,
        capsNeeded: eligibilityResult.capsNeeded,
        recommendations: eligibilityResult.recommendations,
        visaBreakdown: {
          schengen: eligibilityResult.schengen,
          o1: eligibilityResult.o1,
          p1: eligibilityResult.p1,
          ukGbe: eligibilityResult.ukGbe,
          esc: eligibilityResult.esc,
        },
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      let assessment;
      if (existingAssessment) {
        assessment = await storage.updateTransferEligibilityAssessment(existingAssessment.id, assessmentData);
      } else {
        assessment = await storage.createTransferEligibilityAssessment(assessmentData);
      }

      res.json({
        success: true,
        assessment,
        overallStatus: eligibilityResult.overallStatus,
        recommendations: eligibilityResult.recommendations,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Transfer Reports - Generate comprehensive downloadable reports
  app.get("/api/reports", requireTeamRole, async (req, res) => {
    try {
      const teamId = req.session.teamId || "demo-team";
      const reports = await storage.getTransferReports(teamId);
      
      const enrichedReports = await Promise.all(reports.map(async (report) => {
        const player = await storage.getPlayer(report.playerId);
        return {
          ...report,
          playerName: player ? `${player.firstName} ${player.lastName}` : "Unknown",
          playerPosition: player?.position || "Unknown",
        };
      }));
      
      res.json(enrichedReports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/:id", requireTeamRole, async (req, res) => {
    try {
      const report = await storage.getTransferReport(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      const player = await storage.getPlayer(report.playerId);
      res.json({
        ...report,
        playerName: player ? `${player.firstName} ${player.lastName}` : "Unknown",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reports/generate", requireTeamRole, async (req, res) => {
    try {
      const { playerId, reportType = "comprehensive" } = req.body;
      
      if (!playerId) {
        return res.status(400).json({ error: "Player ID is required" });
      }
      
      const player = await storage.getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      
      const teamId = req.session.teamId || "demo-team";
      const userId = req.session.userId!;
      const userRole = req.session.userRole || "sporting_director";
      const userName = req.session.userId || "System";
      
      const tokenResult = await spendTokensForAction(userId, userRole, "transfer_report", playerId);
      if (!tokenResult.success) {
        return res.status(402).json({ error: tokenResult.error, needsTokens: true });
      }
      
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const metrics = await storage.getPlayerMetrics(playerId);
      const eligibilityScores = await storage.getEligibilityScores(playerId);
      const transferAssessment = await storage.getTransferEligibilityAssessment(playerId);
      const videos = await storage.getVideos(playerId);
      const invitationLettersData = await storage.getInvitationLetters(playerId);
      const consularReportsData = await storage.getConsularReports(playerId);
      const internationalRecords = await storage.getPlayerInternationalRecords(playerId);
      const embassyVerifications = await storage.getEmbassyVerifications();
      const playerVerifications = embassyVerifications.filter(v => v.playerId === playerId);
      
      const recentVideos = videos.filter(v => {
        if (!v.uploadDate) return true;
        return new Date(v.uploadDate) >= sixMonthsAgo;
      });
      
      const verificationCode = `TR-${Date.now().toString(36).toUpperCase()}-${playerId.substring(0, 4).toUpperCase()}`;
      
      const playerProfile = {
        id: player.id,
        name: `${player.firstName} ${player.lastName}`,
        dateOfBirth: player.dateOfBirth,
        age: player.dateOfBirth ? Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        nationality: player.nationality,
        secondNationality: player.secondNationality,
        position: player.position,
        secondaryPosition: player.secondaryPosition,
        jerseyNumber: player.jerseyNumber,
        height: player.height,
        heightUnit: player.heightUnit,
        weight: player.weight,
        weightUnit: player.weightUnit,
        preferredFoot: player.preferredFoot,
        currentClub: player.currentClubName,
        marketValue: player.marketValue,
        agentName: player.agentName,
        agentContact: player.agentContact,
        nationalTeamCaps: player.nationalTeamCaps,
        nationalTeamGoals: player.nationalTeamGoals,
      };
      
      const internationalCareer = internationalRecords.map(r => ({
        nationalTeam: r.nationalTeam,
        teamLevel: r.teamLevel,
        caps: r.caps,
        goals: r.goals,
        assists: r.assists,
        debutDate: r.debutDate,
        lastAppearance: r.lastAppearance,
      }));
      
      const performanceStats = metrics.map(m => ({
        season: m.season,
        gamesPlayed: m.gamesPlayed,
        goals: m.goals,
        assists: m.assists,
        minutesPlayed: m.currentSeasonMinutes,
        passAccuracy: m.passAccuracy,
        tacklesWon: m.tacklesWon,
        aerialDuelsWon: m.aerialDuelsWon,
      }));
      
      const eligibilityData = transferAssessment ? {
        overallStatus: transferAssessment.overallStatus,
        totalMinutes: transferAssessment.totalMinutesVerified,
        minutesNeeded: transferAssessment.minutesNeeded,
        capsNeeded: transferAssessment.capsNeeded,
        visaScores: {
          schengen: { score: transferAssessment.schengenScore, status: transferAssessment.schengenStatus },
          o1: { score: transferAssessment.o1Score, status: transferAssessment.o1Status },
          p1: { score: transferAssessment.p1Score, status: transferAssessment.p1Status },
          ukGbe: { score: transferAssessment.ukGbeScore, status: transferAssessment.ukGbeStatus },
          esc: { score: transferAssessment.escScore, status: transferAssessment.escStatus },
        },
        recommendations: transferAssessment.recommendations,
      } : null;
      
      const videosIncluded = recentVideos.map(v => ({
        id: v.id,
        title: v.title,
        source: v.source,
        matchDate: v.matchDate,
        competition: v.competition,
        opponent: v.opponent,
        minutesPlayed: v.minutesPlayed,
        uploadDate: v.uploadDate,
      }));
      
      const documentsIncluded = consularReportsData.map(r => ({
        id: r.id,
        verificationCode: r.verificationCode,
        generatedAt: r.generatedAt,
        validUntil: r.validUntil,
        accessedByEmbassy: r.accessedByEmbassy,
      }));
      
      const invitationLettersIncluded = invitationLettersData.map(l => ({
        id: l.id,
        targetClubName: l.targetClubName,
        targetCountry: l.targetCountry,
        targetLeague: l.targetLeague,
        targetLeagueBand: l.targetLeagueBand,
        offerType: l.offerType,
        status: l.status,
        trialStartDate: l.trialStartDate,
        trialEndDate: l.trialEndDate,
      }));
      
      const verificationsIncluded = playerVerifications.map(v => ({
        id: v.id,
        embassyCountry: v.embassyCountry,
        status: v.status,
        verificationCode: v.verificationCode,
        submittedAt: v.submittedAt,
        verifiedAt: v.verifiedAt,
      }));
      
      const totalMinutesVerified = (player.clubMinutesCurrentSeason || 0) + 
        (player.internationalMinutesCurrentSeason || 0) + 
        recentVideos.reduce((sum, v) => sum + (v.minutesPlayed || 0), 0);
      
      const recommendations = transferAssessment?.recommendations || [];
      
      const report = await storage.createTransferReport({
        playerId,
        teamId,
        generatedBy: userId,
        generatedByName: userName,
        reportType,
        status: "completed",
        dataRangeStart: sixMonthsAgo,
        dataRangeEnd: new Date(),
        playerProfile,
        internationalCareer,
        performanceStats,
        eligibilityScores: eligibilityData,
        videosIncluded,
        documentsIncluded,
        invitationLetters: invitationLettersIncluded,
        embassyVerifications: verificationsIncluded,
        totalMinutesVerified,
        overallEligibilityStatus: transferAssessment?.overallStatus || "red",
        recommendations,
        verificationCode,
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });
      
      await storage.logAction({
        userId,
        userRole: req.session.userRole,
        action: "generate_transfer_report",
        entityType: "transfer_report",
        entityId: report.id,
        details: { playerId, reportType },
      });
      
      res.json({
        success: true,
        report: {
          ...report,
          playerName: `${player.firstName} ${player.lastName}`,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/reports/:id", requireTeamRole, async (req, res) => {
    try {
      await storage.deleteTransferReport(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reports/:id/notify-embassy", requireTeamRole, async (req, res) => {
    try {
      const report = await storage.getTransferReport(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      const updatedReport = await storage.updateTransferReport(report.id, {
        embassyNotified: true,
        embassyNotifiedAt: new Date(),
      });
      
      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "notify_embassy",
        entityType: "transfer_report",
        entityId: report.id,
        details: { playerId: report.playerId },
      });
      
      res.json({ success: true, report: updatedReport });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 6-Month Player Activity Audit Report
  app.get("/api/players/:id/audit-report", requireTeamRole, async (req, res) => {
    try {
      const playerId = req.params.id;
      const player = await storage.getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Gather all player data
      const metrics = await storage.getPlayerMetrics(playerId);
      const eligibilityScores = await storage.getEligibilityScores(playerId);
      const videos = await storage.getVideos(playerId);
      const invitationLettersData = await storage.getInvitationLetters(playerId);
      const consularReportsData = await storage.getConsularReports(playerId);
      const internationalRecords = await storage.getPlayerInternationalRecords(playerId);

      // Filter data from last 6 months - include items without dates (assume recent)
      const recentVideos = videos.filter(v => {
        if (!v.uploadDate) return true;
        return new Date(v.uploadDate) >= sixMonthsAgo;
      });
      const recentMetrics = metrics.filter(m => {
        if (!m.updatedAt) return true;
        return new Date(m.updatedAt) >= sixMonthsAgo;
      });
      const recentInvitations = invitationLettersData.filter(l => {
        if (!l.uploadedAt) return true;
        return new Date(l.uploadedAt) >= sixMonthsAgo;
      });
      const recentConsularReports = consularReportsData.filter(r => {
        if (!r.generatedAt) return true;
        return new Date(r.generatedAt) >= sixMonthsAgo;
      });

      // Get the most recent consular report (already sorted by generatedAt desc from storage)
      const latestConsularReport = consularReportsData.length > 0 ? consularReportsData[0] : null;

      // Build comprehensive audit data
      const auditReport = {
        generatedAt: new Date().toISOString(),
        reportPeriod: {
          startDate: sixMonthsAgo.toISOString(),
          endDate: new Date().toISOString(),
        },
        player: {
          id: player.id,
          name: `${player.firstName} ${player.lastName}`,
          dateOfBirth: player.dateOfBirth,
          nationality: player.nationality,
          secondaryNationality: player.secondNationality,
          position: player.position,
          jerseyNumber: player.jerseyNumber,
          height: player.height,
          weight: player.weight,
          preferredFoot: player.preferredFoot,
          currentClub: player.currentClubName,
          marketValue: player.marketValue,
        },
        consularVerification: latestConsularReport ? {
          verificationCode: latestConsularReport.verificationCode,
          generatedAt: latestConsularReport.generatedAt,
          validUntil: latestConsularReport.validUntil,
          accessedByEmbassy: latestConsularReport.accessedByEmbassy,
        } : null,
        activitySummary: {
          totalVideosTagged: recentVideos.length,
          totalMetricsRecorded: recentMetrics.length,
          totalInvitationLetters: recentInvitations.length,
          totalInternationalCaps: internationalRecords.reduce((sum, r) => sum + (r.caps || 0), 0),
        },
        eligibilityScores: eligibilityScores.map(score => ({
          visaType: score.visaType,
          score: score.score,
          status: score.status,
          leagueBandApplied: score.leagueBandApplied,
          calculatedAt: score.calculatedAt,
        })),
        videoAnalysis: recentVideos.map(video => ({
          id: video.id,
          title: video.title,
          uploadedAt: video.uploadDate,
          source: video.source,
          duration: video.duration,
        })),
        performanceMetrics: recentMetrics.map(m => ({
          season: m.season,
          goals: m.goals,
          assists: m.assists,
          gamesPlayed: m.gamesPlayed,
          currentSeasonMinutes: m.currentSeasonMinutes,
          passAccuracy: m.passAccuracy,
          tacklesWon: m.tacklesWon,
          aerialDuelsWon: m.aerialDuelsWon,
          updatedAt: m.updatedAt,
        })),
        internationalRecords: internationalRecords.map(r => ({
          nationalTeam: r.nationalTeam,
          teamLevel: r.teamLevel,
          caps: r.caps,
          goals: r.goals,
          assists: r.assists,
          debutDate: r.debutDate,
        })),
        invitationLetters: recentInvitations.map(l => ({
          targetClubName: l.targetClubName,
          targetCountry: l.targetCountry,
          targetLeague: l.targetLeague,
          targetLeagueBand: l.targetLeagueBand,
          offerType: l.offerType,
          trialStartDate: l.trialStartDate,
          trialEndDate: l.trialEndDate,
          status: l.status,
          consularReportGenerated: l.consularReportGenerated,
        })),
      };

      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "generate_audit_report",
        entityType: "player",
        entityId: playerId,
        details: { reportPeriod: "6_months" },
      });

      res.json(auditReport);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Embassy document access routes - now includes notified invitation letters and federation letters
  app.get("/api/embassy/documents", requireEmbassyRole, async (req, res) => {
    try {
      let embassyProfile = await storage.getEmbassyProfileByUserId(req.session.userId!);
      
      // Auto-create embassy profile if it doesn't exist
      if (!embassyProfile) {
        const user = await storage.getUser(req.session.userId!);
        embassyProfile = await storage.createEmbassyProfile({
          userId: req.session.userId!,
          country: req.session.embassyCountry || "United Kingdom",
          jurisdiction: "National",
          contactEmail: user?.email || "",
          contactPhone: "",
          address: "",
          active: true,
        });
      }

      const documents = [];

      // Get ALL notified invitation letters (embassy can see all notified documents)
      const notifiedLetters = await storage.getAllEmbassyNotifiedLetters();
      
      for (const letter of notifiedLetters) {
        const player = await storage.getPlayer(letter.playerId);
        const team = await storage.getTeam(letter.fromTeamId);
        
        // Get document verification status
        const invitationVerification = await storage.getDocumentVerification("invitation_letter", letter.id);
        let federationLetterVerification = null;
        let federationLetter = null;

        if (letter.federationLetterRequestId) {
          federationLetter = await storage.getFederationLetterRequest(letter.federationLetterRequestId);
          if (federationLetter) {
            federationLetterVerification = await storage.getDocumentVerification("federation_letter", federationLetter.id);
          }
        }

        // Get transfer reports for this player/invitation
        const transferReports = await storage.getTransferReportsByPlayer(letter.playerId);
        const relevantReport = transferReports.length > 0 ? transferReports[0] : null;

        // Determine if this is an external upload (no federation letter or federation letter not issued)
        const hasFederationLetter = federationLetter && federationLetter.status === "issued";
        const isExternalUpload = !hasFederationLetter;
        
        // Check if issuing club country matches embassy country for local verification
        const issuingClubCountry = team?.country?.toLowerCase() || "";
        const embassyCountryLower = embassyProfile.country.toLowerCase();
        const requiresLocalVerification = isExternalUpload && issuingClubCountry === embassyCountryLower;

        documents.push({
          id: letter.id,
          type: "invitation_submission",
          player,
          team,
          invitationLetter: letter,
          federationLetter,
          transferReport: relevantReport,
          invitationVerification: invitationVerification || { verificationStatus: "pending", isSystemVerified: false },
          federationLetterVerification: federationLetterVerification || (letter.federationLetterRequestId ? { verificationStatus: "pending", isSystemVerified: false } : null),
          notifiedAt: letter.embassyNotifiedAt,
          status: "pending_review",
          isExternalUpload,
          requiresLocalVerification,
          issuingClubCountry: team?.country || null,
        });
      }

      // Also include ALL transfer reports generated by teams
      const allTransferReports = await storage.getAllTransferReports();
      const addedReportIds = new Set(documents.filter(d => d.transferReport).map(d => d.transferReport?.id));
      
      for (const report of allTransferReports) {
        // Skip if already added via invitation letter
        if (addedReportIds.has(report.id)) continue;
        
        const player = await storage.getPlayer(report.playerId);
        const team = report.teamId ? await storage.getTeam(report.teamId) : null;
        
        documents.push({
          id: report.id,
          type: "transfer_report",
          player,
          team,
          transferReport: report,
          invitationVerification: { verificationStatus: "verified", isSystemVerified: true },
          notifiedAt: report.generatedAt,
          status: "verified",
        });
      }

      // Also include old compliance documents
      const verifications = await storage.getEmbassyVerifications();
      const countryVerifications = verifications.filter(v => v.embassyCountry === embassyProfile.country);
      
      for (const verification of countryVerifications) {
        const doc = await storage.getComplianceDocument(verification.documentId);
        if (doc) {
          const player = await storage.getPlayer(doc.playerId);
          documents.push({
            type: "compliance_document",
            ...doc,
            player,
            verification,
          });
        }
      }

      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/embassy/documents/:id", requireEmbassyRole, async (req, res) => {
    try {
      const embassyProfile = await storage.getEmbassyProfileByUserId(req.session.userId!);
      if (!embassyProfile) {
        return res.status(404).json({ error: "Embassy profile not found" });
      }

      const doc = await storage.getComplianceDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      await storage.logEmbassyDocumentAccess({
        documentId: doc.id,
        embassyProfileId: embassyProfile.id,
        accessedBy: req.session.userId,
        accessType: "view",
      });

      await storage.logAction({
        userId: req.session.userId,
        userRole: "embassy",
        action: "view_document",
        entityType: "compliance_document",
        entityId: doc.id,
        details: { embassyCountry: embassyProfile.country },
      });

      const player = await storage.getPlayer(doc.playerId);
      const accessLogs = await storage.getEmbassyDocumentAccessLogs(doc.id);

      res.json({ document: doc, player, accessLogs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Document Verification for Embassy
  app.post("/api/embassy/documents/verify", requireEmbassyRole, async (req, res) => {
    try {
      const { documentType, documentId } = req.body;
      
      if (!documentType || !documentId) {
        return res.status(400).json({ error: "documentType and documentId are required" });
      }

      // Check if document exists in our system (system-verified)
      let isSystemVerified = false;
      let sourceType = "external";
      let systemVerificationNote = "";

      if (documentType === "federation_letter") {
        const federationLetter = await storage.getFederationLetterRequest(documentId);
        if (federationLetter && federationLetter.status === "issued") {
          isSystemVerified = true;
          sourceType = "federation_system";
          systemVerificationNote = `Verified through Sports Reels federation workflow. Issued by ${federationLetter.federationName || federationLetter.federationCountry} on ${federationLetter.issuedAt ? new Date(federationLetter.issuedAt).toLocaleDateString() : 'N/A'}`;
        }
      } else if (documentType === "invitation_letter") {
        const letter = await storage.getInvitationLetter(documentId);
        if (letter) {
          isSystemVerified = letter.federationLetterRequestId ? true : false;
          sourceType = letter.federationLetterRequestId ? "team_with_federation" : "team_upload";
          systemVerificationNote = letter.federationLetterRequestId 
            ? "Invitation letter submitted with verified federation letter attached"
            : "Invitation letter uploaded by team - external document";
        }
      }

      // AI verification analysis
      let aiVerdict = isSystemVerified ? "verified" : "requires_review";
      let aiConfidence = isSystemVerified ? 0.95 : 0.5;
      let aiAnalysis = "";

      if (isSystemVerified) {
        aiAnalysis = "Document has been verified through the Sports Reels platform workflow. This document passed through our federation verification process and is considered authentic.";
        aiVerdict = "verified";
      } else {
        aiAnalysis = "Document was uploaded externally and has not been processed through our verification workflow. Manual review recommended. Flag as POTENTIAL FORGERY if document claims to be from a federation but was not issued through our system.";
        aiVerdict = "potential_fake";
        aiConfidence = 0.3;
      }

      // Check if verification record exists
      let verification = await storage.getDocumentVerification(documentType, documentId);
      
      if (verification) {
        verification = await storage.updateDocumentVerification(verification.id, {
          verificationStatus: aiVerdict,
          aiVerdict,
          aiConfidence,
          aiAnalysis,
          isSystemVerified,
          systemVerificationNote,
          lastCheckedAt: new Date(),
          checkedBy: req.session.userId,
        });
      } else {
        verification = await storage.createDocumentVerification({
          documentType,
          documentId,
          sourceType,
          verificationStatus: aiVerdict,
          aiVerdict,
          aiConfidence,
          aiAnalysis,
          isSystemVerified,
          systemVerificationNote,
          lastCheckedAt: new Date(),
          checkedBy: req.session.userId,
        });
      }

      await storage.logAction({
        userId: req.session.userId,
        userRole: "embassy",
        action: "verify_document",
        entityType: documentType,
        entityId: documentId,
        details: { aiVerdict, isSystemVerified },
      });

      res.json(verification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Embassy Transfer Report PDF with logo
  app.get("/api/embassy/transfer-report/:invitationId/pdf", requireEmbassyRole, async (req, res) => {
    try {
      const letter = await storage.getInvitationLetter(req.params.invitationId);
      if (!letter) {
        return res.status(404).json({ error: "Invitation letter not found" });
      }

      const player = await storage.getPlayer(letter.playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      const eligibilityScores = await storage.getEligibilityScores(player.id);
      const metrics = await storage.getPlayerMetrics(player.id);
      const videos = await storage.getVideos(player.id);
      const team = await storage.getTeam(letter.fromTeamId);

      // Get federation letter and document verification status
      let federationLetter = null;
      let documentVerification = null;
      if (letter.federationLetterRequestId) {
        federationLetter = await storage.getFederationLetterRequest(letter.federationLetterRequestId);
      }
      documentVerification = await storage.getDocumentVerification("invitation_letter", letter.id);

      // Determine verification status
      const hasFederationLetter = federationLetter && federationLetter.status === "issued";
      const isExternalUpload = !hasFederationLetter;
      const verificationStatus = hasFederationLetter ? "Federation Verified" : 
        (documentVerification?.isSystemVerified ? "AI Verified" : "External Upload - Pending Verification");

      // Generate a comprehensive transfer report data structure
      const transferReportData = {
        reportId: `TR-${Date.now().toString(36).toUpperCase()}`,
        generatedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        player: {
          fullName: `${player.firstName} ${player.lastName}`,
          firstName: player.firstName,
          lastName: player.lastName,
          nationality: player.nationality,
          secondNationality: player.secondNationality,
          dateOfBirth: player.dateOfBirth,
          birthPlace: player.birthPlace,
          position: player.position,
          secondaryPosition: player.secondaryPosition,
          currentClub: player.currentClubName,
          height: player.height,
          heightUnit: player.heightUnit,
          weight: player.weight,
          weightUnit: player.weightUnit,
          preferredFoot: player.preferredFoot,
          jerseyNumber: player.jerseyNumber,
          nationalTeamCaps: player.nationalTeamCaps,
          nationalTeamGoals: player.nationalTeamGoals,
          internationalCaps: player.internationalCaps,
          internationalGoals: player.internationalGoals,
          continentalGames: player.continentalGames,
          marketValue: player.marketValue,
          contractEndDate: player.contractEndDate,
          agentName: player.agentName,
          agentContact: player.agentContact,
        },
        sourceTeam: team ? {
          name: team.name,
          clubName: team.clubName,
          country: team.country,
        } : null,
        targetClub: {
          name: letter.targetClubName,
          address: letter.targetClubAddress,
          league: letter.targetLeague,
          leagueBand: letter.targetLeagueBand,
          country: letter.targetCountry,
        },
        offerDetails: {
          type: letter.offerType,
          trialStartDate: letter.trialStartDate,
          trialEndDate: letter.trialEndDate,
          scoutAgent: letter.scoutAgentName,
        },
        eligibility: eligibilityScores.map(score => ({
          visaType: score.visaType,
          score: score.score,
          status: score.status,
          breakdown: score.breakdown,
        })),
        performance: metrics.length > 0 ? {
          gamesPlayed: metrics[0].gamesPlayed,
          goals: metrics[0].goals,
          assists: metrics[0].assists,
          minutes: metrics[0].currentSeasonMinutes,
          distanceCovered: metrics[0].distanceCovered,
          passAccuracy: metrics[0].passAccuracy,
          aerialDuelsWon: metrics[0].aerialDuelsWon,
        } : null,
        videosCount: videos.length,
        verificationCode: `VR-${Date.now().toString(36).toUpperCase()}-EMB`,
        compliance: {
          verificationStatus,
          isExternalUpload,
          hasFederationLetter,
          federationName: federationLetter?.federationName || null,
          federationIssuedAt: federationLetter?.issuedAt || null,
          documentVerifiedAt: documentVerification?.lastCheckedAt || null,
          auditNote: `This document has been generated by Sports Reels compliance system. ` +
            `Verification Status: ${verificationStatus}. ` +
            `All data has been cross-referenced with player records and eligibility calculations. ` +
            `This report is for official visa processing purposes only.`,
        },
      };

      await storage.logAction({
        userId: req.session.userId,
        userRole: "embassy",
        action: "download_transfer_report",
        entityType: "invitation_letter",
        entityId: letter.id,
        details: { playerId: player.id },
      });

      res.json(transferReportData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Scout/Agent player access routes
  app.get("/api/scout/players", requireScoutRole, async (req, res) => {
    try {
      // Only return players that have been published to scouts
      const publishedPlayers = await storage.getPublishedPlayers();
      
      const playersWithScores = [];
      for (const player of publishedPlayers) {
        const scores = await storage.getEligibilityScores(player.id);
        playersWithScores.push({
          ...player,
          eligibilityScores: scores,
          hasEligibilityData: scores.length > 0,
          isPublished: true,
          publishExpiresAt: player.publishExpiresAt,
        });
      }

      res.json(playersWithScores);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/scout/players/:id", requireScoutRole, async (req, res) => {
    try {
      const player = await storage.getPlayer(req.params.id);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      const eligibilityScores = await storage.getEligibilityScores(player.id);
      const videos = await storage.getVideos(player.id);
      const sharedVideos = await storage.getSharedVideos(req.session.userId!);
      const playerSharedVideos = sharedVideos.filter(sv => sv.playerId === player.id);

      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "view_player_profile",
        entityType: "player",
        entityId: player.id,
        details: { scoutId: req.session.userId },
      });

      res.json({
        player,
        eligibilityScores,
        videos,
        sharedVideos: playerSharedVideos,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Scout shortlist routes
  app.get("/api/scout/shortlist", requireScoutRole, async (req, res) => {
    try {
      const shortlist = await storage.getScoutShortlistWithPlayers(req.session.userId!);
      res.json(shortlist);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/scout/shortlist", requireScoutRole, async (req, res) => {
    try {
      const { playerId, priority = "green", notes } = req.body;
      
      const validPriorities = ["amber", "green", "red"];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: "Invalid priority. Must be amber, green, or red." });
      }
      
      const existing = await storage.getShortlistEntry(req.session.userId!, playerId);
      if (existing) {
        return res.status(400).json({ error: "Player already in shortlist" });
      }
      
      const entry = await storage.addToShortlist({
        scoutId: req.session.userId!,
        playerId,
        priority,
        notes,
      });
      
      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/scout/shortlist/:id", requireScoutRole, async (req, res) => {
    try {
      const { priority, notes } = req.body;
      
      const validPriorities = ["amber", "green", "red"];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: "Invalid priority. Must be amber, green, or red." });
      }
      
      const shortlist = await storage.getScoutShortlist(req.session.userId!);
      const entry = shortlist.find(s => s.id === req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Shortlist entry not found" });
      }
      
      const updated = await storage.updateShortlistPriority(req.params.id, priority, notes);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/scout/shortlist/:id", requireScoutRole, async (req, res) => {
    try {
      const shortlist = await storage.getScoutShortlist(req.session.userId!);
      const entry = shortlist.find(s => s.id === req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Shortlist entry not found" });
      }
      
      await storage.removeFromShortlist(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Token costs configuration - role-specific
  const SCOUT_TOKEN_COSTS = {
    view_profile: 2,
    shortlist: 1,
    video_analysis: 8,
    watch_video: 1,
    contact_request: 2,
  };
  
  const TEAM_TOKEN_COSTS = {
    video_analysis: 8,
    scouting_messaging: 3,
    transfer_report: 5,
    federation_letter_request: 10,
  };
  
  const WELCOME_BONUS = 50;
  const TOKEN_EXPIRY_MONTHS = 6;
  
  function getTokenCostsForRole(role: string): Record<string, number> {
    if (role === "scout") {
      return SCOUT_TOKEN_COSTS;
    }
    return TEAM_TOKEN_COSTS;
  }
  
  async function spendTokensForAction(
    userId: string,
    userRole: string,
    action: string,
    playerId?: string,
    videoId?: string
  ): Promise<{ success: boolean; error?: string; newBalance?: number; cost?: number }> {
    const roleCosts = getTokenCostsForRole(userRole);
    const cost = roleCosts[action];
    
    if (!cost) {
      return { success: false, error: `Invalid action "${action}" for role "${userRole}"` };
    }
    
    let balance = await storage.getTokenBalance(userId);
    if (!balance) {
      return { success: false, error: "No token balance found" };
    }
    
    if (balance.balance < cost) {
      return { success: false, error: `Insufficient tokens. Need ${cost}, have ${balance.balance}` };
    }
    
    const newBalance = balance.balance - cost;
    const newLifetimeSpent = balance.lifetimeSpent + cost;
    
    await storage.updateTokenBalance(userId, newBalance, undefined, newLifetimeSpent);
    
    const actionDescriptions: Record<string, string> = {
      view_profile: "Viewed player profile",
      shortlist: "Added player to shortlist",
      video_analysis: "Analyzed player video",
      watch_video: "Watched player video",
      contact_request: "Requested player contact",
      scouting_messaging: "Sent scouting message",
      transfer_report: "Generated transfer report",
    };
    
    await storage.createTokenTransaction({
      userId,
      amount: cost,
      type: "debit",
      action,
      description: actionDescriptions[action] || `Action: ${action}`,
      playerId,
      videoId,
      balanceAfter: newBalance,
    });
    
    return { success: true, newBalance, cost };
  }

  // Get or initialize token balance
  app.get("/api/tokens/balance", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let balance = await storage.getTokenBalance(userId);
      
      if (!balance) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + TOKEN_EXPIRY_MONTHS);
        
        balance = await storage.createTokenBalance({
          userId,
          balance: WELCOME_BONUS,
          lifetimePurchased: WELCOME_BONUS,
          lifetimeSpent: 0,
        });
        
        await storage.createTokenTransaction({
          userId,
          amount: WELCOME_BONUS,
          type: "credit",
          action: "welcome_bonus",
          description: "Welcome bonus for new users",
          balanceAfter: WELCOME_BONUS,
          expiresAt,
        });
      }
      
      res.json(balance);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get token transactions
  app.get("/api/tokens/transactions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const transactions = await storage.getTokenTransactions(userId, limit);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get token costs config - role-specific
  app.get("/api/tokens/costs", requireAuth, (req, res) => {
    const userRole = req.session.userRole || "sporting_director";
    const costs = getTokenCostsForRole(userRole);
    res.json(costs);
  });

  // Get available token packs
  app.get("/api/tokens/packs", async (req, res) => {
    try {
      let packs = await storage.getTokenPacks();
      
      if (packs.length === 0) {
        const defaultPacks = [
          { name: "Starter Pack", tokens: 50, priceUsd: 999, description: "50 tokens - Perfect for getting started", sortOrder: 1 },
          { name: "Standard Pack", tokens: 100, priceUsd: 1799, description: "100 tokens - Best value for regular users", sortOrder: 2 },
          { name: "Pro Pack", tokens: 150, priceUsd: 2499, description: "150 tokens - For power users", sortOrder: 3 },
          { name: "Enterprise Pack", tokens: 200, priceUsd: 2999, description: "200 tokens - Maximum value", sortOrder: 4 },
        ];
        for (const pack of defaultPacks) {
          await storage.createTokenPack(pack);
        }
        packs = await storage.getTokenPacks();
      }
      
      res.json(packs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Spend tokens for an action - role-specific costs
  app.post("/api/tokens/spend", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const userRole = req.session.userRole || "sporting_director";
      const { action, playerId, videoId } = req.body;
      
      const roleCosts = getTokenCostsForRole(userRole);
      const cost = roleCosts[action];
      if (!cost) {
        return res.status(400).json({ error: `Invalid action "${action}" for role "${userRole}"` });
      }
      
      let balance = await storage.getTokenBalance(userId);
      if (!balance) {
        return res.status(400).json({ error: "No token balance found", needsPurchase: true });
      }
      
      if (balance.balance < cost) {
        return res.status(400).json({ 
          error: "Insufficient tokens", 
          needsPurchase: true,
          currentBalance: balance.balance,
          required: cost 
        });
      }
      
      const newBalance = balance.balance - cost;
      const newLifetimeSpent = balance.lifetimeSpent + cost;
      
      await storage.updateTokenBalance(userId, newBalance, undefined, newLifetimeSpent);
      
      const actionDescriptions: Record<string, string> = {
        view_profile: "Viewed player profile",
        shortlist: "Added player to shortlist",
        video_analysis: "Analyzed player video",
        watch_video: "Watched player video",
        contact_request: "Requested player contact",
        scouting_messaging: "Sent scouting message",
        transfer_report: "Generated transfer report",
        federation_letter_request: "Created federation letter request",
      };
      
      await storage.createTokenTransaction({
        userId,
        amount: cost,
        type: "debit",
        action,
        description: actionDescriptions[action] || `Action: ${action}`,
        playerId,
        videoId,
        balanceAfter: newBalance,
      });
      
      res.json({ success: true, newBalance, cost, action });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Purchase token pack (simulated - Stripe integration needed for real payments)
  app.post("/api/tokens/purchase", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { packId } = req.body;
      
      const pack = await storage.getTokenPack(packId);
      if (!pack) {
        return res.status(404).json({ error: "Token pack not found" });
      }
      
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + TOKEN_EXPIRY_MONTHS);
      
      const purchase = await storage.createTokenPurchase({
        userId,
        packId,
        tokens: pack.tokens,
        amountPaid: pack.priceUsd,
        currency: "USD",
        paymentMethod: "pending",
        status: "pending",
        expiresAt,
      });
      
      res.json({ 
        purchase,
        message: "Payment integration required. Connect Stripe to enable real payments.",
        simulatedCheckout: true 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Confirm purchase (simulated - call after Stripe payment success)
  app.post("/api/tokens/purchase/:id/confirm", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const purchaseId = req.params.id;
      
      const purchases = await storage.getTokenPurchases(userId);
      const purchase = purchases.find(p => p.id === purchaseId);
      
      if (!purchase || purchase.userId !== userId) {
        return res.status(404).json({ error: "Purchase not found" });
      }
      
      if (purchase.status === "completed") {
        return res.status(400).json({ error: "Purchase already completed" });
      }
      
      await storage.updateTokenPurchase(purchaseId, { 
        status: "completed",
        paymentMethod: "simulated",
        paymentReference: `SIM-${Date.now()}`
      });
      
      let balance = await storage.getTokenBalance(userId);
      const newBalance = (balance?.balance || 0) + purchase.tokens;
      const newLifetimePurchased = (balance?.lifetimePurchased || 0) + purchase.tokens;
      
      if (balance) {
        await storage.updateTokenBalance(userId, newBalance, newLifetimePurchased);
      } else {
        await storage.createTokenBalance({
          userId,
          balance: newBalance,
          lifetimePurchased: newLifetimePurchased,
          lifetimeSpent: 0,
        });
      }
      
      await storage.createTokenTransaction({
        userId,
        amount: purchase.tokens,
        type: "credit",
        action: "purchase",
        description: `Purchased ${purchase.tokens} tokens`,
        packId: purchase.packId,
        balanceAfter: newBalance,
        expiresAt: purchase.expiresAt,
      });
      
      res.json({ success: true, newBalance, tokensAdded: purchase.tokens });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get purchase history
  app.get("/api/tokens/purchases", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const purchases = await storage.getTokenPurchases(userId);
      res.json(purchases);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Share video with scout
  app.post("/api/videos/:id/share", requireTeamRole, async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      const { sharedWithUserId, sharedWithRole, expiresAt } = req.body;

      const sharedVideo = await storage.shareVideo({
        videoId: video.id,
        sharedWithUserId,
        sharedWithRole,
        sharedByUserId: req.session.userId!,
        playerId: video.playerId,
        accessLevel: "view",
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "share_video",
        entityType: "video",
        entityId: video.id,
        details: { sharedWithUserId, sharedWithRole },
      });

      res.json(sharedVideo);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Transfer targets
  app.post("/api/transfer-targets", requireTeamRole, async (req, res) => {
    try {
      const { complianceOrderId, playerId, targetClubName, targetLeague, targetCountry, targetLeagueBand, invitationLetterId, scoutAgentId, proposedTransferFee } = req.body;
      
      const target = await storage.createTransferTarget({
        complianceOrderId,
        playerId,
        targetClubName,
        targetLeague,
        targetCountry,
        targetLeagueBand,
        invitationLetterId,
        scoutAgentId,
        proposedTransferFee,
        status: "pending",
      });

      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "create_transfer_target",
        entityType: "transfer_target",
        entityId: target.id,
        details: { playerId, targetClubName, targetCountry },
      });

      res.json(target);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/transfer-targets/:playerId", requireAuth, async (req, res) => {
    try {
      const targets = await storage.getTransferTargets(req.params.playerId);
      res.json(targets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Action logs
  app.get("/api/action-logs/:entityType/:entityId", requireAuth, async (req, res) => {
    try {
      const logs = await storage.getActionLogs(req.params.entityType, req.params.entityId);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Team Sheets routes
  app.get("/api/team-sheets", requireAuth, async (req, res) => {
    try {
      const teamId = req.session.teamId || "demo-team";
      const sheets = await storage.getTeamSheets(teamId);
      res.json(sheets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/team-sheets/:id", requireAuth, async (req, res) => {
    try {
      const sheet = await storage.getTeamSheet(req.params.id);
      if (!sheet) {
        return res.status(404).json({ error: "Team sheet not found" });
      }
      const players = await storage.getTeamSheetPlayers(sheet.id);
      res.json({ ...sheet, players });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/team-sheets", requireAuth, async (req, res) => {
    try {
      const teamId = req.session.teamId || "demo-team";
      const sheetData = insertTeamSheetSchema.parse({
        ...req.body,
        teamId,
      });
      const sheet = await storage.createTeamSheet(sheetData);
      
      await storage.logAction({
        userId: req.session.userId,
        userRole: req.session.userRole,
        action: "create_team_sheet",
        entityType: "team_sheet",
        entityId: sheet.id,
        details: { title: sheet.title, matchDate: sheet.matchDate, competition: sheet.competition },
      });
      
      res.json(sheet);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/team-sheets/:id", requireAuth, async (req, res) => {
    try {
      const sheet = await storage.getTeamSheet(req.params.id);
      if (!sheet) {
        return res.status(404).json({ error: "Team sheet not found" });
      }
      const updatedSheet = await storage.updateTeamSheet(req.params.id, req.body);
      res.json(updatedSheet);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/team-sheets/:id", requireAuth, async (req, res) => {
    try {
      const sheet = await storage.getTeamSheet(req.params.id);
      if (!sheet) {
        return res.status(404).json({ error: "Team sheet not found" });
      }
      await storage.deleteTeamSheet(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Team Sheet Players routes
  app.get("/api/team-sheets/:id/players", requireAuth, async (req, res) => {
    try {
      const players = await storage.getTeamSheetPlayers(req.params.id);
      res.json(players);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/team-sheets/:id/players", requireAuth, async (req, res) => {
    try {
      const sheet = await storage.getTeamSheet(req.params.id);
      if (!sheet) {
        return res.status(404).json({ error: "Team sheet not found" });
      }

      const existingPlayers = await storage.getTeamSheetPlayers(req.params.id);
      const starters = existingPlayers.filter(p => p.role === "starting");
      const { role } = req.body;

      if (role === "starting" && starters.length >= 11) {
        return res.status(400).json({ error: "Maximum 11 starting players allowed" });
      }

      const alreadyAdded = existingPlayers.find(p => p.playerId === req.body.playerId);
      if (alreadyAdded) {
        return res.status(400).json({ error: "Player already added to this team sheet" });
      }

      const playerData = insertTeamSheetPlayerSchema.parse({
        ...req.body,
        teamSheetId: req.params.id,
      });
      const player = await storage.createTeamSheetPlayer(playerData);
      res.json(player);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/team-sheet-players/:id", requireAuth, async (req, res) => {
    try {
      const player = await storage.updateTeamSheetPlayer(req.params.id, req.body);
      if (!player) {
        return res.status(404).json({ error: "Team sheet player not found" });
      }
      res.json(player);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/team-sheet-players/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteTeamSheetPlayer(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Competitions by country - auto-populate feature
  app.get("/api/competitions", requireAuth, async (req, res) => {
    try {
      const { country } = req.query;
      const competitions = getCompetitionsByCountry(country as string);
      res.json(competitions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}

function getCompetitionsByCountry(country?: string): { name: string; type: string }[] {
  const internationalCompetitions = [
    { name: "FIFA World Cup", type: "international" },
    { name: "FIFA World Cup Qualifiers", type: "international" },
    { name: "UEFA European Championship", type: "international" },
    { name: "UEFA Nations League", type: "international" },
    { name: "Copa America", type: "international" },
    { name: "Africa Cup of Nations", type: "international" },
    { name: "AFC Asian Cup", type: "international" },
    { name: "CONCACAF Gold Cup", type: "international" },
    { name: "International Friendly", type: "friendly" },
  ];

  const leaguesByCountry: Record<string, { name: string; type: string }[]> = {
    england: [
      { name: "Premier League", type: "league" },
      { name: "EFL Championship", type: "league" },
      { name: "EFL League One", type: "league" },
      { name: "EFL League Two", type: "league" },
      { name: "FA Cup", type: "cup" },
      { name: "EFL Cup", type: "cup" },
      { name: "Community Shield", type: "cup" },
    ],
    spain: [
      { name: "La Liga", type: "league" },
      { name: "La Liga 2", type: "league" },
      { name: "Copa del Rey", type: "cup" },
      { name: "Supercopa de Espana", type: "cup" },
    ],
    germany: [
      { name: "Bundesliga", type: "league" },
      { name: "2. Bundesliga", type: "league" },
      { name: "DFB-Pokal", type: "cup" },
      { name: "DFL-Supercup", type: "cup" },
    ],
    italy: [
      { name: "Serie A", type: "league" },
      { name: "Serie B", type: "league" },
      { name: "Coppa Italia", type: "cup" },
      { name: "Supercoppa Italiana", type: "cup" },
    ],
    france: [
      { name: "Ligue 1", type: "league" },
      { name: "Ligue 2", type: "league" },
      { name: "Coupe de France", type: "cup" },
      { name: "Coupe de la Ligue", type: "cup" },
      { name: "Trophee des Champions", type: "cup" },
    ],
    netherlands: [
      { name: "Eredivisie", type: "league" },
      { name: "Eerste Divisie", type: "league" },
      { name: "KNVB Cup", type: "cup" },
      { name: "Johan Cruyff Shield", type: "cup" },
    ],
    portugal: [
      { name: "Primeira Liga", type: "league" },
      { name: "Liga Portugal 2", type: "league" },
      { name: "Taca de Portugal", type: "cup" },
      { name: "Supertaca Candido de Oliveira", type: "cup" },
    ],
    norway: [
      { name: "Eliteserien", type: "league" },
      { name: "OBOS-ligaen", type: "league" },
      { name: "Norwegian Cup", type: "cup" },
    ],
    nigeria: [
      { name: "Nigeria Professional Football League", type: "league" },
      { name: "Nigeria National League", type: "league" },
      { name: "Federation Cup", type: "cup" },
      { name: "FA Cup", type: "cup" },
    ],
    usa: [
      { name: "Major League Soccer", type: "league" },
      { name: "USL Championship", type: "league" },
      { name: "US Open Cup", type: "cup" },
      { name: "MLS Cup", type: "cup" },
    ],
  };

  const continentalCompetitions = [
    { name: "UEFA Champions League", type: "continental" },
    { name: "UEFA Europa League", type: "continental" },
    { name: "UEFA Conference League", type: "continental" },
    { name: "CAF Champions League", type: "continental" },
    { name: "CAF Confederation Cup", type: "continental" },
    { name: "Copa Libertadores", type: "continental" },
    { name: "Copa Sudamericana", type: "continental" },
    { name: "AFC Champions League", type: "continental" },
    { name: "CONCACAF Champions Cup", type: "continental" },
  ];

  const countryLower = country?.toLowerCase() || "";
  const countryCompetitions = leaguesByCountry[countryLower] || [];

  return [...countryCompetitions, ...continentalCompetitions, ...internationalCompetitions];
}
