#!/usr/bin/env bash
# The quick check: an answer in minutes, before CI, on what the change in this worktree can break
# (design/ci/channels-pipeline/merging.md, section 6). A habit, not a gate: CI decides, and a failure
# here only means "you would have found out in CI". Run it in the background (it waits for test slots):
#
#   pnpm run check:quick [--base <ref>] [--with-dry-run] [--whole-browser-shards]   (default base origin/master)
#
# 1. prettier --check on the files changed since the merge base with the base;
# 2. nx affected -t build lint typecheck (lint needs the builds of what it imports; local nx cache);
# 3. tools/test-changed.mjs: the tests CI's selection would run, with CI's shard commands, no coverage; a
#    browser shard CI runs whole runs only its selected files here, or nothing (issue #8042), unless
#    --whole-browser-shards asks for the whole shard;
# 4. tools/duplicates-check.mjs: no new duplicate code between non-test files since the base;
# 5. when webgpu-graph-algorithms is affected, its node tests on this machine's NVIDIA card;
# 6. PR Integrity on HEAD (tools/pr-integrity.mjs --local: test integrity, breaking
#    commits, baselines signed; Proof and the fresh review need the pull request and are left to CI);
# 7. the bundle size checks ci.yml's Checks job runs, for graphty-element and cytoscape-extensions when
#    affected or their script changed;
# 8. the rest of ci.yml's Checks job, with its commands and its "Plan the package-only checks" gating: the
#    tools tests (test:ci-workflows, which no test shard runs), CI budgets, offline links, the signing
#    bypass grep, Knip, published dependencies (of the affected packages, the ones built here), the
#    peer dependencies, the ESLint root config, the API report, feature flags, declared build tools, dry-run outcome checks,
#    the release hold list, data sources, migration counts, legacy API use, special style layers,
#    committed images and the Figma lock;
#    tools/check-quick.test.mjs fails when the Checks job gains a `pnpm run` step this script lacks;
# 9. only with --with-dry-run: the graphty app's build, then its dry run (graphty/acceptance/run.mjs, every
#    route, on this machine's NVIDIA card). Never by default: the agent that owns a long-lived branch
#    asks for it before opening the pull request (CLAUDE.md, "Shipping a change", step 2; issue #3269).
#
# Left to CI, which runs them on every pull request that needs them (issue #8052): the documentation site
# build (the Docs job; reproduce with pnpm run docs:build) and the whole-repository formatting check after a
# change to prettier's inputs (the Checks job's "Formatting" step; reproduce with pnpm run format:check).
#
# It runs every step, prints a summary and exits 1 when any failed. No tool self-tests, no screenshots.
# Each step's time goes into <main checkout>/tmp/step-times.jsonl (tools/step-log.mjs).
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT_DIR="$PWD"
MAIN_DIR="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"

BASE=origin/master
DRY_RUN=0
TEST_ARGS=()
usage() {
    echo "usage: tools/check-quick.sh [--base <ref>] [--with-dry-run] [--whole-browser-shards]" >&2
    exit 2
}
while [ $# -gt 0 ]; do
    case "$1" in
        --base) [ -n "${2:-}" ] || usage; BASE="$2"; shift 2 ;;
        --with-dry-run) DRY_RUN=1; shift ;;
        --whole-browser-shards) TEST_ARGS+=("$1"); shift ;;
        *) usage ;;
    esac
done

# The old gate's settings never reach a test (merging section 6); GRAPHTY_TEST_SLOTS and
# GRAPHTY_RESULTS_TOKEN stay. A hook's GIT_DIR and friends go too.
unset $(compgen -e | grep -E '^(PREPUSH_|TEST_LEDGER_)') TEST_SLOT_GATE GRAPHTY_TEST_QUARANTINE
unset $(git rev-parse --local-env-vars)
# duplicates-check.mjs measures "this push's changes" from the same base.
export PUSH_BASE_REF="$BASE"

