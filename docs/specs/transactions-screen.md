# Spec: Transactions Screen

**Status**: Draft  
**Versão**: 1.0  
**Última atualização**: 2026-07-23  

---

## 1. Visão Geral

A **Tela de Transações** (`/transactions`) é a página central para o usuário gerenciar todas as suas transações financeiras — visualizar, filtrar, criar, editar e excluir lançamentos de receitas e despesas.

### 1.1 Objetivo de Negócio
- Permitir que o usuário tenha visão completa e filtrável de todas as transações de um período
- Oferecer CRUD completo de transações com formulário validado
- Reaproveitar o layout e componentes de navegação do dashboard (HeaderLayout, MobileNavBar, drawer)

### 1.2 Dependências
- **Layout**: HeaderLayout, MobileNavBar, drawer navigation (idêntico ao dashboard)
- **Backend**: API `/api/transactions` (GET, POST) e `/api/transactions/[id]` (GET, PUT, DELETE) — **já implementados**
- **Validação**: Schemas Zod em `@/features/transactions/validations` — **já implementados**
- **Tipos**: `Transaction`, `FinancialSummary`, `TransactionFormData` — **já implementados**
- **Componentes existentes (refatorar)**:
  - `FilterControls.tsx` — HTML puro, será refatorado para shadcn-ui
  - `TransactionsTable.tsx` — HTML puro, será refatorado para shadcn-ui

### 1.3 Referências
- `docs/VISUAL_IDENTITY.md` — Paleta de cores, tipografia, dark mode
- `docs/TECHNICAL_DOCS.md` — Decisões arquiteturais
- `src/app/dashboard/page.tsx` — Padrão de página a ser seguido
- `src/features/dashboard/hooks/useDashboardData.ts` — Padrão de hook a ser seguido

---

## 2. Arquitetura da Página

### 2.1 Estrutura de Arquivos

```
src/
├── app/
│   └── transactions/
│       ├── page.tsx                        # Página principal (client component)
│       └── loading.tsx                     # Loading state do Next.js Streaming
├── features/
│   └── transactions/
│       ├── components/
│       │   ├── FilterControls.tsx          # REFATORAR: HTML nativo → shadcn Select/Button
│       │   ├── TransactionsTable.tsx       # REFATORAR: HTML nativo → shadcn Card/Badge/Button
│       │   └── TransactionModal.tsx        # NOVO: Modal de criação/edição
│       ├── hooks/
│       │   └── useTransactions.ts          # NOVO: Hook central de estado e operações
│       ├── validations.ts                  # Existente (Zod schemas)
│       ├── types.ts                        # Existente (TransactionFormData)
│       ├── transactions.service.ts         # Existente
│       ├── postgresTransaction.repository.ts # Existente
│       ├── ITransaction.repository.ts      # Existente
│       └── api/
│           ├── route.ts                    # Existente (GET/POST)
│           └── [id]/
│               └── route.ts                # Existente (GET/PUT/DELETE)
```

### 2.2 Fluxo de Dados

```
[FilterControls] ──filtros──► [useTransactions] ──fetch──► /api/transactions
                                        │                          │
                                        ▼                          ▼
                              ┌────────────────┐          { data, summary }
                              │  SummaryCards   │◄─────── financial summary
                              │ (income/expense │
                              │  /balance)      │
                              └────────────────┘
                                        │
                                        ▼
                              ┌────────────────┐
                              │TransactionsTable│◄──── sorted transactions
                              └────────────────┘
                                        │
                              openModal/edit/delete
                                        │
                                        ▼
                              ┌────────────────┐
                              │TransactionModal │──► POST/PUT/DELETE → refresh
                              │ (Create/Edit)   │
                              └────────────────┘
```

### 2.3 Estados Globais da Página

