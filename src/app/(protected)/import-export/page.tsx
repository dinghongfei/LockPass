"use client";

import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function ImportExportPage() {
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setError("");
    setMessage("");
    const res = await fetch("/api/vault");
    if (!res.ok) {
      setError("导出失败");
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
    setMessage("导出成功");
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
        setError(result.error || "导入失败");
        return;
      }
      setMessage(
        mode === "replace" ? "全量替换导入成功" : "合并导入成功"
      );
    } catch {
      setError("文件格式无效");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>导出密码库</CardTitle>
          <p className="text-sm text-muted-foreground">
            导出所有分组和密码条目为 JSON 文件（含明文敏感数据，请妥善保管）
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport}>
            <Download className="mr-1 h-4 w-4" />
            导出 JSON
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>导入密码库</CardTitle>
          <p className="text-sm text-muted-foreground">
            从 JSON 文件导入密码数据
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>导入模式</Label>
            <select
              className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as "merge" | "replace")
              }
            >
              <option value="merge">合并（保留现有数据）</option>
              <option value="replace">全量替换（清除现有数据）</option>
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
                {loading ? "导入中..." : "选择 JSON 文件"}
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
