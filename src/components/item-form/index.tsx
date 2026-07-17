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
import { useT } from "@/lib/i18n/provider";
import type { Group, ItemType } from "@/lib/types";
import { ITEM_TYPES } from "@/lib/types";
import { isUserGroup } from "@/lib/system-groups";

interface ItemFormProps {
  groups: Group[];
  /** Preferred group when creating (ignored for edit via `initial`). */
  defaultGroupId?: string;
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

function resolveDefaultGroupId(
  selectableGroups: Group[],
  initialGroupId?: string,
  preferredGroupId?: string
): string {
  if (initialGroupId && isUserGroup({ id: initialGroupId })) {
    return initialGroupId;
  }
  if (
    preferredGroupId &&
    isUserGroup({ id: preferredGroupId }) &&
    selectableGroups.some((g) => g.id === preferredGroupId)
  ) {
    return preferredGroupId;
  }
  return selectableGroups[0]?.id || "";
}

export function ItemForm({
  groups,
  defaultGroupId,
  initial,
  onSuccess,
  onCancel,
}: ItemFormProps) {
  const t = useT();
  const selectableGroups = groups.filter(isUserGroup);
  const [groupId, setGroupId] = useState(() =>
    resolveDefaultGroupId(
      selectableGroups,
      initial?.groupId,
      defaultGroupId
    )
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
      setError(t("item.selectGroupFirst"));
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
      setError(data.error || t("item.saveFailed"));
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
                <DialogTitle>{t("item.generatePassword")}</DialogTitle>
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
          <Label>{t("item.type")}</Label>
          <select
            className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as ItemType)}
            disabled={!!initial?.id}
          >
            {ITEM_TYPES.map((itemType) => (
              <option key={itemType} value={itemType}>
                {t(`itemTypes.${itemType}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>{t("item.group")}</Label>
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
        <Label>{t("item.name")}</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("item.namePlaceholder")}
          required
        />
      </div>

      {type === "website" && (
        <>
          {textField("url", t("fields.url"), "https://example.com")}
          {textField("username", t("fields.username"))}
          {passwordField("password", t("fields.password"))}
        </>
      )}

      {type === "card" && (
        <>
          {textField("cardName", t("fields.cardName"))}
          <div className="space-y-2">
            <Label>{t("fields.cardNumber")}</Label>
            <Input
              value={payload.cardNumber || ""}
              onChange={(e) => updatePayload("cardNumber", e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {textField("expiry", t("fields.expiry"), "MM/YY")}
            <div className="space-y-2">
              <Label>{t("fields.cvv")}</Label>
              <Input
                value={payload.cvv || ""}
                onChange={(e) => updatePayload("cvv", e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("fields.pin")}</Label>
              <Input
                value={payload.pin || ""}
                onChange={(e) => updatePayload("pin", e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          {textField("holderName", t("fields.holderName"))}
        </>
      )}

      {type === "it_server" && (
        <>
          {textField("instanceId", t("fields.instanceId"))}
          {textField("instanceName", t("fields.instanceName"))}
          <div className="grid gap-4 sm:grid-cols-2">
            {textField("privateIp", t("fields.privateIp"))}
            {textField("publicIp", t("fields.publicIp"))}
          </div>
          {textField("username", t("fields.username"))}
          {passwordField("password", t("fields.password"))}
          <SshCommandList
            username={payload.username}
            privateIp={payload.privateIp}
            publicIp={payload.publicIp}
          />
        </>
      )}

      {type === "it_ram" && (
        <>
          {textField("platform", t("fields.platform"))}
          {textField("accountName", t("fields.accountName"))}
          {textField("username", t("fields.username"))}
          {passwordField("password", t("fields.password"))}
          {passwordField("accessKeyId", t("fields.accessKeyId"), false)}
          {passwordField("accessKeySecret", t("fields.accessKeySecret"), false)}
        </>
      )}

      {type === "it_api" && (
        <>
          {textField("platform", t("fields.platform"))}
          {textField("username", t("fields.username"))}
          {passwordField("password", t("fields.password"))}
          {passwordField("apiKey", t("fields.apiKey"), false)}
        </>
      )}

      <div className="space-y-2">
        <Label>{t("fields.notes")}</Label>
        <Textarea
          value={payload.notes || ""}
          onChange={(e) => updatePayload("notes", e.target.value)}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading
            ? t("common.saving")
            : initial?.id
              ? t("common.save")
              : t("common.create")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
