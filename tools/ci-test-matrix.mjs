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
 * Usage: node tools/ci-test-matrix.mjs <all-projects-json> <affected-projects-json>
 *   both are the JSON arrays `nx show projects --json` prints (with or without --affected).
 * Prints three GITHUB_OUTPUT lines:
 *   affected=<JSON array of package directory names>   (Chromatic jobs test membership in it)
 *   test-matrix=<JSON {"include": [...shards]}>
 *   test-count=<number of shards>   (0 means skip the test job: an empty matrix is an error)
 *
 * It fails when a shard names a package nx does not know: a renamed project would otherwise match
 * no affected name and its shards would silently never run on a pull request again.
 */

// nx names most projects by their directory; remote-logger is the one it names by package
// ("@graphty/remote-logger"). Shards use the directory name, so strip the scope.
const dirName = (project) => project.replace(/^@graphty\//, "");

const SHARDS = [
    // graph-format - single shard (Node.js, no browser)
    {
        shard: "graph-format",
        package: "graph-format",
        "test-command": "pnpm exec nx run graph-format:coverage",
        "needs-browser": false,
    },
    // graph-io - single shard (Node.js, no browser); resolves @graphty/graph-format through graph-format/dist
    {
        shard: "graph-io",
        package: "graph-io",
        "test-command": "pnpm exec nx run graph-io:coverage",
        "needs-browser": false,
    },
    // webgpu-graph-algorithms - two shards (design/webgpu/webgpu-acceleration-plan.md 12.5): the node
    // project on Dawn over Mesa lavapipe with coverage (thresholds active) plus the no-subgroups twins
    // pass, and the Chromium SwiftShader browser smoke. The node shard calls vitest directly: the
    // nx -> npm -> vitest pipe chain starved the worker RPC for graph-format and graph-io (6fc56c1b).
    // needs-lavapipe gates the apt install and the ICD lookup that export the lane's environment.
    // The twin pass covers test/algorithms as well: pr-scale and pr-finalize declare
    // needs: ["subgroups"] (they call wg_reduce_vec4) and their tests live there, so without that
    // path the twin would never exercise the PageRank reduction on a device without the feature.
    // the node suite runs through scripts/run-node-shard.js: it forwards every argument and exits with
    // vitest's own code. On a non-zero exit its FIRST line is the [missing-files] block -- how many test
    // files started, how many reported, and the names of the difference, which is what a dead worker
    // swallowed; after it, and after 90 seconds of silence, the process table with each process's kernel
    // wait channel and a Node diagnostic report per surviving process (G4-F14).
    // The files that break a device on purpose are the `node-device-errors` project and run in an
    // invocation of their own, one file at a time, AFTER the node project has written its coverage:
    // a worker they kill then takes eleven files with it instead of the hundred and fourteen beside
    // them. Their coverage goes to .coverage-parts/device-errors and is uploaded as a second
    // artifact, which tools/merge-coverage.sh merges with the first the way it already merges the
    // graphty-element shards.
    // The twin pass runs TWICE for the same reason. `--project=node` no longer reaches the four
    // device-error files under test/layouts (fa2-lifecycle, fr-lifecycle, grid-lifecycle,
    // force-simulation), so a second twin invocation names them through the device-error project:
    // 44 + 4 = the 48 layout files the twin pass covered before the split, unchanged. It carries no
    // --passWithNoTests on purpose -- an empty match there means those files moved and the twin pass
    // shrank again, which should be a red step and not a silent pass.
    {
        shard: "webgpu-graph-algorithms-node",
        package: "webgpu-graph-algorithms",
        "test-command":
            "cd webgpu-graph-algorithms && node scripts/run-node-shard.js --project=node --coverage && COVERAGE_DIR=.coverage-parts/device-errors node scripts/run-node-shard.js --project=node-device-errors --coverage && GRAPHTY_GPU_NO_SUBGROUPS=1 node scripts/run-node-shard.js --project=node test/primitives test/layouts test/algorithms --passWithNoTests && GRAPHTY_GPU_NO_SUBGROUPS=1 node scripts/run-node-shard.js --project=node-device-errors test/layouts",
        "needs-browser": false,
        "needs-lavapipe": true,
    },
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
        "test-command": "pnpm exec nx run graph-samples:coverage",
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
        "test-command": "pnpm exec nx run layout:coverage",
        "needs-browser": false,
    },
    // graphty - single shard (uses Playwright for browser-based vitest)
    {
        shard: "graphty",
        package: "graphty",
        "test-command": "pnpm exec nx run graphty:coverage",
        "needs-browser": true,
    },
    // remote-logger - single shard (has browser tests)
    {
        shard: "remote-logger",
        package: "remote-logger",
        "test-command": "pnpm exec nx run remote-logger:coverage",
        "needs-browser": true,
    },
    // compact-mantine - single shard (uses Playwright for browser-based vitest)
    {
        shard: "compact-mantine",
        package: "compact-mantine",
        "test-command": "pnpm exec nx run compact-mantine:coverage",
        "needs-browser": true,
    },
    // graphty-element default tests (Node.js, no browser)
    // The bench project runs in the same shard but WITHOUT --coverage: it asserts
    // the repaint's timing budget, and v8 coverage instruments this package's own
    // source while leaving node_modules alone, so an instrumented run measures the
    // instrumentation rather than the repaint.
    {
        shard: "graphty-element-default",
        package: "graphty-element",
        "test-command":
            "cd graphty-element && pnpm exec vitest run --project=default --project=mesh --reporter=blob --reporter=default --coverage && pnpm exec vitest run --project=bench --reporter=default",
        "needs-browser": false,
    },
    // graphty-element browser tests (5 shards)
    // Note: Using both blob and default reporters to capture test results and show failures in logs
    ...[1, 2, 3, 4, 5].map((n) => ({
        shard: `graphty-element-browser-${n}`,
        package: "graphty-element",
        "test-command": `cd graphty-element && pnpm exec vitest run --project=browser --project=interactions --project=xr --shard=${n}/5 --reporter=blob --reporter=default --coverage`,
        "needs-browser": true,
    })),
    // graphty-element storybook tests (4 shards)
    // Note: Using both blob and default reporters to capture test results and show failures in logs
    // These shards need no Storybook server and no storybook-static artifact: the
    // storybook vitest project composes each story through Vite in the browser via
    // @storybook/addon-vitest, and that plugin only starts a Storybook when it is given
    // a storybookScript, which graphty-element/vitest.config.ts does not set. A step that
    // served the static build on port 9026 was removed; nothing in the repository has
    // referred to that port since.
    ...[1, 2, 3, 4].map((n) => ({
        shard: `graphty-element-storybook-${n}`,
        package: "graphty-element",
        "test-command": `cd graphty-element && pnpm exec vitest run --project=storybook --shard=${n}/4 --reporter=blob --reporter=default --coverage`,
        "needs-browser": true,
    })),
];

const [allArg, affectedArg] = process.argv.slice(2);
if (allArg === undefined || affectedArg === undefined) {
    console.error("usage: node tools/ci-test-matrix.mjs <all-projects-json> <affected-projects-json>");
    process.exit(2);
}
const all = new Set(JSON.parse(allArg).map(dirName));
const affected = JSON.parse(affectedArg).map(dirName);

const unknown = [...new Set(SHARDS.map((s) => s.package))].filter((p) => !all.has(p));
if (unknown.length > 0) {
    console.error(`test shards name packages nx does not know: ${unknown.join(", ")}`);
    process.exit(1);
}

const include = SHARDS.filter((s) => affected.includes(s.package));
console.log(`affected=${JSON.stringify(affected)}`);
console.log(`test-matrix=${JSON.stringify({ include })}`);
console.log(`test-count=${include.length}`);
