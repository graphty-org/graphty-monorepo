/**
 * Tests of tools/test-select.mjs (the advisory test selector) and the log parsing of
 * tools/test-select-replay.mjs, on small hand-made import graphs.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SHARDS } from "./ci-test-matrix.mjs";
import {
    buildInput,
    estimate,
    globToRe,
    projectSelected,
    selectInGraph,
    selectPackages,
    selectShards,
    shardRuns,
} from "./test-select.mjs";
import { failingFiles, parseGateLog } from "./test-select-replay.mjs";

const rules = {
    everything: [/^pnpm-lock\.yaml$/u, globToRe(".github/workflows/**/*")],
    noTests: [/^design\//u],
    wholePackage: [/(^|\/)fixtures\//u, /^package\.json$/u],
    alsoRun: [],
    opaque: /readFileSync/u,
    readAtRunTime: /\.(md|txt|json)$/u,
};

// a: test/a.test.ts -> src/x.ts -> src/y.ts; test/b.test.ts -> src/z.ts; setup -> test/setup-helper.ts
const graph = {
    package: "pa",
    config: null,
    projects: {
        unit: { specs: ["pa/test/a.test.ts", "pa/test/b.test.ts"], setup: ["pa/test/setup.ts"] },
        other: { specs: ["pa/test/c.test.ts"], setup: [] },
    },
    imports: {
        "pa/test/a.test.ts": ["pa/src/x.ts", "pa/src/shader.wgsl"],
        "pa/src/x.ts": ["pa/src/y.ts"],
        "pa/src/y.ts": [],
        "pa/src/shader.wgsl": [],
        "pa/test/b.test.ts": ["pa/src/z.ts"],
        "pa/src/z.ts": [],
        "pa/test/c.test.ts": [],
        "pa/test/setup.ts": ["pa/test/setup-helper.ts"],
        "pa/test/setup-helper.ts": [],
    },
    opaque: ["pa/test/c.test.ts"],
};

const packages = new Map([
    ["pa", "pa"],
    ["pb", "pb"],
    ["pc", "pc"],
]);
const deps = new Map([
    ["pa", new Set()],
    ["pb", new Set(["pa"])],
    ["pc", new Set()],
]);
const refs = new Map([["pc", new Set(["pa"])]]);
const graphs = new Map([
    ["pa", [graph]],
    ["pb", [{ ...graph, package: "pb", projects: {}, imports: {}, opaque: [] }]],
    ["pc", [{ ...graph, package: "pc", projects: {}, imports: {}, opaque: [] }]],
]);
const select = (changed) => selectPackages({ changed, packages, deps, refs, graphs, rules });

describe("selectInGraph", () => {
    it("selects the tests whose imports reach a changed file, and no other", () => {
        const { specs } = selectInGraph(graph, ["pa/src/y.ts"]);
        assert.deepEqual([...specs.keys()].sort(), ["pa/test/a.test.ts", "pa/test/c.test.ts"]);
        assert.match(specs.get("pa/test/a.test.ts"), /imports pa\/src\/y\.ts/u);
        assert.match(specs.get("pa/test/c.test.ts"), /reads files at run time/u);
    });

    it("keeps an edge Vitest drops: a shader imported with a query suffix", () => {
        assert.ok(selectInGraph(graph, ["pa/src/shader.wgsl"]).specs.has("pa/test/a.test.ts"));
    });

    it("runs a whole project when its setup files reach the change", () => {
        const { specs } = selectInGraph(graph, ["pa/test/setup-helper.ts"]);
        assert.ok(specs.has("pa/test/a.test.ts") && specs.has("pa/test/b.test.ts"));
    });

    it("a changed test file selects itself and does not wake the run-time readers", () => {
        assert.deepEqual([...selectInGraph(graph, ["pa/test/b.test.ts"]).specs.keys()], ["pa/test/b.test.ts"]);
    });
});

describe("selectPackages", () => {
    it("runs everything for the lockfile and for nx's shared globals", () => {
        assert.equal(select(["pnpm-lock.yaml"]).everything, "pnpm-lock.yaml");
        assert.equal(select([".github/workflows/ci.yml"]).everything, ".github/workflows/ci.yml");
    });

    it("selects files inside the changed package and runs its build dependents whole", () => {
        const sel = select(["pa/src/z.ts"]).packages;
        assert.equal(sel.get("pa").mode, "files");
        assert.deepEqual([...sel.get("pa").specs.keys()].sort(), ["pa/test/b.test.ts", "pa/test/c.test.ts"]);
        assert.equal(sel.get("pb").mode, "all");
        assert.match(sel.get("pb").reasons[0], /depends on pa/u);
        assert.equal(sel.get("pc").mode, "all", "pc reads pa's files by relative path");
    });

    it("a test-only change in a package does not run what depends on its build", () => {
        const sel = select(["pa/test/b.test.ts"]).packages;
        assert.equal(sel.get("pb").mode, "none");
        assert.equal(sel.get("pc").mode, "all", "but a package that reads its files still runs");
    });

    it("runs the whole package for a data folder, and for a code file no graph or rule explains", () => {
        assert.equal(select(["pa/test/fixtures/k.json"]).packages.get("pa").mode, "all");
        const sel = select(["pa/scripts/gen.ts"]).packages.get("pa");
        assert.equal(sel.mode, "all");
        assert.match(sel.reasons[0], /no test's import graph/u);
    });

    it("a data file no test imports runs only the tests that read files at run time", () => {
        const sel = select(["pa/docs/guide.md"]).packages.get("pa");
        assert.equal(sel.mode, "files");
        assert.deepEqual([...sel.specs.keys()], ["pa/test/c.test.ts"]);
    });

    it("a root file a test imports selects the tests that reach it, and one no test names runs nothing", () => {
        const withRoot = {
            ...graph,
            imports: { ...graph.imports, "pa/src/z.ts": ["tools/shared.mjs"], "tools/shared.mjs": [] },
        };
        const g = new Map([...graphs, ["pa", [withRoot]]]);
        const sel = selectPackages({ changed: ["tools/shared.mjs"], packages, deps, refs, graphs: g, rules });
        // b imports it; c reads files at run time, which any change that is not a test wakes
        assert.deepEqual([...sel.packages.get("pa").specs.keys()].sort(), ["pa/test/b.test.ts", "pa/test/c.test.ts"]);
        assert.ok([...select(["tools/nobody-reads-this-xyz.mjs"]).packages.values()].every((p) => p.mode === "none"));
    });

    it("runs a package whole when its import graph could not be built", () => {
        const broken = new Map([...graphs, ["pa", [null]]]);
        const sel = selectPackages({ changed: ["pa/src/z.ts"], packages, deps, refs, graphs: broken, rules });
        assert.equal(sel.packages.get("pa").mode, "all");
    });

    it("a design note runs nothing", () => {
        assert.ok([...select(["design/x.md"]).packages.values()].every((p) => p.mode === "none"));
    });
});

describe("shards", () => {
    it("reads each vitest run of a shard command", () => {
        const runs = shardRuns(SHARDS.find((s) => s.shard === "graphty-element-browser-2"));
        assert.deepEqual(runs, [{ config: null, projects: ["browser", "interactions", "xr"], slice: "2/5" }]);
        assert.deepEqual(
            shardRuns(SHARDS.find((s) => s.shard === "graph-io-browser"))[0].config,
            "vitest.browser.config.ts",
        );
        assert.equal(shardRuns(SHARDS.find((s) => s.shard === "cytoscape-extensions-cytoscape-versions")), null);
        assert.deepEqual(shardRuns(SHARDS.find((s) => s.shard === "graph-format")), [
            { config: null, projects: [], slice: null },
        ]);
    });

    it("matches project filters, negated ones and browser names included", () => {
        assert.ok(projectSelected("browser (chromium)", ["browser"]));
        assert.ok(!projectSelected("storybook (chromium)", ["!storybook"]));
        assert.ok(projectSelected("real-element (chromium)", ["!storybook"]));
        assert.ok(projectSelected("", []));
    });

    it("gives a shard its selected files and estimates their share of its time", () => {
        const shard = {
            shard: "pa-unit",
            package: "pa",
            "test-command": "cd pa && pnpm exec vitest run --project=unit",
        };
        const sel = selectShards([shard], select(["pa/src/z.ts"]).packages, graphs);
        assert.equal(sel[0].mode, "files");
        assert.deepEqual(
            sel[0].files.map((f) => f.file),
            ["pa/test/b.test.ts"],
        );
        assert.equal(sel[0].total, 2);
        assert.deepEqual(estimate(sel, new Map([["pa-unit", 100]])), { full: 100, selected: 50 });
    });
});

describe("buildInput", () => {
    it("tells build inputs from tests, stories and docs", () => {
        assert.ok(buildInput("src/a.ts"));
        assert.ok(!buildInput("test/a.ts"));
        assert.ok(!buildInput("src/a.test.ts"));
        assert.ok(!buildInput("stories/A.stories.tsx"));
        assert.ok(!buildInput("README.md"));
    });
});

describe("the replay's log parsing", () => {
    it("reads the shard lines of a gate log", () => {
        const log = [
            "Left to CI (this push changes none of the files they test): graphty-element-browser-1, graphty-element-storybook-2",
            "  [SKIP] layout: passed at 2026-10-20 on abc with byte-identical inputs",
            "  [PASS] graph-io (331s)",
            "  [FAIL] graphty-element-default (exit 1, 281s); the end of /x/graphty-element-default.log:",
            " FAIL  |default| test/styles/a.test.ts > a > b",
            "  [FAIL] graphty-element-default: its whole log is kept in /k/g.log",
        ].join("\n");
        const g = parseGateLog(log);
        assert.deepEqual(g.skipped, ["layout"]);
        assert.deepEqual(g.leftToCi, ["graphty-element-browser-1", "graphty-element-storybook-2"]);
        assert.deepEqual(
            g.ran.map((r) => [r.shard, r.ok, r.secs, r.kept ?? null]),
            [
                ["graph-io", true, 331, null],
                ["graphty-element-default", false, 281, "/k/g.log"],
            ],
        );
    });

    it("names the failing test files of a vitest log, stories and unhandled errors included", () => {
        const log = [
            "\u001b[31m FAIL \u001b[39m |browser (chromium)| test/browser/x.test.ts > a",
            " FAIL   autosave-engines (firefox)  test/browser/autosave/y.test.ts > b",
            " FAIL  |storybook (chromium)| tests/stories/play.storybook.test.tsx > ../../stories/A.stories.tsx > States",
            " FAIL  test/hook.test.mjs [ test/hook.test.mjs ]",
            'This error originated in "test/z.test.ts" test file.',
            " Test Files  2 failed | 5 passed (7)",
        ].join("\n");
        const f = failingFiles(log);
        assert.deepEqual(f.files.sort(), [
            "stories/A.stories.tsx",
            "test/browser/autosave/y.test.ts",
            "test/browser/x.test.ts",
            "test/hook.test.mjs",
            "test/z.test.ts",
            "tests/stories/play.storybook.test.tsx",
        ]);
        assert.equal(f.summary, "Test Files  2 failed | 5 passed (7)");
    });
});
