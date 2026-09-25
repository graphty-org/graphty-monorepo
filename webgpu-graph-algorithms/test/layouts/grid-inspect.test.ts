/**
 * Per-kernel inspection parity of the grid tier (spec 11.9 item 2; P4-T11; PD-19): on the positioned fixtures in 2D
 * and 3D, every stage of one grid iteration captured twice and bitwise the same, the three u32 build stages bitwise
 * the oracle's (seeded with the GPU's own frame, PD-10), the pyramid's mass lane bitwise (exact integer sums), and
 * every f32 stage (the pyramid's xyz lanes, the force after G6, the force after G7, the K5 positions, the K1 grid
 * block of iteration 2) within the tolerance traced to benchmarks/results/noise-floor.json; the pinned case; and the
 * writer case of the five random20k stage fixtures and the isolated K1 widening fixture (GRAPHTY_NOISE_FLOOR_WRITE=1
 * only). `hubcell` and `onecell1025`
 * run at `nearMax: 8` so the sampling draws of G7 are exercised (the anchor node of gridFixture puts the box in one
 * or two finest cells). The first block pins the helper's tables.
 */

import { type GpuContext } from "../../src/context.js";
import { type GpuLayoutTuning } from "../../src/types/layout.js";
import { ORACLE_F64_CLASS, pinIndex, pinMask } from "../helpers/fa2-parity.js";
import {
    captureGridStages,
    GRID_BASE_OPTIONS,
    GRID_NOISE_FIXTURES,
    GRID_STAGE_KERNEL,
    GRID_STAGE_KEYS,
    GRID_STAGE_TOLERANCE,
    GRID_TUNING,
    gridFixture,
    type GridStageCapture,
    type GridStageKey,
    gridStageReport,
    P4_TOLERANCE_CAPS,
    sampleNodes,
    samplePyramid,
} from "../helpers/grid-parity.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;
const WRITER_TIMEOUT = 1_200_000;
/** The fixtures of the stage comparison; the two one-cell fixtures run at nearMax 8 (the sampling path). */
const FIXTURES: readonly string[] = [
    "random20k",
    "clumpy100",
    "isolated",
    "outside5",
    "onecell1025",
    "hubcell",
    "coincident",
];
const SAMPLED: readonly string[] = ["onecell1025", "hubcell"];
const NEAR_MAX_SAMPLING = 8;

/**
 * The tuning of a fixture: GRID_TUNING, with nearMax 8 on the one-cell fixtures.
 * @param name - the fixture
 * @returns the tuning
 */
function tuningOf(name: string): GpuLayoutTuning {
    return SAMPLED.includes(name) ? { ...GRID_TUNING, nearMax: NEAR_MAX_SAMPLING } : GRID_TUNING;
}

/**
 * Every stage of a capture against the oracle, printed and asserted; the pyramid's mass lane bitwise.
 * @param a - the capture
 * @param label - the case label
 */
function assertCapture(a: GridStageCapture, label: string): void {
    for (const key of GRID_STAGE_KEYS) {
        const report = gridStageReport(a, key);
        const r = a.stages[key];
        console.warn(
            `[grid-inspect] ${label}/${key} (${GRID_STAGE_KERNEL[key]}): error ${r.error.toExponential(3)}, maxAbs ${r.maxAbs.toExponential(3)}, ratio ${report.worst.toExponential(3)}`,
        );
        assertCheckPasses(report);
    }
    expectBitwiseEqual(
        a.pyramidMass.values,
        Float32Array.from(a.pyramidMass.expected),
        `${label}/pyramid: the mass lane (exact integer sums)`,
    );
}

