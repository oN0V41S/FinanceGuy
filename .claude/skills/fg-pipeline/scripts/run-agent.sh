#!/usr/bin/env bash
# run-agent.sh — executa um agente OpenCode headless com cadeia de fallback de modelos
# e handoff de sessão entre modelos.
#
# Especificação: docs/specs/FING-26-fg-pipeline.md (seção 3.2).
#
# Uso:
#   run-agent.sh --chain <IMPL|REVIEW> --agent <nome> --dir <worktree> --prompt-file <arquivo>
#                [--session <ses_id>] [--start-at <índice-do-modelo>] [--title <texto>] [--timeout <s>]
#
# Contratos:
#   - Para cada modelo da cadeia (chains.conf):
#       timeout <s> opencode run --agent <nome> -m <modelo> --dir <dir> --format json
#                          [-s <sessão>] "$(cat prompt-file)"
#     aguardando <RETRY_DELAY>s entre tentativas.
#   - Falha = exit ≠ 0, OU saída contendo `Error:` / `Request too large` / rate limit,
#     OU texto final vazio (o OpenCode pode sair com 0 mesmo com erro — valida-se o conteúdo,
#     não só o exit code).
#   - O sessionID do primeiro evento JSON é capturado e reutilizado com `-s` na tentativa seguinte
#     (o novo modelo herda as etapas já feitas).
#   - NUNCA usa `--auto` (nem revisores, nem implementação).
#   - Saída: stdout recebe exatamente UMA linha JSON com o resultado; logs de diagnóstico vão
#     para stderr.
#   - Exit: 0 sucesso · 1 toda a cadeia falhou · 2 argumentos inválidos.
set -u

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
CHAINS_FILE="${FG_CHAINS_FILE:-$SCRIPT_DIR/chains.conf}"
RETRY_DELAY="${FG_RETRY_DELAY:-5}"
DEFAULT_TIMEOUT=600

# --- helpers -----------------------------------------------------------------

log() { printf '[fg-pipeline] %s\n' "$*" >&2; }

die() {
  printf 'run-agent.sh: %s\n' "$1" >&2
  exit 2
}

is_pos_int() {
  case "${1-}" in
    ''|*[!0-9]*) return 1 ;;
    *) return 0 ;;
  esac
}

json_escape() {
  local s=${1-}
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\n'/\\n}
  s=${s//$'\r'/\\r}
  s=${s//$'\t'/\\t}
  printf '%s' "$s"
}

usage() {
  cat <<'EOF'
run-agent.sh — executa um agente OpenCode headless com cadeia de fallback (spec FING-26 §3.2).

Uso:
  run-agent.sh --chain <IMPL|REVIEW> --agent <nome> --dir <worktree> --prompt-file <arquivo>
               [--session <ses_id>] [--start-at <índice-do-modelo>] [--title <texto>] [--timeout <s>]

Exit:
  0  sucesso   (stdout: 1 linha JSON {"ok":true,"sessionID":...,"model":...,"attempts":N,"text":...})
  1  cadeia falhou (stdout: 1 linha JSON {"ok":false,"sessionID":...,"lastModel":...,"attempts":N,"error":...})
  2  argumentos inválidos (mensagem no stderr)

Variáveis de ambiente opcionais:
  FG_CHAINS_FILE  caminho do chains.conf (padrão: ao lado deste script)
  FG_RETRY_DELAY  segundos entre tentativas (padrão: 5)
EOF
}

# --- argumentos ---------------------------------------------------------------

CHAIN=""
AGENT=""
WORK_DIR=""
PROMPT_FILE=""
SESSION_ARG=""
START_AT=""
TITLE=""
TIMEOUT_S="$DEFAULT_TIMEOUT"

while [ $# -gt 0 ]; do
  case "$1" in
    --chain)       [ $# -ge 2 ] || die "--chain exige um valor";       CHAIN=$2; shift 2 ;;
    --agent)       [ $# -ge 2 ] || die "--agent exige um valor";       AGENT=$2; shift 2 ;;
    --dir)         [ $# -ge 2 ] || die "--dir exige um valor";         WORK_DIR=$2; shift 2 ;;
    --prompt-file) [ $# -ge 2 ] || die "--prompt-file exige um valor"; PROMPT_FILE=$2; shift 2 ;;
    --session)     [ $# -ge 2 ] || die "--session exige um valor";     SESSION_ARG=$2; shift 2 ;;
    --start-at)    [ $# -ge 2 ] || die "--start-at exige um valor";    START_AT=$2; shift 2 ;;
    --title)       [ $# -ge 2 ] || die "--title exige um valor";       TITLE=$2; shift 2 ;;
    --timeout)     [ $# -ge 2 ] || die "--timeout exige um valor";     TIMEOUT_S=$2; shift 2 ;;
    -h|--help)     usage; exit 0 ;;
    *)             die "argumento desconhecido: $1" ;;
  esac
done

# --- validação (qualquer problema aqui é exit 2) --------------------------------

[ -n "$CHAIN" ] || die "--chain é obrigatório"
CHAIN=$(printf '%s' "$CHAIN" | tr '[:lower:]' '[:upper:]')
case "$CHAIN" in
  IMPL|REVIEW) : ;;
  *) die "--chain inválido: '$CHAIN' (use IMPL ou REVIEW)" ;;
