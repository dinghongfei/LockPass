import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, unauthorized } from "@/lib/api-utils";
import { appendOpenApiPasswordCallLog } from "@/lib/openapi/call-log";
import {
  findClientByApiKey,
  parseBearerToken,
  type ApiClient,
} from "@/lib/openapi/clients";
import {
  generatePasswordWithPrefix,
  isAllowedPasswordPrefix,
  resolvePasswordGenerateOptions,
} from "@/lib/openapi/password-generate";
import { PASSWORD_PREFIX_OPTIONS } from "@/lib/types";

const bodySchema = z.object({
  purpose: z.string().trim().min(1).max(500),
  length: z.number().int().min(8).max(128).optional(),
  prefix: z.string().optional(),
  includeUppercase: z.boolean().optional(),
  includeLowercase: z.boolean().optional(),
  includeNumbers: z.boolean().optional(),
  includeSpecial: z.boolean().optional(),
  minNumbers: z.number().int().min(0).max(32).optional(),
  minSpecialChars: z.number().int().min(0).max(32).optional(),
  excludeAmbiguous: z.boolean().optional(),
});

function clientMeta(request: NextRequest) {
  return {
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null,
    userAgent: request.headers.get("user-agent"),
  };
}

function logFailure(args: {
  request: NextRequest;
  client: ApiClient | null;
  purpose: string | null;
  options: Record<string, unknown> | null;
  error: string;
}) {
  appendOpenApiPasswordCallLog({
    clientId: args.client?.id ?? null,
    clientName: args.client?.name ?? null,
    purpose: args.purpose,
    options: args.options,
    password: null,
    ok: false,
    error: args.error,
    ...clientMeta(args.request),
  });
}

export async function POST(request: NextRequest) {
  const meta = clientMeta(request);
  const apiKey = parseBearerToken(request.headers.get("authorization"));

  if (!apiKey) {
    logFailure({
      request,
      client: null,
      purpose: null,
      options: null,
      error: "Missing or invalid Authorization Bearer token",
    });
    return unauthorized();
  }

  const client = await findClientByApiKey(apiKey);
  if (!client) {
    logFailure({
      request,
      client: null,
      purpose: null,
      options: null,
      error: "Invalid API key",
    });
    return unauthorized();
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (e) {
    const message =
      e instanceof z.ZodError
        ? "Invalid request body (purpose is required)"
        : "Invalid JSON body";
    logFailure({
      request,
      client,
      purpose: null,
      options: null,
      error: message,
    });
    return badRequest(message);
  }

  const prefix = body.prefix ?? "";
  if (!isAllowedPasswordPrefix(prefix)) {
    const message = `Invalid prefix; allowed: ${PASSWORD_PREFIX_OPTIONS.map(
      (p) => (p === "" ? "(empty)" : p)
    ).join(", ")}`;
    logFailure({
      request,
      client,
      purpose: body.purpose,
      options: body as unknown as Record<string, unknown>,
      error: message,
    });
    return badRequest(message);
  }

  const options = resolvePasswordGenerateOptions({ ...body, prefix });

  try {
    const password = generatePasswordWithPrefix(options);
    const log = appendOpenApiPasswordCallLog({
      clientId: client.id,
      clientName: client.name,
      purpose: body.purpose,
      options: {
        length: options.length,
        prefix: options.prefix,
        includeUppercase: options.includeUppercase,
        includeLowercase: options.includeLowercase,
        includeNumbers: options.includeNumbers,
        includeSpecial: options.includeSpecial,
        minNumbers: options.minNumbers,
        minSpecialChars: options.minSpecialChars,
        excludeAmbiguous: options.excludeAmbiguous,
      },
      password,
      ok: true,
      error: null,
      ...meta,
    });

    return NextResponse.json({
      password,
      requestId: log.id,
    });
  } catch (e) {
    const message = (e as Error).message || "Generation failed";
    logFailure({
      request,
      client,
      purpose: body.purpose,
      options: {
        length: options.length,
        prefix: options.prefix,
        includeUppercase: options.includeUppercase,
        includeLowercase: options.includeLowercase,
        includeNumbers: options.includeNumbers,
        includeSpecial: options.includeSpecial,
        minNumbers: options.minNumbers,
        minSpecialChars: options.minSpecialChars,
        excludeAmbiguous: options.excludeAmbiguous,
      },
      error: message,
    });
    return badRequest(message);
  }
}
