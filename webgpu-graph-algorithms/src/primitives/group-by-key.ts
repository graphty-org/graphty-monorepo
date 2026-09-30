/**
 * The per-row group-by-key primitive (design 8.6; the P11 plan's PD-8): for every row `v` of a CSR graph, group the
 * row's arcs by the key of their target (`keyIn[colIdx[a]]`), sum the weights per key, and write the key with the
 * largest sum to `bestKey[v]` -- the LOWEST such key on a tie, which makes the answer independent of the visiting
 * order -- and its summed weight to `bestScore[v]`. An empty row gets `INVALID_INDEX` and 0. Label propagation's step
 * is its first caller: the best key of a row is the weighted mode of the neighbours' labels.
 *
 * Sums are u32 fixed point at a per-row power-of-two scale (the kernel header says how), so the two tiers and any
 * reference that follows the same arithmetic agree bitwise. A key must be below `INVALID_INDEX`.
 *
 * Two tiers, chosen per row on the host from an upper bound of each row's length (`planGroupRows`):
 * - TIER 0, a thread per row, for rows of at most `threadMax` arcs (GROUP_ROW_THREAD_MAX by default): a pairwise scan
 *   in registers, no workgroup memory, no barrier.
 * - TIER 1, a workgroup per row, for the rest: the row's keys are hashed into its own region of
 *   `GROUP_HASH_LOAD_FACTOR x length` slots of `hashRegion`, then the workgroup reduces the slots to the best one.
 *
 * PLAN DECISION (the P11 plan, PD-8): the plan's small tier sorted a row of up to 256 arcs in workgroup memory with a
 * bitonic sort, one workgroup per row; this tier is a thread per row instead, because a workgroup of 256 lanes spent
 * on a row of ten arcs -- the typical row -- idles 246 of them, and the pairwise scan needs no barrier at all. Rows
 * above GROUP_ROW_THREAD_MAX take the workgroup hash tier, which is the plan's large tier unchanged.
 */

import { GROUP_HASH_LOAD_FACTOR, GROUP_ROW_THREAD_LIMIT, GROUP_ROW_THREAD_MAX } from "../constants.js";
import { WebGpuGraphError } from "../errors.js";
import { plan1d, plan2d } from "../kernel/dispatch.js";
import { type Kernel } from "../kernel/kernel.js";
import { GROUP_PARAMS, kernelSpec } from "../kernels.js";
import { type Binding } from "../types/memory.js";
import { type ReduceScope } from "./reduce.js";

/**
 * The rows of each tier, as the host planned them: upload `words` into the `rows` binding and size `hashRegion` by `regionWords`.
 * @public
 */
export interface GroupRows {
    /** The thread tier's rows, then the workgroup tier's rows, then each workgroup-tier row's region offset (in words of `hashRegion`). */
    readonly words: Uint32Array<ArrayBuffer>;
    readonly threadCount: number;
    readonly hashCount: number;
    /** The words of `hashRegion`: word 0 is the exhausted flag, then two words (key, sum) per slot of every workgroup-tier row. */
    readonly regionWords: number;
}

/**
 * Splits the rows into the two tiers from an upper bound of every row's length (the exact length works too; a bound
 * only costs region space): rows whose bound is at most `threadMax` go to the thread tier, the rest to the workgroup
 * tier with `GROUP_HASH_LOAD_FACTOR x bound` slots each.
 * @param lengthBound - an upper bound of every row's arc count, one per row
 * @param threadMax - the longest row the thread tier takes (0 sends every row to the workgroup tier; at most GROUP_ROW_THREAD_LIMIT)
 * @returns the plan
 */
export function planGroupRows(lengthBound: ArrayLike<number>, threadMax: number = GROUP_ROW_THREAD_MAX): GroupRows {
    if (!Number.isInteger(threadMax) || threadMax < 0 || threadMax > GROUP_ROW_THREAD_LIMIT) {
        throw new WebGpuGraphError(
            "E_INVALID_ARGUMENT",
            `planGroupRows: threadMax must be an integer in [0, ${GROUP_ROW_THREAD_LIMIT}]`,
            { argument: "threadMax", value: threadMax, expected: `[0, ${GROUP_ROW_THREAD_LIMIT}]` },
        );
    }
    const n = lengthBound.length;
    const thread: number[] = [];
    const hash: number[] = [];
    for (let v = 0; v < n; v++) {
        (lengthBound[v] <= threadMax ? thread : hash).push(v);
    }
    const words = new Uint32Array(thread.length + 2 * hash.length);
    words.set(thread, 0);
    words.set(hash, thread.length);
    let next = 1;
    for (let g = 0; g < hash.length; g++) {
        words[thread.length + hash.length + g] = next;
        next += 2 * GROUP_HASH_LOAD_FACTOR * lengthBound[hash[g]];
    }
    return { words, threadCount: thread.length, hashCount: hash.length, regionWords: next };
}

