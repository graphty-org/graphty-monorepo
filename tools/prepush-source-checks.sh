#!/bin/bash
# The pre-push gate's source-only checks: formatting, the offline link check, the CI workflow tests,
# the config and tool checks and the SonarQube changed-lines scan. They read only the source -- no
# build, no affected list -- and take about two minutes together, so they run before anything slow:
#  - tools/prepush.sh runs them first (it sources this file, which also gives it run_step), so a slip fails
#    in about a minute.
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

# The gate's scripts can be newer than the checkout they check (the live copy follows master): a
# check whose package.json script this checkout does not have yet is skipped, not failed. CI runs
# it on the merge with master.
script_missing() {
    local script
    script="$(sed -nE 's/^pnpm run ([^ ]+).*/\1/p' <<<"$2")"
    if [ -n "$script" ] && ! node -e 'process.exit(require("./package.json").scripts?.[process.argv[1]] ? 0 : 1)' "$script"; then
        echo -e "${YELLOW}[SKIP] $1: this checkout has no \`$script\` script yet (merge master to get it)${NC}"
        echo ""
        return 0
    fi
    return 1
}

step_failed() {
    echo -e "${RED}[FAIL] $1 failed${NC}"
    echo ""
    echo -e "${RED}Pre-push validation stopped at the first failure: $1${NC}"
    echo "Fix it and push again; the checks after it did not run."
    exit 1
}

run_step() {
    local name="$1"
    local cmd="$2"

    # A background step that already ended is reported first, so its failure stops the gate now.
    bg_poll
    echo -e "${YELLOW}> $name${NC}"
    script_missing "$name" "$cmd" && return 0
    if eval "$cmd"; then
        echo -e "${GREEN}[PASS] $name passed${NC}"
        echo ""
    else
        step_failed "$name"
    fi
}

# Background steps: the likeliest failures start first and run beside the cheaper steps after them, so they
# report in about the time they take instead of after everything listed before them. Each runs in its own
# process group with its output in a log, printed whole when it is reported: at the first run_step after it
# ends (bg_poll), or followed live by bg_wait. A failure stops the gate like any run_step failure, and the
# EXIT trap (bg_kill) stops every background step still running.
# ponytail: a failure is seen at the next step boundary, not mid-step; each step is a few minutes at most.
BG_NAMES=()
BG_PIDS=()
BG_LOGS=()
bg_step() {
    local name="$1" cmd="$2" log="$3"
    script_missing "$name" "$cmd" && return 0
    mkdir -p "$(dirname "$log")"
    echo -e "${YELLOW}> $name, in the background (log: $log)${NC}"
    echo ""
    setsid bash -c "$cmd" >"$log" 2>&1 </dev/null &
    BG_NAMES+=("$name")
    BG_PIDS+=("$!")
    BG_LOGS+=("$log")
}

bg_report() {
    local i="$1" rc
    echo -e "${YELLOW}> ${BG_NAMES[$i]}${NC}"
    if [ "${2:-}" = follow ]; then
        tail -n +1 -f --pid="${BG_PIDS[$i]}" "${BG_LOGS[$i]}"
    else
        cat "${BG_LOGS[$i]}"
    fi
    wait "${BG_PIDS[$i]}"
    rc=$?
    BG_PIDS[i]=""
    [ "$rc" = 0 ] || step_failed "${BG_NAMES[$i]}"
    echo -e "${GREEN}[PASS] ${BG_NAMES[$i]} passed${NC}"
    echo ""
}

bg_poll() {
    local i
    for i in "${!BG_PIDS[@]}"; do
        if [ -n "${BG_PIDS[$i]}" ] && ! kill -0 "${BG_PIDS[$i]}" 2>/dev/null; then bg_report "$i"; fi
    done
}

# Waits for every background step still running, in the order they started.
bg_wait() {
    local i
    for i in "${!BG_PIDS[@]}"; do
        if [ -n "${BG_PIDS[$i]}" ]; then bg_report "$i" follow; fi
    done
}

bg_kill() {
    local pid
    for pid in "${BG_PIDS[@]}"; do
        [ -n "$pid" ] || continue
        kill -- -"$pid" 2>/dev/null
        wait "$pid" 2>/dev/null
    done
}
trap bg_kill EXIT

# The SonarQube step's output, which tools/prepush.sh reads again under its summary.
SONAR_LOG="$(git rev-parse --path-format=absolute --git-common-dir)/sonar/prepush-$(basename "$ROOT_DIR").log"
mkdir -p "$(dirname "$SONAR_LOG")"

# The branch this push is measured from (tools/push-base.mjs), asked once: the SonarQube step, the gate
# key and tools/prepush.sh's affected packages all use it.
PUSH_BASE_REF=${PUSH_BASE_REF:-$(node "$GATE_TOOLS/push-base.mjs")} && export PUSH_BASE_REF

