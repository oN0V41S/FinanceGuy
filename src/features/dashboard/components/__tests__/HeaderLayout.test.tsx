import { render, screen, fireEvent } from '@testing-library/react';
import { HeaderLayout } from '../HeaderLayout';

jest.mock('@/features/auth/actions/logoutAction', () => ({
  logoutAction: jest.fn(),
}));

describe('HeaderLayout', () => {
  it('renderiza o botão de menu visível em todas as telas', () => {
    const { container } = render(<HeaderLayout />);
    const menuButton = container.querySelector('button[aria-label="Abrir menu"]');
    expect(menuButton).toBeInTheDocument();
    expect(menuButton).not.toHaveClass('md:hidden');
    expect(menuButton).toHaveClass('inline-flex');
  });

  it('renderiza a marca "FinanceGuy" visível em todas as telas', () => {
    render(<HeaderLayout />);
    expect(screen.getByText('FinanceGuy')).toBeInTheDocument();
  });

  it('chama onToggleDrawer ao clicar no botão de menu', () => {
    const mockToggleDrawer = jest.fn();
    render(<HeaderLayout onToggleDrawer={mockToggleDrawer} isDrawerOpen={false} />);
    fireEvent.click(screen.getByLabelText('Abrir menu'));
    expect(mockToggleDrawer).toHaveBeenCalledTimes(1);
  });

  it('não chama onToggleDrawer quando a prop não é fornecida', () => {
    render(<HeaderLayout />);
    expect(() => fireEvent.click(screen.getByLabelText('Abrir menu'))).not.toThrow();
  });

  it('reflete o estado do drawer via aria-expanded (false)', () => {
    render(<HeaderLayout isDrawerOpen={false} />);
    expect(screen.getByLabelText('Abrir menu')).toHaveAttribute('aria-expanded', 'false');
  });

  it('reflete o estado do drawer via aria-expanded (true)', () => {
    render(<HeaderLayout isDrawerOpen={true} />);
    expect(screen.getByLabelText('Abrir menu')).toHaveAttribute('aria-expanded', 'true');
  });

  it('alterna aria-expanded conforme a prop isDrawerOpen muda', () => {
    const { rerender } = render(<HeaderLayout isDrawerOpen={false} />);
    expect(screen.getByLabelText('Abrir menu')).toHaveAttribute('aria-expanded', 'false');

    rerender(<HeaderLayout isDrawerOpen={true} />);
    expect(screen.getByLabelText('Abrir menu')).toHaveAttribute('aria-expanded', 'true');
  });

  it('renderiza os botões de ação Configurações e Perfil', () => {
    render(<HeaderLayout />);
    expect(screen.getByLabelText('Configurações')).toBeInTheDocument();
    expect(screen.getByLabelText('Perfil')).toBeInTheDocument();
  });

  it('renderiza Configurações ativo (sem aria-disabled)', () => {
    render(<HeaderLayout />);
    expect(screen.getByLabelText('Configurações')).not.toHaveAttribute('aria-disabled');
  });
});
