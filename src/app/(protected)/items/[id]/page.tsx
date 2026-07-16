"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemChangeHistory } from "@/components/item-change-history";
import { ItemDetail } from "@/components/item-detail";
import { ItemForm } from "@/components/item-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Group, ItemChangeRecord, ItemType, VaultItem } from "@/lib/types";

type PageMode = "view" | "edit";

export default function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [item, setItem] = useState<VaultItem | null>(null);
  const [changes, setChanges] = useState<ItemChangeRecord[]>([]);
  const [itemId, setItemId] = useState("");
  const [mode, setMode] = useState<PageMode>("view");

  useEffect(() => {
    params.then((p) => setItemId(p.id));
  }, [params]);

  const loadData = useCallback(async () => {
    if (!itemId) return;
    const [groupsRes, itemRes, changesRes] = await Promise.all([
      fetch("/api/groups"),
      fetch(`/api/items/${itemId}`),
      fetch(`/api/items/${itemId}/changes`),
    ]);
    if (groupsRes.ok) setGroups(await groupsRes.json());
    if (itemRes.ok) setItem(await itemRes.json());
    if (changesRes.ok) setChanges(await changesRes.json());
  }, [itemId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDiscard = async (moveToDiscardedGroup: boolean): Promise<boolean> => {
    if (!item) return false;
    const res = await fetch(`/api/items/${item.id}/discard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moveToDiscardedGroup }),
    });
    if (!res.ok) return false;
    await loadData();
    return true;
  };

  if (!item) {
    return (
      <div className="p-6 text-center text-muted-foreground">加载中...</div>
    );
  }

  const payload = item.payload as Record<string, string>;
  const isDiscarded = item.status === "discarded";

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "view" ? "密码条目详情" : "编辑密码条目"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mode === "view" ? (
            <ItemDetail
              item={item}
              groups={groups}
              onEdit={() => {
                if (item.status !== "discarded") setMode("edit");
              }}
              onBack={() => router.push("/")}
              onDiscard={handleDiscard}
            />
          ) : isDiscarded ? null : (
            <ItemForm
              groups={groups}
              initial={{
                id: item.id,
                groupId: item.groupId,
                type: item.type as ItemType,
                name: item.name,
                payload,
              }}
              onSuccess={async () => {
                await loadData();
                setMode("view");
              }}
              onCancel={() => setMode("view")}
            />
          )}
        </CardContent>
      </Card>

      {mode === "view" && (
        <ItemChangeHistory changes={changes} groups={groups} />
      )}
    </div>
  );
}
