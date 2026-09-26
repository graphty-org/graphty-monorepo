/**
 * The grid build (spec 6 row 12, 7.7 G1-G3; P4-T8): `GridSpec` on the host (PD-9) and the planner that records, into
 * the caller's pass, the cell keys (G1, `grid-cell-key`), the stable sort by key (G2: `radixSort` at GRID_SORT_BITS,
 * or `countingSortByKey` when the caller asks for the set-deterministic path) and the per-cell histogram with its
 * exclusive scan (G3: the `histogram` kernel over `cellKey` and the `scan` of it; DEP-P4-I names no grid-specific
 * id). `cellHist` and `cellStart` hold `histWords = cells + 2^dim + 1` words: every real cell, the 2^dim outside
 * pseudo-cells (one per orthant about the grid centre, issue #90) from index `cells`, and one more so
 * `cellStart[histWords - 1] === n` closes the last range. Every zeroing is a `fill` dispatch inside the
 * pass (PD-12), never an encoder clear.
 *
 * The named grid buffers (`cellKey`, `cellVal`, `sortedKey`, `sortedIdx`, `cellHist`, `cellStart`) are the caller's
 * (the model's `BufferSpec`s, so `inspect(name)` reaches them); the anonymous scratch of the sort (the digit-major
 * table and its scan, the counting-sort cursor) is taken from the scope ONCE at bind() so the sub-kernels bind the
 * same buffers every iteration and `Kernel.bind`'s identity cache holds (PD-11). `src/primitives/**` never imports
 * `src/context.ts`.
 */

import { GRID_COARSEST_SIDE, GRID_MIN_SIDE, GRID_SORT_BITS } from "../constants.js";
import { WebGpuGraphError } from "../errors.js";
import { plan1d } from "../kernel/dispatch.js";
import { type Kernel } from "../kernel/kernel.js";
import { kernelSpec } from "../kernels.js";
import { type ResolvedLayoutTuning } from "../types/layout.js";
import { type Binding } from "../types/memory.js";
import {
    type CountingSortPlanner,
    type HistogramPlanner,
    prepareCountingSort,
    prepareHistogram,
} from "./histogram.js";
import { prepareRadixSort, radixHistBytes, type RadixSortPlanner } from "./radix-sort.js";
import { type ReduceScope } from "./reduce.js";
import { prepareScan, type ScanPlanner } from "./scan.js";

/** The grid's geometry (spec 7.7 geometry table; PD-9), computed on the host once per load. */
export interface GridSpec {
    /** 2 or 3. */
    readonly dim: 2 | 3;
    /** The finest side `G` per axis: a power of two in [GRID_MIN_SIDE, floorPow2(gridMax)]. */
    readonly g: number;
    /** `log2(G / GRID_COARSEST_SIDE) + 1`. */
    readonly levels: number;
    /** `G^dim` finest cells; the outside pseudo-cells are indices `cells .. cells + outsideCells - 1`. */
    readonly cells: number;
    /** `2^dim`: one outside pseudo-cell per orthant about the grid centre (issue #90). */
    readonly outsideCells: number;
    /** `cells + outsideCells + 1`: the length of `cellHist` / `cellStart`. */
    readonly histWords: number;
    /** The first cell of every level inside the pyramid: `levelOffsets[0] = 0`, level 0 holds `cells + outsideCells` (the pseudo-cells last), level L `(G / 2^L)^dim`. */
    readonly levelOffsets: readonly number[];
    /** Every level's cells together: `levelOffsets[levels - 1] + GRID_COARSEST_SIDE^dim`. */
    readonly pyramidCells: number;
    /** Whether G2 is the stable radix sort (true) or the set-deterministic counting sort (false). */
    readonly deterministic: boolean;
}

/**
 * The smallest power of two >= x (by doubling; 1 for x <= 1).
 * @param x - a non-negative number
 * @returns the power of two
 */
function nextPow2(x: number): number {
    let p = 1;
    while (p < x) {
        p *= 2;
    }
    return p;
}

