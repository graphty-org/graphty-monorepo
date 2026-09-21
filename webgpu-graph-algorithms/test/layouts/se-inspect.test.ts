/**
 * Per-kernel inspection parity of the spring-electrical preset (spec 11.9 item 2; P5-T4 Step 2, fr-inspect.test.ts
 * applied to the spring model): debugRunStages("K2") then inspect("force") equals the oracle's spring stage (LAW 2,
 * k_s (d - L)); after "K3" the force (the Coulomb repulsion added); after "K5" the positions, the velocity (through
 * inspect("velocity"), PD-2), the displacement and the partials A / B / C; after "toScene" the scene positions; and
 * the K1 fold of iteration 2 with the kinetic energy it folded from step(1)'s partials B (the aligned form of PD-4)
 * -- each within the tolerance traced to benchmarks/results/noise-floor.json, on five graphs in 2D and 3D, twice
 * bitwise; a weighted copy of every graph gives the IDENTICAL result (PD-11). The pinned case: the pinned row's
 * velocity is unchanged (still 0) and its displacement exactly zero. The subgroup twins (the fr-twins.test.ts
 * pattern) live here too: a second context from acquire({ subgroups: false }); K2's springs bitwise, K3's force
 * within se-twins.force, the K5 outputs, partials and the K1 fold within se-twins.positions. The recording cases
 * write the se-* fixtures of every stage and the `<class>-no-subgroups` fixtures of the four twin members.
 */

