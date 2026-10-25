#!/usr/bin/env node
/**
 * ci-test-matrix.mjs -- the test shards of ci.yml, filtered to the projects a run must test.
 *
 * ci.yml's build job calls this once and hands the result to the test job as its matrix, so a
 * pull request runs only the shards of the packages it affects (the packages it changed plus
 * every package that depends on them) instead of all of them. Why: each pull request run used to
 * be about 30 jobs, and the organisation's plan runs about 60 at once, so two open pull requests
 * queued each other. A push to master and a manual dispatch pass the full project list as the
 * affected list, so they still run every shard.
 *
 * Usage: node tools/ci-test-matrix.mjs <all-projects-json> <affected-projects-json> [--only <shards-json>] [--plan <file>] [--full]
 *   both are the JSON arrays `nx show projects --json` prints (with or without --affected).
 *   --only keeps just the named shards (a JSON array of shard names, never empty; a group's member
 *   runs in its group's job); it refuses a name that is not a shard. ci.yml passes its `shards`
 *   input here, so a CI bisect point runs only the shards that failed.
 *   --plan <file> is the light check's plan (`node tools/test-select.mjs --plan`): each of its bins becomes a
 *   matrix entry of its own, named `<family>-<n>`, with a `files` field and the command that runs only those
 *   files without coverage, replacing the shard it came from; a shard the plan selects nothing for is left
 *   out; a shard it runs whole stays as it is.
 *   --full marks a full run (ci.yml's full=true: the release train's full run, a dispatch): only then are the
 *   "full-run-only" shards planned (the features-on twins, FEATURES_ON_SHARDS), unless --only names them.
 * Prints three GITHUB_OUTPUT lines:
 *   affected=<JSON array of package directory names>   (other jobs test membership in it)
 *   test-matrix=<JSON {"include": [...shards and shard groups]}>
 *   test-count=<number of shards>   (0 means skip the test job: an empty matrix is an error)
 *
 * It fails when a shard names a package nx does not know: a renamed project would otherwise match
 * no affected name and its shards would silently never run on a pull request again.
 *
 * SHARDS is also exported: tools/run-tests.sh imports it to run a shard locally with the exact
 * command CI runs, so the two cannot drift. Importing the file runs nothing.
 *
 * A shard's "local" field is what the pre-push gate (tools/prepush-tests.mjs) does with it; CI
 * ignores it and runs every shard of an affected package:
 *   "always" (the default)  run it whenever its package is affected
 *   "when-paths-change"     run it only when the push changes a file the shard tests: a test file
 *                           its vitest command selects (with its own --shard slice), a setup or
 *                           config file of those vitest projects, or a path in "local-paths"
 *                           (repo-relative; a trailing "/" means everything under it, test files
 *                           of the other shards excepted). The gate asks vitest for the first two.
 *   "never"                 never run it locally
 */

import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { STORYBOOKS } from "./ci-reuse-plan.mjs";
import { FEATURES_DECLARED, ON_ENV, ON_SUFFIX } from "./features-on.mjs";

