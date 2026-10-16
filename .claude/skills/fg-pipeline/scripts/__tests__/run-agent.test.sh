#!/usr/bin/env bash
# __tests__/run-agent.test.sh — testes de run-agent.sh com `opencode` falso no PATH.
# Spec: docs/specs/FING-26-fg-pipeline.md, seção 6 ("Script run-agent.sh").
# Sem rede, sem tokens: o binário `opencode` é o fixture fixtures/opencode-stub.sh.
#
# Uso: bash .claude/skills/fg-pipeline/scripts/__tests__/run-agent.test.sh
set -u

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
SCRIPTS_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
RUN_AGENT="$SCRIPTS_DIR/run-agent.sh"
STUB="$SCRIPTS_DIR/fixtures/opencode-stub.sh"

ORIG_PATH="$PATH"
PASSED=0
FAILED=0
FAIL=0

# Cadeias esperadas — devem bater com chains.conf (spec §2.2, seção 2.2 da spec FING-26)
IMPL_MODELS=(
  "opencode/mimo-v2.6-flash-free"
  "opencode/longcat-2.5-preview-free"
  "opencode/beam-free"
  "openrouter/xingchen-agi/xing4.0-29b-a4b:free"
  "openrouter/poolside/laguna-xs-2.1:free"
  "openrouter/openrouter/free"
  "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free"
  "openrouter/nvidia/nemotron-3.5-lightning:free"
  "openrouter/nvidia/nemotron-3.5-super-vl:free"
)
REVIEW_MODELS=(
  "google/gemini-3.8-flash"
  "google/gemini-3.7-flash"
  "google/gemini-3.5-flash-lite"
  "google/gemini-3.1-flash-lite"
)

STUB_TEXT="Implementacao da etapa 1 concluida com sucesso."

# ---------------------------------------------------------------------------
# Harness
# ---------------------------------------------------------------------------
setup() {
  TMP=$(mktemp -d)
  mkdir -p "$TMP/bin" "$TMP/worktree"
  # wrapper `opencode` no PATH que delega ao stub
  cat > "$TMP/bin/opencode" <<EOF
#!/usr/bin/env bash
exec bash "$STUB" "\$@"
EOF
  chmod +x "$TMP/bin/opencode"
  PATH="$TMP/bin:$ORIG_PATH"
  export PATH
  OPENCODE_STUB_LOG="$TMP/stub.log"
  OPENCODE_STUB_COUNTER="$TMP/stub.counter"
  OPENCODE_STUB_MODES="success"
  OPENCODE_STUB_TEXT="$STUB_TEXT"
  export OPENCODE_STUB_LOG OPENCODE_STUB_COUNTER OPENCODE_STUB_MODES OPENCODE_STUB_TEXT
  FG_RETRY_DELAY=0
  export FG_RETRY_DELAY
  unset FG_CHAINS_FILE 2>/dev/null || true
  PROMPT_FILE="$TMP/prompt.md"
  printf '%s\n' "Implemente a etapa 1: criar o modulo de teste (TDD)." > "$PROMPT_FILE"
  RA_STDOUT="$TMP/ra.out"
  RA_STDERR="$TMP/ra.err"
  RA_OUT=""
  RA_CODE=0
}

teardown() {
  rm -rf "$TMP"
  PATH="$ORIG_PATH"
  export PATH
}

fail() {
  echo "    FAIL: $1" >&2
  FAIL=$((FAIL + 1))
}

assert_eq() { # desc esperado obtido
  if [ "$2" != "$3" ]; then
    fail "$1 — esperado [$2], obtido [$3]"
  fi
}

assert_contains() { # desc needle haystack
  case "$3" in
    *"$2"*) : ;;
    *) fail "$1 — não contém [$2]" ;;
  esac
}

assert_file_contains() { # desc file needle
  if ! grep -Fq -- "$3" "$2" 2>/dev/null; then
    fail "$1 — arquivo não contém [$3]"
  fi
}

assert_file_not_contains() { # desc file needle
  if grep -Fq -- "$3" "$2" 2>/dev/null; then
    fail "$1 — arquivo contém proibido [$3]"
  fi
}

assert_single_line_stdout() {
  [ -n "$RA_OUT" ] || { fail "stdout vazio"; return; }
  case "$RA_OUT" in
    *$'\n'*) fail "stdout deveria ter exatamente 1 linha JSON" ;;
  esac
}

run_agent() {
  bash "$RUN_AGENT" "$@" >"$RA_STDOUT" 2>"$RA_STDERR"
  RA_CODE=$?
  RA_OUT=$(cat "$RA_STDOUT")
}

