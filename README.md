# TK Shop 定价计算器

面向 **TikTok Shop 东南亚跨境卖家** 的开源定价工具：输入采购成本、重量和包裹尺寸，按你设定的**目标净利率**反推售价。平台费、达人佣金、广告、头程/尾程物流（含体积重）、退货损失和汇率波动都会计入。

> 适合：同时运营多个店铺/站点、经常要报活动、想知道"这个价到底赚不赚钱"的卖家。

## 解决什么问题

| 痛点 | 本工具的做法 |
|------|-------------|
| 平台费率频繁调整（2026 年 2 月新增 RM0.54 平台支持费、9 月起运费收 6% SST、10 月佣金调整……） | 费用是**可增删的费用行**，支持按比例/每单固定、单笔封顶、"售价 ≤ X 才收"（如 LVG ≤ RM500），改设置即可，不用改代码 |
| "成本 × 倍数"定价看不出是否亏钱 | 按**期望净利率**反推售价：扣除所有费用和退货损失后，每单真正落袋的利润占售价的比例 |
| 抛货（帐篷、瑜伽垫、球拍）按体积重计费，按实重算运费会严重低估 | 填长宽高自动算体积重，取大计费，并标记"抛货" |
| 退货损失算不清：来回运费、不能二次销售的货、广告已花出去 | 退货模型区分：尾程与退货运费、可二次销售比例、退货时平台是否退还该费用、达人佣金不结算、广告不返还 |
| 报活动不知道最多能打几折 | 每个 SKU 给出保本价、**最多可让利比例**、引流/利润/锚定三档价格 |
| 汇率波动吃掉利润 | 汇率缓冲 + "成本币种升值 5% 时的净利率"压力测试 |
| 多店铺、多站点参数混在一起 | **多店铺**，每店独立的币种、费率、物流、退货和定价目标；可从预设或已有店铺复制 |
| 平台在售价是不是已经在亏 | 导入妙手 CSV 带入现价，自动标记"现价亏损" |

## 快速开始

需要 Node.js 20+、pnpm 和 PostgreSQL 15+。

```bash
git clone https://github.com/paulloo/tkpricing.git
cd tkpricing
pnpm install
cp .env.example .env          # 填写 DATABASE_URL
pnpm db:deploy                # 执行数据库迁移
pnpm dev                      # http://localhost:3000
```

或者用 Docker 一键启动（包含 PostgreSQL）：

```bash
docker compose up -d          # http://localhost:3000
```

### 第一次使用

1. **建店铺**：选择站点和费率预设（如"马来西亚 · 跨境店"）。没有核对过的站点会提供空白模板。
2. **核对店铺设置**：对照卖家中心费率表修改佣金（运动户外各子类目可能不同，可在商品上单独覆盖）、填入货代的头程报价和尾程首重/续重，设定退货率和目标净利率。修改会实时预览，点"保存"后生效。
3. **录入商品**：手动添加，或从妙手 ERP 导出 CSV 导入。补上包裹尺寸，抛货才能算准。
4. **看预警**：顶部汇总条和"需处理"筛选会列出亏损、现价亏损、低于目标、抛货的 SKU。点任一 SKU 的期望净利可查看完整的利润拆解。

## 定价模型

详见 [docs/pricing-model.md](docs/pricing-model.md)。简述：

```
期望利润 = (1 − 退货率) × 送达订单利润 − 退货率 × 退货订单损失

送达订单利润 = 售价 − 到岸成本 − 尾程 − 平台费 − 达人佣金 − 广告费
退货订单损失 = 尾程 + 退货运费 + 不可再售货值 + 不退还的平台费 + 广告费

建议价 = 满足 期望利润 ≥ 目标净利率 × 售价 的最低价格（再按尾数规则取整）
```

平台费含封顶和价格阈值时利润是分段线性的，引擎逐段精确求解，不做数值近似。

## 费率预设

预设位于 [src/domain/presets.ts](src/domain/presets.ts)，每个预设注明核对日期和来源链接。费率变化很快，**预设仅作起点，请以卖家中心为准**。欢迎提交 PR 补充或更新站点预设，见 [docs/fee-presets.md](docs/fee-presets.md)。

## 部署注意

本应用**没有用户系统**，适合个人或团队内网使用。部署到公网时请设置 `BASIC_AUTH_USER` 和 `BASIC_AUTH_PASSWORD` 开启 HTTP Basic 认证，或放在 VPN / 反向代理认证之后。

```bash
pnpm build
pnpm db:deploy
pnpm start
```

健康检查：`GET /api/health`。

## 开发

```bash
pnpm dev            # 开发服务器
pnpm test           # 单元 + API 集成测试（集成测试使用 <数据库名>_test 库，自动创建）
pnpm lint
pnpm typecheck
pnpm db:migrate --name <change>   # 修改 schema 后创建迁移
```

架构说明见 [CLAUDE.md](CLAUDE.md)，贡献流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 从 v2.x 升级

执行 `pnpm db:deploy` 即可。迁移会把原来的全局参数转换成一个"默认店铺（迁移）"，所有商品归入该店铺，旧数据不会丢失。注意：

- 旧版"成本 × 倍数"策略改为"目标净利率"，未手动定价的 SKU 建议价会变化（旧算法在默认参数下建议价其实是亏钱的）。
- 旧版 `custom` 策略的倍数无法等价换算，迁移后回退为继承店铺默认策略。
- 旧版导出的 JSON 备份仍可通过"恢复备份"导入。

如果数据库是用 v2.x 的 `db push` 创建的（没有 `_prisma_migrations` 表），先执行一次 `npx prisma migrate resolve --applied 0_init` 标记基线，再执行 `pnpm db:deploy`。

## License

[MIT](./LICENSE)

---

**English summary**: An open-source, multi-shop pricing calculator for TikTok Shop Southeast Asia cross-border sellers. It solves for the lowest price that hits a target *expected net margin* after platform fees (with caps and price thresholds), affiliate commission, ads, first/last-mile shipping with volumetric weight, return losses, and an FX buffer. Next.js + PostgreSQL, MIT licensed.