esac

[ -n "$AGENT" ] || die "--agent é obrigatório"
[ -n "$WORK_DIR" ] || die "--dir é obrigatório"
[ -d "$WORK_DIR" ] || die "--dir não existe: $WORK_DIR"
[ -n "$PROMPT_FILE" ] || die "--prompt-file é obrigatório"
[ -r "$PROMPT_FILE" ] || die "--prompt-file ilegível: $PROMPT_FILE"

if [ -n "$START_AT" ]; then
  is_pos_int "$START_AT" || die "--start-at deve ser um inteiro ≥ 1"
  [ "$START_AT" -ge 1 ] || die "--start-at deve ser um inteiro ≥ 1 (1-based)"
fi
is_pos_int "$TIMEOUT_S" || die "--timeout deve ser um inteiro ≥ 1"

[ -r "$CHAINS_FILE" ] || die "chains.conf não encontrado ou ilegível: $CHAINS_FILE"

# --- cadeia de modelos (fonte única: chains.conf) ------------------------------

mapfile -t ALL_MODELS < <(awk -v c="$CHAIN" '
  NF >= 2 && $1 == c { gsub(/\r/, ""); for (i = 2; i <= NF; i++) print i <= NF ? $i : "" }
' "$CHAINS_FILE")

[ "${#ALL_MODELS[@]}" -gt 0 ] || die "cadeia '$CHAIN' vazia ou ausente em $CHAINS_FILE"

FROM=1
if [ -n "$START_AT" ]; then
  FROM=$START_AT
fi
if [ "$FROM" -gt "${#ALL_MODELS[@]}" ]; then
  die "--start-at $FROM além do fim da cadeia $CHAIN (${#ALL_MODELS[@]} modelos)"
fi

MODELS=("${ALL_MODELS[@]:FROM-1}")
TOTAL=${#MODELS[@]}

PROMPT=$(cat "$PROMPT_FILE")

# --- loop de execução com fallback ----------------------------------------------

CURRENT_SESSION="$SESSION_ARG" # herdado de --session ou do -s capturado
FIRST_SESSION=""               # primeiro sessionID capturado (vai no JSON final)
ATTEMPTS=0
LAST_ERROR=""
LAST_MODEL=""

log "chain=$CHAIN agent=$AGENT dir=$WORK_DIR modelos=$TOTAL start-at=$FROM timeout=${TIMEOUT_S}s retry=${RETRY_DELAY}s${TITLE:+ title=$TITLE}${SESSION_ARG:+ sessão-inicial=$SESSION_ARG}"

i=0
for MODEL in "${MODELS[@]}"; do
  i=$((i + 1))
  ATTEMPTS=$((ATTEMPTS + 1))

  OUT_FILE=$(mktemp)
  ERR_FILE=$(mktemp)

  # NUNCA passa --auto (spec §3.2 / §5).
  CMD=(timeout "$TIMEOUT_S" opencode run --agent "$AGENT" -m "$MODEL" --dir "$WORK_DIR" --format json)
  if [ -n "$CURRENT_SESSION" ]; then
    CMD+=(-s "$CURRENT_SESSION")
  fi

  log "tentativa $ATTEMPTS/$TOTAL modelo=$MODEL${CURRENT_SESSION:+ sessão=$CURRENT_SESSION}"
  "${CMD[@]}" "$PROMPT" >"$OUT_FILE" 2>"$ERR_FILE"
  CODE=$?
  if [ -s "$ERR_FILE" ]; then
    cat "$ERR_FILE" >&2
  fi

  # sessionID do primeiro evento JSON da saída.
  SID=$(grep -o '"sessionID":"[^"]*"' "$OUT_FILE" 2>/dev/null | head -n1 | cut -d'"' -f4)
  if [ -n "$SID" ]; then
    [ -z "$FIRST_SESSION" ] && FIRST_SESSION=$SID
    CURRENT_SESSION=$SID
  fi

  # Texto final: concatena os campos "text" dos eventos JSON. O corpo extraído já é
  # conteúdo válido de string JSON (a fonte é JSON válida), por isso é embutido cru.
  TEXT=$(grep -o '"text":"[^"]*"' "$OUT_FILE" 2>/dev/null | sed 's/^"text":"//; s/"$//' | tr '\n' ' ' | sed 's/ *$//')

  # Falha = exit ≠ 0, OU "Request too large" / "Error:" / rate limit na saída, OU texto vazio.
  FAILED=0
  REASON=""
  if grep -q 'Request too large' "$OUT_FILE" 2>/dev/null || grep -q 'Request too large' "$ERR_FILE" 2>/dev/null; then
    FAILED=1
    REASON="Request too large (modelo $MODEL)"
  elif grep -q 'Error:' "$OUT_FILE" 2>/dev/null || grep -q 'Error:' "$ERR_FILE" 2>/dev/null; then
    FAILED=1
    ERR_TXT=$(grep -m1 -ho 'Error:[^"\\]*' "$OUT_FILE" "$ERR_FILE" 2>/dev/null | head -n1)
    REASON="${ERR_TXT:-Error} (modelo $MODEL)"
  elif grep -qi 'rate limit' "$OUT_FILE" 2>/dev/null || grep -qi 'rate limit' "$ERR_FILE" 2>/dev/null; then
    FAILED=1
    REASON="rate limit (modelo $MODEL)"
  elif [ "$CODE" -ne 0 ]; then
    FAILED=1
    REASON="exit code $CODE (modelo $MODEL)"
  elif [ -z "${TEXT//[[:space:]]/}" ]; then
    FAILED=1
    REASON="resposta vazia (modelo $MODEL)"
  fi

  if [ "$FAILED" -eq 1 ]; then
    LAST_ERROR=$REASON
    LAST_MODEL=$MODEL
    log "tentativa $ATTEMPTS/$TOTAL falhou: $REASON"
    rm -f "$OUT_FILE" "$ERR_FILE"
    if [ "$i" -lt "$TOTAL" ]; then
      sleep "$RETRY_DELAY"
    fi
    continue
  fi

  # sucesso
  rm -f "$OUT_FILE" "$ERR_FILE"
  printf '{"ok":true,"sessionID":"%s","model":"%s","attempts":%d,"text":"%s"}\n' \
    "$(json_escape "${FIRST_SESSION:-${SESSION_ARG:-}}")" \
    "$(json_escape "$MODEL")" \
    "$ATTEMPTS" \
    "$TEXT"
  exit 0
done

# toda a cadeia falhou
log "todas as $TOTAL tentativas falharam; último erro: $LAST_ERROR"
printf '{"ok":false,"sessionID":"%s","lastModel":"%s","attempts":%d,"error":"%s"}\n' \
  "$(json_escape "${FIRST_SESSION:-${SESSION_ARG:-}}")" \
  "$(json_escape "$LAST_MODEL")" \
  "$ATTEMPTS" \
  "$(json_escape "$LAST_ERROR")"
exit 1
