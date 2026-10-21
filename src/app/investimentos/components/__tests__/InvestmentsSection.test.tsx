import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvestmentsSection } from '../InvestmentsSection';

// recharts usa ResizeObserver (indisponível no jsdom): o donut é coberto no
// teste unitário do próprio PortfolioByCategory.
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => null,
  Tooltip: () => null,
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function makeResponse(data: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => data };
}

const investment = {
  id: '1',
  name: 'Tesouro Selic',
  type: 'Renda Fixa',
  value: 1000,
};

const bitcoin = {
  id: '2',
  name: 'Bitcoin',
  type: 'Renda Variável',
  value: 500,
  categoryId: 'c-cripto',
  status: 'ACTIVE',
};

beforeEach(() => {
  mockFetch.mockReset();
});

describe('InvestmentsSection', () => {
  it('renders empty state when there are no investments', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: [] }));
    render(<InvestmentsSection />);

    expect(await screen.findByText('Nenhum investimento cadastrado')).toBeInTheDocument();
  });

  it('renders investment cards when data is available', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: [investment] }));
    render(<InvestmentsSection />);

    expect(await screen.findByText('Tesouro Selic')).toBeInTheDocument();
  });

  it('opens the create dialog when clicking "Novo investimento"', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: [] }));
    render(<InvestmentsSection />);
    await screen.findByText('Nenhum investimento cadastrado');

    fireEvent.click(screen.getByRole('button', { name: /Novo investimento/i }));
    expect(screen.getByText('Novo investimento', { selector: 'h2' })).toBeInTheDocument();
  });

  it('opens delete confirmation and deletes an investment', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/categories')) return Promise.resolve(makeResponse({ data: [] }));
      return Promise.resolve(makeResponse({ data: [investment] }));
    });
    render(<InvestmentsSection />);
    await screen.findByText('Tesouro Selic');

    fireEvent.click(screen.getByLabelText('Excluir investimento'));
    expect(await screen.findByText('Excluir investimento', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText(/Tem certeza que deseja excluir "Tesouro Selic"/)).toBeInTheDocument();

    mockFetch.mockResolvedValueOnce(makeResponse({ data: { success: true } }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(screen.queryByText('Tesouro Selic')).not.toBeInTheDocument());
  });

  it('does not delete when the confirmation dialog is cancelled', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/categories')) return Promise.resolve(makeResponse({ data: [] }));
      return Promise.resolve(makeResponse({ data: [investment] }));
    });
    render(<InvestmentsSection />);
    await screen.findByText('Tesouro Selic');

    fireEvent.click(screen.getByLabelText('Excluir investimento'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(screen.getByText('Tesouro Selic')).toBeInTheDocument();
    const deleteCalls = mockFetch.mock.calls.filter(([url]) => String(url).includes('/api/investments/'));
    expect(deleteCalls).toHaveLength(0);
  });

  it('renderiza o painel "Carteira por categoria" e filtra a grade ao clicar no chip', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/categories')) {
        return Promise.resolve(
          makeResponse({
            data: [
              {
                id: 'c-rf',
                name: 'Renda Fixa',
                type: 'both',
                color: '#3B82F6',
                icon: null,
                isDefault: true,
                scope: 'investment',
              },
              {
                id: 'c-cripto',
                name: 'Cripto',
                type: 'both',
                color: '#EAB308',
                icon: null,
                isDefault: true,
                scope: 'investment',
              },
            ],
          })
        );
      }
      return Promise.resolve(makeResponse({ data: [investment, bitcoin] }));
    });
    render(<InvestmentsSection />);

    await screen.findByText('Carteira por categoria');
    expect(screen.getByText('Tesouro Selic')).toBeInTheDocument();
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cripto' }));

    await waitFor(() => expect(screen.queryByText('Tesouro Selic')).not.toBeInTheDocument());
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cripto' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));

    await waitFor(() => expect(screen.getByText('Tesouro Selic')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('mostra aviso calma quando as categorias falham, sem derrubar os cards', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/categories')) return Promise.resolve(makeResponse({ error: 'Erro' }, false, 500));
      return Promise.resolve(makeResponse({ data: [investment] }));
    });
    render(<InvestmentsSection />);

    expect(await screen.findByText('Carteira por categoria')).toBeInTheDocument();
    expect(await screen.findByText('Não foi possível carregar o resumo agora.')).toBeInTheDocument();
    expect(screen.getByText('Tesouro Selic')).toBeInTheDocument();
    expect(screen.getAllByTestId('investment-card')).toHaveLength(1);
  });
});
