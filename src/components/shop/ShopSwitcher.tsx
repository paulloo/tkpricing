// 顶栏店铺切换器

import { Check, ChevronsUpDown, Plus, Store } from 'lucide-react';
import { findSite } from '@/domain/presets';
import { useCurrentShop, useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ShopSwitcherProps {
  onCreate: () => void;
}

export function ShopSwitcher({ onCreate }: ShopSwitcherProps) {
  const { shops, selectShop } = useStore();
  const current = useCurrentShop();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 max-w-[14rem] gap-1.5 px-2 text-xs">
          <Store className="h-3.5 w-3.5 shrink-0 text-blue-600" />
          <span className="truncate">{current?.name ?? '选择店铺'}</span>
          {current && <span className="shrink-0 text-[10px] text-slate-400">{current.site}</span>}
          <ChevronsUpDown className="h-3 w-3 shrink-0 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-slate-500">我的店铺</DropdownMenuLabel>
        {shops.map((shop) => (
          <DropdownMenuItem key={shop.id} onClick={() => selectShop(shop.id)} className="gap-2">
            <Check className={`h-3.5 w-3.5 ${shop.id === current?.id ? 'opacity-100' : 'opacity-0'}`} />
            <span className="flex-1 truncate">{shop.name}</span>
            <span className="text-[10px] text-slate-400">
              {findSite(shop.site)?.name ?? shop.site} · {shop.productCount} 品
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreate}>
          <Plus className="mr-2 h-3.5 w-3.5" />
          新建店铺
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