| Estado | Gatilho | Feedback Visual |
|--------|---------|-----------------|
| **Loading** | Fetch inicial ou refresh | Skeleton nos cards e tabela via `LazyLoad` |
| **Empty** | Nenhuma transação no período | `EmptyState` + SummaryCards zerados |
| **Error** | Falha na requisição | Banner vermelho `role="alert"` com mensagem de erro + botão "Tentar novamente" |
| **Success** | Dados carregados | Cards + Tabela com transações |
| **Submitting** | Salvando transação (create/edit) | Modal com botão desabilitado + spinner |
| **Deleting** | Excluindo transação | Confirmação via confirm() nativo; toast de sucesso/erro |

---

## 3. Componentes

### 3.1 `FilterControls` (REFATORAR)

**Arquivo**: `src/features/transactions/components/FilterControls.tsx`

**Props**:
```typescript
interface FilterControlsProps {
  filterPeriod: 'all' | 'month' | 'fortnight';
  onFilterPeriodChange: (value: 'all' | 'month' | 'fortnight') => void;
  selectedYear: string;
  onYearChange: (value: string) => void;
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  selectedFortnight: FortnightValue; // 'all' | 'first' | 'second'
  onFortnightChange: (value: FortnightValue) => void;
}
```

**Mudanças do HTML atual**:
- Substituir `<select>` nativo por `<Select>` shadcn-ui (mesmo padrão de MonthFilter e FortnightFilter do dashboard)
- Usar `Filter` icon do Lucide como label visual
- Manter `getYearOptions()` de `@/shared/utils`
- Seguir tokens de cor do VISUAL_IDENTITY.md (bg-surface-container-low, text-on-surface, etc.)

**Estados**: Apenas render (sem loading/error — é puro controle de estado do pai).

**Comportamento**:
- `filterPeriod = 'all'` → esconde selects de ano/mês/quinzena
- `filterPeriod = 'month'` → exibe ano + mês
- `filterPeriod = 'fortnight'` → exibe ano + mês + quinzena
- Ano padrão: ano corrente
- Mês padrão: mês corrente
- Quinzena padrão: `'all'` (mês inteiro)

### 3.2 `TransactionsTable` (REFATORAR)

**Arquivo**: `src/features/transactions/components/TransactionsTable.tsx`

**Props**:
```typescript
interface TransactionsTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}
```

**Mudanças do HTML atual**:
- Table HTML simples → manter `<table>` para dados tabulares, mas estilizar com tokens do VISUAL_IDENTITY
- Substituir `<span>` de categoria por `<Badge>` shadcn-ui
- Substituir botões de ação por `<Button variant="ghost" size="icon-sm">`
- Adicionar `aria-label` em todos os botões de ação
- Usar `formatCurrency` e `formatDate` de `@/shared/utils`
- Cores: texto `text-on-surface`, valores income em `text-finance-income`, expense em `text-finance-expense`

**Estados**:

| Estado | Comportamento |
|--------|---------------|
| **Loading** | 5 linhas de skeleton idêntico ao `RecentTransactions` |
| **Empty** | `<tr><td colSpan={5}>` com EmptyState estilizado inline |
| **Error** | Não se aplica (erro é tratado no hook/página) |
| **Success** | Linhas com dados, ações (editar/excluir) |

**Colunas**:

| Coluna | Alinhamento | Conteúdo |
|--------|-------------|----------|
| Descrição | Esquerda | `description` + `responsible` em linha secundária |
| Data | Esquerda | `date` formatada (dd/mm/aaaa) |
| Categoria | Esquerda | `category` como `Badge variant="secondary"` |
| Valor | Direita | `value` formatado, cor verde para income, vermelho para expense |
| Ações | Centro | Botões Editar e Excluir |

### 3.3 `TransactionModal` (NOVO)

**Arquivo**: `src/features/transactions/components/TransactionModal.tsx`

**Props**:
```typescript
interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TransactionFormData) => Promise<void>;
  transaction?: Transaction | null; // null ou undefined = Create mode
  isLoading?: boolean;
}
```

