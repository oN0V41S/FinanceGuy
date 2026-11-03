# Spec: FING-30 — TUI do `fg` (React-Ink): Kanban de etapas e agentes da pipeline

**Status**: Draft (aguardando Portão 1)
**Versão**: 1.0
**Última atualização**: 2026-11-01
**Card**: https://app.notion.com/p/40bd3856092b8195a094da6f902234cb

## 1. Visão Geral

### 1.1 Objetivo de Negócio

Dar visibilidade em tempo real à `fg-pipeline` (tarefa → spec → worktree → implementação → commits): um **Kanban no terminal** com as etapas, os agentes trabalhando, os achados da revisão e os portões pendentes. Hoje o andamento só aparece lendo `.fg-pipeline.json` / `.fg-pipeline.progress.md` à mão.

Escopo da **v1 (primeira versão testável)**: `pnpm fg tui`, **somente leitura**. Não inicia, retoma, commita nem dá push em nada.

Fora de escopo da v1: ações que escrevem no estado, retomar/abortar etapas, push pela TUI, parsing estruturado do `progress.md`, qualquer integração com Notion.

### 1.2 Dependências

- `fg-pipeline` já grava `.fg-pipeline.json` (schema em `.claude/skills/fg-pipeline/references/state-schema.md`) e `.fg-pipeline.progress.md` (texto livre do agente monitor) na raiz de cada worktree.
- CLI `fg` (`src/scripts/cli/`, CommonJS via `ts-node`, comandos puros com `FsPort`/`ExecPort` injetados — ver `docs/specs/fg-cli.md`).
- Ink é **ESM-only** e o Jest do projeto é CommonJS → a TUI vive num pacote isolado (decisão D1).

### 1.3 Decisões fechadas (grill-me)

| # | Decisão |
|---|---|
| D1 | Pacote isolado `tools/fg-tui/`, **membro do workspace pnpm** (`tools/*` em `pnpm-workspace.yaml`, um único lockfile). `fg tui` apenas faz `spawn` do pacote (via `tsx`). |
| D2 | Testes da TUI com **Vitest** dentro do pacote; `tools/` entra no `testPathIgnorePatterns` do Jest raiz. O comando `fg tui` (CommonJS, portas injetadas) é testado no Jest raiz. |
| D3 | Descoberta automática de worktrees com `.fg-pipeline.json` via `git worktree list --porcelain`; 1 → abre direto, várias → seletor; `--dir <path>` ou `FING-N` forçam a escolha. |
| D4 | Kanban com colunas = status das etapas (`Pendente \| Rodando \| Concluída \| Falhou`); barra de fases no topo; achados da revisão em painel à parte. |
| D5 | `progress.md` **não é parseado**: só as últimas N linhas num painel "Atividade". |
| D6 | Teclado: `←/→` coluna, `↑/↓` card, `Enter` detalhe, `Esc` fecha detalhe, `r` recarrega, `q` sai. Nada escreve no estado. |
| D7 | Modos: `--demo` (fixture embutido), `--once` (renderiza uma vez e sai), dump do board em JSON (ver nota). |
| D8 | Ink **6.8.0** + React **19.0.3** (mesma versão do app) + Zod ^4 + Vitest + `ink-testing-library`. |

> **Ajuste a confirmar no Portão 1** — o flag global `--json` do `fg` já significa "envelope `CommandResult` em JSON" (renderizado pelo `runCli` depois que o comando retorna) e o `ExecPort` herda o stdio do filho. Se a TUI usasse `--json` para o dump do board, a saída teria dois documentos JSON. Por isso o dump do board é **`--dump`** (e é o fallback automático quando não há TTY). `--json` continua com o significado global.

### 1.4 Referências

- `docs/specs/fg-cli.md` (contrato de comandos, portas, status/exit codes)
- `docs/specs/FING-26-fg-pipeline.md` (pipeline e agente monitor)
- `.claude/skills/fg-pipeline/references/state-schema.md`

## 2. Arquitetura

