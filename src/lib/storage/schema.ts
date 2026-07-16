import { sqliteTable, text as sqliteText } from "drizzle-orm/sqlite-core";
import { pgTable, text as pgText, timestamp } from "drizzle-orm/pg-core";

export const groupsSqlite = sqliteTable("groups", {
  id: sqliteText("id").primaryKey(),
  userId: sqliteText("user_id").notNull(),
  name: sqliteText("name").notNull(),
  createdAt: sqliteText("created_at").notNull(),
});

export const itemChangesSqlite = sqliteTable("item_changes", {
  id: sqliteText("id").primaryKey(),
  itemId: sqliteText("item_id").notNull(),
  userId: sqliteText("user_id").notNull(),
  encryptedChanges: sqliteText("encrypted_changes").notNull(),
  createdAt: sqliteText("created_at").notNull(),
});

export const itemsSqlite = sqliteTable("items", {
  id: sqliteText("id").primaryKey(),
  userId: sqliteText("user_id").notNull(),
  groupId: sqliteText("group_id").notNull(),
  type: sqliteText("type").notNull(),
  name: sqliteText("name").notNull(),
  status: sqliteText("status").notNull().default("active"),
  encryptedPayload: sqliteText("encrypted_payload").notNull(),
  createdAt: sqliteText("created_at").notNull(),
  updatedAt: sqliteText("updated_at").notNull(),
});

export const groupsPg = pgTable("groups", {
  id: pgText("id").primaryKey(),
  userId: pgText("user_id").notNull(),
  name: pgText("name").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

export const itemChangesPg = pgTable("item_changes", {
  id: pgText("id").primaryKey(),
  itemId: pgText("item_id").notNull(),
  userId: pgText("user_id").notNull(),
  encryptedChanges: pgText("encrypted_changes").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

export const itemsPg = pgTable("items", {
  id: pgText("id").primaryKey(),
  userId: pgText("user_id").notNull(),
  groupId: pgText("group_id").notNull(),
  type: pgText("type").notNull(),
  name: pgText("name").notNull(),
  status: pgText("status").notNull().default("active"),
  encryptedPayload: pgText("encrypted_payload").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});
