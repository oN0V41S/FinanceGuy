# FING-30 — Versão Final: orquestrador de worktrees agnóstico de agente (proposta)

> Status: **Draft para refinamento** (2026-11-03). Nada aqui foi implementado. Escrita no Notion só após "ok".

## 1. Problema

Orquestrar **várias worktrees de um mesmo projeto**, cada uma com **qualquer agente** (OpenCode, Claude Code, Pi, Codex…), e **ver e controlar** tudo de um só lugar. Hoje a TUI é somente leitura, mostra uma worktree por vez de forma confusa, e controlar (parar, revisar, incrementar spec) exige voltar ao chat do maestro.

## 2. REA — Avaliação Rápida de Evidências

Pergunta: *quais padrões de mercado resolvem orquestração multi-worktree/multi-agente e controle pela TUI, e quais cabem no fg-pipeline?*
Método: busca web (2026-11), docs oficiais do Pi (`docs/sdk.md`, `docs/rpc.md`), leitura do código atual. Confiança: **média** (várias fontes são agregadores secundários).

| Solução | Modelo | O que aproveitar | Evidência |
|---|---|---|---|
| Claude Squad (Go, TUI) | tmux + 1 worktree por agente | sessão por worktree, attach/detach, pause/resume | média |
| Conductor (macOS) | app nativo, worktree por agente, painel de diff | **revisão de diff por worktree** antes do merge | média |
| Vibe Kanban | Kanban → arrastar card inicia agente na branch | **card = tarefa = worktree**; agnóstico de agente | média (descontinuado pela Bloop, comunidade mantém) |
| amux, lazyworktree | TUI Go, workspace-first, paleta de comandos | **paleta mostra o atalho** (ensina teclas) | média |
| lazygit / k9s | painéis com foco, `?` contextual, `:` comando | ajuda filtrada pelo painel ativo, Esc sempre volta | alta |
| Pi (`pi-coding-agent`, MIT) | SDK Node + modo RPC JSONL | `prompt`/`steer`/`followUp`/`abort`, eventos `agent_settled`, `fork`, `switch_session`, multi-provedor | alta (docs oficiais) |
| `@inkjs/ui` | componentes Ink (Select, MultiSelect, ConfirmInput, Spinner, Badge, Alert, ProgressBar) + tema | substituir componentes caseiros; `useFocus`/`useFocusManager` do Ink para foco real | alta |

Achados-chave:
1. **Unidade de trabalho = card = worktree = sessão de agente.** Todos os líderes convergem nisso.
2. **Controle precisa de um adaptador por agente**; o fg hoje fala só com OpenCode via `run-agent.sh`.
3. **Pi resolve o controle fino** (parar, redirecionar, continuar) com API estável e provedores múltiplos, sem acoplar ao OpenCode.
4. **UX boa em TUI** = foco visível, painéis fixos, ajuda contextual (`?`), paleta (`:`/Ctrl+K), confirmação para ações destrutivas.

## 3. Auditoria UX/UI da TUI atual (problemas reais)

| # | Problema | Evidência | Gravidade |
|---|---|---|---|
| U1 | Cards com largura fixa (~20 col) truncam agente ("docs-archit…") mesmo em 140 colunas | render `--demo --once` idêntico em 60/100/140 | alta |
| U2 | Atividade + Achados no topo empurram o Kanban para fora da tela | demo: Kanban começa na linha ~22 | alta |
| U3 | Foco só por `›`; sem borda/realce consistente nem indicação do painel ativo | render | alta |
| U4 | Detalhe substitui a tela (modo), perde contexto do board | uso | média |
| U5 | Multi-worktree: aba "Todas" é texto plano, sem progresso visual nem status colorido | `--dir A --dir B` | média |
| U6 | Sem ajuda contextual (`?`), sem paleta, rodapé estático | render | média |
| U7 | Progresso desatualizado (`.progress.md`) mostrado sem selo de "obsoleto" | estado real FING-30 | média |
| U8 | Nenhuma ação: não dá para parar/revisar/incrementar | por design (V1–V3 read-only) | alta (para o objetivo final) |

## 4. Análise: Pi Core para Parar / Revisar / Incrementar pela TUI

**Viável.** Duas formas de integração:

