import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import {
  localizeExportDataForLocale,
  normalizeImportedGroup,
  resolveExportLocale,
} from "@/lib/i18n/export-locale";
import { getStorage } from "@/lib/storage";
import type { ExportData, Group } from "@/lib/types";
import { badRequest, serverError, unauthorized } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const storage = getStorage();
    const data = await storage.exportVault(session.userId);
    const locale = resolveExportLocale(
      request.nextUrl.searchParams.get("locale"),
      request.headers.get("accept-language")
    );
    return NextResponse.json(localizeExportDataForLocale(data, locale));
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    return serverError();
  }
}

const importSchema = z.object({
  mode: z.enum(["merge", "replace"]),
  data: z.object({
    version: z.literal(1),
    exportedAt: z.string(),
    groups: z.array(z.unknown()),
    items: z.array(z.unknown()),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = importSchema.parse(await request.json());
    const storage = getStorage();
    const groups = (body.data.groups as Group[]).map((group) =>
      normalizeImportedGroup(group)
    );
    await storage.importVault(
      session.userId,
      { ...(body.data as ExportData), groups },
      body.mode
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    if (e instanceof z.ZodError) return badRequest("无效的导入数据");
    return serverError();
  }
}
