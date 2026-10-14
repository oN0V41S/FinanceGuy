import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActionEditForm } from '../ActionEditForm';
import { makeCard, transactionFields } from '@/features/ai/__fixtures__/actionCards';

jest.mock('@/components/ui/select', () => {
  const Ctx = React.createContext<((v: string) => void) | null>(null);
  const Select = ({ onValueChange, children, value }: any) => (
    <Ctx.Provider value={onValueChange}>
      <div data-testid="select-root" data-value={value}>
        {children}
      </div>
    </Ctx.Provider>
  );
  const SelectTrigger = ({ children, ...props }: any) => <button type="button" {...props}>{children}</button>;
  const SelectValue = ({ children, placeholder }: any) => <span data-testid="select-value">{children ?? placeholder}</span>;
  const SelectContent = ({ children, className }: any) => (
    <div data-testid="select-content" className={className}>
      {children}
    </div>
  );
  const SelectItem = ({ value, children }: any) => {
    const on = React.useContext(Ctx);
    return (
      <div role="option" aria-selected={false} data-testid={`select-item-${value}`} onClick={() => on?.(value)}>
        {children}
      </div>
    );
  };
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

function setup(props: Partial<React.ComponentProps<typeof ActionEditForm>> = {}) {
  const onSubmit = jest.fn();
  const onCancel = jest.fn();
  const utils = render(
    <ActionEditForm card={makeCard()} onSubmit={onSubmit} onCancel={onCancel} {...props} />,
  );
  return { onSubmit, onCancel, ...utils };
}

describe('ActionEditForm', () => {
  it('preenche os campos editáveis com os valores atuais', () => {
    setup();
    expect(screen.getByLabelText('Valor')).toHaveValue('50');
    expect(screen.getByLabelText('Data')).toHaveValue('2026-10-13');
    expect(screen.getByLabelText('Título')).toHaveValue('Mercado');
    expect(screen.getByLabelText('Responsável')).toHaveValue('Ana');
    expect(screen.getByRole('switch', { name: 'Pago' })).toBeChecked();
  });

  it('mostra o rótulo (não a chave interna) no Select e usa fundo de superfície no conteúdo', () => {
    setup();
    const values = screen.getAllByTestId('select-value').map((n) => n.textContent);
    expect(values).toEqual(expect.arrayContaining(['Despesa', 'Alimentação']));
    screen.getAllByTestId('select-content').forEach((n) => expect(n).toHaveClass('bg-surface-container'));
  });

  it('não renderiza campos não editáveis', () => {
    setup({ card: makeCard({ fields: transactionFields({ responsible: { editable: false } }) }) });
    expect(screen.queryByLabelText('Responsável')).not.toBeInTheDocument();
  });

  it('envia só o que mudou, com valor numérico', async () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '75,50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ value: 75.5 }));
  });

  it('envia categoria, tipo e pago alterados', async () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByTestId('select-item-Lazer'));
    fireEvent.click(screen.getByTestId('select-item-income'));
    fireEvent.click(screen.getByRole('switch', { name: 'Pago' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ category: 'Lazer', type: 'income', paid: false }),
    );
  });

  it('valida valor <= 0 com erro inline e não envia', () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Valor deve ser positivo/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('valida valor ilegível com mensagem amigável', () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/valor válido/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('exige categoria quando ela está faltando', () => {
    const { onSubmit } = setup({
      card: makeCard({
        status: 'needs_input',
        fields: transactionFields({ category: { value: null, display: '', missing: true } }),
      }),
    });
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Padaria' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Escolha uma categoria/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sem alterações, salvar apenas fecha o formulário', () => {
    const { onSubmit, onCancel } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('cancelar chama onCancel', () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('mostra erro externo inline e desabilita enquanto salva', () => {
    setup({ error: 'Sem conexão. Tente de novo.', saving: true });
    expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo.');
    expect(screen.getByRole('button', { name: /Salvando/ })).toBeDisabled();
  });
});
