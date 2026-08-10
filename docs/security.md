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

## Referências

- [docs/BACKEND.md](docs/BACKEND.md) — Documentação completa da API e estratégia de segurança
- [docs/TECHNICAL_DOCS.md](docs/TECHNICAL_DOCS.md) — Decisões arquiteturais e checklist de segurança
- [docs/auth.md](docs/auth.md) — Autenticação (NextAuth v5)
