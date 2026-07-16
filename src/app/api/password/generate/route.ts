import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePassword } from "@/lib/password-gen/generator";
import { badRequest } from "@/lib/api-utils";

const schema = z.object({
  length: z.number().int().min(8).max(128),
  includeUppercase: z.boolean(),
  includeLowercase: z.boolean(),
  includeNumbers: z.boolean(),
  includeSpecial: z.boolean(),
  minNumbers: z.number().int().min(0).max(32),
  minSpecialChars: z.number().int().min(0).max(32),
  excludeAmbiguous: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const options = schema.parse(await request.json());
    const password = generatePassword(options);
    return NextResponse.json({ password });
  } catch (e) {
    if (e instanceof z.ZodError) return badRequest("无效的生成参数");
    return badRequest((e as Error).message);
  }
}
