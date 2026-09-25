/**
 * Spec 11.9 item 1 for the `bfs-contract` and `sssp-pred` kernels (P8-T6) and the `bfs-fused` kernel (P8-T7), plus
 * the selector rows the traversal rests on: every SABOTAGE row is spliced into the normative body and compiled on a
 * FRESH context, and the SAME check that passes on the real kernels -- bfsReport: `depth`, `parent`, `order`,
 * `visitedCount` and `levels` of the 30 x 30 grid from its corner and the 500-node path from its last index against
 * the oracle and the host rules under the two-phase path forced and under the fused path forced, the choice counters
 * of rmat14 at the default threshold against the oracle's level sizes, and the one-workgroup predecessor pass, all
 * bitwise (any mismatch is Infinity) -- fails on the mutant by at least minFactor. The first block is the coverage
 * loop of test/sabotage/coverage.test.ts applied to these rows (P8 is not in SABOTAGE_PHASES until P8-T15). Three
 * `frontier-finalize` rows are run here too: P8-T4's `rotation-dropped` (the first boundary rotates nothing in and
 * every traversal is the source alone) and `fused-slot-per-invocation` (a fused level expands only its first
 * ceil(next / wg) entries), and P8-T7's `fused-threshold-inverted`, which leaves every depth right and is caught
 * only by the exact `fusedLevels` / `twoPhaseLevels` counts.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { bfsReport } from "../helpers/bfs.js";
import { assertCheckPasses, type Mutation, SABOTAGE, sabotagedBody, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BFS_TEST = "test/algorithms/bfs.test.ts";

/** The selector rows this suite measures beside the frontier suite (rotation, fused slot) or alone (the threshold). */
const SELECTOR_ROWS: readonly string[] = ["rotation-dropped", "fused-slot-per-invocation", "fused-threshold-inverted"];

/** The rows this suite measures: the three BFS kernels' own, and the selector rows by name. */
const MEASURED: readonly { readonly id: KernelId; readonly rows: readonly Mutation[] }[] = [
    { id: "bfs-contract", rows: SABOTAGE["bfs-contract"] ?? [] },
    { id: "sssp-pred", rows: SABOTAGE["sssp-pred"] ?? [] },
    { id: "bfs-fused", rows: SABOTAGE["bfs-fused"] ?? [] },
    {
        id: "frontier-finalize",
        rows: (SABOTAGE["frontier-finalize"] ?? []).filter((m) => SELECTOR_ROWS.includes(m.name)),
    },
];

describe("sabotage: bfs-contract, sssp-pred and bfs-fused (spec 11.9 item 1; P8-T6, P8-T7)", () => {
    it("has three contract rows, four predecessor rows and three fused rows naming the BFS test, and measures three selector rows; every find occurs once in the normative body, the replacement differs, minFactor >= 10, names unique", () => {
        expect((SABOTAGE["bfs-contract"] ?? []).map((m) => m.name)).toEqual([
            "claim-not-a-min",
            "same-level-claimants-append",
            "claim-is-the-level",
        ]);
        expect((SABOTAGE["sssp-pred"] ?? []).map((m) => m.name)).toEqual([
            "same-depth-attains",
            "largest-predecessor",
            "last-row-skipped",
            "stride-dropped",
        ]);
        expect((SABOTAGE["bfs-fused"] ?? []).map((m) => m.name)).toEqual([
            "claim-outside-the-guard",
            "fused-scan-round-dropped",
            "fused-claim-is-the-level",
        ]);
        expect(MEASURED[3].rows.map((m) => m.name)).toEqual(SELECTOR_ROWS);
        expect(MEASURED[3].rows.map((m) => m.test)).toEqual([
            "test/primitives/frontier.test.ts",
            "test/primitives/frontier.test.ts",
            BFS_TEST,
        ]);
        for (const id of ["bfs-contract", "sssp-pred", "bfs-fused"] as const) {
            const { body } = KERNELS[id];
            const names = new Set<string>();
            for (const m of SABOTAGE[id] ?? []) {
                expect(names.has(m.name), `duplicate mutation name ${m.name}`).toBe(false);
                names.add(m.name);
                const first = body.indexOf(m.find);
                expect(first, `${id}/${m.name}: find string absent from the body`).toBeGreaterThanOrEqual(0);
                expect(body.indexOf(m.find, first + m.find.length), `${id}/${m.name}: find string not unique`).toBe(-1);
                expect(m.replace).not.toBe(m.find);
                expect(m.minFactor).toBeGreaterThanOrEqual(10);
                expect(m.test).toBe(BFS_TEST);
                expect(existsSync(resolve(PACKAGE_ROOT, m.test)), `${m.test} does not exist`).toBe(true);
                const mutated = sabotagedBody(id, m);
                expect(mutated).not.toBe(body);
                expect(mutated.includes(m.replace)).toBe(true);
                expect(mutated.length).toBe(body.length - m.find.length + m.replace.length);
            }
        }
    });

    it("the real kernels pass the check (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-bfs" });
        try {
            const report = await bfsReport(ctx);
            expect(report.worst).toBe(0);
            assertCheckPasses(report);
        } finally {
            ctx.dispose();
        }
    }, 120_000);

    for (const { id, rows } of MEASURED) {
        for (const mutation of rows) {
            it(`${id}/${mutation.name}: fails the check by >= ${mutation.minFactor}x`, async (t) => {
                requireGpu(t);
                const report = await withSabotage(id, mutation, (ctx) => bfsReport(ctx));
                console.warn(`[sabotage] ${id}/${mutation.name}: factor ${report.worst} at ${report.worstLabel}`);
                expect(report.worst).toBeGreaterThanOrEqual(mutation.minFactor);
                expect(() => assertCheckPasses(report)).toThrow();
            }, 120_000);
        }
    }

    it("the normative bodies are restored after every mutation", () => {
        for (const { id } of MEASURED) {
            expect(kernelSpec(id).body).toBe(KERNELS[id].body);
        }
    });
});
