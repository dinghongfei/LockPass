import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";
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
import type { StorageProvider, TextVaultData } from "./provider";

function getDataDir(): string {
  return process.env.DATA_DIR || join(/* turbopackIgnore: true */ process.cwd(), "data");
}

function getVaultPath(): string {
  return join(getDataDir(), "vault.json");
}

function ensureDataDir(): void {
  const dir = getDataDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readVault(): TextVaultData {
  ensureDataDir();
  const path = getVaultPath();
  if (!existsSync(path)) {
    const empty: TextVaultData = { groups: [], items: [], itemChanges: [] };
    writeFileSync(path, JSON.stringify(empty, null, 2), "utf-8");
    return empty;
  }
  const vault = JSON.parse(readFileSync(path, "utf-8")) as TextVaultData;
  if (!vault.itemChanges) vault.itemChanges = [];
  return vault;
}

function writeVault(data: TextVaultData): void {
  ensureDataDir();
  const path = getVaultPath();
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  renameSync(tmp, path);
}

export class TextStorageProvider implements StorageProvider {
  private async ensureDiscardedGroup(userId: string) {
    const vault = readVault();
    const exists = vault.groups.some(
      (group) => group.id === DISCARDED_GROUP_ID && group.userId === userId
    );
    if (!exists) {
      vault.groups.push(createDiscardedGroupStored(userId));
      writeVault(vault);
    }
  }

  async getGroups(userId: string) {
    await this.ensureDiscardedGroup(userId);
    const vault = readVault();
    return vault.groups
      .filter((g) => g.userId === userId)
      .map(toGroup)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createGroup(userId: string, name: string) {
    if (isReservedGroupName(name)) {
      throw new Error("Reserved group name");
    }
    const vault = readVault();
    const now = new Date().toISOString();
    const group = { id: uuidv4(), userId, name, createdAt: now };
    vault.groups.push(group);
    writeVault(vault);
    return toGroup(group);
  }

  async updateGroup(id: string, userId: string, name: string) {
    if (isSystemDiscardedGroup(id)) {
      throw new Error("Cannot modify system group");
    }
    if (isReservedGroupName(name)) {
      throw new Error("Reserved group name");
    }
    const vault = readVault();
    const group = vault.groups.find((g) => g.id === id && g.userId === userId);
    if (!group) throw new Error("Group not found");
    group.name = name;
    writeVault(vault);
    return toGroup(group);
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

    const vault = readVault();
    vault.groups = vault.groups.filter(
      (group) => !(group.id === id && group.userId === userId)
    );
    writeVault(vault);
  }

  async getItems(userId: string, groupId?: string) {
    const vault = readVault();
    return vault.items
      .filter(
        (i) =>
          i.userId === userId &&
          (groupId === undefined || i.groupId === groupId)
      )
      .map(toItem)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getItem(id: string, userId: string) {
    const vault = readVault();
    const item = vault.items.find((i) => i.id === id && i.userId === userId);
    return item ? toItem(item) : null;
  }

  async createItem(item: Omit<VaultItem, "id" | "createdAt" | "updatedAt">) {
    if (isSystemDiscardedGroup(item.groupId)) {
      throw new Error("Cannot create item in discarded group");
    }
    const vault = readVault();
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
    vault.items.push(stored);
    writeVault(vault);
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

    const vault = readVault();
    const item = vault.items.find((i) => i.id === id && i.userId === userId);
    if (!item) throw new Error("Item not found");
    if (data.groupId !== undefined) item.groupId = data.groupId;
    if (data.type !== undefined) item.type = data.type;
    if (data.name !== undefined) item.name = data.name;
    if (data.status !== undefined) item.status = data.status;
    if (data.payload !== undefined) {
      item.encryptedPayload = encryptItemPayload(data.payload);
    }
    item.updatedAt = new Date().toISOString();
    writeVault(vault);
    return toItem(item);
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
    const vault = readVault();
    return (vault.itemChanges ?? [])
      .filter((c) => c.itemId === itemId && c.userId === userId)
      .map(toItemChange)
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
    const vault = readVault();
    const stored = {
      id: uuidv4(),
      itemId,
      userId,
      encryptedChanges: encryptItemChanges(changes),
      createdAt: new Date().toISOString(),
    };
    if (!vault.itemChanges) vault.itemChanges = [];
    vault.itemChanges.push(stored);
    writeVault(vault);
    return toItemChange(stored);
  }

  async importVault(
    userId: string,
    data: ExportData,
    mode: "merge" | "replace"
  ) {
    const vault = readVault();
    if (mode === "replace") {
      vault.groups = vault.groups.filter((g) => g.userId !== userId);
      vault.items = vault.items.filter((i) => i.userId !== userId);
      vault.itemChanges = (vault.itemChanges ?? []).filter(
        (c) => c.userId !== userId
      );
    }
    for (const group of data.groups) {
      vault.groups.push(serializeGroup({ ...group, userId }));
    }
    for (const item of data.items) {
      const normalized = migrateLegacyItemType(item);
      const now = new Date().toISOString();
      vault.items.push({
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
      });
    }
    writeVault(vault);
    await this.ensureDiscardedGroup(userId);
  }

  async exportVault(userId: string) {
    const groups = await this.getGroups(userId);
    const vault = readVault();
    const items = vault.items
      .filter((i) => i.userId === userId)
      .map(toItem)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return buildExportData(groups, items);
  }
}
