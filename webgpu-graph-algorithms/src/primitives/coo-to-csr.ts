/**
 * The `cooToCsr` primitive driver (design 6 row 10; the P11 plan's PD-1): compressed sparse rows built on the device
 * from `count` arcs `(src[i], dst[i], weights[i])` over `n` nodes. It is the histogram of the sources (over `n + 1`
 * bins, so the last word is 0), their exclusive scan into `rowPtr` (so `rowPtr[n]` is the arc count) and the
 * `coo-scatter` of the targets and weights into `colIdx` and `outWeights`.
 *
 * The scatter has two modes, and they promise different things:
 * - `sortedInput: false` is design 6 row 10's cursor scatter. Each arc reserves its slot with an atomic on its row's
 *   cursor, so slots go out in race order: `rowPtr` is deterministic, but the order inside a row is not, and a row is
 *   NOT sorted by target even when the input was.
 * - `sortedInput: true` requires the arcs ordered by source and writes each at its own index minus its row's start:
 *   no cursor, no atomic, the input order survives into every row, and the output is a pure function of the input.
 *   Arcs sorted by (source, target) therefore give rows sorted by target -- which every intersection relies on. The
 *   precondition is checked on the device: an out-of-order source raises word 0 of `out.flag`, which the caller
 *   must read back and refuse, because unsorted input in this mode gives rows that are silently scrambled.
 *
 * A caller who passes unsorted arcs with `sortedInput: true`, or sorted arcs with `sortedInput: false`, and needs
 * sorted rows gets a graph whose rows are not sorted and whose triangle intersection is then silently wrong.
 *
 * A planner over a ReduceScope with a synchronous `record` (the shape of every primitive here), not the design's free
 * function: pipelines compile once in `prepareCooToCsr`, and `src/primitives/**` never imports `src/context.ts`
 * (design/decisions/2026-09-23-coo-to-csr-is-a-planner.md).
 */

import { U32_MAX } from "../constants.js";
import { WebGpuGraphError } from "../errors.js";
import { plan1d } from "../kernel/dispatch.js";
import { type Kernel } from "../kernel/kernel.js";
import { COO_PARAMS, FILL_PARAMS, kernelSpec } from "../kernels.js";
import { type Binding } from "../types/memory.js";
import { type HistogramPlanner, prepareHistogram } from "./histogram.js";
import { type ReduceScope } from "./reduce.js";
import { prepareScan, type ScanPlanner } from "./scan.js";

/**
 * The graph `record` writes.
 * @public
 */
export interface CooToCsrOutput {
    /** `n + 1` words. */
    readonly rowPtr: Binding;
    /** At least `count` words. */
    readonly colIdx: Binding;
    /** At least `count` f32, or null when the input has no weights. */
    readonly weights: Binding | null;
    /** Word 0 is zeroed, then raised to 1 by an out-of-order source under `sortedInput`; a scratch word otherwise. */
    readonly flag: Binding;
}

/**
 * One build: `count` arcs whose sources are below `n`.
 * @public
 */
export interface CooToCsrRecord {
    readonly src: Binding;
    readonly dst: Binding;
    /** One f32 per arc, or null (the output then has no weights). */
    readonly weights: Binding | null;
    readonly count: number;
    readonly n: number;
    /** The arcs are ordered by source: take the order-preserving scatter (see the file header). */
    readonly sortedInput: boolean;
    readonly out: CooToCsrOutput;
}

/**
 * A prepared `cooToCsr`.
 * @public
 */
export interface CooToCsrPlanner {
    /**
     * Records the histogram, the scan and (for count > 0) the scatter of one build into the pass.
     * @param pass - the compute pass
     * @param record - the arcs and the output
     */
    record(pass: GPUComputePassEncoder, record: CooToCsrRecord): void;
}

/**
 * Compiles the scatter's four variants, the histogram's, the scan's and `fill` so record() is synchronous. The
 * planner lives as long as the scope: its scratch comes from it.
 * @param scope - the caller's scope
 * @returns the planner
 */
export async function prepareCooToCsr(scope: ReduceScope): Promise<CooToCsrPlanner> {
    const histogram = await prepareHistogram(scope);
    const scan = await prepareScan(scope);
    const fill = await scope.pipelines.kernel(kernelSpec("fill"));
    const scatter = new Map<string, Kernel>();
    for (const sorted of [false, true]) {
        for (const weighted of [false, true]) {
            const spec = kernelSpec("coo-scatter", { SORTED_INPUT: sorted, WEIGHTED: weighted });
            scatter.set(`${sorted}/${weighted}`, await scope.pipelines.kernel(spec));
        }
    }
    return new CooToCsrPlannerImpl(scope, histogram, scan, fill, scatter);
}

/**
 * The E_INVALID_ARGUMENT of a binding shorter than `words` u32.
 * @param name - the argument name
 * @param binding - the binding
 * @param words - the words it must hold
 */
function checkWords(name: string, binding: Binding, words: number): void {
    if (binding.size < 4 * words) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `cooToCsr: ${name} is smaller than 4 x ${words} bytes`, {
            argument: name,
            value: binding.size,
            expected: 4 * words,
        });
    }
}

