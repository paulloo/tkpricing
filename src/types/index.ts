// ============================================
// TK Shop 智能定价计算器 v2.5 - 类型定义
// ============================================

// 定价策略
export type PricingStrategy = 'drainage' | 'profit' | 'anchor' | 'custom';

export interface StrategyConfig {
  key: PricingStrategy;
  name: string;
  description: string;
  multiplier: number;
  color: string;
}

// 全局参数配置
export interface GlobalParams {
  // 基础汇率
  exchangeRate: number;        // RMB→MYR 汇率
  
  // 物流成本
  shippingRate: number;        // 国际运费(RMB/kg)
  handlingFee: number;         // 贴单操作费(RMB/单)
  minHandlingFee: number;      // 最低操作费(RMB)
  lastMileFee: number;         // 尾程派送费(MYR/单)
  
  // 平台费率
  commissionRate: number;      // 平台佣金
  transactionFee: number;      // 交易手续费
  lvgTaxRate: number;          // LVG 税率/VAT
  marketingRate: number;       // 营销活动费
  sfpFee: number;              // SFP服务费
  
  // 营销与运营成本
  affiliateRate: number;       // 达人佣金比例
  adsRate: number;             // 广告费比例
  
  // 退货模型
  returnRate: number;          // 退货/破损率
  returnLossRate: number;      // 退货损失比例
  
  // 目标利润
  targetProfitRate: number;    // 目标利润率
  
  // 定价策略
  pricingStrategy: PricingStrategy;
  customMultiplier: number;    // 自定义倍数
}

// SKU 变体数据
export interface SKUVariant {
  skuId: string;               // SKU ID
  name: string;                // SKU名称

  // 采购与产品成本
  purchaseCost: number;        // 采购单价(RMB)
  domesticShipping: number;    // 国内段运费(RMB)
  packagingFee: number;        // 包装费/贴标费(RMB)

  // 物流
  weight: number;              // 重量(kg)

  // 其他
  returnRate: number | null;   // 退货率(%), null表示使用全局默认值
  finalPrice: number | null;   // 最终定价(MYR), null表示使用建议售价
  pricingStrategy: PricingStrategy | null; // SKU级定价策略

  customMultiplier?: number;   // 自定义倍数（策略为 custom 时使用）

  // 妙手同步字段
  tiktokSkuId?: string;        // TikTok Shop 原始 SKU ID
  currentPrice?: number;       // 当前在售价(MYR)，来自妙手导出
  inventory?: number;          // 库存数量
  imageUrl?: string;           // SKU 图片 URL
}

// SKU 计算结果
export interface SKUCalculation {
  // 成本明细
  productCost: number;         // 产品成本(RMB)
  logisticsCost: number;       // 物流成本(RMB)
  intlShipping: number;        // 头程运费(RMB)
  lastMileCost: number;        // 尾程派送费(MYR)
  
  // 总成本
  totalCostRMB: number;        // 总成本(RMB)
  totalCostMYR: number;        // 总成本(MYR)
  
  // 定价计算
  breakEvenPrice: number;      // 保本价(MYR)
  suggestedPrice: number;      // 建议售价(MYR) - 基于目标利润
  strategyPrice: number;       // 策略定价(MYR) - 基于定价策略
  finalPrice: number;          // 最终定价(MYR)
  
  // 平台扣费
  platformFee: number;         // 平台总扣费(MYR)
  commissionFee: number;       // 平台佣金(MYR)
  transactionFee: number;      // 交易手续费(MYR)
  taxFee: number;              // 税费(MYR)
  marketingFee: number;        // 营销费用(MYR)
  sfpFee: number;              // SFP服务费(MYR)
  
  // 运营成本
  affiliateCost: number;       // 达人佣金(MYR)
  adsCost: number;             // 广告费(MYR)
  
  // 退货成本
  returnCost: number;          // 退货损失(MYR)
  
  // 利润
  grossProfit: number;         // 毛利润(MYR)
  netProfit: number;           // 净利润(MYR)
  actualNetProfit: number;     // 实际净利润(扣除退货)
  profitMargin: number;        // 利润率(%)
  actualMargin: number;        // 实际利润率(%)
  
  // 策略信息
  appliedStrategy: StrategyConfig;
  
  isProfitable: boolean;       // 是否盈利
}

// 完整的SKU数据（输入+计算结果）
export interface SKUData extends SKUVariant {
  calculated: SKUCalculation;
}

// 商品数据
export interface Product {
  id: string;                  // 商品ID
  name: string;                // 商品名称
  url: string;                 // 商品链接
  createdAt?: string;          // 创建时间
  note?: string;               // 备注
  isExpanded: boolean;         // 是否展开
  variants: SKUVariant[];      // SKU变体列表
  imageUrl?: string;           // 商品主图 URL（来自妙手）
}

// 完整的商品数据（包含计算后的SKU）
export interface ProductWithCalculation extends Product {
  variants: SKUData[];
  summary: {
    skuCount: number;
    avgReturnRate: number;
    totalEstimatedSales: number;
    profitRange: [number, number];
    costRange: [number, number];
    priceRange: [number, number];
  };
}

// 应用状态
export interface AppState {
  version: string;
  lastUpdated: string;
  globalParams: GlobalParams;
  products: Product[];
}

// 汇总统计
export interface SummaryStats {
  productCount: number;
  skuCount: number;
  avgProfitMargin: number;
  avgActualMargin: number;
  highRiskSkuCount: number;
  totalInventoryValue: number;
}

// CSV导入行
export interface CSVImportRow {
  productName: string;
  productUrl: string;
  skuName: string;
  purchaseCost: number;
  domesticShipping: number;
  packagingFee: number;
  weight: number;
  returnRate: number;
  finalPrice: number;
}
