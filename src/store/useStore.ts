// ============================================
// TK Shop 智能定价计算器 v3.0 - Next.js + Prisma 版本
// 状态管理 + API 集成
// ============================================

import { create } from 'zustand';
import { useMemo } from 'react';
import type { GlobalParams, Product, SKUVariant, PricingStrategy } from '@/types';
import {
  createDefaultGlobalParams,
  createEmptyProduct,
  createEmptySKU,
  generateId,
  calculateSKU,
} from '@/lib/calculator';

// API 响应类型
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 导入载荷类型（直接对应 /api/import 接受的 JSON 结构）
export interface ImportSKUPayload {
  skuName: string;
  skuCode?: string;
  tiktokSkuId?: string;
  imageUrl?: string;
  purchaseCost: number;
  domesticShipping: number;
  packagingFee: number;
  weight: number;
  currentPrice?: number;
  inventory?: number;
  returnRate?: number;
  pricingStrategy?: string;
  customMultiplier?: number;
}

export interface ImportProductPayload {
  name: string;
  url?: string;
  description?: string;
  imageUrl?: string;
  isExpanded?: boolean;
  variants: ImportSKUPayload[];
}

// Prisma 模型转前端类型
function mapProductFromDB(dbProduct: {
  id: string;
  name: string;
  url: string | null;
  description: string | null;
  imageUrl?: string | null;
  isExpanded: boolean;
  displayOrder: number;
  variants: Array<{
    id: string;
    skuName: string;
    skuCode: string | null;
    tiktokSkuId?: string | null;
    imageUrl?: string | null;
    purchaseCost: number;
    domesticShipping: number;
    packagingFee: number;
    weight: number;
    finalPrice?: number | null;
    currentPrice?: number | null;
    inventory?: number | null;
    returnRate: number | null;
    pricingStrategy: string | null;
    customMultiplier: number | null;
  }>;
}): Product {
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    url: dbProduct.url || '',
    imageUrl: dbProduct.imageUrl || undefined,
    isExpanded: dbProduct.isExpanded,
    variants: dbProduct.variants.map((v) => ({
      skuId: v.id,
      name: v.skuName,
      tiktokSkuId: v.tiktokSkuId || undefined,
      imageUrl: v.imageUrl || undefined,
      purchaseCost: Number(v.purchaseCost),
      domesticShipping: Number(v.domesticShipping),
      packagingFee: Number(v.packagingFee),
      weight: Number(v.weight),
      finalPrice: v.finalPrice != null ? Number(v.finalPrice) : null,
      currentPrice: v.currentPrice != null ? Number(v.currentPrice) : undefined,
      inventory: v.inventory != null ? v.inventory : undefined,
      returnRate: v.returnRate !== null ? Number(v.returnRate) : null,
      pricingStrategy: (v.pricingStrategy as PricingStrategy) || null,
      customMultiplier: v.customMultiplier !== null ? Number(v.customMultiplier) : undefined,
    })),
  };
}

// 只返回 DB 中实际存储的字段，不覆盖本地字段
function mapConfigFromDB(dbConfig: {
  exchangeRate: number;
  shippingRate: number;
  minOperationFee: number;
  labelFee: number;
  lastMileFee: number;
  platformFeeRate: number;
  returnRate: number;
  targetProfitMargin: number;
  pricingStrategy: string;
  customMultiplier: number | null;
}): Partial<GlobalParams> {
  return {
    exchangeRate: Number(dbConfig.exchangeRate),
    shippingRate: Number(dbConfig.shippingRate),
    handlingFee: Number(dbConfig.labelFee),
    minHandlingFee: Number(dbConfig.minOperationFee),
    lastMileFee: Number(dbConfig.lastMileFee),
    commissionRate: Number(dbConfig.platformFeeRate),
    returnRate: Number(dbConfig.returnRate),
    targetProfitRate: Number(dbConfig.targetProfitMargin),
    pricingStrategy: dbConfig.pricingStrategy as PricingStrategy,
    ...(dbConfig.customMultiplier !== null && { customMultiplier: Number(dbConfig.customMultiplier) }),
    // transactionFee / lvgTaxRate / marketingRate / sfpFee / affiliateRate / adsRate / returnLossRate
    // 不在 DB schema 中，保留本地状态
  };
}

