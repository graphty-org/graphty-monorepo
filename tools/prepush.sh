#!/bin/bash
# Pre-push validation script
# Runs build, lint (including knip), the fast 'default'-project tests and graphty's full
# browser suite -- for the packages this push AFFECTS only. "Affected" is nx's answer for
# the commits since this branch left origin/master: a package whose files changed, and
# every package that depends on one. CI still runs everything, so a package this push
# cannot have changed is left to CI instead of costing every push its test time.
# PREPUSH_ALL=1 runs every package.
# This script avoids nx to work around git hook issues with nx daemon

# Note: We don't use 'set -e' because we want to track all failures and report them at the end

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# git runs this hook with GIT_DIR and friends exported, pointing at the real repository. Any step
# that runs git in a temporary directory -- a test building a throwaway repository -- would then act
# on this repository instead: `git init` there has turned the checkout bare (twice), and test commits
# landed on the branch being pushed. No step needs them; each runs from this directory.
unset $(git rev-parse --local-env-vars)

# node_modules must match the lockfile, or everything below runs against dependency versions CI
# (pnpm install --frozen-lockfile) does not have. pnpm copies the lockfile it installed from to
# node_modules/.pnpm/lock.yaml, byte for byte.
if ! cmp -s pnpm-lock.yaml node_modules/.pnpm/lock.yaml; then
    echo "node_modules is out of date with pnpm-lock.yaml; run pnpm install" >&2
    exit 1
fi

echo "========================================"
echo "Pre-push validation"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures.
#
# FAILED is the overall verdict and decides the exit code, so every step ORs into it.
# It must NOT be used to grade an individual step: a step-specific verdict needs its
# own flag, or an earlier step's failure is reported against a step that passed. That
# is exactly the bug the TESTS_FAILED flag below fixes -- knip failing used to make the
# summary print "Some tests failed" on a run where every test passed.
FAILED=0
TESTS_FAILED=0
GRAPHTY_FAILED=0
SONAR_FAILED=0

run_step() {
    local name="$1"
    local cmd="$2"

    echo -e "${YELLOW}> $name${NC}"
    if eval "$cmd"; then
        echo -e "${GREEN}[PASS] $name passed${NC}"
        echo ""
    else
        echo -e "${RED}[FAIL] $name failed${NC}"
        echo ""
        FAILED=1
    fi
}

# No checked-in commit tooling may turn GPG signing off. This runs on every push, whatever it
# touches. The [s] and [-] keep the patterns from matching this line itself.
run_step "No signing bypass in tools/ and .husky/" \
    "! git grep -niE -e 'no-gpg[-]sign' -e 'gpg[s]ign *[= ] *false' -- tools/ .husky/"

# The affected projects, as nx names them. The base is where this branch left origin/master,
# so commits other people landed on master since then do not count as this push's changes.
if [ "${PREPUSH_ALL:-0}" = "1" ]; then
    PROJECTS=$(NX_DAEMON=false pnpm exec nx show projects --json 2>/dev/null)
else
    BASE=$(git merge-base origin/master HEAD)
    PROJECTS=$(NX_DAEMON=false pnpm exec nx show projects --affected --base="$BASE" --head=HEAD --json 2>/dev/null)
fi
PROJECT_LIST=$(echo "$PROJECTS" | tr -d '[]" ')
affected() { echo ",$PROJECT_LIST," | grep -q ",$1,"; }
# The same packages as directories (nx names remote-logger by its package name).
DIR_LIST=$(echo "$PROJECT_LIST" | tr ',' ' ' | sed 's#@graphty/##g')

