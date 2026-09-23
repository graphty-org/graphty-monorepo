/**
 * The kernel-level window proof of K2 (P4-T6; spec 4.2, DEP-P4-B): the TIER 0 `fa2-attraction` kernel dispatched
 * over hand-built 64-arc windows of karate (a copy of each colIdx slice plus a poison tail, arcBase / arcEnd set,
 * accumulate = 1 onto a zeroed force) equals the one-dispatch result -- bitwise on every row one window holds,
 * within the analytic bound on the rows a window boundary splits -- twice bitwise; and the `tier0-rebase-ignored`
 * mutation (`colIdx[a]` for `colIdx[a - P.arcBase]`) breaks it through the poison tail. The layout itself never
 * windows (its uniform ring holds one Fa2Params per iteration); this proves the body is window-READY.
 */

import { attractionWindowedRun, attractionWindowedWorstFactor } from "../helpers/attraction-check.js";
import { BASE_OPTIONS, paritySnapshot, startPositions } from "../helpers/fa2-parity.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { assertCheckPasses, SABOTAGE_P4_TIERS, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 120_000;
const ARCS_PER_WINDOW = 64;

describe("fa2-attraction over arc windows (P4-T6: the kernel-level window proof)", () => {
    it(
        "karate in 64-arc windows: bitwise the one-dispatch result on unsplit rows, within the analytic bound on split rows, twice bitwise",
        async (t) => {
            requireGpu(t);
            const ctx = await acquire({ label: "attraction-windowed" });
            const s = paritySnapshot("karate", 1, false);
            try {
                const start = startPositions(s, BASE_OPTIONS, false);
                const first = await attractionWindowedRun(ctx, s, start, ARCS_PER_WINDOW, "windowed/karate");
                const second = await attractionWindowedRun(ctx, s, start, ARCS_PER_WINDOW, "windowed/karate/2");
                expectBitwiseEqual(first.windowed, second.windowed, "windowed twice");
                expectBitwiseEqual(first.direct, second.direct, "direct twice");
                // 156 arcs in three windows: the rows at 63 / 64 and 127 / 128 exercise the accumulate path
                expect(first.splitRows).toBeGreaterThanOrEqual(1);
                console.warn(
                    `[attraction-windowed] karate: ${first.splitRows} split rows, worst ratio ${first.report.worst.toExponential(3)} at ${first.report.worstLabel}`,
                );
                assertCheckPasses(first.report);
                expect(first.windowed.every((v) => Number.isFinite(v))).toBe(true);
            } finally {
                ctx.release(s);
                ctx.dispose();
            }
        },
        CASE_TIMEOUT,
    );

    it(
        "tier0-rebase-ignored: reading colIdx[a] instead of colIdx[a - P.arcBase] folds the poison tail and breaks the window check",
        async (t) => {
            requireGpu(t);
            const row = (SABOTAGE_P4_TIERS["fa2-attraction"] ?? []).find((m) => m.name === "tier0-rebase-ignored");
            if (row === undefined) {
                throw new Error("SABOTAGE_P4_TIERS lacks the fa2-attraction row tier0-rebase-ignored");
            }
            expect(row.test).toBe("test/layouts/attraction-windowed.test.ts");
            const factor = await withSabotage("fa2-attraction", row, (ctx) => attractionWindowedWorstFactor(ctx));
            console.warn(`[attraction-windowed] tier0-rebase-ignored: factor ${factor.toExponential(2)}`);
            expect(factor).toBeGreaterThanOrEqual(row.minFactor);
        },
        CASE_TIMEOUT,
    );
});