// Store 状态接口
interface StoreState {
  // 数据
  globalParams: GlobalParams;
  products: Product[];
  lastSaved: string | null;
  isLoading: boolean;
  error: string | null;

  // 操作 - 全局参数
  setGlobalParams: (params: Partial<GlobalParams>) => Promise<void>;
  resetGlobalParams: () => Promise<void>;
  setPricingStrategy: (strategy: PricingStrategy) => Promise<void>;

  // 操作 - 商品
  addProduct: (name?: string, url?: string) => Promise<string>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductExpand: (id: string) => void;
  expandAllProducts: () => void;
  collapseAllProducts: () => void;
  reorderProducts: (products: Product[]) => Promise<void>;

  // 操作 - SKU
  addSKU: (productId: string, copyFromLast?: boolean) => Promise<void>;
  updateSKU: (productId: string, skuId: string, updates: Partial<SKUVariant>) => Promise<void>;
  deleteSKU: (productId: string, skuId: string) => Promise<void>;
  setSKUPricingStrategy: (productId: string, skuId: string, strategy: PricingStrategy | null) => Promise<void>;

  // 数据管理
  loadData: () => Promise<void>;
  importData: (data: { globalParams?: GlobalParams; products?: ImportProductPayload[] | Product[] }) => Promise<void>;
  exportData: () => { globalParams: GlobalParams; products: Product[] };
  clearAllData: () => Promise<void>;
}

