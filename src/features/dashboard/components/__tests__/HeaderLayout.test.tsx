import { render, screen, fireEvent } from '@testing-library/react';
import { HeaderLayout } from '../HeaderLayout';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

jest.mock('@/features/auth/actions/logoutAction', () => ({
  logoutAction: jest.fn(),
}));

jest.mock('../ProfileDropdown', () => ({
  ProfileDropdown: () => <button aria-label="Perfil">Perfil</button>,
}));

jest.mock('../ConfigModal', () => ({
  ConfigModal: () => null,
}));

describe('HeaderLayout', () => {
  it('renderiza botão de menu', () => {
    render(<HeaderLayout />);
    expect(screen.getByLabelText('Abrir menu')).toBeInTheDocument();
  });

  it('renderiza a marca "FinanceGuy" visível', () => {
    render(<HeaderLayout />);
    expect(screen.getByText('FinanceGuy')).toBeInTheDocument();
  });

  it('chama onOpenMobileDrawer ao clicar no botão de menu', () => {
    const mockOpen = jest.fn();
    render(<HeaderLayout onOpenMobileDrawer={mockOpen} />);
    fireEvent.click(screen.getByLabelText('Abrir menu'));
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  it('renderiza botão de Configurações', () => {
    render(<HeaderLayout />);
    expect(screen.getByLabelText('Configurações')).toBeInTheDocument();
  });
});
