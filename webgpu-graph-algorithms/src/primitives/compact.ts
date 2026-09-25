/**
 * The `compact` and `dedupe` primitive driver (spec 6 row 4; P8-T3, the P8 plan's PD-1 / DEP-P8-A). `compact` is
 * flag, scan, scatter: the flags are the caller's (one u32 per entry, written by the kernel that produced the queue),
 * `exclusiveScan` turns them into offsets, and `compact-scatter` lands every flagged entry at its offset in queue
 * order -- order-preserving, so bitwise reproducible -- and writes the total into one word of the caller's block.
 * `dedupe` is Davidson's ownership trick in two dispatches: `dedupe-claim` stores every entry's index into
 * `owner[vertex]`, `dedupe-filter` keeps the entries that still own their vertex. Two dispatches because a plain
 * store read back in the same dispatch is a data race (WGSL 6.5.7); between dispatches the relaxed atomics make
 * last-writer-wins well defined, so exactly one index per distinct vertex survives (set-deterministic: the SET is
 * fixed, the order inside `out` follows the schedule).
 *
 * `owner` needs NO reset between calls, whatever it holds: a word is read only by an entry `i` whose vertex `v` a
 * claim of the SAME call has just written, so a stale index or garbage at `owner[v]` is overwritten before any lane
 * compares against it, and a word no current entry names is never read. The design's row implies a reset; the `fill`
 * over `n` per round is the dispatch this saves.
 *
 * The count of `compact` is host-known. `dedupe`'s callers (the SSSP piles of P8-T9) only know their entry count on
 * the device, so `countIndex` names a word of the counters block and the kernels read `min(counters[countIndex],
 * count)` -- the device word clamped to the capacity `count` -- or `count` alone when `countIndex` is `U32_MAX`. The
 * counters block is bound WHOLE and indexed, for the count word and for the output word alike, because
 * `Kernel.bind` rejects a binding whose offset is not a multiple of 256 and a four-byte word never is.
 *
 * The driver owns no device objects: the caller supplies a ReduceScope (the same record `reduce` takes) and the
 * compute pass to record into. `src/primitives/**` never imports `src/context.ts`.
 */

import { U32_MAX } from "../constants.js";
import { WebGpuGraphError } from "../errors.js";
import { plan1d } from "../kernel/dispatch.js";
import { type BoundKernel, INDIRECT_ARGS_STRIDE, type Kernel } from "../kernel/kernel.js";
import { COMPACT_PARAMS, kernelSpec } from "../kernels.js";
import { type Binding } from "../types/memory.js";
import { type ReduceScope } from "./reduce.js";
import { prepareScan, type ScanPlanner } from "./scan.js";

/** One compaction: `count` entries of `queue` whose `flags` word is non-zero go to `out` in order; the total goes to `outCount[outIndex]`. */
export interface CompactRecord {
    /** The entries (at least 4 x count bytes). */
    readonly queue: Binding;
    /** One u32 per entry, 0 or 1 (at least 4 x count bytes). */
    readonly flags: Binding;
    /** The entry count (a non-negative integer below 2^32; host-known). */
    readonly count: number;
    /** The compacted entries (at least 4 x count bytes; the words past the total are not written). */
    readonly out: Binding;
    /** The block whose word `outIndex` receives the total (bound whole). */
    readonly outCount: Binding;
    /** The word of `outCount` to write. */
    readonly outIndex: number;
}