// 创建 Store
export const useStore = create<StoreState>()((set, get) => ({
  // 初始数据
  globalParams: createDefaultGlobalParams(),
  products: [],
  lastSaved: null,
  isLoading: false,
  error: null,

  // ============ 数据加载 ============

  loadData: async () => {
    set({ isLoading: true, error: null });
    try {
      // 并行加载配置和商品
      const [configRes, productsRes] = await Promise.all([
        fetch('/api/config'),
        fetch('/api/products'),
      ]);

      if (!configRes.ok || !productsRes.ok) {
        throw new Error('加载数据失败');
      }

      const configData: ApiResponse<{
        exchangeRate: number;
        shippingRate: number;
        minOperationFee: number;
        labelFee: number;
        lastMileFee: number;
        platformFeeRate: number;
        returnRate: number;
        targetProfitMargin: number;
        pricingStrategy: string;
        customMultiplier: number | null;
      }> = await configRes.json();

      const productsData: ApiResponse<Array<{
        id: string;
        name: string;
        url: string | null;
        description: string | null;
        imageUrl?: string | null;
        isExpanded: boolean;
        displayOrder: number;
        variants: Array<{
          id: string;
          skuName: string;
          skuCode: string | null;
          tiktokSkuId?: string | null;
          imageUrl?: string | null;
          purchaseCost: number;
          domesticShipping: number;
          packagingFee: number;
          weight: number;
          finalPrice?: number | null;
          currentPrice?: number | null;
          inventory?: number | null;
          returnRate: number | null;
          pricingStrategy: string | null;
          customMultiplier: number | null;
        }>;
      }>> = await productsRes.json();

      set({
        // 以默认值为基础，将 DB 中的字段覆盖进来，保留本地字段的默认值
        globalParams: configData.data
          ? { ...createDefaultGlobalParams(), ...mapConfigFromDB(configData.data) }
          : createDefaultGlobalParams(),
        products: productsData.data ? productsData.data.map(mapProductFromDB) : [],
        lastSaved: new Date().toISOString(),
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '未知错误',
        isLoading: false,
      });
    }
  },

  // ============ 全局参数操作 ============

  setGlobalParams: async (params) => {
    // 1. 乐观更新：立即反映到界面
    set((state) => ({
      globalParams: { ...state.globalParams, ...params },
    }));

    // 2. 构造 DB payload（只发送 DB 支持的字段）
    const mapToDB: Record<string, string> = {
      handlingFee: 'labelFee',
      minHandlingFee: 'minOperationFee',
      commissionRate: 'platformFeeRate',
      targetProfitRate: 'targetProfitMargin',
    };
    const skipFields = new Set([
      'returnLossRate', 'transactionFee', 'lvgTaxRate',
      'marketingRate', 'sfpFee', 'affiliateRate', 'adsRate',
    ]);

    const dbPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (skipFields.has(key)) continue;
      dbPayload[mapToDB[key] ?? key] = value;
    }

    // 3. 纯本地字段则不需要请求 API
    if (Object.keys(dbPayload).length === 0) return;

    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload),
      });

      if (!res.ok) throw new Error('更新配置失败');

      const data: ApiResponse<{
        exchangeRate: number;
        shippingRate: number;
        minOperationFee: number;
        labelFee: number;
        lastMileFee: number;
        platformFeeRate: number;
        returnRate: number;
        targetProfitMargin: number;
        pricingStrategy: string;
        customMultiplier: number | null;
      }> = await res.json();

      if (data.data) {
        // 合并 DB 响应，保留本地字段（不替换整个 globalParams）
        set((state) => ({
          globalParams: { ...state.globalParams, ...mapConfigFromDB(data.data!) },
          lastSaved: new Date().toISOString(),
        }));
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '更新配置失败' });
    }
  },

  resetGlobalParams: async () => {
    try {
      const res = await fetch('/api/config', { method: 'POST' });
      if (!res.ok) throw new Error('重置配置失败');

      const data: ApiResponse<{
        exchangeRate: number;
        shippingRate: number;
        minOperationFee: number;
        labelFee: number;
        lastMileFee: number;
        platformFeeRate: number;
        returnRate: number;
        targetProfitMargin: number;
        pricingStrategy: string;
        customMultiplier: number | null;
      }> = await res.json();

      if (data.data) {
        set({
          globalParams: { ...createDefaultGlobalParams(), ...mapConfigFromDB(data.data) },
          lastSaved: new Date().toISOString(),
        });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '重置配置失败' });
    }
  },

  setPricingStrategy: async (strategy) => {
    await get().setGlobalParams({ pricingStrategy: strategy });
  },

  // ============ 商品操作 ============

  addProduct: async (name = '', url = '') => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url }),
      });

      if (!res.ok) throw new Error('创建商品失败');

      const data: ApiResponse<{
        id: string;
        name: string;
        url: string | null;
        description: string | null;
        isExpanded: boolean;
        displayOrder: number;
        variants: unknown[];
      }> = await res.json();

      if (data.data) {
        const newProduct = mapProductFromDB(data.data as {
          id: string;
          name: string;
          url: string | null;
          description: string | null;
          isExpanded: boolean;
          displayOrder: number;
          variants: Array<{
            id: string;
            skuName: string;
            skuCode: string | null;
            purchaseCost: number;
            domesticShipping: number;
            packagingFee: number;
            weight: number;
            returnRate: number | null;
            pricingStrategy: string | null;
            customMultiplier: number | null;
          }>;
        });
        set((state) => ({
          products: [newProduct, ...state.products],
          lastSaved: new Date().toISOString(),
        }));
        return newProduct.id;
      }
      throw new Error('创建商品失败');
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '创建商品失败' });
      throw err;
    }
  },

  updateProduct: async (id, updates) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('更新商品失败');

      const data: ApiResponse<{
        id: string;
        name: string;
        url: string | null;
        description: string | null;
        isExpanded: boolean;
        displayOrder: number;
        variants: Array<{
          id: string;
          skuName: string;
          skuCode: string | null;
          purchaseCost: number;
          domesticShipping: number;
          packagingFee: number;
          weight: number;
          returnRate: number | null;
          pricingStrategy: string | null;
          customMultiplier: number | null;
        }>;
      }> = await res.json();

      if (data.data) {
        const updatedProduct = mapProductFromDB(data.data);
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? updatedProduct : p
          ),
          lastSaved: new Date().toISOString(),
        }));
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '更新商品失败' });
    }
  },

  deleteProduct: async (id) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除商品失败');

      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        lastSaved: new Date().toISOString(),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '删除商品失败' });
    }
  },

  toggleProductExpand: (id) => {
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, isExpanded: !p.isExpanded } : p
      ),
    }));
  },

  expandAllProducts: () => {
    set((state) => ({
      products: state.products.map((p) => ({ ...p, isExpanded: true })),
    }));
  },

  collapseAllProducts: () => {
    set((state) => ({
      products: state.products.map((p) => ({ ...p, isExpanded: false })),
    }));
  },

  reorderProducts: async (products) => {
    // 批量更新排序
    try {
      await Promise.all(
        products.map((p, index) =>
          fetch(`/api/products/${p.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayOrder: index }),
          })
        )
      );
      set({ products, lastSaved: new Date().toISOString() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '更新排序失败' });
    }
  },

  // ============ SKU操作 ============

  addSKU: async (productId, copyFromLast = true) => {
    try {
      const state = get();
      const product = state.products.find((p) => p.id === productId);
      if (!product) return;

      let newSKUData: Partial<SKUVariant> = {
        name: '',
        purchaseCost: 0,
        domesticShipping: 0,
        packagingFee: 0,
        weight: 0,
      };

      // 复制上一个SKU的数据
      if (copyFromLast && product.variants.length > 0) {
        const lastSKU = product.variants[product.variants.length - 1];
        newSKUData = {
          name: '',
          weight: lastSKU.weight,
          purchaseCost: lastSKU.purchaseCost,
          domesticShipping: lastSKU.domesticShipping,
          packagingFee: lastSKU.packagingFee,
        };
      }

      const { name: skuName, ...restSKUData } = newSKUData;
      const res = await fetch('/api/skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          skuName: skuName ?? '',
          ...restSKUData,
        }),
      });

      if (!res.ok) throw new Error('创建 SKU 失败');

      const data: ApiResponse<{
        id: string;
        skuName: string;
        skuCode: string | null;
        purchaseCost: number;
        domesticShipping: number;
        packagingFee: number;
        weight: number;
        returnRate: number | null;
        pricingStrategy: string | null;
        customMultiplier: number | null;
      }> = await res.json();

      if (data.data) {
        const newSKU: SKUVariant = {
          skuId: data.data.id,
          name: data.data.skuName,
          purchaseCost: Number(data.data.purchaseCost),
          domesticShipping: Number(data.data.domesticShipping),
          packagingFee: Number(data.data.packagingFee),
          weight: Number(data.data.weight),
          returnRate: data.data.returnRate !== null ? Number(data.data.returnRate) : null,
          finalPrice: null,
          pricingStrategy: (data.data.pricingStrategy as PricingStrategy) || null,
          customMultiplier: data.data.customMultiplier !== null ? Number(data.data.customMultiplier) : undefined,
        };

        set((s) => ({
          products: s.products.map((p) =>
            p.id === productId
              ? { ...p, variants: [...p.variants, newSKU] }
              : p
          ),
          lastSaved: new Date().toISOString(),
        }));
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '创建 SKU 失败' });
    }
  },

  updateSKU: async (productId, skuId, updates) => {
    try {
      // Translate frontend field names to DB field names
      const { name, ...restUpdates } = updates;
      const apiBody = {
        ...(name !== undefined && { skuName: name }),
        ...restUpdates,
      };
      const res = await fetch(`/api/skus/${skuId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiBody),
      });

      if (!res.ok) throw new Error('更新 SKU 失败');

      const data: ApiResponse<{
        id: string;
        skuName: string;
        skuCode: string | null;
        purchaseCost: number;
        domesticShipping: number;
        packagingFee: number;
        weight: number;
        returnRate: number | null;
        pricingStrategy: string | null;
        customMultiplier: number | null;
      }> = await res.json();

      if (data.data) {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  variants: p.variants.map((sku) =>
                    sku.skuId === skuId ? { ...sku, ...updates } : sku
                  ),
                }
              : p
          ),
          lastSaved: new Date().toISOString(),
        }));
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '更新 SKU 失败' });
    }
  },

  deleteSKU: async (productId, skuId) => {
    try {
      const res = await fetch(`/api/skus/${skuId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除 SKU 失败');

      set((state) => ({
        products: state.products.map((p) =>
          p.id === productId
            ? {
                ...p,
                variants: p.variants.filter((sku) => sku.skuId !== skuId),
              }
            : p
        ),
        lastSaved: new Date().toISOString(),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '删除 SKU 失败' });
    }
  },

  setSKUPricingStrategy: async (productId, skuId, strategy) => {
    await get().updateSKU(productId, skuId, { pricingStrategy: strategy });
  },

  // ============ 数据导入导出 ============

  importData: async (data: { globalParams?: GlobalParams; products?: ImportProductPayload[] | Product[] }) => {
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('导入数据失败');

      // 重新加载数据
      await get().loadData();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '导入数据失败' });
    }
  },

  exportData: () => {
    const { globalParams, products } = get();
    return { globalParams, products };
  },

  clearAllData: async () => {
    try {
      // 删除所有商品（关联的 SKU 会自动删除）
      await Promise.all(
        get().products.map((p) =>
          fetch(`/api/products/${p.id}`, { method: 'DELETE' })
        )
      );

      // 重置配置
      await fetch('/api/config', { method: 'POST' });

      set({
        globalParams: createDefaultGlobalParams(),
        products: [],
        lastSaved: new Date().toISOString(),
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '清除数据失败' });
    }
  },
}));

// 计算派生状态的 Hook（useMemo 避免无关 state 变化触发重算）
export function useCalculatedProducts() {
  const { products, globalParams } = useStore();

  return useMemo(() => products.map((product) => {
    const variants = product.variants.map((sku) => ({
      ...sku,
      calculated: calculateSKU(sku, globalParams),
    }));

    // 计算商品汇总
    const skuCount = variants.length;
    const avgReturnRate =
      variants.reduce(
        (sum, v) => sum + (v.returnRate ?? globalParams.returnRate),
        0
      ) / skuCount || 0;

    const profits = variants.map((v) => v.calculated.actualNetProfit);
    const profitRange: [number, number] = [
      Math.min(...profits, 0),
      Math.max(...profits, 0),
    ];

    const costs = variants.map((v) => v.calculated.totalCostMYR);
    const costRange: [number, number] = [
      Math.min(...costs, 0),
      Math.max(...costs, 0),
    ];

    const prices = variants.map((v) => v.calculated.finalPrice);
    const priceRange: [number, number] = [
      Math.min(...prices, 0),
      Math.max(...prices, 0),
    ];

    return {
      ...product,
      variants,
      summary: {
        skuCount,
        avgReturnRate,
        totalEstimatedSales: 0,
        profitRange,
        costRange,
        priceRange,
      },
    };
  }), [products, globalParams]);
}

// 计算汇总统计
export function useSummaryStats() {
  const calculatedProducts = useCalculatedProducts();

  const skuCount = calculatedProducts.reduce(
    (sum, p) => sum + p.variants.length,
    0
  );

  const allSKUs = calculatedProducts.flatMap((p) => p.variants);

  // 加权平均利润率
  const totalRevenue = allSKUs.reduce(
    (sum, sku) => sum + sku.calculated.finalPrice,
    0
  );

  const avgProfitMargin = totalRevenue > 0
    ? allSKUs.reduce((sum, sku) => sum + sku.calculated.profitMargin * sku.calculated.finalPrice, 0) / totalRevenue
    : 0;

  const avgActualMargin = totalRevenue > 0
    ? allSKUs.reduce((sum, sku) => sum + sku.calculated.actualMargin * sku.calculated.finalPrice, 0) / totalRevenue
    : 0;

  // 高风险SKU数（实际利润率 < 10%）
  const highRiskSkuCount = allSKUs.filter(
    (sku) => sku.calculated.actualMargin < 0.1
  ).length;

  // 总库存价值
  const totalInventoryValue = allSKUs.reduce(
    (sum, sku) => sum + sku.calculated.totalCostMYR,
    0
  );

  return {
    productCount: calculatedProducts.length,
    skuCount,
    avgProfitMargin,
    avgActualMargin,
    highRiskSkuCount,
    totalInventoryValue,
  };
}
