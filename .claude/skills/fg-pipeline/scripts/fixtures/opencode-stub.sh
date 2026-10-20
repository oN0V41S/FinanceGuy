#!/usr/bin/env bash
# fixtures/opencode-stub.sh — simula `opencode run --format json` (para testes, sem rede nem tokens).
#
# Controlado por variáveis de ambiente:
#   OPENCODE_STUB_MODES    - comportamentos por chamada, separados por vírgula. O último
#                            comportamento se repete se houver mais chamadas do que modos.
#                            Padrão: "success"
#                            Valores: success | exit1 | error | toolarge | empty | ratelimit
#   OPENCODE_STUB_LOG      - arquivo onde cada invocação é registrada (append, 1 linha/chamada)
#   OPENCODE_STUB_COUNTER  - arquivo de estado do contador de chamadas
#   OPENCODE_STUB_SESSION  - sessionID usado quando -s não é informado (padrão: ses_stub_<n>)
#   OPENCODE_STUB_TEXT     - texto de sucesso (padrão: "Implementacao da etapa 1 concluida com sucesso.")
#
# Cada invocação emite no stdout eventos NDJSON com sessionID (como o opencode real com
# --format json): primeiro um evento session.created, depois os partes de texto.
# Código de exit: 0 para a maioria; exit1 sai com 1 (como uma falha real de provider).
set -u

# --- contador de chamadas (estado em arquivo, pois cada invocação é um processo novo) ---
COUNTER_FILE="${OPENCODE_STUB_COUNTER:-${TMPDIR:-/tmp}/opencode-stub-counter}"
n=0
if [ -f "$COUNTER_FILE" ]; then
  n=$(cat "$COUNTER_FILE" 2>/dev/null || true)
  case "$n" in ''|*[!0-9]*) n=0;; esac
fi
n=$((n + 1))
printf '%s' "$n" > "$COUNTER_FILE" 2>/dev/null || true

# --- parse dos argumentos (suficiente para log; o script sob teste não depende daqui) ---
model=""; session=""; agent=""; auto=no
ARGS=("$@")
i=0
while [ "$i" -lt "${#ARGS[@]}" ]; do
  case "${ARGS[$i]}" in
    -m|--model)    i=$((i + 1)); model="${ARGS[$i]:-}" ;;
    -s|--session)  i=$((i + 1)); session="${ARGS[$i]:-}" ;;
    --agent)       i=$((i + 1)); agent="${ARGS[$i]:-}" ;;
    --auto)        auto=yes ;;
  esac
  i=$((i + 1))
done

# --- log da invocação (para o teste inspecionar -m, -s, --auto etc.) ---
LOG="${OPENCODE_STUB_LOG:-}"
if [ -n "$LOG" ]; then
  printf 'call=%d model=%s session=%s agent=%s auto=%s argv=%s\n' \
    "$n" "${model:--}" "${session:--}" "${agent:--}" "$auto" "$*" >> "$LOG"
fi

# --- sessionID: herdado de -s, senão sintetizado a partir do contador ---
if [ -n "$session" ]; then
  sid="$session"
else
  prefix="${OPENCODE_STUB_SESSION:-ses_stub}"
  sid="${prefix}_${n}"
fi

emit_session() { printf '{"type":"session.created","sessionID":"%s"}\n' "$sid"; }
emit_text()    { printf '{"type":"message.part.updated","sessionID":"%s","part":{"type":"text","text":"%s"}}\n' "$sid" "$1"; }

# --- comportamento da chamada ---
modes="${OPENCODE_STUB_MODES:-success}"
IFS=',' read -r -a MODE_LIST <<< "$modes"
idx=$(( n - 1 ))
max=$(( ${#MODE_LIST[@]} - 1 ))
if [ "$idx" -gt "$max" ]; then idx="$max"; fi
if [ "$idx" -lt 0 ]; then idx=0; fi
mode="${MODE_LIST[$idx]}"

case "$mode" in
  success)
    emit_session
    emit_text "${OPENCODE_STUB_TEXT:-Implementacao da etapa 1 concluida com sucesso.}"
    exit 0
    ;;
  exit1)
    emit_session
    printf 'opencode-stub: simulated failure (exit 1)\n' >&2
    exit 1
    ;;
  error)
    # falha "silenciosa": exit 0, mas o conteúdo traz `Error:` (spec §3.2)
    emit_session
    emit_text "Error: simulated provider failure"
    exit 0
    ;;
  toolarge)
    emit_session
    emit_text "Request too large: ITPM limit exceeded"
    exit 0
    ;;
  empty)
    # o opencode pode sair com 0 mesmo sem conteúdo (spec §3.2: validar o conteúdo)
    emit_session
    emit_text ""
    exit 0
    ;;
  ratelimit)
    emit_session
    emit_text "rate limit exceeded, try again later"
    exit 0
    ;;
  *)
    emit_session
    printf 'opencode-stub: unknown mode: %s\n' "$mode" >&2
    exit 1
    ;;
esac
