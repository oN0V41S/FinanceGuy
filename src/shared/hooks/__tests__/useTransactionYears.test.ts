/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { useTransactionYears } from '../useTransactionYears';

describe('useTransactionYears', () => {
  const currentYear = new Date().getFullYear();
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('busca com cache: no-store para refletir anos recém-criados (ex.: janeiro do ano seguinte)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [currentYear + 1] }),
    });

    renderHook(() => useTransactionYears());

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/transactions/years',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('inclui o ano futuro e mantém o ano atual, em ordem decrescente', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [currentYear + 1] }),
    });

    const { result } = renderHook(() => useTransactionYears());

    await waitFor(() => expect(result.current).toContain(currentYear + 1));
    expect(result.current).toEqual([currentYear + 1, currentYear]);
  });

  it('mantém o ano atual quando a requisição falha', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useTransactionYears());

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(result.current).toEqual([currentYear]);
  });
});
