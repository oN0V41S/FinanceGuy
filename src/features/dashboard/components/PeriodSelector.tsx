'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PeriodOption {
  value: string;
  label: string;
}

interface PeriodSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

function buildOptions(): PeriodOption[] {
  const currentYear = new Date().getFullYear();
  const opts: PeriodOption[] = [{ value: 'last6', label: 'Últimos 6 meses' }];

  for (let year = 2024; year <= currentYear; year++) {
    const y = String(year);
    opts.push({ value: y, label: `${y} completo` });
    opts.push({ value: `${y}-s1`, label: `${y} — 1º semestre` });
    opts.push({ value: `${y}-s2`, label: `${y} — 2º semestre` });
  }

  return opts;
}

const ALL_OPTIONS = buildOptions();

function getLabelForValue(val: string): string {
  return ALL_OPTIONS.find((o) => o.value === val)?.label ?? val;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="min-h-9 text-sm w-auto min-w-[160px]">
        {/*
          base-ui SelectValue does NOT auto-display ItemText like Radix does.
          Always pass the mapped label as children so the trigger shows the
          human-readable label instead of the raw value key.
        */}
        <SelectValue>{getLabelForValue(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-surface-container">
        {ALL_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
