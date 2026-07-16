"use client";

import { useState, type ReactNode } from "react";
import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n/provider";
import type { TranslateFn } from "@/lib/i18n/provider";
import type { Group, GroupItemStats } from "@/lib/types";
import { isSystemDiscardedGroup, isUserGroup } from "@/lib/system-groups";
import { cn } from "@/lib/utils";

function HoverHint({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn("group/hint relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground opacity-0 shadow-sm transition-opacity group-hover/hint:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

interface GroupSidebarProps {
  groups: Group[];
  groupItemStats: Record<string, GroupItemStats>;
  selectedGroupId: string | null;
  onSelect: (groupId: string | null) => void;
  onRefresh: () => void;
}

function getGroupStats(
  groupItemStats: Record<string, GroupItemStats>,
  groupId: string
): GroupItemStats {
  return groupItemStats[groupId] ?? { active: 0, discarded: 0 };
}

function getDeleteHint(stats: GroupItemStats, t: TranslateFn): string {
  if (stats.active > 0) return t("groups.deleteHintHasActive");
  if (stats.discarded > 0) return t("groups.deleteHintHasDiscarded");
  return t("groups.deleteHint");
}

function getDeleteMessage(
  groupName: string,
  stats: GroupItemStats,
  t: TranslateFn
): string {
  if (stats.discarded === 0) {
    return t("groups.deleteConfirm", { name: groupName });
  }
  return t("groups.deleteConfirmWithDiscarded", {
    name: groupName,
    count: stats.discarded,
    discarded: t("groups.discarded"),
  });
}

export function GroupSidebar({
  groups,
  groupItemStats,
  selectedGroupId,
  onSelect,
  onRefresh,
}: GroupSidebarProps) {
  const t = useT();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleCancelCreate = () => {
    setNewName("");
    setOpen(false);
  };

  const createGroup = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    setOpen(false);
    setLoading(false);
    onRefresh();
  };

  const updateGroup = async (id: string) => {
    if (!editName.trim()) return;
    await fetch(`/api/groups/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditId(null);
    onRefresh();
  };

  const openDeleteDialog = (group: Group) => {
    const stats = getGroupStats(groupItemStats, group.id);
    if (stats.active > 0) return;
    setDeleteTarget(group);
    setDeleteError("");
    setDeleteOpen(true);
  };

  const deleteTargetStats = deleteTarget
    ? getGroupStats(groupItemStats, deleteTarget.id)
    : { active: 0, discarded: 0 };

  const systemDiscardedGroup = groups.find((group) =>
    isSystemDiscardedGroup(group.id)
  );
  const userGroups = groups.filter(isUserGroup);

  const handleCancelDelete = () => {
    setDeleteOpen(false);
    setDeleteTarget(null);
    setDeleteError("");
  };

  const confirmDeleteGroup = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError("");
    const res = await fetch(`/api/groups/${deleteTarget.id}`, {
      method: "DELETE",
    });
    setDeleteLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setDeleteError(data?.error || t("groups.deleteFailed"));
      return;
    }
    if (selectedGroupId === deleteTarget.id) onSelect(null);
    handleCancelDelete();
    onRefresh();
  };

  return (
    <aside className="w-full shrink-0 border-r border-border bg-card md:w-64">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-semibold">{t("groups.title")}</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="outline">
              <FolderPlus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("groups.newGroup")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder={t("groups.namePlaceholder")}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createGroup()}
              />
              <div className="flex gap-3">
                <Button onClick={createGroup} disabled={loading}>
                  {t("common.create")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelCreate}
                  disabled={loading}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="p-2">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "mb-1 w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
            selectedGroupId === null && "bg-muted font-medium"
          )}
        >
          {t("groups.allItems")}
        </button>
        {systemDiscardedGroup && (
          <button
            onClick={() => onSelect(systemDiscardedGroup.id)}
            className={cn(
              "mb-1 w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted",
              selectedGroupId === systemDiscardedGroup.id && "bg-muted font-medium text-foreground"
            )}
          >
            {t("groups.discarded")}
          </button>
        )}
        {userGroups.map((group) => {
          const stats = getGroupStats(groupItemStats, group.id);
          const canDelete = stats.active === 0;
          const deleteHint = getDeleteHint(stats, t);

          return (
            <div
              key={group.id}
              className={cn(
                "group mb-1 flex items-center rounded-md transition-colors hover:bg-muted",
                selectedGroupId === group.id && "bg-muted"
              )}
            >
              {editId === group.id ? (
                <Input
                  className="mx-1 h-8"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") updateGroup(group.id);
                    if (e.key === "Escape") setEditId(null);
                  }}
                  onBlur={() => updateGroup(group.id)}
                  autoFocus
                />
              ) : (
                <>
                  <button
                    onClick={() => onSelect(group.id)}
                    className="flex-1 px-3 py-2 text-left text-sm"
                  >
                    {group.name}
                  </button>
                  <div className="hidden items-center gap-1 pr-1 group-hover:flex">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditId(group.id);
                        setEditName(group.name);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <HoverHint
                      label={deleteHint}
                      className={!canDelete ? "cursor-not-allowed" : undefined}
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                          "h-7 w-7 text-destructive disabled:opacity-40",
                          !canDelete && "pointer-events-none"
                        )}
                        disabled={!canDelete}
                        onClick={() => openDeleteDialog(group)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </HoverHint>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <Dialog
        open={deleteOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) handleCancelDelete();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("groups.deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteTarget
              ? getDeleteMessage(deleteTarget.name, deleteTargetStats, t)
              : ""}
          </p>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelDelete}
              disabled={deleteLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteGroup}
              disabled={deleteLoading}
            >
              {t("common.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
