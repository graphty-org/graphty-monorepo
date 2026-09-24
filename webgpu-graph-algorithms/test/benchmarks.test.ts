/**
 * Pure tests of the benchmark code (contract 6.1-6.4, 6.8; spec 11.7, 10.4 T-13): the datasets are deterministic, the
 * harness times an async body and appends sessions under the runner class, and scripts/bench-compare.js applies the
 * quiet-GPU / new-result / regression rules in order with the documented exit codes, against the real sessions of
 * benchmarks/results/gpu-linux-t4.json where the rule is about real numbers. No GPU is involved.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
    ATTRACTION_LADDER,
    ATTRACTION_SCALE_GROUP,
    POSITION_BYTES_PER_NODE,
} from "../benchmarks/attraction-scale.bench.js";
import { gridEdges, KARATE_EDGES, randomEdges, rmatEdges, snapshotOf, TIERS } from "../benchmarks/datasets.js";
import {
    appendSession,
    bench,
    type BenchResult,
    type BenchSession,
    type GpuSessionInfo,
    makeRandom,
    runnerClass,
    setBenchRuns,
} from "../benchmarks/harness.js";
import {
    EXACT_BUDGET_MS,
    EXACT_LADDER,
    exactMaxNodesFromLadder,
    floorPow2,
    FRAME_RUNG,
    LADDER_EDGE_FACTOR,
    type LadderRow,
    ladderRowsOf,
    type LadderRung,
    LAYOUT_EXACT_GROUP,
    reportedRow,
} from "../benchmarks/layout-exact.bench.js";
import { FR_RUNGS, LAYOUT_FR_GROUP } from "../benchmarks/layout-fr.bench.js";
import {
    ATTRACTION_RUNG,
    GRID_DIMS,
    GRID_LADDER,
    gridLadderRowsOf,
    LAYOUT_GRID_GROUP,
    RECHECK_RUNGS,
} from "../benchmarks/layout-grid.bench.js";
import { checkLayoutResult, metricsText, parseLayoutRunArgs } from "../benchmarks/layout-run.js";

/** A device whose queue settles immediately: bench() only awaits onSubmittedWorkDone on it. */
const FAKE_DEVICE = {
    queue: { onSubmittedWorkDone: (): Promise<undefined> => Promise.resolve(undefined) },
} as unknown as GPUDevice;

/** A session gpu record of a fictitious NVIDIA adapter. */
const GPU: GpuSessionInfo = {
    vendor: "nvidia",
    architecture: "ada-lovelace",
    device: "NVIDIA GeForce RTX 4070 SUPER",
    description: "NVIDIA 580.173.02 (test)",
    driver: "580.173.02",
    limits: {
        maxBufferSize: 268435456,
        maxStorageBufferBindingSize: 134217728,
        maxStorageBuffersPerShaderStage: 8,
        maxComputeWorkgroupsPerDimension: 65535,
    },
    software: false,
    runtime: "node",
    subgroupMaxSize: 32,
};

/** A result row. `minMs` defaults to the median; pass it to separate the floor from the middle. */
function result(name: string, medianMs: number, group = "roundtrip", minMs = medianMs): BenchResult {
    return {
        group,
        name,
        medianMs,
        minMs,
        maxMs: medianMs,
        runs: 5,
        memoryDeltaBytes: 0,
        rate: null,
        rateUnit: null,
    };
}

/** A session holding the given results. */
function session(results: readonly BenchResult[], runner = "nvidia-ada-lovelace-driver580"): BenchSession {
    return {
        date: "2026-09-20T00:00:00.000Z",
        host: "test",
        node: "v22.22.1",
        cpu: "test",
        exposeGc: false,
        gpu: GPU,
        runnerClass: runner,
        results,
    };
}

/** A gpu-report.json document with the given nvidia-smi sample. */
function report(
    samples: readonly { utilizationGpu: number; memoryUsedMiB: number }[],
    runner = "nvidia-ada-lovelace-driver580",
): string {
    const available = samples.length > 0;
    return JSON.stringify({
        ok: true,
        runnerClass: runner,
        nvidiaSmi: {
            available,
            samples,
            maxUtilization: available ? Math.max(...samples.map((s) => s.utilizationGpu)) : 0,
            maxMemoryUsedMiB: available ? Math.max(...samples.map((s) => s.memoryUsedMiB)) : 0,
        },
    });
}

