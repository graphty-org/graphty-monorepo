/**
 * The degree tiers of segmentedReduce and spmvPull (P4-T5; spec 6 row 3 and row 9, 7.5, 11.3, 11.9 item 4; PD-6):
 * over degreeOrder() / reverseDegreeOrder() the primitives issue up to three dispatches -- TIER 2 one workgroup per
 * row of degree >= 1024, TIER 1 32 lanes per row of degree 32..1023, TIER 0 one thread per row below -- and every
 * tier equals the f64 oracle within the analytic tolerance, twice bitwise. The suite checks which tiers each fixture
 * compiles (rmat14 all three, hub10k the hub's tier and TIER 0, karate TIER 0 only), the twins in-process (the
 * no-subgroup context is bitwise the same on the TIER 0 / TIER 1 rows and within the bound on the TIER 2 rows,
 * whose workgroup tree differs between the subgroup variant and the workgroup twin), the pull over the in-degree
 * tiers of the reverse of hub10k and of a directed R-MAT, degreeTiersOf's rejections, and the writer cases of the
 * `hub10k-tiers` noise fixtures (GRAPHTY_NOISE_FLOOR_WRITE=1 only).
 */

import { type GraphSnapshot } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError, type WebGpuGraphError } from "../../src/errors.js";
import { type ViewBinding } from "../../src/memory/residency.js";
import { degreeTiersOf } from "../../src/primitives/core-shape.js";
import { type ReduceOp } from "../../src/primitives/reduce.js";
import { fixture, rmatEdges, snapshotOf } from "../helpers/graphs.js";
import { expectAllClose, expectBitwiseEqual, maxRelError } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { SEGMENTED_REDUCE_SNIPPETS } from "../helpers/override-matrix.js";
import {
    oracleValueOf,
    relTolerance,
    runSegmentedReduce,
    SR_ABS_FLOOR,
    tieredWorstFactor,
} from "../helpers/segmented-reduce.js";
import { runSpmvPull, seededVector, spmvTolerance, tieredSpmvWorstFactor } from "../helpers/spmv.js";
import { segmentedReduceOracle } from "../oracle/segmented-reduce.js";
import { spmvPullOracle } from "../oracle/spmv.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const OPS: readonly ReduceOp[] = ["sum", "min", "max"];
const SNIPPETS: readonly string[] = [SEGMENTED_REDUCE_SNIPPETS.weight, SEGMENTED_REDUCE_SNIPPETS.one];
const WEIGHT = SEGMENTED_REDUCE_SNIPPETS.weight;
const CASE_TIMEOUT = 300_000;

/** The TIER values of every USE_PERM pipeline key of `id` the context created, ascending. */
function permTiersOf(ctx: GpuContext, id: "segmented-reduce" | "spmv-pull"): number[] {
    const tiers = new Set<number>();
    for (const key of ctx.pipelines.keys()) {
        if (!key.startsWith(`${id}|`)) {
            continue;
        }
        const overrides = JSON.parse(key.split("|")[1]) as { USE_PERM?: boolean; TIER?: number };
        expect(overrides.USE_PERM).toBe(true);
        tiers.add(overrides.TIER ?? 0);
    }
    return [...tiers].sort((a, b) => a - b);
}

/** The tiers a fixture's segment offsets populate: 2 when a row of degree >= 1024 exists, 1 when one of degree 32..1023 does, 0 always. */
function expectedTiers(so: readonly number[]): number[] {
    const tiers = [0];
    if (so[2] > so[1]) {
        tiers.push(1);
    }
    if (so[1] > 0) {
        tiers.push(2);
    }
    return tiers.sort((a, b) => a - b);
}

/** Awaits nothing: runs fn and returns the error it throws, asserting the code. */
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

/** The directed R-MAT of the pull cases: the reverse of a scale-14 R-MAT populates all three in-degree tiers (scale 12 on a software adapter). */
function directedRmat(): GraphSnapshot {
    const scale = Math.max(12, Math.round(14 + Math.log2(gpuScale())));
    return snapshotOf(rmatEdges(scale, 8, 1005), { directed: true, nodeCount: 2 ** scale, label: "rmat14-directed" });
}