# SonarQube (changed lines): tools/sonar-gate.mjs scans the files this push changes on the owner's
# SonarQube server and fails the push on a NEW issue or security hotspot on a line the push adds or
# changes; issues master already has never block. It passes with a boxed warning when the server
# cannot be reached (off the owner's network), and blocks on any other setup problem (no token, an
# admin token, no Java), saying how to fix it. It never runs in CI: the server is not reachable from
# GitHub Actions. About 45-60 s for a typical push, so it runs in the BACKGROUND from the end of the
# build until just before the summary, while lint and the tests run; it costs the gate almost no
# wall-clock time. To push past a false positive: `// NOSONAR(<rule>): <reason>` on the line, a
# reasoned path entry in sonar-project.properties, or -- emergencies only -- a
# `Sonar-Bypass: <reason>` trailer on the HEAD commit. See design/sonarqube/design.md.
#
# Its own process group (setsid), killed by the EXIT trap, so a push that ends early (a failed step,
# Ctrl-C, a tool timeout killing this script) takes the scanner and its JRE with it and frees the
# scan lock. Its own flag, SONAR_FAILED, per the rule at the top of this file.
SONAR_PGID=""
SONAR_LOG="$(git rev-parse --path-format=absolute --git-common-dir)/sonar/prepush-$(basename "$ROOT_DIR").log"
mkdir -p "$(dirname "$SONAR_LOG")"
start_sonar() {
    echo -e "${YELLOW}> SonarQube (changed lines), in the background${NC}"
    setsid node tools/sonar-gate.mjs >"$SONAR_LOG" 2>&1 &
    SONAR_PGID=$!
    trap '[ -n "$SONAR_PGID" ] && kill -- -"$SONAR_PGID" 2>/dev/null' EXIT
    echo ""
}
join_sonar() {
    echo -e "${YELLOW}> SonarQube (changed lines)${NC}"
    if wait "$SONAR_PGID"; then
        cat "$SONAR_LOG"
        echo -e "${GREEN}[PASS] SonarQube (changed lines) passed${NC}"
    else
        cat "$SONAR_LOG"
        echo -e "${RED}[FAIL] SonarQube (changed lines) failed${NC}"
        FAILED=1
        SONAR_FAILED=1
    fi
    SONAR_PGID=""
    echo ""
}
# Under the summary: repeat a skipped check's warning so it does not scroll away, and say what to
# do about a SonarQube failure.
sonar_reminder() {
    if grep -q "SonarQube did NOT check this push" "$SONAR_LOG" 2>/dev/null; then
        echo -e "${YELLOW}Reminder: SonarQube did NOT check this push (see its box above).${NC}"
    fi
    if [ "$SONAR_FAILED" -eq 1 ]; then
        echo -e "${RED}SonarQube failed: fix each new finding it listed (a false positive takes NOSONAR(<rule>) with a reason), or the setup problem it named.${NC}"
    fi
}

if [ -z "$PROJECT_LIST" ]; then
    echo -e "${GREEN}No package is affected by this push; no package to check.${NC}"
    # A push that touches only tools/ or the root still gets the SonarQube step, in the foreground.
    start_sonar
    join_sonar
    sonar_reminder
    exit "$FAILED"
fi
echo "Affected packages: $PROJECT_LIST"
echo ""

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
for p in $(NX_DAEMON=false pnpm exec nx show projects --with-target build --json 2>/dev/null | tr -d "[]\"" | tr "," " "); do
    { affected "$p" || [ ! -d "${p#@graphty/}/dist" ]; } && BUILD_LIST="$BUILD_LIST,$p"
done
BUILD_LIST="${BUILD_LIST#,}"
[ -n "$BUILD_LIST" ] && run_step "Build" "pnpm exec nx run-many -t build --projects=$BUILD_LIST --parallel=3"

# webgpu-graph-algorithms: its lint runs the strict-consumer compile against the d.ts shims that only
# build:bundle writes (tsc emits none; the package has no root entry file), so bundle it before Lint
if affected webgpu-graph-algorithms; then
    run_step "Bundle webgpu-graph-algorithms" "(cd webgpu-graph-algorithms && npm run build:bundle)"
fi

# Lint the affected packages
run_step "Lint" "NX_DAEMON=false pnpm exec nx run-many -t lint --projects=$PROJECT_LIST --parallel=3 --skip-nx-cache"

# Start the SonarQube step only after Lint: Lint (--skip-nx-cache) rebuilds the packages it depends
# on, and each build deletes its dist/ first. The scanner walks the whole tree and dies with
# NoSuchFileException when a folder vanishes mid-walk (seen 2026-10-02). No later step rewrites a
# dist/. It is joined just before the summary.
start_sonar

# Run knip for dead code detection (blocks push if issues found)
run_step "Knip (dead code detection)" "pnpm run lint:knip"

