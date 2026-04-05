// ============================================
// TK Shop 智能定价计算器 v2.5 - 计算引擎
// ============================================

import type { 
  GlobalParams, 
  SKUVariant, 
  SKUCalculation, 
  Product, 
  PricingStrategy, 
  StrategyConfig 
} from '@/types';

// 定价策略配置
export const PRICING_STRATEGIES: StrategyConfig[] = [
  {
    key: 'drainage',
    name: '引流款',
    description: '低价引流，快速起量',
    multiplier: 1.3,
    color: '#3b82f6', // blue
  },
  {
    key: 'profit',
    name: '利润款',
    description: '正常利润，主力销售',
    multiplier: 2.0,
    color: '#10b981', // emerald
  },
  {
    key: 'anchor',
    name: '锚定款',
    description: '高价锚定，衬托其他',
    multiplier: 2.5,
    color: '#8b5cf6', // violet
  },
  {
    key: 'custom',
    name: '自定义',
    description: '自定义倍数',
    multiplier: 1.5,
    color: '#f59e0b', // amber
  },
];

/**
 * 获取定价策略配置
 */
export function getStrategyConfig(strategy: PricingStrategy): StrategyConfig {
  return PRICING_STRATEGIES.find(s => s.key === strategy) || PRICING_STRATEGIES[1];
}

/**
 * 计算SKU的所有衍生字段
 * @param sku - SKU基础数据
 * @param globalParams - 全局参数
 * @returns 计算结果
 */
export function calculateSKU(
  sku: SKUVariant,
  globalParams: GlobalParams
): SKUCalculation {
  const {
    exchangeRate,
    shippingRate,
    handlingFee,
    minHandlingFee,
    lastMileFee,
    commissionRate,
    transactionFee,
    lvgTaxRate,
    marketingRate,
    sfpFee,
    affiliateRate,
    adsRate,
    returnRate,
    returnLossRate,
    targetProfitRate,
    pricingStrategy,
    customMultiplier,
  } = globalParams;

  // ========== 1. 成本计算 ==========
  
  // 产品成本 = 采购价 + 国内运费 + 包装费
  const productCost = sku.purchaseCost + sku.domesticShipping + (sku.packagingFee || 0);
  
  // 头程运费 = max(重量×运费率, 最低操作费) + 贴单费
  const weightShipping = sku.weight * shippingRate;
  const intlShipping = Math.max(weightShipping, minHandlingFee) + handlingFee;
  
  // 物流总成本
  const logisticsCost = intlShipping;
  
  // 尾程派送费
  const lastMileCost = lastMileFee;
  
  // 总成本(RMB)
  const totalCostRMB = productCost + logisticsCost;
  
  // 总成本(MYR)
  const totalCostMYR = totalCostRMB * exchangeRate + lastMileCost;

  // ========== 2. 平台扣费计算 ==========
  
  // 保本价公式: 总成本 / (1 - 平台扣费率)
  // 平台扣费率 = 佣金 + 手续费 + 税费 + 营销费 + SFP费
  const platformDeductionRate = commissionRate + transactionFee + lvgTaxRate + marketingRate + sfpFee;
  
  // 保本价（覆盖所有成本，利润为0）
  const breakEvenPrice = totalCostMYR / (1 - platformDeductionRate);
  
  // ========== 3. 建议售价计算（基于目标利润） ==========
  // 建议售价 = 总成本 / (1 - 平台扣费率 - 目标利润率)
  const totalDeductionRate = platformDeductionRate + targetProfitRate;
  const suggestedPrice = totalCostMYR / (1 - Math.min(totalDeductionRate, 0.99));

  // ========== 4. 策略定价计算 ==========
  // 使用定价策略倍数
  const strategy = sku.pricingStrategy ? getStrategyConfig(sku.pricingStrategy) : getStrategyConfig(pricingStrategy);
  const multiplier = strategy.key === 'custom' ? customMultiplier : strategy.multiplier;
  const strategyPrice = totalCostMYR * multiplier;

  // ========== 5. 最终定价 ==========
  const finalPrice = sku.finalPrice ?? Math.round(strategyPrice);

  // ========== 6. 各项费用明细 ==========
  
  // 平台扣费
  const commissionFee = finalPrice * commissionRate;
  const transactionFeeAmount = finalPrice * transactionFee;
  const taxFee = finalPrice * lvgTaxRate;
  const marketingFee = finalPrice * marketingRate;
  const sfpFeeAmount = finalPrice * sfpFee;
  const platformFee = commissionFee + transactionFeeAmount + taxFee + marketingFee + sfpFeeAmount;
  
  // 运营成本
  const affiliateCost = finalPrice * affiliateRate;
  const adsCost = finalPrice * adsRate;
  const operatingCost = affiliateCost + adsCost;

  // ========== 7. 利润计算 ==========
  
  // 毛利润 = 售价 - 产品成本 - 物流成本
  const grossProfit = finalPrice - totalCostMYR;
  
  // 净利润（理论）= 毛利润 - 平台扣费 - 运营成本
  const netProfit = grossProfit - platformFee - operatingCost;
  
  // 利润率
  const profitMargin = netProfit / finalPrice;

  // ========== 8. 退货模型 ==========
  const skuReturnRate = sku.returnRate ?? returnRate;
  
  // 退货损失 = 售价 × 退货率 × 退货损失比例 + 退货处理成本
  const returnCost = finalPrice * skuReturnRate * returnLossRate;
  
  // 实际净利润 = 净利润 × (1 - 退货率) - 退货损失
  const actualNetProfit = netProfit * (1 - skuReturnRate) - returnCost;
  
  // 实际利润率
  const actualMargin = actualNetProfit / finalPrice;

  return {
    // 成本明细
    productCost,
    logisticsCost,
    intlShipping,
    lastMileCost,
    
    // 总成本
    totalCostRMB,
    totalCostMYR,
    
    // 定价
    breakEvenPrice,
    suggestedPrice,
    strategyPrice,
    finalPrice,
    
    // 平台扣费
    platformFee,
    commissionFee,
    transactionFee: transactionFeeAmount,
    taxFee,
    marketingFee,
    sfpFee: sfpFeeAmount,
    
    // 运营成本
    affiliateCost,
    adsCost,
    
    // 退货成本
    returnCost,
    
    // 利润
    grossProfit,
    netProfit,
    actualNetProfit,
    profitMargin,
    actualMargin,
    
    // 策略
    appliedStrategy: strategy,
    
    isProfitable: actualNetProfit > 0,
  };
}

