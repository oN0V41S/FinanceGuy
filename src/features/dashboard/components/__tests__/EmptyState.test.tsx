import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders wallet icon', () => {
    render(<EmptyState />);
    const icon = document.querySelector('.lucide-wallet');
    expect(icon).toBeInTheDocument();
  });

  it('renders title', () => {
    render(<EmptyState />);
    expect(screen.getByText('Nenhuma transação encontrada')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<EmptyState />);
    expect(screen.getByText(/Adicione sua primeira transação/)).toBeInTheDocument();
  });
});
