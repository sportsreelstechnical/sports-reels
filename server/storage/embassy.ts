import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import {
  type EmbassyProfile,
  type InsertEmbassyProfile,
  type EmbassyVerification,
  type InsertEmbassyVerification,
  type EmbassyNotification,
  type InsertEmbassyNotification,
  type EmbassyDocumentAccess,
  type InsertEmbassyDocumentAccess,
  type InvitationLetter,
  type InsertInvitationLetter,
  type ConsularReport,
  type InsertConsularReport,
  embassyProfiles,
  embassyVerifications,
  embassyNotifications,
  embassyDocumentAccess,
  invitationLetters,
  consularReports,
} from "@shared/schema";

export const embassyRepository = {
  // Embassy Profile
  async getEmbassyProfile(id: string): Promise<EmbassyProfile | undefined> {
    const [profile] = await db
      .select()
      .from(embassyProfiles)
      .where(eq(embassyProfiles.id, id));
    return profile;
  },

  async getEmbassyProfileByCountry(
    country: string
  ): Promise<EmbassyProfile | undefined> {
    const [profile] = await db
      .select()
      .from(embassyProfiles)
      .where(eq(embassyProfiles.country, country));
    return profile;
  },

  async getEmbassyProfileByUserId(
    userId: string
  ): Promise<EmbassyProfile | undefined> {
    const [profile] = await db
      .select()
      .from(embassyProfiles)
      .where(eq(embassyProfiles.userId, userId));
    return profile;
  },

  async createEmbassyProfile(
    profile: InsertEmbassyProfile
  ): Promise<EmbassyProfile> {
    const [newProfile] = await db
      .insert(embassyProfiles)
      .values(profile)
      .returning();
    return newProfile;
  },

  async getAllEmbassyProfiles(): Promise<EmbassyProfile[]> {
    return db.select().from(embassyProfiles);
  },

  // Embassy Verifications
  async getEmbassyVerifications(
    teamId?: string
  ): Promise<EmbassyVerification[]> {
    // Note: teamId parameter kept for interface compatibility but not used in query
    return db.select().from(embassyVerifications);
  },

  async createEmbassyVerification(
    verification: InsertEmbassyVerification
  ): Promise<EmbassyVerification> {
    const [newVerification] = await db
      .insert(embassyVerifications)
      .values(verification)
      .returning();
    return newVerification;
  },

  async updateEmbassyVerification(
    id: string,
    updates: Partial<InsertEmbassyVerification>
  ): Promise<EmbassyVerification | undefined> {
    const [verification] = await db
      .update(embassyVerifications)
      .set(updates)
      .where(eq(embassyVerifications.id, id))
      .returning();
    return verification;
  },

  // Embassy Notifications
  async getEmbassyNotifications(
    embassyCountry?: string
  ): Promise<EmbassyNotification[]> {
    if (embassyCountry) {
      return db
        .select()
        .from(embassyNotifications)
        .where(eq(embassyNotifications.embassyCountry, embassyCountry))
        .orderBy(desc(embassyNotifications.createdAt));
    }
    return db
      .select()
      .from(embassyNotifications)
      .orderBy(desc(embassyNotifications.createdAt));
  },

  async getEmbassyNotification(
    id: string
  ): Promise<EmbassyNotification | undefined> {
    const [notification] = await db
      .select()
      .from(embassyNotifications)
      .where(eq(embassyNotifications.id, id));
    return notification;
  },

  async createEmbassyNotification(
    notification: InsertEmbassyNotification
  ): Promise<EmbassyNotification> {
    const [newNotification] = await db
      .insert(embassyNotifications)
      .values(notification)
      .returning();
    return newNotification;
  },

  async updateEmbassyNotification(
    id: string,
    updates: Partial<InsertEmbassyNotification>
  ): Promise<EmbassyNotification | undefined> {
    const [notification] = await db
      .update(embassyNotifications)
      .set(updates)
      .where(eq(embassyNotifications.id, id))
      .returning();
    return notification;
  },

  // Embassy Document Access
  async logEmbassyDocumentAccess(
    access: InsertEmbassyDocumentAccess
  ): Promise<EmbassyDocumentAccess> {
    const [newAccess] = await db
      .insert(embassyDocumentAccess)
      .values(access)
      .returning();
    return newAccess;
  },

  async getEmbassyDocumentAccessLogs(
    documentId: string
  ): Promise<EmbassyDocumentAccess[]> {
    return db
      .select()
      .from(embassyDocumentAccess)
      .where(eq(embassyDocumentAccess.documentId, documentId))
      .orderBy(desc(embassyDocumentAccess.accessedAt));
  },

  // Invitation Letters
  async getInvitationLetters(playerId: string): Promise<InvitationLetter[]> {
    return db
      .select()
      .from(invitationLetters)
      .where(eq(invitationLetters.playerId, playerId));
  },

  async getAllInvitationLetters(teamId?: string): Promise<InvitationLetter[]> {
    // Note: teamId parameter kept for interface compatibility but not used
    return db.select().from(invitationLetters);
  },

  async getInvitationLetter(id: string): Promise<InvitationLetter | undefined> {
    const [letter] = await db
      .select()
      .from(invitationLetters)
      .where(eq(invitationLetters.id, id));
    return letter;
  },

  async createInvitationLetter(
    letter: InsertInvitationLetter
  ): Promise<InvitationLetter> {
    const [newLetter] = await db
      .insert(invitationLetters)
      .values(letter)
      .returning();
    return newLetter;
  },

  async updateInvitationLetter(
    id: string,
    updates: Partial<InsertInvitationLetter>
  ): Promise<InvitationLetter | undefined> {
    const [letter] = await db
      .update(invitationLetters)
      .set(updates)
      .where(eq(invitationLetters.id, id))
      .returning();
    return letter;
  },

  async deleteInvitationLetter(id: string): Promise<boolean> {
    await db.delete(invitationLetters).where(eq(invitationLetters.id, id));
    return true;
  },

  async getEmbassyNotifiedLetters(
    embassyCountry: string
  ): Promise<InvitationLetter[]> {
    const notifications = await db
      .select()
      .from(embassyNotifications)
      .where(eq(embassyNotifications.embassyCountry, embassyCountry));
    // Get invitation letter IDs from notifications
    const letterIds = notifications
      .map((n) => n.invitationLetterId)
      .filter(Boolean);
    if (letterIds.length === 0) return [];
    const letters = await Promise.all(
      letterIds.map((id) =>
        db.select().from(invitationLetters).where(eq(invitationLetters.id, id))
      )
    );
    return letters.flat();
  },

  async getAllEmbassyNotifiedLetters(): Promise<InvitationLetter[]> {
    const notifications = await db.select().from(embassyNotifications);
    const letterIds = notifications
      .map((n) => n.invitationLetterId)
      .filter(Boolean);
    if (letterIds.length === 0) return [];
    const letters = await Promise.all(
      letterIds.map((id) =>
        db.select().from(invitationLetters).where(eq(invitationLetters.id, id))
      )
    );
    return letters.flat();
  },

  // Consular Reports
  async getConsularReports(playerId: string): Promise<ConsularReport[]> {
    return db
      .select()
      .from(consularReports)
      .where(eq(consularReports.playerId, playerId));
  },

  async getConsularReport(id: string): Promise<ConsularReport | undefined> {
    const [report] = await db
      .select()
      .from(consularReports)
      .where(eq(consularReports.id, id));
    return report;
  },

  async getConsularReportByVerificationCode(
    code: string
  ): Promise<ConsularReport | undefined> {
    const [report] = await db
      .select()
      .from(consularReports)
      .where(eq(consularReports.verificationCode, code));
    return report;
  },

  async createConsularReport(
    report: InsertConsularReport
  ): Promise<ConsularReport> {
    const [newReport] = await db
      .insert(consularReports)
      .values(report)
      .returning();
    return newReport;
  },

  async updateConsularReport(
    id: string,
    updates: Partial<InsertConsularReport>
  ): Promise<ConsularReport | undefined> {
    const [report] = await db
      .update(consularReports)
      .set(updates)
      .where(eq(consularReports.id, id))
      .returning();
    return report;
  },
};
