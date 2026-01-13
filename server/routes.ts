import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertTeamSchema,
  insertPlayerSchema,
  insertVideoSchema,
  insertComplianceOrderSchema,
  insertPlayerInternationalRecordSchema,
  insertTeamSheetSchema,
  insertTeamSheetPlayerSchema,
  insertPlayerDocumentSchema,
  insertFederationLetterRequestSchema,
  insertPlayerPhotoSchema,
} from "@shared/schema";
import session from "express-session";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import {
  registerObjectStorageRoutes,
  ObjectStorageService,
} from "./replit_integrations/object_storage";
import { jsPDF } from "jspdf";
import crypto from "crypto";

// Import modular routes
import { registerAuthRoutes } from "./routes/auth";
import { registerPlayerRoutes } from "./routes/players";
import { registerVideoRoutes } from "./routes/videos";
import { registerMessagingRoutes } from "./routes/messaging";
import { registerDashboardRoutes } from "./routes/dashboard";
import { registerEligibilityRoutes } from "./routes/eligibility";
import { registerComplianceRoutes } from "./routes/compliance";
import { registerScoutingRoutes } from "./routes/scouting";
import { registerPlayerDocumentsRoutes } from "./routes/player-documents";

// Import utilities from modular files
import {
  hashPassword,
  verifyPassword,
  grantSignupBonus,
  getPositionalMetricsPrompt,
  updatePlayerStatsFromVideos,
  MAX_PLAYERS_PER_VIDEO,
  SIGNUP_BONUS_TOKENS,
  SIGNUP_TOKEN_EXPIRY_MONTHS,
} from "./utils/helpers";
import {
  requireAuth,
  requireTeamRole,
  requireScoutRole,
  requireEmbassyRole,
  requireFederationAdmin,
  requireAdminRole,
} from "./middleware/auth";

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: { baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerObjectStorageRoutes(app);
  const objectStorageService = new ObjectStorageService();

  // Register modular routes
  registerAuthRoutes(app);
  registerPlayerRoutes(app);
  registerVideoRoutes(app);
  registerMessagingRoutes(app);
  registerDashboardRoutes(app);
  registerEligibilityRoutes(app);
  registerComplianceRoutes(app);
  registerScoutingRoutes(app);
  registerPlayerDocumentsRoutes(app);

  // Object storage upload URL endpoint
  app.get("/api/object-storage/upload-url", requireAuth, async (req, res) => {
    try {
      const signedUrl = await objectStorageService.getObjectEntityUploadURL();

      // Extract the objectPath from the signed URL
      const url = new URL(signedUrl);
      const pathParts = url.pathname.split("/");
      const bucketName = pathParts[1];
      const objectName = pathParts.slice(2).join("/");
      const key = `${bucketName}/${objectName}`;
      const objectPath = `/objects/uploads/${objectName.split("/").pop()}`;

      res.json({ signedUrl, key, objectPath });
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}

function getCompetitionsByCountry(
  country?: string
): { name: string; type: string }[] {
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

  return [
    ...countryCompetitions,
    ...continentalCompetitions,
    ...internationalCompetitions,
  ];
}
