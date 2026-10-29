// 当前店铺的商品与 SKU。编辑采用乐观更新：先改界面，失败时回滚并提示。

import type { StateCreator } from 'zustand';
import type { CreateProductInput, ProductDTO, SkuDTO, UpdateProductInput, UpdateSkuInput } from '@/domain/contracts';
import { api } from '@/lib/api-client';
import { notifyError } from '@/lib/notify';
import { pick, reinsert, rollback } from './optimistic';
import type { AppState } from './types';

export interface ProductSlice {
  products: ProductDTO[];
  productsLoading: boolean;

  loadProducts: (shopId: string) => Promise<void>;
  addProduct: (input: CreateProductInput) => Promise<ProductDTO | null>;
  updateProduct: (id: string, patch: UpdateProductInput) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  setExpanded: (id: string, expanded: boolean) => void;
  setAllExpanded: (expanded: boolean) => void;
  importProducts: (products: CreateProductInput[]) => Promise<boolean>;

  addSku: (productId: string, copyFromLast?: boolean) => Promise<void>;
  updateSku: (productId: string, skuId: string, patch: UpdateSkuInput) => Promise<void>;
  deleteSku: (productId: string, skuId: string) => Promise<void>;
}

type ProductMapper = (p: ProductDTO) => ProductDTO;

const mapProduct = (products: ProductDTO[], id: string, fn: ProductMapper) =>
  products.map((p) => (p.id === id ? fn(p) : p));

const mapSku = (products: ProductDTO[], productId: string, skuId: string, fn: (s: SkuDTO) => SkuDTO) =>
  mapProduct(products, productId, (p) => ({
    ...p,
    variants: p.variants.map((s) => (s.id === skuId ? fn(s) : s)),
  }));

/** 复制一个 SKU 的成本与包裹信息作为新 SKU 的起点 */
function cloneSkuInput(sku: SkuDTO) {
  const { id: _id, productId: _productId, skuName: _name, tiktokSkuId: _tk, skuCode: _code, ...rest } = sku;
  return { ...rest, skuName: '', currentPrice: null, inventory: null, finalPrice: null };
}

export const createProductSlice: StateCreator<AppState, [], [], ProductSlice> = (set, get) => ({
  products: [],
  productsLoading: false,

  loadProducts: async (shopId) => {
    set({ productsLoading: true });
    try {
      const products = await api.listProducts(shopId);
      // 加载期间切换了店铺则丢弃结果
      if (get().currentShopId === shopId) {
        set((s) => ({
          products,
          shops: s.shops.map((shop) => (shop.id === shopId ? { ...shop, productCount: products.length } : shop)),
        }));
      }
    } catch (error) {
      notifyError(error, '加载商品失败');
    } finally {
      if (get().currentShopId === shopId) set({ productsLoading: false });
    }
  },

  addProduct: async (input) => {
    const shopId = get().currentShopId;
    if (!shopId) return null;
    try {
      const product = await api.createProduct(shopId, input);
      // 请求期间切换了店铺：商品已建在原店铺，不加入当前列表
      if (get().currentShopId === shopId) set((s) => ({ products: [...s.products, product] }));
      return product;
    } catch (error) {
      notifyError(error, '添加商品失败');
      return null;
    }
  },

  updateProduct: async (id, patch) => {
    const before = get().products.find((p) => p.id === id);
    if (!before) return;
    const previous = pick(before, Object.keys(patch) as (keyof ProductDTO)[]);
    set((s) => ({ products: mapProduct(s.products, id, (p) => ({ ...p, ...patch })) }));
    try {
      await api.updateProduct(id, patch);
    } catch (error) {
      set((s) => ({ products: mapProduct(s.products, id, (p) => rollback(p, patch as Partial<ProductDTO>, previous)) }));
      notifyError(error, '保存商品失败');
    }
  },

  deleteProduct: async (id) => {
    const { products, currentShopId } = get();
    const index = products.findIndex((p) => p.id === id);
    if (index < 0) return;
    const removed = products[index];
    set({ products: products.filter((p) => p.id !== id) });
    try {
      await api.deleteProduct(id);
    } catch (error) {
      if (get().currentShopId === currentShopId) set((s) => ({ products: reinsert(s.products, removed, index) }));
      notifyError(error, '删除商品失败');
    }
  },

  // 展开状态只影响本机界面，不写库
  setExpanded: (id, expanded) =>
    set((s) => ({ products: mapProduct(s.products, id, (p) => ({ ...p, isExpanded: expanded })) })),
  setAllExpanded: (expanded) =>
    set((s) => ({ products: s.products.map((p) => ({ ...p, isExpanded: expanded })) })),

  importProducts: async (products) => {
    const shopId = get().currentShopId;
    if (!shopId) return false;
    try {
      await api.importProducts(shopId, products);
      await get().loadProducts(shopId);
      return true;
    } catch (error) {
      notifyError(error, '导入失败');
      return false;
    }
  },

  addSku: async (productId, copyFromLast = true) => {
    const product = get().products.find((p) => p.id === productId);
    if (!product) return;
    const last = product.variants.at(-1);
    try {
      const sku = await api.createSku(productId, copyFromLast && last ? cloneSkuInput(last) : {});
      // mapProduct 按 id 匹配，切换店铺后商品不在列表中，自然不会误加
      set((s) => ({ products: mapProduct(s.products, productId, (p) => ({ ...p, variants: [...p.variants, sku] })) }));
    } catch (error) {
      notifyError(error, '添加 SKU 失败');
    }
  },

  updateSku: async (productId, skuId, patch) => {
    const before = get().products.find((p) => p.id === productId)?.variants.find((v) => v.id === skuId);
    if (!before) return;
    const previous = pick(before, Object.keys(patch) as (keyof SkuDTO)[]);
    set((s) => ({ products: mapSku(s.products, productId, skuId, (v) => ({ ...v, ...patch })) }));
    try {
      await api.updateSku(skuId, patch);
    } catch (error) {
      set((s) => ({ products: mapSku(s.products, productId, skuId, (v) => rollback(v, patch as Partial<SkuDTO>, previous)) }));
      notifyError(error, '保存 SKU 失败');
    }
  },

  deleteSku: async (productId, skuId) => {
    const variants = get().products.find((p) => p.id === productId)?.variants ?? [];
    const index = variants.findIndex((v) => v.id === skuId);
    if (index < 0) return;
    const removed = variants[index];
    set((s) => ({
      products: mapProduct(s.products, productId, (p) => ({ ...p, variants: p.variants.filter((v) => v.id !== skuId) })),
    }));
    try {
      await api.deleteSku(skuId);
    } catch (error) {
      set((s) => ({
        products: mapProduct(s.products, productId, (p) => ({ ...p, variants: reinsert(p.variants, removed, index) })),
      }));
      notifyError(error, '删除 SKU 失败');
    }
  },
});
