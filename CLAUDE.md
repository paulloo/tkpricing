# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TK Shop 定价计算器 — an open-source, multi-shop pricing calculator for TikTok Shop Southeast Asia cross-border sellers. Each shop (one site, e.g. MY/TH) has its own fee lines, shipping, return model and target margins. The engine solves for the lowest price that reaches a target *expected net margin*. See `docs/pricing-model.md`.

## Commands

```bash
pnpm dev                          # Next.js dev server
pnpm build                        # Production build (standalone output)
pnpm lint                         # ESLint (flat config, eslint .)
pnpm typecheck                    # tsc --noEmit
pnpm test                         # Vitest: unit + API integration
pnpm vitest run src/domain/pricing/calculate.test.ts   # single file
pnpm db:migrate --name <change>   # create + apply migration (dev)
pnpm db:deploy                    # apply migrations (prod / CI)
pnpm db:studio
```

API integration tests (`tests/api`) run against `TEST_DATABASE_URL`, or `DATABASE_URL` with `_test` appended to the db name. The test DB is created + migrated automatically and **truncated before every test** — never point it at real data. Tests skip when no database URL is set.

## Architecture

```
src/domain/      Pure TypeScript, no framework/DB imports. All business rules live here.
  shop-config.ts   zod schema for a shop's config (fee lines, currency, firstLeg, lastMile, returns, pricing)
  presets.ts       sites + fee presets (copied into a shop at creation)
  contracts.ts     DTOs + zod request schemas shared by server and client
  backup.ts        backup format v2 + legacy v1 conversion
  pricing/         shipping → fees → economics (expected profit at a price) → solver → calculate → portfolio
  import/          Miaoshou ERP CSV parser
src/server/      http.ts (route() wrapper, readJson, envelope), mappers (Decimal→number), repositories, services
src/app/api/     Thin route handlers: validate with contracts, call repositories, return ok()
src/store/       Zustand: shop-slice (shops, current shop, config draft) + product-slice (optimistic edits with rollback)
src/hooks/       useCalculatedProducts — runs the engine with the effective config (draft ?? saved)
src/components/  fields/ (editable inputs), shop/, product/, dialogs/; components/ui is shadcn (don't hand-edit)
src/proxy.ts     Optional HTTP Basic auth (BASIC_AUTH_USER / BASIC_AUTH_PASSWORD) — Next 16 "proxy" = middleware
```

Data flow: component → store action → `lib/api-client` → `/api/*` route → repository → Prisma → PostgreSQL. Components never call the API directly. Pricing is computed client-side from DTOs; nothing computed is stored.

API: `/api/shops`, `/api/shops/:shopId` (GET/PATCH/DELETE), `/api/shops/:shopId/products|import|export`, `/api/products/:productId` (PATCH/DELETE), `/api/products/:productId/skus` (POST), `/api/skus/:skuId` (PATCH/DELETE), `/api/backup` (GET export all / POST restore), `/api/presets`, `/api/health`. Responses are `{ success, data }` or `{ success: false, error, details? }`.

## Conventions

- Business logic only in `src/domain`, with tests written first. Rates are fractions (0.0378), never percents.
- SKU/product override fields are nullable: `null` = inherit from shop config (`returnRate`, `finalPrice`, `pricingStrategy`, `customMargin`, product `commissionRate`).
- Shop config is a JSON column validated by `shopConfigSchema`; if its shape changes, bump `SHOP_CONFIG_SCHEMA_VERSION` and migrate stored configs.
- Schema changes: edit `prisma/schema.prisma`, run `pnpm db:migrate --name <change>`, and hand-check the SQL for data migration needs.
- Import order: React → third-party → `@/domain` → `@/store` → `@/lib` → `@/components/ui` → `@/components`. Use `cn()` from `@/lib/utils`.
- React 19 lint rules forbid synchronous setState in effects: derive state during render or reset it in event handlers.
- UI copy is Simplified Chinese.
