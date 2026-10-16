# Spec: Skill `fg-pipeline` (tarefa → grill-me → SPEC → worktree → implementação via OpenCode)

**Status**: Draft
**Versão**: 1.0
**Última atualização**: 2026-10-16

---

## 1. Visão Geral

Skill local em `.claude/skills/fg-pipeline/` que transforma uma tarefa apontada pelo usuário em um commit pronto para preview, em um fluxo único:

```
Tarefa (texto livre ou FING-N)
  → card no Notion (cria se não existir; pega o código FING-N)
  → grill-me → docs/specs/FING-N-<slug>.md   [portão 1: usuário aprova a spec]
  → spec copiada para o corpo da página do Notion
  → worktree nova a partir de origin/main, branch FING-N
  → implementação por etapa via /opencode-cli (sub-agentes .opencode, modelos free)
  → revisão via /opencode-cli (project-review + security-secret-auditor, modelos Gemini)
  → commits (um por etapa)                   [fim da pipeline]
  → pergunta se faz push (preview Vercel)    [portão 2: usuário confirma]
```

O Claude (sessão atual) é o **maestro**: conduz o grill-me, cria a worktree, valida cada etapa e commita. O OpenCode (headless) **executa** as etapas de implementação e de revisão.

### 1.1 Objetivo de Negócio
- Padronizar o caminho tarefa → spec aprovada → código testado, mantendo o Spec-first + TDD do projeto.
- Gastar pouco: implementação e revisão rodam em modelos free/baratos via OpenCode; o Claude só orquestra e valida.
- Rastreabilidade: todo trabalho tem um código `FING-N` no Notion, que vira nome de branch, de worktree, de spec e escopo de commit.
- Terminar num estado revisável: branch commitada, pronta para `git push` e preview no Vercel.

### 1.2 Dependências
- Skills: `grill-me` (spec), `opencode-cli` (invocação headless, cadeia de modelos, handoff `-c/-s`), `fg-cli` (`pnpm fg route`, `pnpm fg spec new`, `pnpm fg pr`).
- OpenCode ≥ 1.18.32 com credenciais `OpenCode`, `OpenRouter` e `Google` (`opencode auth list`).
- Agentes em `.opencode/agents/*.md`, todos com `mode: all` (obrigatório: `opencode run --agent` recusa `subagent`).
- Notion MCP com acesso ao banco "Gestão do Projeto" (`collection://334d3856-092b-83dc-842f-874864bcd670`).
- `git` com remoto `origin`, `pnpm`, Git Bash (o script é bash).

### 1.3 Referências
- `CLAUDE.md` (worktrees, regras críticas), `docs/git-workflow.md`, `.opencode/AGENTS.md`, `.opencode/AUDIT.md`
- `.claude/skills/opencode-cli/SKILL.md` (seções "Sub-agents via headless", "Fallback de modelos", "Continuar a tarefa com outro modelo")
- `docs/specs/fg-cli.md` (esqueleto de spec e padrão de skill)
- `src/features/ai/config.ts` (ordem Gemini do app)

### 1.4 Decisões fechadas na grelha

| # | Decisão |
|---|---------|
| Q1 | Nome `fg-pipeline`; disparo **manual** (`/fg-pipeline <tarefa>`), nunca automático (cria worktree, escreve no Notion e gasta tokens). |
| Q2 | Entrada: texto livre **ou** código `FING-N` (a skill lê a descrição no Notion) **ou** caminho de spec já aprovada em `docs/specs/` (pula o grill-me). |
| Q3 | Claude orquestra; OpenCode executa. Sem delegar a pipeline inteira ao `tech-lead` do OpenCode. |
| Q4 | OpenCode na **implementação** (modelos free) e na **revisão** (`project-review` + `security-secret-auditor` em modelos **Gemini**). O grill-me fica no Claude. |
| Q5 | A pipeline termina no **commit**. Não abre PR. O push (para o preview do Vercel) só ocorre com confirmação explícita no fim. Portões de aprovação: spec, criação do card no Notion e push. |
| Q6/Q7 | Branch = apenas o código do Notion: `FING-N` (maiúsculas). Worktree em `../FinanceGuy-FING-N`, a partir de `origin/main` após `git fetch origin main`. O CI mantém `feat/**`, `fix/**`, `refactor/**` e **adiciona** `'FING-*'`. |
| Q8 | Sem código na entrada → cria a página no Notion **antes** do grill-me. Preenche as propriedades e, depois da aprovação, o **corpo da página com a spec**. |
| Q9 | Push só após confirmação; nunca abre PR. |
| Q10 | Achados **críticos/altos** da revisão voltam ao agente de implementação, no máximo 2 ciclos; médios/baixos só no resumo. Revisores rodam em modo leitura. |
| Q11 | A pipeline roda `pnpm install --frozen-lockfile` e `npx prisma generate` na worktree. Nunca lê/copia `.env`. Nunca roda `prisma db push`. |
| Q12 | Estrutura `SKILL.md` + `scripts/` + `references/`. |
| Q13 | Estado em `.fg-pipeline.json` na worktree; reexecutar com o mesmo código oferece **retomar**. |
| Q14 | Uma sessão OpenCode **por etapa**; `-s` só para troca de modelo dentro da mesma etapa. |
| Q15 | Falha de validação: devolve o erro ao mesmo agente/sessão (até 2×), depois troca de modelo na mesma sessão, depois para sem commitar. |
| Q16 | Um commit por etapa do mapa de execução, Conventional Commits com o código (`feat(transactions): ... (FING-12)`). Quem commita é o Claude. |
| Q17 | A skill tem modo `--dry-run` e um teste de ponta a ponta numa tarefa trivial de documentação. |