// nx names most projects by their directory; remote-logger is the one it names by package
// ("@graphty/remote-logger"). Shards use the directory name, so strip the scope.
const dirName = (project) => project.replace(/^@graphty\//, "");

const OFF_SHARDS = [
    // graph-format - single shard (Node.js, no browser)
    {
        shard: "graph-format",
        package: "graph-format",
        "test-command": "pnpm exec nx run graph-format:coverage --exclude-task-dependencies",
        "needs-browser": false,
    },
    // graph-io - single shard (Node.js, no browser); resolves @graphty/graph-format through graph-format/dist
    {
        shard: "graph-io",
        package: "graph-io",
        "test-command": "pnpm exec nx run graph-io:coverage --exclude-task-dependencies",
        "needs-browser": false,
    },
    // graph-io network sources in Chromium: CORS refusals and the blocked-request diagnosis against a
    // local server on another origin (vitest.browser.config.ts); no coverage, the node shard measures the package
    {
        shard: "graph-io-browser",
        package: "graph-io",
        "test-command": "cd graph-io && pnpm exec vitest run --config vitest.browser.config.ts",
        "needs-browser": true,
    },
    // webgpu-graph-algorithms - two shards (design/webgpu/webgpu-acceleration-plan.md 12.5): the node
    // project on Dawn over Mesa lavapipe with coverage (thresholds active) plus the no-subgroups twins
    // pass (four node shards, below), and the Chromium SwiftShader browser smoke. The node shard calls vitest directly: the
    // nx -> npm -> vitest pipe chain starved the worker RPC for graph-format and graph-io (6fc56c1b).
    // needs-lavapipe gates the apt install and the ICD lookup that export the lane's environment.
    // The twin pass covers test/algorithms as well: pr-scale and pr-finalize declare
    // needs: ["subgroups"] (they call wg_reduce_vec4) and their tests live there, so without that
    // path the twin would never exercise the PageRank reduction on a device without the feature.
    // the node suite runs through scripts/run-node-shard.js: it forwards every argument and exits with
    // vitest's own code, except that an exit of 0 still fails (a [shard-verdict] line names why) when the run
    // printed no vitest summary or did not write its --outputFile whole (tools/shard-verdict.mjs, issue #2111),
    // and a run still silent after its last 90-second snapshot is killed and fails; a snapshot alone fails
    // nothing (issue #2181). On a non-zero exit its FIRST line is the [missing-files] block -- how many test
    // files started, how many reported, and the names of the difference, which is what a dead worker
    // swallowed; after it, and after 90 seconds of silence, the process table with each process's kernel
    // wait channel and a Node diagnostic report per surviving process (G4-F14).
    // The files that break a device on purpose are the `node-device-errors` project and run in an
    // invocation of their own, one file at a time: a worker they kill then takes eleven files with it
    // instead of the hundred and fourteen beside them. Their coverage goes to .coverage-parts/device-errors
    // and is uploaded as a second artifact, which tools/merge-coverage.sh merges with the first the way it
    // already merges the graphty-element shards.
    // The twin pass runs TWICE for the same reason. `--project=node` no longer reaches the four
    // device-error files under test/layouts (fa2-lifecycle, fr-lifecycle, grid-lifecycle,
    // force-simulation), so a second twin invocation names them through the device-error project:
    // 44 + 4 = the 48 layout files the twin pass covered before the split, unchanged. It carries no
    // --passWithNoTests on purpose -- an empty match there means those files moved and the twin pass
    // shrank again, which should be a red step and not a silent pass.
    // The four invocations are four shards, so CI runs them on four runners at once instead of one after
    // another (they were 25 minutes in series, the longest job of every full run). Each one writes the
    // same coverage it wrote in series: the coverage thresholds apply to the `node` invocation alone
    // (vitest.config.ts, thresholdsActive), exactly as before, and the device-error invocation's report
    // still uploads as coverage-webgpu-graph-algorithms-node-device-errors for coverage.yml to merge.
    // `--project=node-gpu-alone` beside `--project=node` is the rest of the main suite: the files that hold the GPU
    // for seconds per submission, run after the node project and one at a time (vitest.config.ts, issue #1884).
    ...[
        [
            "webgpu-graph-algorithms-node",
            "node scripts/run-node-shard.js --project=node --project=node-gpu-alone --coverage",
        ],
        [
            "webgpu-graph-algorithms-node-device-errors",
            "COVERAGE_DIR=.coverage-parts/device-errors node scripts/run-node-shard.js --project=node-device-errors --coverage",
        ],
        [
            "webgpu-graph-algorithms-node-no-subgroups",
            "GRAPHTY_GPU_NO_SUBGROUPS=1 node scripts/run-node-shard.js --project=node --project=node-gpu-alone test/primitives test/layouts test/algorithms --passWithNoTests",
        ],
        [
            "webgpu-graph-algorithms-node-no-subgroups-device-errors",
            "GRAPHTY_GPU_NO_SUBGROUPS=1 node scripts/run-node-shard.js --project=node-device-errors test/layouts",
        ],
    ].map(([shard, command]) => ({
        shard,
        package: "webgpu-graph-algorithms",
        "test-command": `cd webgpu-graph-algorithms && ${command}`,
        "needs-browser": false,
        "needs-lavapipe": true,
    })),
    // the browser smoke: scripts/run-browser-project.js wraps vitest in `timeout -k 10 600` and passes a
    // timeout iff every test passed (browser.close() can hang after GPU work); SwiftShader flags come
    // from the package's vitest.config.ts, not from CI
    {
        shard: "webgpu-graph-algorithms-browser",
        package: "webgpu-graph-algorithms",
        "test-command":
            "cd webgpu-graph-algorithms && GRAPHTY_BROWSER_GPU=swiftshader GRAPHTY_GPU_REQUIRE=any node scripts/run-browser-project.js",
        "needs-browser": true,
    },
    // graph-samples - single shard (Node.js, no browser); resolves @graphty/graph-format through graph-format/dist
    {
        shard: "graph-samples",
        package: "graph-samples",
        "test-command": "pnpm exec nx run graph-samples:coverage --exclude-task-dependencies",
        "needs-browser": false,
    },
    // cytoscape-extensions - single shard (Node.js, headless Cytoscape); resolves the graphty packages through their dist.
    // --exclude-task-dependencies: its coverage target depends on build and ^build, and nx replays a cached build by
    // deleting that package's dist and copying it back, so the shard briefly removed graph-format/dist (and the rest)
    // while the shards beside it in the pre-push gate were reading them (issue #2859: graphty's Vite dependency scan
    // failed on it, reloaded the browser page and lost a test file). The build step before the tests made them already.
    {
        shard: "cytoscape-extensions",
        package: "cytoscape-extensions",
        "test-command": "pnpm exec nx run cytoscape-extensions:coverage --exclude-task-dependencies",
        "needs-browser": false,
    },
    // cytoscape-extensions against the oldest Cytoscape its peer range admits (3.31.0, the first that ships its own
    // typings) and the newest 3.x on npm at the time of the run, so a new Cytoscape release that breaks the extension
    // turns this red. Runtime tests and the consumer type check both follow the version under test.
    {
        shard: "cytoscape-extensions-cytoscape-versions",
        package: "cytoscape-extensions",
        "test-command": "cytoscape-extensions/scripts/test-cytoscape-versions.sh 3.31.0 3",
        "needs-browser": false,
    },
    // algorithms - two shards (default and browser separated to avoid worker timeout)
    // Each shard outputs to coverage/ directory; CI artifacts are named coverage-algorithms-{default,browser}
    {
        shard: "algorithms-default",
        package: "algorithms",
        "test-command": "cd algorithms && pnpm exec vitest run --project=default --coverage",
        "needs-browser": false,
    },
    {
        shard: "algorithms-browser",
        package: "algorithms",
        "test-command": "cd algorithms && pnpm exec vitest run --project=browser --coverage",
        "needs-browser": true,
    },
    // layout - single shard
    {
        shard: "layout",
        package: "layout",
        "test-command": "pnpm exec nx run layout:coverage --exclude-task-dependencies",
        "needs-browser": false,
    },
    // graphty - every project but the stories (uses Playwright for browser-based vitest), in five
    // parts, each its own CI job: about 1,240 tests took 46 minutes in one, past the gate's 30-minute
    // shard limit, and in three parts on a CI runner one part took 15 to 16 minutes (graphty-1: 892 s
    // and 928 s of vitest, ci.yml runs 39883665524 and 39887583054, 2026-10-23), so five parts are
    // about 9 minutes each. Each part writes its coverage to its own .coverage-parts/<shard>
    // (COVERAGE_DIR), so the parts' reports stay apart in the pre-push gate too; "coverage-file" says
    // where for the upload. The projects are named, not "!storybook": vitest includes a project that any
    // one filter matches, so no negated filter could also leave out the On twins (tools/features-on.mjs).
    ...[1, 2, 3, 4, 5].map((n) => ({
        shard: `graphty-${n}`,
        package: "graphty",
        "test-command": `cd graphty && COVERAGE_DIR=.coverage-parts/graphty-${n} pnpm exec vitest run --project=browser --project=real-element --project=eslint-rules --project=node --shard=${n}/5 --coverage`,
        "coverage-file": `graphty/.coverage-parts/graphty-${n}/lcov.info`,
        "needs-browser": true,
    })),
    // graphty's stories: every play function run as a test, as graphty-element's storybook shards
    // do. No coverage: the stories exercise the same source the graphty shard measures.
    {
        shard: "graphty-storybook",
        package: "graphty",
        "test-command": "cd graphty && pnpm exec vitest run --project=storybook",
        "needs-browser": true,
    },
    // remote-logger - single shard (has browser tests)
    {
        shard: "remote-logger",
        package: "remote-logger",
        "test-command": "pnpm exec nx run remote-logger:coverage --exclude-task-dependencies",
        "needs-browser": true,
    },
    // visual-review - single shard (Node.js, plus Chromium for the review page and capture tests;
    // coverage counts trusted/lib, trusted/gate.mjs and capture/)
    {
        shard: "visual-review",
        package: "visual-review",
        "test-command": "pnpm exec nx run visual-review:coverage --exclude-task-dependencies",
        "needs-browser": true,
    },
    // githerd - single shard (Node.js, no browser; coverage counts lib/)
    {
        shard: "githerd",
        package: "githerd",
        "test-command": "pnpm exec nx run githerd:coverage --exclude-task-dependencies",
        "needs-browser": false,
    },
    // compact-mantine - single shard (uses Playwright for browser-based vitest)
    {
        shard: "compact-mantine",
        package: "compact-mantine",
        "test-command": "pnpm exec nx run compact-mantine:coverage --exclude-task-dependencies",
        "needs-browser": true,
    },
    // graphty-element default tests (Node.js, no browser)
    // The timing benchmarks (the bench and browser-bench projects) gate nothing: a stopwatch on a
    // busy machine measures the machine. They run in ci.yml's advisory "performance" job; what
    // they time is pinned here by counts (repaint.test.ts, round-trip.test.ts, bulk-teardown.test.ts).
    {
        shard: "graphty-element-default",
        package: "graphty-element",
        "test-command":
            "cd graphty-element && pnpm exec vitest run --project=default --project=mesh --reporter=blob --reporter=default ${CI:+--reporter=junit} ${VITEST_BUDGET_CHECK:+--reporter=../tools/vitest-time-budget.mjs} ${GRAPHTY_RESULTS_INVOCATION:+--reporter=../tools/results/reporter.mjs} --coverage",
        "needs-browser": false,
    },
    // graphty-element browser tests (5 shards)
    // Note: Using both blob and default reporters to capture test results and show failures in logs
    ...[1, 2, 3, 4, 5].map((n) => ({
        shard: `graphty-element-browser-${n}`,
        package: "graphty-element",
        "test-command": `cd graphty-element && pnpm exec vitest run --project=browser --project=interactions --project=xr --shard=${n}/5 --reporter=blob --reporter=default \${CI:+--reporter=junit} \${VITEST_BUDGET_CHECK:+--reporter=../tools/vitest-time-budget.mjs} \${GRAPHTY_RESULTS_INVOCATION:+--reporter=../tools/results/reporter.mjs} --coverage`,
        "needs-browser": true,
        // 935 s for the browser and storybook shards together (2026-10-06); a push that changes
        // only the element's source is left to CI here.
        local: "when-paths-change",
        // The helpers the browser and interaction tests import, which vitest does not list.
        "local-paths": ["graphty-element/test/helpers/", "graphty-element/test/interactions/"],
    })),
    // graphty-element's autosave lifecycle (design/work-protection/plan.md, step 6): the "lifecycle" project
    // launches Chromium, Firefox and WebKit itself through Playwright's library API, and Chrome for Testing
    // over the raw DevTools protocol, and reloads, closes, discards, freezes, crashes and kills pages and
    // browsers; "autosave-engines" runs the in-page autosave tests in Firefox and WebKit. No coverage: the
    // pages run the built ./bundle. A few minutes, beside the other shards. GRAPHTY_LIFECYCLE_FULL=1
    // (the release train) adds the 50,000- and 100,000-node runs. "browsers" asks ci.yml for Firefox and
    // WebKit and their system packages.
    {
        shard: "graphty-element-lifecycle",
        package: "graphty-element",
        "test-command":
            "cd graphty-element && pnpm exec vitest run --project=lifecycle --project=autosave-engines --reporter=default ${CI:+--reporter=junit} ${VITEST_BUDGET_CHECK:+--reporter=../tools/vitest-time-budget.mjs} ${GRAPHTY_RESULTS_INVOCATION:+--reporter=../tools/results/reporter.mjs}",
        "needs-browser": true,
        browsers: "chromium firefox webkit",
        // Never in the pre-push gate: it launches three engines for minutes, and WebKit needs system
        // packages a workstation may lack. Run it by hand with tools/run-tests.sh graphty-element-lifecycle.
        local: "never",
    },
    // graphty-element storybook tests (5 shards). Under v8 coverage a storybook browser session slows
    // down as it runs more stories (after about 100 to 120, each takes ten times as long and they
    // hit the 30 s timeout), so each shard is kept well under 100 stories.
    // Note: Using both blob and default reporters to capture test results and show failures in logs
    // These shards need no Storybook server and no storybook-static artifact: the
    // storybook vitest project composes each story through Vite in the browser via
    // @storybook/addon-vitest, and that plugin only starts a Storybook when it is given
    // a storybookScript, which graphty-element/vitest.config.ts does not set. A step that
    // served the static build on port 9026 was removed; nothing in the repository has
    // referred to that port since.
    ...[1, 2, 3, 4, 5].map((n) => ({
        shard: `graphty-element-storybook-${n}`,
        package: "graphty-element",
        "test-command": `cd graphty-element && pnpm exec vitest run --project=storybook --shard=${n}/5 --reporter=blob --reporter=default \${CI:+--reporter=junit} \${VITEST_BUDGET_CHECK:+--reporter=../tools/vitest-time-budget.mjs} \${GRAPHTY_RESULTS_INVOCATION:+--reporter=../tools/results/reporter.mjs} --coverage`,
        "needs-browser": true,
        local: "when-paths-change",
        // Storybook's own config (the vitest project's configDir) and the story helpers.
        "local-paths": ["graphty-element/.storybook/", "graphty-element/stories/"],
    })),
];

// The CLI reporters every graphty-element shard names (a --reporter on the command line replaces the config's).
const ELEMENT_REPORTERS =
    "--reporter=default ${CI:+--reporter=junit} ${VITEST_BUDGET_CHECK:+--reporter=../tools/vitest-time-budget.mjs} ${GRAPHTY_RESULTS_INVOCATION:+--reporter=../tools/results/reporter.mjs}";
const on = (...projects) => projects.map((p) => `--project=${p}-${ON_SUFFIX}`).join(" ");

/**
 * The "On" configuration (design/ci/channels-pipeline/features.md, section 7.3): the graphty-element and
 * graphty shards again with every declared experiment switched on, through the "<project>-features-on"
 * vitest projects (tools/features-on.mjs), which exist only under GRAPHTY_FEATURES_ON=1. The same commands as their Off twins without coverage (judged on
 * the Off run) or a blob report (the Off run's reports are the ones merged). "full-run-only": planned only
 * in a full run, never on a pull request (plan()). They exist only while graphty-element declares an
 * experiment: with none, On would equal Off, and SHARDS holds no On shard at all.
 */
export const FEATURES_ON_SHARDS = [
    {
        shard: `graphty-element-default-${ON_SUFFIX}`,
        package: "graphty-element",
        "test-command": `cd graphty-element && ${ON_ENV}=1 pnpm exec vitest run ${on("default", "mesh")} ${ELEMENT_REPORTERS}`,
        "needs-browser": false,
    },
    ...[1, 2, 3, 4, 5].map((n) => ({
        shard: `graphty-element-browser-${ON_SUFFIX}-${n}`,
        package: "graphty-element",
        "test-command": `cd graphty-element && ${ON_ENV}=1 pnpm exec vitest run ${on("browser", "interactions", "xr")} --shard=${n}/5 ${ELEMENT_REPORTERS}`,
        "needs-browser": true,
    })),
    ...[1, 2, 3, 4, 5].map((n) => ({
        shard: `graphty-element-storybook-${ON_SUFFIX}-${n}`,
        package: "graphty-element",
        "test-command": `cd graphty-element && ${ON_ENV}=1 pnpm exec vitest run ${on("storybook")} --shard=${n}/5 ${ELEMENT_REPORTERS}`,
        "needs-browser": true,
    })),
    ...[1, 2, 3, 4, 5].map((n) => ({
        shard: `graphty-${ON_SUFFIX}-${n}`,
        package: "graphty",
        "test-command": `cd graphty && ${ON_ENV}=1 pnpm exec vitest run ${on("browser", "real-element")} --shard=${n}/5`,
        "needs-browser": true,
    })),
    {
        shard: `graphty-storybook-${ON_SUFFIX}`,
        package: "graphty",
        "test-command": `cd graphty && ${ON_ENV}=1 pnpm exec vitest run ${on("storybook")}`,
        "needs-browser": true,
    },
].map((s) => ({ ...s, "full-run-only": true, local: "never" }));

export const SHARDS = FEATURES_DECLARED ? [...OFF_SHARDS, ...FEATURES_ON_SHARDS] : OFF_SHARDS;

/**
 * Shards too short to be worth a runner of their own (one to four minutes each, most of it
 * setup) run one after another in a single job. A group job runs only its affected members, and
 * every member runs even when an earlier one failed, so one job reports every failure. Without
 * the groups a full run would ask for 36 test runners at once; with them it asks for 25.
 *
 * Each group is kept under about 15 minutes so no test job holds up a pull request's CI or a
 * re-run of one failed job. Measured on CI runners (ci.yml runs 39537734606 of 2026-10-21 and
 * 39883665524, 39887583054, 39896390282 of 2026-10-23; vitest's own Duration line, plus about 1.5
 * minutes of checkout, install and browser setup per job):
 *   small-node     graph-format 0.8, graph-samples 0.4, cytoscape-extensions 0.5,
 *                  cytoscape-extensions-cytoscape-versions 0.8, layout 0.3, algorithms-default 0.4,
 *                  githerd 0.7                                       about 4 + setup = 6 minutes
 *   small-browser  algorithms-browser 0.1, graph-io-browser 0.1, remote-logger 0.4,
 *                  compact-mantine 4.5 to 6.3, visual-review 2.1,
 *                  webgpu-graph-algorithms-browser 1.1               about 10 + setup = 12 minutes
 * Their own jobs: graph-io (8.1 minutes of vitest; small-node took 13 to 21 minutes with it),
 * graphty-1 to graphty-5 (about 45 minutes in all, see SHARDS) and graphty-storybook (2.1 minutes;
 * small-browser took over 64 minutes with the graphty shards in it).
 */
export const GROUPS = {
    "small-node": [
        "graph-format",
        "graph-samples",
        "cytoscape-extensions",
        "cytoscape-extensions-cytoscape-versions",
        "layout",
        "algorithms-default",
        "githerd",
    ],
    "small-browser": [
        "algorithms-browser",
        "graph-io-browser",
        "remote-logger",
        "compact-mantine",
        "visual-review",
        "webgpu-graph-algorithms-browser",
    ],
};

// Group members whose lcov.info coverage.yml merges, and tools/merge-coverage.sh feeds to Coveralls
// and SonarQube. The webgpu browser smoke never uploaded coverage (the node shards measure the
// package); graphty-storybook writes none (the graphty shards measure graphty); nor does
// graph-io-browser (the graph-io shard measures graph-io).
// Nor do the On shards: coverage is judged on the Off run.
const NO_COVERAGE = new Set([
    "webgpu-graph-algorithms-browser",
    "graphty-storybook",
    "graph-io-browser",
    ...FEATURES_ON_SHARDS.map((s) => s.shard),
]);
// Packages whose coverage ci.yml uploads in steps of their own.
const OWN_UPLOAD = new Set(["graphty-element", "webgpu-graph-algorithms"]);

/**
 * Where a shard's lcov report is: its own "coverage-file", else its package's coverage directory.
 * @param shard a SHARDS entry
 * @returns the path from the repository root
 */
const coverageFile = (shard) => shard["coverage-file"] ?? shard.package + "/coverage/lcov.info";

/**
 * The matrix entry of one group, holding only the members a run must test.
 * @param name the group's name
 * @param members the SHARDS entries to run, in order
 * @returns a matrix entry; "coverage" lists "<shard>=<lcov path>" pairs, space separated
 */
export function groupEntry(name, members) {
    const steps = members.map((m) => `echo "==> ${m.shard}"; (${ciCommand(m)}) || failed="$failed ${m.shard}"`);
    return {
        shard: name,
        package: members.map((m) => m.package).join(" "),
        "test-command": `failed=""; ${steps.join("; ")}; if [ -n "$failed" ]; then echo "::error::failed:$failed"; exit 1; fi`,
        "needs-browser": members.some((m) => m["needs-browser"]),
        coverage: members
            .filter((m) => !NO_COVERAGE.has(m.shard))
            .map((m) => `${m.shard}=${coverageFile(m)}`)
            .join(" "),
    };
}

/**
 * A shard's command as CI's test job runs it: through tools/results/run-group.mjs, which runs it through the
 * quarantine wrapper (tools/test-quarantine.mjs runShard()) as the pre-push gate does, so a flaky or quarantined
 * test fails neither (the checkout's tools/test-quarantine.json; the failed test files are run once more), and
 * then writes one record per try to the results store when RESULTS_URL is set. On unless
 * GRAPHTY_TEST_QUARANTINE=0, which CI does not set: then the wrapper only runs the command.
 * @param shard a SHARDS entry
 * @returns a shell command
 */
export function ciCommand(shard) {
    const escapedQuote = String.raw`'\''`;
    const quoted = `'${shard["test-command"].replaceAll("'", escapedQuote)}'`;
    return `node tools/results/run-group.mjs ${shard.shard} ${quoted}`;
}

/**
 * The test job's matrix: every shard of an affected package, short ones folded into their group.
 * @param affected package directory names
 * @param [only] shard names: when given, every other shard is left out
 * @param [light] tools/test-select.mjs --plan output: its bins replace their shards, its `none` shards are left out
 * @param [full] a full run: plan the "full-run-only" shards too (--only naming one plans it either way)
 * @param [shards] the shards to plan from (for tests)
 * @returns the matrix's include list
 */
export function plan(affected, only, light, full = false, shards = SHARDS) {
    const grouped = new Set(Object.values(GROUPS).flat());
    // a light plan's binned and empty shards run as bins, or not at all
    const replaced = new Set([...(light?.none ?? []), ...(light?.bins ?? []).flatMap((b) => b.covers ?? [b.shard])]);
    const runs = (s) => !s?.["full-run-only"] || full || only !== undefined;
    const wanted = (s) =>
        affected.includes(s.package) &&
        (only === undefined || only.includes(s.shard)) &&
        !replaced.has(s.shard) &&
        runs(s);
    // A shard of its own uploads its coverage the way a group does, unless ci.yml has a step of its own
    // for it (graphty-element, webgpu-graph-algorithms) or it writes none.
    const include = shards
        .filter((s) => !grouped.has(s.shard) && wanted(s))
        .map((s) => {
            const e = { ...s, "test-command": ciCommand(s) };
            return OWN_UPLOAD.has(s.package) || NO_COVERAGE.has(s.shard)
                ? e
                : { ...e, coverage: `${s.shard}=${coverageFile(s)}` };
        });
    for (const [name, names] of Object.entries(GROUPS)) {
        const members = names.map((n) => shards.find((s) => s.shard === n)).filter(wanted);
        if (members.length > 0) {
            include.push(groupEntry(name, members));
        }
    }
    // The On shards go last, so with ci.yml's max-parallel the Off shards always start first.
    const bins = (light?.bins ?? []).filter((b) => runs(shards.find((s) => s.shard === b.shard)));
    const all = [...include, ...bins.map(binEntry)];
    return [...all.filter((e) => !e["full-run-only"]), ...all.filter((e) => e["full-run-only"])];
}

/**
 * The matrix entry of one light-check bin: its shard's fields, with its own name, its files and the command
 * that runs only them (tools/test-select.mjs lightPlan()), without coverage.
 * @param bin a lightPlan() bin
 * @returns a matrix entry with a `files` field
 */
export function binEntry(bin) {
    const shard = SHARDS.find((s) => s.shard === bin.shard);
    if (!shard || !bin.command) {
        throw new Error(`light plan bin ${bin.name} names no shard or has no command`);
    }
    const e = { ...shard, shard: bin.name, files: bin.files, "test-command": bin.command };
    delete e["coverage-file"];
    return { ...e, "test-command": ciCommand(e) };
}

/**
 * The `Stories (<project>-<bin>)` jobs' matrix (merging.md section 4.1): one entry per story bin of the light
 * plan, with the Storybook artifact the build job uploads for its project.
 * @param [light] tools/test-select.mjs --plan output
 * @returns the matrix's include list, empty without a plan or with no story selected
 */
export function storiesPlan(light) {
    const artifactOf = Object.fromEntries(Object.entries(STORYBOOKS).map(([name, dir]) => [dir, name]));
    return (light?.storyBins ?? []).map((bin) => {
        const artifact = artifactOf[bin.storybook];
        if (!artifact) {
            throw new Error(`story bin ${bin.name} names a Storybook no build job uploads: ${bin.storybook}`);
        }
        return {
            name: bin.name,
            project: bin.project,
            artifact,
            storybook: bin.storybook,
            files: bin.files,
            ids: bin.ids,
        };
    });
}

/**
 * The --only argument as a list of shard names.
 * @param arg the argument's JSON text, or undefined when it was not given
 * @returns the names, or undefined for no filter
 * @throws when it is not a non-empty JSON array of shard names
 */
export function parseOnly(arg) {
    if (arg === undefined) return undefined;
    const asked = JSON.parse(arg);
    if (!Array.isArray(asked) || asked.length === 0) {
        throw new Error("--only needs a non-empty JSON array of shard names");
    }
    // "features-on" names every On shard: ci.yml's dispatch with shards='["features-on"]' runs the On
    // configuration for one branch on demand.
    const on = SHARDS.filter((s) => s["full-run-only"]).map((s) => s.shard);
    if (asked.includes(ON_SUFFIX) && on.length === 0) {
        throw new Error("--only features-on: graphty-element declares no experiment, so there is no On shard");
    }
    const only = asked.flatMap((n) => (n === ON_SUFFIX ? on : [n]));
    const unknown = only.filter((n) => !SHARDS.some((s) => s.shard === n));
    if (unknown.length > 0) {
        throw new Error(`--only names shards that do not exist: ${unknown.join(", ")}`);
    }
    return only;
}

function main() {
    const { values, positionals } = parseArgs({
        options: { only: { type: "string" }, plan: { type: "string" }, full: { type: "boolean" } },
        allowPositionals: true,
    });
    const [allArg, affectedArg] = positionals;
    if (allArg === undefined || affectedArg === undefined) {
        console.error(
            "usage: node tools/ci-test-matrix.mjs <all-projects-json> <affected-projects-json> [--only <shards-json>] [--plan <file>] [--full]",
        );
        process.exit(2);
    }
    let only;
    try {
        only = parseOnly(values.only);
    } catch (e) {
        console.error(e.message);
        process.exit(2);
    }
    const all = new Set(JSON.parse(allArg).map(dirName));
    const affected = JSON.parse(affectedArg).map(dirName);

    const unknown = [...new Set(SHARDS.map((s) => s.package))].filter((p) => !all.has(p));
    const ungroupable = Object.values(GROUPS)
        .flat()
        .filter((n) => !SHARDS.some((s) => s.shard === n));
    if (unknown.length > 0) {
        console.error(`test shards name packages nx does not know: ${unknown.join(", ")}`);
    }
    if (ungroupable.length > 0) {
        console.error(`groups name shards that do not exist: ${ungroupable.join(", ")}`);
    }
    if (unknown.length > 0 || ungroupable.length > 0) {
        process.exit(1);
    }

    const light = values.plan === undefined ? undefined : JSON.parse(readFileSync(values.plan, "utf8"));
    const include = plan(affected, only, light, values.full === true);
    console.log(`affected=${JSON.stringify(affected)}`);
    console.log(`test-matrix=${JSON.stringify({ include })}`);
    console.log(`test-count=${include.length}`);
    const stories = storiesPlan(light);
    console.log(`stories-matrix=${JSON.stringify({ include: stories })}`);
    console.log(`stories-count=${stories.length}`);
}

// Run only as the entry point, not when imported.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
