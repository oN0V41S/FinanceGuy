/**
 * @jest-environment node
 *
 * TDD — FASE RED (Issue #9 — cache server-side com Redis/Upstash)
 *
 * Contrato testado (GET /api/transactions — implementação AINDA sem cache):
 * 1. getAllTransactions retorna { data, fromCache } e a rota propaga
 *    `X-Cache: HIT|MISS` a partir de `fromCache` do service.
 * 2. A resposta GET sempre carrega `Cache-Control: private, max-age=300`.
 * 3. O body continua expondo `data` (lista), `summary` e `total` — agora
 *    consumindo `result.data` do contrato cacheado.
 *
 * Esperado nesta fase: TODOS os testes FALHAM por asserção (a rota atual
 * trata o retorno como array e não emite headers de cache) — red fora do
 * verde, aguardando a implementação.
 */
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { transactionService } from '@/core/container';
import type { Transaction, FinancialSummary } from '@/types/finance';

jest.mock('@/core/container', () => ({
  transactionService: {
    getAllTransactions: jest.fn(),
    getFinancialSummary: jest.fn(),
  },
}));

describe('GET /api/transactions — headers de cache', () => {
  const mockGetAll = transactionService.getAllTransactions as jest.Mock;
  const mockGetSummary = transactionService.getFinancialSummary as jest.Mock;

  const transactions: Transaction[] = [
    {
      id: 't1',
      type: 'expense',
      description: 'Café da manhã',
      value: 25,
      date: '2026-01-15',
      category: 'Alimentação',
      responsible: 'Ana',
      paid: false,
      is_recurring: false,
    },
  ];

  const summary: FinancialSummary = { income: 5000, expense: 1200, balance: 3800 };

  const buildRequest = (): NextRequest =>
    new NextRequest('http://localhost/api/transactions?type=expense', {
      method: 'GET',
      headers: { 'x-user-id': 'u1' },
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return Cache-Control: private, max-age=300 and X-Cache: MISS when service reports a cache MISS', async () => {
    mockGetAll.mockResolvedValue({ data: transactions, fromCache: false });
    mockGetSummary.mockResolvedValue({ data: summary, fromCache: false });

    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=300');
    expect(response.headers.get('X-Cache')).toBe('MISS');

    const body = await response.json();
    expect(body.data).toEqual(transactions);
    expect(body.summary).toEqual(summary);
    expect(body.total).toBe(1);

    expect(mockGetAll).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }));
  });

  it('should return X-Cache: HIT when service reports a cache HIT', async () => {
    mockGetAll.mockResolvedValue({ data: transactions, fromCache: true });
    mockGetSummary.mockResolvedValue({ data: summary, fromCache: true });

    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=300');
    expect(response.headers.get('X-Cache')).toBe('HIT');

    const body = await response.json();
    expect(body.data).toEqual(transactions);
    expect(body.summary).toEqual(summary);
    expect(body.total).toBe(1);
  });
});