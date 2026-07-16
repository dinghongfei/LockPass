import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { computeItemChanges } from "@/lib/item-changes";
import {
  createDiscardedGroupStored,
  DISCARDED_GROUP_ID,
  isReservedGroupName,
  isSystemDiscardedGroup,
} from "@/lib/system-groups";
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
import { groupsPg, itemChangesPg, itemsPg } from "./schema";

const pgSchema = { groupsPg, itemsPg, itemChangesPg };
type PgDb = PostgresJsDatabase<typeof pgSchema>;

interface PgGroupRow {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
}

interface PgItemRow {
  id: string;
  userId: string;
  groupId: string;
  type: string;
  name: string;
  status: string;
  encryptedPayload: string;
  createdAt: Date;
  updatedAt: Date;
}

let dbInstance: PgDb | null = null;

function getDb() {
  if (dbInstance) return dbInstance;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for database storage");
  const client = postgres(url);
  dbInstance = drizzle(client, { schema: pgSchema });
  return dbInstance;
}

async function ensureTables() {
  const client = postgres(process.env.DATABASE_URL!);
  await client`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `;
  await client`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      encrypted_payload TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `;
  await client`
    CREATE TABLE IF NOT EXISTS item_changes (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      encrypted_changes TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `;
  await client`
    CREATE INDEX IF NOT EXISTS idx_item_changes_item
      ON item_changes(item_id, user_id)
  `;
  await client`
    ALTER TABLE items ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  `;
  await client.end();
}

let tablesReady = false;

async function init() {
  if (!tablesReady) {
    await ensureTables();
    tablesReady = true;
  }
}

function mapPgItemRow(r: PgItemRow): VaultItem {
  return toItem({
    id: r.id,
    userId: r.userId,
    groupId: r.groupId,
    type: r.type as VaultItem["type"],
    name: r.name,
    status: (r.status as VaultItem["status"]) ?? "active",
    encryptedPayload: r.encryptedPayload,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  });
}

export class PostgresStorageProvider implements StorageProvider {
  private async ensureDiscardedGroup(userId: string) {
    await init();
    const db = getDb();
    const rows = (await db
      .select()
      .from(groupsPg)
      .where(
        and(
          eq(groupsPg.id, DISCARDED_GROUP_ID),
          eq(groupsPg.userId, userId)
        )
      )) as unknown as PgGroupRow[];
    if (!rows[0]) {
      const stored = createDiscardedGroupStored(userId);
      await db.insert(groupsPg).values({
        id: stored.id,
        userId: stored.userId,
        name: stored.name,
        createdAt: new Date(stored.createdAt),
      });
    }
  }

