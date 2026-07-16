import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";
import { notFound, serverError, unauthorized } from "@/lib/api-utils";

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
    const changes = await storage.getItemChanges(id, session.userId);
    return NextResponse.json(changes);
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    return serverError();
  }
}
