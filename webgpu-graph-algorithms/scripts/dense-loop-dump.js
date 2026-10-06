/**
 * Prints the SPIR-V Dawn generates for the three dense-row kernels (spmv-pull, segmented-reduce and fa2-attraction at
 * TIER 0) by running PageRank and one ForceAtlas2 iteration on a small graph under Dawn's `dump_shaders` and
 * `disable_symbol_renaming` toggles. Dawn writes the dump to the native stdout, which JavaScript cannot intercept, so
 * `test/kernel/dense-loop-guard.test.ts` runs this file as a child process and reads its output.
 *
 * Runs AFTER `pnpm run build:all` (it imports dist/). Honours GRAPHTY_GPU_ADAPTER. Exit 0 with the dump on stdout;
 * exit 2 with `E_NO_ADAPTER: <reason>` on stdout when no adapter exists.
 */

import { fromEdgeArrays } from "@graphty/graph-format";

const { createNodeGpuContext } = await import("../dist/node.js");
const { createForceAtlas2, pageRank } = await import("../dist/webgpu-graph-algorithms.js");

let ctx;
try {
    ctx = await createNodeGpuContext({
        adapter: process.env.GRAPHTY_GPU_ADAPTER || undefined,
        dawnFeatures: ["dump_shaders", "disable_symbol_renaming"],
    });
} catch (err) {
    process.stdout.write(`E_NO_ADAPTER: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(2);
}

// a ring with chords: every row has arcs, and nothing reaches degree 32, so every kernel runs TIER 0 only
const n = 64;
const src = new Uint32Array(2 * n);
const dst = new Uint32Array(2 * n);
for (let i = 0; i < n; i++) {
    src[2 * i] = i;
    dst[2 * i] = (i + 1) % n;
    src[2 * i + 1] = i;
    dst[2 * i + 1] = (i + 7) % n;
}
const s = fromEdgeArrays({ directed: false, nodeCount: n, src, dst });
await pageRank(ctx, s, { maxIterations: 2, tolerance: 0 });
const sim = createForceAtlas2(ctx, { seed: 1 });
sim.load(s, new Float32Array(3 * n).fill(Number.NaN));
await sim.step(1);
sim.dispose();
ctx.release(s);
ctx.dispose();
process.exit(0);
