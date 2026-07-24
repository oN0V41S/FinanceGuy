# Tela de Transações — FinanceGuy

**Versão**: 1.0 | **Status**: ✅ Completa (TDD) | **Última atualização**: Julho 2026

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Estrutura de Arquivos](#2-estrutura-de-arquivos)
3. [Padrões e Convenções](#3-padrões-e-convenções)
4. [Componentes](#4-componentes)
5. [Hook Central — `useTransactions`](#5-hook-central--usetransactions)
6. [Fluxos](#6-fluxos)
7. [API](#7-api)
8. [Validação com Zod](#8-validação-com-zod)
9. [Testes](#9-testes)
10. [Estados da UI](#10-estados-da-ui)
11. [Referências](#11-referências)

---

## 1. Visão Geral

### Propósito

A **Tela de Transações** (`/transactions`) é a página central do FinanceGuy para o usuário gerenciar todas as transações financeiras. Ela permite visualizar, filtrar, criar, editar e excluir lançamentos de receitas e despesas.

### Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| **Visualizar Transações** | Lista completa com descrição, data, categoria, valor e ações |
| **Filtrar por Período** | Três modos: Todos, Por Mês, Por Quinzena (1ª ou 2ª) |
| **Resumo Financeiro** | 3 cards: Entradas, Saídas e Saldo (atualizados conforme filtro) |
| **Criar Transação** | Modal com formulário completo e validação Zod |
| **Editar Transação** | Modal preenchido com dados existentes |
| **Excluir Transação** | Remoção via botão na tabela |
| **Loading State** | Skeleton na tabela + shimmer nos cards |
| **Empty State** | Estado vazio quando não há transações no período |
| **Error State** | Banner de erro com botão "Tentar novamente" |

### Arquitetura

```
TransactionsPage (page.tsx)
  ├── HeaderLayout          ← Cabeçalho com menu drawer
  ├── Error Banner          ← Estado de erro com retry
  ├── FilterControls        ← Selects shadcn-ui (período, ano, mês, quinzena)
  ├── SummaryCards (3)      ← Entradas, Saídas, Saldo
  ├── LazyLoad              ← Só renderiza quando pronto
  │   ├── EmptyState        ← Quando não há dados
  │   └── TransactionsTable ← Tabela com linhas + ações editar/excluir
  ├── MobileNavBar          ← Navegação inferior mobile
  ├── FAB (+)               ← Botão flutuante mobile para nova transação
  └── TransactionModal      ← Modal de criar/editar (fora do LazyLoad)

useTransactions (hook)
  ├── Fetch (GET /api/transactions)          ← Busca com filtros
  ├── createTransaction (POST)               ← Criar
  ├── updateTransaction (PUT)                ← Editar
  ├── deleteTransaction (DELETE)             ← Excluir
  └── Modal State (open/close/edit)         ← Controle do modal
```

### Princípios

- **TDD**: Testes escritos antes da implementação
- **Clean Architecture**: Separação clara entre UI, hook, service e repositório
- **shadcn-ui**: Componentes de UI padronizados (Select, Button, Input, Badge, Modal)
- **VISUAL_IDENTITY.md**: Cores e tokens visuais seguem o design system
- **Componentes reutilizáveis**: `SummaryCard`, `EmptyState`, `LazyLoad` são compartilhados com o Dashboard

---

## 2. Estrutura de Arquivos

```
src/
├── app/transactions/
│   ├── page.tsx                         # Página principal (client component)
│   ├── loading.tsx                      # Next.js Streaming (skeleton inicial)
│   └── __tests__/
│       └── page.test.tsx               # 49 testes de integração
│
└── features/transactions/
    ├── hooks/
    │   ├── useTransactions.ts           # Hook central (303 linhas)
    │   └── __tests__/
    │       └── useTransactions.test.ts  # 33 testes
    ├── components/
    │   ├── FilterControls.tsx           # Filtros shadcn-ui Select
    │   ├── TransactionsTable.tsx        # Tabela com estados loading/empty/success
    │   ├── TransactionModal.tsx         # Modal CRUD com validação Zod
    │   └── __tests__/
    │       └── TransactionModal.test.tsx # 36+ testes
    ├── api/
    │   ├── route.ts                     # GET / POST /api/transactions
    │   └── [id]/
    │       └── route.ts                 # GET / PUT / DELETE /api/transactions/[id]
    ├── transactions.service.ts         # Service layer (CRUD + parcelamento)
    ├── ITransaction.repository.ts      # Interface do repositório
    ├── postgresTransaction.repository.ts # Implementação Prisma
    ├── validations.ts                  # Schemas Zod (Transaction, FinancialSummary)
    └── types.ts                        # TransactionFormData, initialFormData
```

---

## 3. Padrões e Convenções

### 3.1 Padrão de Página

A `TransactionsPage` segue o mesmo padrão do Dashboard:
- **`HeaderLayout`**: Cabeçalho com botão de menu (drawer)
- **`MobileNavBar`**: Navegação inferior fixa em mobile
- **Drawer**: Menu lateral com links Dashboard, Transações e Configurações
- **Responsividade**: FAB mobile aparece apenas em `md:hidden`

```tsx
// Estrutura da página
<div className="min-h-dvh bg-background">
  {/* Drawer overlay + panel */}
  <HeaderLayout />
  <main>
    <FilterControls />
    <SummaryCard />
    <LazyLoad>
      <TransactionsTable /> | <EmptyState />
    </LazyLoad>
  </main>
  <MobileNavBar />
  <FAB />  {/* md:hidden */}
  <TransactionModal />
</div>
```

### 3.2 Padrão do Hook

`useTransactions` segue o mesmo padrão de `useDashboardData`:
- **Estado local**: `useState` para dados, loading, erro, filtros e modal
- **`useEffect`**: Fetch automático quando filtros mudam
- **`useCallback`**: Todos os setters e CRUD operations
- **Cleanup**: `cancelled` flag para evitar atualizações após desmontagem
- **Retorno**: Objeto completo com dados, setters e ações

### 3.3 shadcn-ui

Substituição completa de HTML nativo por componentes shadcn-ui:

| Componente | shadcn-ui | Antes (HTML nativo) |
|------------|-----------|---------------------|
| Filtros | `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` | `<select>` |
| Botões | `Button` | `<button>` |
| Inputs | `Input` | `<input>` |
| Labels | `Label` | `<label>` |
| Badges | `Badge` | `<span>` |
| Modal | `Modal` (custom) | — |

### 3.4 Tokens VISUAL_IDENTITY.md

Cores utilizadas seguem `@docs/VISUAL_IDENTITY.md`:

| Token | Uso |
|-------|-----|
| `bg-background` | Fundo da página |
| `bg-card` | Fundo da tabela (card) |
| `bg-muted/50` | Header da tabela, filtros |
| `text-on-surface` | Texto principal |
| `text-on-surface-variant` | Texto secundário |
| `text-finance-income` | Valores de receita |
| `text-finance-expense` | Valores de despesa |
| `bg-brand-primary` | Botão "Nova Transação" e FAB |
| `bg-surface-container` | Drawer |
| `border-border` | Bordas |

### 3.5 TDD

Todo o código foi desenvolvido seguindo TDD:
1. **Especificações** definidas como casos de teste
2. **Testes** escritos primeiro (Red)
3. **Implementação** mínima para passar (Green)
4. **Refatoração** mantendo testes verdes

---

## 4. Componentes

### 4.1 FilterControls

**Arquivo**: `src/features/transactions/components/FilterControls.tsx`

Componente de filtros usando `Select` do shadcn-ui. Exibe dinamicamente os selects conforme o período escolhido.

**Props**:
```typescript
interface FilterControlsProps {
  filterPeriod: 'all' | 'month' | 'fortnight';
  onFilterPeriodChange: (value: 'all' | 'month' | 'fortnight') => void;
  selectedYear: string;
  onYearChange: (value: string) => void;
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  selectedFortnight: FortnightValue;
  onFortnightChange: (value: FortnightValue) => void;
}
```

**Comportamento**:
- **`filterPeriod = 'all'`**: Apenas select de período (Todos / Mês / Quinzena)
- **`filterPeriod = 'month'`**: Período + Ano + Mês
- **`filterPeriod = 'fortnight'`**: Período + Ano + Mês + Quinzena (1ª / 2ª / Ambas)

### 4.2 TransactionsTable

**Arquivo**: `src/features/transactions/components/TransactionsTable.tsx`

Tabela com 3 estados gerenciados via props:

| Estado | Gatilho | Renderização |
|--------|---------|-------------|
| **Loading** | `isLoading = true` | 5 rows de skeleton (Shimmer) |
| **Empty** | `transactions.length === 0` | Mensagem "Nenhuma transação encontrada" |
| **Success** | `transactions.length > 0` | Linhas com dados + ações editar/excluir |

**Colunas**: Descrição (com responsible), Data, Categoria (Badge), Valor (com cor type), Ações (ícones).

**Ações por linha**:
- **Editar** (`Edit2`): Chama `onEdit(transaction)`
- **Excluir** (`Trash2`): Chama `onDelete(transaction.id)`

### 4.3 TransactionModal

**Arquivo**: `src/features/transactions/components/TransactionModal.tsx`

Modal de criação/edição com validação Zod client-side.

**Props**:
```typescript
interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TransactionFormData) => Promise<void>;
  transaction?: Transaction | null;
  isLoading?: boolean;
}
```

**Campos do formulário**:
| Campo | Tipo | Validação |
|-------|------|-----------|
| Tipo | Toggle buttons (Receita / Despesa) | Obrigatório |
| Descrição | Input text | 1-255 caracteres |
| Valor | Input decimal | Deve ser positivo |
| Data | Input date | Obrigatória |
| Categoria | Select (9 opções) | Do enum CategoryEnum |
| Responsável | Input text | 1-100 caracteres |
| Pago | Checkbox | Booleano |

**Estados**:
- **Create**: Título "Nova Transação", campos vazios, type default "expense"
- **Edit**: Título "Editar Transação", campos preenchidos com dados existentes
- **Submitting**: Botão "Salvando..." desabilitado
- **Error**: Banner vermelho no topo com mensagem de erro
- **Validation Error**: Mensagens inline abaixo de cada campo inválido

**Validação**: Schema Zod `FormSchema` que valida todos os campos antes de chamar `onSave`.

### 4.4 Loading (Next.js Streaming)

**Arquivo**: `src/app/transactions/loading.tsx`

Skeleton inicial exibido enquanto a página não carrega (Next.js Streaming):
- Header skeleton
- Title skeleton (48px width)
- 3 cards skeleton (grid)
- 5 rows skeleton (table)

---

## 5. Hook Central — `useTransactions`

**Arquivo**: `src/features/transactions/hooks/useTransactions.ts`

### Interface de Retorno

```typescript
interface UseTransactionsReturn {
  // Dados
  transactions: Transaction[];
  summary: FinancialSummary;
  isLoading: boolean;
  error: string | null;

  // Filtros
  filterPeriod: 'all' | 'month' | 'fortnight';
  setFilterPeriod: (period: 'all' | 'month' | 'fortnight') => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedFortnight: FortnightValue;
  setSelectedFortnight: (fortnight: FortnightValue) => void;

  // CRUD
  refresh: () => void;
  createTransaction: (data: TransactionFormData) => Promise<void>;
  updateTransaction: (id: string, data: Partial<TransactionFormData>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Modal
  isModalOpen: boolean;
  editingTransaction: Transaction | null;
  openCreateModal: () => void;
  openEditModal: (transaction: Transaction) => void;
  closeModal: () => void;
}
```

### Lógica de Datas (URL Building)

A função `buildTransactionsUrl` constrói a URL com `startDate` e `endDate`:

| filterPeriod | selectedFortnight | startDate | endDate |
|-------------|-------------------|-----------|---------|
| `'all'` | — | (sem params) | (sem params) |
| `'month'` | — | YYYY-MM-01 | YYYY-MM-último_dia |
| `'fortnight'` | `'first'` | YYYY-MM-01 | YYYY-MM-15 |
| `'fortnight'` | `'second'` | YYYY-MM-16 | YYYY-MM-último_dia |

**Regras**:
- Se `filterPeriod = 'fortnight'` com `fortnight = 'all'`, o hook resolve automaticamente para a quinzena atual (baseada no dia corrente).
- Anos bissextos são corretamente calculados (fevereiro 29 dias).
- Mudar de volta de `'fortnight'` para `'month'` reseta `selectedFortnight` para `'all'`.

### Fluxo de Fetch

```
[Filter Change] → useEffect → setIsLoading(true)
    ↓
fetch(`/api/transactions?${params}`)
    ↓
[Success] → setTransactions(data) + setSummary(summary) + setError(null)
[Error]   → setError(message) + setTransactions([]) + setSummary({0,0,0})
    ↓
[Cancelled] → Ignora resultado (prevenção de memory leak)
    ↓
setIsLoading(false)
```

### CRUD via API

| Operação | Método | Endpoint | Refetch |
|----------|--------|----------|---------|
| createTransaction | POST | `/api/transactions` | ✅ refresh() |
| updateTransaction | PUT | `/api/transactions/[id]` | ✅ refresh() |
| deleteTransaction | DELETE | `/api/transactions/[id]` | ✅ refresh() |

Todas as operações propagam erros via `throw` — o componente pai deve capturá-los.

---

## 6. Fluxos

### 6.1 Visualizar Transações

```
1. Usuário acessa /transactions
2. useTransactions é montado com:
   - filterPeriod = 'month' (padrão)
   - selectedYear = ano atual
   - selectedMonth = mês atual
3. useEffect dispara fetch:
   GET /api/transactions?startDate=2026-07-01&endDate=2026-07-31
4. Página renderiza:
   - Loading: skeletons nos cards + LazyLoad spinner
   - Success: cards com valores + tabela com dados
   - Empty: cards zerados + EmptyState
   - Error: banner com mensagem + botão "Tentar novamente"
```

### 6.2 Criar Transação

```
1. Usuário clica "Nova Transação" (desktop) ou FAB "+" (mobile)
2. openCreateModal() → isModalOpen = true, editingTransaction = null
3. TransactionModal renderiza com título "Nova Transação"
4. Usuário preenche formulário:
   - Tipo (Receita / Despesa)
   - Descrição
   - Valor
   - Data
   - Categoria
   - Responsável
   - Pago (opcional)
5. Ao clicar "Salvar":
   a. Validação Zod client-side
   b. Se inválido → erros inline
   c. Se válido → chama createTransaction(formData)
      → POST /api/transactions
      → refresh() → refetch dos dados
      → Modal fecha (via closeModal no callback)
6. Se erro → banner "Erro ao salvar transação" no topo do modal
```

### 6.3 Editar Transação

```
1. Usuário clica ícone "Editar" em uma linha da tabela
2. openEditModal(transaction) → isModalOpen = true, editingTransaction = transaction
3. TransactionModal renderiza com título "Editar Transação"
4. Campos preenchidos com dados da transação
5. Usuário altera campos desejados
6. Ao clicar "Salvar":
   a. Validação Zod client-side
   b. Se válido → chama updateTransaction(id, formData)
      → PUT /api/transactions/[id]
      → refresh() → refetch
```

### 6.4 Excluir Transação

```
1. Usuário clica ícone "Excluir" em uma linha da tabela
2. Confirmação: (implementação futura de confirm dialog)
3. Chama deleteTransaction(id) → DELETE /api/transactions/[id]
4. Em caso de erro → throw propagado
5. refresh() → refetch dos dados
```

### 6.5 Filtrar por Período

```
1. Usuário seleciona período no FilterControls:
   - "Todos": GET /api/transactions (sem filtro de data)
   - "Por Mês": Ano + Mês → GET /api/transactions?startDate&endDate
   - "Por Quinzena": Ano + Mês + Quinzena → GET /api/transactions?startDate&endDate
2. Cada mudança de select dispara setFilterPeriod / setSelectedYear / etc.
3. useEffect detecta mudança nas dependências e refaz fetch
4. UI atualiza: cards + tabela com novos dados
```

---

## 7. API

### 7.1 GET /api/transactions

Lista transações do usuário logado com filtros opcionais.

**Headers**:
- `x-user-id`: ID do usuário (injetado pelo proxy/middleware)

**Query Parameters**:
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `startDate` | string (YYYY-MM-DD) | Data inicial do filtro |
| `endDate` | string (YYYY-MM-DD) | Data final do filtro |
| `type` | 'income' \| 'expense' | Filtrar por tipo |
| `category` | string | Filtrar por categoria |
| `responsible` | string | Filtrar por responsável |

**Response** (`200`):
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "expense",
      "description": "Aluguel",
      "value": 1500,
      "date": "2026-01-01",
      "category": "Casa",
      "responsible": "João",
      "paid": true,
      "is_recurring": false,
      "installment_number": null,
      "total_installments": null,
      "parent_transaction_id": null,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  ],
  "summary": {
    "income": 5000,
    "expense": 2300,
    "balance": 2700
  },
  "total": 1
}
```

**Response** (`401`):
```json
{ "error": "Usuário não identificado" }
```

### 7.2 POST /api/transactions

Cria uma nova transação (simples ou parcelada).

**Headers**:
- `x-user-id`: ID do usuário

**Body**:
```json
{
  "type": "expense",
  "description": "Curso online",
  "value": 500,
  "date": "2026-07-15",
  "category": "Educação",
  "responsible": "João",
  "paid": false,
  "total_installments": 3
}
```

**Lógica de Parcelamento** (no service):

Se `total_installments > 1`, o `TransactionService`:
1. Cria transação **pai** com o valor total
2. Cria N transações **filhas**:
   - `value = valorTotal / N parcelas`
   - `installment_number = 1..N`
   - `parent_transaction_id = id da transação pai`

**Response** (`201`):
```json
{
  "data": {
    "id": "uuid",
    "...": "...",
    "installments": [
      { "id": "uuid-filha-1", "installment_number": 1, "value": 166.67 },
      { "id": "uuid-filha-2", "installment_number": 2, "value": 166.67 },
      { "id": "uuid-filha-3", "installment_number": 3, "value": 166.66 }
    ]
  }
}
```

**Response** (`400` — validação):
```json
{ "error": "Validação falhou", "details": [...] }
```

### 7.3 PUT /api/transactions/[id]

Atualiza parcialmente uma transação.

**Body**: Qualquer campo do `UpdateTransactionSchema` (todos opcionais)

**Response** (`200`):
```json
{ "data": { "id": "uuid", "...": "..." } }
```

**Response** (`404`):
```json
{ "error": "Transação não encontrada" }
```

### 7.4 DELETE /api/transactions/[id]

Remove uma transação.

**Response** (`200`):
```json
{ "success": true, "message": "Transação deletada", "id": "uuid" }
```

**Response** (`404`):
```json
{ "error": "Transação não encontrada" }
```

---

## 8. Validação com Zod

### 8.1 Schemas (`validations.ts`)

```typescript
// Enum de tipos
const TransactionTypeEnum = z.enum(['income', 'expense']);

// Enum de categorias (9 opções)
const CategoryEnum = z.enum([
  'Alimentação', 'Transporte', 'Casa', 'Saúde',
  'Educação', 'Lazer', 'Salário', 'Investimentos', 'Outros',
]);

// Schema completo da transação
const TransactionSchema = z.object({
  id: z.string().uuid(),
  type: TransactionTypeEnum,
  description: z.string().min(1).max(255),
  value: z.number().positive(),
  date: z.string().refine((val) => !isNaN(Date.parse(val))),
  category: CategoryEnum,
  responsible: z.string().min(1).max(100),
  installment_number: z.number().positive().optional(),
  total_installments: z.number().positive().optional(),
  is_recurring: z.boolean().optional().default(false),
  parent_transaction_id: z.string().uuid().optional().nullable(),
  paid: z.boolean().optional().default(false),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

const CreateTransactionSchema = TransactionSchema.omit({ id: true });
const UpdateTransactionSchema = TransactionSchema.partial();
```

### 8.2 Form Schema (client-side no TransactionModal)

```typescript
const FormSchema = z.object({
  type: z.enum(['income', 'expense']),
  description: z.string().min(1).max(255),
  value: z.string().refine((val) => {
    if (val === '') return false;
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }),
  date: z.string().min(1),
  category: z.string(),
  responsible: z.string().min(1).max(100),
  paid: z.boolean(),
});
```

### 8.3 Tipos

```typescript
// Tipos inferidos dos schemas
type Transaction = z.infer<typeof TransactionSchema>;
type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
type FinancialSummary = z.infer<typeof FinancialSummarySchema>;

// Tipo para o formulário (value como string)
type TransactionFormData = Omit<Transaction, 'id' | 'value' | ...> & {
  value: string;
  // ...
};
```

---

## 9. Testes

### 9.1 Visão Geral da Cobertura

| Arquivo de Teste | Testes | O que cobre |
|-----------------|--------|-------------|
| `useTransactions.test.ts` | 33 | Hook: fetch, filtros, CRUD, modal, erros, edge cases |
| `TransactionModal.test.tsx` | 36+ | Modal: render create/edit, interações, validação, erros |
| `page.test.tsx` | 49 | Página: render, cards, tabela, empty, loading, error, modal, drawer, filtros |

**Total: ~118 testes** abrangendo hook, componente modal e página completa.

### 9.2 useTransactions.test.ts (33 testes)

**Green Paths** (11 testes):
- Fetch inicial com filtro do mês corrente
- Dados corretos após fetch bem-sucedido
- Array vazio de transações
- `refresh()` reexecuta fetch
- Estado inicial dos filtros (mês/ano atuais)
- Mudança de `filterPeriod` dispara fetch
- `setFilterPeriod('fortnight')` com datas corretas
- Mudança de `selectedMonth` e `selectedYear`
- Mudança de `selectedFortnight`
- `filterPeriod='all'` sem startDate/endDate
- CRUD (`createTransaction`, `updateTransaction`, `deleteTransaction`)
- Modal (`openCreateModal`, `openEditModal`, `closeModal`)

**Red Paths** (6 testes):
- Erro no fetch (status não-OK)
- Exceção de rede
- Mensagem fallback para erro não-Error
- Erro no POST (create)
- Erro no PUT (update)
- Erro no DELETE (delete)
- Limpeza de erro no refresh bem-sucedido

**Edge Cases** (16 testes):
- `filterPeriod='fortnight'` com `first` e `second`
- Ano bissexto (fevereiro 29 dias)
- Reset de `selectedFortnight` ao mudar de volta para 'month'
- Reset de `selectedFortnight` ao mudar para 'all'
- Múltiplas mudanças de filtro (mesmo act → 1 fetch)
- `isLoading` transições (deferred promise)
- Loading durante refresh

### 9.3 TransactionModal.test.tsx (36+ testes)

**Create Mode** (6 testes):
- Título "Nova Transação"
- Campos vazios
- Toggle type padrão "expense"
- Select de categoria com opções
- Checkbox paid

**Edit Mode** (5 testes):
- Título "Editar Transação"
- Campos preenchidos
- Paid marcado como true
- Type correto

**Interações** (7 testes):
- Preenchimento completo e submissão
- `onSave` chamado com dados corretos
- Botão Cancelar → `onClose`
- Botão X → `onClose`
- Alternância income/expense
- Toggle paid true/false

**Estados** (5 testes):
- Botão desabilitado com `isLoading`
- Texto "Salvando..." durante loading
- Botão desabilitado durante submissão
- Modal fechado não renderiza
- Select de categoria com placeholder

**Validação / Red Paths** (7 testes):
- Descrição vazia
- Responsável vazio
- Data vazia
- Valor negativo
- Valor zero
- Erro no `onSave` (rejeitado)
- Erro genérico (rejeitado com string)

**Edição** (4 testes):
- Envio apenas de campos alterados
- Valores originais mantidos
- ID mantido na edição
- Value como string no form

**Edge Cases** (4 testes):
- Descrição muito longa (300 chars)
- Responsável muito longo (150 chars)
- Reset de campos ao reabrir modal
- Data padrão

### 9.4 page.test.tsx (49 testes)

**Green Path — Renderização** (6 testes):
- Título "Transações"
- HeaderLayout, MobileNavBar, FilterControls
- Botão "Nova Transação"
- FAB mobile "+"

**SummaryCards** (5 testes):
- 3 cards com labels "Entradas", "Saídas", "Saldo"
- Valores corretos

**Tabela** (3 testes):
- Renderização com dados
- 3 linhas de transação
- EmptyState não aparece quando há dados

**Empty State** (3 testes):
- EmptyState quando array vazio
- Não mostra EmptyState durante loading

**Loading State** (4 testes):
- Skeleton nos cards
- LazyLoad spinner
- LazyLoad escondido após loading

**Error State** (5 testes):
- Banner com mensagem
- Botão "Tentar novamente"
- Botão chama `refresh()`
- Banner não aparece quando error = null
- Erro com dados em cache

**Modal** (7 testes):
- Botão "Nova Transação" → `openCreateModal`
- FAB → `openCreateModal`
- Editar tabela → `openEditModal`
- Modal renderizado quando isOpen
- Modal não renderizado quando fechado
- "Criando" vs "Editando"
- Fechar → `closeModal`

**Drawer** (6 testes):
- Drawer começa fechado
- Abrir/Fechar drawer
- Overlay fecha drawer
- Botão fechar drawer

**Navegação Drawer** (4 testes):
- Link Dashboard
- Link Configurações
- Link Transações ativo

**Filtros** (4 testes):
- Valores passados corretamente
- Mudanças chamam setters

**Red Paths** (3 testes):
- Erro na API (banner visível, tabela escondida)
- Erro com cache (banner + tabela visível)
- Tentar novamente → refresh

**Edge Cases** (3 testes):
- Transação com valor zero
- Múltiplas aberturas/fechamentos de drawer
- Link do drawer fecha drawer

---

## 10. Estados da UI

### Loading (Carregamento Inicial)

```
┌─────────────────────────────────┐
│ ⬜⬜⬜⬜ Header skeleton        │
│                                 │
│ ⬛⬛⬛⬛⬛ Título skeleton      │
│                                 │
│ ┌──────┐ ┌──────┐ ┌──────┐    │
│ │⬜⬜⬜│ │⬜⬜⬜│ │⬜⬜⬜│    │
│ └──────┘ └──────┘ └──────┘    │
│                                 │
│ ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜    │
│ ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜    │
│ ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜    │
│ ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜    │
│ ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜    │
└─────────────────────────────────┘
```

### Empty State

```
┌─────────────────────────────────┐
│ Header                          │
│                                 │
│ Resumo Financeiro               │
│ Entradas: R$ 0 | Saídas: R$ 0  │
│ Saldo: R$ 0                     │
│                                 │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │    📭 Nenhuma transação     │ │
│ │    encontrada para o        │ │
│ │    período selecionado.     │ │
│ │                             │ │
│ │    [Criar primeira]         │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Error State

```
┌─────────────────────────────────┐
│ Header                          │
│                                 │
│ ⚠️ Erro ao carregar transações  │
│ [Tentar novamente]              │
│                                 │
│ [EmptyState ou Tabela anterior] │
└─────────────────────────────────┘
```

### Success State (com dados)

```
┌─────────────────────────────────┐
│ Header                          │
│                                 │
│ Transações     [Filtros] [+ Novo]│
│                                 │
│ ┌────────┐ ┌────────┐ ┌──────┐ │
│ │Entradas│ │ Saídas │ │Saldo │ │
│ │R$ 5000 │ │R$ 2300 │ │R$2700│ │
│ └────────┘ └────────┘ └──────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Descrição │ Data │ Cat │ R$ │ │
│ ├─────────────────────────────┤ │
│ │ Salário   │ 05/01│ Sal  │5k  │ │
│ │ Aluguel   │ 01/01│ Casa │1.5k│ │
│ │ Mercado   │ 10/01│ Alim │ 800│ │
│ └─────────────────────────────┘ │
│                                 │
│ [MobileNavBar]            [+ FAB] │
└─────────────────────────────────┘
```

---

## 11. Referências

### Documentação do Projeto
- [VISUAL_IDENTITY.md](../VISUAL_IDENTITY.md) — Design system e tokens visuais
- [TECHNICAL_DOCS.md](../TECHNICAL_DOCS.md) — Decisões arquiteturais
- [BACKEND.md](../BACKEND.md) — Documentação da API

### Arquivos de Código
- `src/app/transactions/page.tsx` — Página principal
- `src/app/transactions/loading.tsx` — Loading state
- `src/features/transactions/hooks/useTransactions.ts` — Hook central
- `src/features/transactions/components/TransactionModal.tsx` — Modal CRUD
- `src/features/transactions/components/FilterControls.tsx` — Filtros
- `src/features/transactions/components/TransactionsTable.tsx` — Tabela
- `src/features/transactions/validations.ts` — Schemas Zod
- `src/features/transactions/types.ts` — Tipos do formulário
- `src/features/transactions/transactions.service.ts` — Service layer
- `src/features/transactions/api/route.ts` — API GET/POST
- `src/features/transactions/api/[id]/route.ts` — API PUT/DELETE

### Testes
- `src/features/transactions/hooks/__tests__/useTransactions.test.ts` — 33 testes do hook
- `src/features/transactions/components/__tests__/TransactionModal.test.tsx` — 36+ testes do modal
- `src/app/transactions/__tests__/page.test.tsx` — 49 testes de integração

### Tecnologias
- [Next.js 16](https://nextjs.org/docs)
- [React 19](https://react.dev/)
- [TypeScript 5.9](https://www.typescriptlang.org/)
- [shadcn-ui](https://ui.shadcn.com/)
- [Zod](https://zod.dev/)
- [Jest](https://jestjs.io/) + [React Testing Library](https://testing-library.com/)
- [Prisma 5.22](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
