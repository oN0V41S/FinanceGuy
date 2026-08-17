/**
 * E2E-style (RED — reprodução de bug) — Issue #9: criar/editar/deletar
 * transação salva no banco, porém a visualização (client-side) não atualiza.
 *
 * CAUSA RAIZ reproduzida por este harness:
 * - GET /api/transactions responde com `Cache-Control: private, max-age=300`
 *   (issue #9). O NAVEGADOR cacheia a resposta por 5 minutos.
 * - O hook `useTransactions` (src/features/transactions/hooks/useTransactions.ts)
 *   faz `fetch(url, undefined)` — SEM `cache: 'no-store'` — em todos os
 *   refetches, inclusive os pós-mutation (create/update/delete).
 * - O browser devolve a resposta CACHEADA (dados VELHOS) → a UI continua
 *   exibindo a transação deletada/antiga, ou omite a recém-criada.
 *
 * ESTRATÉGIA — o `global.fetch` é mockado como o CACHE HTTP DO BROWSER:
 * - `responseCache: Map<URL, payload>`: GET sem `cache: 'no-store'` serve do
 *   cache quando já existe (simulando max-age=300); GET com `no-store` busca
 *   no servidor e atualiza o cache.
 * - O "servidor" (`serverDb`) EVOLUI: POST/PUT/DELETE alteram o estado.
 * - O cache do browser NÃO é invalidado por mutations (igual ao browser real).
 *
 * O hook `useTransactions` é REAL (não mockado) — o harness é um consumidor
 * legítimo com o fluxo de exclusão via modal de confirmação.
 *
 * RED esperado: os 3 cenários FALHAM porque o refetch pós-mutation é servido
 * do responseCache com dados velhos.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
    // id determinístico 'c' — o teste de create declara o cenário "agora
    // [A, C]" e assere `tx-title-c`; sem isto a asserção seria insatisfazível.
    const created: Transaction = buildTransaction(
      'c',
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

function currentMonthDate(day = 10): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

function TransactionsUiHarness() {
  const {
    transactions,
    isLoading,
    error,
    createTransaction,
    updateTransaction,
    openConfirmModal,
    isConfirmModalOpen,
    closeConfirmModal,
    confirmDeleteTransaction,
  } = useTransactions();

  return (
    <div>
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

      <button
        type="button"
        data-testid="btn-create-c"
        onClick={() =>
          void createTransaction({
            title: 'Transação C',
            description: 'Criada via UI',
            value: '300',
            date: currentMonthDate(),
            responsible: 'João',
            category: 'Lazer',
            type: 'expense',
            is_recurring: false,
            paid: false,
          })
        }
      >
        Criar transação C
      </button>

      <button
        type="button"
        data-testid="btn-edit-a"
        onClick={() =>
          void updateTransaction('a', {
            description: 'Supermercado editado',
            value: '20',
            date: currentMonthDate(),
            responsible: 'João',
            category: 'Alimentação',
            type: 'expense',
            is_recurring: false,
            paid: false,
          })
        }
      >
        Editar transação A (10 → 20)
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Testes RED (reprodução do bug #1 — UI não atualiza após mutations)
// ---------------------------------------------------------------------------

describe('Transactions UI — CRUD com refetch do hook real (E2E RED — Issue #9: cache do browser)', () => {
  const user = userEvent.setup();

  let year = '';
  let month = '';
  let monthKey = '';

  beforeEach(() => {
    localStorage.clear();
    serverDb.clear();
    responseCache.clear();
    const now = new Date();
    year = String(now.getFullYear());
    month = String(now.getMonth() + 1).padStart(2, '0');
    monthKey = `${year}-${month}`;
    installFetchMock();
  });

  afterEach(() => {
    restoreFetchMock();
    jest.restoreAllMocks();
  });

  it('FAILS/REPLICATES bug: deletar transação atualiza a UI (refetch servido do responseCache)', async () => {
    // Servidor começa com [A, B] no mês corrente
    serverDb.set(monthKey, [
      buildTransaction('a', `${year}-${month}-10`, 'Supermercado', 10),
      buildTransaction('b', `${year}-${month}-12`, 'Salário', 5000, {
        type: 'income',
        category: 'Salário',
      }),
    ]);

    render(<TransactionsUiHarness />);

    // Estado inicial: [A, B] carregados do servidor (primeiro GET popula o cache)
    expect(await screen.findByTestId('tx-title-a')).toHaveTextContent('Supermercado');
    expect(screen.getByTestId('tx-title-b')).toHaveTextContent('Salário');

    // Usuário exclui A pela UI (modal de confirmação → confirmDeleteTransaction)
    await user.click(screen.getByRole('button', { name: 'Excluir transação a' }));
    await user.click(screen.getByTestId('btn-confirm-delete'));

    // GREEN (Issue #9 fixado): o refetch pós-mutation usa cache:'no-store' →
    // o "browser" busca FRESCO no servidor ([B]) e atualiza o responseCache —
    // 'a' NÃO reaparece. Não há elemento novo pós-refetch (B já existia antes),
    // então aguardamos a AUSÊNCIA de 'a' como sinal do re-render com dados novos.
    await waitFor(() => expect(screen.queryByTestId('tx-title-a')).not.toBeInTheDocument());

    // Esperado: A não deve existir na lista após o refetch.
    expect(screen.queryByTestId('tx-title-a')).not.toBeInTheDocument();
  });

  it('FAILS/REPLICATES bug: criar transação atualiza a UI (refetch servido do responseCache)', async () => {
    // Servidor começa com [A]
    serverDb.set(monthKey, [
      buildTransaction('a', `${year}-${month}-10`, 'Supermercado', 10),
    ]);

    render(<TransactionsUiHarness />);
    expect(await screen.findByTestId('tx-title-a')).toHaveTextContent('Supermercado');

    // Cria C via UI → POST no servidor (agora [A, C]) → refetch sem no-store
    await user.click(screen.getByTestId('btn-create-c'));

    // RED — esperado: C deveria aparecer após o refetch. O responseCache
    // devolve [A] (dados velhos) → C nunca aparece → findBy falha (timeout).
    expect(await screen.findByTestId('tx-title-c')).toBeInTheDocument();
  });

  it('FAILS/REPLICATES bug: editar transação atualiza a UI (refetch servido do responseCache)', async () => {
    // Servidor começa com [A(valor 10)]
    serverDb.set(monthKey, [
      buildTransaction('a', `${year}-${month}-10`, 'Supermercado', 10),
    ]);

    render(<TransactionsUiHarness />);
    expect(await screen.findByTestId('tx-title-a')).toHaveTextContent('Supermercado');
    expect(screen.getByTestId('tx-value-a')).toHaveTextContent(/R\$\s*10/);

    // Edita A (valor 10 → 20) via UI → PUT no servidor → refetch sem no-store
    await user.click(screen.getByTestId('btn-edit-a'));

    // Aguarda o refetch pós-mutation terminar: a lista re-renderiza com o
    // payload VELHO (responseCache) → A continua valendo 10.
    await screen.findByTestId('tx-title-a');

    // RED — esperado: R$ 20,00. O responseCache devolve A com valor 10.
    expect(screen.getByTestId('tx-value-a')).toHaveTextContent(/R\$\s*20/);
  });
});