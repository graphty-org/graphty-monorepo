#!/bin/bash
# Pre-push validation script
# Runs build, lint, the CI test shards (graphty-element's long browser and storybook shards
# only when the push changes a file they test) and the screenshots -- for the packages
# this push AFFECTS only. "Affected" is nx's answer for
# the commits since this branch left origin/master: a package whose files changed, and
# every package that depends on one -- the same set a pull request's CI tests.
# Knip (both passes) and the published-dependency check run on EVERY push, a push that affects
# no package included: they check the whole repository, root files (knip.config.ts, package.json
# scripts, tools/) too, and CI's Build job always runs them. About 35 seconds (2026-10-06).
# PREPUSH_ALL=1 runs every package.
# PREPUSH_LIGHT=1 is the light gate: everything above but the test shards and the screenshots, which CI
# runs instead. The NVIDIA
# GPU step still runs when webgpu-graph-algorithms is affected. Unset or 0 is the full gate.
# This script avoids nx to work around git hook issues with nx daemon

# A run_step check that fails ends the run at once (run_step exits), so a formatting or lint slip is
# reported in seconds instead of after the build and the tests. The source-only checks run first,
# before the build, the SonarQube changed-lines scan among them; then the build, knip, lint with
# type-check (inside each package's lint), and the tests. The screenshots run in the background and
# are reported at the end; a run_step failure stops them (the EXIT trap).

# Where the gate's scripts are (SCRIPT_DIR) and the checkout they check (ROOT_DIR). The push queue
# runs the gate from one live copy, .worktrees/gate-live, against the checkout being pushed, named in
# PREPUSH_ROOT, so a fix to the gate takes effect for every branch at once. Without PREPUSH_ROOT the
# gate checks its own checkout, as it always did. What is checked -- package.json scripts, the CI test
# matrix, run-tests.sh, every config -- is always the checkout's own, exactly as CI runs it.
# PREPUSH_ROOT is unset at once so no check inherits it; the gate's scripts get it explicitly.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${PREPUSH_ROOT:-$(dirname "$SCRIPT_DIR")}" && pwd)" || exit 1
unset PREPUSH_ROOT

cd "$ROOT_DIR"
LIGHT="${PREPUSH_LIGHT:-0}"

# git runs this hook with GIT_DIR and friends exported, pointing at the real repository. Any step
# that runs git in a temporary directory -- a test building a throwaway repository -- would then act
# on this repository instead: `git init` there has turned the checkout bare (twice), and test commits
# landed on the branch being pushed. No step needs them; each runs from this directory.
unset $(git rev-parse --local-env-vars)

# A build or test that crashes must not leave a core dump (often gigabytes) in the checkout: every
# step below runs in this shell's children, so this one limit covers them all.
ulimit -c 0

echo "========================================"
echo "Pre-push validation"
echo "========================================"
echo ""

# A global pnpm older than 10.29.1 runs the pinned one through a version switch that exits 0 when the
# pnpm it started dies by a signal (issue #2116). The test stage does not trust that exit 0
# (tools/shard-verdict.mjs), but every other step does, so say so. Turning the switch off shows the
# global version, not the pinned one.
GLOBAL_PNPM="$(npm_config_manage_package_manager_versions=false pnpm --version 2>/dev/null | tail -1)"
if [ -n "$GLOBAL_PNPM" ] && [ "$(printf '%s\n' "$GLOBAL_PNPM" 10.29.1 | sort -V | head -1)" != 10.29.1 ]; then
    echo "WARNING: the pnpm on PATH is $GLOBAL_PNPM, older than 10.29.1, so a pnpm exec killed by a signal exits 0; run pnpm self-update"
fi

# The gate runs at normal priority: other work yields to it (tools/low-priority.sh), never the other way
# round. A gate started from a niced
# shell inherits the niceness and cannot lower it again without privilege, so say so.
if [ "$(nice)" != 0 ]; then
    echo "WARNING: the gate runs at niceness $(nice), not 0: it was started from a lowered shell (tools/low-priority.sh?), so other work gets the CPU first"
fi

