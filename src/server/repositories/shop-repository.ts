// 店铺数据访问

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { CreateShopInput, ShopDTO, UpdateShopInput } from '@/domain/contracts';
import { PRESETS, findPreset } from '@/domain/presets';
import type { ShopConfig } from '@/domain/shop-config';
import { HttpError, notFound } from '../http';
import { toShopDTO } from '../mappers';

const withCount = { _count: { select: { products: true } } } as const;

const asJson = (config: ShopConfig): Prisma.InputJsonValue => config as unknown as Prisma.InputJsonValue;

async function resolveInitialConfig(input: CreateShopInput): Promise<{ config: ShopConfig; presetId: string | null }> {
  if (input.copyFromShopId) {
    const source = await findShop(input.copyFromShopId);
    // 不同站点的币种和费用结构不同，不能直接复制
    if (source.site !== input.site) throw new HttpError(400, '只能复制同一站点店铺的设置');
    return { config: source.config, presetId: source.presetId };
  }
  const preset = input.presetId ? findPreset(input.presetId) : PRESETS.find((p) => p.site === input.site);
  if (!preset) throw new HttpError(400, '预设不存在');
  if (preset.site !== input.site) throw new HttpError(400, '预设与站点不匹配');
  return { config: preset.config, presetId: preset.id };
}

export async function listShops(): Promise<ShopDTO[]> {
  const shops = await prisma.shop.findMany({
    include: withCount,
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return shops.map(toShopDTO);
}

export async function findShop(id: string): Promise<ShopDTO> {
  const shop = await prisma.shop.findUnique({ where: { id }, include: withCount });
  if (!shop) throw notFound('店铺');
  return toShopDTO(shop);
}

export async function createShop(input: CreateShopInput): Promise<ShopDTO> {
  const { config, presetId } = await resolveInitialConfig(input);
  const last = await prisma.shop.findFirst({ orderBy: { displayOrder: 'desc' }, select: { displayOrder: true } });
  const shop = await prisma.shop.create({
    data: {
      name: input.name,
      site: input.site,
      presetId,
      config: asJson(config),
      displayOrder: (last?.displayOrder ?? -1) + 1,
    },
    include: withCount,
  });
  return toShopDTO(shop);
}

export async function updateShop(id: string, input: UpdateShopInput): Promise<ShopDTO> {
  const { config, ...rest } = input;
  const shop = await prisma.shop.update({
    where: { id },
    data: { ...rest, ...(config ? { config: asJson(config) } : {}) },
    include: withCount,
  });
  return toShopDTO(shop);
}

export async function deleteShop(id: string): Promise<void> {
  await prisma.shop.delete({ where: { id } });
}
