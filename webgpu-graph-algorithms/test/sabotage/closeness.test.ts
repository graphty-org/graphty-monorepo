/**
 * Spec 11.9 item 1 for the two closeness kernels: every SABOTAGE row of `closeness-level` and `closeness-rowsum` is
 * spliced into the normative body and compiled on a FRESH context, and the SAME check that passes on the real
 * kernels -- closenessReport: the exact sum, reached count and f32 score of every source of karate, the 70-node path,
 * the funnel, a star and a directed graph against the oracle with the level step chosen per level, forced to push and
 * forced to pull, a sampled karate run against the CPU port, and the all-pairs row sums in their three roles against
 * an emulation of the device's f32 reduction, all bitwise (any mismatch is Infinity; a driver refusal is the maximal
 * miss) -- fails on the mutant by at least minFactor. No row is caught by a timing. The first block is the coverage
 * loop of test/sabotage/coverage.test.ts applied to these rows.
 */

import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { closenessReport } from "../helpers/closeness.js";
import { assertCheckPasses, type Mutation, SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const CLOSENESS_TEST = "test/algorithms/closeness.test.ts";

/** The two kernels and the rows each must carry, by name. */
const MEASURED: readonly { readonly id: KernelId; readonly names: readonly string[] }[] = [
    {
        id: "closeness-level",
        names: [
            "push-claim-recounted",
            "pull-keeps-seen-bits",
            "push-next-not-set",
            "pull-next-not-set",
            "early-exit-too-soon",
            "source-word-not-bit",
            "per-node-distance-dropped",
            "sampled-list-ignored",
            "duplicate-seed-overwritten",
        ],
    },
    {
        id: "closeness-rowsum",
        names: [
            "unreachable-counted",
            "tree-drops-half",
            "hops-counted-as-one",
            "weights-counted-as-one",
            "harmonic-not-reciprocal",
        ],
    },
];

describe("sabotage: closeness-level and closeness-rowsum (spec 11.9 item 1)", () => {
    for (const { id, names } of MEASURED) {
        const rows: readonly Mutation[] = SABOTAGE[id] ?? [];

        it(`${id} has its rows naming the closeness test`, () => {
            expect(rows.map((m) => m.name)).toEqual(names);
            for (const m of rows) {
                expect(m.test).toBe(CLOSENESS_TEST);
            }
        });
    }

    it("the real kernels pass the check (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-closeness" });
        try {
            const report = await closenessReport(ctx);
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
                const report = await withSabotage(id, mutation, (ctx) => closenessReport(ctx));
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
