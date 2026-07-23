# Fix Month Select Broken Background — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Fix the broken/dark background on the MonthFilter select component so it matches the project's "Linear Financial" dark theme.

**Architecture:** The shadcn Select component (base-ui based) references CSS variables (`--input`, `--border`, `--popover`, etc.) that are not defined in the project's `globals.css`. This causes the select trigger and dropdown to render with incorrect/missing backgrounds.

**Tech Stack:** Next.js 16+, Tailwind CSS, shadcn-ui (base-ui), CSS custom properties

---

## Root Cause Analysis

The shadcn `SelectTrigger` (in `src/components/ui/select.tsx:44`) has these base classes:

```
border border-input bg-transparent dark:bg-input/30
```

And `SelectContent` (the dropdown) uses:
```
bg-popover text-popover-foreground
```

But `globals.css` only defines these CSS variables:
```css
--background: #131315;
--foreground: #e5e1e4;
--primary: #2563EB;
--secondary: #8B5CF6;
--tertiary: #10B981;
--surface-container: #201f22;
--surface-container-low: #1c1b1d;
--outline-variant: #434655;
```

**Missing variables that shadcn needs:**
| Variable | Used By | Effect When Missing |
|---|---|---|
| `--input` | SelectTrigger `dark:bg-input/30` | No background on trigger in dark mode |
| `--border` | SelectTrigger `border-border` | No border color |
| `--ring` | SelectTrigger `focus-visible:ring` | No focus ring |
| `--popover` | SelectContent `bg-popover` | Dropdown has no background |
| `--popover-foreground` | SelectContent `text-popover-foreground` | Dropdown text invisible |
| `--accent` | SelectItem `focus:bg-accent` | No highlight on hover |
| `--accent-foreground` | SelectItem `focus:text-accent-foreground` | Text wrong on hover |
| `--muted-foreground` | SelectValue placeholder, chevron | Placeholder/chevron invisible |
| `--destructive` | aria-invalid states | N/A for now, but needed |
| `--radius-md` | SelectTrigger sm variant | N/A for now |

---

## Wireframe — Current vs Fixed

**CURRENT (broken):**
```
┌─────────────────────────────┐
│  Visão Geral                │
│  janeiro de 2026            │
│                             │
│  ┌─ Select Trigger ──────┐  │
│  │ [invisible text]  ▾  │  │  ← bg is transparent/invisible
│  └───────────────────────┘  │
│                             │
│  ┌─ Card ──┐ ┌─ Card ──┐   │
│  │ Entradas│ │ Saídas  │   │
└─────────────────────────────┘
```

**FIXED:**
```
┌─────────────────────────────┐
│  Visão Geral                │
│  janeiro de 2026            │
│                             │
│  ┌─ Select Trigger ──────┐  │
│  │ Junho           ▾  │  │  ← bg: surface-container-low, visible border
│  └───────────────────────┘  │
│                             │
│  ┌─ Card ──┐ ┌─ Card ──┐   │
│  │ Entradas│ │ Saídas  │   │
└─────────────────────────────┘
```

---

## Task 1: Add Missing CSS Variables to globals.css

**Objective:** Define all CSS variables that shadcn components reference so the dark theme renders correctly.

**Files:**
- Modify: `src/app/globals.css` (add variables to `:root`)

**Step 1: Add missing CSS variables**

Add these variables inside the existing `:root` block in `globals.css`:

```css
:root {
  /* === Existing tokens === */
  --background: #131315;
  --foreground: #e5e1e4;
  --primary: #2563EB;
  --secondary: #8B5CF6;
  --tertiary: #10B981;
  --surface-container: #201f22;
  --surface-container-low: #1c1b1d;
  --outline-variant: #434655;

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

**Step 2: Verify CSS variables resolve**

Run: `pnpm run build` — no CSS errors expected.

**Step 3: Verify visually**

Start dev server `pnpm run dev`, navigate to `/login`, then `/dashboard` (or bypass auth). The month select should now show:
- A visible border around the trigger
- A background color (`#434655` at 30% opacity in dark mode) on the trigger
- Properly styled dropdown when opened

---

## Task 2: Fix MonthFilter SelectTrigger Background Override

**Objective:** Ensure the SelectTrigger background uses the project's surface color instead of the shadcn dark:opacity override.

**Files:**
- Modify: `src/features/dashboard/components/MonthFilter.tsx` (line 31)

**Step 1: Update SelectTrigger className**

Current:
```tsx
<SelectTrigger className="w-[180px] bg-surface-container-low border-border">
```

Replace with a more specific override that wins over shadcn's `dark:bg-input/30`:
```tsx
<SelectTrigger className="w-[180px] !bg-surface-container-low !border-outline-variant hover:!bg-surface-container">
```

The `!important` prefix (`!`) ensures our surface colors override the base shadcn `dark:bg-input/30`.

**Step 2: Run tests**

Run: `npx jest --no-coverage` — expected: 195 tests pass (no test changes needed).

**Step 3: Verify visually**

The trigger should now show a solid dark surface color (`#1c1b1d`) instead of the semi-transparent input color.

---

## Task 3: Verify and Test

**Objective:** Full verification that the fix works end-to-end.

**Step 1: Build**
Run: `pnpm run build` — expected: compiles successfully.

**Step 2: Tests**
Run: `pnpm run test` — expected: 195 tests pass.

**Step 3: Visual check**
Start `pnpm run dev`, visit `/dashboard`. The month filter select should:
- Show text ("Junho") on a visible dark surface background
- Have a clear border that matches the design system
- Dropdown should have `bg-popover` (#201f22) background with visible text
- Focus ring should be blue (#2563EB)

---

## Files to Change

| File | Action | What |
|---|---|---|
| `src/app/globals.css` | Modify | Add ~15 missing CSS variables to `:root` |
| `src/features/dashboard/components/MonthFilter.tsx` | Modify | Override SelectTrigger background with `!bg-surface-container-low` |

---

## Risks & Tradeoffs

1. **`!important` usage**: The `!` prefix in Tailwind adds `!important`. This is acceptable here because we're overriding a shadcn library default with project-specific design tokens. If shadcn releases an update, the override still works.

2. **Missing CSS variables for other shadcn components**: Adding `--popover`, `--accent`, etc. will also fix backgrounds on other shadcn components (Dialog, DropdownMenu, etc.) that may have had the same issue.

3. **No visual regression test**: We rely on manual verification. For a more robust approach, a visual regression test (e.g., Playwright screenshot comparison) could be added later.

---

## Open Questions

- The MonthFilter currently shows month value but does the user want a clearable select (X button to deselect)? If so, `onValueChange` needs to support `""` → `null` conversion.
- Should the dropdown also use `!bg-popover` to ensure consistent background? (Likely not needed since we're adding `--popover` variable.)
