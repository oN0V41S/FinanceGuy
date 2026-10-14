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

## Endpoints de IA (`/api/ai`) — FING-7

| Método | Rota | Status |
|--------|------|--------|
| POST | `/api/ai/ask` | 🔄 Em implementação (assistente de IA, provedor Google Gemini) |

### 1. **POST /api/ai/ask** – Perguntar ao assistente

Responde uma pergunta em linguagem natural com base em um **resumo** dos dados financeiros do usuário (mês atual, últimos 6 meses, transações recentes, metas e investimentos). O provedor é Gemini (diverge da spec original do Notion, que citava Claude). Código: `src/features/ai/` (handler em `src/features/ai/api/route.ts`, re-exportado em `src/app/api/ai/ask/route.ts` com `runtime = 'nodejs'` e `maxDuration = 60`).

**Autenticação**: `x-user-id` injetado pelo proxy. O `userId` vem **somente** do header; chaves extras no corpo (ex.: `userId`) são descartadas.

**Body (JSON)**:
```json
{ "question": "Quanto gastei com Alimentação este mês?" }
```
`question`: string, `trim`, 1–500 caracteres. Corpo maior que 4 KB é rejeitado.

**Resposta 200** (`Cache-Control: no-store`):
```json
{ "answer": "Você gastou R$ 820,00 em Alimentação em outubro...", "truncated": false }
```
`truncated: true` indica que a resposta foi encurtada pelo limite de tokens (a UI avisa o usuário).

**Ordem do handler**: 401 → leitura do corpo (limite 4 KB) + `JSON.parse` → `AskSchema` → rate limit (requisição inválida **não** consome cota) → `AiService.ask` → 200 ou erro mapeado.

**Erros** (corpo `{ "error": "<mensagem>" }`; mensagens amigáveis, nunca vazam detalhes internos):

| Condição | HTTP | Mensagem |
|----------|------|----------|
| Sem `x-user-id` | 401 | Usuário não identificado |
| JSON inválido / corpo grande | 400 | Corpo da requisição inválido. |
| Pergunta vazia / ausente / não-string | 400 | Digite uma pergunta |
| Pergunta > 500 caracteres | 400 | A pergunta deve ter no máximo 500 caracteres |
| Limite por minuto | 429 + `Retry-After` | Você fez muitas perguntas em pouco tempo. Tente novamente em alguns segundos. |
| Limite diário | 429 + `Retry-After` | Você atingiu o limite diário de perguntas do assistente. Volte amanhã. |
| Sem chave / modelo ou chave inválidos (upstream 400-404) | 503 | O assistente está indisponível no momento. |
| Upstream 429/503 | 503 + `Retry-After: 30` | O assistente está com alta demanda. Tente novamente em instantes. |
| Falha de conexão | 503 | Não foi possível falar com o assistente agora. Tente novamente. |
| Timeout | 504 | O assistente demorou para responder. Tente novamente. |
| Resposta inesperada / vazia | 502 | Não consegui concluir a resposta. Tente uma pergunta mais específica. |
| Bloqueio de segurança do provedor | 422 | Não consegui responder a essa pergunta. Tente reformulá-la. |
| Falha ao carregar dados financeiros | 500 | Não foi possível carregar seus dados financeiros agora. |
| Erro desconhecido | 500 | Erro interno do servidor |

**Rate limit**: por `userId`, janela fixa por minuto (`AI_RATE_LIMIT_PER_MINUTE`/`AI_RATE_LIMIT_WINDOW_SECONDS`, default 10/60s) e por dia em BRT (`AI_RATE_LIMIT_PER_DAY`, default 50; `Retry-After` = segundos até a meia-noite BRT). Upstash (INCR+EXPIRE) quando configurado; senão memória (por instância). Falha do Redis cai para memória (*fail-soft*).

**Comportamento especial**: sem transações, metas ou investimentos, a resposta é uma mensagem fixa orientando o cadastro, **sem chamar o LLM**.

**Segurança / privacidade**: apenas o DTO whitelist é enviado ao Google (sem ids, e-mail, senha, tokens, `description` ou `responsible`; títulos de transações sanitizados). Logs registram só `{name, status}` de erros e `{latencyMs, tokens, stopReason}`. Ver [docs/security.md](security.md).

**Cache**: as transações vêm do serviço com cache de até 5 min (`transactions:{userId}:*`), portanto a resposta pode ter esse atraso.

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