**Modos**:
- **Create** (`transaction` é null/undefined): Modal vazio, título "Nova Transação"
- **Edit** (`transaction` provido): Modal preenchido, título "Editar Transação"

**Campos do Formulário**:

| Campo | Tipo | Componente | Validação |
|-------|------|-----------|-----------|
| `type` | `'income' \| 'expense'` | Toggle group (botões "Receita" / "Despesa") | Obrigatório |
| `description` | `string` | `<Input>` | Obrigatório, min 1 char, max 255 |
| `value` | `string` | `<Input type="text" inputMode="decimal">` | Obrigatório, positivo, formato brasileiro |
| `date` | `string` (YYYY-MM-DD) | `<Input type="date">` | Obrigatório, data válida |
| `category` | `CategoryEnum` | `<Select>` com opções do enum | Obrigatório, valor do enum |
| `responsible` | `string` | `<Input>` | Obrigatório, min 1 char, max 100 |
| `paid` | `boolean` | `<Toggle>` switch | Opcional, default false |

**Estrutura visual**:
```
┌─────────────────────────────────────────┐
│  [X]  Nova Transação / Editar Transação │
├─────────────────────────────────────────┤
│                                         │
│  [Receita]  [Despesa]   ← Toggle Group  │
│                                         │
│  Descrição                              │
│  ┌─────────────────────────────────┐   │
│  │ Ex: Supermercado               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Valor               Data               │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ R$ 150,50    │  │ 21/01/2026  │    │
│  └──────────────┘  └──────────────┘    │
│                                         │
│  Categoria                              │
│  ┌─────────────────────────────────┐   │
│  │ Alimentação          ▼          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Responsável                            │
│  ┌─────────────────────────────────┐   │
│  │ João                           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [ ] Pago           ← Toggle            │
│                                         │
│  ┌──────────┐  ┌──────────────────┐    │
│  │ Cancelar │  │   Salvar         │    │
│  └──────────┘  └──────────────────┘    │
└─────────────────────────────────────────┘
```

**Validação**:
- Reutilizar `CreateTransactionSchema` e `UpdateTransactionSchema` de `@/features/transactions/validations`
- Erros de campo exibidos abaixo do respectivo input (texto vermelho, tamanho pequeno)
- `value` é string no formulário → convertido para number antes de enviar
- Validação acontece no client (Zod) e no server (Zod na API)

**Comportamento**:
- Ao abrir em modo Edit: preencher todos os campos com dados atuais da transação
- Ao submeter: chamar `onSave(data)`, desabilitar botão "Salvar" com spinner
- Em caso de erro: exibir mensagem de erro no topo do modal (não fechar)
- Em caso de sucesso: `onSave` resolve, pai fecha modal e faz refresh
- Botão "Cancelar": fecha modal sem salvar
- Clique no backdrop: fecha modal (não salva)
- Tecla ESC: fecha modal (não salva)

### 3.4 `useTransactions` (NOVO)

**Arquivo**: `src/features/transactions/hooks/useTransactions.ts`

**Interface**:
```typescript
interface UseTransactionsReturn {
  // Dados
  transactions: Transaction[];
  summary: FinancialSummary;
  isLoading: boolean;
  isSummaryLoading: boolean;
  error: string | null;

  // Filtros
  filterPeriod: 'all' | 'month' | 'fortnight';
  setFilterPeriod: (value: 'all' | 'month' | 'fortnight') => void;
  selectedYear: string;
  setSelectedYear: (value: string) => void;
  selectedMonth: string;
  setSelectedMonth: (value: string) => void;
  selectedFortnight: FortnightValue;
  setSelectedFortnight: (value: FortnightValue) => void;

  // Ações
  refresh: () => void;
  createTransaction: (data: TransactionFormData) => Promise<void>;
  updateTransaction: (id: string, data: Partial<TransactionFormData>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Modal state
  isModalOpen: boolean;
  editingTransaction: Transaction | null;
  openCreateModal: () => void;
  openEditModal: (transaction: Transaction) => void;
  closeModal: () => void;
}
```