/**
 * The argument checks of record() (E_INVALID_ARGUMENT before anything is recorded).
 * @param r - the record
 */
function checkRecord(r: CooToCsrRecord): void {
    for (const [name, value] of [
        ["count", r.count],
        ["n", r.n],
    ] as const) {
        if (!Number.isSafeInteger(value) || value < 0 || value >= U32_MAX) {
            throw new WebGpuGraphError("E_INVALID_ARGUMENT", `cooToCsr: ${name} must be an integer in [0, 2^32 - 1)`, {
                argument: name,
                value,
            });
        }
    }
    if ((r.weights === null) !== (r.out.weights === null)) {
        throw new WebGpuGraphError(
            "E_INVALID_ARGUMENT",
            "cooToCsr: weights and out.weights must be both present or both null",
            {
                argument: "weights",
                value: r.weights === null ? "null" : "present",
                expected: r.out.weights === null ? "null" : "present",
            },
        );
    }
    checkWords("src", r.src, r.count);
    checkWords("dst", r.dst, r.count);
    checkWords("out.rowPtr", r.out.rowPtr, r.n + 1);
    checkWords("out.colIdx", r.out.colIdx, r.count);
    checkWords("out.flag", r.out.flag, 1);
    if (r.weights !== null && r.out.weights !== null) {
        checkWords("weights", r.weights, r.count);
        checkWords("out.weights", r.out.weights, r.count);
    }
}

/** The planner: the histogram and scan planners, `fill` and the four scatter variants over one scope. */
class CooToCsrPlannerImpl implements CooToCsrPlanner {
    private readonly scope: ReduceScope;
    private readonly histogram: HistogramPlanner;
    private readonly scan: ScanPlanner;
    private readonly fill: Kernel;
    private readonly scatter: ReadonlyMap<string, Kernel>;

    /**
     * Wraps the resolved planners and kernels; use prepareCooToCsr().
     * @param scope - the caller's scope
     * @param histogram - the histogram planner
     * @param scan - the scan planner
     * @param fill - the `fill` kernel
     * @param scatter - the `coo-scatter` variants by `sorted/weighted`
     */
    constructor(
        scope: ReduceScope,
        histogram: HistogramPlanner,
        scan: ScanPlanner,
        fill: Kernel,
        scatter: ReadonlyMap<string, Kernel>,
    ) {
        this.scope = scope;
        this.histogram = histogram;
        this.scan = scan;
        this.fill = fill;
        this.scatter = scatter;
    }

    /**
     * Records one build (see the interface).
     * @param pass - the compute pass
     * @param r - the arcs and the output
     */
    record(pass: GPUComputePassEncoder, r: CooToCsrRecord): void {
        checkRecord(r);
        const { scope } = this;
        const wg = scope.workgroupSize;
        const degreeBytes = 4 * (r.n + 1);
        const degrees: Binding = {
            buffer: scope.scratch(degreeBytes, "cooToCsr/degrees"),
            offset: 0,
            size: degreeBytes,
            window: null,
        };
        this.histogram.record(pass, r.src, r.count, r.n + 1, degrees);
        this.scan.record(pass, degrees, r.n + 1, r.out.rowPtr);
        let cursors = r.out.flag;
        if (r.sortedInput) {
            this.zero(pass, r.out.flag, 1);
        } else if (r.n > 0) {
            const bytes = 4 * r.n;
            cursors = { buffer: scope.scratch(bytes, "cooToCsr/cursors"), offset: 0, size: bytes, window: null };
            this.zero(pass, cursors, r.n);
        }
        if (r.count === 0) {
            return;
        }
        const weighted = r.weights !== null;
        const kernel = this.scatter.get(`${r.sortedInput}/${weighted}`);
        if (kernel === undefined) {
            throw new WebGpuGraphError("E_INVALID_ARGUMENT", "cooToCsr: no scatter variant was prepared", {
                argument: "sortedInput",
                value: r.sortedInput,
            });
        }
        // the unweighted variant never touches the weight slots: a read-only dummy and a writable scratch word
        const outWeight = r.out.weights ?? {
            buffer: scope.scratch(4, "cooToCsr/weight-dummy"),
            offset: 0,
            size: 4,
            window: null,
        };
        const params = scope.params(COO_PARAMS, { count: r.count, pad0: 0, pad1: 0, pad2: 0 });
        const bound = kernel.bind({
            src: r.src,
            dst: r.dst,
            weight: r.weights ?? r.dst,
            rowPtr: r.out.rowPtr,
            cursors,
            colIdx: r.out.colIdx,
            outWeight,
            P: params.binding,
        });
        kernel.dispatch(pass, bound, plan1d(r.count, wg, scope.caps), [params.offset]);
    }

    /**
     * Records a `fill` of `words` zeros.
     * @param pass - the compute pass
     * @param dst - the words
     * @param words - how many (>= 1)
     */
    private zero(pass: GPUComputePassEncoder, dst: Binding, words: number): void {
        const params = this.scope.params(FILL_PARAMS, { count: words, value: 0, mode: 0, pad0: 0 });
        const bound = this.fill.bind({ dst, P: params.binding });
        this.fill.dispatch(pass, bound, plan1d(words, this.scope.workgroupSize, this.scope.caps), [params.offset]);
    }
}
