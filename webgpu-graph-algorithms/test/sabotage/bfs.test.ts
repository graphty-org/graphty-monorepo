/**
 * Spec 11.9 item 1 for the `bfs-contract` and `sssp-pred` kernels (P8-T6), plus the frontier rotation the traversal
 * rests on: every SABOTAGE row is spliced into the normative body and compiled on a FRESH context, and the SAME
 * check that passes on the real kernels -- bfsReport: `depth`, `parent`, `order`, `visitedCount` and `levels` of the
 * 30 x 30 grid from its corner and the 500-node path from its last index against the oracle and the host rules, and
 * the one-workgroup predecessor pass, all bitwise (any mismatch is Infinity) -- fails on the mutant by at least
 * minFactor. The first block is the coverage loop of test/sabotage/coverage.test.ts applied to these rows (P8 is not
 * in SABOTAGE_PHASES until P8-T15). P8-T4's `rotation-dropped` row is run here too: the first boundary rotates
 * nothing in and every traversal is the source alone.
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

/** The rows this suite measures: the two P8-T6 kernels' own, and the frontier rotation by name. */
const MEASURED: readonly { readonly id: KernelId; readonly rows: readonly Mutation[] }[] = [
    { id: "bfs-contract", rows: SABOTAGE["bfs-contract"] ?? [] },
    { id: "sssp-pred", rows: SABOTAGE["sssp-pred"] ?? [] },
    {
        id: "frontier-finalize",
        rows: (SABOTAGE["frontier-finalize"] ?? []).filter((m) => m.name === "rotation-dropped"),
    },
];

describe("sabotage: bfs-contract and sssp-pred (spec 11.9 item 1; P8-T6)", () => {
    it("has three contract rows and four predecessor rows naming the BFS test; every find occurs once in the normative body, the replacement differs, minFactor >= 10, names unique", () => {
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
        expect(MEASURED[2].rows).toHaveLength(1);
        for (const id of ["bfs-contract", "sssp-pred"] as const) {
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
