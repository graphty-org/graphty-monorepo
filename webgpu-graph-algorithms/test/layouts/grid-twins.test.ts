/**
 * The subgroup twins of the grid tier (spec 11.3 "Subgroup variants" row; P4-T11): the feature context and a second
 * context from acquire({ subgroups: false }) IN-PROCESS. Two grid kernels carry a reduction -- G4b (`grid-centroid-hub`,
 * the hub cell summed through wg_reduce_vec4) and G7 (`grid-near-field`, whose fused epilogue reduces the swing /
 * traction partials) -- so the hub cell's level-0 entry of `hubcell` (through the T9 pyramid harness, the same
 * quantity the `grid-centroid-hub / hubcell-L0` fixture holds) is held to grid-twins.hubCentroid and the force after
 * G7 on random20k to grid-twins.force; every other grid stage has no reduction upstream and must agree bitwise
 * (the u32 build, the pyramid of a hub-free fixture, the far field); the K5 positions and the K1 fold carry K4's
 * speed, a reduction result, and are held to the committed P3 twin tolerances of the same quantities
 * (fa2-twins.positions, fa2-twins.trace). A recording run writes the `<class>-no-subgroups` fixtures of the two twin
 * rows (grid-near-field / random20k-near, grid-centroid-hub / hubcell-L0).
 */

