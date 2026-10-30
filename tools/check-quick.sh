#!/usr/bin/env bash
# The quick check: an answer in minutes, before CI, on what the change in this worktree can break
# (design/ci/channels-pipeline/merging.md, section 6). A habit, not a gate: CI decides, and a failure
# here only means "you would have found out in CI". Run it in the background (it waits for test slots):
#
#   pnpm run check:quick [--base <ref>] [--with-dry-run]     (default base origin/master)
#
# 1. prettier --check on the files changed since the merge base with the base;
# 2. nx affected -t build lint typecheck (lint needs the builds of what it imports; local nx cache);
# 3. tools/test-changed.mjs: the tests CI's selection would run, with CI's shard commands, no coverage;
# 4. tools/sonar-gate.mjs: SonarQube on the changed lines (off the owner's network it passes, warning);
# 5. when webgpu-graph-algorithms is affected, its node tests on this machine's NVIDIA card;
# 6. PR Integrity on HEAD (tools/pr-integrity.mjs --local: test integrity, breaking
#    commits, baselines signed; Proof and the fresh review need the pull request and are left to CI);
# 7. the documentation site build CI's Docs job runs (npm run docs:build), when the change reaches the
#    site (tools/docs-affected.sh, the pre-push gate's rule);
# 8. the bundle size checks ci.yml's Checks job runs, for graphty-element and cytoscape-extensions when
#    affected or their script changed;
# 9. only with --with-dry-run: the graphty app's build, then its dry run (graphty/acceptance/run.mjs, every
#    route, on this machine's NVIDIA card). Never by default: the agent that owns a long-lived branch
#    asks for it before opening the pull request (CLAUDE.md, "Shipping a change", step 2; issue #3269).
#
# It runs every step, prints a summary and exits 1 when any failed. No tool self-tests, no screenshots.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT_DIR="$PWD"
MAIN_DIR="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"

BASE=origin/master
DRY_RUN=0
usage() {
    echo "usage: tools/check-quick.sh [--base <ref>] [--with-dry-run]" >&2
    exit 2
}
while [ $# -gt 0 ]; do
    case "$1" in
        --base) [ -n "${2:-}" ] || usage; BASE="$2"; shift 2 ;;
        --with-dry-run) DRY_RUN=1; shift ;;
        *) usage ;;
    esac
done

# The old gate's settings never reach a test (merging section 6); GRAPHTY_TEST_SLOTS and
# GRAPHTY_RESULTS_TOKEN stay. A hook's GIT_DIR and friends go too.
unset $(compgen -e | grep -E '^(PREPUSH_|TEST_LEDGER_)') TEST_SLOT_GATE GRAPHTY_TEST_QUARANTINE
unset $(git rev-parse --local-env-vars)
# sonar-gate.mjs measures "this push's changes" from the same base.
export PUSH_BASE_REF="$BASE"

MB="$(git merge-base "$BASE" HEAD)" || { echo "no merge base with $BASE" >&2; exit 2; }
FAILED=()
step() {
    local name="$1"
    shift
    echo "> $name"
    if "$@"; then echo "[PASS] $name"; else echo "[FAIL] $name"; FAILED+=("$name"); fi
    echo ""
}

changed_files() {
    { git diff --name-only --diff-filter=ACMR "$MB"; git ls-files --others --exclude-standard; } | sort -u
}
formatting() {
    local files
    mapfile -t files < <(changed_files)
    [ ${#files[@]} -eq 0 ] || pnpm exec prettier --check --ignore-unknown "${files[@]}"
}
gpu_tests() {
    local egl="${GRAPHTY_EGL_LIB_DIR:-$MAIN_DIR/tmp/egl/root/usr/lib/x86_64-linux-gnu}"
    (cd webgpu-graph-algorithms &&
        GRAPHTY_EGL_LIB_DIR="$egl" LD_LIBRARY_PATH="$egl${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
            GIT_CONFIG_GLOBAL=/dev/null GRAPHTY_GPU_REQUIRE=nvidia node "$ROOT_DIR/tools/test-slots.mjs" --gpu npm run test:run)
}

step "Formatting" formatting
step "Build, lint and type-check (affected)" pnpm exec nx affected -t build lint typecheck --base="$BASE"
# The tests read no developer git config (their git sandboxes would inherit signing, hooks, aliases).
step "Selected tests" env GIT_CONFIG_GLOBAL=/dev/null node tools/test-changed.mjs --base "$BASE"
step "SonarQube (changed lines)" node tools/sonar-gate.mjs
# Captured, not piped into grep -q: under pipefail an early grep exit could SIGPIPE nx and skip the
# GPU step, and a failing nx must not read as "not affected".
AFFECTED="$(pnpm exec nx show projects --affected --base="$BASE")" || FAILED+=("Affected projects (nx show projects)")
affected() { grep -qx "$1" <<<"$AFFECTED"; }
if affected webgpu-graph-algorithms; then
    step "webgpu-graph-algorithms on the local NVIDIA GPU" gpu_tests
fi
step "PR Integrity (local)" node tools/pr-integrity.mjs --local --base "$BASE"
source tools/docs-affected.sh
if docs_site_affected; then
    step "Docs site (npm run docs:build)" pnpm run docs:build
fi
# ci.yml's "Plan the package-only checks": the package is affected or the check's own script changed.
if affected graphty-element || git diff --name-only "$MB" | grep -q '^tools/check-bundle-size'; then
    step "Bundle size (graphty-element)" pnpm run check:bundle-size
fi
if affected cytoscape-extensions; then
    step "Bundle size (cytoscape-extensions)" pnpm --filter @graphty/cytoscape-extensions run size
fi
# The dry run walks graphty/dist, so it never runs on a build the app step failed to refresh.
dry_run() { pnpm exec nx run graphty:build && node graphty/acceptance/run.mjs; }
if [ "$DRY_RUN" = 1 ]; then
    step "Dry run of the graphty app (NVIDIA GPU)" dry_run
fi

echo "========================================"
if [ ${#FAILED[@]} -eq 0 ]; then
    echo "[PASS] quick check: every step passed (CI still decides)"
    exit 0
fi
printf '[FAIL] quick check: %s\n' "${FAILED[@]}"
exit 1
