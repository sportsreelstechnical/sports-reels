import { db } from "../db";
import { eq } from "drizzle-orm";
import { type Team, type InsertTeam, teams } from "@shared/schema";
import { usersRepository } from "./users";

export const teamsRepository = {
  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  },

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  },

  async getTeamsByUser(userId: string): Promise<Team[]> {
    const user = await usersRepository.getUser(userId);
    if (!user?.teamId) return [];
    const team = await this.getTeam(user.teamId);
    return team ? [team] : [];
  },

  async getAllTeams(): Promise<Team[]> {
    return db.select().from(teams);
  },
};
