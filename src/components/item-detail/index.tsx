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
import { DISCARDED_GROUP_NAME } from "@/lib/system-groups";
import type { Group, ItemType, VaultItem } from "@/lib/types";
import { ITEM_STATUS_LABELS, ITEM_TYPE_LABELS } from "@/lib/types";

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
            {value || <span className="text-muted-foreground">—</span>}
          </pre>
        ) : (
          <span className="break-all text-sm">
            {value || <span className="text-muted-foreground">—</span>}
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
  const payload = item.payload as Record<string, string>;
  const groupName =
    groups.find((g) => g.id === item.groupId)?.name || "未知分组";
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
          {ITEM_STATUS_LABELS.discarded}
        </span>
      )}

      <dl className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailField label="条目类型" value={ITEM_TYPE_LABELS[type]} />
          <DetailField label="所属分组" value={groupName} />
        </div>
        <DetailField label="名称" value={item.name} />

        {type === "website" && (
          <>
            <DetailField label="网站地址" value={payload.url} />
            <DetailField label="用户名" value={payload.username} />
            <DetailField
              label="密码"
              value={payload.password}
              sensitive
              copyable
            />
          </>
        )}

        {type === "card" && (
          <>
            <DetailField label="卡券名称" value={payload.cardName} />
            <DetailField
              label="卡号"
              value={payload.cardNumber}
              sensitive
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <DetailField label="有效期" value={payload.expiry} />
              <DetailField label="CVV" value={payload.cvv} sensitive />
              <DetailField label="PIN" value={payload.pin} sensitive />
            </div>
            <DetailField label="持卡人" value={payload.holderName} />
          </>
        )}

        {type === "it_server" && (
          <>
            <DetailField label="实例 ID" value={payload.instanceId} />
            <DetailField label="实例名称" value={payload.instanceName} />
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailField label="内网 IP" value={payload.privateIp} />
              <DetailField label="公网 IP" value={payload.publicIp} />
            </div>
            <DetailField label="用户名" value={payload.username} />
            <DetailField
              label="密码"
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
            <DetailField label="平台" value={payload.platform} />
            <DetailField label="账号名称" value={payload.accountName} />
            <DetailField label="用户名" value={payload.username} />
            <DetailField
              label="密码"
              value={payload.password}
              sensitive
              copyable
            />
            <DetailField
              label="AccessKey ID（AK）"
              value={payload.accessKeyId}
              sensitive
              copyable
            />
            <DetailField
              label="AccessKey Secret（SK）"
              value={payload.accessKeySecret}
              sensitive
              copyable
            />
          </>
        )}

        {type === "it_api" && (
          <>
            <DetailField label="平台" value={payload.platform} />
            <DetailField label="用户名" value={payload.username} />
            <DetailField
              label="密码"
              value={payload.password}
              sensitive
              copyable
            />
            <DetailField
              label="API Key"
              value={payload.apiKey}
              sensitive
              copyable
            />
          </>
        )}

        <DetailField label="备注" value={payload.notes} multiline />
      </dl>

      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回
        </Button>
        {!isDiscarded && (
          <>
            <Button onClick={onEdit}>
              <Pencil className="mr-1 h-4 w-4" />
              编辑
            </Button>
            <Button variant="destructive" onClick={() => setDiscardOpen(true)}>
              <Archive className="mr-1 h-4 w-4" />
              废弃
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
            <DialogTitle>废弃条目</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定废弃条目「{item.name}」吗？废弃后将无法编辑，此操作不可撤销。
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
              移动到「{DISCARDED_GROUP_NAME}」分组
            </Label>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelDiscard}
              disabled={discardLoading}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDiscard}
              disabled={discardLoading}
            >
              废弃
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