# knip again in production mode: only the entries marked `!` in knip.config.ts (the published
# source), only each workspace's own dependencies (--strict), and only dependency findings. The
# pass above counts devDependencies and test files as legitimate users of a package, so it cannot
# see a runtime dependency that nothing at run time imports. About 9 seconds (2026-09-24).
run_step "Knip (production dependencies)" "pnpm run lint:knip:prod"

# Pack every published package and compare the files it would ship with its package.json: an
# import nobody declared, a dependency nothing imports, an @graphty range the workspace version
# no longer satisfies, a test or tool config file in the tarball. Source-level checks cannot see
# any of these; `pupt` shipped in @graphty/algorithms for six releases, and graphty-element's
# WebGPU peer fell four breaking releases behind. Needs the build above. About 3 seconds (2026-09-24).
run_step "Published dependencies" "pnpm run check:published-deps -- $DIR_LIST"

# Every package that has its own eslint.config.js is linted with that file alone, so it must spread
# the root config; a stale copy silently drops every rule the root gained since. Run for every push,
# not per affected package: the check is about the configs, and it takes about a second.
run_step "ESLint root config" "pnpm run lint:eslint-root"

# Prettier on the files this branch adds or modifies. The tree is not formatted as a whole yet
# (issue #239), so this stops new drift without asking a branch to reformat what it never touched.
run_step "Formatting (changed files)" "pnpm run format:check:changed"

# The gzip budget of each graphty-element entry point (graphty-element/size-budgets.json), counted
# over the entry file and every chunk it statically imports. Needs the build above.
if affected graphty-element; then
    run_step "Bundle size (graphty-element)" "pnpm run check:bundle-size"
fi

# Every tool a package's scripts run or its *.config.* files import is declared by that package,
# not only by the root, where hoisting hides the gap until the package builds somewhere else.
run_step "Declared build tools" "pnpm run check:declared-tools"

# release-hold.json names only real nx projects, each with a reason and a date.
run_step "Release hold list" "pnpm run check:release-hold"

# graphty-element's data sources read files through @graphty/graph-io importers: no papaparse, no
# fast-xml-parser and no hand-written parser in graphty-element/src/data. Reads source only.
run_step "Element data sources on graph-io" "pnpm run check:data-source-migration"

# The import reader of tools/count-migration-state.mjs, which prints the counts in
# design/graph-format/STATUS.md. Reads nothing from the repository.
run_step "Migration count script" "pnpm run check:migration-counts"

# The SonarQube step's decisions (server down, no token, a new problem, only old problems, the
# bypass trailer, token leaks) against a throwaway repository, a fake server and a fake scanner.
# Needs no server. A few seconds.
run_step "SonarQube gate script tests" "pnpm run test:sonar-gate"

# No use of the legacy graph API that the graph-format migration replaced (a legacy algorithms or
# layout name, the legacy Graph, a positional layout call, an element parser not on graph-io). Reads
# source only, every push.
run_step "Legacy graph API use" "pnpm run check:legacy-use"

# Dead relative links and #anchors in the Markdown, MDX and HTML, and links to this repository's own
# files on GitHub, resolved against the working tree. Offline: the network half of the check
# (github.com/graphty-org, and graphty.app against the assembled site) runs in CI's "Links" job,
# which has the built site this gate does not. Under a second (2026-09-24); the first run also
# downloads the pinned lychee binary. See tools/check-links.sh.
run_step "Links" "./tools/check-links.sh --offline"

# Run fast tests for each package
# These run only the 'default' project (happy-dom/jsdom/node tests, no playwright)
echo -e "${YELLOW}> Fast tests${NC}"

# Each test package ORs into both flags: FAILED for the exit code, TESTS_FAILED so the
# per-block verdict below reports only what the tests themselves did.

# graph-format - single project, all tests are fast (node, no browser)
echo "  Testing graph-format..."
affected graph-format && { (cd graph-format && npm run test:run) || { FAILED=1; TESTS_FAILED=1; }; }

# graph-io - single project, all tests are fast (node, no browser); needs graph-format/dist (built above)
echo "  Testing graph-io..."
affected graph-io && { (cd graph-io && npm run test:run) || { FAILED=1; TESTS_FAILED=1; }; }

