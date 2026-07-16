import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-utils";
import { ITEM_TYPES } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const storage = getStorage();
    const item = await storage.getItem(id, session.userId);
    if (!item) return notFound();
    return NextResponse.json(item);
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    return serverError();
  }
}

const updateSchema = z.object({
  groupId: z.string().min(1).optional(),
  type: z.enum(ITEM_TYPES).optional(),
  name: z.string().min(1).max(200).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
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
    const existing = await storage.getItem(id, session.userId);
    if (!existing) return notFound();
    if (existing.status === "discarded") {
      return badRequest("已废弃的条目不可编辑");
    }
    const item = await storage.updateItem(id, session.userId, body);
    return NextResponse.json(item);
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    if ((e as Error).message === "Item not found") return notFound();
    if ((e as Error).message === "Cannot update discarded item") {
      return badRequest("已废弃的条目不可编辑");
    }
    if (e instanceof z.ZodError) return badRequest("无效的条目数据");
    return serverError();
  }
}
