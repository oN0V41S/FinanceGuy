import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConversationSidebar } from '../ConversationSidebar';
import type { SessionSummaryDto } from '@/features/ai/types';

const sessions: SessionSummaryDto[] = [
  { id: 's1', title: 'Gastos de março', active: true, updatedAt: '2026-10-14T10:00:00.000Z' },
  { id: 's2', title: null, active: false, updatedAt: '2026-10-13T10:00:00.000Z' },
];

function setup(overrides: Partial<React.ComponentProps<typeof ConversationSidebar>> = {}) {
  const props = {
    sessions,
    activeId: 's1',
    isLoading: false,
    error: null,
    onSelect: jest.fn(),
    onNew: jest.fn(),
    onRename: jest.fn().mockResolvedValue(true),
    onDelete: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
  render(<ConversationSidebar {...props} />);
  return props;
}

describe('ConversationSidebar', () => {
  it('lista conversas, destaca a ativa e usa título padrão quando vazio', () => {
    setup();
    expect(screen.getByRole('button', { name: /gastos de março/i, current: true })).toBeInTheDocument();
    expect(screen.getAllByText('Nova conversa').length).toBeGreaterThan(0);
  });

  it('seleciona e cria', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: /gastos de março/i, current: true }));
    expect(props.onSelect).toHaveBeenCalledWith('s1');
    fireEvent.click(screen.getAllByRole('button', { name: /^nova conversa$/i })[0]);
    expect(props.onNew).toHaveBeenCalled();
  });

  it('renomeia inline e confirma com Enter', async () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: /renomear conversa gastos de março/i }));
    const input = screen.getByLabelText('Novo título da conversa');
    fireEvent.change(input, { target: { value: 'Orçamento' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(props.onRename).toHaveBeenCalledWith('s1', 'Orçamento'));
    await waitFor(() => expect(screen.queryByLabelText('Novo título da conversa')).not.toBeInTheDocument());
  });

  it('mantém a edição aberta se renomear falhar', async () => {
    setup({ onRename: jest.fn().mockResolvedValue(false) });
    fireEvent.click(screen.getByRole('button', { name: /renomear conversa gastos de março/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar título' }));
    await waitFor(() => expect(screen.getByLabelText('Novo título da conversa')).toBeInTheDocument());
  });

  it('exclui só após confirmação e permite desistir', async () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: /excluir conversa gastos de março/i }));
    expect(props.onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Manter' }));
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /excluir conversa gastos de março/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(props.onDelete).toHaveBeenCalledWith('s1'));
  });

  it('mostra skeleton, estado vazio e erro inline', () => {
    const { unmount } = render(
      <ConversationSidebar
        sessions={[]} activeId={null} isLoading error={null}
        onSelect={jest.fn()} onNew={jest.fn()} onRename={jest.fn()} onDelete={jest.fn()}
      />,
    );
    expect(screen.getByTestId('sessions-skeleton')).toBeInTheDocument();
    unmount();
    setup({ sessions: [], error: 'Falhou' });
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou');
  });
});
