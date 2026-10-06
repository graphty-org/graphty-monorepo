#!/bin/bash
# Pre-push validation script
# Runs build, lint (including knip), the CI test shards (graphty-element's long browser and storybook shards
# only when the push changes a file they test) and the screenshots -- for the packages
# this push AFFECTS only. "Affected" is nx's answer for
# the commits since this branch left origin/master: a package whose files changed, and
# every package that depends on one -- the same set a pull request's CI tests.
# PREPUSH_ALL=1 runs every package.
# This script avoids nx to work around git hook issues with nx daemon

# A run_step check that fails ends the run at once (run_step exits), so a formatting or lint slip is
# reported in seconds instead of after the build and the tests. The source-only checks run first,
# before the build; then the build, knip, lint with type-check (inside each package's lint), and the
# tests. Two checks run in the background and are reported at the end: the SonarQube scan (45-60 s)
# and the screenshots. A run_step failure stops both (the EXIT trap).

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
# FAILED is the overall verdict and decides the exit code, so every test block and the SonarQube
# step OR into it (a run_step failure exits on the spot instead).
# It must NOT be used to grade an individual step: a step-specific verdict needs its
# own flag (SONAR_FAILED below), or an earlier step's failure is reported against a step
# that passed -- knip failing once made the summary print "Some tests failed" on a run
# where every test passed.
FAILED=0
SONAR_FAILED=0

# The background steps: each its own process group (setsid), killed by the EXIT trap, so a push that
# ends early (a failed step, Ctrl-C, a tool timeout killing this script) takes them with it. A
# screenshot capture staged for a push that did not pass is thrown away, never promoted.
MAIN_DIR="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
PUSH_HEAD="$(git rev-parse HEAD)"
SONAR_PGID=""
SCREENSHOTS_PGID=""
SCREENSHOTS_STAGED=0
cleanup() {
    [ -n "$SONAR_PGID" ] && kill -- -"$SONAR_PGID" 2>/dev/null
    if [ -n "$SCREENSHOTS_PGID" ]; then
        kill -- -"$SCREENSHOTS_PGID" 2>/dev/null || kill "$SCREENSHOTS_PGID" 2>/dev/null
        wait "$SCREENSHOTS_PGID" 2>/dev/null
    fi
    [ "$SCREENSHOTS_STAGED" = 1 ] && ./tools/visual-preview.sh --discard "$PUSH_HEAD" >/dev/null 2>&1
}
trap cleanup EXIT

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
        echo -e "${RED}Pre-push validation stopped at the first failure: $name${NC}"
        echo "Fix it and push again; the checks after it did not run."
        exit 1
    fi
}

# No checked-in commit tooling may turn GPG signing off. This runs on every push, whatever it
# touches. The [s] and [-] keep the patterns from matching this line itself.
run_step "No signing bypass in tools/ and .husky/" \
    "! git grep -niE -e 'no-gpg[-]sign' -e 'gpg[s]ign *[= ] *false' -- tools/ .husky/"

# The checks below read only the source: no build, no affected list, about 30 seconds together
# (2026-10-05). They run first and on every push, docs-only pushes included, so the commonest
# failures stop the gate before the build starts.

# Prettier on the whole tree (issue #239).
run_step "Formatting" "pnpm run format:check"

# Every package that has its own eslint.config.js is linted with that file alone, so it must spread
# the root config; a stale copy silently drops every rule the root gained since. Run for every push,
# not per affected package: the check is about the configs, and it takes about a second.
run_step "ESLint root config" "pnpm run lint:eslint-root"

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

# The CI shape: the test matrix's shard groups, and what ci.yml and pr-title.yml run on a draft,
# a pull request and a merge-queue branch. Reads files only, under a second.
run_step "CI workflow tests" "pnpm run test:ci-workflows"

