# Spec-Driven Development Skill — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Create a `spec-driven-development` skill that enforces a three-phase workflow: (1) architecture decisions before code, (2) full component specification with 100% content explanation, and (3) test-first validation where tests define behavior before implementation exists.

**Architecture:** A single `SKILL.md` skill file under `~/.hermes/profiles/financeguy/skills/software-development/spec-driven-development/` with a `references/` subdirectory containing templates for specs, ADRs, and component contracts. The skill triggers automatically on new features, components, or architecture changes — and blocks code writing until specs are approved.

**Tech Stack:** Hermes Agent skill system, markdown templates, Next.js/React/TypeScript project conventions (FinanceGuy-specific patterns from existing `plan` skill references).

---

## Current Context / Assumptions

### What exists today
- `plan` skill already exists at `skills/software-development/plan/` — handles task planning with TDD
- The project has 35 failing test suites / 227 failing tests — mostly due to React 19 production build (`act(...) is not supported in production builds of React`) and base-ui Select quirks
- The project follows Clean Architecture (domain → use-cases → repositories → components → services)
- Components exist but many lack comprehensive documentation
- Tests exist but many are broken or incomplete

### What this skill adds (that `plan` doesn't)
| Capability | `plan` skill | `spec-driven-development` skill |
|---|---|---|
| Architecture decisions | No | **Yes — mandatory ADR before code** |
| Component full-spec | Partial (wireframes only) | **Yes — 100% props, behavior, edge cases, accessibility** |
| Test-first enforcement | TDD cycles in tasks | **Yes — tests written and verified failing BEFORE any task** |
| Spec approval gate | No | **Yes — plan blocked until spec is complete** |

---

## Skill Structure

```
~/.hermes/profiles/financeguy/skills/software-development/spec-driven-development/
├── SKILL.md                                    # Main skill definition
└── references/
    ├── adr-template.md                         # Architecture Decision Record template
    ├── component-contract-template.md          # 100% component specification template
    ├── test-validation-interview.md            # Test validation checklist/interview
    ├── spec-driven-workflow.md                 # Full workflow diagram
    └── existing-project-audit.md               # How to audit existing broken tests
```

---

## Task 1: Create ADR Template

**Objective:** Create the Architecture Decision Record template that forces clear architecture decisions before any code is written.

**Files:**
- Create: `~/.hermes/profiles/financeguy/skills/software-development/spec-driven-development/references/adr-template.md`

**Template content:**

```markdown
# ADR-{NUMBER}: {TITLE}

> Date: {DATE}
> Status: Proposed | Accepted | Deprecated | Superseded by ADR-{N}

## Context

What is the issue that we're seeing that is motivating this decision or change?
Include: current state, pain points, constraints.

## Decision

What is the change that we're proposing and/or doing?

### Architecture Layer Impact
- [ ] **Domain** (entities, value objects, repository interfaces)
- [ ] **Use Cases** (service layer, business logic)
- [ ] **Infrastructure** (repositories, external APIs, DB)
- [ ] **Presentation** (components, hooks, pages)
- [ ] **Shared** (types, utils, constants)

### Clean Architecture Boundaries
- Which layers does this change touch?
- Are there any cross-layer imports that violate dependency rule?
- Does this introduce new dependencies?

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Option A | ... | ... | Selected / Rejected |
| Option B | ... | ... | Selected / Rejected |

## Consequences

### Positive
- ...

### Negative
- ...

### Risks
- ...

## Test Implications
- What tests are needed to validate this decision?
- Which existing tests need updating?
- Integration points to verify?
```

**Verification:**
- Read the file back and confirm all sections are present
- Confirm template is generic enough for any feature (not FinanceGuy-specific)

**Commit:**
```bash
git add ~/.hermes/profiles/financeguy/skills/software-development/spec-driven-development/references/adr-template.md
git commit -m "docs: add ADR template for spec-driven development"
```

---

## Task 2: Create Component Contract Template

**Objective:** Create the 100% component specification template — explains every prop, behavior, edge case, and accessibility concern.

**Files:**
- Create: `~/.hermes/profiles/financeguy/skills/software-development/spec-driven-development/references/component-contract-template.md`

**Template content:**

