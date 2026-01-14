import crypto from "crypto";
import { storage } from "../storage";
import {
  SIGNUP_BONUS_TOKENS,
  SIGNUP_TOKEN_EXPIRY_MONTHS,
} from "../constants";
import {
  DEFAULT_METRICS_PROMPT,
  POSITIONAL_METRICS_PROMPTS,
} from "../data/positional-metrics";



export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(
  password: string,
  hashedPassword: string
): boolean {
  return hashPassword(password) === hashedPassword;
}

export async function grantSignupBonus(
  userId: string,
  userRole: string
): Promise<void> {
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

export function getPositionalMetricsPrompt(position: string): string {
  const positionLower = position.toLowerCase();

  // Helper to check for keywords in position string
  const hasKeyword = (keywords: string[]) => 
    keywords.some(k => positionLower.includes(k) || positionLower === k);

  if (hasKeyword(["goalkeeper", "gk"])) {
    return POSITIONAL_METRICS_PROMPTS.gk;
  }

  if (hasKeyword(["defender", "back", "cb", "rb", "lb"])) {
    return POSITIONAL_METRICS_PROMPTS.defender;
  }

  if (hasKeyword(["midfielder", "cm", "dm", "am", "cdm"])) {
    return POSITIONAL_METRICS_PROMPTS.midfielder;
  }

  if (hasKeyword(["winger", "wing", "lw", "rw", "lm", "rm"])) {
    return POSITIONAL_METRICS_PROMPTS.winger;
  }

  if (hasKeyword(["striker", "forward", "st", "cf", "fw"])) {
    return POSITIONAL_METRICS_PROMPTS.striker;
  }

  return DEFAULT_METRICS_PROMPT(position);
}

export async function updatePlayerStatsFromVideos(
  playerId: string
): Promise<void> {
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

        const videoDate = video.matchDate
          ? new Date(video.matchDate)
          : video.uploadDate;
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

        const videoDate = tag.video?.matchDate
          ? new Date(tag.video.matchDate)
          : tag.video?.uploadDate || tag.createdAt;
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
      updates.totalCareerMinutes = Math.max(
        player.totalCareerMinutes || 0,
        totalMinutesFromVideos
      );
    }
    if (last12MonthsMinutes > 0) {
      updates.clubMinutesLast12Months = Math.max(
        player.clubMinutesLast12Months || 0,
        last12MonthsMinutes
      );
    }
    if (currentSeasonMinutes > 0) {
      updates.clubMinutesCurrentSeason = Math.max(
        player.clubMinutesCurrentSeason || 0,
        currentSeasonMinutes
      );
    }

    if (Object.keys(updates).length > 0) {
      await storage.updatePlayer(playerId, updates);
    }
  } catch (error) {
    console.error("Error updating player stats from videos:", error);
  }
}