### 2.1 Estrutura de Arquivos

```
pnpm-workspace.yaml                 # + "tools/*"
tsconfig.json                       # + "tools" em exclude (evita typecheck cruzado no next build)
jest.config.mjs                     # + "/tools/" em testPathIgnorePatterns
tools/fg-tui/
  package.json                      # name "@financeguy/fg-tui", private, type "module"
  tsconfig.json                     # ESM, jsx react-jsx, strict
  vitest.config.ts
  src/
    main.tsx                        # entry: parse de args, resolve alvo, escolhe render/once/dump
    model/
      types.ts                      # Board, BoardColumn, BoardCard, PhaseItem, Gate, ReadResult
      schema.ts                     # PipelineStateSchema (Zod)
      readState.ts                  # readState(dir, fs) → ReadResult
      listWorktrees.ts              # listWorktrees(repoRoot, git, fs) → WorktreeRef[]
      resolveTarget.ts              # escolhe a worktree (--dir | FING-N | auto)
      mapToBoard.ts                 # estado → Board (puro)
      parseState.ts                 # "step_2_running" → { kind, index? }
      detectGate.ts                 # estado → Gate | null
      tailProgress.ts               # tailProgress(text, n) → string[]
      demo.ts                       # fixture --demo
    hooks/
      useWatchState.ts              # fs.watch + polling 1 s, mantém último estado válido
    components/
      App.tsx · WorktreePicker.tsx · PhaseBar.tsx · Board.tsx · Column.tsx · Card.tsx
      DetailPanel.tsx · ActivityFeed.tsx · FindingsList.tsx · GateBanner.tsx · ErrorView.tsx
  src/**/*.test.ts(x)               # Vitest (ao lado do código)
src/scripts/cli/commands/
  tui.ts                            # Command `tui` (CommonJS)
  index.ts                          # registra tuiCommand
src/scripts/cli/__tests__/tui.test.ts
```

Regras: `model/` e `hooks/` não importam Ink/React (exceto o hook); `model/` é **puro** e recebe I/O por porta (`FsLike`, `GitLike`). Componentes só recebem props já mapeadas (`Board`), nunca o JSON bruto.

### 2.2 Fluxo de Dados

```
pnpm fg tui [FING-N] [--dir p] [--demo] [--once] [--dump]
  └─ tui.ts (CommonJS): valida args → spawn: pnpm --filter @financeguy/fg-tui exec tsx src/main.tsx <args> --repo <raiz>
        └─ main.tsx
             ├─ --demo ............... Board vem de demo.ts
             ├─ resolveTarget ........ listWorktrees → 0 | 1 | N | --dir | FING-N
             ├─ useWatchState(dir) ... readState + tailProgress a cada mudança (watch + 1 s)
             └─ mapToBoard(state) → <App board activity gate/>
```

Arquivos lidos: **apenas** `<worktree>/.fg-pipeline.json` e `<worktree>/.fg-pipeline.progress.md` (nomes fixos, nunca outro caminho, nunca `.env`).

### 2.3 Estados da UI

| Estado | Comportamento |
|---|---|
| Procurando | Texto "Procurando pipelines…" (breve, sem skeleton artificial) |
| Nenhuma pipeline | `ErrorView`: "Nenhuma pipeline ativa encontrada. Inicie com `/fg-pipeline <tarefa>` ou veja um exemplo com `pnpm fg tui --demo`." |
| Seletor | `WorktreePicker` com `FING-N · slug · estado` por worktree; `↑/↓` + `Enter` |
| Board | Cabeçalho (código, slug, estado, "atualizado há X"), `PhaseBar`, 4 colunas, `ActivityFeed`, `FindingsList` (se houver), `GateBanner` (se houver) |
| Detalhe | `DetailPanel` da etapa selecionada: agente, sessão, modelo, commit, status; `Esc` volta |
| Estado inválido na 1ª leitura | `ErrorView` com o motivo (arquivo ausente / JSON inválido / schema divergente) |
| Leitura inválida depois de já ter estado | Mantém o **último estado válido** e mostra aviso discreto "leitura instável, mantendo último estado" (gravação em andamento não derruba a tela) |
| Parado | `running` com `updatedAt` > 5 min → selo "sem atualização há N min" no card/cabeçalho |

