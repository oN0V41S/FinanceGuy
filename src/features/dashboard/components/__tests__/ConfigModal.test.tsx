import { render, screen } from '@testing-library/react';
import { ConfigModal } from '../ConfigModal';

describe('ConfigModal - Tema', () => {
  it('ícone de tema fica DENTRO do Toggle button', () => {
    render(<ConfigModal isOpen={true} onClose={jest.fn()} />);
    const toggle = screen.getByRole('switch');
    expect(toggle.querySelector('svg')).toBeInTheDocument();
  });

  it('não exibe mais o apelido (movido para o menu do Perfil)', () => {
    render(<ConfigModal isOpen={true} onClose={jest.fn()} />);
    expect(screen.queryByLabelText('Apelido')).not.toBeInTheDocument();
  });
});
