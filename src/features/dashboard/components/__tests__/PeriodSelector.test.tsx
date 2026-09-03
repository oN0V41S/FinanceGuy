import React from 'react';
import { render, screen } from '@testing-library/react';
import { PeriodSelector } from '../PeriodSelector';

jest.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (v: string) => void;
  }) => <div data-testid="select" data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="select-trigger">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-testid={`select-item-${value}`} data-value={value}>{children}</div>,
}));

describe('PeriodSelector', () => {
  it('renders without crash', () => {
    render(<PeriodSelector value="last6" onChange={() => {}} />);
    expect(screen.getByTestId('select')).toBeInTheDocument();
  });

  it('passes current value to Select', () => {
    render(<PeriodSelector value="last6" onChange={() => {}} />);
    expect(screen.getByTestId('select')).toHaveAttribute('data-value', 'last6');
  });

  it('renders "Últimos 6 meses" option', () => {
    render(<PeriodSelector value="last6" onChange={() => {}} />);
    expect(screen.getByTestId('select-item-last6')).toBeInTheDocument();
    expect(screen.getByTestId('select-item-last6')).toHaveTextContent('Últimos 6 meses');
  });

  it('renders year options starting from 2024', () => {
    render(<PeriodSelector value="last6" onChange={() => {}} />);
    expect(screen.getByTestId('select-item-2024')).toBeInTheDocument();
    expect(screen.getByTestId('select-item-2024')).toHaveTextContent('2024 completo');
  });

  it('renders semester options for 2024', () => {
    render(<PeriodSelector value="last6" onChange={() => {}} />);
    expect(screen.getByTestId('select-item-2024-s1')).toBeInTheDocument();
    expect(screen.getByTestId('select-item-2024-s2')).toBeInTheDocument();
  });

  it('renders options up to current year', () => {
    render(<PeriodSelector value="last6" onChange={() => {}} />);
    const currentYear = new Date().getFullYear();
    expect(screen.getByTestId(`select-item-${currentYear}`)).toBeInTheDocument();
  });
});
