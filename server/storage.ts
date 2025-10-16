import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import * as schema from "@shared/schema";
import type {
  InsertBot,
  InsertUserEconomy,
  InsertBotStats,
  InsertMiniGameSession,
  InsertTransaction,
  InsertNotification,
  Bot,
  UserEconomy,
  BotStats,
  MiniGameSession,
} from "@shared/schema";

export interface IStorage {
  // Bot operations
  createBot(data: InsertBot): Promise<Bot>;
  getBotById(id: string): Promise<Bot | undefined>;
  getBotsByUserId(userId: string): Promise<Bot[]>;
  updateBot(id: string, data: Partial<InsertBot>): Promise<void>;
  deleteBot(id: string): Promise<void>;
  
  // User Economy operations
  getUserEconomy(botId: string, userId: string): Promise<UserEconomy | undefined>;
  createUserEconomy(data: InsertUserEconomy): Promise<UserEconomy>;
  updateUserEconomy(botId: string, userId: string, data: Partial<InsertUserEconomy>): Promise<void>;
  getTopUsersByBalance(botId: string, limit: number): Promise<UserEconomy[]>;
  
  // Bot Stats operations
  getBotStats(botId: string): Promise<BotStats | undefined>;
  createBotStats(data: InsertBotStats): Promise<BotStats>;
  updateBotStats(botId: string, data: Partial<InsertBotStats>): Promise<void>;
  
  // Mini Game Sessions
  createGameSession(data: InsertMiniGameSession): Promise<MiniGameSession>;
  getGameSession(userId: string, gameType: string): Promise<MiniGameSession | undefined>;
  updateGameSession(id: string, data: Partial<InsertMiniGameSession>): Promise<void>;
  
  // Transactions
  createTransaction(data: InsertTransaction): Promise<void>;
  getUserTransactions(userId: string): Promise<any[]>;
  
  // Notifications
  createNotification(data: InsertNotification): Promise<void>;
  getUserNotifications(userId: string): Promise<any[]>;
  markNotificationRead(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createBot(data: InsertBot): Promise<Bot> {
    const [bot] = await db.insert(schema.bots).values(data).returning();
    return bot;
  }

  async getBotById(id: string): Promise<Bot | undefined> {
    const [bot] = await db.select().from(schema.bots).where(eq(schema.bots.id, id));
    return bot;
  }

  async getBotsByUserId(userId: string): Promise<Bot[]> {
    return db.select().from(schema.bots).where(eq(schema.bots.userId, userId));
  }

  async updateBot(id: string, data: Partial<InsertBot>): Promise<void> {
    await db.update(schema.bots).set(data).where(eq(schema.bots.id, id));
  }

  async deleteBot(id: string): Promise<void> {
    await db.delete(schema.bots).where(eq(schema.bots.id, id));
  }

  async getUserEconomy(botId: string, userId: string): Promise<UserEconomy | undefined> {
    const [economy] = await db
      .select()
      .from(schema.userEconomy)
      .where(and(eq(schema.userEconomy.botId, botId), eq(schema.userEconomy.userId, userId)));
    return economy;
  }

  async createUserEconomy(data: InsertUserEconomy): Promise<UserEconomy> {
    const [economy] = await db.insert(schema.userEconomy).values(data).returning();
    return economy;
  }

  async updateUserEconomy(botId: string, userId: string, data: Partial<InsertUserEconomy>): Promise<void> {
    await db
      .update(schema.userEconomy)
      .set(data)
      .where(and(eq(schema.userEconomy.botId, botId), eq(schema.userEconomy.userId, userId)));
  }

  async getTopUsersByBalance(botId: string, limit: number): Promise<UserEconomy[]> {
    return db
      .select()
      .from(schema.userEconomy)
      .where(eq(schema.userEconomy.botId, botId))
      .orderBy(desc(schema.userEconomy.balance))
      .limit(limit);
  }

  async getBotStats(botId: string): Promise<BotStats | undefined> {
    const [stats] = await db.select().from(schema.botStats).where(eq(schema.botStats.botId, botId));
    return stats;
  }

  async createBotStats(data: InsertBotStats): Promise<BotStats> {
    const [stats] = await db.insert(schema.botStats).values(data).returning();
    return stats;
  }

  async updateBotStats(botId: string, data: Partial<InsertBotStats>): Promise<void> {
    await db.update(schema.botStats).set(data).where(eq(schema.botStats.botId, botId));
  }

  async createGameSession(data: InsertMiniGameSession): Promise<MiniGameSession> {
    const [session] = await db.insert(schema.miniGameSessions).values(data).returning();
    return session;
  }

  async getGameSession(userId: string, gameType: string): Promise<MiniGameSession | undefined> {
    const [session] = await db
      .select()
      .from(schema.miniGameSessions)
      .where(and(eq(schema.miniGameSessions.userId, userId), eq(schema.miniGameSessions.gameType, gameType)))
      .orderBy(desc(schema.miniGameSessions.createdAt))
      .limit(1);
    return session;
  }

  async updateGameSession(id: string, data: Partial<InsertMiniGameSession>): Promise<void> {
    await db.update(schema.miniGameSessions).set(data).where(eq(schema.miniGameSessions.id, id));
  }

  async createTransaction(data: InsertTransaction): Promise<void> {
    await db.insert(schema.transactions).values(data);
  }

  async getUserTransactions(userId: string): Promise<any[]> {
    return db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.fromUserId, userId))
      .orderBy(desc(schema.transactions.createdAt))
      .limit(50);
  }

  async createNotification(data: InsertNotification): Promise<void> {
    await db.insert(schema.notifications).values(data);
  }

  async getUserNotifications(userId: string): Promise<any[]> {
    return db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt));
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(schema.notifications).set({ isRead: true }).where(eq(schema.notifications.id, id));
  }
}

export const storage = new DatabaseStorage();