/**
 * The largest power of two <= x (by doubling; 1 for x < 2).
 * @param x - a number >= 1
 * @returns the power of two
 */
function floorPow2(x: number): number {
    let p = 1;
    while (p * 2 <= x) {
        p *= 2;
    }
    return p;
}

/**
 * The grid of `n` nodes in `dim` dimensions under the tuning (spec 7.7 geometry table; PD-9): `G = clamp(nextPow2(2 *
 * ceil(n^(1 / dim))), GRID_MIN_SIDE, floorPow2(gridMax))` where `gridMax` is `gridMax2D` or `gridMax3D`, rounded DOWN
 * to a power of two so every level's side is an integer (512 and 128 stay; 100 becomes 64); `levels = log2(G /
 * GRID_COARSEST_SIDE) + 1`. At the caps: 349,524 pyramid cells in 2D, 2,396,744 in 3D (the design's counts plus the
 * 2^dim pseudo-cells).
 * @param n - the node count (>= 0)
 * @param dim - 2 or 3
 * @param tuning - the resolved layout tuning (`gridMax2D`, `gridMax3D`, `deterministic`)
 * @returns the spec
 */
export function gridSpecFor(
    n: number,
    dim: 2 | 3,
    tuning: Pick<ResolvedLayoutTuning, "gridMax2D" | "gridMax3D" | "deterministic">,
): GridSpec {
    const gridMax = dim === 3 ? tuning.gridMax3D : tuning.gridMax2D;
    const side = dim === 3 ? Math.cbrt(n) : Math.sqrt(n);
    const cap = Math.max(GRID_MIN_SIDE, floorPow2(Math.max(1, gridMax)));
    const g = Math.min(cap, Math.max(GRID_MIN_SIDE, nextPow2(2 * Math.ceil(side))));
    let levels = 1;
    for (let s = g; s > GRID_COARSEST_SIDE; s /= 2) {
        levels++;
    }
    const cells = g ** dim;
    const outsideCells = 2 ** dim;
    const levelOffsets: number[] = [0];
    let s = g;
    for (let level = 0; level + 1 < levels; level++) {
        levelOffsets.push(levelOffsets[level] + s ** dim + (level === 0 ? outsideCells : 0));
        s /= 2;
    }
    return {
        dim,
        g,
        levels,
        cells,
        outsideCells,
        histWords: cells + outsideCells + 1,
        levelOffsets: Object.freeze(levelOffsets),
        pyramidCells: levelOffsets[levels - 1] + GRID_COARSEST_SIDE ** dim,
        deterministic: tuning.deterministic,
    };
}

/**
 * The bytes of the pyramid (spec 7.7: 16 B per cell, every level, the pseudo-cells included): 38,347,904 at the 3D cap.
 * @param spec - the grid
 * @returns the byte length
 */
export function gridPyramidBytes(spec: GridSpec): number {
    return 16 * spec.pyramidCells;
}

/**
 * The buffers the build reads and writes (the model's named buffers; `state` and `params` are the blocks G1 reads).
 * The parameter type of GridBuildPlanner.bind (knip: exported for the signature, not imported by name).
 * @public
 */
export interface GridBuildBindings {
    /** `array<vec4f>` positions (xyz, mass). */
    readonly pos: Binding;
    /** The `Fa2State` block (`gridMin`, `invCellSize`), read-only here. */
    readonly state: Binding;
    /** The `Fa2Params` uniform ring (`n`, `dim`, `gridMax`); `record()` takes the iteration's dynamic offset. */
    readonly params: Binding;
    /**
     * `n` words: G1's keys, node-indexed until G2. On the deterministic path the radix sort ping-pongs through this
     * pair (PD-5: three passes, the even one writes the input pair), so after G2 `cellKey` / `cellVal` hold the
     * sort's last even-pass intermediate -- a permutation of the keys, which is why the histogram recorded after it
     * counts the same multiset; the node-indexed keys of an iteration are read through `upTo: "G1"`. The counting
     * path never writes them.
     */
    readonly cellKey: Binding;
    /** `n` words: G1's values (`i`); the sort's working pair with `cellKey`. */
    readonly cellVal: Binding;
    /** `n` words: the sorted keys (the radix path's result pair; unused by the counting path). */
    readonly sortedKey: Binding;
    /** `n` words: the sorted node indices. */
    readonly sortedIdx: Binding;
    /** `histWords` (`cells + 2^dim + 1`) words: the per-cell counts. */
    readonly cellHist: Binding;
    /** `histWords` (`cells + 2^dim + 1`) words: the exclusive scan of `cellHist`. */
    readonly cellStart: Binding;
}

