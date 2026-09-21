/**
 * Exact-vs-grid parity (spec 11.4 "exact vs grid", 7.8; P4-T11; PD-19, PD-20): the reference of every item is the
 * EXACT GPU TIER on the same adapter from the same start, never the f64 oracle, so the approximation error is
 * measured alone. (1) On the design's fixtures -- uniform, clumpy 10 / 100 / 1,000, the 10k-hub scale-free graph,
 * cosmos's two cases (the 163-node polyline, DEP-P4-C, and 1,024 points in one finest cell), a line, coincident
 * points, and the isolated-node fixture taken after 200 exact iterations so its strays sit at their equilibrium --
 * at two sizes (20k and 100k on hardware, 400 and 2,000 on a software adapter) in 2D and 3D, the floored per-node
 * error's RMS and p99 are measured at EVERY size (collected first, asserted after, so a miss at the first size never
 * leaves the second unmeasured) and sit under the derived grid-exact.rms / grid-exact.p99 tolerances on the
 * ASSERTED fixtures -- the uniform and hub distributions (random20k, clumpy1000, hub10k) on a hardware adapter
 * (G4-F1, the owner's decision); the clumpy / degenerate fixtures (clumpy10, clumpy100, polyline163, onecell1k,
 * line, coincident, isolated: the far field's per-cell approximation misses the caps there, the record's G4-F1)
 * are PRINTED with their RMS, p99 and whole-field norm ratio and asserted for determinism (twice bitwise) and
 * finiteness only, as the P5 admission ensembles do; on a software adapter (gpuScale() < 1, 400-node fixtures where
 * even random20k misses) every fixture is printed. One summary line per (fixture, dimension) carries both sizes'
 * numbers for the record; (2) an isolated node's
 * total force after G7 is gravity plus the field of the other nodes at the strays' equilibrium (the design's
 * "gravity alone" item; whether the far field is negligible and whether a stray has a near-field neighbour are
 * printed for the record); (3)
 * unbiasedness: the mean of G7's force over UNBIASED_SEEDS seeded iterations at nearMax 8 on the one-cell fixtures
 * is within grid-unbiased of the exact tier's force in the WHOLE-FIELD norm (|mean - exact| / |exact|,
 * fieldRelError), with the ladder of every doubling from 32 seeds printed -- the whole-field ratio and the floored
 * per-node RMS -- so the 1 / sqrt(seeds) descent of an unbiased estimator is on record (G4-F2: the per-node RMS of a
 * 32-seed mean is the sampling variance of eight draws of a 20,000-entry cell, not the estimator's bias);
 * (4) expansion parity:
 * the spread of the grid tier's positions after 50 and 200 iterations within grid-expansion of the exact tier's;
 * (asserted on a hardware adapter; printed on a software one, where the scaled clumpy100 case misses -- the same
 * split as item 1); (5) distributional parity: layoutMetrics after 200 iterations on both tiers within
 * grid-distributional (at the first size only: the metrics are O(n^2) in JS); (6) the writer cases of the five approximation members
 * (GRAPHTY_NOISE_FLOOR_WRITE=1 only; skipped without it, G4-F12). Every tolerance goes through gridTolerance(id); a fixture above its derived
 * tolerance is a finding for G4 section 7 (PD-20), never a loosened cap.
 */

import { type F32, type GraphSnapshot } from "@graphty/graph-format";

