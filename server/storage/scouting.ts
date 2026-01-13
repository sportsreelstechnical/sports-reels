import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import {
  type ScoutingInquiry,
  type InsertScoutingInquiry,
  type ScoutShortlist,
  type InsertScoutShortlist,
  type Player,
  scoutingInquiries,
  scoutShortlists,
  players,
} from "@shared/schema";

export const scoutingRepository = {
  // Scouting Inquiries
  async getScoutingInquiries(teamId?: string): Promise<ScoutingInquiry[]> {
    // Note: teamId parameter kept for interface compatibility but not used
    return db.select().from(scoutingInquiries);
  },

  async createScoutingInquiry(
    inquiry: InsertScoutingInquiry
  ): Promise<ScoutingInquiry> {
    const [newInquiry] = await db
      .insert(scoutingInquiries)
      .values(inquiry)
      .returning();
    return newInquiry;
  },

  // Scout Shortlist
  async getScoutShortlist(scoutId: string): Promise<ScoutShortlist[]> {
    return db
      .select()
      .from(scoutShortlists)
      .where(eq(scoutShortlists.scoutId, scoutId))
      .orderBy(desc(scoutShortlists.addedAt));
  },

  async getScoutShortlistWithPlayers(
    scoutId: string
  ): Promise<Array<ScoutShortlist & { player: Player }>> {
    const shortlist = await db
      .select()
      .from(scoutShortlists)
      .where(eq(scoutShortlists.scoutId, scoutId))
      .orderBy(desc(scoutShortlists.addedAt));
    const result = await Promise.all(
      shortlist.map(async (item) => {
        const [player] = await db
          .select()
          .from(players)
          .where(eq(players.id, item.playerId));
        return { ...item, player };
      })
    );
    return result;
  },

  async addToShortlist(
    shortlist: InsertScoutShortlist
  ): Promise<ScoutShortlist> {
    const [newShortlist] = await db
      .insert(scoutShortlists)
      .values(shortlist)
      .returning();
    return newShortlist;
  },

  async updateShortlistPriority(
    id: string,
    priority: string,
    notes?: string
  ): Promise<ScoutShortlist | undefined> {
    const updates: Partial<InsertScoutShortlist> = { priority };
    if (notes !== undefined) updates.notes = notes;
    const [shortlist] = await db
      .update(scoutShortlists)
      .set(updates)
      .where(eq(scoutShortlists.id, id))
      .returning();
    return shortlist;
  },

  async removeFromShortlist(id: string): Promise<void> {
    await db.delete(scoutShortlists).where(eq(scoutShortlists.id, id));
  },

  async getShortlistEntry(
    scoutId: string,
    playerId: string
  ): Promise<ScoutShortlist | undefined> {
    const [entry] = await db
      .select()
      .from(scoutShortlists)
      .where(eq(scoutShortlists.scoutId, scoutId));
    // Filter by playerId in code since we need both conditions
    const matches = await db
      .select()
      .from(scoutShortlists)
      .where(eq(scoutShortlists.scoutId, scoutId));
    return matches.find((s) => s.playerId === playerId);
  },
};