/** One dedupe: the entries of `queue` are filtered to one per distinct vertex into `out`; the surviving count is ADDED to `outCount[outIndex]`, which the caller zeroes before the pass. */
export interface DedupeRecord {
    /** The entries, vertex indices below the owner's length (at least 4 x count bytes). */
    readonly queue: Binding;
    /** The entry count when `countIndex` is `U32_MAX`, else the capacity the device count is clamped to (a non-negative integer below 2^32). */
    readonly count: number;
    /** `U32_MAX` for a host-known count; else the word of `counters` holding the entry count on the device. */
    readonly countIndex: number;
    /** The block the count word is read from; with a device count it must be the SAME range as `outCount` (both kernels read the word through their own binding), and it is bound but never read when `countIndex` is `U32_MAX`. */
    readonly counters: Binding;
    /** The ownership words, one per vertex (the caller's promise: at least 4 x n bytes; never reset). */
    readonly owner: Binding;
    /** The surviving entries (at least 4 x count bytes; the words past the count are not written). */
    readonly out: Binding;
    /** The block whose word `outIndex` accumulates the surviving count (bound whole; zeroed by the caller before the pass). */
    readonly outCount: Binding;
    /** The word of `outCount` to add to; never equal to `countIndex`. */
    readonly outIndex: number;
}

/** A prepared compact / dedupe (spec 6 row 4): records the dispatches of one call into a pass. */
export interface CompactPlanner {
    /**
     * Records the compaction (the flags' exclusive scan, then the scatter). For count 0 nothing is recorded and
     * `outCount[outIndex]` keeps its prior value: a four-byte write at an unaligned offset is impossible, so every
     * caller zeroes its block before the pass.
     * @param pass - the compute pass
     * @param record - the buffers and the count
     */
    record(pass: GPUComputePassEncoder, record: CompactRecord): void;
    /**
     * Records the claim and the filter over `plan1d(count)`; nothing for count 0 (`outCount[outIndex]` then keeps
     * its prior value).
     * @param pass - the compute pass
     * @param record - the buffers, the count and the count word
     */
    recordDedupe(pass: GPUComputePassEncoder, record: DedupeRecord): void;
    /**
     * Records the claim and the filter as INDIRECT dispatches from two 16-byte slots of `args` (the form the SSSP
     * driver uses: the slots are written on the device by the finalize kernel, `count` is the capacity the device
     * count word is clamped to).
     * @param pass - the compute pass
     * @param record - the buffers, the capacity and the count word
     * @param args - the args buffer range (usage INDIRECT | STORAGE)
     * @param claimSlot - the 16-byte slot of the claim's (x, y, 1)
     * @param filterSlot - the 16-byte slot of the filter's (x, y, 1)
     */
    recordDedupeIndirect(
        pass: GPUComputePassEncoder,
        record: DedupeRecord,
        args: Binding,
        claimSlot: number,
        filterSlot: number,
    ): void;
    /** Dispatches the last record*() issued: compact 0 for count 0, else the scan's `2 x levels - 1` plus one (`2 x levels`); dedupe 0 for a direct count 0, else 2. */
    readonly lastDispatches: number;
}

/**
 * Prepares the three pipelines and the scan of a scope (compiles once) so record() is synchronous. The planner
 * lives exactly as long as the scope (the scan keeps a scratch word of it): never use it after the scope's dispose().
 * @param scope - the caller's scope (device, caps, cache, scratch, params)
 * @returns the planner
 */
export async function prepareCompact(scope: ReduceScope): Promise<CompactPlanner> {
    const scatter = await scope.pipelines.kernel(kernelSpec("compact-scatter"));
    const claim = await scope.pipelines.kernel(kernelSpec("dedupe-claim"));
    const filter = await scope.pipelines.kernel(kernelSpec("dedupe-filter"));
    const scan = await prepareScan(scope);
    return new CompactPlannerImpl(scope, scatter, claim, filter, scan);
}

/**
 * The E_INVALID_ARGUMENT of a bad count.
 * @param what - the primitive's name for the message
 * @param count - the count
 */
function checkCount(what: string, count: number): void {
    if (!Number.isSafeInteger(count) || count < 0 || count > U32_MAX) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `${what}: count must be a non-negative integer below 2^32`, {
            argument: "count",
            value: count,
        });
    }
}

/**
 * The E_INVALID_ARGUMENT of a binding shorter than `words` u32.
 * @param what - the primitive's name for the message
 * @param name - the argument name
 * @param binding - the binding
 * @param words - the words it must hold
 */
function checkWords(what: string, name: string, binding: Binding, words: number): void {
    if (binding.size < 4 * words) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `${what}: ${name} is smaller than 4 x ${words} bytes`, {
            argument: name,
            value: binding.size,
            expected: 4 * words,
        });
    }
}

