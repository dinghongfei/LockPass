import { existsSync, readFileSync } from "fs";
import { isAbsolute, join } from "path";
import bcrypt from "bcryptjs";

export interface ApiClient {
  id: string;
  name: string;
  apiKeyHash: string;
  enabled: boolean;
}

let cachedClients: ApiClient[] | null = null;
let cachedPath: string | null = null;

/** Resolve path: API_CLIENTS_FILE > config/api-clients.local.json > config/api-clients.json */
export function resolveApiClientsPath(): string {
  const fromEnv = process.env.API_CLIENTS_FILE?.trim();
  if (fromEnv) {
    return isAbsolute(fromEnv) ? fromEnv : join(process.cwd(), fromEnv);
  }

  const localPath = join(process.cwd(), "config", "api-clients.local.json");
  if (existsSync(localPath)) {
    return localPath;
  }

  return join(process.cwd(), "config", "api-clients.json");
}

export function loadApiClients(): ApiClient[] {
  const configPath = resolveApiClientsPath();
  if (cachedClients && cachedPath === configPath) {
    return cachedClients;
  }

  if (!existsSync(configPath)) {
    cachedClients = [];
    cachedPath = configPath;
    return cachedClients;
  }

  const raw = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw) as ApiClient[];
  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid API clients config: ${configPath}`);
  }
  cachedClients = parsed;
  cachedPath = configPath;
  return cachedClients;
}

export async function findClientByApiKey(
  apiKey: string
): Promise<ApiClient | undefined> {
  const clients = loadApiClients().filter((c) => c.enabled);
  for (const client of clients) {
    if (await bcrypt.compare(apiKey, client.apiKeyHash)) {
      return client;
    }
  }
  return undefined;
}

export function parseBearerToken(
  authorization: string | null
): string | undefined {
  if (!authorization) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  const token = match?.[1]?.trim();
  return token || undefined;
}
