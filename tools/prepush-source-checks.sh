#!/bin/bash
# The pre-push gate's source-only checks: formatting, the offline link check, the CI workflow tests,
# the config and tool checks and the SonarQube changed-lines scan. They read only the source -- no
# build, no affected list -- and take about two minutes together, so they run before anything slow:
#  - tools/prepush.sh runs them first (it sources this file, which also gives it run_step), and
#  - tools/push-queue.sh runs them before a push waits for a gate slot, so a slip fails in about a minute
#    instead of after the queue.
# A pass is recorded under the checkout's gate key (tools/prepush-inputs.mjs: the content of every
# file git does not ignore, the installed lockfile, the gate's own scripts, the Node version and the
# lane environment, and the parent branch when this one is stacked on an unlanded branch -- not the
# branch's own name, not HEAD) in <main checkout>/tmp/prepush-passes/source/. When a
# pass is recorded under the key the checkout has now, on any branch, the checks are skipped: they
# already passed on exactly these inputs. So a commit that changes no file (a merge that brings
# nothing new, golden's land commit of a branch that merged golden first) does not run them again;
# any edit, new file, lockfile install or gate change does, and so does PREPUSH_RERUN_ALL=1. GATE_KEY is left set for tools/prepush.sh.
#
# Run by hand: ./tools/prepush-source-checks.sh

# The gate's scripts are beside this file; the checkout they check is PREPUSH_ROOT when the push queue
# runs this from the gate's live copy (tools/prepush.sh says more), else this file's own checkout.
GATE_TOOLS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${PREPUSH_ROOT:-$GATE_TOOLS/..}" && pwd)" || exit 1
unset PREPUSH_ROOT
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
    # The gate's scripts can be newer than the checkout they check (the live copy follows master): a
    # check whose package.json script this checkout does not have yet is skipped, not failed. CI runs
    # it on the merge with master.
    local script
    script="$(sed -nE 's/^pnpm run ([^ ]+).*/\1/p' <<<"$cmd")"
    if [ -n "$script" ] && ! node -e 'process.exit(require("./package.json").scripts?.[process.argv[1]] ? 0 : 1)' "$script"; then
        echo -e "${YELLOW}[SKIP] $name: this checkout has no \`$script\` script yet (merge master to get it)${NC}"
        echo ""
        return 0
    fi
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

# The branch this push is measured from (tools/push-base.mjs), asked once: the SonarQube step, the gate
# key and tools/prepush.sh's affected packages all use it.
PUSH_BASE_REF=${PUSH_BASE_REF:-$(node "$GATE_TOOLS/push-base.mjs")} && export PUSH_BASE_REF

GATE_KEY="$(node "$GATE_TOOLS/prepush-inputs.mjs" key 2>/dev/null)"
# The push queue let this push skip the wait for a gate slot because the whole gate had passed under the
# key it computed. If the inputs changed since (an edit, or the gate's live copy moved forward), the gate
# would run in full without a slot, so stop instead.
if [ -n "${PREPUSH_EXPECTED_KEY:-}" ] && [ "$PREPUSH_EXPECTED_KEY" != "$GATE_KEY" ]; then
    echo -e "${RED}The gate's inputs changed after the push queue found a pass for them (the checkout, the installed lockfile or the gate's own scripts), so this push would run the whole gate without a gate slot. Push again through tools/push-queue.sh.${NC}" >&2
    exit 1
fi
unset PREPUSH_EXPECTED_KEY
if [ -n "$GATE_KEY" ] && [ "${PREPUSH_RERUN_ALL:-}" != 1 ] && SOURCE_PASS="$(node "$GATE_TOOLS/prepush-inputs.mjs" passed source "$GATE_KEY" 2>/dev/null)"; then
    echo -e "${GREEN}[SKIP] Source-only checks: they already passed on exactly these inputs ($(jq -r '"\(.branch // "detached") at \(.sha[0:12]), \(.at)"' <<<"$SOURCE_PASS" 2>/dev/null); key ${GATE_KEY:0:12})${NC}"
    echo ""
    # Only a pass SonarQube checked is recorded, so there is no warning to repeat under the summary.
    : >"$SONAR_LOG"
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

    # No pile of images committed outside the folders that hold them (visual-baselines/, fixtures, public
    # assets): more than 20 new images or 20 MB since the push base fails. Design studio walk screenshots
    # go to tmp/design-studio/, never git; an `Images-Approved: <reason>` trailer passes a deliberate
    # addition. Run from the gate's own copy, so it holds for a checkout that does not have the script yet.
    # See tools/check-committed-images.mjs.
    run_step "No committed walk screenshots" "node \"$GATE_TOOLS/check-committed-images.mjs\""

    # compact-mantine is locked to its Figma spec (owner, 2026-10-23): a change to the spec, the Figma tests,
    # their harness or the theme's token values needs a `Figma-Approved: <reason>` trailer, which only the
    # owner adds, on the commit that makes it. See tools/check-figma-lock.mjs.
    run_step "compact-mantine Figma lock" "node \"$GATE_TOOLS/check-figma-lock.mjs\""

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
    run_step "SonarQube (changed lines)" "(set -o pipefail; node \"$GATE_TOOLS/sonar-gate.mjs\" 2>&1 | tee \"\$SONAR_LOG\")"

    # Recorded only when nothing changed while the checks ran (prepush-inputs.mjs record compares), and
    # only when SonarQube checked the push: a pass it did not check would let the next push of these
    # files, golden's landing push included, skip the scan. An empty GATE_KEY also keeps tools/prepush.sh
    # from recording or reusing a whole-gate pass.
    if grep -q "SonarQube did NOT check this push" "$SONAR_LOG" 2>/dev/null; then
        GATE_KEY=""
    elif [ -n "$GATE_KEY" ]; then
        node "$GATE_TOOLS/prepush-inputs.mjs" record source "$GATE_KEY" || GATE_KEY=""
    fi
fi
