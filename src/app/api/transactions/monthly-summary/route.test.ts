/**
 * TDD — GET /api/transactions/monthly-summary
 *
 * Contrato testado:
 * 1. Sem x-user-id → 401
 * 2. period inválido → 400 com mensagem de erro
 * 3. period válido + userId → chama transactionService.getMonthlySummary e retorna 200
 * 4. Header Cache-Control: private, max-age=300 na resposta
 */

// Mock next/server before any imports that trigger it
jest.mock('next/server', () => {
  const MockHeaders = class {
    private _map: Map<string, string>;
    constructor(init?: Record<string, string>) {
      // Normalize keys to lowercase on init so lookups are always case-insensitive.
      this._map = new Map(
        Object.entries(init ?? {}).map(([k, v]) => [k.toLowerCase(), v])
      );
    }
    get(name: string) { return this._map.get(name.toLowerCase()) ?? null; }
    set(name: string, v: string) { this._map.set(name.toLowerCase(), v); }
    has(name: string) { return this._map.has(name.toLowerCase()); }
  };

  const MockNextResponse = {
    json: (data: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: new MockHeaders(init?.headers),
      json: async () => data,
    }),
  };

  class MockNextRequest {
    private _headers: InstanceType<typeof MockHeaders>;
    nextUrl: URL;
    constructor(url: URL | string, init?: { headers?: Record<string, string> }) {
      this.nextUrl = typeof url === 'string' ? new URL(url) : url;
      this._headers = new MockHeaders(init?.headers);
    }
    get headers() { return this._headers; }
  }

  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

// Mock do container para isolar o service
jest.mock('@/core/container', () => ({
  transactionService: {
    getMonthlySummary: jest.fn(),
  },
}));

import { NextRequest } from 'next/server';
import { GET } from './route';
import { transactionService } from '@/core/container';

const mockGetMonthlySummary = transactionService.getMonthlySummary as jest.Mock;

function buildRequest(params: { userId?: string; period?: string }): NextRequest {
  const url = new URL(
    `http://localhost/api/transactions/monthly-summary${params.period ? `?period=${params.period}` : ''}`
  );
  const headers: Record<string, string> = {};
  if (params.userId) headers['x-user-id'] = params.userId;
  return new NextRequest(url, { headers });
}

describe('GET /api/transactions/monthly-summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 when x-user-id header is missing', async () => {
    const req = buildRequest({ period: 'last6' });
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should return 400 when period is missing', async () => {
    const req = buildRequest({ userId: 'u1' });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should return 400 for invalid period format', async () => {
    const req = buildRequest({ userId: 'u1', period: 'invalid-period' });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should return 200 with data for valid period "last6"', async () => {
    const data = [{ month: '01', monthLabel: 'Jan', income: 5000, expense: 1200 }];
    mockGetMonthlySummary.mockResolvedValue(data);

    const req = buildRequest({ userId: 'u1', period: 'last6' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockGetMonthlySummary).toHaveBeenCalledWith('u1', 'last6');
    const body = await res.json();
    expect(body.data).toEqual(data);
  });

  it('should return 200 with data for valid period "2025"', async () => {
    const data = [{ month: '03', monthLabel: 'Mar', income: 3000, expense: 800 }];
    mockGetMonthlySummary.mockResolvedValue(data);

    const req = buildRequest({ userId: 'u1', period: '2025' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockGetMonthlySummary).toHaveBeenCalledWith('u1', '2025');
  });

  it('should return 200 with data for valid period "2025-s1"', async () => {
    mockGetMonthlySummary.mockResolvedValue([]);
    const req = buildRequest({ userId: 'u1', period: '2025-s1' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockGetMonthlySummary).toHaveBeenCalledWith('u1', '2025-s1');
  });

  it('should return 200 with data for valid period "2025-s2"', async () => {
    mockGetMonthlySummary.mockResolvedValue([]);
    const req = buildRequest({ userId: 'u1', period: '2025-s2' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockGetMonthlySummary).toHaveBeenCalledWith('u1', '2025-s2');
  });

  it('should set Cache-Control: private, max-age=300 header', async () => {
    mockGetMonthlySummary.mockResolvedValue([]);
    const req = buildRequest({ userId: 'u1', period: 'last6' });
    const res = await GET(req);
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=300');
  });

  it('should return 500 when service throws an unexpected error', async () => {
    mockGetMonthlySummary.mockRejectedValue(new Error('DB down'));
    const req = buildRequest({ userId: 'u1', period: 'last6' });
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
