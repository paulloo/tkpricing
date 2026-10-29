// 设置面板用的带标签数值输入（失焦或回车时提交）

import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseInput, toDisplay } from './parse-number';

interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  suffix?: string;
  hint?: string;
  percent?: boolean;
  nullable?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  hint,
  percent = false,
  nullable = false,
  min = 0,
  max,
  placeholder,
}: NumberFieldProps) {
  const id = useId();
  const [text, setText] = useState(toDisplay(value, percent));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setText(toDisplay(value, percent));
  }

  const commit = () => {
    const parsed = parseInput(text, percent, nullable);
    const outOfRange = parsed != null && (parsed < min || (max != null && parsed > max));
    if (parsed === undefined || outOfRange) {
      setText(toDisplay(value, percent));
      return;
    }
    if (parsed !== value) onChange(parsed);
  };

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px] font-normal text-slate-500">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="h-7 pr-9 text-xs"
        />
        {(suffix || percent) && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
            {percent ? '%' : suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-[10px] leading-tight text-slate-400">{hint}</p>}
    </div>
  );
}
