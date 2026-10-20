import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileDropdown } from '../ProfileDropdown';

jest.mock('@/features/auth/actions/updateNicknameAction', () => ({
  updateNicknameAction: jest.fn(),
}));

describe('ProfileDropdown', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    if (typeof global.fetch !== 'function') global.fetch = jest.fn() as unknown as typeof fetch;
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ profile: 'Sou dev' }) } as Response);
  });
  afterEach(() => fetchSpy.mockRestore());

  it('mostra Perfil, Apelido e Sair dentro do menu', () => {
    render(<ProfileDropdown onLogout={jest.fn()} />);
    expect(screen.queryByLabelText('Apelido')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Perfil'));
    expect(screen.getByRole('menuitem', { name: 'Perfil' })).toBeInTheDocument();
    expect(screen.getByLabelText('Apelido')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sair' })).toBeInTheDocument();
  });

  it('Perfil fecha o menu e abre o editor com o texto carregado', async () => {
    render(<ProfileDropdown onLogout={jest.fn()} />);
    fireEvent.click(screen.getByLabelText('Perfil'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Perfil' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith('/api/ai/profile');
    await waitFor(() => expect(screen.getByLabelText('Descrição do perfil')).toHaveValue('Sou dev'));
  });
});
