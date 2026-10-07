# Documentação Backend – FinanceGuy

**Versão**: 1.2 | **Status**: Concluído (Auth + Transactions + Cache) | **Last Updated**: Setembro 2026

## Arquitetura da API

A API utiliza o padrão **Next.js Route Handler Proxy** em `src/app/api/` que delega as requisições para a lógica de negócio nas **Features** (`src/features/`).

- **Segurança**: O `src/middleware.ts` intercepta requisições protegidas, valida o token (JWT/Cookie), e injeta o `x-user-id` no cabeçalho.
- **Injeção de Dependência**: O `src/core/container.ts` gerencia as instâncias de serviços e repositórios.

---

## Endpoints de Autenticação

### 1. **POST /api/auth/register** – Registro de Usuário

**Body (JSON)**:
```json
{ "name": "Nome", "nickname": "nick", "email": "e@mail.com", "password": "..." }
```

**Resposta 201**: Usuário criado. Após o registro, um e-mail de verificação é enviado automaticamente.

---

### 2. **POST /api/auth/login** – Autenticação

**Body (JSON)**:
```json
{ "email": "e@mail.com", "password": "..." }
```

**Resposta 200**: Define cookie `auth_token` (HttpOnly).

---

### 3. **POST /api/auth/magic-link** – Login por E-mail (Magic Link)

Fluxo de autenticação sem senha via Resend (NextAuth v5 provider `resend`).

**Body (JSON)**:
```json
{ "email": "e@mail.com" }
```

**Resposta 200**: Link mágico enviado para o e-mail. O usuário recebe um e-mail com link de acesso.

**Nota**: A ação server-side `signIn("resend", { email, redirect: false })` é invocada a partir do componente `src/features/auth/components/MagicLinkLogin.tsx`.

---

### 4. **POST /api/auth/forgot-password** – Solicitar Redefinição de Senha

Server Action: `forgotPasswordAction` (`src/app/(auth)/forgot-password/actions.ts`).

**Body (FormData)**:
```
email: "e@mail.com"
```

**Comportamento**:
- Gera um token de reset via `PasswordResetService.generateResetToken(email)`.
- Token armazenado no Prisma `VerificationToken` com `identifier: "reset:<email>"`, expiração de **1 hora**.
- Envia e-mail com link de reset via `sendEmail` (Resend).
- **Mensagem genérica**: nunca revela se o e-mail existe no sistema.

**Resposta**: `{ success: true }` ou `{ error: "..." }` com mensagem genérica.

---

### 5. **POST /api/auth/reset-password** – Redefinir Senha

Server Action: `resetPasswordAction` (`src/app/(auth)/reset-password/actions.ts`).

**Body (FormData)**:
```
token: "<token_do_reset>"
password: "<nova_senha>"
confirmPassword: "<confirmar_senha>"
```

**Comportamento**:
- `PasswordResetService.validateResetToken(token)` valida o token (existência, expiração, prefixo `reset:`).
- `PasswordResetService.consumeResetToken(token, newPassword)` atualiza a senha no Prisma User e **deleta o token** (uso único).
- A nova senha deve seguir a política `passwordSchema` (mínimo 8 chars, maiúscula, minúscula, número, símbolo).

**Resposta**: `{ success: true }` ou `{ error: "..." }`.

---

### 6. **GET /api/auth/verify-email** – Verificação de E-mail

Fluxo disparado após cadastro. O link de verificação contém um token com `identifier: "verify:<email>"`.

**Comportamento**:
- `EmailVerificationService.consumeVerificationToken(token)` marca `emailVerified = NOW()` no Prisma User e deleta o token.

---

## Serviços de Autenticação

| Serviço | Caminho | Responsabilidade |
|---------|---------|-----------------|
| `PasswordResetService` | `src/features/auth/services/password-reset.service.ts` | Geração, validação e consumo de tokens de reset de senha |
| `EmailVerificationService` | `src/features/auth/services/email-verification.service.ts` | Geração, validação e consumo de tokens de verificação de e-mail |
| `sendEmail` | `src/lib/email/resend-client.ts` | Envio de e-mails transacionais via API Resend |

---

## Endpoints de Transações (`/api/transactions`)

### 1. **GET /api/transactions** – Listar Transações
Requisições autenticadas (Header `x-user-id` injetado pelo middleware).

**Query Parameters**: `type`, `category`, `startDate`, `endDate`.

