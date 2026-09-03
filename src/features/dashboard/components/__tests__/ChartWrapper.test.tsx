import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChartWrapper, CHART_COLORS, ChartTooltipStyle } from '../ChartWrapper';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({
    children,
    width,
    height,
  }: {
    children: React.ReactNode;
    width: string | number;
    height: number;
  }) => (
    <div
      data-testid="responsive-container"
      data-width={width}
      data-height={height}
    >
      {children}
    </div>
  ),
}));

describe('ChartWrapper', () => {
  it('renders children inside ResponsiveContainer', () => {
    render(
      <ChartWrapper>
        <div data-testid="chart-child">Chart</div>
      </ChartWrapper>
    );
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('chart-child')).toBeInTheDocument();
  });

  it('uses width="100%" and height=280 by default', () => {
    render(<ChartWrapper><div /></ChartWrapper>);
    const container = screen.getByTestId('responsive-container');
    expect(container).toHaveAttribute('data-width', '100%');
    expect(container).toHaveAttribute('data-height', '280');
  });

  it('accepts custom height prop', () => {
    render(<ChartWrapper height={220}><div /></ChartWrapper>);
    const container = screen.getByTestId('responsive-container');
    expect(container).toHaveAttribute('data-height', '220');
  });

  it('applies font-sans text-xs className on wrapper div', () => {
    const { container } = render(<ChartWrapper><div /></ChartWrapper>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('font-sans');
    expect(wrapper.className).toContain('text-xs');
  });
});

describe('CHART_COLORS', () => {
  it('exports income color', () => {
    expect(CHART_COLORS.income).toBe('#10B981');
  });

  it('exports expense color', () => {
    expect(CHART_COLORS.expense).toBe('#E11D48');
  });

  it('exports primary color', () => {
    expect(CHART_COLORS.primary).toBe('#2563EB');
  });
});

describe('ChartTooltipStyle', () => {
  it('has dark background', () => {
    expect(ChartTooltipStyle.backgroundColor).toBe('#1e1e20');
  });

  it('has border color', () => {
    expect(ChartTooltipStyle.border).toContain('#2e2e32');
  });

  it('has white text color', () => {
    expect(ChartTooltipStyle.color).toBeTruthy();
  });
});
