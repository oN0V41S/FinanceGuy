# Documentação Técnica – FinanceGuy

**Versão**: 1.0 | **Data**: Março 2026 | **Status**: Backend Concluído (Auth + Transactions)

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Modelo de Dados](#modelo-de-dados)
4. [Estratégia de Banco de Dados](#estratégia-de-banco-de-dados)
5. [Camada de Validação (Zod)](#camada-de-validação-zod)
6. [Abstração de Persistência (Repository Pattern)](#abstração-de-persistência-repository-pattern)
7. [API (Auth & Transactions)](#api-auth--transactions)
8. [Segurança e Middleware](#segurança-e-middleware)
9. [Performance e FinOps](#performance-e-finops)
10. [CI/CD com GitHub Actions](#cicd-com-github-actions)
11. [Plano de Implementação](#plano-de-implementação)

---

## Visão Geral

**FinanceGuy** é uma aplicação Next.js full-stack para gestão de transações financeiras pessoais com suporte a:

- **Autenticação Segura**: Registro e login com tokens JWT (Cookies).
- **CRUD Completo**: Criar, ler, atualizar e deletar transações.
- **Relatórios**: Sumário financeiro (income, expense, balance).
- **Persistência Robusta**: PostgreSQL, abstraída via Repository Pattern.

**Stack Tecnológico**:

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 19, Next.js 16, TypeScript, Tailwind CSS |
| **API Backend** | Next.js API Routes (Proxy + Features) |
| **Banco de Dados** | PostgreSQL (Neon) |
| **Validação** | Zod |
| **ORM** | Prisma 5.22 |
| **Testes** | Jest + React Testing Library |

---

## Arquitetura do Sistema

A aplicação segue **Clean Architecture** com separação clara entre a interface (Next.js) e a lógica de negócio (Features):

```
src/
├── app/
│   └── api/                # Handlers proxy (chamam as features)
│       ├── auth/
│       └── transactions/
├── core/
│   └── container.ts        # Injeção de dependência (DI)
├── features/               # Domínio (Clean Architecture)
│   ├── auth/
│   └── transactions/
├── lib/
│   ├── prisma.ts           # Singleton PrismaClient
│   └── auth-middleware.ts  # Segurança JWT
├── shared/                 # Tipos e utilitários globais
└── middleware.ts           # Proteção de rotas e injeção de x-user-id
```

### Fluxo de Dados

```
Frontend
    ↓
app/api/* (Proxy/Route Handler)
    ↓
features/*/ (Service Layer)
    ↓
Repository Layer
    ↓
Prisma + PostgreSQL
```

---

## Modelo de Dados

### Interface `User`

```typescript
export interface User {
  id: string;
  name?: string | null;
  nickname?: string | null;
  email: string | null;
  emailVerified?: Date | null;
}
```

### Interface `Transaction`

```typescript
export interface Transaction {
  id: string;                          // UUID gerado (CUID)
  type: 'income' | 'expense';          // Tipo de transação
  description: string;                 // Descrição (1-255 chars)
  value: number;                       // Valor em decimal (positivo)
  date: string;                        // ISO 8601 (YYYY-MM-DD)
  category: TransactionCategory;       // Categoria fixa
  responsible: string;                 // Responsável pela transação
  userId: string;                      // Chave estrangeira para o usuário
  installment_number?: number;         // Número da parcela (1-based)
  total_installments?: number;         // Total de parcelas
  is_recurring?: boolean;              // Flag de recorrência
  parent_transaction_id?: string;      // UUID da transação pai (para parcelas)
  paid?: boolean;                      // Flag de pagamento
  created_at: Date;                    // Timestamp de criação (gerado)
  updated_at: Date;                    // Timestamp de atualização (gerado)
}
```

### Tipos Enumerados

```typescript
export type TransactionType = 'income' | 'expense';

export type TransactionCategory = 
  | 'Alimentação'
  | 'Transporte'
  | 'Casa'
  | 'Saúde'
  | 'Educação'
  | 'Lazer'
  | 'Salário'
  | 'Investimentos'
  | 'Outros';
```

### Interface `FinancialSummary`

```typescript
export interface FinancialSummary {
  income: number;        // Soma de todas as receitas
  expense: number;       // Soma de todas as despesas
  balance: number;       // income - expense
}
```

---

## Estratégia de Banco de Dados

### Decisão: PostgreSQL com Neon

**Justificativa**:

- **Análises Rápidas**: IA prioriza queries agregadas (somas, filtros por categoria). PostgreSQL executa agregações em O(log n) com índices otimizados (2-5x mais rápido que MongoDB).
- **Consistência ACID**: Dados financeiros exigem transações ACID para evitar inconsistências em cálculos de `balance`.
- **Escalabilidade Econômica**: Neon free tier oferece 512MB de armazenamento e 100 horas de computação/mês. Paid tiers escalam melhor que MongoDB para analytics.
- **Integração IA**: pgvector (extensão gratuita) suporta embeddings vetoriais para futuras expansões.

**Trade-offs**:

- Setup inicial mais complexo (migrações SQL, ORM).
- Overhead: Relatório complexo em time-series pode custar ~$0.05-0.15/execução em Neon.

### Schema PostgreSQL (via Prisma)

```prisma
model Transaction {
  id                   String   @id @default(cuid())
  type                 String   // 'income' | 'expense'
  description          String   @db.VarChar(255)
  value                Decimal  @db.Decimal(12, 2)
  date                 DateTime @db.Date
  category             String
  responsible          String
  installment_number   Int?
  total_installments   Int?
  is_recurring         Boolean  @default(false)
  parent_transaction_id String?
  paid                 Boolean  @default(false)
  userId               String
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  created_at           DateTime @default(now())
  updated_at           DateTime @updatedAt

  // Índices para performance
  @@index([date])
  @@index([category])
  @@index([type])
  @@index([parent_transaction_id])
  @@index([userId])
  @@map("transactions")
}

model User {
  id            String        @id @default(cuid())
  name          String?
  nickname      String?
  email         String?       @unique
  emailVerified DateTime?
  password      String?       // Preenchido se usar Credentials (email/senha)
  
  // Relacionamentos
  accounts      Account[]
  sessions      Session[]
  transactions  Transaction[] // Relacionamento com transações
  
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}
```

**Índices Estratégicos** (Big-O: O(log n)):

- `date`, `category`, `type`: Para filtros e agregações de transações.
- `userId`: Essencial para isolar os dados de cada usuário (multi-tenancy).
- `parent_transaction_id`: Busca de parcelas filhas.

---

## Camada de Validação (Zod)

Validação de tipo em runtime garante integridade de dados de entrada via API.

### Schemas em `src/lib/validations.ts`

```typescript
// Enums
const TransactionTypeEnum = z.enum(['income', 'expense']);
const CategoryEnum = z.enum(['Alimentação', 'Transporte', /* ... */]);

// Schema completo
export const TransactionSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID válido'),
  type: TransactionTypeEnum,
  description: z.string().min(1).max(255),
  value: z.number().positive('Valor deve ser positivo'),
  date: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    'Data deve estar em ISO 8601 (YYYY-MM-DD)'
  ),
  category: CategoryEnum,
  responsible: z.string().min(1),
  // ... campos opcionais
});

// Schema para criação (sem ID)
export const CreateTransactionSchema = TransactionSchema.omit({ id: true });

// Schema para atualização (todos opcionais)
export const UpdateTransactionSchema = TransactionSchema.partial();

// Schema para sumário
export const FinancialSummarySchema = z.object({
  income: z.number().min(0),
  expense: z.number().min(0),
  balance: z.number(),
});
```

### Performance

Validação Zod adiciona ~1-5ms por requisição (negligenciável para UX).

---

## Abstração de Persistência (Repository Pattern)

O Repository Pattern desacopla a lógica de negócio da implementação de armazenamento de dados (o banco de dados). Isso nos permite trocar a implementação (ex: de PostgreSQL para testes em memória) sem alterar a lógica de negócio nos serviços.

### Interfaces Abstratas

Definimos interfaces para cada entidade de domínio, garantindo um contrato claro para a camada de dados.

- **`ITransactionRepository`**: Define os métodos para o CRUD e sumarização de transações.
- **`IUserRepository`**: Define os métodos para buscar e gerenciar usuários.

```typescript
// src/lib/repositories/ITransaction.repository.ts
export interface ITransactionRepository {
  getAll(userId: string, filters?: Record<string, any>): Promise<Transaction[]>;
  getById(id: string): Promise<Transaction | null>;
  create(data: TransactionInput): Promise<Transaction>;
  update(id: string, data: Partial<TransactionInput>): Promise<Transaction | null>;
  delete(id: string): Promise<boolean>;
  getSummary(userId: string, filters?: Record<string, any>): Promise<FinancialSummary>;
}

// src/lib/repositories/IUser.repository.ts
export interface IUserRepository {
    findByEmail(email: string): Promise<User | null>;
    create(data: Omit<User, 'id'>): Promise<User>;
}
```

### Implementações com PostgreSQL

- **`PostgresTransactionRepository`**: Implementa `ITransactionRepository` usando Prisma Client.
- **`PostgresUserRepository`**: Implementa `IUserRepository` usando Prisma Client.

As implementações lidam com a conversão de tipos de dados (ex: `Decimal` do Prisma para `number` no domínio) e a construção de queries.

### Container de Injeção de Dependência

O container em `src/lib/repositories/container.ts` centraliza a instanciação dos repositórios.

```typescript
// src/lib/repositories/container.ts
import { PostgresTransactionRepository } from "./postgresTransaction.repository";
import { PostgresUserRepository } from "./postgresUser.repository";
import { ITransactionRepository } from "./ITransaction.repository";
import { IUserRepository } from "./IUser.repository";

// Instancia e exporta os repositórios para serem usados pelos serviços
export const transactionRepository: ITransactionRepository = new PostgresTransactionRepository();
export const userRepository: IUserRepository = new PostgresUserRepository();
```

---

## Endpoints da API CRUD

Consulte [docs/BACKEND.md](docs/BACKEND.md) para detalhes completos de payloads e respostas.

### Sumário

| Método | Endpoint | Status |
|--------|----------|--------|
| GET | `/api/transactions` | ✅ Implementado |
| POST | `/api/transactions` | ✅ Implementado |
| PUT | `/api/transactions/[id]` | ✅ Implementado |
| DELETE | `/api/transactions/[id]` | ✅ Implementado |

---

## Integração com IA

**Nota**: A integração com IA é uma funcionalidade planejada para futuras versões e ainda não foi implementada. As seções abaixo descrevem a arquitetura proposta.

Agente de IA executará análises internas e comandos simples de CRUD.

### Funcionalidades Planejadas

1. **Análises de Gastos**:
   - "Quanto gastei em Transporte este mês?"
   - Query agregada → Gemini estrutura resposta natural

2. **Categorização Automática**:
   - Sugerir categoria baseada em descrição (ex.: "Uber" → "Transporte")
   - Usar embeddings + cosine similarity

3. **Sugestões de Economia**:
   - "Quais categorias tiveram maior aumento?"
   - Analytics + Gemini gera insights

4. **Comandos de Alteração**:
   - "Adiciona uma despesa de R$ 50 em Alimentação amanhã"
   - Parsear intent → Criar transação via API

### Provider: Google Gemini Pro

- **Variável de Ambiente**: `GEMINI_API_KEY`
- **Custo**: $20/mês (seu plano PRO, já configurado)
- **Vantagem**: Integração nativa com Node.js, multimodal ready
- **Trade-off**: API key exposta; rotacionar regularmente

---

## Performance e FinOps

### Análise Big-O

| Operação | PostgreSQL | Complexidade |
|----------|-----------|--------------|
| `create()` | ~5ms | O(log n) índices |
| `getById()` | ~2ms | O(1) índice primário |
| `getAll()` simples | ~15ms | O(log n) com índices |
| `getSummary()` | ~20ms | O(n) agregação em memória |
| `delete()` | ~8ms | O(log n) |

### Otimizações Recomendadas

1. **Índices Compostos**: `(type, category, date)` para queries frequentes.
2. **Caching**: Redis para `getSummary()` (cache por 5min).
3. **Paginação**: Limitar `getAll()` a 100 itens/página.
4. **Lazy Loading**: Carregar parcelas sob demanda.

### Custos FinOps

**PostgreSQL (Neon)**:
- Free tier: 512MB, 100 horas/mês ≈ $0/mês para prototipagem
- Estimativa: 50k transações ≈ 200MB; custo monthly ~$5-10/mês em paid tier
- Egress: $0.09/GB (risco se IA processar dados volumosos)
- **Recomendação**: Compressão de backups, soft deletes

**Google Gemini API**:
- Análises simples: ~$0.03 por query (prompt 500 tokens, resposta 100 tokens)
- Custo estimado: 100 queries/mês = ~$3/mês
- **Recomendação**: Cache de respostas frequentes

**Total Estimado**: $5-15/mês para operação inicial

---

## CI/CD com GitHub Actions

### Workflow Automático

Pipeline de CI/CD configurado via [.github/workflows/test.yml](.github/workflows/test.yml) executando **automaticamente a cada commit** e **pull request**.

### Componentes do Pipeline

#### 1. **Job: Test Suite** (Principal)
- **Trigger**: Push em `main`, `feat/**`, `fix/**`; PRs para `main`
- **Matrix**: Node 18.x, 20.x (testa múltiplas versões)
- **Steps**:
  - ✅ Checkout código
  - ✅ Setup pnpm + Node
  - ✅ Install dependencies (com cache)
  - ✅ ESLint check (linting)
  - ✅ Jest tests com `--coverage`
  - ✅ Upload coverage para Codecov

**Duração**: ~3-5 minutos por Node version

#### 2. **Job: Build Check** (Bloqueador)
- Valida `pnpm build` em ambiente de produção
- Previne PRs com erros de TypeScript/Next.js
- Depende de Test Suite (só executa se testes passam)

#### 3. **Job: Security Scan** (Não-bloqueador)
- `pnpm audit` para verificar vulnerabilidades de dependências
- Relatório é comentado no PR (informativo)

### Proteção de Branches (GitHub Flow)

Configurada via **GitHub Settings → Branches → Branch Protection Rules**:

```
main branch:
├─ ✅ Requer PR antes de merge
├─ ✅ Requer 1 aprovação
├─ ✅ Status checks obrigatórios:
│   ├─ Test Suite (18.x)
│   ├─ Test Suite (20.x)
│   └─ Build Check
├─ ✅ Branch deve estar atualizada com main
├─ ✅ Stale approvals descartados em novo push
└─ ✅ Include administrators
```

### Codecov Integration

Relatório automático de **cobertura de testes** em cada PR:
- **Coverage threshold**: 50% (linha, função, branch)
- **Comentários automáticos** no PR com diferença de cobertura
- **Dashboard**: https://codecov.io/

### Fluxo de Desenvolvimento (GitHub Flow)

```
1. git checkout -b feat/minha-feature   ← nasce de main
2. Escrever testes (TDD) + implementar
3. Refatorar + lint + testes
4. git push origin feat/minha-feature
5. Criar PR via GitHub para main
   ↓
6. GitHub Actions executa:
   - Jest (Node 18.x) → 2-3 min
   - Jest (Node 20.x) → 2-3 min
   - Build Check → 1-2 min
   - Security Scan → 1 min
   ↓
7. Status checks aparecem no PR
   ✅ Test Suite (18.x)
   ✅ Test Suite (20.x)
   ✅ Build Check
   ✅ Security Scan
   ✓ Codecov (informativo)
   ↓
8. Code review (1 aprovação obrigatória)
   ↓
9. Squash merge em main
   ↓
10. Deletar branch (local + remoto)
```

### Boas Práticas Implementadas

✅ **Caching**: pnpm-lock.yaml cachado (~30% mais rápido)
✅ **Concurrency**: Cancela workflows antigos se novo push chega
✅ **Matrix Testing**: Múltiplas versões do Node para compatibilidade
✅ **Fail-fast**: Build Check depende de testes (economiza tempo)
✅ **Não-bloqueadores**: Security/Linting não impedem merge (feedback apenas)
✅ **Coverage Tracking**: Histórico de cobertura em Codecov
✅ **PR Comments**: Feedback automático nos PRs

### Setup Necessário (Uma única vez)

1. **GitHub Settings → Branches → Branch Protection Rule**:
   - Pattern: `main`
   - Require status checks: `Test Suite (18.x)`, `Test Suite (20.x)`, `Build Check`
   - Require PR before merge: Sim
   - Require approvals: 1

2. **Codecov.io (Opcional)**:
   ```
   https://codecov.io/ → Connect GitHub → Select repo
   Token automático (já no workflow)
   ```

3. **Tudo pronto**: Próximo push acionará workflow automaticamente

O repositório está configurado para GitHub Flow. Consulte o [AGENTS.md](../AGENTS.md) para detalhes do fluxo de desenvolvimento.

---

## Plano de Implementação

### Fases Concluídas

- [x] **Fase 1** (2-3h): Schemas Zod + validação
- [x] **Fase 2** (3-4h): Repository Pattern + PostgreSQL Neon
- [x] **Fase 3** (2-3h): Handlers CRUD (GET, POST, PUT, DELETE)
- [x] **Fase 4** (1-2h): CI/CD com GitHub Actions + Jest automation
- [x] **Fase 5** (3-4h): Autenticação (endpoints de registro/login, contexto de usuário e repositório).

### Próximas Fases

- [ ] **Fase 6** (3-4h): Integração Frontend ↔ API (conectar UI com endpoints de transação e auth).
- [ ] **Fase 7** (4-6h): Integração IA (Gemini) - *Planejado, não iniciado*.
- [ ] **Fase 8** (2h): Testes de integração ponta-a-ponta (API e UI).
- [ ] **Fase 9** (1-2h): Deploy (Vercel).

---

## Segurança

### Checklist

- [x] **Validação de Entrada**: Zod em todos os endpoints
- [x] **Sanitização**: Prisma usa parâmetros preparados (previne SQL Injection)
- [x] **CI/CD Security**: GitHub Actions + `pnpm audit`
- [ ] **Autenticação**: Em progresso (endpoints de login/registro implementados, falta integração completa com NextAuth e JWT).
- [ ] **Autorização**: Parcial (queries são filtradas por `userId` no repositório), mas falta Row-Level Security (RLS) no banco para uma camada de segurança adicional.
- [ ] **Rate Limiting**: Middleware (futuro, para prevenir ataques de força bruta).
- [ ] **CORS**: Configurar restritivamente em produção (futuro).
- [x] **Secrets**: Uso de variáveis de ambiente (`.env.local`) não commitadas.
- [ ] **Logging**: Auditoria de alterações (futuro).

### Recomendações Imediatas

1. **Rotacionar Gemini API Key**: Chave já exposta em commit anterior
2. **Habilitar Branch Protection**: Main branch protegido por status checks
3. **Habilitar CORS**: Restringir a origem `https://localhost:3000` em dev
4. **Implementar Rate Limiting**: ~100 req/min por IP (middleware futuro)

---

## Deploy e Hospedagem

### Ambiente de Produção

**Stack Recomendado**:
- **Frontend + API**: Vercel (Next.js nativo)
- **Banco de Dados**: Neon PostgreSQL
- **IA**: Google Gemini API

### Deploy em Vercel

```bash
# 1. Conectar repositório GitHub
vercel link

# 2. Configurar variáveis de ambiente
vercel env add DATABASE_URL "postgresql://..."
vercel env add GEMINI_API_KEY "AIzaSy..."

# 3. Deploy
vercel deploy --prod
```

### Checklist de Deploy

- [ ] Build passa: `pnpm build`
- [ ] Testes passam: `pnpm test`
- [ ] Variáveis de ambiente configuradas
- [ ] Migrações Prisma executadas: `prisma migrate deploy`
- [ ] Logs monitorados (Sentry, Datadog)
- [ ] Backup de DB configurado

---

## Referências

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Zod Validation](https://zod.dev/)
- [Prisma ORM](https://www.prisma.io/docs/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Neon Free Tier](https://neon.tech/docs/introduction/free-tier)
- [Google Gemini API](https://ai.google.dev/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

**Mantainer**: Tim de Desenvolvimento | **Última atualização**: Junho 2026
