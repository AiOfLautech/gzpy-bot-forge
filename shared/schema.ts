import { pgTable, uuid, text, varchar, decimal, timestamp, boolean, integer, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const appRoleEnum = pgEnum("app_role", ["user", "admin"]);

// User Roles Table
export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  role: appRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Profiles Table
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  email: text("email").notNull(),
  chatId: text("chat_id").unique(),
  gzpBalance: decimal("gzp_balance").notNull().default("0"),
  lastClaimAt: timestamp("last_claim_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Bots Table
export const bots = pgTable("bots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  telegramToken: text("telegram_token").notNull(),
  channelUsername: text("channel_username").notNull(),
  botImageUrl: text("bot_image_url"),
  welcomeMessage: text("welcome_message"),
  isActive: boolean("is_active").notNull().default(true),
  chatId: text("chat_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Transactions Table
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromUserId: uuid("from_user_id"),
  toUserId: uuid("to_user_id"),
  amount: decimal("amount").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Notifications Table
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// User Economy Table
export const userEconomy = pgTable("user_economy", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  botId: uuid("bot_id"),
  balance: decimal("balance").default("1000"),
  bank: decimal("bank").default("0"),
  xp: integer("xp").default(0),
  level: integer("level").default(1),
  inventory: jsonb("inventory").default({}),
  job: text("job"),
  lastWork: timestamp("last_work", { withTimezone: true }),
  lastRob: timestamp("last_rob", { withTimezone: true }),
  lastCrime: timestamp("last_crime", { withTimezone: true }),
  lastDaily: timestamp("last_daily", { withTimezone: true }),
  totalMessages: integer("total_messages").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Bot Stats Table
export const botStats = pgTable("bot_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  botId: uuid("bot_id").unique(),
  totalUsers: integer("total_users").default(0),
  totalGroups: integer("total_groups").default(0),
  totalChannels: integer("total_channels").default(0),
  totalCommands: integer("total_commands").default(0),
  plan: text("plan").default("free"),
  botUsername: text("bot_username"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Mini Game Sessions Table
export const miniGameSessions = pgTable("mini_game_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  botId: uuid("bot_id"),
  gameType: text("game_type").notNull(),
  score: integer("score").default(0),
  coinsEarned: integer("coins_earned").default(0),
  level: integer("level").default(1),
  sessionData: jsonb("session_data").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

// Insert Schemas
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true, createdAt: true });
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBotSchema = createInsertSchema(bots).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertUserEconomySchema = createInsertSchema(userEconomy).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBotStatsSchema = createInsertSchema(botStats).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMiniGameSessionSchema = createInsertSchema(miniGameSessions).omit({ id: true, createdAt: true });

// Insert Types
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type InsertBot = z.infer<typeof insertBotSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertUserEconomy = z.infer<typeof insertUserEconomySchema>;
export type InsertBotStats = z.infer<typeof insertBotStatsSchema>;
export type InsertMiniGameSession = z.infer<typeof insertMiniGameSessionSchema>;

// Select Types
export type UserRole = typeof userRoles.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Bot = typeof bots.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type UserEconomy = typeof userEconomy.$inferSelect;
export type BotStats = typeof botStats.$inferSelect;
export type MiniGameSession = typeof miniGameSessions.$inferSelect;
