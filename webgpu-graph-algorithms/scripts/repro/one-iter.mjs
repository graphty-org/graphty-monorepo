// Each GPU simulation from the same device-independent start on the 2,000-node story graph; writes the raw f32
// positions after iteration 1, 2, 5 and 50 so two devices can be compared bit for bit.
// Usage: node one-iter.mjs <adapter substring> <out dir>
import { execSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const req = createRequire(`${ROOT}/cytoscape-extensions/package.json`);
const wga = await import(req.resolve("@graphty/webgpu-graph-algorithms"));
const { createNodeGpuContext } = await import(req.resolve("@graphty/webgpu-graph-algorithms/node"));
const { fromEdgeArrays } = await import(req.resolve("@graphty/graph-format"));
const { plantedPartitionGraph } = await import(req.resolve("@graphty/graph-samples/generators"));
const [adapter, outDir] = process.argv.slice(2);
const dir = resolve(outDir, "one-iter");
mkdirSync(dir, { recursive: true });
appendFileSync(resolve(outDir, "journal.log"), `${new Date().toISOString()} ONE-ITER adapter=${adapter}\n`);
execSync("sync");
const n = 2000,
    groups = 9,
    groupSize = Math.round(n / groups);
const g = plantedPartitionGraph({ groups, groupSize, pIn: 6 / groupSize, pOut: 0.5 / n, seed: 42 });
const snap = fromEdgeArrays({ src: g.src, dst: g.dst, nodeCount: g.nodeCount, directed: false });
const ctx = await createNodeGpuContext({ adapter, rejectSoftware: false });
const acc = wga.createAccelerator(ctx);
for (const kind of ["forceAtlas2", "fruchtermanReingold", "springElectrical"]) {
    const sim = acc[kind]({
        seed: 42,
        iterationsPerStep: 1,
        maxIter: 10_000,
        ...(kind === "fruchtermanReingold" ? { iterations: 10_000 } : {}),
    });
    const pos = new Float32Array(3 * g.nodeCount);
    // a fixed start: a seeded LCG in [-100, 100)
    let s = 12345;
    for (let i = 0; i < 3 * g.nodeCount; i++) {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        pos[i] = i % 3 === 2 ? 0 : (s / 2 ** 32) * 200 - 100;
    }
    sim.load(snap, pos);
    const out = {};
    let done = 0;
    for (const at of [1, 2, 5, 50]) {
        while (done < at) {
            await sim.step(1);
            done++;
        }
        out[at] = Buffer.from(pos.buffer.slice(0)).toString("base64");
    }
    writeFileSync(`${dir}/${kind}.json`, JSON.stringify(out));
    sim.dispose();
}
console.log(
    "one-iter",
    ctx.caps.vendor,
    ctx.caps.device,
    "subgroups",
    ctx.caps.features.has("subgroups"),
    ctx.caps.subgroupMinSize,
    ctx.caps.subgroupMaxSize,
);
ctx.dispose();
process.exit(0);
