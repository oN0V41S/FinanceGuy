/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CategoriasPage from '../page';

jest.mock('@/features/dashboard/components/HeaderLayout', () => ({
  HeaderLayout: () => <header data-testid="header">Header</header>,
}));

jest.mock('@/features/dashboard/components/MobileNavBar', () => ({
  MobileNavBar: () => <nav data-testid="mobile-navbar">MobileNavBar</nav>,
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

const TRANSACTION_CATEGORIES = [
  { id: 'c1', name: 'Mercado', type: 'expense', color: '#111111', icon: 'tag', isDefault: false, transactionCount: 1 },
];

const INVESTMENT_CATEGORIES = [
  { id: 'i1', name: 'Cripto', type: 'both', color: '#222222', icon: 'tag', isDefault: false, scope: 'investment', investmentCount: 2 },
];

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('scope=investment')) {
      return Promise.resolve(jsonResponse({ data: INVESTMENT_CATEGORIES }));
    }
    return Promise.resolve(jsonResponse({ data: TRANSACTION_CATEGORIES }));
  });
});

describe('CategoriasPage', () => {
  it('mostra categorias de transação por padrão', async () => {
    render(<CategoriasPage />);

    expect(await screen.findByText('Mercado')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith('/api/categories?scope=transaction');
  });

  it('alterna para investimentos e busca com scope=investment', async () => {
    render(<CategoriasPage />);
    await screen.findByText('Mercado');

    fireEvent.click(screen.getByRole('tab', { name: 'Investimentos' }));

    expect(await screen.findByText('Cripto')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith('/api/categories?scope=investment');
    expect(screen.queryByText('Mercado')).not.toBeInTheDocument();
  });

  it('esconde o seletor de tipo no diálogo do escopo investimento', async () => {
    render(<CategoriasPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Investimentos' }));
    await screen.findByText('Cripto');

    fireEvent.click(screen.getByRole('button', { name: /Nova categoria/i }));

    expect(await screen.findByText('Nova categoria', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.queryByText('Tipo')).not.toBeInTheDocument();
  });

  it('avisa na exclusão que os ativos migram para "Outros investimentos"', async () => {
    render(<CategoriasPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Investimentos' }));
    await screen.findByText('Cripto');

    fireEvent.click(screen.getByLabelText('Excluir categoria Cripto'));

    expect(await screen.findByText(/Outros investimentos/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Há 2 ativos/)).toBeInTheDocument());
  });
});
