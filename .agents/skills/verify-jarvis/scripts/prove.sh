#!/bin/sh
set -eu
cd "$(dirname "$0")/../../../.."
case "${1:-}" in
  ""|--conversation) spec=conversation.spec.ts ;;
  --smoke) spec=proof.spec.ts ;;
  --maintenance) spec=maintenance.spec.ts ;;
  *) printf 'Usage: %s [--conversation|--smoke|--maintenance]\n' "$0" >&2; exit 2 ;;
esac
mkdir -p .artifacts/verify-jarvis
JARVIS_PROOF_DIR=$(mktemp -d "$PWD/.artifacts/verify-jarvis/run-XXXXXX")
export JARVIS_PROOF_DIR
printf 'Evidence: %s\n' "$JARVIS_PROOF_DIR"
if [ "$spec" = conversation.spec.ts ] || [ "$spec" = maintenance.spec.ts ]; then
  if [ "${PI_APP_REAL_AUTH:-}" != 1 ] || [ -z "${PI_APP_REAL_AUTH_SOURCE_DIR:-}" ] || [ -z "${JARVIS_PROVIDER:-}" ] || [ -z "${JARVIS_MODEL:-}" ]; then
    printf '%s\n' 'BLOCKED: set PI_APP_REAL_AUTH=1, PI_APP_REAL_AUTH_SOURCE_DIR, JARVIS_PROVIDER and JARVIS_MODEL. Use --smoke only for the secondary no-provider UI check.' >"$JARVIS_PROOF_DIR/run.log"
    cat "$JARVIS_PROOF_DIR/run.log"
    printf '2\n' >"$JARVIS_PROOF_DIR/exit-code.txt"
    printf '%s\n' '{"result":"blocked","reason":"Missing explicit real-auth source, provider or model"}' >"$JARVIS_PROOF_DIR/result.json"
    exit 2
  fi
fi
if pnpm --filter @jarvis/desktop run build >"$JARVIS_PROOF_DIR/build.log" 2>&1; then
  :
else
  cat "$JARVIS_PROOF_DIR/build.log"
  exit 1
fi
set +e
pnpm exec playwright test -c .agents/skills/verify-jarvis/scripts/playwright.config.ts "$spec" --output "$JARVIS_PROOF_DIR/playwright" --reporter=line >"$JARVIS_PROOF_DIR/run.log" 2>&1
result=$?
set -e
cat "$JARVIS_PROOF_DIR/run.log"
printf '%s\n' "$result" >"$JARVIS_PROOF_DIR/exit-code.txt"
# The spec closes only its own Electron applications, even on assertion failure.
# Keep profile/workspace too: repo policy forbids deleting temp artifacts without approval.
if [ "$result" -eq 0 ]; then
  test -s "$JARVIS_PROOF_DIR/result.json"
  test -s "$JARVIS_PROOF_DIR/cleanup.json"
  if [ "$spec" = conversation.spec.ts ]; then
    test -s "$JARVIS_PROOF_DIR/restart-bravo.png"
    test -s "$JARVIS_PROOF_DIR/stream-samples.json"
    test -s "$JARVIS_PROOF_DIR/restart.zip"
  elif [ "$spec" = maintenance.spec.ts ]; then
    test -s "$JARVIS_PROOF_DIR/skills-try.png"
    test -s "$JARVIS_PROOF_DIR/navigation-thread-cap.png"
    test -s "$JARVIS_PROOF_DIR/worktree.png"
    test -s "$JARVIS_PROOF_DIR/worktree-git.json"
    test -s "$JARVIS_PROOF_DIR/follow-up-idle.png"
    test -s "$JARVIS_PROOF_DIR/follow-ups.zip"
  else
    test -s "$JARVIS_PROOF_DIR/restart.png"
    test -s "$JARVIS_PROOF_DIR/restart.zip"
  fi
fi
printf 'Retained evidence: %s\n' "$JARVIS_PROOF_DIR"
exit "$result"
