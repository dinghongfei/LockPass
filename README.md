# LockPass

自托管密码管理应用，基于 Next.js 构建。

详细项目文档见 [WIKI.md](WIKI.md)。

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

LockPass 使用 `config/users.json` 预置登录账号，**不支持注册**。文件中存的是 bcrypt 哈希，不是明文密码。

**生成登录密码 hash**（将 `your-password` 换成你要设置的登录密码）：

```bash
npm run hash-password -- your-password
```

示例：

```bash
npm run hash-password -- MySecurePass123
```

终端会输出一行以 `$2b$10$` 开头的 hash，写入 `config/users.json` 的 `passwordHash` 字段：

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

默认已内置用户 `admin` / `admin123`，本地试用可跳过本步；**生产环境务必修改**。

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

生产环境启动：

```bash
npm run build
npm run start        # SQLite
npm run start:text   # 文本文件
npm run start:db     # PostgreSQL
```

## 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `STORAGE_TYPE` | 存储类型：`text` / `sqlite` / `database` | `sqlite` |
| `ENCRYPTION_KEY` | AES-256 加密密钥（64 位 hex） | 必填 |
| `SESSION_SECRET` | 会话加密密钥 | 必填 |
| `SECURE_COOKIES` | Cookie secure 标志 | `false` |
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
