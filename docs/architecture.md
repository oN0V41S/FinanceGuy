# Arquitetura do Projeto – FinanceGuy

**Versão**: 1.0 | **Status**: Ativo

---

## Índice

1. [Princípios Arquiteturais](#princípios-arquiteturais)
2. [Arquitetura Atual do Projeto](#arquitetura-atual-do-projeto)
3. [Middleware / Proxy (Next.js 16+)](#middleware--proxy-nextjs-16)

---

## Princípios Arquiteturais

O FinanceGuy opera sob os princípios de **Clean Architecture**, garantindo separação clara de responsabilidades e independência entre camadas.

- **Clean Architecture**: Mantenha uma separação clara de camadas (`domain`, `use-cases`, `repositories`, `components`, `services`).
- **Tecnologias**: Next.js 16+, React 19+, TypeScript 5.9+, Prisma 5.22+, Jest 30+.
- **Consistência**: Use Prisma 5.22 e Zod para todas as interações de banco de dados e validações.
- **Princípio da Responsabilidade Única**: Cada arquivo/função deve ter uma única responsabilidade clara.

---

## Arquitetura Atual do Projeto

A aplicação segue Clean Architecture com estas camadas principais:

```
src/
├── app/
│   ├── api/                # Handlers proxy que invocam serviços das features
│   │   ├── auth/
│   │   └── transactions/
│   ├── (auth)/             # Rotas de autenticação
│   ├── dashboard/          # Rotas do dashboard
│   └── ...                 # Outras rotas
├── core/
│   └── container.ts        # Injeção de dependência (DI)
├── features/               # Domínio (Clean Architecture)
│   ├── auth/
│   │   ├── components/     # Componentes de UI
│   │   ├── actions/        # Server actions
│   │   ├── __tests__/      # Testes
│   │   ├── schemas/        # Schemas Zod
│   │   └── ...             # Services, repositories
│   └── transactions/
│       ├── components/     # Componentes de transação
│       ├── __tests__/      # Testes
│       └── ...             # Services, repositories, validations
├── lib/
│   ├── prisma.ts           # Singleton PrismaClient
│   └── auth-middleware.ts  # Segurança JWT
├── shared/                 # Tipos e utilitários globais
│   ├── hooks/              # Custom hooks
│   ├── utils.ts            # Utilitários compartilhados
│   └── types.ts            # Tipos globais
└── proxy.ts                # Proteção de rotas e injeção de x-user-id (Next.js 16+)
```

### Descrição das Camadas

- **`src/app/`**: Contém os handlers proxy da API (`api/`) que invocam os serviços das features, além das rotas de autenticação (`(auth)`) e do dashboard.
- **`src/core/container.ts`**: Centraliza a injeção de dependência (DI) da aplicação.
- **`src/features/`**: Camada de domínio da Clean Architecture. Cada feature (ex: `auth`, `transactions`) agrupa `components`, `actions` (server actions), `__tests__`, `schemas` (Zod) e seus services/repositories.
- **`src/lib/prisma.ts`**: Instância única (singleton) do `PrismaClient`.
- **`src/lib/auth-middleware.ts`**: Segurança JWT.
- **`src/shared/`**: Tipos e utilitários globais, incluindo custom hooks (`hooks/`), `utils.ts` e `types.ts`.
- **`src/proxy.ts`**: Proteção de rotas e injeção do header `x-user-id` (Next.js 16+).

---

## Middleware / Proxy (Next.js 16+)

- **Localização**: `src/proxy.ts` (NÃO use `middleware.ts` na raiz).
- **Funcionamento**: No Next.js 16+, o arquivo de interceptação de rotas deve estar em `src/proxy.ts` e ser exportado como `default`.
- **Regra**: Sempre utilize `src/proxy.ts` para proteção de rotas, redirecionamentos e injeção de headers. Nunca crie `middleware.ts` na raiz do projeto.
- **Configuração**: O `matcher` deve excluir rotas de API, arquivos estáticos e server actions:

```typescript
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)"],
};
```
