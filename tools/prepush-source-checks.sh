#!/bin/bash
# The pre-push gate's source-only checks: formatting, the offline link check, the CI workflow tests,
# the config and tool checks and the SonarQube changed-lines scan. They read only the source -- no
# build, no affected list -- and take about two minutes together, so they run before anything slow:
#  - tools/prepush.sh runs them first (it sources this file, which also gives it run_step), and
#  - tmp/push-queue.sh runs them before a push waits for a gate slot, so a slip fails in about a minute
#    instead of after the queue.
# A pass records the checkout's fingerprint (HEAD and the content of every file git does not ignore,
# tools/prepush-inputs.mjs) in this worktree's git directory. When the checkout still has that
# fingerprint, the checks are skipped: they already passed on exactly these files. Any edit, new file
# or commit since then runs them again.
#
# Run by hand: ./tools/prepush-source-checks.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

# A git hook exports GIT_DIR and friends; a test that builds a throwaway repository would act on this
# one with them set (tools/prepush.sh says more).
unset $(git rev-parse --local-env-vars)

# node_modules must match the lockfile, or everything below runs against dependency versions CI
# (pnpm install --frozen-lockfile) does not have. pnpm copies the lockfile it installed from to
# node_modules/.pnpm/lock.yaml, byte for byte.
if ! cmp -s pnpm-lock.yaml node_modules/.pnpm/lock.yaml; then
    echo "node_modules is out of date with pnpm-lock.yaml; run pnpm install" >&2
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# The SonarQube step's output, which tools/prepush.sh reads again under its summary.
SONAR_LOG="$(git rev-parse --path-format=absolute --git-common-dir)/sonar/prepush-$(basename "$ROOT_DIR").log"
mkdir -p "$(dirname "$SONAR_LOG")"

SOURCE_CHECKS_RECORD="$(git rev-parse --path-format=absolute --git-dir)/prepush-source-checks"
SOURCE_FINGERPRINT="$(node tools/prepush-inputs.mjs fingerprint 2>/dev/null)"
if [ -n "$SOURCE_FINGERPRINT" ] && [ "$(cat "$SOURCE_CHECKS_RECORD" 2>/dev/null)" = "$SOURCE_FINGERPRINT" ]; then
    echo -e "${GREEN}[SKIP] Source-only checks: they already passed on exactly these files (fingerprint ${SOURCE_FINGERPRINT:0:12})${NC}"
    echo ""
else
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

    # SonarQube (changed lines): tools/sonar-gate.mjs scans the files this push changes on the owner's
    # SonarQube server and fails the push on a NEW issue or security hotspot on a line the push adds or
    # changes; issues master already has never block. It passes with a boxed warning when the server
    # cannot be reached (off the owner's network), and blocks on any other setup problem (no token, an
    # admin token, no Java), saying how to fix it. It never runs in CI: the server is not reachable from
    # GitHub Actions. It needs no build: it scans the changed files by name, with no coverage report.
    # Last here, as the slowest of these checks (45-60 s, one scan per machine at a time), but before
    # the gate queue: it is the step that fails pushes most often. To push past a false positive:
    # `// NOSONAR(<rule>): <reason>` on the line, a reasoned path entry in sonar-project.properties, or
    # -- emergencies only -- a `Sonar-Bypass: <reason>` trailer on the HEAD commit. See
    # design/sonarqube/design.md.
    run_step "SonarQube (changed lines)" "(set -o pipefail; node tools/sonar-gate.mjs 2>&1 | tee \"\$SONAR_LOG\")"

    # Recorded only when nothing changed while the checks ran.
    if [ -n "$SOURCE_FINGERPRINT" ] && [ "$(node tools/prepush-inputs.mjs fingerprint 2>/dev/null)" = "$SOURCE_FINGERPRINT" ]; then
        echo "$SOURCE_FINGERPRINT" >"$SOURCE_CHECKS_RECORD"
    fi
fi