# graph-samples - single project, all tests are fast (node, no browser); needs graph-format/dist (built above)
echo "  Testing graph-samples..."
affected graph-samples && { (cd graph-samples && npm run test:run) || { FAILED=1; TESTS_FAILED=1; }; }

# webgpu-graph-algorithms - the node project only (design 12.5): Dawn on the local adapter -- NVIDIA when
# LD_LIBRARY_PATH carries the libEGL tree (package CLAUDE.md), else Mesa lavapipe (about 5 minutes); the
# browser project and the no-subgroups pass run in CI. GRAPHTY_GPU_REQUIRE=any: a machine with no adapter
# fails up front instead of skipping every GPU test and reporting a vacuous pass. The libEGL tree comes from
# GRAPHTY_EGL_LIB_DIR (the variable the browser project already reads), else the main checkout's gitignored
# tmp/egl/ (found through the git common dir, so a push from a worktree finds it too); it is prepended to
# LD_LIBRARY_PATH for this one command. The test setup prints the adapter that ran.
echo "  Testing webgpu-graph-algorithms..."
EGL_LIB_DIR="${GRAPHTY_EGL_LIB_DIR:-$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")/tmp/egl/root/usr/lib/x86_64-linux-gnu}"
WEBGPU_LD_PATH="$LD_LIBRARY_PATH"
[ -d "$EGL_LIB_DIR" ] && WEBGPU_LD_PATH="$EGL_LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
affected webgpu-graph-algorithms && { (cd webgpu-graph-algorithms && LD_LIBRARY_PATH="$WEBGPU_LD_PATH" GRAPHTY_GPU_REQUIRE=any npm run test:run) || { FAILED=1; TESTS_FAILED=1; }; }

# algorithms - has test:run that runs --project=default
echo "  Testing algorithms..."
affected algorithms && { (cd algorithms && npm run test:run) || { FAILED=1; TESTS_FAILED=1; }; }

# layout - single project, all tests are fast
echo "  Testing layout..."
affected layout && { (cd layout && npm run test:run) || { FAILED=1; TESTS_FAILED=1; }; }

# graphty-element - four projects: default, mesh, contract and xr. The browser, interactions,
# storybook and llm-regression projects stay in CI.
#
# What each of the three buys, with the wall clock measured on 2026-09-21 on a loaded box:
#
#   default  (~19s, 4837 tests) the node lane, unchanged.
#
#   mesh     (~3s, 601 tests)   Babylon's NullEngine against the real NodeMesh, EdgeMesh, MeshCache
#                               and RichTextLabel. Until now this ran nowhere -- not in this gate,
#                               not in CI -- because it lived in test/mesh-testing/vitest-mesh.config.ts,
#                               which no workflow, tool or nx target referenced. It is a project now
#                               (vitest.config.ts) and three seconds is not a trade worth thinking about.
#
#   contract (~25s, 31 tests)   the browser tests that read what was actually PAINTED: pixels in the
#                               frame buffer, the order style layers landed in, whether a story's
#                               setup was applied at all. These are the tests that catch the class of
#                               defect a person found by opening Storybook -- blank labels, every
#                               layered-style story rendering the same picture -- and the only reason
#                               they are worth 25 seconds is that nothing else in this gate can see it.
#
#   xr       (3 files)          WebXR: real immersive VR and AR sessions on an emulated headset (IWER),
#                               plus the XR buttons and UI. Nothing else anywhere starts an XR session,
#                               so without this lane a broken headset path ships unnoticed. CI runs the
#                               same project inside its five browser shards.
#
# What is deliberately NOT here, and why. The full browser project is 463s and the storybook project
# is 290s, measured. Either one roughly doubles a gate that already costs about six minutes, and a
# storybook failure is the slow kind: a failing story spends its whole 12-second settle budget before
# giving up. A gate people bypass with --no-verify catches nothing at all, so both stay in CI, where
# five and four shards absorb them. The contract lane is the cheap substitute: same class of defect,
# a twentieth of the time.
echo "  Testing graphty-element (default + mesh + contract + xr)..."
affected graphty-element && { (cd graphty-element && npm run test:prepush) || { FAILED=1; TESTS_FAILED=1; }; }

