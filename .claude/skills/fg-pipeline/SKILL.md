---
name: fg-pipeline
description: Pipeline tarefa → grill-me (SPEC) → worktree a partir de main → implementação e revisão via OpenCode headless → commits. Use quando o usuário pedir "/fg-pipeline", "rodar a pipeline", "spec + implementação em worktree" ou apontar uma tarefa/FING-N para executar de ponta a ponta. Disparo manual: cria worktree, escreve no Notion e consome tokens.
---

# `fg-pipeline` — tarefa → spec → worktree → implementação → commits

Você (Claude) é o **maestro**: orquestra, valida e commita. O **OpenCode headless** executa as etapas de implementação (modelos free) e de revisão (modelos Gemini). Spec: `docs/specs/FING-26-fg-pipeline.md`. Scripts e templates desta skill: `scripts/run-agent.sh`, `references/`.

## Argumentos

```
/fg-pipeline <texto livre | FING-N | docs/specs/...md> [--dry-run]
```

- **Texto livre** → cria card no Notion (com confirmação), obtém `FING-N`, faz grill-me.
- **`FING-N`** → lê o card no Notion; se existir worktree + estado, oferece **retomar**.
- **Caminho de spec** em `docs/specs/` → pula o grill-me (spec já aprovada).
- **`--dry-run`** → imprime o plano completo (branch, worktree, etapas, agentes, cadeias, propriedades do Notion) e **não** cria nada: sem página, sem worktree, sem `opencode run` (apenas diz que o monitor seria lançado).

## Pré-voo (antes de qualquer efeito colateral)

1. `opencode --version` e `opencode auth list` — OpenCode ≥ 1.18.32; se faltar credencial (`OpenCode`, `OpenRouter`, `Google`), avise qual cadeia fica degradada.
2. `opencode agent list` — confirma os agentes usados com `mode: all`.
3. `git fetch origin main` — se `origin/main` inacessível, pare (não criar worktree de `main` local desatualizado sem confirmação).
4. Notion MCP acessível (banco "Gestão do Projeto"); indisponível → pare antes da worktree e ofereça seguir com código manual.
5. Verifique retomada: entrada `FING-N` com worktree + `.fg-pipeline.json` → mostrar "última etapa concluída: X; retomar de Y?" e seguir só com confirmação (ver `references/state-schema.md`). Worktree órfã sem estado → abortar; **nunca sobrescrever**.

## Fluxo (passos 1–11)

Siga o mapeamento de propriedades do card e do corpo da página em `references/notion-card.md` — não duplique aqui.

1. **INTAKE** — resolva a entrada em `{texto | FING-N | spec existente}`.
2. **NOTION (criação)** — sem código: infera `Side` pela routing table, **mostre os campos e peça "ok"** antes de criar a página (escrita visível a outras pessoas). Após criar, leia o `Código` (auto) e monte `FING-N` (`26` → `FING-26`). `FING-N` inexistente no Notion → avisar e perguntar se quer criar um novo card.
3. **GRILL-ME** — invoque a skill `grill-me` e gere `docs/specs/FING-N-<slug>.md` (pule se a entrada já era uma spec).
4. **PORTÃO 1 — aprovação da spec** — o usuário aprova **explicitamente**. Sem aprovação, nada avança.
5. **NOTION (spec)** — `Status` → `Em andamento`; corpo da página = conteúdo integral da spec + link do caminho; `Links` = caminho da spec.
6. **WORKTREE** — `git worktree add ../FinanceGuy-FING-N -b FING-N origin/main` (o checkout principal nunca é tocado; alterações não commitadas nele são ignoradas).
7. **SETUP** — na worktree: `pnpm install --frozen-lockfile`, `npx prisma generate`; grave `.fg-pipeline.json` (schema em `references/state-schema.md`) e adicione-o a `.git/info/exclude`. Falha aqui → estado `failed(setup)`; variável de ambiente faltando → informe **qual**, sem procurar `.env`.
8. **IMPLEMENTAR** — antes disso, lance o **agente monitor** (seção abaixo). Para cada etapa do Mapa de Execução da spec:
   - Preencha `references/impl-prompt.md` (placeholders `{{…}}`) e rode `scripts/run-agent.sh --chain IMPL --agent <agente> --dir <worktree> --prompt-file <prompt>` — **cada `opencode run` como tarefa em background própria** (ver monitor). Uma sessão OpenCode **por etapa**.
   - **Valide**: `npx jest <relacionado>` + `pnpm lint` na worktree. Falha → devolva o erro ao mesmo agente/sessão (use `--session <id>`; até 2×) → depois troque de modelo na mesma sessão (`--start-at`) → depois pare sem commitar.
   - Compare `git diff --name-only` com os arquivos previstos da etapa; extras aparecem no resumo e são revertidos só com confirmação.
   - **Commit por etapa**: Conventional Commits com o código e `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, ex.: `feat(transactions): ... (FING-12)`. O Claude commita, nunca o agente.
9. **REVISAR** — `run-agent.sh --chain REVIEW --agent project-review` e idem `security-secret-auditor`, com `references/review-prompt.md` (Gemini, **somente leitura**, sem `--auto`). Parse o formato `ACHADO | severidade: …`. **Críticos/altos** → voltam à implementação (passo 8, mesmo agente/sessão), **máx. 2 ciclos**; persistindo → pare antes do commit final e deixe o usuário decidir. Médios/baixos só no resumo.
10. **RESUMO** — branch, commits, achados, comandos de push; acrescente o bloco "Execução" ao card (Notion). Estado `committed`.
11. **PUSH (Portão 2, opcional)** — pergunte "dar push em FING-N?". Somente com "sim": `git push -u origin FING-N` (o preview vem da integração Vercel↔GitHub). **A pipeline nunca abre PR** (`pnpm fg pr` fica para o usuário). Cancelar nos portões → estado permanece, nada é publicado.

## `run-agent.sh` (uso)

```bash
.claude/skills/fg-pipeline/scripts/run-agent.sh \
  --chain <IMPL|REVIEW> --agent <nome> --dir <worktree> --prompt-file <arquivo> \
  [--session <ses_id>] [--start-at <índice-do-modelo>] [--title <texto>] [--timeout <s>]
