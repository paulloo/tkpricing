# TK Shop 智能定价计算器 v3.0

## Project Overview

这是一个专为 TikTok Shop (马来西亚站点) 设计的智能定价计算器 Web 应用。应用支持多 SKU 变体管理、多种定价策略、退货率模型和实时利润计算。

主要功能包括：
- 商品多 SKU 变体管理
- 四种定价策略（引流款、利润款、锚定款、自定义）
- 全面的成本计算（采购、物流、平台费用、运营成本）
- 退货率模型与实际利润计算
- **PostgreSQL 数据库存储** (Prisma ORM)
- 数据导入/导出
- 响应式设计支持移动端

## Technology Stack

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 15 + React 19 + TypeScript 5.9 |
| 数据库 | PostgreSQL + Prisma ORM |
| 样式 | Tailwind CSS 3.4.19 |
| UI 组件 | shadcn/ui (New York style) |
| 状态管理 | Zustand 5 |
| 表单验证 | Zod 4 + React Hook Form 7 |
| 图标 | Lucide React |
| 图表 | Recharts |

## Project Structure

```
├── prisma/
│   └── schema.prisma       # Prisma 数据库模型定义
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── api/            # API 路由 (RESTful)
│   │   │   ├── config/     # 全局配置 CRUD
│   │   │   ├── products/   # 商品 CRUD
│   │   │   ├── skus/       # SKU CRUD
│   │   │   └── import/     # 批量导入
│   │   ├── globals.css     # 全局样式 + Tailwind
│   │   ├── layout.tsx      # 根布局
│   │   └── page.tsx        # 主页
│   ├── components/         # UI 组件
│   │   ├── ui/             # shadcn/ui 组件
│   │   ├── Header.tsx      # 顶部导航
│   │   ├── ProductCard.tsx # 商品卡片
│   │   ├── SKUTable.tsx    # SKU 表格
│   │   ├── GlobalParamsPanel.tsx
│   │   ├── SummaryCards.tsx
│   │   └── AddProductDialog.tsx
│   ├── lib/
│   │   ├── prisma.ts       # Prisma Client 单例
│   │   ├── calculator.ts   # 核心计算引擎
│   │   └── utils.ts        # 工具函数
│   ├── store/
│   │   └── useStore.ts     # Zustand 状态 + API 调用
│   ├── types/
│   │   └── index.ts        # TypeScript 类型
│   └── hooks/
│       └── use-mobile.ts
├── next.config.js          # Next.js 配置
├── tailwind.config.js      # Tailwind 配置
├── tsconfig.json           # TypeScript 配置
└── .env                    # 环境变量 (DATABASE_URL)
```

## Build and Development Commands

```bash
# 启动开发服务器 (Next.js)
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start

# 数据库操作
npm run db:generate    # 生成 Prisma Client
npm run db:migrate     # 创建并应用迁移
npm run db:push        # 快速推送 schema (开发)
npm run db:studio      # 打开 Prisma Studio
```

## Database Schema

### GlobalConfig (全局配置表)
- 汇率、物流费率、平台费率
- 退货率、目标利润率
- 定价策略

### Product (商品表)
- 商品名称、链接、描述
- UI 状态 (展开/折叠)
- 排序字段

### SKU (SKU 变体表)
- 采购成本、国内运费、包装费
- 重量
- 退货率覆盖、定价策略覆盖