## 3. Contratos

```ts
// model/schema.ts
export const StepSchema = z.object({
  index: z.number().int().positive(),
  agent: z.string(),
  sessionID: z.string().nullable(),
  model: z.string().nullable(),
  commit: z.string().nullable(),
  status: z.enum(['pending', 'running', 'done', 'failed']),
});
export const PipelineStateSchema = z.object({
  code: z.string().regex(/^FING-\d+$/),
  slug: z.string(),
  notionPageUrl: z.string(),
  specPath: z.string(),
  worktree: z.string(),
  baseSha: z.string(),
  state: z.string(),                       // string livre: estados novos não quebram a TUI
  steps: z.array(StepSchema),
  review: z.object({
    cycles: z.number().int().nonnegative(),
    findings: z.array(z.record(z.string(), z.unknown())),  // tolerante; ver normalizeFinding
  }),
  updatedAt: z.string(),
  failedAt: z.string().optional(),
  reason: z.string().optional(),
});
export type PipelineState = z.infer<typeof PipelineStateSchema>;

// model/types.ts
export type ReadResult =
  | { ok: true; state: PipelineState }
  | { ok: false; kind: 'missing' | 'unreadable' | 'invalid-json' | 'invalid-schema'; message: string };

export interface FsLike { exists(p: string): boolean; readFile(p: string): string; }   // caminhos absolutos
export interface GitLike { worktreeListPorcelain(repoRoot: string): string; }

export interface WorktreeRef { path: string; branch: string | null; code: string | null; state: string | null; }

export type PhaseStatus = 'done' | 'current' | 'pending' | 'failed';
export interface PhaseItem { id: string; label: string; status: PhaseStatus; }

export interface BoardCard {
  index: number; agent: string; status: 'pending' | 'running' | 'done' | 'failed';
  model: string | null; sessionShort: string | null; commitShort: string | null; stale: boolean;
}
export interface BoardColumn { id: 'pending' | 'running' | 'done' | 'failed'; title: string; cards: BoardCard[]; }

export type GateKind = 'push' | 'failed';
export interface Gate { kind: GateKind; title: string; message: string; command?: string; }

export interface Finding { severity: 'critico' | 'alto' | 'medio' | 'baixo' | 'desconhecido'; file: string | null; line: number | null; description: string; }

export interface Board {
  code: string; slug: string; state: string; updatedAt: string;
  phases: PhaseItem[]; columns: BoardColumn[]; findings: Finding[]; gate: Gate | null;
}
```

Funções (todas puras salvo `readState`/`listWorktrees`, que usam as portas):

