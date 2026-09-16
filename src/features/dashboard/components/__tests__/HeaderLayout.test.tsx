import { render, screen } from '@testing-library/react';
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
  // Botão de menu mobile temporariamente desativado até a nova navegação
  // flutuante (liquid glass) substituir o drawer atual.
  it('não renderiza o botão de menu (temporariamente desativado)', () => {
    render(<HeaderLayout />);
    expect(screen.queryByLabelText('Abrir menu')).not.toBeInTheDocument();
  });

  it('renderiza a marca "FinanceGuy" visível', () => {
    render(<HeaderLayout />);
    expect(screen.getByText('FinanceGuy')).toBeInTheDocument();
  });

  it('renderiza botão de Configurações', () => {
    render(<HeaderLayout />);
    expect(screen.getByLabelText('Configurações')).toBeInTheDocument();
  });
});
