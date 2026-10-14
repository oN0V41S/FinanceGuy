# Spec: CLI `fg` + Skill `fg-cli`

**Status**: Draft
**Versão**: 1.0
**Última atualização**: 2026-10-13

---

## 1. Visão Geral

CLI do projeto (`fg`) que unifica os comandos recorrentes de um agente (dev, testes, banco, PR, specs, roteamento de contexto, scaffold, busca e movimentação de arquivos) seguindo os padrões do FinanceGuy. Acompanha uma skill local em `.claude/skills/fg-cli/` que ensina o agente a usá-lo, e uma seção "🧰 CLI `fg`" no `AGENTS.md`.

### 1.1 Objetivo de Negócio
- Reduzir tokens e tentativa-e-erro do agente: um comando em vez de vários passos manuais.
- Garantir que scaffolds nasçam no padrão Clean Architecture + TDD + Zod do projeto.
- Dar a agentes sem ferramentas nativas (OpenCode headless, Hermes) busca e refactor seguros.

### 1.2 Dependências
- `src/scripts/init-pr.ts` (pipeline atual → vira `fg pr`).
- `.opencode/scripts/context-audit.js` (→ `fg audit`).
- Routing table de `.opencode/AUDIT.md` (→ `fg route`).
- `ts-node` (já em devDependencies). **Nenhuma dependência nova.**
- Estrutura de feature de referência: `src/features/goals/` (interface do repository → repository Postgres → service → `validations.ts` → `api/route.ts` → `hooks/` → `components/` → `__tests__/` ao lado de cada camada).

### 1.3 Referências
- `CLAUDE.md`, `.opencode/AGENTS.md`, `.opencode/AUDIT.md`
- `docs/architecture.md`, `docs/code-style.md`, `docs/testing.md`, `docs/security.md`
- `.opencode/commands/create-component.md`, `.opencode/commands/spec-gen.md`
- `.claude/skills/opencode-cli/SKILL.md` (formato de skill de referência de CLI)

### 1.4 Decisões fechadas na grelha
| # | Decisão |
|---|---------|
| Q1 | CLI próprio `fg`, construído sobre os scripts existentes |
| Q2 | Skill = referência do CLI + passo "como adicionar subcomando" |
| Q3 | Grupos v1: `dev`, `test`, `db`, `pr`, `audit`, `spec`, `route` **+ `scaffold`, `find`/`grep`, `mv`/`replace`** (ampliado pelo usuário) |
| Q4 | TypeScript via `ts-node`, parsing manual de args, sem dependência nova |
| Q5 | Tabela completa no `AGENTS.md` raiz; `.opencode/AGENTS.md` e `CLAUDE.md` com ponteiro de 1 linha |
| Q6 | `db push` exige `--yes`; CLI nunca lê/imprime variáveis sensíveis |
| Q7–Q12 | Seguem as recomendações propostas (ver §3 e §5); **a confirmar na aprovação desta spec** |

---

## 2. Arquitetura

### 2.1 Estrutura de Arquivos

```
src/scripts/cli/
├── fg.ts                    # entrypoint: parse de argv → dispatch → imprime → exit code
├── core/
│   ├── types.ts             # CommandResult, CommandContext, FsPort
│   ├── args.ts              # parser manual (flags booleanas/valor, subcomandos)
│   ├── fs-port.ts           # FsPort real (node:fs) + createMemoryFs() p/ testes
│   ├── guards.ts            # allowlist/denylist de caminhos, NotImplementedError
│   ├── output.ts            # render texto e --json
│   └── errors.ts            # CliError (código + mensagem amigável)
├── commands/
│   ├── dev.ts  test.ts  db.ts  pr.ts  audit.ts
│   ├── spec.ts  route.ts
│   ├── scaffold/ { index.ts, feature.ts, component.ts, hook.ts, apiRoute.ts,
│   │              page.ts, service.ts, repository.ts, test.ts, templates/ }
│   ├── find.ts  grep.ts
│   └── mv.ts  replace.ts
└── __tests__/               # um arquivo por comando + core
.claude/skills/fg-cli/SKILL.md
```

`package.json`: `"fg": "ts-node src/scripts/cli/fg.ts"` (uso: `pnpm fg <grupo> <cmd> [flags]`).
`init-pr` permanece como alias de `pnpm fg pr` (sem quebrar o script atual).

