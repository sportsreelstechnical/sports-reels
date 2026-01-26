import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import {
  type FederationLetterRequest,
  type InsertFederationLetterRequest,
  type FederationProfile,
  type InsertFederationProfile,
  type FederationFeeSchedule,
  type InsertFederationFeeSchedule,
  type FederationRequestActivity,
  type InsertFederationRequestActivity,
  type FederationRequestMessage,
  type InsertFederationRequestMessage,
  type FederationIssuedDocument,
  type InsertFederationIssuedDocument,
  federationLetterRequests,
  federationProfiles,
  federationFeeSchedules,
  federationRequestActivities,
  federationRequestMessages,
  federationIssuedDocuments,
} from "@shared/schema";

export const federationRepository = {
  // Federation Profiles
  async getFederationProfile(
    id: string,
  ): Promise<FederationProfile | undefined> {
    const [profile] = await db
      .select()
      .from(federationProfiles)
      .where(eq(federationProfiles.id, id));
    return profile;
  },

  async getFederationProfileByCountry(
    country: string,
  ): Promise<FederationProfile | undefined> {
    const [profile] = await db
      .select()
      .from(federationProfiles)
      .where(eq(federationProfiles.country, country));
    return profile;
  },

  async getFederationProfileByUserId(
    _userId: string,
  ): Promise<FederationProfile | undefined> {
    // Note: userId not directly on profile table, kept for interface compatibility
    return undefined;
  },

  async createFederationProfile(
    profile: InsertFederationProfile,
  ): Promise<FederationProfile> {
    const [newProfile] = await db
      .insert(federationProfiles)
      .values(profile)
      .returning();
    return newProfile;
  },

  async getAllFederationProfiles(): Promise<FederationProfile[]> {
    return db.select().from(federationProfiles);
  },

  // Federation Letter Requests
  async getFederationLetterRequests(
    teamId?: string,
  ): Promise<FederationLetterRequest[]> {
    if (teamId) {
      return db
        .select()
        .from(federationLetterRequests)
        .where(eq(federationLetterRequests.teamId, teamId))
        .orderBy(desc(federationLetterRequests.createdAt));
    }
    return db
      .select()
      .from(federationLetterRequests)
      .orderBy(desc(federationLetterRequests.createdAt));
  },

  async getFederationLetterRequest(
    id: string,
  ): Promise<FederationLetterRequest | undefined> {
    const [request] = await db
      .select()
      .from(federationLetterRequests)
      .where(eq(federationLetterRequests.id, id));
    return request;
  },

  async createFederationLetterRequest(
    request: InsertFederationLetterRequest,
  ): Promise<FederationLetterRequest> {
    const [newRequest] = await db
      .insert(federationLetterRequests)
      .values(request)
      .returning();
    return newRequest;
  },

  async updateFederationLetterRequest(
    id: string,
    updates: Partial<InsertFederationLetterRequest>,
  ): Promise<FederationLetterRequest | undefined> {
    const [request] = await db
      .update(federationLetterRequests)
      .set(updates)
      .where(eq(federationLetterRequests.id, id))
      .returning();
    return request;
  },

  async deleteFederationLetterRequest(id: string): Promise<void> {
    await db
      .delete(federationLetterRequests)
      .where(eq(federationLetterRequests.id, id));
  },

  // Fee Schedules
  async getFederationFeeSchedules(
    federationId: string,
  ): Promise<FederationFeeSchedule[]> {
    return db
      .select()
      .from(federationFeeSchedules)
      .where(eq(federationFeeSchedules.federationId, federationId));
  },

  async createFederationFeeSchedule(
    schedule: InsertFederationFeeSchedule,
  ): Promise<FederationFeeSchedule> {
    const [newSchedule] = await db
      .insert(federationFeeSchedules)
      .values(schedule)
      .returning();
    return newSchedule;
  },

  async updateFederationFeeSchedule(
    id: string,
    updates: Partial<InsertFederationFeeSchedule>,
  ): Promise<FederationFeeSchedule | undefined> {
    const [schedule] = await db
      .update(federationFeeSchedules)
      .set(updates)
      .where(eq(federationFeeSchedules.id, id))
      .returning();
    return schedule;
  },

  async getAllFederationFeeSchedules(): Promise<FederationFeeSchedule[]> {
    return db.select().from(federationFeeSchedules);
  },

  // Request Activities
  async getFederationRequestActivities(
    requestId: string,
  ): Promise<FederationRequestActivity[]> {
    return db
      .select()
      .from(federationRequestActivities)
      .where(eq(federationRequestActivities.requestId, requestId))
      .orderBy(desc(federationRequestActivities.timestamp));
  },

  async createFederationRequestActivity(
    activity: InsertFederationRequestActivity,
  ): Promise<FederationRequestActivity> {
    const [newActivity] = await db
      .insert(federationRequestActivities)
      .values(activity)
      .returning();
    return newActivity;
  },

  // Request Messages
  async getFederationRequestMessages(
    requestId: string,
  ): Promise<FederationRequestMessage[]> {
    return db
      .select()
      .from(federationRequestMessages)
      .where(eq(federationRequestMessages.requestId, requestId))
      .orderBy(federationRequestMessages.createdAt);
  },

  async createFederationRequestMessage(
    message: InsertFederationRequestMessage,
  ): Promise<FederationRequestMessage> {
    const [newMessage] = await db
      .insert(federationRequestMessages)
      .values(message)
      .returning();
    return newMessage;
  },

  async updateFederationRequestMessage(
    id: string,
    updates: Partial<InsertFederationRequestMessage>,
  ): Promise<FederationRequestMessage | undefined> {
    const [message] = await db
      .update(federationRequestMessages)
      .set(updates)
      .where(eq(federationRequestMessages.id, id))
      .returning();
    return message;
  },

  // Issued Documents
  async getFederationIssuedDocuments(
    requestId: string,
  ): Promise<FederationIssuedDocument[]> {
    return db
      .select()
      .from(federationIssuedDocuments)
      .where(eq(federationIssuedDocuments.requestId, requestId));
  },

  async getFederationIssuedDocument(
    id: string,
  ): Promise<FederationIssuedDocument | undefined> {
    const [doc] = await db
      .select()
      .from(federationIssuedDocuments)
      .where(eq(federationIssuedDocuments.id, id));
    return doc;
  },

  async createFederationIssuedDocument(
    doc: InsertFederationIssuedDocument,
  ): Promise<FederationIssuedDocument> {
    const [newDoc] = await db
      .insert(federationIssuedDocuments)
      .values(doc)
      .returning();
    return newDoc;
  },

  async updateFederationIssuedDocument(
    id: string,
    updates: Partial<InsertFederationIssuedDocument>,
  ): Promise<FederationIssuedDocument | undefined> {
    const [doc] = await db
      .update(federationIssuedDocuments)
      .set(updates)
      .where(eq(federationIssuedDocuments.id, id))
      .returning();
    return doc;
  },
};
