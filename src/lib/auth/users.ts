import { readFileSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
}

let cachedUsers: User[] | null = null;

export function loadUsers(): User[] {
  if (cachedUsers) return cachedUsers;
  const configPath = join(process.cwd(), "config", "users.json");
  const raw = readFileSync(configPath, "utf-8");
  cachedUsers = JSON.parse(raw) as User[];
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