- **A. SDK embutido** (`createAgentSession({ cwd: worktree, model, sessionManager })`): a TUI já é Node/ESM, então chama `session.abort()`, `session.steer(texto)`, `session.followUp(texto)`, `session.prompt(...)` e assina eventos (`message_update`, `agent_settled`). Mais simples, mas a sessão morre com a TUI.
- **B. RPC (`pi --mode rpc`) como processo filho por worktree** (recomendado): JSONL em stdin/stdout; comandos `prompt`, `steer`, `follow_up`, `abort`, `get_state`, `fork`, `switch_session`, `set_model`. O agente **sobrevive** se a TUI fechar (rodar via daemon leve), e o mesmo protocolo vale para outros agentes por adaptador.

Mapeamento das ações:

| Ação na TUI | Pi | Efeito na pipeline |
|---|---|---|
| **Parar** etapa | `abort` | `step_failed` (motivo "parado pelo usuário"), estado `failed(step_i)` retomável |
| **Revisar** etapa/spec | nova sessão read-only (`tools` só leitura) com `review-prompt.md` | eventos `finding`; achados em `review.findings` |
| **Incrementar** spec/etapa | `follow_up`/`steer` com texto digitado; para spec, `fork` da sessão e patch em `docs/specs/…` | evento `note`; nova versão no card (padrão doc-writer) |
| Trocar modelo/provedor | `set_model` | registra `model` no estado |

Riscos e mitigação:
- **Quebra do "somente leitura"** → separar em pacote `fg-control` com **porta** (`AgentPort`), a TUI continua lendo arquivos; ações passam por confirmação (`ConfirmInput`) e log de eventos.
- **Segredos** → credenciais pelo `/login` do Pi / `modelRuntime`; a TUI nunca lê `.env` nem exibe chaves.
- **Duplo maestro** (Claude + TUI escrevendo estado) → lock de arquivo `.fg-pipeline.lock` + escrita atômica; só o dono do lock grava.
- **API do Pi ainda móvel** (pacote mudou de `@mariozechner` para `@earendil-works`) → fixar versão e cobrir com testes de contrato do adaptador.

## 5. Arquitetura alvo

```text
fg-tui (Ink, UI)  ──lê──▶  .fg-pipeline.json / events.jsonl / progress.md   (por worktree)
      │ ações
      ▼
fg-control (porta AgentPort: start · stop · steer · followUp · review · state)
      ├─ adapter pi-rpc      (pi --mode rpc, recomendado)
      ├─ adapter opencode    (run-agent.sh existente)
      └─ adapter claude-code (headless -p, só start/stop)
      │ escreve
      ▼
estado + events.jsonl (escrita atômica, lock)  ◀── worktree manager (git worktree add/list/remove)
```

## 6. Poker plan (Fibonacci, 2 rodadas internas)

| # | Item | R1 | R2 | Final | Nota da 2ª rodada |
|---|---|---|---|---|---|
| F1 | Redesign layout: painéis fixos (lista worktrees · Kanban · detalhe lateral), cards elásticos | 8 | 8 | **8** | resolve U1–U4 |
| F2 | Foco real (`useFocusManager`), `?` contextual, paleta `:`/Ctrl+K com atalhos | 5 | 5 | **5** | padrão lazygit |
| F3 | Migrar para `@inkjs/ui` + tema único | 3 | 5 | **5** | testes de snapshot mudam |
| F4 | Aba "Todas" como tabela com barra de progresso e status colorido; selo de obsoleto | 3 | 3 | **3** | U5, U7 |
| F5 | `fg-control` + `AgentPort` + lock/escrita atômica | 8 | 8 | **8** | base de todas as ações |
| F6 | Adapter Pi RPC (start/stop/steer/followUp/state) + testes de contrato com stub | 8 | 13 | **13** | protocolo + processo filho no Windows |
| F7 | Ações na TUI: Parar, Revisar, Incrementar (com `ConfirmInput` e eventos) | 8 | 8 | **8** | depende de F5/F6 |
| F8 | Worktree manager: criar/remover worktree pela TUI a partir de um FING-N | 5 | 5 | **5** | `git worktree` + checagem de sujeira |
| F9 | Adapters OpenCode e Claude Code (subset) | 5 | 5 | **5** | agnóstico de agente |
| F10 | Diff por worktree (estilo Conductor) no painel de detalhe | 5 | 3 | **3** | só `git diff --stat` + arquivo selecionado |
| F11 | Docs, spec, skill, e2e com ink-testing-library | 3 | 3 | **3** | |
| | **Total** | | | **66 pts** | |

