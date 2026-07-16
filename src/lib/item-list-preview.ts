import { buildSshCommands } from "@/lib/it-commands";
import type { TranslateFn } from "@/lib/i18n/translate";
import type { ItemType, VaultItem } from "@/lib/types";

export interface ItemListField {
  label: string;
  value?: string;
  /** Masked in the list; copy still uses the real value */
  sensitive?: boolean;
  copyable?: boolean;
}

function payloadOf(item: VaultItem): Record<string, string | undefined> {
  return item.payload as Record<string, string | undefined>;
}

function contextField(label: string, value?: string): ItemListField | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return { label, value: trimmed, copyable: false };
}

function copyField(
  label: string,
  value?: string,
  sensitive = false
): ItemListField | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return { label, value: trimmed, sensitive, copyable: true };
}

/**
 * List-card quick fields (by usage scenario).
 */
export function getItemListFields(
  item: VaultItem,
  t: TranslateFn
): ItemListField[] {
  const p = payloadOf(item);
  const fields: ItemListField[] = [];

  switch (item.type as ItemType) {
    case "website": {
      for (const f of [
        copyField(t("fields.website"), p.url),
        copyField(t("fields.username"), p.username),
        copyField(t("fields.password"), p.password, true),
      ]) {
        if (f) fields.push(f);
      }
      break;
    }
    case "card": {
      const ctx = contextField(t("fields.card"), p.cardName);
      if (ctx) fields.push(ctx);
      for (const f of [
        copyField(t("fields.cardNumber"), p.cardNumber, true),
        copyField(t("fields.expiry"), p.expiry),
      ]) {
        if (f) fields.push(f);
      }
      break;
    }
    case "it_server": {
      const ctx = contextField(t("fields.instanceName"), p.instanceName?.trim());
      if (ctx) fields.push(ctx);

      for (const cmd of buildSshCommands(p.username, p.privateIp, p.publicIp)) {
        fields.push({
          label: t("fields.ssh", { label: t(`ssh.${cmd.network}`) }),
          value: cmd.command,
          copyable: true,
        });
      }
      const password = copyField(t("fields.password"), p.password, true);
      if (password) fields.push(password);
      break;
    }
    case "it_ram": {
      const ctxText = [p.platform?.trim(), p.accountName?.trim()]
        .filter(Boolean)
        .join(" · ");
      const ctx = contextField(t("fields.account"), ctxText || undefined);
      if (ctx) fields.push(ctx);
      for (const f of [
        copyField(t("fields.ak"), p.accessKeyId, true),
        copyField(t("fields.sk"), p.accessKeySecret, true),
      ]) {
        if (f) fields.push(f);
      }
      break;
    }
    case "it_api": {
      const ctx = contextField(t("fields.platform"), p.platform);
      if (ctx) fields.push(ctx);
      for (const f of [
        copyField(t("fields.username"), p.username),
        copyField(t("fields.apiKey"), p.apiKey, true),
      ]) {
        if (f) fields.push(f);
      }
      break;
    }
  }

  return fields;
}
