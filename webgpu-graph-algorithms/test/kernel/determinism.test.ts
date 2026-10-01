/**
 * Spec 11.9 item 4 for the two reduction primitives (contract 5.5 P2): reduce (f32 sum) and the thread-per-row
 * segmented-reduce give bitwise identical results on two runs, on the subgroup twin and on the workgroup twin; and
 * the subgroup helper's slot-ranking mechanism (contract 4.3, D16) is verified on the device by an ad hoc kernel
 * that records which subgroup key took which slot and the rank order the helper folds in. PLAN DECISION (P2-T2): the
 * plan's third binding was named `meta`, a WGSL reserved word the composer rejects (E_SHADER_COMPILE
 * { slot: "binding:meta" }); it is `counts` here.
 */

import { type F32, type U32 } from "@graphty/graph-format";
import { type TestContext } from "vitest";

import { type GpuContext } from "../../src/context.js";
import { plan1d } from "../../src/kernel/dispatch.js";
import { type WgslModuleSpec } from "../../src/kernel/wgsl.js";
import { prepareReduce } from "../../src/primitives/reduce.js";
import { bindingOf, readF32, readU32, withContext } from "../helpers/device.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { SEGMENTED_REDUCE_SNIPPETS } from "../helpers/override-matrix.js";
import { runSegmentedReduce, testReduceScope, weightedRandom } from "../helpers/segmented-reduce.js";
import { acquire, requireGpu } from "../setup/gpu.js";

/** Seeded f32 values in [-1, 1) (mixed signs, so the summation order matters). */
function makeValues(count: number, seed: number): F32 {
    const values = new Float32Array(count);
    let state = seed % 4294967296;
    for (let i = 0; i < count; i++) {
        state = (state * 1664525 + 1013904223) % 4294967296;
        values[i] = 2 * (state / 4294967296) - 1;
    }
    return values;
}

/** Two reduce sums of the same values on one context. */
async function reduceSumTwice(ctx: GpuContext, values: F32): Promise<[F32, F32]> {
    const scope = testReduceScope(ctx);
    try {
        const src = scope.scratch(values.byteLength, "determinism/src");
        ctx.device.queue.writeBuffer(src, 0, values);
        const out = scope.scratch(16, "determinism/out");
        const planner = await prepareReduce(scope, "sum", "f32");
        const results: F32[] = [];
        for (let run = 0; run < 2; run++) {
            const encoder = ctx.device.createCommandEncoder({ label: "determinism/reduce" });
            const pass = encoder.beginComputePass();
            planner.record(pass, bindingOf(src), values.length, bindingOf(out), 0);
            pass.end();
            ctx.device.queue.submit([encoder.finish()]);
            results.push(await readF32(ctx, out, 1));
        }
        expect(planner.lastDispatches).toBeGreaterThanOrEqual(2);
        return [results[0], results[1]];
    } finally {
        scope.dispose();
    }
}

/** The ad hoc kernel: every subgroup's elected lane takes a slot from an atomic counter (the D16 mechanism) and records its key (the subgroup's smallest local id); lanes below the count then rank the keys exactly as the helper does. */
const SLOT_ORDER_BODY = /* wgsl */ `
var<workgroup> so_counter: atomic<u32>;
var<workgroup> so_keys: array<u32, 64>;

@compute @workgroup_size(WG)
fn slot_order(@builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x == 0u) { atomicStore(&so_counter, 0u); }
    workgroupBarrier();
    let key = subgroupMin(lid.x);
    var slot = 0u;
    if (subgroupElect()) { slot = atomicAdd(&so_counter, 1u); }
    slot = subgroupBroadcast(slot, 0u);
    if (subgroupElect()) { so_keys[slot] = key; }
    workgroupBarrier();
    let count = atomicLoad(&so_counter);
    if (lid.x < count) {
        let mine = so_keys[lid.x];
        var rank = 0u;
        for (var k = 0u; k < count; k = k + 1u) { if (so_keys[k] < mine) { rank = rank + 1u; } }
        slotKey[lid.x] = mine;
        ranked[rank] = mine;
    }
    let total = wg_reduce_u32(1u, lid.x, 0u);
    if (lid.x == 0u) { counts[0] = count; counts[1] = total; counts[2] = WG; }
}
`;

