/**
 * @jest-environment node
 */
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { investmentService } from '@/core/container';

jest.mock('@/core/container', () => ({
  investmentService: {
    getAllInvestments: jest.fn(),
    createInvestment: jest.fn(),
  },
}));

describe('Investments API - GET & POST', () => {
  const userId = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/investments', () => {
    it('returns 401 when x-user-id header is missing', async () => {
      const request = new NextRequest('http://localhost/api/investments', { method: 'GET' });
      const response = await GET(request);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('returns the list of investments for the authenticated user', async () => {
      const investments = [{ id: 'inv-1', name: 'Tesouro Selic' }];
      (investmentService.getAllInvestments as jest.Mock).mockResolvedValue(investments);

      const request = new NextRequest('http://localhost/api/investments', {
        method: 'GET',
        headers: { 'x-user-id': userId },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ data: investments });
      expect(investmentService.getAllInvestments).toHaveBeenCalledWith(userId);
    });

    it('returns 500 on unexpected errors', async () => {
      (investmentService.getAllInvestments as jest.Mock).mockRejectedValue(new Error('DB down'));
      const request = new NextRequest('http://localhost/api/investments', {
        method: 'GET',
        headers: { 'x-user-id': userId },
      });
      const response = await GET(request);
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/investments', () => {
    const validBody = {
      name: 'Tesouro Selic',
      type: 'Renda Fixa',
      value: 1000,
      quantity: '10 cotas',
      term: '2 anos',
    };

    it('returns 401 when x-user-id header is missing', async () => {
      const request = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('creates an investment and returns 201', async () => {
      const created = { id: 'inv-1', ...validBody };
      (investmentService.createInvestment as jest.Mock).mockResolvedValue(created);

      const request = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        headers: { 'x-user-id': userId },
        body: JSON.stringify(validBody),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toEqual({ data: created });
      expect(investmentService.createInvestment).toHaveBeenCalledWith(validBody, userId);
    });

    it('returns 400 when validation fails', async () => {
      const zodError = new Error('Validation failed');
      zodError.name = 'ZodError';
      (zodError as any).errors = [{ message: 'Invalid' }];
      (investmentService.createInvestment as jest.Mock).mockRejectedValue(zodError);

      const request = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({ name: '' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validação falhou');
      expect(data.details).toBeDefined();
    });

    it('returns 500 on unexpected errors', async () => {
      (investmentService.createInvestment as jest.Mock).mockRejectedValue(new Error('DB down'));
      const request = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        headers: { 'x-user-id': userId },
        body: JSON.stringify(validBody),
      });
      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
