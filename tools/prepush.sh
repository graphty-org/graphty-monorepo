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

# Build all packages (required for cross-package imports)
run_step "Build" "pnpm -r run build"

# Lint all packages
run_step "Lint" "pnpm -r run lint"

# Run knip for dead code detection (blocks push if issues found)
run_step "Knip (dead code detection)" "pnpm run lint:knip"

# Run fast tests for each package
# These run only the 'default' project (happy-dom/jsdom/node tests, no playwright)
echo -e "${YELLOW}> Fast tests${NC}"

# Each test package ORs into both flags: FAILED for the exit code, TESTS_FAILED so the
# per-block verdict below reports only what the tests themselves did.

# algorithms - has test:run that runs --project=default
echo "  Testing algorithms..."
(cd algorithms && npm run test:run) || { FAILED=1; TESTS_FAILED=1; }

# layout - single project, all tests are fast
echo "  Testing layout..."
(cd layout && npm run test:run) || { FAILED=1; TESTS_FAILED=1; }

# graphty-element - run only default project (skip browser/storybook/interactions/llm)
echo "  Testing graphty-element..."
(cd graphty-element && npm run test:shard:default:run) || { FAILED=1; TESTS_FAILED=1; }

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
