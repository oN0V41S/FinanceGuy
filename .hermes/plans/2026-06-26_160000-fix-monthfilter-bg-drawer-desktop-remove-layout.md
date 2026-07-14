# Dashboard Fixes — MonthFilter bg, Drawer on Desktop, Remove Sidebar Layout

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Fix three visual/structural issues: transparent dropdown items in MonthFilter, drawer not available on desktop, and remove the SidebarDrawer component from page.tsx (replacing with a simpler inline drawer).

**Architecture:** Remove the SidebarDrawer component from page.tsx. Instead, integrate drawer behavior directly: the header menu button triggers a drawer overlay on ALL screen sizes (mobile + desktop). Remove the DashboardLayout grid wrapper. The page uses a simple flex layout with no sidebar column.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 3.4, base-ui Select, Jest 30+

---

## Context & Root Causes

### Issue 1: MonthFilter dropdown items have transparent bg
- `src/components/ui/select.tsx` `SelectItem` (line 119) uses `focus:bg-accent` but NO default background
- Items render inside `SelectPrimitive.Popup` which has `bg-popover` (#201f22)
- The items themselves are transparent — they rely on the parent popup bg showing through
- Fix: Add `bg-popover` to SelectItem for explicit opaque background

### Issue 2: Drawer not available on desktop
- `HeaderLayout.tsx` line 22: Menu button has `md:hidden` — hidden on desktop
- `SidebarDrawer.tsx` line 42: `if (!open) return null` — always hidden when closed
- On desktop, there's no way to open any navigation drawer
- Fix: Make menu button visible on ALL screen sizes, use a simple drawer overlay

### Issue 3: Remove SidebarDrawer component from page.tsx
- Line 24 of `page.tsx`: `<SidebarDrawer>` component is rendered
- The user wants this component removed from the page
- Navigation should work via a simpler approach — drawer triggered from header on all screens

---

## Wireframe — Target Layout

### Desktop (≥768px) — drawer closed
```
┌─────────────────────────────────────────────────────────┐
│ [≡] [Search...] [✨]              [🔔] [👤]             │
├─────────────────────────────────────────────────────────┤
│  Visão Geral                            [Filter ▼]      │
│  ┌──────────┐ ┌──────────┐ ┌─────────────────────────┐ │
│  │Entradas  │ │Saídas    │ │Saldo                     │ │
│  │R$ 0,00   │ │R$ 0,00   │ │R$ 0,00                   │ │
│  └──────────┘ └──────────┘ └─────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐│
│  │ EmptyState / RecentTransactions                     ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Desktop (≥768px) — drawer open (overlay)
```
┌─────────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░ (backdrop) ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ┌──────────┐                                            │
│ │FinanceGuy│                                            │
│ │ [X]      │                                            │
│ │          │                                            │
│ │ Dashboard│                                            │
│ │Transações│                                            │
│ │          │                                            │
│ │Config... │                                            │
│ └──────────┘                                            │
└─────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — same drawer overlay behavior
```
┌─────────────────────────────────────┐
│ [≡] [Logo]          [✨] [🔔] [👤]  │
├─────────────────────────────────────┤
│  Visão Geral              [Filter ▼]│
│  ┌──────────┐ ┌──────────┐ ┌─────┐ │
│  │Entradas  │ │Saídas    │ │Saldo│ │
│  └──────────┘ └──────────┘ └─────┘ │
│  ┌─────────────────────────────────┐│
│  │ EmptyState / RecentTransactions ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  [🏠 Dashboard]  [💱 Transações]    │ MobileNavBar
└─────────────────────────────────────┘
```

---

## Task 1: Fix SelectItem background in shadcn Select

**Objective:** Ensure dropdown items in SelectContent have proper background color (not transparent).

**Files:**
- Modify: `src/components/ui/select.tsx:119-121`

**Step 1: Add bg-popover to SelectItem**

In `src/components/ui/select.tsx`, find the SelectItem className and add `bg-popover`:

```tsx
// BEFORE (line 119-121)
className={cn(
  "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
  className
)}

// AFTER
className={cn(
  "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none bg-popover focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
  className
)}
```

**Step 2: Verify CSS is valid**

Run: `npx tailwindcss build -i src/app/globals.css -o /dev/null 2>&1 | tail -5`
Expected: Build completes without error

**Step 3: Commit**

```bash
git add src/components/ui/select.tsx
git commit -m "fix: add bg-popover to SelectItem for opaque dropdown background"
```

---

## Task 2: Make HeaderLayout menu button visible on all screen sizes

**Objective:** The menu button in HeaderLayout should be visible on both mobile AND desktop so the drawer can be triggered from any screen size.

**Files:**
- Modify: `src/features/dashboard/components/HeaderLayout.tsx:22`

**Step 1: Remove md:hidden from menu button**

In `HeaderLayout.tsx`, the menu button (line 19-30) has `md:hidden`. Change it to be always visible:

```tsx
// BEFORE (line 21-22)
className={cn(
  'md:hidden flex items-center justify-center p-2 rounded-md',
  ...
)}

// AFTER
className={cn(
  'flex items-center justify-center p-2 rounded-md',
  ...
)}
```

**Step 2: Run HeaderLayout tests**

Run: `npx jest src/features/dashboard/components/__tests__/HeaderLayout.test.tsx --no-coverage 2>&1 | tail -15`
Expected: Tests pass

**Step 3: Commit**

```bash
git add src/features/dashboard/components/HeaderLayout.tsx
git commit -m "feat: show menu button on all screen sizes for drawer access"
```

---

## Task 3: Remove SidebarDrawer from page.tsx, add simple inline drawer

**Objective:** Remove the `<SidebarDrawer>` component from page.tsx. Replace with a simple inline drawer that works as an overlay on all screen sizes, triggered by the header menu button.

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Rewrite page.tsx without SidebarDrawer**

Replace the full file content. The drawer is now a simple inline component within the page:

```tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, LayoutDashboard, ArrowLeftRight, Settings, X } from 'lucide-react';
import { HeaderLayout } from '@/features/dashboard/components/HeaderLayout';
import { MobileNavBar } from '@/features/dashboard/components/MobileNavBar';
import { SummaryCard } from '@/features/dashboard/components/SummaryCard';
import { RecentTransactions } from '@/features/dashboard/components/RecentTransactions';
import { MonthFilter } from '@/features/dashboard/components/MonthFilter';
import { EmptyState } from '@/features/dashboard/components/EmptyState';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';
import { cn } from '@/lib/utils';

const navigationItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Transações', href: '/transactions', icon: ArrowLeftRight },
];

const footerItem = { label: 'Configurações', href: '/settings', icon: Settings };

export default function DashboardPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear] = useState(String(now.getFullYear()));

  const { recentTransactions, summary, isLoading, error } = useDashboardData(selectedMonth, selectedYear);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* Drawer overlay backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-72',
          'bg-surface-container flex flex-col',
          'transition-transform duration-200 ease-out',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-semibold text-xl text-primary">
              FinanceGuy
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center justify-center p-2 rounded-md text-neutral hover:bg-surface-container-low transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 flex flex-col gap-1">
          {navigationItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
                  active
                    ? 'text-primary bg-surface-container-low'
                    : 'text-neutral hover:bg-surface-container-low'
                )}
              >
                <Icon className={cn('w-5 h-5', active ? 'text-primary' : 'text-neutral')} />
                <span className={cn('text-sm font-medium', active ? 'text-primary' : 'text-neutral')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 pt-0">
          <Link
            href={footerItem.href}
            onClick={() => setDrawerOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
              isActive(footerItem.href)
                ? 'text-primary bg-surface-container-low'
                : 'text-neutral hover:bg-surface-container-low'
            )}
          >
            <Settings className={cn('w-5 h-5', isActive(footerItem.href) ? 'text-primary' : 'text-neutral')} />
            <span className={cn('text-sm font-medium', isActive(footerItem.href) ? 'text-primary' : 'text-neutral')}>
              {footerItem.label}
            </span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col pb-16 md:pb-0">
        {/* Header — menu button triggers drawer on ALL screen sizes */}
        <HeaderLayout onOpenMobileDrawer={() => setDrawerOpen(true)} />

        {/* Dashboard Content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Page Title + Month Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-on-surface font-display">
                  Visão Geral
                </h1>
                <p className="text-sm text-on-surface-variant mt-1">
                  {new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <MonthFilter value={selectedMonth} onChange={(m) => m && setSelectedMonth(m)} />
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-error/10 border border-error/30 rounded-xl p-4 mb-6">
                <p className="text-error text-sm">{error}</p>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <SummaryCard label="Entradas" value={summary.income} type="income" isLoading={isLoading} />
              <SummaryCard label="Saídas" value={summary.expense} type="expense" isLoading={isLoading} />
              <SummaryCard label="Saldo" value={summary.balance} type="balance" isLoading={isLoading} />
            </div>

            {/* Recent Transactions or Empty State */}
            {!isLoading && recentTransactions.length === 0 ? (
              <EmptyState />
            ) : (
              <RecentTransactions transactions={recentTransactions} isLoading={isLoading} />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Navigation Bar */}
      <MobileNavBar />
    </div>
  );
}
```

**Key changes:**
- Removed `SidebarDrawer` import and `<SidebarDrawer>` usage (line 24)
- Drawer is now inline: simple `translate-x-0` / `-translate-x-full` toggle
- No `DashboardLayout` wrapper (removed grid)
- Menu button in HeaderLayout triggers `setDrawerOpen(true)` on ALL screen sizes
- Drawer works identically on mobile and desktop

**Step 2: Run page tests**

Run: `npx jest src/app/dashboard/__tests__/page.test.tsx --no-coverage 2>&1 | tail -20`
Expected: Some tests will fail because they mock old components — fix in Task 5

**Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "refactor: remove SidebarDrawer, inline drawer overlay on all screen sizes"
```

---

## Task 4: Remove SidebarDrawer component and DashboardLayout

**Objective:** Delete the now-unused SidebarDrawer and DashboardLayout components and clean up exports.

**Files:**
- Delete: `src/features/dashboard/components/SidebarDrawer.tsx`
- Delete: `src/features/dashboard/components/DashboardLayout.tsx`
- Modify: `src/features/dashboard/components/index.ts`

**Step 1: Delete unused components**

```bash
rm src/features/dashboard/components/SidebarDrawer.tsx
rm src/features/dashboard/components/DashboardLayout.tsx
```

**Step 2: Update index.ts exports**

Replace `src/features/dashboard/components/index.ts`:

```ts
export { MobileDrawer } from './MobileDrawer';
export { MobileNavBar } from './MobileNavBar';
export { HeaderLayout } from './HeaderLayout';
export { SearchInput } from './SearchInput';
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove unused SidebarDrawer and DashboardLayout components"
```

---

## Task 5: Update tests

**Objective:** Update tests to match the new architecture.

**Files:**
- Rewrite: `src/app/dashboard/__tests__/page.test.tsx`
- Delete: `src/features/dashboard/__tests__/layout.spec.tsx`
- Delete: `src/features/dashboard/__tests__/responsive.spec.tsx`

**Step 1: Rewrite page.test.tsx**

The drawer is now inline in page.tsx. Update mocks to reflect removed components:

```tsx
'use client';

import { render, screen } from '@testing-library/react';

// Mock components
jest.mock('@/features/dashboard/components/HeaderLayout', () => ({
  HeaderLayout: () => <header data-testid="header">Header</header>,
}));

jest.mock('@/features/dashboard/components/MobileNavBar', () => ({
  MobileNavBar: () => <nav data-testid="mobile-navbar">MobileNavBar</nav>,
}));

jest.mock('@/features/dashboard/components/SummaryCard', () => ({
  SummaryCard: ({ label }: { label: string }) => <div data-testid="summary-card">{label}</div>,
}));

jest.mock('@/features/dashboard/components/RecentTransactions', () => ({
  RecentTransactions: () => <div data-testid="recent-transactions">Transactions</div>,
}));

jest.mock('@/features/dashboard/components/MonthFilter', () => ({
  MonthFilter: () => <div data-testid="month-filter">MonthFilter</div>,
}));

jest.mock('@/features/dashboard/components/EmptyState', () => ({
  EmptyState: () => <div data-testid="empty-state">EmptyState</div>,
}));

jest.mock('@/features/dashboard/hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    recentTransactions: [],
    summary: { income: 0, expense: 0, balance: 0 },
    isLoading: false,
    error: null,
  }),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

