'use client';

import { useState, useEffect } from 'react';

/** Une os anos da API ao ano atual (sempre navegável), em ordem decrescente. */
function withCurrentYear(years: number[], currentYear: number): number[] {
  return [...new Set([...years, currentYear])].sort((a, b) => b - a);
}

export function useTransactionYears(refreshTrigger = 0): number[] {
  const currentYear = new Date().getFullYear();
  const [years, setYears] = useState<number[]>([currentYear]);

  useEffect(() => {
    // `no-store`: a rota é cacheada pelo navegador (max-age); sem isso, criar uma
    // transação em outro ano (ex.: jan/2027) não atualizaria a lista de períodos.
    fetch('/api/transactions/years', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { data: number[] } | null) => {
        if (json?.data && json.data.length > 0) setYears(withCurrentYear(json.data, currentYear));
      })
      .catch(() => {});
  }, [refreshTrigger, currentYear]);

  return years;
}
