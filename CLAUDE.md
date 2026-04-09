# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TK Shop 智能定价计算器 — a pricing calculator web app for TikTok Shop (Malaysia). Manages multi-SKU products with configurable cost models, platform fee rates, return-rate models, and four pricing strategies (drainage/profit/anchor/custom).

## Commands

```bash
# Development
pnpm dev           # Start Next.js dev server
pnpm build         # Production build
pnpm lint          # ESLint

# Database (requires DATABASE_URL in .env)
pnpm db:generate   # Regenerate Prisma client after schema changes
pnpm db:migrate    # Create + apply migration (dev)
pnpm db:push       # Push schema without migration (quick dev iteration)
pnpm db:studio     # Open Prisma Studio GUI
pnpm db:seed       # Seed database (prisma/seed.ts)

# Add shadcn/ui components
npx shadcn add <component-name>
```

## Environment

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
```

## Architecture

This is a **Next.js 15 App Router** application with a PostgreSQL backend via Prisma ORM.

### Data flow

```
Browser → Zustand store (src/store/useStore.ts)
       → Next.js API routes (src/app/api/)
       → Prisma client (src/lib/prisma.ts singleton)
       → PostgreSQL
```

### Core calculation engine (`src/lib/calculator.ts`)

All pricing math lives here — no calculation logic in components or API routes. Key functions:

- `calculateSKU(sku, globalParams)` — produces the full `SKUCalculation` result including costs (RMB + MYR), platform fees, return-rate model, and profit metrics
- `createDefaultGlobalParams()` — canonical defaults for all rate fields
- `PRICING_STRATEGIES` — strategy multiplier config (drainage 1.3x, profit 2.0x, anchor 2.5x, custom)

The calculation pipeline order: product cost → international shipping → total cost (RMB→MYR) → break-even price → suggested price → strategy price → final price → profit → return-adjusted actual profit.

### State management (`src/store/useStore.ts`)

Single Zustand store holds `products` and `globalParams`. All mutations go through the store, which calls the API routes and updates local state. Components never call the API directly.

### API routes (`src/app/api/`)

RESTful routes following Next.js App Router conventions. Each route file exports named handlers (`GET`, `POST`, `PUT`, `DELETE`). Routes mirror the Prisma schema: `/api/config`, `/api/products`, `/api/products/[id]`, `/api/skus`, `/api/skus/[id]`, `/api/import`.

### Database schema (`prisma/schema.prisma`)

Three models:
- `GlobalConfig` — singleton row per user; holds all rate/fee/strategy defaults
- `Product` — product name, URL, display order, expansion state
- `SKU` (table: `sku_variants`) — cost inputs and per-SKU overrides for return rate, pricing strategy, and final price; cascade-deletes with parent product

### Type system (`src/types/index.ts`)

`SKUVariant` is the input shape; `SKUCalculation` is the computed output; `SKUData` combines both. `GlobalParams` maps 1:1 to `GlobalConfig` schema fields (note: DB uses `Decimal`, TypeScript uses `number`).

## Code conventions

- Import order: React → third-party → `@/types` → `@/store` → `@/lib` → `@/components/ui` → `@/components`
- Use `cn()` from `@/lib/utils` for all Tailwind class merging
- Naming: PascalCase components, `use*` hooks, `route.ts` for API files, camelCase utilities
- After modifying `prisma/schema.prisma`, always run `pnpm db:generate` to update the client
- Database migration workflow: `pnpm db:migrate -- --name <describe_change>` then `pnpm db:generate`
- SKU-level fields (`returnRate`, `pricingStrategy`, `customMultiplier`) are nullable — `null` means "inherit from global config"
