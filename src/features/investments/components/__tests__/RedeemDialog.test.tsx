import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RedeemDialog } from '../RedeemDialog';
import type { Investment } from '@/features/investments/validations';

const investment: Investment = {
  id: 'inv-1',
  name: 'Petrobras',
  type: 'Renda Variável',
  value: 350,
  ticker: 'PETR4',
  market: 'BR',
  currency: 'BRL',
  unitPrice: 35,
  shares: 10,
  status: 'ACTIVE',
};

const previewData = {
  quantity: 10,
  grossValue: 400,
  cost: 350,
  profit: 50,
  taxRate: 15,
  taxValue: 7.5,
  netValue: 392.5,
  remainingQuantity: 0,
  isTotal: true,
  unitPrice: 40,
  isEstimate: true,
};

function mockFetch(handlers: Record<string, () => { ok: boolean; body: unknown }>) {
  global.fetch = jest.fn(async (url: RequestInfo | URL) => {
    const key = Object.keys(handlers).find((k) => String(url).endsWith(k));
    const { ok, body } = key ? handlers[key]() : { ok: false, body: { error: 'sem rota' } };
    return { ok, json: async () => body } as Response;
  }) as unknown as typeof fetch;
}

describe('RedeemDialog', () => {
  it('simulates the redeem and shows estimated tax before confirming', async () => {
    mockFetch({ '/redeem/preview': () => ({ ok: true, body: { data: previewData } }) });
    render(<RedeemDialog open onOpenChange={jest.fn()} investment={investment} onRedeemed={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Confirmar resgate' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Simular' }));

    const preview = await screen.findByTestId('redeem-preview');
    expect(preview).toHaveTextContent('Imposto estimado (15%)');
    expect(preview).toHaveTextContent('392,50');
    expect(screen.getByRole('button', { name: 'Confirmar resgate' })).toBeEnabled();
  });

  it('confirms the redeem, notifies and closes', async () => {
    mockFetch({
      '/redeem/preview': () => ({ ok: true, body: { data: previewData } }),
      '/redeem': () => ({ ok: true, body: { data: { id: 'h1' } } }),
    });
    const onRedeemed = jest.fn();
    const onOpenChange = jest.fn();
    render(<RedeemDialog open onOpenChange={onOpenChange} investment={investment} onRedeemed={onRedeemed} />);

    await userEvent.click(screen.getByRole('button', { name: 'Simular' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar resgate' }));

    await waitFor(() => expect(onRedeemed).toHaveBeenCalled());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows a friendly message when the quote is unavailable', async () => {
    mockFetch({
      '/redeem/preview': () => ({
        ok: false,
        body: { error: 'Não foi possível obter a cotação agora. Tente novamente em instantes.' },
      }),
    });
    render(<RedeemDialog open onOpenChange={jest.fn()} investment={investment} onRedeemed={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Simular' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível obter a cotação');
    expect(screen.queryByTestId('redeem-preview')).not.toBeInTheDocument();
  });

  it('blocks invalid tax rate without calling the API', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    render(<RedeemDialog open onOpenChange={jest.fn()} investment={investment} onRedeemed={jest.fn()} />);

    const tax = screen.getByLabelText('Alíquota de imposto (%)');
    await userEvent.clear(tax);
    await userEvent.type(tax, '150');
    await userEvent.click(screen.getByRole('button', { name: 'Simular' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Alíquota deve estar entre 0 e 100');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
