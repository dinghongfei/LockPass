"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { GroupSidebar } from "@/components/group-sidebar";
import { ItemListCard } from "@/components/item-list-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/provider";
import { isSystemDiscardedGroup } from "@/lib/system-groups";
import type { Group, GroupItemStats, VaultItem } from "@/lib/types";

export default function DashboardPage() {
  const t = useT();
  const [groups, setGroups] = useState<Group[]>([]);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  const loadGroups = useCallback(async () => {
    const res = await fetch("/api/groups");
    if (res.ok) setGroups(await res.json());
  }, []);

  const loadItems = useCallback(async () => {
    const res = await fetch("/api/items");
    if (res.ok) setItems(await res.json());
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const refresh = () => {
    loadGroups();
    loadItems();
  };

  const filtered = items.filter((item) => {
    if (selectedGroupId !== null && item.groupId !== selectedGroupId) {
      return false;
    }
    if (activeOnly && item.status === "discarded") return false;
    return item.name.toLowerCase().includes(search.toLowerCase());
  });

  const groupItemStats = items.reduce<Record<string, GroupItemStats>>(
    (stats, item) => {
      const current = stats[item.groupId] ?? { active: 0, discarded: 0 };
      if (item.status === "discarded") {
        current.discarded += 1;
      } else {
        current.active += 1;
      }
      stats[item.groupId] = current;
      return stats;
    },
    {}
  );

  const emptyMessage =
    items.length === 0
      ? t("dashboard.emptyVault")
      : filtered.length === 0
        ? activeOnly
          ? t("dashboard.emptyActive")
          : t("dashboard.emptyFiltered")
        : "";

  const getGroupName = (groupId: string) => {
    if (isSystemDiscardedGroup(groupId)) return t("groups.discarded");
    return groups.find((g) => g.id === groupId)?.name || t("common.unknownGroup");
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-7xl">
      <GroupSidebar
        groups={groups}
        groupItemStats={groupItemStats}
        selectedGroupId={selectedGroupId}
        onSelect={setSelectedGroupId}
        onRefresh={refresh}
      />
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t("dashboard.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="active-only"
                checked={activeOnly}
                onCheckedChange={(checked) => setActiveOnly(checked === true)}
              />
              <Label htmlFor="active-only" className="cursor-pointer text-sm">
                {t("dashboard.activeOnly")}
              </Label>
            </div>
          </div>
          <Button asChild>
            <Link href="/items/new">
              <Plus className="mr-1 h-4 w-4" />
              {t("dashboard.newItem")}
            </Link>
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">{emptyMessage}</p>
            {items.length === 0 && (
              <Button asChild className="mt-4">
                <Link href="/items/new">{t("dashboard.createFirst")}</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((item) => (
              <ItemListCard
                key={item.id}
                item={item}
                groupName={getGroupName(item.groupId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
