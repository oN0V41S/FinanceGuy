# Quinzenal (Fortnight) Filter — Dashboard Implementation Plan

**Goal:** Add a "Quinzenal" filter to the left of the month selector on the Dashboard, with options "Mês inteiro", "Dia 1 ao 15", and "Dia 16 ao 31". Changing the fortnight re-fetches only the SummaryCards — RecentTransactions continue showing the full month's data.

**Architecture:** A new `FortnightFilter` component (shadcn Select) sits inline with `MonthFilter`. The hook `useDashboardData` receives the fortnight value and makes **two parallel API calls** (or one, when fortnight is `"all"`):
- Full-month call → `recentTransactions` (always the full month)
- Fortnight-filtered call → `summary` (adjusted by the fortnight range)

The API already supports `startDate`/`endDate` filtering — no backend changes required.

**Tech Stack:** Next.js 16, React 19, TypeScript, shadcn/ui Select, Jest + RTL.

**Current layout (header row):**
```
[Visão Geral / title + subtitle]  [MonthFilter (mes/ano)]
```

**Target layout:**
```
[Visão Geral / title + subtitle]  [FortnightFilter] [MonthFilter (mes/ano)]
```

**ASCII wireframe:**
```
┌─────────────────────────────────────────────────────────┐
│  Visão Geral                          ┌──────┐ ┌──────┐ │
│  junho de 2026            [Mês inteiro▼] [Jun▼] [2026▼]│ │
└─────────────────────────────────────────────────────────┘
│  ┌──────┐ ┌──────┐ ┌──────┐     ← fortnight-filtered    │
│  │R$2k  │ │R$100 │ │R$1.9k│     ← only CARDS change     │
│  └──────┘ └──────┘ └──────┘                              │
│  ┌────────────────────────────────┐   ← always full month│
│  │ Transações Recentes            │                      │
│  │ 15/06  Supermercado   -R$150   │                      │
│  │ 10/06  Salário        +R$5k   │                      │
│  └────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

**Data flow:**

```
page.tsx
 ├── useDashboardData(month, year)  ──┬── GET /api/transactions?startDate=01&endDate=31
 │     → recentTransactions            │     returns { data, summary }
 │     → isLoading                     │
 │                                     │
 └── useDashboardData(month, year,     │
       fortnight) ─────────────────────┤
       → summary (fortnight-filtered)  │
       → isSummaryLoading              │
```

The existing hook gets a third argument `fortnight`. When it's `"all"` (default), the hook makes ONE call (as before). When it's `"first"` or `"second"`, it makes TWO parallel calls:
1. Full month range `YYYY-MM-01` → `YYYY-MM-lastDay` → for `recentTransactions`
2. Fortnight range `YYYY-MM-01` → `YYYY-MM-15` (or `16` → `31`) → only the `summary` field is used

The hook's return type stays the same — `recentTransactions` always reflects the full month, `summary` reflects the fortnight filter.

---

## Files to change

| Action | File |
|---|---|
| **Create** | `src/features/dashboard/components/FortnightFilter.tsx` |
| **Create** | `src/features/dashboard/components/__tests__/FortnightFilter.test.tsx` |
| **Modify** | `src/features/dashboard/hooks/useDashboardData.ts` |
| **Modify** | `src/app/dashboard/page.tsx` |
| **Modify** | `src/app/dashboard/__tests__/lazy-loading.e2e.test.tsx` |

---

### Task 1: Create `FortnightFilter` component

**Objective:** Build a shadcn Select with 3 options styled to match `MonthFilter`.

**Files:**
- Create: `src/features/dashboard/components/FortnightFilter.tsx`

**Step 1: Write the component**

`src/features/dashboard/components/FortnightFilter.tsx`:

```tsx
'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CalendarRange } from 'lucide-react';

export type FortnightValue = 'all' | 'first' | 'second';

