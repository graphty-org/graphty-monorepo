/**
 * Spec 11.9 item 1 for the `sssp-relax` kernel and the f32 mode of `sssp-pred` (P8-T9): every SABOTAGE row naming
 * the SSSP test is spliced into the normative body and compiled on a FRESH context, and the SAME check that passes
 * on the real kernels -- ssspReport: the `dist` bit patterns against the f32 Dijkstra oracle, `predArc` against the
 * host's PD-27 plateau rule and `reachedCount` on the uniform-weight grid, the integer-weight grid under a cutoff
 * some node attains exactly, the weight-2 path under `delta 32` with its round count, and `zeroPlateau(8)`, all
 * bitwise (any mismatch is Infinity; a driver refusal is the maximal miss) -- fails on the mutant by at least
 * minFactor. No row is caught by a timing: the near / far split is caught by the differential itself (the far pile
 * left in place leaves 48 nodes of the weight-2 path unreached). The first block is the coverage loop of
 * test/sabotage/coverage.test.ts applied to these rows (P8 is not in SABOTAGE_PHASES until P8-T15); `sssp-pred`'s
 * four depth-mode rows name the BFS test and are measured by test/sabotage/bfs.test.ts.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { assertCheckPasses, type Mutation, SABOTAGE, sabotagedBody, withSabotage } from "../helpers/sabotage.js";
import { ssspReport } from "../helpers/sssp.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SSSP_TEST = "test/algorithms/sssp.test.ts";

/** The rows this suite measures: every relax row, and the predecessor rows that name the SSSP test. */
const MEASURED: readonly { readonly id: KernelId; readonly rows: readonly Mutation[] }[] = [
    { id: "sssp-relax", rows: SABOTAGE["sssp-relax"] ?? [] },
    { id: "sssp-pred", rows: (SABOTAGE["sssp-pred"] ?? []).filter((m) => m.test === SSSP_TEST) },
];

describe("sabotage: sssp-relax and sssp-pred in its f32 mode (spec 11.9 item 1; P8-T9)", () => {
    it("has four relax rows and three f32-mode predecessor rows naming the SSSP test; every find occurs once in the normative body, the replacement differs, minFactor >= 10, names unique", () => {
        expect((SABOTAGE["sssp-relax"] ?? []).map((m) => m.name)).toEqual([
            "min-is-a-store",
            "hop-counts",
            "cutoff-exclusive",
            "far-never-returns",
        ]);
        expect(MEASURED[1].rows.map((m) => m.name)).toEqual([
            "attains-is-ge",
            "plateau-step-ignored",
            "roots-unseeded",
        ]);
        for (const { id, rows } of MEASURED) {
            const { body } = KERNELS[id];
            const names = new Set<string>();
            for (const m of rows) {
                expect(names.has(m.name), `duplicate mutation name ${m.name}`).toBe(false);
                names.add(m.name);
                const first = body.indexOf(m.find);
                expect(first, `${id}/${m.name}: find string absent from the body`).toBeGreaterThanOrEqual(0);
                expect(body.indexOf(m.find, first + m.find.length), `${id}/${m.name}: find string not unique`).toBe(-1);
                expect(m.replace).not.toBe(m.find);
                expect(m.minFactor).toBeGreaterThanOrEqual(10);
                expect(m.test).toBe(SSSP_TEST);
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
        const ctx = await acquire({ label: "sabotage-sssp" });
        try {
            const report = await ssspReport(ctx);
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
                const report = await withSabotage(id, mutation, (ctx) => ssspReport(ctx));
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
