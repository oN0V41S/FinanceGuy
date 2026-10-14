/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const mockSvc = {
  listSessions: jest.fn(),
  renameSession: jest.fn(),
  deleteSession: jest.fn(),
  activateSession: jest.fn(),
  getProfile: jest.fn(),
  setProfile: jest.fn(),
};

jest.mock('@/core/container', () => ({
  get aiSessionService() {
    return mockSvc;
  },
}));

import { GET, PATCH, DELETE, activate } from '../sessions.route';
import { GET as PROFILE_GET, PUT as PROFILE_PUT } from '../profile.route';

const USER = { 'x-user-id': 'user-1' };
const params = (id: string) => ({ params: Promise.resolve({ id }) });

function req(method: string, body?: unknown, headers: Record<string, string> = USER) {
  return new NextRequest('http://localhost/api/ai/x', {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('rotas de conversas', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET /sessions: 401 sem usuário', async () => {
    expect((await GET(req('GET', undefined, {}))).status).toBe(401);
    expect(mockSvc.listSessions).not.toHaveBeenCalled();
  });

  it('GET /sessions: lista só do usuário do header', async () => {
    mockSvc.listSessions.mockResolvedValue([{ id: 's1', title: 'a', active: true, updatedAt: 'x' }]);
    const res = await GET(req('GET'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect((await res.json()).sessions).toHaveLength(1);
    expect(mockSvc.listSessions).toHaveBeenCalledWith('user-1');
  });

  it('PATCH renomeia com título válido', async () => {
    mockSvc.renameSession.mockResolvedValue(true);
    const res = await PATCH(req('PATCH', { title: '  Meu título ' }), params('s1'));
    expect(res.status).toBe(200);
    expect(mockSvc.renameSession).toHaveBeenCalledWith('user-1', 's1', 'Meu título');
  });

  it.each([[{ title: '' }], [{ title: '   ' }], [{ title: 'x'.repeat(61) }], [{}]])('PATCH 400 para %j', async (body) => {
    const res = await PATCH(req('PATCH', body), params('s1'));
    expect(res.status).toBe(400);
    expect(mockSvc.renameSession).not.toHaveBeenCalled();
  });

  it('PATCH 404 quando a conversa não é do usuário', async () => {
    mockSvc.renameSession.mockResolvedValue(false);
    expect((await PATCH(req('PATCH', { title: 'ok' }), params('outra'))).status).toBe(404);
  });

  it('DELETE exclui e devolve 404 quando não existe', async () => {
    mockSvc.deleteSession.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await DELETE(req('DELETE'), params('s1'))).status).toBe(200);
    expect((await DELETE(req('DELETE'), params('s2'))).status).toBe(404);
    expect(mockSvc.deleteSession).toHaveBeenCalledWith('user-1', 's1');
  });

  it('activate devolve a sessão ou 404', async () => {
    mockSvc.activateSession.mockResolvedValueOnce({ sessionId: 's1', messages: [] }).mockResolvedValueOnce(null);
    const ok = await activate(req('POST'), params('s1'));
    expect(ok.status).toBe(200);
    expect((await ok.json()).sessionId).toBe('s1');
    expect((await activate(req('POST'), params('x'))).status).toBe(404);
  });

  it('id longo demais vira 404 sem tocar no serviço', async () => {
    expect((await DELETE(req('DELETE'), params('x'.repeat(65)))).status).toBe(404);
    expect(mockSvc.deleteSession).not.toHaveBeenCalled();
  });
});

describe('rotas de perfil', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET devolve a descrição', async () => {
    mockSvc.getProfile.mockResolvedValue('Sou dev');
    const res = await PROFILE_GET(req('GET'));
    expect(await res.json()).toEqual({ profile: 'Sou dev' });
    expect(mockSvc.getProfile).toHaveBeenCalledWith('user-1');
  });

  it('PUT salva texto aparado e aceita limpar', async () => {
    mockSvc.setProfile.mockResolvedValue(undefined);
    expect((await PROFILE_PUT(req('PUT', { profile: '  Quero poupar  ' }))).status).toBe(200);
    expect(mockSvc.setProfile).toHaveBeenCalledWith('user-1', 'Quero poupar');
    expect((await PROFILE_PUT(req('PUT', { profile: '' }))).status).toBe(200);
    expect(mockSvc.setProfile).toHaveBeenLastCalledWith('user-1', '');
  });

  it('PUT 400 acima de 2000 caracteres e 401 sem usuário', async () => {
    expect((await PROFILE_PUT(req('PUT', { profile: 'a'.repeat(2001) }))).status).toBe(400);
    expect((await PROFILE_PUT(req('PUT', { profile: 'ok' }, {}))).status).toBe(401);
    expect(mockSvc.setProfile).not.toHaveBeenCalled();
  });

  it('PUT aceita 2000 caracteres multibyte (corpo maior que 4 KB)', async () => {
    mockSvc.setProfile.mockResolvedValue(undefined);
    expect((await PROFILE_PUT(req('PUT', { profile: 'ã'.repeat(2000) }))).status).toBe(200);
  });
});
