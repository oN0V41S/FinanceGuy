import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FortnightFilter } from '../FortnightFilter';

describe('FortnightFilter', () => {
  it('renders with a trigger labelled for quinzena', () => {
    render(<FortnightFilter value="all" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Filtrar por quinzena')).toBeInTheDocument();
  });

  it('shows "Mês inteiro" when "all" is selected', () => {
    render(<FortnightFilter value="all" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Filtrar por quinzena')).toHaveTextContent('Mês inteiro');
  });

  it('shows "Dia 1 ao 15" when "first" is selected', () => {
    render(<FortnightFilter value="first" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Filtrar por quinzena')).toHaveTextContent('Dia 1 ao 15');
  });

  it('shows "Dia 16 ao 31" when "second" is selected', () => {
    render(<FortnightFilter value="second" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Filtrar por quinzena')).toHaveTextContent('Dia 16 ao 31');
  });

  it('calls onChange when a new option is selected', async () => {
    const onChange = jest.fn();
    render(<FortnightFilter value="all" onChange={onChange} />);

    const trigger = screen.getByLabelText('Filtrar por quinzena');
    await userEvent.click(trigger);

    const option = await screen.findByText('Dia 16 ao 31');
    await userEvent.click(option);

    expect(onChange).toHaveBeenCalledWith('second');
  });

  it('applies custom className', () => {
    const { container } = render(
      <FortnightFilter value="all" onChange={jest.fn()} className="ml-2" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('ml-2');
  });
});