```markdown
# Component Contract: {ComponentName}

## Identity
- **Name:** `{ComponentName}`
- **File:** `src/features/{feature}/components/{ComponentName}.tsx`
- **Test:** `src/features/{feature}/components/__tests__/{ComponentName}.test.tsx`

## Purpose (1 sentence)
What this component does and why it exists.

## Wireframe

```
┌────────────────────────────────────┐
│ Component Visual Layout            │
│ ┌──────────┐ ┌──────────────────┐ │
│ │ Element  │ │ Content Area     │ │
│ │ (icon)   │ │ (text/values)    │ │
│ └──────────┘ └──────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ Footer / Actions               │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

## Props Contract

| Prop | Type | Required | Default | Description | Validation |
|------|------|----------|---------|-------------|------------|
| `label` | `string` | ✅ | — | Display text for the card header | `min(1), max(255)` |
| `value` | `number` | ✅ | — | Numeric value to display | `>= 0` |
| `type` | `'income' \| 'expense' \| 'balance'` | ✅ | — | Determines icon, color, formatting | Enum check |
| `isLoading` | `boolean` | ❌ | `false` | Shows skeleton when true | — |

## Behavior Specification

### Render States
1. **Loading** (`isLoading=true`): Shows `<Skeleton>` placeholders (icon, label, value)
2. **Empty** (`value=0`): Shows `R$ 0,00` with neutral styling
3. **Income** (`type='income'`): Green icon (`TrendingUp`), green value, no prefix
4. **Expense** (`type='expense'`): Red icon (`TrendingDown`), red value, `-` prefix if `value > 0`
5. **Balance** (`type='balance'`): Blue icon (`Wallet`), blue value

### Formatting Rules
- Currency: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- Always shows `Math.abs(value)` — sign is determined by `type`
- Expense shows `- ` prefix only when `value > 0`

### Responsive Behavior
- Mobile (`< md`): `p-4`, text `text-2xl`
- Desktop (`>= md`): `p-6`, text `text-3xl`

## Accessibility
- Card uses semantic `<Card>` (shadcn)
- Label text is `text-sm text-on-surface-variant` (secondary text color)
- Value is `font-semibold font-mono` (monospace for alignment)
- No interactive elements — pure display component

## Edge Cases
- `value = 0`: Renders `R$ 0,00` (no special empty state)
- `value = -100` with `type='income'`: Shows `R$ 100,00` (Math.abs strips sign)
- `value = 999999.99`: Shows `R$ 999.999,99` (thousands separator)

## Test Matrix

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Loading state | `isLoading=true` | Skeleton visible, no value text |
| 2 | Income display | `value=5000, type='income'` | `R$ 5.000,00` in green |
| 3 | Expense with prefix | `value=150.50, type='expense'` | `- R$ 150,50` in red |
| 4 | Balance display | `value=4849.50, type='balance'` | `R$ 4.849,50` in blue |
| 5 | Zero value | `value=0, type='income'` | `R$ 0,00` |
| 6 | Large value | `value=1000000, type='income'` | `R$ 1.000.000,00` |
```

**Verification:**
- Read back and confirm all sections present
- Compare with existing `SummaryCard.tsx` — confirm the template would have caught the formatting rules

**Commit:**
```bash
git add references/component-contract-template.md
git commit -m "docs: add component contract template for spec-driven development"
```

---

## Task 3: Create Test Validation Interview

**Objective:** Create the test validation "interview" — a structured checklist that verifies tests exist, are correct, and cover all cases BEFORE implementation begins.

**Files:**
- Create: `~/.hermes/profiles/financeguy/skills/software-development/spec-driven-development/references/test-validation-interview.md`

**Template content:**

```markdown
# Test Validation Interview

> Before writing ANY implementation code, complete this interview.
> If any answer is "No" or "N/A" — STOP. Fix the gap first.

## Phase 1: Test Existence

- [ ] **T1.1** Do test files exist for every new file being created?
  - Component → `__tests__/{Name}.test.tsx`
  - Service → `__tests__/{name}.service.test.ts`
  - API route → `{name}.test.ts` co-located
  - Hook → `__tests__/{name}.test.ts` or same directory

- [ ] **T1.2** Do test files exist for every modified file?
  - Check: `find src/ -name "*.test.*" -newer <modified_file>`

