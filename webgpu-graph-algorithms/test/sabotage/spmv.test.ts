/**
 * Spec 11.9 item 1 for the P7 pull family (M8b plan PD-6): every SABOTAGE row of `spmv-pull`, `pr-scale` and
 * `pr-finalize` is spliced into the normative body and compiled on a FRESH context, and the SAME check set that
 * passes on the real kernel fails on the mutant by at least minFactor (10x the tolerance). The pull rows run the
 * primitive's own check set (spmvChecks / spmvWorstFactor over the f64 oracle); the two reduction kernels cannot be
 * reached by a lone pull, so their rows run PageRank and eigenvector centrality against the algorithm oracles
 * (pageRankWorstFactor), on the same error / tolerance scale.
 */

import { type TestContext } from "vitest";

import { type GpuContext } from "../../src/context.js";
import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { SABOTAGE, SABOTAGE_PHASES, sabotagedBody, withSabotage } from "../helpers/sabotage.js";
import { pageRankWorstFactor, spmvChecks, spmvWorstFactor } from "../helpers/spmv.js";
import { acquire, requireGpu } from "../setup/gpu.js";

/** The three kernels of the suite and the check set each one's rows are measured by. */
const SETS: readonly { readonly id: KernelId; readonly run: (ctx: GpuContext) => Promise<number> }[] = [
    { id: "spmv-pull", run: (ctx) => spmvWorstFactor(ctx, spmvChecks()) },
    { id: "pr-scale", run: pageRankWorstFactor },
    { id: "pr-finalize", run: pageRankWorstFactor },
];

describe("sabotage: spmv-pull / pr-scale / pr-finalize (spec 11.9 item 1)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "sabotage-spmv" }));
        shared = ctx;
        return ctx;
    }

    it("each kernel has at least three rows, each find unique in the normative body, and P7 is a gated phase", () => {
        for (const { id } of SETS) {
            const rows = SABOTAGE[id] ?? [];
            expect(rows.length, id).toBeGreaterThanOrEqual(3);
            for (const mutation of rows) {
                expect(() => sabotagedBody(id, mutation)).not.toThrow();
                expect(sabotagedBody(id, mutation)).toContain(mutation.replace);
                expect(mutation.minFactor).toBeGreaterThanOrEqual(10);
            }
            expect(new Set(rows.map((m) => m.name)).size).toBe(rows.length);
        }
        expect(SABOTAGE_PHASES).toContain("P7");
    });

    for (const { id, run } of SETS) {
        it(`${id}: the real kernel passes the check set (factor <= 1)`, async (t) => {
            const ctx = await context(t);
            const factor = await run(ctx);
            console.warn(`[sabotage] ${id}/control: factor ${factor.toExponential(2)}`);
            expect(factor).toBeLessThanOrEqual(1);
        });

        for (const mutation of SABOTAGE[id] ?? []) {
            it(`${id}/${mutation.name}: fails the check set by >= ${mutation.minFactor}x`, async (t) => {
                requireGpu(t);
                const factor = await withSabotage(id, mutation, run);
                console.warn(`[sabotage] ${id}/${mutation.name}: factor ${factor.toExponential(2)}`);
                expect(factor).toBeGreaterThanOrEqual(mutation.minFactor);
            });
        }
    }

    it("the normative bodies are restored after every mutation", () => {
        for (const { id } of SETS) {
            expect(kernelSpec(id).body).toBe(KERNELS[id].body);
        }
    });
});
