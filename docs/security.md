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
3. **Prompt injection**: títulos de transações, nomes de metas/investimentos e a pergunta são texto digitado pelo usuário e, portanto, superfície de injeção. Mitigações em camadas: `sanitizeLabel()` (remove controles/quebras, neutraliza `<` e `>`, colapsa espaços, trunca em 60); dados e pergunta em blocos delimitados (`<dados_financeiros>`, `<pergunta>`); prompt de sistema instrui a tratar esse conteúdo como dado, nunca instrução; o modelo **não tem tools** e só vê os dados do próprio usuário. A resposta é renderizada como texto puro (nunca `dangerouslySetInnerHTML`).
4. **Isolamento por usuário**: `userId` vem só do header `x-user-id` (nunca do corpo); `AiService.ask` lança antes de qualquer repositório se `userId` for vazio (um `userId` vazio em `getAll` retornaria dados de todos os usuários).
5. **Segredos e logs**: `GEMINI_API_KEY` apenas em `.env.local`/variáveis da Vercel; a chave é lida de forma *lazy* no servidor e nunca chega ao bundle do cliente. A chave anterior foi exposta em commit antigo e **deve ser rotacionada**. Logs registram somente `{name, status}` de erros e `{latencyMs, tokens, stopReason}` — nunca prompt, `message` do SDK, chave ou valores financeiros. Definir teto de gasto na chave.
6. **Abuso e custo**: rate limit por `userId` (minuto e dia), pergunta ≤ 500 caracteres, corpo ≤ 4 KB, timeout configurável e sem chamada ao LLM quando o usuário não tem dados.

---

## Referências

- [docs/BACKEND.md](docs/BACKEND.md) — Documentação completa da API e estratégia de segurança
- [docs/TECHNICAL_DOCS.md](docs/TECHNICAL_DOCS.md) — Decisões arquiteturais e checklist de segurança
- [docs/auth.md](docs/auth.md) — Autenticação (NextAuth v5)
