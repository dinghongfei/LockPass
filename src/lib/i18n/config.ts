export const LOCALES = ["en", "zh-CN"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_STORAGE_KEY = "lockpass-locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "zh-CN";
}

/** Prefer zh-CN when browser language starts with zh; otherwise English. */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const candidates = [
    navigator.language,
    ...(navigator.languages ?? []),
  ].filter(Boolean);
  for (const raw of candidates) {
    const lower = raw.toLowerCase();
    if (lower.startsWith("zh")) return "zh-CN";
  }
  return "en";
}

export function resolveInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // ignore
  }
  return detectBrowserLocale();
}