const FORTNIGHT_OPTIONS: { value: FortnightValue; label: string }[] = [
  { value: 'all', label: 'Mês inteiro' },
  { value: 'first', label: 'Dia 1 ao 15' },
  { value: 'second', label: 'Dia 16 ao 31' },
];

interface FortnightFilterProps {
  value: FortnightValue;
  onChange: (value: FortnightValue) => void;
  className?: string;
}

export function FortnightFilter({ value, onChange, className }: FortnightFilterProps) {
  return (
    <div className={cn('relative', className)}>
      <Select value={value} onValueChange={(v) => onChange(v as FortnightValue)}>
        <SelectTrigger
          className={cn(
            'w-[155px] h-9',
            'bg-surface-container-low border-outline-variant',
            'hover:bg-surface-container transition-colors',
            'text-on-surface text-sm font-medium',
            'focus:ring-2 focus:ring-primary/30'
          )}
          aria-label="Filtrar por quinzena"
        >
          <CalendarRange className="w-4 h-4 text-on-surface-variant mr-1.5" />
          <SelectValue placeholder="Mês inteiro" />
        </SelectTrigger>
        <SelectContent className="bg-surface-container ring-1 ring-outline-variant">
          {FORTNIGHT_OPTIONS.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className={cn(
                'text-on-surface focus:bg-surface-container-low focus:text-on-surface',
                'data-[selected]:bg-primary/10 data-[selected]:text-primary'
              )}
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `pnpm run build` (will be covered in final verification).

---

### Task 2: Write unit test for `FortnightFilter`

**Objective:** Verify rendering default state, changing values, and styling.

**Files:**
- Create: `src/features/dashboard/components/__tests__/FortnightFilter.test.tsx`

**Step 1: Write the test**

`src/features/dashboard/components/__tests__/FortnightFilter.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FortnightFilter } from '../FortnightFilter';

describe('FortnightFilter', () => {
  it('renders with a trigger labelled for quinzena', () => {
    render(<FortnightFilter value="all" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Filtrar por quinzena')).toBeInTheDocument();
  });

  it('shows "Mês inteiro" when "all" is selected', () => {
    render(<FortnightFilter value="all" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Filtrar por quinzena')).toHaveTextContent('Mês inteiro');
  });

  it('shows "Dia 1 ao 15" when "first" is selected', () => {
    render(<FortnightFilter value="first" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Filtrar por quinzena')).toHaveTextContent('Dia 1 ao 15');
  });

  it('shows "Dia 16 ao 31" when "second" is selected', () => {
    render(<FortnightFilter value="second" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Filtrar por quinzena')).toHaveTextContent('Dia 16 ao 31');
  });

  it('calls onChange when a new option is selected', async () => {
    const onChange = jest.fn();
    render(<FortnightFilter value="all" onChange={onChange} />);

    const trigger = screen.getByLabelText('Filtrar por quinzena');
    await userEvent.click(trigger);

    const option = screen.getByText('Dia 16 ao 31');
    await userEvent.click(option);

    expect(onChange).toHaveBeenCalledWith('second');
  });

  it('applies custom className', () => {
    const { container } = render(
      <FortnightFilter value="all" onChange={jest.fn()} className="ml-2" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('ml-2');
  });
});
```

**Step 2: Run test**

Run: `npx jest src/features/dashboard/components/__tests__/FortnightFilter.test.tsx --verbose`
Expected: 6 passed

---

### Task 3: Modify `useDashboardData` hook — separate summary fetch for fortnight

**Objective:** Accept a `fortnight` parameter. The hook now makes one or two API calls:
- Full-month call → `recentTransactions` (always the full month)
- Fortnight-filtered call → only the `summary` field (only when fortnight !== `"all"`)

**Files:**
- Modify: `src/features/dashboard/hooks/useDashboardData.ts`

**Current code (lines 1-61):**

```typescript
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Transaction, FinancialSummary } from '@/features/transactions/validations';

interface DashboardData {
  recentTransactions: Transaction[];
  summary: FinancialSummary;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDashboardData(month?: string, year?: string): DashboardData {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({ income: 0, expense: 0, balance: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (month && year) {
          const startDate = `${year}-${month.padStart(2, '0')}-01`;
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
          const endDate = `${year}-${month.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
          params.set('startDate', startDate);
          params.set('endDate', endDate);
        }

        const response = await fetch(`/api/transactions?${params.toString()}`);
        if (!response.ok) throw new Error('Erro ao carregar dados');

        const result = await response.json();
        setTransactions(result.data || []);
        setSummary(result.summary || { income: 0, expense: 0, balance: 0 });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [month, year, refreshKey]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  return { recentTransactions, summary, isLoading, error, refresh };
}
```

**Step 1: Final code after all edits**

`src/features/dashboard/hooks/useDashboardData.ts` (rewrite):

```typescript
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Transaction, FinancialSummary } from '@/features/transactions/validations';
import type { FortnightValue } from '@/features/dashboard/components/FortnightFilter';

interface DashboardData {
  recentTransactions: Transaction[];
  summary: FinancialSummary;
  isLoading: boolean;
  isSummaryLoading: boolean;
  error: string | null;
  refresh: () => void;
}

function buildDateRange(month?: string, year?: string, fortnight?: FortnightValue) {
  if (!month || !year) return null;
  const m = month.padStart(2, '0');
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();

  if (fortnight === 'first') {
    return { startDate: `${year}-${m}-01`, endDate: `${year}-${m}-15` };
  }
  if (fortnight === 'second') {
    return { startDate: `${year}-${m}-16`, endDate: `${year}-${m}-${String(lastDay).padStart(2, '0')}` };
  }
  // 'all' (default) — full month
  return { startDate: `${year}-${m}-01`, endDate: `${year}-${m}-${String(lastDay).padStart(2, '0')}` };
}

async function fetchSummary(month?: string, year?: string, fortnight?: FortnightValue): Promise<FinancialSummary> {
  const range = buildDateRange(month, year, fortnight);
  if (!range) return { income: 0, expense: 0, balance: 0 };

  const params = new URLSearchParams(range);
  const response = await fetch(`/api/transactions?${params.toString()}`);
  if (!response.ok) throw new Error('Erro ao carregar dados');
  const result = await response.json();
  return result.summary || { income: 0, expense: 0, balance: 0 };
}

export function useDashboardData(
  month?: string,
  year?: string,
  fortnight?: FortnightValue
): DashboardData {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({ income: 0, expense: 0, balance: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setIsSummaryLoading(true);
      setError(null);

      try {
        // 1. Full-month call — always for recentTransactions
        const fullMonthRange = buildDateRange(month, year, 'all');
        if (!fullMonthRange) {
          setIsLoading(false);
          setIsSummaryLoading(false);
          return;
        }

        const params = new URLSearchParams(fullMonthRange);
        const fullMonthResponse = await fetch(`/api/transactions?${params.toString()}`);
        if (!fullMonthResponse.ok) throw new Error('Erro ao carregar dados');
        const fullMonthResult = await fullMonthResponse.json();

        setTransactions(fullMonthResult.data || []);
        setIsLoading(false);

        // 2. Fortnight-filtered summary call (only when differing from full month)
        if (fortnight && fortnight !== 'all') {
          const summaryData = await fetchSummary(month, year, fortnight);
          setSummary(summaryData);
        } else {
          setSummary(fullMonthResult.summary || { income: 0, expense: 0, balance: 0 });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
        setIsSummaryLoading(false);
      }
    }

    fetchData();
  }, [month, year, fortnight, refreshKey]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  return { recentTransactions, summary, isLoading, isSummaryLoading, error, refresh };
}
```

**Key changes:**
1. Added `fortnight` param to the function signature
2. Exported `buildDateRange` (internal) to avoid duplicating date logic
3. Added `isSummaryLoading` to the return type — so the page can show a loading state on SummaryCards separately from RecentTransactions
4. When fortnight is `"all"`: single API call (unchanged path)
5. When fortnight is `"first"` or `"second"`: full-month call for transactions + separate call for summary

---

### Task 4: Wire `FortnightFilter` into the Dashboard page

**Objective:** Import and render `FortnightFilter`, read its value as state, pass it to `useDashboardData`.

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Add import and state**

After the existing imports (around line 6), add:

```typescript
import { FortnightFilter } from '@/features/dashboard/components/FortnightFilter';
import type { FortnightValue } from '@/features/dashboard/components/FortnightFilter';
```

After the existing `selectedYear` state, add:

```typescript
const [selectedFortnight, setSelectedFortnight] = useState<FortnightValue>('all');
```

**Step 2: Update hook call**

Change:
```typescript
const { recentTransactions, summary, isLoading, error, refresh } =
  useDashboardData(selectedMonth, selectedYear);
```

To:
```typescript
const { recentTransactions, summary, isLoading, isSummaryLoading, error, refresh } =
  useDashboardData(selectedMonth, selectedYear, selectedFortnight);
```

Note: `isSummaryLoading` is added. The existing `isLoading` still gates the LazyLoad wrappers for the initial page load. SummaryCards could optionally use a combined state, but for simplicity we gate everything on `isLoading` (which clears when the full-month call finishes — fast enough).

**Step 3: Render `FortnightFilter` before `MonthFilter`**

In the `<div className="flex items-center gap-2">` (currently around line 145), render the new filter:

```tsx
<div className="flex items-center gap-2">
  <FortnightFilter
    value={selectedFortnight}
    onChange={setSelectedFortnight}
  />
  <MonthFilter
    value={selectedMonth}
    onChange={(m) => m && setSelectedMonth(m)}
    year={selectedYear}
    onYearChange={setSelectedYear}
  />
</div>
```

---

### Task 5: Update E2E test to mock `FortnightFilter`

**Objective:** The existing E2E (`lazy-loading.e2e.test.tsx`) needs a mock for the new `FortnightFilter` component.

**Files:**
- Modify: `src/app/dashboard/__tests__/lazy-loading.e2e.test.tsx`

**Step 1: Add mock for `FortnightFilter`**

After the `MonthFilter` mock (line 51), add:

```tsx
jest.mock('@/features/dashboard/components/FortnightFilter', () => ({
  FortnightFilter: () => <div data-testid="fortnight-filter">FortnightFilter</div>,
}));
```

**Step 2: Verify the test suite still passes**

Run: `npx jest src/app/dashboard/__tests__/lazy-loading.e2e.test.tsx --verbose`
Expected: 4 passed

---

### Task 6: Verify full test suite and build

**Objective:** Ensure nothing regressed.

**Step 1: Run full test suite**

Run: `npx jest src/app/dashboard/ src/features/dashboard/ src/shared/components/ --verbose`
Expected: all passing

**Step 2: Run build**

Run: `pnpm run build`
Expected: Compiled successfully, exit 0

---

## Risks, tradeoffs, open questions

| Risk | Mitigation |
|---|---|
| **Two API calls when fortnight changes** — slightly slower response for summary | Acceptable: both calls are parallel. The page's `isLoading` stays true until both complete. For `"all"` (the default) it's still one call. |
| **`isSummaryLoading` unused in the page** | Exposed from the hook for future use. The page can ignore it and keep gating on `isLoading`. |
| **`CalendarRange` icon may not exist in `lucide-react`** | If missing, substitute `CalendarDays` (same icon set as `MonthFilter`). |
| **Hook imports a type from a component** (`FortnightValue`) | It's `import type` — erased at runtime. No circular dependency since the component never imports the hook. |
| **The `MonthFilter.e2e.test.tsx` renders `MonthFilter` in isolation** — doesn't need the `FortnightFilter` mock | Confirmed: no change needed there. |
| **E2E mock doesn't test fortnight interaction** — the hook is fully mocked | Acceptable: the unit test covers `FortnightFilter` rendering/interaction. The E2E validates the "never render empty" contract. A separate integration could be added later. |
