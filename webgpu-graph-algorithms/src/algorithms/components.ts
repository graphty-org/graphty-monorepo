/**
 * Weakly connected components on the device (spec 8.3, 3.3): Afforest from GAP's cc.cc, step for step. `comp[v] = v`
 * by `fill` mode 1; two sampled link rounds over the r-th out-neighbour of every row plus a compress (one batch, no
 * readback); a 1,024-vertex label sample the host takes the mode of, which is the giant component (PD-12); then
 * each-edge-once link rounds over `edgeList()` -- correct for directed and undirected input alike, which is what
 * makes the partition the WEAK one -- in batches of four `link + compress` pairs, ONE readback of the changed flag per
 * batch, until the flag stays 0; a final compress; readback; `renumberPartition` on the host in first-seen order so
 * the labels are IDENTICAL to the CPU's (spec 9.7), or the raw roots when `renumber: false`.
 *
 * PLAN DECISION PD-4: the changed flag is the word at `comp[n]`, so the link kernels bind three buffers (design 8.10).
 * PLAN DECISION PD-11: `E_PARTITION` is NOT a pass-through. The kernels only ever store a value read out of `comp`,
 * which `fill` seeded with `v < n`, so no label can be `INVALID_INDEX`; the host verifies every label is `< n` before
 * `renumberPartition` sees it and raises `E_VALIDATION { label: "connectedComponents/labels" }` if that ever fails --
 * it would mean a GPU bug, which no caller could act on as `E_PARTITION`.
 * DEP-M8B-C: no `dedupe` primitive; Afforest's link is idempotent, so a repeated edge is a no-op.
 */

import { type GraphSnapshot, renumberPartition, type U32 } from "@graphty/graph-format";

import { U32_MAX } from "../constants.js";
import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { CommandBatch } from "../kernel/batch.js";
import { plan1d, planGridStride } from "../kernel/dispatch.js";
import { FILL_PARAMS, graphBindings, graphOverrides, kernelSpec, WCC_PARAMS } from "../kernels.js";
import { type CoreBinding } from "../memory/residency.js";
import { assertWholeCore } from "../primitives/core-shape.js";
import { assertDeviceComputes } from "../primitives/verify.js";
import { type ComponentsOptions, type GpuLabelResult } from "../types/algorithms.js";
import { type Binding } from "../types/memory.js";
import { type GpuRunOptions } from "../types/run.js";
import { algorithmScope } from "./scope.js";

const ALGORITHM = "connectedComponents";
/** Link rounds between two reads of the changed flag (design 8.3: "checked every 4 rounds"). */
const ROUNDS_PER_BATCH = 4;
/** The edge-round cap; the flag not settling by then is a hard error, never a fallback. */
const MAX_WCC_ROUNDS = 64;
/** The sampled vertices the giant component is found from (design 8.3). */
const SAMPLE_SIZE = 1024;
/** The bound of a CAS retry loop and of a compress walk (PD-5). */
const MAX_STEPS = 1024;
/** Params slots of the largest batch: four link + four compress blocks; the setup batch uses fill + 2 links + compress. */
const RING_SLOTS = 2 * ROUNDS_PER_BATCH;

/**
 * Validates `options.dest` for a label result of `n` elements.
 * @param dest - the caller's destination array, if any
 * @param n - the node count
 * @returns the destination as a U32, or null when none was given
 */
function checkDest(dest: Float32Array | Uint32Array | undefined, n: number): U32 | null {
    if (dest === undefined) {
        return null;
    }
    if (dest instanceof Uint32Array && dest.length === n && dest.buffer instanceof ArrayBuffer) {
        return dest as U32;
    }
    throw new WebGpuGraphError(
        "E_INVALID_ARGUMENT",
        `${ALGORITHM}: dest must be a Uint32Array of length ${n} over an ArrayBuffer`,
        {
            argument: "dest",
            value: `${dest.constructor.name}(${dest.length})`,
            expected: `Uint32Array(${n}) over an ArrayBuffer`,
        },
    );
}

/**
 * The resident core; a windowed plan is refused with `E_TOO_LARGE { path: "windowed", algorithm }` (spec 3.8, 3.12;
 * DEP-P4-B: only degree and segmentedReduce execute windows).
 * @param ctx - the context
 * @param s - the snapshot
 * @returns the core binding
 */
function coreOf(ctx: GpuContext, s: GraphSnapshot): CoreBinding {
    const core = ctx.residency.core(s);
    assertWholeCore(core, s.arcCount, ctx.caps.limits.maxStorageBufferBindingSize, ALGORITHM);
    return core;
}

/**
 * Whole-buffer binding of a scratch buffer over its first `size` bytes.
 * @param buffer - the buffer
 * @param size - the bound byte length
 * @returns the binding
 */
function bindingOf(buffer: GPUBuffer, size: number): Binding {
    return { buffer, offset: 0, size, window: null };
}

/**
 * The result object over a label array whose labels are all `< n`: `count` blocks, `groups()` built lazily once in
 * first-seen label order (which for renumbered labels is index order).
 * @param labels - the labels
 * @param count - the block count
 * @returns the result
 */
