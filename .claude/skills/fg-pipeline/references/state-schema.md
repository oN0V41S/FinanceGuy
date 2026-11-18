# Schema do `.fg-pipeline.json`

Arquivo de estado da pipeline, gravado na **raiz da worktree** e mantido **fora do git** via `.git/info/exclude`. **Nunca commitar.**

## Exemplo completo

```json
{
  "code": "FING-12",
  "slug": "exemplo",
  "notionPageUrl": "https://app.notion.com/p/…",
  "specPath": "docs/specs/FING-12-exemplo.md",
  "worktree": "../FinanceGuy-FING-12",
  "baseSha": "<sha de origin/main>",
  "state": "step_2_running",
  "steps": [
    {
      "index": 1,
      "agent": "database-engineer",
      "sessionID": "ses_…",
      "model": "…",
      "commit": "<sha>",
      "status": "done"
    }
  ],
  "review": { "cycles": 0, "findings": [] },
  "qa": { "cycles": 0, "passed": false, "port": 3002, "routes": [], "report": null, "screenshots": [] },
  "updatedAt": "2026-10-16T12:00:00Z"
}
```

## Campos

| Campo | Tipo | Descrição |
|---|---|---|
| `code` | `string` | Código do Notion, sempre `FING-<N>` (maiúsculas) |
| `slug` | `string` | Slug da spec (`docs/specs/FING-<N>-<slug>.md`) |
| `notionPageUrl` | `string` | URL do card no Notion |
| `specPath` | `string` | Caminho da spec (relativo à raiz do repositório principal) |
| `worktree` | `string` | Caminho da worktree, relativo ao repo principal (ex.: `../FinanceGuy-FING-12`) |
| `baseSha` | `string` | SHA de `origin/main` usado como base da worktree |
| `state` | `string` (enum) | Estado atual da pipeline (ver "Estados") |
| `steps` | `array` | Uma entrada por etapa do Mapa de Execução da spec (1-based) |
| `steps[].index` | `number` | Índice da etapa (1-based) |
| `steps[].agent` | `string` | Sub-agente OpenCode responsável (ex.: `backend-engineer`) |
| `steps[].sessionID` | `string \| null` | Sessão OpenCode da etapa (`ses_…`); `null` se ainda não rodou |
| `steps[].model` | `string \| null` | Modelo que concluiu a etapa |
| `steps[].commit` | `string \| null` | SHA do commit da etapa; `null` se não commitada |
| `steps[].status` | `string` (enum) | `pending` \| `running` \| `done` \| `failed` |
| `review.cycles` | `number` | Ciclos de revisão executados (máx. 2) |
| `review.findings` | `array` | Achados formatados da revisão (`severidade`, `arquivo`, `linha`, `descrição`, `correção sugerida`) |
| `qa.cycles` | `number` | Ciclos de QA no navegador executados (máx. 2) |
| `qa.passed` | `boolean` | `true` só quando o sub-agente de QA reportou `PASSOU`; obrigatório antes do RESUMO |
| `qa.port` | `number` | Porta do servidor de dev da worktree usada no QA (nunca a do checkout principal) |
| `qa.routes` | `array` | Rotas testadas, derivadas do `git diff` e dos critérios de aceitação da spec |
| `qa.report` | `string \| null` | Relatório resumido do último ciclo de QA (pt-BR) |
| `qa.screenshots` | `array` | Caminhos relativos dos prints salvos em `qa/<FING-N>/` (não commitados) |
| `updatedAt` | `string` | Timestamp ISO 8601 (UTC) da última gravação |
| `failedAt` | `string` | Presente quando `state` é `failed`: etapa/marco que falhou (ex.: `failed(setup)`, `failed(step_2)`) |
| `reason` | `string` | Motivo legível da falha, em pt-BR |

## Estados

Ciclo de vida do campo `state`:

```text
intake → notion_ready → spec_approved → worktree_ready → setup_done
  → step_<i>_running → step_<i>_done
  → review_cycle_<n>
  → qa_browser_<n> → qa_browser_passed
  → committed → pushed (opcional)
failed (com failedAt + reason)
```

| Estado | Significado |
|---|---|
| `intake` | Entrada recebida; card/spec ainda não resolvidos |
| `notion_ready` | Card criado/encontrado; `FING-N` obtido |
| `spec_approved` | Spec aprovada pelo usuário (Portão 1) |
| `worktree_ready` | Worktree `../FinanceGuy-FING-N` criada a partir de `origin/main` |
| `setup_done` | `pnpm install --frozen-lockfile` + `npx prisma generate` concluídos |
| `step_<i>_running` | Etapa `i` em execução via OpenCode |
| `step_<i>_done` | Etapa `i` validada (jest + lint) e commitada |
| `review_cycle_<n>` | Ciclo `n` de revisão em andamento (máx. 2) |
| `qa_browser_<n>` | Ciclo `n` de QA no navegador em andamento via sub-agente (máx. 2) |
| `qa_browser_passed` | QA no navegador `PASSOU`; a entrega (RESUMO) pode começar |
| `committed` | Todos os commits da pipeline concluídos e QA aprovado; aguardando decisão de push (Portão 2) |
| `pushed` | Push para `origin/FING-N` realizado (opcional, só com confirmação) |
| `failed` | Falha irreversível no momento; `failedAt` + `reason` explicam onde e por quê; retomável |

## Retomada

Ao receber `FING-N` e encontrar a worktree com `.fg-pipeline.json`:

1. Ler o estado e mostrar: "última etapa concluída: **X**; retomar de **Y**?".
2. Continuar **somente** com confirmação explícita do usuário.
3. Sem `.fg-pipeline.json` (worktree órfã) → abortar e perguntar; **nunca sobrescrever**.
