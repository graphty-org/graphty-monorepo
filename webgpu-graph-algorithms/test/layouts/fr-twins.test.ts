/**
 * The subgroup twins of the Fruchterman-Reingold model (spec 11.3 "Subgroup variants"; P5-T4 Step 2, the
 * fa2-twins.test.ts pattern): the feature context and a second context from acquire({ subgroups: false }) run one
 * FR iteration on karate / random1k from the seeded start and every stage must agree -- K2's attraction bitwise (no
 * reduction anywhere upstream), K3's force within fr-twins.force, K5's positions, displacement and toScene's scene
 * within fr-twins.positions (FR has no controller, so no reduction result reaches a position: these are expected
 * bitwise too, and the tolerance is the honest bound), K5's partials and the K1 fold -- the reductions themselves --
 * within fr-twins.positions, whose floor is measured on exactly those members. Each capture is run twice on its own
 * context and asserted bitwise first. A recording run writes the `<class>-no-subgroups` fixtures of the four twin
 * members (K3, K5, K5-partials, K1) on the UNSCALED random1k.
 */

import type { GpuContext } from "../../src/context.js";
import { type ParityGraph, paritySnapshot, stageError, startPositions, TWIN_SUFFIX } from "../helpers/fa2-parity.js";
import {
    captureFrStages,
    FR_BASE_OPTIONS,
    FR_KARATE_FIXTURES,
    FR_NOISE_FIXTURES,
    FR_STAGE_KEYS,
    type FrNoiseFixtureName,
    type FrStageKey,
    frTolerance,
} from "../helpers/fr-parity.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses, type CheckReport, ratioOf } from "../helpers/sabotage.js";
import { acquire, adapterSummary, gpuScale, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;
const GRAPHS: readonly ParityGraph[] = ["karate", "random1k"];
/** Spec 12.2's second pass: acquire() then defaults to subgroups: false, so both contexts are the workgroup twin and the twin axis is vacuous here (a policy skip, not a wrong-result skip). */
const NO_SUBGROUPS_PASS = process.env.GRAPHTY_GPU_NO_SUBGROUPS === "1";
/** The tolerance each stage's twin comparison is held to (file header). */
const TWIN_TOLERANCE: Readonly<Record<FrStageKey, string>> = {
    attraction: "fr-twins.force",
    force: "fr-twins.force",
    positions: "fr-twins.positions",
    displacement: "fr-twins.positions",
    partials: "fr-twins.positions",
    scene: "fr-twins.positions",
    k1: "fr-twins.positions",
};
/** The noise members that carry a twin row (test/noise-floor.test.ts): K3 feeds fr-twins.force.twin; K5, its partials and K1 feed fr-twins.positions.twin. */
const TWIN_MEMBERS: readonly FrStageKey[] = ["force", "positions", "partials", "k1"];

describe("FR subgroup twins in-process (spec 11.3)", () => {
    let withSubgroups: GpuContext;
    let withoutSubgroups: GpuContext;

    beforeAll(async () => {
        withSubgroups = await acquire({ label: "fr-twins/subgroups" });
        withoutSubgroups = await acquire({ label: "fr-twins/no-subgroups", subgroups: false });
    });

    it("the two contexts are the two twins: the first exposes subgroups when the adapter offers them, the second never does", () => {
        const adapterHasSubgroups = adapterSummary()?.features.includes("subgroups") === true;
        expect(withSubgroups.caps.features.has("subgroups")).toBe(!NO_SUBGROUPS_PASS && adapterHasSubgroups);
        expect(withoutSubgroups.caps.features.has("subgroups")).toBe(false);
        expect(adapterClass(withSubgroups.caps)).toBe(adapterClass(withoutSubgroups.caps));
    });

    for (const graph of GRAPHS) {
        it(
            `${graph}: every stage agrees between the twins within the traced tolerances, each twice bitwise; K2's attraction bitwise`,
            async (t) => {
                requireGpu(t);
                if (NO_SUBGROUPS_PASS) {
                    t.skip("GRAPHTY_GPU_NO_SUBGROUPS=1: both contexts are the workgroup twin");
                    return;
                }
                const s = paritySnapshot(graph, gpuScale(), false);
                try {
                    const start = startPositions(s, FR_BASE_OPTIONS, false);
                    const a = await captureFrStages(withSubgroups, s, start, FR_BASE_OPTIONS, null);
                    const a2 = await captureFrStages(withSubgroups, s, start, FR_BASE_OPTIONS, null);
                    const b = await captureFrStages(withoutSubgroups, s, start, FR_BASE_OPTIONS, null);
                    const b2 = await captureFrStages(withoutSubgroups, s, start, FR_BASE_OPTIONS, null);
                    for (const key of FR_STAGE_KEYS) {
                        expectBitwiseEqual(a[key].values, a2[key].values, `${graph}/${key}: feature run 1 vs run 2`);
                        expectBitwiseEqual(b[key].values, b2[key].values, `${graph}/${key}: workgroup run 1 vs run 2`);
                        const err = stageError(a[key].vector, a[key].values, b[key].values);
                        const report: CheckReport = {
                            worst: ratioOf(err.rel, frTolerance(TWIN_TOLERANCE[key]).value),
                            worstLabel: `${graph}/${key}`,
                            samples: a[key].values.length,
                        };
                        console.warn(
                            `[fr-twins] ${graph}/${key}: rel ${err.rel.toExponential(3)} abs ${err.abs.toExponential(3)} ratio ${report.worst.toExponential(3)}`,
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
            const members: readonly {
                readonly graph: ParityGraph;
                readonly fixtures: Readonly<Record<FrStageKey, FrNoiseFixtureName>>;
            }[] = [
                { graph: "random1k", fixtures: FR_NOISE_FIXTURES },
                { graph: "karate", fixtures: FR_KARATE_FIXTURES },
            ];
            for (const m of members) {
                const s = paritySnapshot(m.graph, 1, false);
                try {
                    const start = startPositions(s, FR_BASE_OPTIONS, false);
                    const capture = await captureFrStages(withoutSubgroups, s, start, FR_BASE_OPTIONS, null);
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
