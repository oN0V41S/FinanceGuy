import { render, screen, fireEvent } from '@testing-library/react';
import { HeaderIconButton } from '../HeaderIconButton';

describe('HeaderIconButton', () => {
  it('renderiza o ícone fornecido', () => {
    render(
      <HeaderIconButton icon={<span data-testid="icon-mock" />} label="Botão teste" />,
    );
    expect(screen.getByTestId('icon-mock')).toBeInTheDocument();
  });

  it('aplica o aria-label recebido no botão', () => {
    render(<HeaderIconButton icon={<span />} label="Abrir menu" />);
    const button = screen.getByRole('button', { name: 'Abrir menu' });
    expect(button).toHaveAttribute('aria-label', 'Abrir menu');
  });

  it('chama onClick ao clicar no botão', () => {
    const handleClick = jest.fn();
    render(<HeaderIconButton icon={<span />} label="Perfil" onClick={handleClick} />);
    fireEvent.click(screen.getByLabelText('Perfil'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('não dispara erro ao clicar sem onClick', () => {
    render(<HeaderIconButton icon={<span />} label="Notificações" />);
    expect(() => fireEvent.click(screen.getByLabelText('Notificações'))).not.toThrow();
  });

  it('repassa atributos adicionais como aria-disabled', () => {
    render(
      <HeaderIconButton icon={<span />} label="Configurações" aria-disabled={true} />,
    );
    expect(screen.getByLabelText('Configurações')).toHaveAttribute('aria-disabled', 'true');
  });
});
