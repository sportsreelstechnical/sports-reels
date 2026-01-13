import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import {
  type TokenBalance,
  type InsertTokenBalance,
  type TokenTransaction,
  type InsertTokenTransaction,
  type TokenPack,
  type InsertTokenPack,
  type TokenPurchase,
  type InsertTokenPurchase,
  tokenBalances,
  tokenTransactions,
  tokenPacks,
  tokenPurchases,
} from "@shared/schema";

export const tokensRepository = {
  // Token Balance
  async getTokenBalance(userId: string): Promise<TokenBalance | undefined> {
    const [balance] = await db
      .select()
      .from(tokenBalances)
      .where(eq(tokenBalances.userId, userId));
    return balance;
  },

  async createTokenBalance(balance: InsertTokenBalance): Promise<TokenBalance> {
    const [newBalance] = await db
      .insert(tokenBalances)
      .values(balance)
      .returning();
    return newBalance;
  },

  async updateTokenBalance(
    userId: string,
    balance: number,
    lifetimePurchased?: number,
    lifetimeSpent?: number
  ): Promise<TokenBalance | undefined> {
    const updates: Partial<InsertTokenBalance> = { balance };
    if (lifetimePurchased !== undefined)
      updates.lifetimePurchased = lifetimePurchased;
    if (lifetimeSpent !== undefined) updates.lifetimeSpent = lifetimeSpent;
    const [updated] = await db
      .update(tokenBalances)
      .set(updates)
      .where(eq(tokenBalances.userId, userId))
      .returning();
    return updated;
  },

  // Token Transactions
  async getTokenTransactions(
    userId: string,
    limit = 50
  ): Promise<TokenTransaction[]> {
    return db
      .select()
      .from(tokenTransactions)
      .where(eq(tokenTransactions.userId, userId))
      .orderBy(desc(tokenTransactions.createdAt))
      .limit(limit);
  },

  async createTokenTransaction(
    transaction: InsertTokenTransaction
  ): Promise<TokenTransaction> {
    const [newTransaction] = await db
      .insert(tokenTransactions)
      .values(transaction)
      .returning();
    return newTransaction;
  },

  // Token Packs
  async getTokenPacks(): Promise<TokenPack[]> {
    return db.select().from(tokenPacks).where(eq(tokenPacks.isActive, true));
  },

  async getTokenPack(id: string): Promise<TokenPack | undefined> {
    const [pack] = await db
      .select()
      .from(tokenPacks)
      .where(eq(tokenPacks.id, id));
    return pack;
  },

  async createTokenPack(pack: InsertTokenPack): Promise<TokenPack> {
    const [newPack] = await db.insert(tokenPacks).values(pack).returning();
    return newPack;
  },

  // Token Purchases
  async getTokenPurchases(userId: string): Promise<TokenPurchase[]> {
    return db
      .select()
      .from(tokenPurchases)
      .where(eq(tokenPurchases.userId, userId))
      .orderBy(desc(tokenPurchases.createdAt));
  },

  async createTokenPurchase(
    purchase: InsertTokenPurchase
  ): Promise<TokenPurchase> {
    const [newPurchase] = await db
      .insert(tokenPurchases)
      .values(purchase)
      .returning();
    return newPurchase;
  },

  async updateTokenPurchase(
    id: string,
    updates: Partial<InsertTokenPurchase>
  ): Promise<TokenPurchase | undefined> {
    const [purchase] = await db
      .update(tokenPurchases)
      .set(updates)
      .where(eq(tokenPurchases.id, id))
      .returning();
    return purchase;
  },
};
