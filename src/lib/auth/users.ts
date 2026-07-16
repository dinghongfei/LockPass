import { existsSync, readFileSync } from "fs";
import { isAbsolute, join } from "path";
import bcrypt from "bcryptjs";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
}

let cachedUsers: User[] | null = null;
let cachedPath: string | null = null;

/** 解析用户配置路径：USERS_FILE > config/users.local.json > config/users.json */
export function resolveUsersPath(): string {
  const fromEnv = process.env.USERS_FILE?.trim();
  if (fromEnv) {
    return isAbsolute(fromEnv) ? fromEnv : join(process.cwd(), fromEnv);
  }

  const localPath = join(process.cwd(), "config", "users.local.json");
  if (existsSync(localPath)) {
    return localPath;
  }

  return join(process.cwd(), "config", "users.json");
}

export function loadUsers(): User[] {
  const configPath = resolveUsersPath();
  if (cachedUsers && cachedPath === configPath) {
    return cachedUsers;
  }

  if (!existsSync(configPath)) {
    throw new Error(
      `用户配置不存在: ${configPath}。可复制 config/users.json 为 config/users.local.json 后修改。`
    );
  }

  const raw = readFileSync(configPath, "utf-8");
  cachedUsers = JSON.parse(raw) as User[];
  cachedPath = configPath;
  return cachedUsers;
}

export function findUserByUsername(username: string): User | undefined {
  return loadUsers().find((u) => u.username === username);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
