/**
 * Spec 11.9 item 1 for the `bfs-contract` and `sssp-pred` kernels (P8-T6), the `bfs-fused` kernel (P8-T7) and the
 * `bfs-bottom-up`, `bfs-bitset-build` and `bfs-unvisited-flags` kernels (P8-T8) and the `bfs-next-degree` kernel
 * (issue #391: Beamer's m_f measured on the frontier about to be expanded), plus the selector rows the traversal
 * rests on: every SABOTAGE row is spliced into the normative body and compiled on a FRESH context, and the
 * SAME check that passes on the real kernels -- bfsReport: `depth`, `parent`, `order`, `visitedCount` and `levels`
 * of the 30 x 30 grid from its corner and the 500-node path from its last index against the oracle and the host
 * rules under the two-phase path forced and under the fused path forced (top-down only), the choice counters of
 * rmat14 at the default threshold against the oracle's level sizes, rmat14's per-boundary direction and unvisited
 * words against the host model of Beamer's rule at both cadences, the path from its middle and the hub-clique
 * fixture forced bottom-up (alpha U32_MAX, beta 0) with the clique's `arcsScanned` allowed one extra read per
 * claim, the directed path's unvisited words, and the one-workgroup predecessor pass, all bitwise (any mismatch is
 * Infinity) -- fails on the mutant by at least minFactor. The first block is the coverage loop of
 * test/sabotage/coverage.test.ts applied to these rows (P8 is not in SABOTAGE_PHASES until P8-T15). Three
 * `frontier-finalize` rows are run here too: P8-T4's `rotation-dropped` (the first boundary rotates nothing in and
 * every traversal is the source alone), P8-T7's `fused-threshold-inverted`, which leaves every depth right and is caught only
 * by the exact `fusedLevels` / `twoPhaseLevels` counts, and P8-T8's `growing-test-inverted`, caught only by the
 * direction model. The `sssp-pred` rows measured here are the four of its depth mode; P8-T9's three f32-mode rows
 * name the SSSP test and are measured by test/sabotage/sssp.test.ts alone.
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
const SSSP_TEST = "test/algorithms/sssp.test.ts";
/** P8-T9's f32-mode rows of `sssp-pred`: named here so the name list below stays exact, measured by the SSSP suite. */
const F32_MODE_ROWS: readonly string[] = ["attains-is-ge", "plateau-step-ignored", "roots-unseeded"];

/** The selector rows this suite measures beside the frontier suite (rotation, fused slot) or alone (the threshold, the growing test). */
const SELECTOR_ROWS: readonly string[] = ["rotation-dropped", "fused-threshold-inverted", "growing-test-inverted"];

/** The kernels whose every row names the BFS test. */
const BFS_KERNELS = [
    "bfs-contract",
    "sssp-pred",
    "bfs-fused",
    "bfs-bottom-up",
    "bfs-bitset-build",
    "bfs-unvisited-flags",
    "bfs-next-degree",
] as const;

/** The rows this suite measures: the seven BFS kernels' own that name the BFS test (sssp-pred's f32-mode rows name the SSSP test), and the selector rows by name. */
const MEASURED: readonly { readonly id: KernelId; readonly rows: readonly Mutation[] }[] = [
    ...BFS_KERNELS.map((id) => ({ id, rows: (SABOTAGE[id] ?? []).filter((m) => m.test === BFS_TEST) })),
    {
        id: "frontier-finalize",
        rows: (SABOTAGE["frontier-finalize"] ?? []).filter((m) => SELECTOR_ROWS.includes(m.name)),
    },
];

describe("sabotage: bfs-contract, sssp-pred, bfs-fused, bfs-bottom-up, bfs-bitset-build, bfs-unvisited-flags and bfs-next-degree (spec 11.9 item 1; P8-T6, P8-T7, P8-T8, issue #391)", () => {
    it("has three contract rows, four depth-mode predecessor rows (plus P8-T9's three f32-mode rows naming the SSSP test), three fused rows, three bottom-up rows, three bitset rows and three unvisited rows naming the BFS test, and measures three selector rows; every find occurs once in the normative body, the replacement differs, minFactor >= 10, names unique", () => {
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
            "attains-is-ge",
            "plateau-step-ignored",
            "roots-unseeded",
        ]);
        expect((SABOTAGE["bfs-fused"] ?? []).map((m) => m.name)).toEqual([
            "claim-outside-the-guard",
            "fused-scan-round-dropped",
            "fused-claim-is-the-level",
        ]);
        expect((SABOTAGE["bfs-bottom-up"] ?? []).map((m) => m.name)).toEqual([
            "early-exit-removed",
            "stale-entries-claimed",
            "bottom-up-claim-is-the-level",
        ]);
        expect((SABOTAGE["bfs-bitset-build"] ?? []).map((m) => m.name)).toEqual([
            "or-is-a-store",
            "bit-of-the-wrong-word",
            "last-frontier-entry-unset",
        ]);
        expect((SABOTAGE["bfs-unvisited-flags"] ?? []).map((m) => m.name)).toEqual([
            "everyone-listed",
            "in-degree-test-inverted",
            "in-degree-summed",
        ]);
        expect((SABOTAGE["bfs-next-degree"] ?? []).map((m) => m.name)).toEqual([
            "sum-dropped",
            "entries-counted-not-degrees",
            "path-gate-inverted",
        ]);
        const selector = MEASURED[MEASURED.length - 1];
        expect(selector.rows.map((m) => m.name)).toEqual(SELECTOR_ROWS);
        expect(selector.rows.map((m) => m.test)).toEqual(["test/primitives/frontier.test.ts", BFS_TEST, BFS_TEST]);
        for (const id of BFS_KERNELS) {
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
                expect(m.test).toBe(id === "sssp-pred" && F32_MODE_ROWS.includes(m.name) ? SSSP_TEST : BFS_TEST);
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
