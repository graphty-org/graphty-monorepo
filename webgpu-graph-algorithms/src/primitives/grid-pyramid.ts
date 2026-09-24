/**
 * The grid pyramid (spec 6 row 12, 7.7 G4-G5; P4-T9): the planner that records, into the caller's pass, the finest
 * centroids (G4, `grid-centroid`: thread per cell over `cells + 1`, the pseudo-cell included), the hub-cell
 * completion (G4a: the T1 `indirect-finalize` over `hubCounters[0]` into `hubArgs` with `wg = 1`, so the finalize's
 * `ceil(count / wg)` is ONE workgroup per hub cell; G4b: `grid-centroid-hub`, one workgroup per hub cell, dispatched
 * indirectly; PD-13, DEP-P4-I) and one `grid-downsample` dispatch per coarser
 * level (G5). Level 0 holds `[sum m x, sum m y, sum m z, sum m]` per cell; every parent is the sum of its 2^dim
 * children; the pseudo-cell (index `cells` of level 0) is never a child. No atomics touch the sums (design 6 row 12:
 * bitwise reproducible); the only atomics are the hub append and the occupancy max.
 *
 * The named grid buffers (`pyramid`, `hubList`, `hubCounters`, `hubArgs`) are the caller's (the model's
 * `BufferSpec`s, so `inspect(name)` reaches them); the static params of the finalize and of every level are written
 * ONCE at bind() through the scope's params writer (PD-11), so record() writes no uniform. `src/primitives/**` never
 * imports `src/context.ts`.
 */

import { WebGpuGraphError } from "../errors.js";
import { type DispatchPlan, plan1d } from "../kernel/dispatch.js";
import { type BoundKernel, type Kernel } from "../kernel/kernel.js";
import { GRID_LEVEL_PARAMS, INDIRECT_PARAMS, kernelSpec } from "../kernels.js";
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
    /** `cells + 2` words: the exclusive scan of the cell histogram (the T8 build). */
    readonly cellStart: Binding;
    /** `pyramidCells` vec4f: every level, level 0 first with the pseudo-cell at index `cells`. */
    readonly pyramid: Binding;
    /** The hub cells' indices, appended by G4 (at least one word; at most `floor(n / (GRID_HUB_CELL + 1))` are ever written, so `ceil(n / GRID_HUB_CELL)` words always suffice). */
    readonly hubList: Binding;
    /** Two u32 (bound whole, at least 8 bytes): `[0]` the hub count, `[1]` the largest cell occupancy; the caller zeroes both before every build (K1, T10). */
    readonly hubCounters: Binding;
    /** One 16-byte indirect args slot with the INDIRECT usage: G4a writes it, G4b dispatches from it. */
    readonly hubArgs: Binding;
}

/** Where `record()` stops: after level 0 is whole (G4, G4a and G4b) or after every coarser level (G5, the default). */
export type GridPyramidStage = "G4" | "G5";

/** A prepared pyramid build (spec 7.7 G4-G5): binds once per load, records the stages of one iteration into a pass. */
export interface GridPyramidPlanner {
    /**
     * Binds the named buffers and writes the static params of the finalize and of every level (PD-11); called once
     * per load (a second call rebinds and writes fresh params, so it belongs to a reload, never to an iteration).
     * @param bindings - the buffers
     */
    bind(bindings: GridPyramidBindings): void;
    /**
     * Records G4, G4a, G4b and then G5 for every coarser level at the `Fa2Params` slot `paramsOffset`; `upTo: "G4"`
     * stops after G4b (level 0 is whole: G4a and G4b are G4's completion).
     * @param pass - the compute pass
     * @param paramsOffset - the dynamic offset of this iteration's `Fa2Params`
     * @param upTo - the last stage to record (default "G5")
     */
    record(pass: GPUComputePassEncoder, paramsOffset: number, upTo?: GridPyramidStage): void;
    /** Dispatches the last record() issued: 3 after `upTo: "G4"`, `3 + (levels - 1)` for a full record. */
    readonly lastDispatches: number;
}

/**
 * Prepares the pyramid's pipelines over a scope (G4, the finalize, G4b and G5; compiles once) so bind() and record()
 * are synchronous. The planner lives exactly as long as the scope.
 * @param scope - the caller's scope (device, caps, cache, scratch, params)
 * @param spec - the grid
 * @returns the planner
 */
export async function preparePyramid(scope: ReduceScope, spec: GridSpec): Promise<GridPyramidPlanner> {
    const centroid = await scope.pipelines.kernel(kernelSpec("grid-centroid"));
    const finalize = await scope.pipelines.kernel(kernelSpec("indirect-finalize"));
    const hub = await scope.pipelines.kernel(kernelSpec("grid-centroid-hub"));
    const downsample = await scope.pipelines.kernel(kernelSpec("grid-downsample"));
    return new GridPyramidPlannerImpl(scope, spec, { centroid, finalize, hub, downsample });
}

/** The four kernels of the build. */
interface Kernels {
    readonly centroid: Kernel;
    readonly finalize: Kernel;
    readonly hub: Kernel;
    readonly downsample: Kernel;
}

/** What bind() prepared: the bound groups and, per coarser level, its bound group with its params offset. */
interface Bound {
    readonly hubArgs: Binding;
    readonly centroid: BoundKernel;
    readonly finalize: BoundKernel;
    readonly finalizeOffset: number;
    readonly hub: BoundKernel;
    readonly levels: readonly { readonly bound: BoundKernel; readonly offset: number; readonly parentCells: number }[];
}

/** The planner: G4, G4a, G4b and G5 over one scope. */
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
     * @param kernels - the four kernels
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
        const { centroid, finalize, hub, downsample } = this.kernels;
        const { spec, scope } = this;
        const b = bindings;
        const finalizeParams = scope.params(INDIRECT_PARAMS, {
            countIndex: 0,
            wg: 1, // the finalize plans ceil(count / wg) workgroups over ITEMS; G4b's item is a hub cell, one workgroup each
            slot: 0,
            pad0: 0,
        });
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
            hubArgs: b.hubArgs,
            centroid: centroid.bind({
                sortedIdx: b.sortedIdx,
                cellStart: b.cellStart,
                pos: b.pos,
                pyramid: b.pyramid,
                hubList: b.hubList,
                hubCounters: b.hubCounters,
                P: b.params,
            }),
            finalize: finalize.bind({ counters: b.hubCounters, args: b.hubArgs, P: finalizeParams.binding }),
            finalizeOffset: finalizeParams.offset,
            hub: hub.bind({
                sortedIdx: b.sortedIdx,
                cellStart: b.cellStart,
                pos: b.pos,
                pyramid: b.pyramid,
                hubList: b.hubList,
                hubCount: b.hubCounters,
                P: b.params,
            }),
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
        const { centroid, finalize, hub, downsample } = this.kernels;
        const one: DispatchPlan = { x: 1, y: 1, z: 1, items: 1, stride: null };
        centroid.dispatch(pass, bound.centroid, plan1d(spec.cells + 1, scope.workgroupSize, scope.caps), [paramsOffset]);
        finalize.dispatch(pass, bound.finalize, one, [bound.finalizeOffset]);
        hub.dispatchIndirect(pass, bound.hub, bound.hubArgs, 0, [paramsOffset]);
        this.dispatches = 3;
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
