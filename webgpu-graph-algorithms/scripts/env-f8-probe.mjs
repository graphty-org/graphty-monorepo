/**
 * TEMPORARY (pull request #24, G-ENV finding ENV-F8): PageRank across two Dawn builds and two loop shapes on one card.
 * Removed once the lane has answered. Run from webgpu-graph-algorithms after the build, through tsx (it imports src):
 *
 *   node --import tsx scripts/env-f8-probe.mjs --mod <dir of a webgpu package> --src <src dir> --tag <label> [--dump]
 *
 * Prints one RESULT line per tier: the median and minimum wall of 100 PageRank iterations on a RESIDENT graph (the
 * upload is outside the timing, unlike the bench row, so only the kernels move it). With --dump it instead runs
 * PageRank once under Dawn's dump_shaders and prints how many `tint_loop_idx` lines each WGSL function's SPIR-V has.
 */

import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const arg = (name) => {
    const i = argv.indexOf(name);
    return i < 0 ? undefined : argv[i + 1];
};
const mod = arg("--mod");
const src = arg("--src") ?? "src";
const tag = arg("--tag") ?? "";
const runs = Number(arg("--runs") ?? "7");
const dump = argv.includes("--dump");
const at = (p) => pathToFileURL(`${process.cwd()}/${p}`).href;

if (arg("--parse") !== undefined) {
    // the dump of a --dump run: tint_loop_idx lines per function body, per module
    const { readFileSync } = await import("node:fs");
    const text = readFileSync(arg("--parse"), "utf8");
    for (const module of text.split("Dumped SPIRV disassembly").slice(1)) {
        for (const [, id, name] of module.matchAll(/OpName (%\S+) "(row_\w+|tier0|spmv_pull|segmented_reduce)"/g)) {
            const start = module.indexOf(`${id} = OpFunction `);
            if (start < 0) {
                continue;
            }
            const body = module.slice(start, module.indexOf("OpFunctionEnd", start));
            console.log(`GUARD ${tag} ${name}: ${body.split("tint_loop_idx").length - 1} tint_loop_idx references`);
        }
    }
    process.exit(0);
}

const { createNodeGpuContext } = await import(at(`${src}/node/index.ts`));
const { pageRank } = await import(at(`${src}/algorithms/pagerank.ts`));
const { randomEdges, snapshotOf } = await import(at("benchmarks/datasets.ts"));
const version = (await import(pathToFileURL(`${mod}/package.json`).href, { with: { type: "json" } })).default.version;

const ctx = await createNodeGpuContext({
    loadModule: () => import(pathToFileURL(`${mod}/index.js`).href),
    dawnFeatures: dump ? ["dump_shaders", "disable_symbol_renaming"] : [],
    dawnDisableFeatures: ["timestamp_quantization"],
});
const tiers = dump
    ? [["1k/10k", 1000, 10_000]]
    : [
          ["100k/1M", 100_000, 1_000_000],
          ["1M/10M", 1_000_000, 10_000_000],
      ];
for (const [name, n, m] of tiers) {
    const s = snapshotOf(randomEdges(n, m, 12345), { label: `probe/${name}` });
    await pageRank(ctx, s, { maxIterations: 100, tolerance: 0 }); // upload, compile, clock warm-up
    if (!dump) {
        await pageRank(ctx, s, { maxIterations: 100, tolerance: 0 });
        const t = [];
        for (let i = 0; i < runs; i++) {
            const t0 = performance.now();
            await pageRank(ctx, s, { maxIterations: 100, tolerance: 0 });
            t.push(performance.now() - t0);
        }
        t.sort((a, b) => a - b);
        console.log(
            `RESULT ${tag} webgpu=${version} ${name} resident 100 iterations: median ${t[t.length >> 1].toFixed(2)} ms min ${t[0].toFixed(2)} ms (${runs} runs; ${ctx.caps.description})`,
        );
    }
    ctx.release(s);
}
ctx.dispose();
process.exit(0);
