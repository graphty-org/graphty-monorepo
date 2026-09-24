/**
 * The spmvPull differential test (spec 6 row 9, 8.2, 11.3, 11.9 item 4; M8b-T4): the oracle's hand-computed pins,
 * every named fixture and a row-count ladder vs spmvPullOracle, twice bitwise, a directed weighted snapshot, the
 * zero-weight arcs of `parallel`, the personalization and dangling legs, the grid-stride loop above the group cap,
 * the ViewBinding -> CoreBinding seam (coreOfView) and the `weights: null` seam of T5 / T6, the P7 rejections
 * (tiers, windowed cores, a malformed rowPtr), the no-subgroups twin in-process, and the pull over random1k as the
 * cross-adapter noise fixture compared within the derived floor.
 */

import { type F32, type GraphSnapshot } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { algorithmScope } from "../../src/algorithms/scope.js";
import { UNIFORM_SLOT_BYTES } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError, type WebGpuGraphError } from "../../src/errors.js";
import { planGridStride } from "../../src/kernel/dispatch.js";
import { SPMV_PARAMS } from "../../src/kernels.js";
import { type CoreBinding } from "../../src/memory/residency.js";
import { coreOfView } from "../../src/primitives/core-shape.js";
import { type DegreeTiers } from "../../src/primitives/segmented-reduce.js";
import { prepareSpmvPull, type SpmvCoefficients, type SpmvPullOptions } from "../../src/primitives/spmv.js";
import { withContext } from "../helpers/device.js";
import { fixture, FIXTURE_NAMES, snapshotOf } from "../helpers/graphs.js";
import { expectAllClose, expectBitwiseEqual, maxRelError } from "../helpers/matchers.js";
import {
    adapterClass,
    noiseFloorFor,
    readNoiseFixtures,
    recordNoiseRow,
    writeNoiseFixture,
} from "../helpers/noise-floor.js";
import { maxAbsError, SR_ABS_FLOOR, weightedRandom } from "../helpers/segmented-reduce.js";
import { reverseCore, runSpmvPull, seededVector, spmvTolerance, weightedDirected } from "../helpers/spmv.js";
import { type SpmvOracleCoefficients, spmvPullOracle } from "../oracle/spmv.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

/** The PageRank-shaped coefficients of the plain runs (alpha the damping, beta 1 - alpha, the uniform mass 1 / n). */
function pageRankCoefficients(n: number): SpmvCoefficients {
    return { alpha: 0.85, beta: 0.15, uniformP: n === 0 ? 0 : 1 / n };
}

/** The oracle input of an f32 vector. */
function f64(values: F32): Float64Array {
    return Float64Array.from(values);
}

/** Awaits a rejection and asserts its code; returns the error for detail assertions. */
async function expectRejection(promise: Promise<unknown>, code: string): Promise<WebGpuGraphError> {
    let caught: unknown = null;
    try {
        await promise;
    } catch (err) {
        caught = err;
    }
    expect(isWebGpuGraphError(caught)).toBe(true);
    const error = caught as WebGpuGraphError;
    expect(error.code).toBe(code);
    return error;
}

/** Runs fn and returns the error it throws, asserting the code. */
function expectThrow(fn: () => unknown, code: string): WebGpuGraphError {
    let caught: unknown = null;
    try {
        fn();
    } catch (err) {
        caught = err;
    }
    expect(isWebGpuGraphError(caught)).toBe(true);
    const error = caught as WebGpuGraphError;
    expect(error.code).toBe(code);
    return error;
}

