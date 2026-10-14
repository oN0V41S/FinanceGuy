import { classifyIntent } from '../intent';

describe('classifyIntent', () => {
  describe('read', () => {
    it.each([
      '',
      '   ',
      'Como faço para remover uma despesa?',
      'Quanto gastei em março?',
      'Qual foi minha maior despesa',
      'Por que meu saldo caiu?',
      'Se eu não pagar Clarice em Dezembro quanto ficará o total',
      'Se eu apagar essa despesa o que acontece',
      'Meu saldo está bom?',
      'meu saldo atual',
      'Quero entender minhas despesas',
    ])('"%s" é leitura', (msg) => {
      expect(classifyIntent(msg)).toEqual({ kind: 'read' });
    });

    it.each(['novo mês começou bem', 'Meu novo salário caiu', 'O novo saldo ficou ok'])('"%s" com "novo" solto é leitura', (msg) => {
      expect(classifyIntent(msg)).toEqual({ kind: 'read' });
    });

    it('verbo no começo com "?" continua sendo comando', () => {
      expect(classifyIntent('Crie uma despesa de 50?').kind).toBe('write');
    });

    it('"por favor" antes do verbo continua comando', () => {
      expect(classifyIntent('Por favor, crie uma despesa de 50 no mercado?').kind).toBe('write');
    });
  });

  describe('write', () => {
    it('create com acento e entidade', () => {
      expect(classifyIntent('Crie despesa de 50 no mercado hoje')).toEqual({
        kind: 'write',
        segments: [{ op: 'create', entity: 'transaction', text: 'Crie despesa de 50 no mercado hoje' }],
      });
    });

    it.each([
      ['Nova Transação "Aniversário Rafael", "50", "Rafael", "28/11", "Não paga".', 'create', 'transaction'],
      ['Quero uma nova despesa de 30', 'create', 'transaction'],
      ['Novo investimento em CDB', 'create', 'investment'],
      ['Inclua uma receita de 100', 'create', 'transaction'],
      ['Anote um gasto de 20', 'create', 'transaction'],
      ['Ganhei 200 de freela', 'create', 'transaction'],
      ['Troque o valor da despesa do uber', 'update', 'transaction'],
      ['Ajuste a transação do mercado', 'update', 'transaction'],
      ['Tire a despesa do uber', 'delete', 'transaction'],
      ['Lançar uma receita de 100', 'create', 'transaction'],
      ['Registre um gasto de 20', 'create', 'transaction'],
      ['Cadastrar investimento em CDB', 'create', 'investment'],
      ['Adicione uma categoria nova', 'create', 'category'],
      ['Altere a transação do mercado', 'update', 'transaction'],
      ['Edite o ativo PETR4', 'update', 'investment'],
      ['Mude a categoria de Lazer', 'update', 'category'],
      ['Remova a despesa do uber', 'delete', 'transaction'],
      ['Exclua o fii HGLG11', 'delete', 'investment'],
      ['APAGUE O LANÇAMENTO de ontem', 'delete', 'transaction'],
      ['Delete a ação VALE3', 'delete', 'investment'],
      ['Atualize o tesouro', 'update', 'investment'],
    ])('%s -> %s/%s', (msg, op, entity) => {
      const result = classifyIntent(msg);
      expect(result.kind).toBe('write');
      if (result.kind === 'write') {
        expect(result.segments[0]).toMatchObject({ op, entity });
      }
    });

    it.each(['Gastei 50 no mercado', 'Paguei 30 de luz', 'Recebi 1000 de salário', 'Comprei pão por 10'])(
      'verbo no passado "%s" implica transação',
      (msg) => {
        expect(classifyIntent(msg)).toMatchObject({
          kind: 'write',
          segments: [{ op: 'create', entity: 'transaction' }],
        });
      },
    );

    it('usa o verbo que aparece primeiro, mesmo de outra operação', () => {
      expect(classifyIntent('Crie uma despesa e altere o valor')).toMatchObject({
        kind: 'write',
        segments: [{ op: 'create' }],
      });
      expect(classifyIntent('Altere a despesa e crie outra')).toMatchObject({
        kind: 'write',
        segments: [{ op: 'update' }],
      });
    });

    it('usa o verbo que aparece primeiro', () => {
      const r = classifyIntent('Apague a despesa que eu criei');
      expect(r).toMatchObject({ kind: 'write', segments: [{ op: 'delete' }] });
    });

    it('divide por ponto e vírgula, "e depois", "e também", quebra de linha e lista numerada', () => {
      const r = classifyIntent(
        'Crie despesa de 10; crie despesa de 20 e depois crie receita de 30 e também crie gasto de 40\ncrie despesa de 50',
      );
      expect(r.kind).toBe('write');
      if (r.kind === 'write') expect(r.segments).toHaveLength(5);

      const lista = classifyIntent('1. crie despesa de 10 2) remova a despesa do uber');
      expect(lista).toMatchObject({
        kind: 'write',
        segments: [
          { op: 'create', entity: 'transaction' },
          { op: 'delete', entity: 'transaction' },
        ],
      });
    });

    it('"também" com acento e maiúsculas divide', () => {
      const r = classifyIntent('Crie despesa de 10 E TAMBÉM crie receita de 5');
      expect(r.kind === 'write' && r.segments).toHaveLength(2);
    });

    it('não divide valores como 1.234,56', () => {
      const r = classifyIntent('Crie despesa de 1.234,56 no mercado');
      expect(r.kind === 'write' && r.segments).toHaveLength(1);
    });
  });

  describe('clarify', () => {
    it('mais de 5 segmentos -> too_many', () => {
      const msg = Array.from({ length: 6 }, (_, i) => `crie despesa de ${i + 1}`).join('; ');
      expect(classifyIntent(msg)).toMatchObject({ kind: 'clarify', reason: 'too_many' });
    });

    it.each([
      'Apague todas as transações de março',
      'Remova tudo',
      'Altere todos os investimentos',
    ])('filtro em lote "%s" -> bulk_filter', (msg) => {
      expect(classifyIntent(msg)).toMatchObject({ kind: 'clarify', reason: 'bulk_filter' });
    });

    it('"todas" em criação não é lote', () => {
      expect(classifyIntent('Crie despesa de 50 para todas as refeições').kind).toBe('write');
    });

    it('verbo sem entidade -> missing_entity', () => {
      const r = classifyIntent('apague isso');
      expect(r).toMatchObject({ kind: 'clarify', reason: 'missing_entity' });
      expect(r.kind === 'clarify' && r.message.length).toBeGreaterThan(10);
    });

    it('segmento sem verbo -> missing_verb', () => {
      const r = classifyIntent('Crie despesa de 50; mercado de 30');
      expect(r).toMatchObject({ kind: 'clarify', reason: 'missing_verb' });
    });
  });

  it('"e nova receita" / "e crie uma despesa" divide em 2 comandos de criação', () => {
    const r = classifyIntent('Criar despesa de R$ 50,00 no mercado hoje e nova receita de R$ 3.000,00 de salário');
    expect(r.kind).toBe('write');
    if (r.kind !== 'write') return;
    expect(r.segments).toHaveLength(2);
    expect(r.segments[0].text).not.toMatch(/salário/);
    expect(r.segments[1].text).toMatch(/3.000/);
    const r2 = classifyIntent('Crie uma despesa de 10 e crie uma receita de 20');
    expect(r2.kind === 'write' && r2.segments).toHaveLength(2);
  });

  it('cabeçalho terminado em ":" dá o verbo às linhas seguintes (2 cards num só comando)', () => {
    const r = classifyIntent(
      [
        'Quero criar 2 novas transações:',
        '"Aniversário Rafael", "50", responsável: "Rafael", categoria "lazer" recorrente em 2 meses;',
        '"Aniversário Rafael", "60", responsável: "Rafael", categoria "lazer" esse mês',
      ].join('\n'),
    );
    expect(r.kind).toBe('write');
    if (r.kind !== 'write') return;
    expect(r.segments).toHaveLength(2);
    expect(r.segments.every((s) => s.op === 'create' && s.entity === 'transaction')).toBe(true);
    expect(r.segments[1].text).toContain('60');
  });
});
