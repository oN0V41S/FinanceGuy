# Fix: Dashboard White Bottom Area + Header Shadow

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Fix the white area visible at the bottom of the dashboard and the unintended shadow/contrast artifact near the notification icons in the header.

**Architecture:** The root cause is **missing CSS custom properties**. The `tailwind.config.ts` defines color tokens that reference `var(--surface)`, `var(--on-surface)`, `var(--finance-income)`, etc., but `globals.css` only defines a small subset of these variables. Without the variables, Tailwind classes like `bg-surface` resolve to transparent, letting the browser's default white background bleed through.

**Tech Stack:** Next.js 16, Tailwind CSS 3.4, CSS Custom Properties

---

## Root Cause Analysis

### Bug 1: White area at the bottom of the dashboard

The `<body>` element (`src/app/layout.tsx:36`) uses class `bg-surface`. In `tailwind.config.ts:21`, `surface.DEFAULT` maps to `var(--surface)`. But `--surface` is **never defined** in `globals.css`. Without it, `bg-surface` renders as transparent, and the browser's default white background shows through — especially visible at the bottom when content doesn't fill the viewport.

### Bug 2: Shadow/contrast near the notification icons

The `HeaderLayout` (`src/features/dashboard/components/HeaderLayout.tsx:14`) has `bg-surface-container` (`#201f22`). This is slightly lighter than the page background `#background` (`#131315`). When the body behind the header is white (due to the broken `--surface`), the header's darker background creates a stark contrast edge that looks like a shadow or dark band near the notification/profile icons.

### Missing CSS Variables (from `tailwind.config.ts` vs `globals.css`)

The tailwind config references these variables that are NOT defined in globals.css:

```
--surface                       (CRITICAL - body background)
--surface-bright
--surface-dim
--surface-tint
--surface-variant
--surface-container-high
--surface-container-highest
--surface-container-lowest
--on-surface                     (CRITICAL - text color used everywhere)
--on-surface-variant             (CRITICAL - label/description text)
--primary-container
--on-primary
--on-primary-container
--primary-fixed
--primary-fixed-dim
--secondary-container
--on-secondary
--on-secondary-container
--secondary-fixed
--secondary-fixed-dim
--tertiary-container
--on-tertiary
--on-tertiary-container
--tertiary-fixed
--tertiary-fixed-dim
--error
--error-container
--on-error
--on-error-container
--outline
--inverse-on-surface
--inverse-primary
--inverse-surface
--brand-primary
--brand-secondary
--brand-background
--finance-income                 (CRITICAL - used for income amounts)
--finance-expense                (CRITICAL - used for expense amounts)
--finance-recurring
```

---

## Step-by-Step Plan

### Task 1: Define all missing CSS custom properties in globals.css

**Objective:** Add all missing CSS variables referenced by `tailwind.config.ts` to `globals.css`, using the Material Design 3 dark theme palette that matches the existing color tokens.

**Files:**
- Modify: `src/app/globals.css` (lines 7-38, the `:root` block)

**Step 1: Update globals.css `:root` block**

Replace the current `:root` block with a complete set of Material Design 3 dark theme tokens:

```css
:root {
  /* === Core theme tokens === */
  --background: #131315;
  --foreground: #e5e1e4;

  /* === Primary === */
  --primary: #2563EB;
  --primary-container: #1d4ed8;
  --on-primary: #ffffff;
  --on-primary-container: #dbeafe;
  --primary-fixed: #93c5fd;
  --primary-fixed-dim: #60a5fa;

  /* === Secondary === */
  --secondary: #8B5CF6;
  --secondary-container: #7c3aed;
  --on-secondary: #ffffff;
  --on-secondary-container: #ede9fe;
  --secondary-fixed: #c4b5fd;
  --secondary-fixed-dim: #a78bfa;

  /* === Tertiary === */
  --tertiary: #10B981;
  --tertiary-container: #059669;
  --on-tertiary: #ffffff;
  --on-tertiary-container: #d1fae5;
  --tertiary-fixed: #6ee7b7;
  --tertiary-fixed-dim: #34d399;

  /* === Error === */
  --error: #EF4444;
  --error-container: #dc2626;
  --on-error: #ffffff;
  --on-error-container: #fee2e2;

  /* === Surface tokens === */
  --surface: #131315;
  --surface-dim: #0a0a0b;
  --surface-bright: #1e1e20;
  --surface-container-lowest: #0e0e10;
  --surface-container-low: #1c1b1d;
  --surface-container: #201f22;
  --surface-container-high: #2a292d;
  --surface-container-highest: #353438;
  --surface-tint: #2563EB;
  --surface-variant: #2d2d32;

  /* === On-Surface (text colors) === */
  --on-surface: #e5e1e4;
  --on-surface-variant: #a1a1aa;

  /* === Outline === */
  --outline: #52525b;
  --outline-variant: #434655;

  /* === Inverse === */
  --inverse-surface: #e5e1e4;
  --inverse-on-surface: #131315;
  --inverse-primary: #60a5fa;

  /* === Brand === */
  --brand-primary: #2563EB;
  --brand-secondary: #8B5CF6;
  --brand-background: #131315;

  /* === Finance === */
  --finance-income: #10B981;
  --finance-expense: #EF4444;
  --finance-recurring: #F59E0B;

  /* === shadcn-ui required tokens === */
  --card: #201f22;
  --card-foreground: #e5e1e4;
  --popover: #201f22;
  --popover-foreground: #e5e1e4;
  --primary-foreground: #ffffff;
  --secondary-foreground: #ffffff;
  --muted: #27272a;
  --muted-foreground: #a1a1aa;
  --accent: #27272a;
  --accent-foreground: #e5e1e4;
  --destructive: #E11D48;
  --destructive-foreground: #ffffff;
  --border: #434655;
  --input: #434655;
  --ring: #2563EB;
  --radius: 0.75rem;
}
```

