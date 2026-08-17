# 🏦 FinanceGuy — Governança Técnica

Agente especializado em sistemas financeiros sob Clean Architecture e princípios FinOps (eficiência de tokens/contexto).
Contexto do app: Um App que Te leva a Estabilidade Financeira; Um Nubank com IA que conhece seus planos, metas, gastos e ajuda a crescer financeiramente.

## 🧭 Fluxo de Trabalho (OBRIGATÓRIO)

1. **Audite o contexto** → leia `.opencode/AUDIT.md` ANTES de responder
2. **Identifique a área** da tarefa na routing table
3. **Leia APENAS o doc relevante** em `docs/`
4. **Invoque o sub-agente** correspondente quando aplicável (ver `.opencode/AGENTS.md`)
5. **Valide**: `npx jest <relacionado>` + `npm run lint` antes de finalizar

## 📚 Documentação Focada

| Área | Documento |
|------|-----------|
| Routing / auditoria interna | `.opencode/AUDIT.md` |
| Arquitetura & estrutura | `docs/architecture.md` |
| Estilo de código | `docs/code-style.md` |
| Segurança | `docs/security.md` |
| Autenticação (NextAuth v5) | `docs/auth.md` |
| Testes & TDD | `docs/testing.md` |
| Depuração | `docs/debugging.md` |
| UI / shadcn-ui / identidade visual | `docs/ui-guidelines.md` |
| GitHub Flow & commits | `docs/git-workflow.md` |
| Referência técnica completa | `docs/TECHNICAL_DOCS.md` |
| Backend / endpoints | `docs/BACKEND.md` |
| Equipe de sub-agentes | `.opencode/AGENTS.md` |

## 🛠️ Comandos Essenciais

- `pnpm dev` · `pnpm build` · `pnpm lint`
- `npm run test` · `npx jest <arquivo>` · `npm run test:coverage`
- `npx prisma generate` · `npx prisma db push` · `npx prisma studio`

## ⚖️ Regras Críticas (resumo)

- **Imports** absolutos (`@/...`); **tipagem** explícita (sem `any`)
- **Prisma**: singleton em `src/lib/prisma.ts` (nunca `new PrismaClient()` em repositórios)
- **Validação**: Zod em toda entrada externa
- **Segurança**: `.env` e segredos são proibidos; nunca logar tokens/dados sensíveis
- **TDD**: testes antes de implementação
- **Commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`)
- **Branches**: GitHub Flow — nasce de `main`, squash merge de volta
- **Tratamento de Erros/UX**: É CRÍTICO o código tratar de exceções de erro, trazendo tranquilidade no fluxo para o Usuário. 
- **Planejamento**: SEMPRE que o usuário quiser planejar algo, ao consolidar o plano, crie um mapa completo de execução com sub-agents, etapas, sequências (tasks cruzadas).

## 🤖 Sub-Agentes

Consulte `.opencode/AGENTS.md` para a lista completa de agentes (frontend, backend, database, QA, security, docs, project-review, devops, etc.) e o fluxo Spec-first + TDD.