/** Where `record()` stops: after the keys (G1), after the sort (G2) or after the histogram and its scan (G3, the default). */
export type GridBuildStage = "G1" | "G2" | "G3";

/** A prepared grid build (spec 7.7 G1-G3): binds once per load, records the stages of one iteration into a pass. */
export interface GridBuildPlanner {
    /**
     * Binds the named buffers and takes the sort's scratch from the scope, sized by `cellKey` (its word count is the
     * node capacity; PD-11); called once per load (a second call rebinds and takes fresh scratch, so it belongs to a
     * reload, never to an iteration).
     * @param bindings - the buffers
     */
    bind(bindings: GridBuildBindings): void;
    /**
     * Records G1, G2 and G3 for `n` nodes at the `Fa2Params` slot `paramsOffset`; `upTo` stops after the named
     * stage (the counting path has no separate G2 stop: its sort and histogram are one sequence, so "G2" runs it all).
     * @param pass - the compute pass
     * @param n - the node count (in [1, the capacity]; the caller never records a grid iteration for an empty graph)
     * @param paramsOffset - the dynamic offset of this iteration's `Fa2Params`
     * @param upTo - the last stage to record (default "G3")
     */
    record(pass: GPUComputePassEncoder, n: number, paramsOffset: number, upTo?: GridBuildStage): void;
    /** Dispatches the last record() issued. */
    readonly lastDispatches: number;
}

/** The G2 / G3 planners: the stable radix path (PD-5) or the set-deterministic counting path. */
type SortPath =
    | {
          readonly kind: "radix";
          readonly radix: RadixSortPlanner;
          readonly histogram: HistogramPlanner;
          readonly scan: ScanPlanner;
      }
    | { readonly kind: "counting"; readonly counting: CountingSortPlanner };

/**
 * Prepares the grid build's pipelines over a scope (G1 and the sort / histogram / scan planners it composes; compiles
 * once) so bind() and record() are synchronous. The planner lives exactly as long as the scope.
 * @param scope - the caller's scope (device, caps, cache, scratch, params)
 * @param spec - the grid
 * @returns the planner
 */
export async function prepareGridBuild(scope: ReduceScope, spec: GridSpec): Promise<GridBuildPlanner> {
    const cellKey = await scope.pipelines.kernel(kernelSpec("grid-cell-key"));
    const path: SortPath = spec.deterministic
        ? {
              kind: "radix",
              radix: await prepareRadixSort(scope),
              histogram: await prepareHistogram(scope),
              scan: await prepareScan(scope),
          }
        : { kind: "counting", counting: await prepareCountingSort(scope) };
    return new GridBuildPlannerImpl(scope, spec, cellKey, path);
}

/** What bind() prepared: the buffers, the node capacity and the sort's scratch (the radix table and its scan, or the counting-sort cursor and an unused twin). */
interface Bound {
    readonly bindings: GridBuildBindings;
    readonly capacity: number;
    readonly scratchA: Binding;
    readonly scratchB: Binding;
}

/** The planner: G1 and the composed sort / histogram / scan over one scope. */
class GridBuildPlannerImpl implements GridBuildPlanner {
    private readonly scope: ReduceScope;
    private readonly spec: GridSpec;
    private readonly cellKey: Kernel;
    private readonly path: SortPath;
    private bound: Bound | null = null;
    private dispatches = 0;