| Função | Assinatura | Regra |
|---|---|---|
| `readState` | `(dir: string, fs: FsLike) => ReadResult` | Lê `<dir>/.fg-pipeline.json`; ausente → `missing`; exceção de I/O → `unreadable`; `JSON.parse` falha → `invalid-json`; Zod falha → `invalid-schema` (mensagem resume o 1º campo inválido, sem despejar o conteúdo) |
| `parseState` | `(s: string) => { kind: 'known'\|'step'\|'review'\|'unknown'; ... }` | Reconhece `step_<i>_running\|done`, `review_cycle_<n>`; resto desconhecido não quebra |
| `mapToBoard` | `(state: PipelineState, now: Date) => Board` | Agrupa `steps` por `status` nas 4 colunas (mantendo ordem por `index`); monta `phases`; normaliza `findings`; chama `detectGate`; `stale = status==='running' && now - updatedAt > 5 min` |
| `detectGate` | `(state: PipelineState) => Gate \| null` | `committed` → `push` ("Portão 2: dar push em FING-N?", comando `git push -u origin FING-N`, **só texto, a TUI não executa**); `failed` → `failed` com `failedAt` + `reason`; demais → `null` |
| `tailProgress` | `(text: string, n?: number) => string[]` | Últimas `n` (padrão 15) linhas **não vazias**, `trimEnd`; texto vazio → `[]` |
| `listWorktrees` | `(repoRoot, git, fs) => WorktreeRef[]` | Parse de `git worktree list --porcelain`; mantém só as que têm `.fg-pipeline.json`; preenche `code`/`state` quando legível (senão `null`) |
| `resolveTarget` | `({ dir?, code?, repoRoot, git, fs }) => { kind: 'one', ref } \| { kind: 'many', refs } \| { kind: 'none' } \| { kind: 'not-found', message }` | `--dir` vence tudo (precisa conter `.fg-pipeline.json`); `FING-N` casa por `state.code` ou branch; senão auto |
| `useWatchState` | `(dir, fs, opts?) => { result: ReadResult; activity: string[]; unstable: boolean }` | `fs.watch(dir)` (filtra pelos 2 nomes) com debounce 100 ms + `setInterval` 1 s; só atualiza o estado do React quando o conteúdo mudou; limpa watcher e timer no unmount; mantém último estado válido |

`PhaseBar` — fases fixas: `Card Notion · Spec aprovada · Worktree · Setup · Implementação · Revisão · Commitado · Push`. Mapeamento por `state`: `notion_ready`→1, `spec_approved`→2, `worktree_ready`→3, `setup_done`→4, `step_*`→5, `review_cycle_*`→6, `committed`→7, `pushed`→8; fases anteriores `done`, a atual `current`; `failed` marca a fase em que parou (a partir de `failedAt`; sem match → todas as pendentes ficam como estão e o `GateBanner` explica).

Cores (tokens do Ink, sem hex): Pendente `gray`, Rodando `yellow`, Concluída `green`, Falhou `red`; severidades `critico/alto` `red`, `medio` `yellow`, `baixo` `gray`.

### Comando `fg tui` (`src/scripts/cli/commands/tui.ts`)

```
Uso:
  fg tui [FING-N] [--dir <path>] [--demo] [--once] [--dump]
```

- Valida args (`FING-N` com `/^FING-\d+$/i`; `--dir` não vazio); inválido → `invalid-args` (exit 2).
- Monta e executa via `ctx.exec.run('pnpm', ['--filter', '@financeguy/fg-tui', 'exec', 'tsx', 'src/main.tsx', ...args, '--repo', '.'])` (o `ExecPort` herda stdio, necessário para o raw mode do Ink).
- Pacote sem dependências instaladas (`tools/fg-tui/node_modules` ausente, checado via `ctx.fs.exists`) → `blocked` (exit 3) com a mensagem "Dependências da TUI não instaladas. Rode `pnpm install`."
- Exit code do filho ≠ 0 → `failed`; 0 → `ok` (mensagem vazia).
- Registrado em `COMMANDS`; entra no `helpText`.

## 4. API

Não aplicável (sem endpoints). Interface pública = CLI acima.

`main.tsx` — flags: `--dir`, `--demo`, `--once`, `--dump`, `--repo`, posicional `FING-N`.
- **Sem TTY** (`!process.stdout.isTTY` ou `!process.stdin.isTTY`) → comporta-se como `--dump`.
- `--once` → renderiza o board uma vez em texto (sem raw mode) e sai com 0.
- `--dump` → imprime `JSON.stringify(board, null, 2)` e sai com 0.
- Erros esperados (nenhuma pipeline, `--dir` inválido) → mensagem em pt-BR no stderr/`ErrorView` e exit 1 (nunca stack trace).

## 5. Edge Cases & Tratamento de Erro

