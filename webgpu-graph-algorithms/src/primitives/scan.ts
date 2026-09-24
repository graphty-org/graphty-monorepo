/**
 * The `exclusiveScan` primitive driver (spec 6 row 2; P4-T2, PD-3): a reduce-then-scan over u32 words. Level 0 runs
 * `scan-block` over `count` items into `out` (each workgroup an exclusive Hillis-Steele scan of its WG-wide block) and
 * writes one block sum per workgroup; while a level has more than one block, the next level scans its block sums
 * (exclusive, into `offsets_L`) and writes its own block sums, recursively; the top level has ONE block, so its one
 * sums word is the total. Then, top down, `scan-add` adds `offsets_L[g]` to every element of block `g` of level L's
 * output. u32 addition is exact in any order, so two runs on any two adapters are bitwise identical; there is no
 * subgroup variant (DEP-P4-E) and no decoupled look-back.
 *
 * The driver owns no device objects beyond a one-word zero it keeps for the empty scan: the caller supplies a
 * ReduceScope (the same record `reduce` takes) and the compute pass to record into. `src/primitives/**` never imports
 * `src/context.ts`.
 */

import { WebGpuGraphError } from "../errors.js";
import { type DispatchPlan, groupsOf, plan1d } from "../kernel/dispatch.js";
import { type Kernel } from "../kernel/kernel.js";
import { kernelSpec, SCAN_PARAMS } from "../kernels.js";
import { type Binding } from "../types/memory.js";
import { type ReduceScope } from "./reduce.js";

/** Where the scan's total landed: one u32 word at `index` of `binding` (a word of the planner's scratch, valid until the next record()). */
export interface ScanTotal {
    readonly binding: Binding;
    readonly index: number;
}

/** A prepared exclusive scan (spec 6 row 2): records the level dispatches of one scan into a pass. */
export interface ScanPlanner {
    /**
     * Records the scan of `count` u32 of `src` into `out` (exclusive); returns where the total landed (a word of the
     * planner's scratch, valid until the next record()); nothing for count 0 (the total word is then 0).
     * @param pass - the compute pass
     * @param src - the input words (at least 4 x count bytes)
     * @param count - the word count (a non-negative integer below 2^32)
     * @param out - the output words (at least 4 x count bytes)
     * @returns the total's location
     */
    record(pass: GPUComputePassEncoder, src: Binding, count: number, out: Binding): ScanTotal;
    /** Dispatches the last record() issued: 0 for count 0, else `2 x levels - 1` (one block scan per level, one add-back per level below the top). */
    readonly lastDispatches: number;
}

/** The largest u32: the largest count `ScanParams.count` can carry. */
const U32_MAX = 0xffffffff;

/**
 * Prepares the two scan pipelines of a scope (compiles once) so record() is synchronous. The zero word the empty
 * scan's total points at is a scratch of `scope`, so the planner lives exactly as long as the scope: never use a
 * planner after its scope's dispose().
 * @param scope - the caller's scope (device, caps, cache, scratch, params)
 * @returns the planner
 */
export async function prepareScan(scope: ReduceScope): Promise<ScanPlanner> {
    const block = await scope.pipelines.kernel(kernelSpec("scan-block"));
    const add = await scope.pipelines.kernel(kernelSpec("scan-add"));
    const zero = scope.scratch(4, "scan/zero");
    scope.device.queue.writeBuffer(zero, 0, new Uint32Array(1));
    return new ScanPlannerImpl(scope, block, add, { buffer: zero, offset: 0, size: 4, window: null });
}

/**
 * The argument checks of record() (E_INVALID_ARGUMENT before anything is recorded).
 * @param src - the input binding
 * @param count - the word count
 * @param out - the output binding
 */
function checkRecordArguments(src: Binding, count: number, out: Binding): void {
    if (!Number.isSafeInteger(count) || count < 0 || count > U32_MAX) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", "scan: count must be a non-negative integer below 2^32", {
            argument: "count",
            value: count,
        });
    }
    if (src.size < 4 * count) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", "scan: src is smaller than 4 x count bytes", {
            argument: "src",
            value: src.size,
            expected: 4 * count,
        });
    }
    if (out.size < 4 * count) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", "scan: out is smaller than 4 x count bytes", {
            argument: "out",
            value: out.size,
            expected: 4 * count,
        });
    }
}

