import { render, screen, fireEvent } from '@testing-library/react';
import { AskForm } from '../AskForm';

describe('AskForm', () => {
  it('desabilita o botão com pergunta vazia ou só espaços', () => {
    render(<AskForm onSubmit={jest.fn()} isLoading={false} />);
    const button = screen.getByRole('button', { name: /perguntar/i });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Sua pergunta'), { target: { value: '   ' } });
    expect(button).toBeDisabled();
  });

  it('mostra o contador de 500 caracteres', () => {
    render(<AskForm onSubmit={jest.fn()} isLoading={false} />);
    expect(screen.getByText('0/500')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Sua pergunta'), { target: { value: 'abc' } });
    expect(screen.getByText('3/500')).toBeInTheDocument();
    expect(screen.getByLabelText('Sua pergunta')).toHaveAttribute('maxlength', '500');
  });

  it('envia a pergunta sem espaços nas pontas', () => {
    const onSubmit = jest.fn();
    render(<AskForm onSubmit={onSubmit} isLoading={false} />);
    fireEvent.change(screen.getByLabelText('Sua pergunta'), { target: { value: '  Quanto gastei?  ' } });
    fireEvent.click(screen.getByRole('button', { name: /perguntar/i }));
    expect(onSubmit).toHaveBeenCalledWith('Quanto gastei?');
  });

  it('desabilita o botão enquanto carrega', () => {
    const onSubmit = jest.fn();
    render(<AskForm onSubmit={onSubmit} isLoading />);
    fireEvent.change(screen.getByLabelText('Sua pergunta'), { target: { value: 'oi' } });
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.submit(button.closest('form') as HTMLFormElement);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