describe("segmentedReduce / spmvPull degree tiers (GPU)", () => {
    /** A FRESH context per case: the pipeline keys a case asserts on must be its own. */
    async function fresh(t: TestContext, label: string): Promise<GpuContext> {
        requireGpu(t);
        return await acquire({ label });
    }

    /** sum / min / max x weight / one over the degree tiers: twice bitwise, then the f64 oracle within the analytic tolerance. */
    async function checkTiers(ctx: GpuContext, s: GraphSnapshot, label: string): Promise<void> {
        for (const op of OPS) {
            for (const snippet of SNIPPETS) {
                const first = await runSegmentedReduce(ctx, s, op, snippet, { tiers: "auto" });
                const second = await runSegmentedReduce(ctx, s, op, snippet, { tiers: "auto" });
                expectBitwiseEqual(first, second, `${label} ${op} ${snippet} twice`);
                const expected = segmentedReduceOracle(s, oracleValueOf(snippet), op);
                expect(first.length).toBe(expected.length);
                expectAllClose(first, expected, { rel: relTolerance(s, op), abs: 0 }, `${label} ${op} ${snippet}`);
            }
        }
    }

    for (const name of ["hub10k", "rmat14", "star200", "karate"]) {
        it(
            `${name}: every tier equals the f64 oracle (sum / min / max x weight / one), twice bitwise; the tiers compiled are the ones its degrees populate`,
            async (t) => {
                const ctx = await fresh(t, `tiers/${name}`);
                const { snapshot } = fixture(name, gpuScale());
                const so = Array.from(snapshot.degreeOrder().segmentOffsets);
                if (name === "rmat14") {
                    expect(so[1]).toBeGreaterThanOrEqual(1);
                    expect(so[2] - so[1]).toBeGreaterThanOrEqual(32);
                }
                if (name === "karate") {
                    expect(so[2]).toBe(0);
                }
                await checkTiers(ctx, snapshot, name);
                expect(permTiersOf(ctx, "segmented-reduce")).toEqual(expectedTiers(so));
                if (name === "rmat14") {
                    expect(permTiersOf(ctx, "segmented-reduce")).toEqual([0, 1, 2]);
                }
                if (name === "hub10k" && so[1] >= 1 && so[2] === so[1]) {
                    expect(permTiersOf(ctx, "segmented-reduce")).toEqual([0, 2]); // the 10k hub alone reaches 1024; no leaf reaches 32
                }
                expect(await tieredWorstFactor(ctx, snapshot)).toBeLessThan(1);
                ctx.release(snapshot);
                ctx.dispose();
            },
            CASE_TIMEOUT,
        );
    }

    it(
        "twins in-process: the no-subgroup context is bitwise the same on the TIER 0 and TIER 1 rows and within the bound on the TIER 2 rows (rmat14, sum)",
        async (t) => {
            const ctx = await fresh(t, "tiers/twin-feature");
            const { snapshot: s } = fixture("rmat14", gpuScale());
            const order = s.degreeOrder();
            const so = Array.from(order.segmentOffsets);
            const withFeature = await runSegmentedReduce(ctx, s, "sum", WEIGHT, { tiers: "auto" });
            const twin = await acquire({ subgroups: false, label: "tiers/twin" });
            expect(twin.caps.features.has("subgroups")).toBe(false);
            const withoutFeature = await runSegmentedReduce(twin, s, "sum", WEIGHT, { tiers: "auto" });
            expect(permTiersOf(twin, "segmented-reduce")).toEqual([0, 1, 2]);
            expectAllClose(withoutFeature, withFeature, { rel: relTolerance(s, "sum"), abs: 0 }, "twins");
            const lower = new Float32Array(s.nodeCount - so[1]);
            const lowerTwin = new Float32Array(s.nodeCount - so[1]);
            for (let k = so[1]; k < s.nodeCount; k++) {
                lower[k - so[1]] = withFeature[order.perm[k]];
                lowerTwin[k - so[1]] = withoutFeature[order.perm[k]];
            }
            expectBitwiseEqual(lower, lowerTwin, "TIER 0 and TIER 1 rows");
            twin.release(s);
            twin.dispose();
            ctx.release(s);
            ctx.dispose();
        },
        CASE_TIMEOUT,
    );

    for (const name of ["hub10k", "rmat14-directed"]) {
        it(
            `spmvPull over the in-degree tiers of ${name} equals the f64 oracle within the pull's bound, twice bitwise`,
            async (t) => {
                const ctx = await fresh(t, `tiers/spmv-${name}`);
                const s = name === "hub10k" ? fixture("hub10k", gpuScale()).snapshot : directedRmat();
                const so = Array.from(s.degreeOrder({ of: "reverse" }).segmentOffsets);
                const n = s.nodeCount;
                const x = seededVector(n, 1000 + n);
                const c = { alpha: 0.85, beta: 0.15, uniformP: 1 / n };
                const first = await runSpmvPull(ctx, s, x, c, { tiers: "auto" });
                const second = await runSpmvPull(ctx, s, x, c, { tiers: "auto" });
                expect(first.dispatches).toBe(expectedTiers(so).length);
                expectBitwiseEqual(first.result, second.result, `${name} twice`);
                const expected = spmvPullOracle(s, Float64Array.from(x), { ...c, dangling: 0 });
                expectAllClose(first.result, expected, { rel: spmvTolerance(s), abs: 0 }, name);
                expect(permTiersOf(ctx, "spmv-pull")).toEqual(expectedTiers(so));
                if (name === "rmat14-directed") {
                    expect(permTiersOf(ctx, "spmv-pull")).toEqual([0, 1, 2]);
                }
                expect(await tieredSpmvWorstFactor(ctx, s)).toBeLessThan(1);
                ctx.release(s);
                ctx.dispose();
            },
            CASE_TIMEOUT,
        );
    }

    it("degreeTiersOf rejects a view without perm and segment offsets that are not five ascending numbers ending at the row count", async (t) => {
        const ctx = await fresh(t, "tiers/reject");
        const { snapshot: s } = fixture("karate", gpuScale());
        const noPerm = ctx.residency.view(s, "reverse");
        expect(expectThrow(() => degreeTiersOf(noPerm), "E_INVALID_ARGUMENT").details.argument).toBe("view");
        const good = ctx.residency.view(s, "degreeOrder");
        expect(degreeTiersOf(good).segmentOffsets).toEqual([0, 0, 0, 34, 34]);
        const fake = (segmentOffsets: readonly number[]): ViewBinding => ({
            view: "degreeOrder",
            bindings: good.bindings,
            scalars: { segmentOffsets },
        });
        for (const offsets of [
            [0, 5, 3, 34, 34],
            [0, 0, 0, 34],
            [1, 1, 1, 34, 34],
            [0, 0, 0, 34, 33],
            [0, 0, 0.5, 34, 34],
        ]) {
            const error = expectThrow(() => degreeTiersOf(fake(offsets)), "E_INVALID_ARGUMENT");
            expect(error.details.argument).toBe("view");
        }
        ctx.release(s);
        ctx.dispose();
    });

    it(
        "writer: the hub10k-tiers noise fixtures of segmented-reduce and spmv-pull (GRAPHTY_NOISE_FLOOR_WRITE=1 only)",
        async (t) => {
            if (process.env.GRAPHTY_NOISE_FLOOR_WRITE !== "1") {
                t.skip("noise fixtures are written under GRAPHTY_NOISE_FLOOR_WRITE=1 only");
            }
            const ctx = await fresh(t, "tiers/noise");
            const { snapshot: s } = fixture("hub10k", 1);
            const cls = adapterClass(ctx.caps);
            const out = await runSegmentedReduce(ctx, s, "sum", WEIGHT, { tiers: "auto" });
            const outExpected = segmentedReduceOracle(s, oracleValueOf(WEIGHT), "sum");
            expect(maxRelError(out, outExpected, SR_ABS_FLOOR)).toBeLessThanOrEqual(relTolerance(s, "sum"));
            writeNoiseFixture("segmented-reduce", "hub10k-tiers", cls, out, "f32");
            writeNoiseFixture("segmented-reduce", "hub10k-tiers", "oracle-f64", outExpected, "f32");
            const n = s.nodeCount;
            const x = seededVector(n, 1000 + n);
            const c = { alpha: 0.85, beta: 0.15, uniformP: 1 / n };
            const { result: rankOut } = await runSpmvPull(ctx, s, x, c, { tiers: "auto" });
            const rankExpected = spmvPullOracle(s, Float64Array.from(x), { ...c, dangling: 0 });
            expect(maxRelError(rankOut, rankExpected, SR_ABS_FLOOR)).toBeLessThanOrEqual(spmvTolerance(s));
            writeNoiseFixture("spmv-pull", "hub10k-tiers", cls, rankOut, "f32");
            writeNoiseFixture("spmv-pull", "hub10k-tiers", "oracle-f64", rankExpected, "f32");
            ctx.release(s);
            ctx.dispose();
        },
        CASE_TIMEOUT,
    );
});
