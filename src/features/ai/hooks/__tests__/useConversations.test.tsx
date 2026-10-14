import { renderHook, act } from '@testing-library/react';
import { useConversations } from '../useConversations';

function res(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

describe('useConversations', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    if (typeof global.fetch !== 'function') global.fetch = jest.fn() as unknown as typeof fetch;
    fetchSpy = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchSpy.mockRestore());

  it('carrega a lista e ignora itens malformados', async () => {
    fetchSpy.mockResolvedValue(res({ sessions: [{ id: 'a', title: 't', active: true, updatedAt: 'x' }, { nope: 1 }] }));
    const { result } = renderHook(() => useConversations());
    await act(async () => result.current.refresh());
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('mostra erro calmo quando a lista falha', async () => {
    fetchSpy.mockRejectedValue(new Error('rede'));
    const { result } = renderHook(() => useConversations());
    await act(async () => result.current.refresh());
    expect(result.current.error).toMatch(/não foi possível carregar/i);
  });

  it('renomeia e exclui atualizando a lista local', async () => {
    fetchSpy.mockResolvedValueOnce(res({ sessions: [{ id: 'a', title: 'x', active: true, updatedAt: '' }] }));
    const { result } = renderHook(() => useConversations());
    await act(async () => result.current.refresh());

    fetchSpy.mockResolvedValueOnce(res({ ok: true }));
    let ok = false;
    await act(async () => { ok = await result.current.rename('a', '  Novo ');});
    expect(ok).toBe(true);
    expect(result.current.sessions[0].title).toBe('Novo');
    expect(fetchSpy).toHaveBeenLastCalledWith('/api/ai/sessions/a', expect.objectContaining({ method: 'PATCH' }));

    fetchSpy.mockResolvedValueOnce(res({ error: 'x' }, 500));
    await act(async () => { ok = await result.current.remove('a');});
    expect(ok).toBe(false);
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.error).toMatch(/excluir/i);

    fetchSpy.mockResolvedValueOnce(res({ ok: true }));
    await act(async () => { ok = await result.current.remove('a');});
    expect(result.current.sessions).toHaveLength(0);
  });

  it('não chama a API para título vazio', async () => {
    const { result } = renderHook(() => useConversations());
    let ok = true;
    await act(async () => { ok = await result.current.rename('a', '   ');});
    expect(ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