## API 端点

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/config` | 获取全局配置 |
| PUT | `/api/config` | 更新全局配置 |
| POST | `/api/config` | 重置为默认 |
| GET | `/api/products` | 获取所有商品 |
| POST | `/api/products` | 创建商品 |
| PUT | `/api/products/[id]` | 更新商品 |
| DELETE | `/api/products/[id]` | 删除商品 |
| POST | `/api/skus` | 创建 SKU |
| PUT | `/api/skus/[id]` | 更新 SKU |
| DELETE | `/api/skus/[id]` | 删除 SKU |
| POST | `/api/import` | 批量导入 |

## Core Calculation Engine

核心计算逻辑位于 `src/lib/calculator.ts`：

### 定价策略
| 策略 | 倍数 | 用途 |
|------|------|------|
| 引流款 (drainage) | 1.3x | 低价引流，快速起量 |
| 利润款 (profit) | 2.0x | 正常利润，主力销售 |
| 锚定款 (anchor) | 2.5x | 高价锚定，衬托其他 |
| 自定义 (custom) | 可配置 | 灵活定价 |

### 计算公式
1. **产品成本** = 采购价 + 国内运费 + 包装费
2. **头程运费** = max(重量×运费率, 最低操作费) + 贴单费
3. **总成本(RMB)** = 产品成本 + 物流成本
4. **总成本(MYR)** = 总成本(RMB) × 汇率 + 尾程派送费
5. **保本价** = 总成本 / (1 - 平台扣费率)
6. **建议售价** = 总成本 / (1 - 平台扣费率 - 目标利润率)

## State Management

使用 Zustand 管理前端状态，通过 API 与 PostgreSQL 交互：

```typescript
const { products, globalParams, loadData } = useStore();

// 自动加载数据
useEffect(() => { loadData(); }, []);

// 所有操作自动同步到数据库
await addProduct('商品名称');
await updateProduct(id, { name: '新名称' });
await deleteProduct(id);
```

## Code Style Guidelines

### 导入顺序
1. React 内置 Hooks/Types
2. 第三方库
3. 类型定义 (`@/types`)
4. 状态管理 (`@/store/*`)
5. 工具函数 (`@/lib/*`)
6. UI 组件 (`@/components/ui/*`)
7. 自定义组件 (`@/components/*`)
8. 样式

### 命名规范
- 组件：PascalCase (e.g., `ProductCard.tsx`)
- Hooks：camelCase 前缀 `use` (e.g., `useStore.ts`)
- API 路由：`route.ts` (Next.js 约定)
- 工具函数：camelCase (e.g., `calculateSKU`)

### 类名合并
使用 `cn()` 工具函数合并 Tailwind 类名：
```tsx
import { cn } from '@/lib/utils';

className={cn(
  'base-classes',
  conditional && 'conditional-classes',
  className
)}
```

## Environment Variables

```env
# 必需
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"

# 可选 (用于服务端密钥，当前未使用)
# SUPABASE_SERVICE_ROLE_KEY=xxx
```

## Development Conventions

### 新增 shadcn/ui 组件
```bash
npx shadcn add <component-name>
```

### 数据库迁移流程
```bash
# 修改 schema.prisma 后
npm run db:migrate -- --name describe_change

# 生成客户端
npm run db:generate
```

### 响应式设计断点
- 移动端优先设计
- 关键断点：`md` (768px), `lg` (1024px)
- 使用 Tailwind 响应式前缀：`md:`, `lg:`

## Deployment

### Vercel (推荐)
```bash
vercel --prod
```
注意：在 Vercel Dashboard 设置 `DATABASE_URL`

### Docker 部署
```bash
# 构建镜像
docker build -t tk-pricing .

# 运行 (需外部 PostgreSQL)
docker run -e DATABASE_URL=xxx -p 3000:3000 tk-pricing
```

## Migration from v2.5

v2.5 使用 localStorage 存储，v3.0 使用 PostgreSQL：

1. 在原版导出 JSON 数据
2. 部署 v3.0 并配置数据库
3. 使用导入功能将数据导入 PostgreSQL

详见 `MIGRATION_GUIDE.md`

## Security Considerations

- 数据库连接字符串存储在服务端环境变量
- Prisma ORM 防止 SQL 注入
- 如需用户隔离，可添加 `userId` 字段启用多租户

## Useful References

- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [shadcn/ui 文档](https://ui.shadcn.com/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Zustand 文档](https://docs.pmnd.rs/zustand)
