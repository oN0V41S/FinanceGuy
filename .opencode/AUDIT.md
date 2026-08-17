# 🧭 Context Router — FinanceGuy

> Pre-response hook. Leia este arquivo ANTES de responder qualquer tarefa.
> Objetivo: identificar a área do projeto → carregar APENAS o doc relevante → aplicar as convenções corretas. Otimiza tokens (AIOps).

## Protocolo (antes de responder)

1. **Identifique a área** da tarefa usando a tabela de routing abaixo
2. **Leia APENAS o doc correspondente** em `docs/`
3. Aplique as convenções do doc
4. Se aplicável, **invoque o sub-agente** correspondente via Task tool

## Routing Table — Áreas do Projeto

| Palavras-chave / Contexto da tarefa | Doc a ler | Sub-agente |
|-------------------------------------|-----------|------------|
| Componente, UI, formulário, tabela, modal, estilo, cor, tema, responsividade | `docs/ui-guidelines.md` | `frontend` |
| API, service, repository, schema, validação, endpoint, middleware, DI, arquitetura | `docs/architecture.md` | `backend-engineer` |
| Prisma, migration, PostgreSQL, query, schema do banco | `docs/architecture.md` | `database-engineer` |
| Teste, jest, coverage, TDD, spec, RTL, mock | `docs/testing.md` | `quality-assurance-analyst` |
| Segurança, secret, injeção, XSS, SQLi, token, audit, deploy | `docs/security.md` | `security-secret-auditor` |
| Login, registro, NextAuth, JWT, sessão, server action de auth | `docs/auth.md` | `backend-engineer` |
| Branch, commit, PR, merge, conventional commits, git | `docs/git-workflow.md` | — (processo) |
| Bug, erro, debug, falha, investigar, crash | `docs/debugging.md` | `quality-assurance-analyst` |
| Nome de arquivo, import, formato, estilo de código, tipagem | `docs/code-style.md` | — |
| Doc, ADR, spec, documentação técnica | — (siga padrões de `docs/`) | `docs-architect` |
| Build, deploy, CI/CD, bundle, FinOps | — (consulte `docs/TECHNICAL_DOCS.md` + `.github/workflows/`) | `devops-platform-engineer` |
| Revisão de arquitetura, padrões, PR review | — (consulte `docs/architecture.md` + `.opencode/agents/`) | `project-review` |

## Comandos Essenciais

| Comando | Uso |
|---------|-----|
| `pnpm dev` | Ambiente de desenvolvimento (Turbo) |
| `pnpm build` | Build de produção |
| `pnpm lint` | ESLint (src/) |
| `npm run test` | Todos os testes |
| `npx jest <arquivo>` | Teste específico (ciclos rápidos) |
| `npx jest -t "<nome>"` | Teste único por nome |
| `npx prisma generate` | Gerar Prisma Client |
| `npx prisma db push` | Sincronizar schema (cuidado, evitar prod) |
| `npx prisma studio` | UI do banco |

## Regras de Governança

- **Imports**: caminhos absolutos (`@/features/...`, `@/lib/...`)
- **Prisma**: singleton em `src/lib/prisma.ts`; nunca `new PrismaClient()` em repositórios
- **Validação**: Zod em toda entrada externa, antes da camada de domínio
- **Segurança**: proibido acessar `.env`/segredos; nunca logar tokens ou dados sensíveis
- **Naming**: PascalCase (componentes/classes/tipos), camelCase (funções/variáveis), SCREAMING_SNAKE_CASE (constantes globais)
- **TDD**: testes antes de implementação; validar com `npx jest <relacionado>` após alterações
- **Lint**: rodar `npm run lint` antes de propor commit
- **Sub-agentes**: invocar automaticamente conforme a tabela acima e o índice em `.opencode/AGENTS.md`

## Checklist Final

- [ ] Testes passaram? (`npx jest <relacionado>`)
- [ ] Lint limpo? (`npm run lint`)
- [ ] Sem segredos hardcoded?
- [ ] Convenções da área seguidas?
