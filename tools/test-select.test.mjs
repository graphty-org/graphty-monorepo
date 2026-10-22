/**
 * Tests of tools/test-select.mjs (the advisory test selector) and the log parsing of
 * tools/test-select-replay.mjs, on small hand-made import graphs.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { SHARDS } from "./ci-test-matrix.mjs";
import {
    advisoryMisses,
    buildInput,
    estimate,
    failingFiles,
    globToRe,
    loadRules,
    measuredOf,
    projectSelected,
    reportAdvisory,
    selectInGraph,
    selectPackages,
    selectShards,
    shardRuns,
    startAdvisory,
    testRefs,
    wholePackageRule,
} from "./test-select.mjs";
import { ciFailures, parseGateLog } from "./test-select-replay.mjs";

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

describe("the rules file", () => {
    const real = loadRules(ROOT);

    it("runs everything for any change under .github/, the actions CI's shards use included", () => {
        assert.ok(real.everything.some((re) => re.test(".github/actions/early-verdict/action.yml")));
    });

    it("judges code under src/ by the import graph, never by a data-folder rule", () => {
        assert.ok(!wholePackageRule("src/data/JsonDataSource.ts", real));
        assert.ok(wholePackageRule("src/data/sample.json", real));
        assert.ok(wholePackageRule("test/fixtures/k.ts", real));
    });

    it("allows file-level selection only in the packages the design starts with", () => {
        assert.deepEqual([...real.fileLevel].sort(), ["compact-mantine", "graph-format", "graphty", "remote-logger"]);
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
        'import t from "./text.txt?raw";\nexport const w = new URL("./worker.ts", import.meta.url);\nexport { t };\n',
    );
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
            assert.deepEqual(g.imports["pa/src/w.ts"].sort(), ["pa/src/text.txt", "pa/src/worker.ts"]);
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
            assert.deepEqual([...refs.get("pa")], ["pb"], "pa's tests read pb's files by relative path");
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
