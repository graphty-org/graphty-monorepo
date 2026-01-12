#!/bin/bash
# Pre-push validation script
# Runs lint (including knip) and fast tests across all packages
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

# Track failures
FAILED=0

run_step() {
    local name="$1"
    local cmd="$2"

    echo -e "${YELLOW}▶ $name${NC}"
    if eval "$cmd"; then
        echo -e "${GREEN}✓ $name passed${NC}"
        echo ""
    else
        echo -e "${RED}✗ $name failed${NC}"
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
echo -e "${YELLOW}▶ Fast tests${NC}"

# algorithms - has test:run that runs --project=default
echo "  Testing algorithms..."
(cd algorithms && npm run test:run) || FAILED=1

# layout - single project, all tests are fast
echo "  Testing layout..."
(cd layout && npm run test:run) || FAILED=1

# graphty-element - run only default project (skip browser/storybook/interactions/llm)
echo "  Testing graphty-element..."
(cd graphty-element && vitest run --project=default) || FAILED=1

# graphty - browser-only tests, skip for fast validation
# (These are UI tests that require playwright)
echo "  Skipping graphty (browser-only tests)..."

# remote-logger - has multiple projects, run default and ui-unit
echo "  Testing remote-logger..."
(cd remote-logger && vitest run --project=default --project=ui-unit) || FAILED=1

# compact-mantine - run only default project
echo "  Testing compact-mantine..."
(cd compact-mantine && vitest run --project=default) || FAILED=1

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Fast tests passed${NC}"
else
    echo -e "${RED}✗ Some tests failed${NC}"
fi
echo ""

# Summary
echo "========================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All pre-push checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Pre-push validation failed${NC}"
    echo "Fix the issues above before pushing."
    exit 1
fi
