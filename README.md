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

## Quick start (local development)

Get a local instance running in a few minutes with default SQLite and the built-in account.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

For local development, the sample defaults are enough. For real deployments, replace `ENCRYPTION_KEY` and `SESSION_SECRET` (see [Production deployment](#production-deployment)); never commit secrets to Git.

### 3. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000 and sign in with the default account:

| Username | Password |
|----------|----------|
| `admin` | `admin123` |

For password changes and background processes, see [Production deployment](#production-deployment). For other storage backends, see [Storage backends](#storage-backends).

## Production deployment

For single-host / intranet self-hosting. On the server, follow the steps below to install, set secrets, change the password, and run in the background.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure production secrets (required)

```bash
cp .env.example .env.local
```

Edit `.env.local` and replace the sample secrets with random values:

| Variable | Purpose |
|------|------|
| `ENCRYPTION_KEY` | Encrypts vault secrets; existing data cannot be decrypted if this key is lost |
| `SESSION_SECRET` | Encrypts the login session cookie |

Generate once for each variable:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```env
ENCRYPTION_KEY=<first-64-char-hex>
SESSION_SECRET=<second-64-char-hex>
```

> Keep secrets in `.env.local` only — do not commit them. Changing `ENCRYPTION_KEY` makes old data undecryptable.

### 3. Configure production users (required)

LockPass has **no registration**. Accounts come from a users file (bcrypt hashes, not plaintext). Load order:

1. Path from `USERS_FILE` (if set)
2. `config/users.local.json` (if present; **gitignored** — recommended for production)
3. `config/users.json` (repo default: `admin` / `admin123`)

```bash
cp config/users.json config/users.local.json
npm run hash-password -- your-password
```

Put the printed `$2b$10$...` hash into `passwordHash` in `config/users.local.json`:

```json
[
  {
    "id": "u1",
    "username": "admin",
    "passwordHash": "$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
]
```

Restart the app, then sign in with `username` and the plaintext password you hashed.

### 4. Foreground start (optional)

Build manually first:

```bash
npm run build
npm run start        # SQLite
npm run start:text   # Text file
npm run start:db     # PostgreSQL (requires DATABASE_URL)
```

### 5. Background start (recommended)

`start` / `restart` run `npm run build` automatically — no separate build step:

```bash
./scripts/service.sh start     # build and start in background; logs → app.log
./scripts/service.sh status    # status / PIDs
./scripts/service.sh stop      # stop related processes (including next-server)
./scripts/service.sh restart   # stop, then rebuild and start
```

Common ops:

```bash
tail -f app.log                          # follow logs
PORT=8080 ./scripts/service.sh start     # custom port
NPM_SCRIPT=start:text ./scripts/service.sh start   # text storage
NPM_SCRIPT=start:db ./scripts/service.sh start     # PostgreSQL
```

Notes:

- `stop` matches processes by working directory so orphaned `next-server` processes are cleaned up
- The process survives SSH disconnect, but **does not** come back after a host reboot; use systemd / pm2 for auto-start or crash recovery
- For public access, put a reverse proxy (Nginx / Caddy) in front with HTTPS and set `SECURE_COOKIES=true`
- Storage backend reference: [Storage backends](#storage-backends)

## Storage backends

Choose via `STORAGE_TYPE` (or the matching npm script):

| Value | Description | Data location | Local development | Production start |
|---|---|---|---|---|
| `sqlite` | SQLite (default) | `./data/vault.db` | `npm run dev` | `npm run start` |
| `text` | JSON text file | `./data/vault.json` | `npm run dev:text` | `npm run start:text` |
| `database` | PostgreSQL | `DATABASE_URL` | `npm run dev:db` | `npm run start:db` |

When using PostgreSQL, set `DATABASE_URL` in `.env.local`.

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
