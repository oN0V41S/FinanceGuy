---
name: opencode-cli
description: This skill should be used when configuring or using the OpenCode CLI for headless LLM automation. Use when the user asks to "configure opencode", "use opencode cli", "set up opencode", "opencode run command", "opencode model selection", "opencode providers", "opencode vertex ai", "opencode mcp servers", "opencode ollama", "opencode local models", "opencode deepseek", "opencode kimi", "opencode mistral", "fallback cli tool", or "headless llm cli". Covers command syntax, provider configuration, Vertex AI setup, MCP servers, local models, cloud providers, and subprocess integration patterns.
---

# OpenCode CLI Skill - Complete Documentation

## Overview

OpenCode is a Go-based CLI providing access to 75+ LLM providers through unified interface for "headless `run` command for automation and subprocess integration."

## Quick Start

1. Install OpenCode CLI
2. Configure environment variables (ANTHROPIC_API_KEY for Anthropic or GOOGLE_CLOUD_PROJECT for Vertex AI)
3. Verify: `opencode --version`
4. Test: `opencode run --model google/gemini-2.5-pro "Hello, world"`

## Basic Usage

Command structure follows this pattern: `opencode run --model <provider/model> "<prompt>"`

Key characteristics include using the `run` subcommand for non-interactive mode, `provider/model` naming convention, and positional argument prompts without stdin support.

## Model Format Examples

- Anthropic: `anthropic/claude-sonnet-4-20250514`
- Google: `google/gemini-2.5-pro`
- OpenCode: `opencode/grok-code`
- OpenAI: `openai/gpt-4o`
- Vertex AI: `google-vertex/gemini-2.5-pro`

## Configuration

Configuration files load from multiple locations merged hierarchically: environment variable path, project-level `opencode.json`, and global `~/.config/opencode/opencode.json`.

Basic configuration structure includes model selection and small_model designation in JSON format.

## Subprocess Integration

Python pattern uses `subprocess.run()` with capture_output, text mode, and timeout settings. Recommendation suggests "stagger parallel calls" with 5-10 second delays and implement fallback mechanisms.

## Environment Variables

- `OPENCODE_CONFIG`: Custom configuration path
- `GOOGLE_CLOUD_PROJECT`: GCP project identifier
- `GOOGLE_APPLICATION_CREDENTIALS`: Service account JSON location
- `VERTEX_LOCATION`: Vertex AI region specification

## Verification Checklist

1. Check version installation
2. Test default model connectivity
3. Review active configuration file
4. Verify MCP server connectivity if configured

## Best Practices

- Implement project-level configuration files
- Utilize `{env:VAR_NAME}` syntax for secrets management
- Add retry logic for network resilience
- Capture both stdout and stderr for troubleshooting
- Apply delays between parallel invocations

Source: https://github.com/SpillwaveSolutions/opencode_cli

## Sub-agents via headless (FinanceGuy) — verificado em 2026-10-16 (opencode 1.18.32)

Os agentes do projeto ficam em `.opencode/agents/*.md` (índice em `.opencode/AGENTS.md`). Liste os válidos com `opencode agent list`.

### Agentes (todos com `mode: all`)
`tech-lead`, `backend-engineer`, `database-engineer`, `devops-platform-engineer`, `docs-architect`, `frontend`, `product-manager`, `project-review`, `quality-assurance-analyst`, `security-secret-auditor`, `solutions-architect`.

Foram mudados de `subagent` para `all` porque `opencode run --agent` **recusa** agentes `subagent` (avisa `is a subagent, not a primary agent` e cai para `build`). Com `mode: all` o agente roda direto em `--agent` e continua invocável pela task tool.

### Comando padrão
```bash
opencode run --agent <agente> -m opencode/mimo-v2.6-flash-free "tarefa"
```
Testado: `--agent project-review -m opencode/mimo-v2.6-flash-free` responde como `project-review`.

### Modelo
- Use a cadeia de fallback abaixo (começa em `opencode/mimo-v2.6-flash-free`). Veja outros com `opencode models`.
- Não use o padrão `qwen/qwen3.8-27b` (Groq): limite de 7000 tokens de entrada/min, e um `run` já envia ~17k (erro `Request too large ... ITPM`).

