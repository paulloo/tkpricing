// ============================================
// 批量导入 API 路由
// POST /api/import - 批量导入商品和配置
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { globalParams, products } = body;

    // 使用事务批量导入
    const result = await prisma.$transaction(async (tx) => {
      // 1. 导入全局配置
      if (globalParams) {
        const existingConfig = await tx.globalConfig.findFirst();
        const configData = {
          exchangeRate: globalParams.exchangeRate ?? 1.52,
          shippingRate: globalParams.shippingRate ?? 5.3,
          minOperationFee: globalParams.minOperationFee ?? 0.8,
          labelFee: globalParams.labelFee ?? 0.3,
          lastMileFee: globalParams.lastMileFee ?? 2.5,
          platformFeeRate: globalParams.platformFeeRate ?? 0.1212,
          returnRate: globalParams.returnRate ?? 0.15,
          targetProfitMargin: globalParams.targetProfitMargin ?? 0.25,
          pricingStrategy: globalParams.pricingStrategy ?? 'profit',
          customMultiplier: globalParams.customMultiplier,
        };

        if (existingConfig) {
          await tx.globalConfig.update({
            where: { id: existingConfig.id },
            data: configData,
          });
        } else {
          await tx.globalConfig.create({ data: configData });
        }
      }

      // 2. 导入商品和 SKU
      const importedProducts = [];
      if (products && Array.isArray(products)) {
        for (let i = 0; i < products.length; i++) {
          const p = products[i];
          const product = await tx.product.create({
            data: {
              name: p.name || '',
              url: p.url,
              description: p.description,
              imageUrl: p.imageUrl,
              isExpanded: p.isExpanded ?? true,
              displayOrder: i,
              variants: {
                create: p.variants?.map((v: unknown) => {
                  const sku = v as {
                    skuName?: string;
                    skuCode?: string;
                    tiktokSkuId?: string;
                    imageUrl?: string;
                    purchaseCost?: number;
                    domesticShipping?: number;
                    packagingFee?: number;
                    weight?: number;
                    currentPrice?: number;
                    inventory?: number;
                    returnRate?: number;
                    pricingStrategy?: string;
                    customMultiplier?: number;
                  };
                  return {
                    skuName: sku.skuName || '',
                    skuCode: sku.skuCode,
                    tiktokSkuId: sku.tiktokSkuId,
                    imageUrl: sku.imageUrl,
                    purchaseCost: sku.purchaseCost || 0,
                    domesticShipping: sku.domesticShipping || 0,
                    packagingFee: sku.packagingFee || 0,
                    weight: sku.weight || 0,
                    currentPrice: sku.currentPrice,
                    inventory: sku.inventory,
                    returnRate: sku.returnRate,
                    pricingStrategy: sku.pricingStrategy,
                    customMultiplier: sku.customMultiplier,
                  };
                }) || [],
              },
            },
            include: {
              variants: true,
            },
          });
          importedProducts.push(product);
        }
      }

      return { products: importedProducts };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('导入数据失败:', error);
    return NextResponse.json(
      { success: false, error: '导入数据失败' },
      { status: 500 }
    );
  }
}
