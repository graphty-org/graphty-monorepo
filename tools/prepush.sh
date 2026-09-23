#!/bin/bash
# Pre-push validation script
# Runs build, lint (including knip), the fast 'default'-project tests for every package
# that has one, and graphty's full browser suite. No package is skipped.
# This script avoids nx to work around git hook issues with nx daemon

# Note: We don't use 'set -e' because we want to track all failures and report them at the end

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

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

# Build all packages (required for cross-package imports).
# nx, not `pnpm -r run build`: for graph-format and layout the nx build TARGET is `npm run build:all`,
# while their `build` SCRIPT is a plain tsc that never writes the bundled dist/<pkg>.d.ts the strict-consumer
# compiles resolve through. On a clean tree the script form left those missing and the gate failed at Lint.
# It is also what CI runs (.github/workflows/ci.yml), which is the parity CLAUDE.md asks for.
run_step "Build" "pnpm exec nx run-many -t build --parallel=3"

# webgpu-graph-algorithms: its lint runs the strict-consumer compile against the d.ts shims that only
# build:bundle writes (tsc emits none; the package has no root entry file), so bundle it before Lint
run_step "Bundle webgpu-graph-algorithms" "(cd webgpu-graph-algorithms && npm run build:bundle)"

# Lint all packages
run_step "Lint" "pnpm -r run lint"

# Run knip for dead code detection (blocks push if issues found)
run_step "Knip (dead code detection)" "pnpm run lint:knip"

# Run fast tests for each package
# These run only the 'default' project (happy-dom/jsdom/node tests, no playwright)
echo -e "${YELLOW}> Fast tests${NC}"

# Each test package ORs into both flags: FAILED for the exit code, TESTS_FAILED so the
# per-block verdict below reports only what the tests themselves did.

# graph-format - single project, all tests are fast (node, no browser)
echo "  Testing graph-format..."
(cd graph-format && npm run test:run) || { FAILED=1; TESTS_FAILED=1; }

# graph-io - single project, all tests are fast (node, no browser); needs graph-format/dist (built above)
echo "  Testing graph-io..."
(cd graph-io && npm run test:run) || { FAILED=1; TESTS_FAILED=1; }

# webgpu-graph-algorithms - the node project only (design 12.5): Dawn on the local adapter -- NVIDIA when
# LD_LIBRARY_PATH carries the libEGL tree (package CLAUDE.md), else Mesa lavapipe (about 5 minutes); the
# browser project and the no-subgroups pass run in CI. GRAPHTY_GPU_REQUIRE=any: a machine with no adapter
# fails up front instead of skipping every GPU test and reporting a vacuous pass
echo "  Testing webgpu-graph-algorithms..."
(cd webgpu-graph-algorithms && GRAPHTY_GPU_REQUIRE=any npm run test:run) || { FAILED=1; TESTS_FAILED=1; }

# algorithms - has test:run that runs --project=default
echo "  Testing algorithms..."
(cd algorithms && npm run test:run) || { FAILED=1; TESTS_FAILED=1; }

# layout - single project, all tests are fast
echo "  Testing layout..."
(cd layout && npm run test:run) || { FAILED=1; TESTS_FAILED=1; }

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
# COST_GUARD=1 runs the cost-estimate stopwatch test, whose rates were fitted on this reference
# machine and do not hold on CI's runners (see test/session/cost/estimate-against-measured-runs.test.ts).
(cd graphty-element && COST_GUARD=1 npm run test:prepush) || { FAILED=1; TESTS_FAILED=1; }

# graphty is NOT run here -- it has no 'default' project to run. Its whole suite is
# playwright-backed, so it gets its own step (and its own flag) after this block.

# remote-logger - has multiple projects, run default and ui-unit
echo "  Testing remote-logger..."
(cd remote-logger && npm run test:run -- --project=default --project=ui-unit) || { FAILED=1; TESTS_FAILED=1; }

# compact-mantine - run only default project
echo "  Testing compact-mantine..."
(cd compact-mantine && npm run test:run -- --project=default) || { FAILED=1; TESTS_FAILED=1; }

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}[PASS] Fast tests passed${NC}"
else
    echo -e "${RED}[FAIL] Some tests failed${NC}"
fi
echo ""

# graphty -- the FULL app shell suite, browser (playwright/chromium) and all.
#
# This is a separate step rather than a line in the "Fast tests" block above because it
# is not a 'default'-project run: graphty/vitest.config.ts sets browser.enabled and
# defines no non-browser project, so `npm run test:run` here IS the browser suite.
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
echo -e "${YELLOW}> graphty tests (full browser suite)${NC}"
(cd graphty && npm run test:run) || { FAILED=1; GRAPHTY_FAILED=1; }

if [ $GRAPHTY_FAILED -eq 0 ]; then
    echo -e "${GREEN}[PASS] graphty tests passed${NC}"
else
    echo -e "${RED}[FAIL] graphty tests failed${NC}"
fi
echo ""

# Summary -- the overall verdict, so this one reads the global FAILED flag on purpose:
# a knip-only failure must still fail the push.
echo "========================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All pre-push checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Pre-push validation failed${NC}"
    echo "Fix the issues above before pushing."
    exit 1
fi
