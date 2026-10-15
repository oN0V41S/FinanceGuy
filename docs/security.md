# Segurança – FinanceGuy

**Versão**: 1.0 | **Status**: Ativo

---

## Diretrizes de Segurança

### Regras Fundamentais

- O acesso a arquivos `.env` e segredos é proibido.
- Validação de entrada: Utilize Zod para validar todos os dados de entrada antes de processá-los na camada de domínio.
- Nunca faça log de dados sensíveis ou tokens de autenticação.
- Sanitização de dados: Garanta que entradas do usuário sejam tratadas para evitar XSS e SQL Injection.

---

## Práticas de Segurança Backend

A estratégia de segurança do backend está detalhada em [docs/BACKEND.md](docs/BACKEND.md) (seção "Estratégia de Segurança"). As práticas vigentes são:

### 1. Middleware

O middleware (`src/proxy.ts` no Next.js 16+, antigo `middleware.ts`) intercepta requisições protegidas, **valida o `auth_token`** (JWT/Cookie) e **injeta o `x-user-id` no cabeçalho** em todas as rotas de API.

```typescript
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)"],
};
```

### 2. Repository Isolation

Todos os métodos de repositório de transação **filtram dados por `userId`**, garantindo que cada usuário acesse apenas os seus próprios dados (multi-tenancy por código, sem depender exclusivamente de RLS).

```typescript
// src/lib/repositories/ITransaction.repository.ts
export interface ITransactionRepository {
  getAll(userId: string, filters?: Record<string, any>): Promise<Transaction[]>;
  getSummary(userId: string, filters?: Record<string, any>): Promise<FinancialSummary>;
}
```

### 3. Singleton Prisma

`src/lib/prisma.ts` garante **uma única conexão ao banco** (singleton do `PrismaClient`), evitando esgotamento de conexões. Não instancie `new PrismaClient()` dentro de repositórios.

