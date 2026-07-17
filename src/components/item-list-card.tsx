"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { VaultItem } from "@/lib/types";
import { getItemListFields } from "@/lib/item-list-preview";
import { copyText } from "@/lib/clipboard";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface ItemListCardProps {
  item: VaultItem;
  groupName: string;
}

function ListCopyField({
  label,
  value,
  sensitive = false,
  copyable = true,
}: {
  label: string;
  value?: string;
  sensitive?: boolean;
  copyable?: boolean;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await copyText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const display = sensitive ? "••••••••" : value;

  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span className="w-16 shrink-0 text-muted-foreground sm:w-20">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <span
          className={cn("min-w-0 truncate", sensitive && "font-mono")}
          title={sensitive ? undefined : value}
        >
          {display}
        </span>
        {copyable && (
          <button
            type="button"
            className="shrink-0 cursor-pointer rounded-sm text-muted-foreground transition-colors hover:text-foreground"
            aria-label={
              copied ? t("common.copied") : t("common.copyLabel", { label })
            }
            onClick={handleCopy}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
        {copied && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {t("common.copied")}
          </span>
        )}
      </div>
    </div>
  );
}

export function ItemListCard({ item, groupName }: ItemListCardProps) {
  const t = useT();
  const fields = getItemListFields(item, t);
  const isDiscarded = item.status === "discarded";

  return (
    <Card className={cn(isDiscarded && "opacity-70")}>
      <CardContent className="p-4">
        <Link href={`/items/${item.id}`} className="block min-w-0">
          <div className="font-medium hover:underline">{item.name}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {isDiscarded && (
              <span className="rounded bg-destructive/10 px-2 py-0.5 text-destructive">
                {t("itemStatus.discarded")}
              </span>
            )}
            <span className="rounded bg-muted px-2 py-0.5">
              {t(`itemTypes.${item.type}`)}
            </span>
            <span className="rounded bg-muted px-2 py-0.5">{groupName}</span>
          </div>
        </Link>

        {fields.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-border pt-3">
            {fields.map((field) => (
              <ListCopyField
                key={`${field.label}-${field.value}`}
                label={field.label}
                value={field.value}
                sensitive={field.sensitive}
                copyable={field.copyable}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
