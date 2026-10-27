/**
 * Tests of tools/test-select.mjs (the advisory test selector) and the log parsing of
 * tools/test-select-replay.mjs, on small hand-made import graphs.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { plan as matrixPlan, SHARDS } from "./ci-test-matrix.mjs";
import {
    advisoryMisses,
    buildInput,
    changedImporters,
    estimate,
    failingFiles,
    globToRe,
    graphCacheKey,
    lightPlan,
    planSummary,
    lockMoves,
    literalPaths,
    loadRules,
    measuredOf,
    outsideOf,
    packBins,
    BIN_LIMIT_MS,
    FILE_OVERHEAD_MS,
    rootImportGraph,
    sameOutside,
    planRuns,
    projectSelected,
    reportAdvisory,
    selectInGraph,
    selectPackages,
    selectShards,
    selectStories,
    storyBins,
    STORY_BIN_LIMIT_MS,
    STORY_MS,
    storyCount,
    selectedCommand,
    shardRuns,
    sourceOf,
    startAdvisory,
    testRefs,
    wholePackageRule,
    withLockfile,
} from "./test-select.mjs";
import { ciFailures, parseGateLog } from "./test-select-replay.mjs";
import { applyBudgets, keyOf, percentile, replayRecord, SETUP_MS, summarize } from "./light-check-replay.mjs";
import { laneEnv, passStore } from "./prepush-inputs.mjs";
import { deferDownstreamOn, selectedShards, selectionOn } from "./prepush-tests.mjs";
import { candidateShards, changedSince, describePlan } from "./test-changed.mjs";
import {
    mutant,
    runPaths,
    seededPick,
    storiesMissed,
    storyCandidates,
    storyFiles,
    unexplained,
} from "./test-select-mutate.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// the fixtures below live under the checkout so that they resolve its installed vitest
mkdirSync(join(ROOT, "tmp"), { recursive: true });

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
// pc has no graph to say which of its files reads pa's, so any change to pa runs it whole
const refs = new Map([["pc", [{ target: "pa", prefix: "pa/", holder: null, build: false }]]]);
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

    it("selects files inside the changed package, and in its build dependents the tests that reach the source", () => {
        const sel = select(["pa/src/z.ts"]).packages;
        assert.equal(sel.get("pa").mode, "files");
        assert.deepEqual([...sel.get("pa").specs.keys()].sort(), ["pa/test/b.test.ts", "pa/test/c.test.ts"]);
        assert.equal(sel.get("pb").mode, "none", "no test of pb reaches pa/src/z.ts");
        assert.match(sel.get("pb").reasons[0], /no test reaches the changed source of pa/u);
        assert.equal(sel.get("pb").fileLevel, true, "a file-level answer, so it waits for pb's allow-list entry");
        assert.equal(sel.get("pc").mode, "all", "pc reads pa's files by relative path");
        assert.equal(select(["pa/scripts/bundle.js"]).packages.get("pb").mode, "all", "a build script runs it whole");
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
        const nobody = select(["tools/nobody-reads-this-xyz.mjs"]);
        assert.ok([...nobody.packages.values()].every((p) => p.mode === "none"));
        assert.deepEqual(nobody.unexplainedRoot, ["tools/nobody-reads-this-xyz.mjs"], "and is listed as such");
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

describe("deferring downstream packages' tests (landing checks)", () => {
    const defer = (changed) => selectPackages({ changed, packages, deps, refs, graphs, rules, deferDownstream: true });

    it("runs only the changed package: neither its build dependents nor its readers", () => {
        const sel = defer(["pa/scripts/bundle.js"]).packages;
        assert.equal(sel.get("pa").mode, "all");
        assert.equal(sel.get("pb").mode, "none", "pb depends on pa's build");
        assert.equal(sel.get("pc").mode, "none", "pc reads pa's files");
    });

    it("still runs everything for a shared root file", () => {
        assert.equal(defer([".github/workflows/ci.yml"]).everything, ".github/workflows/ci.yml");
        assert.ok([...defer(["pnpm-lock.yaml"]).packages.values()].every((p) => p.mode === "all"));
    });

    it("on the real shards: a graph-io change selects only graph-io's shards; a shared global selects all", () => {
        const real = new Map([
            ["graph-format", "graph-format"],
            ["graph-io", "graph-io"],
            ["graphty-element", "graphty-element"],
            ["graphty", "graphty"],
        ]);
        const realDeps = new Map([
            ["graph-format", new Set()],
            ["graph-io", new Set(["graph-format"])],
            ["graphty-element", new Set(["graph-io", "graph-format"])],
            ["graphty", new Set(["graphty-element"])],
        ]);
        const noGraphs = new Map([...real.values()].map((d) => [d, []]));
        const run = (changed, deferDownstream) => {
            const sel = selectPackages({
                changed,
                packages: real,
                deps: realDeps,
                refs: new Map(),
                graphs: noGraphs,
                rules: loadRules(ROOT),
                deferDownstream,
            });
            const shards = SHARDS.filter((s) => real.has(s.package));
            return selectShards(shards, sel.packages, noGraphs)
                .filter((s) => s.mode !== "none")
                .map((s) => s.package);
        };
        const ioOnly = run(["graph-io/src/index.ts"], true);
        assert.ok(ioOnly.length > 0 && ioOnly.every((p) => p === "graph-io"), ioOnly.join(", "));
        assert.ok(run(["graph-io/src/index.ts"], false).includes("graphty-element"), "without deferral it runs");
        const shared = run(["vitest.shared.config.ts"], true);
        assert.deepEqual([...new Set(shared)].sort(), ["graph-format", "graph-io", "graphty", "graphty-element"]);
    });

    it("is on unless PREPUSH_DEFER_DOWNSTREAM=0", () => {
        assert.equal(deferDownstreamOn({}), true);
        assert.equal(deferDownstreamOn({ PREPUSH_DEFER_DOWNSTREAM: "1" }), true);
        assert.equal(deferDownstreamOn({ PREPUSH_DEFER_DOWNSTREAM: "0" }), false);
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
        // an On twin only by its own name (it exists only under GRAPHTY_FEATURES_ON=1)
        assert.ok(!projectSelected("storybook-features-on (chromium)", ["!storybook"]));
        assert.ok(!projectSelected("default-features-on", []));
        assert.ok(projectSelected("storybook-features-on (chromium)", ["storybook-features-on"]));
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

describe("the rules file", () => {
    const real = loadRules(ROOT);

    it("runs the smoke shards, not everything, for ci.yml and the actions CI's shards use", () => {
        for (const f of [".github/workflows/ci.yml", ".github/actions/early-verdict/action.yml", "pnpm-lock.yaml"]) {
            assert.ok(!real.everything.some((re) => re.test(f)), f);
        }
        assert.ok(real.smoke.patterns.some((re) => re.test(".github/actions/early-verdict/action.yml")));
        assert.ok(
            real.smoke.shards.every((sh) => SHARDS.some((s) => s.shard === sh)),
            "every smoke shard exists",
        );
    });

    it("judges code under src/ by the import graph, never by a data-folder rule", () => {
        assert.ok(!wholePackageRule("src/data/JsonDataSource.ts", real));
        assert.ok(wholePackageRule("src/data/sample.json", real));
        assert.ok(wholePackageRule("test/fixtures/k.ts", real));
    });

    it("allows file-level selection only in the packages a clean mutation run admitted", () => {
        assert.deepEqual([...real.fileLevel].sort(), [
            "algorithms",
            "compact-mantine",
            "cytoscape-extensions",
            "githerd",
            "graph-format",
            "graph-io",
            "graph-samples",
            "graphty",
            "graphty-element",
            "layout",
            "remote-logger",
            "visual-review",
        ]);
        assert.deepEqual([...real.fileLevelBrowser].sort(), [
            "algorithms",
            "compact-mantine",
            "graph-io",
            "graphty",
            "graphty-element",
        ]);
    });
});

describe("file-level selection, allowed and measured", () => {
    const shard = { shard: "pa-unit", package: "pa", "test-command": "cd pa && pnpm exec vitest run --project=unit" };
    const nodeGraph = {
        ...graph,
        projects: {
            unit: { ...graph.projects.unit, browser: false },
            other: { ...graph.projects.other, browser: false },
        },
    };
    const g = new Map([...graphs, ["pa", [nodeGraph]]]);
    const pkgs = selectPackages({ changed: ["pa/src/z.ts"], packages, deps, refs, graphs: g, rules }).packages;

    it("uses the file list where the package is allowed and the shard runs no browser", () => {
        const [s] = selectShards([shard], pkgs, g, new Set(["pa"]));
        assert.equal(s.mode, "files");
        assert.equal(s.measured, undefined);
    });

    it("runs the shard whole elsewhere, keeping the file list as measured", () => {
        const [s] = selectShards([shard], pkgs, g, new Set(["pz"]));
        assert.equal(s.mode, "all");
        assert.deepEqual(
            s.measured.files.map((f) => f.file),
            ["pa/test/b.test.ts"],
        );
        assert.equal(measuredOf([s])[0].mode, "files");
        const [browser] = selectShards([shard], pkgs, graphs, new Set(["pa"]));
        assert.equal(browser.mode, "all", "a project without the browser flag counts as a browser project");
        assert.match(browser.reasons[0], /browser/u);
        assert.ok(s.measured.untrusted && browser.measured.untrusted, "the light check does not rely on either answer");
        const [smoked] = selectShards(
            [shard],
            pkgs,
            g,
            new Set(["pa"]),
            new Set(),
            new Map([["pa-unit", "a smoke pattern"]]),
        );
        assert.equal(smoked.mode, "all");
        assert.equal(smoked.measured.untrusted, true);
    });

    it("selects a browser shard file by file only where fileLevelBrowser allows it", () => {
        const [held] = selectShards([shard], pkgs, graphs, new Set(["pa"]), new Set());
        assert.equal(held.mode, "all");
        const [allowed] = selectShards([shard], pkgs, graphs, new Set(["pa"]), new Set(["pa"]));
        assert.equal(allowed.mode, "files");
    });

    it("runs a changed package whole when no test reaches the change, but leaves an untouched one at none", () => {
        const pcShard = { ...shard, shard: "pc-unit", package: "pc" };
        const [changed] = selectShards([pcShard], select(["pc/notes.md"]).packages, g, new Set());
        assert.equal(changed.mode, "all");
        const [untouched] = selectShards([shard], select(["design/x.md"]).packages, g, new Set());
        assert.equal(untouched.mode, "none");
    });
});

describe("the advisory record", () => {
    const selection = [
        { shard: "a", package: "pa", mode: "files", files: [{ file: "pa/test/a.test.ts" }], total: 4, reasons: [] },
        {
            shard: "b",
            package: "pb",
            mode: "all",
            files: [],
            total: 4,
            reasons: ["not allowed"],
            measured: { mode: "files", files: [{ file: "pb/test/x.test.ts" }] },
        },
        { shard: "c", package: "pc", mode: "none", files: [], total: 4, reasons: [] },
    ];

    it("counts a failing file outside a file selection as a miss, measured selections included", () => {
        const results = [
            { shard: "a", ok: false, failing: ["pa/test/a.test.ts", "pa/test/b.test.ts"] },
            { shard: "b", ok: false, failing: ["pb/test/y.test.ts"] },
            { shard: "c", ok: false, failing: [] },
        ];
        assert.deepEqual(advisoryMisses(results, selection), [
            { shard: "a", file: "pa/test/b.test.ts" },
            { shard: "b", file: "pb/test/y.test.ts" },
            { shard: "c", file: null },
        ]);
    });

    it("writes the failing files, both time figures and the misses, and prints one line", () => {
        const main = mkdtempSync(join(ROOT, "tmp", "test-select-advisory-"));
        try {
            const log = join(main, "a.log");
            writeFileSync(log, " FAIL  |unit| test/b.test.ts > fails\n");
            const out = JSON.stringify({ everything: null, unexplainedRoot: [], shards: selection }) + "\n";
            const results = [
                { shard: "a", ok: false, secs: 40, log },
                { shard: "b", ok: true, secs: 100, log: join(main, "none.log") },
            ];
            reportAdvisory({ root: ROOT, base: "x", gateBase: "y", main, results, done: true, out });
            const rec = JSON.parse(readFileSync(join(main, "tmp/test-select/advisory.jsonl"), "utf8"));
            assert.deepEqual(rec.results[0].failing, ["pa/test/b.test.ts"]);
            assert.equal(rec.results[1].failing, undefined);
            assert.deepEqual(rec.missed, [{ shard: "a", file: "pa/test/b.test.ts" }]);
            assert.deepEqual(rec.time, { full: 140, selected: 110 });
            assert.deepEqual(rec.measuredTime, { full: 140, selected: 35 });
            assert.equal(rec.base, "x");
            assert.equal(rec.gateBase, "y");
        } finally {
            rmSync(main, { recursive: true, force: true });
        }
    });

    it("never throws into the gate when the selector failed or had not finished", async () => {
        const main = mkdtempSync(join(ROOT, "tmp", "test-select-advisory-"));
        try {
            const adv = startAdvisory(ROOT, "no-such-ref-for-this-test", main);
            adv.report([{ shard: "a", ok: true, secs: 1 }]);
            await adv.closed;
            const failed = startAdvisory(ROOT, "no-such-ref-for-this-test", main);
            await failed.closed;
            failed.report([{ shard: "a", ok: true, secs: 1 }]);
        } catch (e) {
            assert.fail(`report threw: ${e.message}`);
        } finally {
            rmSync(main, { recursive: true, force: true });
        }
    });
});

describe("building a package's import graph (a fixture package, walked by Vitest for real)", () => {
    const fixture = mkdtempSync(join(ROOT, "tmp", "test-select-fixture-"));
    const put = (path, text) => {
        mkdirSync(dirname(join(fixture, path)), { recursive: true });
        writeFileSync(join(fixture, path), text);
    };
    put("pa/package.json", JSON.stringify({ name: "pa", type: "module" }));
    put("pa/src/a.ts", 'import { b } from "./b";\nexport const a = () => b;\n');
    put("pa/src/b.ts", "export const b = 1;\n");
    put("pa/src/c.ts", "export const c = 2;\n");
    put("pa/src/text.txt", "hello\n");
    put(
        "pa/src/w.ts",
        'import t from "./text.txt?raw";\nimport "./s.css";\nexport const w = new URL("./worker.ts", import.meta.url);\nexport { t };\n',
    );
    put("pa/src/s.css", '@font-face { font-family: f; src: url("./f.ttf") format("truetype"); }\n');
    put("pa/src/f.ttf", "font\n");
    put("pa/src/worker.ts", "export {};\n");
    put("pa/test/a.test.ts", 'import { it } from "vitest";\nimport { a } from "../src/a";\nit("a", () => a());\n');
    put("pa/test/w.test.ts", 'import { it } from "vitest";\nimport { w } from "../src/w";\nit("w", () => w);\n');
    put(
        "pa/test/reads.test.ts",
        'import { it } from "vitest";\nimport { readFileSync } from "node:fs";\n' +
            'it("r", () => readFileSync(new URL("../../pb/data.txt", import.meta.url)));\n',
    );
    put("pb/package.json", JSON.stringify({ name: "pb", type: "module" }));
    put("pb/data.txt", "x\n");

    it("follows imports, query-suffix imports and new URL(), and finds the tests that read files", () => {
        try {
            const out = execFileSync(
                process.execPath,
                [join(ROOT, "tools/test-select.mjs"), "--root", fixture, "--graph", "pa"],
                { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
            );
            const g = JSON.parse(out.trim().split("\n").at(-1));
            const specs = Object.values(g.projects)
                .flatMap((p) => p.specs)
                .sort();
            assert.deepEqual(specs, ["pa/test/a.test.ts", "pa/test/reads.test.ts", "pa/test/w.test.ts"]);
            assert.ok(Object.values(g.projects).every((p) => p.browser === false));
            assert.deepEqual(g.imports["pa/src/a.ts"], ["pa/src/b.ts"]);
            assert.deepEqual(g.imports["pa/src/w.ts"].sort(), ["pa/src/s.css", "pa/src/text.txt", "pa/src/worker.ts"]);
            assert.deepEqual(g.imports["pa/src/s.css"], ["pa/src/f.ttf"], "a stylesheet's url() is an edge");
            assert.deepEqual(g.opaque, ["pa/test/reads.test.ts"]);
            assert.deepEqual([...selectInGraph(g, ["pa/src/b.ts"]).specs.keys()].sort(), [
                "pa/test/a.test.ts",
                "pa/test/reads.test.ts",
            ]);
            assert.ok(selectInGraph(g, ["pa/src/text.txt"]).specs.has("pa/test/w.test.ts"));
            assert.ok(!selectInGraph(g, ["pa/src/c.ts"]).explained.has("pa/src/c.ts"), "nothing imports c");

            const roots = new Map([
                ["pa", "pa"],
                ["pb", "pb"],
            ]);
            const refs = testRefs(
                fixture,
                roots,
                new Map([
                    ["pa", [g]],
                    ["pb", [null]],
                ]),
                new Map(),
            );
            assert.deepEqual(
                refs.get("pa"),
                [{ target: "pb", prefix: "pb/data", holder: "pa/test/reads.test.ts", build: false }],
                "pa's reads test names pb's data file by relative path",
            );
        } finally {
            rmSync(fixture, { recursive: true, force: true });
        }
    });
});

describe("the CI collector", () => {
    const shards = [
        { shard: "graph-io", package: "graph-io" },
        { shard: "layout", package: "layout" },
    ];
    const dirs = ["graph-io", "layout"];
    const check = (name, notes) => ({ name, annotations: { nodes: notes } });

    it("reads failing test files from failure annotations, and failed shards from a group job", () => {
        assert.deepEqual(
            ciFailures(
                check("Test (small-node)", [
                    { path: "graph-io/test/a.test.ts", message: "slow", annotationLevel: "WARNING" },
                    { path: ".github", message: "failed: graph-io, layout", annotationLevel: "FAILURE" },
                ]),
                shards,
                dirs,
            ).map((f) => [f.package, f.file]),
            [
                ["graph-io", null],
                ["layout", null],
            ],
        );
        assert.deepEqual(
            ciFailures(
                check("Test (graph-io)", [
                    { path: "graph-io/test/a.test.ts", message: "boom\nstack", annotationLevel: "FAILURE" },
                ]),
                shards,
                dirs,
            ),
            [{ package: "graph-io", shard: "graph-io", file: "test/a.test.ts", what: "boom" }],
        );
        assert.deepEqual(ciFailures(check("Lint", []), shards, dirs), []);
    });
});

describe("running a selection", () => {
    const byName = (name) => SHARDS.find((s) => s.shard === name);
    const files = (...f) => f.map((file) => ({ file, why: "imports it" }));

    it("runs a plain vitest shard's files with its config and projects, no coverage, no slice", () => {
        assert.equal(
            selectedCommand(ROOT, byName("graphty-1"), ["graphty/src/a.test.tsx", "graphty/src/it's.test.ts"]),
            "cd graphty && pnpm exec vitest run --project='!storybook' 'src/a.test.tsx' 'src/it'\\''s.test.ts'",
        );
        assert.equal(
            selectedCommand(ROOT, byName("graph-io-browser"), ["graph-io/test/x.test.ts"]),
            "cd graph-io && pnpm exec vitest run --config=vitest.browser.config.ts 'test/x.test.ts'",
        );
        const element = selectedCommand(ROOT, byName("graphty-element-browser-2"), ["graphty-element/test/a.test.ts"]);
        assert.equal(
            element,
            "cd graphty-element && pnpm exec vitest run --project=browser --project=interactions --project=xr 'test/a.test.ts'",
        );
    });

    it("runs an nx coverage shard as a vitest run of its package when its script is plain", () => {
        assert.equal(
            selectedCommand(ROOT, byName("graph-format"), ["graph-format/test/a.test.ts"]),
            "cd graph-format && pnpm exec vitest run 'test/a.test.ts'",
        );
    });

    it("refuses wrappers, scripts, lane variables, positional filters and files of another package", () => {
        for (const name of [
            "webgpu-graph-algorithms-node",
            "webgpu-graph-algorithms-browser",
            "cytoscape-extensions-cytoscape-versions",
        ]) {
            assert.equal(selectedCommand(ROOT, byName(name), [`${byName(name).package}/test/a.test.ts`]), null, name);
        }
        const lane = {
            shard: "x",
            package: "p",
            "test-command": "cd p && GRAPHTY_GPU_REQUIRE=any pnpm exec vitest run",
        };
        assert.equal(selectedCommand(ROOT, lane, ["p/a.test.ts"]), null);
        const filtered = { shard: "x", package: "p", "test-command": "cd p && pnpm exec vitest run test/layouts" };
        assert.equal(selectedCommand(ROOT, filtered, ["p/a.test.ts"]), null);
        assert.equal(selectedCommand(ROOT, byName("graph-format"), ["layout/test/a.test.ts"]), null);
        assert.equal(selectedCommand(ROOT, byName("graph-format"), []), null);
    });

    it("plans none, files and all, folds the slices of one family into one run, and runs an unreadable one whole", () => {
        const shards = ["graphty-1", "graphty-2", "graphty-3", "layout", "githerd", "webgpu-graph-algorithms-node"].map(
            byName,
        );
        const app = files("graphty/src/a.test.tsx");
        const selection = [
            { shard: "graphty-1", mode: "files", files: app, reasons: [] },
            { shard: "graphty-2", mode: "files", files: app, reasons: [] },
            { shard: "graphty-3", mode: "files", files: app, reasons: [] },
            { shard: "layout", mode: "none", files: [], reasons: [] },
            {
                shard: "webgpu-graph-algorithms-node",
                mode: "files",
                files: files("webgpu-graph-algorithms/test/a.test.ts"),
                reasons: [],
            },
        ];
        const plan = planRuns(ROOT, shards, selection);
        assert.deepEqual(
            plan.map((p) => [p.covers.join("+"), p.mode]),
            [
                ["graphty-1+graphty-2+graphty-3", "files"],
                ["layout", "none"],
                ["githerd", "all"],
                ["webgpu-graph-algorithms-node", "all"],
            ],
        );
        assert.match(plan[2].reasons[0], /no answer/u);
        assert.match(plan[3].reasons[0], /not a plain vitest run/u);
        const text = describePlan(plan).join("\n");
        assert.match(text, /graphty-1, graphty-2, graphty-3: 1 test file/u);
        assert.match(text, /graphty\/src\/a\.test\.tsx {2}<- imports it/u);
        assert.match(text, /githerd: WHOLE SHARD/u);
        assert.match(text, /nothing to run: layout/u);

        const notes = [];
        const run = selectedShards(plan, (l) => notes.push(l));
        assert.deepEqual(
            run.map((s) => s.shard),
            ["graphty-1", "githerd", "webgpu-graph-algorithms-node"],
        );
        assert.deepEqual(run[0].selected, ["graphty/src/a.test.tsx"]);
        assert.deepEqual(run[0].covers, ["graphty-1", "graphty-2", "graphty-3"]);
        assert.equal(run[1], byName("githerd"), "a whole shard keeps its own entry and command");
        assert.match(notes.join("\n"), /\[NONE\] layout/u);
    });

    it("selects by default with a base, never under PREPUSH_ALL=1, PREPUSH_SELECT=0 or for the cut", () => {
        assert.equal(selectionOn({}, "origin/golden"), true, "on by default for landing checks");
        assert.equal(
            selectionOn({ PREPUSH_SELECT_BASE: "origin/golden-cut" }, "origin/master"),
            false,
            "never on the cut",
        );
        assert.equal(selectionOn({ PREPUSH_SELECT_BASE: "origin/golden" }, "origin/master"), true);
        assert.equal(selectionOn({ PREPUSH_SELECT: "1" }, "origin/golden"), true);
        assert.equal(selectionOn({ PREPUSH_SELECT: "1", PREPUSH_ALL: "1" }, "origin/golden"), false);
        assert.equal(selectionOn({ PREPUSH_SELECT: "1" }, ""), false);
        assert.equal(selectionOn({ PREPUSH_SELECT: "0" }, "origin/golden"), false);
    });

    it("keeps a selected pass apart from a whole-shard pass, and a selecting gate apart from a full one", () => {
        const main = mkdtempSync(join(ROOT, "tmp", "passes-"));
        try {
            const store = passStore(main);
            const key = "a".repeat(64);
            store.record("shard-selected", key, { shard: "graph-format", files: ["graph-format/test/a.test.ts"] });
            assert.equal(store.get("shard", key), null);
            assert.equal(store.get("shard-selected", key).shard, "graph-format");
        } finally {
            rmSync(main, { recursive: true, force: true });
        }
        assert.deepEqual(laneEnv({ PREPUSH_SELECT: "1", PATH: "/bin" }), [["PREPUSH_SELECT", "1"]]);
        assert.deepEqual(laneEnv({ PREPUSH_SELECT_BASE: "origin/golden-cut" }), [["PREPUSH_SELECT_BASE", "cut"]]);
        assert.deepEqual(laneEnv({ PREPUSH_SELECT_BASE: "origin/golden" }), []);
    });

    it("counts committed, staged, unstaged and untracked files as the change, not ignored ones", () => {
        const dir = mkdtempSync(join(ROOT, "tmp", "test-changed-"));
        try {
            const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" });
            git("init", "-q", "-b", "main");
            git("config", "user.email", "t@example.com");
            git("config", "user.name", "t");
            git("config", "commit.gpgsign", "false");
            writeFileSync(join(dir, ".gitignore"), "ignored.txt\n");
            writeFileSync(join(dir, "base.txt"), "0");
            writeFileSync(join(dir, "unstaged.txt"), "0");
            git("add", ".");
            git("commit", "-q", "--no-verify", "-m", "base");
            git("branch", "base");
            writeFileSync(join(dir, "committed.txt"), "1");
            git("add", "committed.txt");
            git("commit", "-q", "--no-verify", "-m", "work");
            writeFileSync(join(dir, "staged.txt"), "1");
            git("add", "staged.txt");
            writeFileSync(join(dir, "unstaged.txt"), "1");
            writeFileSync(join(dir, "untracked.txt"), "1");
            writeFileSync(join(dir, "ignored.txt"), "1");
            assert.deepEqual(changedSince(dir, "base"), [
                "committed.txt",
                "staged.txt",
                "unstaged.txt",
                "untracked.txt",
            ]);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe("mutation testing of the selection", () => {
    it("picks the same files for the same seed", () => {
        const items = Array.from({ length: 50 }, (_, i) => `f${i}`);
        assert.deepEqual(seededPick(items, 5, 7), seededPick(items, 5, 7));
        assert.notDeepEqual(seededPick(items, 5, 7), seededPick(items, 5, 8));
        assert.equal(new Set(seededPick(items, 50, 3)).size, 50);
    });

    it("breaks code with a top-level throw and empties data", () => {
        assert.match(
            mutant("p/src/a.ts", "export const a = 1;"),
            /^export const a = 1;\nthrow new Error\("select-mutant"\);/u,
        );
        assert.equal(mutant("p/data/x.json", '{"a":1}'), "{}\n");
        assert.equal(mutant("p/data/x.csv", "a,b"), "");
    });

    it("checks each failing test against the broken files that did not select it, grouped", () => {
        const chosen = (m) => ({ "x.ts": new Set(["t/a", "t/b"]), "y.ts": new Set(["t/c"]), "z.ts": null })[m];
        assert.deepEqual(unexplained(["t/a", "t/c", "t/d"], ["x.ts", "y.ts"], chosen), [
            { non: ["y.ts"], files: ["t/a"] },
            { non: ["x.ts"], files: ["t/c"] },
            { non: ["x.ts", "y.ts"], files: ["t/d"] },
        ]);
        assert.deepEqual(unexplained(["t/d"], ["z.ts"], chosen), [], "a whole-shard selection explains anything");
    });

    it("--stories: maps story ids to their files and finds the changed stories a selection did not run", () => {
        const index = {
            entries: {
                "a--one": { type: "story", id: "a--one", importPath: "./stories/A.stories.ts" },
                "a--docs": { type: "docs", id: "a--docs", importPath: "./stories/A.mdx" },
                "b--two": { type: "story", id: "b--two", importPath: "./stories/B.stories.ts" },
            },
        };
        const files = storyFiles(index, "layout");
        assert.deepEqual(
            [...files],
            [
                ["a--one", "layout/stories/A.stories.ts"],
                ["b--two", "layout/stories/B.stories.ts"],
            ],
        );
        const of = (id) => files.get(id);
        const sel = (mode, f = [], baselines = []) => ({ mode, files: f, baselines });
        assert.deepEqual(storiesMissed(["a--one", "b--two"], sel("all"), of), []);
        assert.deepEqual(storiesMissed(["a--one", "b--two"], sel("none"), of), ["a--one", "b--two"]);
        assert.deepEqual(storiesMissed(["a--one", "b--two"], sel("files", ["layout/stories/A.stories.ts"]), of), [
            "b--two",
        ]);
        assert.deepEqual(storiesMissed(["b--two"], sel("none", [], ["b--two"]), of), [], "a changed baseline runs");
    });

    it("--stories: breaks the package's source and story files and its workspace dependencies' source", () => {
        const files = storyCandidates(ROOT, "layout");
        const has = (re) => files.some((f) => re.test(f));
        assert.ok(has(/^layout\/src\//u), "the package's source");
        assert.ok(has(/^layout\/stories\/.+\.stories\.ts$/u), "its story files");
        assert.ok(has(/^graph-samples\/src\//u) && has(/^graph-format\/src\//u), "its dependencies' source");
        assert.ok(!has(/\/(test|\.storybook)\//u), "never a test or the Storybook setup");
        assert.ok(!has(/^layout\/[^/]+$/u), "never a root file of the package (package.json, tsconfig)");
        assert.ok(!has(/^graph-samples\/(?!src\/)/u), "only a dependency's source");
    });

    it("--stories: follows dependencies through other packages and adds the packages that draw the project", () => {
        const app = storyCandidates(ROOT, "graphty");
        assert.ok(
            app.some((f) => f.startsWith("algorithms/src/")) && app.some((f) => f.startsWith("layout/src/")),
            "graphty-element's dependencies",
        );
        const fidelity = storyCandidates(ROOT, "graph-io", ["graph-io", "graphty-element"]);
        const test = (f) => /\.(test|spec)\./u.test(f);
        assert.ok(!app.some(test) && !fidelity.some(test), "never a test file under stories/");
        assert.ok(
            fidelity.some((f) => f.startsWith("graphty-element/src/")),
            "a drawnBy package's source",
        );
        // the fidelity stories draw with test-side helpers and corpus files: breaking them must count too
        assert.ok(fidelity.includes("graph-io/fidelity-stories/stories/fidelity.ts"), "the shared story helper");
        assert.ok(
            fidelity.some((f) => f.startsWith("graphty-element/test/fidelity/")),
            "a test-side helper a story imports",
        );
        assert.ok(
            fidelity.some((f) => /^graph-io\/test\/corpus\/.+\.cx2$/u.test(f)),
            "a corpus file a story imports with ?url",
        );
        assert.ok(fidelity.includes("graphty-element/index.ts"), "a bare side-effect import");
        assert.ok(!fidelity.some((f) => f.includes("/.storybook/")), "never the Storybook setup");
        assert.equal(new Set(fidelity).size, fidelity.length, "each file once");
    });

    it("gives runs with different names their own worktree and report", () => {
        const a = runPaths("/r", "graph-io", null);
        const b = runPaths("/r", "layout", null);
        assert.deepEqual(a, {
            worktree: "/r/.worktrees/select-mutate-graph-io",
            report: "/r/tmp/select-mutate/graph-io/report.txt",
        });
        assert.notEqual(a.worktree, b.worktree);
        assert.notEqual(a.report, b.report);
        assert.deepEqual(runPaths("/r", null, null), {
            worktree: "/r/.worktrees/select-mutate",
            report: "/r/tmp/select-mutate/default/report.txt",
        });
        assert.equal(runPaths("/r", "x", "mine").worktree, "/r/.worktrees/mine");
        // the worktree is reset and cleaned, so a name must not reach outside .worktrees
        assert.throws(() => runPaths("/r", "/../..", null), /--name/);
        assert.throws(() => runPaths("/r", "..", null), /--name/);
        assert.throws(() => runPaths("/r", null, "a/b"), /--worktree/);
    });
});

// Each case below is a miss the adversarial mutation run of 2026-10-22 found (issue #3276): a change that
// broke a test the selection did not run.
describe("misses found by mutation testing", () => {
    const real = loadRules(ROOT);
    const empty = (dir) => [{ package: dir, config: null, projects: {}, imports: {}, opaque: [] }];
    const pkgs = (...dirs) => new Map(dirs.map((d) => [d, d]));
    const run = (changed, dirs, extra = {}) =>
        selectPackages({
            changed,
            packages: pkgs(...dirs),
            deps: new Map(dirs.map((d) => [d, new Set()])),
            refs: new Map(),
            graphs: new Map(dirs.map((d) => [d, empty(d)])),
            rules: real,
            ...extra,
        });

    it("a root file imported by an everything file runs everything (tools/wait-log.mjs via test-slots.mjs)", () => {
        const g = rootImportGraph(ROOT, ["graph-format", "graph-io", "graphty-element", "graphty", "visual-review"]);
        assert.ok(g.get("tools/wait-log.mjs")?.includes("tools/test-slots.mjs"), "the root import graph has the edge");
        const sel = run(["tools/wait-log.mjs"], ["graph-format"], { rootImporters: g });
        assert.match(sel.everything, /tools\/wait-log\.mjs \(through tools\/test-slots\.mjs\)/u);
    });

    it("the root .prettierrc runs the packages whose reference pages are formatted with it", () => {
        const sel = run([".prettierrc"], ["graph-io", "cytoscape-extensions", "layout"]).packages;
        assert.equal(sel.get("graph-io").mode, "all");
        assert.equal(sel.get("cytoscape-extensions").mode, "all");
        assert.equal(sel.get("layout").mode, "none");
    });

    it("counts a test that runs a program through promisify(execFile), runs ESLint or fetches as one that reads files", () => {
        for (const text of [
            "await promisify(execFile)(process.execPath, [script])",
            'import { execFile } from "node:child_process";',
            "const eslint = new ESLint({ cwd });",
            "await fetch(`${BASE_URL}samples/karate.gml`)",
        ]) {
            assert.ok(real.opaque.test(text), text);
        }
    });

    it("a deleted or renamed file runs its whole package, whatever its kind", () => {
        const sel = run(["graph-format/test/wire/sample-count.json"], ["graph-format"], {
            deleted: new Set(["graph-format/test/wire/sample-count.json"]),
        }).packages.get("graph-format");
        assert.equal(sel.mode, "all");
        assert.match(sel.reasons[0], /deleted or renamed/u);
    });

    it("a design/ file a test imports runs that test, although design/ is a noTests path", () => {
        const g = {
            package: "graphty",
            config: null,
            projects: { app: { specs: ["graphty/src/a.test.tsx", "graphty/src/b.test.tsx"], setup: [] } },
            imports: {
                "graphty/src/a.test.tsx": ["design/ui/studio/tool/files/friends.csv"],
                "graphty/src/b.test.tsx": [],
                "design/ui/studio/tool/files/friends.csv": [],
            },
            opaque: [],
        };
        const sel = run(["design/ui/studio/tool/files/friends.csv"], ["graphty"], {
            graphs: new Map([["graphty", [g]]]),
        }).packages.get("graphty");
        assert.deepEqual([...sel.specs.keys()], ["graphty/src/a.test.tsx"]);
    });

    it("a design/ file a test names in a string runs that test (graph-io's style defaults record)", () => {
        const g = {
            ...empty("graph-io")[0],
            projects: { unit: { specs: ["graph-io/test/styles/core.test.ts"], setup: [] } },
            imports: { "graph-io/test/styles/core.test.ts": [] },
        };
        const sel = run(["design/graph-io/style-tool-defaults.md"], ["graph-io"], {
            graphs: new Map([["graph-io", [g]]]),
        }).packages.get("graph-io");
        assert.equal(sel.mode, "files");
        assert.deepEqual([...sel.specs.keys()], ["graph-io/test/styles/core.test.ts"]);
        assert.ok(
            [...run(["design/graph-io/other-notes.md"], ["graph-io"]).packages.values()].every(
                (p) => p.mode === "none",
            ),
        );
    });

    it("a rule ESLint loads at run time runs the package whose eslint.config imports it", () => {
        const sel = run(["tools/eslint-rules/story-wait-options.mjs"], ["graphty", "layout"]).packages;
        assert.equal(sel.get("graphty").mode, "all");
        assert.equal(sel.get("layout").mode, "none");
    });

    it("a root file no rule, import or test accounts for runs everything; unread tools code runs nothing", () => {
        assert.match(run(["brand-new.config.json"], ["layout"]).everything, /brand-new\.config\.json/u);
        const tool = run(["tools/nobody-reads-this-xyz.mjs"], ["layout"]);
        assert.equal(tool.everything, null);
        assert.deepEqual(tool.unexplainedRoot, ["tools/nobody-reads-this-xyz.mjs"]);
    });

    it("a file Vite serves from public/ runs its whole package", () => {
        assert.ok(wholePackageRule("public/samples/karate.gml", real));
    });

    it("does not reuse a cached graph once a file outside the package that it reaches changed", () => {
        const dir = mkdtempSync(join(ROOT, "tmp", "outside-"));
        try {
            mkdirSync(join(dir, "tools"));
            writeFileSync(join(dir, "tools/helper.mjs"), "export const MARKER = 1;\n");
            const g = { imports: { "pkg/test/a.test.ts": ["tools/helper.mjs"], "tools/helper.mjs": [] } };
            const outside = outsideOf(dir, "pkg", g);
            assert.deepEqual(Object.keys(outside), ["tools/helper.mjs"]);
            assert.ok(sameOutside(dir, outside));
            writeFileSync(join(dir, "tools/helper.mjs"), "export const MARKER = 2;\n");
            assert.ok(!sameOutside(dir, outside));
            assert.ok(!sameOutside(dir, undefined), "a graph from before the check is walked again");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("test:changed asks about graphty-element's browser shards, which the gate's path policy used to drop", () => {
        const names = candidateShards().map((s) => s.shard);
        assert.ok(names.includes("graphty-element-browser-1") && names.includes("graphty-element-storybook-5"));
        assert.ok(!names.includes("graphty-element-lifecycle"));
    });

    it("does not count a benchmark as a build input", () => {
        assert.ok(!buildInput("benchmarks/harness.ts"));
    });
});

describe("changes to another package's build, followed through its source", () => {
    const pkgs = new Map([
        ["pa", "pa"],
        ["pz", "pz"],
        ["pb", "pb"],
    ]);
    // pz (a dataset package) depends on pa; pb depends on both
    const deps = new Map([
        ["pa", new Set()],
        ["pz", new Set(["pa"])],
        ["pb", new Set(["pa", "pz"])],
    ]);
    const pb = {
        package: "pb",
        config: null,
        projects: {
            unit: {
                specs: ["pb/test/one.test.ts", "pb/test/two.test.ts", "pb/test/data.test.ts", "pb/test/read.test.ts"],
                setup: [],
                browser: false,
            },
            "storybook (chromium)": { specs: ["pb/stories/a.stories.ts"], setup: ["pb/.storybook/vitest.setup.ts"] },
        },
        imports: {
            // pa's build outputs, walked as the source they are built from
            "pb/test/one.test.ts": ["pa/src/one.ts"],
            "pa/src/one.ts": ["pa/src/shared.ts"],
            "pa/src/shared.ts": [],
            "pb/test/two.test.ts": ["pa/src/two.ts"],
            "pa/src/two.ts": [],
            // a file pz's build writes, whose source is unknown
            "pb/test/data.test.ts": ["pz/dist/data/x.gz"],
            "pz/dist/data/x.gz": [],
            "pb/test/read.test.ts": [],
            "pb/stories/a.stories.ts": [],
            "pb/.storybook/vitest.setup.ts": [],
        },
        aliased: ["pa/src/one.ts", "pa/src/shared.ts", "pa/src/two.ts"],
        opaque: ["pb/test/read.test.ts"],
    };
    const empty = (dir) => [{ package: dir, config: null, projects: {}, imports: {}, opaque: [] }];
    const graphs = new Map([
        ["pa", empty("pa")],
        ["pz", empty("pz")],
        ["pb", [pb]],
    ]);
    const run = (changed, refs = new Map()) =>
        selectPackages({ changed, packages: pkgs, deps, refs, graphs, rules }).packages.get("pb");
    const specs = (p) => [...p.specs.keys()].sort();

    it("runs the tests whose imports reach the changed source, and the tests that read files", () => {
        const p = run(["pa/src/two.ts"]);
        assert.equal(p.mode, "files");
        // data.test.ts loads a file pz builds, and pz depends on pa
        assert.deepEqual(specs(p), ["pb/test/data.test.ts", "pb/test/read.test.ts", "pb/test/two.test.ts"]);
        assert.ok(!p.specs.has("pb/test/one.test.ts"));
    });

    it("runs the tests that load a build output of a package that holds the change", () => {
        assert.deepEqual(specs(run(["pa/src/shared.ts"])), [
            "pb/test/data.test.ts",
            "pb/test/one.test.ts",
            "pb/test/read.test.ts",
        ]);
    });

    it("a source file no test reaches runs only the tests that read files; a build file runs the package", () => {
        assert.deepEqual(specs(run(["pa/src/unused.ts"])), ["pb/test/data.test.ts", "pb/test/read.test.ts"]);
        assert.equal(run(["pa/tsconfig.build.json"]).mode, "all");
        assert.match(run(["pa/tsconfig.build.json"]).reasons[0], /is in no test's import graph/u);
    });

    it("a build output read by the Storybook setup runs only the projects that run the Storybook", () => {
        const refs = new Map([["pb", [{ target: "pz", prefix: "pz/", holder: "pb/.storybook/main.ts", build: true }]]]);
        const p = run(["pz/src/meta.ts"], refs);
        assert.equal(p.mode, "files");
        assert.ok(p.specs.has("pb/stories/a.stories.ts"), specs(p).join(" "));
        assert.ok(!p.specs.has("pb/test/one.test.ts"));
    });

    it("a path the ESLint config names is not read into the package's build", () => {
        const deps2 = new Map([...deps, ["pd", new Set(["pb"])]]);
        const refs = new Map([["pb", [{ target: "pa", prefix: "pa", holder: "pb/eslint.config.js", build: false }]]]);
        const sel = selectPackages({
            changed: ["pa/src/two.ts"],
            packages: new Map([...pkgs, ["pd", "pd"]]),
            deps: deps2,
            refs,
            graphs: new Map([...graphs, ["pd", empty("pd")]]),
            rules,
        }).packages;
        assert.equal(sel.get("pd").mode, "none", "pb's build did not change, and pd's tests reach nothing of pa");
        assert.ok(sel.get("pb").specs.has("pb/test/two.test.ts"));
    });

    it("a build output read by the ESLint config runs only the tests that read files (those that run ESLint)", () => {
        const refs = new Map([["pb", [{ target: "pz", prefix: "pz/", holder: "pb/eslint.config.js", build: true }]]]);
        const p = run(["pz/src/meta.ts"], refs);
        assert.equal(p.mode, "files");
        assert.deepEqual(specs(p), ["pb/test/data.test.ts", "pb/test/read.test.ts"]);
    });

    it("finds the source of a build output from its source map, its type shim or the build's one entry", () => {
        const fixture = mkdtempSync(join(ROOT, "tmp", "test-select-sources-"));
        const put = (path, text) => {
            mkdirSync(dirname(join(fixture, path)), { recursive: true });
            writeFileSync(join(fixture, path), text);
        };
        try {
            put("pq/package.json", JSON.stringify({ exports: { ".": { import: "./dist/index.js" } } }));
            put("pq/vite.config.ts", 'export default { build: { lib: { entry: "src/main.ts" } } };');
            for (const f of ["src/main.ts", "src/one.ts", "src/formats/dot/index.ts"]) {
                put(`pq/${f}`, "export {};");
            }
            put("pq/dist/index.js", "");
            put("pq/dist/src/one.js", "");
            put("pq/dist/src/one.js.map", JSON.stringify({ sources: ["../../src/one.ts"] }));
            put("pq/dist/dot.js", "");
            put("pq/dist/dot.d.ts", '// shim\nexport * from "./src/formats/dot/index.js";\n');
            put("pq/dist/chunks/big.js", "");
            put("pq/dist/chunks/big.js.map", JSON.stringify({ sources: ["../../src/one.ts", "../../src/main.ts"] }));
            const of = (f) => sourceOf(fixture, join(fixture, f))?.slice(fixture.length + 1) ?? null;
            assert.equal(of("pq/dist/src/one.js"), "pq/src/one.ts");
            assert.equal(of("pq/dist/dot.js"), "pq/src/formats/dot/index.ts");
            assert.equal(of("pq/dist/index.js"), "pq/src/main.ts");
            assert.equal(of("pq/dist/chunks/big.js"), null, "a bundle of many modules stays a build output");
            assert.equal(of("pq/src/one.ts"), null);
        } finally {
            rmSync(fixture, { recursive: true, force: true });
        }
    });
});

describe("reads of another package's files, path by path", () => {
    const pkgs = new Map([
        ["pa", "pa"],
        ["pc", "pc"],
        ["pd", "pd"],
    ]);
    const deps = new Map([
        ["pa", new Set()],
        ["pc", new Set()],
        ["pd", new Set(["pc"])],
    ]);
    // pc: t1 names pa's corpus by path; t2 imports pa's test helper; t3 reads nothing of pa; src/gen.ts (a build
    // input) names pa's template
    const pc = {
        package: "pc",
        config: null,
        projects: { unit: { specs: ["pc/test/t1.test.ts", "pc/test/t2.test.ts", "pc/test/t3.test.ts"], setup: [] } },
        imports: {
            "pc/test/t1.test.ts": [],
            "pc/test/t2.test.ts": ["pa/test/helper.ts"],
            "pa/test/helper.ts": [],
            "pc/test/t3.test.ts": ["pc/src/gen.ts"],
            "pc/src/gen.ts": [],
        },
        opaque: ["pc/test/t1.test.ts"],
    };
    const empty = (dir) => [{ package: dir, config: null, projects: {}, imports: {}, opaque: [] }];
    const graphs = new Map([
        ["pa", empty("pa")],
        ["pc", [pc]],
        ["pd", empty("pd")],
    ]);
    const ref = (prefix, holder, build = false) => ({ target: "pa", prefix, holder, build });
    const run = (changed, list) =>
        selectPackages({
            changed,
            packages: pkgs,
            deps,
            refs: new Map([["pc", list]]),
            graphs,
            rules,
        }).packages;
    const specs = (sel, dir) => [...sel.get(dir).specs.keys()].sort();

    it("runs only the tests that name the changed path, and nothing for a file outside every named path", () => {
        const list = [ref("pa/test/corpus", "pc/test/t1.test.ts")];
        const sel = run(["pa/test/corpus/k.json"], list);
        assert.equal(sel.get("pc").mode, "files");
        assert.deepEqual(specs(sel, "pc"), ["pc/test/t1.test.ts"]);
        assert.equal(run(["pa/test/other.test.ts"], list).get("pc").mode, "none");
    });

    it("runs the tests that import a changed file of another package", () => {
        const sel = run(["pa/test/helper.ts"], []);
        assert.deepEqual(specs(sel, "pc"), ["pc/test/t2.test.ts"]);
    });

    it("runs the whole package when the path is named by a config file, or nothing says which file reads it", () => {
        assert.equal(
            run(["pa/test/corpus/k.json"], [ref("pa/test/corpus", "pc/vitest.config.ts")]).get("pc").mode,
            "all",
        );
        assert.equal(run(["pa/test/x.ts"], [ref("pa/", null)]).get("pc").mode, "all");
    });

    it("reads a build output only when the other package's build changed", () => {
        const list = [ref("pa/", "pc/test/t1.test.ts", true)];
        assert.equal(run(["pa/test/x.test.ts"], list).get("pc").mode, "none", "a test-only change builds nothing");
        assert.deepEqual(specs(run(["pa/src/x.ts"], list), "pc"), ["pc/test/t1.test.ts"]);
    });

    it("a read that goes into the reader's build runs what depends on the reader whole", () => {
        const sel = run(["pa/templates/page.html"], [ref("pa/templates", "pc/src/gen.ts")]);
        assert.deepEqual(specs(sel, "pc"), ["pc/test/t3.test.ts"]);
        assert.equal(sel.get("pd").mode, "all");
        assert.match(sel.get("pd").reasons[0], /depends on pc/u);
        assert.equal(
            run(["pa/test/corpus/k.json"], [ref("pa/test/corpus", "pc/test/t1.test.ts")]).get("pd").mode,
            "none",
        );
    });

    it("names paths split into arguments, a sibling package from its root, and skips a Vite alias replacement", () => {
        const fixture = mkdtempSync(join(ROOT, "tmp", "test-select-literals-"));
        const put = (path, text) => {
            mkdirSync(dirname(join(fixture, path)), { recursive: true });
            writeFileSync(join(fixture, path), text);
        };
        try {
            put("pa/test/corpus/k.json", "{}");
            put("pa/test/conformance/fixtures/x.gml", "");
            put("pa/scripts/gen.mjs", 'import "./lib.mjs";\n');
            put("pa/scripts/lib.mjs", 'readFileSync("../../pd/data/big.txt");\n');
            put("pd/data/big.txt", "");
            put(
                "pc/test/t.test.ts",
                [
                    'const A = join(__dirname, "..", "..", "pa", "test", "conformance", "fixtures");',
                    'const B = resolve(pkgRoot, "..", "pa", "test", "corpus");',
                    'const C = { replacement: resolve(__dirname, "../../pa/$1.ts") };',
                    'execFileSync("node", ["../../pa/scripts/gen.mjs"]);',
                    "// see ../../pa/test/corpus/k.json.",
                ].join("\n"),
            );
            const index = { files: new Set(), has: (p) => existsSync(join(fixture, p)) };
            const { paths, runs } = literalPaths(fixture, "pc/test/t.test.ts", index);
            assert.ok(paths.has("pa/test/conformance/fixtures"), [...paths].join(" "));
            assert.ok(paths.has("pa/test/corpus"));
            assert.ok(paths.has("pa/test/corpus/k.json"), "a trailing full stop is not part of the path");
            assert.ok(![...paths].some((p) => p === "pa" || p === "pa/"), "the alias replacement names nothing");
            assert.deepEqual([...runs], ["pa/scripts/gen.mjs"]);

            const roots = new Map([
                ["pa", "pa"],
                ["pc", "pc"],
                ["pd", "pd"],
            ]);
            const g = { package: "pc", config: null, projects: {}, imports: { "pc/test/t.test.ts": [] }, opaque: [] };
            const refs = testRefs(fixture, roots, new Map([["pc", [g]]]), new Map());
            assert.ok(
                refs
                    .get("pc")
                    .some((r) => r.target === "pd" && r.prefix === "pd/data/big" && r.holder === "pc/test/t.test.ts"),
                "what a script the test runs reads (through its imports) is read by the test",
            );
        } finally {
            rmSync(fixture, { recursive: true, force: true });
        }
    });
});

describe("visual-review files only the story setups load", () => {
    const pkgs = ["visual-review", "algorithms", "layout", "graphty", "graphty-element"];
    const real = new Map(pkgs.map((d) => [d, d]));
    const deps = new Map(pkgs.map((d) => [d, new Set(d === "visual-review" ? [] : ["visual-review"])]));
    const noGraphs = new Map(pkgs.map((d) => [d, []]));
    const run = (changed) => {
        const sel = selectPackages({
            changed,
            packages: real,
            deps,
            refs: new Map(),
            graphs: noGraphs,
            rules: loadRules(ROOT),
        });
        const shards = SHARDS.filter((s) => real.has(s.package));
        return selectShards(shards, sel.packages, noGraphs, undefined, undefined, sel.smoke)
            .filter((s) => s.mode !== "none")
            .map((s) => s.shard);
    };

    it("a story-test-setup.mjs change runs only visual-review and the shards that run the story setup", () => {
        const picked = run(["visual-review/capture/story-test-setup.mjs"]);
        const story = SHARDS.filter((s) => /^graphty(-element)?-storybook/u.test(s.shard)).map((s) => s.shard);
        const own = SHARDS.filter((s) => s.package === "visual-review").map((s) => s.shard);
        // algorithms-browser and layout gate ci.yml's story-tests job for those two projects
        assert.deepEqual([...picked].sort(), [...own, ...story, "algorithms-browser", "layout"].sort());
        assert.ok(story.length === 6, story.join(", "));
    });

    it("a change to visual-review's other code still runs every dependent's shards", () => {
        for (const f of ["visual-review/trusted/cli.mjs", "visual-review/capture/story-test.mjs"]) {
            const picked = run([f]);
            for (const sh of ["algorithms-default", "layout", "graphty-1", "graphty-element-browser-1"]) {
                assert.ok(picked.includes(sh), `${f}: ${sh} in ${picked.join(", ")}`);
            }
        }
    });
});

describe("workflow and lockfile changes (design/ci/channels-pipeline/merging.md section 4.3)", () => {
    const real = new Map([
        ["graph-format", "graph-format"],
        ["graph-io", "graph-io"],
        ["algorithms", "algorithms"],
        ["layout", "layout"],
    ]);
    const realDeps = new Map([
        ["graph-format", new Set()],
        ["graph-io", new Set(["graph-format"])],
        ["algorithms", new Set(["graph-format"])],
        ["layout", new Set(["graph-format"])],
    ]);
    const noGraphs = new Map([...real.values()].map((d) => [d, []]));
    const run = (changed, lockfile) => {
        const sel = selectPackages({
            changed,
            packages: real,
            deps: realDeps,
            refs: new Map(),
            graphs: noGraphs,
            rules: loadRules(ROOT),
            lockfile,
        });
        const shards = SHARDS.filter((s) => real.has(s.package));
        const picked = selectShards(shards, sel.packages, noGraphs, undefined, undefined, sel.smoke);
        return { everything: sel.everything, shards: picked.filter((s) => s.mode !== "none").map((s) => s.shard) };
    };

    it("a ci.yml change runs only the smoke shards, and another workflow none", () => {
        assert.deepEqual(run([".github/workflows/ci.yml"]), {
            everything: null,
            shards: ["graph-format", "algorithms-browser"],
        });
        assert.deepEqual(run([".github/actions/early-verdict/action.yml"]).shards, [
            "graph-format",
            "algorithms-browser",
        ]);
        assert.deepEqual(run([".github/workflows/release.yml", ".github/dependabot.yml"]), {
            everything: null,
            shards: [],
        });
    });

    it("a lockfile change runs the packages whose importers changed and their dependents", () => {
        assert.deepEqual(run(["pnpm-lock.yaml"], ["layout"]), { everything: null, shards: ["layout"] });
        const fmt = run(["pnpm-lock.yaml"], ["graph-format"]).shards;
        for (const sh of ["graph-format", "graph-io", "algorithms-default", "layout"]) {
            assert.ok(fmt.includes(sh), `${sh} in ${fmt.join(", ")}`);
        }
        assert.equal(run(["pnpm-lock.yaml"], ["."]).everything, "package.json", "the root importer runs everything");
        assert.equal(run(["pnpm-lock.yaml"], null).everything, "pnpm-lock.yaml", "unknown importers run everything");
        assert.equal(run(["pnpm-lock.yaml"]).everything, "pnpm-lock.yaml");
    });

    it("withLockfile puts the lockfile on the changed importers' package.json", () => {
        assert.deepEqual(withLockfile(["pnpm-lock.yaml", "a.md"], ["layout", "."]), [
            "a.md",
            "layout/package.json",
            "package.json",
        ]);
        assert.deepEqual(withLockfile(["pnpm-lock.yaml"], null), ["pnpm-lock.yaml"]);
        assert.deepEqual(withLockfile(["a.md"], ["layout"]), ["a.md"]);
    });

    it("changedImporters reads which importers changed, and null when it cannot tell", () => {
        const lock = (fmtVer, extra = "") =>
            [
                "lockfileVersion: '9.0'",
                "",
                `settings:${extra}`,
                "  autoInstallPeers: true",
                "",
                "importers:",
                "",
                "  .:",
                "    devDependencies:",
                "      vitest: 4.0.0",
                "",
                "  graph-format:",
                "    devDependencies:",
                `      tsx: ${fmtVer}`,
                "",
                "  layout:",
                "    devDependencies:",
                "      tsx: 1.0.0",
                "",
                "packages:",
                "",
                `  tsx@${fmtVer}:`,
                "    resolution: {}",
                "",
            ].join("\n");
        assert.deepEqual(changedImporters(lock("1.0.0"), lock("1.1.0")), ["graph-format"]);
        assert.deepEqual(changedImporters(lock("1.0.0"), lock("1.0.0")), []);
        assert.equal(changedImporters(lock("1.0.0"), lock("1.0.0", " # x")), null, "settings change every package");
        assert.equal(changedImporters(lock("1.0.0"), lock("1.0.0").replace("resolution: {}", "resolution: {x}")), null);
        assert.equal(changedImporters(null, lock("1.0.0")), null);
        // graph-format's bump also re-resolved a package layout installs too: layout's own block is unchanged,
        // but what it installs is not, so the change cannot be put on graph-format alone
        const withShared = (fmtVer, sharedDep) =>
            `${lock(fmtVer)}\nsnapshots:\n\n  shared@1.0.0:\n    dependencies:\n      dep: ${sharedDep}\n`;
        assert.deepEqual(changedImporters(withShared("1.0.0", "1.0.0"), withShared("1.1.0", "1.0.0")), [
            "graph-format",
        ]);
        assert.equal(changedImporters(withShared("1.0.0", "1.0.0"), withShared("1.1.0", "1.1.0")), null);
    });
});

describe("packBins", () => {
    const MIN = 60_000;
    const ms = new Map([
        ["p/a.test.ts", 5 * MIN],
        ["p/b.test.ts", 4 * MIN],
        ["p/c.test.ts", 3 * MIN],
        ["p/d.test.ts", 1 * MIN],
    ]);

    it("packs the longest files first into bins of at most 8 minutes", () => {
        const bins = packBins(["p/d.test.ts", "p/c.test.ts", "p/b.test.ts", "p/a.test.ts"], ms, BIN_LIMIT_MS, 0);
        assert.deepEqual(bins, [
            { files: ["p/a.test.ts", "p/c.test.ts"], ms: 8 * MIN },
            { files: ["p/b.test.ts", "p/d.test.ts"], ms: 5 * MIN },
        ]);
    });

    it("counts a file with no recorded time as the family's longest", () => {
        const bins = packBins(["p/new.test.ts", "p/d.test.ts"], ms, BIN_LIMIT_MS, 0);
        assert.deepEqual(bins, [{ files: ["p/d.test.ts", "p/new.test.ts"], ms: 6 * MIN }]);
    });

    it("gives a file over the limit a bin of its own, and a family with no history 30 s a file", () => {
        assert.deepEqual(
            packBins(["p/x.test.ts", "p/y.test.ts"], new Map([["p/x.test.ts", 9 * MIN]]), BIN_LIMIT_MS, 0),
            [
                { files: ["p/x.test.ts"], ms: 9 * MIN },
                { files: ["p/y.test.ts"], ms: 9 * MIN },
            ],
        );
        assert.deepEqual(packBins(["p/x.test.ts", "p/x.test.ts"], new Map(), BIN_LIMIT_MS, 0), [
            { files: ["p/x.test.ts"], ms: 30_000 },
        ]);
        assert.deepEqual(packBins([], ms), []);
    });

    it("counts Vitest's per-file setup and import, so many short files are split (#3645)", () => {
        const files = Array.from({ length: 300 }, (_, i) => `p/f${i}.test.ts`);
        const short = new Map(files.map((f) => [f, 300]));
        const bins = packBins(files, short);
        assert.ok(bins.length > 1);
        for (const b of bins) {
            assert.ok(b.ms <= BIN_LIMIT_MS);
            assert.equal(b.ms, b.files.length * (300 + FILE_OVERHEAD_MS));
        }
        assert.equal(bins.flatMap((b) => b.files).length, 300);
    });
});

describe("light-check-replay", () => {
    const MIN = 60_000;
    const fileLevel = new Set(["graphty-element", "graphty"]);
    const sel = (shard, pkg, mode, files = [], extra = {}) => ({
        shard,
        package: pkg,
        mode,
        total: extra.total ?? files.length,
        files: files.map((file) => ({ file })),
        reasons: extra.reasons ?? [],
    });
    const durations = new Map([
        [
            "graphty",
            new Map([
                ["graphty/a.test.ts", 6 * MIN],
                ["graphty/b.test.ts", 3 * MIN],
            ]),
        ],
        ["graph-io", new Map([["graph-io/x.test.ts", 2 * MIN]])],
    ]);

    it("merges a family's slices and runs its longest bin after the setup", () => {
        const record = {
            at: "2026-10-23T00:00:00Z",
            selection: [
                sel("graphty-1", "graphty", "files", ["graphty/a.test.ts"]),
                sel("graphty-2", "graphty", "files", ["graphty/a.test.ts", "graphty/b.test.ts"]),
                sel("graph-format", "graph-format", "none"),
            ],
        };
        const r = replayRecord(record, durations, fileLevel);
        assert.deepEqual(r, {
            key: "run:ci.yml:pr",
            at: record.at,
            bins: 2,
            testMs: 6 * MIN + FILE_OVERHEAD_MS,
            runMs: SETUP_MS + 6 * MIN + FILE_OVERHEAD_MS,
            overLimit: false,
        });
    });

    it("runs a whole family with its unrecorded files at the family's longest", () => {
        const record = { selection: [sel("graph-io", "graph-io", "all", [], { total: 5 })] };
        const r = replayRecord(record, durations, fileLevel);
        assert.equal(r.key, "run:ci.yml:pr-graph-io", "a package off fileLevel has its own key");
        assert.equal(r.bins, 2, "five 2-minute files plus their overhead make bins of three and two files");
        assert.equal(r.testMs, 6 * MIN + 3 * FILE_OVERHEAD_MS);
    });

    it("keys a global input or a graphty-element build change as pr-wide", () => {
        assert.equal(keyOf({ everything: "package.json", selection: [] }, [], fileLevel), "run:ci.yml:pr-wide");
        const dependent = sel("graphty-1", "graphty", "all", [], {
            reasons: ["depends on graphty-element, whose build changed"],
        });
        assert.equal(keyOf({ selection: [dependent] }, [], fileLevel), "run:ci.yml:pr-wide");
        const byFile = sel("graphty-1", "graphty", "files", []);
        byFile.files = [
            { file: "graphty/src/App.test.tsx", why: "imports graphty-element/src/a.ts, from graphty-element's build" },
        ];
        assert.equal(
            keyOf({ selection: [byFile] }, [], fileLevel),
            "run:ci.yml:pr-wide",
            "a dependent selected file by file",
        );
        const own = sel("graphty-element-1", "graphty-element", "files", []);
        own.files = [{ file: "graphty-element/test/a.test.ts", why: "imports graphty-element/src/a.ts" }];
        assert.equal(keyOf({ selection: [own] }, [], fileLevel), "run:ci.yml:pr", "graphty-element's own tests alone");
        const longest = [
            { package: "graphty", ms: 9 },
            { package: "layout", ms: 3 },
        ];
        assert.equal(keyOf({ selection: [] }, longest, fileLevel), "run:ci.yml:pr-layout");
    });

    it("summarizes p50 and p90 per key and writes them as budgets", () => {
        assert.equal(percentile([5, 1, 4, 2, 3], 0.5), 3);
        assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9), 9);
        assert.equal(percentile([], 0.9), 0);
        const row = (runMs, at) => ({ key: "run:ci.yml:pr", at, bins: 2, runMs, overLimit: false });
        const table = summarize([row(10 * MIN, "2026-10-22T01:00:00Z"), row(12.5 * MIN, "2026-10-23T01:00:00Z")]);
        assert.deepEqual(table, [
            {
                key: "run:ci.yml:pr",
                n: 2,
                p50: 10,
                p90: 12.5,
                bins50: 2,
                bins90: 2,
                overLimit: 0,
                from: "2026-10-22",
                to: "2026-10-23",
            },
        ]);
        const before = { version: 1, budgets: { "run:ci.yml:pr": { minutes: 20, owner: "pipeline" } } };
        const after = applyBudgets(before, table);
        assert.equal(before.budgets["run:ci.yml:pr"].minutes, 20, "the input is not changed");
        assert.deepEqual(after.budgets["run:ci.yml:pr"], {
            minutes: 13,
            owner: "pipeline",
            why: "light-check replay of 2 advisory records (2026-10-22 to 2026-10-23): p50 10 min, p90 12.5 min; table on #3418",
        });
    });
});

describe("the light check's plan (design/ci/channels-pipeline/merging.md section 4.1)", () => {
    const MIN = 60_000;
    const byName = (name) => SHARDS.find((s) => s.shard === name);
    const sel = (shard, mode, files = []) => ({ shard, mode, files: files.map((file) => ({ file })), reasons: [] });
    const many = (n) => Array.from({ length: n }, (_, i) => `graphty/src/t${i}.test.tsx`);

    it("packs a one-package change into bins of at most 8 minutes, one vitest run of its files each", () => {
        const app = many(10);
        const shards = ["graphty-1", "graphty-2", "layout", "githerd"].map(byName);
        const selection = [
            sel("graphty-1", "files", app),
            sel("graphty-2", "files", app),
            sel("layout", "none"),
            sel("githerd", "all"),
        ];
        const durations = { graphty: Object.fromEntries(app.map((f) => [f, 3 * MIN])) };
        const out = lightPlan(ROOT, shards, selection, durations);
        assert.deepEqual(out.whole, ["githerd"]);
        assert.deepEqual(out.none, ["layout"]);
        assert.deepEqual(
            out.bins.map((b) => b.name),
            ["graphty-1", "graphty-2", "graphty-3", "graphty-4", "graphty-5"],
        );
        assert.ok(
            out.bins.every((b) => b.ms <= 8 * MIN),
            "every bin is under 8 minutes",
        );
        assert.deepEqual(out.bins.flatMap((b) => b.files).sort(), [...app].sort(), "every file runs once");
        for (const b of out.bins) {
            assert.equal(b.shard, "graphty-1");
            assert.doesNotMatch(b.command, /--coverage|--shard/u);
            assert.ok(b.files.every((f) => b.command.includes(`'${f.slice("graphty/".length)}'`)));
        }
        const include = matrixPlan(["graphty"], ["graphty-1", "graphty-2"], out);
        assert.deepEqual(
            include.map((e) => e.shard).filter((s) => /^graphty-\d+$/u.test(s)),
            ["graphty-1", "graphty-2", "graphty-3", "graphty-4", "graphty-5"],
            "no slice the bins stand in for runs whole beside them",
        );
    });

    it("runs a family whole when one of its shards runs whole", () => {
        const shards = ["graphty-1", "graphty-2"].map(byName);
        const whole = { ...sel("graphty-2", "all"), reasons: ["graphty/vite.config.ts changed"] };
        const out = lightPlan(ROOT, shards, [sel("graphty-1", "files", many(2)), whole]);
        // the files the import graphs selected stay touched for the pull request rules, though the family runs whole
        // graphty-2 has no file-level answer, so every graphty file counts as touched
        assert.deepEqual(out, {
            bins: [],
            whole: ["graphty-1", "graphty-2"],
            none: [],
            touched: [...many(2)].sort(),
            unknown: ["graphty"],
            why: {
                graphty: {
                    package: "graphty",
                    shards: ["graphty-1", "graphty-2"],
                    reasons: ["graphty/vite.config.ts changed"],
                },
            },
        });
    });

    it("counts every file of a family touched when a shard runs whole on a file-level answer it does not rely on", () => {
        const shards = ["graphty-1", "graphty-2"].map(byName);
        const measured = (shard, why) => ({
            ...sel(shard, "all"),
            reasons: [why],
            measured: { mode: "none", files: [], untrusted: true },
        });
        for (const why of ["a smoke pattern", "it runs a browser project, which runs whole (measured only)"]) {
            const out = lightPlan(ROOT, shards, [measured("graphty-1", why), measured("graphty-2", why)]);
            assert.deepEqual(out.unknown, ["graphty"], why);
        }
        // a trusted answer whose command only cannot be narrowed keeps its files
        const trusted = { ...sel("graphty-1", "all"), measured: { mode: "none", files: [] } };
        assert.deepEqual(lightPlan(ROOT, [byName("graphty-1")], [trusted]).unknown, []);
    });

    it("says in the job summary what each bin runs and why, what runs whole and why, and what runs nothing", () => {
        const files = [
            { file: "graphty/src/a.test.tsx", why: "imports graphty/src/a.ts" },
            { file: "graphty/src/b.test.tsx", why: "changed" },
        ];
        const shards = ["graphty-1", "layout", "githerd"].map(byName);
        const out = lightPlan(ROOT, shards, [
            { shard: "graphty-1", mode: "files", files, reasons: [] },
            sel("layout", "none"),
            { ...sel("githerd", "all"), reasons: ["githerd/package.json changed"] },
        ]);
        assert.deepEqual(out.bins[0].why, {
            "graphty/src/a.test.tsx": "imports graphty/src/a.ts",
            "graphty/src/b.test.tsx": "changed",
        });
        const md = planSummary(out);
        assert.match(md, /^### Light check: 1 test bins, 1 shards whole, 1 shards with nothing selected/u);
        assert.match(md, /\*\*githerd\*\* runs whole: githerd\/package.json changed/u);
        assert.match(md, /nothing selected, not run: layout/u);
        assert.match(md, /graphty-1: 2 files/u);
        assert.match(md, /`graphty\/src\/a.test.tsx`: imports graphty\/src\/a.ts/u);
        assert.match(planSummary({ ...out, everything: "pnpm-lock.yaml changed" }), /runs whole: pnpm-lock.yaml/u);
        const scoped = planSummary(out, ["graphty"]);
        assert.match(
            scoped,
            /1 test bins, 0 shards whole/u,
            "a whole shard of an unaffected package is not in the matrix",
        );
        assert.doesNotMatch(scoped, /githerd/u);
        assert.match(
            planSummary({ ...out, everything: "a <details> tag" }),
            /a &lt;details&gt; tag/u,
            "reasons are escaped",
        );
    });

    it("gives each bin a matrix entry with its files, in place of its shard, and leaves out the empty shards", () => {
        const light = {
            bins: [
                {
                    name: "graph-io-1",
                    shard: "graph-io",
                    files: ["graph-io/test/a.test.ts"],
                    command: "cd graph-io && pnpm exec vitest run 'test/a.test.ts'",
                },
            ],
            whole: ["graph-format"],
            none: ["layout"],
        };
        const include = matrixPlan(["graph-io", "graph-format", "layout"], undefined, light);
        assert.equal(
            include.find((e) => e.shard === "graph-io"),
            undefined,
            "the binned shard does not run whole",
        );
        const bin = include.find((e) => e.shard === "graph-io-1");
        assert.deepEqual(bin.files, ["graph-io/test/a.test.ts"]);
        assert.equal(bin.coverage, undefined, "a bin uploads no coverage");
        assert.equal(bin["needs-browser"], false);
        assert.match(bin["test-command"], /^node tools\/results\/run-group\.mjs graph-io-1 'cd graph-io && /u);
        const group = include.find((e) => e.shard === "small-node");
        assert.match(group["test-command"], /graph-format/u, "a whole shard runs as today");
        assert.doesNotMatch(group["test-command"], /==> layout/u, "a shard with nothing selected is left out");
        assert.throws(
            () => matrixPlan(["graph-io"], undefined, { bins: [{ name: "x-1", shard: "nope" }] }),
            /names no shard/u,
        );
    });
});

describe("the story selector (design/ci/channels-pipeline/stories-as-tests.md section 5)", () => {
    const projects = JSON.parse(readFileSync(join(ROOT, "visual-review.config.json"), "utf8")).projects;
    // every project as if proven, so these tests judge the selection itself
    const stories = { ...loadRules(ROOT).stories, selectProjects: Object.keys(projects) };
    const byName = (name) => SHARDS.find((s) => s.shard === name);
    const shards = [
        "graphty-storybook",
        "graphty-1",
        "layout",
        "graph-io",
        "graphty-element-storybook-1",
        "graphty-element-storybook-2",
    ].map(byName);
    const pick = (selection, changed = [], extra = {}) =>
        Object.fromEntries(
            selectStories({
                projects,
                changed,
                everything: null,
                shards,
                selection,
                rules: stories,
                lockMoved: false,
                ...extra,
            }).map((p) => [p.project, p]),
        );
    const sel = (shard, mode, files = []) => ({
        shard,
        mode,
        files: files.map((file) => ({ file })),
        reasons: [`${shard} ${mode}`],
    });
    const none = shards.map((s) => sel(s.shard, "none"));

    it("runs the story files whose import closure reaches the change, from the storybook shards", () => {
        const story = "graphty-element/stories/Basic.stories.ts";
        const selection = [
            ...none.filter((s) => !s.shard.startsWith("graphty-element-storybook")),
            sel("graphty-element-storybook-1", "files", [story]),
            sel("graphty-element-storybook-2", "files", [story]),
        ];
        const out = pick(selection, ["graphty-element/src/a.ts"]);
        assert.equal(out["graphty-element"].mode, "files");
        assert.deepEqual(out["graphty-element"].files, [story]);
        assert.equal(out.graphty.mode, "none");
        assert.equal(out.layout.mode, "none");
    });

    it("runs every story of a project with no story graph when a package that draws it is selected", () => {
        const selection = none.map((s) => (s.shard === "graphty-element-storybook-1" ? sel(s.shard, "all") : s));
        const out = pick(selection);
        assert.equal(out["graph-io-fidelity"].mode, "all", "graph-io-fidelity draws with graphty-element");
        assert.equal(out.layout.mode, "none");
        assert.equal(
            pick(none.map((s) => (s.shard === "layout" ? sel("layout", "files", ["layout/test/a.test.ts"]) : s))).layout
                .mode,
            "all",
        );
    });

    it("runs every story on a global input, the project's own Storybook setup, the theme or a lockfile move", () => {
        assert.ok(Object.values(pick(none, ["visual-fonts/fonts.conf"])).every((p) => p.mode === "all"));
        const own = pick(none, ["graphty/.storybook/preview.tsx"]);
        assert.equal(own.graphty.mode, "all");
        assert.equal(own["graphty-element"].mode, "none");
        assert.equal(pick(none, ["graph-io/fidelity-stories/.storybook/main.ts"])["graph-io-fidelity"].mode, "all");
        const theme = pick(none, ["compact-mantine/src/theme/tokens.ts"]);
        assert.equal(theme.graphty.mode, "all");
        assert.equal(theme.layout.mode, "none");
        assert.ok(Object.values(pick(none, ["pnpm-lock.yaml"], { lockMoved: true })).every((p) => p.mode === "all"));
        assert.ok(Object.values(pick(none, [], { everything: "nx.json" })).every((p) => p.mode === "all"));
    });

    it("runs every story of a project not yet proven by test-select-mutate --stories, on any change", () => {
        assert.ok(Array.isArray(loadRules(ROOT).stories.selectProjects), "the rules list the proven projects");
        const out = pick(none, ["graphty-element/src/a.ts"], { rules: { ...stories, selectProjects: ["layout"] } });
        assert.equal(out.layout.mode, "none", "a proven project is selected as before");
        assert.equal(out["graphty-element"].mode, "all");
        assert.match(out["graphty-element"].reasons[0], /test-select-mutate --stories/u);
        assert.equal(out.graphty.mode, "all", "even with nothing of it changed");
    });

    it("runs a story whose baseline changed", () => {
        const out = pick(none, [
            "visual-baselines/layout/layout-circular--default.png",
            "visual-baselines/layout/x.json",
        ]);
        assert.deepEqual(out.layout.baselines, ["layout-circular--default"]);
        assert.equal(out.layout.mode, "none");
    });

    it("counts a lockfile change as moving every picture only when it moves Playwright, Storybook, Vitest or a font", () => {
        const lock = (pkgs) =>
            `lockfileVersion: '9.0'\n\npackages:\n\n${pkgs.map((p) => `  ${p}:\n    resolution: {integrity: x}\n`).join("\n")}`;
        const re = stories.lockfile;
        assert.equal(
            lockMoves(lock(["lodash@4.17.20", "vitest@3.2.3"]), lock(["lodash@4.17.21", "vitest@3.2.3"]), re),
            false,
        );
        assert.equal(lockMoves(lock(["vitest@3.2.3"]), lock(["vitest@3.2.4"]), re), true);
        assert.equal(lockMoves(lock(["a@1.0.0"]), lock(["a@1.0.0", "'@playwright/test@1.56.0'"]), re), true);
        assert.equal(lockMoves(null, lock([]), re), true, "an unreadable lockfile counts as moved");
    });
});

describe("the import graphs' cache key", () => {
    it("follows the packages, root configs and lockfile, not the commit", () => {
        const repo = mkdtempSync(join(ROOT, "tmp", "graph-key-"));
        try {
            const git = (...a) =>
                execFileSync("git", a, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
            git("init", "-q");
            git("config", "commit.gpgsign", "false");
            for (const [f, t] of [
                ["pkg/a.ts", "1"],
                ["pnpm-lock.yaml", "a"],
                ["docs/x.md", "x"],
                ["README.md", "r"],
                ["tools/test-select.mjs", ""],
                ["tools/test-select-rules.json", "{}"],
            ]) {
                mkdirSync(dirname(join(repo, f)), { recursive: true });
                writeFileSync(join(repo, f), t);
            }
            const commit = () => git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qam", "c", "--no-verify");
            git("add", ".");
            commit();
            const k1 = graphCacheKey(repo, ["pkg"]);
            writeFileSync(join(repo, "docs/x.md"), "y");
            writeFileSync(join(repo, "README.md"), "s");
            commit();
            assert.equal(graphCacheKey(repo, ["pkg"]), k1, "docs and a new commit keep the key");
            writeFileSync(join(repo, "pnpm-lock.yaml"), "b");
            commit();
            const k2 = graphCacheKey(repo, ["pkg"]);
            assert.notEqual(k2, k1, "the lockfile is a graph input");
            writeFileSync(join(repo, "pkg/a.ts"), "2");
            commit();
            assert.notEqual(graphCacheKey(repo, ["pkg"]), k2, "a package's tree is a graph input");
        } finally {
            rmSync(repo, { recursive: true, force: true });
        }
    });
});

describe("the light check's story bins (merging.md section 4.1, #3443 part b)", () => {
    const projects = {
        "graphty-element": { storybook: "graphty-element/storybook-static" },
        layout: { storybook: "layout/storybook-static" },
        "graph-io-fidelity": { storybook: "graph-io/fidelity-stories/storybook-static" },
    };
    const entry = (project, mode, files = [], baselines = []) => ({ project, mode, files, baselines, reasons: [] });
    const list = (dir) =>
        ({
            layout: ["layout/stories/A.stories.ts", "layout/stories/helpers.ts", "layout/src/x.ts"],
            "graph-io/fidelity-stories": ["graph-io/fidelity-stories/F.stories.tsx"],
        })[dir] ?? [];

    it("packs selected story files into bins of at most 4 minutes by their storybook family's times", () => {
        const files = ["graphty-element/stories/A.stories.ts", "graphty-element/stories/B.stories.ts"];
        const durations = {
            "graphty-element-storybook": {
                "graphty-element/stories/A.stories.ts": 300_000,
                "graphty-element/stories/B.stories.ts": 300_000,
            },
        };
        const bins = storyBins([entry("graphty-element", "files", files)], projects, list, durations);
        assert.deepEqual(
            bins.map((b) => [b.name, b.files, b.ms]),
            [
                ["graphty-element-1", ["graphty-element/stories/A.stories.ts"], 300_000],
                ["graphty-element-2", ["graphty-element/stories/B.stories.ts"], 300_000],
            ],
        );
        assert.ok(bins.every((b) => b.storybook === "graphty-element/storybook-static"));
    });

    it("counts a file with no longer recorded time at its stories times its project's capture rate", () => {
        const files = Array.from({ length: 5 }, (_, i) => `graph-io/fidelity-stories/F${i}.stories.ts`);
        const perFile = 30 * STORY_MS["graph-io-fidelity"];
        const bins = storyBins(
            [entry("graph-io-fidelity", "files", files)],
            projects,
            list,
            { "graph-io-storybook": { [files[0]]: 1_000 } },
            () => 30,
        );
        // 30 stories a file: two files fit in 4 minutes, a third starts the next bin
        assert.ok(2 * perFile <= STORY_BIN_LIMIT_MS && 3 * perFile > STORY_BIN_LIMIT_MS);
        assert.deepEqual(
            bins.map((b) => [b.name, b.files.length, b.ms]),
            [
                ["graph-io-fidelity-1", 2, 2 * perFile],
                ["graph-io-fidelity-2", 2, 2 * perFile],
                ["graph-io-fidelity-3", 1, perFile],
            ],
        );
    });

    it("counts a story file's capitalized exports as its stories, at least one", () => {
        const src =
            "export default meta;\nexport const One = {};\nexport const Two: Story = {};\nexport const helper = 1;\n";
        assert.equal(storyCount(src), 2);
        assert.equal(storyCount("export default {};\n"), 1);
    });

    it("bins every story file of a project selected whole, and nothing for one selected none", () => {
        const bins = storyBins(
            [entry("layout", "all"), entry("graph-io-fidelity", "all"), entry("graphty-element", "none")],
            projects,
            list,
        );
        assert.deepEqual(
            bins.map((b) => [b.name, b.files]),
            [
                ["layout-1", ["layout/stories/A.stories.ts"]],
                ["graph-io-fidelity-1", ["graph-io/fidelity-stories/F.stories.tsx"]],
            ],
        );
    });

    it("captures a story whose baseline changed even when no file selects it", () => {
        const bins = storyBins([entry("graphty-element", "none", [], ["a--one"])], projects, list);
        assert.deepEqual(bins, [
            {
                name: "graphty-element-1",
                project: "graphty-element",
                storybook: "graphty-element/storybook-static",
                files: [],
                ids: ["a--one"],
                ms: 0,
            },
        ]);
    });
});
