// 店铺：列表、当前店铺、配置草稿（编辑时实时预览，保存后才写库）

import type { StateCreator } from 'zustand';
import type { CreateShopInput, ShopDTO } from '@/domain/contracts';
import type { ShopConfig } from '@/domain/shop-config';
import { api, type RestoreResult } from '@/lib/api-client';
import { readPref, writePref } from '@/lib/local-pref';
import { notifyError } from '@/lib/notify';
import type { AppState } from './types';

const CURRENT_SHOP_KEY = 'tkpricing.currentShopId';

export interface ShopSlice {
  shops: ShopDTO[];
  currentShopId: string | null;
  draftConfig: ShopConfig | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  loadError: string | null;

  init: () => Promise<void>;
  selectShop: (id: string) => Promise<void>;
  createShop: (input: CreateShopInput) => Promise<ShopDTO | null>;
  renameShop: (id: string, name: string) => Promise<void>;
  deleteShop: (id: string) => Promise<void>;
  setDraftConfig: (config: ShopConfig) => void;
  discardDraft: () => void;
  saveDraft: () => Promise<boolean>;
  restoreBackup: (raw: unknown) => Promise<RestoreResult | null>;
}

const replaceShop = (shops: ShopDTO[], shop: ShopDTO) => shops.map((s) => (s.id === shop.id ? shop : s));

export const createShopSlice: StateCreator<AppState, [], [], ShopSlice> = (set, get) => ({
  shops: [],
  currentShopId: null,
  draftConfig: null,
  status: 'idle',
  loadError: null,

  init: async () => {
    set({ status: 'loading', loadError: null });
    try {
      const shops = await api.listShops();
      const remembered = readPref(CURRENT_SHOP_KEY);
      const current = shops.find((s) => s.id === remembered) ?? shops[0] ?? null;
      set({ shops, currentShopId: current?.id ?? null, status: 'ready' });
      if (current) await get().loadProducts(current.id);
    } catch (error) {
      set({ status: 'error', loadError: error instanceof Error ? error.message : '加载失败' });
    }
  },

  selectShop: async (id) => {
    if (id === get().currentShopId) return;
    writePref(CURRENT_SHOP_KEY, id);
    set({ currentShopId: id, draftConfig: null, products: [] });
    await get().loadProducts(id);
  },

  createShop: async (input) => {
    try {
      const shop = await api.createShop(input);
      set((s) => ({ shops: [...s.shops, shop] }));
      await get().selectShop(shop.id);
      return shop;
    } catch (error) {
      notifyError(error, '创建店铺失败');
      return null;
    }
  },

  renameShop: async (id, name) => {
    try {
      const shop = await api.updateShop(id, { name });
      set((s) => ({ shops: replaceShop(s.shops, shop) }));
    } catch (error) {
      notifyError(error, '重命名失败');
    }
  },

  deleteShop: async (id) => {
    try {
      await api.deleteShop(id);
      const shops = get().shops.filter((s) => s.id !== id);
      set({ shops });
      if (get().currentShopId === id) {
        writePref(CURRENT_SHOP_KEY, null);
        set({ currentShopId: null, products: [], draftConfig: null });
        if (shops[0]) await get().selectShop(shops[0].id);
      }
    } catch (error) {
      notifyError(error, '删除店铺失败');
    }
  },

  setDraftConfig: (config) => set({ draftConfig: config }),
  discardDraft: () => set({ draftConfig: null }),

  saveDraft: async () => {
    const { currentShopId, draftConfig } = get();
    if (!currentShopId || !draftConfig) return true;
    try {
      const shop = await api.updateShop(currentShopId, { config: draftConfig });
      // 保存期间又有新的修改则保留草稿
      set((s) => ({ shops: replaceShop(s.shops, shop), draftConfig: s.draftConfig === draftConfig ? null : s.draftConfig }));
      return true;
    } catch (error) {
      notifyError(error, '保存店铺设置失败');
      return false;
    }
  },

  restoreBackup: async (raw) => {
    try {
      const result = await api.restore(raw);
      const shops = await api.listShops();
      set({ shops });
      if (!get().currentShopId && shops[0]) await get().selectShop(shops[0].id);
      return result;
    } catch (error) {
      notifyError(error, '恢复备份失败');
      return null;
    }
  },
});