| Caso | Tratamento |
|---|---|
| `.fg-pipeline.json` ausente na worktree escolhida | `ErrorView` "Esta worktree não tem estado de pipeline (`.fg-pipeline.json`)." |
| JSON truncado (pipeline gravando) | Mantém último estado válido; se nunca houve, `ErrorView` "Estado ainda sendo gravado, tentando de novo…" e continua tentando (polling) |
| Schema divergente (campo novo/ausente) | `ErrorView` com o 1º campo inválido; campos extras são ignorados (`z.object` não-estrito) |
| `state` desconhecido | Exibido cru no cabeçalho; `PhaseBar` sem fase `current`; sem crash |
| `steps` vazio | Colunas vazias com "—"; cabeçalho mostra o estado |
| `.fg-pipeline.progress.md` ausente/vazio | `ActivityFeed`: "Sem atividade registrada ainda." |
| `progress.md` com linhas muito longas | Truncadas à largura do terminal (`wrap="truncate-end"`) |
| Terminal estreito (< 80 colunas) | Colunas empilhadas verticalmente em vez de lado a lado |
| `--dir` inexistente / sem estado / aponta para fora de uma worktree | `not-found` com mensagem acionável; só os 2 nomes de arquivo fixos são lidos (sem `..` em nomes de arquivo) |
| `git` indisponível ou fora de repositório (`listWorktrees`) | `none` com dica de `--dir`; sem stack trace |
| Duas worktrees com o mesmo `code` | Seletor mostra ambas com o caminho; `FING-N` ambíguo → seletor filtrado |
| Ctrl+C / `q` | Desmonta, fecha watchers/timers, restaura o terminal, exit 0 |
| Windows (`fs.watch` duplicado/ausente) | Debounce 100 ms + polling 1 s garantem a atualização mesmo sem eventos |
| Segredos | A TUI nunca lê `.env`; só exibe campos do estado (`reason`/`findings` podem conter texto livre — exibidos como texto, nunca interpretados) |

## 6. Critérios de Aceitação

Todos verificáveis por teste (Vitest em `tools/fg-tui`, Jest em `src/scripts/cli/__tests__/tui.test.ts`).

1. **schema/readState**: estado válido → `ok`; arquivo ausente → `missing`; JSON inválido → `invalid-json`; campo obrigatório faltando → `invalid-schema` com o nome do campo; campo extra é aceito.
2. **parseState / mapToBoard**: `step_2_running` com 3 etapas → colunas corretas e `PhaseBar` com "Implementação" como `current` e as 4 anteriores `done`; estado desconhecido não lança; etapa `running` com `updatedAt` antigo → `stale: true`.
3. **detectGate**: `committed` → gate `push` com `git push -u origin FING-N`; `failed` → gate com `failedAt` e `reason`; outros → `null`.
4. **tailProgress**: devolve só as últimas N linhas não vazias; texto vazio → `[]`.
5. **normalizeFinding**: aceita chaves em pt-BR (`severidade`, `arquivo`, `linha`, `descrição`) e em inglês; severidade desconhecida → `desconhecido`.
6. **listWorktrees / resolveTarget**: 0 → `none`; 1 → `one`; 2 → `many`; `--dir` prevalece; `FING-N` casa por `code`/branch; `--dir` sem estado → `not-found`.
7. **useWatchState**: reler ao detectar mudança no conteúdo; **não** re-renderiza quando o conteúdo é idêntico; mantém último estado válido diante de JSON inválido (`unstable: true`); limpa watcher/timer no unmount.
8. **Componentes (ink-testing-library)**: `Board` renderiza as 4 colunas com os cards corretos; `Card` mostra agente/modelo/commit curto; `GateBanner` mostra o comando de push; `ErrorView`/seletor/"Nenhuma pipeline" com as mensagens em pt-BR; `←/→/↑/↓` movem a seleção, `Enter` abre e `Esc` fecha o `DetailPanel`, `q` encerra.
9. **main**: `--dump` imprime JSON válido do board; sem TTY age como `--dump`; `--once` renderiza e sai com 0; `--demo` funciona sem nenhuma worktree.
10. **`fg tui` (Jest)**: args inválidos → exit 2; pacote sem `node_modules` → `blocked`/exit 3; sucesso monta o comando `pnpm --filter @financeguy/fg-tui exec tsx src/main.tsx …` com os flags repassados; exit do filho ≠ 0 → `failed`; aparece no `helpText`.
11. **Isolamento**: `npx jest` (raiz) não coleta nada de `tools/`; `pnpm build`/typecheck do app não é afetado (`tools` em `exclude`); `pnpm lint` passa.
12. **Somente leitura**: teste garante que nenhum módulo de `tools/fg-tui/src` importa `writeFile`/`fs.write*`/`child_process` (exceto `listWorktrees` via `GitLike` em `main.tsx`).
13. **Verificação manual (entrega)**: `pnpm fg tui --demo` abre o Kanban com etapas nos 4 estados, painel de atividade e achados; `q` sai limpo.