---

## 2. Arquitetura

### 2.1 Estrutura de Arquivos

```
.claude/skills/fg-pipeline/
├── SKILL.md                      # frontmatter + fluxo + regras (o maestro lê isto)
├── scripts/
│   ├── run-agent.sh              # chama `opencode run` com cadeia de fallback e handoff por sessão
│   ├── chains.conf               # cadeias de modelos: IMPL (free) e REVIEW (Gemini)
│   ├── __tests__/run-agent.test.sh   # testes do script com `opencode` falso no PATH
│   └── fixtures/opencode-stub.sh     # simula `opencode run --format json` (sucesso/erro/vazio)
└── references/
    ├── impl-prompt.md            # template do prompt de implementação por etapa
    ├── review-prompt.md          # template do prompt de revisão
    ├── notion-card.md            # mapeamento de propriedades + formato do corpo da página
    └── state-schema.md           # schema do .fg-pipeline.json

docs/specs/FING-<N>-<slug>.md     # spec gerada (uma por tarefa)
.github/workflows/test.yml        # + 'FING-*' no push.branches
docs/git-workflow.md              # + regra: branches de tarefa = FING-N
.opencode/AGENTS.md               # + menção à skill fg-pipeline
```

Chamadas de outros arquivos não se aplicam: a skill é autocontida. `chains.conf` é a única fonte das cadeias usadas pelo script; `opencode-cli/SKILL.md` documenta as mesmas cadeias para consulta humana.

### 2.2 Fluxo de Dados

```
 1. INTAKE        entrada → {texto | FING-N | spec existente}
 2. NOTION        sem código? mostrar campos → "ok" do usuário → criar página → ler Código → FING-N
 3. GRILL-ME      invocar skill grill-me → docs/specs/FING-N-<slug>.md          (pula se spec já aprovada)
 4. PORTÃO 1      usuário aprova a spec (explícito)
 5. NOTION        Status=Em andamento; corpo da página = spec; Links = caminho da spec
 6. WORKTREE      git fetch origin main; git worktree add ../FinanceGuy-FING-N -b FING-N origin/main
 7. SETUP         pnpm install --frozen-lockfile; npx prisma generate; gravar .fg-pipeline.json
 8. IMPLEMENTAR   para cada etapa do "Mapa de Execução" da spec:
                    run-agent.sh --chain IMPL --agent <agente> → validar (jest + lint) → commit
 9. REVISAR       run-agent.sh --chain REVIEW --agent project-review ; idem security-secret-auditor
                    achados críticos/altos → volta ao passo 8 (agente de implementação), máx. 2 ciclos
10. RESUMO        branch, commits, achados, comandos de push; PERGUNTA: "dar push em FING-N?"
11. PUSH (opc.)   git push -u origin FING-N   (somente com "sim"); lembrar que o preview vem da integração Vercel↔GitHub
```

Cadeias (em `chains.conf`):

```
IMPL   (free, em ordem): opencode/mimo-v2.6-flash-free · opencode/longcat-2.5-preview-free · opencode/beam-free ·
                          openrouter/xingchen-agi/xing4.0-29b-a4b:free · openrouter/poolside/laguna-xs-2.1:free ·
                          openrouter/openrouter/free · openrouter/nvidia/nemotron-3-ultra-550b-a55b:free ·
                          openrouter/nvidia/nemotron-3.5-lightning:free · openrouter/nvidia/nemotron-3.5-super-vl:free
REVIEW (Gemini, mesma ordem de src/features/ai/config.ts):
                          google/gemini-3.8-flash · google/gemini-3.7-flash ·
                          google/gemini-3.5-flash-lite · google/gemini-3.1-flash-lite
```

