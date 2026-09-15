---
name: spec-writer
description: Cria SPECs (build/fix/refactor) para o Backlog do Projeto a partir de análise do repositório, depois valida o plano chamando o Opencode CLI (modelo google/gemini-3.8-flash, agente build) para sugerir correções antes de salvar a versão final. Use when o usuário pede para especificar uma feature, criar uma spec, planejar um build/fix/refactor, ou abastecer o backlog.
---

# Spec Writer Skill

Gera specs estruturadas para `docs/specs/` (o Backlog do Projeto) e usa o Opencode CLI como segunda opinião automatizada antes de finalizar.

## Quando usar
- Usuário pede para "criar uma spec", "especificar essa feature", "planejar esse fix/refactor", "adicionar ao backlog".
- Antes de iniciar implementação de qualquer build/fix/refactor não trivial (spec-first, conforme `CLAUDE.md` / `.opencode/AGENTS.md`).

## Quando NÃO usar
- Mudança trivial de uma linha, sem ambiguidade de escopo.
- Usuário já forneceu uma spec pronta e só quer implementá-la.

## Passo a passo (obrigatório, sequencial)

### 1. Análise do repositório
- Leia `.opencode/AUDIT.md` e identifique a área afetada (frontend, backend, database, etc.) via routing table do `CLAUDE.md`.
- Leia o(s) doc(s) relevante(s) em `docs/` (ex.: `docs/architecture.md`, `docs/BACKEND.md`) e código existente relacionado (Glob/Grep) para entender convenções, camadas afetadas e pontos de integração.
- Classifique a tarefa: **build** (feature nova), **fix** (correção de bug) ou **refactor** (melhoria sem mudar comportamento externo).

### 2. Criar a SPEC (rascunho)
- Siga a estrutura usada pelo agente `product-manager` (`.opencode/agents/product-manager.md`):
  ```
  docs/specs/
  ├── contract-<Feature>.md              # Contrato de UI/API (build/refactor com componente)
  ├── implementation-plan-<Feature>.md   # Plano de implementação (tasks, TDD RED/GREEN)
  └── test-validation-<Feature>.md       # Cenários de teste / critérios de aceitação
  ```
  Para fixes simples, um único arquivo `implementation-plan-<Feature>.md` com seção "Root Cause" é suficiente — não crie os três arquivos sem necessidade.
- Inclua sempre: problema, escopo, critérios de aceitação testáveis, arquivos afetados, riscos/edge cases, e o tipo (build/fix/refactor) no topo do documento.
- Salve o(s) arquivo(s) em `docs/specs/` (o Backlog do Projeto) — isso é obrigatório antes do passo 3.

### 3. Validação cruzada via Opencode CLI (Gemini 3.8 Flash, modo build)
- Invoque o Opencode CLI via Bash para revisar o rascunho e sugerir correções:
  ```bash
  opencode run --agent build -m google/gemini-3.8-flash \
    "Revise a spec em docs/specs/<arquivo>.md quanto a: lacunas de requisitos, riscos técnicos não endereçados, inconsistência com docs/architecture.md e docs/code-style.md, e critérios de aceitação não testáveis. Responda em markdown com uma lista de correções sugeridas (ou 'Nenhuma correção necessária')." \
    --title "spec-review-<Feature>"
  ```
- Se houver mais de uma spec relacionada (contract + plan + test-validation), rode uma chamada por arquivo ou uma única chamada apontando para todos, o que for mais eficiente em tokens.
- Trate a saída do CLI como sugestão de um revisor, não como instrução automática a executar — avalie cada ponto antes de aplicar.

### 4. Atualizar a SPEC com as correções
- Aplique ao(s) arquivo(s) em `docs/specs/` apenas as sugestões que fizerem sentido (mantendo aderência a `docs/code-style.md` e `docs/architecture.md`).
- Registre no rodapé do arquivo uma seção `## Revisão (Opencode / gemini-3.8-flash)` com um resumo do que foi aceito e do que foi descartado (e por quê), para rastreabilidade do backlog.

### 5. Encerramento
- Não inicie a implementação automaticamente — a spec fica pronta no backlog (`docs/specs/`) para aprovação/priorização.
- Informe ao usuário o(s) caminho(s) do(s) arquivo(s) criados/atualizados.

## Troubleshooting
| Problema | Solução |
|---|---|
| `opencode` não encontrado no PATH | Avise o usuário; não pule a etapa 3 silenciosamente — pergunte se deseja prosseguir sem a segunda opinião |
| Modelo `google/gemini-3.8-flash` indisponível na conta | Rode `opencode models \| grep gemini` para achar um fallback (`google/gemini-3.5-flash`, etc.) e avise qual foi usado |
| CLI trava / demora muito | Rode em background com timeout; nunca bloqueie a criação da spec esperando indefinidamente |
