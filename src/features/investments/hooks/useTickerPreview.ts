'use client';

import { useEffect, useState } from 'react';
import type { HistoryRange, Quote, QuoteHistory } from '@/features/investments/quotes/types';

export type TickerPreviewStatus = 'idle' | 'loading' | 'ready' | 'error';

interface TickerPreviewResult {
  status: TickerPreviewStatus;
  quote: Quote | null;
  history: QuoteHistory | null;
  error: string | null;
}

interface Settled {
  key: string;
  quote: Quote | null;
  history: QuoteHistory | null;
  error: string | null;
}

const DEBOUNCE_MS = 500;
const TICKER_PATTERN = /^[A-Z0-9.\-=^]{2,20}$/;
const FRIENDLY_ERROR = 'Não encontramos cotação para este ticker. Confira o código e o mercado.';

async function fetchData<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(FRIENDLY_ERROR);
  const body = await response.json();
  return body.data as T;
}

/**
 * Busca cotação atual + histórico de fechamentos do ticker digitado (com debounce),
 * para o usuário conferir o ativo antes de cadastrar. Falhas nunca bloqueiam o formulário.
 */
export function useTickerPreview(rawTicker: string, market: string, range: HistoryRange): TickerPreviewResult {
  const ticker = rawTicker.trim().toUpperCase();
  const isValid = TICKER_PATTERN.test(ticker);
  const wanted = `${ticker}|${market}|${range}`;

  const [debounced, setDebounced] = useState('');
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    if (!isValid) return;
    const timer = setTimeout(() => setDebounced(wanted), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [isValid, wanted]);

  useEffect(() => {
    if (!debounced) return;
    const [symbol, mkt, rng] = debounced.split('|');
    const query = `symbol=${encodeURIComponent(symbol)}&market=${mkt}`;
    let cancelled = false;

    async function load() {
      // histórico é o essencial; a cotação só complementa (nome/preço atual)
      const [history, quote] = await Promise.allSettled([
        fetchData<QuoteHistory>(`/api/investments/quotes/history?${query}&range=${rng}`),
        fetchData<Quote>(`/api/investments/quotes?${query}`),
      ]);
      if (cancelled) return;
      const ok = history.status === 'fulfilled' || quote.status === 'fulfilled';
      setSettled({
        key: debounced,
        history: history.status === 'fulfilled' ? history.value : null,
        quote: quote.status === 'fulfilled' ? quote.value : null,
        error: ok ? null : FRIENDLY_ERROR,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  if (!isValid) return { status: 'idle', quote: null, history: null, error: null };
  if (!settled || settled.key !== wanted) return { status: 'loading', quote: null, history: null, error: null };
  return { status: settled.error ? 'error' : 'ready', quote: settled.quote, history: settled.history, error: settled.error };
}
