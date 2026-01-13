import { db } from "../db";
import { eq, desc, sql } from "drizzle-orm";
import {
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type AdminMessageInbox,
  type InsertAdminMessageInbox,
  type PlatformMetrics,
  type InsertPlatformMetrics,
  type GdprRequest,
  type InsertGdprRequest,
  type UserConsent,
  type InsertUserConsent,
  type PlatformAuditLog,
  type InsertPlatformAuditLog,
  type UserSession,
  type InsertUserSession,
  type FederationPaymentHistory,
  type InsertFederationPaymentHistory,
  passwordResetTokens,
  adminMessageInbox,
  platformMetrics,
  gdprRequests,
  userConsents,
  platformAuditLogs,
  userSessions,
  federationPaymentHistory,
  users,
  teams,
  players,
} from "@shared/schema";

export const adminRepository = {
  // Password Reset
  async createPasswordResetToken(
    token: InsertPasswordResetToken
  ): Promise<PasswordResetToken> {
    const [newToken] = await db
      .insert(passwordResetTokens)
      .values(token)
      .returning();
    return newToken;
  },

  async getPasswordResetToken(
    token: string
  ): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  },

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  },

  // Admin Messages
  async getAdminMessages(
    status?: string,
    limit = 50
  ): Promise<AdminMessageInbox[]> {
    if (status) {
      return db
        .select()
        .from(adminMessageInbox)
        .where(eq(adminMessageInbox.status, status))
        .orderBy(desc(adminMessageInbox.createdAt))
        .limit(limit);
    }
    return db
      .select()
      .from(adminMessageInbox)
      .orderBy(desc(adminMessageInbox.createdAt))
      .limit(limit);
  },

  async getAdminMessage(id: string): Promise<AdminMessageInbox | undefined> {
    const [message] = await db
      .select()
      .from(adminMessageInbox)
      .where(eq(adminMessageInbox.id, id));
    return message;
  },

  async createAdminMessage(
    message: InsertAdminMessageInbox
  ): Promise<AdminMessageInbox> {
    const [newMessage] = await db
      .insert(adminMessageInbox)
      .values(message)
      .returning();
    return newMessage;
  },

  async updateAdminMessage(
    id: string,
    updates: Partial<InsertAdminMessageInbox>
  ): Promise<AdminMessageInbox | undefined> {
    const [message] = await db
      .update(adminMessageInbox)
      .set(updates)
      .where(eq(adminMessageInbox.id, id))
      .returning();
    return message;
  },

  // Platform Metrics
  async getPlatformMetrics(
    startDate?: string,
    endDate?: string
  ): Promise<PlatformMetrics[]> {
    return db
      .select()
      .from(platformMetrics)
      .orderBy(desc(platformMetrics.createdAt))
      .limit(30);
  },

  async getLatestPlatformMetrics(): Promise<PlatformMetrics | undefined> {
    const [metrics] = await db
      .select()
      .from(platformMetrics)
      .orderBy(desc(platformMetrics.createdAt))
      .limit(1);
    return metrics;
  },

  async createPlatformMetrics(
    metrics: InsertPlatformMetrics
  ): Promise<PlatformMetrics> {
    const [newMetrics] = await db
      .insert(platformMetrics)
      .values(metrics)
      .returning();
    return newMetrics;
  },

  // GDPR Requests
  async getGdprRequests(status?: string): Promise<GdprRequest[]> {
    if (status) {
      return db
        .select()
        .from(gdprRequests)
        .where(eq(gdprRequests.status, status))
        .orderBy(desc(gdprRequests.createdAt));
    }
    return db.select().from(gdprRequests).orderBy(desc(gdprRequests.createdAt));
  },

  async getGdprRequest(id: string): Promise<GdprRequest | undefined> {
    const [request] = await db
      .select()
      .from(gdprRequests)
      .where(eq(gdprRequests.id, id));
    return request;
  },

  async getGdprRequestsByUser(userId: string): Promise<GdprRequest[]> {
    return db
      .select()
      .from(gdprRequests)
      .where(eq(gdprRequests.userId, userId));
  },

  async createGdprRequest(request: InsertGdprRequest): Promise<GdprRequest> {
    const [newRequest] = await db
      .insert(gdprRequests)
      .values(request)
      .returning();
    return newRequest;
  },

  async updateGdprRequest(
    id: string,
    updates: Partial<InsertGdprRequest>
  ): Promise<GdprRequest | undefined> {
    const [request] = await db
      .update(gdprRequests)
      .set(updates)
      .where(eq(gdprRequests.id, id))
      .returning();
    return request;
  },

  // User Consents
  async getUserConsents(userId: string): Promise<UserConsent[]> {
    return db
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, userId));
  },

  async createUserConsent(consent: InsertUserConsent): Promise<UserConsent> {
    const [newConsent] = await db
      .insert(userConsents)
      .values(consent)
      .returning();
    return newConsent;
  },

  async updateUserConsentWithdrawn(
    id: string
  ): Promise<UserConsent | undefined> {
    const [consent] = await db
      .update(userConsents)
      .set({ withdrawnAt: new Date() })
      .where(eq(userConsents.id, id))
      .returning();
    return consent;
  },

  // Platform Audit Logs
  async getPlatformAuditLogs(
    category?: string,
    limit = 100,
    offset = 0
  ): Promise<PlatformAuditLog[]> {
    if (category) {
      return db
        .select()
        .from(platformAuditLogs)
        .where(eq(platformAuditLogs.category, category))
        .orderBy(desc(platformAuditLogs.timestamp))
        .limit(limit)
        .offset(offset);
    }
    return db
      .select()
      .from(platformAuditLogs)
      .orderBy(desc(platformAuditLogs.timestamp))
      .limit(limit)
      .offset(offset);
  },

  async createPlatformAuditLog(
    log: InsertPlatformAuditLog
  ): Promise<PlatformAuditLog> {
    const [newLog] = await db.insert(platformAuditLogs).values(log).returning();
    return newLog;
  },

  // User Sessions
  async getUserSessions(userId: string): Promise<UserSession[]> {
    return db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.startedAt));
  },

  async getActiveSessions(): Promise<UserSession[]> {
    return db
      .select()
      .from(userSessions)
      .where(eq(userSessions.isActive, true))
      .orderBy(desc(userSessions.lastActivityAt));
  },

  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const [newSession] = await db
      .insert(userSessions)
      .values(session)
      .returning();
    return newSession;
  },

  async updateUserSessionActivity(
    id: string
  ): Promise<UserSession | undefined> {
    const [session] = await db
      .update(userSessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(userSessions.id, id))
      .returning();
    return session;
  },

  async endUserSession(id: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ isActive: false, endedAt: new Date() })
      .where(eq(userSessions.id, id));
  },

  // Federation Payments
  async getFederationPaymentHistory(
    federationId?: string
  ): Promise<FederationPaymentHistory[]> {
    if (federationId) {
      return db
        .select()
        .from(federationPaymentHistory)
        .where(eq(federationPaymentHistory.federationId, federationId))
        .orderBy(desc(federationPaymentHistory.createdAt));
    }
    return db
      .select()
      .from(federationPaymentHistory)
      .orderBy(desc(federationPaymentHistory.createdAt));
  },

  async getAllFederationPayments(
    limit = 100
  ): Promise<FederationPaymentHistory[]> {
    return db
      .select()
      .from(federationPaymentHistory)
      .orderBy(desc(federationPaymentHistory.createdAt))
      .limit(limit);
  },

  async createFederationPayment(
    payment: InsertFederationPaymentHistory
  ): Promise<FederationPaymentHistory> {
    const [newPayment] = await db
      .insert(federationPaymentHistory)
      .values(payment)
      .returning();
    return newPayment;
  },

  async updateFederationPayment(
    id: string,
    updates: Partial<InsertFederationPaymentHistory>
  ): Promise<FederationPaymentHistory | undefined> {
    const [payment] = await db
      .update(federationPaymentHistory)
      .set(updates)
      .where(eq(federationPaymentHistory.id, id))
      .returning();
    return payment;
  },

  // Platform Stats
  async getPlatformStats(): Promise<{
    totalUsers: number;
    totalTeams: number;
    totalPlayers: number;
    totalScouts: number;
    totalEmbassyUsers: number;
    totalFederationUsers: number;
  }> {
    const [userCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const [teamCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(teams);
    const [playerCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(players);
    const [scoutCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "scout"));
    const [embassyCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "embassy"));
    const [federationCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "federation_admin"));

    return {
      totalUsers: Number(userCount.count),
      totalTeams: Number(teamCount.count),
      totalPlayers: Number(playerCount.count),
      totalScouts: Number(scoutCount.count),
      totalEmbassyUsers: Number(embassyCount.count),
      totalFederationUsers: Number(federationCount.count),
    };
  },
};