```

- Cadeias em `scripts/chains.conf`: **IMPL** = modelos free (ordem da spec §2.2); **REVIEW** = Gemini (`gemini-3.8-flash → 3.7-flash → 3.5-flash-lite → 3.1-flash-lite`).
- O script faz fallback automático entre modelos, reutiliza a sessão com `-s <id>` capturado do JSON (**nunca use `-c`**: em chamadas paralelas pega a sessão errada), espera 5 s entre tentativas e detecta falha por exit ≠ 0, `Error:`/`Request too large`/rate limit ou texto vazio.
- stdout = uma linha JSON (`ok`, `sessionID`, `model`/`lastModel`, `attempts`, `text`/`error`); exit `0` ok · `1` cadeia falhou · `2` args inválidos. Guarde `sessionID`/`model` no `.fg-pipeline.json`.

## Agente monitor (paralelo, spec §3.4b)

Ao iniciar o passo 8, lance **um agente Claude somente leitura em background** (`run_in_background: true`, modelo barato como `haiku`):
- A cada ~30 s observe `git status --short`, `git diff --stat`, arquivos novos, `out/*.json|.err` e o `.fg-pipeline.json`; grave o painel em `.fg-pipeline.progress.md` (em `.git/info/exclude`, nunca commitado).
- **Nunca** edita o repositório, commita, inicia `opencode` ou lê `.env`.
- Encerra após 2 min sem saída dos agentes ou 25 min; relatório final ≤ 5 linhas.
- **Regra de lançamento**: cada `opencode run` (via `run-agent.sh`) roda como **tarefa em background própria** do maestro; `cmd &` solto morre com o shell e deixa saída vazia.
- Ao reportar andamento, leia `.fg-pipeline.progress.md`.

## Retomada e estado

- Estado em `.fg-pipeline.json` na raiz da worktree — schema e máquina de estados em `references/state-schema.md`. Atualize após cada transição (etapa, commit, ciclo de revisão).
- Reexecutar com o mesmo `FING-N` → retomar do estado gravado, com confirmação.

## Segurança (invioláveis)

- **Nunca** ler, copiar ou editar `.env` (nem prompts nem logs registram segredos).
- **Nunca** `--auto` por padrão (nem revisores); se uma etapa travar em permissão, mostre o comando bloqueado e pergunte antes de reexecutar com `--auto` (só dentro da worktree, `--dir` explícito).
- **Nunca** `prisma db push`; **nunca** abrir PR; push só no Portão 2 com "sim".
- Escrita no Notion só após "ok"; `Concluído` nunca é definido pela pipeline.
- Falha de validação ou cadeia esgotada → estado `failed` com `failedAt` + `reason`, mensagem acionável em pt-BR e retomada possível; nada de uma etapa falha é commitado.
