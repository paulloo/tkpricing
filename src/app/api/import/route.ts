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
              isExpanded: p.isExpanded ?? true,
              displayOrder: i,
              variants: {
                create: p.variants?.map((v: unknown) => ({
                  skuName: (v as { skuName?: string }).skuName || '',
                  skuCode: (v as { skuCode?: string }).skuCode,
                  purchaseCost: (v as { purchaseCost?: number }).purchaseCost || 0,
                  domesticShipping: (v as { domesticShipping?: number }).domesticShipping || 0,
                  packagingFee: (v as { packagingFee?: number }).packagingFee || 0,
                  weight: (v as { weight?: number }).weight || 0,
                  returnRate: (v as { returnRate?: number }).returnRate,
                  pricingStrategy: (v as { pricingStrategy?: string }).pricingStrategy,
                  customMultiplier: (v as { customMultiplier?: number }).customMultiplier,
                })) || [],
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
