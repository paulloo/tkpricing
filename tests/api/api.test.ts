// API 集成测试：直接调用路由处理函数，连接独立的测试库

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { ProductDTO, ShopDTO, SkuDTO } from '@/domain/contracts';
import { PRESETS } from '@/domain/presets';
import { testDatabaseUrl } from '../helpers/test-db';

const enabled = testDatabaseUrl() != null;

const json = (method: string, body?: unknown) =>
  new Request('http://test.local/api', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });

const ctx = <K extends string>(params: Record<K, string>) => ({ params: Promise.resolve(params) });

async function data<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!body.success) throw new Error(`${res.status} ${body.error}`);
  return body.data as T;
}

describe.skipIf(!enabled)('API', async () => {
  const { prisma } = await import('@/lib/prisma');
  const shops = await import('@/app/api/shops/route');
  const shop = await import('@/app/api/shops/[shopId]/route');
  const shopProducts = await import('@/app/api/shops/[shopId]/products/route');
  const shopImport = await import('@/app/api/shops/[shopId]/import/route');
  const shopExport = await import('@/app/api/shops/[shopId]/export/route');
  const backup = await import('@/app/api/backup/route');
  const product = await import('@/app/api/products/[productId]/route');
  const productSkus = await import('@/app/api/products/[productId]/skus/route');
  const sku = await import('@/app/api/skus/[skuId]/route');
  const health = await import('@/app/api/health/route');

  const createShop = async (name = '运动户外 MY'): Promise<ShopDTO> =>
    data<ShopDTO>(await shops.POST(json('POST', { name, site: 'MY' }), undefined));

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "sku_variants", "products", "shops" CASCADE');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('健康检查', async () => {
    const res = await health.GET(json('GET'), undefined);
    expect(res.status).toBe(200);
  });

  describe('店铺', () => {
    it('默认使用站点的第一个预设创建', async () => {
      const created = await createShop();
      expect(created.presetId).toBe(PRESETS[0].id);
      expect(created.config.currency.sale).toBe('MYR');

      const list = await data<ShopDTO[]>(await shops.GET(json('GET'), undefined));
      expect(list.map((s) => s.id)).toEqual([created.id]);
    });

    it('复制已有店铺的配置', async () => {
      const source = await createShop('旧店');
      const config = { ...source.config, currency: { ...source.config.currency, rate: 0.61 } };
      await shop.PATCH(json('PATCH', { config }), ctx({ shopId: source.id }));

      const res = await shops.POST(json('POST', { name: '新店', site: 'MY', copyFromShopId: source.id }), undefined);
      const copy = await data<ShopDTO>(res);
      expect(copy.config.currency.rate).toBe(0.61);
    });

    it('预设与站点不匹配时 400', async () => {
      const res = await shops.POST(json('POST', { name: 'x', site: 'TH', presetId: PRESETS[0].id }), undefined);
      expect(res.status).toBe(400);
    });

    it('无效配置被拒绝', async () => {
      const created = await createShop();
      const bad = { ...created.config, returns: { ...created.config.returns, rate: 5 } };
      const res = await shop.PATCH(json('PATCH', { config: bad }), ctx({ shopId: created.id }));
      expect(res.status).toBe(400);
    });

    it('不能跨站点复制设置', async () => {
      const my = await createShop('MY 店');
      const res = await shops.POST(json('POST', { name: 'TH 店', site: 'TH', copyFromShopId: my.id }), undefined);
      expect(res.status).toBe(400);
    });

    it('数据库中的配置损坏时回退到预设并标记，而不是整体报错', async () => {
      const created = await createShop();
      await prisma.$executeRawUnsafe(
        `UPDATE "shops" SET "config" = jsonb_set("config", '{returns,rate}', '5') WHERE "id" = $1`,
        created.id,
      );
      const res = await shops.GET(json('GET'), undefined);
      expect(res.status).toBe(200);
      const [shopDto] = await data<ShopDTO[]>(res);
      expect(shopDto.configIssue).toBe(true);
      expect(shopDto.config.returns.rate).toBeLessThanOrEqual(1);
    });

    it('不存在的店铺 404', async () => {
      const res = await shop.GET(json('GET'), ctx({ shopId: '00000000-0000-0000-0000-000000000000' }));
      expect(res.status).toBe(404);
    });

    it('删除店铺级联删除商品', async () => {
      const created = await createShop();
      await shopProducts.POST(json('POST', { name: '帐篷' }), ctx({ shopId: created.id }));
      await shop.DELETE(json('DELETE'), ctx({ shopId: created.id }));
      expect(await prisma.product.count()).toBe(0);
    });
  });

  describe('商品与 SKU', () => {
    it('新建商品默认带一个空 SKU，商品只属于自己的店铺', async () => {
      const a = await createShop('A');
      const b = await createShop('B');
      const created = await data<ProductDTO>(
        await shopProducts.POST(json('POST', { name: '帐篷', category: '露营' }), ctx({ shopId: a.id })),
      );
      expect(created.variants).toHaveLength(1);
      expect(created.category).toBe('露营');

      const inA = await data<ProductDTO[]>(await shopProducts.GET(json('GET'), ctx({ shopId: a.id })));
      const inB = await data<ProductDTO[]>(await shopProducts.GET(json('GET'), ctx({ shopId: b.id })));
      expect(inA).toHaveLength(1);
      expect(inB).toHaveLength(0);
    });

    it('SKU 字段读写（含尺寸和覆盖值）', async () => {
      const s = await createShop();
      const p = await data<ProductDTO>(await shopProducts.POST(json('POST', { name: '瑜伽垫' }), ctx({ shopId: s.id })));
      const skuId = p.variants[0].id;

      const updated = await data<SkuDTO>(
        await sku.PATCH(
          json('PATCH', { purchaseCost: 28.5, weightKg: 1.2, lengthCm: 61, widthCm: 12, heightCm: 12, pricingStrategy: 'custom', customMargin: 0.25 }),
          ctx({ skuId }),
        ),
      );
      expect(updated).toMatchObject({ purchaseCost: 28.5, weightKg: 1.2, lengthCm: 61, customMargin: 0.25, pricingStrategy: 'custom' });

      const cleared = await data<SkuDTO>(await sku.PATCH(json('PATCH', { customMargin: null, pricingStrategy: null }), ctx({ skuId })));
      expect(cleared.customMargin).toBeNull();
    });

    it('拒绝负数成本和越界退货率', async () => {
      const s = await createShop();
      const p = await data<ProductDTO>(await shopProducts.POST(json('POST', { name: 'x' }), ctx({ shopId: s.id })));
      const skuId = p.variants[0].id;
      expect((await sku.PATCH(json('PATCH', { purchaseCost: -1 }), ctx({ skuId }))).status).toBe(400);
      expect((await sku.PATCH(json('PATCH', { returnRate: 1.5 }), ctx({ skuId }))).status).toBe(400);
      expect((await sku.PATCH(json('PATCH', {}), ctx({ skuId }))).status).toBe(400);
      expect((await sku.PATCH(json('PATCH', 'not json{'), ctx({ skuId }))).status).toBe(400);
    });

    it('新增、删除 SKU 与商品', async () => {
      const s = await createShop();
      const p = await data<ProductDTO>(await shopProducts.POST(json('POST', { name: 'x' }), ctx({ shopId: s.id })));
      const added = await data<SkuDTO>(await productSkus.POST(json('POST', { skuName: 'L' }), ctx({ productId: p.id })));
      expect(added.skuName).toBe('L');

      await sku.DELETE(json('DELETE'), ctx({ skuId: added.id }));
      expect(await prisma.sKU.count()).toBe(1);

      const renamed = await data<ProductDTO>(await product.PATCH(json('PATCH', { name: '新名字', commissionRate: 0.1026 }), ctx({ productId: p.id })));
      expect(renamed.commissionRate).toBe(0.1026);

      await product.DELETE(json('DELETE'), ctx({ productId: p.id }));
      expect(await prisma.sKU.count()).toBe(0);
    });

    it('更新不存在的 SKU 返回 404', async () => {
      const res = await sku.PATCH(json('PATCH', { skuName: 'x' }), ctx({ skuId: 'missing' }));
      expect(res.status).toBe(404);
    });
  });

  describe('导入与备份', () => {
    it('批量导入商品', async () => {
      const s = await createShop();
      const res = await shopImport.POST(
        json('POST', {
          products: [
            { name: '登山杖', variants: [{ skuName: '黑', purchaseCost: 25, weightKg: 0.4 }, { skuName: '蓝', purchaseCost: 26 }] },
            { name: '头灯' },
          ],
        }),
        ctx({ shopId: s.id }),
      );
      expect(await data(res)).toEqual({ products: 2, skus: 3 });
      const list = await data<ProductDTO[]>(await shopProducts.GET(json('GET'), ctx({ shopId: s.id })));
      expect(list.map((p) => p.name)).toEqual(['登山杖', '头灯']);
    });

    it('导出后再恢复，得到一份完整的新店铺', async () => {
      const s = await createShop('原店');
      await shopImport.POST(
        json('POST', { products: [{ name: '登山杖', variants: [{ skuName: '黑', purchaseCost: 25, finalPrice: 59.9 }] }] }),
        ctx({ shopId: s.id }),
      );

      const exported = await data<unknown>(await shopExport.GET(json('GET'), ctx({ shopId: s.id })));
      const restored = await data(await backup.POST(json('POST', exported), undefined));
      expect(restored).toEqual({ shops: 1, products: 1, skus: 1 });

      const all = await data<ShopDTO[]>(await shops.GET(json('GET'), undefined));
      expect(all).toHaveLength(2);
      const copy = all.find((x) => x.id !== s.id)!;
      const products = await data<ProductDTO[]>(await shopProducts.GET(json('GET'), ctx({ shopId: copy.id })));
      expect(products[0].variants[0]).toMatchObject({ skuName: '黑', purchaseCost: 25, finalPrice: 59.9 });
    });

    it('恢复旧版 v1 备份', async () => {
      const legacy = {
        globalParams: { exchangeRate: 0.6, commissionRate: 0.05 },
        products: [{ name: '旧商品', variants: [{ name: 'A', purchaseCost: 10, weight: 0.2 }] }],
      };
      const restored = await data(await backup.POST(json('POST', legacy), undefined));
      expect(restored).toEqual({ shops: 1, products: 1, skus: 1 });
    });

    it('无法识别的备份 400', async () => {
      expect((await backup.POST(json('POST', { hello: 'world' }), undefined)).status).toBe(400);
    });
  });
});