### 2.2 Fluxo de Dados
`argv → parseArgs → resolve comando → command(args, ctx) → CommandResult → output (texto | --json) → exit code`.

- Todo comando é função **pura** `(args: ParsedArgs, ctx: { fs: FsPort; exec: ExecPort; cwd: string }) => Promise<CommandResult>`.
- Efeitos colaterais só via `FsPort`/`ExecPort` injetados; `fg.ts` é a única camada que instancia as versões reais.
- Comandos que apenas encapsulam processos (`dev`, `test`, `db`, `pr`) delegam a `ExecPort` (`pnpm`, `npx jest`, `npx prisma`).

### 2.3 Estados do comando
`ok` (exit 0) · `dry-run` (exit 0, nada gravado) · `invalid-args` (exit 2) · `blocked` (guard de segurança, exit 3) · `failed` (exit 1). Em `--json`: `{ status, command, created[], modified[], moved[], matches[], nextSteps[], errors[] }`.

---

## 3. Contratos / Comandos

| Grupo | Comando | Descrição | Segurança |
|-------|---------|-----------|-----------|
| dev | `fg dev start\|build\|lint` | Atalhos de `pnpm dev/build/lint` | — |
| test | `fg test [alvo] [--area frontend\|backend\|db] [--coverage] [-t nome]` | `npx jest` filtrado; `--area` mapeia para pastas | — |
| db | `fg db generate\|studio` | Prisma | — |
| db | `fg db push --yes` | `prisma db push` | exige `--yes`; sem `--yes` → `blocked`; avisa para evitar prod |
| pr | `fg pr` | Pipeline lint → coverage → build → audit (conteúdo do `init-pr`) | — |
| audit | `fg audit` | Executa o context-audit | só leitura |
| spec | `fg spec new <slug>` | Cria `docs/specs/<slug>.md` com o esqueleto do grill-me | não sobrescreve |
| route | `fg route <palavras…>` | Imprime doc + sub-agente da routing table (AUDIT.md) | só leitura |
| scaffold | `fg scaffold feature <nome>` | Árvore completa de domínio (ver abaixo) | `--dry-run` padrão |
| scaffold | `fg scaffold component <Feature> <Nome>` | `components/Nome.tsx` + teste RTL | idem |
| scaffold | `fg scaffold hook\|api-route\|page\|service\|repository <…>` | Peça isolada no padrão | idem |
| scaffold | `fg scaffold test <arquivo-alvo>` | Teste `it.todo` para arquivo existente | idem |
| find | `fg find <padrão> [--area …]` | Busca por nome de arquivo, ignora `node_modules`, `.next`, `coverage` | só leitura |
| grep | `fg grep <regex> [--area …] [-C n]` | Busca em conteúdo, mesmos ignores | só leitura |
| mv | `fg mv <origem> <destino>` | Move/renomeia **e reescreve imports `@/…` e relativos** | `--dry-run` padrão |
| replace | `fg replace <regex> <texto> [--glob …]` | Substituição em arquivos | `--dry-run` padrão |

**Flags globais**: `--json`, `--write` (efetiva escritas; sem ela, `dry-run`), `--force` (permite sobrescrever existente), `--help`.

**Scaffold `feature <nome>`** gera (seguindo `src/features/goals/`):
`I<Nome>.repository.ts`, `postgres<Nome>.repository.ts` (usa singleton `@/lib/prisma`), `<nome>.service.ts`, `validations.ts` (Zod), `api/route.ts`, `api/[id]/route.ts`, `hooks/use<Nome>.ts`, e `__tests__/` correspondentes.
- **TDD (Q8)**: implementações saem como stubs que lançam `NotImplementedError`; cada teste vem com `it.todo` para: sucesso, validação Zod inválida, erro do repository.
- **DI (Q7)**: o CLI **não edita** `src/core/container.ts`; imprime o trecho a colar em `nextSteps`.
- Imports sempre absolutos (`@/…`), tipagem explícita (sem `any`), PascalCase/camelCase conforme `docs/code-style.md`.

---

## 4. API
Não aplicável (CLI local). Nenhuma rota HTTP nova.

---

## 5. Edge Cases & Tratamento de Erro

