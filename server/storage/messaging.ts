import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import {
  type Conversation,
  type InsertConversation,
  type ConversationParticipant,
  type InsertConversationParticipant,
  type Message,
  type InsertMessage,
  conversations,
  conversationParticipants,
  messages,
} from "@shared/schema";

export const messagingRepository = {
  // Conversations
  async getConversations(userId: string): Promise<Conversation[]> {
    const participants = await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));
    const conversationIds = participants.map((p) => p.conversationId);
    if (conversationIds.length === 0) return [];
    const result = await Promise.all(
      conversationIds.map((id) =>
        db.select().from(conversations).where(eq(conversations.id, id))
      )
    );
    return result.flat();
  },

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  },

  async createConversation(
    conversation: InsertConversation
  ): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  },

  // Participants
  async getConversationParticipants(
    conversationId: string
  ): Promise<ConversationParticipant[]> {
    return db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));
  },

  async addConversationParticipant(
    participant: InsertConversationParticipant
  ): Promise<ConversationParticipant> {
    const [newParticipant] = await db
      .insert(conversationParticipants)
      .values(participant)
      .returning();
    return newParticipant;
  },

  // Messages
  async getMessages(conversationId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  },

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  },
};