json_str() { # field → valor entre aspas
  printf '%s' "$RA_OUT" | grep -o "\"$1\":\"[^\"]*\"" | head -n1 | sed "s/^\"$1\":\"//; s/\"$//"
}

json_bool() { # field → true|false
  printf '%s' "$RA_OUT" | grep -o "\"$1\":\(true\|false\)" | head -n1 | sed "s/^\"$1\"://"
}

json_num() { # field → inteiro
  printf '%s' "$RA_OUT" | grep -o "\"$1\":[0-9]*" | head -n1 | sed "s/^\"$1\"://"
}

log_line() { # nº da linha do log do stub
  sed -n "${1}p" "$OPENCODE_STUB_LOG" 2>/dev/null
}

log_count() {
  if [ -f "$OPENCODE_STUB_LOG" ]; then
    wc -l < "$OPENCODE_STUB_LOG" | tr -d '[:space:]'
  else
    echo 0
  fi
}

run_test() {
  local name="$1"
  local before="$FAIL"
  setup
  "$name"
  teardown
  if [ "$FAIL" -eq "$before" ]; then
    echo "ok   - $name"
    PASSED=$((PASSED + 1))
  else
    echo "FAIL - $name"
    FAILED=$((FAILED + 1))
  fi
}

# ---------------------------------------------------------------------------
# Critérios de aceitação (spec §6 — "Script run-agent.sh")
# ---------------------------------------------------------------------------

# Sucesso no 1º modelo → JSON ok:true, attempts:1, sessionID extraído; logs no stderr.
test_success_first_model() {
  run_agent --chain IMPL --agent test-agent --dir "$TMP/worktree" \
    --prompt-file "$PROMPT_FILE" --timeout 10
  assert_eq "exit code" 0 "$RA_CODE"
  assert_single_line_stdout
  assert_eq "ok" "true" "$(json_bool ok)"
  assert_eq "attempts" "1" "$(json_num attempts)"
  assert_eq "sessionID extraído" "ses_stub_1" "$(json_str sessionID)"
  assert_eq "model" "opencode/mimo-v2.6-flash-free" "$(json_str model)"
  assert_eq "text" "$STUB_TEXT" "$(json_str text)"
  # diagnóstico vai para stderr, não para o stdout
  [ -s "$RA_STDERR" ] || fail "stderr deveria conter logs de diagnóstico"
  # exatamente 1 chamada, com os flags corretos e sem --auto
  assert_eq "nº de chamadas" "1" "$(log_count)"
  local line
  line=$(log_line 1)
  assert_contains "1ª chamada: -m do 1º modelo" "model=opencode/mimo-v2.6-flash-free" "$line"
  assert_contains "1ª chamada: sem -s" "session=-" "$line"
  assert_contains "1ª chamada: --agent" "agent=test-agent" "$line"
  assert_contains "1ª chamada: --dir" "--dir" "$line"
  assert_contains "1ª chamada: --format json" "--format json" "$line"
  assert_contains "1ª chamada: prompt posicional" "Implemente a etapa 1" "$line"
  assert_file_not_contains "nunca passa --auto" "$OPENCODE_STUB_LOG" "--auto"
}

# Falha no 1º e sucesso no 2º → 2ª chamada usa -s <sessionID> e -m do 2º modelo.
test_fallback_reuses_session() {
  OPENCODE_STUB_MODES="exit1,success"
  export OPENCODE_STUB_MODES
  run_agent --chain IMPL --agent test-agent --dir "$TMP/worktree" \
    --prompt-file "$PROMPT_FILE" --timeout 10
  assert_eq "exit code" 0 "$RA_CODE"
  assert_single_line_stdout
  assert_eq "ok" "true" "$(json_bool ok)"
  assert_eq "attempts" "2" "$(json_num attempts)"
  assert_eq "sessionID" "ses_stub_1" "$(json_str sessionID)"
  assert_eq "model" "opencode/longcat-2.5-preview-free" "$(json_str model)"
  assert_eq "nº de chamadas" "2" "$(log_count)"
  assert_contains "1ª chamada: 1º modelo" "model=opencode/mimo-v2.6-flash-free" "$(log_line 1)"
  assert_contains "1ª chamada: sem -s" "session=-" "$(log_line 1)"
  assert_contains "2ª chamada: -m do 2º modelo" "model=opencode/longcat-2.5-preview-free" "$(log_line 2)"
  assert_contains "2ª chamada: reutiliza -s" "session=ses_stub_1" "$(log_line 2)"
  assert_file_not_contains "nunca passa --auto" "$OPENCODE_STUB_LOG" "--auto"
}