# The cost-estimate stopwatch test is NOT part of this gate. It runs in CI's "Cost Estimate Accuracy"
# job on every push to master (and by hand with `pnpm --filter @graphty/graphty-element run test:cost`),
# where a drift turns that job red without blocking anyone. It stays out of here because a gate cannot
# promise an idle machine: even timed on running time and pinned to the P-cores it cannot be made immune
# to a busy hyperthread sibling -- memory-bound rows such as degree run 2-2.7x slower while the
# calibration probe slows 1.5x (see test/session/cost/estimate-against-measured-runs.test.ts).

# graphty is NOT run here -- it has no 'default' project to run. Its whole suite is
# playwright-backed, so it gets its own step (and its own flag) after this block.

# remote-logger - has multiple projects, run default and ui-unit
echo "  Testing remote-logger..."
affected @graphty/remote-logger && { (cd remote-logger && npm run test:run -- --project=default --project=ui-unit) || { FAILED=1; TESTS_FAILED=1; }; }

# visual-review - Node.js unit tests of the results format and the comparison
echo "  Testing visual-review..."
affected visual-review && { (cd visual-review && npm run test:run) || { FAILED=1; TESTS_FAILED=1; }; }

# compact-mantine - run only default project
echo "  Testing compact-mantine..."
affected compact-mantine && { (cd compact-mantine && npm run test:run -- --project=default) || { FAILED=1; TESTS_FAILED=1; }; }

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}[PASS] Fast tests passed${NC}"
else
    echo -e "${RED}[FAIL] Some tests failed${NC}"
fi
echo ""

# graphty -- the FULL app shell suite, browser (playwright/chromium) and all.
#
# This is a separate step rather than a line in the "Fast tests" block above because it
# is not a 'default'-project run: graphty/vitest.config.ts runs the app's tests in a browser
# project, plus a small node project for its lint rules, and `npm run test:run` runs both.
#
# Running all of it is a measured choice, not an assumption. Wall clock for the whole
# suite -- 1762 tests across 109 files -- is ~14s, and ~14s again with node_modules/.vite
# deleted first, because vitest parallelises the files across workers and the per-file
# cost is milliseconds. That is cheap enough to sit in a pre-push hook, so the whole
# suite runs. The rejected alternative was carving out a happy-dom "fast" project and
# running only that, which would have skipped every test that renders React against a
# real browser -- i.e. most of the shell -- while still printing a graphty PASS.
#
# Its own flag, per the rule at the top of this file: graphty must not be graded by the
# fast-test block's failures, nor its failures reported against them.
#
# Bounded by GRAPHTY_TEST_TIMEOUT (default 15 minutes; a loaded box takes about 70 s). On
# 2026-10-03 this step hung for 50 minutes on a Vite dependency reload (issue #885) while every
# other push queued behind tmp/prepush.lock; a hang now fails the push instead. timeout signals
# the whole process group, so vitest's Chromium goes with it.
echo -e "${YELLOW}> graphty tests (full browser suite)${NC}"
if affected graphty; then
    GRAPHTY_TEST_TIMEOUT="${GRAPHTY_TEST_TIMEOUT:-15m}"
    (cd graphty && timeout --kill-after=30s "$GRAPHTY_TEST_TIMEOUT" npm run test:run)
    rc=$?
    if [ $rc -eq 124 ] || [ $rc -eq 137 ]; then
        echo -e "${RED}graphty tests did not finish within $GRAPHTY_TEST_TIMEOUT and were stopped${NC}"
    fi
    [ $rc -eq 0 ] || { FAILED=1; GRAPHTY_FAILED=1; }
fi

if [ $GRAPHTY_FAILED -eq 0 ]; then
    echo -e "${GREEN}[PASS] graphty tests passed${NC}"
else
    echo -e "${RED}[FAIL] graphty tests failed${NC}"
fi
echo ""

join_sonar

# Summary -- the overall verdict, so this one reads the global FAILED flag on purpose:
# a knip-only failure must still fail the push.
echo "========================================"
sonar_reminder
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All pre-push checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Pre-push validation failed${NC}"
    echo "Fix the issues above before pushing."
    exit 1
fi
