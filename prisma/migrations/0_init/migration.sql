-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "global_configs" (
    "id" TEXT NOT NULL,
    "exchange_rate" DECIMAL(10,4) NOT NULL DEFAULT 0.58,
    "shipping_rate" DECIMAL(10,2) NOT NULL DEFAULT 35.0,
    "handling_fee" DECIMAL(10,2) NOT NULL DEFAULT 2.0,
    "min_handling_fee" DECIMAL(10,2) NOT NULL DEFAULT 5.0,
    "last_mile_fee" DECIMAL(10,2) NOT NULL DEFAULT 3.0,
    "commission_rate" DECIMAL(10,4) NOT NULL DEFAULT 0.0432,
    "transaction_fee" DECIMAL(10,4) NOT NULL DEFAULT 0.0378,
    "lvg_tax_rate" DECIMAL(10,4) NOT NULL DEFAULT 0.10,
    "marketing_rate" DECIMAL(10,4) NOT NULL DEFAULT 0.054,
    "sfp_fee" DECIMAL(10,4) NOT NULL DEFAULT 0.0,
    "affiliate_rate" DECIMAL(10,4) NOT NULL DEFAULT 0.15,
    "ads_rate" DECIMAL(10,4) NOT NULL DEFAULT 0.08,
    "return_rate" DECIMAL(10,4) NOT NULL DEFAULT 0.05,
    "return_loss_rate" DECIMAL(10,4) NOT NULL DEFAULT 0.50,
    "target_profit_rate" DECIMAL(10,4) NOT NULL DEFAULT 0.20,
    "pricing_strategy" VARCHAR(20) NOT NULL DEFAULT 'profit',
    "custom_multiplier" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT,

    CONSTRAINT "global_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL DEFAULT '',
    "url" TEXT,
    "description" TEXT,
    "image_url" TEXT,
    "is_expanded" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sku_variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sku_name" VARCHAR(255) NOT NULL DEFAULT '',
    "sku_code" VARCHAR(100),
    "tiktok_sku_id" VARCHAR(50),
    "image_url" TEXT,
    "current_price" DECIMAL(10,2),
    "inventory" INTEGER,
    "purchase_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "domestic_shipping" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "packaging_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "weight" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "return_rate" DECIMAL(10,4),
    "final_price" DECIMAL(10,2),
    "pricing_strategy" VARCHAR(20),
    "custom_multiplier" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sku_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "global_configs_user_id_key" ON "global_configs"("user_id");

-- CreateIndex
CREATE INDEX "products_user_id_idx" ON "products"("user_id");

-- CreateIndex
CREATE INDEX "products_display_order_idx" ON "products"("display_order");

-- CreateIndex
CREATE INDEX "sku_variants_product_id_idx" ON "sku_variants"("product_id");

-- AddForeignKey
ALTER TABLE "sku_variants" ADD CONSTRAINT "sku_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

