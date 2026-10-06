'use client';

import { useCallback } from 'react';
import type { RedeemPreview } from '@/features/investments/marketInvestment.service';

export interface RedeemFormInput {
  quantity: number;
  taxRate: number;
  unitPrice?: number;
}

async function request<T>(url: string, input: RedeemFormInput, fallback: string): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let message = fallback;
    try {
      const body = await response.json();
      message = body?.error || fallback;
    } catch {
      // mantém a mensagem padrão
    }
    throw new Error(message);
  }

  return (await response.json()).data as T;
}

export function useRedeem(investmentId: string | undefined) {
  const preview = useCallback(
    (input: RedeemFormInput) =>
      request<RedeemPreview>(`/api/investments/${investmentId}/redeem/preview`, input, 'Não foi possível simular o resgate.'),
    [investmentId]
  );

  const confirm = useCallback(
    (input: RedeemFormInput) =>
      request<unknown>(`/api/investments/${investmentId}/redeem`, input, 'Não foi possível concluir o resgate.'),
    [investmentId]
  );

  return { preview, confirm };
}
