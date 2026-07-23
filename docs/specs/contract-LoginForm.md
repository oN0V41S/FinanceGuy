# Component Contract: LoginForm (Modified)

## Identity
- **Name:** `LoginForm`
- **File:** `src/features/auth/components/LoginForm.tsx`
- **Test:** `src/features/auth/components/__tests__/LoginForm.test.tsx` (existing, update)

## Purpose
Formulário de login com suporte dual: credenciais (email/senha) E Google OAuth,
separados por um divider visual.

## Wireframe (Updated)

```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌────────────────────────────────────────┐ │
│  │  [G]  Continuar com Google             │ │  ← GoogleSignInButton (novo)
│  └────────────────────────────────────────┘ │
│                                             │
│  ──────── ou continue com email ────────── │  ← Divider (novo)
│                                             │
│  Endereço de e-mail                         │
│  ┌────────────────────────────────────────┐ │
│  │ seu@email.com                          │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  Senha                                      │
│  ┌────────────────────────────────────────┐ │
│  │ ••••••••                               │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌────────────────────────────────────────┐ │
│  │         Entrar na conta                │ │  ← Button existente
│  └────────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

## Props Contract

Sem mudanças. O `LoginForm` não recebe props (componente auto-contido).

## Behavior Specification

### Render States (Updated)
1. **Default:** Google button → Divider → Email/Password form → Submit button
2. **Submitting (credentials):** Submit button mostra spinner, Google button permanece clicável
3. **Error:** Mensagem de erro aparece abaixo do divider, acima do form

### Layout Changes (vs. current)
- **Antes:** Apenas email/password form
- **Depois:** Google button no topo → Divider "ou continue com email" → Form existente
- Divider: `flex items-center gap-4` com `<hr>` e `<span>` "ou continue com email"
- Divider styling: `text-on-surface-variant text-xs` para o texto, `border-outline` para hr

### Formatting Rules (Divider)
- Container: `relative flex items-center py-4`
- HR: `flex-1 border-t border-outline`
- Texto: `px-3 text-xs text-on-surface-variant whitespace-nowrap`

## Accessibility
- Divider usa `<hr>` semântico com `role="separator"` implícito
- Google button e form são independentes — tab order: Google → email → password → submit
- Google button não afeta validação do form de credenciais

## Edge Cases
- Google button e form de credenciais funcionam independentemente
- Erro no Google OAuth não afeta o form de credenciais (e vice-versa)
- Loading do Google button não bloqueia o form de credenciais

## Test Matrix

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Google button rendered | Default | "Continuar com Google" button visible |
| 2 | Divider rendered | Default | "ou continue com email" text visible |
| 3 | Email form still works | Fill email + password + submit | loginAction called with credentials |
| 4 | Google button independent | Click Google while form empty | signIn("google") called, no form validation error |
| 5 | Form submits independently | Fill form + submit | Google button not affected |
| 6 | Error state | loginAction returns error | Error alert shown between divider and form |
