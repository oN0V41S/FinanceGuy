import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoalsSection } from '../GoalsSection';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function makeResponse(data: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => data };
}

const goal = {
  id: '1',
  name: 'Viagem',
  targetValue: 5000,
  currentValue: 1000,
};

beforeEach(() => {
  mockFetch.mockReset();
});

describe('GoalsSection', () => {
  it('renders empty state when there are no goals', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: [] }));
    render(<GoalsSection />);

    expect(await screen.findByText('Nenhuma meta cadastrada')).toBeInTheDocument();
  });

  it('renders goal cards when data is available', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: [goal] }));
    render(<GoalsSection />);

    expect(await screen.findByText('Viagem')).toBeInTheDocument();
  });

  it('opens the create dialog when clicking "Nova meta"', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: [] }));
    render(<GoalsSection />);
    await screen.findByText('Nenhuma meta cadastrada');

    fireEvent.click(screen.getByRole('button', { name: /Nova meta/i }));
    expect(screen.getByText('Nova meta', { selector: 'h2' })).toBeInTheDocument();
  });

  it('opens delete confirmation and deletes a goal', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ data: [goal] }));
    render(<GoalsSection />);
    await screen.findByText('Viagem');

    fireEvent.click(screen.getByLabelText('Excluir meta'));
    expect(await screen.findByText('Excluir meta', { selector: 'h2' })).toBeInTheDocument();

    mockFetch.mockResolvedValueOnce(makeResponse({ data: { success: true } }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(screen.queryByText('Viagem')).not.toBeInTheDocument());
  });

  it('does not delete when the confirmation dialog is cancelled', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ data: [goal] }));
    render(<GoalsSection />);
    await screen.findByText('Viagem');

    fireEvent.click(screen.getByLabelText('Excluir meta'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(screen.getByText('Viagem')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
