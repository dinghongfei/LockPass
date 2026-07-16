import type { StorageProvider } from "./provider";
import { TextStorageProvider } from "./text";
import { SqliteStorageProvider } from "./sqlite";
import { PostgresStorageProvider } from "./postgres";

let instance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (instance) return instance;
  const type = process.env.STORAGE_TYPE || "sqlite";
  switch (type) {
    case "text":
      instance = new TextStorageProvider();
      break;
    case "database":
      instance = new PostgresStorageProvider();
      break;
    case "sqlite":
    default:
      instance = new SqliteStorageProvider();
      break;
  }
  return instance;
}
