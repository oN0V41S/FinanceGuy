/**
 * E2E-style (RED — reprodução de bug) — Issue #9 (bug #2): ao DELETAR uma
 * transação recorrente/parcelada, ela CONTINUA aparecendo na tela.
 *
 * CENÁRIO reportado: usuário no mês 01 (lista [RecorrenteX]) → troca para o
 * mês 02 (lista []) → volta para o mês 01 → deleta RecorrenteX (o servidor
 * passa a retornar [] para o mês 01) → a transação CONTINUA visível.
 *
 * CAUSA RAIZ reproduzida por este harness:
 * - GET /api/transactions responde com `Cache-Control: private, max-age=300`
 *   (issue #9); o NAVEGADOR cacheia a resposta por 5 minutos.
 * - O hook `useTransactions` refaz `fetch(url, undefined)` — SEM
 *   `cache: 'no-store'` — após a mutation; o GET do mês 01 é servido do
 *   `responseCache` (com RecorrenteX ainda presente) → dados velhos na tela.
 *
 * O `global.fetch` é mockado como o CACHE HTTP DO BROWSER (idêntico ao
 * transactions-ui.crud.e2e.test.tsx, extraído para este arquivo por serem
 * testes temporários):
 * - `responseCache: Map<URL, payload>` — GET sem `no-store` serve do cache;
 *   GET com `no-store` busca no servidor e atualiza o cache.
 * - O "servidor" (`serverDb`) evolui com POST/PUT/DELETE; o cache do browser
 *   NÃO é invalidado por mutations.
 *
 * O hook `useTransactions` é REAL (não mockado) — o harness é um consumidor
 * legítimo com troca de mês e o fluxo de exclusão via modal de confirmação.
 *
 * RED esperado: o cenário stale pós-delete FALHA; o teste intermediário de
 * troca de mês PASSA (prova que o harness funciona).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import useTransactions from '@/features/transactions/hooks/useTransactions';
import type { Transaction, FinancialSummary } from '@/features/transactions/validations';
import { formatCurrency } from '@/shared/utils';

// ---------------------------------------------------------------------------
// Mock: servidor + cache HTTP do browser (Cache-Control: private, max-age=300)
// ---------------------------------------------------------------------------

interface TransactionsPayload {
  data: Transaction[];
  summary: FinancialSummary;
  total: number;
}

/** Estado do "servidor": transações por mês (chave YYYY-MM). */
const serverDb = new Map<string, Transaction[]>();

/** Cache do "browser": resposta de cada URL de GET — NÃO é invalidado por mutations. */
const responseCache = new Map<string, TransactionsPayload>();

function buildTransaction(
  id: string,
  date: string,
  description: string,
  value: number,
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id,
    date,
    title: description,
    description,
    value,
    type: 'expense',
    category: 'Alimentação',
    responsible: 'João',
    is_recurring: false,
    paid: false,
    ...overrides,
  };
}

