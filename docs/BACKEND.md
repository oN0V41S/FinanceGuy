# Documentação Backend – FinanceGuy

**Versão**: 1.1 | **Status**: Concluído (Auth + Transactions + Cache) | **Last Updated**: Agosto 2026

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

**Resposta 201**: Usuário criado.

---

### 2. **POST /api/auth/login** – Autenticação

**Body (JSON)**:
```json
{ "email": "e@mail.com", "password": "..." }
```

**Resposta 200**: Define cookie `auth_token` (HttpOnly).

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
