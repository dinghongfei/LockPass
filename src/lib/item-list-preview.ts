import { buildSshCommands } from "@/lib/it-commands";
import type { ItemType, VaultItem } from "@/lib/types";

export interface ItemListField {
  label: string;
  value?: string;
  /** 列表中掩码显示，仍可复制真实值 */
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
 * 列表卡片快捷字段（按使用场景选取）：
 *
 * - 网站：登录时最常复制用户名 + 密码；URL 用于打开站点
 * - 卡券：支付时复制卡号 + 有效期；卡券名称用于识别
 * - IT-服务器：运维首选复制 SSH 指令；密码作备用；实例信息辅助定位
 * - IT-RAM用户：CLI/SDK 使用 AK + SK；平台与账号名辅助识别
 * - IT-API：调用接口复制 API Key；平台与用户名辅助识别
 */
export function getItemListFields(item: VaultItem): ItemListField[] {
  const p = payloadOf(item);
  const fields: ItemListField[] = [];

  switch (item.type as ItemType) {
    case "website": {
      for (const f of [
        copyField("网站", p.url),
        copyField("用户名", p.username),
        copyField("密码", p.password, true),
      ]) {
        if (f) fields.push(f);
      }
      break;
    }
    case "card": {
      const ctx = contextField("卡券", p.cardName);
      if (ctx) fields.push(ctx);
      for (const f of [
        copyField("卡号", p.cardNumber, true),
        copyField("有效期", p.expiry),
      ]) {
        if (f) fields.push(f);
      }
      break;
    }
    case "it_server": {
      const ctx = contextField("实例名称", p.instanceName?.trim());
      if (ctx) fields.push(ctx);

      for (const cmd of buildSshCommands(p.username, p.privateIp, p.publicIp)) {
        fields.push({
          label: `SSH（${cmd.label}）`,
          value: cmd.command,
          copyable: true,
        });
      }
      const password = copyField("密码", p.password, true);
      if (password) fields.push(password);
      break;
    }
    case "it_ram": {
      const ctxText = [p.platform?.trim(), p.accountName?.trim()]
        .filter(Boolean)
        .join(" · ");
      const ctx = contextField("账号", ctxText || undefined);
      if (ctx) fields.push(ctx);
      for (const f of [
        copyField("AK", p.accessKeyId, true),
        copyField("SK", p.accessKeySecret, true),
      ]) {
        if (f) fields.push(f);
      }
      break;
    }
    case "it_api": {
      const ctx = contextField("平台", p.platform);
      if (ctx) fields.push(ctx);
      for (const f of [
        copyField("用户名", p.username),
        copyField("API Key", p.apiKey, true),
      ]) {
        if (f) fields.push(f);
      }
      break;
    }
  }

  return fields;
}
