/**
 * The P4 tier sabotage table and its row-walking half (spec 11.9 item 1; spec 13 rule f applied to the TIER 1 / 2
 * branches P4-T5 adds to segmented-reduce, fa2-attraction and spmv-pull; PD-21): SABOTAGE_P4_TIERS lives beside
 * SABOTAGE because a mutation inside `tiered()` leaves the thread-per-row output untouched, so the P2 / P7 suites
 * would report it SURVIVING against their checks; the tier rows are measured here against the tier checks of
 * test/primitives/tiers.test.ts on rmat14 (every tier populated). The first block is the coverage check of the whole
 * table (the coverage.test.ts loop applied to SABOTAGE_P4_TIERS); the K2 rows P4-T6 appends under fa2-attraction
 * are measured by the K2 stage check T6 adds here; the fa2-stats-finalize rows of P4-T12 belong to
 * test/sabotage/grid.test.ts, never to this file. Every mutant runs on a FRESH context (the pipeline key does not
 * include the body).
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type TestContext } from "vitest";

import { type GpuContext } from "../../src/context.js";
import { type KernelId, KERNELS } from "../../src/kernels.js";
import { attractionTierWorstFactor, attractionWindowedWorstFactor } from "../helpers/attraction-check.js";
import { fixture, rmatEdges, snapshotOf } from "../helpers/graphs.js";
import { type Mutation, SABOTAGE_P4_TIERS, sabotagedBody, withSabotage } from "../helpers/sabotage.js";
import { tieredWorstFactor, windowedWorstFactor } from "../helpers/segmented-reduce.js";
import { tieredSpmvWorstFactor } from "../helpers/spmv.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
/** The three row-walking kernels whose tier rows this file measures. */
const ROW_WALKING: readonly KernelId[] = ["segmented-reduce", "spmv-pull", "fa2-attraction"];

function rowsOf(id: KernelId): readonly Mutation[] {
    return SABOTAGE_P4_TIERS[id] ?? [];
}

function tabledIds(): KernelId[] {
    return Object.keys(SABOTAGE_P4_TIERS) as KernelId[];
}

/** The check a row's kernel is measured by: the segmented-reduce tier check on rmat14 (the windowed check of P4-T7 for a row whose `test` names the primitive test), the pull's on its directed twin, the layout's K2 stage on rmat14 for T6's tier rows (the kernel-level window check for the row whose `test` names the windowed suite). */
async function checkOf(ctx: GpuContext, id: KernelId, mutation?: Mutation): Promise<number> {
    if (id === "fa2-attraction") {
        if (mutation?.test.endsWith("attraction-windowed.test.ts") === true) {
            return await attractionWindowedWorstFactor(ctx);
        }
        return await attractionTierWorstFactor(ctx);
    }
    if (id === "segmented-reduce") {
        if (mutation?.test.endsWith("segmented-reduce.test.ts") === true) {
            return await windowedWorstFactor(ctx);
        }
        const { snapshot } = fixture("rmat14", gpuScale());
        const factor = await tieredWorstFactor(ctx, snapshot);
        ctx.release(snapshot);
        return factor;
    }
    if (id === "spmv-pull") {
        const scale = Math.max(12, Math.round(14 + Math.log2(gpuScale())));
        const s = snapshotOf(rmatEdges(scale, 8, 1005), {
            directed: true,
            nodeCount: 2 ** scale,
            label: "rmat14-directed",
        });
        const factor = await tieredSpmvWorstFactor(ctx, s);
        ctx.release(s);
        return factor;
    }
    throw new Error(`${id}: no tier check for this kernel`);
}

describe("sabotage: the P4 tier table (coverage)", () => {
    it("every find string occurs exactly once in the entry's normative body, the replacement differs, minFactor >= 10, names unique", () => {
        expect(tabledIds().length).toBeGreaterThan(0);
        for (const id of tabledIds()) {
            const { body } = KERNELS[id];
            const names = new Set<string>();
            expect(rowsOf(id).length).toBeGreaterThanOrEqual(3);
            for (const m of rowsOf(id)) {
                expect(names.has(m.name), `${id}: duplicate mutation name ${m.name}`).toBe(false);
                names.add(m.name);
                const first = body.indexOf(m.find);
                expect(first, `${id}/${m.name}: find string absent from the body`).toBeGreaterThanOrEqual(0);
                expect(body.indexOf(m.find, first + m.find.length), `${id}/${m.name}: find string not unique`).toBe(-1);
                expect(m.replace, `${id}/${m.name}: replace equals find`).not.toBe(m.find);
                expect(m.minFactor, `${id}/${m.name}: minFactor`).toBeGreaterThanOrEqual(10);
                const mutated = sabotagedBody(id, m);
                expect(mutated).not.toBe(body);
                expect(mutated.includes(m.replace)).toBe(true);
                expect(mutated.length).toBe(body.length - m.find.length + m.replace.length);
            }
        }
    });

    it("every test names an existing test file under test/", () => {
        for (const id of tabledIds()) {
            for (const m of rowsOf(id)) {
                expect(m.test).toMatch(/^test\/.+\.test\.ts$/);
                expect(existsSync(resolve(PACKAGE_ROOT, m.test)), `${id}/${m.name}: ${m.test} does not exist`).toBe(
                    true,
                );
            }
        }
    });
});

describe("sabotage: the tier rows of the row-walking kernels", () => {
    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        return await acquire({ label: "sabotage-tiers" });
    }

    for (const id of ROW_WALKING) {
        if (rowsOf(id).length === 0) {
            continue;
        }
        it(
            `${id}: the real kernel passes the tier check (factor < 1)`,
            async (t) => {
                const ctx = await context(t);
                expect(await checkOf(ctx, id)).toBeLessThan(1);
                for (const mutation of rowsOf(id)) {
                    expect(await checkOf(ctx, id, mutation), `${mutation.name}'s check`).toBeLessThan(1);
                }
                ctx.dispose();
            },
            CASE_TIMEOUT,
        );
        for (const mutation of rowsOf(id)) {
            it(
                `${id}/${mutation.name}: fails the tier check by >= ${mutation.minFactor}x`,
                async (t) => {
                    requireGpu(t);
                    const factor = await withSabotage(id, mutation, (ctx) => checkOf(ctx, id, mutation));
                    console.warn(`[sabotage] ${id}/${mutation.name}: factor ${factor.toExponential(2)}`);
                    expect(factor).toBeGreaterThanOrEqual(mutation.minFactor);
                },
                CASE_TIMEOUT,
            );
        }
    }
});
