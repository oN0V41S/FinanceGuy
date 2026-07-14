# Contract: src/auth.ts (Modified)

## Identity
- **Name:** `NextAuth Configuration`
- **File:** `src/auth.ts`
- **Test:** `src/features/auth/__tests__/auth.config.test.ts` (novo)

## Purpose
Configuração central do NextAuth v5 com suporte dual: Google OAuth + Credentials.

## Configuration Contract

### Providers

| Provider | Type | Status | Config |
|----------|------|--------|--------|
| Google | OAuth 2.0 | **ADICIONADO** | `clientId: env.GOOGLE_CLIENT_ID`, `clientSecret: env.GOOGLE_CLIENT_SECRET` |
| Credentials | Custom | MANTIDO | Schema validation via `LoginSchema`, bcrypt via `AuthService` |

### Google Provider Config

```typescript
Google({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
})
```

**Sem customizações extras** — PrismaAdapter gerencia Account/Session automaticamente.

### Callbacks (Updated)

| Callback | Mudança | Motivo |
|----------|---------|--------|
| `jwt` | Adicionar `picture` do Google ao token | Exibir avatar no dashboard |
| `session` | Adicionar `picture` à session.user | Disponibilizar avatar no client |

### Novo callback `signIn` (Opcional mas recomendado)

Bloquear users de domínio específico? **Não** — manter aberto para qualquer conta Google.

### Environment Variables (Required)

```env
GOOGLE_CLIENT_ID=<do Google Cloud Console>
GOOGLE_CLIENT_SECRET=<do Google Cloud Console>
```

**Nota:** `AUTH_SECRET` e `DATABASE_URL` já existem.

## Test Matrix

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Google provider configured | `auth.config.providers` includes Google |
| 2 | Credentials provider preserved | `auth.config.providers` includes Credentials |
| 3 | JWT callback includes picture | Token has `picture` field when Google user |
| 4 | Session callback includes picture | Session user has `picture` field |
| 5 | PrismaAdapter connected | Adapter is `PrismaAdapter(prisma)` |