describe("benchmarks/datasets.ts (contract 6.2)", () => {
    it("makeRandom is graph-format's xorshift32: seed 7 gives the pinned first draws", () => {
        const random = makeRandom(7);
        expect(random()).toBeCloseTo(0.00044065131805837154, 12);
        expect(random()).toBeCloseTo(0.10952103300951421, 12);
        expect(random()).toBeCloseTo(0.9038964069914073, 12);
        expect(makeRandom(12345)()).toBeCloseTo(0.776938705239445, 12);
    });

    it("randomEdges is seeded G(n, m) with integer weights 1..10 (self-loops and parallels allowed)", () => {
        const a = randomEdges(10, 20, 1);
        const b = randomEdges(10, 20, 1);
        expect(a.nodeCount).toBe(10);
        expect(a.src.length).toBe(20);
        expect(a.dst.length).toBe(20);
        expect(a.weights.length).toBe(20);
        expect(Array.from(a.src)).toEqual(Array.from(b.src));
        expect(Array.from(a.dst)).toEqual(Array.from(b.dst));
        for (let e = 0; e < 20; e++) {
            expect(a.src[e]).toBeLessThan(10);
            expect(a.dst[e]).toBeLessThan(10);
            expect(a.weights[e]).toBeGreaterThanOrEqual(1);
            expect(a.weights[e]).toBeLessThanOrEqual(10);
            expect(Number.isInteger(a.weights[e])).toBe(true);
        }
        expect(Array.from(randomEdges(10, 20, 2).src)).not.toEqual(Array.from(a.src));
    });

    it("rmatEdges(4, 2, 1) has 16 nodes, 32 edges, no self-loops and is deterministic", () => {
        const g = rmatEdges(4, 2, 1);
        expect(g.nodeCount).toBe(16);
        expect(g.src.length).toBe(32);
        for (let e = 0; e < 32; e++) {
            expect(g.src[e]).toBeLessThan(16);
            expect(g.dst[e]).toBeLessThan(16);
            expect(g.src[e]).not.toBe(g.dst[e]);
        }
        // the first five pairs of the (0.57 / 0.19 / 0.19 / 0.05) walk with the (v + 1) % n self-loop fix
        expect(Array.from(g.src.slice(0, 5))).toEqual([0, 0, 0, 10, 5]);
        expect(Array.from(g.dst.slice(0, 5))).toEqual([2, 1, 10, 0, 0]);
        expect(Array.from(rmatEdges(4, 2, 1).dst)).toEqual(Array.from(g.dst));
    });

    it("gridEdges(3, 2) is the 4-neighbour grid in graph-format's row-major order with unit weights", () => {
        const g = gridEdges(3, 2);
        expect(g.nodeCount).toBe(6);
        const pairs = Array.from(g.src).map((u, e) => [u, g.dst[e]]);
        expect(pairs).toEqual([
            [0, 1],
            [0, 3],
            [1, 2],
            [1, 4],
            [2, 5],
            [3, 4],
            [4, 5],
        ]);
        expect(Array.from(g.weights)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    });

    it("KARATE_EDGES is Zachary's karate club and snapshotOf builds an undirected weighted snapshot", () => {
        expect(KARATE_EDGES.nodeCount).toBe(34);
        expect(KARATE_EDGES.src.length).toBe(78);
        const s = snapshotOf(KARATE_EDGES, { label: "karate" });
        expect(s.directed).toBe(false);
        expect(s.nodeCount).toBe(34);
        expect(s.edgeCount).toBe(78);
        expect(s.arcCount).toBe(156);
        expect(s.label).toBe("karate");
        expect(s.flags.weighted).toBe(true);
        expect(s.outDegree()[0]).toBe(16);
        expect(s.outDegree()[33]).toBe(17);
        expect(snapshotOf(randomEdges(10, 20, 1), { directed: true }).directed).toBe(true);
    });

    it("TIERS are the design-15.3 pairs", () => {
        expect(TIERS.map((t) => [t.name, t.nodes, t.edges])).toEqual([
            ["10k/100k", 10_000, 100_000],
            ["100k/1M", 100_000, 1_000_000],
            ["1M/10M", 1_000_000, 10_000_000],
        ]);
    });
});

describe("benchmarks/harness.ts (contract 6.1)", () => {
    it("bench() runs one warm-up plus `runs` timed runs with setup / teardown per run and reports the median and rate", async () => {
        let setups = 0;
        let teardowns = 0;
        let bodies = 0;
        const r = await bench(
            "unit",
            "fake",
            {
                setup: () => {
                    setups += 1;
                    return setups;
                },
                run: async (input) => {
                    bodies += 1;
                    await new Promise((resolveSleep) => setTimeout(resolveSleep, 2));
                    return input;
                },
                teardown: (input) => {
                    expect(input).toBe(setups);
                    teardowns += 1;
                },
            },
            { device: FAKE_DEVICE, runs: 3, items: 1000, unit: "edges" },
        );
        expect(setups).toBe(4);
        expect(bodies).toBe(4);
        expect(teardowns).toBe(4);
        expect(r.group).toBe("unit");
        expect(r.name).toBe("fake");
        expect(r.runs).toBe(3);
        expect(r.medianMs).toBeGreaterThanOrEqual(1);
        expect(r.minMs).toBeLessThanOrEqual(r.medianMs);
        expect(r.maxMs).toBeGreaterThanOrEqual(r.medianMs);
        expect(r.rateUnit).toBe("edges/s");
        expect(r.rate).toBeCloseTo((1000 / r.medianMs) * 1000, 6);
        expect(typeof r.memoryDeltaBytes).toBe("number");
    });

    it("setBenchRuns() sets the default run count; rate is null without items", async () => {
        setBenchRuns(2);
        try {
            const r = await bench("unit", "runs", { setup: () => 0, run: () => 0 }, { device: FAKE_DEVICE });
            expect(r.runs).toBe(2);
            expect(r.rate).toBeNull();
            expect(r.rateUnit).toBeNull();
        } finally {
            setBenchRuns(5);
        }
        expect(() => {
            setBenchRuns(0);
        }).toThrow(/positive integer/);
    });

    it("a timed body that resolves to undefined is legal (contract 6.1: run returns Promise<unknown> | unknown)", async () => {
        const r = await bench(
            "unit",
            "void",
            { setup: () => 0, run: () => undefined },
            { device: FAKE_DEVICE, runs: 1 },
        );
        expect(r.runs).toBe(1);
        const asyncVoid = await bench(
            "unit",
            "async-void",
            { setup: () => 0, run: () => Promise.resolve(undefined) },
            { device: FAKE_DEVICE, runs: 1 },
        );
        expect(asyncVoid.runs).toBe(1);
    });

    it("appendSession writes <dir>/<runnerClass>.json as an array of sessions carrying the gpu field", () => {
        const dir = mkdtempSync(join(tmpdir(), "wgpu-bench-"));
        try {
            const results = [result("degree + 400 KB readback at 100k", 1.5)];
            const file = appendSession(results, GPU, { dir });
            expect(file).toBe(join(dir, `${runnerClass(GPU)}.json`));
            const sessions = JSON.parse(readFileSync(file, "utf8")) as BenchSession[];
            expect(sessions).toHaveLength(1);
            const first = sessions[0];
            expect(first.gpu).toEqual(GPU);
            expect(first.runnerClass).toBe(runnerClass(GPU));
            expect(first.results).toEqual(results);
            expect(first.node).toBe(process.version);
            expect(typeof first.date).toBe("string");
            expect(typeof first.host).toBe("string");
            expect(typeof first.cpu).toBe("string");
            expect(typeof first.exposeGc).toBe("boolean");
            appendSession(results, GPU, { dir });
            expect((JSON.parse(readFileSync(file, "utf8")) as BenchSession[]).length).toBe(2);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("runnerClass honours GRAPHTY_RUNNER_CLASS and derives <vendor>-<architecture>-driver<major> otherwise (6.9)", () => {
        expect(runnerClass(GPU, {})).toBe("nvidia-ada-lovelace-driver580");
        expect(runnerClass(GPU, { GRAPHTY_RUNNER_CLASS: "gpu-linux-t4" })).toBe("gpu-linux-t4");
    });
});

describe("scripts/bench-compare.js (contract 6.8; spec 10.4 T-13)", () => {
    const SCRIPT = resolve("scripts/bench-compare.js");
    const CLASS = "nvidia-ada-lovelace-driver580";

    /** Runs the script in a fresh directory populated by `files` (path -> text); returns status and stdout. */
    function run(
        files: Readonly<Record<string, string>>,
        args: readonly string[] = [],
    ): { status: number | null; out: string } {
        const dir = mkdtempSync(join(tmpdir(), "wgpu-compare-"));
        try {
            for (const [path, text] of Object.entries(files)) {
                const full = join(dir, path);
                mkdirSync(join(full, ".."), { recursive: true });
                writeFileSync(full, text);
            }
            const proc = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: "utf8" });
            return { status: proc.status, out: `${proc.stdout}${proc.stderr}` };
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }

    const quiet = report([
        { utilizationGpu: 0, memoryUsedMiB: 512 },
        { utilizationGpu: 3, memoryUsedMiB: 512 },
    ]);
    const out = (results: readonly BenchResult[]): string => JSON.stringify([session(results)]);

    it("rule 1: no gpu-report.json or no out file -> nothing to compare, exit 0", () => {
        expect(run({})).toMatchObject({ status: 0 });
        expect(run({}).out).toContain("nothing to compare");
        const noOut = run({ "gpu-report.json": quiet, [`benchmarks/results/${CLASS}.json`]: out([result("a", 1)]) });
        expect(noOut.status).toBe(0);
        expect(noOut.out).toContain("nothing to compare");
    });

    it("rule 2: utilisation above 10% or memory taken by another process during the sample -> SKIPPED, exit 0", () => {
        const busy = report([
            { utilizationGpu: 0, memoryUsedMiB: 512 },
            { utilizationGpu: 40, memoryUsedMiB: 512 },
        ]);
        const grown = report([
            { utilizationGpu: 0, memoryUsedMiB: 512 },
            { utilizationGpu: 0, memoryUsedMiB: 900 },
        ]);
        const files = {
            [`benchmarks/out/${CLASS}.json`]: out([result("a", 10)]),
            [`benchmarks/results/${CLASS}.json`]: out([result("a", 1)]),
        };
        for (const doc of [busy, grown]) {
            const r = run({ ...files, "gpu-report.json": doc });
            expect(r.status).toBe(0);
            expect(r.out).toContain("SKIPPED: GPU not quiet");
        }
        // a flat memory series (a resident compositor) is quiet
        const flat = run({ ...files, "gpu-report.json": quiet });
        expect(flat.out).not.toContain("SKIPPED");
        // no nvidia-smi at all: the sample cannot veto
        const none = run({ ...files, "gpu-report.json": report([]) });
        expect(none.out).not.toContain("SKIPPED");
    });

    it("rule 3: no baseline -> every result is new, exit 0", () => {
        const r = run({
            "gpu-report.json": quiet,
            [`benchmarks/out/${CLASS}.json`]: out([result("alpha", 1), result("beta", 2)]),
        });
        expect(r.status).toBe(0);
        expect(r.out).toContain("new (no baseline)");
        expect(r.out).toContain("roundtrip/alpha");
        expect(r.out).toContain("roundtrip/beta");
    });

    it("rule 4: a median above threshold x baseline is a regression (exit 1); at or below passes; unmatched rows are new", () => {
        // The numbers are milliseconds, and rule 4 also asks a regression to be worth 2.5 ms of them, so these rows
        // are sized in tens: what they test is the factor, not the floor (the floor has its own case below).
        const baseline = out([result("a", 10), result("b", 20), result("gone", 10)]);
        const files = { "gpu-report.json": quiet, [`benchmarks/results/${CLASS}.json`]: baseline };
        const red = run({
            ...files,
            [`benchmarks/out/${CLASS}.json`]: out([result("a", 14), result("b", 20), result("fresh", 90)]),
        });
        expect(red.status).toBe(1);
        expect(red.out).toContain("REGRESSION");
        expect(red.out).toContain("new (no baseline)");
        // exactly the default factor still passes: the rule is "above", not "at"
        const green = run({ ...files, [`benchmarks/out/${CLASS}.json`]: out([result("a", 13.5), result("b", 5)]) });
        expect(green.status).toBe(0);
        expect(green.out).not.toContain("REGRESSION");
        const looser = run({ ...files, [`benchmarks/out/${CLASS}.json`]: out([result("a", 14)]) }, [
            "--threshold",
            "4",
        ]);
        expect(looser.status).toBe(0);
    });

    it("rule 4: the MINIMUM confirms the median -- a risen median over an intact floor is noisy, exit 0", () => {
        // Tens of milliseconds again, so that the 2.5 ms floor of rule 4 never decides these rows.
        const files = { "gpu-report.json": quiet, [`benchmarks/results/${CLASS}.json`]: out([result("a", 10)]) };

        // The shape of run 35414639899: the median rose 8x while the fastest run stayed at the baseline. Interference
        // can only make a sample slower, so a floor that did not move says the cost did not move.
        const noisy = run({ ...files, [`benchmarks/out/${CLASS}.json`]: out([result("a", 80, "roundtrip", 11)]) });
        expect(noisy.status).toBe(0);
        expect(noisy.out).toContain("noisy");
        expect(noisy.out).not.toContain("REGRESSION");
        expect(noisy.out).toContain("x1.10"); // the min ratio column carries the number the rule turned on

        // The floor moved with the median: a real regression still fails.
        const real = run({ ...files, [`benchmarks/out/${CLASS}.json`]: out([result("a", 80, "roundtrip", 80)]) });
        expect(real.status).toBe(1);
        expect(real.out).toContain("REGRESSION");

        // A minimum just under the threshold still confirms; just over it does not.
        const edge = run({ ...files, [`benchmarks/out/${CLASS}.json`]: out([result("a", 80, "roundtrip", 13.5)]) });
        expect(edge.status).toBe(0);
        const over = run({ ...files, [`benchmarks/out/${CLASS}.json`]: out([result("a", 80, "roundtrip", 13.6)]) });
        expect(over.status).toBe(1);

        // A baseline written before minMs existed: the median alone decides, as it did before this rule.
        const legacy = JSON.stringify([session([result("a", 10)])], (k, v) => (k === "minMs" ? undefined : v));
        const fallback = run({
            "gpu-report.json": quiet,
            [`benchmarks/results/${CLASS}.json`]: legacy,
            [`benchmarks/out/${CLASS}.json`]: out([result("a", 80, "roundtrip", 11)]),
        });
        expect(fallback.status).toBe(1);
        expect(fallback.out).toContain("REGRESSION");
    });

    it("the run under test is the LAST out session; the baseline is the BEST of every session of the results file", () => {
        // The second blindness of 2026-09-22: the slow session had been appended to the baseline file, so a
        // last-session baseline made the regression its own baseline. A minimum over every session cannot be raised
        // by appending a slower one.
        const baseline = JSON.stringify([
            session([result("a", 1), result("a", 1, "upload")]),
            session([result("a", 100), result("a", 100, "upload")]),
        ]);
        const current = JSON.stringify([
            session([result("a", 1), result("a", 1, "upload")]),
            session([result("a", 5, "upload"), result("a", 1)]),
        ]);
        const r = run({
            "gpu-report.json": quiet,
            [`benchmarks/results/${CLASS}.json`]: baseline,
            [`benchmarks/out/${CLASS}.json`]: current,
        });
        expect(r.status).toBe(1);
        expect(r.out).toContain("baseline: the best of 2 session(s)");
        // rows are matched by group AND name: the two rows share the name "a" and only the upload one moved
        expect(r.out).toMatch(/REGRESSION\s+upload\/a\s/);
        expect(r.out).toMatch(/ok\s+roundtrip\/a\s/);
    });

    it("the default threshold catches the 2026-09-22 PageRank regression and passes the rows that moved under 10%", () => {
        // The real file. The slow run is the Tesla T4 session of 2026-09-22, named by its date rather than by its
        // place in the file: appending the next session (the append procedure of docs/decisions/G3.md appendix A,
        // and the next one will be fast -- the kernel change is fixed in docs/decisions/G4.md) or deleting a
        // superseded session while re-pinning must not silently turn some other run into "the slow session".
        const T4 = "gpu-linux-t4";
        const REGRESSED_DATE = "2026-09-22T20:21:53.814Z";
        const sessions = JSON.parse(
            readFileSync(resolve("benchmarks/results", `${T4}.json`), "utf8"),
        ) as BenchSession[];
        const at = sessions.findIndex((s) => s.date === REGRESSED_DATE);
        expect(
            at,
            `benchmarks/results/${T4}.json must still hold the ${REGRESSED_DATE} session and at least one session before it: they are this test's fixture, not incidental content`,
        ).toBeGreaterThan(0);
        const regressed = sessions[at];
        const before = sessions.slice(0, at);
        // the fixture only means what it says while the earlier sessions carry the fast PageRank rows
        const pagerankBefore = before.flatMap((s) => s.results.filter((r) => r.group === "pagerank"));
        expect(pagerankBefore.length).toBeGreaterThan(0);
        const quietT4 = report(
            [
                { utilizationGpu: 0, memoryUsedMiB: 512 },
                { utilizationGpu: 3, memoryUsedMiB: 512 },
            ],
            T4,
        );
        const files = (baseline: readonly BenchSession[]): Record<string, string> => ({
            "gpu-report.json": quietT4,
            [`benchmarks/out/${T4}.json`]: JSON.stringify([regressed]),
            [`benchmarks/results/${T4}.json`]: JSON.stringify(baseline),
        });

        // (1) the file as it stood before the slow session was appended
        const fresh = run(files(before));
        expect(fresh.status).toBe(1);
        expect(fresh.out).toMatch(/REGRESSION\s+pagerank\/pagerank 100 iterations at 100k\/1M\s/);
        expect(fresh.out).toMatch(/REGRESSION\s+pagerank\/pagerank 100 iterations at 1M\/10M\s/);
        expect(fresh.out.match(/^REGRESSION/gm)).toHaveLength(2);
        // the absolute floor of rule 4 does not blunt this: the two rows rose 44.6 ms and 675.6 ms, against 2.5
        expect(fresh.out).toContain("by at least 2.5 ms");

        // the rows that legitimately moved between those two sessions -- the largest of them is x1.075 median /
        // x1.079 minimum against the session before, x1.095 / x1.112 against the pinned baseline the gate actually
        // compares against -- must still read ok at this threshold
        for (const name of [
            "layout-exact/step\\(1\\) wall n=4096",
            "layout-exact/step\\(1\\) wall n=8192",
            "layout-fr/fr step\\(1\\) wall n=10000",
            "layout-fr/se step\\(1\\) wall n=10000",
            "pagerank/pagerank 100 iterations at 10k/100k",
            "wcc/wcc at 1M/10M",
        ]) {
            expect(fresh.out).toMatch(new RegExp(`^ok\\s+${name}`, "m"));
        }

        // (2) the same run against the file WITH the slow session already appended: still red, because the
        // baseline is the best of every session rather than the last one
        const appended = run(files(sessions.slice(0, at + 1)));
        expect(appended.status).toBe(1);
        expect(appended.out).toContain(`baseline: the best of ${String(at + 1)} session(s)`);
        expect(appended.out.match(/^REGRESSION/gm)).toHaveLength(2);

        // (3) what the gate used to do with the same numbers
        const old = run(files(before), ["--threshold", "3"]);
        expect(old.status).toBe(0);
        expect(old.out).not.toContain("REGRESSION");
    });

    it("a rise the card cannot measure is too small to call: the run that failed on 2026-09-23 passes", () => {
        // GPU lane run 35828560733 on the Tesla T4 was the first run under the 1.35 threshold, and it failed the
        // build on `layout-exact/ms/iteration (profiler) n=1024 [1k]`: 0.424 ms against a pinned 0.293, x1.45 on
        // the median AND x1.45 on the minimum, so the noisy-median rule above could not save it. A tenth of a
        // millisecond on the smallest rung of the exact ladder is what the card costs when its clock drops under
        // sparse sub-millisecond dispatches (finding G3-F1), not a slower kernel: the larger rungs of the same
        // ladder moved x1.00 .. x1.09 in the same run, and the two PageRank rows it was sent to check came in
        // faster than the baseline. The session is that run's own output, taken from its artifact; the baseline is
        // the checked-in file it was compared against.
        const T4 = "gpu-linux-t4";
        const quietT4 = report(
            [
                { utilizationGpu: 0, memoryUsedMiB: 512 },
                { utilizationGpu: 3, memoryUsedMiB: 512 },
            ],
            T4,
        );
        const r = run({
            "gpu-report.json": quietT4,
            [`benchmarks/results/${T4}.json`]: readFileSync(resolve("benchmarks/results", `${T4}.json`), "utf8"),
            [`benchmarks/out/${T4}.json`]: readFileSync(
                resolve("test/fixtures/bench", `${T4}-run-35828560733.json`),
                "utf8",
            ),
        });
        expect(r.status).toBe(0);
        expect(r.out).not.toContain("REGRESSION");
        expect(r.out).toMatch(
            /^too small\s+layout-exact\/ms\/iteration \(profiler\) n=1024 \[1k\]\s+0\.424 ms\s+0\.293 ms\s+x1\.45\s+x1\.45/m,
        );
        // what that run was sent to prove, and the reason the row above must not cost it the build
        expect(r.out).toMatch(/^ok\s+pagerank\/pagerank 100 iterations at 100k\/1M\s+42\.997 ms\s+45\.461 ms/m);
        expect(r.out).toMatch(/^ok\s+pagerank\/pagerank 100 iterations at 1M\/10M\s+1053\.540 ms\s+1092\.799 ms/m);

        // the boundary on synthetic rows: 2.5 ms of rise is enough, 2.4 ms is not
        const files = { "gpu-report.json": quiet, [`benchmarks/results/${CLASS}.json`]: out([result("a", 1)]) };
        expect(run({ ...files, [`benchmarks/out/${CLASS}.json`]: out([result("a", 3.5)]) }).status).toBe(1);
        const under = run({ ...files, [`benchmarks/out/${CLASS}.json`]: out([result("a", 3.4)]) });
        expect(under.status).toBe(0);
        expect(under.out).toContain("too small");
        // both halves must clear it: a median that rose 10 ms over a minimum that rose 0.9 ms is still too small
        const halves = run({ ...files, [`benchmarks/out/${CLASS}.json`]: out([result("a", 11, "roundtrip", 1.9)]) });
        expect(halves.status).toBe(0);
        expect(halves.out).toContain("too small");
    });

    it("--class overrides the report's runner class", () => {
        const r = run(
            {
                "gpu-report.json": quiet,
                "benchmarks/out/other.json": out([result("a", 10)]),
                "benchmarks/results/other.json": out([result("a", 1)]),
            },
            ["--class", "other"],
        );
        expect(r.status).toBe(1);
        expect(existsSync(SCRIPT)).toBe(true);
    });
});

/**
 * The spec 7.6 curve (ms per iteration of the exact tile with the FA2 body on the RTX 4070 SUPER) as ladder rows; 7.6
 * has no 1k row, so 0.07 stands in for it (the rule only needs the ordering).
 */
const CURVE_7_6: readonly LadderRow[] = [
    { n: 1024, msPerIteration: 0.07 },
    { n: 4096, msPerIteration: 0.26 },
    { n: 8192, msPerIteration: 0.53 },
    { n: 16384, msPerIteration: 1.13 },
    { n: 32768, msPerIteration: 3.48 },
    { n: 65536, msPerIteration: 8.66 },
];

describe("benchmarks/layout-exact.bench.ts (contract 6.3; spec 7.8, 10.4 T-4)", () => {
    it("the exact ladder is 1k / 4k / 8k / 16k / 32k / 65k in powers of two with E = 10n, plus the 10k frame rung", () => {
        expect(EXACT_LADDER.map((r) => r.nodes)).toEqual([1024, 4096, 8192, 16384, 32768, 65536]);
        expect(EXACT_LADDER.map((r) => r.label)).toEqual(["1k", "4k", "8k", "16k", "32k", "65k"]);
        for (const rung of EXACT_LADDER) {
            expect(floorPow2(rung.nodes)).toBe(rung.nodes);
        }
        expect(LADDER_EDGE_FACTOR).toBe(10);
        expect(FRAME_RUNG).toEqual({ label: "10k", nodes: 10_000 });
        // the seven rungs the group walks share the rung shape (P4's calibrateLayout and layout-grid.bench.ts reuse it)
        const rungs: readonly LadderRung[] = [...EXACT_LADDER, FRAME_RUNG];
        expect(rungs).toHaveLength(7);
        expect(rungs.every((r) => Number.isInteger(r.nodes) && r.nodes >= 1 && r.label.length > 0)).toBe(true);
        expect(EXACT_BUDGET_MS).toBe(4);
        expect(LAYOUT_EXACT_GROUP).toBe("layout-exact");
    });

    it("floorPow2 rounds down to a power of two", () => {
        expect(floorPow2(1)).toBe(1);
        expect(floorPow2(2)).toBe(2);
        expect(floorPow2(3)).toBe(2);
        expect(floorPow2(1024)).toBe(1024);
        expect(floorPow2(10_000)).toBe(8192);
        expect(floorPow2(65_535)).toBe(32768);
        expect(floorPow2(65_536)).toBe(65536);
        expect(() => floorPow2(0)).toThrow(/positive/);
        expect(() => floorPow2(0.5)).toThrow(/positive/);
    });

    it("exactMaxNodesFromLadder without gridRows is the spec 7.8 rule reduced to its budget clause (what G3 applied)", () => {
        // 3.48 <= 4 < 8.66: the largest rung within 4 ms is 32k
        expect(exactMaxNodesFromLadder(CURVE_7_6)).toBe(32768);
        // 0.53 <= 1 < 1.13
        expect(exactMaxNodesFromLadder(CURVE_7_6, 1)).toBe(8192);
        // 0.26 <= 0.5 < 0.53
        expect(exactMaxNodesFromLadder(CURVE_7_6, 0.5)).toBe(4096);
        expect(exactMaxNodesFromLadder(CURVE_7_6, 100)).toBe(65536);
        // the budget is inclusive
        expect(exactMaxNodesFromLadder(CURVE_7_6, 3.48)).toBe(32768);
        // a rung that is not a power of two rounds down
        expect(
            exactMaxNodesFromLadder([
                { n: 10_000, msPerIteration: 0.9 },
                { n: 16384, msPerIteration: 5 },
            ]),
        ).toBe(8192);
        // the order of the rows is irrelevant
        expect(exactMaxNodesFromLadder([...CURVE_7_6].reverse())).toBe(32768);
        expect(() => exactMaxNodesFromLadder([])).toThrow(/no ladder rows/);
        expect(() => exactMaxNodesFromLadder(CURVE_7_6, 0.01)).toThrow(/no rung within 0.01 ms/);
        expect(() => exactMaxNodesFromLadder([{ n: 1024, msPerIteration: Number.NaN }])).toThrow(/finite/);
        expect(() => exactMaxNodesFromLadder([{ n: 1024, msPerIteration: -1 }])).toThrow(/finite/);
    });

    it("exactMaxNodesFromLadder with gridRows applies the grid clause (PD-24): a rung the grid tier beats is no candidate", () => {
        // the grid at 32k faster than the exact 3.48 ms: 32k drops out and the answer falls to 16k
        expect(exactMaxNodesFromLadder(CURVE_7_6, EXACT_BUDGET_MS, [{ n: 32768, msPerIteration: 3.0 }])).toBe(16384);
        // the grid slower at 32k: the budget clause alone decides
        expect(exactMaxNodesFromLadder(CURVE_7_6, EXACT_BUDGET_MS, [{ n: 32768, msPerIteration: 5.0 }])).toBe(32768);
        // a tie keeps the rung (not SLOWER than the grid)
        expect(exactMaxNodesFromLadder(CURVE_7_6, EXACT_BUDGET_MS, [{ n: 32768, msPerIteration: 3.48 }])).toBe(32768);
        // a grid row at an n the exact ladder lacks, or at a rung already over budget, changes nothing
        expect(
            exactMaxNodesFromLadder(CURVE_7_6, EXACT_BUDGET_MS, [
                { n: 100_000, msPerIteration: 1 },
                { n: 65536, msPerIteration: 1 },
            ]),
        ).toBe(32768);
        // an empty gridRows is the budget clause
        expect(exactMaxNodesFromLadder(CURVE_7_6, EXACT_BUDGET_MS, [])).toBe(32768);
        // the grid faster at EVERY rung within budget: no candidate, the owner-decision rule
        expect(() =>
            exactMaxNodesFromLadder(
                CURVE_7_6,
                EXACT_BUDGET_MS,
                CURVE_7_6.map((r) => ({ n: r.n, msPerIteration: r.msPerIteration / 2 })),
            ),
        ).toThrow(/no rung within 4 ms/);
        expect(() =>
            exactMaxNodesFromLadder(CURVE_7_6, EXACT_BUDGET_MS, [{ n: 32768, msPerIteration: Number.NaN }]),
        ).toThrow(/grid row n=32768/);
    });

    it("ladderRowsOf keeps the ms/iteration rows of the six ladder rungs, parses n and sorts by n", () => {
        const rows = ladderRowsOf([
            result("ms/iteration (profiler) n=32768 [32k]", 3.5, LAYOUT_EXACT_GROUP),
            result("step(1) wall n=32768 m=327680 2D [32k]", 4.1, LAYOUT_EXACT_GROUP),
            result("ms/iteration (profiler) n=1024 [1k]", 0.07, LAYOUT_EXACT_GROUP),
            // the frame rung is not a ladder rung
            result("ms/iteration (profiler) n=10000 [10k]", 0.8, LAYOUT_EXACT_GROUP),
            // the wall source is accepted (a device without timestamp-query)
            result("ms/iteration (wall) n=4096 [4k]", 0.3, LAYOUT_EXACT_GROUP),
            // another group's row of the same name is ignored
            result("ms/iteration (profiler) n=8192 [8k]", 0.6, "other-group"),
        ]);
        expect(rows).toEqual([
            { n: 1024, msPerIteration: 0.07 },
            { n: 4096, msPerIteration: 0.3 },
            { n: 32768, msPerIteration: 3.5 },
        ]);
        expect(ladderRowsOf([])).toEqual([]);
    });
});

describe("benchmarks/layout-fr.bench.ts (spec 10.4 T-14; PD-17)", () => {
    it("the group is layout-fr and its rungs are 10k and 100k", () => {
        expect(LAYOUT_FR_GROUP).toBe("layout-fr");
        expect(FR_RUNGS.map((r) => r.nodes)).toEqual([10_000, 100_000]);
        expect(FR_RUNGS.map((r) => r.label)).toEqual(["10k", "100k"]);
    });

    it("the four row-name shapes carry the model tag, the source and the rung label", () => {
        const wall = /^(fr|se) step\(1\) wall n=(\d+) m=(\d+) 2D \[(10k|100k)\]$/;
        const perIteration = /^(fr|se) ms\/iteration \((profiler|wall)\) n=(\d+) \[(10k|100k)\]$/;
        for (const rung of FR_RUNGS) {
            const m = rung.nodes * LADDER_EDGE_FACTOR;
            for (const tag of ["fr", "se"]) {
                expect(`${tag} step(1) wall n=${rung.nodes} m=${m} 2D [${rung.label}]`).toMatch(wall);
                expect(`${tag} ms/iteration (profiler) n=${rung.nodes} [${rung.label}]`).toMatch(perIteration);
                expect(`${tag} ms/iteration (wall) n=${rung.nodes} [${rung.label}]`).toMatch(perIteration);
            }
        }
        // the layout-exact rows do not match the tagged shapes and vice versa
        expect("step(1) wall n=10000 m=100000 2D [10k]").not.toMatch(wall);
        expect("fr step(1) wall n=10000 m=100000 2D [10k]").not.toMatch(/^step\(1\) wall /);
    });

    it("reportedRow records the group it is given", () => {
        const samples = [9, 3, 1, 2];
        const row = reportedRow(LAYOUT_FR_GROUP, "fr ms/iteration (profiler) n=10000 [10k]", samples, 3, 10, "pairs");
        expect(row.group).toBe(LAYOUT_FR_GROUP);
        expect(row.name).toBe("fr ms/iteration (profiler) n=10000 [10k]");
        // the warm-up sample (the first) is dropped
        expect(row.medianMs).toBe(2);
        expect(row.minMs).toBe(1);
        expect(row.maxMs).toBe(3);
        expect(row.runs).toBe(3);
        expect(row.rateUnit).toBe("pairs/s");
        expect(reportedRow(LAYOUT_EXACT_GROUP, "x", samples, 3, 10, "pairs").group).toBe(LAYOUT_EXACT_GROUP);
        expect(() => reportedRow(LAYOUT_FR_GROUP, "x", [1, 2], 3, 10, "pairs")).toThrow(/expected 4 samples/);
        expect(() => reportedRow(LAYOUT_FR_GROUP, "x", [1, Number.NaN, 2, 3], 3, 10, "pairs")).toThrow(/non-finite/);
    });
});

describe("benchmarks/layout-grid.bench.ts (spec 10.4 T-6 / T-7, 7.8; PD-24)", () => {
    it("the group is layout-grid and its ladder is 32k / 65k / 100k / 262k / 1M in 2D and 3D", () => {
        expect(LAYOUT_GRID_GROUP).toBe("layout-grid");
        expect(GRID_LADDER.map((r) => r.nodes)).toEqual([32768, 65536, 100_000, 262_144, 1_000_000]);
        expect(GRID_LADDER.map((r) => r.label)).toEqual(["32k", "65k", "100k", "262k", "1M"]);
        expect(GRID_DIMS).toEqual([2, 3]);
        expect(ATTRACTION_RUNG).toEqual({ label: "1M", nodes: 1_000_000 });
        // the two rungs the exact ladder shares, so the 7.8 re-check has its rows
        expect(EXACT_LADDER.filter((r) => GRID_LADDER.some((g) => g.nodes === r.nodes)).map((r) => r.nodes)).toEqual([
            32768, 65536,
        ]);
        // the re-check rungs: the exact ladder's other rungs, in 2D only, so the grid clause has a row at every exact rung
        expect(RECHECK_RUNGS.map((r) => r.nodes)).toEqual([1024, 4096, 8192, 16384]);
        expect(RECHECK_RUNGS.map((r) => r.label)).toEqual(["1k", "4k", "8k", "16k"]);
        expect([...RECHECK_RUNGS, ...GRID_LADDER.slice(0, 2)].map((r) => r.nodes)).toEqual(
            EXACT_LADDER.map((r) => r.nodes),
        );
    });

    it("the row-name shapes carry the grid tag, the source, the dimension and the rung label; the attraction row the profiler", () => {
        const wall = /^grid step\(1\) wall n=(\d+) m=(\d+) (2|3)D \[(1k|4k|8k|16k|32k|65k|100k|262k|1M)\]$/;
        const perIteration =
            /^grid ms\/iteration \((profiler|wall)\) n=(\d+) (2|3)D \[(1k|4k|8k|16k|32k|65k|100k|262k|1M)\]$/;
        for (const rung of GRID_LADDER) {
            const m = rung.nodes * LADDER_EDGE_FACTOR;
            for (const dim of GRID_DIMS) {
                expect(`grid step(1) wall n=${rung.nodes} m=${m} ${dim}D [${rung.label}]`).toMatch(wall);
                expect(`grid ms/iteration (profiler) n=${rung.nodes} ${dim}D [${rung.label}]`).toMatch(perIteration);
                expect(`grid ms/iteration (wall) n=${rung.nodes} ${dim}D [${rung.label}]`).toMatch(perIteration);
            }
        }
        for (const rung of RECHECK_RUNGS) {
            const m = rung.nodes * LADDER_EDGE_FACTOR;
            expect(`grid step(1) wall n=${rung.nodes} m=${m} 2D [${rung.label}]`).toMatch(wall);
            expect(`grid ms/iteration (profiler) n=${rung.nodes} 2D [${rung.label}]`).toMatch(perIteration);
        }
        expect("attraction ms/iteration (profiler) n=1000000 [1M]").toMatch(
            /^attraction ms\/iteration \(profiler\) n=1000000 \[1M\]$/,
        );
        // the layout-exact rows do not match the grid shapes and vice versa
        expect("step(1) wall n=32768 m=327680 2D [32k]").not.toMatch(wall);
        expect("grid step(1) wall n=32768 m=327680 2D [32k]").not.toMatch(/^step\(1\) wall /);
    });

    it("gridLadderRowsOf keeps the ms/iteration rows of the asked dimension, parses n and sorts by n", () => {
        const rows = [
            result("grid ms/iteration (profiler) n=65536 2D [65k]", 4.2, LAYOUT_GRID_GROUP),
            result("grid step(1) wall n=65536 m=655360 2D [65k]", 4.9, LAYOUT_GRID_GROUP),
            result("grid ms/iteration (profiler) n=32768 2D [32k]", 3.1, LAYOUT_GRID_GROUP),
            result("grid ms/iteration (profiler) n=32768 3D [32k]", 6.5, LAYOUT_GRID_GROUP),
            // a re-check rung (an exact-ladder n the grid ladder lacks) is a ladder row too
            result("grid ms/iteration (profiler) n=4096 2D [4k]", 0.2, LAYOUT_GRID_GROUP),
            // an n on neither ladder is not
            result("grid ms/iteration (profiler) n=2048 2D [2k]", 0.19, LAYOUT_GRID_GROUP),
            // the wall source is accepted (a device without timestamp-query)
            result("grid ms/iteration (wall) n=1000000 2D [1M]", 40, LAYOUT_GRID_GROUP),
            // the attraction row and another group's row are ignored
            result("attraction ms/iteration (profiler) n=1000000 [1M]", 5, LAYOUT_GRID_GROUP),
            result("grid ms/iteration (profiler) n=100000 2D [100k]", 6, "other-group"),
        ];
        expect(gridLadderRowsOf(rows, 2)).toEqual([
            { n: 4096, msPerIteration: 0.2 },
            { n: 32768, msPerIteration: 3.1 },
            { n: 65536, msPerIteration: 4.2 },
            { n: 1_000_000, msPerIteration: 40 },
        ]);
        expect(gridLadderRowsOf(rows, 3)).toEqual([{ n: 32768, msPerIteration: 6.5 }]);
        expect(gridLadderRowsOf([], 2)).toEqual([]);
        // the re-check of spec 7.8 over one session: the exact rows and the grid 2D rows through one function
        const exact = ladderRowsOf([
            result("ms/iteration (profiler) n=4096 [4k]", 0.26, LAYOUT_EXACT_GROUP),
            result("ms/iteration (profiler) n=16384 [16k]", 1.1, LAYOUT_EXACT_GROUP),
            result("ms/iteration (profiler) n=32768 [32k]", 3.5, LAYOUT_EXACT_GROUP),
            result("ms/iteration (profiler) n=65536 [65k]", 8.4, LAYOUT_EXACT_GROUP),
        ]);
        // 16k has no grid row here, so the budget clause alone keeps it; 4k's grid row (0.2 < 0.26) would exclude 4k
        expect(exactMaxNodesFromLadder(exact, EXACT_BUDGET_MS, gridLadderRowsOf(rows, 2))).toBe(16384);
        // with a grid row at 16k that beats it, the answer falls past 4k (also beaten) to nothing: the owner-decision rule
        expect(() =>
            exactMaxNodesFromLadder(exact, EXACT_BUDGET_MS, [
                ...gridLadderRowsOf(rows, 2),
                { n: 16384, msPerIteration: 0.25 },
            ]),
        ).toThrow(/no rung within 4 ms/);
    });
});

describe("benchmarks/layout-run.ts (contract 6.3)", () => {
    it("parseLayoutRunArgs: the two required sizes and the five defaults", () => {
        expect(parseLayoutRunArgs(["--nodes", "100000", "--edges", "1000000"])).toEqual({
            nodes: 100_000,
            edges: 1_000_000,
            iterations: 100,
            batch: 8,
            seed: 1,
            dim: 2,
            compat: "paper",
            repulsion: "auto",
        });
        expect(
            parseLayoutRunArgs([
                "--edges",
                "20",
                "--nodes",
                "10",
                "--iterations",
                "5",
                "--batch",
                "2",
                "--seed",
                "7",
                "--dim",
                "3",
                "--compat",
                "networkx",
                "--repulsion",
                "grid",
            ]),
        ).toEqual({
            nodes: 10,
            edges: 20,
            iterations: 5,
            batch: 2,
            seed: 7,
            dim: 3,
            compat: "networkx",
            repulsion: "grid",
        });
        expect(parseLayoutRunArgs(["--nodes", "10", "--edges", "1", "--repulsion", "exact"]).repulsion).toBe("exact");
        expect(() => parseLayoutRunArgs(["--nodes", "10", "--edges", "1", "--repulsion", "fast"])).toThrow(
            /--repulsion expects exact, grid or auto/,
        );
        expect(() => parseLayoutRunArgs([])).toThrow(/--nodes N is required/);
        expect(() => parseLayoutRunArgs(["--nodes", "10"])).toThrow(/--edges M is required/);
        expect(() => parseLayoutRunArgs(["--nodes", "0", "--edges", "1"])).toThrow(/--nodes expects an integer >= 1/);
        expect(() => parseLayoutRunArgs(["--nodes", "10", "--edges", "-1"])).toThrow(/--edges expects an integer >= 0/);
        expect(() => parseLayoutRunArgs(["--nodes", "10", "--edges", "1", "--dim", "4"])).toThrow(
            /--dim expects 2 or 3/,
        );
        expect(() => parseLayoutRunArgs(["--nodes", "10", "--edges", "1", "--compat", "port"])).toThrow(
            /--compat expects paper or networkx/,
        );
        expect(() => parseLayoutRunArgs(["--nodes", "10", "--edges", "1", "--batch", "0"])).toThrow(
            /--batch expects an integer >= 1/,
        );
        expect(() => parseLayoutRunArgs(["--nodes", "10", "--edges", "1", "--iterations", "x"])).toThrow(
            /--iterations expects an integer >= 1/,
        );
        expect(() => parseLayoutRunArgs(["--nodes", "10", "--edges", "1", "--bogus"])).toThrow(
            /unknown option --bogus/,
        );
        expect(() => parseLayoutRunArgs(["--nodes", "10", "--edges", "1", "extra"])).toThrow(
            /unexpected argument extra/,
        );
        expect(() => parseLayoutRunArgs(["--nodes"])).toThrow(/--nodes expects an integer >= 1, got undefined/);
    });

    it("metricsText prints the spread, the edge-length quantiles and the sampled nearest-neighbour histogram", () => {
        const s = snapshotOf(KARATE_EDGES, { label: "karate" });
        const positions = new Float32Array(3 * 34);
        for (let i = 0; i < 34; i++) {
            positions[3 * i] = i;
            positions[3 * i + 1] = (i * 7) % 5;
        }
        const text = metricsText(s, positions, 2);
        expect(text).toMatch(
            /^metrics: spread=33\.0000 edgeQ10=[\d.]+ edgeQ50=[\d.]+ edgeQ90=[\d.]+ nnBins\(1 in 32 nodes\)=\[/,
        );
        // 34 nodes sampled every 32nd: two nodes (0 and 32), each the other's nearest neighbour at the mean distance
        expect(text).toContain(
            "nnBins(1 in 32 nodes)=[0.0000, 0.0000, 0.0000, 0.0000, 1.0000, 0.0000, 0.0000, 0.0000]",
        );
    });

    it("checkLayoutResult: finite positions and a settled or exhausted run pass; anything else names the problem", () => {
        const good = new Float32Array([0, 1, 0, 2, 3, 0]);
        expect(checkLayoutResult(good, 2, 50, true, 100)).toEqual({ ok: true, problems: [] });
        expect(checkLayoutResult(good, 2, 100, false, 100)).toEqual({ ok: true, problems: [] });
        expect(checkLayoutResult(good, 2, 50, false, 100)).toEqual({
            ok: false,
            problems: ["the run ended after 50 of 100 iterations without settling"],
        });
        expect(checkLayoutResult(good, 2, 0, false, 100).problems).toEqual([
            "the run ended after 0 of 100 iterations without settling",
        ]);
        const bad = new Float32Array([0, 1, 0, Number.NaN, 3, Number.POSITIVE_INFINITY]);
        expect(checkLayoutResult(bad, 2, 100, false, 100)).toEqual({
            ok: false,
            problems: ["2 non-finite position components (first at node 1, component 0)"],
        });
        expect(checkLayoutResult(good, 3, 100, false, 100)).toEqual({
            ok: false,
            problems: ["positions has 6 components, expected 9 (3 x 3 nodes)"],
        });
        // both problems are reported, the length one first
        expect(checkLayoutResult(good, 3, 1, false, 100).problems).toEqual([
            "positions has 6 components, expected 9 (3 x 3 nodes)",
            "the run ended after 1 of 100 iterations without settling",
        ]);
    });
});

describe("benchmarks/attraction-scale.bench.ts (the G4-F16 diagnostic)", () => {
    it("the group is attraction-scale and its ladder doubles the gather's working set from 0.25 to 64 MiB", () => {
        expect(ATTRACTION_SCALE_GROUP).toBe("attraction-scale");
        expect(POSITION_BYTES_PER_NODE).toBe(16);
        expect(ATTRACTION_LADDER.map((r) => r.nodes)).toEqual([
            16_384, 65_536, 262_144, 524_288, 1_048_576, 2_097_152, 4_194_304,
        ]);
        expect(ATTRACTION_LADDER.map((r) => (r.nodes * POSITION_BYTES_PER_NODE) / (1024 * 1024))).toEqual([
            0.25, 1, 4, 8, 16, 32, 64,
        ]);
        // the ladder brackets the Tesla T4's 4 MiB of L2 on both sides, which is what the ratio curve is read against
        expect(ATTRACTION_LADDER.filter((r) => (r.nodes * POSITION_BYTES_PER_NODE) / (1024 * 1024) < 4)).toHaveLength(
            2,
        );
    });

    it("the row names are the group's own, so none collides with a layout-grid row of the same rung", () => {
        const rung = ATTRACTION_LADDER[4];
        const m = rung.nodes * LADDER_EDGE_FACTOR;
        expect(`scale step(1) wall n=${rung.nodes} m=${m} 2D [${rung.label}]`).not.toMatch(/^grid step\(1\) wall /);
        expect(`scale attraction ms/iteration (profiler) n=${rung.nodes} 2D [${rung.label}]`).not.toMatch(
            /^attraction ms\/iteration /,
        );
        // the 1M rungs differ too: layout-grid's is 1,000,000 nodes, this ladder's is 2^20
        expect(rung.nodes).not.toBe(GRID_LADDER[4].nodes);
    });
});
