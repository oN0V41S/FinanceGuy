# Implementation Plan — Google Auth Integration

> ADR: ADR-001-google-auth-integration.md
> Specs: contract-GoogleSignInButton.md, contract-LoginForm.md, contract-auth-config.md

## Task 1: Add Google Provider to NextAuth Config
**Time:** ~3 min | **TDD:** GREEN (config change, no component)

### RED
- Create `src/features/auth/__tests__/auth.config.test.ts`
- Test: `auth.config.providers` includes a provider with `id === "google"`
- Test: Google provider has `clientId` and `clientSecret` from env
- Test: Credentials provider still exists
- Run: `npx jest auth.config.test` → FAIL (Google not configured)

### GREEN
- Edit `src/auth.ts`:
  - Add `import Google from "next-auth/providers/google"`
  - Add `Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })` to providers array
  - Add `picture` to jwt callback token
  - Add `picture` to session callback user
- Run: `npx jest auth.config.test` → PASS

### Files
- `src/auth.ts` (modify)
- `src/features/auth/__tests__/auth.config.test.ts` (new)

---

## Task 2: Create GoogleSignInButton Component
**Time:** ~5 min | **TDD:** RED → GREEN → REFACTOR

### RED
- Create `src/features/auth/components/__tests__/GoogleSignInButton.test.tsx`
- Tests:
  1. Renders button with text "Continuar com Google"
  2. Renders Google SVG icon
  3. Click calls `signIn("google", { callbackUrl: "/dashboard" })`
  4. Custom `callbackUrl` prop is passed to signIn
  5. `disabled` prop sets `aria-disabled="true"`
  6. Keyboard Enter triggers signIn
- Run: `npx jest GoogleSignInButton` → FAIL (component doesn't exist)

### GREEN
- Create `src/features/auth/components/GoogleSignInButton.tsx`:
  - `"use client"` component
  - Props: `callbackUrl?: string`, `disabled?: boolean`
  - Uses `signIn` from `@/auth`
  - Google SVG icon (20x20 inline)
  - Loading state with `Loader2` spinner
  - Styling per contract (h-12, rounded-xl, border-outline, etc.)
- Run: `npx jest GoogleSignInButton` → PASS

### REFACTOR
- Extract Google SVG to a small helper if needed
- Ensure consistent with VISUAL_IDENTITY.md

### Files
- `src/features/auth/components/GoogleSignInButton.tsx` (new)
- `src/features/auth/components/__tests__/GoogleSignInButton.test.tsx` (new)

---

## Task 3: Update LoginForm with Divider + Google Button
**Time:** ~5 min | **TDD:** RED → GREEN → REFACTOR

### RED
- Update `src/features/auth/components/LoginForm.test.tsx`:
  - Add test: renders "Continuar com Google" button
  - Add test: renders divider with "ou continue com email"
  - Add test: Google button and form are independent
- Run: `npx jest LoginForm.test` → FAIL (divider/button not rendered)

### GREEN
- Edit `src/features/auth/components/LoginForm.tsx`:
  - Import `GoogleSignInButton`
  - Add Google button at top of form
  - Add divider: `<hr>` + `<span>ou continue com email</span>`
  - Keep existing email/password form below divider
- Run: `npx jest LoginForm.test` → PASS

### REFACTOR
- Ensure divider spacing matches contract (py-4, gap-4)

### Files
- `src/features/auth/components/LoginForm.tsx` (modify)
- `src/features/auth/components/__tests__/LoginForm.test.tsx` (modify)

---

## Task 4: Environment Variables Setup
**Time:** ~2 min | **No TDD** (config only)

### Actions
- Add to `.env.local` (template, not actual values):
  ```
  GOOGLE_CLIENT_ID=<your-google-client-id>
  GOOGLE_CLIENT_SECRET=<your-google-client-secret>
  ```
- Add to `.env.example` if exists
- Document in README.md

### Files
- `.env.local` (modify — add placeholder comments)
- `README.md` (modify — add Google Auth setup section)

---

## Task 5: Update Proxy Matcher (if needed)
**Time:** ~2 min | **TDD:** N/A

### Check
- Current matcher: `/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)`
- `/api/auth/callback/google` is already excluded by `api` rule
- **No change needed** — NextAuth API routes are already excluded

### Files
- None (verified, no change)

---

## Execution Order

```
Task 1 (auth.ts config) → Task 2 (GoogleSignInButton) → Task 3 (LoginForm update) → Task 4 (env vars)
```

Tasks 1-3 are sequential (each depends on the previous).
Task 4 is independent but done last (config, not code).

## Verification Commands

After all tasks:
```bash
npx jest --no-coverage --testPathPatterns='src/features/auth'  # Auth tests pass
pnpm run lint                                                  # No lint errors
pnpm run build                                                 # Build succeeds
```
