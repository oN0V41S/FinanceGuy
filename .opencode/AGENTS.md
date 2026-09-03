# Equipe de Engenharia — FinanceGuy

Índice central de todos os agentes disponíveis.
Os arquivos `.md` ficam em `.opencode/agents/` (planos, sem diretórios).

---

## Estrutura

```
.opencode/agents/
├── tech-lead.md                     # Visível na lista — orquestrador da equipe
├── backend-engineer.md              # Subagente — API, services, repositories
├── frontend.md                      # Subagente — UI, shadcn-ui
├── database-engineer.md             # Subagente — Prisma schema, PostgreSQL
├── devops-platform-engineer.md      # Subagente — CI/CD, build, FinOps
├── solutions-architect.md           # Subagente — ADRs, design de sistema
├── product-manager.md               # Subagente — specs, requisitos, roadmap
├── quality-assurance-analyst.md     # Subagente — testes Jest/RTL, coverage
├── security-secret-auditor.md       # Subagente — auditoria de segurança
├── docs-architect.md                # Subagente — documentação técnica
└── project-review.md                # Subagente — revisão de arquitetura
```

## Agentes

| Agente | Modo | Cor | Especialização |
|--------|------|-----|----------------|
| **tech-lead** | `all` | primary | Orquestração, delegação, triagem de PRs, decisões técnicas |
| **frontend** | `subagent` | info | UI/UX com shadcn-ui + VISUAL_IDENTITY.md | Spec-first + TDD: escrever Spec detalhada → testes → implementação; dark/light theme + mobile responsivo |
| **backend-engineer** | `subagent` | secondary | API routes, services, repositories, Prisma, Zod |
| **database-engineer** | `subagent` | accent | Schema Prisma, PostgreSQL, migrations, queries |
| **devops-platform-engineer** | `subagent` | warning | CI/CD, build Next.js, deploy, FinOps |
| **solutions-architect** | `subagent` | info | ADRs, design de sistema, Clean Architecture |
| **product-manager** | `subagent` | secondary | Specs, user stories, roadmap, docs/features |
| **quality-assurance-analyst** | `subagent` | success | Testes Jest/RTL, coverage, E2E |
| **security-secret-auditor** | `subagent` | error | Secrets, SQL injection, CVEs, dados financeiros |
| **docs-architect** | `subagent` | accent | Documentação técnica, ADRs, diagramas Mermaid |
| **project-review** | `subagent` | secondary | Auditoria Clean Architecture, validação de padrões |

## Como Usar

### tech-lead (agente principal)
Selecionável na UI. Orquestra e delega para o time via Task tool:

```typescript
task(subagent_type="backend-engineer", prompt="Crie uma API route para criar transações...")
task(subagent_type="frontend", prompt="Implemente o formulário de login...")
task(subagent_type="database-engineer", prompt="Adicione o campo category ao schema...")
```

## 🚨 Armadilhas Conhecidas (todos os agentes devem conhecer)

### Select — `@base-ui/react` NÃO é Radix
O projeto usa `@base-ui/react/select`. `SelectValue` **não** reflete automaticamente o `ItemText` do item selecionado (ao contrário do Radix). Sempre fornecer o label mapeado como `children`:
```tsx
// ❌ Exibe a chave interna ("last6", "2025")
<SelectValue placeholder="Selecionar" />

// ✅ Mapear value → label e passar como children
<SelectValue>{getLabelForValue(value)}</SelectValue>
```
`SelectContent` deve ter `className="bg-surface-container"` para fundo correto no portal.

### Lazy Loading — Política
- `<LazyLoad>` (em `src/shared/components/LazyLoad.tsx`): **somente** para listas/seções custosas com dados assíncronos (ex: lista de transações). Nunca envolver card estático ou a página inteira.
- `<Skeleton>`: preferir para loading de componentes individuais (cards, gráficos, textos).
- Dados **nunca** devem ter `MOCK_DATA` como fallback de produção. Usar estado vazio (empty state) quando a API retorna `[]`.
- `setTimeout` para simular loading é proibido em componentes com dados estáticos.

### Subagentes (Todos seguem Spec-first + TDD)
Todos os subagentes seguem rigoroso **Spec-first + TDD**:

**Regra de ouro**: NENHUM componente ou funcionalidade é implementado sem antes:
1. **Spec (OBRIGATÓRIO)**: o agente DEVE compelir o usuário a detalhar uma Spec completa com props, estados, comportamentos, edge cases e critérios de aceitação. O agente não avança sem a Spec aprovada.
2. **Testes**: escritos com base na Spec, cobrindo todos os estados (padrão, loading, vazio, erro, edge cases)
3. **Implementação**: o mínimo necessário para passar nos testes
4. **Validação**: `pnpm jest <componente>` — todos passando
5. **E2E**: apenas fluxos críticos, sem overengineering

Especificamente:
- **frontend**: escrever primeiramente a Spec do componente, depois os testes unitários (RTL + Jest), e então a implementação
- **backend-engineer**, **database-engineer**, etc.: Spec do endpoint/feature → testes unitários → testes de integração → implementação

Invocáveis diretamente via `@` na conversa ou Task tool. Exemplos:

```typescript
task(subagent_type="quality-assurance-analyst", prompt="Escreva testes para TransactionService...")
task(subagent_type="security-secret-auditor", prompt="Audite o código de autenticação...")
task(subagent_type="solutions-architect", prompt="Desenhe a arquitetura para multi-tenancy...")
task(subagent_type="product-manager", prompt="Crie uma spec para o módulo de metas...")
task(subagent_type="devops-platform-engineer", prompt="Configure o CI com GitHub Actions...")
task(subagent_type="docs-architect", prompt="Documente a API de transações...")
task(subagent_type="project-review", prompt="Valide a conformidade com Clean Architecture...")
task(subagent_type="frontend", prompt="Crie um componente de formulario de transacao seguindo TDD...")
```

## Comandos do Projeto

```bash
pnpm dev              # Ambiente de desenvolvimento (Turbo)
pnpm build            # Build de produção (prisma generate + next build)
pnpm lint             # ESLint (src/)
pnpm test             # Testes unitários
pnpm test:coverage    # Relatório de coverage
pnpm test:ci          # Testes em modo CI
pnpm prisma:generate  # Gerar Prisma Client
pnpm prisma:push      # Sincronizar schema (dev)
pnpm prisma:studio    # UI do banco de dados
```

## Contratos

> **NENHUM PR pode ser aberto sem que TODOS os passos abaixo sejam executados e validados.**

### Checklist obrigatório antes de criar PR

| # | Passo | Comando | Critério |
|---|-------|---------|----------|
| 1 | **Build** | `pnpm build` | Zero erros (prisma generate + next build) |
| 2 | **Testes** | `pnpm test` | Todos passando |
| 3 | **Coverage** | `pnpm test:coverage` | ≥80% em features críticas |
| 4 | **Lint + CI** | `pnpm lint && pnpm test:ci` | Zero errors no lint, testes CI passando |
| 5 | **Git** | `git status && git diff` | Nenhum arquivo não rastreado ou staged indevido |

### Execução sequencial recomendada

```bash
pnpm build && pnpm test && pnpm test:coverage && pnpm lint && pnpm test:ci && git status && git diff
```

### Regras

- Se **qualquer** passo falhar → **não abrir PR**; corrigir e repetir o checklist.
- Agentes que violarem este contrato terão seu PR rejeitado pelo `project-review` ou `tech-lead`.
- `tech-lead` pode autorizar exceção apenas com justificativa documentada (ex: hotfix de segurança urgente com validação pós-merge).
