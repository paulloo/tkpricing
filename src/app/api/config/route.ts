// ============================================
// 全局配置 API 路由
// GET /api/config - 获取全局配置
// PUT /api/config - 更新全局配置
// POST /api/config - 重置为默认配置
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_CONFIG = {
  exchangeRate:    0.58,
  shippingRate:    35.0,
  handlingFee:     2.0,
  minHandlingFee:  5.0,
  lastMileFee:     3.0,
  commissionRate:  0.0432,
  transactionFee:  0.0378,
  lvgTaxRate:      0.10,
  marketingRate:   0.054,
  sfpFee:          0.0,
  affiliateRate:   0.15,
  adsRate:         0.08,
  returnRate:      0.05,
  returnLossRate:  0.50,
  targetProfitRate: 0.20,
  pricingStrategy: 'profit',
  customMultiplier: null as null,
};

export async function GET() {
  try {
    let config = await prisma.globalConfig.findFirst();
    if (!config) {
      config = await prisma.globalConfig.create({ data: DEFAULT_CONFIG });
    }
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('获取配置失败:', error);
    return NextResponse.json({ success: false, error: '获取配置失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const data = {
      ...(body.exchangeRate    !== undefined && { exchangeRate:    body.exchangeRate }),
      ...(body.shippingRate    !== undefined && { shippingRate:    body.shippingRate }),
      ...(body.handlingFee     !== undefined && { handlingFee:     body.handlingFee }),
      ...(body.minHandlingFee  !== undefined && { minHandlingFee:  body.minHandlingFee }),
      ...(body.lastMileFee     !== undefined && { lastMileFee:     body.lastMileFee }),
      ...(body.commissionRate  !== undefined && { commissionRate:  body.commissionRate }),
      ...(body.transactionFee  !== undefined && { transactionFee:  body.transactionFee }),
      ...(body.lvgTaxRate      !== undefined && { lvgTaxRate:      body.lvgTaxRate }),
      ...(body.marketingRate   !== undefined && { marketingRate:   body.marketingRate }),
      ...(body.sfpFee          !== undefined && { sfpFee:          body.sfpFee }),
      ...(body.affiliateRate   !== undefined && { affiliateRate:   body.affiliateRate }),
      ...(body.adsRate         !== undefined && { adsRate:         body.adsRate }),
      ...(body.returnRate      !== undefined && { returnRate:      body.returnRate }),
      ...(body.returnLossRate  !== undefined && { returnLossRate:  body.returnLossRate }),
      ...(body.targetProfitRate !== undefined && { targetProfitRate: body.targetProfitRate }),
      ...(body.pricingStrategy !== undefined && { pricingStrategy: body.pricingStrategy }),
      ...(body.customMultiplier !== undefined && { customMultiplier: body.customMultiplier }),
    };

    let config = await prisma.globalConfig.findFirst();
    if (config) {
      config = await prisma.globalConfig.update({ where: { id: config.id }, data });
    } else {
      config = await prisma.globalConfig.create({ data: { ...DEFAULT_CONFIG, ...data } });
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('更新配置失败:', error);
    return NextResponse.json({ success: false, error: '更新配置失败' }, { status: 500 });
  }
}

export async function POST() {
  try {
    let config = await prisma.globalConfig.findFirst();
    if (config) {
      config = await prisma.globalConfig.update({ where: { id: config.id }, data: DEFAULT_CONFIG });
    } else {
      config = await prisma.globalConfig.create({ data: DEFAULT_CONFIG });
    }
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('重置配置失败:', error);
    return NextResponse.json({ success: false, error: '重置配置失败' }, { status: 500 });
  }
}
