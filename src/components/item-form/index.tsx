"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PasswordGenerator } from "@/components/password-generator";
import { SshCommandList } from "@/components/ssh-command-list";
import type { Group, ItemType } from "@/lib/types";
import { ITEM_TYPE_LABELS } from "@/lib/types";
import { isUserGroup } from "@/lib/system-groups";

interface ItemFormProps {
  groups: Group[];
  initial?: {
    id?: string;
    groupId: string;
    type: ItemType;
    name: string;
    payload: Record<string, string>;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const emptyPayloads: Record<ItemType, Record<string, string>> = {
  website: { url: "", username: "", password: "", notes: "" },
  card: {
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    pin: "",
    holderName: "",
    notes: "",
  },
  it_server: {
    instanceId: "",
    instanceName: "",
    privateIp: "",
    publicIp: "",
    username: "",
    password: "",
    notes: "",
  },
  it_ram: {
    platform: "",
    accountName: "",
    username: "",
    password: "",
    accessKeyId: "",
    accessKeySecret: "",
    notes: "",
  },
  it_api: {
    platform: "",
    username: "",
    password: "",
    apiKey: "",
    notes: "",
  },
};

export function ItemForm({ groups, initial, onSuccess, onCancel }: ItemFormProps) {
  const selectableGroups = groups.filter(isUserGroup);
  const [groupId, setGroupId] = useState(
    initial?.groupId && isUserGroup({ id: initial.groupId })
      ? initial.groupId
      : selectableGroups[0]?.id || ""
  );
  const [type, setType] = useState<ItemType>(initial?.type || "website");
  const [name, setName] = useState(initial?.name || "");
  const [payload, setPayload] = useState<Record<string, string>>(
    initial?.payload || emptyPayloads.website
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [genField, setGenField] = useState<string | null>(null);

  const handleTypeChange = (newType: ItemType) => {
    setType(newType);
    if (!initial) {
      setPayload(emptyPayloads[newType]);
    }
  };

  const updatePayload = (key: string, value: string) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) {
      setError("请先创建并选择一个分组");
      return;
    }
    setLoading(true);
    setError("");
    const url = initial?.id ? `/api/items/${initial.id}` : "/api/items";
    const method = initial?.id ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, type, name, payload }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "保存失败");
      return;
    }
    onSuccess();
  };

  const passwordField = (
    field: string,
    label: string,
    showGenerator = true
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <PasswordInput
          value={payload[field] || ""}
          onChange={(e) => updatePayload(field, e.target.value)}
          className="font-mono"
        />
        {showGenerator && (
          <Dialog
            open={genField === field}
            onOpenChange={(open) => setGenField(open ? field : null)}
          >
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="icon">
                <Shuffle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>生成密码</DialogTitle>
              </DialogHeader>
              <PasswordGenerator
                compact
                onSelect={(pwd) => {
                  updatePayload(field, pwd);
                  setGenField(null);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );

  const textField = (field: string, label: string, placeholder?: string) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={payload[field] || ""}
        onChange={(e) => updatePayload(field, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>条目类型</Label>
          <select
            className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as ItemType)}
            disabled={!!initial?.id}
          >
            {(Object.keys(ITEM_TYPE_LABELS) as ItemType[]).map((t) => (
              <option key={t} value={t}>
                {ITEM_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>所属分组</Label>
          <select
            className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            {selectableGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>名称</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="条目标题"
          required
        />
      </div>

      {type === "website" && (
        <>
          {textField("url", "网站地址", "https://example.com")}
          {textField("username", "用户名")}
          {passwordField("password", "密码")}
        </>
      )}

      {type === "card" && (
        <>
          {textField("cardName", "卡券名称")}
          <div className="space-y-2">
            <Label>卡号</Label>
            <Input
              value={payload.cardNumber || ""}
              onChange={(e) => updatePayload("cardNumber", e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {textField("expiry", "有效期", "MM/YY")}
            <div className="space-y-2">
              <Label>CVV</Label>
              <Input
                value={payload.cvv || ""}
                onChange={(e) => updatePayload("cvv", e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>PIN</Label>
              <Input
                value={payload.pin || ""}
                onChange={(e) => updatePayload("pin", e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          {textField("holderName", "持卡人")}
        </>
      )}

      {type === "it_server" && (
        <>
          {textField("instanceId", "实例 ID")}
          {textField("instanceName", "实例名称")}
          <div className="grid gap-4 sm:grid-cols-2">
            {textField("privateIp", "内网 IP")}
            {textField("publicIp", "公网 IP")}
          </div>
          {textField("username", "用户名")}
          {passwordField("password", "密码")}
          <SshCommandList
            username={payload.username}
            privateIp={payload.privateIp}
            publicIp={payload.publicIp}
          />
        </>
      )}

      {type === "it_ram" && (
        <>
          {textField("platform", "平台")}
          {textField("accountName", "账号名称")}
          {textField("username", "用户名")}
          {passwordField("password", "密码")}
          {passwordField("accessKeyId", "AccessKey ID（AK）", false)}
          {passwordField("accessKeySecret", "AccessKey Secret（SK）", false)}
        </>
      )}

      {type === "it_api" && (
        <>
          {textField("platform", "平台")}
          {textField("username", "用户名")}
          {passwordField("password", "密码")}
          {passwordField("apiKey", "API Key", false)}
        </>
      )}

      <div className="space-y-2">
        <Label>备注</Label>
        <Textarea
          value={payload.notes || ""}
          onChange={(e) => updatePayload("notes", e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "保存中..." : initial?.id ? "更新" : "创建"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          取消
        </Button>
      </div>
    </form>
  );
}
