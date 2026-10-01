/**
 * Spec 11.9 item 1 for the `bf-relax` kernel (P8-T10): every SABOTAGE row of the kernel is spliced into the normative
 * body and compiled on a FRESH context, and the SAME check that passes on the real kernel -- bellmanFordReport: the
 * `dist` bit patterns against the f32 Bellman-Ford oracle, `predArc` against the host's PD-27 tight-subgraph rule,
 * `reachedCount` and the flag on the uniform-weight grid from both corners and on the negative DAG, the flag on the
 * planted negative cycle, and the retry-exhausted tally of the fan-in under a retry bound of one, all bitwise (any
 * mismatch is Infinity; a driver refusal is the maximal miss) -- fails on the mutant by at least minFactor. No row is
 * caught by a timing: the ignored exchange result is caught by the bound its losing lanes never exhaust, the inverted
 * improvement test and the dropped reverse direction by `dist`. The first block is the coverage loop of
 * test/sabotage/coverage.test.ts applied to these rows (P8 is not in SABOTAGE_PHASES until P8-T15).
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { bellmanFordReport } from "../helpers/bellman-ford.js";
import { assertCheckPasses, type Mutation, SABOTAGE, sabotagedBody, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BF_TEST = "test/algorithms/bellman-ford.test.ts";
const ID: KernelId = "bf-relax";
const ROWS: readonly Mutation[] = SABOTAGE[ID] ?? [];

describe("sabotage: bf-relax (spec 11.9 item 1; P8-T10)", () => {
    it("has three rows naming the Bellman-Ford test; every find occurs once in the normative body, the replacement differs, minFactor >= 10, names unique", () => {
        expect(ROWS.map((m) => m.name)).toEqual([
            "exchange-result-ignored",
            "improvement-test-inverted",
            "reverse-direction-dropped",
        ]);
        const { body } = KERNELS[ID];
        const names = new Set<string>();
        for (const m of ROWS) {
            expect(names.has(m.name), `duplicate mutation name ${m.name}`).toBe(false);
            names.add(m.name);
            const first = body.indexOf(m.find);
            expect(first, `${ID}/${m.name}: find string absent from the body`).toBeGreaterThanOrEqual(0);
            expect(body.indexOf(m.find, first + m.find.length), `${ID}/${m.name}: find string not unique`).toBe(-1);
            expect(m.replace).not.toBe(m.find);
            expect(m.minFactor).toBeGreaterThanOrEqual(10);
            expect(m.test).toBe(BF_TEST);
            expect(existsSync(resolve(PACKAGE_ROOT, m.test)), `${m.test} does not exist`).toBe(true);
            const mutated = sabotagedBody(ID, m);
            expect(mutated).not.toBe(body);
            expect(mutated.includes(m.replace)).toBe(true);
            expect(mutated.length).toBe(body.length - m.find.length + m.replace.length);
        }
    });

    it("the real kernel passes the check (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-bellman-ford" });
        try {
            const report = await bellmanFordReport(ctx);
            expect(report.worst).toBe(0);
            assertCheckPasses(report);
        } finally {
            ctx.dispose();
        }
    }, 120_000);

    for (const mutation of ROWS) {
        it(`${ID}/${mutation.name}: fails the check by >= ${mutation.minFactor}x`, async (t) => {
            requireGpu(t);
            const report = await withSabotage(ID, mutation, (ctx) => bellmanFordReport(ctx));
            console.warn(`[sabotage] ${ID}/${mutation.name}: factor ${report.worst} at ${report.worstLabel}`);
            expect(report.worst).toBeGreaterThanOrEqual(mutation.minFactor);
            expect(() => assertCheckPasses(report)).toThrow();
        }, 120_000);
    }

    it("the normative body is restored after every mutation", () => {
        expect(kernelSpec(ID).body).toBe(KERNELS[ID].body);
    });
});
