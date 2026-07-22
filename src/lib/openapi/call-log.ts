import { appendFileSync, mkdirSync } from "fs";
import { isAbsolute, join } from "path";
import { v4 as uuidv4 } from "uuid";

export interface OpenApiPasswordCallLogEntry {
  id: string;
  at: string;
  clientId: string | null;
  clientName: string | null;
  purpose: string | null;
  options: Record<string, unknown> | null;
  password: string | null;
  ok: boolean;
  error: string | null;
  ip: string | null;
  userAgent: string | null;
}

function resolveDataDir(): string {
  const fromEnv = process.env.DATA_DIR?.trim();
  if (fromEnv) {
    return isAbsolute(fromEnv) ? fromEnv : join(process.cwd(), fromEnv);
  }
  return join(process.cwd(), "data");
}

export function getOpenApiCallLogPath(): string {
  return join(resolveDataDir(), "openapi-password-calls.jsonl");
}

export function appendOpenApiPasswordCallLog(
  entry: Omit<OpenApiPasswordCallLogEntry, "id" | "at"> & {
    id?: string;
    at?: string;
  }
): OpenApiPasswordCallLogEntry {
  const record: OpenApiPasswordCallLogEntry = {
    id: entry.id ?? uuidv4(),
    at: entry.at ?? new Date().toISOString(),
    clientId: entry.clientId,
    clientName: entry.clientName,
    purpose: entry.purpose,
    options: entry.options,
    password: entry.password,
    ok: entry.ok,
    error: entry.error,
    ip: entry.ip,
    userAgent: entry.userAgent,
  };

  const dataDir = resolveDataDir();
  mkdirSync(dataDir, { recursive: true });
  appendFileSync(getOpenApiCallLogPath(), `${JSON.stringify(record)}\n`, "utf-8");
  return record;
}
