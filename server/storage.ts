import { 
  type User, type InsertUser, 
  type Team, type InsertTeam,
  type Player, type InsertPlayer,
  type PlayerMetrics, type InsertPlayerMetrics,
  type Video, type InsertVideo,
  type VideoInsights, type InsertVideoInsights,
  type EligibilityScore, type InsertEligibilityScore,
  type TransferEligibilityAssessment, type InsertTransferEligibilityAssessment,
  type TransferReport, type InsertTransferReport,
  type ComplianceOrder, type InsertComplianceOrder,
  type ComplianceDocument, type InsertComplianceDocument,
  type EmbassyVerification, type InsertEmbassyVerification,
  type ScoutingInquiry, type InsertScoutingInquiry,
  type Payment, type InsertPayment,
  type Club, type InsertClub,
  type MedicalRecord, type InsertMedicalRecord,
  type BiometricData, type InsertBiometricData,
  type EmbassyProfile, type InsertEmbassyProfile,
  type InvitationLetter, type InsertInvitationLetter,
  type ConsularReport, type InsertConsularReport,
  type Conversation, type InsertConversation,
  type ConversationParticipant, type InsertConversationParticipant,
  type Message, type InsertMessage,
  type EmbassyDocumentAccess, type InsertEmbassyDocumentAccess,
  type SharedVideo, type InsertSharedVideo,
  type ActionLog, type InsertActionLog,
  type TransferTarget, type InsertTransferTarget,
  type VideoPlayerTag, type InsertVideoPlayerTag,
  type PlayerInternationalRecord, type InsertPlayerInternationalRecord,
  type TeamSheet, type InsertTeamSheet,
  type TeamSheetPlayer, type InsertTeamSheetPlayer,
  type PlayerDocument, type InsertPlayerDocument,
  type FederationLetterRequest, type InsertFederationLetterRequest,
  type FederationProfile, type InsertFederationProfile,
  type FederationFeeSchedule, type InsertFederationFeeSchedule,
  type FederationRequestActivity, type InsertFederationRequestActivity,
  type FederationRequestMessage, type InsertFederationRequestMessage,
  type FederationIssuedDocument, type InsertFederationIssuedDocument,
  type ScoutShortlist, type InsertScoutShortlist,
  type TokenBalance, type InsertTokenBalance,
  type TokenTransaction, type InsertTokenTransaction,
  type TokenPack, type InsertTokenPack,
  type TokenPurchase, type InsertTokenPurchase,
  type PlayerShareLink, type InsertPlayerShareLink,
  type EmbassyNotification, type InsertEmbassyNotification,
  type DocumentVerification, type InsertDocumentVerification,
  type DocumentVersion, type InsertDocumentVersion,
  type DocumentAuditLog, type InsertDocumentAuditLog,
  type PasswordResetToken, type InsertPasswordResetToken,
  type AdminMessageInbox, type InsertAdminMessageInbox,
  type PlatformMetrics, type InsertPlatformMetrics,
  type GdprRequest, type InsertGdprRequest,
  type UserConsent, type InsertUserConsent,
  type PlatformAuditLog, type InsertPlatformAuditLog,
  type UserSession, type InsertUserSession,
  type FederationPaymentHistory, type InsertFederationPaymentHistory,
  users, teams, players, playerMetrics, videos, videoInsights,
  eligibilityScores, transferEligibilityAssessments, transferReports, complianceOrders, complianceDocuments,
  embassyVerifications, scoutingInquiries, payments, clubs,
  medicalRecords, biometricData, embassyProfiles, invitationLetters, consularReports,
  conversations, conversationParticipants, messages,
  embassyDocumentAccess, sharedVideos, actionLogs, transferTargets,
  videoPlayerTags, playerInternationalRecords, teamSheets, teamSheetPlayers, playerDocuments,
  federationLetterRequests, federationProfiles, federationFeeSchedules, federationRequestActivities,
  federationRequestMessages, federationIssuedDocuments, scoutShortlists,
  tokenBalances, tokenTransactions, tokenPacks, tokenPurchases, playerShareLinks,
  embassyNotifications, documentVerifications, documentVersions, documentAuditLogs,
  passwordResetTokens, adminMessageInbox, platformMetrics, gdprRequests,
  userConsents, platformAuditLogs, userSessions, federationPaymentHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, or, ilike } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  getTeam(id: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  getTeamsByUser(userId: string): Promise<Team[]>;
  
  getPlayers(teamId?: string): Promise<Player[]>;
  getPlayer(id: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: string, updates: Partial<InsertPlayer>): Promise<Player | undefined>;
  
  getPlayerMetrics(playerId: string): Promise<PlayerMetrics[]>;
  createPlayerMetrics(metrics: InsertPlayerMetrics): Promise<PlayerMetrics>;
  
  getVideos(playerId?: string): Promise<Video[]>;
  getVideo(id: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: string, updates: Partial<InsertVideo>): Promise<Video | undefined>;
  
  getVideoInsights(videoId: string): Promise<VideoInsights | undefined>;
  createVideoInsights(insights: InsertVideoInsights): Promise<VideoInsights>;
  
  getEligibilityScores(playerId: string): Promise<EligibilityScore[]>;
  createEligibilityScore(score: InsertEligibilityScore): Promise<EligibilityScore>;
  
  getTransferEligibilityAssessment(playerId: string): Promise<TransferEligibilityAssessment | undefined>;
  createTransferEligibilityAssessment(assessment: InsertTransferEligibilityAssessment): Promise<TransferEligibilityAssessment>;
  updateTransferEligibilityAssessment(id: string, updates: Partial<InsertTransferEligibilityAssessment>): Promise<TransferEligibilityAssessment | undefined>;
  
  getTransferReports(teamId: string): Promise<TransferReport[]>;
  getTransferReport(id: string): Promise<TransferReport | undefined>;
  getTransferReportsByPlayer(playerId: string): Promise<TransferReport[]>;
  getAllTransferReports(): Promise<TransferReport[]>;
  createTransferReport(report: InsertTransferReport): Promise<TransferReport>;
  updateTransferReport(id: string, updates: Partial<InsertTransferReport>): Promise<TransferReport | undefined>;
  deleteTransferReport(id: string): Promise<boolean>;
  
  getComplianceOrders(teamId: string): Promise<ComplianceOrder[]>;
  getComplianceOrder(id: string): Promise<ComplianceOrder | undefined>;
  createComplianceOrder(order: InsertComplianceOrder): Promise<ComplianceOrder>;
  updateComplianceOrder(id: string, updates: Partial<InsertComplianceOrder>): Promise<ComplianceOrder | undefined>;
  
  getComplianceDocuments(orderId: string): Promise<ComplianceDocument[]>;
  getComplianceDocument(id: string): Promise<ComplianceDocument | undefined>;
  createComplianceDocument(doc: InsertComplianceDocument): Promise<ComplianceDocument>;
  
  getEmbassyVerifications(teamId?: string): Promise<EmbassyVerification[]>;
  createEmbassyVerification(verification: InsertEmbassyVerification): Promise<EmbassyVerification>;
  updateEmbassyVerification(id: string, updates: Partial<InsertEmbassyVerification>): Promise<EmbassyVerification | undefined>;
  
  getScoutingInquiries(teamId?: string): Promise<ScoutingInquiry[]>;
  createScoutingInquiry(inquiry: InsertScoutingInquiry): Promise<ScoutingInquiry>;
  
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentByOrderId(orderId: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, updates: Partial<InsertPayment>): Promise<Payment | undefined>;
  
  getClubs(): Promise<Club[]>;
  getClub(id: string): Promise<Club | undefined>;
  createClub(club: InsertClub): Promise<Club>;
  
  getMedicalRecords(playerId: string): Promise<MedicalRecord[]>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  
  getBiometricData(playerId: string): Promise<BiometricData[]>;
  createBiometricData(data: InsertBiometricData): Promise<BiometricData>;
  
  getEmbassyProfile(id: string): Promise<EmbassyProfile | undefined>;
  getEmbassyProfileByCountry(country: string): Promise<EmbassyProfile | undefined>;
  getEmbassyProfileByUserId(userId: string): Promise<EmbassyProfile | undefined>;
  createEmbassyProfile(profile: InsertEmbassyProfile): Promise<EmbassyProfile>;
  
  getInvitationLetters(playerId: string): Promise<InvitationLetter[]>;
  getAllInvitationLetters(teamId?: string): Promise<InvitationLetter[]>;
  getInvitationLetter(id: string): Promise<InvitationLetter | undefined>;
  createInvitationLetter(letter: InsertInvitationLetter): Promise<InvitationLetter>;
  updateInvitationLetter(id: string, updates: Partial<InsertInvitationLetter>): Promise<InvitationLetter | undefined>;
  deleteInvitationLetter(id: string): Promise<boolean>;
  
  getConsularReports(playerId: string): Promise<ConsularReport[]>;
  getConsularReport(id: string): Promise<ConsularReport | undefined>;
  getConsularReportByVerificationCode(code: string): Promise<ConsularReport | undefined>;
  createConsularReport(report: InsertConsularReport): Promise<ConsularReport>;
  updateConsularReport(id: string, updates: Partial<InsertConsularReport>): Promise<ConsularReport | undefined>;
  
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  addConversationParticipant(participant: InsertConversationParticipant): Promise<ConversationParticipant>;
  getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]>;
  
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  logEmbassyDocumentAccess(access: InsertEmbassyDocumentAccess): Promise<EmbassyDocumentAccess>;
  getEmbassyDocumentAccessLogs(documentId: string): Promise<EmbassyDocumentAccess[]>;
  
  shareVideo(share: InsertSharedVideo): Promise<SharedVideo>;
  getSharedVideos(userId: string): Promise<SharedVideo[]>;
  
  logAction(log: InsertActionLog): Promise<ActionLog>;
  getActionLogs(entityType: string, entityId: string): Promise<ActionLog[]>;
  
  createTransferTarget(target: InsertTransferTarget): Promise<TransferTarget>;
  getTransferTargets(playerId: string): Promise<TransferTarget[]>;
  getTransferTarget(id: string): Promise<TransferTarget | undefined>;
  updateTransferTarget(id: string, updates: Partial<InsertTransferTarget>): Promise<TransferTarget | undefined>;
  
  createVideoPlayerTag(tag: InsertVideoPlayerTag): Promise<VideoPlayerTag>;
  getVideoPlayerTags(videoId: string): Promise<VideoPlayerTag[]>;
  getVideoPlayerTagsForPlayer(playerId: string): Promise<Array<VideoPlayerTag & { video: Video | null }>>;
  getVideoPlayerTag(id: string): Promise<VideoPlayerTag | undefined>;
  updateVideoPlayerTag(id: string, updates: Partial<InsertVideoPlayerTag>): Promise<VideoPlayerTag | undefined>;
  deleteVideoPlayerTag(id: string): Promise<void>;
  getPlayerVideoMinutes(playerId: string): Promise<number>;
  
  getPlayerInternationalRecords(playerId: string): Promise<PlayerInternationalRecord[]>;
  getPlayerInternationalRecord(id: string): Promise<PlayerInternationalRecord | undefined>;
  createPlayerInternationalRecord(record: InsertPlayerInternationalRecord): Promise<PlayerInternationalRecord>;
  updatePlayerInternationalRecord(id: string, updates: Partial<InsertPlayerInternationalRecord>): Promise<PlayerInternationalRecord | undefined>;
  deletePlayerInternationalRecord(id: string): Promise<void>;
  
  getTeamSheets(teamId: string): Promise<TeamSheet[]>;
  getTeamSheet(id: string): Promise<TeamSheet | undefined>;
  createTeamSheet(sheet: InsertTeamSheet): Promise<TeamSheet>;
  updateTeamSheet(id: string, updates: Partial<InsertTeamSheet>): Promise<TeamSheet | undefined>;
  deleteTeamSheet(id: string): Promise<void>;
  
  getTeamSheetPlayers(teamSheetId: string): Promise<TeamSheetPlayer[]>;
  createTeamSheetPlayer(player: InsertTeamSheetPlayer): Promise<TeamSheetPlayer>;
  updateTeamSheetPlayer(id: string, updates: Partial<InsertTeamSheetPlayer>): Promise<TeamSheetPlayer | undefined>;
  deleteTeamSheetPlayer(id: string): Promise<void>;
  deleteTeamSheetPlayersBySheet(teamSheetId: string): Promise<void>;
  
  getPlayerDocuments(playerId: string): Promise<PlayerDocument[]>;
  getPlayerDocument(id: string): Promise<PlayerDocument | undefined>;
  createPlayerDocument(doc: InsertPlayerDocument): Promise<PlayerDocument>;
  updatePlayerDocument(id: string, updates: Partial<InsertPlayerDocument>): Promise<PlayerDocument | undefined>;
  deletePlayerDocument(id: string): Promise<void>;
  
  getScoutShortlist(scoutId: string): Promise<ScoutShortlist[]>;
  getScoutShortlistWithPlayers(scoutId: string): Promise<Array<ScoutShortlist & { player: Player }>>;
  addToShortlist(shortlist: InsertScoutShortlist): Promise<ScoutShortlist>;
  updateShortlistPriority(id: string, priority: string, notes?: string): Promise<ScoutShortlist | undefined>;
  removeFromShortlist(id: string): Promise<void>;
  getShortlistEntry(scoutId: string, playerId: string): Promise<ScoutShortlist | undefined>;
  
  // Token System
  getTokenBalance(userId: string): Promise<TokenBalance | undefined>;
  createTokenBalance(balance: InsertTokenBalance): Promise<TokenBalance>;
  updateTokenBalance(userId: string, balance: number, lifetimePurchased?: number, lifetimeSpent?: number): Promise<TokenBalance | undefined>;
  getTokenTransactions(userId: string, limit?: number): Promise<TokenTransaction[]>;
  createTokenTransaction(transaction: InsertTokenTransaction): Promise<TokenTransaction>;
  getTokenPacks(): Promise<TokenPack[]>;
  getTokenPack(id: string): Promise<TokenPack | undefined>;
  createTokenPack(pack: InsertTokenPack): Promise<TokenPack>;
  getTokenPurchases(userId: string): Promise<TokenPurchase[]>;
  createTokenPurchase(purchase: InsertTokenPurchase): Promise<TokenPurchase>;
  updateTokenPurchase(id: string, updates: Partial<InsertTokenPurchase>): Promise<TokenPurchase | undefined>;
  
  // Player share links
  createPlayerShareLink(link: InsertPlayerShareLink): Promise<PlayerShareLink>;
  getPlayerShareLinks(playerId: string): Promise<PlayerShareLink[]>;
  getPlayerShareLinkByToken(shareToken: string): Promise<PlayerShareLink | undefined>;
  incrementShareLinkViewCount(id: string): Promise<void>;
  getPublishedPlayers(): Promise<Player[]>;
  
  // Embassy notifications
  createEmbassyNotification(notification: InsertEmbassyNotification): Promise<EmbassyNotification>;
  getEmbassyNotifications(embassyCountry?: string): Promise<EmbassyNotification[]>;
  getEmbassyNotification(id: string): Promise<EmbassyNotification | undefined>;
  updateEmbassyNotification(id: string, updates: Partial<InsertEmbassyNotification>): Promise<EmbassyNotification | undefined>;
  getEmbassyNotifiedLetters(embassyCountry: string): Promise<InvitationLetter[]>;
  getAllEmbassyNotifiedLetters(): Promise<InvitationLetter[]>;
  
  // Document verification
  createDocumentVerification(verification: InsertDocumentVerification): Promise<DocumentVerification>;
  getDocumentVerification(documentType: string, documentId: string): Promise<DocumentVerification | undefined>;
  updateDocumentVerification(id: string, updates: Partial<InsertDocumentVerification>): Promise<DocumentVerification | undefined>;
  
  // Document version control
  getDocumentVersions(documentId: string): Promise<DocumentVersion[]>;
  getDocumentVersion(id: string): Promise<DocumentVersion | undefined>;
  getCurrentDocumentVersion(documentId: string): Promise<DocumentVersion | undefined>;
  createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion>;
  setCurrentVersion(documentId: string, versionId: string): Promise<void>;
  
  // Document audit logs
  getDocumentAuditLogs(documentId: string): Promise<DocumentAuditLog[]>;
  getDocumentAuditLogsByPlayer(playerId: string): Promise<DocumentAuditLog[]>;
  getDocumentAuditLogsByTeam(teamId: string, limit?: number): Promise<DocumentAuditLog[]>;
  createDocumentAuditLog(log: InsertDocumentAuditLog): Promise<DocumentAuditLog>;
  
  // ==================== PLATFORM ADMIN PORTAL ====================
  
  // User Management
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  
  // Password Reset
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: string): Promise<void>;
  
  // Admin Message Inbox
  getAdminMessages(status?: string, limit?: number): Promise<AdminMessageInbox[]>;
  getAdminMessage(id: string): Promise<AdminMessageInbox | undefined>;
  createAdminMessage(message: InsertAdminMessageInbox): Promise<AdminMessageInbox>;
  updateAdminMessage(id: string, updates: Partial<InsertAdminMessageInbox>): Promise<AdminMessageInbox | undefined>;
  
  // Platform Metrics
  getPlatformMetrics(startDate?: string, endDate?: string): Promise<PlatformMetrics[]>;
  getLatestPlatformMetrics(): Promise<PlatformMetrics | undefined>;
  createPlatformMetrics(metrics: InsertPlatformMetrics): Promise<PlatformMetrics>;
  
  // GDPR Requests
  getGdprRequests(status?: string): Promise<GdprRequest[]>;
  getGdprRequest(id: string): Promise<GdprRequest | undefined>;
  getGdprRequestsByUser(userId: string): Promise<GdprRequest[]>;
  createGdprRequest(request: InsertGdprRequest): Promise<GdprRequest>;
  updateGdprRequest(id: string, updates: Partial<InsertGdprRequest>): Promise<GdprRequest | undefined>;
  
  // User Consents
  getUserConsents(userId: string): Promise<UserConsent[]>;
  createUserConsent(consent: InsertUserConsent): Promise<UserConsent>;
  updateUserConsentWithdrawn(id: string): Promise<UserConsent | undefined>;
  
  // Platform Audit Logs
  getPlatformAuditLogs(category?: string, limit?: number, offset?: number): Promise<PlatformAuditLog[]>;
  createPlatformAuditLog(log: InsertPlatformAuditLog): Promise<PlatformAuditLog>;
  
  // User Sessions
  getUserSessions(userId: string): Promise<UserSession[]>;
  getActiveSessions(): Promise<UserSession[]>;
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  updateUserSessionActivity(id: string): Promise<UserSession | undefined>;
  endUserSession(id: string): Promise<void>;
  
  // Federation Payment History
  getFederationPaymentHistory(federationId?: string): Promise<FederationPaymentHistory[]>;
  getAllFederationPayments(limit?: number): Promise<FederationPaymentHistory[]>;
  createFederationPayment(payment: InsertFederationPaymentHistory): Promise<FederationPaymentHistory>;
  updateFederationPayment(id: string, updates: Partial<InsertFederationPaymentHistory>): Promise<FederationPaymentHistory | undefined>;
  
  // All Federations
  getAllFederationProfiles(): Promise<FederationProfile[]>;
  
  // All Embassy Profiles
  getAllEmbassyProfiles(): Promise<EmbassyProfile[]>;
  
  // Platform Stats
  getPlatformStats(): Promise<{
    totalUsers: number;
    totalTeams: number;
    totalPlayers: number;
    totalScouts: number;
    totalEmbassyUsers: number;
    totalFederationUsers: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async getTeamsByUser(userId: string): Promise<Team[]> {
    const user = await this.getUser(userId);
    if (!user?.teamId) return [];
    const team = await this.getTeam(user.teamId);
    return team ? [team] : [];
  }

  async getPlayers(teamId?: string): Promise<Player[]> {
    if (teamId) {
      return db.select().from(players).where(eq(players.teamId, teamId)).orderBy(desc(players.updatedAt));
    }
    return db.select().from(players).orderBy(desc(players.updatedAt));
  }

  async getPlayer(id: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const [newPlayer] = await db.insert(players).values(player).returning();
    return newPlayer;
  }

  async updatePlayer(id: string, updates: Partial<InsertPlayer>): Promise<Player | undefined> {
    const [player] = await db.update(players).set(updates).where(eq(players.id, id)).returning();
    return player;
  }

  async getPlayerMetrics(playerId: string): Promise<PlayerMetrics[]> {
    return db.select().from(playerMetrics).where(eq(playerMetrics.playerId, playerId));
  }

  async createPlayerMetrics(metrics: InsertPlayerMetrics): Promise<PlayerMetrics> {
    const [newMetrics] = await db.insert(playerMetrics).values(metrics).returning();
    return newMetrics;
  }

  async getVideos(playerId?: string): Promise<Video[]> {
    if (playerId) {
      return db.select().from(videos).where(eq(videos.playerId, playerId)).orderBy(desc(videos.uploadDate));
    }
    return db.select().from(videos).orderBy(desc(videos.uploadDate));
  }

  async getVideo(id: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const [newVideo] = await db.insert(videos).values(video).returning();
    return newVideo;
  }

  async updateVideo(id: string, updates: Partial<InsertVideo>): Promise<Video | undefined> {
    const [video] = await db.update(videos).set(updates).where(eq(videos.id, id)).returning();
    return video;
  }

  async getVideoInsights(videoId: string): Promise<VideoInsights | undefined> {
    const [insights] = await db.select().from(videoInsights).where(eq(videoInsights.videoId, videoId));
    return insights;
  }

  async createVideoInsights(insights: InsertVideoInsights): Promise<VideoInsights> {
    const [newInsights] = await db.insert(videoInsights).values(insights).returning();
    return newInsights;
  }

  async getEligibilityScores(playerId: string): Promise<EligibilityScore[]> {
    return db.select().from(eligibilityScores).where(eq(eligibilityScores.playerId, playerId));
  }

  async createEligibilityScore(score: InsertEligibilityScore): Promise<EligibilityScore> {
    const [newScore] = await db.insert(eligibilityScores).values(score).returning();
    return newScore;
  }

  async getTransferEligibilityAssessment(playerId: string): Promise<TransferEligibilityAssessment | undefined> {
    const [assessment] = await db.select().from(transferEligibilityAssessments)
      .where(eq(transferEligibilityAssessments.playerId, playerId))
      .orderBy(desc(transferEligibilityAssessments.calculatedAt))
      .limit(1);
    return assessment;
  }

  async createTransferEligibilityAssessment(assessment: InsertTransferEligibilityAssessment): Promise<TransferEligibilityAssessment> {
    const [newAssessment] = await db.insert(transferEligibilityAssessments).values(assessment).returning();
    return newAssessment;
  }

  async updateTransferEligibilityAssessment(id: string, updates: Partial<InsertTransferEligibilityAssessment>): Promise<TransferEligibilityAssessment | undefined> {
    const [updated] = await db.update(transferEligibilityAssessments)
      .set(updates)
      .where(eq(transferEligibilityAssessments.id, id))
      .returning();
    return updated;
  }

  async getTransferReports(teamId: string): Promise<TransferReport[]> {
    return db.select().from(transferReports).where(eq(transferReports.teamId, teamId)).orderBy(desc(transferReports.generatedAt));
  }

  async getTransferReport(id: string): Promise<TransferReport | undefined> {
    const [report] = await db.select().from(transferReports).where(eq(transferReports.id, id));
    return report;
  }

  async getTransferReportsByPlayer(playerId: string): Promise<TransferReport[]> {
    return db.select().from(transferReports).where(eq(transferReports.playerId, playerId)).orderBy(desc(transferReports.generatedAt));
  }

  async getAllTransferReports(): Promise<TransferReport[]> {
    return db.select().from(transferReports).orderBy(desc(transferReports.generatedAt));
  }

  async createTransferReport(report: InsertTransferReport): Promise<TransferReport> {
    const [newReport] = await db.insert(transferReports).values(report).returning();
    return newReport;
  }

  async updateTransferReport(id: string, updates: Partial<InsertTransferReport>): Promise<TransferReport | undefined> {
    const [updated] = await db.update(transferReports).set(updates).where(eq(transferReports.id, id)).returning();
    return updated;
  }

  async deleteTransferReport(id: string): Promise<boolean> {
    const result = await db.delete(transferReports).where(eq(transferReports.id, id));
    return true;
  }

  async getComplianceOrders(teamId: string): Promise<ComplianceOrder[]> {
    return db.select().from(complianceOrders).where(eq(complianceOrders.teamId, teamId)).orderBy(desc(complianceOrders.createdAt));
  }

  async getComplianceOrder(id: string): Promise<ComplianceOrder | undefined> {
    const [order] = await db.select().from(complianceOrders).where(eq(complianceOrders.id, id));
    return order;
  }

  async createComplianceOrder(order: InsertComplianceOrder): Promise<ComplianceOrder> {
    const [newOrder] = await db.insert(complianceOrders).values(order).returning();
    return newOrder;
  }

  async updateComplianceOrder(id: string, updates: Partial<InsertComplianceOrder>): Promise<ComplianceOrder | undefined> {
    const [order] = await db.update(complianceOrders).set(updates).where(eq(complianceOrders.id, id)).returning();
    return order;
  }

  async getComplianceDocuments(orderId: string): Promise<ComplianceDocument[]> {
    return db.select().from(complianceDocuments).where(eq(complianceDocuments.orderId, orderId));
  }

  async getComplianceDocument(id: string): Promise<ComplianceDocument | undefined> {
    const [doc] = await db.select().from(complianceDocuments).where(eq(complianceDocuments.id, id));
    return doc;
  }

  async createComplianceDocument(doc: InsertComplianceDocument): Promise<ComplianceDocument> {
    const [newDoc] = await db.insert(complianceDocuments).values(doc).returning();
    return newDoc;
  }

  async getEmbassyVerifications(teamId?: string): Promise<EmbassyVerification[]> {
    return db.select().from(embassyVerifications).orderBy(desc(embassyVerifications.submittedAt));
  }

  async createEmbassyVerification(verification: InsertEmbassyVerification): Promise<EmbassyVerification> {
    const [newVerification] = await db.insert(embassyVerifications).values(verification).returning();
    return newVerification;
  }

  async updateEmbassyVerification(id: string, updates: Partial<InsertEmbassyVerification>): Promise<EmbassyVerification | undefined> {
    const [verification] = await db.update(embassyVerifications).set(updates).where(eq(embassyVerifications.id, id)).returning();
    return verification;
  }

  async getScoutingInquiries(teamId?: string): Promise<ScoutingInquiry[]> {
    return db.select().from(scoutingInquiries).orderBy(desc(scoutingInquiries.createdAt));
  }

  async createScoutingInquiry(inquiry: InsertScoutingInquiry): Promise<ScoutingInquiry> {
    const [newInquiry] = await db.insert(scoutingInquiries).values(inquiry).returning();
    return newInquiry;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.orderId, orderId));
    return payment;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async updatePayment(id: string, updates: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [payment] = await db.update(payments).set(updates).where(eq(payments.id, id)).returning();
    return payment;
  }

  async getClubs(): Promise<Club[]> {
    return db.select().from(clubs);
  }

  async getClub(id: string): Promise<Club | undefined> {
    const [club] = await db.select().from(clubs).where(eq(clubs.id, id));
    return club;
  }

  async createClub(club: InsertClub): Promise<Club> {
    const [newClub] = await db.insert(clubs).values(club).returning();
    return newClub;
  }

  async getMedicalRecords(playerId: string): Promise<MedicalRecord[]> {
    return db.select().from(medicalRecords).where(eq(medicalRecords.playerId, playerId));
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    const [newRecord] = await db.insert(medicalRecords).values(record).returning();
    return newRecord;
  }

  async getBiometricData(playerId: string): Promise<BiometricData[]> {
    return db.select().from(biometricData).where(eq(biometricData.playerId, playerId));
  }

  async createBiometricData(data: InsertBiometricData): Promise<BiometricData> {
    const [newData] = await db.insert(biometricData).values(data).returning();
    return newData;
  }

  async getEmbassyProfile(id: string): Promise<EmbassyProfile | undefined> {
    const [profile] = await db.select().from(embassyProfiles).where(eq(embassyProfiles.id, id));
    return profile;
  }

  async getEmbassyProfileByCountry(country: string): Promise<EmbassyProfile | undefined> {
    const [profile] = await db.select().from(embassyProfiles).where(eq(embassyProfiles.country, country));
    return profile;
  }

  async getEmbassyProfileByUserId(userId: string): Promise<EmbassyProfile | undefined> {
    const [profile] = await db.select().from(embassyProfiles).where(eq(embassyProfiles.userId, userId));
    return profile;
  }

  async createEmbassyProfile(profile: InsertEmbassyProfile): Promise<EmbassyProfile> {
    const [newProfile] = await db.insert(embassyProfiles).values(profile).returning();
    return newProfile;
  }

  async getInvitationLetters(playerId: string): Promise<InvitationLetter[]> {
    return db.select().from(invitationLetters).where(eq(invitationLetters.playerId, playerId)).orderBy(desc(invitationLetters.uploadedAt));
  }

  async getInvitationLetter(id: string): Promise<InvitationLetter | undefined> {
    const [letter] = await db.select().from(invitationLetters).where(eq(invitationLetters.id, id));
    return letter;
  }

  async createInvitationLetter(letter: InsertInvitationLetter): Promise<InvitationLetter> {
    const [newLetter] = await db.insert(invitationLetters).values(letter).returning();
    return newLetter;
  }

  async updateInvitationLetter(id: string, updates: Partial<InsertInvitationLetter>): Promise<InvitationLetter | undefined> {
    const [letter] = await db.update(invitationLetters).set(updates).where(eq(invitationLetters.id, id)).returning();
    return letter;
  }

  async deleteInvitationLetter(id: string): Promise<boolean> {
    const result = await db.delete(invitationLetters).where(eq(invitationLetters.id, id));
    return true;
  }

  async getAllInvitationLetters(teamId?: string): Promise<InvitationLetter[]> {
    if (teamId) {
      return db.select().from(invitationLetters).where(eq(invitationLetters.fromTeamId, teamId)).orderBy(desc(invitationLetters.uploadedAt));
    }
    return db.select().from(invitationLetters).orderBy(desc(invitationLetters.uploadedAt));
  }

  async getConsularReports(playerId: string): Promise<ConsularReport[]> {
    return db.select().from(consularReports).where(eq(consularReports.playerId, playerId)).orderBy(desc(consularReports.generatedAt));
  }

  async getConsularReport(id: string): Promise<ConsularReport | undefined> {
    const [report] = await db.select().from(consularReports).where(eq(consularReports.id, id));
    return report;
  }

  async getConsularReportByVerificationCode(code: string): Promise<ConsularReport | undefined> {
    const [report] = await db.select().from(consularReports).where(eq(consularReports.verificationCode, code));
    return report;
  }

  async createConsularReport(report: InsertConsularReport): Promise<ConsularReport> {
    const [newReport] = await db.insert(consularReports).values(report).returning();
    return newReport;
  }

  async updateConsularReport(id: string, updates: Partial<InsertConsularReport>): Promise<ConsularReport | undefined> {
    const [report] = await db.update(consularReports).set(updates).where(eq(consularReports.id, id)).returning();
    return report;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    const participantRecords = await db.select().from(conversationParticipants).where(eq(conversationParticipants.userId, userId));
    const conversationIds = participantRecords.map(p => p.conversationId);
    if (conversationIds.length === 0) return [];
    const results = [];
    for (const convId of conversationIds) {
      const [conv] = await db.select().from(conversations).where(eq(conversations.id, convId));
      if (conv) results.push(conv);
    }
    return results.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  async addConversationParticipant(participant: InsertConversationParticipant): Promise<ConversationParticipant> {
    const [newParticipant] = await db.insert(conversationParticipants).values(participant).returning();
    return newParticipant;
  }

  async getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]> {
    return db.select().from(conversationParticipants).where(eq(conversationParticipants.conversationId, conversationId));
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, message.conversationId));
    return newMessage;
  }

  async logEmbassyDocumentAccess(access: InsertEmbassyDocumentAccess): Promise<EmbassyDocumentAccess> {
    const [log] = await db.insert(embassyDocumentAccess).values(access).returning();
    return log;
  }

  async getEmbassyDocumentAccessLogs(documentId: string): Promise<EmbassyDocumentAccess[]> {
    return db.select().from(embassyDocumentAccess).where(eq(embassyDocumentAccess.documentId, documentId)).orderBy(desc(embassyDocumentAccess.accessedAt));
  }

  async shareVideo(share: InsertSharedVideo): Promise<SharedVideo> {
    const [sharedVideo] = await db.insert(sharedVideos).values(share).returning();
    return sharedVideo;
  }

  async getSharedVideos(userId: string): Promise<SharedVideo[]> {
    return db.select().from(sharedVideos).where(eq(sharedVideos.sharedWithUserId, userId)).orderBy(desc(sharedVideos.sharedAt));
  }

  async logAction(log: InsertActionLog): Promise<ActionLog> {
    const [actionLog] = await db.insert(actionLogs).values(log).returning();
    return actionLog;
  }

  async getActionLogs(entityType: string, entityId: string): Promise<ActionLog[]> {
    return db.select().from(actionLogs).where(and(eq(actionLogs.entityType, entityType), eq(actionLogs.entityId, entityId))).orderBy(desc(actionLogs.timestamp));
  }

  async createTransferTarget(target: InsertTransferTarget): Promise<TransferTarget> {
    const [newTarget] = await db.insert(transferTargets).values(target).returning();
    return newTarget;
  }

  async getTransferTargets(playerId: string): Promise<TransferTarget[]> {
    return db.select().from(transferTargets).where(eq(transferTargets.playerId, playerId)).orderBy(desc(transferTargets.createdAt));
  }

  async getTransferTarget(id: string): Promise<TransferTarget | undefined> {
    const [target] = await db.select().from(transferTargets).where(eq(transferTargets.id, id));
    return target;
  }

  async updateTransferTarget(id: string, updates: Partial<InsertTransferTarget>): Promise<TransferTarget | undefined> {
    const [target] = await db.update(transferTargets).set(updates).where(eq(transferTargets.id, id)).returning();
    return target;
  }

  async createVideoPlayerTag(tag: InsertVideoPlayerTag): Promise<VideoPlayerTag> {
    const [newTag] = await db.insert(videoPlayerTags).values(tag).returning();
    return newTag;
  }

  async getVideoPlayerTags(videoId: string): Promise<VideoPlayerTag[]> {
    return db.select().from(videoPlayerTags).where(eq(videoPlayerTags.videoId, videoId)).orderBy(desc(videoPlayerTags.createdAt));
  }

  async getVideoPlayerTagsForPlayer(playerId: string): Promise<Array<VideoPlayerTag & { video: Video | null }>> {
    const rows = await db.select({
      tag: videoPlayerTags,
      video: videos
    })
    .from(videoPlayerTags)
    .leftJoin(videos, eq(videoPlayerTags.videoId, videos.id))
    .where(eq(videoPlayerTags.playerId, playerId));
    
    return rows.map(row => ({
      ...row.tag,
      video: row.video
    }));
  }

  async getVideoPlayerTag(id: string): Promise<VideoPlayerTag | undefined> {
    const [tag] = await db.select().from(videoPlayerTags).where(eq(videoPlayerTags.id, id));
    return tag;
  }

  async updateVideoPlayerTag(id: string, updates: Partial<InsertVideoPlayerTag>): Promise<VideoPlayerTag | undefined> {
    const [tag] = await db.update(videoPlayerTags).set(updates).where(eq(videoPlayerTags.id, id)).returning();
    return tag;
  }

  async deleteVideoPlayerTag(id: string): Promise<void> {
    await db.delete(videoPlayerTags).where(eq(videoPlayerTags.id, id));
  }

  async getPlayerVideoMinutes(playerId: string): Promise<number> {
    const tags = await db.select().from(videoPlayerTags).where(eq(videoPlayerTags.playerId, playerId));
    return tags.reduce((total, tag) => total + (tag.minutesPlayed || 0), 0);
  }

  async getPlayerInternationalRecords(playerId: string): Promise<PlayerInternationalRecord[]> {
    return db.select().from(playerInternationalRecords).where(eq(playerInternationalRecords.playerId, playerId)).orderBy(desc(playerInternationalRecords.createdAt));
  }

  async getPlayerInternationalRecord(id: string): Promise<PlayerInternationalRecord | undefined> {
    const [record] = await db.select().from(playerInternationalRecords).where(eq(playerInternationalRecords.id, id));
    return record;
  }

  async createPlayerInternationalRecord(record: InsertPlayerInternationalRecord): Promise<PlayerInternationalRecord> {
    const [newRecord] = await db.insert(playerInternationalRecords).values(record).returning();
    return newRecord;
  }

  async updatePlayerInternationalRecord(id: string, updates: Partial<InsertPlayerInternationalRecord>): Promise<PlayerInternationalRecord | undefined> {
    const [record] = await db.update(playerInternationalRecords).set({ ...updates, updatedAt: new Date() }).where(eq(playerInternationalRecords.id, id)).returning();
    return record;
  }

  async deletePlayerInternationalRecord(id: string): Promise<void> {
    await db.delete(playerInternationalRecords).where(eq(playerInternationalRecords.id, id));
  }

  async getTeamSheets(teamId: string): Promise<TeamSheet[]> {
    return db.select().from(teamSheets).where(eq(teamSheets.teamId, teamId)).orderBy(desc(teamSheets.createdAt));
  }

  async getTeamSheet(id: string): Promise<TeamSheet | undefined> {
    const [sheet] = await db.select().from(teamSheets).where(eq(teamSheets.id, id));
    return sheet;
  }

  async createTeamSheet(sheet: InsertTeamSheet): Promise<TeamSheet> {
    const [newSheet] = await db.insert(teamSheets).values(sheet).returning();
    return newSheet;
  }

  async updateTeamSheet(id: string, updates: Partial<InsertTeamSheet>): Promise<TeamSheet | undefined> {
    const [sheet] = await db.update(teamSheets).set({ ...updates, updatedAt: new Date() }).where(eq(teamSheets.id, id)).returning();
    return sheet;
  }

  async deleteTeamSheet(id: string): Promise<void> {
    await db.delete(teamSheetPlayers).where(eq(teamSheetPlayers.teamSheetId, id));
    await db.delete(teamSheets).where(eq(teamSheets.id, id));
  }

  async getTeamSheetPlayers(teamSheetId: string): Promise<TeamSheetPlayer[]> {
    return db.select().from(teamSheetPlayers).where(eq(teamSheetPlayers.teamSheetId, teamSheetId)).orderBy(teamSheetPlayers.positionOrder);
  }

  async createTeamSheetPlayer(player: InsertTeamSheetPlayer): Promise<TeamSheetPlayer> {
    const [newPlayer] = await db.insert(teamSheetPlayers).values(player).returning();
    return newPlayer;
  }

  async updateTeamSheetPlayer(id: string, updates: Partial<InsertTeamSheetPlayer>): Promise<TeamSheetPlayer | undefined> {
    const [player] = await db.update(teamSheetPlayers).set(updates).where(eq(teamSheetPlayers.id, id)).returning();
    return player;
  }

  async deleteTeamSheetPlayer(id: string): Promise<void> {
    await db.delete(teamSheetPlayers).where(eq(teamSheetPlayers.id, id));
  }

  async deleteTeamSheetPlayersBySheet(teamSheetId: string): Promise<void> {
    await db.delete(teamSheetPlayers).where(eq(teamSheetPlayers.teamSheetId, teamSheetId));
  }

  async getPlayerDocuments(playerId: string): Promise<PlayerDocument[]> {
    return db.select().from(playerDocuments).where(eq(playerDocuments.playerId, playerId)).orderBy(desc(playerDocuments.uploadedAt));
  }

  async getPlayerDocument(id: string): Promise<PlayerDocument | undefined> {
    const [doc] = await db.select().from(playerDocuments).where(eq(playerDocuments.id, id));
    return doc;
  }

  async createPlayerDocument(doc: InsertPlayerDocument): Promise<PlayerDocument> {
    const [newDoc] = await db.insert(playerDocuments).values(doc).returning();
    return newDoc;
  }

  async updatePlayerDocument(id: string, updates: Partial<InsertPlayerDocument>): Promise<PlayerDocument | undefined> {
    const [doc] = await db.update(playerDocuments).set(updates).where(eq(playerDocuments.id, id)).returning();
    return doc;
  }

  async deletePlayerDocument(id: string): Promise<void> {
    await db.delete(playerDocuments).where(eq(playerDocuments.id, id));
  }

  async getFederationLetterRequests(teamId?: string): Promise<FederationLetterRequest[]> {
    if (teamId) {
      return db.select().from(federationLetterRequests).where(eq(federationLetterRequests.teamId, teamId)).orderBy(desc(federationLetterRequests.createdAt));
    }
    return db.select().from(federationLetterRequests).orderBy(desc(federationLetterRequests.createdAt));
  }

  async getFederationLetterRequest(id: string): Promise<FederationLetterRequest | undefined> {
    const [request] = await db.select().from(federationLetterRequests).where(eq(federationLetterRequests.id, id));
    return request;
  }

  async getFederationLetterRequestByNumber(requestNumber: string): Promise<FederationLetterRequest | undefined> {
    const [request] = await db.select().from(federationLetterRequests).where(eq(federationLetterRequests.requestNumber, requestNumber));
    return request;
  }

  async createFederationLetterRequest(request: InsertFederationLetterRequest): Promise<FederationLetterRequest> {
    const [newRequest] = await db.insert(federationLetterRequests).values(request).returning();
    return newRequest;
  }

  async updateFederationLetterRequest(id: string, updates: Partial<InsertFederationLetterRequest>): Promise<FederationLetterRequest | undefined> {
    const [request] = await db.update(federationLetterRequests).set({ ...updates, updatedAt: new Date() }).where(eq(federationLetterRequests.id, id)).returning();
    return request;
  }

  async deleteFederationLetterRequest(id: string): Promise<void> {
    await db.delete(federationLetterRequests).where(eq(federationLetterRequests.id, id));
  }

  async getFederationLetterRequestsByPlayer(playerId: string): Promise<FederationLetterRequest[]> {
    return db.select().from(federationLetterRequests).where(eq(federationLetterRequests.playerId, playerId)).orderBy(desc(federationLetterRequests.createdAt));
  }

  async getIssuedFederationLettersByPlayer(playerId: string): Promise<FederationLetterRequest[]> {
    return db.select().from(federationLetterRequests).where(
      and(eq(federationLetterRequests.playerId, playerId), eq(federationLetterRequests.status, "issued"))
    ).orderBy(desc(federationLetterRequests.issuedAt));
  }

  async getAllIssuedFederationLetters(): Promise<FederationLetterRequest[]> {
    return db.select().from(federationLetterRequests).where(
      eq(federationLetterRequests.status, "issued")
    ).orderBy(desc(federationLetterRequests.issuedAt));
  }

  async getFederationLetterRequestsByStatus(status: string): Promise<FederationLetterRequest[]> {
    return db.select().from(federationLetterRequests).where(eq(federationLetterRequests.status, status)).orderBy(desc(federationLetterRequests.createdAt));
  }

  async getFederationProfiles(): Promise<FederationProfile[]> {
    return db.select().from(federationProfiles).orderBy(desc(federationProfiles.createdAt));
  }

  async getFederationProfile(id: string): Promise<FederationProfile | undefined> {
    const [profile] = await db.select().from(federationProfiles).where(eq(federationProfiles.id, id));
    return profile;
  }

  async getFederationProfileByCountry(country: string): Promise<FederationProfile | undefined> {
    const [profile] = await db.select().from(federationProfiles).where(eq(federationProfiles.country, country));
    return profile;
  }

  async createFederationProfile(profile: InsertFederationProfile): Promise<FederationProfile> {
    const [newProfile] = await db.insert(federationProfiles).values(profile).returning();
    return newProfile;
  }

  async updateFederationProfile(id: string, updates: Partial<InsertFederationProfile>): Promise<FederationProfile | undefined> {
    const [profile] = await db.update(federationProfiles).set({ ...updates, updatedAt: new Date() }).where(eq(federationProfiles.id, id)).returning();
    return profile;
  }

  async getFederationFeeSchedules(federationId: string): Promise<FederationFeeSchedule[]> {
    return db.select().from(federationFeeSchedules).where(eq(federationFeeSchedules.federationId, federationId)).orderBy(desc(federationFeeSchedules.createdAt));
  }

  async getAllFederationFeeSchedules(): Promise<FederationFeeSchedule[]> {
    return db.select().from(federationFeeSchedules).orderBy(desc(federationFeeSchedules.createdAt));
  }

  async getFederationFeeScheduleByCountry(federationId: string, country: string): Promise<FederationFeeSchedule | undefined> {
    const [schedule] = await db.select().from(federationFeeSchedules).where(
      and(eq(federationFeeSchedules.federationId, federationId), eq(federationFeeSchedules.country, country), eq(federationFeeSchedules.isActive, true))
    );
    return schedule;
  }

  async createFederationFeeSchedule(schedule: InsertFederationFeeSchedule): Promise<FederationFeeSchedule> {
    const [newSchedule] = await db.insert(federationFeeSchedules).values(schedule).returning();
    return newSchedule;
  }

  async updateFederationFeeSchedule(id: string, updates: Partial<InsertFederationFeeSchedule>): Promise<FederationFeeSchedule | undefined> {
    const [schedule] = await db.update(federationFeeSchedules).set({ ...updates, updatedAt: new Date() }).where(eq(federationFeeSchedules.id, id)).returning();
    return schedule;
  }

  async deleteFederationFeeSchedule(id: string): Promise<void> {
    await db.delete(federationFeeSchedules).where(eq(federationFeeSchedules.id, id));
  }

  async getFederationRequestActivities(requestId: string): Promise<FederationRequestActivity[]> {
    return db.select().from(federationRequestActivities).where(eq(federationRequestActivities.requestId, requestId)).orderBy(desc(federationRequestActivities.timestamp));
  }

  async createFederationRequestActivity(activity: InsertFederationRequestActivity): Promise<FederationRequestActivity> {
    const [newActivity] = await db.insert(federationRequestActivities).values(activity).returning();
    return newActivity;
  }

  async getFederationDashboardStats(federationId?: string): Promise<{ totalRequests: number; processed: number; pending: number; totalRevenue: number }> {
    const allRequests = await db.select().from(federationLetterRequests);
    const processed = allRequests.filter(r => r.status === 'issued').length;
    const pending = allRequests.filter(r => r.status === 'submitted' || r.status === 'processing').length;
    const totalRevenue = allRequests.filter(r => r.status === 'issued').reduce((sum, r) => sum + (r.feeAmount || 0), 0);
    return { totalRequests: allRequests.length, processed, pending, totalRevenue };
  }

  async getFederationRequestMessages(requestId: string): Promise<FederationRequestMessage[]> {
    return db.select().from(federationRequestMessages).where(eq(federationRequestMessages.requestId, requestId)).orderBy(desc(federationRequestMessages.createdAt));
  }

  async getUnreadMessagesForPortal(portal: string): Promise<FederationRequestMessage[]> {
    return db.select().from(federationRequestMessages).where(
      and(eq(federationRequestMessages.recipientPortal, portal), eq(federationRequestMessages.isRead, false))
    ).orderBy(desc(federationRequestMessages.createdAt));
  }

  async createFederationRequestMessage(message: InsertFederationRequestMessage): Promise<FederationRequestMessage> {
    const [newMessage] = await db.insert(federationRequestMessages).values(message).returning();
    return newMessage;
  }

  async markMessageAsRead(id: string): Promise<FederationRequestMessage | undefined> {
    const [message] = await db.update(federationRequestMessages)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(federationRequestMessages.id, id))
      .returning();
    return message;
  }

  async getFederationIssuedDocuments(requestId: string): Promise<FederationIssuedDocument[]> {
    return db.select().from(federationIssuedDocuments).where(eq(federationIssuedDocuments.requestId, requestId)).orderBy(desc(federationIssuedDocuments.createdAt));
  }

  async createFederationIssuedDocument(document: InsertFederationIssuedDocument): Promise<FederationIssuedDocument> {
    const [newDoc] = await db.insert(federationIssuedDocuments).values(document).returning();
    return newDoc;
  }

  async incrementDocumentDownloadCount(id: string): Promise<void> {
    const [doc] = await db.select().from(federationIssuedDocuments).where(eq(federationIssuedDocuments.id, id));
    if (doc) {
      await db.update(federationIssuedDocuments)
        .set({ downloadCount: (doc.downloadCount || 0) + 1, lastDownloadedAt: new Date() })
        .where(eq(federationIssuedDocuments.id, id));
    }
  }

  async getRequestWithFullHistory(requestId: string): Promise<{
    request: FederationLetterRequest | undefined;
    activities: FederationRequestActivity[];
    messages: FederationRequestMessage[];
    documents: FederationIssuedDocument[];
  }> {
    const [request] = await db.select().from(federationLetterRequests).where(eq(federationLetterRequests.id, requestId));
    const activities = await this.getFederationRequestActivities(requestId);
    const messagesList = await this.getFederationRequestMessages(requestId);
    const documents = await this.getFederationIssuedDocuments(requestId);
    return { request, activities, messages: messagesList, documents };
  }

  async logFederationActivity(
    requestId: string,
    activityType: string,
    description: string,
    actorId?: string,
    actorName?: string,
    actorRole?: string,
    previousStatus?: string,
    newStatus?: string,
    metadata?: Record<string, any>
  ): Promise<FederationRequestActivity> {
    return this.createFederationRequestActivity({
      requestId,
      activityType,
      description,
      actorId,
      actorName,
      actorRole,
      previousStatus,
      newStatus,
      metadata
    });
  }

  async getScoutShortlist(scoutId: string): Promise<ScoutShortlist[]> {
    return db.select().from(scoutShortlists).where(eq(scoutShortlists.scoutId, scoutId)).orderBy(desc(scoutShortlists.addedAt));
  }

  async getScoutShortlistWithPlayers(scoutId: string): Promise<Array<ScoutShortlist & { player: Player }>> {
    const shortlistEntries = await db.select().from(scoutShortlists).where(eq(scoutShortlists.scoutId, scoutId)).orderBy(desc(scoutShortlists.addedAt));
    const results: Array<ScoutShortlist & { player: Player }> = [];
    for (const entry of shortlistEntries) {
      const [player] = await db.select().from(players).where(eq(players.id, entry.playerId));
      if (player) {
        results.push({ ...entry, player });
      }
    }
    return results;
  }

  async addToShortlist(shortlist: InsertScoutShortlist): Promise<ScoutShortlist> {
    const [entry] = await db.insert(scoutShortlists).values(shortlist).returning();
    return entry;
  }

  async updateShortlistPriority(id: string, priority: string, notes?: string): Promise<ScoutShortlist | undefined> {
    const updates: Partial<InsertScoutShortlist> = { priority };
    if (notes !== undefined) {
      updates.notes = notes;
    }
    const [entry] = await db.update(scoutShortlists).set(updates).where(eq(scoutShortlists.id, id)).returning();
    return entry;
  }

  async removeFromShortlist(id: string): Promise<void> {
    await db.delete(scoutShortlists).where(eq(scoutShortlists.id, id));
  }

  async getShortlistEntry(scoutId: string, playerId: string): Promise<ScoutShortlist | undefined> {
    const [entry] = await db.select().from(scoutShortlists).where(
      and(eq(scoutShortlists.scoutId, scoutId), eq(scoutShortlists.playerId, playerId))
    );
    return entry;
  }

  // Token System Methods
  async getTokenBalance(userId: string): Promise<TokenBalance | undefined> {
    const [balance] = await db.select().from(tokenBalances).where(eq(tokenBalances.userId, userId));
    return balance;
  }

  async createTokenBalance(balance: InsertTokenBalance): Promise<TokenBalance> {
    const [newBalance] = await db.insert(tokenBalances).values(balance).returning();
    return newBalance;
  }

  async updateTokenBalance(userId: string, balance: number, lifetimePurchased?: number, lifetimeSpent?: number): Promise<TokenBalance | undefined> {
    const updates: any = { balance, updatedAt: new Date() };
    if (lifetimePurchased !== undefined) updates.lifetimePurchased = lifetimePurchased;
    if (lifetimeSpent !== undefined) updates.lifetimeSpent = lifetimeSpent;
    const [updated] = await db.update(tokenBalances).set(updates).where(eq(tokenBalances.userId, userId)).returning();
    return updated;
  }

  async getTokenTransactions(userId: string, limit?: number): Promise<TokenTransaction[]> {
    const query = db.select().from(tokenTransactions).where(eq(tokenTransactions.userId, userId)).orderBy(desc(tokenTransactions.createdAt));
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  async createTokenTransaction(transaction: InsertTokenTransaction): Promise<TokenTransaction> {
    const [newTransaction] = await db.insert(tokenTransactions).values(transaction).returning();
    return newTransaction;
  }

  async getTokenPacks(): Promise<TokenPack[]> {
    return db.select().from(tokenPacks).where(eq(tokenPacks.isActive, true)).orderBy(tokenPacks.sortOrder);
  }

  async getTokenPack(id: string): Promise<TokenPack | undefined> {
    const [pack] = await db.select().from(tokenPacks).where(eq(tokenPacks.id, id));
    return pack;
  }

  async createTokenPack(pack: InsertTokenPack): Promise<TokenPack> {
    const [newPack] = await db.insert(tokenPacks).values(pack).returning();
    return newPack;
  }

  async getTokenPurchases(userId: string): Promise<TokenPurchase[]> {
    return db.select().from(tokenPurchases).where(eq(tokenPurchases.userId, userId)).orderBy(desc(tokenPurchases.createdAt));
  }

  async createTokenPurchase(purchase: InsertTokenPurchase): Promise<TokenPurchase> {
    const [newPurchase] = await db.insert(tokenPurchases).values(purchase).returning();
    return newPurchase;
  }

  async updateTokenPurchase(id: string, updates: Partial<InsertTokenPurchase>): Promise<TokenPurchase | undefined> {
    const [updated] = await db.update(tokenPurchases).set(updates).where(eq(tokenPurchases.id, id)).returning();
    return updated;
  }

  async createPlayerShareLink(link: InsertPlayerShareLink): Promise<PlayerShareLink> {
    const [newLink] = await db.insert(playerShareLinks).values(link).returning();
    return newLink;
  }

  async getPlayerShareLinks(playerId: string): Promise<PlayerShareLink[]> {
    return db.select().from(playerShareLinks).where(eq(playerShareLinks.playerId, playerId)).orderBy(desc(playerShareLinks.createdAt));
  }

  async getPlayerShareLinkByToken(shareToken: string): Promise<PlayerShareLink | undefined> {
    const [link] = await db.select().from(playerShareLinks).where(eq(playerShareLinks.shareToken, shareToken));
    return link;
  }

  async incrementShareLinkViewCount(id: string): Promise<void> {
    const link = await this.getPlayerShareLinkByToken(id);
    if (link) {
      await db.update(playerShareLinks)
        .set({ viewCount: (link.viewCount || 0) + 1 })
        .where(eq(playerShareLinks.id, id));
    }
  }

  async getPublishedPlayers(): Promise<Player[]> {
    return db.select().from(players).where(eq(players.isPublishedToScouts, true));
  }

  // Embassy Notifications
  async createEmbassyNotification(notification: InsertEmbassyNotification): Promise<EmbassyNotification> {
    const [newNotification] = await db.insert(embassyNotifications).values(notification).returning();
    return newNotification;
  }

  async getEmbassyNotifications(embassyCountry?: string): Promise<EmbassyNotification[]> {
    if (embassyCountry) {
      return db.select().from(embassyNotifications).where(eq(embassyNotifications.embassyCountry, embassyCountry)).orderBy(desc(embassyNotifications.createdAt));
    }
    return db.select().from(embassyNotifications).orderBy(desc(embassyNotifications.createdAt));
  }

  async getEmbassyNotification(id: string): Promise<EmbassyNotification | undefined> {
    const [notification] = await db.select().from(embassyNotifications).where(eq(embassyNotifications.id, id));
    return notification;
  }

  async updateEmbassyNotification(id: string, updates: Partial<InsertEmbassyNotification>): Promise<EmbassyNotification | undefined> {
    const [updated] = await db.update(embassyNotifications).set(updates).where(eq(embassyNotifications.id, id)).returning();
    return updated;
  }

  async getEmbassyNotifiedLetters(embassyCountry: string): Promise<InvitationLetter[]> {
    const normalizedCountry = embassyCountry.toLowerCase().replace(/\s+/g, '_');
    return db.select().from(invitationLetters).where(
      and(
        or(
          eq(invitationLetters.targetCountry, embassyCountry),
          eq(invitationLetters.targetCountry, normalizedCountry)
        ),
        eq(invitationLetters.embassyNotificationStatus, "notified")
      )
    ).orderBy(desc(invitationLetters.embassyNotifiedAt));
  }

  async getAllEmbassyNotifiedLetters(): Promise<InvitationLetter[]> {
    return db.select().from(invitationLetters).where(
      eq(invitationLetters.embassyNotificationStatus, "notified")
    ).orderBy(desc(invitationLetters.embassyNotifiedAt));
  }

  // Document Verification
  async createDocumentVerification(verification: InsertDocumentVerification): Promise<DocumentVerification> {
    const [newVerification] = await db.insert(documentVerifications).values(verification).returning();
    return newVerification;
  }

  async getDocumentVerification(documentType: string, documentId: string): Promise<DocumentVerification | undefined> {
    const [verification] = await db.select().from(documentVerifications).where(
      and(
        eq(documentVerifications.documentType, documentType),
        eq(documentVerifications.documentId, documentId)
      )
    );
    return verification;
  }

  async updateDocumentVerification(id: string, updates: Partial<InsertDocumentVerification>): Promise<DocumentVerification | undefined> {
    const [updated] = await db.update(documentVerifications).set(updates).where(eq(documentVerifications.id, id)).returning();
    return updated;
  }

  // Document Version Control
  async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    return db.select().from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.versionNumber));
  }

  async getDocumentVersion(id: string): Promise<DocumentVersion | undefined> {
    const [version] = await db.select().from(documentVersions).where(eq(documentVersions.id, id));
    return version;
  }

  async getCurrentDocumentVersion(documentId: string): Promise<DocumentVersion | undefined> {
    const [version] = await db.select().from(documentVersions)
      .where(and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.isCurrent, true)
      ));
    return version;
  }

  async createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion> {
    const [newVersion] = await db.insert(documentVersions).values(version).returning();
    return newVersion;
  }

  async setCurrentVersion(documentId: string, versionId: string): Promise<void> {
    await db.update(documentVersions)
      .set({ isCurrent: false })
      .where(eq(documentVersions.documentId, documentId));
    await db.update(documentVersions)
      .set({ isCurrent: true })
      .where(eq(documentVersions.id, versionId));
  }

  // Document Audit Logs
  async getDocumentAuditLogs(documentId: string): Promise<DocumentAuditLog[]> {
    return db.select().from(documentAuditLogs)
      .where(eq(documentAuditLogs.documentId, documentId))
      .orderBy(desc(documentAuditLogs.timestamp));
  }

  async getDocumentAuditLogsByPlayer(playerId: string): Promise<DocumentAuditLog[]> {
    return db.select().from(documentAuditLogs)
      .where(eq(documentAuditLogs.playerId, playerId))
      .orderBy(desc(documentAuditLogs.timestamp));
  }

  async getDocumentAuditLogsByTeam(teamId: string, limit?: number): Promise<DocumentAuditLog[]> {
    const query = db.select().from(documentAuditLogs)
      .where(eq(documentAuditLogs.teamId, teamId))
      .orderBy(desc(documentAuditLogs.timestamp));
    
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  async createDocumentAuditLog(log: InsertDocumentAuditLog): Promise<DocumentAuditLog> {
    const [newLog] = await db.insert(documentAuditLogs).values(log).returning();
    return newLog;
  }
  
  // ==================== PLATFORM ADMIN PORTAL ====================
  
  // User Management
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role)).orderBy(desc(users.createdAt));
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
  
  // Password Reset
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [newToken] = await db.insert(passwordResetTokens).values(token).returning();
    return newToken;
  }
  
  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  }
  
  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }
  
  // Admin Message Inbox
  async getAdminMessages(status?: string, limit?: number): Promise<AdminMessageInbox[]> {
    let query = db.select().from(adminMessageInbox).orderBy(desc(adminMessageInbox.createdAt));
    if (status) {
      query = db.select().from(adminMessageInbox)
        .where(eq(adminMessageInbox.status, status))
        .orderBy(desc(adminMessageInbox.createdAt));
    }
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }
  
  async getAdminMessage(id: string): Promise<AdminMessageInbox | undefined> {
    const [message] = await db.select().from(adminMessageInbox).where(eq(adminMessageInbox.id, id));
    return message;
  }
  
  async createAdminMessage(message: InsertAdminMessageInbox): Promise<AdminMessageInbox> {
    const [newMessage] = await db.insert(adminMessageInbox).values(message).returning();
    return newMessage;
  }
  
  async updateAdminMessage(id: string, updates: Partial<InsertAdminMessageInbox>): Promise<AdminMessageInbox | undefined> {
    const [updated] = await db.update(adminMessageInbox).set(updates).where(eq(adminMessageInbox.id, id)).returning();
    return updated;
  }
  
  // Platform Metrics
  async getPlatformMetrics(startDate?: string, endDate?: string): Promise<PlatformMetrics[]> {
    if (startDate && endDate) {
      return db.select().from(platformMetrics)
        .where(and(
          sql`${platformMetrics.metricDate} >= ${startDate}`,
          sql`${platformMetrics.metricDate} <= ${endDate}`
        ))
        .orderBy(desc(platformMetrics.metricDate));
    }
    return db.select().from(platformMetrics).orderBy(desc(platformMetrics.metricDate)).limit(30);
  }
  
  async getLatestPlatformMetrics(): Promise<PlatformMetrics | undefined> {
    const [metrics] = await db.select().from(platformMetrics).orderBy(desc(platformMetrics.metricDate)).limit(1);
    return metrics;
  }
  
  async createPlatformMetrics(metrics: InsertPlatformMetrics): Promise<PlatformMetrics> {
    const [newMetrics] = await db.insert(platformMetrics).values(metrics).returning();
    return newMetrics;
  }
  
  // GDPR Requests
  async getGdprRequests(status?: string): Promise<GdprRequest[]> {
    if (status) {
      return db.select().from(gdprRequests)
        .where(eq(gdprRequests.status, status))
        .orderBy(desc(gdprRequests.createdAt));
    }
    return db.select().from(gdprRequests).orderBy(desc(gdprRequests.createdAt));
  }
  
  async getGdprRequest(id: string): Promise<GdprRequest | undefined> {
    const [request] = await db.select().from(gdprRequests).where(eq(gdprRequests.id, id));
    return request;
  }
  
  async getGdprRequestsByUser(userId: string): Promise<GdprRequest[]> {
    return db.select().from(gdprRequests)
      .where(eq(gdprRequests.userId, userId))
      .orderBy(desc(gdprRequests.createdAt));
  }
  
  async createGdprRequest(request: InsertGdprRequest): Promise<GdprRequest> {
    const [newRequest] = await db.insert(gdprRequests).values(request).returning();
    return newRequest;
  }
  
  async updateGdprRequest(id: string, updates: Partial<InsertGdprRequest>): Promise<GdprRequest | undefined> {
    const [updated] = await db.update(gdprRequests).set(updates).where(eq(gdprRequests.id, id)).returning();
    return updated;
  }
  
  // User Consents
  async getUserConsents(userId: string): Promise<UserConsent[]> {
    return db.select().from(userConsents)
      .where(eq(userConsents.userId, userId))
      .orderBy(desc(userConsents.consentedAt));
  }
  
  async createUserConsent(consent: InsertUserConsent): Promise<UserConsent> {
    const [newConsent] = await db.insert(userConsents).values(consent).returning();
    return newConsent;
  }
  
  async updateUserConsentWithdrawn(id: string): Promise<UserConsent | undefined> {
    const [updated] = await db.update(userConsents)
      .set({ withdrawnAt: new Date() })
      .where(eq(userConsents.id, id))
      .returning();
    return updated;
  }
  
  // Platform Audit Logs
  async getPlatformAuditLogs(category?: string, limit?: number, offset?: number): Promise<PlatformAuditLog[]> {
    let query;
    if (category) {
      query = db.select().from(platformAuditLogs)
        .where(eq(platformAuditLogs.category, category))
        .orderBy(desc(platformAuditLogs.timestamp));
    } else {
      query = db.select().from(platformAuditLogs).orderBy(desc(platformAuditLogs.timestamp));
    }
    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.offset(offset);
    }
    return query;
  }
  
  async createPlatformAuditLog(log: InsertPlatformAuditLog): Promise<PlatformAuditLog> {
    const [newLog] = await db.insert(platformAuditLogs).values(log).returning();
    return newLog;
  }
  
  // User Sessions
  async getUserSessions(userId: string): Promise<UserSession[]> {
    return db.select().from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.startedAt));
  }
  
  async getActiveSessions(): Promise<UserSession[]> {
    return db.select().from(userSessions)
      .where(eq(userSessions.isActive, true))
      .orderBy(desc(userSessions.lastActivityAt));
  }
  
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const [newSession] = await db.insert(userSessions).values(session).returning();
    return newSession;
  }
  
  async updateUserSessionActivity(id: string): Promise<UserSession | undefined> {
    const [updated] = await db.update(userSessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(userSessions.id, id))
      .returning();
    return updated;
  }
  
  async endUserSession(id: string): Promise<void> {
    await db.update(userSessions)
      .set({ endedAt: new Date(), isActive: false })
      .where(eq(userSessions.id, id));
  }
  
  // Federation Payment History
  async getFederationPaymentHistory(federationId?: string): Promise<FederationPaymentHistory[]> {
    if (federationId) {
      return db.select().from(federationPaymentHistory)
        .where(eq(federationPaymentHistory.federationId, federationId))
        .orderBy(desc(federationPaymentHistory.createdAt));
    }
    return db.select().from(federationPaymentHistory).orderBy(desc(federationPaymentHistory.createdAt));
  }
  
  async getAllFederationPayments(limit?: number): Promise<FederationPaymentHistory[]> {
    const query = db.select().from(federationPaymentHistory).orderBy(desc(federationPaymentHistory.createdAt));
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }
  
  async createFederationPayment(payment: InsertFederationPaymentHistory): Promise<FederationPaymentHistory> {
    const [newPayment] = await db.insert(federationPaymentHistory).values(payment).returning();
    return newPayment;
  }
  
  async updateFederationPayment(id: string, updates: Partial<InsertFederationPaymentHistory>): Promise<FederationPaymentHistory | undefined> {
    const [updated] = await db.update(federationPaymentHistory).set(updates).where(eq(federationPaymentHistory.id, id)).returning();
    return updated;
  }
  
  // All Federations
  async getAllFederationProfiles(): Promise<FederationProfile[]> {
    return db.select().from(federationProfiles).orderBy(desc(federationProfiles.createdAt));
  }
  
  // All Embassy Profiles
  async getAllEmbassyProfiles(): Promise<EmbassyProfile[]> {
    return db.select().from(embassyProfiles).orderBy(desc(embassyProfiles.createdAt));
  }
  
  // Platform Stats
  async getPlatformStats(): Promise<{
    totalUsers: number;
    totalTeams: number;
    totalPlayers: number;
    totalScouts: number;
    totalEmbassyUsers: number;
    totalFederationUsers: number;
  }> {
    const [userStats] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [teamStats] = await db.select({ count: sql<number>`count(*)` }).from(teams);
    const [playerStats] = await db.select({ count: sql<number>`count(*)` }).from(players);
    const [scoutStats] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'scout'));
    const [embassyStats] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'embassy'));
    const [federationStats] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'federation'));
    
    return {
      totalUsers: Number(userStats.count),
      totalTeams: Number(teamStats.count),
      totalPlayers: Number(playerStats.count),
      totalScouts: Number(scoutStats.count),
      totalEmbassyUsers: Number(embassyStats.count),
      totalFederationUsers: Number(federationStats.count),
    };
  }
}

export const storage = new DatabaseStorage();