GATE_KEY="$(node "$GATE_TOOLS/prepush-inputs.mjs" key 2>/dev/null)"
if [ -n "$GATE_KEY" ] && [ "${PREPUSH_RERUN_ALL:-}" != 1 ] && SOURCE_PASS="$(node "$GATE_TOOLS/prepush-inputs.mjs" passed source "$GATE_KEY" 2>/dev/null)"; then
    echo -e "${GREEN}[SKIP] Source-only checks: they already passed on exactly these inputs ($(jq -r '"\(.branch // "detached") at \(.sha[0:12]), \(.at)"' <<<"$SOURCE_PASS" 2>/dev/null); key ${GATE_KEY:0:12})${NC}"
    echo ""
    # Only a pass SonarQube checked is recorded, so there is no warning to repeat under the summary.
    : >"$SONAR_LOG"
    # These inputs were scanned: say so in SonarQube's gate log, which tools/sonar-gate.mjs reads to
    # find commits that reached the push base without a scan (a push with --no-verify).
    echo "$(date -u +%Y-%m-%dT%H:%M:%S.000Z) $(git symbolic-ref --short -q HEAD || echo '(detached)') $(git rev-parse --short=12 HEAD) reused left-out:0" >>"$(dirname "$SONAR_LOG")/gate.log"
else
    # SonarQube (changed lines): tools/sonar-gate.mjs scans the files this push changes on the owner's
    # SonarQube server and fails the push on a NEW issue or security hotspot on a line the push adds or
    # changes; issues master already has never block. It passes with a boxed warning when the server
    # cannot be reached (off the owner's network), and blocks on any other setup problem (no token, an
    # admin token, no Java), saying how to fix it. It never runs in CI: the server is not reachable from
    # GitHub Actions. It needs no build: it scans the changed files by name, with no coverage report.
    # First, in the background beside the checks below: it is the step that fails pushes most often
    # (116 of about 1,200 gates in the 14 days to 2026-10-24) and the slowest of these checks (45-60 s,
    # one scan per machine at a time); last in the list, it reported about 7 minutes in. To push past a
    # false positive: `// NOSONAR(<rule>): <reason>` on the line, a reasoned path entry in sonar-project.properties, or
    # -- emergencies only -- a `Sonar-Bypass: <reason>` trailer on the HEAD commit. See
    # design/sonarqube/design.md.
    bg_step "SonarQube (changed lines)" "node $(printf %q "$GATE_TOOLS/sonar-gate.mjs")" "$SONAR_LOG"

    # The CI shape: the test matrix's shard groups, what ci.yml and pr-title.yml run on a draft, a pull
    # request and a merge-queue branch, and the gate's own tools' tests. The second commonest failure of
    # these checks (38 gates), so it starts at once too, beside SonarQube.
    # The tests build their own gates and push queues, so they must not inherit this gate's settings
    # (PREPUSH_*, PUSH_QUEUE_*, VISUAL_PREVIEW_*, the slot lanes): each leak failed a landing on
    # 2026-10-23/24 (a light gate key, a gate snapshot, a pending-push preview, a low browser lane).
    bg_step "CI workflow tests" \
        "env -u PUSH_BASE_REF -u BROWSER_SLOT_PRIORITY -u GRAPHTY_SLOT_PRIORITY \$(compgen -e | grep -E '^(PREPUSH_|PUSH_QUEUE_|PUSH_REMOTE_|VISUAL_PREVIEW_)' | sed 's/^/-u /') pnpm run test:ci-workflows" \
        "$ROOT_DIR/tmp/prepush-steps/ci-workflow-tests.log"

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

    # When the push adds or changes a package.json, a project.json, nx.json or release-hold.json:
    # `nx release --dry-run --skip-publish`, so a project the release train cannot version fails this
    # push instead of holding every release (#3318). See tools/release-dry-run.mjs.
    run_step "Release dry run" "node \"$GATE_TOOLS/release-dry-run.mjs\""

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

    # Experiment flags (graphty-element's FEATURES): ids named are declared, rows have their issue, the
    # features module reads nothing from the host, no experimental item in the API report. Source only.
    # See tools/check-features.mjs.
    run_step "Feature flags" "pnpm run check:features"

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

    # The SonarQube step's decisions (server down, no token, a new problem, only old problems, the
    # bypass trailer, token leaks) against a throwaway repository, a fake server and a fake scanner.
    # Needs no server. A few seconds.
    run_step "SonarQube gate script tests" "pnpm run test:sonar-gate"

    # The two background steps started first (above) must pass too.
    bg_wait

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