Corte sugerido: **Final-A (UX)** F1–F4 = 21 pts · **Final-B (controle Pi)** F5–F7 = 29 pts · **Final-C (agnóstico)** F8–F11 = 16 pts.

## 7. Mapa de execução (sub-agentes, sequência e paralelo)

| Onda | Paralelo | Itens | Sub-agente | Arquivos (disjuntos) | Depende de |
|---|---|---|---|---|---|
| 0 | — | Spike Pi RPC (1 dia, descartável): `pi --mode rpc` no Windows, abort/steer | `solutions-architect` | scratch | — |
| 1 | ✅ | F1+F3 layout e componentes | `frontend` | `tools/fg-tui/src/components/**` | — |
| 1 | ✅ | F5 `fg-control` + `AgentPort` + lock | `backend-engineer` | novo `tools/fg-control/**` | 0 |
| 2 | ✅ | F2 foco/ajuda/paleta, F4 aba Todas | `frontend` | `components/{Help,Palette,MultiApp}*` | 1 (F1) |
| 2 | ✅ | F6 adapter Pi | `backend-engineer` | `tools/fg-control/src/adapters/pi*` | 1 (F5) |
| 3 | ✅ | F7 ações na TUI | `frontend` + `backend-engineer` | `components/Actions*`, `hooks/useControl*` | 2 |
| 3 | ✅ | F8 worktree manager, F9 adapters | `devops-platform-engineer` | `tools/fg-control/src/{worktree,adapters/opencode,adapters/claude}*` | 1 (F5) |
| 4 | — | F10 diff, F11 docs | `frontend`, `docs-architect` | `DetailPanel`, `docs/`, `.claude/skills/fg-pipeline` | 3 |
| 5 | — | Revisão + segurança + QA (verificador ≠ executor) | `project-review`, `security-secret-auditor`, `quality-assurance-analyst` | read-only | 4 |

Contrato de loop: cada onda sai com vitest + tsc + jest CLI + lint + `fg sync --check` verdes; orçamento 2 rodadas de fix por onda; mesma falha 2× ⇒ escalar.

## 8. Decisões pendentes (para o usuário)

1. Aprovar Pi RPC como adaptador principal de controle (vs. só SDK embutido)?
2. Ordem do corte: começar por **Final-A (UX)** ou pelo **spike Pi**?
3. A TUI deixa de ser estritamente "somente leitura" (ações com confirmação). Ok?

## Fontes

- Pi: [docs/sdk.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/sdk.md), [docs/rpc.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/rpc.md), [coding-agent README](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent), [Pi Mono field guide](https://agents-buttonscli.pages.dev/field-guide/pi)
- Orquestradores: [agentsroom.dev — multi-agent tools](https://agentsroom.dev/de/blog/best-multi-agent-coding-tools), [nevercodealone — worktrees agnósticos](https://nevercodealone.de/glossare/ki-tools-2026/git-worktrees-ohne-claude-code-agnostische-ki-agenten-2026), [amux](https://awesome.ecosyste.ms/projects/github.com%2Fandyrewlee%2Famux)
- UX TUI: [Ink README](https://github.com/vadimdemedes/ink/blob/675b456b74e69f7869a0fc238b35077154d8f454/readme.md), [@inkjs/ui](https://awesome.ecosyste.ms/projects/github.com%2Fvadimdemedes%2Fink-ui), [Monospace TUI keyboard standard](https://coreyt.github.io/monospace-design-tui/standard/keyboard/), [lazyworktree keybindings](https://chmouel.github.io/lazyworktree/docs/core/navigation-and-keybindings/), [lazygit guide](https://jdriven.com/blog/2026/04/Lazygit/)

## Atualização — Spike Pi e Final-A

- **Spike Pi (concluído, fora do repo):** `node …/dist/cli.js --mode rpc` no Windows responde JSONL; `get_state`, `get_available_models` e `abort` funcionam. `prompt` real contra um provedor **não** foi testado.
- **Final-A entregue:** F1 colunas elásticas + detalhe lateral (≥110 colunas) + Atividade/Achados compactos; F2 ajuda `?` e paleta `:`/Ctrl+K (sem `useFocusManager`: o foco visível é a seleção do card); F3 `@inkjs/ui` 2.0.0 + `theme.ts`; F4 aba "Todas" com barra de progresso, % e selo "⚠ sem atualização".
