"use client";

import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/provider";

export default function ImportExportPage() {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setError("");
    setMessage("");
    const res = await fetch(
      `/api/vault?locale=${encodeURIComponent(locale)}`
    );
    if (!res.ok) {
      setError(t("importExport.exportFailed"));
      return;
    }
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lockpass-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(t("importExport.exportOk"));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, data }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || t("importExport.importFailed"));
        return;
      }
      setMessage(
        mode === "replace"
          ? t("importExport.importReplaceOk")
          : t("importExport.importMergeOk")
      );
    } catch {
      setError(t("importExport.invalidFile"));
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("importExport.exportTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("importExport.exportDesc")}
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport}>
            <Download className="mr-1 h-4 w-4" />
            {t("importExport.exportJson")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("importExport.importTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("importExport.importDesc")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("importExport.importMode")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as "merge" | "replace")
              }
            >
              <option value="merge">{t("importExport.merge")}</option>
              <option value="replace">{t("importExport.replace")}</option>
            </select>
          </div>
          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-file"
              disabled={loading}
            />
            <Button asChild disabled={loading}>
              <label htmlFor="import-file" className="cursor-pointer">
                <Upload className="mr-1 h-4 w-4" />
                {loading ? t("importExport.importing") : t("importExport.chooseFile")}
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>

      {message && (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
