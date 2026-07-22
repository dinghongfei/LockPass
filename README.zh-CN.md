# LockPass

**Language:** [English](README.md) | [中文](README.zh-CN.md)

自托管密码管理应用，基于 Next.js 构建。

详细项目文档见 [WIKI.zh-CN.md](WIKI.zh-CN.md)（[English Wiki](WIKI.md)）。

## 功能

- 单层密码分组管理
- 多类型条目：网站、个人卡券、IT-服务器 / IT-RAM用户 / IT-API
- 列表卡片快捷复制：按类型展示关键字段，敏感信息掩码显示、一键复制
- 可配置密码生成器（长度、字符类型、最小数量、排除易混淆字符）
- 密码生成器支持独立使用和创建条目时快捷调用
- 全库导入/导出（JSON 格式）
- 服务端 AES-256-GCM 加密存储敏感字段
- 条目变更记录：每次保存仅记录变更字段，详情页下方倒序展示
- 系统「已废弃」分组：废弃条目可集中存放，数据不做物理删除
- 可插拔存储后端：文本文件、SQLite（默认）、PostgreSQL
- 预置用户登录（不支持注册）
- 对外密码生成 OpenAPI（按调用方分配密钥、必填用途、调用日志）

## 快速开始（本地开发）

用默认 SQLite 与预置账号，几分钟内在本机跑起来。

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

