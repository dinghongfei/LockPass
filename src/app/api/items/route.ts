import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { badRequest, serverError, unauthorized } from "@/lib/api-utils";
import { ITEM_TYPES } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const groupId = request.nextUrl.searchParams.get("groupId") || undefined;
    const storage = getStorage();
    const items = await storage.getItems(session.userId, groupId);
    return NextResponse.json(items);
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    return serverError();
  }
}

const createSchema = z.object({
  groupId: z.string().min(1),
  type: z.enum(ITEM_TYPES),
  name: z.string().min(1).max(200),
  payload: z.record(z.string(), z.unknown()),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = createSchema.parse(await request.json());
    const storage = getStorage();
    const item = await storage.createItem({
      userId: session.userId,
      groupId: body.groupId,
      type: body.type,
      name: body.name,
      status: "active",
      payload: body.payload,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    if ((e as Error).message === "Cannot create item in discarded group") {
      return badRequest("不能向已废弃分组创建条目");
    }
    if (e instanceof z.ZodError) return badRequest("无效的条目数据");
    return serverError();
  }
}
