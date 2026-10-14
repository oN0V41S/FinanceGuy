import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvestmentFormDialog } from '../InvestmentFormDialog';

const history = {
  symbol: 'PETR4',
  currency: 'BRL',
  range: '3mo',
  fetchedAt: '2026-10-06T12:00:00.000Z',
  points: [
    { date: '2026-09-01', close: 36 },
    { date: '2026-09-02', close: 38 },
    { date: '2026-09-03', close: 40 },
  ],
};
const quote = { symbol: 'PETR4', name: 'Petróleo Brasileiro S.A.', price: 41.5, currency: 'BRL', provider: 'brapi', fetchedAt: '2026-10-06T12:00:00.000Z' };

function mockFetch(handlers: { history: boolean; quote: boolean }) {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const isHistory = url.includes('/quotes/history');
    const ok = isHistory ? handlers.history : handlers.quote;
    return { ok, json: async () => ({ data: isHistory ? history : quote }) } as Response;
  }) as jest.Mock;
}

function openMarketForm() {
  render(<InvestmentFormDialog open onOpenChange={jest.fn()} onSubmit={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ativo de mercado' }));
}

describe('InvestmentFormDialog — histórico do ticker', () => {
  it('mostra cotação e gráfico ao digitar um ticker válido e permite usar o preço atual', async () => {
    mockFetch({ history: true, quote: true });
    openMarketForm();

    fireEvent.change(screen.getByLabelText('Ticker'), { target: { value: 'petr4' } });

    expect(await screen.findByTestId('ticker-preview', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByTestId('price-history-chart')).toBeInTheDocument();
    expect(screen.getByText('Petróleo Brasileiro S.A.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Usar preço atual' }));
    expect(screen.getByLabelText(/Preço por unidade/)).toHaveValue(41.5);

    fireEvent.change(screen.getByLabelText('Quantidade comprada'), { target: { value: '10' } });
    expect(screen.getByTestId('total-invested')).toHaveTextContent('415,00');
  });

  it('exibe mensagem amigável e mantém o formulário utilizável quando não há cotação', async () => {
    mockFetch({ history: false, quote: false });
    openMarketForm();

    fireEvent.change(screen.getByLabelText('Ticker'), { target: { value: 'ZZZZ9' } });

    expect(await screen.findByText(/Não encontramos cotação/, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByLabelText('Preço por unidade (BRL)')).toBeEnabled();
  });

  it('não consulta a API enquanto o ticker é inválido/curto', async () => {
    mockFetch({ history: true, quote: true });
    openMarketForm();

    fireEvent.change(screen.getByLabelText('Ticker'), { target: { value: 'P' } });
    await new Promise((resolve) => setTimeout(resolve, 700));

    await waitFor(() => expect(global.fetch).not.toHaveBeenCalled());
  });
});
