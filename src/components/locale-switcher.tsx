"use client";

import { LOCALES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface LocaleSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function LocaleSwitcher({ className, compact }: LocaleSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-muted-foreground",
        className
      )}
    >
      {!compact && (
        <span className="hidden sm:inline">{t("locale.label")}</span>
      )}
      <select
        className="h-8 rounded-md border border-border bg-card px-2 text-sm text-foreground"
        aria-label={t("locale.label")}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {t(`locale.${code}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