- [ ] **T1.3** Are test files discoverable by Jest?
  - Check `testMatch` in `jest.config.ts`
  - Run: `npx jest --listTests | grep <test_file>`

## Phase 2: Test Correctness (RED phase)

- [ ] **T2.1** Do ALL new tests FAIL when run without implementation?
  Run: `npx jest <test_path> --no-coverage`
  Expected: All tests FAIL (not error, not skip — actual assertion failures)

- [ ] **T2.2** Do failure messages confirm the right behavior is expected?
  - Good: `Expected: "R$ 5.000,00" Received: undefined`
  - Bad: `TypeError: Cannot read property 'x' of undefined` (wrong test setup)

- [ ] **T2.3** Do existing tests still PASS (no regressions)?
  Run: `npx jest --no-coverage`
  Expected: All previously-passing tests still pass

## Phase 3: Test Coverage Completeness

- [ ] **T3.1** Happy path covered?
  - Normal inputs → expected outputs

- [ ] **T3.2** Edge cases covered?
  - Empty arrays, zero values, max lengths, special characters

- [ ] **T3.3** Error states covered?
  - Network failures, validation errors, unauthorized access

- [ ] **T3.4** Loading/async states covered?
  - `isLoading=true` → spinner/skeleton
  - `isLoading=false` → real content
  - Error state → error message

- [ ] **T3.5** Accessibility covered?
  - ARIA roles present
  - Labels visible to screen readers
  - Keyboard navigation works

## Phase 4: Regression Prevention

- [ ] **T4.1** Existing broken tests are identified and documented
  Run: `npx jest --no-coverage 2>&1 | grep "FAIL"`
  Document each failure with root cause

- [ ] **T4.2** Tests that fail due to environment issues (not code bugs) are isolated
  Known issues:
  - React 19 production build: `act(...) is not supported in production builds`
  - base-ui Select: portal doesn't render in jsdom
  - Duplicate mock: `src/__mocks__/next.ts` vs `.worktrees/` copy

- [ ] **T4.3** Fix plan exists for each category of failure

## Phase 5: GREEN Phase Verification

After implementation, verify:
- [ ] **T5.1** All new tests PASS
- [ ] **T5.2** No existing tests regressed
- [ ] **T5.3** `pnpm run lint` passes
- [ ] **T5.4** `pnpm run build` succeeds
- [ ] **T5.5** Coverage meets minimum threshold (80% for new files)

## Interview Result

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Test Existence | ✅ / ❌ | |
| 2. Test Correctness | ✅ / ❌ | |
| 3. Coverage | ✅ / ❌ | |
| 4. Regression | ✅ / ❌ | |
| 5. GREEN Phase | ✅ / ❌ | |

**Gate:** Implementation CANNOT proceed until Phases 1-4 are ✅
```

**Verification:**
- Read back and confirm checklist is actionable
- Confirm it addresses the React 19 `act()` issue specifically

**Commit:**
```bash
git add references/test-validation-interview.md
git commit -m "docs: add test validation interview for spec-driven development"
```

---

## Task 4: Create Existing Project Audit Guide

**Objective:** Create a guide for auditing the current broken tests (227 failures) and categorizing them for fixing.

**Files:**
- Create: `~/.hermes/profiles/financeguy/skills/software-development/spec-driven-development/references/existing-project-audit.md`

**Content (key sections):**

```markdown
# Existing Project Audit — Test Failures

## Known Failure Categories

### Category A: React 19 Production Build (act() error)
**Root cause:** Jest loads `react.production.js` instead of `react.development.js`
**Error:** `act(...) is not supported in production builds of React`
**Affected files:** ALL component tests using `render()` from @testing-library/react
**Fix:** Configure Jest to resolve React to development build
**Files to modify:** `jest.config.ts` (add `moduleNameMapper` for react)
**Verification:**
```bash
# After fix:
npx jest src/shared/components/__tests__/LazyLoad.test.tsx --no-coverage
# Expected: PASS (was FAIL)
```

