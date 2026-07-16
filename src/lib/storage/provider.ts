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

export interface StorageProvider {
  getGroups(userId: string): Promise<Group[]>;
  createGroup(userId: string, name: string): Promise<Group>;
  updateGroup(id: string, userId: string, name: string): Promise<Group>;
  deleteGroup(id: string, userId: string): Promise<void>;
  getItems(userId: string, groupId?: string): Promise<VaultItem[]>;
  getItem(id: string, userId: string): Promise<VaultItem | null>;
  createItem(
    item: Omit<VaultItem, "id" | "createdAt" | "updatedAt">
  ): Promise<VaultItem>;
  updateItem(
    id: string,
    userId: string,
    data: Partial<Pick<VaultItem, "groupId" | "type" | "name" | "payload" | "status">>
  ): Promise<VaultItem>;
  discardItem(
    id: string,
    userId: string,
    options?: { moveToDiscardedGroup?: boolean }
  ): Promise<VaultItem>;
  getItemChanges(itemId: string, userId: string): Promise<ItemChangeRecord[]>;
  recordItemChange(
    itemId: string,
    userId: string,
    changes: ItemChangeEntry[]
  ): Promise<ItemChangeRecord>;
  importVault(
    userId: string,
    data: ExportData,
    mode: "merge" | "replace"
  ): Promise<void>;
  exportVault(userId: string): Promise<ExportData>;
}

export interface StoredGroup {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

export interface StoredItem {
  id: string;
  userId: string;
  groupId: string;
  type: ItemType;
  name: string;
  status: ItemStatus;
  encryptedPayload: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredItemChange {
  id: string;
  itemId: string;
  userId: string;
  encryptedChanges: string;
  createdAt: string;
}

export interface TextVaultData {
  groups: StoredGroup[];
  items: StoredItem[];
  itemChanges?: StoredItemChange[];
}