### 2.3 Estados da pipeline (`.fg-pipeline.json`)

`intake` → `notion_ready` → `spec_approved` → `worktree_ready` → `setup_done` → `step_<i>_running|done` → `review_cycle_<n>` → `committed` → `pushed` (opcional) · `failed` (com `failedAt`, `reason`).

Retomada: ao receber `FING-N` e encontrar a worktree + estado, a skill lê o estado, mostra "última etapa concluída: X; retomar de Y?" e só continua com confirmação.

---

## 3. Componentes / Contratos

### 3.1 `SKILL.md` (frontmatter)
```yaml
---
name: fg-pipeline
description: Pipeline tarefa → grill-me (SPEC) → worktree a partir de main → implementação e revisão via OpenCode headless → commits. Use quando o usuário pedir "/fg-pipeline", "rodar a pipeline", "spec + implementação em worktree" ou apontar uma tarefa/FING-N para executar de ponta a ponta. Disparo manual: cria worktree, escreve no Notion e consome tokens.
---
```
Argumentos aceitos: `<texto livre | FING-N | docs/specs/...md>` e `--dry-run`.

### 3.2 `scripts/run-agent.sh`

```
run-agent.sh --chain <IMPL|REVIEW> --agent <nome> --dir <worktree> --prompt-file <arquivo>
             [--session <ses_id>] [--start-at <índice-do-modelo>] [--title <texto>] [--timeout <s>]
```
- Para cada modelo da cadeia: `timeout <s> opencode run --agent <nome> -m <modelo> --dir <dir> --format json [-s <sessão>] "$(cat prompt-file)"`; espera 5 s entre tentativas.
- Falha = exit ≠ 0, **ou** saída contendo `Error:`/`Request too large`/rate limit, **ou** texto final vazio (o OpenCode pode sair com 0 mesmo com erro — validar o conteúdo, não só o exit code).
- Captura `sessionID` do primeiro evento JSON; na tentativa seguinte reutiliza `-s <sessionID>` (o novo modelo herda as etapas já feitas).
- Revisores (`REVIEW`) **nunca** recebem `--auto`. Implementação também não usa `--auto` por padrão (ver 5, "Permissões").
- Saída (stdout, uma linha JSON): `{"ok":true,"sessionID":"ses_…","model":"…","attempts":2,"text":"…"}` ou `{"ok":false,"sessionID":"…","lastModel":"…","attempts":N,"error":"…"}`. Logs de diagnóstico vão para stderr.
- Códigos de saída: `0` sucesso · `1` toda a cadeia falhou · `2` argumentos inválidos.

