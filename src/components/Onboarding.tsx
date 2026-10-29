// 首次使用引导：还没有店铺时显示

import { ArrowRight, Calculator, Settings2, Store, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingProps {
  onCreateShop: () => void;
  onRestore: () => void;
}

const STEPS = [
  { icon: Store, title: '建一个店铺', text: '选择站点和费率预设，比如"马来西亚 · 跨境店"。多个店铺的参数互不影响。' },
  { icon: Settings2, title: '核对店铺设置', text: '对照卖家中心的费率表、货代报价和你的目标利润，修改佣金、物流和退货率。' },
  { icon: Calculator, title: '录入商品', text: '填写采购价、重量和包裹尺寸，系统按目标净利率反推售价，并标出亏损和抛货。' },
];

export function Onboarding({ onCreateShop, onRestore }: OnboardingProps) {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <h2 className="text-center text-lg font-bold text-slate-800">三步算出不亏钱的价格</h2>
      <p className="mt-1 text-center text-sm text-slate-500">所有费用、达人佣金、广告、物流和退货损失都会计入。</p>
      <ol className="mt-8 grid gap-3 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Icon className="h-4 w-4 text-blue-600" />
              {i + 1}. {title}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{text}</p>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex justify-center gap-2">
        <Button onClick={onCreateShop} className="bg-blue-600 hover:bg-blue-700">
          创建第一个店铺
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={onRestore}>
          <Upload className="mr-1 h-4 w-4" />
          从备份恢复
        </Button>
      </div>
    </div>
  );
}