# Saída com "Error:" com exit 0 é tratada como falha (entra na cadeia de fallback).
test_error_text_with_exit0_is_failure() {
  OPENCODE_STUB_MODES="error,success"
  export OPENCODE_STUB_MODES
  run_agent --chain IMPL --agent test-agent --dir "$TMP/worktree" \
    --prompt-file "$PROMPT_FILE" --timeout 10
  assert_eq "exit code" 0 "$RA_CODE"
  assert_eq "ok" "true" "$(json_bool ok)"
  assert_eq "attempts (fallback ocorreu)" "2" "$(json_num attempts)"
  assert_eq "model" "opencode/longcat-2.5-preview-free" "$(json_str model)"
}

# Saída com "Request too large" com exit 0 é tratada como falha.
test_toolarge_with_exit0_is_failure() {
  OPENCODE_STUB_MODES="toolarge,success"
  export OPENCODE_STUB_MODES
  run_agent --chain IMPL --agent test-agent --dir "$TMP/worktree" \
    --prompt-file "$PROMPT_FILE" --timeout 10
  assert_eq "exit code" 0 "$RA_CODE"
  assert_eq "attempts (fallback ocorreu)" "2" "$(json_num attempts)"
}

# Rate limit é tratado como falha.
test_rate_limit_is_failure() {
  OPENCODE_STUB_MODES="ratelimit,success"
  export OPENCODE_STUB_MODES
  run_agent --chain IMPL --agent test-agent --dir "$TMP/worktree" \
    --prompt-file "$PROMPT_FILE" --timeout 10
  assert_eq "exit code" 0 "$RA_CODE"
  assert_eq "attempts (fallback ocorreu)" "2" "$(json_num attempts)"
}

# Texto final vazio é tratado como falha.
test_empty_text_is_failure() {
  OPENCODE_STUB_MODES="empty,success"
  export OPENCODE_STUB_MODES
  run_agent --chain IMPL --agent test-agent --dir "$TMP/worktree" \
    --prompt-file "$PROMPT_FILE" --timeout 10
  assert_eq "exit code" 0 "$RA_CODE"
  assert_eq "ok" "true" "$(json_bool ok)"
  assert_eq "attempts (fallback ocorreu)" "2" "$(json_num attempts)"
}

# Toda a cadeia falha → exit 1 e JSON ok:false com o último erro.
test_all_chain_fails() {
  OPENCODE_STUB_MODES="exit1"
  export OPENCODE_STUB_MODES
  run_agent --chain REVIEW --agent project-review --dir "$TMP/worktree" \
    --prompt-file "$PROMPT_FILE" --timeout 10
  assert_eq "exit code" 1 "$RA_CODE"
  assert_single_line_stdout
  assert_eq "ok" "false" "$(json_bool ok)"
  assert_eq "attempts" "4" "$(json_num attempts)"
  assert_eq "lastModel" "google/gemini-3.1-flash-lite" "$(json_str lastModel)"
  assert_contains "error cita exit code" "exit code 1" "$(json_str error)"
  assert_contains "error cita o último modelo" "google/gemini-3.1-flash-lite" "$(json_str error)"
}

# --chain REVIEW usa exatamente a cadeia Gemini na ordem da spec.
test_review_chain_order() {
  OPENCODE_STUB_MODES="exit1"
  export OPENCODE_STUB_MODES
  run_agent --chain REVIEW --agent project-review --dir "$TMP/worktree" \
    --prompt-file "$PROMPT_FILE" --timeout 10
  assert_eq "exit code" 1 "$RA_CODE"
  assert_eq "nº de chamadas" "4" "$(log_count)"
  local i=1 m
  for m in "${REVIEW_MODELS[@]}"; do
    assert_contains "REVIEW[$i]=$m" "model=$m " "$(log_line "$i")"
    i=$((i + 1))
  done
  assert_file_not_contains "nunca passa --auto (review)" "$OPENCODE_STUB_LOG" "--auto"
}

# --chain IMPL usa a cadeia free na ordem da seção 2.2.
test_impl_chain_order() {
  OPENCODE_STUB_MODES="exit1"
  export OPENCODE_STUB_MODES
  run_agent --chain IMPL --agent devops-platform-engineer --dir "$TMP/worktree" \
    --prompt-file "$PROMPT_FILE" --timeout 10
  assert_eq "exit code" 1 "$RA_CODE"
  assert_eq "nº de chamadas" "9" "$(log_count)"
  local i=1 m
  for m in "${IMPL_MODELS[@]}"; do
    assert_contains "IMPL[$i]=$m" "model=$m " "$(log_line "$i")"
    i=$((i + 1))
  done
  assert_file_not_contains "nunca passa --auto (impl)" "$OPENCODE_STUB_LOG" "--auto"
}

