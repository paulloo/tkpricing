// ============================================
// 全局配置 API 路由
// GET /api/config - 获取全局配置
// PUT /api/config - 更新全局配置
// POST /api/config - 创建全局配置（如不存在）
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取全局配置
export async function GET() {
  try {
    let config = await prisma.globalConfig.findFirst();

    // 如果不存在，创建默认配置
    if (!config) {
      config = await prisma.globalConfig.create({
        data: {
          exchangeRate: 1.52,
          shippingRate: 5.3,
          minOperationFee: 0.8,
          labelFee: 0.3,
          lastMileFee: 2.5,
          platformFeeRate: 0.1212,
          returnRate: 0.15,
          targetProfitMargin: 0.25,
          pricingStrategy: 'profit',
        },
      });
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('获取配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    );
  }
}

// 更新全局配置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 获取或创建配置
    let config = await prisma.globalConfig.findFirst();
    
    const data = {
      ...(body.exchangeRate !== undefined && { exchangeRate: body.exchangeRate }),
      ...(body.shippingRate !== undefined && { shippingRate: body.shippingRate }),
      ...(body.minOperationFee !== undefined && { minOperationFee: body.minOperationFee }),
      ...(body.labelFee !== undefined && { labelFee: body.labelFee }),
      ...(body.lastMileFee !== undefined && { lastMileFee: body.lastMileFee }),
      ...(body.platformFeeRate !== undefined && { platformFeeRate: body.platformFeeRate }),
      ...(body.returnRate !== undefined && { returnRate: body.returnRate }),
      ...(body.targetProfitMargin !== undefined && { targetProfitMargin: body.targetProfitMargin }),
      ...(body.pricingStrategy !== undefined && { pricingStrategy: body.pricingStrategy }),
      ...(body.customMultiplier !== undefined && { customMultiplier: body.customMultiplier }),
    };

    if (config) {
      config = await prisma.globalConfig.update({
        where: { id: config.id },
        data,
      });
    } else {
      config = await prisma.globalConfig.create({
        data: {
          exchangeRate: 1.52,
          shippingRate: 5.3,
          minOperationFee: 0.8,
          labelFee: 0.3,
          lastMileFee: 2.5,
          platformFeeRate: 0.1212,
          returnRate: 0.15,
          targetProfitMargin: 0.25,
          pricingStrategy: 'profit',
          ...data,
        },
      });
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('更新配置失败:', error);
    return NextResponse.json(
      { success: false, error: '更新配置失败' },
      { status: 500 }
    );
  }
}

// 重置为默认配置
export async function POST() {
  try {
    const defaultConfig = {
      exchangeRate: 1.52,
      shippingRate: 5.3,
      minOperationFee: 0.8,
      labelFee: 0.3,
      lastMileFee: 2.5,
      platformFeeRate: 0.1212,
      returnRate: 0.15,
      targetProfitMargin: 0.25,
      pricingStrategy: 'profit',
      customMultiplier: null,
    };

    let config = await prisma.globalConfig.findFirst();

    if (config) {
      config = await prisma.globalConfig.update({
        where: { id: config.id },
        data: defaultConfig,
      });
    } else {
      config = await prisma.globalConfig.create({
        data: defaultConfig,
      });
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('重置配置失败:', error);
    return NextResponse.json(
      { success: false, error: '重置配置失败' },
      { status: 500 }
    );
  }
}