/**
 * One grouping over a graph.
 * @public
 */
export interface GroupByKeyRecord {
    readonly rowPtr: Binding;
    readonly colIdx: Binding;
    /** One f32 per arc, or null (every arc weighs 1). */
    readonly weights: Binding | null;
    /** One key per node, each below `INVALID_INDEX`. */
    readonly keyIn: Binding;
    /** The plan's counts; its `words` must be what `rows` holds. */
    readonly plan: GroupRows;
    readonly rows: Binding;
    /** At least `plan.regionWords` words; word 0 must be zeroed by the caller once, and is 1 afterwards iff a probe loop exhausted its bound. */
    readonly hashRegion: Binding;
    readonly bestKey: Binding;
    readonly bestScore: Binding;
}

/**
 * A prepared group-by-key.
 * @public
 */
export interface GroupByKeyPlanner {
    /**
     * Records the (up to two) tier dispatches of one grouping into the pass.
     * @param pass - the compute pass
     * @param record - the graph, the keys, the tier plan and the outputs
     */
    record(pass: GPUComputePassEncoder, record: GroupByKeyRecord): void;
}

/**
 * Compiles the four variants (two tiers, weighted or not) so record() is synchronous.
 * @param scope - the caller's scope
 * @returns the planner
 */
export async function prepareGroupByKeyRow(scope: ReduceScope): Promise<GroupByKeyPlanner> {
    const kernels = new Map<string, Kernel>();
    for (const tier of [0, 1]) {
        for (const weighted of [false, true]) {
            const spec = kernelSpec("group-by-key-row", { TIER: tier, WEIGHTED: weighted });
            kernels.set(`${tier}/${weighted}`, await scope.pipelines.kernel(spec));
        }
    }
    return new GroupByKeyPlannerImpl(scope, kernels);
}

/**
 * The E_INVALID_ARGUMENT of a binding shorter than `words` u32.
 * @param name - the argument name
 * @param binding - the binding
 * @param words - the words it must hold
 */
function checkWords(name: string, binding: Binding, words: number): void {
    if (binding.size < 4 * words) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `groupByKeyRow: ${name} is smaller than 4 x ${words} bytes`, {
            argument: name,
            value: binding.size,
            expected: 4 * words,
        });
    }
}

/** The planner: the four variants over one scope. */
class GroupByKeyPlannerImpl implements GroupByKeyPlanner {
    private readonly scope: ReduceScope;
    private readonly kernels: ReadonlyMap<string, Kernel>;

    /**
     * Wraps the compiled variants; use prepareGroupByKeyRow().
     * @param scope - the caller's scope
     * @param kernels - the variants by `tier/weighted`
     */
    constructor(scope: ReduceScope, kernels: ReadonlyMap<string, Kernel>) {
        this.scope = scope;
        this.kernels = kernels;
    }

    /**
     * Records the tier dispatches (see the interface).
     * @param pass - the compute pass
     * @param r - the record
     */
    record(pass: GPUComputePassEncoder, r: GroupByKeyRecord): void {
        const { threadCount, hashCount } = r.plan;
        const rows = threadCount + hashCount;
        checkWords("rows", r.rows, rows + hashCount);
        checkWords("hashRegion", r.hashRegion, r.plan.regionWords);
        checkWords("rowPtr", r.rowPtr, rows + 1);
        if (rows === 0) {
            return;
        }
        const weighted = r.weights !== null;
        const tiers: readonly (readonly [0 | 1, number, number])[] = [
            [0, 0, threadCount],
            [1, threadCount, hashCount],
        ];
        for (const [tier, rowsBase, count] of tiers) {
            if (count === 0) {
                continue;
            }
            const kernel = this.kernels.get(`${tier}/${weighted}`);
            if (kernel === undefined) {
                throw new WebGpuGraphError("E_INVALID_ARGUMENT", "groupByKeyRow: no variant was prepared", {
                    argument: "tier",
                    value: tier,
                });
            }
            const params = this.scope.params(GROUP_PARAMS, {
                rowsBase,
                basesBase: threadCount + hashCount,
                count,
                pad0: 0,
            });
            const bound = kernel.bind({
                rowPtr: r.rowPtr,
                colIdx: r.colIdx,
                weights: r.weights ?? r.colIdx,
                keyIn: r.keyIn,
                rows: r.rows,
                hashRegion: r.hashRegion,
                bestKey: r.bestKey,
                bestScore: r.bestScore,
                P: params.binding,
            });
            const plan =
                tier === 0 ? plan1d(count, this.scope.workgroupSize, this.scope.caps) : plan2d(count, this.scope.caps);
            kernel.dispatch(pass, bound, plan, [params.offset]);
        }
    }
}
