/**
 * @jest-environment node
 */
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { goalService } from '@/core/container';

jest.mock('@/core/container', () => ({
  goalService: {
    getAllGoals: jest.fn(),
    createGoal: jest.fn(),
  },
}));

describe('Goals API - GET & POST', () => {
  const userId = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/goals', () => {
    it('returns 401 when x-user-id header is missing', async () => {
      const request = new NextRequest('http://localhost/api/goals', { method: 'GET' });
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('returns the list of goals for the authenticated user', async () => {
      const goals = [{ id: 'goal-1', name: 'Viagem' }];
      (goalService.getAllGoals as jest.Mock).mockResolvedValue(goals);

      const request = new NextRequest('http://localhost/api/goals', {
        method: 'GET',
        headers: { 'x-user-id': userId },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ data: goals });
      expect(goalService.getAllGoals).toHaveBeenCalledWith(userId);
    });

    it('returns 500 on unexpected errors', async () => {
      (goalService.getAllGoals as jest.Mock).mockRejectedValue(new Error('DB down'));
      const request = new NextRequest('http://localhost/api/goals', {
        method: 'GET',
        headers: { 'x-user-id': userId },
      });
      const response = await GET(request);
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/goals', () => {
    const validBody = {
      name: 'Viagem para o Japão',
      targetValue: 20000,
      currentValue: 5000,
      deadlineLabel: '6 meses restantes',
    };

    it('returns 401 when x-user-id header is missing', async () => {
      const request = new NextRequest('http://localhost/api/goals', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('creates a goal and returns 201', async () => {
      const created = { id: 'goal-1', ...validBody };
      (goalService.createGoal as jest.Mock).mockResolvedValue(created);

      const request = new NextRequest('http://localhost/api/goals', {
        method: 'POST',
        headers: { 'x-user-id': userId },
        body: JSON.stringify(validBody),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toEqual({ data: created });
      expect(goalService.createGoal).toHaveBeenCalledWith(validBody, userId);
    });

    it('returns 400 when validation fails', async () => {
      const zodError = new Error('Validation failed');
      zodError.name = 'ZodError';
      (zodError as any).errors = [{ message: 'Invalid' }];
      (goalService.createGoal as jest.Mock).mockRejectedValue(zodError);

      const request = new NextRequest('http://localhost/api/goals', {
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
      (goalService.createGoal as jest.Mock).mockRejectedValue(new Error('DB down'));
      const request = new NextRequest('http://localhost/api/goals', {
        method: 'POST',
        headers: { 'x-user-id': userId },
        body: JSON.stringify(validBody),
      });
      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