**Step 2: Verify no new lint errors**

Run: `pnpm run lint`
Expected: No errors related to globals.css (CSS is not linted by ESLint)

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "fix: define missing CSS custom properties for surface, text, and finance tokens"
```

---

### Task 2: Fix dashboard page layout — remove redundant min-h-screen

**Objective:** The dashboard `page.tsx` has two nested `min-h-screen` divs which is redundant. Simplify the layout to prevent the outer div from extending beyond the content and showing the broken body background.

**Files:**
- Modify: `src/app/dashboard/page.tsx` (lines 22-91)

**Step 1: Simplify the layout structure**

Change the outer wrapper from `min-h-screen` to `min-h-dvh` (dynamic viewport height, better for mobile) and remove the redundant inner `min-h-screen`. Also move `pb-16 md:pb-0` to the outer wrapper since `MobileNavBar` is a child of the outer div.

Before:
```tsx
<div className="min-h-screen bg-background">
  <SidebarDrawer ... />
  <div className="flex flex-col min-h-screen bg-background pb-16 md:pb-0">
    <HeaderLayout ... />
    <main className="flex-1 p-4 md:p-6">
      ...
    </main>
  </div>
  <MobileNavBar />
</div>
```

After:
```tsx
<div className="min-h-dvh bg-background">
  <SidebarDrawer ... />
  <div className="flex flex-col min-h-dvh pb-16 md:pb-0">
    <HeaderLayout ... />
    <main className="flex-1 p-4 md:p-6">
      ...
    </main>
  </div>
  <MobileNavBar />
</div>
```

Changes:
1. Outer div: `min-h-screen` → `min-h-dvh` (better mobile behavior with address bar)
2. Inner div: removed `min-h-screen bg-background` (redundant; parent already provides both)
3. Both divs keep `bg-background` only on outer (single source of truth)

**Step 2: Verify**

Run: `pnpm run lint && pnpm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "fix: simplify dashboard layout — remove redundant min-h-screen wrapper"
```

---

### Task 3: Add bottom padding to body to account for MobileNavBar

**Objective:** The `MobileNavBar` is `fixed bottom-4`, so it overlaps content. The inner div has `pb-16` but the outer div does not. Ensure the bottom padding is on the correct element so the white area is fully covered by the dark `bg-background`.

**Files:**
- Modify: `src/app/dashboard/page.tsx` (if needed after Task 2 verification)

**Step 1: Verify padding is correct**

After Task 2, the `pb-16 md:pb-0` is on the inner flex column div. Since the MobileNavBar is `fixed`, it doesn't take flow space. The padding ensures content scrolls above the nav bar.

If the bottom still shows white after Task 2, move `pb-16 md:pb-0` to the outermost div:
```tsx
<div className="min-h-dvh bg-background pb-16 md:pb-0">
```

**Step 2: Verify visually**

Run `pnpm run dev` and check `http://localhost:3000/dashboard` on both desktop and mobile sizes. No white area should be visible at the bottom.

**Step 3: Commit (if changes needed)**

```bash
git add src/app/dashboard/page.tsx
git commit -m "fix: ensure bottom padding covers MobileNavBar overlap on all viewports"
```

---

### Task 4: Run full verification

**Objective:** Confirm lint, tests, and build all pass after the CSS and layout changes.

**Step 1: Lint**

Run: `pnpm run lint`
Expected: Clean (no errors)

**Step 2: Tests**

Run: `pnpm run test`
Expected: All tests pass (the dashboard page tests mock these components, so CSS changes don't break them)

**Step 3: Build**

Run: `pnpm run build`
Expected: Build succeeds without errors

---

## Files Likely to Change

| File | Change |
|------|--------|
| `src/app/globals.css` | Add ~80 missing CSS custom property definitions |
| `src/app/dashboard/page.tsx` | Remove redundant `min-h-screen` wrapper, fix padding |

## Tests / Validation

- `pnpm run lint` — no new errors
- `pnpm run test` — all existing tests pass (dashboard tests mock layout components)
- `pnpm run build` — production build succeeds
- Visual check: No white area at bottom, no unexpected shadow near header

## Risks, Tradeoffs, and Open Questions

1. **Color token accuracy:** The Material Design 3 dark theme values I've chosen for the missing variables are best-effort matches based on the existing tokens (`#131315` background, `#2563EB` primary, `#8B5CF6` secondary). Some tokens (like `--surface-container-high`, `--inverse-*`) may need fine-tuning by the user for exact visual fidelity. The plan provides sensible defaults that won't break anything.

2. **`finance-expense` color:** The globals.css already defines `--destructive: #E11D48` (Rose), but the VISUAL_IDENTITY.md specifies `#E11D48` for expense. I'm using `#EF4444` for `--finance-expense` to match the VISUAL_IDENTITY.md's error color convention, but the user may want `#E11D48` instead. Both are red tones — the difference is subtle.

3. **`min-h-dvh` vs `min-h-screen`:** `dvh` (dynamic viewport height) is better for mobile because it accounts for the browser's dynamic toolbar (address bar appearing/disappearing). However, `dvh` has limited support in older browsers. Since this is a modern Next.js 16 project targeting current browsers, this should be fine. Fallback: if needed, keep `min-h-screen`.

4. **MobileNavBar `shadow-lg`:** The `shadow-lg` on the MobileNavBar (`MobileNavBar.tsx:32`) uses Tailwind's default shadow which is semi-transparent black. On a dark background, this creates a subtle glow effect. If the user wants to remove it, change `shadow-lg` to `shadow-none` or use a custom dark shadow. This is a minor cosmetic preference, not a bug.