**Comportamento**:
- Seguir o padrão de `useDashboardData` (fetch na montagem + refreshKey)
- Usar `buildDateRange()` adaptado para suportar período `'all'` (sem filtro de data)
- Fetch de `/api/transactions?startDate=...&endDate=...`
- Armazenar `transactions` e `summary` da resposta
- `createTransaction`: POST `/api/transactions` → refresh
- `updateTransaction`: PUT `/api/transactions/[id]` → refresh
- `deleteTransaction`: DELETE `/api/transactions/[id]` → refresh
- Modal state: `isModalOpen` + `editingTransaction` (null = create mode)
- `error` captura tanto erros de fetch quanto erros de operações CRUD
- Ordenação: transações ordenadas por data decrescente (mais recentes primeiro)

**Trigger de refetch**: `[selectedMonth, selectedYear, selectedFortnight, filterPeriod, refreshKey]`

### 3.5 SummaryCards (REUTILIZAR)

- Reutilizar `SummaryCard` do dashboard (`@/features/dashboard/components/SummaryCard`)
- Props: income, expense, balance
- Usar `LazyLoad` para loading state

### 3.6 EmptyState (REUTILIZAR)

- Reutilizar `EmptyState` do dashboard (`@/features/dashboard/components/EmptyState`)
- Exibe ícone Wallet, título "Nenhuma transação encontrada", texto descritivo

---

## 4. Página Principal (`/transactions/page.tsx`)

**Arquivo**: `src/app/transactions/page.tsx`

### 4.1 Estrutura

```typescript
'use client';

// Imports
// - HeaderLayout, MobileNavBar (do dashboard)
// - SummaryCard (do dashboard)
// - EmptyState (do dashboard)
// - LazyLoad (shared)
// - FilterControls, TransactionsTable, TransactionModal (transactions)
// - useTransactions (transactions)
// - Ícones: Wallet, LayoutDashboard, ArrowLeftRight, Settings, X (lucide-react)
// - cn, usePathname, Link, useState

// Navigation items (mesmo do dashboard)
// Drawer com navegação (mesmo padrão do dashboard)
// Header com menu drawer toggle
// Conteúdo principal:
//   - Error banner
//   - Título "Transações" + subtítulo com mês/ano
//   - FilterControls
//   - SummaryCards (LazyLoad)
//   - TransactionsTable + EmptyState condicional
//   - FAB (botão flutuante) "+" para criar nova transação
// - TransactionModal
// - MobileNavBar
```

### 4.2 Layout da Página

```
┌─────────────────────────────────────────────────┐
│  Header (HeaderLayout)                           │
├─────────────────────────────────────────────────┤
│                                                   │
│  Transações                          [Filtros]   │
│  Janeiro 2026                                    │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Entradas  │  │  Saídas  │  │    Saldo     │   │
│  │ R$ 5.000  │  │ R$ 2.500 │  │  R$ 2.500   │   │
│  └──────────┘  └──────────┘  └──────────────┘   │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │ Descrição │ Data │ Categoria │ Valor │ Ações│ │
│  ├─────────────────────────────────────────────┤ │
│  │ Salário   │ 05/01│ Salário  │+R$5.000│ ✏️🗑│ │
│  │ Aluguel   │ 01/01│ Casa     │-R$1.500│ ✏️🗑│ │
│  │ ...                                     │ │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│                      [ + ]   ← FAB (mobile)       │
│                                                   │
├─────────────────────────────────────────────────┤
│  MobileNavBar (md:hidden)                        │
└─────────────────────────────────────────────────┘
```

### 4.3 Comportamento Detalhado

#### 4.3.1 Navegação
- **Drawer**: idêntico ao dashboard (itens: Dashboard, Transações, Configurações)
- **MobileNavBar**: já inclui "Transações" (ícone `ArrowLeftRight`), ativo quando em `/transactions`
- **Header**: mesmo `HeaderLayout`, sem alterações