### Category B: base-ui Select Portal (jsdom limitation)
**Root cause:** base-ui Select uses Portal + animations that don't render in jsdom
**Error:** `Unable to find role="listbox"` or similar
**Affected files:** `MonthFilter.e2e.test.tsx`, `FortnightFilter.test.tsx`
**Fix:** Use `[data-slot="select-value"]` queries instead of `getByRole('listbox')`
**Files to modify:** Test files only
**Verification:**
```bash
npx jest src/features/dashboard/__tests__/MonthFilter.e2e.test.tsx --no-coverage
# Expected: PASS
```

### Category C: Duplicate Mock Warning
**Root cause:** `src/__mocks__/next.ts` exists in both main tree and `.worktrees/`
**Error:** `jest-haste-map: duplicate manual mock found: next`
**Affected files:** All tests that mock `next/*`
**Fix:** Delete `.worktrees/hermes-fb61a49b/src/__mocks__/next.ts` or add to `testPathIgnorePatterns`
**Files to modify:** `jest.config.ts`
**Verification:**
```bash
npx jest --listTests 2>&1 | grep "duplicate"
# Expected: no output
```

### Category D: Missing Mock for `isSummaryLoading`
**Root cause:** `page.test.tsx` mock of `useDashboardData` doesn't include `isSummaryLoading`
**Error:** Property missing in mock return value
**Fix:** Add `isSummaryLoading: false` to mock
**Files to modify:** `src/app/dashboard/__tests__/page.test.tsx`
**Verification:**
```bash
npx jest src/app/dashboard/__tests__/page.test.tsx --no-coverage
# Expected: PASS
```

## Audit Checklist

- [ ] List ALL failing test suites: `npx jest --no-coverage 2>&1 | grep "FAIL"`
- [ ] Categorize each into A/B/C/D
- [ ] Fix Category A first (highest impact — unblocks ALL component tests)
- [ ] Fix Category C (eliminates noise)
- [ ] Fix Category B and D (specific test fixes)
- [ ] Run full suite: `npx jest --no-coverage`
- [ ] Document remaining failures in `jest.config.ts` `testPathIgnorePatterns`
```

**Verification:**
- Confirm all 4 categories match the actual failures from the test run
- Confirm the fix approach is correct for each

**Commit:**
```bash
git add references/existing-project-audit.md
git commit -m "docs: add existing project test audit guide"
```

---

## Task 5: Create Workflow Diagram

**Objective:** Create the spec-driven workflow that shows the complete flow from feature request to implementation.

**Files:**
- Create: `~/.hermes/profiles/financeguy/skills/software-development/spec-driven-development/references/spec-driven-workflow.md`

**Content:**

```markdown
# Spec-Driven Development Workflow

## Flow Diagram

```
Feature Request / Bug Report
        │
        ▼
┌─────────────────────┐
│ PHASE 0: AUDIT      │  ← Only for existing code
│ Check existing      │
│ tests & failures    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ PHASE 1: ARCHITECT  │
│ Write ADR           │
│ (adr-template.md)   │
│                     │
│ • Context           │
│ • Decision          │
│ • Alternatives      │
│ • Consequences      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ PHASE 2: SPECIFY    │
│ Write Component     │
│ Contract            │
│ (contract-template) │
│                     │
│ • 100% props        │
│ • All behaviors     │
│ • Edge cases        │
│ • Test matrix       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ PHASE 3: VALIDATE   │
│ Test Interview      │
│ (interview.md)      │
│                     │
│ • Tests exist?      │
│ • Tests fail?       │
│ • Coverage?         │
│ • Regressions?      │
└─────────┬───────────┘
          │
          ├── NO ──→ Fix gaps, loop back
          │
          ▼ YES
┌─────────────────────┐
│ PHASE 4: PLAN       │  ← Hand off to `plan` skill
│ Break into tasks    │
│ TDD cycles          │
│ Exact file paths    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ PHASE 5: IMPLEMENT  │  ← Subagent dispatch
│ RED → GREEN → REFACTOR │
│ Verify at each step │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ PHASE 6: VERIFY     │
│ Lint + Test + Build │
│ Interview Phase 5   │
└─────────┬───────────┘
          │
          ▼
       ✅ DONE
```

## When to Use This Workflow

| Trigger | Start at Phase |
|---------|----------------|
| New feature | Phase 1 (ADR) |
| New component | Phase 2 (Contract) |
| Bug fix | Phase 3 (Interview existing tests) |
| Refactor | Phase 1 (ADR for architectural change) |
| Fixing broken tests | Phase 0 (Audit) |