- **Escrita (Q9)**: `--dry-run` padrão; nunca sobrescreve sem `--force`; só escreve em `src/` e `docs/` (e `.claude/skills/` para a própria skill); **bloqueia** `.env*`, `node_modules`, `.next`, `prisma/migrations`, `.git`. Violação → `blocked` (exit 3) com mensagem clara, sem stack trace.
- Caminho com `..` ou absoluto fora do repo → `blocked`.
- Nome inválido (não PascalCase/kebab) → `invalid-args` com exemplo de uso correto.
- `fg mv`: se algum import não puder ser reescrito com certeza (ex.: import dinâmico montado por string), lista os casos em `errors[]`, **não aplica nada** e sai com exit 1 (operação atômica: valida tudo antes de gravar).
- `fg replace`: limite de arquivos afetados (default 50) para evitar substituição em massa acidental; excedido → `blocked` pedindo `--glob` mais estreito.
- `fg db push` sem `--yes` → `blocked`; o CLI nunca lê `.env` nem imprime variáveis de ambiente.
- Falha de processo filho (jest/lint/prisma): propaga exit code e mostra a última parte da saída; nunca engole erro.
- Windows/PowerShell: paths normalizados para `/` internamente; testes cobrem separadores `\`.
- Mensagens sempre em pt-BR, orientando o próximo passo (CLAUDE.md: tranquilidade no fluxo).

---

## 6. Critérios de Aceitação

1. `pnpm fg --help` lista todos os grupos; `pnpm fg <grupo> --help` mostra uso e exemplos.
2. `fg scaffold feature wallet` (dry-run) lista exatamente a árvore esperada e não grava; com `--write` cria os arquivos; reexecutar falha sem `--force`.
3. Arquivos gerados passam em `tsc --noEmit` e os testes geradas aparecem como `todo` (não quebram `npm run test`).
4. `fg mv` move um arquivo de teste fixture e todos os imports (`@/…` e relativos) são atualizados; `--dry-run` não altera o disco.
5. Guards: tentativas de escrita em `.env`, `node_modules`, `prisma/migrations`, fora de `src/docs` → exit 3.
6. `fg db push` sem `--yes` → exit 3.
7. `fg route "componente modal"` retorna `docs/ui-guidelines.md` + sub-agente `frontend`.
8. `--json` produz JSON válido com `status`, `nextSteps` e `errors`.
9. `pnpm fg pr` mantém o comportamento do `init-pr` atual; `pnpm init-pr` continua funcionando.
10. Testes do CLI em `src/scripts/cli/__tests__/` usam `createMemoryFs()` (sem tocar o disco real) e passam em `npx jest src/scripts/cli`; `npm run lint` limpo.
11. `.claude/skills/fg-cli/SKILL.md` existe com frontmatter válido (`name`, `description` com gatilhos), tabela de comandos, exemplos, regras de segurança e o passo "adicionar um subcomando".
12. `AGENTS.md` (raiz) tem a seção "🧰 CLI `fg`" com a tabela de comandos; `.opencode/AGENTS.md` e `CLAUDE.md` têm ponteiro de 1 linha.

---

## 7. Mapa de Execução

| Etapa | Sub-agente | Entrega | Depende de |
|-------|-----------|---------|-----------|
| 1 | `quality-assurance-analyst` | Testes (red) do `core/` (args, guards, fs-port em memória, output) | — |
| 2 | `backend-engineer` | Implementação do `core/` (green) | 1 |
| 3a | `backend-engineer` | `dev`, `test`, `db`, `pr`, `audit`, `route`, `spec` (+ testes) | 2 |
| 3b | `backend-engineer` | `scaffold/*` + templates (+ testes) | 2 — **paralelo a 3a e 3c** |
| 3c | `backend-engineer` | `find`, `grep`, `mv`, `replace` (+ testes) | 2 — **paralelo a 3a e 3b** |
| 4 | `security-secret-auditor` | Revisão dos guards (paths, `--force`, `db push`, ausência de leitura de `.env`) | 3a, 3b, 3c |
| 5 | `docs-architect` | `.claude/skills/fg-cli/SKILL.md`, seção no `AGENTS.md`, ponteiros | 3a, 3b, 3c |
| 6 | `project-review` | Revisão final de arquitetura e aceite dos critérios §6 | 4, 5 |

Validação final: `npx jest src/scripts/cli` + `npm run lint`. Registro: item na **Notion FinanceGuy — Gestão do Projeto** (FING-XX) após aprovação da spec.
