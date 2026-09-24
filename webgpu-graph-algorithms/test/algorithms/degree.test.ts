/**
 * The walking-skeleton algorithm (spec 11.5, 3.3; contract 3.12, 5.5): degree(ctx, s) equals outDegreeOracle bitwise on
 * every named fixture, the empty / one-node / arcCount-0 / directed / parallel cases, honours dest / signal /
 * onProgress, runs twice bitwise, on the arena AND the per-array path, through the row-window leg, and writes /
 * compares the cross-adapter noise fixture (u32 bitwise). Plus the CPU tests of the noise-floor helpers.
 */

import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";

import { degree } from "../../src/algorithms/degree.js";
import { WebGpuGraphError } from "../../src/errors.js";
import { type GraphResidency } from "../../src/memory/residency.js";
import { type GpuCaps } from "../../src/types/context.js";
import {
    type ArcWindowSpec,
    degreeFakedLimitRun,
    type DegreeRun,
    degreeRun,
    degreeWindowedRun,
    windowsOf,
    withResidency,
} from "../helpers/degree-check.js";
import { csrSnapshotOf, fixture, FIXTURE_NAMES, KARATE_EDGES, snapshotOf } from "../helpers/graphs.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import {
    adapterClass,
    noiseFixturePath,
    noiseFloorFor,
    type NoiseRow,
    readNoiseFixtures,
    recordNoiseRow,
    writeNoiseFixture,
} from "../helpers/noise-floor.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { outDegreeOracle } from "../oracle/degree.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const KARATE_UNDIRECTED = [
    16, 9, 10, 6, 3, 4, 4, 4, 5, 2, 3, 1, 2, 5, 2, 2, 2, 2, 2, 3, 2, 2, 2, 5, 3, 3, 2, 4, 3, 4, 4, 6, 12, 17,
];
const KARATE_DIRECTED = [
    16, 8, 8, 3, 2, 3, 1, 0, 3, 1, 0, 0, 0, 1, 2, 2, 0, 0, 2, 1, 2, 0, 2, 5, 3, 1, 2, 1, 2, 2, 2, 2, 1, 0,
];

/**
 * A seeded G(n, m) with parallels and self-loops (an LCG over typed arrays: 10n edges at n = 2^20 must not go through
 * a tuple list) plus one star of `leaves` leaves on node 0, undirected: the hub row is node 0.
 * @param n - the node count
 * @param m - the random edge count
 * @param leaves - the star's leaves (nodes 1..leaves)
 * @param seed - the generator seed
 * @returns the snapshot
 */
function hubbedRandom(n: number, m: number, leaves: number, seed: number): GraphSnapshot {
    const src = new Uint32Array(m + leaves);
    const dst = new Uint32Array(m + leaves);
    let state = seed >>> 0;
    const next = (): number => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state;
    };
    for (let e = 0; e < m; e++) {
        src[e] = next() % n;
        dst[e] = next() % n;
    }
    for (let i = 0; i < leaves; i++) {
        src[m + i] = 0;
        dst[m + i] = 1 + (i % (n - 1));
    }
    return fromEdgeArrays({ directed: false, nodeCount: n, src, dst }, { label: `hubbed-random-${n}` });
}

