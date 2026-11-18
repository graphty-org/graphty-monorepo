/**
 * The sabotage table is itself checked (spec 13 rule f, 11.9 item 1; contract 5.5): every KERNELS entry of a phase
 * listed in SABOTAGE_PHASES that is not exempt has at least three rows, every `find` string occurs exactly once in the
 * entry's NORMATIVE body (so a mutation is a well-defined textual edit of 4.5), every `test` names an existing test
 * file, and the splice helper rejects an absent or duplicated `find`. P2-T2, P3-T5, M8b-T10, P4-T12, P8-T15 and P11
 * extended SABOTAGE_PHASES when their rows landed; the pinned list below is the only line that changes. Every row of
 * every table also compiles on the device, so a mutant is killed only by a wrong result, never by a compile error.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PipelineCache } from "../../src/kernel/pipeline-cache.js";
import { type KernelId, KERNELS, kernelSpec, setKernelBodyOverride } from "../../src/kernels.js";
import { OVERRIDE_MATRIX } from "../helpers/override-matrix.js";
import {
    type Mutation,
    SABOTAGE,
    SABOTAGE_EXEMPT,
    SABOTAGE_PHASES,
    SABOTAGE_TABLES,
    sabotagedBody,
    validateSabotageTables,
} from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function rowsOf(id: KernelId): readonly Mutation[] {
    return SABOTAGE[id] ?? [];
}

describe("sabotage coverage (spec 11.9 item 1, 13 rule f)", () => {
    it("lists P1, P2, P3, P7, P4 (P4-T12), P8 (P8-T15), P9 (betweenness, all-pairs) and P11 and exempts exactly fill, fa2-to-scene, to-drawn and wcc-sample", () => {
        expect([...SABOTAGE_PHASES]).toEqual(["P1", "P2", "P3", "P7", "P4", "P8", "P9", "P11"]);
        expect([...SABOTAGE_EXEMPT].sort()).toEqual(["fa2-to-scene", "fill", "to-drawn", "wcc-sample"]);
    });

    it("every non-exempt kernel of a listed phase has >= 3 rows", () => {
        const listed = Object.values(KERNELS).filter(
            (entry) => SABOTAGE_PHASES.includes(entry.phase) && !SABOTAGE_EXEMPT.includes(entry.id),
        );
        expect(listed.length).toBeGreaterThan(0);
        for (const entry of listed) {
            expect(
                rowsOf(entry.id).length,
                `${entry.id} (${entry.phase}) needs >= 3 sabotage rows`,
            ).toBeGreaterThanOrEqual(3);
        }
    });

    it("the P1 rows are the four degree, four reduce, four K3 and three K4 mutations, by name", () => {
        expect(rowsOf("degree").map((m) => m.name)).toEqual([
            "last-row-skipped",
            "use-perm-select-swapped",
            "rebase-ignored",
            "target-counted-twice",
        ]);
        expect(rowsOf("reduce").map((m) => m.name)).toEqual([
            "final-writes-out-zero",
            "u32-min-identity-zero",
            "f32-min-identity-zero",
            "level-bound-inclusive",
        ]);
        expect(rowsOf("fa2-repulsion-exact").map((m) => m.name)).toEqual([
            "gravity-sign-flipped",
            "inverse-square-law",
            "self-pair-guard-removed",
            "mass-lane-x",
        ]);
        expect(rowsOf("fa2-speed-finalize").map((m) => m.name)).toEqual([
            "efficiency-halving-weakened",
            "efficiency-rise-removed",
            "swing-traction-swapped",
        ]);
        expect(rowsOf("fill")).toEqual([]);
    });

    it("every row of every table is well formed: its find occurs once in the normative body, the replacement differs, minFactor >= 10, names unique per kernel", () => {
        expect(validateSabotageTables(SABOTAGE_TABLES)).toEqual([]);
    });

    it("every row of every table names an existing test file under test/", () => {
        const missing: string[] = [];
        for (const table of SABOTAGE_TABLES) {
            for (const [id, rows] of Object.entries(table) as [KernelId, readonly Mutation[]][]) {
                for (const m of rows) {
                    if (!existsSync(resolve(PACKAGE_ROOT, m.test))) {
                        missing.push(`${id}/${m.name}: ${m.test}`);
                    }
                }
            }
        }
        expect(missing).toEqual([]);
    });

    it("validateSabotageTables reports an absent find, a duplicated find, an equal replacement, a low minFactor, a bad test path and a reused name", () => {
        const good: Mutation = {
            name: "x",
            find: "no such text in any body",
            replace: "y",
            minFactor: 10,
            test: "test/algorithms/degree.test.ts",
        };
        // `rowPtr[` occurs twice in the degree body: rowPtr[i] and rowPtr[i + 1u]
        const problems = validateSabotageTables([
            { degree: [good, { ...good, name: "dup", find: "rowPtr[" }] },
            {
                degree: [
                    {
                        ...good,
                        name: "dup",
                        find: "rowPtr[i + 1u]",
                        replace: "rowPtr[i + 1u]",
                        minFactor: 9,
                        test: "x.ts",
                    },
                ],
            },
        ]);
        expect(problems).toEqual([
            "degree/x: find string absent from the body",
            "degree/dup: find string not unique",
            "degree/dup: name used twice for this kernel",
            "degree/dup: replace equals find",
            "degree/dup: minFactor 9 is below 10",
            "degree/dup: test x.ts is not a test file under test/",
        ]);
    });

    it("every row of every table compiles: a mutant that does not compile would be counted as caught", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-compile" });
        const failures: string[] = [];
        let compiled = 0;
        try {
            for (const table of SABOTAGE_TABLES) {
                for (const [id, rows] of Object.entries(table) as [KernelId, readonly Mutation[]][]) {
                    const base = OVERRIDE_MATRIX.find((c) => c.id === id);
                    if (base === undefined) {
                        failures.push(`${id}: no OVERRIDE_MATRIX case to compile it with`);
                        continue;
                    }
                    for (const m of rows) {
                        // a fresh cache per mutant: the pipeline key does not include the body
                        const cache = new PipelineCache(ctx.device, ctx.caps);
                        setKernelBodyOverride(id, sabotagedBody(id, m));
                        try {
                            await cache.get(kernelSpec(id, base.overrides, base.snippets));
                            compiled++;
                        } catch (err) {
                            failures.push(`${id}/${m.name}: ${String(err)}`);
                        } finally {
                            setKernelBodyOverride(id, null);
                            cache.dispose();
                        }
                    }
                }
            }
        } finally {
            ctx.dispose();
        }
        expect(failures).toEqual([]);
        expect(compiled).toBeGreaterThanOrEqual(300);
    });

    it("sabotagedBody throws on an absent find and on a duplicated find", () => {
        const absent: Mutation = {
            name: "x",
            find: "no such text in any body",
            replace: "y",
            minFactor: 10,
            test: "test/algorithms/degree.test.ts",
        };
        expect(() => sabotagedBody("degree", absent)).toThrow(/absent/);
        // `rowPtr[` occurs twice in the degree body: rowPtr[i] and rowPtr[i + 1u]
        const duplicated: Mutation = {
            name: "x",
            find: "rowPtr[",
            replace: "y",
            minFactor: 10,
            test: "test/algorithms/degree.test.ts",
        };
        expect(() => sabotagedBody("degree", duplicated)).toThrow(/unique/);
    });
});
