import { renderHook, act } from '@testing-library/react';
import { useAiProfile } from '../useAiProfile';

function res(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

describe('useAiProfile', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    if (typeof global.fetch !== 'function') global.fetch = jest.fn() as unknown as typeof fetch;
    fetchSpy = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchSpy.mockRestore());

  it('carrega e salva o perfil, exibindo o erro do servidor', async () => {
    fetchSpy.mockResolvedValueOnce(res({ profile: 'Sou dev' }));
    const { result } = renderHook(() => useAiProfile());
    await act(async () => result.current.load());
    expect(result.current.profile).toBe('Sou dev');

    fetchSpy.mockResolvedValueOnce(res({ error: 'A descrição deve ter no máximo 2000 caracteres' }, 400));
    let ok = true;
    await act(async () => { ok = await result.current.save('x'); });
    expect(ok).toBe(false);
    expect(result.current.error).toMatch(/2000/);

    fetchSpy.mockResolvedValueOnce(res({ profile: 'Novo' }));
    await act(async () => { ok = await result.current.save(' Novo '); });
    expect(ok).toBe(true);
    expect(result.current.profile).toBe('Novo');
    expect(result.current.error).toBeNull();
  });

  it('mostra erro calmo quando o carregamento falha', async () => {
    fetchSpy.mockRejectedValue(new Error('rede'));
    const { result } = renderHook(() => useAiProfile());
    await act(async () => result.current.load());
    expect(result.current.error).toMatch(/não foi possível carregar/i);
    expect(result.current.isBusy).toBe(false);
  });
});
