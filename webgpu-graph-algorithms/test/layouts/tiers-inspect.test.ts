/**
 * The K2 degree tiers inside the layout (P4-T6; spec 7.5, 11.9 item 2; PD-7): on hub10k and rmat14 (at gpuScale),
 * weighted and unweighted, 2D, every stage of captureAllStages is bitwise the same twice and the attraction stage
 * equals the f64 oracle within the ANALYTIC per-node bound deg_i x 2^-22 (the floored per-node metric of spec 11.4
 * with the bound in place of a derived tolerance; the derived `tiers-inspect.attraction` tolerance is P4-T11's);
 * the `fa2-attraction` pipelines the run creates carry exactly the tiers the degrees populate (TIER 0 / 1 / 2 with
 * USE_PERM true on rmat14; TIER 0 and the hub's tier on hub10k; TIER 0 with USE_PERM false only on karate); the FR
 * and spring simulations reach the same keys on rmat14; the pinned-hub case of hub10k; and the writer case of the
 * `hub10k-K2-tiers` noise fixture (GRAPHTY_NOISE_FLOOR_WRITE=1 only).
 */

import { type TestContext } from "vitest";

import { type GpuContext } from "../../src/context.js";
import {
    attractionBounds,
    attractionOracle,
    attractionReport,
    attractionStage,
} from "../helpers/attraction-check.js";
import {
    BASE_OPTIONS,
    captureAllStages,
    ORACLE_F64_CLASS,
    PAPER,
    type ParityGraph,
    paritySnapshot,
    pinMask,
    STAGE_KEYS,
    stageError,
    stageReport,
    startPositions,
} from "../helpers/fa2-parity.js";
import { FR_BASE_OPTIONS, FR_TUNING, withFrSim } from "../helpers/fr-parity.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { SE_BASE_OPTIONS, SE_TUNING, withSeSim } from "../helpers/se-parity.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;
const TIER_GRAPHS: readonly ParityGraph[] = ["hub10k", "rmat14"];

/** The `fa2-attraction` pipeline keys the context created, as their (TIER, USE_PERM) pairs sorted by TIER. */
function k2KeysOf(ctx: GpuContext): { readonly tier: number; readonly usePerm: boolean }[] {
    const out: { tier: number; usePerm: boolean }[] = [];
    for (const key of ctx.pipelines.keys()) {
        if (!key.startsWith("fa2-attraction|")) {
            continue;
        }
        const overrides = JSON.parse(key.split("|")[1]) as { USE_PERM?: boolean; TIER?: number };
        out.push({ tier: overrides.TIER ?? 0, usePerm: overrides.USE_PERM === true });
    }
    return out.sort((a, b) => a.tier - b.tier);
}

/** The tiers a snapshot's segment offsets populate (PD-7): 0 always, 1 when [hiEnd, midEnd) is non-empty, 2 when hiEnd > 0. */
function expectedTiers(so: ArrayLike<number>): number[] {
    const tiers = [0];
    if (so[2] > so[1]) {
        tiers.push(1);
    }
    if (so[1] > 0) {
        tiers.push(2);
    }
    return tiers.sort((a, b) => a - b);
}

