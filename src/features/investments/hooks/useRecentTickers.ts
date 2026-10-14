'use client';

import { useCallback, useState } from 'react';

export interface RecentTicker {
  ticker: string;
  market: string;
}

const STORAGE_KEY = 'financeguy:recent-tickers';
const MAX_ITEMS = 6;

function read(): RecentTicker[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentTicker =>
          typeof item === 'object' && item !== null && typeof item.ticker === 'string' && typeof item.market === 'string'
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

/** Histórico local (por navegador) dos últimos ativos cadastrados, para preencher o ticker com um clique. */
export function useRecentTickers() {
  // read() devolve [] no servidor (sem window); o diálogo só renderiza o conteúdo depois de aberto no cliente
  const [recent, setRecent] = useState<RecentTicker[]>(read);

  const add = useCallback((entry: RecentTicker) => {
    const ticker = entry.ticker.trim().toUpperCase();
    if (!ticker) return;
    const next = [{ ticker, market: entry.market }, ...read().filter((item) => item.ticker !== ticker)].slice(0, MAX_ITEMS);
    setRecent(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage indisponível (modo privado/bloqueado): o histórico é só uma conveniência
    }
  }, []);

  const clear = useCallback(() => {
    setRecent([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignorado
    }
  }, []);

  return { recent, add, clear };
}
