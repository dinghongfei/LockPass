"use client";

import { useState } from "react";
import { ArrowLeft, Archive, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SensitiveValue } from "@/components/ui/sensitive-value";
import { SshCommandList } from "@/components/ssh-command-list";
import { useT } from "@/lib/i18n/provider";
import { isSystemDiscardedGroup } from "@/lib/system-groups";
import type { Group, ItemType, VaultItem } from "@/lib/types";

interface ItemDetailProps {
  item: VaultItem;
  groups: Group[];
  onEdit: () => void;
  onBack: () => void;
  onDiscard: (moveToDiscardedGroup: boolean) => Promise<boolean>;
}

function DetailField({
  label,
  value,
  sensitive = false,
  multiline = false,
  copyable = false,
}: {
  label: string;
  value?: string;
  sensitive?: boolean;
  multiline?: boolean;
  copyable?: boolean;
}) {
  const t = useT();

  return (
    <div className="space-y-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>
        {sensitive ? (
          <SensitiveValue
            value={value}
            multiline={multiline}
            copyable={copyable}
          />
        ) : multiline ? (
          <pre className="whitespace-pre-wrap break-all text-sm">
            {value || (
              <span className="text-muted-foreground">{t("common.empty")}</span>
            )}
          </pre>
        ) : (
          <span className="break-all text-sm">
            {value || (
              <span className="text-muted-foreground">{t("common.empty")}</span>
            )}
          </span>
        )}
      </dd>
    </div>
  );
}

export function ItemDetail({
  item,
  groups,
  onEdit,
  onBack,
  onDiscard,
}: ItemDetailProps) {
  const t = useT();
  const payload = item.payload as Record<string, string>;
  const groupName = isSystemDiscardedGroup(item.groupId)
    ? t("groups.discarded")
    : groups.find((g) => g.id === item.groupId)?.name || t("common.unknownGroup");
  const type = item.type as ItemType;
  const isDiscarded = item.status === "discarded";
  const [discardOpen, setDiscardOpen] = useState(false);
  const [discardLoading, setDiscardLoading] = useState(false);
  const [moveToDiscardedGroup, setMoveToDiscardedGroup] = useState(true);

  const handleCancelDiscard = () => {
    setDiscardOpen(false);
    setMoveToDiscardedGroup(true);
  };

  const confirmDiscard = async () => {
    setDiscardLoading(true);
    const ok = await onDiscard(moveToDiscardedGroup);
    setDiscardLoading(false);
    if (ok) handleCancelDiscard();
  };

  return (
    <div className="space-y-6">
      {isDiscarded && (
        <span className="inline-block rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
          {t("itemStatus.discarded")}
        </span>
      )}

      <dl className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailField label={t("fields.type")} value={t(`itemTypes.${type}`)} />
          <DetailField label={t("fields.groupId")} value={groupName} />
        </div>
        <DetailField label={t("fields.name")} value={item.name} />

        {type === "website" && (
          <>
            <DetailField label={t("fields.url")} value={payload.url} />
            <DetailField label={t("fields.username")} value={payload.username} />
            <DetailField
              label={t("fields.password")}
              value={payload.password}
              sensitive
              copyable
            />
          </>
        )}

        {type === "card" && (
          <>
            <DetailField label={t("fields.cardName")} value={payload.cardName} />
            <DetailField
              label={t("fields.cardNumber")}
              value={payload.cardNumber}
              sensitive
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <DetailField label={t("fields.expiry")} value={payload.expiry} />
              <DetailField label={t("fields.cvv")} value={payload.cvv} sensitive />
              <DetailField label={t("fields.pin")} value={payload.pin} sensitive />
            </div>
            <DetailField label={t("fields.holderName")} value={payload.holderName} />
          </>
        )}

        {type === "it_server" && (
          <>
            <DetailField label={t("fields.instanceId")} value={payload.instanceId} />
            <DetailField label={t("fields.instanceName")} value={payload.instanceName} />
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailField label={t("fields.privateIp")} value={payload.privateIp} />
              <DetailField label={t("fields.publicIp")} value={payload.publicIp} />
            </div>
            <DetailField label={t("fields.username")} value={payload.username} />
            <DetailField
              label={t("fields.password")}
              value={payload.password}
              sensitive
              copyable
            />
            <SshCommandList
              username={payload.username}
              privateIp={payload.privateIp}
              publicIp={payload.publicIp}
            />
          </>
        )}

        {type === "it_ram" && (
          <>
            <DetailField label={t("fields.platform")} value={payload.platform} />
            <DetailField label={t("fields.accountName")} value={payload.accountName} />
            <DetailField label={t("fields.username")} value={payload.username} />
            <DetailField
              label={t("fields.password")}
              value={payload.password}
              sensitive
              copyable
            />
            <DetailField
              label={t("fields.accessKeyId")}
              value={payload.accessKeyId}
              sensitive
              copyable
            />
            <DetailField
              label={t("fields.accessKeySecret")}
              value={payload.accessKeySecret}
              sensitive
              copyable
            />
          </>
        )}

        {type === "it_api" && (
          <>
            <DetailField label={t("fields.platform")} value={payload.platform} />
            <DetailField label={t("fields.username")} value={payload.username} />
            <DetailField
              label={t("fields.password")}
              value={payload.password}
              sensitive
              copyable
            />
            <DetailField
              label={t("fields.apiKey")}
              value={payload.apiKey}
              sensitive
              copyable
            />
          </>
        )}

        <DetailField label={t("fields.notes")} value={payload.notes} multiline />
      </dl>

      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t("common.back")}
        </Button>
        {!isDiscarded && (
          <>
            <Button onClick={onEdit}>
              <Pencil className="mr-1 h-4 w-4" />
              {t("common.edit")}
            </Button>
            <Button variant="destructive" onClick={() => setDiscardOpen(true)}>
              <Archive className="mr-1 h-4 w-4" />
              {t("item.discard")}
            </Button>
          </>
        )}
      </div>

      <Dialog
        open={discardOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) handleCancelDiscard();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("item.discardTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("item.discardConfirm", { name: item.name })}
          </p>
          <div className="flex items-center gap-2">
            <Checkbox
              id="move-to-discarded-group"
              checked={moveToDiscardedGroup}
              onCheckedChange={(checked) =>
                setMoveToDiscardedGroup(checked === true)
              }
            />
            <Label
              htmlFor="move-to-discarded-group"
              className="cursor-pointer text-sm font-normal"
            >
              {t("item.moveToDiscarded", { discarded: t("groups.discarded") })}
            </Label>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelDiscard}
              disabled={discardLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDiscard}
              disabled={discardLoading}
            >
              {t("item.discard")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