# The SonarQube step's decisions (server down, no token, a new problem, only old problems, the
# bypass trailer, token leaks) against a throwaway repository, a fake server and a fake scanner.
# Needs no server. A few seconds.
run_step "SonarQube gate script tests" "pnpm run test:sonar-gate"

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
# Its own process group, killed by the EXIT trap (above), so a push that ends early takes the scanner
# and its JRE with it and frees the scan lock. Its own flag, SONAR_FAILED, per the rule at the top of
# this file.
SONAR_LOG="$(git rev-parse --path-format=absolute --git-common-dir)/sonar/prepush-$(basename "$ROOT_DIR").log"
mkdir -p "$(dirname "$SONAR_LOG")"
start_sonar() {
    echo -e "${YELLOW}> SonarQube (changed lines), in the background${NC}"
    setsid node tools/sonar-gate.mjs >"$SONAR_LOG" 2>&1 &
    SONAR_PGID=$!
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

# Knip before Lint: it needs only the dist/ the build above wrote, and it fails a push about three
# times as often as Lint does, so a knip finding stops the gate before the slowest static step.
# Run knip for dead code detection (blocks push if issues found)
run_step "Knip (dead code detection)" "pnpm run lint:knip"

# knip again in production mode: only the entries marked `!` in knip.config.ts (the published
# source), only each workspace's own dependencies (--strict), and only dependency findings. The
# pass above counts devDependencies and test files as legitimate users of a package, so it cannot
# see a runtime dependency that nothing at run time imports. About 9 seconds (2026-09-24).
run_step "Knip (production dependencies)" "pnpm run lint:knip:prod"

# Lint the affected packages
run_step "Lint" "NX_DAEMON=false pnpm exec nx run-many -t lint --projects=$PROJECT_LIST --parallel=3 --skip-nx-cache"

# Start the SonarQube step only after Lint: Lint (--skip-nx-cache) rebuilds the packages it depends
# on, and each build deletes its dist/ first. The scanner walks the whole tree and dies with
# NoSuchFileException when a folder vanishes mid-walk (seen 2026-10-02). No later step rewrites a
# dist/. It is joined just before the summary.
start_sonar

# Pack every published package and compare the files it would ship with its package.json: an
# import nobody declared, a dependency nothing imports, an @graphty range the workspace version
# no longer satisfies, a test or tool config file in the tarball. Source-level checks cannot see
# any of these; `pupt` shipped in @graphty/algorithms for six releases, and graphty-element's
# WebGPU peer fell four breaking releases behind. Needs the build above. About 3 seconds (2026-09-24).
run_step "Published dependencies" "pnpm run check:published-deps -- $DIR_LIST"

# The gzip budget of each graphty-element entry point (graphty-element/size-budgets.json), counted
# over the entry file and every chunk it statically imports. Needs the build above.
if affected graphty-element; then
    run_step "Bundle size (graphty-element)" "pnpm run check:bundle-size"
    # The built public API must match the committed report, graphty-element/api/*.api.md
    # (CLAUDE.md, "Public API review"). Needs the build above.
    run_step "Public API report (graphty-element)" "pnpm run check:api-report"
fi

# Screenshots, in the background while the tests run: tools/visual-preview.sh --head fetches master,
# then captures the Storybooks this push affects on the commit being pushed merged into origin/master,
# with the pinned fonts and master's capture code, exactly as CI's visual job will -- in its own
# worktree (.worktrees/visual-preview), so nothing here touches this checkout. The capture is staged
# under the commit and promoted to the branch's preview (its open pull request's, which the owner's
# review page offers for review and Finish before CI's capture exists) only when every check passed,
# so a refused push never replaces the preview of the head already on GitHub. Changed or new images
# never block the push (the owner reviews them); a capture that crashes, a story that fails to render,
# or a capture still running after PREPUSH_SCREENSHOTS_TIMEOUT (default 45m, counted from its start,
# so the waits for the capture lock and a browser slot count too) does. Its own process group, killed
# by the EXIT trap like SonarQube's, so a step that stops the gate stops the capture with it.
SCREENSHOTS_LOG="$MAIN_DIR/tmp/visual-preview/prepush-$(basename "$ROOT_DIR").log"
mkdir -p "$(dirname "$SCREENSHOTS_LOG")"
echo -e "${YELLOW}> Screenshots, in the background (log: $SCREENSHOTS_LOG)${NC}"
setsid timeout --kill-after=30s "${PREPUSH_SCREENSHOTS_TIMEOUT:-45m}" ./tools/visual-preview.sh --head "$PUSH_HEAD" >"$SCREENSHOTS_LOG" 2>&1 &
SCREENSHOTS_PGID=$!
SCREENSHOTS_STAGED=1
echo ""

# Tests: the test shards CI's test job runs for this push, with CI's commands and environment, read
# from tools/ci-test-matrix.mjs (the list ci.yml plans from) by tools/prepush-tests.mjs, so this gate
# and CI cannot drift -- except the shards whose "local" policy there leaves them to CI: graphty-element's
# ten browser and storybook shards (about 15 minutes) run here only when the push changes a file they
# test, compared with $BASE (PREPUSH_ALL=1 has no base and runs them all). Browser shards share the machine's four-browser cap; the first failing shard
# stops the rest. Each shard's log is in tmp/prepush-tests/. The whole stage fails past
# PREPUSH_TESTS_TIMEOUT (default 90m), counted from its start, so time spent queued for a browser slot
# counts too; --foreground keeps Ctrl-C reaching it, and on the timeout's SIGTERM prepush-tests.mjs
# stops every shard's process group itself.
run_step "Tests (the CI shards of the affected packages)" \
    "timeout --foreground --kill-after=60s '${PREPUSH_TESTS_TIMEOUT:-90m}' node tools/prepush-tests.mjs '$PROJECTS' '${BASE:-}'"

# The real-GPU half: the paid T4 runs only on the daily release, so this is the only NVIDIA run before it.
# CI's webgpu-graph-algorithms-node shard (above, through run-tests.sh) runs on Mesa lavapipe; this runs
# the same node projects on this machine's NVIDIA card through the libEGL tree (GRAPHTY_EGL_LIB_DIR, else
# the main checkout's gitignored tmp/egl/; webgpu-graph-algorithms/CLAUDE.md). GRAPHTY_GPU_REQUIRE=nvidia,
# not any: a missing EGL tree fails loudly here instead of passing on lavapipe a second time. "Affected"
# is nx's, so a change to graph-format or the lockfile runs it too.
if affected webgpu-graph-algorithms; then
    EGL_LIB_DIR="${GRAPHTY_EGL_LIB_DIR:-$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")/tmp/egl/root/usr/lib/x86_64-linux-gnu}"
    run_step "webgpu-graph-algorithms on the local NVIDIA GPU" \
        "(cd webgpu-graph-algorithms && LD_LIBRARY_PATH='$EGL_LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}' GRAPHTY_GPU_REQUIRE=nvidia npm run test:run)"
fi

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

join_sonar

# Summary -- the overall verdict, so this one reads the global FAILED flag on purpose:
# a knip-only failure must still fail the push.
echo "========================================"
sonar_reminder
if [ $FAILED -eq 0 ]; then
    # Every check passed, so the push goes ahead: the staged capture becomes the branch's preview.
    ./tools/visual-preview.sh --promote "$PUSH_HEAD" && SCREENSHOTS_STAGED=0
    echo -e "${GREEN}All pre-push checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Pre-push validation failed${NC}"
    echo "Fix the issues above before pushing."
    exit 1
fi
