import React from 'react';
import { render, screen } from '@testing-library/react';
import { GoalsCard } from '../GoalsCard';

jest.mock('lucide-react', () => ({
  Target: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-target" {...props} />
  ),
  Plus: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-plus" {...props} />
  ),
}));

describe('GoalsCard', () => {
  it('renders without crash', () => {
    render(<GoalsCard />);
    expect(screen.getByText('Metas Financeiras')).toBeInTheDocument();
  });

  it('shows the target icon', () => {
    render(<GoalsCard />);
    expect(screen.getByTestId('icon-target')).toBeInTheDocument();
  });

  it('shows empty state title', () => {
    render(<GoalsCard />);
    expect(screen.getByText('Nenhuma meta cadastrada')).toBeInTheDocument();
  });

  it('shows descriptive subtitle text', () => {
    render(<GoalsCard />);
    expect(
      screen.getByText(/Defina metas financeiras para acompanhar seu progresso/i)
    ).toBeInTheDocument();
  });

  it('renders a disabled "Criar meta" button', () => {
    render(<GoalsCard />);
    const button = screen.getByRole('button', { name: /Criar meta/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('button has "Em breve" title', () => {
    render(<GoalsCard />);
    const button = screen.getByRole('button', { name: /Criar meta/i });
    expect(button).toHaveAttribute('title', 'Em breve');
  });
});