import { type GpuContext } from "../../src/context.js";
import { stageError, toleranceOf, TWIN_SUFFIX } from "../helpers/fa2-parity.js";
import {
    captureGridStages,
    GRID_BASE_OPTIONS,
    GRID_NOISE_FIXTURES,
    GRID_STAGE_KEYS,
    gridFixture,
    type GridStageKey,
    gridTolerance,
    sampleNodes,
} from "../helpers/grid-parity.js";
import { levelOf, pyramidOracleOf, pyramidScene, runPyramid } from "../helpers/grid-pyramid.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses, type CheckReport, ratioOf } from "../helpers/sabotage.js";
import { acquire, adapterSummary, gpuScale, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;
/** Spec 12.2's second pass: acquire() then defaults to subgroups: false, so both contexts are the workgroup twin (a policy skip). */
const NO_SUBGROUPS_PASS = process.env.GRAPHTY_GPU_NO_SUBGROUPS === "1";
/** The stages a reduction reaches before they are read, and the tolerance id each is held to. */
const TWINNED: Readonly<Partial<Record<GridStageKey, { readonly p4: boolean; readonly id: string }>>> = {
    nearField: { p4: true, id: "grid-twins.force" },
    positions: { p4: false, id: "fa2-twins.positions" },
    k1: { p4: false, id: "fa2-twins.trace" },
};

/**
 * The hub cell's four lanes of `hubcell` through the T9 harness on a context.
 * @param ctx - the context
 * @returns the four values and the oracle's
 */
async function hubCentroid(
    ctx: GpuContext,
): Promise<{ readonly values: Float32Array; readonly expected: Float64Array }> {
    const scene = pyramidScene("hubcell", 2, 1);
    const run = await runPyramid(ctx, scene);
    const want = pyramidOracleOf(scene, ctx.workgroupSize);
    const [cell] = want.hubCells;
    expect(cell, "hubcell has a hub cell").toBeDefined();
    return {
        values: Float32Array.from(levelOf(run, scene, 0).subarray(4 * cell, 4 * cell + 4)),
        expected: Float64Array.from(want.levels[0].subarray(4 * cell, 4 * cell + 4)),
    };
}

describe("grid tier subgroup twins in-process (spec 11.3)", () => {
    let withSubgroups: GpuContext;
    let withoutSubgroups: GpuContext;

    beforeAll(async () => {
        withSubgroups = await acquire({ label: "grid-twins/subgroups" });
        withoutSubgroups = await acquire({ label: "grid-twins/no-subgroups", subgroups: false });
    });

    it("the two contexts are the two twins", () => {
        const adapterHasSubgroups = adapterSummary()?.features.includes("subgroups") === true;
        expect(withSubgroups.caps.features.has("subgroups")).toBe(!NO_SUBGROUPS_PASS && adapterHasSubgroups);
        expect(withoutSubgroups.caps.features.has("subgroups")).toBe(false);
        expect(adapterClass(withSubgroups.caps)).toBe(adapterClass(withoutSubgroups.caps));
    });

    it(
        "random20k: the build, the pyramid and the far field bitwise between the twins; G7's force within grid-twins.force; K5 and K1 within the P3 twin tolerances",
        async (t) => {
            requireGpu(t);
            if (NO_SUBGROUPS_PASS) {
                t.skip("GRAPHTY_GPU_NO_SUBGROUPS=1: both contexts are the workgroup twin");
                return;
            }
            const { snapshot: s, start } = gridFixture("random20k", gpuScale(), GRID_BASE_OPTIONS);
            try {
                const a = await captureGridStages(withSubgroups, s, start, GRID_BASE_OPTIONS, null);
                const b = await captureGridStages(withoutSubgroups, s, start, GRID_BASE_OPTIONS, null);
                for (const key of GRID_STAGE_KEYS) {
                    const twin = TWINNED[key];
                    if (twin === undefined) {
                        expectBitwiseEqual(
                            a.stages[key].values,
                            b.stages[key].values,
                            `random20k/${key}: no twin, bitwise`,
                        );
                        continue;
                    }
                    const err = stageError(a.stages[key].kind === "vector", a.stages[key].values, b.stages[key].values);
                    const tolerance = twin.p4 ? gridTolerance(twin.id).value : toleranceOf(twin.id);
                    const report: CheckReport = {
                        worst: ratioOf(err.rel, tolerance),
                        worstLabel: `random20k/${key}`,
                        samples: a.stages[key].values.length,
                    };
                    console.warn(
                        `[grid-twins] random20k/${key}: rel ${err.rel.toExponential(3)} abs ${err.abs.toExponential(3)} ratio ${report.worst.toExponential(3)} (${twin.id})`,
                    );
                    assertCheckPasses(report);
                }
            } finally {
                withSubgroups.release(s);
                withoutSubgroups.release(s);
            }
        },
        CASE_TIMEOUT,
    );

    it(
        "hubcell: the hub cell's level-0 entry (G4b, the one pyramid kernel with a reduction) agrees between the twins within grid-twins.hubCentroid",
        async (t) => {
            requireGpu(t);
            if (NO_SUBGROUPS_PASS) {
                t.skip("GRAPHTY_GPU_NO_SUBGROUPS=1: both contexts are the workgroup twin");
                return;
            }
            const a = await hubCentroid(withSubgroups);
            const b = await hubCentroid(withoutSubgroups);
            const err = stageError(false, a.values, b.values);
            const report: CheckReport = {
                worst: ratioOf(err.rel, gridTolerance("grid-twins.hubCentroid").value),
                worstLabel: "hubcell/level0",
                samples: 4,
            };
            console.warn(
                `[grid-twins] hubcell/level0: rel ${err.rel.toExponential(3)} abs ${err.abs.toExponential(3)} ratio ${report.worst.toExponential(3)}`,
            );
            assertCheckPasses(report);
            // both twins sit on the oracle within the traced stage tolerance
            for (const [label, side] of [
                ["subgroups", a],
                ["no-subgroups", b],
            ] as const) {
                assertCheckPasses({
                    worst: ratioOf(
                        stageError(false, side.values, side.expected).rel,
                        gridTolerance("grid-inspect.hubCentroid").value,
                    ),
                    worstLabel: `hubcell/level0/${label} vs the oracle`,
                    samples: 4,
                });
            }
        },
        CASE_TIMEOUT,
    );

    it(
        "writes the workgroup twin's outputs as `<class>-no-subgroups` noise fixtures: grid-near-field / random20k-near and grid-centroid-hub / hubcell-L0 (GRAPHTY_NOISE_FLOOR_WRITE=1 only)",
        async (t) => {
            requireGpu(t);
            const twinClass = `${adapterClass(withoutSubgroups.caps)}${TWIN_SUFFIX}`;
            const { snapshot: s, start } = gridFixture("random20k", 1, GRID_BASE_OPTIONS);
            try {
                const capture = await captureGridStages(withoutSubgroups, s, start, GRID_BASE_OPTIONS, null);
                const near = GRID_NOISE_FIXTURES.nearField;
                writeNoiseFixture(
                    near.kernel,
                    near.fixture,
                    twinClass,
                    sampleNodes(capture.stages.nearField.values, s.nodeCount),
                    "f32",
                );
            } finally {
                withoutSubgroups.release(s);
            }
            const hub = await hubCentroid(withoutSubgroups);
            const { kernel, fixture } = GRID_NOISE_FIXTURES.hubCentroid;
            writeNoiseFixture(kernel, fixture, twinClass, hub.values, "f32");
        },
        CASE_TIMEOUT,
    );
});
