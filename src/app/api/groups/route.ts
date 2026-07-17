import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { badRequest, serverError, unauthorized } from "@/lib/api-utils";
import {
  GROUP_NAME_MAX_LENGTH,
  GROUP_NAME_MIN_LENGTH,
} from "@/lib/system-groups";

export async function GET() {
  try {
    const session = await requireAuth();
    const storage = getStorage();
    const groups = await storage.getGroups(session.userId);
    return NextResponse.json(groups);
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    return serverError();
  }
}

const createSchema = z.object({
  name: z.string().trim().min(GROUP_NAME_MIN_LENGTH).max(GROUP_NAME_MAX_LENGTH),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = createSchema.parse(await request.json());
    const storage = getStorage();
    const group = await storage.createGroup(session.userId, body.name);
    return NextResponse.json(group, { status: 201 });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    if ((e as Error).message === "Reserved group name") {
      return badRequest("不能使用保留的分组名称");
    }
    if (e instanceof z.ZodError) return badRequest("无效的分组名称");
    return serverError();
  }
}
