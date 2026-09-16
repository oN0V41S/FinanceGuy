/**
 * @jest-environment node
 */
import { PUT, DELETE } from '../[id]/route';
import { NextRequest } from 'next/server';
import { goalService } from '@/core/container';

jest.mock('@/core/container', () => ({
  goalService: {
    updateGoal: jest.fn(),
    deleteGoal: jest.fn(),
  },
}));

describe('Goals API [id] - PUT & DELETE', () => {
  const userId = 'user-1';
  const goalId = 'goal-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /api/goals/[id]', () => {
    it('returns 401 when x-user-id header is missing', async () => {
      const request = new NextRequest(`http://localhost/api/goals/${goalId}`, {
        method: 'PUT',
        body: JSON.stringify({ currentValue: 1000 }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: goalId }) });
      expect(response.status).toBe(401);
    });

    it('updates the goal and returns 200', async () => {
      const updated = { id: goalId, currentValue: 1000 };
      (goalService.updateGoal as jest.Mock).mockResolvedValue(updated);

      const request = new NextRequest(`http://localhost/api/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({ currentValue: 1000 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: goalId }) });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ data: updated });
      expect(goalService.updateGoal).toHaveBeenCalledWith(goalId, { currentValue: 1000 }, userId);
    });

    it('returns 400 on Zod validation errors', async () => {
      const zodError = new Error('Validation failed');
      zodError.name = 'ZodError';
      (zodError as any).errors = [{ message: 'Invalid' }];
      (goalService.updateGoal as jest.Mock).mockRejectedValue(zodError);

      const request = new NextRequest(`http://localhost/api/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({ targetValue: -1 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: goalId }) });
      expect(response.status).toBe(400);
    });

    it('returns 404 when goal is not found or not owned by user', async () => {
      (goalService.updateGoal as jest.Mock).mockRejectedValue(new Error('Meta não encontrada.'));

      const request = new NextRequest(`http://localhost/api/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({ currentValue: 1 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: goalId }) });
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Meta não encontrada.');
    });

    it('returns 500 on unexpected errors', async () => {
      (goalService.updateGoal as jest.Mock).mockRejectedValue(new Error('DB down'));
      const request = new NextRequest(`http://localhost/api/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({ currentValue: 1 }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: goalId }) });
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/goals/[id]', () => {
    it('returns 401 when x-user-id header is missing', async () => {
      const request = new NextRequest(`http://localhost/api/goals/${goalId}`, { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: goalId }) });
      expect(response.status).toBe(401);
    });

    it('deletes the goal and returns 200', async () => {
      (goalService.deleteGoal as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest(`http://localhost/api/goals/${goalId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId },
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: goalId }) });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ data: { success: true } });
      expect(goalService.deleteGoal).toHaveBeenCalledWith(goalId, userId);
    });

    it('returns 404 when goal is not found or not owned by user', async () => {
      (goalService.deleteGoal as jest.Mock).mockRejectedValue(new Error('Meta não encontrada.'));

      const request = new NextRequest(`http://localhost/api/goals/${goalId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId },
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: goalId }) });
      expect(response.status).toBe(404);
    });

    it('returns 500 on unexpected errors', async () => {
      (goalService.deleteGoal as jest.Mock).mockRejectedValue(new Error('DB down'));
      const request = new NextRequest(`http://localhost/api/goals/${goalId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId },
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: goalId }) });
      expect(response.status).toBe(500);
    });
  });
});
