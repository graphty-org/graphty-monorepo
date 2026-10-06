/**
 * The grid pyramid (spec 6 row 12, 7.7 G4-G5; P4-T9): the planner that records, into the caller's pass, the finest
 * centroids (G4, `grid-centroid`: thread per cell over `cells + outsideCells`, the pseudo-cells included), the hub-cell
 * completion (G4b: `grid-centroid-hub`, one workgroup per hub cell; PD-13) and one `grid-downsample` dispatch per
 * coarser level (G5). G4b is a DIRECT dispatch of one workgroup per word of `hubList` -- the most hub cells the graph
 * can hold -- and the kernel's `h < hubCount[0]` guard idles the workgroups past the count. It was an indirect
 * dispatch from a finalize-written args slot until issue #732: Dawn validates every indirect dispatch with a hidden
 * pass that cost 0.3 to 0.9 ms of device time per iteration, several times the whole grid tier's own work at 10k
 * nodes (the frontier kernels' lesson, docs/decisions/G8.md G8-F5). The idle workgroups cost far less: `hubList` holds
 * `ceil(n / GRID_HUB_CELL)` words, so 977 workgroups at 1M nodes, each reading one word. Level 0 holds `[sum m x, sum m y, sum m z, sum m]` per cell; every parent is the sum of its 2^dim
 * children; the pseudo-cells (indices `cells ..` of level 0) are never children. No atomics touch the sums (design 6 row 12:
 * bitwise reproducible); the only atomics are the hub append and the occupancy max.
 *
 * The named grid buffers (`pyramid`, `hubList`, `hubCounters`) are the caller's (the model's
 * `BufferSpec`s, so `inspect(name)` reaches them); the static params of every level are written
 * ONCE at bind() through the scope's params writer (PD-11), so record() writes no uniform. `src/primitives/**` never
 * imports `src/context.ts`.
 */

import { WebGpuGraphError } from "../errors.js";
import { plan1d, plan2d } from "../kernel/dispatch.js";
import { type BoundKernel, type Kernel } from "../kernel/kernel.js";
import { GRID_LEVEL_PARAMS, kernelSpec } from "../kernels.js";
import { type Binding } from "../types/memory.js";
import { type GridSpec } from "./grid.js";
import { type ReduceScope } from "./reduce.js";

/**
 * The buffers the pyramid build reads and writes (the model's named buffers). The parameter type of
 * GridPyramidPlanner.bind (knip: exported for the signature, not imported by name).
 * @public
 */
export interface GridPyramidBindings {
    /** `array<vec4f>` positions (xyz, mass). */
    readonly pos: Binding;
    /** The `Fa2Params` uniform ring (`dim`, `gridMax`); `record()` takes the iteration's dynamic offset. */
    readonly params: Binding;
    /** `n` words: the sorted node indices (the T8 build). */
    readonly sortedIdx: Binding;
    /** `histWords` (`cells + 2^dim + 1`) words: the exclusive scan of the cell histogram (the T8 build). */
    readonly cellStart: Binding;
    /** `pyramidCells` vec4f: every level, level 0 first with the 2^dim orthant pseudo-cells from index `cells`. */
    readonly pyramid: Binding;
    /** The hub cells' indices, appended by G4 (at least one word; at most `floor(n / (GRID_HUB_CELL + 1))` are ever written, so `ceil(n / GRID_HUB_CELL)` words always suffice). Its word count is G4b's workgroup count. */
    readonly hubList: Binding;
    /** Two u32 (bound whole, at least 8 bytes): `[0]` the hub count, `[1]` the largest cell occupancy; the caller zeroes both before every build (K1, T10). */
    readonly hubCounters: Binding;
}

/** Where `record()` stops: after level 0 is whole (G4 and G4b) or after every coarser level (G5, the default). */
export type GridPyramidStage = "G4" | "G5";

/** A prepared pyramid build (spec 7.7 G4-G5): binds once per load, records the stages of one iteration into a pass. */
export interface GridPyramidPlanner {
    /**
     * Binds the named buffers and writes the static params of every level (PD-11); called once
     * per load (a second call rebinds and writes fresh params, so it belongs to a reload, never to an iteration).
     * @param bindings - the buffers
     */
    bind(bindings: GridPyramidBindings): void;
    /**
     * Records G4, G4b and then G5 for every coarser level at the `Fa2Params` slot `paramsOffset`; `upTo: "G4"`
     * stops after G4b (level 0 is whole: G4b is G4's completion).
     * @param pass - the compute pass
     * @param paramsOffset - the dynamic offset of this iteration's `Fa2Params`
     * @param upTo - the last stage to record (default "G5")
     */
    record(pass: GPUComputePassEncoder, paramsOffset: number, upTo?: GridPyramidStage): void;
    /** Dispatches the last record() issued: 2 after `upTo: "G4"`, `2 + (levels - 1)` for a full record. */
    readonly lastDispatches: number;
}

