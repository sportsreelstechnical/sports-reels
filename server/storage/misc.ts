import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import {
  type TeamSheet,
  type InsertTeamSheet,
  type TeamSheetPlayer,
  type InsertTeamSheetPlayer,
  type ActionLog,
  type InsertActionLog,
  type Club,
  type InsertClub,
  type PlayerShareLink,
  type InsertPlayerShareLink,
  teamSheets,
  teamSheetPlayers,
  actionLogs,
  clubs,
  playerShareLinks,
} from "@shared/schema";

export const miscRepository = {
  // Team Sheets
  async getTeamSheets(teamId: string): Promise<TeamSheet[]> {
    return db
      .select()
      .from(teamSheets)
      .where(eq(teamSheets.teamId, teamId))
      .orderBy(desc(teamSheets.createdAt));
  },

  async getTeamSheet(id: string): Promise<TeamSheet | undefined> {
    const [sheet] = await db
      .select()
      .from(teamSheets)
      .where(eq(teamSheets.id, id));
    return sheet;
  },

  async createTeamSheet(sheet: InsertTeamSheet): Promise<TeamSheet> {
    const [newSheet] = await db.insert(teamSheets).values(sheet).returning();
    return newSheet;
  },

  async updateTeamSheet(
    id: string,
    updates: Partial<InsertTeamSheet>
  ): Promise<TeamSheet | undefined> {
    const [sheet] = await db
      .update(teamSheets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(teamSheets.id, id))
      .returning();
    return sheet;
  },

  async deleteTeamSheet(id: string): Promise<void> {
    await db
      .delete(teamSheetPlayers)
      .where(eq(teamSheetPlayers.teamSheetId, id));
    await db.delete(teamSheets).where(eq(teamSheets.id, id));
  },

  // Team Sheet Players
  async getTeamSheetPlayers(teamSheetId: string): Promise<TeamSheetPlayer[]> {
    return db
      .select()
      .from(teamSheetPlayers)
      .where(eq(teamSheetPlayers.teamSheetId, teamSheetId))
      .orderBy(teamSheetPlayers.positionOrder);
  },

  async createTeamSheetPlayer(
    player: InsertTeamSheetPlayer
  ): Promise<TeamSheetPlayer> {
    const [newPlayer] = await db
      .insert(teamSheetPlayers)
      .values(player)
      .returning();
    return newPlayer;
  },

  async updateTeamSheetPlayer(
    id: string,
    updates: Partial<InsertTeamSheetPlayer>
  ): Promise<TeamSheetPlayer | undefined> {
    const [player] = await db
      .update(teamSheetPlayers)
      .set(updates)
      .where(eq(teamSheetPlayers.id, id))
      .returning();
    return player;
  },

  async deleteTeamSheetPlayer(id: string): Promise<void> {
    await db.delete(teamSheetPlayers).where(eq(teamSheetPlayers.id, id));
  },

  async deleteTeamSheetPlayersBySheet(teamSheetId: string): Promise<void> {
    await db
      .delete(teamSheetPlayers)
      .where(eq(teamSheetPlayers.teamSheetId, teamSheetId));
  },

  // Action Logs
  async logAction(log: InsertActionLog): Promise<ActionLog> {
    const [newLog] = await db.insert(actionLogs).values(log).returning();
    return newLog;
  },

  async getActionLogs(
    entityType: string,
    entityId: string
  ): Promise<ActionLog[]> {
    return db
      .select()
      .from(actionLogs)
      .where(eq(actionLogs.entityType, entityType))
      .orderBy(desc(actionLogs.createdAt));
  },

  // Clubs
  async getClubs(): Promise<Club[]> {
    return db.select().from(clubs);
  },

  async getClub(id: string): Promise<Club | undefined> {
    const [club] = await db.select().from(clubs).where(eq(clubs.id, id));
    return club;
  },

  async createClub(club: InsertClub): Promise<Club> {
    const [newClub] = await db.insert(clubs).values(club).returning();
    return newClub;
  },

  // Player Share Links
  async createPlayerShareLink(
    link: InsertPlayerShareLink
  ): Promise<PlayerShareLink> {
    const [newLink] = await db
      .insert(playerShareLinks)
      .values(link)
      .returning();
    return newLink;
  },

  async getPlayerShareLinks(playerId: string): Promise<PlayerShareLink[]> {
    return db
      .select()
      .from(playerShareLinks)
      .where(eq(playerShareLinks.playerId, playerId));
  },

  async getPlayerShareLinkByToken(
    shareToken: string
  ): Promise<PlayerShareLink | undefined> {
    const [link] = await db
      .select()
      .from(playerShareLinks)
      .where(eq(playerShareLinks.shareToken, shareToken));
    return link;
  },

  async incrementShareLinkViewCount(id: string): Promise<void> {
    // Simple increment - in production would use atomic update
    const [link] = await db
      .select()
      .from(playerShareLinks)
      .where(eq(playerShareLinks.id, id));
    if (link) {
      await db
        .update(playerShareLinks)
        .set({ viewCount: (link.viewCount || 0) + 1 })
        .where(eq(playerShareLinks.id, id));
    }
  },
};