本地开发可直接使用示例中的默认值。正式环境请自行更换 `ENCRYPTION_KEY`、`SESSION_SECRET`（见 [生产环境部署](#生产环境部署)）；不要把密钥提交到 Git。

### 3. 启动开发服务

```bash
npm run dev
```

打开 http://localhost:3000 ，使用默认账号登录：

| 用户名 | 密码 |
|--------|------|
| `admin` | `admin123` |

生产改密与后台进程见 [生产环境部署](#生产环境部署)。换存储后端见 [存储后端](#存储后端)。

## 生产环境部署

适合单机自托管 / 内网。在部署机上按下列步骤完成安装、密钥、改密并后台运行。

### 1. 安装依赖

```bash
npm install
```

### 2. 配置生产密钥（必做）

```bash
cp .env.example .env.local
```

编辑 `.env.local`，用随机值替换示例中的密钥：

| 变量 | 作用 |
|------|------|
| `ENCRYPTION_KEY` | 加密密码库敏感字段；丢失后已有数据无法解密 |
| `SESSION_SECRET` | 加密登录会话 Cookie |

各生成一次并填入：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```env
ENCRYPTION_KEY=<第一次生成的64位hex>
SESSION_SECRET=<第二次生成的64位hex>
```

> 密钥只放在 `.env.local`，不要提交到 Git。更换 `ENCRYPTION_KEY` 会使旧数据无法解密。

### 3. 配置生产用户（必做）

LockPass **不支持注册**，账号来自用户配置文件（存 bcrypt 哈希，非明文）。加载顺序：

1. `USERS_FILE` 指定的路径
2. `config/users.local.json`（若存在；**已被 gitignore**，推荐生产使用）
3. `config/users.json`（仓库默认：`admin` / `admin123`）

```bash
cp config/users.json config/users.local.json
npm run hash-password -- your-password
```

将终端输出的 `$2b$10$...` 写入 `config/users.local.json` 的 `passwordHash`：

```json
[
  {
    "id": "u1",
    "username": "admin",
    "passwordHash": "$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
]
```

保存后重启应用，用 `username` 与刚才设置的明文密码登录。

### 4. 前台启动（可选）

需先手动构建：

```bash
npm run build
npm run start        # SQLite
npm run start:text   # 文本文件
npm run start:db     # PostgreSQL（需 DATABASE_URL）
```

### 5. 后台启动（推荐）

`start` / `restart` 会自动执行 `npm run build`，无需再手动构建：

```bash
./scripts/service.sh start     # 构建并后台启动，日志写入 app.log
./scripts/service.sh status    # 查看状态 / PID
./scripts/service.sh stop      # 停止本项目相关进程（含 next-server）
./scripts/service.sh restart   # 停止后重新构建并启动
```

常用操作：

```bash
tail -f app.log                          # 查看日志
PORT=8080 ./scripts/service.sh start     # 指定端口
NPM_SCRIPT=start:text ./scripts/service.sh start   # 文本存储
NPM_SCRIPT=start:db ./scripts/service.sh start     # PostgreSQL
```

注意事项：

- `stop` 按工作目录匹配进程，避免只杀父进程后 `next-server` 残留
- SSH 断开后进程仍运行，但**主机重启不会自动拉起**；需要开机自启或崩溃恢复时用 systemd / pm2
- 公网访问请加反向代理（Nginx / Caddy）并启用 HTTPS，同时设置 `SECURE_COOKIES=true`
- 存储后端对照见 [存储后端](#存储后端)

## 存储后端

通过 `STORAGE_TYPE`（或对应 npm script）选择：

| 值 | 说明 | 数据位置 | 本地开发 | 生产启动 |
|---|---|---|---|---|
| `sqlite` | SQLite（默认） | `./data/vault.db` | `npm run dev` | `npm run start` |
| `text` | JSON 文本文件 | `./data/vault.json` | `npm run dev:text` | `npm run start:text` |
| `database` | PostgreSQL | `DATABASE_URL` | `npm run dev:db` | `npm run start:db` |

使用 PostgreSQL 时，在 `.env.local` 中配置 `DATABASE_URL`。

## 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `STORAGE_TYPE` | 存储类型：`text` / `sqlite` / `database` | `sqlite` |
| `ENCRYPTION_KEY` | AES-256 加密密钥（64 位 hex） | 必填 |
| `SESSION_SECRET` | 会话加密密钥 | 必填 |
| `SECURE_COOKIES` | Cookie secure 标志 | `false` |
| `USERS_FILE` | 用户配置文件路径（覆盖默认加载逻辑） | 空则按 users.local.json → users.json |
| `API_CLIENTS_FILE` | OpenAPI 调用方配置路径 | 空则按 api-clients.local.json → api-clients.json |
| `DATABASE_URL` | PostgreSQL 连接串 | `database` 模式必填 |
| `DATA_DIR` | 本地数据目录 | `./data` |

## 密码生成 OpenAPI

供其他系统在无浏览器会话时调用生成密码。

### 默认示例密钥

[`config/api-clients.json`](config/api-clients.json) 内置示例调用方，**默认已启用**，明文 API Key 为：

```text
sk-lockpass
```

本地可直接使用 `Authorization: Bearer sk-lockpass` 调用，无需额外配置。

**生产环境不要使用 `sk-lockpass`** — 请用 `npm run hash-api-key` 生成新密钥，写入 `config/api-clients.local.json` 后重启。

### 配置调用方

1. 生成 API Key 与 hash（默认带 `sk-` 前缀）：

```bash
npm run hash-api-key
```

输出含 `apiKey`（只显示一次，请妥善保存）与 `apiKeyHash`（写入配置）。也可传入自定义密钥；若无 `sk-` 前缀会自动补上：

```bash
npm run hash-api-key -- my-custom-secret
```

2. 复制并编辑调用方配置（生产环境请用已被 gitignore 的 local 文件）：

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

3. 修改配置后重启应用。

### 调用接口

- 文档：`GET /api/openapi/v1/openapi.json`
- 生成：`POST /api/openapi/v1/password/generate`
- 鉴权：`Authorization: Bearer <api-key>`
- 请求体必须包含 `purpose`（用途说明）

```bash
curl -sS -X POST "http://localhost:3000/api/openapi/v1/password/generate" \
  -H "Authorization: Bearer sk-lockpass" \
  -H "Content-Type: application/json" \
  -d '{"purpose":"provisioning user for CRM","prefix":"sk-","length":16}'
```

（轮换凭证后请把 `sk-lockpass` 换成你自己的密钥。）

响应示例：

```json
{ "password": "sk-...", "requestId": "..." }
```

### 调用日志

每次调用会追加写入 `{DATA_DIR}/openapi-password-calls.jsonl`（默认 `./data/openapi-password-calls.jsonl`），包含**明文密码**、调用方、用途、参数、IP、成功/失败。请严格控制该文件访问权限。

## 安全说明

- 不强制 HTTPS，适合内网部署；公网环境建议配置反向代理 HTTPS 并设置 `SECURE_COOKIES=true`
- 敏感字段（密码、卡号、私钥等）使用 AES-256-GCM 加密后存储
- HTTP 传输时数据在网络上以明文传输，请仅在可信网络环境使用
- 导出的 JSON 文件包含明文敏感数据，请妥善保管
- 管理员持有 `ENCRYPTION_KEY` 可解密全部数据
- OpenAPI 密码调用日志含明文密码 — 请限制对 `{DATA_DIR}/openapi-password-calls.jsonl` 的访问

## 技术栈

- Next.js 15+ (App Router)
- TypeScript
- Tailwind CSS
- iron-session
- Drizzle ORM
- better-sqlite3 / PostgreSQL