describe("grid-parity helper (pure)", () => {
    it("the stage tables agree: every stage has a kernel, every f32 stage a tolerance id with a cap, the u32 stages none", () => {
        expect(GRID_STAGE_KEYS).toEqual([
            "cellKey",
            "sortedIdx",
            "cellStart",
            "pyramid",
            "farField",
            "nearField",
            "positions",
            "k1",
        ]);
        const u32: readonly GridStageKey[] = ["cellKey", "sortedIdx", "cellStart"];
        for (const key of GRID_STAGE_KEYS) {
            expect(GRID_STAGE_KERNEL[key].length, `${key}: kernel`).toBeGreaterThan(0);
            const id = GRID_STAGE_TOLERANCE[key];
            if (u32.includes(key)) {
                expect(id, `${key}: bitwise`).toBeNull();
            } else {
                expect(id, `${key}: tolerance id`).not.toBeNull();
                expect(P4_TOLERANCE_CAPS[id ?? ""], `${key}: cap`).toBeDefined();
            }
        }
        for (const [id, spec] of Object.entries(P4_TOLERANCE_CAPS)) {
            expect(spec.cap, `${id}: cap > 0`).toBeGreaterThan(0);
            expect(spec.basis.length, `${id}: basis`).toBeGreaterThan(0);
            if (id.endsWith(".cross")) {
                expect(spec.basis, `${id}: a cross basis`).toBe(id);
            }
        }
        expect(GRID_NOISE_FIXTURES.pyramid.kernel).toBe("grid-centroid");
        expect(GRID_NOISE_FIXTURES.exactRms.kernel).toBe("grid-exact");
    });

    it("samplePyramid keeps every level: one value triple per sampled cell, the coarse levels whole", () => {
        // a G = 8, 2D spec: level 0 has 68 cells (the four orthant pseudo-cells), level 1 has 16
        const spec = {
            dim: 2 as const,
            g: 8,
            levels: 2,
            cells: 64,
            outsideCells: 4,
            histWords: 69,
            levelOffsets: [0, 68],
            pyramidCells: 84,
            deterministic: true,
        };
        const xyz = Float64Array.from({ length: 3 * 84 }, (_, i) => i);
        const sampled = samplePyramid(xyz, spec);
        expect(sampled.length).toBe(3 * 84);
        expect(sampled[3 * 68]).toBe(3 * 68);
    });

    it("sampleNodes takes every 4th node's three lanes", () => {
        const values = Float64Array.from({ length: 3 * 9 }, (_, i) => i);
        const sampled = sampleNodes(values, 9);
        expect(Array.from(sampled)).toEqual([0, 1, 2, 12, 13, 14, 24, 25, 26]);
    });
});

