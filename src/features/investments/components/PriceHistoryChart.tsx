'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { HistoryPoint, HistoryRange } from '@/features/investments/quotes/types';

export const RANGE_OPTIONS: Array<{ value: HistoryRange; label: string }> = [
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '1y', label: '1A' },
  { value: '5y', label: '5A' },
];

interface PriceHistoryChartProps {
  points: HistoryPoint[];
  currency: string;
  range: HistoryRange;
  onRangeChange: (range: HistoryRange) => void;
  /** Chamado ao clicar num ponto: permite usar o fechamento como preço de compra. */
  onPick?: (point: HistoryPoint) => void;
}

const WIDTH = 300;
const HEIGHT = 96;

const formatMoney = (value: number, currency: string) => value.toLocaleString('pt-BR', { style: 'currency', currency });
const formatDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

/** Gráfico de linha leve (SVG puro) com seleção de período e leitura do ponto sob o cursor. */
export function PriceHistoryChart({ points, currency, range, onRangeChange, onPick }: PriceHistoryChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length < 2) {
    return <p className="text-sm text-on-surface-variant">Sem dados suficientes de histórico para este período.</p>;
  }

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * WIDTH;
  const y = (value: number) => HEIGHT - 6 - ((value - min) / span) * (HEIGHT - 12);

  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.close).toFixed(1)}`).join(' ');
  const area = `0,${HEIGHT} ${line} ${WIDTH},${HEIGHT}`;

  const first = points[0];
  const last = points[points.length - 1];
  const variation = ((last.close - first.close) / first.close) * 100;
  const positive = variation >= 0;
  const active = hoverIndex !== null ? points[hoverIndex] : last;
  const colorClass = positive ? 'text-finance-income' : 'text-finance-expense';

  function indexFromPointer(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    return Math.round(ratio * (points.length - 1));
  }

  return (
    <div className="flex flex-col gap-2" data-testid="price-history-chart">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-base text-on-surface">{formatMoney(active.close, currency)}</p>
          <p className="text-xs text-on-surface-variant">
            {hoverIndex !== null ? 'Fechamento em' : 'Último fechamento em'} {formatDate(active.date)}
          </p>
        </div>
        <p className={`font-mono text-sm ${colorClass}`} aria-label="Variação no período">
          {positive ? '+' : ''}
          {variation.toFixed(2).replace('.', ',')}%
        </p>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className={`h-24 w-full touch-none ${colorClass} ${onPick ? 'cursor-pointer' : ''}`}
        role="img"
        aria-label={`Histórico de preços: de ${formatMoney(first.close, currency)} para ${formatMoney(last.close, currency)}`}
        onPointerMove={(e) => setHoverIndex(indexFromPointer(e))}
        onPointerLeave={() => setHoverIndex(null)}
        onClick={(e) => onPick?.(points[indexFromPointer(e as unknown as React.PointerEvent<SVGSVGElement>)])}
      >
        <polygon points={area} fill="currentColor" opacity="0.1" />
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {hoverIndex !== null && (
          <line
            x1={x(hoverIndex)}
            x2={x(hoverIndex)}
            y1={0}
            y2={HEIGHT}
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            opacity="0.5"
          />
        )}
      </svg>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-on-surface-variant">
          Mín. {formatMoney(min, currency)} · Máx. {formatMoney(max, currency)}
        </p>
        <div className="flex gap-1" role="group" aria-label="Período do histórico">
          {RANGE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={range === option.value ? 'default' : 'ghost'}
              aria-pressed={range === option.value}
              onClick={() => onRangeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
