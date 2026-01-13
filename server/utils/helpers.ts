import crypto from "crypto";
import { storage } from "../storage";

export const MAX_PLAYERS_PER_VIDEO = 15;
export const SIGNUP_BONUS_TOKENS = 50;
export const SIGNUP_TOKEN_EXPIRY_MONTHS = 6;

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

  if (
    positionLower.includes("defender") ||
    positionLower.includes("back") ||
    positionLower === "cb" ||
    positionLower === "rb" ||
    positionLower === "lb"
  ) {
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

  if (
    positionLower.includes("midfielder") ||
    positionLower === "cm" ||
    positionLower === "dm" ||
    positionLower === "am" ||
    positionLower === "cdm"
  ) {
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

  if (
    positionLower.includes("winger") ||
    positionLower.includes("wing") ||
    positionLower === "lw" ||
    positionLower === "rw" ||
    positionLower === "lm" ||
    positionLower === "rm"
  ) {
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

  if (
    positionLower.includes("striker") ||
    positionLower.includes("forward") ||
    positionLower === "st" ||
    positionLower === "cf" ||
    positionLower === "fw"
  ) {
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
