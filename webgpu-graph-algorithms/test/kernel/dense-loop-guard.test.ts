/**
 * The dense-row loops reach the driver without Tint's infinite-loop guard (G-ENV finding ENV-F8).
 *
 * From `webgpu` 0.5 Dawn's shader compiler adds a 64-bit `tint_loop_idx` countdown and an exit test to every loop it
 * cannot prove finite, and it proves a `left > 0u; left = left - 1u` count-down but not an up-count to a runtime
 * bound. On the Tesla T4 the guard on spmv-pull's dense loop doubled PageRank, the same loss the stride-one twins
 * were written to remove (commit 57873440). This test reads the SPIR-V Dawn generates for the three twins and fails
 * if any of them carries the guard again. Under `webgpu` 0.4.x no loop is guarded and the check passes trivially;
 * whenever the runtime guards loops at all, the strided `row_sum` must show it, so the check cannot pass by failing
 * to see a guard.
 *
 * run-twice exempt: compiles kernels and reads their generated code; no kernel result is compared.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { requireGpu } from "../setup/gpu.js";

const SCRIPT = resolve("scripts/dense-loop-dump.js");
const underCi = process.env.CI !== undefined && process.env.CI !== "";

/**
 * The body of SPIR-V function `name` (OpFunction .. OpFunctionEnd) in every dumped module that defines it.
 * @param dump - the child's stdout
 * @param name - the WGSL function name (symbol renaming is disabled for the dump)
 * @returns one body per module that has the function
 */
function functionBodies(dump: string, name: string): string[] {
    const bodies: string[] = [];
    for (const module of dump.split("Dumped SPIRV disassembly").slice(1)) {
        const id = new RegExp(`OpName (%\\S+) "${name}"`).exec(module)?.[1];
        if (id === undefined) {
            continue;
        }
        const start = module.indexOf(`${id} = OpFunction `);
        const end = module.indexOf("OpFunctionEnd", start);
        if (start >= 0 && end > start) {
            bodies.push(module.slice(start, end));
        }
    }
    return bodies;
}

describe("dense-row loops (G-ENV ENV-F8)", () => {
    it("carry no tint_loop_idx guard in the SPIR-V Dawn generates", (t) => {
        requireGpu(t);
        if (!existsSync(resolve("dist/node.js"))) {
            if (underCi) {
                throw new Error("dist/node.js is missing: build the package before the node project");
            }
            t.skip("dist/node.js is missing: run pnpm run build:all first");
        }
        const proc = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
        expect(proc.status, proc.stderr + proc.stdout.slice(0, 2000)).toBe(0);
        const dump = proc.stdout;
        const guarded = dump.includes("tint_loop_idx");
        console.warn(`[dense-loop-guard] this runtime ${guarded ? "guards" : "does not guard"} loops`);
        for (const name of ["row_sum_dense", "row_fold_dense", "row_force_dense"]) {
            const bodies = functionBodies(dump, name);
            expect(bodies.length, `${name} found in the dump`).toBeGreaterThan(0);
            for (const body of bodies) {
                expect(body.includes("tint_loop_idx"), `${name} is guarded`).toBe(false);
            }
        }
        if (guarded) {
            const control = functionBodies(dump, "row_sum");
            expect(control.length).toBeGreaterThan(0);
            expect(control.every((body) => body.includes("tint_loop_idx"))).toBe(true);
        }
    });
});
