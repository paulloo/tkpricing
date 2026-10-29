import type { PricingWarning } from '@/domain/pricing/calculate';
import type { PricingStrategy } from '@/domain/shop-config';

export const STRATEGY_LABELS: Record<PricingStrategy, string> = {
  drainage: '引流款',
  profit: '利润款',
  anchor: '锚定款',
  custom: '自定义',
};

export const WARNING_LABELS: Record<PricingWarning, { label: string; hint: string; tone: 'red' | 'amber' | 'slate' }> = {
  loss: { label: '亏损', hint: '按最终价卖，每单期望利润为负', tone: 'red' },
  'current-price-loss': { label: '现价亏损', hint: '平台当前在售价下每单亏钱，建议尽快调价', tone: 'red' },
  'target-unreachable': { label: '目标不可达', hint: '费用比例过高，定多高都达不到目标净利率', tone: 'red' },
  'below-target': { label: '低于目标', hint: '手动定价低于策略目标净利率', tone: 'amber' },
  volumetric: { label: '抛货', hint: '体积重大于实重，物流按体积重计费', tone: 'amber' },
  'missing-weight': { label: '缺重量', hint: '未填写重量或尺寸，物流费可能被低估', tone: 'slate' },
};
