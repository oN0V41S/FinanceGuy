import React from 'react';
import { render, screen } from '@testing-library/react';
import { AIInsightCard } from '../AIInsightCard';

jest.mock('lucide-react', () => ({
  Sparkles: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-sparkles" {...props} />
  ),
}));

describe('AIInsightCard', () => {
  it('renders without crash', () => {
    render(<AIInsightCard />);
    expect(screen.getByText('Insight do Mês')).toBeInTheDocument();
  });

  it('shows Sparkles icon', () => {
    render(<AIInsightCard />);
    expect(screen.getByTestId('icon-sparkles')).toBeInTheDocument();
  });

  it('shows Beta badge', () => {
    render(<AIInsightCard />);
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('shows insight text immediately without any delay', () => {
    render(<AIInsightCard />);
    expect(screen.getByText(/Alimentação/)).toBeInTheDocument();
  });

  it('shows footer text about AI analysis', () => {
    render(<AIInsightCard />);
    expect(screen.getByText(/Análises geradas com IA/i)).toBeInTheDocument();
  });
});