## Relationship to `plan` Skill

- **This skill** handles Phases 0-3 (audit, architecture, specification, test validation)
- **`plan` skill** handles Phases 4-5 (task breakdown, TDD implementation)
- They compose: spec-driven-development validates the WHAT, plan executes the HOW
```

**Verification:**
- Confirm flow is complete and covers all scenarios
- Confirm relationship to existing `plan` skill is clear

**Commit:**
```bash
git add references/spec-driven-workflow.md
git commit -m "docs: add spec-driven workflow diagram"
```

---

## Task 6: Create Main SKILL.md

**Objective:** Create the main skill file that orchestrates all references and defines the skill's behavior.

**Files:**
- Create: `~/.hermes/profiles/financeguy/skills/software-development/spec-driven-development/SKILL.md`

**Content:**

```markdown
---
name: spec-driven-development
description: "Spec-driven development: architecture decisions → full component specs → test-first validation. Blocks code until specs are complete."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [spec-driven, architecture, tdd, documentation, quality-gate]
    related_skills: [plan, test-driven-development, requesting-code-review]
---

# Spec-Driven Development

Write specifications before code. Every feature starts with architecture decisions,
full component contracts, and test validation — before ANY implementation begins.

## When to Load This Skill

- New feature or component request
- Architecture change (new layer, new dependency, new pattern)
- Refactor that changes public API surface
- Fixing broken tests (audit first)
- User says "spec first", "design first", "what should we build"

## Workflow

See `references/spec-driven-workflow.md` for the complete flow.

### Quick Reference

```
1. AUDIT     → Fix existing broken tests (if applicable)
2. ARCHITECT → Write ADR (adr-template.md)
3. SPECIFY   → Write component contract (component-contract-template.md)
4. VALIDATE  → Run test interview (test-validation-interview.md)
5. PLAN      → Hand off to `plan` skill for task breakdown
6. IMPLEMENT → Subagent dispatch with TDD
7. VERIFY    → Lint + Test + Build + Final interview
```

## Phase Details

### Phase 0: Audit (existing code only)

Load `references/existing-project-audit.md` to:
- Categorize all failing tests by root cause
- Fix environment-level issues first (React 19, base-ui, mocks)
- Document remaining known failures in `jest.config.ts`

### Phase 1: Architecture (ADR)

Load `references/adr-template.md` and write an ADR covering:
- **Context:** Why this change is needed
- **Decision:** What we're doing and why
- **Alternatives:** What we considered and rejected
- **Consequences:** What this means for the codebase
- **Test implications:** What tests this requires

**Gate:** ADR must be complete before moving to Phase 2.

### Phase 2: Specification (Component Contract)

Load `references/component-contract-template.md` and document EVERY component:
- **Purpose:** One sentence
- **Wireframe:** ASCII layout
- **Props contract:** Every prop with type, required, default, validation
- **Behavior spec:** All render states, formatting rules, responsive behavior
- **Accessibility:** ARIA roles, labels, keyboard navigation
- **Edge cases:** Zero values, max lengths, error states
- **Test matrix:** Input → Expected output for every scenario

**Gate:** Component contract must cover 100% of props and behaviors before Phase 3.

### Phase 3: Test Validation (Interview)

Load `references/test-validation-interview.md` and complete:
- **T1:** Test files exist for all new/modified files
- **T2:** Tests FAIL without implementation (RED phase verified)
- **T3:** Coverage complete (happy path, edge cases, errors, loading, a11y)
- **T4:** No regressions in existing tests
- **T5:** After implementation — all tests PASS, lint clean, build succeeds

**Gate:** Phases 1-4 must be ✅ before any code is written.

### Phase 4: Plan (hand off to `plan` skill)

After specs are validated, load the `plan` skill to:
- Break work into 2-5 minute tasks
- Write TDD cycles (RED → GREEN → REFACTOR)
- Include exact file paths and commands
- Dispatch subagents per task

### Phase 5: Implementation

Execute via `subagent-driven-development`:
- Fresh subagent per task
- Two-stage review (spec compliance → code quality)
- Stop after each verification step

### Phase 6: Final Verification

