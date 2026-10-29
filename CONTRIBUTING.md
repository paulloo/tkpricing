# 贡献指南

欢迎提交 Issue 和 PR，尤其是：

- 各站点 / 店铺类型的**费率预设**更新（见 [docs/fee-presets.md](docs/fee-presets.md)）；
- 定价模型的问题：请附上你的店铺设置、SKU 数据，以及你认为正确的结果和依据；
- 新的 ERP 导入格式。

## 开发环境

```bash
pnpm install
cp .env.example .env     # 配置 DATABASE_URL
pnpm db:deploy
pnpm dev
```

## 提交前

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

- 计算逻辑只写在 `src/domain/`，必须有单元测试，先写测试再实现；
- API 改动需要补充 `tests/api/` 的集成测试；
- 修改 `prisma/schema.prisma` 后用 `pnpm db:migrate --name <change>` 生成迁移，并考虑已有数据的迁移；
- 提交信息使用 Conventional Commits：`feat:` `fix:` `refactor:` `docs:` `test:` `chore:`。

## 行为准则

就事论事，友善交流。
