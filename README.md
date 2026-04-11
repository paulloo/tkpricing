# TK Shop 智能定价计算器

TikTok Shop（马来西亚）多 SKU 商品定价管理工具，支持成本建模、平台费率配置、退货率模型和四种定价策略。

## 功能特性

- **多商品 / 多 SKU 管理** — 支持一个商品下多个 SKU 变体，独立维护成本与定价
- **四种定价策略** — 引流价（×1.3）/ 利润价（×2.0）/ 锚点价（×2.5）/ 自定义倍率
- **完整成本链路** — 采购成本 → 国际运费 → 平台费 → 退货模型 → 实际净利
- **全局参数面板** — 汇率、平台费率、退货率等全局参数，支持 SKU 级别覆盖
- **数据持久化** — PostgreSQL 数据库存储，支持批量导入 / 导出
- **ERP 风格界面** — 表格化展示，数据密度高，操作体验流畅

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) |
| UI | shadcn/ui + Tailwind CSS v3 |
| 状态 | Zustand |
| 数据库 | PostgreSQL + Prisma ORM |
| 语言 | TypeScript |

## 快速开始

### 前置要求

- Node.js 20+
- pnpm
- PostgreSQL 15+（或 Docker）

### 1. 克隆与安装

```bash
git clone https://github.com/paulloo/tkpricing.git
cd tkpricing
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入你的数据库连接信息：

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/tk_pricing?schema=public"
```

**使用 Docker 快速启动数据库：**

```bash
docker run --name tk-pricing-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tk_pricing \
  -p 5432:5432 \
  -d postgres:15
```

### 3. 初始化数据库

```bash
pnpm db:push      # 快速推送 Schema（开发环境）
pnpm db:generate  # 生成 Prisma Client
```

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 数据库命令

```bash
pnpm db:generate   # 重新生成 Prisma Client（Schema 变更后）
pnpm db:migrate    # 创建并应用迁移（生产推荐）
pnpm db:push       # 快速推送 Schema（开发迭代）
pnpm db:studio     # 打开 Prisma Studio 可视化界面
pnpm db:seed       # 填充种子数据
```

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

## 定价计算逻辑

```
采购成本 + 国内运费 + 包材费
  → 总成本 (RMB → MYR 换算)
  → 加权国际运费（按重量）
  → 保本价（含平台费）
  → 策略价（×倍率）
  → 含退货模型实际净利
```

核心计算引擎见 `src/lib/calculator.ts`。

## 部署

### Vercel

```bash
pnpm build
npx vercel --prod
```

在 Vercel Dashboard 中添加环境变量 `DATABASE_URL`，并执行：

```bash
npx prisma migrate deploy
```

### 自有服务器

```bash
pnpm build
pnpm start
```

## 项目结构

```
src/
├── app/
│   ├── api/          # Next.js API 路由
│   ├── layout.tsx    # 根布局
│   └── page.tsx      # 主页
├── components/       # UI 组件
├── lib/
│   ├── calculator.ts # 定价计算引擎
│   └── prisma.ts     # Prisma Client 单例
├── store/
│   └── useStore.ts   # Zustand 全局状态
└── types/
    └── index.ts      # TypeScript 类型定义
prisma/
└── schema.prisma     # 数据库 Schema
```

## License

[MIT](./LICENSE)