- Run: `npx jest --no-coverage` — all tests pass
- Run: `pnpm run lint` — no errors
- Run: `pnpm run build` — succeeds
- Complete Test Interview Phase 5
- Commit with conventional commit message

## FinanceGuy-Specific Patterns

### Dashboard Filter Isolation
When adding filters to the dashboard, use the dual-query pattern from `references/dashboard-filter-isolation.md`. Summary cards respond to filters; RecentTransactions always shows full-month data.

### Lazy Loading Assertion Pattern
Use the "never render empty" rule from `references/lazy-loading-assertion-patterns.md`. Components must be OFF (not in DOM) during loading, or ON with real non-zero content after loading.

### base-ui Select Quirks
- `SelectValue` renders raw `value`, not `SelectItem` children — use manual `<span>` lookup
- Portal doesn't render in jsdom — use `[data-slot="select-value"]` queries
- See `references/shadcn-nextjs-patterns.md` for details

### React 19 Test Environment
All component tests fail with `act(...) is not supported in production builds of React`. This is a Jest/React 19 environment issue — fix by ensuring React resolves to development build in test environment.

## Templates

| Template | Path | When to Use |
|----------|------|-------------|
| ADR | `references/adr-template.md` | Architecture decisions |
| Component Contract | `references/component-contract-template.md` | Every new/modified component |
| Test Interview | `references/test-validation-interview.md` | Before implementation |
| Project Audit | `references/existing-project-audit.md` | Fixing broken tests |
| Workflow | `references/spec-driven-workflow.md` | Understanding the full flow |
```

**Verification:**
- Read back and confirm all sections reference the correct templates
- Confirm the skill loads all references correctly

**Commit:**
```bash
git add SKILL.md
git commit -m "feat: add spec-driven-development skill"
```

---

## Task 7: Create Skill Directory Structure and Verify

**Objective:** Create the full directory, verify all files exist, and test the skill loads.

**Files:**
- Create directory: `~/.hermes/profiles/financeguy/skills/software-development/spec-driven-development/`
- Create directory: `~/.hermes/profiles/financeguy/skills/software-development/spec-driven-development/references/`

**Steps:**

1. Create directories:
```bash
mkdir -p ~/.hermes/profiles/financeguy/skills/software-development/spec-driven-development/references/
```

2. Verify all files exist:
```bash
ls -la ~/.hermes/profiles/financeguy/skills/software-development/spec-driven-development/
ls -la ~/.hermes/profiles/financeguy/skills/software-development/spec-driven-development/references/
```

Expected output:
```
spec-driven-development/
├── SKILL.md
└── references/
    ├── adr-template.md
    ├── component-contract-template.md
    ├── test-validation-interview.md
    ├── existing-project-audit.md
    └── spec-driven-workflow.md
```

3. Verify skill loads:
```bash
# The skill should be discoverable by Hermes
# Test by viewing the skill
```

4. Final commit:
```bash
git add -A
git commit -m "feat: complete spec-driven-development skill with all templates"
```

---

## Files Likely to Change

| File | Action | Purpose |
|------|--------|---------|
| `SKILL.md` | Create | Main skill definition |
| `references/adr-template.md` | Create | Architecture Decision Record template |
| `references/component-contract-template.md` | Create | 100% component specification |
| `references/test-validation-interview.md` | Create | Test validation checklist |
| `references/existing-project-audit.md` | Create | Broken test audit guide |
| `references/spec-driven-workflow.md` | Create | Workflow diagram |

## Risks and Tradeoffs

| Risk | Mitigation |
|------|------------|
| Skill too heavy — agents skip it | Make it concise; templates are optional references, not mandatory loads |
| Over-engineering for small features | Add "lightweight mode" — skip ADR for trivial changes (< 50 LOC) |
| Templates become stale | Pin to FinanceGuy conventions; review quarterly |
| React 19 test fix blocks everything | Fix Category A first (Task 4 in audit guide) — unblocks ALL component tests |

## Open Questions

1. **Should the skill auto-trigger on `feat:` commits?** → Yes, via AGENTS.md automation rules
2. **Should the ADR be saved to the repo?** → Yes, in `docs/adr/` directory for future reference
3. **How does this interact with existing `plan` skill?** → Complementary: spec-driven validates WHAT, plan executes HOW
