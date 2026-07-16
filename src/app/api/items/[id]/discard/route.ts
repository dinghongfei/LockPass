import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-utils";

const discardSchema = z.object({
  moveToDiscardedGroup: z.boolean().optional().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = discardSchema.parse(await request.json().catch(() => ({})));
    const storage = getStorage();
    const item = await storage.discardItem(id, session.userId, {
      moveToDiscardedGroup: body.moveToDiscardedGroup,
    });
    return NextResponse.json(item);
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    if ((e as Error).message === "Item not found") return notFound();
    if ((e as Error).message === "Item already discarded") {
      return badRequest("条目已废弃");
    }
    if (e instanceof z.ZodError) return badRequest("无效的废弃参数");
    return serverError();
  }
}