describe("spmvPullOracle (pure)", () => {
    // directed: 0 -> 1 (2), 2 -> 1 (3), 1 -> 0 (0.5); reverse rows 0 <- [1], 1 <- [0, 2], 2 <- []
    const s = snapshotOf(
        [
            [0, 1, 2],
            [2, 1, 3],
            [1, 0, 0.5],
        ],
        { directed: true, weighted: true },
    );
    const x = Float64Array.from([1, 2, 3]);

    it("a pure SpMV (alpha 1, beta 0, no masses) is the weighted in-sum over xNorm", () => {
        expect(Array.from(spmvPullOracle(s, x, { alpha: 1, beta: 0, uniformP: 0, dangling: 0 }))).toEqual([1, 11, 0]);
    });

    it("beta, the uniform mass and the dangling mass enter every row, including one without in-arcs", () => {
        const c: SpmvOracleCoefficients = { alpha: 0.5, beta: 0.5, uniformP: 1, dangling: 2 };
        expect(Array.from(spmvPullOracle(s, x, c))).toEqual([2, 7, 1.5]);
    });

    it("a personalization vector replaces the uniform mass row by row", () => {
        const c: SpmvOracleCoefficients = { alpha: 0.5, beta: 0.5, uniformP: 1, dangling: 2 };
        expect(Array.from(spmvPullOracle(s, x, c, Float64Array.from([1, 0, 0])))).toEqual([2, 5.5, 0]);
    });

    it("weights null folds 1 on a weighted snapshot; an unweighted snapshot folds 1 by itself", () => {
        const c: SpmvOracleCoefficients = { alpha: 1, beta: 0, uniformP: 0, dangling: 0 };
        expect(Array.from(spmvPullOracle(s, x, c, undefined, null))).toEqual([2, 4, 0]);
        const plain = snapshotOf(
            [
                [0, 1],
                [2, 1],
                [1, 0],
            ],
            { directed: true },
        );
        expect(Array.from(spmvPullOracle(plain, x, c))).toEqual([2, 4, 0]);
    });

    it("the fold is f64 (no f32 rounding of the sum)", () => {
        const big = snapshotOf(
            [
                [1, 0, 16777216],
                [2, 0, 1],
            ],
            { directed: true, weighted: true },
        );
        const ones = Float64Array.from([1, 1, 1]);
        expect(spmvPullOracle(big, ones, { alpha: 1, beta: 0, uniformP: 0, dangling: 0 })[0]).toBe(16777217);
    });
});

