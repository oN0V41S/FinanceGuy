#!/usr/bin/env bash
# run-agent.sh — executa um agente OpenCode headless com cadeia de fallback de modelos
# e handoff de sessão entre modelos.
#
# Especificação: docs/specs/FING-26-fg-pipeline.md (seção 3.2).
#
# Uso:
#   run-agent.sh --chain <IMPL|REVIEW> --agent <nome> --dir <worktree> --prompt-file <arquivo>
#                [--session <ses_id>] [--start-at <índice-do-modelo>] [--title <texto>] [--timeout <s>]
#   run-agent.sh --chain <IMPL|REVIEW> --dir <worktree> --probe [--start-at <n>]
#
# Contratos:
#   - Para cada modelo da cadeia (chains.conf):
#       opencode run --agent <nome> -m <modelo> --dir <dir> --format json --print-logs
#                    [-s <sessão>] "$(cat prompt-file)"
#     aguardando <RETRY_DELAY>s entre tentativas.
#   - Vigia de travamento (FG_HANG_TIMEOUT, padrão 60 s): o `opencode run` roda em background
#     com `--print-logs`; o script mata o processo e passa ao próximo modelo se o log trouxer um
#     `stream error` do agente (ex.: "Free usage limit reached" — o opencode NÃO sai nesse caso),
#     se não houver NENHUM progresso (stdout, stderr ou worktree) por FG_HANG_TIMEOUT segundos,
#     ou se passar o teto duro (--timeout).
#   - Sonda de modelo (FG_PROBE=1, padrão): antes de CADA tentativa roda um `opencode run` mínimo
#     ("responda OK") no modelo; modelo que não responde é pulado sem gastar o prompt real.
#     `--probe` testa a cadeia inteira em paralelo e não executa agente (pré-voo).
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
HANG_TIMEOUT="${FG_HANG_TIMEOUT:-60}"      # sem progresso por este tempo = travado
PROBE_TIMEOUT="${FG_PROBE_TIMEOUT:-45}"    # teto da sonda por modelo
PROBE_ENABLED="${FG_PROBE:-1}"             # 0 desliga a sonda por tentativa
PROBE_JOBS="${FG_PROBE_JOBS:-3}"           # sondas simultâneas no modo --probe
POLL_INTERVAL="${FG_POLL_INTERVAL:-2}"     # intervalo do vigia
DEFAULT_TIMEOUT=300                        # teto duro por tentativa (--timeout)

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
  run-agent.sh --chain <IMPL|REVIEW> --dir <worktree> --probe [--start-at <n>]

  --probe  testa os modelos da cadeia em paralelo (pergunta mínima; sem agente nem prompt-file) e
           imprime 1 linha JSON {"chain":...,"healthy":[índices],"models":[{index,model,ok,reason}]}.
           Use no pré-voo e antes de cada etapa para escolher o --start-at.

Exit:
  0  sucesso   (stdout: 1 linha JSON {"ok":true,"sessionID":...,"model":...,"attempts":N,"text":...})
  1  cadeia falhou (stdout: 1 linha JSON {"ok":false,"sessionID":...,"lastModel":...,"attempts":N,"error":...})
  2  argumentos inválidos (mensagem no stderr)
  (--probe: exit 0 se houver ao menos um modelo saudável, 1 se nenhum)

Variáveis de ambiente opcionais:
  FG_CHAINS_FILE    caminho do chains.conf (padrão: ao lado deste script)
  FG_RETRY_DELAY    segundos entre tentativas (padrão: 5)
  FG_HANG_TIMEOUT   segundos sem progresso até considerar travado (padrão: 60)
  FG_PROBE          1 (padrão) testa cada modelo antes da tentativa; 0 desliga
  FG_PROBE_TIMEOUT  teto em segundos da sonda por modelo (padrão: 45)
  FG_PROBE_JOBS     sondas simultâneas no --probe (padrão: 3; muitas ao mesmo tempo causam falso timeout)
  FG_POLL_INTERVAL  intervalo do vigia em segundos (padrão: 2)
EOF
}

# --- vigia de travamento --------------------------------------------------------

# Erro real de provedor no log (--print-logs). O agente `title` (small=true) falha de forma
# benigna ("Model access is disabled") e é ignorado.
STREAM_ERROR_RE='level=ERROR.*message="stream error"'

