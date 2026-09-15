import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvestmentsSection } from '../InvestmentsSection';

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
    mockFetch.mockResolvedValueOnce(makeResponse({ data: [investment] }));
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
    mockFetch.mockResolvedValueOnce(makeResponse({ data: [investment] }));
    render(<InvestmentsSection />);
    await screen.findByText('Tesouro Selic');

    fireEvent.click(screen.getByLabelText('Excluir investimento'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(screen.getByText('Tesouro Selic')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