/** One level of the recursion: its input words, its exclusive output, its count, its dispatch plan and its per-block sums. */
interface Level {
    readonly input: Binding;
    readonly output: Binding;
    readonly count: number;
    readonly plan: DispatchPlan;
    readonly sums: Binding;
}

/** The planner: the two resolved kernels over one scope. */
class ScanPlannerImpl implements ScanPlanner {
    private readonly scope: ReduceScope;
    private readonly block: Kernel;
    private readonly add: Kernel;
    private readonly zero: Binding;
    private dispatches = 0;

    /**
     * Wraps the resolved kernels; use prepareScan().
     * @param scope - the caller's scope
     * @param block - the `scan-block` kernel
     * @param add - the `scan-add` kernel
     * @param zero - a one-word binding holding 0 (the total of the empty scan)
     */
    constructor(scope: ReduceScope, block: Kernel, add: Kernel, zero: Binding) {
        this.scope = scope;
        this.block = block;
        this.add = add;
        this.zero = zero;
    }

    /**
     * Dispatches the last record() issued.
     * @returns the count
     */
    get lastDispatches(): number {
        return this.dispatches;
    }

    /**
     * Records the levels into the pass (see the interface).
     * @param pass - the compute pass
     * @param src - the input words
     * @param count - the word count
     * @param out - the output words
     * @returns the total's location
     */
    record(pass: GPUComputePassEncoder, src: Binding, count: number, out: Binding): ScanTotal {
        checkRecordArguments(src, count, out);
        if (count === 0) {
            this.dispatches = 0;
            return { binding: this.zero, index: 0 };
        }
        const wg = this.scope.workgroupSize;
        const levels: Level[] = [];
        let input = src;
        let output = out;
        let levelCount = count;
        for (;;) {
            const blocks = Math.ceil(levelCount / wg);
            // Sized by the PADDED workgroup count (reduce's shape, reduce.ts partials-1): above MAX_1D_ITEMS plan1d pads
            // the grid to x * y >= blocks, and every padded workgroup still stores its (zero) block sum at its own index.
            // The next level scans only `blocks` words, so the padded tail is written and never read.
            const plan = plan1d(levelCount, wg, this.scope.caps);
            const groups = groupsOf(plan);
            const sums = this.scratch(groups, `scan/sums${levels.length}`);
            levels.push({ input, output, count: levelCount, plan, sums });
            if (blocks === 1) {
                break;
            }
            input = sums;
            output = this.scratch(groups, `scan/offsets${levels.length}`);
            levelCount = blocks;
        }
        for (const level of levels) {
            const params = this.scope.params(SCAN_PARAMS, { count: level.count, pad0: 0, pad1: 0, pad2: 0 });
            const bound = this.block.bind({
                src: level.input,
                out: level.output,
                blockSums: level.sums,
                P: params.binding,
            });
            this.block.dispatch(pass, bound, level.plan, [params.offset]);
        }
        for (let l = levels.length - 2; l >= 0; l--) {
            const level = levels[l];
            const params = this.scope.params(SCAN_PARAMS, { count: level.count, pad0: 0, pad1: 0, pad2: 0 });
            const bound = this.add.bind({ out: level.output, blockOffsets: levels[l + 1].output, P: params.binding });
            this.add.dispatch(pass, bound, level.plan, [params.offset]);
        }
        this.dispatches = 2 * levels.length - 1;
        const top = levels[levels.length - 1];
        return { binding: top.sums, index: 0 };
    }

    /**
     * A scratch of `words` u32 from the scope, bound whole (never zero-length; the pool rounds the buffer up).
     * @param words - the word count (>= 1)
     * @param label - the scratch label
     * @returns the binding
     */
    private scratch(words: number, label: string): Binding {
        const size = 4 * words;
        const buffer = this.scope.scratch(size, label);
        return { buffer, offset: 0, size, window: null };
    }
}
