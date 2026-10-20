import { render, screen, fireEvent } from '@testing-library/react';
import { MissingFieldsNotice } from '../MissingFieldsNotice';
import { CandidatePicker } from '../CandidatePicker';
import { CompactedDivider } from '../CompactedDivider';
import { NextSteps } from '../NextSteps';
import { makeNextSteps } from '@/features/ai/__fixtures__/actionCards';

describe('MissingFieldsNotice', () => {
  it('destaca o campo e mostra o exemplo', () => {
    const { container } = render(
      <MissingFieldsNotice missingFields={[{ key: 'value', label: 'valor', example: 'gastei 50 no mercado' }]} />,
    );
    expect(container.querySelector('strong')).toHaveTextContent('valor');
    expect(container).toHaveTextContent('Faltou valor. Exemplo: gastei 50 no mercado');
  });

  it('junta vários campos', () => {
    const { container } = render(
      <MissingFieldsNotice
        missingFields={[
          { key: 'value', label: 'valor', example: 'R$ 50' },
          { key: 'category', label: 'categoria', example: 'mercado' },
        ]}
      />,
    );
    expect(container).toHaveTextContent('Faltou valor e categoria. Exemplo: R$ 50; mercado');
  });

  it('não renderiza nada sem campos faltando', () => {
    const { container } = render(<MissingFieldsNotice missingFields={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('CandidatePicker', () => {
  const candidates = [
    { index: 0, label: 'Mercado · R$ 50,00 · 13/10/2026' },
    { index: 1, label: 'Mercado · R$ 80,00 · 10/10/2026' },
  ];

  it('lista os rótulos e devolve o índice escolhido', () => {
    const onSelect = jest.fn();
    render(<CandidatePicker candidates={candidates} onSelect={onSelect} />);
    expect(screen.getByText(/Qual deles/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /R\$ 80,00/ }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('desabilita enquanto ocupado', () => {
    render(<CandidatePicker candidates={candidates} onSelect={jest.fn()} disabled />);
    screen.getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
  });
});

describe('CompactedDivider', () => {
  it('é um separador calmo e acessível', () => {
    render(<CompactedDivider />);
    expect(screen.getByRole('separator')).toHaveTextContent(/Conversa anterior resumida/);
  });
});

describe('NextSteps', () => {
  it('mostra progresso e próximo passo', () => {
    render(
      <NextSteps
        nextSteps={makeNextSteps({ total: 3, done: 1, next: 'Mercado R$ 50,00' })}
        onCancelRemaining={jest.fn()}
      />,
    );
    expect(screen.getByText(/✔ 1\/3 concluídas · Próximo: Mercado R\$ 50,00/)).toBeInTheDocument();
  });

  it('cancela restantes quando ainda há pendentes', () => {
    const onCancel = jest.fn();
    render(<NextSteps nextSteps={makeNextSteps({ total: 3, done: 1, next: 'x' })} onCancelRemaining={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar restantes' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('esconde "Cancelar restantes" e o próximo quando tudo foi resolvido', () => {
    render(<NextSteps nextSteps={makeNextSteps({ total: 2, done: 1, cancelled: 1 })} onCancelRemaining={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Cancelar restantes' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Próximo/)).not.toBeInTheDocument();
  });

  it('informa ações que não foram concluídas, sem jargão', () => {
    render(
      <NextSteps nextSteps={makeNextSteps({ total: 3, done: 1, failed: 1, next: 'y' })} onCancelRemaining={jest.fn()} />,
    );
    expect(screen.getByText(/1 não concluída/)).toBeInTheDocument();
  });

  it('desabilita o botão enquanto ocupado', () => {
    render(
      <NextSteps nextSteps={makeNextSteps({ total: 2, done: 0, next: 'y' })} onCancelRemaining={jest.fn()} busy />,
    );
    expect(screen.getByRole('button', { name: 'Cancelar restantes' })).toBeDisabled();
  });
});
