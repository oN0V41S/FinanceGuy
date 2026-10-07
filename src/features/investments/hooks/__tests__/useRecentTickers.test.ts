import { act, renderHook } from '@testing-library/react';
import { useRecentTickers } from '../useRecentTickers';

describe('useRecentTickers', () => {
  beforeEach(() => window.localStorage.clear());

  it('guarda o ticker mais recente primeiro, sem duplicar', () => {
    const { result } = renderHook(() => useRecentTickers());
    act(() => result.current.add({ ticker: 'petr4', market: 'BR' }));
    act(() => result.current.add({ ticker: 'AAPL', market: 'US' }));
    act(() => result.current.add({ ticker: 'PETR4', market: 'BR' }));
    expect(result.current.recent.map((r) => r.ticker)).toEqual(['PETR4', 'AAPL']);
  });

  it('limita a 6 itens e persiste entre montagens', () => {
    const { result } = renderHook(() => useRecentTickers());
    for (let i = 0; i < 8; i++) act(() => result.current.add({ ticker: `T${i}`, market: 'US' }));
    expect(result.current.recent).toHaveLength(6);
    const again = renderHook(() => useRecentTickers());
    expect(again.result.current.recent[0].ticker).toBe('T7');
  });

  it('ignora dados corrompidos e permite limpar', () => {
    window.localStorage.setItem('financeguy:recent-tickers', '{oops');
    const { result } = renderHook(() => useRecentTickers());
    expect(result.current.recent).toEqual([]);
    act(() => result.current.add({ ticker: 'VALE3', market: 'BR' }));
    act(() => result.current.clear());
    expect(result.current.recent).toEqual([]);
  });
});
