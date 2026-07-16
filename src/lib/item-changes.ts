import type { ItemChangeEntry, ItemStatus, ItemType, VaultItem } from "@/lib/types";
import { ITEM_STATUS_LABELS, ITEM_TYPE_LABELS } from "@/lib/types";

export const SENSITIVE_ITEM_FIELDS = new Set([
  "password",
  "cvv",
  "pin",
  "cardNumber",
  "accessKeyId",
  "accessKeySecret",
  "apiKey",
]);

export const ITEM_FIELD_LABELS: Record<string, string> = {
  groupId: "所属分组",
  type: "条目类型",
  name: "名称",
  status: "状态",
  url: "网站地址",
  username: "用户名",
  password: "密码",
  notes: "备注",
  cardName: "卡券名称",
  cardNumber: "卡号",
  expiry: "有效期",
  cvv: "CVV",
  pin: "PIN",
  holderName: "持卡人",
  instanceId: "实例 ID",
  instanceName: "实例名称",
  privateIp: "内网 IP",
  publicIp: "公网 IP",
  platform: "平台",
  accountName: "账号名称",
  accessKeyId: "AccessKey ID（AK）",
  accessKeySecret: "AccessKey Secret（SK）",
  apiKey: "API Key",
};

export function isSensitiveField(field: string): boolean {
  return SENSITIVE_ITEM_FIELDS.has(field);
}

export function getFieldLabel(field: string): string {
  return ITEM_FIELD_LABELS[field] ?? field;
}

export function formatFieldValue(
  field: string,
  value: string | undefined,
  groupNames?: Record<string, string>
): string {
  if (value === undefined || value === "") return "—";
  if (field === "groupId" && groupNames) {
    return groupNames[value] ?? value;
  }
  if (field === "type") {
    return ITEM_TYPE_LABELS[value as ItemType] ?? value;
  }
  if (field === "status") {
    return ITEM_STATUS_LABELS[value as ItemStatus] ?? value;
  }
  return value;
}

export function computeItemChanges(
  existing: VaultItem,
  data: Partial<Pick<VaultItem, "groupId" | "type" | "name" | "payload" | "status">>
): ItemChangeEntry[] {
  const changes: ItemChangeEntry[] = [];

  if (data.groupId !== undefined && data.groupId !== existing.groupId) {
    changes.push({
      field: "groupId",
      oldValue: existing.groupId,
      newValue: data.groupId,
    });
  }
  if (data.type !== undefined && data.type !== existing.type) {
    changes.push({
      field: "type",
      oldValue: existing.type,
      newValue: data.type,
    });
  }
  if (data.name !== undefined && data.name !== existing.name) {
    changes.push({
      field: "name",
      oldValue: existing.name,
      newValue: data.name,
    });
  }
  if (data.status !== undefined && data.status !== existing.status) {
    changes.push({
      field: "status",
      oldValue: existing.status,
      newValue: data.status,
    });
  }
  if (data.payload !== undefined) {
    const oldPayload = existing.payload as Record<string, string | undefined>;
    const newPayload = data.payload as Record<string, string | undefined>;
    const keys = new Set([
      ...Object.keys(oldPayload),
      ...Object.keys(newPayload),
    ]);
    for (const key of keys) {
      const oldVal = oldPayload[key] ?? "";
      const newVal = newPayload[key] ?? "";
      if (oldVal !== newVal) {
        changes.push({ field: key, oldValue: oldVal, newValue: newVal });
      }
    }
  }

  return changes;
}
