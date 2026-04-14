// ============================================
// 单个 SKU API 路由
// PUT /api/skus/[id] - 更新 SKU
// DELETE /api/skus/[id] - 删除 SKU
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  params: Promise<{ id: string }>;
}

// 更新 SKU
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      skuName,
      skuCode,
      purchaseCost,
      domesticShipping,
      packagingFee,
      weight,
      returnRate,
      finalPrice,
      pricingStrategy,
      customMultiplier,
    } = body;

    const sku = await prisma.sKU.update({
      where: { id },
      data: {
        ...(skuName !== undefined && { skuName }),
        ...(skuCode !== undefined && { skuCode }),
        ...(purchaseCost !== undefined && { purchaseCost }),
        ...(domesticShipping !== undefined && { domesticShipping }),
        ...(packagingFee !== undefined && { packagingFee }),
        ...(weight !== undefined && { weight }),
        ...(returnRate !== undefined && { returnRate }),
        ...(finalPrice !== undefined && { finalPrice }),
        ...(pricingStrategy !== undefined && { pricingStrategy }),
        ...(customMultiplier !== undefined && { customMultiplier }),
      },
    });

    return NextResponse.json({ success: true, data: sku });
  } catch (error) {
    console.error('更新 SKU 失败:', error);
    return NextResponse.json(
      { success: false, error: '更新 SKU 失败' },
      { status: 500 }
    );
  }
}

// 删除 SKU
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.sKU.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除 SKU 失败:', error);
    return NextResponse.json(
      { success: false, error: '删除 SKU 失败' },
      { status: 500 }
    );
  }
}
