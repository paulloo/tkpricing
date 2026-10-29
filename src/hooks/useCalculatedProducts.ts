// 当前店铺商品 + 生效配置（含未保存草稿）→ 计算结果

import { useMemo } from 'react';
import { calculateProduct, portfolioStats, type CalculatedProduct, type PortfolioStats } from '@/domain/pricing/portfolio';
import { useEffectiveConfig, useStore } from '@/store/useStore';

export function useCalculatedProducts(): CalculatedProduct[] {
  const products = useStore((s) => s.products);
  const config = useEffectiveConfig();
  return useMemo(
    () => (config ? products.map((p) => calculateProduct(p, config)) : []),
    [products, config],
  );
}

export function usePortfolioStats(products: readonly CalculatedProduct[]): PortfolioStats {
  return useMemo(() => portfolioStats(products), [products]);
}