## 7. Mapa de Execução

| Etapa | Sub-agente | Entrega | Depende de |
|-------|-----------|---------|-----------|
| 1 | `devops-platform-engineer` | Scaffold do pacote `tools/fg-tui` (package.json, tsconfig, vitest.config), `tools/*` no workspace, `tools` em `exclude` do tsconfig raiz e `/tools/` no `testPathIgnorePatterns`, lockfile atualizado, scripts `test`/`typecheck`/`start` | — |
| 2 | `quality-assurance-analyst` | Contratos de tipos (`model/types.ts`, `schema.ts` + stubs) e testes **red**: model (critérios 1–6), hook (7), componentes e teclado (8), main (9), `tui.test.ts` do Jest (10), isolamento/somente leitura (11, 12) | 1 |
| 3a | `backend-engineer` | `model/*` + `demo.ts` + `tailProgress`/`detectGate`/`resolveTarget` (green) — **paralelo a 3b** | 2 |
| 3b | `frontend` | `components/*` + `hooks/useWatchState.ts` + `main.tsx` (green) — **paralelo a 3a** (usa só os tipos de `model/types.ts`) | 2 |
| 4 | `backend-engineer` | `commands/tui.ts` + registro em `index.ts` + `helpText` (green do Jest) | 3a, 3b |
| 5 | `docs-architect` | Edita a **fonte** em `.ai/skills-agents/` (skill `fg-cli` + linha `tui` no `AGENTS.md`), `pnpm fg sync --write`, adendo em `docs/specs/fg-cli.md` e instrução "como testar" | 4 |
| — | (revisão da pipeline) | `project-review` + `security-secret-auditor` (ver abaixo) | 5 |

Revisão (passo 9 da pipeline): `security-secret-auditor` confere ausência de leitura de `.env`, caminhos fixos de arquivo, `spawn` sem injeção e ausência de escrita; `project-review` confere isolamento, Clean Architecture do `model/` e aceite dos critérios §6.

**Validação por etapa** (a pipeline usa estes comandos no lugar do padrão):
- Etapas 1–2: `pnpm --filter @financeguy/fg-tui typecheck` (etapa 2 espera falhas *red* de teste, não de tipo/lint).
- Etapas 3a/3b: `pnpm --filter @financeguy/fg-tui test` + `typecheck`.
- Etapa 4: `npx jest src/scripts/cli` + `pnpm lint`.
- Etapa 5: `pnpm fg sync --check`.
- Final: tudo acima + `npx jest` completo + `pnpm fg tui --demo --once`.

**Commits** (Conventional Commits, `(FING-30)`): 1 `chore(tui)`, 2 `test(tui)`, 3a/3b `feat(tui)`, 4 `feat(cli)`, 5 `docs(tui)`.

**Risco conhecido**: o IMPL usa modelos free; Ink/ESM + Vitest tem arestas (JSX, `ink-testing-library`). Se uma etapa estourar a cadeia, a pipeline para em `failed(step_N)` e é retomável.

**Como testar a entrega**
```bash
pnpm install
pnpm fg tui --demo          # Kanban de exemplo (q sai)
pnpm fg tui --demo --once   # render único, sem raw mode
pnpm fg tui --dump          # JSON do board da pipeline real (ou erro claro se não houver)
pnpm --filter @financeguy/fg-tui test
```

