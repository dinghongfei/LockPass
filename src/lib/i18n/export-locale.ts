import { isLocale, type Locale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { createTranslator, type TranslateFn } from "@/lib/i18n/translate";
import {
  DISCARDED_GROUP_NAME,
  isSystemDiscardedGroup,
} from "@/lib/system-groups";
import type { ExportData, Group } from "@/lib/types";

export function resolveExportLocale(
  localeParam: string | null,
  acceptLanguage: string | null
): Locale {
  if (isLocale(localeParam)) return localeParam;
  if (acceptLanguage) {
    const primary = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
    if (primary.startsWith("zh")) return "zh-CN";
  }
  return DEFAULT_LOCALE;
}

/** Rewrite system group names for human-readable exports. */
export function localizeExportData(
  data: ExportData,
  t: TranslateFn
): ExportData {
  return {
    ...data,
    groups: data.groups.map((group) => localizeExportedGroup(group, t)),
  };
}

function localizeExportedGroup(group: Group, t: TranslateFn): Group {
  if (!isSystemDiscardedGroup(group.id)) return group;
  return { ...group, name: t("groups.discarded") };
}

/**
 * Keep the system discarded group on the canonical stored name after import,
 * regardless of the language used in the export file.
 */
export function normalizeImportedGroup<T extends { id: string; name: string }>(
  group: T
): T {
  if (isSystemDiscardedGroup(group.id)) {
    return { ...group, name: DISCARDED_GROUP_NAME };
  }
  return group;
}

export function localizeExportDataForLocale(
  data: ExportData,
  locale: Locale
): ExportData {
  return localizeExportData(data, createTranslator(locale));
}
