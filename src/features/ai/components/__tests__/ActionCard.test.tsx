import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActionCard } from '../ActionCard';
import { makeCard, transactionFields, field } from '@/features/ai/__fixtures__/actionCards';

jest.mock('@/components/ui/select', () => {
  const Select = ({ children }: any) => <div>{children}</div>;
  const SelectTrigger = ({ children, ...p }: any) => <button type="button" {...p}>{children}</button>;
  const SelectValue = ({ children, placeholder }: any) => <span>{children ?? placeholder}</span>;
  const SelectContent = ({ children }: any) => <div>{children}</div>;
  const SelectItem = ({ children }: any) => <div>{children}</div>;
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

function setup(card = makeCard(), props: Partial<React.ComponentProps<typeof ActionCard>> = {}) {
  const handlers = {
    onConfirm: jest.fn(),
    onUpdate: jest.fn().mockResolvedValue(true),
    onCancel: jest.fn(),
    onSelect: jest.fn(),
  };
  const utils = render(<ActionCard card={card} {...handlers} {...props} />);
  return { ...handlers, ...utils };
}

describe('ActionCard - criação', () => {
  it('mostra tipo, valor em fonte monoespaçada e chips de categoria e pago', () => {
    setup();
    expect(screen.getByTestId('action-card-type')).toHaveAttribute('data-type', 'expense');
    expect(screen.getByText('R$ 50,00')).toHaveClass('font-mono');
    expect(screen.getByText('Alimentação')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.getByText('13/10/2026 · Ana')).toBeInTheDocument();
  });

  it('receita usa o ícone/tipo de receita', () => {
    setup(makeCard({ fields: transactionFields({ type: { value: 'income', display: 'Receita' } }) }));
    expect(screen.getByTestId('action-card-type')).toHaveAttribute('data-type', 'income');
  });

  it('tem três botões de ícone com aria-label e alvo de 44px', () => {
    setup();
    for (const name of ['Confirmar', 'Alterar', 'Cancelar']) {
      expect(screen.getByRole('button', { name })).toHaveClass('size-12');
    }
  });

  it('Confirmar chama onConfirm com o id', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirm).toHaveBeenCalledWith('a1');
  });

  it('Cancelar chama onCancel com o id', () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledWith('a1');
  });

  it('não usa cores cruas nem text-white', () => {
    const { container } = setup();
    expect(container.innerHTML).not.toMatch(/text-white|bg-white|#[0-9a-fA-F]{3,8}\b/);
  });
});

describe('ActionCard - estados', () => {
  it('needs_input: aviso de campos faltando e Confirmar desabilitado', () => {
    setup(
      makeCard({
        status: 'needs_input',
        fields: transactionFields({ value: { value: null, display: '', missing: true } }),
        missingFields: [{ key: 'value', label: 'valor', example: 'gastei 50 no mercado' }],
      }),
    );
    expect(screen.getByText(/Faltou/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Alterar' })).toBeEnabled();
  });

  it('confirming: Confirmar desabilitado e texto de progresso', () => {
    setup(makeCard({ status: 'confirming' }));
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
    expect(screen.getByText(/Salvando/)).toBeInTheDocument();
  });

  it('busy local também desabilita todos os botões', () => {
    setup(makeCard(), { busy: true });
    for (const name of ['Confirmar', 'Alterar', 'Cancelar']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  });

  it('awaiting_pick: mostra candidatas e devolve o índice', () => {
    const { onSelect } = setup(
      makeCard({
        op: 'update',
        status: 'awaiting_pick',
        candidates: [
          { index: 0, label: 'Mercado · R$ 50,00' },
          { index: 1, label: 'Mercado · R$ 80,00' },
        ],
      }),
    );
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /R\$ 80,00/ }));
    expect(onSelect).toHaveBeenCalledWith('a1', 1);
  });

  it.each([
    ['confirmed', /registrad/i],
    ['cancelled', /Cancelada/],
    ['expired', /expirou/],
    ['failed', /Não consegui/],
  ] as const)('%s: texto calmo e sem botões', (status, text) => {
    setup(makeCard({ status }));
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
  });

  it('failed mostra a mensagem do servidor', () => {
    setup(makeCard({ status: 'failed', message: 'Essa transação não existe mais.' }));
    expect(screen.getByText('Essa transação não existe mais.')).toBeInTheDocument();
  });

  it('erro externo aparece inline e o card segue confirmável', () => {
    setup(makeCard(), { error: 'Sem conexão. Tente de novo.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo.');
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled();
  });
});

describe('ActionCard - alteração e remoção', () => {
  it('update mostra o diff apenas dos campos que mudam', () => {
    setup(
      makeCard({
        op: 'update',
        fields: transactionFields({ value: { value: 60, display: 'R$ 60,00' } }),
        before: transactionFields(),
      }),
    );
    expect(screen.getByRole('listitem')).toHaveTextContent('Valor: de R$ 50,00 para R$ 60,00');
    expect(screen.queryByText(/Categoria: de/)).not.toBeInTheDocument();
  });

  it('delete: destaque destrutivo com o item exato e sem editar', () => {
    const { container } = setup(
      makeCard({
        op: 'delete',
        destructive: true,
        fields: transactionFields(),
        before: transactionFields(),
      }),
    );
    expect(container.firstChild).toHaveClass('border-finance-expense/40');
    expect(screen.getByText(/Será removido/)).toBeInTheDocument();
    expect(screen.getByText('Mercado')).toBeInTheDocument();
    expect(screen.getByText('R$ 50,00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar remoção' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Alterar' })).not.toBeInTheDocument();
  });
});

describe('ActionCard - edição', () => {
  it('abre o formulário, salva e fecha quando a atualização funciona', async () => {
    const { onUpdate } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Alterar' }));
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '70' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith('a1', { value: 70 }));
    await waitFor(() => expect(screen.queryByLabelText('Valor')).not.toBeInTheDocument());
  });

  it('mantém o formulário aberto quando a atualização falha', async () => {
    const onUpdate = jest.fn().mockResolvedValue(false);
    setup(makeCard(), { onUpdate, error: 'Sem conexão.' });
    fireEvent.click(screen.getByRole('button', { name: 'Alterar' }));
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '70' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(screen.getByLabelText('Valor')).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('campo faltando: valor ilegível', () => {
    setup(
      makeCard({
        status: 'needs_input',
        fields: [...transactionFields({ value: { value: null, display: '', missing: true } }), field({ key: 'x', editable: false })],
        missingFields: [{ key: 'value', label: 'valor', example: 'R$ 50' }],
      }),
    );
    expect(screen.getByText('R$ —')).toBeInTheDocument();
  });
});
