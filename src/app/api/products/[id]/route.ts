// ============================================
// 单个商品 API 路由
// GET /api/products/[id] - 获取单个商品
// PUT /api/products/[id] - 更新商品
// DELETE /api/products/[id] - 删除商品
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  params: Promise<{ id: string }>;
}

// 获取单个商品
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: '商品不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('获取商品失败:', error);
    return NextResponse.json(
      { success: false, error: '获取商品失败' },
      { status: 500 }
    );
  }
}

// 更新商品
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, url, description, isExpanded, displayOrder } = body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(url !== undefined && { url }),
        ...(description !== undefined && { description }),
        ...(isExpanded !== undefined && { isExpanded }),
        ...(displayOrder !== undefined && { displayOrder }),
      },
      include: {
        variants: true,
      },
    });

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('更新商品失败:', error);
    return NextResponse.json(
      { success: false, error: '更新商品失败' },
      { status: 500 }
    );
  }
}

// 删除商品
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除商品失败:', error);
    return NextResponse.json(
      { success: false, error: '删除商品失败' },
      { status: 500 }
    );
  }
}