#### 4.3.2 Filtros
- Estado inicial: mês e ano corrente, `filterPeriod = 'month'` (por mês)
- `filterPeriod = 'all'` → fetch sem parâmetros de data (traz TODAS as transações do usuário)
- `filterPeriod = 'month'` → fetch com `startDate` e `endDate` do mês selecionado
- `filterPeriod = 'fortnight'` → fetch com `startDate` e `endDate` da quinzena selecionada
- O subtítulo do header reflete o filtro atual (ex: "Janeiro 2026" ou "Todas as transações")

#### 4.3.3 CRUD
- **Criar**: Clique no botão "Nova Transação" (desktop: botão no topo; mobile: FAB) → abre modal vazio
- **Editar**: Clique em ✏️ na linha → abre modal preenchido
- **Excluir**: Clique em 🗑 → confirmação `confirm("Tem certeza?")` → DELETE → refresh
- Após qualquer operação CRUD bem-sucedida: refresh automático da lista
- Em caso de erro no CRUD: toast/banner de erro na página (não fecha modal)

#### 4.3.4 Responsividade
- **Desktop (md+)**: Filtros e botão "Nova Transação" no cabeçalho, tabela completa
- **Mobile (<md)**: Filtros em dropdown, FAB "+" sticky no canto inferior direito, MobileNavBar
- **Drawer**: ativado por hamburger menu no Header em todos os breakpoints

---

## 5. Fluxos

### 5.1 Fluxo: Visualizar Transações

```
1. Usuário navega para /transactions
2. useTransactions faz fetch de /api/transactions com filtros padrão (mês corrente)
3. Loading: skeletons nos cards e na tabela
4. Sucesso:
   4a. SummaryCards exibem income/expense/balance
   4b. TransactionsTable exibe lista ordenada por data decrescente
   4c. Se 0 transações → EmptyState
5. Usuário altera filtros → novo fetch automático
6. Erro: banner vermelho com mensagem e botão "Tentar novamente"
```

### 5.2 Fluxo: Criar Transação

```
1. Usuário clica em "Nova Transação" (desktop) ou FAB "+" (mobile)
2. Modal abre em modo Create (título "Nova Transação", campos vazios)
3. Usuário preenche formulário
4. Validação client (Zod):
   4a. Erro → campos inválidos destacados com mensagens
   4b. OK → habilita botão "Salvar"
5. Usuário clica "Salvar" (botão mostra spinner, desabilitado)
6. POST /api/transactions
7. Sucesso:
   7a. Modal fecha
   7b. Lista atualiza via refresh()
   7c. SummaryCards recalculam
8. Erro:
   8a. Modal permanece aberto
   8b. Mensagem de erro no topo do modal
   8c. Botão "Salvar" reabilitado
```

### 5.3 Fluxo: Editar Transação

```
1. Usuário clica em ✏️ na linha da transação
2. Modal abre em modo Edit (título "Editar Transação", campos preenchidos)
3. Usuário altera campos desejados
4. Validação client (Zod)
5. Usuário clica "Salvar"
6. PUT /api/transactions/[id]
7. Sucesso: modal fecha, refresh da lista
8. Erro: modal permanece, mensagem de erro
```

### 5.4 Fluxo: Excluir Transação

```
1. Usuário clica em 🗑 na linha da transação
2. Confirm dialog nativo: "Tem certeza que deseja excluir esta transação?"
3. Sim:
   3a. DELETE /api/transactions/[id]
   3b. Sucesso → refresh da lista
   3c. Erro → banner de erro na página
4. Não → nada acontece
```

### 5.5 Fluxo: Filtro por Período

```
1. Usuário seleciona tipo de período: "Todos", "Por Mês", "Por Quinzena"
2. "Todos" → esconde selects de data, fetch sem parâmetros de data
3. "Por Mês" → exibe selects de Ano + Mês
4. "Por Quinzena" → exibe selects de Ano + Mês + Quinzena
5. Mudança em qualquer filtro → novo fetch automático
6. Subtítulo atualiza: "Janeiro 2026" ou "Todas as transações"
```