function labelResult(labels: U32, count: number): GpuLabelResult {
    let groups: U32[] | null = null;
    return {
        labels,
        count,
        groups(): U32[] {
            if (groups !== null) {
                return groups;
            }
            const n = labels.length;
            const dense = new Uint32Array(n).fill(U32_MAX);
            const sizes = new Uint32Array(count);
            let next = 0;
            for (let v = 0; v < n; v++) {
                let k = dense[labels[v]];
                if (k === U32_MAX) {
                    k = next++;
                    dense[labels[v]] = k;
                }
                sizes[k]++;
            }
            const built: U32[] = Array.from(sizes, (size) => new Uint32Array(size));
            const filled = new Uint32Array(count);
            for (let v = 0; v < n; v++) {
                const k = dense[labels[v]];
                built[k][filled[k]++] = v;
            }
            groups = built;
            return built;
        },
    };
}

/**
 * The mode of the sampled labels (GAP's SampleFrequentElement, counted on the host; PD-12).
 * @param sample - the sampled labels
 * @returns the most frequent label
 */
function modeOf(sample: Uint32Array): number {
    const counts = new Map<number, number>();
    let best = sample[0];
    let bestCount = 0;
    for (const label of sample) {
        const c = (counts.get(label) ?? 0) + 1;
        counts.set(label, c);
        if (c > bestCount) {
            best = label;
            bestCount = c;
        }
    }
    return best;
}

/**
 * Verifies every label is a node index (so `renumberPartition` can never see `INVALID_INDEX`, PD-11) and counts the
 * distinct roots.
 * @param raw - the labels the device produced
 * @returns the number of distinct labels
 */
function checkLabels(raw: U32): number {
    const n = raw.length;
    const seen = new Uint8Array(n);
    let count = 0;
    for (let v = 0; v < n; v++) {
        const label = raw[v];
        if (label >= n) {
            throw new WebGpuGraphError("E_VALIDATION", `${ALGORITHM}: labels[${v}] = ${label} is not a node index`, {
                label: `${ALGORITHM}/labels`,
                message: `the device produced a label outside [0, ${n})`,
            });
        }
        if (seen[label] === 0) {
            seen[label] = 1;
            count++;
        }
    }
    return count;
}

/**
 * Weakly connected components on the device (spec 3.3, 8.3): Afforest over the resident core and the edge list;
 * labels dense in first-seen order (`renumber: true`, the default) or the raw roots (`renumber: false`).
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param options - renumber (default true), plus dest / signal / onProgress
 * @returns the labels, the component count and groups()
 */
