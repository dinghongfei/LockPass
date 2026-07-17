"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Plus, Search } from "lucide-react";
import { GroupSidebar } from "@/components/group-sidebar";
import { ItemListCard } from "@/components/item-list-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/provider";
import { isSystemDiscardedGroup } from "@/lib/system-groups";
import type { Group, GroupItemStats, VaultItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const t = useT();
  const [groups, setGroups] = useState<Group[]>([]);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);

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

  useEffect(() => {
    if (!groupsOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGroupsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [groupsOpen]);

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

  const selectedGroupLabel =
    selectedGroupId === null
      ? t("groups.allItems")
      : getGroupName(selectedGroupId);

  const handleSelectGroup = (groupId: string | null) => {
    setSelectedGroupId(groupId);
    setGroupsOpen(false);
  };

  const newItemHref =
    selectedGroupId !== null && !isSystemDiscardedGroup(selectedGroupId)
      ? `/items/new?groupId=${encodeURIComponent(selectedGroupId)}`
      : "/items/new";

  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-7xl">
      {groupsOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label={t("groups.closePanel")}
          onClick={() => setGroupsOpen(false)}
        />
      )}

      <GroupSidebar
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-dvh w-[min(20rem,88vw)] shadow-lg transition-transform md:static md:z-auto md:h-auto md:min-h-[calc(100dvh-3.5rem)] md:w-64 md:translate-x-0 md:shadow-none md:transition-none",
          groupsOpen
            ? "translate-x-0"
            : "pointer-events-none -translate-x-full md:pointer-events-auto md:translate-x-0"
        )}
        groups={groups}
        groupItemStats={groupItemStats}
        selectedGroupId={selectedGroupId}
        onSelect={handleSelectGroup}
        onRefresh={refresh}
      />

      <div className="min-w-0 flex-1 p-4 md:p-6">
        <div className="mb-4 md:hidden">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            aria-expanded={groupsOpen}
            onClick={() => setGroupsOpen(true)}
          >
            <FolderOpen className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {t("groups.filterBy", { name: selectedGroupLabel })}
            </span>
          </Button>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full max-w-sm flex-1">
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
          <Button asChild className="w-full sm:w-auto">
            <Link href={newItemHref}>
              <Plus className="mr-1 h-4 w-4" />
              {t("dashboard.newItem")}
            </Link>
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center sm:py-20">
            <p className="text-muted-foreground">{emptyMessage}</p>
            {items.length === 0 && (
              <Button asChild className="mt-4">
                <Link href={newItemHref}>{t("dashboard.createFirst")}</Link>
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
