import type { StoredGroup } from "@/lib/storage/provider";

export const DISCARDED_GROUP_ID = "__system_discarded__";
export const DISCARDED_GROUP_NAME = "已废弃";

export function isSystemDiscardedGroup(groupId: string): boolean {
  return groupId === DISCARDED_GROUP_ID;
}

export function isReservedGroupName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return (
    normalized === DISCARDED_GROUP_NAME.toLowerCase() ||
    normalized === "discarded"
  );
}

export function createDiscardedGroupStored(userId: string): StoredGroup {
  return {
    id: DISCARDED_GROUP_ID,
    userId,
    name: DISCARDED_GROUP_NAME,
    createdAt: new Date(0).toISOString(),
  };
}

export function isUserGroup(group: { id: string }): boolean {
  return !isSystemDiscardedGroup(group.id);
}