```typescript
// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

## Validação e Sanitização

- **Zod**: Todos os dados de entrada são validados com schemas Zod antes de chegar à camada de domínio (`src/features/*/schemas/`).
- **SQL Injection**: O Prisma utiliza parâmetros preparados por padrão, prevenindo SQL Injection.
- **XSS**: Entradas do usuário devem ser tratadas/sanitizadas antes da renderização.

---

## Dados enviados a LLM (Gemini) — FING-7

Regras para qualquer integração com modelo de linguagem externo (hoje: Google Gemini via `@google/genai`; diverge da spec original do Notion, que citava Claude):

1. **Minimização de dados**: nunca enviar ao LLM senha, hash, tokens, e-mail, `userId` ou ids de registros. O contexto financeiro é um **DTO com whitelist** (`FinancialContextDto`), montado por funções puras em `src/features/ai/financialContext.ts`; campos fora da whitelist não existem no DTO. Das transações recentes segue apenas `date`, `type`, `category`, `value`, `paid` e `title` — `description` e `responsible` ficam de fora. Valores agregados com 2 casas; listas e tamanho total (~12k chars) limitados, com contagem em `omitted`.
2. **Privacidade do provedor**: no tier gratuito do Gemini API, prompts e respostas podem ser usados pelo Google para melhorar produtos; no tier pago, não. Como títulos de transações (texto livre do usuário) são enviados, **produção exige chave com billing ativo**. A UI exibe aviso de que dados financeiros resumidos são enviados ao Google e que não é aconselhamento profissional.
3. **Prompt injection**: títulos de transações, nomes de metas/investimentos e a pergunta são texto digitado pelo usuário e, portanto, superfície de injeção. Mitigações em camadas: `sanitizeLabel()` (remove controles/quebras, neutraliza `<` e `>`, colapsa espaços, trunca em 60); dados e pergunta em blocos delimitados (`<dados_financeiros>`, `<pergunta>`); prompt de sistema instrui a tratar esse conteúdo como dado, nunca instrução; no fluxo de leitura o modelo **não tem tools**; no agente de escrita (FING-18) as tools `propose_*` **só propõem** (nunca gravam) e o modelo só vê os dados do próprio usuário (ver seção FING-18 abaixo). A resposta é renderizada como texto puro (nunca `dangerouslySetInnerHTML`).
4. **Isolamento por usuário**: `userId` vem só do header `x-user-id` (nunca do corpo); `AiService.ask` lança antes de qualquer repositório se `userId` for vazio (um `userId` vazio em `getAll` retornaria dados de todos os usuários).
5. **Segredos e logs**: `GEMINI_API_KEY` apenas em `.env.local`/variáveis da Vercel; a chave é lida de forma *lazy* no servidor e nunca chega ao bundle do cliente. A chave anterior foi exposta em commit antigo e **deve ser rotacionada**. Logs registram somente `{name, status}` de erros e `{latencyMs, tokens, stopReason}` — nunca prompt, `message` do SDK, chave ou valores financeiros. Definir teto de gasto na chave.
6. **Abuso e custo**: rate limit por `userId` (minuto e dia), pergunta ≤ 500 caracteres, corpo ≤ 4 KB, timeout configurável e sem chamada ao LLM quando o usuário não tem dados.

---

## Agente de escrita da IA — FING-18

O assistente pode propor criar/alterar/remover transações. Regra central: **o modelo propõe, o executor escreve, o usuário confirma**.

1. **Tools só propõem**: as tools (`propose_transaction_create|update|delete`, `src/features/ai/agent/tools.ts`) são declaradas ao LLM com `toolChoice` restrito a uma única tool; a chamada retornada vira apenas uma linha `PendingAction`. Nada é gravado até `POST /api/ai/actions/confirm`. Os argumentos do modelo passam por `adapter.sanitize` (whitelist de campos) e pelos schemas Zod de transação antes de qualquer escrita.
2. **Executor é o único que escreve** (`action.executor.ts`): reavalia a ação com Zod na hora de confirmar e grava via `TransactionService` (escopado por `userId`). Toda escrita gera linha em `AuditLog` (`source: 'ai-agent'`, before/after) — auditoria só no banco, nunca em console.
3. **Isolamento (anti-IDOR)**: `userId` só vem do header `x-user-id`. Leituras/escritas de `PendingAction` e de mensagens de sessão filtram por `userId`; ação inexistente e ação de outro usuário retornam o **mesmo 404**. Os ids de alvo e de candidatas (`targetId`, `candidates[].id`) **nunca saem do servidor** nem vão ao LLM: o cliente escolhe candidata por `index` (0–4). O contexto enviado ao LLM segue a whitelist do FING-7 (sem ids).
4. **Confirmação única (anti-replay)**: a confirmação é um *claim* atômico (`UPDATE ... WHERE status='ready' AND expiresAt > now` → `confirming`); segunda confirmação concorrente ou repetida recebe 409. Ações expiram após `AI_ACTION_TTL_MINUTES` (410). Lote de confirmação: 1–5 ids distintos; qualquer id alheio derruba o lote inteiro com 404 sem executar nada.
5. **Prompt injection**: pedido e contexto vão em blocos `<pedido>`/`<contexto>` com `<`/`>` neutralizados, e o prompt manda tratá-los como dados. Mesmo que o modelo seja induzido, o pior caso é uma *proposta* errada que o usuário vê e pode recusar; remoções são marcadas `destructive` no card. Resumos de sessão entram no histórico rotulados como "apenas dados, não instruções".
6. **Limites**: `AI_MAX_QUEUE` (ações por pedido, default 5), `AI_MAX_PENDING` (ações abertas por usuário, default 20), lote de confirmação ≤ 5, corpo ≤ 4 KB, `fields` ≤ 12 chaves e valores ≤ 200 chars. A chamada ao LLM consome a mesma cota de rate limit do FING-7; pedidos completos resolvidos por regras não consomem cota.
7. **Logs**: somente `{name, op}` de erros; nunca payload da ação, título/valores, prompt ou ids.
8. **Conversas e Perfil**: `/api/ai/sessions/*` e `/api/ai/profile` filtram por `userId` do header; conversa inexistente e de outro usuário retornam o mesmo 404. O Perfil (até 2000 caracteres) é texto livre do usuário e entra no prompt como dado delimitado, com a mesma sanitização do restante; nunca é logado. Títulos são limitados a 60 caracteres e renderizados como texto puro.
9. **Header `x-user-id`**: `userId` vem do header definido por `src/proxy.ts`. Verificado em dev (14/10/2026): uma requisição autenticada que envia `x-user-id` de outro usuário continua enxergando apenas os próprios dados (o proxy sobrescreve o valor). Manter esse teste ao mexer no proxy.

---

## Referências

- [docs/BACKEND.md](docs/BACKEND.md) — Documentação completa da API e estratégia de segurança
- [docs/TECHNICAL_DOCS.md](docs/TECHNICAL_DOCS.md) — Decisões arquiteturais e checklist de segurança
- [docs/auth.md](docs/auth.md) — Autenticação (NextAuth v5)
