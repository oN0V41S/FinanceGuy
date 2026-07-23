# Component Contract: GoogleSignInButton

## Identity
- **Name:** `GoogleSignInButton`
- **File:** `src/features/auth/components/GoogleSignInButton.tsx`
- **Test:** `src/features/auth/components/__tests__/GoogleSignInButton.test.tsx`

## Purpose
Botão de login social que aciona o fluxo Google OAuth via NextAuth `signIn("google")`.

## Wireframe

```
┌─────────────────────────────────────────────┐
│  ┌────────────────────────────────────────┐ │
│  │  [G]  Continuar com Google             │ │
│  │  (ícone Google + texto)                │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Props Contract

| Prop | Type | Required | Default | Description | Validation |
|------|------|----------|---------|-------------|------------|
| `callbackUrl` | `string` | ❌ | `"/dashboard"` | URL de redirecionamento pós-login | — |
| `disabled` | `boolean` | ❌ | `false` | Desabilita o botão durante submissão | — |

## Behavior Specification

### Render States
1. **Default:** Botão com ícone Google (SVG) + texto "Continuar com Google"
2. **Loading:** `Loader2` spinner animado + texto "Entrando..." (substitui conteúdo)
3. **Disabled:** Botão opacity reduzido, cursor not-allowed, `aria-disabled="true"`

### Click Behavior
- Chama `signIn("google", { callbackUrl })` do `@/auth`
- Durante a chamada, entra em estado loading
- Após redirect (nunca retorna — OAuth é redirect-based)

### Formatting Rules
- Largura: `w-full` (ocupa todo o container pai)
- Altura: `h-12` (consistente com botão de credenciais)
- Border: `border border-outline` (outline sutil)
- Background: `bg-background` (tema escuro)
- Texto: `text-on-surface` font-medium
- Ícone Google: SVG inline 20x20, à esquerda do texto
- Hover: `hover:bg-accent` (leve destaque)
- Transição: `transition-colors duration-200`

### Visual Identity (VISUAL_IDENTITY.md)
- Seguir padrão de botão secundário (outline style)
- Border radius: `rounded-xl` (consistente com LoginForm)
- Font: `font-medium` (body weight)

## Accessibility
- `<button>` semântico com `type="button"`
- `aria-label="Continuar com Google"`
- `aria-disabled={disabled}` quando desabilitado
- Ícone Google tem `aria-hidden="true"` (decorativo)
- Texto visível para screen readers
- Keyboard: Tab focusável, Enter/Space aciona

## Edge Cases
- `disabled=true`: Botão renderiza mas não responde a cliques
- `callbackUrl` vazio: Usa `/dashboard` como fallback
- Erro de rede: signIn lançaria erro — capturado pelo NextAuth (redirect para error page)
- Google OAuth negado pelo usuário: NextAuth redireciona de volta ao login

## Test Matrix

| # | Scenario | Input | Expected Output |
|---|----------|-------|-----------------|
| 1 | Render default | `<GoogleSignInButton />` | Botão visível com texto "Continuar com Google" |
| 2 | Render with callbackUrl | `callbackUrl="/ conta"` | signIn called with `/conta` |
| 3 | Disabled state | `disabled={true}` | `aria-disabled="true"`, opacity reduzida |
| 4 | Click triggers signIn | User clicks button | `signIn("google", { callbackUrl })` called |
| 5 | SVG icon present | Default render | Google SVG icon in DOM |
| 6 | Keyboard navigation | Tab to button, Enter | signIn triggered |
