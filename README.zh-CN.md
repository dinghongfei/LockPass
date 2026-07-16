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

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，至少配置以下两项：

| 变量 | 作用 |
|------|------|
| `ENCRYPTION_KEY` | 加密密码库条目（网站密码、卡号等）的密钥，丢失后已有数据无法解密 |
| `SESSION_SECRET` | 加密登录会话 Cookie，用于保持登录状态 |

**生成随机密钥**（建议各运行一次，分别填入上面两个变量）：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

命令说明：用 Node 内置 `crypto` 生成 32 字节随机数，再转成 64 位十六进制字符串。终端会输出类似：

```
a3f8c2e1b4d567890abcdef0123456789abcdef0123456789abcdef01234567
```

将输出粘贴到 `.env.local`：

```env
ENCRYPTION_KEY=粘贴第一次生成的64位hex
SESSION_SECRET=粘贴第二次生成的64位hex
```

> 密钥只保存在本机 `.env.local`，不要提交到 Git。更换 `ENCRYPTION_KEY` 后，旧数据将无法解密。

### 3. 配置用户

LockPass 使用预置登录账号，**不支持注册**。文件中存的是 bcrypt 哈希，不是明文密码。

加载优先级：

1. 环境变量 `USERS_FILE` 指定的路径
2. `config/users.local.json`（若存在；**已被 gitignore**，适合生产机改密）
3. `config/users.json`（仓库默认，`admin` / `admin123`）

本地试用可直接用默认账号。**生产环境**请复制后改密，避免改到会被提交的 `users.json`：

```bash
cp config/users.json config/users.local.json
npm run hash-password -- your-password
# 将输出的 hash 写入 config/users.local.json 的 passwordHash，然后重启
```

**生成登录密码 hash**（将 `your-password` 换成你要设置的登录密码）：

```bash
npm run hash-password -- your-password
```

示例：

```bash
npm run hash-password -- MySecurePass123
```

终端会输出一行以 `$2b$10$` 开头的 hash，写入对应用户文件的 `passwordHash` 字段：

```json
[
  {
    "id": "u1",
    "username": "admin",
    "passwordHash": "$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
]
```

保存文件后**重启应用**，使用 `username` 与刚才设置的明文密码登录。

### 4. 启动

```bash
# SQLite 存储（默认）
npm run dev

# 文本文件存储
npm run dev:text

# PostgreSQL 存储（需配置 DATABASE_URL）
npm run dev:db
```

访问 http://localhost:3000

## 存储后端

通过 `STORAGE_TYPE` 环境变量选择：

| 值 | 说明 | 数据位置 |
|---|---|---|
| `sqlite` | SQLite 数据库（默认） | `./data/vault.db` |
| `text` | JSON 文本文件 | `./data/vault.json` |
| `database` | PostgreSQL | `DATABASE_URL` 指定的数据库 |

### 生产构建与启动

```bash
npm run build
npm run start        # SQLite
npm run start:text   # 文本文件
npm run start:db     # PostgreSQL
```

### 服务器后台部署

适合单机自托管 / 内网部署。先完成上文的依赖安装、环境变量与用户配置，再构建并用脚本管理进程：

```bash
npm run build

./scripts/service.sh start     # 后台启动，日志写入 app.log
./scripts/service.sh status    # 查看状态 / PID
./scripts/service.sh stop      # 停止全部关联进程（npm / sh / next-server）
./scripts/service.sh restart   # 重启
```

常用操作：

```bash
# 查看日志
tail -f app.log

# 指定端口启动
PORT=8080 ./scripts/service.sh start

# 使用文本存储 / PostgreSQL 启动
NPM_SCRIPT=start:text ./scripts/service.sh start
NPM_SCRIPT=start:db ./scripts/service.sh start
```

说明：

- `stop` 会按工作目录匹配并清理本项目相关的全部进程，避免只杀父进程后 `next-server` 残留
- 进程在 SSH 断开后继续运行，但**服务器重启后不会自动拉起**；需要开机自启或崩溃自动恢复时，建议改用 systemd / pm2
- 公网访问时请在前面加反向代理（Nginx / Caddy 等）并启用 HTTPS，同时设置 `SECURE_COOKIES=true`
- 修改源码后需先 `npm run build` 再 `restart`，否则仍运行旧构建

## 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `STORAGE_TYPE` | 存储类型：`text` / `sqlite` / `database` | `sqlite` |
| `ENCRYPTION_KEY` | AES-256 加密密钥（64 位 hex） | 必填 |
| `SESSION_SECRET` | 会话加密密钥 | 必填 |
| `SECURE_COOKIES` | Cookie secure 标志 | `false` |
| `USERS_FILE` | 用户配置文件路径（覆盖默认加载逻辑） | 空则按 users.local.json → users.json |
| `DATABASE_URL` | PostgreSQL 连接串 | `database` 模式必填 |
| `DATA_DIR` | 本地数据目录 | `./data` |

## 安全说明

- 不强制 HTTPS，适合内网部署；公网环境建议配置反向代理 HTTPS 并设置 `SECURE_COOKIES=true`
- 敏感字段（密码、卡号、私钥等）使用 AES-256-GCM 加密后存储
- HTTP 传输时数据在网络上以明文传输，请仅在可信网络环境使用
- 导出的 JSON 文件包含明文敏感数据，请妥善保管
- 管理员持有 `ENCRYPTION_KEY` 可解密全部数据

## 技术栈

- Next.js 15+ (App Router)
- TypeScript
- Tailwind CSS
- iron-session
- Drizzle ORM
- better-sqlite3 / PostgreSQL