# The source-only checks (formatting, links, the tool and config checks, SonarQube's changed-lines
# scan), and run_step, the colors and SONAR_LOG every step below uses.
# tools/prepush-source-checks.sh says why they come first and when they are skipped.
PREPUSH_ROOT="$ROOT_DIR" source "$SCRIPT_DIR/prepush-source-checks.sh"

# The whole gate already passed on exactly these inputs (GATE_KEY, from the source-only checks: every
# file git does not ignore, the installed lockfile, the gate's scripts, the Node version and the lane
# environment; tools/prepush-inputs.mjs), on any branch: nothing below can come out differently, so it
# does not run again. PREPUSH_RERUN_ALL=1 runs it all.
if [ -n "$GATE_KEY" ] && [ "${PREPUSH_RERUN_ALL:-}" != 1 ] &&
    GATE_PASS="$(node "$SCRIPT_DIR/prepush-inputs.mjs" passed gate "$GATE_KEY" 2>/dev/null)"; then
    echo -e "${GREEN}[SKIP] The whole gate: it already passed on exactly these inputs ($(jq -r '"\(.branch // "detached") at \(.sha[0:12]), \(.at)"' <<<"$GATE_PASS" 2>/dev/null); key ${GATE_KEY:0:12}; PREPUSH_RERUN_ALL=1 runs it)${NC}"
    echo -e "${GREEN}All pre-push checks passed!${NC}"
    exit 0
fi

# Track failures.
#
# FAILED is the overall verdict and decides the exit code, so every background step ORs into it
# (a run_step failure exits on the spot instead).
# It must NOT be used to grade an individual step: a step-specific verdict needs its
# own flag, or an earlier step's failure is reported against a step
# that passed -- knip failing once made the summary print "Some tests failed" on a run
# where every test passed.
FAILED=0

# The background steps: each its own process group (setsid), killed by the EXIT trap, so a push that
# ends early (a failed step, Ctrl-C, a tool timeout killing this script) takes them with it. A
# screenshot capture staged for a push that did not pass is thrown away, never promoted.
MAIN_DIR="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
PUSH_HEAD="$(git rev-parse HEAD)"
SCREENSHOTS_PGID=""
SCREENSHOTS_STAGED=0
GPU_PGID=""
cleanup() {
    bg_kill
    if [ -n "$GPU_PGID" ]; then
        kill -- -"$GPU_PGID" 2>/dev/null
        wait "$GPU_PGID" 2>/dev/null
    fi
    if [ -n "$SCREENSHOTS_PGID" ]; then
        # Its whole session too: the capture's time limits (timeout) put its steps in groups of their own.
        pkill -s "$SCREENSHOTS_PGID" 2>/dev/null
        kill -- -"$SCREENSHOTS_PGID" 2>/dev/null || kill "$SCREENSHOTS_PGID" 2>/dev/null
        wait "$SCREENSHOTS_PGID" 2>/dev/null
    fi
    [ "$SCREENSHOTS_STAGED" = 1 ] && PREPUSH_ROOT="$ROOT_DIR" "$SCRIPT_DIR/visual-preview.sh" --discard "$PUSH_HEAD" >/dev/null 2>&1
}
trap cleanup EXIT

# The affected projects, as nx names them. The base is where this branch left the branch it merges
# into (tools/push-base.mjs: origin/master, or the parent branch of a stacked pull request), so
# commits other people landed there since then do not count as this push's changes.
NX_SHOW_ERR=$(mktemp)
if [ "${PREPUSH_ALL:-0}" = "1" ]; then
    PROJECTS=$(NX_DAEMON=false pnpm exec nx show projects --json 2>"$NX_SHOW_ERR")
else
    PUSH_BASE_REF=${PUSH_BASE_REF:-$(node "$SCRIPT_DIR/push-base.mjs")} && export PUSH_BASE_REF
    BASE=$(git merge-base "$PUSH_BASE_REF" HEAD)
    PROJECTS=$(NX_DAEMON=false pnpm exec nx show projects --affected --base="$BASE" --head=HEAD --json 2>"$NX_SHOW_ERR")
fi
# An empty answer is nx (or the pnpm in front of it) cut short, not "nothing affected", which is "[]".
if [[ "$PROJECTS" != "["* ]]; then
    echo "nx show projects printed no project list, so the affected packages are unknown; stopping. Its errors:" >&2
    tail -20 "$NX_SHOW_ERR" >&2
    rm -f "$NX_SHOW_ERR"
    exit 1
fi
rm -f "$NX_SHOW_ERR"
PROJECT_LIST=$(echo "$PROJECTS" | tr -d '[]" ')
affected() { echo ",$PROJECT_LIST," | grep -q ",$1,"; }
# The same packages as directories (nx names remote-logger by its package name).
DIR_LIST=$(echo "$PROJECT_LIST" | tr ',' ' ' | sed 's#@graphty/##g')

# The packages with an API reference in the documentation site (a root `docs:api:<package>` script).
DOCS_API_PACKAGES=$(node -p 'Object.keys(require("./package.json").scripts).filter((k) => k.startsWith("docs:api:")).map((k) => k.slice(9)).join(" ")')

# The documentation site, built as CI's Docs job builds it (npm run docs:build: docs:content, every
# docs:api, vitepress build docs). TypeDoc writes whatever a doc comment holds, and only VitePress's
# Vue compiler rejects a page that is not valid template: a code span split across two lines of a
# doc comment left a bare `<value>` tag in a generated page, and "Element is missing end tag" failed
# CI's Docs job on 2026-10-22. It runs when an affected package has an API reference, or the push
# changes docs/, a package's docs/ that tools/copy-docs-content.js copies in, or the scripts that
# assemble the site. It reuses the API pages the "API docs" steps generated and builds only the other
# packages' ones, so a dead link VitePress finds fails here too. Needs the build. About 3 minutes
# (2026-10-22, a busy machine): the other API pages 30 seconds, vitepress build 2.5 minutes.
docs_site_affected() {
    local p
    for p in $DOCS_API_PACKAGES; do affected "$p" && return 0; done
    [ -z "${BASE:-}" ] && return 0
    ! git diff --quiet "$BASE" HEAD -- docs/ $(sed -nE 's#^ *src: "([^"]+)".*#\1/#p' tools/copy-docs-content.js) \
        tools/copy-docs-content.js tools/sanitize-api-docs.js
}
docs_site_step() {
    docs_site_affected || return 0
    local cmd="pnpm run docs:content" p
    for p in $DOCS_API_PACKAGES; do affected "$p" || cmd="$cmd && pnpm run docs:api:$p"; done
    run_step "Docs site (VitePress build)" "$cmd && node tools/sanitize-api-docs.js && pnpm exec vitepress build docs"
}

# Under the summary: repeat a skipped check's warning so it does not scroll away. SONAR_LOG holds the
# output of the SonarQube step's last run on this checkout (tools/prepush-source-checks.sh), which is
# this push's run, or the earlier one on exactly these files when the source-only checks were skipped.
sonar_reminder() {
    if grep -q "SonarQube did NOT check this push" "$SONAR_LOG" 2>/dev/null; then
        echo -e "${YELLOW}Reminder: SonarQube did NOT check this push (see its box in the source-only checks).${NC}"
    fi
}

if [ -z "$PROJECT_LIST" ]; then
    echo -e "${GREEN}No package is affected by this push; only the whole-repository checks run.${NC}"
else
    echo "Affected packages: $PROJECT_LIST"
fi
echo ""

# CI lints a pull request merged with its base; this gate lints the branch as it is. They match unless
# the base changed the lint configuration (a new rule, a rule's settings) since the branch last merged
# it, so then the push is refused with "merge <base> first" -- before the build, so it costs seconds
# (issue #2985). PREPUSH_ALL=1 has no base, and a push that affects no package lints nothing, so they skip it.
if [ -n "${PUSH_BASE_REF:-}" ] && [ -n "$PROJECT_LIST" ]; then
    run_step "Lint configuration current with $PUSH_BASE_REF" "node '$SCRIPT_DIR/lint-base-drift.mjs' '$PUSH_BASE_REF'"
fi

# Build the affected packages (nx builds what they depend on first: build dependsOn ^build).
# nx, not `pnpm -r run build`: for graph-format and layout the nx build TARGET is `npm run build:all`,
# while their `build` SCRIPT is a plain tsc that never writes the bundled dist/<pkg>.d.ts the strict-consumer
# compiles resolve through. On a clean tree the script form left those missing and the gate failed at Lint.
# It is also what CI runs (.github/workflows/ci.yml), which is the parity CLAUDE.md asks for.
# Knip and the published-dependency check resolve every package's imports through its dist/, so
# an unaffected package with no dist yet (a fresh worktree) is built too. A package that has one
# is left alone: nothing in this push changed it. Only projects with a build target are listed
# (visual-review has none), so nx does not warn about the rest.
BUILD_LIST=""
WITH_BUILD=$(NX_DAEMON=false pnpm exec nx show projects --with-target build --json 2>/dev/null)
# Cut short, nx prints nothing, and an empty list would skip the build without a word.
if [[ "$WITH_BUILD" != "["* ]]; then
    echo "nx show projects --with-target build printed no project list; stopping" >&2
    exit 1
fi
for p in $(echo "$WITH_BUILD" | tr -d "[]\"" | tr "," " "); do
    { affected "$p" || [ ! -d "${p#@graphty/}/dist" ]; } && BUILD_LIST="$BUILD_LIST,$p"
done
BUILD_LIST="${BUILD_LIST#,}"
[ -n "$BUILD_LIST" ] && run_step "Build" "pnpm exec nx run-many -t build --projects=$BUILD_LIST --parallel=3"

# webgpu-graph-algorithms: its lint runs the strict-consumer compile against the d.ts shims that only
# build:bundle writes (tsc emits none; the package has no root entry file), so bundle it before Lint
if affected webgpu-graph-algorithms; then
    run_step "Bundle webgpu-graph-algorithms" "(cd webgpu-graph-algorithms && npm run build:bundle)"
fi

# Screenshots, in the background while the tests run: tools/visual-preview.sh --head fetches master,
# then captures the Storybooks this push affects on the commit being pushed merged into origin/master,
# with the pinned fonts and master's capture code, exactly as CI's visual job will -- in its own
# worktree (.worktrees/visual-preview), so nothing here touches this checkout. The capture is staged
# under the commit and promoted to the branch's preview (its open pull request's, which the owner's
# review page offers for review and Finish before CI's capture exists) only when every check passed,
# so a refused push never replaces the preview of the head already on GitHub. Changed or new images
# never block the push (the owner reviews them); a capture that crashes, a story that fails to render,
# or a capture that works longer than PREPUSH_SCREENSHOTS_TIMEOUT (default 45m) does. The limit counts
# only work: it starts once the capture holds its lock, and each Storybook's capture starts its share
# once it holds a browser slot, so a long wait behind the test shards' browsers never fails it (its log
# says when it waits and when it works). Its own process group, killed by the EXIT trap,
# so a step that stops the gate stops the capture with it.
# The light gate (PREPUSH_LIGHT=1) captures nothing: CI's visual job on the cut pull request is the capture.
if [ "$LIGHT" != 1 ] && [ -n "$PROJECT_LIST" ]; then
    SCREENSHOTS_LOG="$MAIN_DIR/tmp/visual-preview/prepush-$(basename "$ROOT_DIR").log"
    mkdir -p "$(dirname "$SCREENSHOTS_LOG")"
    echo -e "${YELLOW}> Screenshots, in the background (log: $SCREENSHOTS_LOG)${NC}"
    setsid env VISUAL_PREVIEW_TIMEOUT="${PREPUSH_SCREENSHOTS_TIMEOUT:-45m}" PREPUSH_ROOT="$ROOT_DIR" "$SCRIPT_DIR/visual-preview.sh" --head "$PUSH_HEAD" >"$SCREENSHOTS_LOG" 2>&1 &
    SCREENSHOTS_PGID=$!
    SCREENSHOTS_STAGED=1
    echo ""
fi

# The real-GPU half: the paid T4 runs only on the daily release, so this is the only NVIDIA run before it.
# CI's webgpu-graph-algorithms-node shard (below, through run-tests.sh) runs on Mesa lavapipe; this runs
# the same node projects on this machine's NVIDIA card through the libEGL tree (GRAPHTY_EGL_LIB_DIR, else
# the main checkout's gitignored tmp/egl/; webgpu-graph-algorithms/CLAUDE.md). GRAPHTY_GPU_REQUIRE=nvidia,
# not any: a missing EGL tree fails loudly here instead of passing on lavapipe a second time. "Affected"
# is nx's, so a change to graph-format or the lockfile runs it too. It runs in the background beside the
# CPU test shards, holding the machine's one GPU slot instead of a CPU test slot (tools/test-slots.mjs
# --gpu): it waits on the card most of the time and uses under one core. Its own process group, killed
# by the EXIT trap; its verdict is read after the Tests step.
if affected webgpu-graph-algorithms; then
    EGL_LIB_DIR="${GRAPHTY_EGL_LIB_DIR:-$MAIN_DIR/tmp/egl/root/usr/lib/x86_64-linux-gnu}"
    GPU_LOG="$MAIN_DIR/tmp/prepush-gpu/$(basename "$ROOT_DIR").log"
    mkdir -p "$(dirname "$GPU_LOG")"
    echo -e "${YELLOW}> webgpu-graph-algorithms on the local NVIDIA GPU, in the background (log: $GPU_LOG)${NC}"
    setsid bash -c "cd webgpu-graph-algorithms && LD_LIBRARY_PATH='$EGL_LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}' GRAPHTY_GPU_REQUIRE=nvidia node '$SCRIPT_DIR/test-slots.mjs' --gpu npm run test:run" >"$GPU_LOG" 2>&1 &
    GPU_PGID=$!
    echo ""
fi

# Tests: the test shards CI's test job runs for this push, with CI's commands and environment, read
# from tools/ci-test-matrix.mjs (the list ci.yml plans from) by tools/prepush-tests.mjs, so this gate
# and CI cannot drift -- except the shards whose "local" policy there leaves them to CI: graphty-element's
# eleven browser and storybook shards (about 15 minutes) run here only when the push changes a file they
# test, compared with $BASE (PREPUSH_ALL=1 has no base and runs them all). Browser shards share the machine's four-browser cap; the first failing shard
# stops the rest. Each shard's log is in tmp/prepush-tests/. No shard and no stage has a
# wall-clock limit: a hung test is ended by the one hang guard every vitest config sets, never by a
# clock around the shard (owner rule: no arbitrary timeouts). A stage clock counted other gates' work -- on 2026-10-17, with 8 pushes queued, a push whose every shard passed was failed at
# 90 minutes while its last shards were still waiting for slots. On Ctrl-C (or any SIGTERM)
# prepush-tests.mjs stops every shard's process group itself.
# Exit 3: every shard passed, but some only with flaky or quarantined failures let through
# (tools/test-quarantine.mjs); the step passes and no gate pass is recorded, so the next push runs again.
# The shards start as soon as the build is done, in the background beside the static checks below (Knip, Lint,
# the docs, the bundle sizes, the public API report: 1-2% of gates fail on each), which held them back about
# 10 minutes; the first failure of either stops the other (bg_step). Their output is printed when the
# static checks are done (bg_wait) or as soon as they fail.
KNOWN_MARK="$ROOT_DIR/tmp/prepush-steps/tests-known"
rm -f "$KNOWN_MARK"
if [ "$LIGHT" != 1 ] && [ -n "$PROJECT_LIST" ]; then
    bg_step "Tests (the CI shards of the affected packages)" \
        "PREPUSH_ROOT='$ROOT_DIR' node '$SCRIPT_DIR/prepush-tests.mjs' '$PROJECTS' '${BASE:-}'; TESTS_EXIT=\$?; [ \$TESTS_EXIT = 3 ] && touch '$KNOWN_MARK'; [ \$TESTS_EXIT = 0 ] || [ \$TESTS_EXIT = 3 ]" \
        "$ROOT_DIR/tmp/prepush-steps/tests.log"
fi

# Knip before Lint: it needs only the dist/ the build above wrote, and it fails a push about three
# times as often as Lint does, so a knip finding stops the gate before the slowest static step.
# Run knip for dead code detection (blocks push if issues found)
run_step "Knip (dead code detection)" "pnpm run lint:knip"

# knip again in production mode: only the entries marked `!` in knip.config.ts (the published
# source), only each workspace's own dependencies (--strict), and only dependency findings. The
# pass above counts devDependencies and test files as legitimate users of a package, so it cannot
# see a runtime dependency that nothing at run time imports. About 9 seconds (2026-09-24).
run_step "Knip (production dependencies)" "pnpm run lint:knip:prod"

# A push that affects no package (tools/, the root package.json scripts, knip.config.ts, docs) stops
# here: knip has checked it (and the docs site step the docs it changed), and everything below is
# per affected package. The published-dependency check (below for the other pushes) runs over every
# package, as CI's does: a change to the check itself, or to tools/workspace-files.mjs, can fail it.
if [ -z "$PROJECT_LIST" ]; then
    run_step "Published dependencies" "pnpm run check:published-deps"
    docs_site_step
    sonar_reminder
    [ "$FAILED" = 0 ] && [ -n "$GATE_KEY" ] && node "$SCRIPT_DIR/prepush-inputs.mjs" record gate "$GATE_KEY"
    exit "$FAILED"
fi

# Lint the affected packages. --skip-nx-cache: every lint really runs. --exclude-task-dependencies:
# lint's dependsOn would otherwise rebuild, cache skipped too, every package it depends on -- the
# Build step above already built each of them (nx: build dependsOn ^build) or restored it from nx's
# cache on identical inputs, which nx shares across this repository's worktrees. That rebuild cost a
# graphty-only push the whole chain a second time.
run_step "Lint" "NX_DAEMON=false pnpm exec nx run-many -t lint --projects=$PROJECT_LIST --parallel=3 --skip-nx-cache --exclude-task-dependencies"

# Pack every published package and compare the files it would ship with its package.json: an
# import nobody declared, a dependency nothing imports, an @graphty range the workspace version
# no longer satisfies, a test or tool config file in the tarball. Source-level checks cannot see
# any of these; `pupt` shipped in @graphty/algorithms for six releases, and graphty-element's
# WebGPU peer fell four breaking releases behind. Needs the build above. About 3 seconds (2026-09-24).
run_step "Published dependencies" "pnpm run check:published-deps -- $DIR_LIST"

# The API reference of each affected package that has one (a root `docs:api:<package>` script), built
# as CI's Docs job builds it (npm run docs:build): graph-io's TypeDoc fails on any warning, so a missing
# doc comment fails here and not only in CI. Needs the build above. The output is gitignored.
for DOCS_PACKAGE in $DOCS_API_PACKAGES; do
    if affected "$DOCS_PACKAGE"; then
        run_step "API docs ($DOCS_PACKAGE)" "pnpm run docs:api:$DOCS_PACKAGE"
    fi
done
docs_site_step

# The gzip budget of each graphty-element entry point (graphty-element/size-budgets.json), counted
# over the entry file and every chunk it statically imports. Needs the build above.
if affected graphty-element; then
    run_step "Bundle size (graphty-element)" "pnpm run check:bundle-size"
    # The built public API must match the committed report, graphty-element/api/*.api.md
    # (CLAUDE.md, "Public API review"). Needs the build above.
    run_step "Public API report (graphty-element)" "pnpm run check:api-report"
fi
# The same for each part of cytoscape-extensions as a browser application bundles it
# (cytoscape-extensions/size-budgets.json). Needs the build above. About 5 seconds.
if affected cytoscape-extensions; then
    run_step "Bundle size (cytoscape-extensions)" "pnpm --filter @graphty/cytoscape-extensions run size"
fi

# The test shards, started beside the static checks above (bg_step, tools/prepush-source-checks.sh).
bg_wait
[ -f "$KNOWN_MARK" ] && KNOWN_FAILURES=1

if [ -n "$GPU_PGID" ]; then
    echo -e "${YELLOW}> webgpu-graph-algorithms on the local NVIDIA GPU${NC}"
    if wait "$GPU_PGID"; then
        cat "$GPU_LOG"
        echo -e "${GREEN}[PASS] webgpu-graph-algorithms on the local NVIDIA GPU passed${NC}"
        echo ""
    else
        cat "$GPU_LOG"
        echo -e "${RED}[FAIL] webgpu-graph-algorithms on the local NVIDIA GPU failed (above; the log is $GPU_LOG)${NC}"
        exit 1
    fi
    GPU_PGID=""
fi

if [ -n "$SCREENSHOTS_PGID" ]; then
    echo -e "${YELLOW}> Screenshots${NC}"
    if wait "$SCREENSHOTS_PGID"; then
        cat "$SCREENSHOTS_LOG"
        echo -e "${GREEN}[PASS] Screenshots captured${NC}"
    else
        cat "$SCREENSHOTS_LOG"
        echo -e "${RED}[FAIL] Screenshots: the capture failed or timed out (above; the log is $SCREENSHOTS_LOG)${NC}"
        FAILED=1
    fi
    SCREENSHOTS_PGID=""
    echo ""
fi

# Whether the branch on the remote moved while the gate ran: git sends the push with the tip it read
# before the hook (PUSH_REMOTE_SHA, .husky/pre-push), so a newer commit's post-commit push or the nightly
# sync's merge in the meantime makes git reject a push whose every check passed (18 pushes in the 14 days
# to 2026-10-24, about 47 minutes each). golden, golden-cut and master are left to git, which rejects
# the push itself. A remote that cannot be asked is not "moved".
remote_moved() {
    [ -n "${PUSH_REMOTE:-}" ] && [ -n "${PUSH_REMOTE_REF:-}" ] || return 1
    case "$PUSH_REMOTE_REF" in refs/heads/golden | refs/heads/golden-cut | refs/heads/master) return 1 ;; esac
    REMOTE_NOW="$(git ls-remote "$PUSH_REMOTE" "$PUSH_REMOTE_REF" 2>/dev/null | cut -f1)"
    [ -n "$REMOTE_NOW" ] && [ "$REMOTE_NOW" != "${PUSH_REMOTE_SHA:-}" ]
}