---

## 6. Loading States

### 6.1 Loading da Página (Next.js Streaming)

**Arquivo**: `src/app/transactions/loading.tsx`

```typescript
// Layout básico com skeletons:
// - Header placeholder
// - Título skeleton
// - 3 SummaryCard skeletons
// - Tabela skeleton (5 linhas)
// - MobileNavBar placeholder
```

### 6.2 Loading de Dados (useTransactions)

| Elemento | Loading State |
|----------|--------------|
| SummaryCards | `<Skeleton>` individual por card (via `SummaryCard isLoading` prop) |
| TransactionsTable | 5 `<Skeleton>` rows (idêntico ao RecentTransactions) |
| Botão "Salvar" (modal) | Desabilitado com spinner |

---

## 7. Mensagens de Erro

### 7.1 Erros de Rede / API

```typescript
// Banner no topo do conteúdo principal
<div className="mb-4 p-4 rounded-md bg-red-500/10 text-red-500 text-sm" role="alert">
  {error}
  <button onClick={refresh}>Tentar novamente</button>
</div>
```

### 7.2 Erros de Validação (Formulário)

- Exibidos abaixo de cada campo, texto `text-xs text-red-500`
- Usar `aria-invalid` nos inputs com erro
- Usar `aria-describedby` vinculando ao elemento de mensagem de erro

### 7.3 Erros de Operação CRUD

- Create/Edit: mensagem no topo do modal
- Delete: banner na página principal

---

## 8. Testes

### 8.1 Testes Unitários

| Arquivo | O que testar |
|---------|-------------|
| `useTransactions` | Fetch com filtros, CRUD operations, estados loading/error |
| `TransactionModal` | Renderização create/edit, validação campos, submit, close |
| `FilterControls` (refatorado) | Renderização condicional dos selects, chamadas de onChange |
| `TransactionsTable` (refatorado) | Renderização dados, empty state, ações de editar/deletar |

### 8.2 Testes de Integração

| Arquivo | O que testar |
|---------|-------------|
| Página `/transactions` | Fluxo completo: carregar → filtrar → criar → editar → excluir |

### 8.3 Testes E2E (Playwright)

| Fluxo | Cenário |
|-------|---------|
| CRUD completo | Navegar, criar transação, verificar na tabela, editar, excluir |
| Filtros | Alternar entre períodos, verificar dados corretos |
| Responsividade | Verificar FAB mobile, tabela desktop, drawer |

---

## 9. Critérios de Aceitação

### 9.1 Funcionalidade

- [ ] Página `/transactions` carrega com filtro padrão (mês corrente)
- [ ] FilterControls permite alternar entre "Todos", "Por Mês", "Por Quinzena"
- [ ] SummaryCards (income, expense, balance) refletem o período filtrado
- [ ] TransactionsTable exibe transações ordenadas por data decrescente
- [ ] EmptyState aparece quando não há transações no período
- [ ] Modal abre em modo Create ao clicar em "Nova Transação"
- [ ] Modal abre em modo Edit (preenchido) ao clicar em ✏️
- [ ] Todos os campos do formulário são validados (client-side)
- [ ] Create → POST /api/transactions → refresh automático
- [ ] Edit → PUT /api/transactions/[id] → refresh automático
- [ ] Delete → confirmação → DELETE /api/transactions/[id] → refresh automático
- [ ] Modal fecha ao clicar em "Cancelar", backdrop ou ESC
- [ ] Erros de API são exibidos como banner na página
- [ ] Erros de validação são exibidos no formulário

### 9.2 Layout e Design

