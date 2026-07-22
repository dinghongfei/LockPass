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
- External OpenAPI for password generation (per-caller API keys, purpose required, call logging)

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
| `API_CLIENTS_FILE` | OpenAPI clients file path | empty → api-clients.local.json → api-clients.json |
| `DATABASE_URL` | PostgreSQL connection string | required in `database` mode |
| `DATA_DIR` | Local data directory | `./data` |

## Password generation OpenAPI

For other systems to generate passwords without a browser session.

### Default example key

[`config/api-clients.json`](config/api-clients.json) ships with an example client that is **enabled** and uses this plaintext API key:

```text
sk-lockpass
```

You can call the API locally with `Authorization: Bearer sk-lockpass` without further setup.

**Do not use `sk-lockpass` in production** — generate a new key with `npm run hash-api-key`, put the hash in `config/api-clients.local.json`, and restart.

### Configure callers

1. Generate an API key and hash (defaults to an `sk-` prefixed key):

```bash
npm run hash-api-key
```

Output includes `apiKey` (save once) and `apiKeyHash` (put in config). You can also pass a custom secret; if it has no `sk-` prefix, one is added:

```bash
npm run hash-api-key -- my-custom-secret
```

2. Copy and edit the clients file (production should use the gitignored local file):

```bash
cp config/api-clients.json config/api-clients.local.json
```

```json
[
  {
    "id": "crm",
    "name": "CRM System",
    "apiKeyHash": "$2b$10$...",
    "enabled": true
  }
]
```

3. Restart the app after changing clients.

### Call the API

- Spec: `GET /api/openapi/v1/openapi.json`
- Generate: `POST /api/openapi/v1/password/generate`
- Auth: `Authorization: Bearer <api-key>`
- Body must include `purpose` (why the password is generated)

```bash
curl -sS -X POST "http://localhost:3000/api/openapi/v1/password/generate" \
  -H "Authorization: Bearer sk-lockpass" \
  -H "Content-Type: application/json" \
  -d '{"purpose":"provisioning user for CRM","prefix":"sk-","length":16}'
```

(Replace `sk-lockpass` with your own key after rotating credentials.)

Example response:

```json
{ "password": "sk-...", "requestId": "..." }
```

### Call logs

Every call is appended to `{DATA_DIR}/openapi-password-calls.jsonl` (default `./data/openapi-password-calls.jsonl`), including the **plaintext password**, caller id/name, purpose, options, IP, and success/failure. Treat this file as highly sensitive.

## Security notes

- HTTPS is not required; fine for intranet. On the public internet, terminate TLS at a reverse proxy and set `SECURE_COOKIES=true`
- Sensitive fields (passwords, card numbers, keys, etc.) are stored with AES-256-GCM
- Over plain HTTP, data is visible on the wire — use only on trusted networks
- Exported JSON contains plaintext secrets; handle carefully
- Anyone with `ENCRYPTION_KEY` can decrypt the vault
- OpenAPI password call logs store plaintext passwords — restrict filesystem access to `{DATA_DIR}/openapi-password-calls.jsonl`

## Tech stack

- Next.js 15+ (App Router)
- TypeScript
- Tailwind CSS
- iron-session
- Drizzle ORM
- better-sqlite3 / PostgreSQL
