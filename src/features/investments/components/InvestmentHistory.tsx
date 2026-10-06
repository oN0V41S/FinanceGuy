'use client';

import { useEffect, useRef } from 'react';
import { History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvestmentHistory } from '@/features/investments/hooks/useInvestmentHistory';

const money = (value: number, currency = 'BRL') =>
  value.toLocaleString('pt-BR', { style: 'currency', currency });

export function InvestmentHistory({ refreshKey }: { refreshKey: number }) {
  const { entries, isLoading, error, refresh } = useInvestmentHistory();

  // recarrega quando um resgate/compra acontece
  useRefreshOn(refreshKey, refresh);

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (error) return <p className="text-sm text-on-surface-variant">{error}</p>;
  if (entries.length === 0) return null;

  return (
    <Card data-testid="investment-history">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-4 h-4" />
          Histórico de investimentos
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-outline-variant">
        {entries.map((entry) => {
          const currency = entry.currency ?? 'BRL';
          const asset = entry.assetTicker ?? entry.assetName;
          return (
            <div key={entry.id} className="flex items-start justify-between gap-4 py-3 text-sm">
              <div>
                <p className="font-medium text-on-surface">
                  {entry.kind === 'BUY' ? 'Compra' : 'Resgate'} · {asset}
                </p>
                <p className="text-on-surface-variant">
                  {new Date(entry.date).toLocaleDateString('pt-BR')} · {entry.quantity} un. a {money(entry.unitPrice, currency)}
                </p>
                {entry.kind === 'REDEEM' && (
                  <p className="text-on-surface-variant">
                    Lucro {money(entry.profit ?? 0, currency)} · imposto est. {money(entry.taxValue ?? 0, currency)} ({entry.taxRate ?? 0}%)
                  </p>
                )}
              </div>
              <p className="font-mono shrink-0">
                {money(entry.kind === 'REDEEM' ? (entry.netValue ?? entry.grossValue) : entry.grossValue, currency)}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function useRefreshOn(key: number, refresh: () => void) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    refresh();
  }, [key, refresh]);
}