const SLOT_ORDER_SPEC: WgslModuleSpec = {
    id: "sg-slot-order",
    body: SLOT_ORDER_BODY,
    bindings: [
        { group: 1, binding: 0, name: "slotKey", kind: "storage", wgslType: "array<u32>" },
        { group: 1, binding: 1, name: "ranked", kind: "storage", wgslType: "array<u32>" },
        { group: 1, binding: 2, name: "counts", kind: "storage", wgslType: "array<u32>" },
    ],
    overrideDecls: [],
    overrides: {},
    needs: ["subgroups"],
    uniforms: [],
};

/** The ad hoc kernel for `wg_scan_u32` (P8-T1): two scans back to back, the second over the reversed lanes, so the scratch or the slots are proven free again after a call. */
const SCAN_LANES_BODY = /* wgsl */ `
@compute @workgroup_size(WG)
fn scan_lanes(@builtin(local_invocation_id) lid: vec3<u32>) {
    let a = wg_scan_u32(src[lid.x], lid.x);
    let b = wg_scan_u32(src[WG - 1u - lid.x], lid.x);
    forward[lid.x] = a;
    reversed[lid.x] = b;
}
`;

const SCAN_LANES_SPEC: WgslModuleSpec = {
    id: "wg-scan-lanes",
    body: SCAN_LANES_BODY,
    bindings: [
        { group: 1, binding: 0, name: "src", kind: "storage-ro", wgslType: "array<u32>" },
        { group: 1, binding: 1, name: "forward", kind: "storage", wgslType: "array<u32>" },
        { group: 1, binding: 2, name: "reversed", kind: "storage", wgslType: "array<u32>" },
    ],
    overrideDecls: [],
    overrides: {},
    needs: ["subgroups"],
    uniforms: [],
};

/** Seeded u32 values in [0, 2^20); the sum of a workgroup's worth fits a u32 without wrapping. */
function makeLaneValues(count: number, seed: number): U32 {
    const values = new Uint32Array(count);
    let state = seed % 4294967296;
    for (let i = 0; i < count; i++) {
        state = (state * 1664525 + 1013904223) % 4294967296;
        values[i] = state >>> 12;
    }
    return values;
}

/** The inclusive prefix sum in lane order, the oracle of `wg_scan_u32`. */
function inclusiveScan(values: U32): U32 {
    const out = new Uint32Array(values.length);
    let run = 0;
    for (let i = 0; i < values.length; i++) {
        run += values[i];
        out[i] = run;
    }
    return out;
}

/** One dispatch of the scan-lanes kernel on `ctx`: reads back the `forward` and `reversed` buffers. */
async function scanLanes(ctx: GpuContext, values: U32): Promise<[U32, U32]> {
    const kernel = await ctx.pipelines.kernel(SCAN_LANES_SPEC);
    const wg = ctx.workgroupSize;
    expect(values.length).toBe(wg);
    const scope = testReduceScope(ctx);
    try {
        const src = scope.scratch(wg * 4, "scan-lanes/src");
        ctx.device.queue.writeBuffer(src, 0, values);
        const forward = scope.scratch(wg * 4, "scan-lanes/forward");
        const reversed = scope.scratch(wg * 4, "scan-lanes/reversed");
        const bound = kernel.bind({ src: bindingOf(src), forward: bindingOf(forward), reversed: bindingOf(reversed) });
        const encoder = ctx.device.createCommandEncoder({ label: "scan-lanes" });
        const pass = encoder.beginComputePass();
        kernel.dispatch(pass, bound, plan1d(wg, wg, ctx.caps));
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        return [await readU32(ctx, forward, wg), await readU32(ctx, reversed, wg)];
    } finally {
        scope.dispose();
    }
}