provider_error() {
  grep -E "$STREAM_ERROR_RE" "$1" 2>/dev/null | grep -v 'small=true' | head -n1
}

# Linhas do stderr que indicam falha (sem o ruído INFO/DEBUG/WARN do --print-logs nem o agente title).
error_lines() {
  grep -v -E '^timestamp=[^ ]+ level=(INFO|DEBUG|WARN) ' "$1" 2>/dev/null | grep -v 'small=true'
}

kill_tree() {
  local pid=$1 winpid=""
  [ -r "/proc/$pid/winpid" ] && winpid=$(cat "/proc/$pid/winpid" 2>/dev/null)
  if [ -n "$winpid" ] && command -v taskkill >/dev/null 2>&1; then
    taskkill //F //T //PID "$winpid" >/dev/null 2>&1
  fi
  kill -TERM "$pid" 2>/dev/null
  sleep 1
  kill -KILL "$pid" 2>/dev/null
  return 0
}

# Progresso = tamanho de stdout + stderr + estado da worktree.
fingerprint() {
  local a b g
  a=$(wc -c <"$1" 2>/dev/null | tr -d ' ')
  b=$(wc -c <"$2" 2>/dev/null | tr -d ' ')
  g=$(git -C "$WORK_DIR" status --porcelain 2>/dev/null | cksum | cut -d' ' -f1)
  printf '%s:%s:%s' "${a:-0}" "${b:-0}" "${g:-0}"
}

# run_watched <out> <err> <teto_s> <hang_s> <cmd...>
# Roda <cmd> em background (stdin fechado) e vigia. Define WATCH_CODE e WATCH_REASON
# ("" | quota | hang | timeout). Mata a árvore do processo em quota/hang/timeout.
run_watched() {
  local out=$1 err=$2 cap=$3 hang=$4
  shift 4
  WATCH_CODE=0
  WATCH_REASON=""
  "$@" >"$out" 2>"$err" </dev/null &
  local pid=$! start now last_change last_fp fp
  start=$(date +%s)
  last_change=$start
  last_fp=$(fingerprint "$out" "$err")
  while kill -0 "$pid" 2>/dev/null; do
    sleep "$POLL_INTERVAL"
    now=$(date +%s)
    if [ -n "$(provider_error "$err")" ]; then
      WATCH_REASON="quota"
    elif [ $((now - start)) -ge "$cap" ]; then
      WATCH_REASON="timeout"
    else
      fp=$(fingerprint "$out" "$err")
      if [ "$fp" != "$last_fp" ]; then
        last_fp=$fp
        last_change=$now
      elif [ $((now - last_change)) -ge "$hang" ]; then
        WATCH_REASON="hang"
      fi
    fi
    if [ -n "$WATCH_REASON" ]; then
      kill_tree "$pid"
      break
    fi
  done
  wait "$pid" 2>/dev/null
  WATCH_CODE=$?
  if [ "$WATCH_REASON" = "timeout" ]; then
    WATCH_CODE=124
  fi
  return 0
}