/**
 * 计算总扣费率（用于显示）
 * @param globalParams - 全局参数
 * @returns 总扣费率
 */
export function calculateTotalDeductionRate(globalParams: GlobalParams): number {
  const {
    commissionRate,
    transactionFee,
    lvgTaxRate,
    marketingRate,
    sfpFee,
    targetProfitRate,
  } = globalParams;

  return commissionRate + transactionFee + lvgTaxRate + marketingRate + sfpFee + targetProfitRate;
}

/**
 * 计算平台扣费率（用于显示）
 * @param globalParams - 全局参数
 * @returns 平台扣费率
 */
export function calculatePlatformRate(globalParams: GlobalParams): number {
  const { commissionRate, transactionFee, lvgTaxRate, marketingRate, sfpFee } = globalParams;
  return commissionRate + transactionFee + lvgTaxRate + marketingRate + sfpFee;
}

/**
 * 格式化货币显示
 * @param value - 数值
 * @param currency - 货币符号
 * @param decimals - 小数位数
 * @returns 格式化后的字符串
 */
export function formatCurrency(
  value: number,
  currency: 'MYR' | 'RMB' | 'USD' = 'MYR',
  decimals: number = 2
): string {
  const symbols: Record<string, string> = {
    MYR: 'RM',
    RMB: '¥',
    USD: '$',
  };
  const symbol = symbols[currency] || 'RM';
  const formatted = value.toFixed(decimals);
  return `${symbol}${formatted}`;
}

/**
 * 格式化百分比显示
 * @param value - 小数形式的百分比（如0.15表示15%）
 * @param decimals - 小数位数
 * @returns 格式化后的字符串
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * 根据利润率获取状态颜色
 * @param margin - 利润率（小数形式）
 * @returns 颜色代码
 */
export function getMarginColor(margin: number): string {
  if (margin >= 0.2) return '#10b981'; // 绿色 - 盈利良好
  if (margin >= 0.1) return '#f59e0b'; // 黄色 - 盈利一般
  if (margin >= 0) return '#ef4444';   // 红色 - 盈利较低
  return '#dc2626';                     // 深红 - 亏损
}

/**
 * 根据利润率获取状态标签
 * @param margin - 利润率（小数形式）
 * @returns 状态标签
 */
export function getMarginStatus(margin: number): string {
  if (margin >= 0.2) return '盈利良好';
  if (margin >= 0.1) return '盈利一般';
  if (margin >= 0) return '盈利较低';
  return '亏损';
}

/**
 * 生成唯一ID
 * @param prefix - ID前缀
 * @returns 唯一ID
 */
export function generateId(prefix: 'prod' | 'sku' = 'prod'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * 创建默认全局参数
 * @returns 默认全局参数
 */
export function createDefaultGlobalParams(): GlobalParams {
  return {
    // 基础汇率
    exchangeRate: 0.58,
    
    // 物流成本
    shippingRate: 35,
    handlingFee: 2,
    minHandlingFee: 5,
    lastMileFee: 3,
    
    // 平台费率 (马来西亚站点参考值)
    commissionRate: 0.0432,
    transactionFee: 0.0378,
    lvgTaxRate: 0.10,
    marketingRate: 0.054,
    sfpFee: 0,
    
    // 营销与运营成本
    affiliateRate: 0.15,
    adsRate: 0.08,
    
    // 退货模型
    returnRate: 0.05,
    returnLossRate: 0.5,
    
    // 目标利润
    targetProfitRate: 0.20,
    
    // 定价策略
    pricingStrategy: 'profit',
    customMultiplier: 1.8,
  };
}

/**
 * 创建空SKU
 * @returns 空SKU对象
 */
export function createEmptySKU(): SKUVariant {
  return {
    skuId: generateId('sku'),
    name: '',
    purchaseCost: 0,
    domesticShipping: 5,
    packagingFee: 0,
    weight: 0.2,
    returnRate: null,
    finalPrice: null,
    pricingStrategy: null,
  };
}

/**
 * 创建空商品
 * @returns 空商品对象
 */
export function createEmptyProduct(): Product {
  return {
    id: generateId('prod'),
    name: '',
    url: '',
    createdAt: new Date().toISOString(),
    note: '',
    isExpanded: true,
    variants: [createEmptySKU()],
  };
}
