'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PortfolioItem } from '@/features/investments/marketInvestment.service';
import type { Investment } from '@/features/investments/validations';

interface UseMarketPortfolioResult {
  /** Posição/cotação por id de investimento (apenas ativos de mercado ativos). */
  byId: Record<string, PortfolioItem>;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Busca cotações/rentabilidade só quando existe ao menos um ativo de mercado ativo,
 * evitando chamadas desnecessárias para quem só tem investimentos manuais.
 */
export function useMarketPortfolio(investments: Investment[]): UseMarketPortfolioResult {
  const [byId, setById] = useState<Record<string, PortfolioItem>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const hasMarketAssets = investments.some((i) => Boolean(i.ticker) && i.status !== 'REDEEMED');

  useEffect(() => {
    if (!hasMarketAssets) {
      setById({});
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/investments/portfolio');
        if (!response.ok) throw new Error('Não foi possível carregar as cotações agora.');
        const result = await response.json();
        if (cancelled) return;
        const map: Record<string, PortfolioItem> = {};
        for (const item of (result.data ?? []) as PortfolioItem[]) map[item.id] = item;
        setById(map);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar cotações');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [hasMarketAssets, investments, refreshKey]);

  return { byId, isLoading, error, refresh };
}