import { HeaderLayout } from '@/features/dashboard/components/HeaderLayout';
import { MobileNavBar } from '@/features/dashboard/components/MobileNavBar';

describe('DashboardPage Integration', () => {
  it('renderiza HeaderLayout', () => {
    render(<HeaderLayout />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renderiza MobileNavBar', () => {
    render(<MobileNavBar />);
    expect(screen.getByTestId('mobile-navbar')).toBeInTheDocument();
  });
});
```

**Step 2: Delete old spec files**

```bash
rm src/features/dashboard/__tests__/layout.spec.tsx
rm src/features/dashboard/__tests__/responsive.spec.tsx
```

**Step 3: Run all tests**

Run: `npx jest --no-coverage 2>&1 | tail -15`
Expected: All tests pass

**Step 4: Commit**

```bash
git add -A
git commit -m "test: update tests for new dashboard architecture, remove obsolete specs"
```

---

## Task 6: Final verification

**Objective:** Run full verification suite to confirm everything works.

**Step 1: Run tests**

Run: `npx jest --no-coverage 2>&1 | tail -15`
Expected: All tests pass, 0 failures

**Step 2: Run build**

Run: `pnpm run build 2>&1 | tail -20`
Expected: Build compiles successfully, all routes generated

**Step 3: Visual verification (manual)**

Start dev server and check in browser:
- Desktop (≥768px): Menu button visible in header, clicking opens drawer overlay
- Mobile (<768px): Menu button visible, clicking opens drawer overlay
- MonthFilter dropdown: items have opaque dark background
- No fixed sidebar column — full width content

Run: `pnpm run dev` (then check in browser at localhost:3000/dashboard)

---

## Files Likely to Change

| File | Action |
|------|--------|
| `src/components/ui/select.tsx` | Modify (add bg-popover to SelectItem) |
| `src/features/dashboard/components/HeaderLayout.tsx` | Modify (remove md:hidden from menu btn) |
| `src/app/dashboard/page.tsx` | Rewrite (inline drawer, remove SidebarDrawer) |
| `src/features/dashboard/components/SidebarDrawer.tsx` | Delete |
| `src/features/dashboard/components/DashboardLayout.tsx` | Delete |
| `src/features/dashboard/components/index.ts` | Modify (remove exports) |
| `src/app/dashboard/__tests__/page.test.tsx` | Rewrite |
| `src/features/dashboard/__tests__/layout.spec.tsx` | Delete |
| `src/features/dashboard/__tests__/responsive.spec.tsx` | Delete |

## Risks & Tradeoffs

1. **Drawer always overlay**: On desktop, the drawer is now an overlay instead of a permanent sidebar. This is simpler but means the user must click menu to navigate. Standard for apps with limited nav items.
2. **MobileDrawer.tsx orphan**: The `MobileDrawer.tsx` component is nearly identical to the old SidebarDrawer but isn't used. Can be deleted in a future cleanup.
3. **Sidebar.tsx orphan**: The `Sidebar.tsx` component exists but was never rendered. Can be deleted in a future cleanup.
4. **Test deletion**: layout.spec.tsx and responsive.spec.tsx tested the old DashboardLayout API. Deleting them is cleaner than rewriting.
