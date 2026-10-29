// 全局状态：店铺 + 当前店铺的商品。组件不直接调用 API，统一经由 store。

import { create } from 'zustand';
import type { ShopDTO } from '@/domain/contracts';
import type { ShopConfig } from '@/domain/shop-config';
import { createProductSlice } from './product-slice';
import { createShopSlice } from './shop-slice';
import type { AppState } from './types';

export const useStore = create<AppState>()((...args) => ({
  ...createShopSlice(...args),
  ...createProductSlice(...args),
}));

export function useCurrentShop(): ShopDTO | null {
  return useStore((s) => s.shops.find((shop) => shop.id === s.currentShopId) ?? null);
}

/** 计算用的生效配置：有未保存草稿时用草稿，便于实时预览 */
export function useEffectiveConfig(): ShopConfig | null {
  const shop = useCurrentShop();
  const draft = useStore((s) => s.draftConfig);
  return draft ?? shop?.config ?? null;
}