MB="$(git merge-base "$BASE" HEAD)" || { echo "no merge base with $BASE" >&2; exit 2; }
# How long each step and the whole run took, one line each in <main checkout>/tmp/step-times.jsonl
# (tools/step-log.mjs). The log never fails or changes a step.
log_step() { node "$ROOT_DIR/tools/step-log.mjs" "$@" >/dev/null 2>&1 || true; }
RUN_START="$(date +%s%3N)"
trap 'log_step check-quick "$RUN_START" total "$?"' EXIT
FAILED=()
step() {
    local name="$1" start rc=0
    shift
    echo "> $name"
    start="$(date +%s%3N)"
    "$@" || rc=$?
    log_step check-quick-step "$start" "$name" "$rc"
    if [ "$rc" = 0 ]; then echo "[PASS] $name"; else echo "[FAIL] $name"; FAILED+=("$name"); fi
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
step "Selected tests" env GIT_CONFIG_GLOBAL=/dev/null node tools/test-changed.mjs --base "$BASE" "${TEST_ARGS[@]}"
step "Duplicate code" pnpm run check:duplicates
# Captured, not piped into grep -q: under pipefail an early grep exit could SIGPIPE nx and skip the
# GPU step, and a failing nx must not read as "not affected". --json=false: nx 22 otherwise prints one
# JSON array, which matches no project name, so every "when affected" step below was silently skipped.
AFFECTED="$(pnpm exec nx show projects --affected --base="$BASE" --json=false)" || FAILED+=("Affected projects (nx show projects)")
affected() { grep -qx "$1" <<<"$AFFECTED"; }
# graph-io's fidelity stories compile against graphty-element's source, but graph-io drops its project edge to
# graphty-element (a build cycle), so an element-only change leaves graph-io's lint unrun. CI type-checks them
# in the Storybooks job (graph-io:build-storybook depends on typecheck-stories).
if affected graphty-element; then
    step "graph-io fidelity stories type-check" pnpm exec nx run graph-io:typecheck-stories
fi
if affected webgpu-graph-algorithms; then
    step "webgpu-graph-algorithms on the local NVIDIA GPU" gpu_tests
fi
step "PR Integrity (local)" node tools/pr-integrity.mjs --local --base "$BASE"
# ci.yml's "Plan the package-only checks": the package is affected or the check's own script changed.
if affected graphty-element || git diff --name-only "$MB" | grep -q '^tools/check-bundle-size'; then
    step "Bundle size (graphty-element)" pnpm run check:bundle-size
fi
if affected graphty || git diff --name-only "$MB" | grep -qE '^graphty/scripts/(check-size|landing-files)'; then
    step "Bundle size (graphty app)" pnpm --filter @graphty/graphty run size
fi
if affected cytoscape-extensions; then
    step "Bundle size (cytoscape-extensions)" pnpm --filter @graphty/cytoscape-extensions run size
fi
# The Checks job (ci.yml), in its order. Its package-only steps run when the package is affected or the
# step's own script changed, as "Plan the package-only checks" decides.
touched() { grep -qE "$1" <<<"$(git diff --name-only "$MB")"; }
step "CI workflow tests" pnpm run test:ci-workflows
step "CI budgets" node tools/ci-budgets.mjs lint
step "Links (offline)" ./tools/check-links.sh --offline
no_signing_bypass() { ! git grep -niE -e 'no-gpg[-]sign' -e 'gpg[s]ign *[= ] *false' -- tools/ .husky/; }
step "No signing bypass in tools/ and .husky/" no_signing_bypass
step "Knip (dead code)" pnpm run lint:knip
step "Knip (production dependencies)" pnpm run lint:knip:prod
# CI has every package built; here only the affected ones are, and only they can ship something new.
published_deps() {
    local dirs=() p
    for p in $AFFECTED; do [ -f "$p/package.json" ] && dirs+=("$p"); done
    [ ${#dirs[@]} -eq 0 ] || pnpm run check:published-deps "${dirs[@]}"
}
step "Published dependencies (affected)" published_deps
step "Peer dependencies stable" pnpm run check:peer-deps
step "ESLint root config" pnpm run lint:eslint-root
if affected graphty-element || touched '^tools/api-report'; then
    step "Public API report (graphty-element)" pnpm run check:api-report
fi
step "Feature flags" pnpm run check:features
step "Declared build tools" pnpm run check:declared-tools
step "Dry-run outcome checks kept" pnpm run check:dry-run-checks
step "Release hold list" pnpm run check:release-hold
if affected graphty-element || touched '^tools/check-data-source-migration'; then
    step "Element data sources on graph-io" pnpm run check:data-source-migration
fi
step "Migration count script" pnpm run check:migration-counts
step "Legacy graph API use" pnpm run check:legacy-use
step "No special style layers" pnpm run check:special-layers
step "Readers honor the working graph" pnpm run check:working-graph
step "No committed walk screenshots" pnpm run check:committed-images
step "compact-mantine Figma lock" pnpm run check:figma-lock
step "Saved-format exceptions" pnpm run check:saved-format-allowlist
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