### 3.3 `.fg-pipeline.json` (na raiz da worktree; fora do git via `.git/info/exclude`)
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
    { "index": 1, "agent": "database-engineer", "sessionID": "ses_…", "model": "…", "commit": "<sha>|null", "status": "done" }
  ],
  "review": { "cycles": 0, "findings": [] },
  "updatedAt": "2026-10-16T…Z"
}
```

### 3.4 Card do Notion (`references/notion-card.md`)

| Propriedade | Valor ao criar | Atualização |
|---|---|---|
| `Nome` | título da tarefa | — |
| `Status` | `Não iniciada` | `Em andamento` ao aprovar a spec |
| `Prioridade` | `Média` | — |
| `Side` | inferido da área (routing table → Front-End / Back-End / Banco de Dados / Integração) | — |
| `Versão`, `Atribuir`, `Tempo Gasto` | não preenchidos | — |
| `Código` | auto (`auto_increment_id`); a skill **lê** o valor após criar e monta `FING-N` | — |
| Corpo da página | vazio na criação | **conteúdo integral da spec** (markdown convertido) + link do caminho `docs/specs/…`; ao final da pipeline, acrescenta bloco "Execução": branch, commits, achados da revisão |

Regras: a skill **mostra os campos e pede "ok"** antes de criar a página (escrita visível a outras pessoas). `Concluído` nunca é definido pela pipeline.

### 3.5 Templates de prompt
- `impl-prompt.md`: caminho da spec, número/nome da etapa, lista de arquivos esperados da etapa, resumo da etapa anterior (último `text` do JSON), `git diff --stat`, regras (TDD primeiro, imports `@/`, Zod, sem `any`, **não ler/editar `.env`**, não rodar `prisma db push`), definição de pronto (testes da etapa passando).
- `review-prompt.md`: caminho da spec, `git diff origin/main...HEAD`, critérios do agente (arquitetura / segredos e segurança), formato de saída obrigatório: lista de achados `{severidade: crítico|alto|médio|baixo, arquivo, linha, descrição, correção sugerida}`, **somente leitura**.

---

## 4. API

Não há endpoints. Interfaces externas usadas:
- **OpenCode CLI**: `opencode run [--agent] [-m] [-s] [--dir] [--format json]`, `opencode agent list`, `opencode models`.
- **Notion MCP**: `notion-fetch` (schema/página), `notion-create-pages`, `notion-update-page`, `notion-search`.
- **Git**: `git fetch origin main`, `git worktree add ../FinanceGuy-FING-N -b FING-N origin/main`, `git commit`, `git push -u origin FING-N` (somente após confirmação).

---

## 5. Edge Cases & Tratamento de Erro

Princípio: nenhuma falha deixa o repositório principal alterado; sempre há mensagem acionável e o estado persistido para retomar.

| Situação | Comportamento |
|---|---|
| Notion indisponível / sem permissão | Para antes de criar worktree; oferece seguir com código manual informado pelo usuário. |
| Entrada `FING-N` inexistente no Notion | Avisa e pergunta se quer criar um novo card. |
| `Código` do card não vem com prefixo `FING-` | Monta `FING-<número>`; premissa validada no teste de ponta a ponta (ver 6). |
| `origin/main` inacessível (offline) | Para; não cria worktree a partir de `main` local desatualizado sem confirmação. |
| Worktree/branch `FING-N` já existe | Se há `.fg-pipeline.json`: oferece **retomar**. Sem estado: aborta e pergunta (nunca sobrescreve). |
| Alterações não commitadas no checkout principal | Ignoradas (a worktree é isolada); a skill nunca toca nelas. |
| `pnpm install` / `prisma generate` falha | Para com o log; estado `failed(setup)`. |
| Falta de variável de ambiente na validação | Para e informa **qual** variável; não procura `.env`, não contorna. |
| `opencode` ausente / sem credencial do provider | Detecta no pré-voo (`opencode --version`, `opencode auth list`), avisa qual provider falta e quais cadeias ficam degradadas. |
| Toda a cadeia de modelos falhou | `failed(step_i)`, relatório com o último erro por modelo; nada commitado naquela etapa; retomável. |
| Saída do agente vazia / sem alterações | Conta como falha de etapa (entra na política de retentativa). |
| Validação (jest/lint) falha | Devolve o erro ao agente na mesma sessão (≤ 2×) → troca de modelo na mesma sessão → para. |
| Agente alterou arquivos fora do escopo da etapa | Claude compara `git diff --name-only` com os arquivos previstos; extras são mostrados no resumo e revertidos só com confirmação. |
| Achado crítico persiste após 2 ciclos de revisão | Para **antes** do commit final; resumo lista o achado; usuário decide. |
| Rate limit (429) | Espera 5 s e avança na cadeia (escalonado, não paralelo). |
| Conflito de `sessionID` ao usar `-c` | A skill nunca usa `-c`; sempre `-s <id>` capturado do JSON. |
| `--dry-run` | Não cria página no Notion, worktree, nem chama modelos; imprime branch, caminho da worktree, etapas, agentes, cadeias e propriedades do Notion. |
| Usuário cancela no portão 1 ou 2 | Estado permanece; nada é publicado; spec e commits locais ficam. |

### Permissões e segurança
- Sem `--auto` por padrão. Se uma etapa travar por pedido de permissão, a skill registra, mostra o comando bloqueado e pergunta ao usuário antes de reexecutar com `--auto` (apenas dentro da worktree, `--dir` explícito).
- Prompts nunca contêm segredos; logs não registram tokens.
- Escrita no Notion apenas após "ok" do usuário; push apenas após "sim".

---

## 6. Critérios de Aceitação

**Skill e documentação**
- [ ] `.claude/skills/fg-pipeline/SKILL.md` existe, com frontmatter válido (`name`, `description`) e aparece na lista de skills.
- [ ] A skill descreve o fluxo 1–11 e os dois portões (spec, push) mais a confirmação de criação do card.
- [ ] `docs/git-workflow.md` documenta a regra "branch de tarefa = `FING-N`".
- [ ] `.github/workflows/test.yml` mantém `main`, `feat/**`, `fix/**`, `refactor/**` e inclui `'FING-*'` em `push.branches`.
- [ ] `.opencode/AGENTS.md` referencia a skill.

**Script `run-agent.sh`** (testes com `opencode` falso no PATH, sem rede nem tokens)
- [ ] Sucesso no 1º modelo → JSON `ok:true`, `attempts:1`, `sessionID` extraído.
- [ ] Falha no 1º e sucesso no 2º → segunda chamada usa `-s <sessionID>` e `-m` do 2º modelo.
- [ ] Saída com `Error:`/`Request too large` **com exit 0** é tratada como falha.
- [ ] Texto final vazio é tratado como falha.
- [ ] Toda a cadeia falha → exit `1` e JSON `ok:false` com o último erro.
- [ ] `--chain REVIEW` usa exatamente `google/gemini-3.8-flash → 3.7-flash → 3.5-flash-lite → 3.1-flash-lite`; `--chain IMPL` usa a cadeia free na ordem da seção 2.2.
- [ ] Argumentos inválidos → exit `2`; nenhum caminho passa `--auto`.

**Pipeline**
- [ ] `--dry-run` imprime o plano completo e **não** cria nada (verificável: `git worktree list`, Notion e `opencode` sem chamadas).
- [ ] Entrada em texto livre cria o card (após "ok"), lê o `Código` e nomeia branch/worktree/spec com `FING-N`.
- [ ] A spec aprovada é copiada para o **corpo da página** do Notion, e `Status` vai para `Em andamento`.
- [ ] Worktree nasce de `origin/main` atualizado; o checkout principal permanece intocado.
- [ ] Cada etapa do mapa de execução gera sessão OpenCode própria e um commit Conventional Commits com `(FING-N)`.
- [ ] Revisão roda com `project-review` e `security-secret-auditor` em modelos Gemini, em modo leitura.
- [ ] Achado crítico/alto retorna à implementação (≤ 2 ciclos); médios/baixos aparecem só no resumo.
- [ ] Reexecutar com o mesmo `FING-N` oferece retomar a partir do `.fg-pipeline.json`.
- [ ] A pipeline termina no commit, pergunta sobre o push e **não** abre PR; `.env` nunca é lido.

**Teste de ponta a ponta (tarefa trivial só de documentação)**
- [ ] Executar `/fg-pipeline` numa tarefa de uma linha de `docs/` (ex.: "adicionar nota X em docs/debugging.md") percorre todo o fluxo, gera card + spec + worktree + commit, e `pnpm fg pr` (ou `lint` + `jest`) passa na worktree.
- [ ] Confirma a premissa de que `Código` vira `FING-<N>`.

---

## 7. Mapa de Execução

Esta própria skill deve ser implementada numa **worktree nova a partir de `origin/main`** (`../FinanceGuy-FING-<N>`, branch `FING-<N>`). Como ainda não há código no Notion para esta tarefa, o primeiro passo é criar o card (com "ok" do usuário) e obter o `N`; este arquivo é então renomeado para `docs/specs/FING-<N>-fg-pipeline.md`.

| Etapa | Agente | Entrega | Dependência |
|---|---|---|---|
| 0 | maestro (Claude) | card Notion + worktree + setup; renomear a spec | aprovação da spec |
| 1a | `devops-platform-engineer` | `scripts/run-agent.sh`, `chains.conf`, `fixtures/opencode-stub.sh` e `__tests__/run-agent.test.sh` (TDD: testes primeiro); ajuste do `test.yml` (`'FING-*'`) | 0 |
| 1b | `docs-architect` | `references/*.md` (4 arquivos), `git-workflow.md`, menção no `AGENTS.md` | 0 — **em paralelo com 1a** |
| 2 | `docs-architect` | `SKILL.md` integrando script e referências | 1a + 1b |
| 3 | `quality-assurance-analyst` | executa testes do script; `--dry-run`; e2e da tarefa trivial de documentação | 2 |
| 4 | `project-review` + `security-secret-auditor` | revisão final (arquitetura, segredos, permissões, segurança do script) | 3 |
| 5 | maestro (Claude) | commits por etapa (Conventional Commits `(FING-N)`), resumo e pergunta de push | 4 |

```
0 ──► 1a ─┐
      1b ─┴─► 2 ──► 3 ──► 4 ──► 5
```

Regra: nenhuma etapa de implementação inicia sem esta spec aprovada pelo usuário.
