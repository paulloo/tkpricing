// 表格内点击编辑的单元格（数值 / 文本）

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { parseInput, toDisplay } from './parse-number';

interface EditableNumberProps {
  value: number | null;
  onCommit: (value: number | null) => void;
  /** 值为 null 时显示的继承值提示 */
  placeholder?: string;
  percent?: boolean;
  nullable?: boolean;
  min?: number;
  prefix?: string;
  suffix?: string;
  highlight?: boolean;
  format?: (value: number) => string;
  className?: string;
  ariaLabel: string;
}

export function EditableNumber({
  value,
  onCommit,
  placeholder,
  percent = false,
  nullable = false,
  min = 0,
  prefix,
  suffix,
  highlight = false,
  format,
  className,
  ariaLabel,
}: EditableNumberProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setText(toDisplay(value, percent));
    setEditing(true);
  };

  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const parsed = parseInput(text, percent, nullable);
    if (parsed === undefined || (parsed != null && parsed < min)) return;
    if (parsed !== value) onCommit(parsed);
  };

  if (editing) {
    return (
      <Input
        ref={ref}
        autoFocus
        inputMode="decimal"
        aria-label={ariaLabel}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className={cn('h-6 w-full min-w-[3.5rem] px-1.5 text-xs', className)}
      />
    );
  }

  const shown =
    value == null
      ? placeholder ?? '—'
      : format
        ? format(value)
        : `${toDisplay(value, percent)}${percent ? '%' : ''}`;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={startEditing}
      className={cn(
        'w-full whitespace-nowrap rounded px-1.5 py-0.5 text-right text-xs transition-colors hover:bg-amber-50 hover:ring-1 hover:ring-amber-200',
        value == null && 'text-slate-400',
        highlight && 'bg-amber-50/70 font-semibold text-amber-700',
        className,
      )}
    >
      {prefix && value != null && <span className="mr-0.5 text-slate-400">{prefix}</span>}
      {shown}
      {suffix && value != null && <span className="ml-0.5 text-slate-400">{suffix}</span>}
    </button>
  );
}

interface EditableTextProps {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel: string;
}

export function EditableText({ value, onCommit, placeholder = '—', className, ariaLabel }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  const startEditing = () => {
    setText(value);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const next = text.trim();
    if (next !== value) onCommit(next);
  };

  if (editing) {
    return (
      <Input
        autoFocus
        aria-label={ariaLabel}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className={cn('h-6 px-1.5 text-xs', className)}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={startEditing}
      className={cn(
        'max-w-full truncate rounded px-1.5 py-0.5 text-left text-xs hover:bg-amber-50 hover:ring-1 hover:ring-amber-200',
        !value && 'text-slate-400',
        className,
      )}
    >
      {value || placeholder}
    </button>
  );
}