describe("degree (spec 3.3, 11.5): the walking-skeleton algorithm", () => {
    it("equals outDegreeOracle bitwise on every named fixture, twice, and release() leaves no buffers", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        try {
            expect(FIXTURE_NAMES.length).toBeGreaterThanOrEqual(10);
            for (const name of FIXTURE_NAMES) {
                const { snapshot } = fixture(name);
                const run: DegreeRun = await degreeRun(ctx, snapshot, name);
                assertCheckPasses(run.report);
                expectBitwiseEqual(run.result, run.expected, name);
                const again = await degree(ctx, snapshot);
                expectBitwiseEqual(again, run.result, `${name} twice`);
                expect(again).toBeInstanceOf(Uint32Array);
                expect(again.buffer).toBeInstanceOf(ArrayBuffer);
                expect(again.length).toBe(snapshot.nodeCount);
                ctx.release(snapshot);
            }
            expect(ctx.residency.stats().buffers).toBe(0);
        } finally {
            ctx.dispose();
        }
    });

    it("karate: the hand-computed undirected and directed sequences", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        try {
            const undirected = await degree(ctx, snapshotOf(KARATE_EDGES));
            expect(Array.from(undirected)).toEqual(KARATE_UNDIRECTED);
            const directed = await degree(ctx, snapshotOf(KARATE_EDGES, { directed: true }));
            expect(Array.from(directed)).toEqual(KARATE_DIRECTED);
        } finally {
            ctx.dispose();
        }
    });

    it("nodeCount 0 returns an empty result without touching the device; arcCount 0 returns zeros with only rowPtr resident", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        try {
            const empty = snapshotOf([], { nodeCount: 0 });
            expect(empty.nodeCount).toBe(0);
            const r0 = await degree(ctx, empty);
            expect(r0.length).toBe(0);
            expect(ctx.residency.stats().snapshots).toBe(0);

            const lonely = snapshotOf([], { nodeCount: 5 });
            expect(lonely.arcCount).toBe(0);
            const r5 = await degree(ctx, lonely);
            expect(Array.from(r5)).toEqual([0, 0, 0, 0, 0]);
            const stats = ctx.residency.stats();
            expect(stats.snapshots).toBe(1);
            expect(stats.buffers).toBe(1);

            const one = fixture("one").snapshot;
            expect(Array.from(await degree(ctx, one))).toEqual([0]);
        } finally {
            ctx.dispose();
        }
    });

    it("honours dest and returns it; a wrong dest is E_INVALID_ARGUMENT before any work", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        try {
            const s = snapshotOf(KARATE_EDGES);
            const dest = new Uint32Array(s.nodeCount);
            const result = await degree(ctx, s, { dest });
            expect(result).toBe(dest);
            expect(Array.from(dest)).toEqual(KARATE_UNDIRECTED);

            await expect(degree(ctx, s, { dest: new Uint32Array(s.nodeCount - 1) })).rejects.toMatchObject({
                code: "E_INVALID_ARGUMENT",
                details: { argument: "dest" },
            });
            await expect(degree(ctx, s, { dest: new Float32Array(s.nodeCount) })).rejects.toMatchObject({
                code: "E_INVALID_ARGUMENT",
            });
            const shared = new Uint32Array(new SharedArrayBuffer(s.nodeCount * 4));
            await expect(degree(ctx, s, { dest: shared })).rejects.toMatchObject({ code: "E_INVALID_ARGUMENT" });
            // nodeCount 0 with a zero-length dest returns that dest
            const emptyDest = new Uint32Array(0);
            expect(await degree(ctx, snapshotOf([], { nodeCount: 0 }), { dest: emptyDest })).toBe(emptyDest);
        } finally {
            ctx.dispose();
        }
    });

    it("a pre-aborted signal is E_ABORTED before any GPU work; onProgress reports (1, 1) once", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        try {
            const s = snapshotOf(KARATE_EDGES);
            const controller = new AbortController();
            controller.abort();
            await expect(degree(ctx, s, { signal: controller.signal })).rejects.toMatchObject({ code: "E_ABORTED" });
            expect(ctx.residency.stats().snapshots).toBe(0);

            const calls: [number, number][] = [];
            await degree(ctx, s, {
                onProgress: (done, total) => {
                    calls.push([done, total]);
                },
            });
            expect(calls).toEqual([[1, 1]]);
            const empty: [number, number][] = [];
            await degree(ctx, snapshotOf([], { nodeCount: 0 }), {
                onProgress: (done, total) => {
                    empty.push([done, total]);
                },
            });
            expect(empty).toEqual([[1, 1]]);
        } finally {
            ctx.dispose();
        }
    });

    it("the G4 item: windowed degree at a faked 1 MiB binding limit (>= 8 windows) with a hub row longer than a window equals outDegree() bitwise, twice", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        try {
            const scale = gpuScale();
            const limit = Math.max(256, 256 * Math.round((2 ** 20 * scale) / 256));
            // the planner needs rowPtr inside the binding too: the largest row count whose rowPtr fits (262,143 at 1 MiB)
            const n = limit / 4 - 1;
            const leaves = Math.ceil(300_000 * scale);
            const s = hubbedRandom(n, 10 * n, leaves, 20);
            expect(s.nodeCount).toBe(n);
            const first = await degreeFakedLimitRun(ctx, s, limit, "degree-faked-limit");
            expect(first.windows.length).toBeGreaterThanOrEqual(8);
            const hubWindows = first.windows.filter((w) => w.rowFirst <= 0 && w.rowLast >= 0);
            expect(hubWindows.length).toBeGreaterThanOrEqual(2);
            expect(first.run.expected[0]).toBeGreaterThan(limit / 4);
            const second = await degreeFakedLimitRun(ctx, s, limit, "degree-faked-limit-again");
            expectBitwiseEqual(second.run.result, first.run.result, "windowed degree twice");
            assertCheckPasses(first.run.report);
            expectBitwiseEqual(first.run.result, first.run.expected, "windowed degree vs outDegree()");
            expectBitwiseEqual(first.run.result, s.outDegree(), "windowed degree vs snapshot.outDegree()");
            expect(ctx.residency.stats().snapshots).toBe(0);
            // the faked residency destroyed its window buffers; what remains live is the pool's idle scratch
            ctx.pool.trim();
            expect(ctx.allocator.liveBuffers).toBe(0);
        } finally {
            ctx.dispose();
        }
    });

    it("an error thrown by the residency passes through untouched (E_RELEASED)", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        try {
            const s = snapshotOf(KARATE_EDGES);
            const released = new WebGpuGraphError("E_RELEASED", "snapshot 1 was released", { serial: 1 });
            const fakeResidency = {
                core: (): never => {
                    throw released;
                },
            };
            const proxied = withResidency(ctx, fakeResidency as unknown as GraphResidency);
            await expect(degree(proxied, s)).rejects.toBe(released);
            expect(ctx.residency.stats().snapshots).toBe(0);
        } finally {
            ctx.dispose();
        }
    });

    it("a fromCsr snapshot (perArray) equals the arena path", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        try {
            const arena = snapshotOf(KARATE_EDGES);
            const csr = csrSnapshotOf(KARATE_EDGES);
            expect(csr.arena).toBeNull();
            const a = await degree(ctx, arena);
            const b = await degree(ctx, csr);
            expect(ctx.residency.core(arena).plan).toBe("arena");
            expect(ctx.residency.core(csr).plan).toBe("perArray");
            expectBitwiseEqual(a, b, "arena vs perArray");
            expectBitwiseEqual(b, outDegreeOracle(csr), "perArray vs oracle");
        } finally {
            ctx.dispose();
        }
    });

    it("windowsOf splits karate's 156 arcs into [0,64) rows 0-10, [64,128) rows 10-32, [128,156) rows 32-33", () => {
        const s = snapshotOf(KARATE_EDGES);
        expect(s.arcCount).toBe(156);
        const windows: ArcWindowSpec[] = windowsOf(s.rowPtr, s.nodeCount, s.arcCount, 64);
        expect(windows).toEqual([
            { start: 0, end: 64, rowFirst: 0, rowLast: 10 },
            { start: 64, end: 128, rowFirst: 10, rowLast: 32 },
            { start: 128, end: 156, rowFirst: 32, rowLast: 33 },
        ]);
        expect(windowsOf(new Uint32Array([0]), 0, 0, 64)).toEqual([]);
        expect(windowsOf(new Uint32Array([0, 0, 0]), 2, 0, 64)).toEqual([]);
    });

    it("the row-window dispatch (arcBase != 0, accumulate = 1) equals the oracle on karate and on a hub row split across windows", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        try {
            const karate = await degreeWindowedRun(ctx, snapshotOf(KARATE_EDGES), 64, "windowed/karate");
            assertCheckPasses(karate.report);
            expect(Array.from(karate.result)).toEqual(KARATE_UNDIRECTED);
            const star = fixture("star200", 1).snapshot;
            expect(outDegreeOracle(star)[0]).toBeGreaterThanOrEqual(128);
            const hub = await degreeWindowedRun(ctx, star, 64, "windowed/star200");
            assertCheckPasses(hub.report);
            expectBitwiseEqual(hub.result, hub.expected, "windowed star200");
        } finally {
            ctx.dispose();
        }
    });

    it("writes this adapter's raw degree output for random1k as a noise fixture and matches every committed adapter bitwise (u32)", async (t) => {
        requireGpu(t);
        const ctx = await acquire();
        try {
            const { snapshot } = fixture("random1k", 1);
            expect(snapshot.nodeCount).toBe(1000);
            const result = await degree(ctx, snapshot);
            expectBitwiseEqual(result, outDegreeOracle(snapshot), "random1k");
            const cls = adapterClass(ctx.caps);
            writeNoiseFixture("degree", "random1k", cls, result, "u32");
            if (process.env.GRAPHTY_NOISE_FLOOR_WRITE === "1") {
                expect(existsSync(noiseFixturePath("degree", "random1k", cls))).toBe(true);
            }
            const committed = readNoiseFixtures("degree", "random1k");
            let other: string | null = null;
            for (const entry of committed) {
                expect(entry.dtype, entry.adapterClass).toBe("u32");
                expect(Array.from(entry.values), `degree random1k: ${cls} vs ${entry.adapterClass}`).toEqual(
                    Array.from(result),
                );
                if (entry.adapterClass !== cls) {
                    other = entry.adapterClass;
                }
            }
            if (other !== null) {
                const row: NoiseRow = {
                    id: "degree.cross",
                    kernel: "degree",
                    fixture: "random1k",
                    comparison: "cross-adapter",
                    a: cls,
                    b: other,
                    maxRelError: 0,
                    maxAbsError: 0,
                    samples: result.length,
                };
                recordNoiseRow(row);
            }
        } finally {
            ctx.dispose();
        }
    });
});

