"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { copyText } from "@/lib/clipboard";
import { useT } from "@/lib/i18n/provider";
import {
  DEFAULT_PASSWORD_OPTIONS,
  PASSWORD_PREFIX_OPTIONS,
  type PasswordGeneratorOptions,
  type PasswordPrefix,
} from "@/lib/types";

interface PasswordGeneratorProps {
  compact?: boolean;
  onSelect?: (password: string) => void;
}

export function PasswordGenerator({
  compact = false,
  onSelect,
}: PasswordGeneratorProps) {
  const t = useT();
  const [options, setOptions] = useState<PasswordGeneratorOptions>(
    DEFAULT_PASSWORD_OPTIONS
  );
  const [prefix, setPrefix] = useState<PasswordPrefix>("");
  const [generated, setGenerated] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const password = useMemo(
    () => `${prefix}${generated}`,
    [prefix, generated]
  );

  const generate = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/password/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("generator.failed"));
        return;
      }
      setGenerated(data.password);
    } catch {
      setError(t("generator.failed"));
    }
  }, [options, t]);

  useEffect(() => {
    generate();
  }, [generate]);

  const handleCopy = async () => {
    if (!password) return;
    await copyText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateOption = <K extends keyof PasswordGeneratorOptions>(
    key: K,
    value: PasswordGeneratorOptions[K]
  ) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const checkboxOptions = [
    ["includeUppercase", "generator.includeUppercase"],
    ["includeLowercase", "generator.includeLowercase"],
    ["includeNumbers", "generator.includeNumbers"],
    ["includeSpecial", "generator.includeSpecial"],
    ["excludeAmbiguous", "generator.excludeAmbiguous"],
  ] as const;

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <select
            aria-label={t("generator.prefix")}
            className="h-9 shrink-0 rounded-md border border-border bg-card px-2 font-mono text-sm"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value as PasswordPrefix)}
          >
            {PASSWORD_PREFIX_OPTIONS.map((value) => (
              <option key={value || "none"} value={value}>
                {value === "" ? t("generator.prefixNone") : value}
              </option>
            ))}
          </select>
          <Input
            readOnly
            value={password}
            className="min-w-0 flex-1 font-mono text-base"
            placeholder={t("generator.placeholder")}
          />
        </div>
        <Button type="button" variant="outline" onClick={generate}>
          <RefreshCw className="h-4 w-4" />
          {t("common.refresh")}
        </Button>
        <Button type="button" variant="outline" onClick={handleCopy}>
          <Copy className="h-4 w-4" />
          {copied ? t("common.copied") : t("common.copy")}
        </Button>
        {onSelect && password && (
          <Button type="button" onClick={() => onSelect(password)}>
            {t("common.use")}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-2"}`}>
        <div className="space-y-2">
          <Label htmlFor="length">{t("generator.length")}</Label>
          <Input
            id="length"
            type="number"
            min={8}
            max={128}
            value={options.length}
            onChange={(e) =>
              updateOption("length", parseInt(e.target.value, 10) || 16)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minNumbers">{t("generator.minNumbers")}</Label>
          <Input
            id="minNumbers"
            type="number"
            min={0}
            max={32}
            value={options.minNumbers}
            onChange={(e) =>
              updateOption("minNumbers", parseInt(e.target.value, 10) || 0)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minSpecial">{t("generator.minSpecial")}</Label>
          <Input
            id="minSpecial"
            type="number"
            min={0}
            max={32}
            value={options.minSpecialChars}
            onChange={(e) =>
              updateOption(
                "minSpecialChars",
                parseInt(e.target.value, 10) || 0
              )
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {checkboxOptions.map(([key, labelKey]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={options[key]}
              onCheckedChange={(checked) =>
                updateOption(key, checked === true)
              }
            />
            {t(labelKey)}
          </label>
        ))}
      </div>
    </div>
  );
}
