import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoalCard } from '../GoalCard';
import type { Goal } from '@/features/goals/validations';

const goal: Goal = {
  id: '1',
  name: 'Viagem para o Japão',
  targetValue: 10000,
  currentValue: 2500,
  deadlineLabel: 'Dezembro 2026',
};

describe('GoalCard', () => {
  it('renders the goal name, deadline and formatted values', () => {
    render(<GoalCard goal={goal} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Viagem para o Japão')).toBeInTheDocument();
    expect(screen.getByText('Dezembro 2026')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*2\.500,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*10\.000,00/)).toBeInTheDocument();
  });

  it('shows the correct progress percentage', () => {
    render(<GoalCard goal={goal} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('25% concluído')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  });

  it('caps progress at 100% when currentValue exceeds targetValue', () => {
    const overGoal: Goal = { ...goal, currentValue: 15000 };
    render(<GoalCard goal={overGoal} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('150% concluído')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('does not render deadline when absent', () => {
    const noDeadline: Goal = { ...goal, deadlineLabel: undefined };
    render(<GoalCard goal={noDeadline} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.queryByText('Dezembro 2026')).not.toBeInTheDocument();
  });

  it('calls onEdit and onDelete handlers', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(<GoalCard goal={goal} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Editar meta'));
    fireEvent.click(screen.getByLabelText('Excluir meta'));
    expect(onEdit).toHaveBeenCalledWith(goal);
    expect(onDelete).toHaveBeenCalledWith(goal);
  });
});
