/**
 * Per-kernel inspection parity of the Fruchterman-Reingold model (spec 11.9 item 2; P5-T4 Step 2, the
 * fa2-inspect.test.ts pattern): debugRunStages("K2") then inspect("force") equals the oracle's attraction stage
 * (LAW 1, d^2 / k); after "K3" the force (k^2 / d added); after "K5" the positions, the displacement (the G5
 * quantity, design 13 row P5: <= 1e-4 against the CPU FR oracle) and the partials A / C; after "toScene" the scene
 * positions; and the K1 fold of iteration 2 with the traced temperature -- each within the tolerance traced to
 * benchmarks/results/noise-floor.json, on five graphs in 2D and 3D with k null and k 0.3, twice bitwise. A weighted
 * copy of every graph gives the IDENTICAL result stage by stage: HAS_WEIGHTS never reaches the law (PD-11). The
 * first block pins the stage tables.
 */

import type { GpuContext } from "../../src/context.js";
import type { FruchtermanReingoldOptions } from "../../src/types/options.js";
import {
    ORACLE_F64_CLASS,
    type ParityGraph,
    paritySnapshot,
    pinIndex,
    pinMask,
    startPositions,
} from "../helpers/fa2-parity.js";
import {
    captureFrStages,
    FR_BASE_OPTIONS,
    FR_K03,
    FR_K03_FIXTURES,
    FR_KARATE_FIXTURES,
    FR_NOISE_FIXTURES,
    FR_STAGE_KERNEL,
    FR_STAGE_KEYS,
    FR_STAGE_TOLERANCE,
    type FrNoiseFixtureName,
    type FrStageKey,
    frStageReport,
    P5_TOLERANCE_CAPS,
} from "../helpers/fr-parity.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;
const GRAPHS: readonly ParityGraph[] = ["karate", "grid10", "star200", "path10", "random1k"];
const DIMS: readonly (2 | 3)[] = [2, 3];
/** The optimal distance: the auto default 1 / sqrt(n) and an explicit value. */
const K_VALUES: readonly (number | null)[] = [null, 0.3];
/** The index of the free count in the partials stage's values. */
const FREE_COUNT_AT = 12;
/** The index of the temperature in the k1 stage's values. */
const TEMPERATURE_AT = 8;

describe("fr-parity helper (pure)", () => {
    it("the stage tables agree: every stage has a kernel, a tolerance id with a cap and a noise fixture", () => {
        expect(FR_STAGE_KEYS).toEqual(["attraction", "force", "positions", "displacement", "partials", "scene", "k1"]);
        for (const key of FR_STAGE_KEYS) {
            expect(P5_TOLERANCE_CAPS[FR_STAGE_TOLERANCE[key]], `${key}: cap`).toBeDefined();
            expect(FR_NOISE_FIXTURES[key].fixture.startsWith("fr-random1k-"), `${key}: fixture name`).toBe(true);
            expect(FR_NOISE_FIXTURES[key].kernel).toBe(FR_STAGE_KERNEL[key]);
        }
        expect(FR_NOISE_FIXTURES.traj10.kernel).toBe("fa2-integrate");
        expect(FR_NOISE_FIXTURES.layout10.fixture).toBe("fr-karate-layout10");
        expect(FR_NOISE_FIXTURES.metrics100.kernel).toBe("fa2-integrate");
        for (const [id, spec] of Object.entries(P5_TOLERANCE_CAPS)) {
            expect(spec.cap, `${id}: cap > 0`).toBeGreaterThan(0);
            expect(spec.basis.length, `${id}: basis`).toBeGreaterThan(0);
            expect(id.startsWith("fr-"), `${id}: an FR id`).toBe(true);
        }
        // 13 oracle / twin / force-sum ids and 10 .cross ids (P5-T4 Step 3)
        expect(Object.keys(P5_TOLERANCE_CAPS)).toHaveLength(23);
        expect(Object.keys(P5_TOLERANCE_CAPS).filter((id) => id.endsWith(".cross"))).toHaveLength(10);
    });
});