  async getGroups(userId: string) {
    await init();
    await this.ensureDiscardedGroup(userId);
    const db = getDb();
    const rows = (await db
      .select()
      .from(groupsPg)
      .where(eq(groupsPg.userId, userId))) as unknown as PgGroupRow[];
    return rows
      .map((r) =>
        toGroup({
          id: r.id,
          userId: r.userId,
          name: r.name,
          createdAt: r.createdAt.toISOString(),
        })
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createGroup(userId: string, name: string) {
    if (isReservedGroupName(name)) {
      throw new Error("Reserved group name");
    }
    await init();
    const db = getDb();
    const now = new Date();
    const group = { id: uuidv4(), userId, name, createdAt: now };
    await db.insert(groupsPg).values(group);
    return toGroup({
      id: group.id,
      userId: group.userId,
      name: group.name,
      createdAt: group.createdAt.toISOString(),
    });
  }

  async updateGroup(id: string, userId: string, name: string) {
    if (isSystemDiscardedGroup(id)) {
      throw new Error("Cannot modify system group");
    }
    if (isReservedGroupName(name)) {
      throw new Error("Reserved group name");
    }
    await init();
    const db = getDb();
    await db
      .update(groupsPg)
      .set({ name })
      .where(and(eq(groupsPg.id, id), eq(groupsPg.userId, userId)));
    const rows = (await db
      .select()
      .from(groupsPg)
      .where(and(eq(groupsPg.id, id), eq(groupsPg.userId, userId)))) as unknown as PgGroupRow[];
    if (!rows[0]) throw new Error("Group not found");
    const r = rows[0];
    return toGroup({
      id: r.id,
      userId: r.userId,
      name: r.name,
      createdAt: r.createdAt.toISOString(),
    });
  }

  async deleteGroup(id: string, userId: string) {
    if (isSystemDiscardedGroup(id)) {
      throw new Error("Cannot delete system group");
    }
    await init();
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
      .delete(groupsPg)
      .where(and(eq(groupsPg.id, id), eq(groupsPg.userId, userId)));
  }

  async getItems(userId: string, groupId?: string) {
    await init();
    const db = getDb();
    const conditions = groupId
      ? and(eq(itemsPg.userId, userId), eq(itemsPg.groupId, groupId))
      : eq(itemsPg.userId, userId);
    const rows = (await db.select().from(itemsPg).where(conditions)) as unknown as PgItemRow[];
    return rows
      .map(mapPgItemRow)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getItem(id: string, userId: string) {
    await init();
    const db = getDb();
    const rows = (await db
      .select()
      .from(itemsPg)
      .where(and(eq(itemsPg.id, id), eq(itemsPg.userId, userId)))) as unknown as PgItemRow[];
    if (!rows[0]) return null;
    return mapPgItemRow(rows[0]);
  }

  async createItem(item: Omit<VaultItem, "id" | "createdAt" | "updatedAt">) {
    if (isSystemDiscardedGroup(item.groupId)) {
      throw new Error("Cannot create item in discarded group");
    }
    await init();
    const db = getDb();
    const now = new Date();
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
    await db.insert(itemsPg).values(stored);
    return toItem({
      ...stored,
      createdAt: stored.createdAt.toISOString(),
      updatedAt: stored.updatedAt.toISOString(),
    });
  }

  async updateItem(
    id: string,
    userId: string,
    data: Partial<Pick<VaultItem, "groupId" | "type" | "name" | "payload" | "status">>
  ) {
    await init();
    const existing = await this.getItem(id, userId);
    if (!existing) throw new Error("Item not found");
    assertItemUpdateAllowed(existing, data);

    const changes = computeItemChanges(existing, data);
    if (changes.length > 0) {
      await this.recordItemChange(id, userId, changes);
    }

    const db = getDb();
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.groupId !== undefined) updates.groupId = data.groupId;
    if (data.type !== undefined) updates.type = data.type;
    if (data.name !== undefined) updates.name = data.name;
    if (data.status !== undefined) updates.status = data.status;
    if (data.payload !== undefined) {
      updates.encryptedPayload = encryptItemPayload(data.payload);
    }
    await db
      .update(itemsPg)
      .set(updates)
      .where(and(eq(itemsPg.id, id), eq(itemsPg.userId, userId)));
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
    await init();
    const db = getDb();
    const rows = (await db
      .select()
      .from(itemChangesPg)
      .where(
        and(
          eq(itemChangesPg.itemId, itemId),
          eq(itemChangesPg.userId, userId)
        )
      )) as {
      id: string;
      itemId: string;
      userId: string;
      encryptedChanges: string;
      createdAt: Date;
    }[];
    return rows
      .map((row) =>
        toItemChange({
          id: row.id,
          itemId: row.itemId,
          userId: row.userId,
          encryptedChanges: row.encryptedChanges,
          createdAt: row.createdAt.toISOString(),
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
    await init();
    const db = getDb();
    const now = new Date();
    const stored = {
      id: uuidv4(),
      itemId,
      userId,
      encryptedChanges: encryptItemChanges(changes),
      createdAt: now,
    };
    await db.insert(itemChangesPg).values(stored);
    return toItemChange({
      ...stored,
      createdAt: stored.createdAt.toISOString(),
    });
  }

  async importVault(
    userId: string,
    data: ExportData,
    mode: "merge" | "replace"
  ) {
    await init();
    const db = getDb();
    if (mode === "replace") {
      await db
        .delete(itemChangesPg)
        .where(eq(itemChangesPg.userId, userId));
      await db.delete(itemsPg).where(eq(itemsPg.userId, userId));
      await db.delete(groupsPg).where(eq(groupsPg.userId, userId));
    }
    for (const group of data.groups) {
      const g = serializeGroup({ ...group, userId });
      await db
        .insert(groupsPg)
        .values({
          id: g.id,
          userId: g.userId,
          name: g.name,
          createdAt: new Date(g.createdAt),
        })
        .onConflictDoNothing();
    }
    for (const item of data.items) {
      const normalized = migrateLegacyItemType(item);
      const now = new Date();
      await db
        .insert(itemsPg)
        .values({
          id: normalized.id,
          userId,
          groupId: normalized.groupId,
          type: normalized.type,
          name: normalized.name,
          status: normalized.status ?? "active",
          encryptedPayload: encryptItemPayload(normalized.payload),
          createdAt: normalized.createdAt ? new Date(normalized.createdAt) : now,
          updatedAt: normalized.updatedAt ? new Date(normalized.updatedAt) : now,
        })
        .onConflictDoNothing();
    }
    await this.ensureDiscardedGroup(userId);
  }

  async exportVault(userId: string) {
    await init();
    const groups = await this.getGroups(userId);
    const db = getDb();
    const rows = (await db
      .select()
      .from(itemsPg)
      .where(eq(itemsPg.userId, userId))) as unknown as PgItemRow[];
    const items = rows
      .map(mapPgItemRow)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return buildExportData(groups, items);
  }
}
