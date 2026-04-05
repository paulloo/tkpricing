# Prisma + Next.js 迁移指南

## 项目结构变更

```
tkpricing/
├── prisma/
│   ├── schema.prisma      # 数据库模型定义
│   └── seed.ts            # 可选：种子数据
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/           # API 路由
│   │   │   ├── config/    # 全局配置 API
│   │   │   ├── products/  # 商品 API
│   │   │   ├── skus/      # SKU API
│   │   │   └── import/    # 批量导入 API
│   │   ├── globals.css    # 全局样式
│   │   ├── layout.tsx     # 根布局
│   │   └── page.tsx       # 主页
│   ├── lib/
│   │   └── prisma.ts      # Prisma Client 单例
│   ├── components/        # UI 组件 (不变)
│   ├── store/
│   │   └── useStore.ts    # 更新后的状态管理
│   └── types/             # TypeScript 类型
├── next.config.js         # Next.js 配置
├── .env                   # 环境变量
└── package.json           # 更新后的脚本
```

## 快速开始

### 1. 安装 PostgreSQL

**macOS (使用 Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Windows:**
下载安装包: https://www.postgresql.org/download/windows/

**或使用 Docker:**
```bash
docker run --name tk-pricing-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tk_pricing \
  -p 5432:5432 \
  -d postgres:15
```

### 2. 配置环境变量

编辑 `.env` 文件：
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tk_pricing?schema=public"
```

### 3. 初始化数据库

```bash
# 生成 Prisma Client
npm run db:generate

# 创建并应用迁移
npm run db:migrate
# 或快速推送（开发环境）
npm run db:push
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## API 端点

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/config` | 获取全局配置 |
| PUT | `/api/config` | 更新全局配置 |
| POST | `/api/config` | 重置为默认配置 |
| GET | `/api/products` | 获取所有商品 |
| POST | `/api/products` | 创建商品 |
| GET | `/api/products/[id]` | 获取单个商品 |
| PUT | `/api/products/[id]` | 更新商品 |
| DELETE | `/api/products/[id]` | 删除商品 |
| POST | `/api/skus` | 创建 SKU |
| PUT | `/api/skus/[id]` | 更新 SKU |
| DELETE | `/api/skus/[id]` | 删除 SKU |
| POST | `/api/import` | 批量导入数据 |

## 数据库迁移操作

```bash
# 开发环境 - 创建新迁移
npm run db:migrate -- --name add_user_table

# 生产环境 - 应用迁移
npx prisma migrate deploy

# 查看数据库
npm run db:studio
```

## 数据迁移（从 localStorage）

1. 在原版应用中导出数据（JSON）
2. 打开新版应用 → 设置 → 导入数据
3. 选择导出的 JSON 文件

## 部署

### Vercel

```bash
npm i -g vercel
vercel --prod
```

注意：需要在 Vercel Dashboard 中添加 `DATABASE_URL` 环境变量。

### 自有服务器

```bash
# 构建
npm run build

# 启动生产服务器
npm start
```

## 常见问题

### 1. 数据库连接失败

检查 PostgreSQL 服务是否运行：
```bash
# macOS
brew services list | grep postgresql

# 或使用 pg_isready
pg_isready -h localhost -p 5432
```

### 2. Prisma Client 未生成

```bash
npm run db:generate
```

### 3. 端口冲突

Next.js 默认使用 3000 端口，如果被占用：
```bash
npm run dev -- --port 3001
```

## 回滚到 Vite 版本

如需回滚：
```bash
git checkout vite-version -- .
```

或手动保留 `vite.config.ts` 和 `index.html` 备用。
