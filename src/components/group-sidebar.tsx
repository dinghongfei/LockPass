"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
import {
  GROUP_NAME_MAX_LENGTH,
  GROUP_NAME_MIN_LENGTH,
  isSystemDiscardedGroup,
  isUserGroup,
} from "@/lib/system-groups";
import { cn } from "@/lib/utils";

function isValidGroupName(name: string): boolean {
  const trimmed = name.trim();
  return (
    trimmed.length >= GROUP_NAME_MIN_LENGTH &&
    trimmed.length <= GROUP_NAME_MAX_LENGTH
  );
}

function HoverHint({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <span
      className={cn("inline-flex", className)}
      onMouseEnter={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[100] w-max max-w-[14rem] -translate-x-1/2 -translate-y-full rounded-md border border-border bg-card px-2.5 py-1.5 text-left text-xs leading-snug text-foreground shadow-sm"
            style={{ left: pos.x, top: pos.y - 10 }}
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}

interface GroupSidebarProps {
  groups: Group[];
  groupItemStats: Record<string, GroupItemStats>;
  selectedGroupId: string | null;
  onSelect: (groupId: string | null) => void;
  onRefresh: () => void;
  className?: string;
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
  className,
}: GroupSidebarProps) {
  const t = useT();
  const [newName, setNewName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<Group | null>(null);
  const [editName, setEditName] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleCancelCreate = () => {
    setNewName("");
    setCreateOpen(false);
  };

  const createGroup = async () => {
    if (!isValidGroupName(newName)) return;
    setCreateLoading(true);
    await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    setCreateOpen(false);
    setCreateLoading(false);
    onRefresh();
  };

  const openEditDialog = (group: Group) => {
    setEditTarget(group);
    setEditName(group.name);
    setEditOpen(true);
  };

  const handleCancelEdit = () => {
    setEditOpen(false);
    setEditTarget(null);
    setEditName("");
  };

  const updateGroup = async () => {
    if (!editTarget || !isValidGroupName(editName)) return;
    setEditLoading(true);
    await fetch(`/api/groups/${editTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditLoading(false);
    handleCancelEdit();
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
    <aside
      className={cn(
        "flex w-full min-w-0 shrink-0 flex-col overflow-x-hidden border-r border-border bg-card",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-semibold">{t("groups.title")}</h2>
        <Dialog
          open={createOpen}
          onOpenChange={(nextOpen) => {
            if (nextOpen) setCreateOpen(true);
            else handleCancelCreate();
          }}
        >
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
              <div className="space-y-1.5">
                <Input
                  placeholder={t("groups.namePlaceholder")}
                  value={newName}
                  maxLength={GROUP_NAME_MAX_LENGTH}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createGroup()}
                />
                <p className="text-xs text-muted-foreground">
                  {t("groups.nameLengthHint", {
                    min: GROUP_NAME_MIN_LENGTH,
                    max: GROUP_NAME_MAX_LENGTH,
                  })}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={createGroup}
                  disabled={createLoading || !isValidGroupName(newName)}
                >
                  {t("common.create")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelCreate}
                  disabled={createLoading}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "mb-1 w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
            selectedGroupId === null && "bg-muted font-medium"
          )}
        >
          {t("groups.allItems")}
        </button>
        {systemDiscardedGroup && (
          <button
            type="button"
            onClick={() => onSelect(systemDiscardedGroup.id)}
            className={cn(
              "mb-1 w-full rounded-md px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted",
              selectedGroupId === systemDiscardedGroup.id &&
                "bg-muted font-medium text-foreground"
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
                "group mb-1 flex min-w-0 items-center rounded-md transition-colors hover:bg-muted",
                selectedGroupId === group.id && "bg-muted"
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(group.id)}
                className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm"
              >
                {group.name}
              </button>
              <div className="flex items-center gap-0.5 pr-1 md:hidden md:group-hover:flex">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 cursor-pointer touch-manipulation md:h-7 md:w-7"
                  aria-label={t("common.edit")}
                  onClick={() => openEditDialog(group)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <HoverHint
                  label={deleteHint}
                  className={
                    canDelete ? "cursor-pointer" : "cursor-not-allowed"
                  }
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-8 w-8 cursor-pointer touch-manipulation text-destructive disabled:opacity-40 md:h-7 md:w-7",
                      !canDelete && "pointer-events-none"
                    )}
                    disabled={!canDelete}
                    aria-label={deleteHint}
                    onClick={() => openDeleteDialog(group)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </HoverHint>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) handleCancelEdit();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("groups.editGroup")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Input
                placeholder={t("groups.namePlaceholder")}
                value={editName}
                maxLength={GROUP_NAME_MAX_LENGTH}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && updateGroup()}
              />
              <p className="text-xs text-muted-foreground">
                {t("groups.nameLengthHint", {
                  min: GROUP_NAME_MIN_LENGTH,
                  max: GROUP_NAME_MAX_LENGTH,
                })}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={updateGroup}
                disabled={editLoading || !isValidGroupName(editName)}
              >
                {t("common.save")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={editLoading}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
