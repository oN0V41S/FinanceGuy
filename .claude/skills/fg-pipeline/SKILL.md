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

## Fluxo (passos 1–12)

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
   - **Front-end (regra fixa)**: toda alteração ou fix de front-end (UI, estilos, componentes, `tailwind.config.ts`) é **commitada imediatamente** após validar (jest + lint), sem acumular com outras etapas, para que o usuário veja a correção no preview automático da Vercel. O push para o preview fica **pendente até o QA no navegador (passo 10) aprovar**; só então pergunte "dar push para atualizar o preview?". O push continua exigindo "sim" explícito.
9. **REVISAR** — `run-agent.sh --chain REVIEW --agent project-review` e idem `security-secret-auditor`, com `references/review-prompt.md` (Gemini, **somente leitura**, sem `--auto`). Parse o formato `ACHADO | severidade: …`. **Críticos/altos** → voltam à implementação (passo 8, mesmo agente/sessão), **máx. 2 ciclos**; persistindo → pare antes do commit final e deixe o usuário decidir. Médios/baixos só no resumo.
10. **QA NO NAVEGADOR (obrigatório, sempre)** — antes de qualquer entrega, execute a seção "QA no navegador" abaixo via sub-agente. Só avança com `PASSOU`. Estado `qa_browser_passed`.
11. **RESUMO** — branch, commits, achados da revisão e do QA, comandos de push; acrescente o bloco "Execução" ao card (Notion). Estado `committed`.
12. **PUSH (Portão 2, opcional)** — pergunte "dar push em FING-N?". Somente com "sim": `git push -u origin FING-N` (o preview vem da integração Vercel↔GitHub). **A pipeline nunca abre PR** (`pnpm fg pr` fica para o usuário). Cancelar nos portões → estado permanece, nada é publicado.

## QA no navegador (obrigatório, sempre, via sub-agente)

**Regra fixa:** nenhuma tarefa é entregue (RESUMO, push, ou aviso de "pronto") sem QA com `PASSOU`. O meio de teste depende do tipo de tarefa:

- **Tarefa de API** (rotas em `src/app/api/**`, services, repositories sem tela nova): teste com **curl local** contra o servidor da worktree. Não usa o navegador. O sub-agente cobre os endpoints afetados com os casos de sucesso, validação (Zod, 400), não autenticado (401) e não encontrado (404), e confere status e corpo. Mutações (POST/PUT/DELETE) usam dados `ZZTeste` e são apagadas ao fim.
- **Tarefa de UI** (páginas, componentes, estilos): teste no **navegador**, conforme o procedimento abaixo.
- **Tarefa mista**: as duas partes, na mesma etapa de QA.

Procedimento:

1. **Servidor da worktree.** Suba o dev server **da worktree** (porta em `qa.port`, ex.: 3002). Nunca teste o servidor do checkout principal: ele não contém as alterações. Se o servidor da worktree não puder subir, o QA fica **bloqueado** (não aprovado): pare e avise o usuário.
2. **Sub-agente.** Use a ferramenta Agent com `subagent_type: general-purpose`, em primeiro plano, passando no prompt: URL base (`http://localhost:<porta>`), tipo da tarefa (API, UI ou mista), rotas e endpoints afetados (de `git diff --name-only`), critérios de aceitação da spec (seção 6) e o checklist abaixo. Para UI, passe também os viewports (**desktop 1280×800** e **mobile 375×812**) e o tema escuro, e o sub-agente usa as ferramentas do navegador (`mcp__Claude_Browser__*`). Para API, usa curl. Em nenhum caso edita nem commita nada.
3. **Checklist mínimo que o sub-agente executa:**
   - Cada página afetada carrega sem erro no console e sem falha de rede (4xx/5xx inesperados).
   - Cada critério de aceitação da spec é exercido pelo fluxo principal, com interação real (clicar, preencher, filtrar), e o resultado é conferido na tela.
   - Mobile sem overflow horizontal (`scrollWidth > innerWidth` é falha).
   - Tema escuro: bordas de cards e inputs não ficam brancas (regra de `AGENTS.md`: borda branca = classe `border-…/NN` não gerada).
   - Estados de loading, vazio e erro se comportam como a spec descreve, sem quebrar a página.
   - Dados de teste são criados com prefixo `ZZTeste` e **apagados ao fim**. Nunca tocar em dados que não foram criados pelo próprio QA. Credenciais: só a conta de teste local definida na memória de referência; nunca `.env`.
   - Prints salvos em `qa/<FING-N>/` na worktree (não commitados; adicione `qa/` a `.git/info/exclude`).
4. **Relatório.** O sub-agente devolve `PASSOU` ou `FALHOU`, com lista de achados: passo reproduzível, severidade (crítico · alto · médio · baixo) e print. Achado crítico ou alto em fluxo da spec = `FALHOU`.
5. **Decisão.**
   - `PASSOU` → grave `qa.passed: true`, estado `qa_browser_passed`, siga para o RESUMO.
   - `FALHOU` → volte ao passo 8 (agente de implementação, mesma sessão) com o relatório. Máx. **2 ciclos** (`qa.cycles`); esgotou → pare, não entregue, e deixe o usuário decidir. Achados médios/baixos vão só para o RESUMO.
6. **Encerramento.** Pare o servidor de QA ao final, com ou sem aprovação.

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
- **Nunca** entregar (RESUMO, push ou aviso de "pronto") sem QA `PASSOU`: no navegador para UI, com curl para API.
- **Nunca** `prisma db push`; **nunca** abrir PR; push só no Portão 2 com "sim".
- Escrita no Notion só após "ok"; `Concluído` nunca é definido pela pipeline.
- Falha de validação ou cadeia esgotada → estado `failed` com `failedAt` + `reason`, mensagem acionável em pt-BR e retomada possível; nada de uma etapa falha é commitado.