---

## V2 — Detalhe por card, multi-worktree e visual (2026-11-03)

Plano completo e estimativa (poker) no card do Notion (bloco "Versão V2"). Corte V2 = itens 1, 2, 3, 4, 7, 9 (29 pts). A TUI continua **somente leitura**.

### V2.1 Contrato `events.jsonl` (item 1)

- Arquivo fixo `<worktree>/.fg-pipeline.events.jsonl` (entra em `.git/info/exclude`), **append-only**, uma linha JSON por evento, escrito só pelo maestro da pipeline (documentado em `references/state-schema.md`); a TUI apenas lê.
- Evento: `{ ts: string (ISO), step: number | null, type: 'step_started' | 'step_done' | 'step_failed' | 'command' | 'file_changed' | 'finding' | 'note', agent?: string, message: string, data?: Record<string, unknown> }`; campos extras ignorados.
- `model/events.ts` (puro, porta `FsLike`): `parseEvents(text) → { events, skipped }` (linha inválida é contada e ignorada, nunca lança); `readEvents(dir, fs) → { events, skipped }` (arquivo ausente → vazio); `eventsForStep(events, index)` (ordem cronológica); `tailEvents(events, n)`.
- Mensagens são tratadas como texto (passam por `sanitizeText`); nunca lê `.env`.

### V2.2 Detalhe do card (item 2)

`DetailPanel` mostra, por etapa: agente, modelo, sessão curta, commit curto, duração (primeiro `step_started` → `step_done|step_failed`), lista de eventos da etapa (últimos 12), arquivos alterados (`file_changed`) e achados (`finding`) ligados à etapa. Sem eventos → "Sem eventos registrados para esta etapa."

### V2.3 Visual (item 3)

Layout responsivo (< 80 colunas empilha), nada de palavra cortada no meio (`wrap="wrap"` onde há descrição; truncamento só com `…` em campos curtos), paleta consistente (pendente gray, rodando yellow, concluída green, falhou red, destaques cyan), cabeçalho com `code · slug · state`, **rodapé fixo com atalhos** (`←/→ coluna · ↑/↓ card · Enter detalhe · Esc voltar/sair · r recarregar · q sair`).

### V2.4 Multi-worktree (item 4)

`pnpm fg tui --dir A --dir B` (repetível) e `--root <pasta>` (varre subpastas diretas com `.fg-pipeline.json`, sem recursão profunda) abrem um **board agregado**: abas (`Tab`/`Shift+Tab`) uma por worktree + aba "Todas" com uma linha-resumo por pipeline (`FING-N · state · etapa atual · progresso k/n`). Cada aba assiste seu estado (`useWatchState` por worktree, limpando watchers no unmount). `FING-N` e descoberta automática continuam valendo quando não há `--dir`/`--root`.

### V2.5 Contrato de loop (item 7)

Seção "Contrato de loop" em `.claude/skills/fg-pipeline/SKILL.md`: cada laço (validação/correção do passo 8, revisão do passo 9, TESTAR do passo 10) declara **critério de saída**, **orçamento** (máx. tentativas/tempo) e **detecção de estagnação** (mesma falha em N rodadas → parar e escalar). Evento `note` registra cada rodada.

### V2.6 Dívidas da V1 (item 9)

- `--bogus`/valor ausente: mensagem de uso clara em pt-BR (parser global `core/args.ts` `takeValue`).
- Aviso `DEP0190` (spawn com `shell` + args): remover.
- `--dir`: rejeitar symlink e caminhos inexistentes com mensagem acionável.
- Converter os 5 `it.todo` em testes reais ou removê-los com justificativa.
- Pipeline passa a gravar achados da revisão em `review.findings` do estado (docs do `state-schema.md`).

### V2.7 Critérios de aceitação

