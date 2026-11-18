/**
 * Spec 11.9 item 1 for the two all-pairs kernels: every SABOTAGE row of `apsp-init` and `apsp-fw` is spliced into the
 * normative body and compiled on a FRESH context, and the SAME check that passes on the real kernels --
 * allPairsReport: every matrix entry of the parallel-arc fixture, the weighted karate, a directed graph with
 * self-loops and parallels, a 33-node graph (a one-row edge tile) and the 30 x 30 grid (29 blocks per side),
 * bitwise against the blocked f32 Floyd-Warshall reference (any mismatch is Infinity; a driver refusal is the maximal
 * miss) -- fails on the mutant by at least minFactor. No row is caught by a timing. The first block is the coverage
 * loop of test/sabotage/coverage.test.ts applied to these rows.
 */

import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { allPairsReport } from "../helpers/all-pairs.js";
import { assertCheckPasses, type Mutation, SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { acquire, isSoftware, requireGpu } from "../setup/gpu.js";

const ALL_PAIRS_TEST = "test/algorithms/all-pairs.test.ts";

/**
 * Rows only a software adapter catches: they remove a barrier whose race shows only when the lanes of a workgroup
 * run out of step. Lavapipe runs them one SIMD group at a time and fails them every run; NVIDIA's warps stay close
 * enough that the mutant matches the reference bitwise, so on hardware these rows are skipped, never passed.
 */
const SOFTWARE_ONLY = new Set(["step-barrier-removed"]);

/** The two kernels and the rows each must carry, by name. */
const MEASURED: readonly { readonly id: KernelId; readonly names: readonly string[] }[] = [
    { id: "apsp-init", names: ["diagonal-not-zeroed", "parallel-arcs-last-wins", "weight-ignored"] },
    {
        id: "apsp-fw",
        names: [
            "pivot-tile-shifted",
            "inner-loop-31",
            "barrier-after-stage-removed",
            "step-barrier-removed",
            "edge-store-guard-dropped",
            "phase2-stages-pivot",
        ],
    },
];

describe("sabotage: apsp-init and apsp-fw (spec 11.9 item 1)", () => {
    for (const { id, names } of MEASURED) {
        const rows: readonly Mutation[] = SABOTAGE[id] ?? [];

        it(`${id} has its rows naming the all-pairs test`, () => {
            expect(rows.map((m) => m.name)).toEqual(names);
            for (const m of rows) {
                expect(m.test).toBe(ALL_PAIRS_TEST);
            }
        });
    }

    it("the real kernels pass the check (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-all-pairs" });
        try {
            const report = await allPairsReport(ctx);
            expect(report.worst).toBe(0);
            assertCheckPasses(report);
        } finally {
            ctx.dispose();
        }
    });

    for (const { id } of MEASURED) {
        for (const mutation of SABOTAGE[id] ?? []) {
            it(`${id}/${mutation.name}: fails the check by >= ${mutation.minFactor}x`, async (t) => {
                requireGpu(t);
                if (SOFTWARE_ONLY.has(mutation.name) && !isSoftware()) {
                    t.skip("the race this row opens shows only on a software adapter; lavapipe runs it");
                }
                const report = await withSabotage(id, mutation, (ctx) => allPairsReport(ctx));
                console.warn(`[sabotage] ${id}/${mutation.name}: factor ${report.worst} at ${report.worstLabel}`);
                expect(report.worst).toBeGreaterThanOrEqual(mutation.minFactor);
                expect(() => assertCheckPasses(report)).toThrow();
            });
        }
    }

    it("the normative bodies are restored after every mutation", () => {
        for (const { id } of MEASURED) {
            expect(kernelSpec(id).body).toBe(KERNELS[id].body);
        }
    });
});