describe("grid tier inspect(): every stage against the oracle's (spec 11.9 item 2; G4)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "grid-inspect" });
    });

    for (const name of FIXTURES) {
        for (const dim of [2, 3] as const) {
            const label = `${name}/${dim}d`;
            it(
                `${label}: G1, G2, G3 bitwise, the pyramid, G6, G7, K5 and the K1 grid block within their traced tolerances, twice bitwise`,
                async (t) => {
                    requireGpu(t);
                    const options = { ...GRID_BASE_OPTIONS, dim };
                    const { snapshot: s, start } = gridFixture(name, gpuScale(), options);
                    try {
                        const tuning = tuningOf(name);
                        const a = await captureGridStages(ctx, s, start, options, null, tuning);
                        const b = await captureGridStages(ctx, s, start, options, null, tuning);
                        for (const key of GRID_STAGE_KEYS) {
                            expectBitwiseEqual(
                                a.stages[key].values,
                                b.stages[key].values,
                                `${label}/${key}: run 1 vs run 2`,
                            );
                        }
                        assertCapture(a, label);
                        // structure that needs no tolerance: the scan closes at n, the sampling path ran where meant to
                        const { cellStart } = a.stages;
                        expect(cellStart.values[cellStart.values.length - 1], `${label}: cellStart[cells + 1]`).toBe(
                            s.nodeCount,
                        );
                        if (SAMPLED.includes(name)) {
                            expect(a.stages.k1.values[7], `${label}: maxCellOccupancy above nearMax`).toBeGreaterThan(
                                NEAR_MAX_SAMPLING,
                            );
                        }
                        if (name === "outside5") {
                            expect(a.stages.k1.values[6], `${label}: outsideGrid`).toBeGreaterThan(0);
                        }
                    } finally {
                        ctx.release(s);
                    }
                },
                CASE_TIMEOUT,
            );
        }
    }

    it(
        "a pinned node (clumpy100, 2D): its force is computed, K5 leaves it in place, every stage still within tolerance",
        async (t) => {
            requireGpu(t);
            const { snapshot: s, start } = gridFixture("clumpy100", gpuScale(), GRID_BASE_OPTIONS);
            try {
                const pinned = pinIndex(s.nodeCount);
                const mask = pinMask(s.nodeCount, pinned);
                const a = await captureGridStages(ctx, s, start, GRID_BASE_OPTIONS, mask);
                assertCapture(a, "clumpy100-pinned/2d");
                const force = a.stages.nearField.values;
                expect(
                    Math.hypot(force[3 * pinned], force[3 * pinned + 1], force[3 * pinned + 2]),
                    "the pinned node's force",
                ).toBeGreaterThan(0);
                for (let k = 0; k < 3; k++) {
                    expect(a.stages.positions.values[3 * pinned + k], `pinned position component ${k}`).toBe(
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
        "writes this adapter's grid stage outputs of the UNSCALED random20k and the f64 reference as noise fixtures (GRAPHTY_NOISE_FLOOR_WRITE=1 only)",
        async (t) => {
            requireGpu(t);
            const cls = adapterClass(ctx.caps);
            const { snapshot: s, start } = gridFixture("random20k", 1, GRID_BASE_OPTIONS);
            try {
                const n = s.nodeCount;
                const capture = await captureGridStages(ctx, s, start, GRID_BASE_OPTIONS, null);
                // the raw outputs are written BEFORE the checks (a floor above the cap surfaces through the
                // noise-floor validation, never through a missing fixture)
                const write = (
                    name: keyof typeof GRID_NOISE_FIXTURES,
                    values: ArrayLike<number>,
                    expected: ArrayLike<number>,
                ): void => {
                    const { kernel, fixture } = GRID_NOISE_FIXTURES[name];
                    writeNoiseFixture(kernel, fixture, cls, values, "f32");
                    writeNoiseFixture(kernel, fixture, ORACLE_F64_CLASS, expected, "f32");
                };
                const { stages, spec } = capture;
                write(
                    "pyramid",
                    samplePyramid(stages.pyramid.values, spec),
                    samplePyramid(stages.pyramid.expected, spec),
                );
                write("farField", sampleNodes(stages.farField.values, n), sampleNodes(stages.farField.expected, n));
                write("nearField", sampleNodes(stages.nearField.values, n), sampleNodes(stages.nearField.expected, n));
                write("positions", sampleNodes(stages.positions.values, n), sampleNodes(stages.positions.expected, n));
                write("k1", stages.k1.values, stages.k1.expected);
                assertCapture(capture, "noise/random20k/2d");
            } finally {
                ctx.release(s);
            }
            // the widening member: the K1 grid block of the UNSCALED isolated fixture (the module comment of grid-parity.ts)
            const isolated = gridFixture("isolated", 1, GRID_BASE_OPTIONS);
            try {
                const capture = await captureGridStages(
                    ctx,
                    isolated.snapshot,
                    isolated.start,
                    GRID_BASE_OPTIONS,
                    null,
                );
                const { kernel, fixture } = GRID_NOISE_FIXTURES.k1Isolated;
                writeNoiseFixture(kernel, fixture, cls, capture.stages.k1.values, "f32");
                writeNoiseFixture(kernel, fixture, ORACLE_F64_CLASS, capture.stages.k1.expected, "f32");
                assertCapture(capture, "noise/isolated/2d");
            } finally {
                ctx.release(isolated.snapshot);
            }
        },
        WRITER_TIMEOUT,
    );
});
