export const ITEM_TYPES = [
  "website",
  "card",
  "it_server",
  "it_ram",
  "it_api",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const IT_ITEM_TYPES = ["it_server", "it_ram", "it_api"] as const;

export type ItItemType = (typeof IT_ITEM_TYPES)[number];

export function isItItemType(type: string): type is ItItemType {
  return (IT_ITEM_TYPES as readonly string[]).includes(type);
}

export type ItemStatus = "active" | "discarded";

export interface GroupItemStats {
  active: number;
  discarded: number;
}

export interface Group {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
}

export interface WebsitePayload {
  url?: string;
  username?: string;
  password?: string;
  notes?: string;
}

export interface CardPayload {
  cardName?: string;
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
  pin?: string;
  holderName?: string;
  notes?: string;
}

/** IT-服务器 */
export interface ItServerPayload {
  instanceId?: string;
  instanceName?: string;
  privateIp?: string;
  publicIp?: string;
  username?: string;
  password?: string;
  notes?: string;
}

/** IT-RAM用户 */
export interface ItRamPayload {
  platform?: string;
  accountName?: string;
  username?: string;
  password?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  notes?: string;
}

/** IT-API */
export interface ItApiPayload {
  platform?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  notes?: string;
}

export type ItemPayload =
  | WebsitePayload
  | CardPayload
  | ItServerPayload
  | ItRamPayload
  | ItApiPayload;

/** 旧版统一 IT payload（迁移用） */
interface LegacyItOpsPayload {
  host?: string;
  username?: string;
  secret?: string;
  privateKey?: string;
  keyType?: string;
  notes?: string;
}

const LEGACY_KEY_TYPE_MAP: Record<string, ItItemType> = {
  ssh: "it_server",
  server: "it_server",
  api: "it_api",
  token: "it_api",
};

function migrateLegacyItOpsPayload(
  type: ItItemType,
  raw: LegacyItOpsPayload
): ItemPayload {
  if (type === "it_server") {
    return {
      privateIp: raw.host,
      username: raw.username,
      password: raw.secret,
      notes: raw.notes,
    };
  }
  if (type === "it_ram") {
    return {
      platform: raw.host,
      username: raw.username,
      password: raw.secret,
      accessKeySecret: raw.privateKey,
      notes: raw.notes,
    };
  }
  return {
    platform: raw.host,
    username: raw.username,
    password: raw.secret,
    apiKey: raw.privateKey || raw.secret,
    notes: raw.notes,
  };
}

function resolveLegacyType(type: string, raw: LegacyItOpsPayload): ItItemType {
  if (type === "it_key") {
    return LEGACY_KEY_TYPE_MAP[raw.keyType || "server"] ?? "it_server";
  }
  if (type === "it_ssh" || type === "it_server") return "it_server";
  if (type === "it_ram") return "it_ram";
  if (type === "it_token" || type === "it_api") return "it_api";
  return "it_server";
}

/** 将旧版 IT 条目类型与字段迁移为当前模型 */
export function migrateLegacyItemType<T extends { type: string; payload: ItemPayload }>(
  item: T
): T {
  const legacyTypes = [
    "it_key",
    "it_ssh",
    "it_token",
    "it_server",
    "it_api",
    "it_ram",
  ];
  if (!legacyTypes.includes(item.type)) return item;

  const currentTypes: ItemType[] = ["it_server", "it_ram", "it_api"];
  if (currentTypes.includes(item.type as ItemType) && item.type !== "it_key") {
    const payload = item.payload as LegacyItOpsPayload & ItemPayload;
    if (!("host" in payload) && !("secret" in payload) && !("keyType" in payload)) {
      return item;
    }
  }

  const raw = item.payload as LegacyItOpsPayload;
  const newType = resolveLegacyType(item.type, raw);
  const newPayload = migrateLegacyItOpsPayload(newType, raw);
  return { ...item, type: newType, payload: newPayload };
}

export interface VaultItem {
  id: string;
  userId: string;
  groupId: string;
  type: ItemType;
  name: string;
  status: ItemStatus;
  payload: ItemPayload;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemChangeEntry {
  field: string;
  oldValue?: string;
  newValue?: string;
}

export interface ItemChangeRecord {
  id: string;
  itemId: string;
  userId: string;
  changes: ItemChangeEntry[];
  createdAt: Date;
}

export interface ExportData {
  version: 1;
  exportedAt: string;
  groups: Group[];
  items: VaultItem[];
}

export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSpecial: boolean;
  minNumbers: number;
  minSpecialChars: number;
  excludeAmbiguous: boolean;
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordGeneratorOptions = {
  length: 16,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSpecial: true,
  minNumbers: 1,
  minSpecialChars: 1,
  excludeAmbiguous: true,
};

/** Optional prefixes prepended to the generated random part (empty = none). */
export const PASSWORD_PREFIX_OPTIONS = ["", "sk-", "pk-", "ak-"] as const;

export type PasswordPrefix = (typeof PASSWORD_PREFIX_OPTIONS)[number];

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  website: "网站",
  card: "个人卡券",
  it_server: "IT-服务器",
  it_ram: "IT-RAM用户",
  it_api: "IT-API",
};

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  active: "正常",
  discarded: "已废弃",
};
