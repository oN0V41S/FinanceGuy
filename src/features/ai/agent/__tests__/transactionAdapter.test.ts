import { createTransactionAdapter } from '../entityAdapters/transaction';
import { makeTxService, txRow } from '../../__fixtures__/agentFakes';

const OPTS = { today: '2026-10-14', defaultResponsible: 'Ana', hasTarget: false };

function setup() {
  const service = makeTxService();
  return { service, adapter: createTransactionAdapter(service) };
}

describe('transaction adapter', () => {
  describe('sanitize', () => {
    it('normaliza valor, data, tipo e pago; descarta vazios e chaves extras', () => {
      const { adapter } = setup();
      const out = adapter.sanitize({
        value: 'R$ 1.234,50',
        date: '05/03/2026',
        type: 'Despesa',
        paid: 'true',
        title: '  Mercado ',
        category: '',
        responsible: null,
        userId: 'hacker',
        id: 'x',
      });
      expect(out).toEqual({ value: 1234.5, date: '2026-03-05', type: 'expense', paid: true, title: 'Mercado' });
    });

    it('aceita receita/gasto/false e mantém valores inesperados para a validação acusar', () => {
      const { adapter } = setup();
      expect(adapter.sanitize({ type: 'receita', paid: 'false' })).toEqual({ type: 'income', paid: false });
      expect(adapter.sanitize({ type: 'gasto' }).type).toBe('expense');
      expect(adapter.sanitize({ type: 'xyz', value: 'abc', date: 5, paid: 'talvez' })).toEqual({
        type: 'xyz',
        value: 'abc',
        date: 5,
        paid: 'talvez',
      });
      expect(adapter.sanitize({ type: 3 }).type).toBe(3);
      expect(adapter.sanitize({ value: 10, date: '2026-01-02T10:00:00Z' })).toEqual({ value: 10, date: '2026-01-02' });
    });
  });

  describe('evaluate', () => {
    it('create completo é válido', () => {
      const { adapter } = setup();
      const ev = adapter.evaluate(
        'create',
        { type: 'expense', title: 'Mercado', value: 50, category: 'Alimentação', date: '2026-10-14' },
        OPTS,
      );
      expect(ev.valid).toBe(true);
      expect(ev.missing).toEqual([]);
      expect(ev.fields.responsible).toBe('Ana');
    });

    it('create incompleto lista os campos faltantes', () => {
      const { adapter } = setup();
      const ev = adapter.evaluate('create', {}, { ...OPTS, defaultResponsible: undefined });
      expect(ev.valid).toBe(false);
      expect(ev.missing.map((m) => m.key)).toEqual(expect.arrayContaining(['type', 'value', 'category']));
    });

    it('acusa erro por campo (valor <= 0, data inexistente, categoria fora da lista)', () => {
      const { adapter } = setup();
      const ev = adapter.evaluate(
        'create',
        { type: 'expense', title: 'x', value: -5, category: 'Inexistente', date: '2026-02-31', responsible: 'Ana' },
        OPTS,
      );
      expect(ev.valid).toBe(false);
      expect(ev.errors.value).toMatch(/maior que zero/);
      expect(ev.errors.category).toBeDefined();
      expect(ev.errors.date).toBeDefined();
    });

    it('rejeita datas fora do calendário, mês inválido e formato errado', () => {
      const { adapter } = setup();
      for (const date of ['2026-13-01', '2026-00-10', '2026-04-31', 'ontem']) {
        const ev = adapter.evaluate(
          'create',
          { type: 'expense', title: 'x', value: 5, category: 'Alimentação', date, responsible: 'Ana' },
          OPTS,
        );
        expect(ev.valid).toBe(false);
      }
    });

    it('update exige alvo e pelo menos uma mudança válida', () => {
      const { adapter } = setup();
      expect(adapter.evaluate('update', { value: 150 }, { ...OPTS, hasTarget: true }).valid).toBe(true);
      expect(adapter.evaluate('update', { value: 150 }, { ...OPTS, hasTarget: false }).valid).toBe(false);
      expect(adapter.evaluate('update', {}, { ...OPTS, hasTarget: true }).valid).toBe(false);
    });

    it('delete é válido só com alvo', () => {
      const { adapter } = setup();
      expect(adapter.evaluate('delete', {}, { ...OPTS, hasTarget: true }).valid).toBe(true);
      expect(adapter.evaluate('delete', {}, OPTS).valid).toBe(false);
    });
  });

  describe('apresentação', () => {
    it('toFieldDtos marca faltantes e erros; delete não tem campos', () => {
      const { adapter } = setup();
      const ev = adapter.evaluate('create', { value: -1 }, { ...OPTS, defaultResponsible: undefined });
      const dtos = adapter.toFieldDtos('create', ev);
      expect(dtos.find((f) => f.key === 'value')?.error).toBeDefined();
      expect(dtos.find((f) => f.key === 'category')?.missing).toBe(true);
      expect(adapter.toFieldDtos('delete', ev)).toEqual([]);
      const upd = adapter.toFieldDtos('update', adapter.evaluate('update', { value: 9 }, { ...OPTS, hasTarget: true }));
      expect(upd.map((f) => f.key)).toEqual(['value']);
    });

    it('recordToFieldDtos mostra valores formatados e não editáveis', () => {
      const { adapter } = setup();
      const dtos = adapter.recordToFieldDtos(txRow() as unknown as Record<string, unknown>);
      expect(dtos.find((f) => f.key === 'value')?.display).toBe('R$ 120,00');
      expect(dtos.find((f) => f.key === 'date')?.display).toBe('10/10/2026');
      expect(dtos.find((f) => f.key === 'paid')?.display).toBe('Pago');
      expect(dtos.find((f) => f.key === 'type')?.display).toBe('Despesa');
      expect(dtos.every((f) => f.editable === false)).toBe(true);
    });

    it('describe cobre create, update e delete', () => {
      const { adapter } = setup();
      const before = txRow() as unknown as Record<string, unknown>;
      expect(adapter.describe('create', { type: 'income', value: 10, category: 'Salário', title: 'Pix' })).toBe(
        'Criar receita de R$ 10,00 em Salário (Pix)',
      );
      expect(adapter.describe('delete', {}, before)).toBe('Remover despesa "Mercado" de R$ 120,00 em 10/10/2026');
      expect(adapter.describe('delete', {})).toBe('Remover transação');
      const text = adapter.describe(
        'update',
        { value: 150, date: '2026-10-11', category: 'Casa', title: 'Novo', paid: false, type: 'income', responsible: 'Leo' },
        before,
      );
      expect(text).toContain('valor para R$ 150,00');
      expect(text).toContain('data para 11/10/2026');
      expect(text).toContain('situação para pendente');
      expect(adapter.describe('update', { paid: true }, before)).toContain('situação para pago');
      expect(adapter.describe('update', {}, before)).toMatch(/^Alterar despesa/);
    });
  });

  describe('acesso a dados (sempre escopado por userId)', () => {
    it('search limita a 5, usa data exata e monta rótulos sem id', async () => {
      const { adapter, service } = setup();
      service.searchTransactions.mockResolvedValue(Array.from({ length: 7 }, (_, i) => txRow({ id: `t${i}` })));
      const found = await adapter.search('user-1', { query: 'mercado', amount: 120, date: '2026-10-10' });
      expect(service.searchTransactions).toHaveBeenCalledWith({
        userId: 'user-1',
        query: 'mercado',
        amount: 120,
        startDate: '2026-10-10',
        endDate: '2026-10-10',
        limit: 5,
      });
      expect(found).toHaveLength(5);
      expect(found[0].id).toBe('t0');
      expect(found[0].label).toBe('10/10/2026 · Mercado · R$ 120,00 · (despesa)');
      expect(found[0].record).not.toHaveProperty('id');
      expect(found[0].record).not.toHaveProperty('userId');
    });

    it('getById devolve snapshot, null quando não encontrada e propaga outros erros', async () => {
      const { adapter, service } = setup();
      service.getTransactionById.mockResolvedValueOnce(txRow());
      expect(await adapter.getById('user-1', 'tx-1')).toMatchObject({ title: 'Mercado' });
      service.getTransactionById.mockResolvedValueOnce(null);
      expect(await adapter.getById('user-1', 'tx-1')).toBeNull();
      service.getTransactionById.mockRejectedValueOnce(new Error('Transação não encontrada'));
      expect(await adapter.getById('user-1', 'tx-1')).toBeNull();
      service.getTransactionById.mockRejectedValueOnce(new Error('db down'));
      await expect(adapter.getById('user-1', 'tx-1')).rejects.toThrow('db down');
    });

    it('create injeta o userId do servidor', async () => {
      const { adapter, service } = setup();
      const res = await adapter.create('user-1', { title: 'x', userId: 'outro' });
      expect(service.createTransaction).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
      expect(res.id).toBe('tx-new');
    });

    it('update preserva paid/is_recurring atuais ao alterar só o valor', async () => {
      const { adapter, service } = setup();
      await adapter.update('user-1', 'tx-1', { value: 150 }, { paid: true, is_recurring: true });
      expect(service.updateTransaction).toHaveBeenCalledWith('tx-1', {
        value: 150,
        paid: true,
        is_recurring: true,
        userId: 'user-1',
      });
      await adapter.update('user-1', 'tx-1', { paid: false }, { paid: true });
      expect(service.updateTransaction).toHaveBeenLastCalledWith(
        'tx-1',
        expect.objectContaining({ paid: false, is_recurring: false }),
      );
    });

    it('remove delega com userId', async () => {
      const { adapter, service } = setup();
      await adapter.remove('user-1', 'tx-1');
      expect(service.deleteTransaction).toHaveBeenCalledWith('tx-1', 'user-1');
    });
  });
});
