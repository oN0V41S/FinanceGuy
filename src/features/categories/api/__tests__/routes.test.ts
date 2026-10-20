/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { GET, POST } from '../route';
import { PATCH, DELETE } from '../[id]/route';
import { categoriesService } from '@/core/container';
import { CategoryError } from '../../categories.service';

jest.mock('@/core/container', () => ({
  categoriesService: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

const svc = categoriesService as unknown as Record<string, jest.Mock>;
const userId = 'user-1';
const ctx = { params: Promise.resolve({ id: 'cat-1' }) };

const req = (url: string, method: string, body?: unknown, withUser = true) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: withUser ? { 'x-user-id': userId } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe('Categories API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  describe('GET /api/categories', () => {
    it('returns 401 without x-user-id', async () => {
      const res = await GET(req('/api/categories', 'GET', undefined, false));
      expect(res.status).toBe(401);
    });

    it('lists categories for the user', async () => {
      svc.list.mockResolvedValue([{ id: 'c' }]);
      const res = await GET(req('/api/categories', 'GET'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: [{ id: 'c' }] });
      expect(svc.list).toHaveBeenCalledWith(userId, undefined);
    });

    it('forwards a valid type filter and rejects an invalid one', async () => {
      svc.list.mockResolvedValue([]);
      await GET(req('/api/categories?type=income', 'GET'));
      expect(svc.list).toHaveBeenCalledWith(userId, 'income');

      const bad = await GET(req('/api/categories?type=foo', 'GET'));
      expect(bad.status).toBe(400);
    });
  });

  describe('POST /api/categories', () => {
    it('returns 400 (not 500) on malformed JSON', async () => {
      const bad = new NextRequest('http://localhost/api/categories', {
        method: 'POST',
        headers: { 'x-user-id': userId },
        body: '{oops',
      });
      const res = await POST(bad);
      expect(res.status).toBe(400);
      expect(svc.create).not.toHaveBeenCalled();
    });

    it('PATCH returns 400 on malformed JSON', async () => {
      const bad = new NextRequest('http://localhost/api/categories/cat-1', {
        method: 'PATCH',
        headers: { 'x-user-id': userId },
        body: '{oops',
      });
      const res = await PATCH(bad, ctx);
      expect(res.status).toBe(400);
      expect(svc.update).not.toHaveBeenCalled();
    });

    it('returns 401 without x-user-id', async () => {
      const res = await POST(req('/api/categories', 'POST', { name: 'X' }, false));
      expect(res.status).toBe(401);
    });

    it('creates and returns 201', async () => {
      svc.create.mockResolvedValue({ id: 'c', name: 'Pets' });
      const res = await POST(req('/api/categories', 'POST', { name: 'Pets' }));
      expect(res.status).toBe(201);
      expect(svc.create).toHaveBeenCalledWith({ name: 'Pets' }, userId);
    });

    it('maps ZodError to 400', async () => {
      svc.create.mockRejectedValue(new ZodError([]));
      const res = await POST(req('/api/categories', 'POST', {}));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Validação falhou');
    });

    it('maps DUPLICATE to 409 and LIMIT to 422', async () => {
      svc.create.mockRejectedValueOnce(new CategoryError('DUPLICATE', 'Já existe'));
      expect((await POST(req('/api/categories', 'POST', { name: 'a' }))).status).toBe(409);

      svc.create.mockRejectedValueOnce(new CategoryError('LIMIT', 'Limite'));
      expect((await POST(req('/api/categories', 'POST', { name: 'a' }))).status).toBe(422);
    });

    it('returns a calm 500 message without leaking internals', async () => {
      svc.create.mockRejectedValue(new Error('prisma exploded at db.internal'));
      const res = await POST(req('/api/categories', 'POST', { name: 'a' }));
      expect(res.status).toBe(500);
      expect(JSON.stringify(await res.json())).not.toContain('prisma');
    });
  });

  describe('PATCH /api/categories/[id]', () => {
    it('returns 401 without x-user-id', async () => {
      const res = await PATCH(req('/api/categories/cat-1', 'PATCH', { name: 'x' }, false), ctx);
      expect(res.status).toBe(401);
    });

    it('updates and returns 200', async () => {
      svc.update.mockResolvedValue({ id: 'cat-1', name: 'Novo' });
      const res = await PATCH(req('/api/categories/cat-1', 'PATCH', { name: 'Novo' }), ctx);
      expect(res.status).toBe(200);
      expect(svc.update).toHaveBeenCalledWith('cat-1', { name: 'Novo' }, userId);
    });

    it('maps NOT_FOUND to 404 (IDOR: other user\'s id behaves as missing) and FORBIDDEN to 403', async () => {
      svc.update.mockRejectedValueOnce(new CategoryError('NOT_FOUND', 'nf'));
      expect((await PATCH(req('/api/categories/cat-1', 'PATCH', { name: 'x' }), ctx)).status).toBe(404);

      svc.update.mockRejectedValueOnce(new CategoryError('FORBIDDEN', 'no'));
      expect((await PATCH(req('/api/categories/cat-1', 'PATCH', { name: 'x' }), ctx)).status).toBe(403);
    });
  });

  describe('DELETE /api/categories/[id]', () => {
    it('returns 401 without x-user-id', async () => {
      const res = await DELETE(req('/api/categories/cat-1', 'DELETE', undefined, false), ctx);
      expect(res.status).toBe(401);
    });

    it('deletes and reports how many transactions moved', async () => {
      svc.remove.mockResolvedValue({ moved: 3 });
      const res = await DELETE(req('/api/categories/cat-1?reassignTo=cat-2', 'DELETE'), ctx);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { success: true, moved: 3 } });
      expect(svc.remove).toHaveBeenCalledWith('cat-1', { reassignTo: 'cat-2' }, userId);
    });

    it('maps default category to 403 and REASSIGN_REQUIRED to 409 with transactionCount', async () => {
      svc.remove.mockRejectedValueOnce(new CategoryError('FORBIDDEN', 'padrão'));
      expect((await DELETE(req('/api/categories/cat-1', 'DELETE'), ctx)).status).toBe(403);

      svc.remove.mockRejectedValueOnce(
        new CategoryError('REASSIGN_REQUIRED', 'mova', { transactionCount: 4 })
      );
      const res = await DELETE(req('/api/categories/cat-1', 'DELETE'), ctx);
      expect(res.status).toBe(409);
      expect((await res.json()).details).toEqual({ transactionCount: 4 });
    });
  });
});