describe("determinism (spec 11.9 item 4)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "determinism" }));
        shared = ctx;
        return ctx;
    }

    it("reduce f32 sum over 65,537 values: two runs bitwise on the subgroup twin and on the workgroup twin", async (t) => {
        const ctx = await context(t);
        const values = makeValues(65_537, 11);
        const [a, b] = await reduceSumTwice(ctx, values);
        expectBitwiseEqual(a, b, "reduce twice (feature context)");
        const [c, d] = await withContext({ subgroups: false, label: "determinism-twin" }, (twin) =>
            reduceSumTwice(twin, values),
        );
        expectBitwiseEqual(c, d, "reduce twice (workgroup twin)");
    });

    it("segmented-reduce: two runs bitwise on both twins", async (t) => {
        const ctx = await context(t);
        const s = weightedRandom(2000, 8000, 5);
        const snippet = SEGMENTED_REDUCE_SNIPPETS.weight;
        const a = await runSegmentedReduce(ctx, s, "sum", snippet);
        const b = await runSegmentedReduce(ctx, s, "sum", snippet);
        expectBitwiseEqual(a, b, "segmented-reduce twice (feature context)");
        const [c, d] = await withContext({ subgroups: false, label: "determinism-twin" }, async (twin) => {
            const first = await runSegmentedReduce(twin, s, "sum", snippet);
            const second = await runSegmentedReduce(twin, s, "sum", snippet);
            twin.release(s);
            return [first, second];
        });
        expectBitwiseEqual(c, d, "segmented-reduce twice (workgroup twin)");
        expectBitwiseEqual(a, c, "segmented-reduce across twins");
        ctx.release(s);
    });

    it("wg_scan_u32 is the inclusive prefix sum in lane order on both twins, and a second call in the same body is clean (P8-T1)", async (t) => {
        const ctx = await context(t);
        const values = makeLaneValues(ctx.workgroupSize, 17);
        const expectedForward = inclusiveScan(values);
        const expectedReversed = inclusiveScan(new Uint32Array([...values].reverse()));
        const [forward, reversed] = await scanLanes(ctx, values);
        // the `forward` buffer holds the scan of src in lane order; `reversed` the scan of the mirrored lanes
        expectBitwiseEqual(forward, expectedForward, "wg_scan_u32 forward (feature context)");
        expectBitwiseEqual(reversed, expectedReversed, "wg_scan_u32 reversed, second call (feature context)");
        const [twinForward, twinReversed] = await withContext({ subgroups: false, label: "determinism-twin" }, (twin) =>
            scanLanes(twin, values),
        );
        expectBitwiseEqual(twinForward, expectedForward, "wg_scan_u32 forward (workgroup twin)");
        expectBitwiseEqual(twinReversed, expectedReversed, "wg_scan_u32 reversed, second call (workgroup twin)");
    });

    it("the subgroup helper ranks its slots by key: the fold order is fixed whatever order the elected lanes took their slots", async (t) => {
        const ctx = await context(t);
        if (!ctx.caps.features.has("subgroups")) {
            t.skip("the device has no subgroups feature: no slots to rank (GRAPHTY_GPU_NO_SUBGROUPS run)");
        }
        const kernel = await ctx.pipelines.kernel(SLOT_ORDER_SPEC);
        const wg = ctx.workgroupSize;
        const scope = testReduceScope(ctx);
        try {
            const rankedRuns: U32[] = [];
            for (let run = 0; run < 2; run++) {
                const slotKey = scope.scratch(64 * 4, "slot-order/slotKey");
                const ranked = scope.scratch(64 * 4, "slot-order/ranked");
                const counts = scope.scratch(16, "slot-order/counts");
                const bound = kernel.bind({
                    slotKey: bindingOf(slotKey),
                    ranked: bindingOf(ranked),
                    counts: bindingOf(counts),
                });
                const encoder = ctx.device.createCommandEncoder({ label: "slot-order" });
                const pass = encoder.beginComputePass();
                kernel.dispatch(pass, bound, plan1d(wg, wg, ctx.caps));
                pass.end();
                ctx.device.queue.submit([encoder.finish()]);
                const m = await readU32(ctx, counts, 4);
                const count = m[0];
                expect(m[1]).toBe(wg); // wg_reduce_u32 of 1 over the workgroup
                expect(m[2]).toBe(wg);
                expect(count).toBeGreaterThan(0);
                const subgroupSize = wg / count;
                expect(count * subgroupSize).toBe(wg);
                expect(subgroupSize).toBeGreaterThanOrEqual(4);
                if (ctx.caps.subgroupMinSize > 0) {
                    expect(subgroupSize).toBeGreaterThanOrEqual(ctx.caps.subgroupMinSize);
                }
                if (ctx.caps.subgroupMaxSize > 0) {
                    expect(subgroupSize).toBeLessThanOrEqual(ctx.caps.subgroupMaxSize);
                }
                const keys = await readU32(ctx, slotKey, count);
                const rankedKeys = await readU32(ctx, ranked, count);
                for (let r = 0; r < count; r++) {
                    expect(rankedKeys[r]).toBe(r * subgroupSize); // the ranked order is 0, s, 2s, ...: fixed
                }
                expect([...keys].sort((x, y) => x - y)).toEqual([...rankedKeys]); // the slots hold the same keys in whatever order
                rankedRuns.push(rankedKeys);
            }
            expectBitwiseEqual(rankedRuns[0], rankedRuns[1], "ranked order across two runs");
        } finally {
            scope.dispose();
        }
    });
});