describe("noise-floor helpers (Node)", () => {
    it("noiseFixturePath lives under test/fixtures/noise (GRAPHTY_NOISE_DIR unset) and sanitises every segment like the 2.5 command", () => {
        expect(process.env.GRAPHTY_NOISE_DIR).toBeUndefined();
        const p = noiseFixturePath("degree", "random1k", "nvidia-lovelace-node");
        expect(p.replace(/\\/g, "/")).toMatch(/\/test\/fixtures\/noise\/degree-random1k-nvidia-lovelace-node\.json$/);
        expect(noiseFixturePath("a b", "c/d", "e:f")).toMatch(/a_b-c_d-e_f\.json$/);
    });

    it("writeNoiseFixture is a no-op unless GRAPHTY_NOISE_FLOOR_WRITE=1, and round-trips atomically through readNoiseFixtures when it is (in a temporary GRAPHTY_NOISE_DIR)", () => {
        // hermetic: the committed test/fixtures/noise is never touched, so a parallel fork reading it sees no foreign file
        const previousWrite = process.env.GRAPHTY_NOISE_FLOOR_WRITE;
        const previousDir = process.env.GRAPHTY_NOISE_DIR;
        const dir = mkdtempSync(join(tmpdir(), "noise-"));
        try {
            process.env.GRAPHTY_NOISE_DIR = dir;
            const path = noiseFixturePath("zz-unit", "roundtrip", "fake-vendor-arch-node");
            expect(path).toBe(join(dir, "zz-unit-roundtrip-fake-vendor-arch-node.json"));

            delete process.env.GRAPHTY_NOISE_FLOOR_WRITE;
            writeNoiseFixture("zz-unit", "roundtrip", "fake-vendor-arch-node", Float32Array.from([1, 2.5, 3]), "f32");
            expect(existsSync(path)).toBe(false);
            expect(readNoiseFixtures("zz-unit", "roundtrip")).toEqual([]);

            process.env.GRAPHTY_NOISE_FLOOR_WRITE = "1";
            writeNoiseFixture(
                "zz-unit",
                "roundtrip",
                "fake-vendor-arch-node",
                Float32Array.from([1, 2.5, 0.30000001192092896]),
                "f32",
            );
            expect(existsSync(path)).toBe(true);
            // atomic: no .tmp left behind, and the directory holds exactly the one .json
            expect(readdirSync(dir)).toEqual(["zz-unit-roundtrip-fake-vendor-arch-node.json"]);
            const read = readNoiseFixtures("zz-unit", "roundtrip");
            expect(read.length).toBe(1);
            expect(read[0].adapterClass).toBe("fake-vendor-arch-node");
            expect(read[0].dtype).toBe("f32");
            expect(Array.from(read[0].values)).toEqual([1, 2.5, 0.30000001192092896]);
            // another fixture name of the same kernel is not picked up
            expect(readNoiseFixtures("zz-unit", "roundtrip-other")).toEqual([]);
            // a second write replaces the file in place
            writeNoiseFixture("zz-unit", "roundtrip", "fake-vendor-arch-node", Uint32Array.from([7]), "u32");
            expect(readdirSync(dir)).toEqual(["zz-unit-roundtrip-fake-vendor-arch-node.json"]);
            expect(readNoiseFixtures("zz-unit", "roundtrip")[0].dtype).toBe("u32");
        } finally {
            if (previousWrite === undefined) {
                delete process.env.GRAPHTY_NOISE_FLOOR_WRITE;
            } else {
                process.env.GRAPHTY_NOISE_FLOOR_WRITE = previousWrite;
            }
            if (previousDir === undefined) {
                delete process.env.GRAPHTY_NOISE_DIR;
            } else {
                process.env.GRAPHTY_NOISE_DIR = previousDir;
            }
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("noiseFloorFor throws for an id without a committed floor", () => {
        expect(() => noiseFloorFor("zz-unit.no-such-tolerance")).toThrow(/noise floor/);
    });

    it("adapterClass is <vendor>-<architecture>-<runtime>", () => {
        const caps = { vendor: "google", architecture: "swiftshader", runtime: "browser" } as unknown as GpuCaps;
        expect(adapterClass(caps)).toBe("google-swiftshader-browser");
        const dawn = { vendor: "mesa", architecture: "software", runtime: "node" } as unknown as GpuCaps;
        expect(adapterClass(dawn)).toBe("mesa-software-node");
    });
});