/** Serialização/parse — imita o browser desserializando a resposta cacheada. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fakeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function extractUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function idFromUrl(url: string): string {
  return url.split('?')[0].split('/').pop() ?? '';
}

function monthKeyFromUrl(url: string): string {
  const queryString = url.includes('?') ? url.split('?')[1] : '';
  return new URLSearchParams(queryString).get('startDate')?.slice(0, 7) ?? '';
}

function serverGetPayload(monthKey: string): TransactionsPayload {
  const data = serverDb.get(monthKey) ?? [];
  const income = data
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.value, 0);
  const expense = data
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.value, 0);
  return {
    data,
    summary: { income, expense, balance: income - expense },
    total: data.length,
  };
}

function parseBody(init?: RequestInit): Record<string, unknown> {
  return JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
}

async function browserFetchMock(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = extractUrl(input);
  const method = init?.method ?? 'GET';

  if (method === 'GET') {
    // BUG #9: sem `cache: 'no-store'`, o "browser" devolve a resposta VELHA
    // (simula o `Cache-Control: private, max-age=300` do GET /api/transactions).
    const cached = responseCache.get(url);
    if (init?.cache !== 'no-store' && cached !== undefined) {
      return fakeResponse(clone(cached));
    }
    const fresh = serverGetPayload(monthKeyFromUrl(url));
    responseCache.set(url, clone(fresh));
    return fakeResponse(clone(fresh));
  }

  if (method === 'POST') {
    const raw = parseBody(init);
    const date = String(raw.date ?? '');
    const monthKey = date.slice(0, 7);
    const created: Transaction = buildTransaction(
      `created-${Math.random()}`,
      date,
      String(raw.description ?? raw.title ?? 'Sem descrição'),
      Number(raw.value ?? 0),
      {
        type: raw.type === 'income' ? 'income' : 'expense',
        category: (raw.category as Transaction['category']) ?? 'Outros',
        responsible: String(raw.responsible ?? ''),
        is_recurring: Boolean(raw.is_recurring),
        paid: Boolean(raw.paid),
      },
    );
    serverDb.set(monthKey, [...(serverDb.get(monthKey) ?? []), created]);
    return fakeResponse({ data: created }, 201);
  }

  if (method === 'PUT') {
    const id = idFromUrl(url);
    const raw = parseBody(init);
    const patch: Partial<Transaction> = {};
    if (raw.value !== undefined) patch.value = Number(raw.value);
    if (raw.description !== undefined) patch.description = String(raw.description);
    if (raw.title !== undefined) patch.title = String(raw.title);
    if (raw.paid !== undefined) patch.paid = Boolean(raw.paid);
    if (raw.type !== undefined) patch.type = raw.type === 'income' ? 'income' : 'expense';
    if (raw.category !== undefined) patch.category = raw.category as Transaction['category'];
    if (raw.date !== undefined) patch.date = String(raw.date);
    for (const [key, list] of serverDb) {
      serverDb.set(key, list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    }
    return fakeResponse({ data: { id } });
  }

  if (method === 'DELETE') {
    const id = idFromUrl(url);
    for (const [key, list] of serverDb) {
      serverDb.set(key, list.filter((t) => t.id !== id));
    }
    return fakeResponse({ success: true });
  }

  return fakeResponse({ error: 'Método não suportado' }, 405);
}

let originalFetch: typeof fetch | undefined;

function installFetchMock(): void {
  // jsdom deste setup não expõe fetch natural — guardamos o valor (undefined
  // ou o fetch do runtime) e o restauramos no afterEach.
  originalFetch = globalThis.fetch;
  globalThis.fetch = browserFetchMock as unknown as typeof fetch;
}

function restoreFetchMock(): void {
  if (originalFetch !== undefined) {
    globalThis.fetch = originalFetch;
  } else {
    delete (globalThis as { fetch?: unknown }).fetch;
  }
}

// ---------------------------------------------------------------------------
// Harness: consumidor REAL do hook useTransactions (sem mockar o hook)
// ---------------------------------------------------------------------------

function TransactionsUiHarness() {
  const {
    transactions,
    isLoading,
    error,
    selectedMonth,
    setSelectedMonth,
    openConfirmModal,
    isConfirmModalOpen,
    closeConfirmModal,
    confirmDeleteTransaction,
  } = useTransactions();

  return (
    <div>
      <p data-testid="debug-month">{selectedMonth}</p>

      {error !== null && (
        <p role="alert" data-testid="error-banner">{error}</p>
      )}

      {isLoading ? (
        <p data-testid="loading-state">Carregando transações...</p>
      ) : (
        <ul data-testid="transactions-list">
          {transactions.map((tx) => (
            <li key={tx.id} data-testid={`transaction-item-${tx.id}`}>
              <span data-testid={`tx-title-${tx.id}`}>{tx.title || tx.description}</span>
              <span data-testid={`tx-value-${tx.id}`}>{formatCurrency(tx.value)}</span>
              <button
                type="button"
                aria-label={`Excluir transação ${tx.id}`}
                onClick={() => openConfirmModal(tx)}
              >
                Excluir
              </button>
            </li>
          ))}
          {transactions.length === 0 && (
            <p data-testid="transactions-empty">Nenhuma transação encontrada</p>
          )}
        </ul>
      )}

      {isConfirmModalOpen && (
        <div data-testid="confirm-modal">
          <button
            type="button"
            data-testid="btn-confirm-delete"
            onClick={() => void confirmDeleteTransaction('single')}
          >
            Confirmar exclusão
          </button>
          <button type="button" onClick={closeConfirmModal}>
            Cancelar
          </button>
        </div>
      )}

      <button type="button" data-testid="btn-month-01" onClick={() => setSelectedMonth('01')}>
        Ir para mês 01
      </button>
      <button type="button" data-testid="btn-month-02" onClick={() => setSelectedMonth('02')}>
        Ir para mês 02
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Testes — troca de mês (PASSES, prova do harness) + stale pós-delete (RED)
// ---------------------------------------------------------------------------

describe('Transactions UI — troca de mês com refetch do hook real (E2E RED — Issue #9: cache do browser)', () => {
  const user = userEvent.setup();

  let year = '';
  let januaryKey = '';
  let februaryKey = '';

  beforeEach(() => {
    localStorage.clear();
    serverDb.clear();
    responseCache.clear();
    year = String(new Date().getFullYear());
    januaryKey = `${year}-01`;
    februaryKey = `${year}-02`;
    installFetchMock();
  });

  afterEach(() => {
    restoreFetchMock();
    jest.restoreAllMocks();
  });

  it('trocar de mês carrega corretamente (PASSES — prova que o harness funciona)', async () => {
    // Mês 01: [RecorrenteX]; Mês 02: [] (vazio)
    serverDb.set(januaryKey, [
      buildTransaction('rec-x', `${year}-01-05`, 'RecorrenteX', 99, {
        is_recurring: true,
        total_installments: 3,
      }),
    ]);
    serverDb.set(februaryKey, []);

    render(<TransactionsUiHarness />);

    // Mês 01: carrega [RecorrenteX] (primeiro GET popula o responseCache)
    await user.click(screen.getByTestId('btn-month-01'));
    expect(await screen.findByTestId('tx-title-rec-x')).toHaveTextContent('RecorrenteX');
    expect(screen.getByTestId('debug-month')).toHaveTextContent('01');

    // Mês 02: lista vazia (GET novo → servidor responde [])
    await user.click(screen.getByTestId('btn-month-02'));
    expect(await screen.findByTestId('transactions-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('tx-title-rec-x')).not.toBeInTheDocument();
    expect(screen.getByTestId('debug-month')).toHaveTextContent('02');

    // Volta ao mês 01: RecorrenteX aparece novamente (ainda não deletado)
    await user.click(screen.getByTestId('btn-month-01'));
    expect(await screen.findByTestId('tx-title-rec-x')).toHaveTextContent('RecorrenteX');
  });

  it('FAILS/REPLICATES bug: deletar recorrente do mês 01 NÃO remove da tela (GET servido do responseCache)', async () => {
    // Mês 01: [RecorrenteX]; Mês 02: [] (vazio)
    serverDb.set(januaryKey, [
      buildTransaction('rec-x', `${year}-01-05`, 'RecorrenteX', 99, {
        is_recurring: true,
        total_installments: 3,
      }),
    ]);
    serverDb.set(februaryKey, []);

    render(<TransactionsUiHarness />);

    // Usuário no mês 01 com [RecorrenteX] — primeiro GET popula o responseCache
    await user.click(screen.getByTestId('btn-month-01'));
    expect(await screen.findByTestId('tx-title-rec-x')).toHaveTextContent('RecorrenteX');

    // Troca para o mês 02 (lista vazia)
    await user.click(screen.getByTestId('btn-month-02'));
    expect(await screen.findByTestId('transactions-empty')).toBeInTheDocument();

    // Volta ao mês 01: GET servido do responseCache — RecorrenteX ainda
    // correto, pois nada foi deletado até aqui.
    await user.click(screen.getByTestId('btn-month-01'));
    expect(await screen.findByTestId('tx-title-rec-x')).toHaveTextContent('RecorrenteX');

    // Exclui RecorrenteX — o servidor passa a retornar [] para o mês 01
    await user.click(screen.getByRole('button', { name: 'Excluir transação rec-x' }));
    await user.click(screen.getByTestId('btn-confirm-delete'));

    // GREEN (Issue #9 fixado): o refetch pós-delete usa cache:'no-store' → o
    // "browser" busca FRESCO no servidor ([]) e atualiza o responseCache —
    // RecorrenteX NÃO reaparece. O sinal do refetch é a lista vazia
    // (transactions-empty), que só existe APÓS o re-render com os dados novos.
    await screen.findByTestId('transactions-empty');

    // Esperado: após o delete, RecorrenteX NÃO deve aparecer no mês 01.
    expect(screen.queryByTestId('tx-title-rec-x')).not.toBeInTheDocument();
  });
});