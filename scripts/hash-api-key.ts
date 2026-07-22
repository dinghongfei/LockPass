#!/usr/bin/env tsx
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const PREFIX = "sk-";

function ensureSkPrefix(value: string): string {
  return value.startsWith(PREFIX) ? value : `${PREFIX}${value}`;
}

function generateApiKey(): string {
  return `${PREFIX}${randomBytes(24).toString("base64url")}`;
}

const arg = process.argv[2];
const apiKey = arg ? ensureSkPrefix(arg) : generateApiKey();
const generated = !arg;

bcrypt.hash(apiKey, 10).then((hash) => {
  if (generated) {
    console.log(`apiKey: ${apiKey}`);
    console.log(`apiKeyHash: ${hash}`);
    console.error(
      "Save the apiKey now; only the hash should be stored in config/api-clients*.json."
    );
  } else {
    if (!arg.startsWith(PREFIX)) {
      console.error(`Note: prepended "${PREFIX}" → ${apiKey}`);
    }
    console.log(hash);
  }
});