14. `events`: linha inválida ignorada e contada; arquivo ausente → vazio; `eventsForStep` ordena por `ts`.
15. Detalhe do card exibe duração, eventos, arquivos e achados; vazio tem mensagem.
16. Rodapé de atalhos presente; nenhuma palavra cortada em 60 e 120 colunas.
17. `--dir` repetido e `--root` abrem N abas; `Tab` alterna; watchers limpos no unmount; `--dump` com várias worktrees retorna array.
18. `SKILL.md` documenta o contrato de loop; `fg sync --check` verde.
19. Dívidas da seção V2.6 fechadas, sem `it.todo` pendente.

### V2.8 Mapa de execução

| Fase | Itens | Sub-agente | Arquivos (disjuntos) |
| --- | --- | --- | --- |
| A | 1 events | `backend-engineer` | `tools/fg-tui/src/model/events*.ts`, `references/state-schema.md` |
| A | 3 visual | `frontend` | `tools/fg-tui/src/components/{App,Board,Column,Card,PhaseBar,GateBanner,ActivityFeed,FindingsList,ErrorView,format}*` + novo `Footer.tsx` |
| A | 9 dívidas | `quality-assurance-analyst` | `src/scripts/cli/core/args.ts`, `commands/tui.ts`, `model/{readState,resolveTarget}*`, `main.tsx` (só validação de `--dir`) |
| B | 2 detalhe, 4 multi | `frontend` + `backend-engineer` | `DetailPanel`, `main.tsx`, `App`, novo `model/aggregate*` |
| C | 7 loop | `docs-architect` | `.claude/skills/fg-pipeline/SKILL.md` |

## V3 — DAG, paralelismo e métricas de eficácia (2026-11-03)

Itens 5, 6 e 8 do card do Notion. A TUI continua **somente leitura**.

### V3.1 DAG `dependsOn` (item 5)

- `steps[].dependsOn?: number[]` (índices 1-based, inteiros positivos) no `StepSchema`.
- `model/dag.ts` (puro): `analyzeDag(steps) → { blockedBy, ready, cycle }`. Ignora autorreferência e índices inexistentes; detecta ciclo por DFS (com ciclo, `ready` fica vazio).
- `Card` mostra `⛓ aguarda N, M`; `Board` expõe `ready` e `dagCycle`; `App` avisa em amarelo quando há ciclo.

### V3.2 Paralelismo real (item 6)

Contrato no `SKILL.md` ("Paralelismo por DAG"): o maestro lança juntas todas as etapas prontas, cada uma em background próprio e arquivos disjuntos. A TUI exibe "Prontas para rodar em paralelo: etapa(s) …" e o pico de paralelismo.

### V3.3 Métricas de eficácia (item 8)

`model/metrics.ts` (puro): `computeMetrics(state, events)` → total/done/failed/running, ciclos de revisão, % verde de primeira, duração média por etapa, tempo total e pico de paralelismo; campos sem dado são `null` e aparecem como "—". Exibidas em `MetricsBar`; `--dump` inclui `metrics`.

### V3.4 Critérios de aceitação

20. `analyzeDag`: dependência satisfeita libera a etapa; ciclo, autorreferência e índice inexistente tratados sem lançar.
21. Card bloqueado exibe `aguarda`; `MetricsBar` aparece com ou sem eventos.
22. `computeMetrics` é puro e tolera eventos vazios; `--dump` inclui `metrics` e `dagCycle`.
23. `state-schema.md` e `SKILL.md` documentam `dependsOn`, paralelismo e métricas.

### V3.5 Mapa de execução

| Fase | Itens | Sub-agente | Arquivos |
| --- | --- | --- | --- |
| A | 5 DAG, 8 métricas | `backend-engineer` | `model/{schema,dag,metrics,mapToBoard,types,safeBoard}*` |
| B | 5/8 UI | `frontend` | `components/{Card,MetricsBar,App,LiveApp}*`, `main.tsx` |
| C | 6 contrato | `docs-architect` | `SKILL.md`, `state-schema.md` |
