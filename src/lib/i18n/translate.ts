import type { Locale } from "./config";
import { en, type MessageTree } from "./messages/en";
import { zhCN } from "./messages/zh-CN";

const catalogs: Record<Locale, MessageTree> = {
  en,
  "zh-CN": zhCN,
};

function lookup(tree: MessageTree, path: string): string | undefined {
  const parts = path.split(".");
  let node: string | MessageTree | undefined = tree;
  for (const part of parts) {
    if (!node || typeof node === "string") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

export type TranslateParams = Record<string, string | number>;

export type TranslateFn = (key: string, params?: TranslateParams) => string;

export function createTranslator(locale: Locale): TranslateFn {
  const primary = catalogs[locale];
  const fallback = catalogs.en;

  return (key, params) => {
    let text = lookup(primary, key) ?? lookup(fallback, key) ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };
}
