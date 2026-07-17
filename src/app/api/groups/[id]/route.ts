import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-utils";
import {
  GROUP_NAME_MAX_LENGTH,
  GROUP_NAME_MIN_LENGTH,
} from "@/lib/system-groups";

const updateSchema = z.object({
  name: z.string().trim().min(GROUP_NAME_MIN_LENGTH).max(GROUP_NAME_MAX_LENGTH),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = updateSchema.parse(await request.json());
    const storage = getStorage();
    const group = await storage.updateGroup(id, session.userId, body.name);
    return NextResponse.json(group);
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    if ((e as Error).message === "Cannot modify system group") {
      return badRequest("系统分组不可修改");
    }
    if ((e as Error).message === "Reserved group name") {
      return badRequest("不能使用保留的分组名称");
    }
    if ((e as Error).message === "Group not found") return notFound();
    if (e instanceof z.ZodError) return badRequest("无效的分组名称");
    return serverError();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const storage = getStorage();
    await storage.deleteGroup(id, session.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    if ((e as Error).message === "Group has active items") {
      return badRequest("分组内存在有效条目，无法删除");
    }
    if ((e as Error).message === "Cannot delete system group") {
      return badRequest("系统分组不可删除");
    }
    if ((e as Error).message === "Group not found") return notFound();
    return serverError();
  }
}
