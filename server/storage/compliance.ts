import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import {
  type ComplianceOrder,
  type InsertComplianceOrder,
  type ComplianceDocument,
  type InsertComplianceDocument,
  type Payment,
  type InsertPayment,
  complianceOrders,
  complianceDocuments,
  payments,
} from "@shared/schema";

export const complianceRepository = {
  // Compliance Orders
  async getComplianceOrders(teamId: string): Promise<ComplianceOrder[]> {
    return db
      .select()
      .from(complianceOrders)
      .where(eq(complianceOrders.teamId, teamId))
      .orderBy(desc(complianceOrders.createdAt));
  },

  async getComplianceOrder(id: string): Promise<ComplianceOrder | undefined> {
    const [order] = await db
      .select()
      .from(complianceOrders)
      .where(eq(complianceOrders.id, id));
    return order;
  },

  async createComplianceOrder(
    order: InsertComplianceOrder
  ): Promise<ComplianceOrder> {
    const [newOrder] = await db
      .insert(complianceOrders)
      .values(order)
      .returning();
    return newOrder;
  },

  async updateComplianceOrder(
    id: string,
    updates: Partial<InsertComplianceOrder>
  ): Promise<ComplianceOrder | undefined> {
    const [order] = await db
      .update(complianceOrders)
      .set(updates)
      .where(eq(complianceOrders.id, id))
      .returning();
    return order;
  },

  // Compliance Documents
  async getComplianceDocuments(orderId: string): Promise<ComplianceDocument[]> {
    return db
      .select()
      .from(complianceDocuments)
      .where(eq(complianceDocuments.orderId, orderId));
  },

  async getComplianceDocument(
    id: string
  ): Promise<ComplianceDocument | undefined> {
    const [doc] = await db
      .select()
      .from(complianceDocuments)
      .where(eq(complianceDocuments.id, id));
    return doc;
  },

  async createComplianceDocument(
    doc: InsertComplianceDocument
  ): Promise<ComplianceDocument> {
    const [newDoc] = await db
      .insert(complianceDocuments)
      .values(doc)
      .returning();
    return newDoc;
  },

  // Payments
  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id));
    return payment;
  },

  async getPaymentByOrderId(orderId: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId));
    return payment;
  },

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  },

  async updatePayment(
    id: string,
    updates: Partial<InsertPayment>
  ): Promise<Payment | undefined> {
    const [payment] = await db
      .update(payments)
      .set(updates)
      .where(eq(payments.id, id))
      .returning();
    return payment;
  },
};