describe("the K2 degree tiers inside the layout (P4-T6, PD-7)", () => {
    /** A FRESH context per case: the pipeline keys a case asserts on must be its own. */
    async function fresh(t: TestContext, label: string): Promise<GpuContext> {
        requireGpu(t);
        return await acquire({ label });
    }

    for (const graph of TIER_GRAPHS) {
        for (const weighted of [false, true]) {
            const label = `${graph}${weighted ? "-w" : ""}`;
            it(
                `${label}: every stage bitwise twice, K2 within deg_i x 2^-22 of the f64 oracle, the tier pipelines the degrees populate`,
                async (t) => {
                    const ctx = await fresh(t, `tiers-inspect/${label}`);
                    const s = paritySnapshot(graph, gpuScale(), weighted);
                    try {
                        const so = Array.from(s.degreeOrder().segmentOffsets);
                        expect(so[2], `${label}: a row of degree >= 32 exists`).toBeGreaterThan(0);
                        const options = weighted ? { ...BASE_OPTIONS, weight: true } : BASE_OPTIONS;
                        const start = startPositions(s, options, false);
                        const a = await captureAllStages(ctx, s, start, options, PAPER, null);
                        const b = await captureAllStages(ctx, s, start, options, PAPER, null);
                        for (const key of STAGE_KEYS) {
                            expectBitwiseEqual(a[key].values, b[key].values, `${label}/${key}: run 1 vs run 2`);
                        }
                        const report = attractionReport(
                            a.attraction.values,
                            a.attraction.expected,
                            attractionBounds(s),
                            `${label}/attraction`,
                        );
                        console.warn(
                            `[tiers-inspect] ${label}/attraction: error ${a.attraction.error.toExponential(3)}, ratio over the analytic bound ${report.worst.toExponential(3)}`,
                        );
                        assertCheckPasses(report);
                        expect(a.attraction.values.every((v) => Number.isFinite(v))).toBe(true);
                        const keys = k2KeysOf(ctx);
                        expect(keys.map((k) => k.tier)).toEqual(expectedTiers(so));
                        expect(keys.every((k) => k.usePerm)).toBe(true);
                        if (graph === "rmat14") {
                            expect(keys.map((k) => k.tier)).toEqual([0, 1, 2]);
                        } else if (so[1] > 0) {
                            // the hub alone reaches 1024 leaves; no leaf reaches 32
                            expect(keys.map((k) => k.tier)).toEqual([0, 2]);
                        } else {
                            // a software adapter's scaled star of ~200 leaves puts the hub in the mid tier
                            expect(keys.map((k) => k.tier)).toEqual([0, 1]);
                        }
                    } finally {
                        ctx.release(s);
                        ctx.dispose();
                    }
                },
                CASE_TIMEOUT,
            );
        }
    }

    it(
        "karate: no row of degree >= 32, so perm stays the dummy and only TIER 0 with USE_PERM false is compiled",
        async (t) => {
            const ctx = await fresh(t, "tiers-inspect/karate");
            const s = paritySnapshot("karate", 1, false);
            try {
                expect(s.degreeOrder().segmentOffsets[2]).toBe(0);
                const start = startPositions(s, BASE_OPTIONS, false);
                const a = await captureAllStages(ctx, s, start, BASE_OPTIONS, PAPER, null);
                for (const key of STAGE_KEYS) {
                    assertCheckPasses(stageReport(a, key));
                }
                expect(k2KeysOf(ctx)).toEqual([{ tier: 0, usePerm: false }]);
            } finally {
                ctx.release(s);
                ctx.dispose();
            }
        },
        CASE_TIMEOUT,
    );

    it(
        "the Fruchterman-Reingold and spring-electrical simulations on rmat14 reach the same three tier pipelines",
        async (t) => {
            const ctx = await fresh(t, "tiers-inspect/fr-se");
            const s = paritySnapshot("rmat14", gpuScale(), false);
            try {
                await withFrSim(ctx, FR_BASE_OPTIONS, FR_TUNING, async (sim) => {
                    sim.load(s, startPositions(s, FR_BASE_OPTIONS, false));
                    await sim.step(1);
                });
                const frKeys = k2KeysOf(ctx);
                expect(frKeys.map((k) => k.tier)).toEqual([0, 1, 2]);
                expect(frKeys.every((k) => k.usePerm)).toBe(true);
                await withSeSim(ctx, SE_BASE_OPTIONS, SE_TUNING, async (sim) => {
                    sim.load(s, startPositions(s, SE_BASE_OPTIONS, false));
                    await sim.step(1);
                });
                // the spring model's own LAW 2 keys join the FR model's LAW 1 keys: three tiers of each
                const seKeys = k2KeysOf(ctx);
                expect(seKeys.map((k) => k.tier)).toEqual([0, 0, 1, 1, 2, 2]);
                expect(seKeys.every((k) => k.usePerm)).toBe(true);
            } finally {
                ctx.release(s);
                ctx.dispose();
            }
        },
        CASE_TIMEOUT,
    );

    it(
        "hub10k with the hub pinned: its attraction is computed through its tier, the free count excludes it, K5 leaves it in place",
        async (t) => {
            const ctx = await fresh(t, "tiers-inspect/pinned-hub");
            const s = paritySnapshot("hub10k", gpuScale(), false);
            try {
                const hub = 0;
                const mask = pinMask(s.nodeCount, hub);
                const start = startPositions(s, BASE_OPTIONS, false);
                const a = await captureAllStages(ctx, s, start, BASE_OPTIONS, PAPER, mask);
                // the stages after K2 are NOT held to the fa2-inspect.* tolerances here: those were recorded on
                // random1k, and the exact repulsion's 10k-term sums of the unscaled hub10k put the K5 positions at
                // 2x that floor on NVIDIA whether or not the hub is pinned (measured at P4-T6; the hub10k stage
                // tolerances are P4-T11's). Every stage is finite; K2 is held to its analytic bound below.
                for (const key of STAGE_KEYS) {
                    expect(
                        a[key].values.every((v) => Number.isFinite(v)),
                        `${key}: finite`,
                    ).toBe(true);
                }
                assertCheckPasses(
                    attractionReport(
                        a.attraction.values,
                        a.attraction.expected,
                        attractionBounds(s),
                        "hub10k-pinned/attraction",
                    ),
                );
                expect(a.partials.values[12], "free count").toBe(s.nodeCount - 1);
                expect(
                    Math.hypot(
                        a.attraction.values[3 * hub],
                        a.attraction.values[3 * hub + 1],
                        a.attraction.values[3 * hub + 2],
                    ),
                    "the pinned hub's attraction",
                ).toBeGreaterThan(0);
                for (let k = 0; k < 3; k++) {
                    expect(a.positions.values[3 * hub + k], `pinned position component ${k}`).toBe(
                        k === 2 ? 0 : start[3 * hub + k],
                    );
                }
            } finally {
                ctx.release(s);
                ctx.dispose();
            }
        },
        CASE_TIMEOUT,
    );

    it(
        "writes this adapter's K2 output of the UNSCALED hub10k and the f64 reference as the hub10k-K2-tiers noise fixtures (GRAPHTY_NOISE_FLOOR_WRITE=1 only)",
        async (t) => {
            const ctx = await fresh(t, "tiers-inspect/noise");
            const s = paritySnapshot("hub10k", 1, false);
            try {
                // K2 alone on both sides: captureAllStages would also run the f64 oracle's all-pairs K3, 10^8
                // synchronous pair terms on the unscaled hub10k that nothing here reads, and under coverage on a
                // CI runner that one call outlasted vitest's 60 s worker RPC timeout (issue #413)
                const start = startPositions(s, BASE_OPTIONS, false);
                const values = await attractionStage(ctx, s, start, BASE_OPTIONS, PAPER, null);
                const expected = attractionOracle(s, start, BASE_OPTIONS, PAPER, null);
                const cls = adapterClass(ctx.caps);
                writeNoiseFixture("fa2-attraction", "hub10k-K2-tiers", cls, values, "f32");
                writeNoiseFixture("fa2-attraction", "hub10k-K2-tiers", ORACLE_F64_CLASS, expected, "f32");
                const report = attractionReport(values, expected, attractionBounds(s), "noise/hub10k/attraction");
                console.warn(
                    `[tiers-inspect] noise/hub10k/attraction: error ${stageError(true, values, expected).rel.toExponential(3)}, ratio over the analytic bound ${report.worst.toExponential(3)}`,
                );
                assertCheckPasses(report);
            } finally {
                ctx.release(s);
                ctx.dispose();
            }
        },
        CASE_TIMEOUT,
    );
});
