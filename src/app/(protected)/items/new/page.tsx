"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemForm } from "@/components/item-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Group } from "@/lib/types";

export default function NewItemPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups);
  }, []);

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>新建密码条目</CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              请先在主面板创建一个分组
            </p>
          ) : (
            <ItemForm
              groups={groups}
              onSuccess={() => {
                router.push("/");
                router.refresh();
              }}
              onCancel={() => router.push("/")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
