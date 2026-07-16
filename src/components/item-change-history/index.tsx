"use client";

import { SensitiveValue } from "@/components/ui/sensitive-value";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatFieldValue,
  getFieldLabel,
  isSensitiveField,
} from "@/lib/item-changes";
import type { Group, ItemChangeRecord } from "@/lib/types";

interface ItemChangeHistoryProps {
  changes: ItemChangeRecord[];
  groups: Group[];
}

function formatDateTime(date: Date | string): string {
  const value = date instanceof Date ? date : new Date(date);
  return value.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function ChangeFieldLine({
  field,
  oldValue,
  newValue,
  groupNames,
}: {
  field: string;
  oldValue?: string;
  newValue?: string;
  groupNames: Record<string, string>;
}) {
  const label = getFieldLabel(field);
  const sensitive = isSensitiveField(field);

  if (sensitive) {
    const hasOld = oldValue !== undefined && oldValue !== "";
    return (
      <div className="flex flex-wrap items-start gap-x-1 gap-y-1 text-sm">
        <span className="shrink-0 text-muted-foreground">{label}：</span>
        {hasOld ? (
          <>
            <SensitiveValue value={oldValue} copyable inline />
            <span className="mx-1 shrink-0 text-muted-foreground">→</span>
            <SensitiveValue value={newValue} copyable inline />
          </>
        ) : (
          <SensitiveValue value={newValue} copyable inline />
        )}
      </div>
    );
  }

  const formattedOld = formatFieldValue(field, oldValue, groupNames);
  const formattedNew = formatFieldValue(field, newValue, groupNames);
  const hasOld = oldValue !== undefined && oldValue !== "";

  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}：</span>
      {hasOld ? (
        <>
          <span className="break-all">{formattedOld}</span>
          <span className="mx-1 text-muted-foreground">→</span>
          <span className="break-all">{formattedNew}</span>
        </>
      ) : (
        <span className="break-all">{formattedNew}</span>
      )}
    </div>
  );
}

export function ItemChangeHistory({ changes, groups }: ItemChangeHistoryProps) {
  const groupNames = Object.fromEntries(groups.map((g) => [g.id, g.name]));

  if (changes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">变更记录</h2>
      {changes.map((record) => (
        <Card key={record.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-muted-foreground">
              {formatDateTime(record.createdAt)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {record.changes.map((change) => (
              <ChangeFieldLine
                key={`${record.id}-${change.field}`}
                field={change.field}
                oldValue={change.oldValue}
                newValue={change.newValue}
                groupNames={groupNames}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