describe("spmvPull thread-per-row (GPU)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "spmv" }));
        shared = ctx;
        return ctx;
    }

    /** Twice bitwise, then against the f64 oracle within the analytic tolerance; returns the first run. */
    async function checkAgainstOracle(ctx: GpuContext, s: GraphSnapshot, label: string): Promise<F32> {
        const n = s.nodeCount;
        const x = seededVector(n, 1000 + n);
        const c = pageRankCoefficients(n);
        const first = await runSpmvPull(ctx, s, x, c);
        const second = await runSpmvPull(ctx, s, x, c);
        expect(first.dispatches).toBe(n === 0 ? 0 : 1);
        expectBitwiseEqual(first.result, second.result, `${label} twice`);
        const expected = spmvPullOracle(s, f64(x), { ...c, dangling: 0 });
        expect(first.result.length).toBe(expected.length);
        expectAllClose(first.result, expected, { rel: spmvTolerance(s), abs: 0 }, label);
        return first.result;
    }

    it("n = 0: prepare succeeds, record records nothing, the result is empty", async (t) => {
        const ctx = await context(t);
        const { snapshot } = fixture("empty", gpuScale());
        expect(snapshot.nodeCount).toBe(0);
        const { result, dispatches } = await runSpmvPull(ctx, snapshot, new Float32Array(0), pageRankCoefficients(0));
        expect(result.length).toBe(0);
        expect(dispatches).toBe(0);
        ctx.release(snapshot);
    });

    for (const name of FIXTURE_NAMES) {
        it(`matches the f64 oracle on ${name}, twice bitwise`, async (t) => {
            const ctx = await context(t);
            const { snapshot } = fixture(name, gpuScale());
            await checkAgainstOracle(ctx, snapshot, name);
            ctx.release(snapshot);
        });
    }

    it("a directed weighted snapshot pulls over the uploaded reverse view (in-arcs, not out-arcs)", async (t) => {
        const ctx = await context(t);
        const s = weightedDirected(300, 900, 11);
        const view = ctx.residency.view(s, "reverse");
        expect(view.scalars.directed[0]).toBe(1);
        const result = await checkAgainstOracle(ctx, s, "directed");
        // the pull is NOT the forward walk: the out-sum of the same input differs somewhere
        const x = seededVector(s.nodeCount, 1000 + s.nodeCount);
        const forward = new Float64Array(s.nodeCount);
        for (let row = 0; row < s.nodeCount; row++) {
            let acc = 0;
            for (let arc = s.rowPtr[row]; arc < s.rowPtr[row + 1]; arc++) {
                acc += (s.weights === null ? 1 : s.weights[arc]) * x[s.colIdx[arc]];
            }
            forward[row] = 0.15 / s.nodeCount + 0.85 * acc;
        }
        expect(maxRelError(result, forward, SR_ABS_FLOOR)).toBeGreaterThan(1e-3);
        ctx.release(s);
    });

    it("zero-weight arcs (parallel) contribute exactly 0; weights: null folds 1 on the weighted core and differs from the default", async (t) => {
        const ctx = await context(t);
        const { snapshot: s } = fixture("parallel", gpuScale());
        expect(s.weights).not.toBeNull();
        const x = Float32Array.from([1, 1, 1, 1]);
        const c: SpmvCoefficients = { alpha: 1, beta: 0, uniformP: 0 };
        const weighted = await runSpmvPull(ctx, s, x, c);
        expectAllClose(weighted.result, spmvPullOracle(s, f64(x), { ...c, dangling: 0 }), { rel: 2 ** -20, abs: 0 });
        const unweighted = await runSpmvPull(ctx, s, x, c, { weights: null });
        const ones = spmvPullOracle(s, f64(x), { ...c, dangling: 0 }, undefined, null);
        expectAllClose(unweighted.result, ones, { rel: 2 ** -20, abs: 0 }, "weights: null");
        // undirected: every node is in the reverse of its own arcs, so the unweighted pull is the degree
        expect(Array.from(unweighted.result)).toEqual([2, 4, 3, 1]);
        expect(maxRelError(unweighted.result, weighted.result, SR_ABS_FLOOR)).toBeGreaterThan(0.1);
        const keys = ctx.pipelines.keys().filter((key) => key.startsWith("spmv-pull|"));
        const flags = keys.map((key) => (JSON.parse(key.split("|")[1]) as { HAS_WEIGHTS?: boolean }).HAS_WEIGHTS);
        expect(flags).toContain(true);
        expect(flags).toContain(false);
        ctx.release(s);
    });

    it("the personalization leg: one-hot matches the oracle; a uniform vector is bitwise the uniformP run", async (t) => {
        const ctx = await context(t);
        const s = weightedRandom(500, 2000, 3);
        const n = s.nodeCount;
        const x = seededVector(n, 7);
        const c = pageRankCoefficients(n);
        const oneHot = new Float32Array(n);
        oneHot[3] = 1;
        const personalized = await runSpmvPull(ctx, s, x, c, { personalization: oneHot });
        const expected = spmvPullOracle(s, f64(x), { ...c, dangling: 0 }, f64(oneHot));
        expectAllClose(personalized.result, expected, { rel: spmvTolerance(s), abs: 0 }, "one-hot");
        // a row without in-arcs and without personalization mass is exactly 0; row 3 carries the whole beta term
        expect(expected[3]).toBeGreaterThanOrEqual(0.15);
        const uniform = new Float32Array(n).fill(Math.fround(1 / n));
        const viaVector = await runSpmvPull(ctx, s, x, c, { personalization: uniform });
        const viaUniformP = await runSpmvPull(ctx, s, x, c);
        expectBitwiseEqual(viaVector.result, viaUniformP.result, "uniform personalization vs uniformP");
        ctx.release(s);
    });

    it("the dangling leg: USE_DANGLING folds partials[0].danglingMass into every row", async (t) => {
        const ctx = await context(t);
        const s = weightedRandom(400, 1600, 17);
        const n = s.nodeCount;
        const x = seededVector(n, 9);
        const c = pageRankCoefficients(n);
        const dangling = 0.37;
        const withMass = await runSpmvPull(ctx, s, x, c, { dangling });
        const expected = spmvPullOracle(s, f64(x), { ...c, dangling });
        expectAllClose(withMass.result, expected, { rel: spmvTolerance(s), abs: 0 }, "dangling");
        const without = await runSpmvPull(ctx, s, x, c);
        // every row gains alpha * dangling / n: the two runs differ everywhere by about that
        const gain = (0.85 * dangling) / n;
        for (let row = 0; row < n; row++) {
            expect(Math.abs(withMass.result[row] - without.result[row] - gain)).toBeLessThan(1e-5);
        }
        ctx.release(s);
    });

    it("row-count ladder 0, 1, 255, 256, 257, 4097, 65537 and one row count above the grid-stride cap (scaled)", async (t) => {
        const ctx = await context(t);
        const strided = Math.max(2, Math.round((2 ** 20 + 1) * gpuScale()));
        const plan = planGridStride(strided, ctx.workgroupSize, ctx.caps);
        expect(plan.stride).not.toBeNull();
        expect(plan.stride).toBeLessThan(strided); // the kernel's row loop runs more than once per invocation
        const ladder = [0, 1, 255, 256, 257, 4097, 65_537, strided];
        for (const n of ladder) {
            const m = n >= 2 ? Math.min(2 * n, Math.floor((n * (n - 1)) / 2)) : 0;
            const s = weightedRandom(n, m, 100 + n);
            await checkAgainstOracle(ctx, s, `ladder ${n}`);
            ctx.release(s);
        }
    }, 120_000);

    it("coreOfView round-trips a directed weighted reverse view and an undirected one by binding identity", async (t) => {
        const ctx = await context(t);
        const directed = weightedDirected(200, 600, 5);
        const view = ctx.residency.view(directed, "reverse");
        const rev = coreOfView(view, view.scalars.arcCount[0]);
        expect(rev.rowPtr).toBe(view.bindings.rowPtr);
        expect(rev.colIdx).toBe(view.bindings.colIdx);
        expect(rev.weights).toBe(view.bindings.weights);
        expect(rev.plan).toBe("perArray");
        expect(rev.windows).toBeNull();
        expect(rev.hasWeights).toBe(true);
        expect(rev.serial).toBe(-1);
        const scope = algorithmScope(ctx, "spmv/seam", 2);
        const options: SpmvPullOptions = { personalization: false, dangling: false, weights: undefined, tiers: null };
        const planner = await prepareSpmvPull(scope, rev, options);
        const n = directed.nodeCount;
        const x = scope.scratch(4 * n, "x");
        const y = scope.scratch(4 * n, "y");
        const partials = scope.scratch(32, "partials");
        const encoder = ctx.device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        const bindingOf = (buffer: GPUBuffer): { buffer: GPUBuffer; offset: number; size: number; window: null } => ({
            buffer,
            offset: 0,
            size: buffer.size,
            window: null,
        });
        planner.record(
            pass,
            rev,
            { xNorm: bindingOf(x), rankOut: bindingOf(y), personalization: null, partials: bindingOf(partials) },
            { alpha: 1, beta: 0, uniformP: 0 },
        );
        expect(planner.lastDispatches).toBe(1);
        pass.end();
        scope.flush();
        ctx.device.queue.submit([encoder.finish()]);
        await ctx.device.queue.onSubmittedWorkDone();
        scope.dispose();
        scope.dispose(); // idempotent
        // the same run through the helper agrees with the oracle: the seam carries the right arrays
        const input = seededVector(n, 1);
        const { result } = await runSpmvPull(ctx, directed, input, { alpha: 1, beta: 0, uniformP: 0 }, { rev });
        expectAllClose(
            result,
            spmvPullOracle(directed, f64(input), { alpha: 1, beta: 0, uniformP: 0, dangling: 0 }),
            { rel: spmvTolerance(directed), abs: 0 },
            "seam",
        );
        ctx.release(directed);

        const { snapshot: karate } = fixture("karate", gpuScale());
        const undirectedView = ctx.residency.view(karate, "reverse");
        expect(undirectedView.scalars.directed[0]).toBe(0);
        const undirected = coreOfView(undirectedView, undirectedView.scalars.arcCount[0]);
        const core = ctx.residency.core(karate);
        expect(undirected.rowPtr).toBe(core.rowPtr);
        expect(undirected.colIdx).toBe(core.colIdx);
        expect(undirected.weights).toBeNull();
        expect(undirected.hasWeights).toBe(false);
        expect(undirected.plan).toBe("perArray");
        expect(undirected.windows).toBeNull();
        expect(reverseCore(ctx, karate).rowPtr).toBe(core.rowPtr);
        // the adapter's own checks: a view without rowPtr, and an arcCount that disagrees with the colIdx binding
        const degrees = ctx.residency.view(karate, "outDegree");
        const noRows = expectThrow(() => coreOfView(degrees, 0), "E_INVALID_ARGUMENT");
        expect(noRows.details.argument).toBe("view");
        expect(noRows.details.value).toBe("outDegree");
        const mismatch = expectThrow(() => coreOfView(undirectedView, karate.arcCount + 1), "E_INVALID_ARGUMENT");
        expect(mismatch.details.argument).toBe("arcCount");
        expect(mismatch.details.expected).toBe(karate.arcCount);
        ctx.release(karate);
    });

    it("algorithmScope: params records land in consecutive ring slots; USE_PERM is false in every pipeline key", async (t) => {
        const ctx = await context(t);
        const scope = algorithmScope(ctx, "spmv/scope", 3);
        const values = { n: 1, arcBase: 0, arcEnd: 0, stride: 1, alpha: 1, beta: 0, uniformP: 0, start: 0 };
        const a = scope.params(SPMV_PARAMS, values);
        const b = scope.params(SPMV_PARAMS, values);
        const c = scope.params(SPMV_PARAMS, values);
        expect(a.binding.buffer).toBe(b.binding.buffer);
        expect(a.binding.size).toBe(SPMV_PARAMS.byteLength);
        expect([a.offset, b.offset, c.offset]).toEqual([0, UNIFORM_SLOT_BYTES, 2 * UNIFORM_SLOT_BYTES]);
        expect(scope.params(SPMV_PARAMS, values).offset).toBe(0); // the ring wraps
        scope.flush();
        scope.dispose();
        expect(() => scope.params(SPMV_PARAMS, values)).toThrow();
        const keys = ctx.pipelines.keys().filter((key) => key.startsWith("spmv-pull|"));
        expect(keys.length).toBeGreaterThan(0);
        for (const key of keys) {
            const overrides = JSON.parse(key.split("|")[1]) as { USE_PERM?: boolean };
            expect(overrides.USE_PERM).toBe(false);
        }
    });

    it("prepareSpmvPull accepts tiers (the tier results are tiers.test.ts's); a windowed core -> E_UNSUPPORTED; a malformed rowPtr -> E_INVALID_ARGUMENT at record", async (t) => {
        const ctx = await context(t);
        const s = weightedRandom(50, 100, 2);
        const rev = reverseCore(ctx, s);
        const order = ctx.residency.view(s, "reverseDegreeOrder");
        const so = order.scalars.segmentOffsets;
        const tiers: DegreeTiers = { perm: order.bindings.perm, segmentOffsets: [so[0], so[1], so[2], so[3], so[4]] };
        const scope = algorithmScope(ctx, "spmv/reject", 2);
        const base: SpmvPullOptions = { personalization: false, dangling: false, weights: undefined, tiers: null };
        const tiered = await prepareSpmvPull(scope, rev, { ...base, tiers });
        expect(tiered.lastDispatches).toBe(0);
        const windowed: CoreBinding = { ...rev, plan: "windowed", windows: [] };
        const unsupported = await expectRejection(prepareSpmvPull(scope, windowed, base), "E_UNSUPPORTED");
        expect(unsupported.details.feature).toBe("spmvPull.windowed");
        const planner = await prepareSpmvPull(scope, rev, base);
        const out = scope.scratch(4 * 50, "out");
        const binding = { buffer: out, offset: 0, size: 4 * 50, window: null };
        const encoder = ctx.device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        const malformed: CoreBinding = { ...rev, rowPtr: { ...rev.rowPtr, size: 6 } };
        const rows = expectThrow(
            () =>
                planner.record(
                    pass,
                    malformed,
                    { xNorm: binding, rankOut: binding, personalization: null, partials: binding },
                    { alpha: 1, beta: 0, uniformP: 0 },
                ),
            "E_INVALID_ARGUMENT",
        );
        expect(rows.details.argument).toBe("core.rowPtr");
        expect(rows.details.value).toBe(6);
        pass.end();
        scope.dispose();
        ctx.release(s);
    });

    it("twins in-process: the no-subgroup context gives bitwise the same result (spmv-pull calls no reduction helper)", async (t) => {
        const ctx = await context(t);
        const s = weightedRandom(1000, 5000, 7);
        const x = seededVector(s.nodeCount, 42);
        const c = pageRankCoefficients(s.nodeCount);
        const withFeature = await runSpmvPull(ctx, s, x, c);
        const withoutFeature = await withContext({ subgroups: false, label: "spmv-twin" }, async (twin) => {
            expect(twin.caps.features.has("subgroups")).toBe(false);
            const { result } = await runSpmvPull(twin, s, x, c);
            twin.release(s);
            return result;
        });
        expectBitwiseEqual(withFeature.result, withoutFeature, "twins");
        ctx.release(s);
    });

    it("the pull over random1k is the cross-adapter noise fixture: within the derived floor of every committed adapter, rows recorded", async (t) => {
        const ctx = await context(t);
        const s = weightedRandom(1000, 5000, 7);
        const x = seededVector(s.nodeCount, 42);
        const c = pageRankCoefficients(s.nodeCount);
        const { result } = await runSpmvPull(ctx, s, x, c);
        const expected = spmvPullOracle(s, f64(x), { ...c, dangling: 0 });
        const oracleErr = maxRelError(result, expected, SR_ABS_FLOOR);
        expect(oracleErr).toBeLessThanOrEqual(spmvTolerance(s));
        const mine = adapterClass(ctx.caps);
        console.warn(`[spmv-pull] ${mine}: oracle-f64 maxRelError ${oracleErr.toExponential(3)}`);
        writeNoiseFixture("spmv-pull", "random1k", mine, result, "f32");
        recordNoiseRow({
            id: `spmv-pull.oracle-f64.${mine}`,
            kernel: "spmv-pull",
            fixture: "random1k",
            comparison: "oracle-f64",
            a: mine,
            b: "oracle-f64",
            maxRelError: oracleErr,
            maxAbsError: maxAbsError(result, expected),
            samples: s.nodeCount,
        });
        const others = readNoiseFixtures("spmv-pull", "random1k").filter((f) => f.adapterClass !== mine);
        if (others.length > 0) {
            const floor = noiseFloorFor("spmv-pull.cross");
            for (const other of others) {
                expect(other.dtype).toBe("f32");
                expect(other.values.length).toBe(result.length);
                const err = maxRelError(result, other.values, SR_ABS_FLOOR);
                console.warn(
                    `[spmv-pull] cross-adapter ${mine} vs ${other.adapterClass}: maxRelError ${err.toExponential(3)} (floor ${floor.value.toExponential(3)}, basis ${floor.basis})`,
                );
                recordNoiseRow({
                    id: `spmv-pull.cross.${mine}--${other.adapterClass}`,
                    kernel: "spmv-pull",
                    fixture: "random1k",
                    comparison: "cross-adapter",
                    a: mine,
                    b: other.adapterClass,
                    maxRelError: err,
                    maxAbsError: maxAbsError(result, other.values),
                    samples: s.nodeCount,
                });
                expect(err).toBeLessThanOrEqual(floor.value);
            }
        }
        ctx.release(s);
    });
});
