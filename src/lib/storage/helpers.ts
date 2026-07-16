import { decryptPayload, encryptPayload } from "@/lib/crypto/encryption";
import { isSystemDiscardedGroup } from "@/lib/system-groups";
import type {
  ExportData,
  Group,
  ItemChangeEntry,
  ItemChangeRecord,
  ItemPayload,
  ItemStatus,
  ItemType,
  VaultItem,
} from "@/lib/types";
import { migrateLegacyItemType } from "@/lib/types";
import type { StoredGroup, StoredItem, StoredItemChange } from "./provider";

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toGroup(row: StoredGroup): Group {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    createdAt: new Date(row.createdAt),
  };
}

export function toItem(row: StoredItem): VaultItem {
  return migrateLegacyItemType({
    id: row.id,
    userId: row.userId,
    groupId: row.groupId,
    type: row.type as ItemType,
    name: row.name,
    status: row.status ?? "active",
    payload: decryptPayload<ItemPayload>(row.encryptedPayload),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  });
}

export function encryptItemPayload(payload: ItemPayload): string {
  return encryptPayload(payload);
}

type ItemUpdateData = Partial<
  Pick<VaultItem, "groupId" | "type" | "name" | "payload" | "status">
>;

export function assertItemUpdateAllowed(
  existing: VaultItem,
  data: ItemUpdateData
) {
  if (existing.status === "discarded") {
    if (data.status !== undefined && data.status !== "discarded") {
      throw new Error("Cannot update discarded item");
    }
    if (
      data.name !== undefined ||
      data.type !== undefined ||
      data.payload !== undefined
    ) {
      throw new Error("Cannot update discarded item");
    }
  }
  if (
    data.groupId !== undefined &&
    isSystemDiscardedGroup(data.groupId) &&
    (data.status ?? existing.status) !== "discarded"
  ) {
    throw new Error("Cannot assign active item to discarded group");
  }
}

export function encryptItemChanges(changes: ItemChangeEntry[]): string {
  return encryptPayload(changes);
}

export function decryptItemChanges(encrypted: string): ItemChangeEntry[] {
  return decryptPayload<ItemChangeEntry[]>(encrypted);
}

export function toItemChange(row: StoredItemChange): ItemChangeRecord {
  return {
    id: row.id,
    itemId: row.itemId,
    userId: row.userId,
    changes: decryptItemChanges(row.encryptedChanges),
    createdAt: new Date(row.createdAt),
  };
}

export function buildExportData(
  groups: Group[],
  items: VaultItem[]
): ExportData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    groups,
    items,
  };
}

export function serializeDates(item: VaultItem): StoredItem {
  return {
    id: item.id,
    userId: item.userId,
    groupId: item.groupId,
    type: item.type,
    name: item.name,
    status: item.status ?? "active",
    encryptedPayload: encryptItemPayload(item.payload),
    createdAt: toIsoString(item.createdAt),
    updatedAt: toIsoString(item.updatedAt),
  };
}

export function serializeGroup(group: Group): StoredGroup {
  return {
    id: group.id,
    userId: group.userId,
    name: group.name,
    createdAt: toIsoString(group.createdAt),
  };
}