    /**
     * Wraps the resolved kernel and planners; use prepareGridBuild().
     * @param scope - the caller's scope
     * @param spec - the grid
     * @param cellKey - the `grid-cell-key` kernel
     * @param path - the sort path
     */
    constructor(scope: ReduceScope, spec: GridSpec, cellKey: Kernel, path: SortPath) {
        this.scope = scope;
        this.spec = spec;
        this.cellKey = cellKey;
        this.path = path;
    }

    /**
     * Dispatches the last record() issued.
     * @returns the count
     */
    get lastDispatches(): number {
        return this.dispatches;
    }

    /**
     * Binds the buffers and takes the sort's scratch (see the interface).
     * @param bindings - the buffers
     */
    bind(bindings: GridBuildBindings): void {
        const capacity = Math.floor(bindings.cellKey.size / 4);
        if (capacity < 1) {
            throw new WebGpuGraphError("E_INVALID_ARGUMENT", "gridBuild: cellKey must hold at least one word", {
                argument: "cellKey",
                value: bindings.cellKey.size,
                expected: 4,
            });
        }
        const words =
            this.path.kind === "radix" ? radixHistBytes(capacity, this.scope.workgroupSize) / 4 : this.spec.histWords;
        this.bound = {
            bindings,
            capacity,
            scratchA: this.scratch(words, "grid/sort-scratch-a"),
            scratchB: this.scratch(words, "grid/sort-scratch-b"),
        };
    }

    /**
     * Records the stages (see the interface).
     * @param pass - the compute pass
     * @param n - the node count
     * @param paramsOffset - the `Fa2Params` dynamic offset
     * @param upTo - the last stage
     */
    record(pass: GPUComputePassEncoder, n: number, paramsOffset: number, upTo?: GridBuildStage): void {
        const { bound } = this;
        if (bound === null) {
            throw new WebGpuGraphError("E_NOT_LOADED", "gridBuild: record() before bind()", { argument: "bind" });
        }
        if (!Number.isSafeInteger(n) || n < 1 || n > bound.capacity) {
            throw new WebGpuGraphError("E_INVALID_ARGUMENT", "gridBuild: n must be an integer in [1, the capacity]", {
                argument: "n",
                value: n,
                expected: bound.capacity,
            });
        }
        const stop = upTo ?? "G3";
        const b = bound.bindings;
        const keyBound = this.cellKey.bind({
            pos: b.pos,
            S: b.state,
            cellKey: b.cellKey,
            cellVal: b.cellVal,
            P: b.params,
        });
        this.cellKey.dispatch(pass, keyBound, plan1d(n, this.scope.workgroupSize, this.scope.caps), [paramsOffset]);
        this.dispatches = 1;
        if (stop === "G1") {
            return;
        }
        const { histWords: bins } = this.spec;
        if (this.path.kind === "counting") {
            const { counting } = this.path;
            const scratch = { hist: b.cellHist, cursor: bound.scratchA };
            counting.record(pass, b.cellKey, n, bins, scratch, b.sortedIdx, b.cellStart);
            this.dispatches += counting.lastDispatches;
            return;
        }
        const { radix, histogram, scan } = this.path;
        radix.record(pass, b.cellKey, b.cellVal, n, GRID_SORT_BITS, {
            keys: b.sortedKey,
            vals: b.sortedIdx,
            hist: bound.scratchA,
            offsets: bound.scratchB,
        });
        this.dispatches += radix.lastDispatches;
        if (stop === "G2") {
            return;
        }
        histogram.record(pass, b.cellKey, n, bins, b.cellHist);
        scan.record(pass, b.cellHist, bins, b.cellStart);
        this.dispatches += histogram.lastDispatches + scan.lastDispatches;
    }

    /**
     * A scratch of `words` u32 from the scope, bound whole.
     * @param words - the word count (>= 1)
     * @param label - the scratch label
     * @returns the binding
     */
    private scratch(words: number, label: string): Binding {
        const size = 4 * Math.max(1, words);
        const buffer = this.scope.scratch(size, label);
        return { buffer, offset: 0, size, window: null };
    }
}
