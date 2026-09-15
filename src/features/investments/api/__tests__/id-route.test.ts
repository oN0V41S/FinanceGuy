/**
 * @jest-environment node
 */
import { PUT, DELETE } from '../[id]/route';
import { NextRequest } from 'next/server';
import { investmentService } from '@/core/container';

jest.mock('@/core/container', () => ({
  investmentService: {
    updateInvestment: jest.fn(),
    deleteInvestment: jest.fn(),
  },
}));

describe('Investments API [id] - PUT & DELETE', () => {
  const userId = 'user-1';
  const investmentId = 'inv-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /api/investments/[id]', () => {
    it('returns 401 when x-user-id header is missing', async () => {
      const request = new NextRequest(`http://localhost/api/investments/${investmentId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Novo nome' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: investmentId }) });
      expect(response.status).toBe(401);
    });

    it('updates the investment and returns 200', async () => {
      const updated = { id: investmentId, name: 'Novo nome' };
      (investmentService.updateInvestment as jest.Mock).mockResolvedValue(updated);

      const request = new NextRequest(`http://localhost/api/investments/${investmentId}`, {
        method: 'PUT',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({ name: 'Novo nome' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: investmentId }) });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ data: updated });
      expect(investmentService.updateInvestment).toHaveBeenCalledWith(investmentId, { name: 'Novo nome' }, userId);
    });

    it('returns 400 on Zod validation errors', async () => {
      const zodError = new Error('Validation failed');
      zodError.name = 'ZodError';
      (zodError as any).errors = [{ message: 'Invalid' }];
      (investmentService.updateInvestment as jest.Mock).mockRejectedValue(zodError);

      const request = new NextRequest(`http://localhost/api/investments/${investmentId}`, {
        method: 'PUT',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({ value: -1 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: investmentId }) });
      expect(response.status).toBe(400);
    });

    it('returns 404 when investment is not found or not owned by user', async () => {
      (investmentService.updateInvestment as jest.Mock).mockRejectedValue(
        new Error('Investimento não encontrado.')
      );

      const request = new NextRequest(`http://localhost/api/investments/${investmentId}`, {
        method: 'PUT',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({ name: 'x' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: investmentId }) });
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Investimento não encontrado.');
    });

    it('returns 500 on unexpected errors', async () => {
      (investmentService.updateInvestment as jest.Mock).mockRejectedValue(new Error('DB down'));
      const request = new NextRequest(`http://localhost/api/investments/${investmentId}`, {
        method: 'PUT',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({ name: 'x' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: investmentId }) });
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/investments/[id]', () => {
    it('returns 401 when x-user-id header is missing', async () => {
      const request = new NextRequest(`http://localhost/api/investments/${investmentId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: investmentId }) });
      expect(response.status).toBe(401);
    });

    it('deletes the investment and returns 200', async () => {
      (investmentService.deleteInvestment as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest(`http://localhost/api/investments/${investmentId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId },
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: investmentId }) });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ data: { success: true } });
      expect(investmentService.deleteInvestment).toHaveBeenCalledWith(investmentId, userId);
    });

    it('returns 404 when investment is not found or not owned by user', async () => {
      (investmentService.deleteInvestment as jest.Mock).mockRejectedValue(
        new Error('Investimento não encontrado.')
      );

      const request = new NextRequest(`http://localhost/api/investments/${investmentId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId },
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: investmentId }) });
      expect(response.status).toBe(404);
    });

    it('returns 500 on unexpected errors', async () => {
      (investmentService.deleteInvestment as jest.Mock).mockRejectedValue(new Error('DB down'));
      const request = new NextRequest(`http://localhost/api/investments/${investmentId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId },
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: investmentId }) });
      expect(response.status).toBe(500);
    });
  });
});
