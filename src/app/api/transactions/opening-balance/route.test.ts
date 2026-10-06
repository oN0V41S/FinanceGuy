/**
 * @jest-environment node
 *
 * TDD — GET /api/transactions/opening-balance (issue #30)
 *
 * Contrato:
 * 1. Sem x-user-id → 401
 * 2. `before` ausente ou fora de YYYY-MM-DD (ou data inexistente) → 400
 * 3. type/paid inválidos → 400
 * 4. Válido → 200 { data: number } e service chamado com userId do header
 *    (nunca do query string) + filtros repassados
 * 5. Erro do service → 500 com mensagem genérica (sem vazar detalhes)
 */
import { NextRequest } from 'next/server';
import { GET } from './route';
import { transactionService } from '@/core/container';

jest.mock('@/core/container', () => ({
  transactionService: {
    getOpeningBalance: jest.fn(),
  },
}));

const mockGetOpeningBalance = transactionService.getOpeningBalance as jest.Mock;

function buildRequest(query: string, userId?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (userId) headers['x-user-id'] = userId;
  return new NextRequest(`http://localhost/api/transactions/opening-balance${query}`, { headers });
}

describe('GET /api/transactions/opening-balance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('401 quando x-user-id está ausente', async () => {
    const res = await GET(buildRequest('?before=2025-10-01'));
    expect(res.status).toBe(401);
    expect(mockGetOpeningBalance).not.toHaveBeenCalled();
  });

  it.each([
    ['ausente', ''],
    ['formato inválido', '?before=01/10/2025'],
    ['data inexistente', '?before=2025-02-31'],
  ])('400 quando before é %s', async (_label, query) => {
    const res = await GET(buildRequest(query, 'u1'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeDefined();
    expect(mockGetOpeningBalance).not.toHaveBeenCalled();
  });

  it('400 quando type é inválido', async () => {
    const res = await GET(buildRequest('?before=2025-10-01&type=transfer', 'u1'));
    expect(res.status).toBe(400);
  });

  it('400 quando paid é inválido', async () => {
    const res = await GET(buildRequest('?before=2025-10-01&paid=talvez', 'u1'));
    expect(res.status).toBe(400);
  });

  it('200 com { data } e repassa userId do header + filtros ao service', async () => {
    mockGetOpeningBalance.mockResolvedValue({ data: 1500.25, fromCache: false });

    const res = await GET(
      buildRequest(
        '?before=2025-10-01&type=expense&category=Casa&search=luz&paid=false&userId=hacker',
        'u1',
      ),
    );

    expect(res.status).toBe(200);
    expect((await res.json()).data).toBe(1500.25);
    expect(mockGetOpeningBalance).toHaveBeenCalledWith({
      userId: 'u1',
      before: '2025-10-01',
      type: 'expense',
      category: 'Casa',
      search: 'luz',
      paid: false,
    });
  });

  it('200 com filtros omitidos: apenas userId e before são enviados', async () => {
    mockGetOpeningBalance.mockResolvedValue({ data: 0, fromCache: true });

    const res = await GET(buildRequest('?before=2025-10-16', 'u1'));

    expect(res.status).toBe(200);
    expect(mockGetOpeningBalance).toHaveBeenCalledWith({ userId: 'u1', before: '2025-10-16' });
    expect(res.headers.get('X-Cache')).toBe('HIT');
  });

  it('emite Cache-Control privado', async () => {
    mockGetOpeningBalance.mockResolvedValue({ data: 0, fromCache: false });

    const res = await GET(buildRequest('?before=2025-10-01', 'u1'));

    expect(res.headers.get('Cache-Control')).toBe('private, max-age=300');
  });

  it('500 genérico quando o service falha (sem vazar a mensagem interna)', async () => {
    mockGetOpeningBalance.mockRejectedValue(new Error('connection string postgres://secret'));

    const res = await GET(buildRequest('?before=2025-10-01', 'u1'));

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('secret');
  });
});
