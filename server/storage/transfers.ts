import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import {
  type EligibilityScore,
  type InsertEligibilityScore,
  type TransferEligibilityAssessment,
  type InsertTransferEligibilityAssessment,
  type TransferReport,
  type InsertTransferReport,
  type TransferTarget,
  type InsertTransferTarget,
  eligibilityScores,
  transferEligibilityAssessments,
  transferReports,
  transferTargets,
} from "@shared/schema";

export const transfersRepository = {
  // Eligibility Scores
  async getEligibilityScores(playerId: string): Promise<EligibilityScore[]> {
    return db
      .select()
      .from(eligibilityScores)
      .where(eq(eligibilityScores.playerId, playerId));
  },

  async createEligibilityScore(
    score: InsertEligibilityScore
  ): Promise<EligibilityScore> {
    const [newScore] = await db
      .insert(eligibilityScores)
      .values(score)
      .returning();
    return newScore;
  },

  // Transfer Eligibility Assessments
  async getTransferEligibilityAssessment(
    playerId: string
  ): Promise<TransferEligibilityAssessment | undefined> {
    const [assessment] = await db
      .select()
      .from(transferEligibilityAssessments)
      .where(eq(transferEligibilityAssessments.playerId, playerId))
      .orderBy(desc(transferEligibilityAssessments.calculatedAt))
      .limit(1);
    return assessment;
  },

  async createTransferEligibilityAssessment(
    assessment: InsertTransferEligibilityAssessment
  ): Promise<TransferEligibilityAssessment> {
    const [newAssessment] = await db
      .insert(transferEligibilityAssessments)
      .values(assessment)
      .returning();
    return newAssessment;
  },

  async updateTransferEligibilityAssessment(
    id: string,
    updates: Partial<InsertTransferEligibilityAssessment>
  ): Promise<TransferEligibilityAssessment | undefined> {
    const [assessment] = await db
      .update(transferEligibilityAssessments)
      .set(updates)
      .where(eq(transferEligibilityAssessments.id, id))
      .returning();
    return assessment;
  },

  // Transfer Reports
  async getTransferReports(teamId: string): Promise<TransferReport[]> {
    return db
      .select()
      .from(transferReports)
      .where(eq(transferReports.teamId, teamId));
  },

  async getTransferReport(id: string): Promise<TransferReport | undefined> {
    const [report] = await db
      .select()
      .from(transferReports)
      .where(eq(transferReports.id, id));
    return report;
  },

  async getTransferReportsByPlayer(
    playerId: string
  ): Promise<TransferReport[]> {
    return db
      .select()
      .from(transferReports)
      .where(eq(transferReports.playerId, playerId));
  },

  async getAllTransferReports(): Promise<TransferReport[]> {
    return db.select().from(transferReports);
  },

  async createTransferReport(
    report: InsertTransferReport
  ): Promise<TransferReport> {
    const [newReport] = await db
      .insert(transferReports)
      .values(report)
      .returning();
    return newReport;
  },

  async updateTransferReport(
    id: string,
    updates: Partial<InsertTransferReport>
  ): Promise<TransferReport | undefined> {
    const [report] = await db
      .update(transferReports)
      .set(updates)
      .where(eq(transferReports.id, id))
      .returning();
    return report;
  },

  async deleteTransferReport(id: string): Promise<boolean> {
    await db.delete(transferReports).where(eq(transferReports.id, id));
    return true;
  },

  // Transfer Targets
  async getTransferTargets(playerId: string): Promise<TransferTarget[]> {
    return db
      .select()
      .from(transferTargets)
      .where(eq(transferTargets.playerId, playerId));
  },

  async getTransferTarget(id: string): Promise<TransferTarget | undefined> {
    const [target] = await db
      .select()
      .from(transferTargets)
      .where(eq(transferTargets.id, id));
    return target;
  },

  async createTransferTarget(
    target: InsertTransferTarget
  ): Promise<TransferTarget> {
    const [newTarget] = await db
      .insert(transferTargets)
      .values(target)
      .returning();
    return newTarget;
  },

  async updateTransferTarget(
    id: string,
    updates: Partial<InsertTransferTarget>
  ): Promise<TransferTarget | undefined> {
    const [target] = await db
      .update(transferTargets)
      .set(updates)
      .where(eq(transferTargets.id, id))
      .returning();
    return target;
  },
};