/**
 * Prepares the pyramid's pipelines over a scope (G4, G4b and G5; compiles once) so bind() and record()
 * are synchronous. The planner lives exactly as long as the scope.
 * @param scope - the caller's scope (device, caps, cache, scratch, params)
 * @param spec - the grid
 * @returns the planner
 */
export async function preparePyramid(scope: ReduceScope, spec: GridSpec): Promise<GridPyramidPlanner> {
    const centroid = await scope.pipelines.kernel(kernelSpec("grid-centroid"));
    const hub = await scope.pipelines.kernel(kernelSpec("grid-centroid-hub"));
    const downsample = await scope.pipelines.kernel(kernelSpec("grid-downsample"));
    return new GridPyramidPlannerImpl(scope, spec, { centroid, hub, downsample });
}

/** The three kernels of the build. */
interface Kernels {
    readonly centroid: Kernel;
    readonly hub: Kernel;
    readonly downsample: Kernel;
}

/** What bind() prepared: the bound groups and, per coarser level, its bound group with its params offset. */
interface Bound {
    readonly centroid: BoundKernel;
    readonly hub: BoundKernel;
    /** G4b's workgroups: one per word of `hubList`. */
    readonly hubSlots: number;
    readonly levels: readonly { readonly bound: BoundKernel; readonly offset: number; readonly parentCells: number }[];
}

/** The planner: G4, G4b and G5 over one scope. */
class GridPyramidPlannerImpl implements GridPyramidPlanner {
    private readonly scope: ReduceScope;
    private readonly spec: GridSpec;
    private readonly kernels: Kernels;
    private bound: Bound | null = null;
    private dispatches = 0;

    /**
     * Wraps the resolved kernels; use preparePyramid().
     * @param scope - the caller's scope
     * @param spec - the grid
     * @param kernels - the three kernels
     */
    constructor(scope: ReduceScope, spec: GridSpec, kernels: Kernels) {
        this.scope = scope;
        this.spec = spec;
        this.kernels = kernels;
    }

    /**
     * Dispatches the last record() issued.
     * @returns the count
     */
    get lastDispatches(): number {
        return this.dispatches;
    }

    /**
     * Binds the buffers and writes the static params (see the interface).
     * @param bindings - the buffers
     */
    bind(bindings: GridPyramidBindings): void {
        const { centroid, hub, downsample } = this.kernels;
        const { spec, scope } = this;
        const b = bindings;
        const levels: { readonly bound: BoundKernel; readonly offset: number; readonly parentCells: number }[] = [];
        let parentSide = spec.g;
        for (let level = 0; level + 1 < spec.levels; level++) {
            parentSide /= 2;
            const parentCells = parentSide ** spec.dim;
            const params = scope.params(GRID_LEVEL_PARAMS, {
                childBase: spec.levelOffsets[level],
                parentBase: spec.levelOffsets[level + 1],
                parentSide,
                parentCells,
                depth: spec.dim === 3 ? 2 : 1,
                pad0: 0,
                pad1: 0,
                pad2: 0,
            });
            levels.push({
                bound: downsample.bind({ pyramid: b.pyramid, P: params.binding }),
                offset: params.offset,
                parentCells,
            });
        }
        this.bound = {
            centroid: centroid.bind({
                sortedIdx: b.sortedIdx,
                cellStart: b.cellStart,
                pos: b.pos,
                pyramid: b.pyramid,
                hubList: b.hubList,
                hubCounters: b.hubCounters,
                P: b.params,
            }),
            hub: hub.bind({
                sortedIdx: b.sortedIdx,
                cellStart: b.cellStart,
                pos: b.pos,
                pyramid: b.pyramid,
                hubList: b.hubList,
                hubCount: b.hubCounters,
                P: b.params,
            }),
            hubSlots: Math.floor(b.hubList.size / 4),
            levels,
        };
    }

    /**
     * Records the stages (see the interface).
     * @param pass - the compute pass
     * @param paramsOffset - the `Fa2Params` dynamic offset
     * @param upTo - the last stage
     */
    record(pass: GPUComputePassEncoder, paramsOffset: number, upTo?: GridPyramidStage): void {
        const { bound, scope, spec } = this;
        if (bound === null) {
            throw new WebGpuGraphError("E_NOT_LOADED", "gridPyramid: record() before bind()", { argument: "bind" });
        }
        const { centroid, hub, downsample } = this.kernels;
        const level0 = spec.cells + spec.outsideCells;
        centroid.dispatch(pass, bound.centroid, plan1d(level0, scope.workgroupSize, scope.caps), [paramsOffset]);
        hub.dispatch(pass, bound.hub, plan2d(bound.hubSlots, scope.caps), [paramsOffset]);
        this.dispatches = 2;
        if ((upTo ?? "G5") === "G4") {
            return;
        }
        for (const level of bound.levels) {
            downsample.dispatch(pass, level.bound, plan1d(level.parentCells, scope.workgroupSize, scope.caps), [
                level.offset,
            ]);
            this.dispatches += 1;
        }
    }
}
