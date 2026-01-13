import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import {
  type PlayerDocument,
  type InsertPlayerDocument,
  type DocumentVersion,
  type InsertDocumentVersion,
  type DocumentAuditLog,
  type InsertDocumentAuditLog,
  type DocumentVerification,
  type InsertDocumentVerification,
  playerDocuments,
  documentVersions,
  documentAuditLogs,
  documentVerifications,
} from "@shared/schema";

export const documentsRepository = {
  // Player Documents
  async getPlayerDocuments(playerId: string): Promise<PlayerDocument[]> {
    return db
      .select()
      .from(playerDocuments)
      .where(eq(playerDocuments.playerId, playerId));
  },

  async getPlayerDocument(id: string): Promise<PlayerDocument | undefined> {
    const [doc] = await db
      .select()
      .from(playerDocuments)
      .where(eq(playerDocuments.id, id));
    return doc;
  },

  async createPlayerDocument(
    doc: InsertPlayerDocument
  ): Promise<PlayerDocument> {
    const [newDoc] = await db.insert(playerDocuments).values(doc).returning();
    return newDoc;
  },

  async updatePlayerDocument(
    id: string,
    updates: Partial<InsertPlayerDocument>
  ): Promise<PlayerDocument | undefined> {
    const [doc] = await db
      .update(playerDocuments)
      .set(updates)
      .where(eq(playerDocuments.id, id))
      .returning();
    return doc;
  },

  async deletePlayerDocument(id: string): Promise<void> {
    await db.delete(playerDocuments).where(eq(playerDocuments.id, id));
  },

  // Document Versions
  async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    return db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.versionNumber));
  },

  async getDocumentVersion(id: string): Promise<DocumentVersion | undefined> {
    const [version] = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.id, id));
    return version;
  },

  async getCurrentDocumentVersion(
    documentId: string
  ): Promise<DocumentVersion | undefined> {
    const [version] = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.versionNumber))
      .limit(1);
    return version;
  },

  async createDocumentVersion(
    version: InsertDocumentVersion
  ): Promise<DocumentVersion> {
    const [newVersion] = await db
      .insert(documentVersions)
      .values(version)
      .returning();
    return newVersion;
  },

  async setCurrentVersion(
    documentId: string,
    versionId: string
  ): Promise<void> {
    await db
      .update(documentVersions)
      .set({ isCurrent: false })
      .where(eq(documentVersions.documentId, documentId));
    await db
      .update(documentVersions)
      .set({ isCurrent: true })
      .where(eq(documentVersions.id, versionId));
  },

  // Document Audit Logs
  async getDocumentAuditLogs(documentId: string): Promise<DocumentAuditLog[]> {
    return db
      .select()
      .from(documentAuditLogs)
      .where(eq(documentAuditLogs.documentId, documentId))
      .orderBy(desc(documentAuditLogs.timestamp));
  },

  async getDocumentAuditLogsByPlayer(
    playerId: string
  ): Promise<DocumentAuditLog[]> {
    return db
      .select()
      .from(documentAuditLogs)
      .where(eq(documentAuditLogs.playerId, playerId))
      .orderBy(desc(documentAuditLogs.timestamp));
  },

  async getDocumentAuditLogsByTeam(
    teamId: string,
    limit = 100
  ): Promise<DocumentAuditLog[]> {
    return db
      .select()
      .from(documentAuditLogs)
      .where(eq(documentAuditLogs.teamId, teamId))
      .orderBy(desc(documentAuditLogs.timestamp))
      .limit(limit);
  },

  async createDocumentAuditLog(
    log: InsertDocumentAuditLog
  ): Promise<DocumentAuditLog> {
    const [newLog] = await db.insert(documentAuditLogs).values(log).returning();
    return newLog;
  },

  // Document Verification
  async createDocumentVerification(
    verification: InsertDocumentVerification
  ): Promise<DocumentVerification> {
    const [newVerification] = await db
      .insert(documentVerifications)
      .values(verification)
      .returning();
    return newVerification;
  },

  async getDocumentVerification(
    documentType: string,
    documentId: string
  ): Promise<DocumentVerification | undefined> {
    const [verification] = await db
      .select()
      .from(documentVerifications)
      .where(eq(documentVerifications.documentId, documentId));
    return verification;
  },

  async updateDocumentVerification(
    id: string,
    updates: Partial<InsertDocumentVerification>
  ): Promise<DocumentVerification | undefined> {
    const [verification] = await db
      .update(documentVerifications)
      .set(updates)
      .where(eq(documentVerifications.id, id))
      .returning();
    return verification;
  },
};
