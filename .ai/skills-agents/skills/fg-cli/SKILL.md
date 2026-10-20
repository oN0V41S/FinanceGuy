---
name: fg-cli
description: Use o CLI `pnpm fg` do FinanceGuy para tarefas recorrentes de terminal — scaffold de feature/componente/hook/rota/página/serviço/repositório/teste, buscar arquivos (find/grep), mover com reescrita de imports (mv), substituir em lote (replace), rodar testes/lint/build/db, criar spec e descobrir doc/sub-agente (route). Acione quando o usuário pedir para criar estrutura, scaffold, renomear/mover arquivos, buscar no código, ou rodar o pipeline pré-PR.
---

# `fg` — CLI do FinanceGuy

Entrada única para operações recorrentes, seguindo o padrão do projeto (Clean Architecture, TDD, `@/` imports, Zod). Código em `src/scripts/cli/`; spec em `docs/specs/fg-cli.md`.

```bash
pnpm fg --help            # grupos
pnpm fg <grupo> --help    # uso do grupo
```

## Regras de segurança (valem para todos os comandos)

- **Dry-run por padrão**: nada é gravado sem `--write`. Sempre rode primeiro sem `--write` e revise.
- Nada existente é sobrescrito sem `--force`.
- Escrita só em `src/`, `docs/` e `.claude/skills/`. Bloqueados: `.env*`, `node_modules`, `.next`, `.git`, `prisma/migrations`, caminhos absolutos e `..`.
- `db push` exige `--yes`. `replace` é limitado a 50 arquivos (restrinja com `--glob`).
- `--json` devolve o resultado estruturado. Exit codes: `0` ok/dry-run · `1` falha · `2` args inválidos · `3` bloqueado.

## Comandos

| Grupo | Uso | Para quê |
|---|---|---|
| `route` | `pnpm fg route componente modal` | Doc e sub-agente da routing table (`.opencode/AUDIT.md`) |
| `spec` | `pnpm fg spec new <slug> --write` | Esqueleto de `docs/specs/<slug>.md` |
| `scaffold` | `feature <kebab>` · `component <feature> <Pascal>` · `hook <feature> <useNome>` · `api-route <feature>` · `page <rota>` · `service <feature>` · `repository <feature>` · `test <arquivo>` | Esqueletos TDD (stubs lançam `NotImplemented`, testes com `it.todo`) |
| `find` | `pnpm fg find GoalCard --area tests` | Busca por nome (substring/glob). Áreas: frontend, backend, tests, db |
| `grep` | `pnpm fg grep "regex" -C 2` | Busca regex em `src`, `docs`, `prisma` |
| `mv` | `pnpm fg mv <origem> <destino> --write` | Move e reescreve imports `@/…` e relativos |
| `replace` | `pnpm fg replace "old" "new" --glob "src/x/**" --write` | Substituição em lote |
| `test` | `pnpm fg test <alvo> [--coverage]` | `npx jest` filtrado |
| `dev` | `pnpm fg dev lint\|build\|start` | Atalhos de pnpm |
| `db` | `pnpm fg db generate\|studio\|push --yes` | Prisma |
| `pr` | `pnpm fg pr` | Pipeline pré-PR: lint → coverage → build → audit |
| `audit` | `pnpm fg audit` | context-audit (somente leitura) |

## Fluxo recomendado

1. `pnpm fg route <palavras>` → leia só o doc indicado e invoque o sub-agente.
2. `pnpm fg scaffold …` (dry-run) → revise → repita com `--write`.
3. Implemente seguindo TDD (transforme os `it.todo` em testes reais antes do código).
4. `pnpm fg test <alvo>` e `pnpm fg dev lint`; ao fim, `pnpm fg pr`.

## Observações

- `scaffold` **nunca edita `src/core/container.ts`**: imprime o snippet de DI para você aplicar manualmente.
- O CLI usa imports **relativos** (ts-node não resolve `@/`); o código gerado usa `@/`.
- Arquivos do CLI não podem se chamar `test.ts`/`spec.ts` (o Jest os trataria como teste).
- Jest ignora `.claude/` (`testPathIgnorePatterns`); em worktrees em `.claude/worktrees/`, rode com `--testPathIgnorePatterns "/node_modules/"`.

## Adicionar um subcomando

1. Escreva o teste em `src/scripts/cli/__tests__/` (`/** @jest-environment node */`, `makeCtx()` de `core/testing`).
2. Crie `commands/<nome>.ts` exportando um `Command` (`name`, `summary`, `usage`, `run(args, ctx)`); use só `ctx.fs`/`ctx.exec`.
3. Registre em `commands/index.ts` e atualize este arquivo e o `AGENTS.md`.
