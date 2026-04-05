// ============================================
// SKU API 路由
// POST /api/skus - 为商品创建 SKU
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 创建 SKU
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productId,
      skuName,
      skuCode,
      purchaseCost,
      domesticShipping,
      packagingFee,
      weight,
      returnRate,
      pricingStrategy,
      customMultiplier,
    } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: '缺少商品ID' },
        { status: 400 }
      );
    }

    const sku = await prisma.sKU.create({
      data: {
        productId,
        skuName: skuName || '',
        skuCode,
        purchaseCost: purchaseCost || 0,
        domesticShipping: domesticShipping || 0,
        packagingFee: packagingFee || 0,
        weight: weight || 0,
        returnRate,
        pricingStrategy,
        customMultiplier,
      },
    });

    return NextResponse.json({ success: true, data: sku }, { status: 201 });
  } catch (error) {
    console.error('创建 SKU 失败:', error);
    return NextResponse.json(
      { success: false, error: '创建 SKU 失败' },
      { status: 500 }
    );
  }
}