import { type GpuContext } from "../../src/context.js";
import { type GpuLayoutTuning } from "../../src/types/layout.js";
import { type ForceAtlas2Options } from "../../src/types/options.js";
import {
    distributionalError,
    metricsValues,
    ORACLE_F64_CLASS,
    stageError,
    withSim,
} from "../helpers/fa2-parity.js";
import {
    captureGridStages,
    EXACT_TUNING,
    exactVsGrid,
    GRID_BASE_OPTIONS,
    GRID_NOISE_FIXTURES,
    GRID_TUNING,
    gridFixture,
    gridTolerance,
    NEAR_MAX_SAMPLING,
    sampleNodes,
    UNBIASED_LADDER_FIRST,
    UNBIASED_SEEDS,
    unbiasedLadder,
} from "../helpers/grid-parity.js";
import { expectBitwiseEqual, fieldRelError } from "../helpers/matchers.js";
import { layoutMetrics, spread } from "../helpers/metrics.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses, type CheckReport, ratioOf } from "../helpers/sabotage.js";
import { acquire, gpuScale, isSoftware, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 600_000;
const WRITER_TIMEOUT = 1_800_000;
/** The design's exact-vs-grid fixtures (spec 11.4). */
const FIXTURES: readonly string[] = [
    "random20k",
    "clumpy10",
    "clumpy100",
    "clumpy1000",
    "hub10k",
    "polyline163",
    "onecell1k",
    "line",
    "coincident",
    "isolated",
];
/**
 * The fixtures whose caps case 1 ASSERTS on a hardware adapter (file header; G4-F1): the uniform and hub
 * distributions, which pass with margin. Every other fixture is printed.
 */
const ASSERTED: readonly string[] = ["random20k", "clumpy1000", "hub10k"];
/** One size's exact-vs-grid figures of case 1, collected before any assertion. */
interface Measurement {
    readonly n: number;
    readonly rms: number;
    readonly p99: number;
    readonly field: number;
}
/**
 * The two sizes as fixture scale factors: 20k and 100k on hardware, 400 and 2,000 on a software adapter (read inside
 * a case: the setup's probe runs in beforeAll, so isSoftware() answers only then). The 100k size never runs on
 * lavapipe: its exact tier sums the first 65,536 nodes only (measured 2026-09-20, the record's finding), so the
 * reference itself would be wrong there.
 * @returns the scale factors
 */
function sizes(): readonly number[] {
    return isSoftware() ? [1 / 50, 1 / 10] : [1, 5];
}
/** The exact iterations the isolated fixture settles for before the comparison. */
const SETTLE_ITERATIONS = 200;
const EXPANSION_HORIZONS: readonly [number, number] = [50, 200];

/**
 * The positions after `iterations` exact iterations from `start` (the strays' equilibrium of the isolated fixture).
 * @param ctx - the context
 * @param s - the snapshot
 * @param start - the scene start
 * @param options - the FA2 options
 * @returns the settled positions (a new array)
 */
async function settledStart(ctx: GpuContext, s: GraphSnapshot, start: F32, options: ForceAtlas2Options): Promise<F32> {
    return await withSim(ctx, options, EXACT_TUNING, async (sim) => {
        const positions = Float32Array.from(start);
        sim.load(s, positions);
        await sim.run({ maxIter: SETTLE_ITERATIONS, batch: 10 });
        return positions;
    });
}

/**
 * The snapshot and start of a fixture; the isolated fixture is settled first (its start seeded from the options).
 * @param ctx - the context
 * @param name - the fixture
 * @param scale - the fixture scale
 * @param options - the FA2 options
 * @returns the snapshot and the start
 */
async function exactInputs(
    ctx: GpuContext,
    name: string,
    scale: number,
    options: ForceAtlas2Options,
): Promise<{ readonly snapshot: GraphSnapshot; readonly start: F32 }> {
    const f = gridFixture(name, scale, options);
    if (name !== "isolated") {
        return f;
    }
    return { snapshot: f.snapshot, start: await settledStart(ctx, f.snapshot, f.start, options) };
}

/** One tier's trajectory: the spread after the two horizons and the positions after the last. */
interface Trajectory {
    readonly spread50: number;
    readonly spread200: number;
    readonly positions: F32;
}

/**
 * The spread of a tier's layout after 50 and 200 iterations from `start`, and its positions after 200.
 * @param ctx - the context
 * @param s - the snapshot
 * @param start - the scene start
 * @param options - the FA2 options
 * @param tuning - the tier
 * @returns the trajectory
 */
async function trajectory(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    options: ForceAtlas2Options,
    tuning: GpuLayoutTuning,
): Promise<Trajectory> {
    return await withSim(ctx, options, tuning, async (sim) => {
        const positions = Float32Array.from(start);
        const dim = options.dim ?? 2;
        sim.load(s, positions);
        await sim.run({ maxIter: EXPANSION_HORIZONS[0], batch: 10 });
        const spread50 = spread(positions, s.nodeCount, dim);
        await sim.run({ maxIter: EXPANSION_HORIZONS[1], batch: 10 });
        return { spread50, spread200: spread(positions, s.nodeCount, dim), positions };
    });
}

/**
 * |a - b| / |b|.
 * @param a - the grid tier's value
 * @param b - the exact tier's value
 * @returns the relative difference
 */
function relDiff(a: number, b: number): number {
    return Math.abs(a - b) / Math.abs(b);
}

describe("exact vs grid (spec 11.4; PD-19, PD-20)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "grid-exact" });
    });

    for (const name of FIXTURES) {
        for (const dim of [2, 3] as const) {
            it(
                `(1) ${name}/${dim}d at two sizes, both measured: twice bitwise, finite; the floored per-node error's RMS and p99 under grid-exact.rms / grid-exact.p99 on the asserted fixtures of a hardware adapter, printed otherwise`,
                async (t) => {
                    requireGpu(t);
                    const options = { ...GRID_BASE_OPTIONS, dim };
                    const rmsTolerance = gridTolerance("grid-exact.rms").value;
                    const p99Tolerance = gridTolerance("grid-exact.p99").value;
                    const software = isSoftware();
                    const asserted = !software && ASSERTED.includes(name);
                    const measured: Measurement[] = [];
                    let previous = -1;
                    for (const scale of sizes()) {
                        const { snapshot: s, start } = await exactInputs(ctx, name, scale, options);
                        try {
                            if (s.nodeCount === previous) {
                                continue;
                            }
                            previous = s.nodeCount;
                            const label = `${name}/${dim}d/n=${s.nodeCount}`;
                            const a = await exactVsGrid(ctx, s, start, options);
                            const b = await exactVsGrid(ctx, s, start, options);
                            expectBitwiseEqual(a.grid, b.grid, `${label}: run 1 vs run 2`);
                            expect(a.grid.every(Number.isFinite), `${label}: the grid force is finite`).toBe(true);
                            const field = fieldRelError(a.grid, a.exact);
                            expect(
                                [a.rms, a.p99, field].every(Number.isFinite),
                                `${label}: the statistics are finite`,
                            ).toBe(true);
                            console.warn(
                                `[grid-exact] ${label}: rms ${a.rms.toExponential(3)} (tolerance ${rmsTolerance.toExponential(3)}), p99 ${a.p99.toExponential(3)} (tolerance ${p99Tolerance.toExponential(3)}), max ${a.max.toExponential(3)}; |grid - exact| / |exact| over the whole force field ${field.toExponential(3)}`,
                            );
                            measured.push({ n: s.nodeCount, rms: a.rms, p99: a.p99, field });
                        } finally {
                            ctx.release(s);
                        }
                    }
                    const verdict = (m: Measurement): string =>
                        m.rms <= rmsTolerance && m.p99 <= p99Tolerance ? "under the caps" : "OVER";
                    console.warn(
                        `[grid-exact] summary ${name}/${dim}d (${asserted ? "asserted" : "printed"}${software ? ", software adapter" : ""}): ${measured
                            .map(
                                (m) =>
                                    `n=${m.n} rms ${m.rms.toExponential(3)} p99 ${m.p99.toExponential(3)} field ${m.field.toExponential(3)} ${verdict(m)}`,
                            )
                            .join("; ")}`,
                    );
                    if (!asserted) {
                        return;
                    }
                    for (const m of measured) {
                        assertCheckPasses({
                            worst: ratioOf(m.rms, rmsTolerance),
                            worstLabel: `${name}/${dim}d/n=${m.n}/rms`,
                            samples: m.n,
                        });
                        assertCheckPasses({
                            worst: ratioOf(m.p99, p99Tolerance),
                            worstLabel: `${name}/${dim}d/n=${m.n}/p99`,
                            samples: m.n,
                        });
                    }
                },
                CASE_TIMEOUT,
            );
        }
    }

    for (const dim of [2, 3] as const) {
        it(
            `(2) isolated/${dim}d at the strays' equilibrium: every degree-0 node's force after G7 is gravity plus the field of the others (the design's "gravity alone" item, the far and near terms named)`,
            async (t) => {
                requireGpu(t);
                const options = { ...GRID_BASE_OPTIONS, dim };
                const { snapshot: s, start } = await exactInputs(ctx, "isolated", gpuScale(), options);
                try {
                    const degree = s.outDegree();
                    const strays: number[] = [];
                    for (let i = 0; i < s.nodeCount; i++) {
                        if (degree[i] === 0) {
                            strays.push(i);
                        }
                    }
                    expect(strays.length, "isolated nodes").toBeGreaterThan(0);
                    const capture = await captureGridStages(ctx, s, start, options, null);
                    const { oracle } = capture;
                    const force = capture.stages.nearField.values;
                    const got = new Float64Array(3 * strays.length);
                    const gravityAlone = new Float64Array(3 * strays.length);
                    const want = new Float64Array(3 * strays.length);
                    let nearAbs = 0;
                    let farRatio = 0;
                    for (let k = 0; k < strays.length; k++) {
                        const i = strays[k];
                        let g2 = 0;
                        let f2 = 0;
                        for (let a = 0; a < 3; a++) {
                            got[3 * k + a] = force[3 * i + a];
                            gravityAlone[3 * k + a] = oracle.gravity[3 * i + a];
                            want[3 * k + a] =
                                oracle.gravity[3 * i + a] + oracle.farField[3 * i + a] + oracle.nearField[3 * i + a];
                            g2 += oracle.gravity[3 * i + a] ** 2;
                            f2 += oracle.farField[3 * i + a] ** 2;
                            nearAbs = Math.max(nearAbs, Math.abs(oracle.nearField[3 * i + a]));
                        }
                        farRatio = Math.max(farRatio, Math.sqrt(f2) / Math.sqrt(g2));
                    }
                    const tolerance = gridTolerance("grid-inspect.nearField").value;
                    const err = stageError(true, got, want);
                    const alone = stageError(true, got, gravityAlone);
                    console.warn(
                        `[grid-exact] isolated/${dim}d: ${strays.length} strays; force vs gravity + far field rel ${err.rel.toExponential(3)}; vs gravity alone rel ${alone.rel.toExponential(3)}; |far| / |gravity| up to ${farRatio.toExponential(3)} (${farRatio <= tolerance ? "negligible: the design's gravity-alone item holds as written" : "NOT negligible at the scaled equilibrium: the check compares against gravity + farField_oracle (the record's item)"}); the strays' near field (a stray within the 3x3 of another stray or of the core: ${nearAbs > 0 ? "present, included in the expectation and named in the record" : "absent, the design's item as written"}) up to ${nearAbs.toExponential(3)}`,
                    );
                    assertCheckPasses({
                        worst: ratioOf(err.rel, tolerance),
                        worstLabel: `isolated/${dim}d strays`,
                        samples: strays.length,
                    });
                } finally {
                    ctx.release(s);
                }
            },
            CASE_TIMEOUT,
        );
    }

    for (const name of ["hubcell", "onecell1025"]) {
        it(
            `(3) ${name} at nearMax ${NEAR_MAX_SAMPLING}: the mean of G7's force over ${UNBIASED_SEEDS} seeds is within grid-unbiased of the exact tier's over the whole force field (the ladder from ${UNBIASED_LADDER_FIRST} seeds printed)`,
            async (t) => {
                requireGpu(t);
                const { snapshot: s, start } = gridFixture(name, gpuScale(), GRID_BASE_OPTIONS);
                try {
                    const t0 = performance.now();
                    const u = await unbiasedLadder(ctx, s, start, GRID_BASE_OPTIONS);
                    const tolerance = gridTolerance("grid-unbiased").value;
                    const top = u.rungs[u.rungs.length - 1];
                    console.warn(
                        `[grid-exact] unbiased/${name}/n=${s.nodeCount}: |mean - exact| / |exact| over the whole force field at ${top.seeds} seeds ${top.field.toExponential(3)} (tolerance ${tolerance.toExponential(3)}); rms of the floored per-node error of the same mean ${top.rms.toExponential(3)}, of one seed ${u.rmsOneSeed.toExponential(3)}; ${UNBIASED_SEEDS} grid iterations ${(performance.now() - t0).toFixed(0)} ms`,
                    );
                    console.warn(
                        `[grid-exact] unbiased/${name}/n=${s.nodeCount} ladder (seeds: whole-field ratio / per-node rms): ${u.rungs.map((r) => `${r.seeds}: ${r.field.toExponential(3)} / ${r.rms.toExponential(3)}`).join("; ")}`,
                    );
                    assertCheckPasses({
                        worst: ratioOf(top.field, tolerance),
                        worstLabel: `unbiased/${name}`,
                        samples: s.nodeCount,
                    });
                } finally {
                    ctx.release(s);
                }
            },
            CASE_TIMEOUT,
        );
    }

    for (const name of ["random20k", "clumpy100"]) {
        it(
            `(4, 5) ${name} at two sizes: the grid tier's spread after 50 and 200 iterations within grid-expansion of the exact tier's (asserted on a hardware adapter, printed on a software one); layoutMetrics after 200 within grid-distributional at the first size`,
            async (t) => {
                requireGpu(t);
                const expansion = gridTolerance("grid-expansion").value;
                const distributional = gridTolerance("grid-distributional").value;
                const assertExpansion = !isSoftware();
                for (const [k, scale] of sizes().entries()) {
                    const { snapshot: s, start } = gridFixture(name, scale, GRID_BASE_OPTIONS);
                    try {
                        const label = `${name}/n=${s.nodeCount}`;
                        const g = await trajectory(ctx, s, start, GRID_BASE_OPTIONS, GRID_TUNING);
                        const e = await trajectory(ctx, s, start, GRID_BASE_OPTIONS, EXACT_TUNING);
                        const err50 = relDiff(g.spread50, e.spread50);
                        const err200 = relDiff(g.spread200, e.spread200);
                        console.warn(
                            `[grid-exact] expansion/${label}: spread after 50 grid ${g.spread50.toFixed(4)} exact ${e.spread50.toFixed(4)} (rel ${err50.toExponential(3)}); after 200 grid ${g.spread200.toFixed(4)} exact ${e.spread200.toFixed(4)} (rel ${err200.toExponential(3)}); tolerance ${expansion.toExponential(3)}${assertExpansion ? "" : " (printed: software adapter)"}`,
                        );
                        expect(
                            [err50, err200].every(Number.isFinite),
                            `expansion/${label}: the spread ratios are finite`,
                        ).toBe(true);
                        if (assertExpansion) {
                            assertCheckPasses({
                                worst: ratioOf(Math.max(err50, err200), expansion),
                                worstLabel: `expansion/${label}`,
                                samples: 2,
                            });
                        }
                        if (name === "random20k" && k === 0) {
                            const gm = layoutMetrics(s, g.positions, 2);
                            const em = layoutMetrics(s, e.positions, 2);
                            const err = distributionalError(gm, em);
                            console.warn(
                                `[grid-exact] distributional/${label}: worst metric difference ${err.toExponential(3)} (tolerance ${distributional.toExponential(3)}; stress grid ${gm.stress.toFixed(4)} exact ${em.stress.toFixed(4)}, nnQ50 grid ${gm.nnQ50.toFixed(4)} exact ${em.nnQ50.toFixed(4)})`,
                            );
                            const report: CheckReport = {
                                worst: ratioOf(err, distributional),
                                worstLabel: `distributional/${label}`,
                                samples: Object.keys(em).length,
                            };
                            assertCheckPasses(report);
                        }
                    } finally {
                        ctx.release(s);
                    }
                }
            },
            CASE_TIMEOUT,
        );
    }

    it(
        "writes the five approximation members of the UNSCALED random20k / hubcell with their exact-tier references (GRAPHTY_NOISE_FLOOR_WRITE=1 only)",
        async (t) => {
            if (process.env.GRAPHTY_NOISE_FLOOR_WRITE !== "1") {
                // G4-F12: the 4,096-seed hubcell ladder alone costs ~250 s on lavapipe; without the flag the writes
                // are no-ops and test/noise-floor.test.ts checks the committed fixtures on every run.
                t.skip("noise fixtures are written under GRAPHTY_NOISE_FLOOR_WRITE=1 only");
            }
            requireGpu(t);
            const cls = adapterClass(ctx.caps);
            const write = (
                name: keyof typeof GRID_NOISE_FIXTURES,
                values: ArrayLike<number>,
                exact: ArrayLike<number>,
            ): void => {
                const { kernel, fixture } = GRID_NOISE_FIXTURES[name];
                writeNoiseFixture(kernel, fixture, cls, values, "f32");
                writeNoiseFixture(kernel, fixture, ORACLE_F64_CLASS, exact, "f32");
            };
            const random = gridFixture("random20k", 1, GRID_BASE_OPTIONS);
            try {
                const { snapshot: s, start } = random;
                const n = s.nodeCount;
                const a = await exactVsGrid(ctx, s, start, GRID_BASE_OPTIONS);
                console.warn(
                    `[grid-exact] noise/random20k: rms ${a.rms.toExponential(3)}, p99 ${a.p99.toExponential(3)}`,
                );
                write("exactRms", sampleNodes(a.grid, n), sampleNodes(a.exact, n));
                write("exactP99", sampleNodes(a.grid, n), sampleNodes(a.exact, n));
                const g = await trajectory(ctx, s, start, GRID_BASE_OPTIONS, GRID_TUNING);
                const e = await trajectory(ctx, s, start, GRID_BASE_OPTIONS, EXACT_TUNING);
                console.warn(
                    `[grid-exact] noise/random20k: spread 50 grid ${g.spread50.toFixed(4)} exact ${e.spread50.toFixed(4)}, spread 200 grid ${g.spread200.toFixed(4)} exact ${e.spread200.toFixed(4)}`,
                );
                write("expansion", [g.spread50, g.spread200], [e.spread50, e.spread200]);
                const gm = metricsValues(layoutMetrics(s, g.positions, 2));
                const em = metricsValues(layoutMetrics(s, e.positions, 2));
                expect(gm.keys).toEqual(em.keys);
                write("distributional", gm.values, em.values);
            } finally {
                ctx.release(random.snapshot);
            }
            const hub = gridFixture("hubcell", 1, GRID_BASE_OPTIONS);
            try {
                const u = await unbiasedLadder(ctx, hub.snapshot, hub.start, GRID_BASE_OPTIONS);
                const top = u.rungs[u.rungs.length - 1];
                console.warn(
                    `[grid-exact] noise/hubcell: |mean - exact| / |exact| over the whole force field at ${top.seeds} seeds ${top.field.toExponential(3)}; rms of the floored per-node error ${top.rms.toExponential(3)}`,
                );
                const n = hub.snapshot.nodeCount;
                write("unbiased", sampleNodes(u.mean, n), sampleNodes(u.exact, n));
            } finally {
                ctx.release(hub.snapshot);
            }
        },
        WRITER_TIMEOUT,
    );
});