/**
 * The E_INVALID_ARGUMENT of a word index outside a block.
 * @param what - the primitive's name for the message
 * @param name - the argument name
 * @param index - the word index
 * @param block - the block it indexes
 */
function checkWordIndex(what: string, name: string, index: number, block: Binding): void {
    if (!Number.isSafeInteger(index) || index < 0 || 4 * (index + 1) > block.size) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `${what}: ${name} ${index} is outside the block`, {
            argument: name,
            value: index,
            expected: `0 <= ${name} < ${Math.floor(block.size / 4)}`,
        });
    }
}

/**
 * The argument checks of record() (E_INVALID_ARGUMENT before anything is recorded).
 * @param r - the record
 */
function checkCompactArguments(r: CompactRecord): void {
    checkCount("compact", r.count);
    checkWords("compact", "queue", r.queue, r.count);
    checkWords("compact", "flags", r.flags, r.count);
    checkWords("compact", "out", r.out, r.count);
    checkWordIndex("compact", "outIndex", r.outIndex, r.outCount);
}

/**
 * The argument checks of recordDedupe() and recordDedupeIndirect(): the count, the two entry buffers (`out` holds at
 * most one entry per owner word, so it is checked against `min(count, owner words)`: the SSSP piles of P8-T9 dedupe
 * a raw half of `arcCount` capacity into an `n`-word pile), the output word, and -- with a device count -- a count
 * word that is inside `counters`, is not the output word (the filter's atomicAdd would corrupt the count other
 * workgroups of the same dispatch still read) and lives in the block `outCount` names (the two kernels read it
 * through their own binding).
 * @param r - the record
 */
function checkDedupeArguments(r: DedupeRecord): void {
    checkCount("dedupe", r.count);
    checkWords("dedupe", "queue", r.queue, r.count);
    checkWords("dedupe", "out", r.out, Math.min(r.count, Math.floor(r.owner.size / 4)));
    checkWordIndex("dedupe", "outIndex", r.outIndex, r.outCount);
    if (r.countIndex === U32_MAX) {
        return;
    }
    checkWordIndex("dedupe", "countIndex", r.countIndex, r.counters);
    if (r.countIndex === r.outIndex) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", "dedupe: countIndex must not be the output word outIndex", {
            argument: "countIndex",
            value: r.countIndex,
        });
    }
    if (r.counters.buffer !== r.outCount.buffer || r.counters.offset !== r.outCount.offset || r.counters.size !== r.outCount.size) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", "dedupe: counters must be the same range as outCount when countIndex names a device word", {
            argument: "counters",
            value: r.counters.size,
            expected: r.outCount.size,
        });
    }
}

/**
 * The E_INVALID_ARGUMENT of a 16-byte slot outside an args binding (checked before either dispatch is recorded).
 * @param name - the argument name
 * @param slot - the slot index
 * @param args - the args binding
 */
function checkSlot(name: string, slot: number, args: Binding): void {
    if (!Number.isInteger(slot) || slot < 0 || (slot + 1) * INDIRECT_ARGS_STRIDE > args.size) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `dedupe: args ${name} ${slot} is outside the binding`, {
            argument: name,
            value: slot,
            expected: `0 <= ${name} < ${Math.floor(args.size / INDIRECT_ARGS_STRIDE)}`,
        });
    }
}

/** The two bound dedupe kernels and the dynamic offset of the one params record they share. */
interface BoundDedupe {
    readonly claim: BoundKernel;
    readonly filter: BoundKernel;
    readonly offset: number;
}

/** The planner: the three resolved kernels and the scan over one scope. */
class CompactPlannerImpl implements CompactPlanner {
    private readonly scope: ReduceScope;
    private readonly scatter: Kernel;
    private readonly claim: Kernel;
    private readonly filter: Kernel;
    private readonly scan: ScanPlanner;
    private dispatches = 0;