# probe_model <modelo> → 0 saudável / 1 não. Define PROBE_REASON.
# Pergunta mínima, sem agente e sem sessão compartilhada.
probe_model() {
  local model=$1 pout perr text
  pout=$(mktemp)
  perr=$(mktemp)
  PROBE_REASON=""
  run_watched "$pout" "$perr" "$PROBE_TIMEOUT" "$HANG_TIMEOUT" \
    opencode run -m "$model" --dir "$WORK_DIR" --format json --print-logs \
    -- "Responda apenas com a palavra OK. Não use ferramentas."
  text=$(grep -oE '"text":"([^"\\]|[\\].)*"' "$pout" 2>/dev/null | sed 's/^"text":"//; s/"$//' | tr '\n' ' ')
  if [ "$WATCH_REASON" = "quota" ]; then
    PROBE_REASON="erro do provedor: $(provider_error "$perr" | grep -o 'error.error="[^"]*"' | head -n1)"
  elif [ -n "$WATCH_REASON" ]; then
    PROBE_REASON="$WATCH_REASON (sem resposta em ${PROBE_TIMEOUT}s)"
  elif [ "$WATCH_CODE" -ne 0 ]; then
    PROBE_REASON="exit code $WATCH_CODE"
  elif [ -z "${text//[[:space:]]/}" ]; then
    PROBE_REASON="resposta vazia"
  elif [[ "$text" == Error:* ]]; then
    PROBE_REASON="$text"
  fi
  rm -f "$pout" "$perr"
  [ -z "$PROBE_REASON" ]
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
PROBE_ONLY=0

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
    --probe)       PROBE_ONLY=1; shift ;;
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

[ -n "$WORK_DIR" ] || die "--dir é obrigatório"
[ -d "$WORK_DIR" ] || die "--dir não existe: $WORK_DIR"
if [ "$PROBE_ONLY" -eq 0 ]; then
  [ -n "$AGENT" ] || die "--agent é obrigatório"
  [ -n "$PROMPT_FILE" ] || die "--prompt-file é obrigatório"
  [ -r "$PROMPT_FILE" ] || die "--prompt-file ilegível: $PROMPT_FILE"
fi

if [ -n "$START_AT" ]; then
  is_pos_int "$START_AT" || die "--start-at deve ser um inteiro ≥ 1"
  [ "$START_AT" -ge 1 ] || die "--start-at deve ser um inteiro ≥ 1 (1-based)"
fi
is_pos_int "$TIMEOUT_S" || die "--timeout deve ser um inteiro ≥ 1"
is_pos_int "$HANG_TIMEOUT" || die "FG_HANG_TIMEOUT deve ser um inteiro ≥ 1"
is_pos_int "$PROBE_TIMEOUT" || die "FG_PROBE_TIMEOUT deve ser um inteiro ≥ 1"
is_pos_int "$PROBE_JOBS" || die "FG_PROBE_JOBS deve ser um inteiro ≥ 1"
is_pos_int "$POLL_INTERVAL" || die "FG_POLL_INTERVAL deve ser um inteiro ≥ 1"

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

# --- modo --probe: testa a cadeia em paralelo e sai ------------------------------

if [ "$PROBE_ONLY" -eq 1 ]; then
  PROBE_DIR=$(mktemp -d)
  log "probe chain=$CHAIN modelos=$TOTAL start-at=$FROM hang=${HANG_TIMEOUT}s teto=${PROBE_TIMEOUT}s"
  pi=0
  for MODEL in "${MODELS[@]}"; do
    pi=$((pi + 1))
    (
      if probe_model "$MODEL"; then
        printf 'ok\t\n' >"$PROBE_DIR/$pi"
      else
        printf 'fail\t%s\n' "$PROBE_REASON" >"$PROBE_DIR/$pi"
      fi
    ) &
    # lotes de PROBE_JOBS: cada `opencode` sobe MCPs/skills e satura a máquina se forem muitos
    if [ $((pi % PROBE_JOBS)) -eq 0 ]; then wait; fi
  done
  wait
  HEALTHY=""
  ITEMS=""
  pi=0
  for MODEL in "${MODELS[@]}"; do
    pi=$((pi + 1))
    idx=$((FROM + pi - 1))
    IFS=$'\t' read -r PSTATUS PREASON <"$PROBE_DIR/$pi" || true
    if [ "${PSTATUS:-fail}" = "ok" ]; then
      HEALTHY="${HEALTHY:+$HEALTHY,}$idx"
      POK=true
      log "probe [$idx] $MODEL: ok"
    else
      POK=false
      log "probe [$idx] $MODEL: FALHOU — ${PREASON:-sem resposta}"
    fi
    ITEMS="${ITEMS:+$ITEMS,}{\"index\":$idx,\"model\":\"$(json_escape "$MODEL")\",\"ok\":$POK,\"reason\":\"$(json_escape "${PREASON:-}")\"}"
  done
  rm -rf "$PROBE_DIR"
  printf '{"chain":"%s","healthy":[%s],"models":[%s]}\n' "$CHAIN" "$HEALTHY" "$ITEMS"
  [ -n "$HEALTHY" ] && exit 0
  exit 1
fi

PROMPT=$(cat "$PROMPT_FILE")

# --- loop de execução com fallback ----------------------------------------------

CURRENT_SESSION="$SESSION_ARG" # herdado de --session ou do -s capturado
FIRST_SESSION=""               # primeiro sessionID capturado (vai no JSON final)
ATTEMPTS=0
LAST_ERROR=""
LAST_MODEL=""

log "chain=$CHAIN agent=$AGENT dir=$WORK_DIR modelos=$TOTAL start-at=$FROM timeout=${TIMEOUT_S}s hang=${HANG_TIMEOUT}s probe=$PROBE_ENABLED retry=${RETRY_DELAY}s${TITLE:+ title=$TITLE}${SESSION_ARG:+ sessão-inicial=$SESSION_ARG}"

i=0
for MODEL in "${MODELS[@]}"; do
  i=$((i + 1))
  ATTEMPTS=$((ATTEMPTS + 1))

  # Sonda antes de gastar o prompt real: modelo morto é pulado em segundos.
  if [ "$PROBE_ENABLED" != "0" ]; then
    if ! probe_model "$MODEL"; then
      LAST_ERROR="sonda falhou: $PROBE_REASON (modelo $MODEL)"
      LAST_MODEL=$MODEL
      log "tentativa $ATTEMPTS/$TOTAL pulada — $LAST_ERROR"
      continue
    fi
  fi

  OUT_FILE=$(mktemp)
  ERR_FILE=$(mktemp)

  # NUNCA passa --auto (spec §3.2 / §5).
  CMD=(opencode run --agent "$AGENT" -m "$MODEL" --dir "$WORK_DIR" --format json --print-logs)
  if [ -n "$CURRENT_SESSION" ]; then
    CMD+=(-s "$CURRENT_SESSION")
  fi

  log "tentativa $ATTEMPTS/$TOTAL modelo=$MODEL${CURRENT_SESSION:+ sessão=$CURRENT_SESSION}"
  run_watched "$OUT_FILE" "$ERR_FILE" "$TIMEOUT_S" "$HANG_TIMEOUT" "${CMD[@]}" -- "$PROMPT"
  CODE=$WATCH_CODE
  ERR_SIG=$(error_lines "$ERR_FILE")
  if [ -n "$ERR_SIG" ]; then
    printf '%s\n' "$ERR_SIG" >&2
  fi

  # sessionID do primeiro evento JSON da saída.
  SID=$(grep -o '"sessionID":"[^"]*"' "$OUT_FILE" 2>/dev/null | head -n1 | cut -d'"' -f4)
  if [ -n "$SID" ]; then
    [ -z "$FIRST_SESSION" ] && FIRST_SESSION=$SID
    CURRENT_SESSION=$SID
  fi

  # Texto final: concatena os campos "text" dos eventos JSON. O corpo extraído já é
  # conteúdo válido de string JSON (a fonte é JSON válida), por isso é embutido cru.
  TEXT=$(grep -oE '"text":"([^"\\]|[\\].)*"' "$OUT_FILE" 2>/dev/null | sed 's/^"text":"//; s/"$//' | tr '\n' ' ' | sed 's/ *$//')

  # Falha = travamento/quota/teto, exit ≠ 0, "Request too large" / "Error:" / rate limit na saída,
  # OU texto vazio.
  FAILED=0
  REASON=""
  if [ "$WATCH_REASON" = "quota" ]; then
    FAILED=1
    REASON="erro do provedor (modelo $MODEL): $(provider_error "$ERR_FILE" | grep -o 'error.error="[^"]*"' | head -n1)"
  elif [ "$WATCH_REASON" = "hang" ]; then
    FAILED=1
    REASON="travado: sem progresso por ${HANG_TIMEOUT}s (modelo $MODEL)"
  elif [ "$WATCH_REASON" = "timeout" ]; then
    FAILED=1
    REASON="timeout de ${TIMEOUT_S}s (modelo $MODEL)"
  elif grep -q 'Request too large' "$OUT_FILE" 2>/dev/null || grep -q 'Request too large' <<<"$ERR_SIG"; then
    FAILED=1
    REASON="Request too large (modelo $MODEL)"
  elif [[ "$TEXT" == Error:* ]] || grep -q 'Error:' <<<"$ERR_SIG"; then
    FAILED=1
    ERR_TXT=$( { cat "$OUT_FILE" 2>/dev/null; printf '%s\n' "$ERR_SIG"; } | grep -m1 -o 'Error:[^"\\]*')
    REASON="${ERR_TXT:-Error} (modelo $MODEL)"
  elif grep -qi 'rate limit' "$OUT_FILE" 2>/dev/null || grep -qi 'rate limit' <<<"$ERR_SIG"; then
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