### Boas práticas
- Defina sempre `-m`, `--dir` e, para consumo programático, `--format json`.
- Tarefas somente leitura (review, auditoria): dispense `--auto`. Só use `--auto` em tarefas controladas.
- Prompt só como argumento posicional (stdin não é suportado); anexe arquivos com `-f`.
- Escalone chamadas paralelas (5–10 s) e use timeout (`timeout 150 opencode run ...`).
- Retomar contexto: `-c` ou `-s <id>`; `--fork` para bifurcar.
- `opencode.json` tem o MCP `codebase-memory` com caminho Linux (`/home/novais-kr/...`) inexistente nesta máquina Windows.

### Fallback de modelos (ordem de tentativa)
Tente na ordem; passe para o próximo se der erro de rate limit, indisponibilidade, `Request too large` ou resposta vazia. Ids conferidos com `opencode models` em 2026-10-16.

| # | Provider | Modelo | Id para `-m` |
|---|----------|--------|--------------|
| 1 | OpenCode | MiMo-V2.6-Flash Free | `opencode/mimo-v2.6-flash-free` |
| 2 | OpenCode | LongCat 2.5 Preview Free | `opencode/longcat-2.5-preview-free` |
| 3 | OpenCode | Beam Free | `opencode/beam-free` |
| 4 | OpenRouter | Xing4.0 29B A4B (free) | `openrouter/xingchen-agi/xing4.0-29b-a4b:free` |
| 5 | OpenRouter | Laguna XS 2.1 (free) | `openrouter/poolside/laguna-xs-2.1:free` |
| 6 | OpenRouter | Free Models Router | `openrouter/openrouter/free` |
| 7 | OpenRouter | Nemotron 3 Ultra (free) | `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free` |
| 8 | OpenRouter | Nemotron 3.5 Lightning (free) | `openrouter/nvidia/nemotron-3.5-lightning:free` |
| 9 | OpenRouter | Nemotron 3.5 Super VL (free) | `openrouter/nvidia/nemotron-3.5-super-vl:free` |

Só o #1 foi testado de fato; os demais não foram executados. Os #4–#9 exigem credencial do OpenRouter configurada.

Loop de fallback (bash):
```bash
MODELS=(
  opencode/mimo-v2.6-flash-free
  opencode/longcat-2.5-preview-free
  opencode/beam-free
  openrouter/xingchen-agi/xing4.0-29b-a4b:free
  openrouter/poolside/laguna-xs-2.1:free
  openrouter/openrouter/free
  openrouter/nvidia/nemotron-3-ultra-550b-a55b:free
  openrouter/nvidia/nemotron-3.5-lightning:free
  openrouter/nvidia/nemotron-3.5-super-vl:free
)
for m in "${MODELS[@]}"; do
  out=$(timeout 170 opencode run --agent project-review -m "$m" "tarefa" 2>&1)
  if [ $? -eq 0 ] && ! grep -qE '^.{0,12}Error' <<<"$out"; then echo "$out"; break; fi
  echo "falhou em $m, tentando o próximo" >&2; sleep 5
done
```

### Continuar a tarefa com outro modelo (handoff entre modelos)
Não existe flag nova: use **`-c`** (última sessão) ou **`-s <id>`** junto com **`-m <outro-modelo>`**. A sessão e o histórico (etapas já feitas, arquivos lidos/editados) são mantidos e só o modelo muda. Testado em 2026-10-16: `mimo-v2.6-flash-free` guardou uma palavra-secreta e `longcat-2.5-preview-free`, chamado com `-c -m`, a devolveu corretamente.

```bash
# 1ª chamada
opencode run --agent project-review -m opencode/mimo-v2.6-flash-free "tarefa"

# continua a mesma sessão com outro modelo, a partir da última etapa
opencode run -c --agent project-review -m opencode/longcat-2.5-preview-free \
  "Continue de onde parou: retome a última etapa incompleta e conclua a tarefa."
```

- `-c` pega a **última sessão global**; em chamadas paralelas pode retomar a sessão errada. Nesses casos capture o id e use `-s`:
  ```bash
  SID=$(opencode run --format json -m "$M1" "tarefa" | grep -o '"sessionID":"[^"]*"' | head -1 | cut -d'"' -f4)
  opencode run -s "$SID" -m "$M2" "Continue de onde parou."
  ```
  (O campo `sessionID` aparece em todos os eventos de `--format json`; `opencode session list` lista as sessões.)
- `--fork` (com `-c` ou `-s`) cria uma cópia da sessão para o novo modelo, preservando a original.
- Reenvie `--agent` na continuação para manter o mesmo agente.
- No loop de fallback, após a primeira falha troque `opencode run` por `opencode run -s "$SID"` para o próximo modelo herdar as etapas já feitas, em vez de recomeçar.
