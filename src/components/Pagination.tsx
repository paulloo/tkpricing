// 分页控件：首尾页 + 当前页前后各一页，中间省略

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

function pageItems(page: number, total: number): (number | 'gap')[] {
  const pages = Array.from({ length: total }, (_, i) => i + 1).filter((p) => p === 1 || p === total || Math.abs(p - page) <= 1);
  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1] > 1 ? (['gap', p] as const) : ([p] as const)));
}

const BTN = 'flex h-7 min-w-7 items-center justify-center rounded px-1 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30';

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-1 pb-2 pt-1" aria-label="分页">
      <button type="button" className={BTN} disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="上一页">
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pageItems(page, totalPages).map((item, i) =>
        item === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-xs text-slate-400">…</span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cn(BTN, item === page && 'bg-blue-600 font-medium text-white hover:bg-blue-600')}
          >
            {item}
          </button>
        ),
      )}
      <button type="button" className={BTN} disabled={page === totalPages} onClick={() => onChange(page + 1)} aria-label="下一页">
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