    /**
     * Wraps the resolved kernels; use prepareCompact().
     * @param scope - the caller's scope
     * @param scatter - the `compact-scatter` kernel
     * @param claim - the `dedupe-claim` kernel
     * @param filter - the `dedupe-filter` kernel
     * @param scan - the scan planner of the same scope
     */
    constructor(scope: ReduceScope, scatter: Kernel, claim: Kernel, filter: Kernel, scan: ScanPlanner) {
        this.scope = scope;
        this.scatter = scatter;
        this.claim = claim;
        this.filter = filter;
        this.scan = scan;
    }

    /**
     * Dispatches the last record*() issued.
     * @returns the count
     */
    get lastDispatches(): number {
        return this.dispatches;
    }

    /**
     * Records the scan and the scatter (see the interface).
     * @param pass - the compute pass
     * @param r - the record
     */
    record(pass: GPUComputePassEncoder, r: CompactRecord): void {
        checkCompactArguments(r);
        if (r.count === 0) {
            this.dispatches = 0;
            return;
        }
        const size = 4 * r.count;
        const offsets: Binding = { buffer: this.scope.scratch(size, "compact/offsets"), offset: 0, size, window: null };
        this.scan.record(pass, r.flags, r.count, offsets);
        const params = this.scope.params(COMPACT_PARAMS, {
            count: r.count,
            outIndex: r.outIndex,
            countIndex: U32_MAX,
            pad0: 0,
        });
        const bound = this.scatter.bind({
            queue: r.queue,
            flags: r.flags,
            offsets,
            out: r.out,
            outCount: r.outCount,
            P: params.binding,
        });
        this.scatter.dispatch(pass, bound, plan1d(r.count, this.scope.workgroupSize, this.scope.caps), [params.offset]);
        this.dispatches = this.scan.lastDispatches + 1;
    }

    /**
     * Records the claim and the filter over plan1d(count) (see the interface).
     * @param pass - the compute pass
     * @param r - the record
     */
    recordDedupe(pass: GPUComputePassEncoder, r: DedupeRecord): void {
        checkDedupeArguments(r);
        if (r.count === 0) {
            this.dispatches = 0;
            return;
        }
        const plan = plan1d(r.count, this.scope.workgroupSize, this.scope.caps);
        const bound = this.bindDedupe(r);
        this.claim.dispatch(pass, bound.claim, plan, [bound.offset]);
        this.filter.dispatch(pass, bound.filter, plan, [bound.offset]);
        this.dispatches = 2;
    }

    /**
     * Records the claim and the filter as indirect dispatches (see the interface).
     * @param pass - the compute pass
     * @param r - the record
     * @param args - the args buffer range
     * @param claimSlot - the claim's slot
     * @param filterSlot - the filter's slot
     */
    recordDedupeIndirect(
        pass: GPUComputePassEncoder,
        r: DedupeRecord,
        args: Binding,
        claimSlot: number,
        filterSlot: number,
    ): void {
        checkDedupeArguments(r);
        checkSlot("claimSlot", claimSlot, args);
        checkSlot("filterSlot", filterSlot, args);
        const bound = this.bindDedupe(r);
        this.claim.dispatchIndirect(pass, bound.claim, args, claimSlot, [bound.offset]);
        this.filter.dispatchIndirect(pass, bound.filter, args, filterSlot, [bound.offset]);
        this.dispatches = 2;
    }

    /**
     * One params record (both kernels read the same values) and the two bind groups.
     * @param r - the record
     * @returns the bound kernels and the record's dynamic offset
     */
    private bindDedupe(r: DedupeRecord): BoundDedupe {
        const params = this.scope.params(COMPACT_PARAMS, {
            count: r.count,
            outIndex: r.outIndex,
            countIndex: r.countIndex,
            pad0: 0,
        });
        return {
            claim: this.claim.bind({ queue: r.queue, owner: r.owner, counters: r.counters, P: params.binding }),
            filter: this.filter.bind({
                queue: r.queue,
                owner: r.owner,
                out: r.out,
                outCount: r.outCount,
                P: params.binding,
            }),
            offset: params.offset,
        };
    }
}
