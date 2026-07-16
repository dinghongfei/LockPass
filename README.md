# LockPass

**Language:** [English](README.md) | [中文](README.zh-CN.md)

Self-hosted password manager built with Next.js.

Full project documentation: [WIKI.md](WIKI.md) ([中文 Wiki](WIKI.zh-CN.md)).

## Features

- Single-level password groups
- Multiple entry types: Website, Personal Card, IT-Server / IT-RAM User / IT-API
- List-card quick copy: type-specific key fields, masked secrets, one-click copy
- Configurable password generator (length, character sets, minimum counts, exclude ambiguous chars)
- Generator usable standalone or when creating an entry
- Full vault import/export (JSON)
- Server-side AES-256-GCM encryption for sensitive fields
- Change history: only changed fields are recorded on each save; shown below the detail view (newest first)
- System “Discarded” group: discarded entries are kept, never hard-deleted
- Pluggable storage: text file, SQLite (default), PostgreSQL
- Preconfigured users (no self-registration)

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and set at least:

| Variable | Purpose |
|------|------|
| `ENCRYPTION_KEY` | Encrypts vault payloads (passwords, card numbers, etc.). Existing data cannot be decrypted if this key is lost |
| `SESSION_SECRET` | Encrypts the login session cookie |

**Generate random secrets** (run once for each variable):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This uses Node’s built-in `crypto` to produce 32 random bytes as a 64-character hex string, for example:

```
a3f8c2e1b4d567890abcdef0123456789abcdef0123456789abcdef01234567
```

Paste into `.env.local`:

```env
ENCRYPTION_KEY=<first-64-char-hex>
SESSION_SECRET=<second-64-char-hex>
```

> Keep secrets in local `.env.local` only — do not commit them. Changing `ENCRYPTION_KEY` makes old data undecryptable.

### 3. Configure users

LockPass uses preconfigured accounts (**no registration**). Files store bcrypt hashes, not plaintext passwords.

Load order:

1. Path from `USERS_FILE` (if set)
2. `config/users.local.json` (if present; **gitignored** — use this on production hosts)
3. `config/users.json` (repo default: `admin` / `admin123`)

For local trials, the default account is enough. **On production**, copy and change the password without editing the tracked file:

```bash
cp config/users.json config/users.local.json
npm run hash-password -- your-password
# Write the hash into config/users.local.json passwordHash, then restart
```

**Generate a password hash:**

```bash
npm run hash-password -- your-password
```

Example:

```bash
npm run hash-password -- MySecurePass123
```

The terminal prints a `$2b$10$...` hash. Put it in the corresponding users file:

```json
[
  {
    "id": "u1",
    "username": "admin",
    "passwordHash": "$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
]
```

**Restart the app**, then sign in with `username` and the plaintext password you hashed.

### 4. Start

```bash
# SQLite (default)
npm run dev

# Text file storage
npm run dev:text

# PostgreSQL (requires DATABASE_URL)
npm run dev:db
```

Open http://localhost:3000

## Storage backends

Selected via `STORAGE_TYPE`:

| Value | Description | Data location |
|---|---|---|
| `sqlite` | SQLite database (default) | `./data/vault.db` |
| `text` | JSON text file | `./data/vault.json` |
| `database` | PostgreSQL | Database from `DATABASE_URL` |

### Production build & start

```bash
npm run build
npm run start        # SQLite
npm run start:text   # Text file
npm run start:db     # PostgreSQL
```

### Background server deployment

Suitable for single-host / intranet self-hosting. After install, env, and users setup:

```bash
npm run build

./scripts/service.sh start     # background start; logs → app.log
./scripts/service.sh status    # status / PIDs
./scripts/service.sh stop      # stop all related processes (npm / sh / next-server)
./scripts/service.sh restart   # restart
```

Common ops:

```bash
# Follow logs
tail -f app.log

# Custom port
PORT=8080 ./scripts/service.sh start

# Text / PostgreSQL start scripts
NPM_SCRIPT=start:text ./scripts/service.sh start
NPM_SCRIPT=start:db ./scripts/service.sh start
```

Notes:

- `stop` matches processes by working directory so orphaned `next-server` processes are cleaned up
- The process survives SSH disconnect, but **does not** come back after a host reboot; use systemd / pm2 for auto-start or crash recovery
- For public access, put a reverse proxy (Nginx / Caddy) in front with HTTPS and set `SECURE_COOKIES=true`
- After code changes, run `npm run build` before `restart`, or the old build keeps serving

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `STORAGE_TYPE` | `text` / `sqlite` / `database` | `sqlite` |
| `ENCRYPTION_KEY` | AES-256 key (64 hex chars) | required |
| `SESSION_SECRET` | Session encryption secret | required |
| `SECURE_COOKIES` | Cookie `secure` flag | `false` |
| `USERS_FILE` | Users file path (overrides default resolution) | empty → users.local.json → users.json |
| `DATABASE_URL` | PostgreSQL connection string | required in `database` mode |
| `DATA_DIR` | Local data directory | `./data` |

## Security notes

- HTTPS is not required; fine for intranet. On the public internet, terminate TLS at a reverse proxy and set `SECURE_COOKIES=true`
- Sensitive fields (passwords, card numbers, keys, etc.) are stored with AES-256-GCM
- Over plain HTTP, data is visible on the wire — use only on trusted networks
- Exported JSON contains plaintext secrets; handle carefully
- Anyone with `ENCRYPTION_KEY` can decrypt the vault

## Tech stack

- Next.js 15+ (App Router)
- TypeScript
- Tailwind CSS
- iron-session
- Drizzle ORM
- better-sqlite3 / PostgreSQL