**Resposta 200** (cache server-side — Issue #9):
```json
{
  "data": [ { "id": "t1", "type": "expense", "description": "...", "value": 1500, "date": "2026-08-01", "paid": false } ],
  "summary": { "income": 5000, "expense": 1200, "balance": 3800 },
  "total": 1
}
```

**Headers de resposta**:
| Header | Valor | Descrição |
|--------|-------|-----------|
| `Cache-Control` | `private, max-age=300` | Cache privado (por usuário) com TTL padrão de 300s |
| `X-Cache` | `HIT` / `MISS` | Indica se a resposta veio do cache Redis/Upstash |

---

### 2. **POST /api/transactions** – Criar Transação
**Body (JSON)**:
```json
{ "type": "expense", "value": 1500, "date": "...", "description": "...", "category": "..." }
```

---

### 3. **PUT /api/transactions/[id]** – Atualizar
---

### 4. **DELETE /api/transactions/[id]** – Deletar
---

### 5. **GET /api/transactions/opening-balance** – Saldo inicial do período (issue #30)
Saldo (receitas − despesas, incluindo pendentes) das transações **estritamente anteriores** a `before`. Alimenta o "Saldo previsto" por dia na lista.

**Query**: `before` (obrigatório, `YYYY-MM-DD` real); opcionais `type` (`income|expense`), `category`, `responsible`, `search`, `paid` (`true|false`) — mesmos filtros da lista.
**Resposta**: `{ "data": number }` · `Cache-Control: private, max-age=300` · `X-Cache: HIT|MISS`.
**Erros**: `401` sem `x-user-id`; `400` parâmetros inválidos (Zod); `500` genérico.
**Segurança**: `userId` vem só do header `x-user-id` (nunca da query). Soma feita no banco (`groupBy` por `type`) e em centavos no cálculo diário.
**Cache**: chave `transactions:{userId}:opening:{md5(filtros)}` — invalidada junto com as demais por `delByPattern('transactions:{userId}:*')`.
**Front**: `useOpeningBalance` (2ª quinzena usa `before` = dia 16; mês/1ª quinzena = dia 01) + `computeRunningBalances` (`features/transactions/utils/runningBalance.ts`) → `CardTransaction` (`openingBalance`, `isBalanceLoading`). Falha no endpoint não derruba a lista: só o total do dia é exibido.
---

## Endpoints de Investimentos — ativos de mercado (issue #34 · FING-22)

Requisições autenticadas (`x-user-id` do `proxy.ts`). Handlers em `src/features/investments/api/**`, re-exportados em `src/app/api/investments/**`. `GET/POST /api/investments` e `PUT/DELETE /api/investments/[id]` seguem como antes; o POST aceita ativo de mercado (`ticker`, `market`, `purchaseDate`, `unitPrice`, `shares`) e calcula o valor investido.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/investments/quotes?ticker=&market=` | Cotação atual (brapi.dev → Yahoo Finance p/ BR; Yahoo p/ demais) |
| GET | `/api/investments/portfolio` | Investimentos enriquecidos com cotação, valor atual e rentabilidade |
| GET | `/api/investments/history` | Histórico (`{ entries, summaries }`) de compras e resgates |
| POST | `/api/investments/[id]/redeem/preview` | Simula resgate (imposto **estimado**, `isEstimate: true`) |
| POST | `/api/investments/[id]/redeem` | Confirma resgate (atômico) |

**Resgate** — body `{ quantity, unitPrice?, taxRate (0–100), date?, note? }`. Imposto = max(lucro, 0) × alíquota informada pelo usuário; custo proporcional em resgate parcial. Em uma `prisma.$transaction` atualiza `shares`/`value`/`status` e grava a linha em `investment_transactions`. **Não cria `Transaction`**: o histórico é a fonte única de verdade (snapshot imutável, `onDelete: SetNull`, escopo por `userId`, pronto para RAG).
**Cache de cotações**: 15 min fresco; até 7 dias como "última conhecida" (`stale: true`) quando os provedores caem.
**Erros**: `400` Zod · `401` sem usuário · `404` não encontrado · `422` regra de negócio (ex.: quantidade acima da posição) · `503` cotação indisponível · `500` genérico.
---

## Cache Server-side (Redis/Upstash)

- **Singleton**: `src/lib/cache.ts` segue o padrão do `src/lib/prisma.ts` — uma única instância por processo.
- **Fallback NOOP**: sem `UPSTASH_REDIS_REST_URL`, o cache vira NOOP (graceful degradation em dev/CI) — o cliente Redis **não** é instanciado.
- **Chave**: `transactions:{userId}:{md5(JSON.stringify(filters sem userId))}` — filtros fora do hash, userId como namespace.
- **TTL**: `CACHE_TTL` (env) com default de **300s**; `Cache-Control: private, max-age=300` na resposta.
- **Invalidação**: toda mutation (`create`, `update`, `delete`, `update/delete future`) executa `delByPattern('transactions:{userId}:*')`.
- **Contrato**: `ICacheRepository` em `src/shared/interfaces/ICacheRepository.ts`; `getAllTransactions` e `getFinancialSummary` retornam `{ data, fromCache }` e usam chaves **DISTINTAS** (I01): a lista usa `transactions:{userId}:{hash}` e o summary usa `transactions:{userId}:{hash}:summary`. A separação evita contaminação cruzada entre payloads de tipos diferentes (lista vs. summary) na mesma chave — compartilhar a chave gerava 100% MISS na rota real (ping-pong de reads/writes a cada GET). A invalidação por `delByPattern('transactions:{userId}:*')` continua apagando ambas em qualquer mutation.

## Estratégia de Segurança

1. **Middleware**: Valida `auth_token` e injeta `x-user-id` em todas as rotas de API.
2. **Repository Isolation**: Todos os métodos de repositório de transação filtram dados por `userId`.
3. **Singleton Prisma**: `src/lib/prisma.ts` garante uma única conexão ao banco.
4. **Rate Limiting**: **Ausente** nos endpoints de autenticação (forgot-password, reset-password, magic link). Risco conhecido documentado na auditoria de segurança — ver [docs/security.md](docs/security.md).
5. **Proteção contra Enumeração**: O fluxo de forgot-password sempre retorna mensagens genéricas, sem revelar existência de e-mails.
6. **Tokens de Uso Único**: Todos os tokens de reset/verificação são deletados após o consumo ou após expiração.
