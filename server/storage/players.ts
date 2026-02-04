import { db } from "../db";
import { eq, desc, inArray, or } from "drizzle-orm";
import {
  type Player,
  type InsertPlayer,
  type PlayerMetrics,
  type InsertPlayerMetrics,
  type PlayerPhoto,
  type InsertPlayerPhoto,
  type MedicalRecord,
  type InsertMedicalRecord,
  type BiometricData,
  type InsertBiometricData,
  type PlayerInternationalRecord,
  type InsertPlayerInternationalRecord,
  players,
  playerMetrics,
  playerPhotos,
  medicalRecords,
  biometricData,
  playerInternationalRecords,
  type EligibilityScore,
  eligibilityScores,
} from "@shared/schema";

export const playersRepository = {
  // Core Player CRUD
  async getPlayers(teamId?: string): Promise<Player[]> {
    if (teamId) {
      return db
        .select()
        .from(players)
        .where(eq(players.teamId, teamId))
        .orderBy(desc(players.updatedAt));
    }
    return db.select().from(players).orderBy(desc(players.updatedAt));
  },

  /** Sporting Director: own team's players + all players published to scouts. */
  async getPlayersForTeamOrPublished(teamId: string): Promise<Player[]> {
    return db
      .select()
      .from(players)
      .where(
        or(eq(players.teamId, teamId), eq(players.isPublishedToScouts, true))
      )
      .orderBy(desc(players.updatedAt));
  },

  async getPlayer(id: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  },

  async getPlayersByIds(ids: string[]): Promise<Player[]> {
    if (ids.length === 0) return [];
    return db.select().from(players).where(inArray(players.id, ids));
  },

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const [newPlayer] = await db.insert(players).values(player).returning();
    return newPlayer;
  },

  async updatePlayer(
    id: string,
    updates: Partial<InsertPlayer>,
  ): Promise<Player | undefined> {
    const [player] = await db
      .update(players)
      .set(updates)
      .where(eq(players.id, id))
      .returning();
    return player;
  },

  async getPublishedPlayers(): Promise<
    Array<Player & { eligibilityScores: EligibilityScore[] }>
  > {
    const publishedPlayers = await db
      .select()
      .from(players)
      .where(eq(players.isPublishedToScouts, true))
      .orderBy(desc(players.updatedAt));

    const playersWithScores = await Promise.all(
      publishedPlayers.map(async (player) => {
        const scores = await db
          .select()
          .from(eligibilityScores)
          .where(eq(eligibilityScores.playerId, player.id));
        return { ...player, eligibilityScores: scores };
      }),
    );

    return playersWithScores;
  },

  // Player Metrics
  async getPlayerMetrics(playerId: string): Promise<PlayerMetrics[]> {
    return db
      .select()
      .from(playerMetrics)
      .where(eq(playerMetrics.playerId, playerId));
  },

  async createPlayerMetrics(
    metrics: InsertPlayerMetrics,
  ): Promise<PlayerMetrics> {
    const [newMetrics] = await db
      .insert(playerMetrics)
      .values(metrics)
      .returning();
    return newMetrics;
  },

  // Player Photos
  async getPlayerPhotos(playerId: string): Promise<PlayerPhoto[]> {
    return db
      .select()
      .from(playerPhotos)
      .where(eq(playerPhotos.playerId, playerId))
      .orderBy(desc(playerPhotos.uploadedAt));
  },

  async createPlayerPhoto(photo: InsertPlayerPhoto): Promise<PlayerPhoto> {
    const [newPhoto] = await db.insert(playerPhotos).values(photo).returning();
    return newPhoto;
  },

  async deletePlayerPhoto(id: string): Promise<void> {
    await db.delete(playerPhotos).where(eq(playerPhotos.id, id));
  },

  // Medical Records
  async getMedicalRecords(playerId: string): Promise<MedicalRecord[]> {
    return db
      .select()
      .from(medicalRecords)
      .where(eq(medicalRecords.playerId, playerId));
  },

  async createMedicalRecord(
    record: InsertMedicalRecord,
  ): Promise<MedicalRecord> {
    const [newRecord] = await db
      .insert(medicalRecords)
      .values(record)
      .returning();
    return newRecord;
  },

  // Biometric Data
  async getBiometricData(playerId: string): Promise<BiometricData[]> {
    return db
      .select()
      .from(biometricData)
      .where(eq(biometricData.playerId, playerId));
  },

  async createBiometricData(data: InsertBiometricData): Promise<BiometricData> {
    const [newData] = await db.insert(biometricData).values(data).returning();
    return newData;
  },

  // International Records
  async getPlayerInternationalRecords(
    playerId: string,
  ): Promise<PlayerInternationalRecord[]> {
    return db
      .select()
      .from(playerInternationalRecords)
      .where(eq(playerInternationalRecords.playerId, playerId))
      .orderBy(desc(playerInternationalRecords.createdAt));
  },

  async getPlayerInternationalRecord(
    id: string,
  ): Promise<PlayerInternationalRecord | undefined> {
    const [record] = await db
      .select()
      .from(playerInternationalRecords)
      .where(eq(playerInternationalRecords.id, id));
    return record;
  },

  async createPlayerInternationalRecord(
    record: InsertPlayerInternationalRecord,
  ): Promise<PlayerInternationalRecord> {
    const [newRecord] = await db
      .insert(playerInternationalRecords)
      .values(record)
      .returning();
    return newRecord;
  },

  async updatePlayerInternationalRecord(
    id: string,
    updates: Partial<InsertPlayerInternationalRecord>,
  ): Promise<PlayerInternationalRecord | undefined> {
    const [record] = await db
      .update(playerInternationalRecords)
      .set(updates)
      .where(eq(playerInternationalRecords.id, id))
      .returning();
    return record;
  },

  async deletePlayerInternationalRecord(id: string): Promise<void> {
    await db
      .delete(playerInternationalRecords)
      .where(eq(playerInternationalRecords.id, id));
  },
};