import type { GpuContext } from "../../src/context.js";
import type { SpringElectricalOptions } from "../../src/types/options.js";
import {
    ORACLE_F64_CLASS,
    type ParityGraph,
    paritySnapshot,
    pinIndex,
    pinMask,
    stageError,
    startPositions,
    TWIN_SUFFIX,
} from "../helpers/fa2-parity.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses, type CheckReport, ratioOf } from "../helpers/sabotage.js";
import {
    captureSeStages,
    SE_BASE_OPTIONS,
    SE_KARATE_FIXTURES,
    SE_NOISE_FIXTURES,
    SE_STAGE_KERNEL,
    SE_STAGE_KEYS,
    SE_STAGE_TOLERANCE,
    SE_TOLERANCE_CAPS,
    type SeNoiseFixtureName,
    type SeStageKey,
    seStageReport,
    seTolerance,
} from "../helpers/se-parity.js";
import { acquire, adapterSummary, gpuScale, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;
const GRAPHS: readonly ParityGraph[] = ["karate", "grid10", "star200", "path10", "random1k"];
const DIMS: readonly (2 | 3)[] = [2, 3];
/** The index of the free count in the partials stage's values. */
const FREE_COUNT_AT = 12;
/** The index of the kinetic energy in the partials stage's values (partials B). */
const PARTIALS_KE_AT = 13;
/** The index of the kinetic energy in the k1 stage's values. */
const K1_KE_AT = 8;
/** Spec 12.2's second pass: both contexts are the workgroup twin (a policy skip, not a wrong-result skip). */
const NO_SUBGROUPS_PASS = process.env.GRAPHTY_GPU_NO_SUBGROUPS === "1";
const TWIN_GRAPHS: readonly ParityGraph[] = ["karate", "random1k"];
/** The tolerance each stage's twin comparison is held to (file header). */
const TWIN_TOLERANCE: Readonly<Record<SeStageKey, string>> = {
    attraction: "se-twins.force",
    force: "se-twins.force",
    positions: "se-twins.positions",
    velocity: "se-twins.positions",
    displacement: "se-twins.positions",
    partials: "se-twins.positions",
    scene: "se-twins.positions",
    k1: "se-twins.positions",
};
/** The noise members that carry a twin row (test/noise-floor.test.ts): K3 feeds se-twins.force.twin; K5, its partials and K1 feed se-twins.positions.twin. */
const TWIN_MEMBERS: readonly SeStageKey[] = ["force", "positions", "partials", "k1"];
/** The graphs the writer cases record, each with its fixture names: the UNSCALED random1k and the widening karate (se-parity.ts). */
const SE_WRITER_MEMBERS: readonly {
    readonly graph: ParityGraph;
    readonly fixtures: Readonly<Record<SeStageKey, SeNoiseFixtureName>>;
}[] = [
    { graph: "random1k", fixtures: SE_NOISE_FIXTURES },
    { graph: "karate", fixtures: SE_KARATE_FIXTURES },
];

describe("se-parity helper (pure)", () => {
    it("the stage tables agree: every stage has a kernel, a tolerance id with a cap and a noise fixture", () => {
        expect(SE_STAGE_KEYS).toEqual([
            "attraction",
            "force",
            "positions",
            "velocity",
            "displacement",
            "partials",
            "scene",
            "k1",
        ]);
        for (const key of SE_STAGE_KEYS) {
            expect(SE_TOLERANCE_CAPS[SE_STAGE_TOLERANCE[key]], `${key}: cap`).toBeDefined();
            expect(SE_NOISE_FIXTURES[key].fixture.startsWith("se-random1k-"), `${key}: fixture name`).toBe(true);
            expect(SE_NOISE_FIXTURES[key].kernel).toBe(SE_STAGE_KERNEL[key]);
        }
        for (const [id, spec] of Object.entries(SE_TOLERANCE_CAPS)) {
            expect(spec.cap, `${id}: cap > 0`).toBeGreaterThan(0);
            expect(spec.basis.length, `${id}: basis`).toBeGreaterThan(0);
            expect(id.startsWith("se-"), `${id}: a spring id`).toBe(true);
        }
        // 13 oracle / twin / force-sum ids and 10 .cross ids (P5-T4 Step 3)
        expect(Object.keys(SE_TOLERANCE_CAPS)).toHaveLength(23);
        expect(Object.keys(SE_TOLERANCE_CAPS).filter((id) => id.endsWith(".cross"))).toHaveLength(10);
    });
});

describe("spring-electrical inspect(): every stage against the oracle's (spec 11.9 item 2; G5)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "se-inspect" });
    });

    for (const graph of GRAPHS) {
        for (const dim of DIMS) {
            const label = `${graph}/${dim}d`;
            it(
                `${label}: K2, K3, K5 (positions, velocity, displacement, partials), toScene and the K1 fold within their traced tolerances, twice bitwise; the weighted copy identical`,
                async (t) => {
                    requireGpu(t);
                    const s = paritySnapshot(graph, gpuScale(), false);
                    const weighted = paritySnapshot(graph, gpuScale(), true);
                    try {
                        const options: SpringElectricalOptions = { ...SE_BASE_OPTIONS, dim };
                        const start = startPositions(s, options, false);
                        const a = await captureSeStages(ctx, s, start, options, null);
                        const b = await captureSeStages(ctx, s, start, options, null);
                        const w = await captureSeStages(ctx, weighted, start, options, null);
                        for (const key of SE_STAGE_KEYS) {
                            expectBitwiseEqual(a[key].values, b[key].values, `${label}/${key}: run 1 vs run 2`);
                            expectBitwiseEqual(
                                a[key].values,
                                w[key].values,
                                `${label}/${key}: weighted vs unweighted (the preset ignores weights, PD-11)`,
                            );
                            const report = seStageReport(a, key);
                            console.warn(
                                `[se-inspect] ${label}/${key} (${SE_STAGE_KERNEL[key]}): error ${a[key].error.toExponential(3)}, ratio ${report.worst.toExponential(3)}`,
                            );
                            assertCheckPasses(report);
                        }
                        expect(a.k1.values[7], `${label}: S.iteration after step(1) + K1`).toBe(2);
                        expect(a.partials.values[FREE_COUNT_AT], `${label}: free count`).toBe(s.nodeCount);
                        expect(
                            a.partials.values[PARTIALS_KE_AT],
                            `${label}: kinetic energy in partials B`,
                        ).toBeGreaterThan(0);
                        expect(a.k1.values[K1_KE_AT], `${label}: the folded kinetic energy`).toBeGreaterThan(0);
                        expect(
                            a.velocity.values.some((v) => v !== 0),
                            `${label}: the velocity moved off zero`,
                        ).toBe(true);
                        if (dim === 2) {
                            for (let i = 0; i < s.nodeCount; i++) {
                                expect(a.positions.values[3 * i + 2], `${label}: z of node ${i}`).toBe(0);
                                expect(a.velocity.values[3 * i + 2], `${label}: vz of node ${i}`).toBe(0);
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

    it(
        "a pinned node (karate): its force is computed, its velocity is unchanged (still 0) and its displacement exactly zero, the free count excludes it, every stage still within tolerance",
        async (t) => {
            requireGpu(t);
            const s = paritySnapshot("karate", 1, false);
            try {
                const pinned = pinIndex(s.nodeCount);
                const mask = pinMask(s.nodeCount, pinned);
                const start = startPositions(s, SE_BASE_OPTIONS, false);
                const a = await captureSeStages(ctx, s, start, SE_BASE_OPTIONS, mask);
                const b = await captureSeStages(ctx, s, start, SE_BASE_OPTIONS, mask);
                for (const key of SE_STAGE_KEYS) {
                    expectBitwiseEqual(a[key].values, b[key].values, `pinned/${key}: run 1 vs run 2`);
                    assertCheckPasses(seStageReport(a, key));
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
                    expect(a.velocity.values[3 * pinned + k], `pinned velocity component ${k}`).toBe(0);
                    expect(a.displacement.values[3 * pinned + k], `pinned displacement component ${k}`).toBe(0);
                    expect(a.positions.values[3 * pinned + k], `pinned position component ${k}`).toBe(
                        k === 2 ? 0 : start[3 * pinned + k],
                    );
                }
            } finally {
                ctx.release(s);
            }
        },
        CASE_TIMEOUT,
    );

    it(
        "writes this adapter's stage outputs of the UNSCALED random1k and of karate and the f64 reference of each as noise fixtures (GRAPHTY_NOISE_FLOOR_WRITE=1 only)",
        async (t) => {
            requireGpu(t);
            const cls = adapterClass(ctx.caps);
            for (const m of SE_WRITER_MEMBERS) {
                const s = paritySnapshot(m.graph, 1, false);
                try {
                    const start = startPositions(s, SE_BASE_OPTIONS, false);
                    const capture = await captureSeStages(ctx, s, start, SE_BASE_OPTIONS, null);
                    for (const key of SE_STAGE_KEYS) {
                        const name = m.fixtures[key];
                        writeNoiseFixture(name.kernel, name.fixture, cls, capture[key].values, "f32");
                        writeNoiseFixture(name.kernel, name.fixture, ORACLE_F64_CLASS, capture[key].expected, "f32");
                    }
                    for (const key of SE_STAGE_KEYS) {
                        const report = seStageReport(capture, key);
                        console.warn(
                            `[se-inspect] noise/${m.fixtures[key].fixture} (${SE_STAGE_KERNEL[key]}): error ${capture[key].error.toExponential(3)}, ratio ${report.worst.toExponential(3)}`,
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

describe("spring-electrical subgroup twins in-process (spec 11.3)", () => {
    let withSubgroups: GpuContext;
    let withoutSubgroups: GpuContext;

    beforeAll(async () => {
        withSubgroups = await acquire({ label: "se-twins/subgroups" });
        withoutSubgroups = await acquire({ label: "se-twins/no-subgroups", subgroups: false });
    });

    it("the two contexts are the two twins", () => {
        const adapterHasSubgroups = adapterSummary()?.features.includes("subgroups") === true;
        expect(withSubgroups.caps.features.has("subgroups")).toBe(!NO_SUBGROUPS_PASS && adapterHasSubgroups);
        expect(withoutSubgroups.caps.features.has("subgroups")).toBe(false);
        expect(adapterClass(withSubgroups.caps)).toBe(adapterClass(withoutSubgroups.caps));
    });

    for (const graph of TWIN_GRAPHS) {
        it(
            `${graph}: every stage agrees between the twins within the traced tolerances, each twice bitwise; K2's springs bitwise`,
            async (t) => {
                requireGpu(t);
                if (NO_SUBGROUPS_PASS) {
                    t.skip("GRAPHTY_GPU_NO_SUBGROUPS=1: both contexts are the workgroup twin");
                    return;
                }
                const s = paritySnapshot(graph, gpuScale(), false);
                try {
                    const start = startPositions(s, SE_BASE_OPTIONS, false);
                    const a = await captureSeStages(withSubgroups, s, start, SE_BASE_OPTIONS, null);
                    const a2 = await captureSeStages(withSubgroups, s, start, SE_BASE_OPTIONS, null);
                    const b = await captureSeStages(withoutSubgroups, s, start, SE_BASE_OPTIONS, null);
                    const b2 = await captureSeStages(withoutSubgroups, s, start, SE_BASE_OPTIONS, null);
                    for (const key of SE_STAGE_KEYS) {
                        expectBitwiseEqual(a[key].values, a2[key].values, `${graph}/${key}: feature run 1 vs run 2`);
                        expectBitwiseEqual(b[key].values, b2[key].values, `${graph}/${key}: workgroup run 1 vs run 2`);
                        const err = stageError(a[key].vector, a[key].values, b[key].values);
                        const report: CheckReport = {
                            worst: ratioOf(err.rel, seTolerance(TWIN_TOLERANCE[key]).value),
                            worstLabel: `${graph}/${key}`,
                            samples: a[key].values.length,
                        };
                        console.warn(
                            `[se-twins] ${graph}/${key}: rel ${err.rel.toExponential(3)} abs ${err.abs.toExponential(3)} ratio ${report.worst.toExponential(3)}`,
                        );
                        assertCheckPasses(report);
                        if (key === "attraction") {
                            expectBitwiseEqual(a[key].values, b[key].values, `${graph}/${key}: no twin, bitwise`);
                        }
                    }
                } finally {
                    withSubgroups.release(s);
                    withoutSubgroups.release(s);
                }
            },
            CASE_TIMEOUT,
        );
    }

    it(
        "writes the workgroup twin's K3 force, K5 positions, K5 partials and K1 state of the UNSCALED random1k and of karate as `<class>-no-subgroups` noise fixtures (GRAPHTY_NOISE_FLOOR_WRITE=1 only)",
        async (t) => {
            requireGpu(t);
            const twinClass = `${adapterClass(withoutSubgroups.caps)}${TWIN_SUFFIX}`;
            for (const m of SE_WRITER_MEMBERS) {
                const s = paritySnapshot(m.graph, 1, false);
                try {
                    const start = startPositions(s, SE_BASE_OPTIONS, false);
                    const capture = await captureSeStages(withoutSubgroups, s, start, SE_BASE_OPTIONS, null);
                    for (const key of TWIN_MEMBERS) {
                        const { kernel, fixture } = m.fixtures[key];
                        writeNoiseFixture(kernel, fixture, twinClass, capture[key].values, "f32");
                    }
                } finally {
                    withoutSubgroups.release(s);
                }
            }
        },
        CASE_TIMEOUT,
    );
});