export async function connectedComponents(
    ctx: GpuContext,
    s: GraphSnapshot,
    options?: ComponentsOptions & GpuRunOptions,
): Promise<GpuLabelResult> {
    ctx.assertReady();
    await assertDeviceComputes(ctx);
    const n = s.nodeCount;
    const renumber = options?.renumber !== false;
    const dest = checkDest(options?.dest, n);
    if (options?.signal?.aborted) {
        throw new WebGpuGraphError("E_ABORTED", `${ALGORITHM}: the signal was aborted before any work started`, {});
    }
    if (n === 0) {
        options?.onProgress?.(1, 1);
        return labelResult(dest ?? new Uint32Array(0), 0);
    }
    const core = coreOf(ctx, s);
    if (s.arcCount === 0) {
        // every node is its own block, and the identity is already first-seen dense: renumbered and raw agree
        const labels = dest ?? new Uint32Array(n);
        for (let v = 0; v < n; v++) {
            labels[v] = v;
        }
        options?.onProgress?.(1, 1);
        return labelResult(labels, n);
    }
    const edges = ctx.residency.view(s, "edgeList");
    const edgeCount = edges.scalars.edgeCount[0];
    const scope = algorithmScope(ctx, ALGORITHM, RING_SLOTS);
    try {
        const compBytes = 4 * (n + 1);
        const comp = scope.scratch(compBytes, "comp");
        const items = Math.min(SAMPLE_SIZE, n);
        const hist = scope.scratch(4 * items, "hist");
        await ctx.allocator.check();
        const fill = await ctx.pipelines.kernel(kernelSpec("fill", {}));
        const linkSample = await ctx.pipelines.kernel(kernelSpec("wcc-link-sample", graphOverrides(core, null)));
        const linkEdges = await ctx.pipelines.kernel(kernelSpec("wcc-link-edges", {}));
        const compress = await ctx.pipelines.kernel(kernelSpec("wcc-compress", {}));
        const sample = await ctx.pipelines.kernel(kernelSpec("wcc-sample", {}));
        const { queue } = ctx.device;
        const compBinding = bindingOf(comp, compBytes);
        const histBinding = bindingOf(hist, 4 * items);
        const rowPlan = planGridStride(n, ctx.workgroupSize, ctx.caps);
        const edgePlan = planGridStride(edgeCount, ctx.workgroupSize, ctx.caps);
        const flagIndex = n;
        const zero = new Uint32Array(1);
        const wccParams = (fields: {
            items: number;
            stride: number;
            r: number;
            giant: number;
        }): { binding: Binding; offset: number } =>
            scope.params(WCC_PARAMS, { n, ...fields, flagIndex, maxSteps: MAX_STEPS, pad0: 0 });
        const recordCompress = (pass: GPUComputePassEncoder): void => {
            const params = wccParams({ items: n, stride: rowPlan.stride ?? n, r: 0, giant: U32_MAX });
            compress.dispatch(pass, compress.bind({ comp: compBinding, P: params.binding }), rowPlan, [params.offset]);
        };
        const submit = (batch: CommandBatch): ReturnType<CommandBatch["submit"]> => {
            scope.flush();
            return batch.submit();
        };

        // batch 1: comp[v] = v, the flag cleared, two sampled link rounds over the r-th out-neighbour, one compress
        queue.writeBuffer(comp, 4 * flagIndex, zero);
        const setup = new CommandBatch(ctx, `${ALGORITHM}/setup`);
        let pass = setup.pass("sample-rounds");
        const fillParams = scope.params(FILL_PARAMS, { count: n, value: 0, mode: 1, pad0: 0 });
        fill.dispatch(
            pass,
            fill.bind({ dst: bindingOf(comp, 4 * n), P: fillParams.binding }),
            plan1d(n, ctx.workgroupSize, ctx.caps),
            [fillParams.offset],
        );
        const graph = graphBindings(core, null);
        for (let r = 0; r < 2; r++) {
            const params = wccParams({ items: n, stride: rowPlan.stride ?? n, r, giant: U32_MAX });
            const bound = linkSample.bind({ ...graph, comp: compBinding, P: params.binding });
            linkSample.dispatch(pass, bound, rowPlan, [params.offset]);
        }
        recordCompress(pass);
        setup.endPass();
        await submit(setup).readback;
        ctx.assertReady();

        // batch 2: the label sample, whose mode is the giant component
        const sampler = new CommandBatch(ctx, `${ALGORITHM}/sample`);
        pass = sampler.pass("sample");
        const sampleParams = wccParams({ items, stride: 0, r: 0, giant: U32_MAX });
        sample.dispatch(
            pass,
            sample.bind({ comp: compBinding, hist: histBinding, P: sampleParams.binding }),
            plan1d(items, ctx.workgroupSize, ctx.caps),
            [sampleParams.offset],
        );
        sampler.endPass();
        const histRequest = sampler.readback(hist, 0, 4 * items);
        const histBytes = await submit(sampler).readback;
        ctx.assertReady();
        const giant = modeOf(new Uint32Array(histBytes, histRequest.offset, items));

        // the edge rounds: four (link + compress) per batch, one readback of the changed flag per batch
        const edgeBindings = { edgeSrc: edges.bindings.src, edgeDst: edges.bindings.dst, comp: compBinding };
        let rounds = 0;
        for (;;) {
            queue.writeBuffer(comp, 4 * flagIndex, zero);
            const batch = new CommandBatch(ctx, `${ALGORITHM}/rounds`);
            pass = batch.pass("edge-rounds");
            for (let i = 0; i < ROUNDS_PER_BATCH; i++) {
                const params = wccParams({ items: edgeCount, stride: edgePlan.stride ?? edgeCount, r: 0, giant });
                const bound = linkEdges.bind({ ...edgeBindings, P: params.binding });
                linkEdges.dispatch(pass, bound, edgePlan, [params.offset]);
                recordCompress(pass);
            }
            batch.endPass();
            const flagRequest = batch.readback(comp, 4 * flagIndex, 4);
            const submitted = submit(batch);
            const back = await submitted.readback;
            rounds += ROUNDS_PER_BATCH;
            ctx.assertReady();
            if (options?.signal?.aborted) {
                throw new WebGpuGraphError("E_ABORTED", `${ALGORITHM}: the signal was aborted`, {
                    batchId: submitted.id,
                });
            }
            if (new Uint32Array(back, flagRequest.offset, 1)[0] === 0) {
                break;
            }
            if (rounds >= MAX_WCC_ROUNDS) {
                throw new WebGpuGraphError(
                    "E_VALIDATION",
                    `${ALGORITHM}: the changed flag never settled in ${MAX_WCC_ROUNDS} rounds`,
                    { label: ALGORITHM, message: `the changed flag never settled in ${MAX_WCC_ROUNDS} rounds` },
                );
            }
        }

        // the final compress, then the labels
        const final = new CommandBatch(ctx, `${ALGORITHM}/final`);
        recordCompress(final.pass("compress"));
        final.endPass();
        await submit(final).readback;
        ctx.assertReady();
        const raw = !renumber && dest !== null ? dest : new Uint32Array(n);
        await ctx.readback.read(comp, 4 * n, raw);
        ctx.assertReady();
        const distinct = checkLabels(raw);
        options?.onProgress?.(1, 1);
        if (!renumber) {
            return labelResult(raw, distinct);
        }
        const { labels, count } = renumberPartition(raw, dest ?? undefined);
        return labelResult(labels, count);
    } finally {
        scope.dispose();
    }
}
