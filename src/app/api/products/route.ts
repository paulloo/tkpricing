// ============================================
// 商品 API 路由
// GET /api/products - 获取所有商品及 SKU
// POST /api/products - 创建新商品
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取所有商品
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error('获取商品失败:', error);
    return NextResponse.json(
      { success: false, error: '获取商品失败' },
      { status: 500 }
    );
  }
}

// 创建新商品
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, description } = body;

    // 获取当前最大排序值
    const lastProduct = await prisma.product.findFirst({
      orderBy: { displayOrder: 'desc' },
    });
    const nextOrder = (lastProduct?.displayOrder ?? -1) + 1;

    const product = await prisma.product.create({
      data: {
        name: name || '',
        url,
        description,
        displayOrder: nextOrder,
        isExpanded: true,
      },
      include: {
        variants: true,
      },
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    console.error('创建商品失败:', error);
    return NextResponse.json(
      { success: false, error: '创建商品失败' },
      { status: 500 }
    );
  }
}
