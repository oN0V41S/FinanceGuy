# ADR-001: Integração de Google OAuth com Neon PostgreSQL

> Date: 2026-06-27
> Status: Proposed

## Context

O FinanceGuy atualmente suporta apenas autenticação por credenciais (email/senha)
via NextAuth v5 beta. O banco de dados já utiliza PostgreSQL (compatível com Neon)
e o schema Prisma já contém os modelos `Account`, `Session` e `VerificationToken`
necessários para OAuth — mas nenhum provider OAuth está configurado.

**Pain points:**
- Usuários devem criar conta manualmente (friction no onboarding)
- Sem suporte a login social (Google é o provider mais usado no Brasil)
- O schema já tem suporte a OAuth mas está subutilizado

**Constraints:**
- NextAuth v5 beta.30 (compatível com Google provider)
- Prisma 5.22 com `@auth/prisma-adapter` já instalado
- Neon PostgreSQL (serverless) — compatível com `DATABASE_URL` atual
- Manter compatibilidade com fluxo de credenciais existente

## Decision

Adicionar Google OAuth como provider de autenticação paralelo ao Credentials,
mantendo ambos os fluxos funcionando simultaneamente.

### Architecture Layer Impact

- [x] **Infrastructure** — Adicionar Google provider em `src/auth.ts`
- [x] **Presentation** — Novo componente `GoogleSignInButton` + atualização do `LoginForm`
- [x] **Shared** — Tipos de sessão já suportam OAuth (via NextAuth callbacks)
- [ ] **Domain** — Sem mudanças (User, Account models já existem)
- [ ] **Use Cases** — Sem mudança no `AuthService` (login por credenciais intacto)

### Clean Architecture Boundaries

- **Camadas tocadas:** Infrastructure (auth config) + Presentation (UI components)
- **Cross-layer imports:** Nenhum novo. GoogleSignInButton usa `signIn` do `@/auth`
  (já é o padrão do projeto)
- **Novas dependências:** Nenhuma. `next-auth` já suporta Google provider nativamente

### Arquivos modificados

| Arquivo | Mudança | Motivo |
|---------|---------|--------|
| `src/auth.ts` | Adicionar `Google` provider | Core da integração |
| `src/features/auth/components/LoginForm.tsx` | Adicionar botão Google + divider | UI de login |
| `src/features/auth/components/GoogleSignInButton.tsx` | **NOVO** | Componente isolado (SRP) |
| `.env.local` | Adicionar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Config do provider |
| `src/proxy.ts` | Adicionar `/api/auth` ao matcher de exclusão | NextAuth API routes |

### Arquivos NÃO modificados

| Arquivo | Razão |
|---------|-------|
| `prisma/schema.prisma` | Modelos `Account`, `Session`, `VerificationToken` já existem e são compatíveis com PrismaAdapter |
| `src/features/auth/auth.service.ts` | Fluxo de credenciais permanece independente |
| `src/features/auth/actions/loginAction.ts` | Server action de credenciais não muda |
| `src/features/auth/IUser.repository.ts` | Interface não precisa de métodos OAuth |

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| A: Google OAuth via NextAuth provider | Integrado, PrismaAdapter compatível, sem novas deps | Depende de Google Cloud Console setup | **Selected** |
| B: NextAuth + custom OAuth flow | Controle total sobre token exchange | Mais código, mais manutenção, quebra PrismaAdapter | Rejected |
| C: Clerk/Auth0 como provider externo | Zero config de OAuth | Nova dependência, custo mensal, lock-in | Rejected |
| D: Apenas atualizar schema para suportar OAuth futuro | Schema pronto | Nenhuma funcionalidade entregue | Rejected |

## Consequences

### Positive
- Onboarding reduzido (1 clique para criar conta via Google)
- PrismaAdapter gerencia automaticamente Account/Session/VerificationToken
- Credenciais continuam funcionando (usuários existentes não são afetados)
- Schema Prisma já é 100% compatível — zero migrations

### Negative
- Dependência de Google Cloud Console (OAuth consent screen, credentials)
- Usuários Google não têm `password` no banco (precisa tratar no `AuthService`)
- Fluxo de registro por credenciais continua necessário para não-Google users

### Risks
- **Google OAuth callback URL deve ser exato** — erros de configuração causam redirect loops
- **Neon connection pooling** — PrismaAdapter pode ter issues com connection limits em Neon serverless (mitigar com `pgbouncer` ou connection limit no schema)

## Test Implications

- **Novos testes necessários:**
  - `GoogleSignInButton.test.tsx` — renderiza, chama signIn, estados de loading
  - `LoginForm.test.tsx` — atualizar para incluir botão Google no DOM
  - `auth.test.ts` (config) — verificar que Google provider está configurado
- **Testes existentes afetados:**
  - `login.test.tsx` — pode precisar de mock para Google button
- **Integration points:**
  - Google OAuth callback → PrismaAdapter → Account/User creation
  - Session callback deve incluir dados do Google user
