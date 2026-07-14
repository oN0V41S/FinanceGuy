import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders a spinner element with role="status"', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with default accessible label', () => {
    render(<LoadingSpinner />);
    expect(screen.getByLabelText('Carregando')).toBeInTheDocument();
  });

  it('renders an optional message', () => {
    render(<LoadingSpinner message="Carregando dados..." />);
    expect(screen.getByText('Carregando dados...')).toBeInTheDocument();
  });

  it('renders without message by default', () => {
    render(<LoadingSpinner />);
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });
});