# Argumentos inválidos → exit 2 e nenhuma chamada ao `opencode`.
test_invalid_args_exit2() {
  expect2() {
    local desc="$1"
    shift
    run_agent "$@"
    assert_eq "$desc: exit" 2 "$RA_CODE"
  }
  expect2 "sem argumentos"
  expect2 "chain inválida" --chain BOGUS --agent a --dir "$TMP/worktree" --prompt-file "$PROMPT_FILE"
  expect2 "sem --agent" --chain IMPL --dir "$TMP/worktree" --prompt-file "$PROMPT_FILE"
  expect2 "sem --dir" --chain IMPL --agent a --prompt-file "$PROMPT_FILE"
  expect2 "sem --prompt-file" --chain IMPL --agent a --dir "$TMP/worktree"
  expect2 "prompt inexistente" --chain IMPL --agent a --dir "$TMP/worktree" --prompt-file "$TMP/nope.md"
  expect2 "dir inexistente" --chain IMPL --agent a --dir "$TMP/no-such-dir" --prompt-file "$PROMPT_FILE"
  expect2 "start-at zero" --chain IMPL --agent a --dir "$TMP/worktree" --prompt-file "$PROMPT_FILE" --start-at 0
  expect2 "start-at não numérico" --chain IMPL --agent a --dir "$TMP/worktree" --prompt-file "$PROMPT_FILE" --start-at abc
  expect2 "start-at além do fim" --chain IMPL --agent a --dir "$TMP/worktree" --prompt-file "$PROMPT_FILE" --start-at 99
  expect2 "timeout inválido" --chain IMPL --agent a --dir "$TMP/worktree" --prompt-file "$PROMPT_FILE" --timeout abc
  expect2 "flag desconhecida" --chain IMPL --agent a --dir "$TMP/worktree" --prompt-file "$PROMPT_FILE" --frobnicate
  expect2 "flag sem valor" --chain
  assert_eq "nenhuma chamada ao opencode" "0" "$(log_count)"
}

# --start-at pula os modelos anteriores.
test_start_at() {
  run_agent --chain REVIEW --agent project-review --dir "$TMP/worktree" \
    --prompt-file "$PROMPT_FILE" --start-at 3 --timeout 10
  assert_eq "exit code" 0 "$RA_CODE"
  assert_eq "attempts" "1" "$(json_num attempts)"
  assert_eq "model" "google/gemini-3.5-flash-lite" "$(json_str model)"
  assert_contains "1ª chamada é o 3º modelo" "model=google/gemini-3.5-flash-lite " "$(log_line 1)"
}

# --session inicial é repassado como -s já na 1ª chamada.
test_session_option() {
  run_agent --chain IMPL --agent test-agent --dir "$TMP/worktree" \
    --prompt-file "$PROMPT_FILE" --session ses_init --timeout 10
  assert_eq "exit code" 0 "$RA_CODE"
  assert_contains "1ª chamada usa -s" "session=ses_init" "$(log_line 1)"
  assert_eq "sessionID" "ses_init" "$(json_str sessionID)"
}

# --title é aceito (usado só nos logs) e não quebra a execução.
test_title_accepted() {
  run_agent --chain IMPL --agent test-agent --dir "$TMP/worktree" \
    --prompt-file "$PROMPT_FILE" --title "Etapa 1 — scripts" --timeout 10
  assert_eq "exit code" 0 "$RA_CODE"
  assert_contains "title nos logs" "Etapa 1" "$(cat "$RA_STDERR")"
}

# chains.conf ausente/ilegível → exit 2 (pré-condição da invocação).
test_chains_file_missing() {
  FG_CHAINS_FILE="$TMP/nao-existe.conf"
  export FG_CHAINS_FILE
  run_agent --chain IMPL --agent a --dir "$TMP/worktree" --prompt-file "$PROMPT_FILE"
  assert_eq "exit code" 2 "$RA_CODE"
}

# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------
echo "run-agent.test.sh — spec FING-26 §6 (stub: opencode-stub.sh, sem rede)"
echo

run_test test_success_first_model
run_test test_fallback_reuses_session
run_test test_error_text_with_exit0_is_failure
run_test test_toolarge_with_exit0_is_failure
run_test test_rate_limit_is_failure
run_test test_empty_text_is_failure
run_test test_all_chain_fails
run_test test_review_chain_order
run_test test_impl_chain_order
run_test test_invalid_args_exit2
run_test test_start_at
run_test test_session_option
run_test test_title_accepted
run_test test_chains_file_missing

echo
echo "Resultados: $PASSED passaram, $FAILED falharam."
[ "$FAILED" -eq 0 ]