# Summary -- the overall verdict, so this one reads the global FAILED flag on purpose:
# a knip-only failure must still fail the push.
echo "========================================"
sonar_reminder
[ "$LIGHT" = 1 ] && echo -e "${YELLOW}[LIGHT] tests run in CI; no shard and no screenshot ran here${NC}"
if [ $FAILED -eq 0 ]; then
    # Every check passed, so the push goes ahead: the staged capture becomes the branch's preview.
    # Recorded only when the inputs are still the ones the run started on (prepush-inputs.mjs compares).
    [ -n "$GATE_KEY" ] && [ -z "${KNOWN_FAILURES:-}" ] && node "$SCRIPT_DIR/prepush-inputs.mjs" record gate "$GATE_KEY"
    if remote_moved; then
        echo -e "${RED}[STOP] Every check passed, but $PUSH_REMOTE's ${PUSH_REMOTE_REF#refs/heads/} moved while the gate ran (${PUSH_REMOTE_SHA:0:12} -> ${REMOTE_NOW:0:12}), so git would reject this push.${NC}"
        echo "Run git fetch $PUSH_REMOTE && git merge $PUSH_REMOTE/${PUSH_REMOTE_REF#refs/heads/}, then push again: this gate's passes are recorded, so only what the merge changes runs again."
        exit 1
    fi
    [ "$SCREENSHOTS_STAGED" = 1 ] && PREPUSH_ROOT="$ROOT_DIR" "$SCRIPT_DIR/visual-preview.sh" --promote "$PUSH_HEAD" && SCREENSHOTS_STAGED=0
    echo -e "${GREEN}All pre-push checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Pre-push validation failed${NC}"
    echo "Fix the issues above before pushing."
    exit 1
fi
