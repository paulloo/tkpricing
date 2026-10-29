-- 多店铺：global_configs（单例）→ shops；products 归属到店铺
-- 每条旧的全局配置转成一个店铺（旧版按 user_id 唯一），商品按 user_id 归属；旧数据不会丢失。

-- 1. 店铺表
CREATE TABLE "shops" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "site" VARCHAR(8) NOT NULL,
    "config" JSONB NOT NULL,
    "preset_id" VARCHAR(60),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- 2. 旧全局参数 → 店铺配置
--    每条 global_configs（旧版按 user_id 唯一）各生成一个店铺，商品按 user_id 归属。
--    旧版接口不校验输入，这里把数值钳制到新配置的合法范围，避免迁移后配置无法读取。
--    口径与 src/domain/backup.ts 的 legacyParamsToConfig 一致：LVG 不设阈值、尾程固定、按整数取整。
ALTER TABLE "shops" ADD COLUMN "_legacy_user_id" TEXT;

INSERT INTO "shops" ("id", "name", "site", "config", "preset_id", "display_order", "created_at", "updated_at", "_legacy_user_id")
SELECT
  gen_random_uuid()::text,
  CASE WHEN g.user_id IS NULL THEN '默认店铺（迁移）' ELSE '迁移店铺 · ' || LEFT(g.user_id, 40) END,
  'MY',
  jsonb_build_object(
    'schemaVersion', 1,
    'currency', jsonb_build_object('sale', 'MYR', 'cost', 'CNY', 'rate', GREATEST(g.exchange_rate, 0.0001), 'buffer', 0),
    'fees', jsonb_build_array(
      jsonb_build_object('id', 'commission', 'label', '平台佣金', 'kind', 'percent', 'value', LEAST(GREATEST(g.commission_rate, 0), 1),
        'cap', null, 'maxPrice', null, 'refundOnReturn', true, 'enabled', true, 'note', ''),
      jsonb_build_object('id', 'transaction', 'label', '交易手续费', 'kind', 'percent', 'value', LEAST(GREATEST(g.transaction_fee, 0), 1),
        'cap', null, 'maxPrice', null, 'refundOnReturn', true, 'enabled', g.transaction_fee > 0, 'note', ''),
      jsonb_build_object('id', 'lvg', 'label', 'LVG 低值商品税', 'kind', 'percent', 'value', LEAST(GREATEST(g.lvg_tax_rate, 0), 1),
        'cap', null, 'maxPrice', null, 'refundOnReturn', true, 'enabled', g.lvg_tax_rate > 0, 'note', ''),
      jsonb_build_object('id', 'marketing', 'label', '营销活动费', 'kind', 'percent', 'value', LEAST(GREATEST(g.marketing_rate, 0), 1),
        'cap', null, 'maxPrice', null, 'refundOnReturn', true, 'enabled', g.marketing_rate > 0, 'note', ''),
      jsonb_build_object('id', 'sfp', 'label', 'SFP 服务费', 'kind', 'percent', 'value', LEAST(GREATEST(g.sfp_fee, 0), 1),
        'cap', null, 'maxPrice', null, 'refundOnReturn', true, 'enabled', g.sfp_fee > 0, 'note', '')
    ),
    'marketing', jsonb_build_object(
      'affiliateRate', LEAST(GREATEST(g.affiliate_rate, 0), 1),
      'adsRate', LEAST(GREATEST(g.ads_rate, 0), 1)),
    'firstLeg', jsonb_build_object(
      'ratePerKg', GREATEST(g.shipping_rate, 0),
      'minCharge', GREATEST(g.min_handling_fee, 0),
      'handlingFee', GREATEST(g.handling_fee, 0),
      'volumetricDivisor', 6000),
    'lastMile', jsonb_build_object('firstWeightKg', 0, 'firstWeightFee', GREATEST(g.last_mile_fee, 0),
      'stepKg', 0, 'stepFee', 0, 'taxRate', 0),
    'returns', jsonb_build_object(
      'rate', LEAST(GREATEST(g.return_rate, 0), 1),
      'resaleRate', 1 - LEAST(GREATEST(g.return_loss_rate, 0), 1),
      'returnShippingFee', 0),
    'pricing', jsonb_build_object(
      'targetMargins', jsonb_build_object('drainage', 0.03, 'profit', LEAST(GREATEST(g.target_profit_rate, -1), 0.95), 'anchor', 0.3),
      'defaultStrategy', CASE WHEN g.pricing_strategy IN ('drainage', 'profit', 'anchor') THEN g.pricing_strategy ELSE 'profit' END,
      'rounding', jsonb_build_object('step', 1, 'ending', 0)
    )
  ),
  NULL,
  (ROW_NUMBER() OVER (ORDER BY g.created_at)) - 1,
  g.created_at,
  CURRENT_TIMESTAMP,
  g.user_id