describe("FR inspect(): every stage against the oracle's (spec 11.9 item 2; G5)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "fr-inspect" });
    });

    for (const graph of GRAPHS) {
        for (const dim of DIMS) {
            for (const k of K_VALUES) {
                const label = `${graph}/${dim}d/k=${k ?? "auto"}`;
                it(
                    `${label}: K2, K3, K5 (positions, displacement, partials), toScene and the K1 fold within their traced tolerances, twice bitwise; the weighted copy identical`,
                    async (t) => {
                        requireGpu(t);
                        const s = paritySnapshot(graph, gpuScale(), false);
                        const weighted = paritySnapshot(graph, gpuScale(), true);
                        try {
                            const options: FruchtermanReingoldOptions = { ...FR_BASE_OPTIONS, dim, k };
                            const start = startPositions(s, options, false);
                            const a = await captureFrStages(ctx, s, start, options, null);
                            const b = await captureFrStages(ctx, s, start, options, null);
                            const w = await captureFrStages(ctx, weighted, start, options, null);
                            for (const key of FR_STAGE_KEYS) {
                                expectBitwiseEqual(a[key].values, b[key].values, `${label}/${key}: run 1 vs run 2`);
                                expectBitwiseEqual(
                                    a[key].values,
                                    w[key].values,
                                    `${label}/${key}: weighted vs unweighted (HAS_WEIGHTS never reaches the law)`,
                                );
                                const report = frStageReport(a, key);
                                console.warn(
                                    `[fr-inspect] ${label}/${key} (${FR_STAGE_KERNEL[key]}): error ${a[key].error.toExponential(3)}, ratio ${report.worst.toExponential(3)}`,
                                );
                                assertCheckPasses(report);
                            }
                            // structure that needs no tolerance: the iteration counter after one real step and the
                            // debug K1, the free count, a positive temperature, finite forces
                            expect(a.k1.values[7], `${label}: S.iteration after step(1) + K1`).toBe(2);
                            expect(a.k1.values[TEMPERATURE_AT], `${label}: temperature`).toBeGreaterThan(0);
                            expect(a.partials.values[FREE_COUNT_AT], `${label}: free count`).toBe(s.nodeCount);
                            expect(a.attraction.values.every((v) => Number.isFinite(v))).toBe(true);
                            expect(a.force.values.every((v) => Number.isFinite(v))).toBe(true);
                            if (dim === 2) {
                                for (let i = 0; i < s.nodeCount; i++) {
                                    expect(a.positions.values[3 * i + 2], `${label}: z of node ${i}`).toBe(0);
                                }
                            }
                        } finally {
                            ctx.release(s);
                            ctx.release(weighted);
                        }
                    },
                    CASE_TIMEOUT,
                );
            }
        }
    }

    it(
        "a pinned node (karate): its force is computed, its displacement is exactly zero, the free count excludes it, every stage still within tolerance",
        async (t) => {
            requireGpu(t);
            const s = paritySnapshot("karate", 1, false);
            try {
                const pinned = pinIndex(s.nodeCount);
                const mask = pinMask(s.nodeCount, pinned);
                const start = startPositions(s, FR_BASE_OPTIONS, false);
                const a = await captureFrStages(ctx, s, start, FR_BASE_OPTIONS, mask);
                const b = await captureFrStages(ctx, s, start, FR_BASE_OPTIONS, mask);
                for (const key of FR_STAGE_KEYS) {
                    expectBitwiseEqual(a[key].values, b[key].values, `pinned/${key}: run 1 vs run 2`);
                    assertCheckPasses(frStageReport(a, key));
                }
                expect(a.partials.values[FREE_COUNT_AT], "free count").toBe(s.nodeCount - 1);
                expect(
                    Math.hypot(
                        a.force.values[3 * pinned],
                        a.force.values[3 * pinned + 1],
                        a.force.values[3 * pinned + 2],
                    ),
                    "the pinned node's force",
                ).toBeGreaterThan(0);
                for (let k = 0; k < 3; k++) {
                    expect(a.displacement.values[3 * pinned + k], `pinned displacement component ${k}`).toBe(0);
                    expect(a.positions.values[3 * pinned + k], `pinned position component ${k}`).toBe(
                        k === 2 ? 0 : start[3 * pinned + k],
                    );
                }
                // every free node moved (the temperature cap is 0.1 and every force is far above it at the start)
                let moved = 0;
                for (let i = 0; i < s.nodeCount; i++) {
                    if (i !== pinned && a.displacement.values.subarray(3 * i, 3 * i + 3).some((v) => v !== 0)) {
                        moved++;
                    }
                }
                expect(moved).toBe(s.nodeCount - 1);
            } finally {
                ctx.release(s);
            }
        },
        CASE_TIMEOUT,
    );

    it(
        "writes this adapter's stage outputs of the UNSCALED random1k, of karate and of random1k under k 0.3, and the f64 reference of each as noise fixtures (GRAPHTY_NOISE_FLOOR_WRITE=1 only)",
        async (t) => {
            requireGpu(t);
            const cls = adapterClass(ctx.caps);
            const members: readonly {
                readonly graph: ParityGraph;
                readonly options: FruchtermanReingoldOptions;
                readonly fixtures: Readonly<Record<FrStageKey, FrNoiseFixtureName>>;
                readonly keys: readonly FrStageKey[];
            }[] = [
                { graph: "random1k", options: FR_BASE_OPTIONS, fixtures: FR_NOISE_FIXTURES, keys: FR_STAGE_KEYS },
                { graph: "karate", options: FR_BASE_OPTIONS, fixtures: FR_KARATE_FIXTURES, keys: FR_STAGE_KEYS },
                {
                    graph: "random1k",
                    options: { ...FR_BASE_OPTIONS, k: FR_K03 },
                    fixtures: FR_K03_FIXTURES,
                    keys: FR_STAGE_KEYS,
                },
            ];
            for (const m of members) {
                const s = paritySnapshot(m.graph, 1, false);
                try {
                    const start = startPositions(s, m.options, false);
                    const capture = await captureFrStages(ctx, s, start, m.options, null);
                    // the raw outputs are written BEFORE the checks (never hand-written; a floor above the cap surfaces
                    // through the noise-floor validation, not through missing fixtures)
                    for (const key of m.keys) {
                        const name = m.fixtures[key];
                        writeNoiseFixture(name.kernel, name.fixture, cls, capture[key].values, "f32");
                        writeNoiseFixture(name.kernel, name.fixture, ORACLE_F64_CLASS, capture[key].expected, "f32");
                    }
                    for (const key of m.keys) {
                        const report = frStageReport(capture, key);
                        console.warn(
                            `[fr-inspect] noise/${m.fixtures[key].fixture} (${FR_STAGE_KERNEL[key]}): error ${capture[key].error.toExponential(3)}, ratio ${report.worst.toExponential(3)}`,
                        );
                        assertCheckPasses(report);
                    }
                } finally {
                    ctx.release(s);
                }
            }
        },
        CASE_TIMEOUT,
    );
});
