import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  createDiscardedGroupStored,
  DISCARDED_GROUP_ID,
  isReservedGroupName,
  isSystemDiscardedGroup,
} from "@/lib/system-groups";
import { computeItemChanges } from "@/lib/item-changes";
import type { ExportData, ItemChangeEntry, VaultItem } from "@/lib/types";
import { migrateLegacyItemType } from "@/lib/types";
import {
  buildExportData,
  encryptItemChanges,
  encryptItemPayload,
  serializeGroup,
  toGroup,
  toItem,
  toItemChange,
  assertItemUpdateAllowed,
} from "./helpers";
import type { StorageProvider } from "./provider";
import { groupsSqlite, itemChangesSqlite, itemsSqlite } from "./schema";

const sqliteSchema = { groupsSqlite, itemsSqlite, itemChangesSqlite };
type SqliteDb = BetterSQLite3Database<typeof sqliteSchema>;

let dbInstance: SqliteDb | null = null;

function getDb() {
  if (dbInstance) return dbInstance;
  const dataDir = process.env.DATA_DIR || join(/* turbopackIgnore: true */ process.cwd(), "data");
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const sqlite = new Database(join(dataDir, "vault.db"));
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      encrypted_payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS item_changes (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      encrypted_changes TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_item_changes_item
      ON item_changes(item_id, user_id);
  `);
  try {
    sqlite.exec(
      `ALTER TABLE items ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`
    );
  } catch {
    // column already exists
  }
  dbInstance = drizzle(sqlite, { schema: sqliteSchema });
  return dbInstance;
}

function mapItemRow(r: {
  id: string;
  userId: string;
  groupId: string;
  type: string;
  name: string;
  status?: string | null;
  encryptedPayload: string;
  createdAt: string;
  updatedAt: string;
}): VaultItem {
  return toItem({
    id: r.id,
    userId: r.userId,
    groupId: r.groupId,
    type: r.type as VaultItem["type"],
    name: r.name,
    status: (r.status as VaultItem["status"]) ?? "active",
    encryptedPayload: r.encryptedPayload,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  });
}

export class SqliteStorageProvider implements StorageProvider {
  private async ensureDiscardedGroup(userId: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(groupsSqlite)
      .where(
        and(
          eq(groupsSqlite.id, DISCARDED_GROUP_ID),
          eq(groupsSqlite.userId, userId)
        )
      );
    if (!rows[0]) {
      await db.insert(groupsSqlite).values(createDiscardedGroupStored(userId));
    }
  }

  async getGroups(userId: string) {
    await this.ensureDiscardedGroup(userId);
    const db = getDb();
    const rows = await db
      .select()
      .from(groupsSqlite)
      .where(eq(groupsSqlite.userId, userId));
    return rows
      .map((r) =>
        toGroup({
          id: r.id,
          userId: r.userId,
          name: r.name,
          createdAt: r.createdAt,
        })
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createGroup(userId: string, name: string) {
    if (isReservedGroupName(name)) {
      throw new Error("Reserved group name");
    }
    const db = getDb();
    const now = new Date().toISOString();
    const group = { id: uuidv4(), userId, name, createdAt: now };
    await db.insert(groupsSqlite).values(group);
    return toGroup(group);
  }

  async updateGroup(id: string, userId: string, name: string) {
    if (isSystemDiscardedGroup(id)) {
      throw new Error("Cannot modify system group");
    }
    if (isReservedGroupName(name)) {
      throw new Error("Reserved group name");
    }
    const db = getDb();
    await db
      .update(groupsSqlite)
      .set({ name })
      .where(and(eq(groupsSqlite.id, id), eq(groupsSqlite.userId, userId)));
    const rows = await db
      .select()
      .from(groupsSqlite)
      .where(and(eq(groupsSqlite.id, id), eq(groupsSqlite.userId, userId)));
    if (!rows[0]) throw new Error("Group not found");
    return toGroup({
      id: rows[0].id,
      userId: rows[0].userId,
      name: rows[0].name,
      createdAt: rows[0].createdAt,
    });
  }

  async deleteGroup(id: string, userId: string) {
    if (isSystemDiscardedGroup(id)) {
      throw new Error("Cannot delete system group");
    }
    const items = await this.getItems(userId, id);
    if (items.some((item) => item.status === "active")) {
      throw new Error("Group has active items");
    }

    await this.ensureDiscardedGroup(userId);
    for (const item of items) {
      if (item.status === "discarded") {
        await this.updateItem(item.id, userId, {
          groupId: DISCARDED_GROUP_ID,
        });
      }
    }

    const db = getDb();
    await db
      .delete(groupsSqlite)
      .where(and(eq(groupsSqlite.id, id), eq(groupsSqlite.userId, userId)));
  }

  async getItems(userId: string, groupId?: string) {
    const db = getDb();
    const conditions = groupId
      ? and(eq(itemsSqlite.userId, userId), eq(itemsSqlite.groupId, groupId))
      : eq(itemsSqlite.userId, userId);
    const rows = await db.select().from(itemsSqlite).where(conditions);
    return rows.map(mapItemRow).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getItem(id: string, userId: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(itemsSqlite)
      .where(and(eq(itemsSqlite.id, id), eq(itemsSqlite.userId, userId)));
    if (!rows[0]) return null;
    return mapItemRow(rows[0]);
  }

  async createItem(item: Omit<VaultItem, "id" | "createdAt" | "updatedAt">) {
    if (isSystemDiscardedGroup(item.groupId)) {
      throw new Error("Cannot create item in discarded group");
    }
    const db = getDb();
    const now = new Date().toISOString();
    const stored = {
      id: uuidv4(),
      userId: item.userId,
      groupId: item.groupId,
      type: item.type,
      name: item.name,
      status: item.status ?? "active",
      encryptedPayload: encryptItemPayload(item.payload),
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(itemsSqlite).values(stored);
    return toItem(stored);
  }

  async updateItem(
    id: string,
    userId: string,
    data: Partial<Pick<VaultItem, "groupId" | "type" | "name" | "payload" | "status">>
  ) {
    const existing = await this.getItem(id, userId);
    if (!existing) throw new Error("Item not found");
    assertItemUpdateAllowed(existing, data);

    const changes = computeItemChanges(existing, data);
    if (changes.length > 0) {
      await this.recordItemChange(id, userId, changes);
    }

    const db = getDb();
    const updates: Record<string, string> = {
      updatedAt: new Date().toISOString(),
    };
    if (data.groupId !== undefined) updates.groupId = data.groupId;
    if (data.type !== undefined) updates.type = data.type;
    if (data.name !== undefined) updates.name = data.name;
    if (data.status !== undefined) updates.status = data.status;
    if (data.payload !== undefined) {
      updates.encryptedPayload = encryptItemPayload(data.payload);
    }
    await db
      .update(itemsSqlite)
      .set(updates)
      .where(and(eq(itemsSqlite.id, id), eq(itemsSqlite.userId, userId)));
    const item = await this.getItem(id, userId);
    if (!item) throw new Error("Item not found");
    return item;
  }

  async discardItem(
    id: string,
    userId: string,
    options?: { moveToDiscardedGroup?: boolean }
  ) {
    const existing = await this.getItem(id, userId);
    if (!existing) throw new Error("Item not found");
    if (existing.status === "discarded") throw new Error("Item already discarded");

    const updates: Partial<
      Pick<VaultItem, "groupId" | "type" | "name" | "payload" | "status">
    > = { status: "discarded" };
    if (options?.moveToDiscardedGroup) {
      await this.ensureDiscardedGroup(userId);
      updates.groupId = DISCARDED_GROUP_ID;
    }
    return this.updateItem(id, userId, updates);
  }

  async getItemChanges(itemId: string, userId: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(itemChangesSqlite)
      .where(
        and(
          eq(itemChangesSqlite.itemId, itemId),
          eq(itemChangesSqlite.userId, userId)
        )
      );
    return rows
      .map((row) =>
        toItemChange({
          id: row.id,
          itemId: row.itemId,
          userId: row.userId,
          encryptedChanges: row.encryptedChanges,
          createdAt: row.createdAt,
        })
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async recordItemChange(
    itemId: string,
    userId: string,
    changes: ItemChangeEntry[]
  ) {
    if (changes.length === 0) {
      throw new Error("No changes to record");
    }
    const db = getDb();
    const stored = {
      id: uuidv4(),
      itemId,
      userId,
      encryptedChanges: encryptItemChanges(changes),
      createdAt: new Date().toISOString(),
    };
    await db.insert(itemChangesSqlite).values(stored);
    return toItemChange(stored);
  }

  async importVault(
    userId: string,
    data: ExportData,
    mode: "merge" | "replace"
  ) {
    const db = getDb();
    if (mode === "replace") {
      await db
        .delete(itemChangesSqlite)
        .where(eq(itemChangesSqlite.userId, userId));
      await db.delete(itemsSqlite).where(eq(itemsSqlite.userId, userId));
      await db.delete(groupsSqlite).where(eq(groupsSqlite.userId, userId));
    }
    for (const group of data.groups) {
      const g = serializeGroup({ ...group, userId });
      await db.insert(groupsSqlite).values(g).onConflictDoNothing();
    }
    for (const item of data.items) {
      const normalized = migrateLegacyItemType(item);
      const now = new Date().toISOString();
      await db
        .insert(itemsSqlite)
        .values({
          id: normalized.id,
          userId,
          groupId: normalized.groupId,
          type: normalized.type,
          name: normalized.name,
          status: normalized.status ?? "active",
          encryptedPayload: encryptItemPayload(normalized.payload),
          createdAt: normalized.createdAt
            ? new Date(normalized.createdAt).toISOString()
            : now,
          updatedAt: normalized.updatedAt
            ? new Date(normalized.updatedAt).toISOString()
            : now,
        })
        .onConflictDoNothing();
    }
    await this.ensureDiscardedGroup(userId);
  }

  async exportVault(userId: string) {
    const groups = await this.getGroups(userId);
    const db = getDb();
    const rows = await db
      .select()
      .from(itemsSqlite)
      .where(eq(itemsSqlite.userId, userId));
    const items = rows
      .map(mapItemRow)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return buildExportData(groups, items);
  }
}