FROM "global_configs" g;

-- 没有全局配置但已有商品时，用旧版默认参数建一个店铺（与旧版 createDefaultGlobalParams 一致）
INSERT INTO "shops" ("id", "name", "site", "config", "display_order", "updated_at")
SELECT
  gen_random_uuid()::text,
  '默认店铺（迁移）',
  'MY',
  '{"schemaVersion":1,"currency":{"sale":"MYR","cost":"CNY","rate":0.58,"buffer":0},"fees":[{"id":"commission","label":"平台佣金","kind":"percent","value":0.0432,"cap":null,"maxPrice":null,"refundOnReturn":true,"enabled":true,"note":""},{"id":"transaction","label":"交易手续费","kind":"percent","value":0.0378,"cap":null,"maxPrice":null,"refundOnReturn":true,"enabled":true,"note":""},{"id":"lvg","label":"LVG 低值商品税","kind":"percent","value":0.1,"cap":null,"maxPrice":null,"refundOnReturn":true,"enabled":true,"note":""},{"id":"marketing","label":"营销活动费","kind":"percent","value":0.054,"cap":null,"maxPrice":null,"refundOnReturn":true,"enabled":true,"note":""},{"id":"sfp","label":"SFP 服务费","kind":"percent","value":0,"cap":null,"maxPrice":null,"refundOnReturn":true,"enabled":false,"note":""}],"marketing":{"affiliateRate":0.15,"adsRate":0.08},"firstLeg":{"ratePerKg":35,"minCharge":5,"handlingFee":2,"volumetricDivisor":6000},"lastMile":{"firstWeightKg":0,"firstWeightFee":3,"stepKg":0,"stepFee":0,"taxRate":0},"returns":{"rate":0.05,"resaleRate":0.5,"returnShippingFee":0},"pricing":{"targetMargins":{"drainage":0.03,"profit":0.2,"anchor":0.3},"defaultStrategy":"profit","rounding":{"step":1,"ending":0}}}'::jsonb,
  0,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "shops") AND EXISTS (SELECT 1 FROM "products");

-- 3. 商品归属店铺：按 user_id 匹配；匹配不到的归入最早的店铺
DROP INDEX IF EXISTS "products_display_order_idx";
DROP INDEX IF EXISTS "products_user_id_idx";

ALTER TABLE "products"
  ADD COLUMN "category" VARCHAR(100),
  ADD COLUMN "commission_rate" DECIMAL(10,4),
  ADD COLUMN "shop_id" TEXT;

UPDATE "products" p SET "shop_id" = (
  SELECT s."id" FROM "shops" s
  WHERE s."_legacy_user_id" IS NOT DISTINCT FROM p."user_id"
  ORDER BY s."created_at"
  LIMIT 1
);

UPDATE "products" SET "shop_id" = (SELECT "id" FROM "shops" ORDER BY "created_at" LIMIT 1)
WHERE "shop_id" IS NULL;

ALTER TABLE "products" ALTER COLUMN "shop_id" SET NOT NULL;
ALTER TABLE "products" DROP COLUMN "user_id";
ALTER TABLE "shops" DROP COLUMN "_legacy_user_id";

CREATE INDEX "products_shop_id_display_order_idx" ON "products"("shop_id", "display_order");

ALTER TABLE "products" ADD CONSTRAINT "products_shop_id_fkey"
  FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. SKU：尺寸、自定义目标净利率（替代旧的成本倍数，旧值无法等价换算，直接移除）
ALTER TABLE "sku_variants"
  DROP COLUMN "custom_multiplier",
  ADD COLUMN "custom_margin" DECIMAL(10,4),
  ADD COLUMN "length_cm" DECIMAL(8,1),
  ADD COLUMN "width_cm" DECIMAL(8,1),
  ADD COLUMN "height_cm" DECIMAL(8,1),
  ALTER COLUMN "current_price" SET DATA TYPE DECIMAL(12,2),
  ALTER COLUMN "final_price" SET DATA TYPE DECIMAL(12,2);

-- custom 策略原本依赖倍数，迁移后回退为继承店铺默认策略
UPDATE "sku_variants" SET "pricing_strategy" = NULL WHERE "pricing_strategy" = 'custom';

-- 5. 移除旧单例配置表
DROP TABLE "global_configs";
