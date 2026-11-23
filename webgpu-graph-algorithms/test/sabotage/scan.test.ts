/**
 * Spec 11.9 item 1 for the two scan kernels (P4-T2): every SABOTAGE row of `scan-block` and `scan-add` is spliced
 * into the normative body and compiled on a FRESH context, and the SAME bitwise check that passes on the real kernels
 * (scanReport at count 4097: three levels on every adapter, since 4097 > WG) fails on the mutant by at least
 * minFactor -- any mismatch is Infinity. The first block is the coverage loop of test/sabotage/coverage.test.ts
 * applied to these rows (P4 is not in SABOTAGE_PHASES until T12, PD-1).
 */

import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { assertCheckPasses, SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { scanReport } from "../helpers/scan.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const IDS: readonly KernelId[] = ["scan-block", "scan-add"];
const COUNT = 4097;

describe("sabotage: scan-block and scan-add (spec 11.9 item 1; P4-T2)", () => {
    it("each id has three rows naming the scan test", () => {
        expect((SABOTAGE["scan-block"] ?? []).map((m) => m.name)).toEqual([
            "inclusive-not-exclusive",
            "block-sum-from-lane-zero",
            "round-doubling-dropped",
        ]);
        expect((SABOTAGE["scan-add"] ?? []).map((m) => m.name)).toEqual([
            "add-back-skipped",
            "offset-of-next-block",
            "last-block-skipped",
        ]);
        for (const id of IDS) {
            for (const m of SABOTAGE[id] ?? []) {
                expect(m.test).toBe("test/primitives/scan.test.ts");
            }
        }
    });

    it("the real kernels pass the bitwise check at 4097 (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-scan" });
        try {
            const report = await scanReport(ctx, COUNT);
            expect(report.worst).toBe(0);
            assertCheckPasses(report);
        } finally {
            ctx.dispose();
        }
    });

    for (const id of IDS) {
        for (const mutation of SABOTAGE[id] ?? []) {
            it(`${id}/${mutation.name}: fails the bitwise check by >= ${mutation.minFactor}x`, async (t) => {
                requireGpu(t);
                const report = await withSabotage(id, mutation, (ctx) => scanReport(ctx, COUNT));
                console.warn(`[sabotage] ${id}/${mutation.name}: factor ${report.worst} at ${report.worstLabel}`);
                expect(report.worst).toBeGreaterThanOrEqual(mutation.minFactor);
                expect(() => assertCheckPasses(report)).toThrow();
            });
        }
    }

    it("the normative bodies are restored after every mutation", () => {
        for (const id of IDS) {
            expect(kernelSpec(id).body).toBe(KERNELS[id].body);
        }
    });
});
