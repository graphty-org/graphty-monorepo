/**
 * Spec 11.9 item 1 for Afforest (M8b plan PD-6): every SABOTAGE row of `wcc-link-sample`, `wcc-link-edges` and
 * `wcc-compress` is spliced into the normative body and compiled on a FRESH context, and the SAME check set that
 * passes on the real kernels (wccChecks / wccWorstFactor against the union-find oracle) fails on the mutant by at
 * least minFactor: at WCC_NOISE_FLOOR 1e-3 that is "at least 1% of the nodes mislabelled". `wcc-sample` is exempt
 * (SABOTAGE_EXEMPT): it only picks which component is called the giant.
 */

import { type TestContext } from "vitest";

import { type GpuContext } from "../../src/context.js";
import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { wccChecks, wccWorstFactor } from "../helpers/components.js";
import { SABOTAGE, SABOTAGE_EXEMPT, SABOTAGE_PHASES, sabotagedBody, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const KERNEL_IDS: readonly KernelId[] = ["wcc-link-sample", "wcc-link-edges", "wcc-compress"];

describe("sabotage: wcc-link-sample / wcc-link-edges / wcc-compress (spec 11.9 item 1)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "sabotage-wcc" }));
        shared = ctx;
        return ctx;
    }

    it("each kernel has at least three rows naming the components test, wcc-sample is exempt, and P7 is a gated phase", () => {
        for (const id of KERNEL_IDS) {
            const rows = SABOTAGE[id] ?? [];
            expect(rows.length, id).toBeGreaterThanOrEqual(3);
            for (const mutation of rows) {
                expect(() => sabotagedBody(id, mutation)).not.toThrow();
                expect(sabotagedBody(id, mutation)).toContain(mutation.replace);
                expect(mutation.minFactor).toBeGreaterThanOrEqual(10);
                expect(mutation.test).toBe("test/algorithms/components.test.ts");
            }
            expect(new Set(rows.map((m) => m.name)).size).toBe(rows.length);
        }
        expect(SABOTAGE_EXEMPT).toContain("wcc-sample");
        expect(SABOTAGE["wcc-sample"]).toBeUndefined();
        expect(SABOTAGE_PHASES).toContain("P7");
    });

    it("the real kernels pass the check set (factor 0: every label identical)", async (t) => {
        const ctx = await context(t);
        expect(await wccWorstFactor(ctx, wccChecks())).toBe(0);
    });

    for (const id of KERNEL_IDS) {
        for (const mutation of SABOTAGE[id] ?? []) {
            it(`${id}/${mutation.name}: fails the check set by >= ${mutation.minFactor}x`, async (t) => {
                requireGpu(t);
                const factor = await withSabotage(id, mutation, (ctx) => wccWorstFactor(ctx, wccChecks()));
                console.warn(`[sabotage] ${id}/${mutation.name}: factor ${factor.toExponential(2)}`);
                expect(factor).toBeGreaterThanOrEqual(mutation.minFactor);
            });
        }
    }

    it("the normative bodies are restored after every mutation", () => {
        for (const id of KERNEL_IDS) {
            expect(kernelSpec(id).body).toBe(KERNELS[id].body);
        }
    });
});