- [ ] HeaderLayout e MobileNavBar idênticos ao dashboard
- [ ] Drawer de navegação com item "Transações" ativo
- [ ] FilterControls usa shadcn-ui Select (mesmo padrão de MonthFilter/FortnightFilter)
- [ ] TransactionsTable usa tokens do VISUAL_IDENTITY (cores, tipografia, bordas)
- [ ] Categoria exibida como Badge shadcn-ui
- [ ] Valores income em verde (`text-finance-income`), expense em vermelho (`text-finance-expense`)
- [ ] Modal segue dark mode do VISUAL_IDENTITY
- [ ] Botão "Nova Transação" no desktop, FAB "+" no mobile
- [ ] Responsivo: layout adaptável para mobile e desktop

### 9.3 Performance e UX

- [ ] Loading state com skeleton durante fetch inicial
- [ ] Loading state com skeleton ao trocar filtros
- [ ] Spinner no botão "Salvar" durante submissão
- [ ] Transições suaves nos selects shadcn-ui
- [ ] Debounce ou tratamento adequado para evitar múltiplos fetches simultâneos
- [ ] LazyLoad para SummaryCards (padrão do dashboard)

### 9.4 Acessibilidade

- [ ] Todos os botões têm `aria-label` descritivo
- [ ] Selects têm `aria-label`
- [ ] Modal tem `role="dialog"` e `aria-modal="true"`
- [ ] Erros de formulário têm `aria-describedby`
- [ ] Inputs inválidos têm `aria-invalid`
- [ ] Tabela usa elementos semânticos `<table>`, `<th>`, `<td>`
- [ ] NavBar usa `<nav>` com `aria-label`

### 9.5 Código

- [ ] `useTransactions` segue padrão de `useDashboardData`
- [ ] Componentes refatorados usam shadcn-ui em vez de HTML nativo
- [ ] Tipagens exportadas dos schemas Zod
- [ ] Testes existentes continuam passando
- [ ] `npm run lint` sem erros
- [ ] Build de produção funciona (`pnpm run build`)

---

## 10. Métricas de Sucesso (Futuro)

- **Cobertura de testes**: > 80% nos novos componentes
- **Performance**: Lighthouse > 90 em Performance, Accessibility, Best Practices
- **UX**: Nenhum erro visível ao usuário sem tratamento adequado

---

## Apêndice A: Mapeamento de Componentes Existentes vs. Necessários

| Componente | Status | Ação |
|-----------|--------|------|
| `FilterControls` | Existente (HTML puro) | REFATORAR para shadcn-ui |
| `TransactionsTable` | Existente (HTML puro) | REFATORAR para shadcn-ui |
| `TransactionModal` | **NOVO** | CRIAR |
| `useTransactions` | **NOVO** | CRIAR |
| `SummaryCard` | Existente (dashboard) | REUTILIZAR |
| `EmptyState` | Existente (dashboard) | REUTILIZAR |
| `HeaderLayout` | Existente (dashboard) | REUTILIZAR |
| `MobileNavBar` | Existente (dashboard) | REUTILIZAR |
| `LazyLoad` | Existente (shared) | REUTILIZAR |
| `Modal` | Existente (shadcn-ui) | Usar como base do TransactionModal |

## Apêndice B: Checklist de Implementação

- [ ] 1. Criar `useTransactions` hook
- [ ] 2. Refatorar `FilterControls` com shadcn Select
- [ ] 3. Refatorar `TransactionsTable` com shadcn Card/Badge/Button
- [ ] 4. Criar `TransactionModal` (Create + Edit)
- [ ] 5. Criar `src/app/transactions/page.tsx`
- [ ] 6. Criar `src/app/transactions/loading.tsx`
- [ ] 7. Escrever testes para `useTransactions`
- [ ] 8. Escrever testes para `TransactionModal`
- [ ] 9. Atualizar testes de `FilterControls` e `TransactionsTable`
- [ ] 10. Validar build (`pnpm run build`)
- [ ] 11. Validar lint (`npm run lint`)
- [ ] 12. Validar testes (`npm run test`)
