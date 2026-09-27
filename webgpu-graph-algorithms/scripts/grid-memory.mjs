/**
 * Measures whether native memory grows across GPU iterations in one Node process (issue #162).
 *
 * Prints the process RSS beside the JavaScript heap every `--every` iterations, so native growth (RSS climbing
 * while heapUsed stays flat) is visible. Three loops:
 *
 * - `fresh`: the pattern of test/layouts/grid-unbiased.test.ts -- a NEW ForceAtlas2 simulation on the grid tier per
 *   iteration: load, step(1), dispose.
 * - `one`: one simulation, step(1) per iteration (separates per-simulation cost from per-step cost).
 * - `raw`: Dawn alone, no graphty code: per iteration a storage buffer, a bind group, one dispatch, a copy into a
 *   MAP_READ staging buffer, mapAsync, then destroy() of both buffers.
 *
 * Runs AFTER `pnpm run build:all` (it imports dist/). Usage:
 *
 *   node --expose-gc scripts/grid-memory.mjs --mode fresh|one|raw [--adapter llvmpipe|4070] [--iterations 1000]
 *     [--every 50] [--nodes 1025] [--repulsion grid|exact] [--inspect] [--gc]
 *
 * `--inspect` (with `fresh`) runs each simulation through the test-only inspect() path the grid parity tests use
 * (debugRunStages to G7, then a readback of the force) instead of step(1). `--gc` forces a full garbage collection before every sample (needs --expose-gc), so a wrapper JavaScript still
 * holds cannot be mistaken for native retention. `WEBGPU_MODULE=<path>` loads another build of the `webgpu`
 * package (the `raw` loop only), e.g. a scratch install of a newer Dawn.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const here = dirname(fileURLToPath(import.meta.url));
const MB = 1024 * 1024;

const { values: args } = parseArgs({
    options: {
        mode: { type: "string", default: "fresh" },
        adapter: { type: "string", default: "" },
        iterations: { type: "string", default: "1000" },
        every: { type: "string", default: "50" },
        nodes: { type: "string", default: "1025" },
        gc: { type: "boolean", default: false },
        repulsion: { type: "string", default: "grid" },
        inspect: { type: "boolean", default: false },
    },
});
const iterations = Number(args.iterations);
const every = Number(args.every);
const nodes = Number(args.nodes);

/** One sample line: iteration, RSS, heapUsed, external (MB), and the RSS growth per iteration since the first. */
let first = null;
function sample(i) {
    if (args.gc) {
        globalThis.gc?.();
    }
    const m = process.memoryUsage();
    first ??= { i, rss: m.rss };
    const per = i > first.i ? ((m.rss - first.rss) / MB / (i - first.i)).toFixed(4) : "-";
    console.log(
        `iter=${i} rssMB=${(m.rss / MB).toFixed(1)} heapUsedMB=${(m.heapUsed / MB).toFixed(1)} ` +
            `externalMB=${(m.external / MB).toFixed(1)} rssMBPerIter=${per}`,
    );
}

async function graphtyLoop(fresh) {
    const { createNodeGpuContext } = await import(pathToFileURL(resolve(here, "../dist/node.js")).href);
    const { createForceAtlas2 } = await import(pathToFileURL(resolve(here, "../dist/webgpu-graph-algorithms.js")).href);
    const { fromEdgeArrays } = await import("@graphty/graph-format");
    const ctx = await createNodeGpuContext({ adapter: args.adapter, label: "grid-memory" });
    console.log(`adapter: ${ctx.caps.vendor} / ${ctx.caps.architecture} / ${ctx.caps.description}`);
    ctx.debug.inspect = args.inspect;
    // a ring plus chords, deterministic: enough structure for the grid tier without a generator dependency
    const edges = 4 * nodes;
    const src = new Uint32Array(edges);
    const dst = new Uint32Array(edges);
    for (let e = 0; e < edges; e++) {
        src[e] = e % nodes;
        dst[e] = (e * 7919 + 1) % nodes;
    }
    const snapshot = fromEdgeArrays({ directed: false, nodeCount: nodes, src, dst }, { label: "grid-memory" });
    const options = { dim: 2, repulsion: args.repulsion, maxIter: 1_000_000 };
    const make = () => {
        const sim = createForceAtlas2(ctx, { ...options, seed: 1 });
        sim.load(snapshot, new Float32Array(3 * nodes).fill(Number.NaN));
        return sim;
    };
    let sim = fresh ? null : make();
    for (let i = 0; i <= iterations; i++) {
        if (i % every === 0) {
            sample(i);
        }
        if (fresh) {
            const s = make();
            try {
                if (args.inspect) {
                    // the path of test/helpers/grid-parity.ts: run to G7 and read the force back
                    await s.debugRunStages("G7");
                    await s.inspect("force");
                } else {
                    await s.step(1);
                }
            } finally {
                s.dispose();
            }
        } else {
            await sim.step(1);
        }
    }
    sim?.dispose();
    ctx.release(snapshot);
    ctx.dispose();
}

const RAW_WGSL = `
@group(0) @binding(0) var<storage, read_write> data: array<f32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3u) {
    if (id.x < arrayLength(&data)) { data[id.x] = data[id.x] * 0.5 + 1.0; }
}`;

async function rawLoop() {
    const dawn = await import(process.env.WEBGPU_MODULE ?? "webgpu");
    Object.assign(globalThis, dawn.globals);
    const gpu = dawn.create(args.adapter === "" ? [] : [`adapter=${args.adapter}`]);
    const adapter = await gpu.requestAdapter();
    const device = await adapter.requestDevice();
    console.log(`adapter: ${adapter.info.vendor} / ${adapter.info.architecture} / ${adapter.info.description}`);
    const module = device.createShaderModule({ code: RAW_WGSL });
    const pipeline = device.createComputePipeline({ layout: "auto", compute: { module, entryPoint: "main" } });
    const bytes = 16 * nodes; // one vec4f per node, the size of the simulation's position buffer
    const input = new Float32Array(bytes / 4).fill(1);
    for (let i = 0; i <= iterations; i++) {
        if (i % every === 0) {
            sample(i);
        }
        const data = device.createBuffer({
            size: bytes,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
        });
        const staging = device.createBuffer({ size: bytes, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        device.queue.writeBuffer(data, 0, input);
        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: data } }],
        });
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(bytes / 4 / 64));
        pass.end();
        encoder.copyBufferToBuffer(data, 0, staging, 0, bytes);
        device.queue.submit([encoder.finish()]);
        await staging.mapAsync(GPUMapMode.READ);
        new Float32Array(staging.getMappedRange()).slice(0, 1);
        staging.unmap();
        data.destroy();
        staging.destroy();
    }
    device.destroy();
}

if (args.mode === "raw") {
    await rawLoop();
} else if (args.mode === "fresh" || args.mode === "one") {
    await graphtyLoop(args.mode === "fresh");
} else {
    throw new Error(`--mode expects fresh, one or raw, got ${args.mode}`);
}
