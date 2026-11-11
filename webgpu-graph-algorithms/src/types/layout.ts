/**
 * The layout-facing public types (spec 3.3, 7.19): the stats records, the GPU simulation interface that extends the
 * real `@graphty/layout` LayoutSimulation (design 14.3), the run options and the GPU-only tuning knobs. Types only.
 */

import type { F32, GraphSnapshot, NodeMask } from "@graphty/graph-format";

import type { LayoutSimulation } from "./accelerator.js";

/** Spec 3.3 LayoutStatsBase, verbatim; the three grid fields are null on the exact tier (P3 always). */
export interface LayoutStatsBase {
    /** Iterations completed since `load()` or `reheat()`, as of the last completed batch. */
    readonly iteration: number;
    /** The mean distance a node moved in the last iteration, in layout units. */
    readonly meanDisplacement: number;
    /** The root-mean-square distance of the nodes from the centroid, in layout units. */
    readonly rmsRadius: number;
    /** The largest distance of a node from the centroid, in layout units. */
    readonly layoutRadius: number;
    /** The mean position of the nodes, in layout units. */
    readonly centroid: readonly [number, number, number];
    /** Which repulsion tier ran: `"exact"` (all pairs) or `"grid"`. */
    readonly repulsionTier: "exact" | "grid";
    /** The most nodes in one grid cell; null on the exact tier. */
    readonly maxCellOccupancy: number | null;
    /** How many nodes lay outside the grid; null on the exact tier. */
    readonly outsideGrid: number | null;
    /** The GPU time per iteration when `timestamp-query` was granted, else the batch's wall time divided by its iterations; null before the first batch. */
    readonly msPerIteration: number | null;
}

/**
 * One per-iteration trace record of the last completed batch (spec 3.3 ForceAtlas2Stats.trace element).
 * Exported: the element type of ForceAtlas2Stats.trace; re-exported from src/index.ts at P3-T3.
 * @public
 */
export interface ForceAtlas2TraceRecord {
    /** The speed controller's swing: how much nodes oscillated. */
    readonly swing: number;
    /** The speed controller's traction: how much nodes moved consistently. */
    readonly traction: number;
    /** The global speed the controller chose. */
    readonly speed: number;
    /** The controller's speed efficiency factor. */
    readonly speedEfficiency: number;
    /** The mean distance a node moved in this iteration. */
    readonly meanDisplacement: number;
    /** How many consecutive iterations so far have counted as settled. */
    readonly settledCount: number;
}

/** Spec 3.3 ForceAtlas2Stats, verbatim. */
export interface ForceAtlas2Stats extends LayoutStatsBase {
    /** The speed controller's swing: how much nodes oscillated. */
    readonly swing: number;
    /** The speed controller's traction: how much nodes moved consistently. */
    readonly traction: number;
    /** The global speed the controller chose. */
    readonly speed: number;
    /** The controller's speed efficiency factor. */
    readonly speedEfficiency: number;
    /** One record per iteration of the last completed batch. */
    readonly trace: ReadonlyArray<ForceAtlas2TraceRecord>;
}

/**
 * One per-iteration trace record of the last completed batch of a Fruchterman-Reingold simulation (spec 3.3
 * FruchtermanReingoldStats.trace element): K1 writes `temperature` from the iteration's uniform slot (spec 7.20).
 * @public
 */
export interface FruchtermanReingoldTraceRecord {
    /** The cooling schedule's temperature: the furthest a node may move in this iteration. */
    readonly temperature: number;
    /** The mean distance a node moved in this iteration. */
    readonly meanDisplacement: number;
    /** How many consecutive iterations so far have counted as settled. */
    readonly settledCount: number;
}

/** Spec 3.3 FruchtermanReingoldStats, verbatim: the cooling schedule's value replaces the controller fields. */
export interface FruchtermanReingoldStats extends LayoutStatsBase {
    /** The cooling schedule's temperature at the last completed iteration. */
    readonly temperature: number;
    /** One record per iteration of the last completed batch. */
    readonly trace: ReadonlyArray<FruchtermanReingoldTraceRecord>;
}

/**
 * One per-iteration trace record of the last completed batch of a spring-electrical simulation (spec 3.3
 * SpringElectricalStats.trace element): `kineticEnergy` is `0.5 * sum m |v|^2` over the free nodes after the
 * PREVIOUS iteration's integrate: K5 writes it into partials B and the NEXT iteration's K1 folds it (PD-4), so the
 * first record after load() carries 0 and record i carries the energy of iteration i - 1.
 * @public
 */
export interface SpringElectricalTraceRecord {
    /** The kinetic energy of the free nodes after the previous iteration (0 in the first record after `load()`). */
    readonly kineticEnergy: number;
    /** The mean distance a node moved in this iteration. */
    readonly meanDisplacement: number;
    /** How many consecutive iterations so far have counted as settled. */
    readonly settledCount: number;
}

/** Spec 3.3 SpringElectricalStats, verbatim; `kineticEnergy` is the last folded value, one iteration behind the last integrate (PD-4). */
export interface SpringElectricalStats extends LayoutStatsBase {
    /** The kinetic energy of the free nodes, one iteration behind the positions. */
    readonly kineticEnergy: number;
    /** One record per iteration of the last completed batch. */
    readonly trace: ReadonlyArray<SpringElectricalTraceRecord>;
}

/** Options of GpuLayoutSimulation.run (spec 3.3). */
export interface RunOptions {
    /** Stop after this many iterations of this call, even if not settled. */
    readonly maxIter?: number | undefined;
    /** Iterations per submit. Larger batches cost fewer round trips. */
    readonly batch?: number | undefined;
    /** Aborts the run between batches with `E_ABORTED`. */
    readonly signal?: AbortSignal | undefined;
}

/** Spec 3.3 GpuLayoutSimulation, verbatim (LayoutSimulation is `@graphty/layout`'s, via accelerator.ts). */
export interface GpuLayoutSimulation<Options, Stats extends LayoutStatsBase> extends LayoutSimulation {
    load(snapshot: GraphSnapshot, positions: F32): void;
    /**
     * Submits k iterations; resolves when their batch has been read back into `positions`. With `maxInFlight`
     * batches in flight the call COALESCES: nothing is queued and the OLDEST pending batch's promise is returned
     * (spec 7.19 item 3).
     * @param iterations - the number of iterations to submit (default `iterationsPerStep`)
     * @returns resolves when the batch carrying them has landed in the owner's array
     */
    step(iterations?: number): Promise<void>;
    /** True once the layout has stopped moving or reached its iteration limit. */
    readonly settled: boolean;
    setFixed(mask: NodeMask): void;
    setPosition(index: number, x: number, y: number, z: number): void;
    /** Destroys the simulation's buffers and rejects its pending steps. Release the snapshot separately. */
    dispose(): void;
    /** Batches submitted and not yet read back. */
    readonly inFlight: number;
    /** Iterations completed since `load()` or `reheat()`. */
    readonly iterationsDone: number;
    /** The statistics of the last completed batch. */
    readonly stats: Stats;
    /**
     * Waits for every submitted batch.
     * @returns resolves when every submitted batch has landed in the positions array
     */
    flush(): Promise<void>;
    /** Starts the layout moving again after it settled; only the counters are reset. */
    reheat(): void;
    /**
     * Changes options of the live simulation. A force-law change recompiles; `dim` and `maxInFlight` cannot change.
     * @param patch - the options to change
     */
    setParams(patch: Partial<Options>): void;
    /**
     * Steps until settled, `maxIter` or abort. For Node and scripts; a frame loop calls `step()` instead.
     * @param options - the iteration cap, batch size and abort signal
     * @returns the statistics of the last batch
     */
    run(options?: RunOptions): Promise<Stats>;
    /**
     * Reads one of the simulation's internal buffers back by name, for debugging.
     * @param name - the buffer's name
     * @returns a copy of the buffer's contents
     */
    inspect?(name: string): Promise<Float32Array | Uint32Array>;
    /** The drawn ring slot of the last batch that landed, or null (design/rendering/row-renderer.md 4.5). */
    readonly landedDrawn?: GPUBuffer | null;
    /** The transform the batch of `landedDrawn` drew with, or null with it. */
    readonly landedDrawnTransform?: DrawnTransform | null;
    /** Makes every batch also write the renderer's drawn positions into a ring of `slots` buffers; null stops it. */
    setDrawn?(output: DrawnOutput | null): void;
    /** The transform the next batches draw with. */
    setDrawnTransform?(transform: DrawnTransform): void;
    /** The rows the next batches leave as the owner wrote them. */
    setDrawnSkip?(mask: NodeMask): void;
    /** Writes one node's drawn row into every slot of the ring. */
    writeDrawn?(index: number, x: number, y: number, z: number, w: number): void;
}

/**
 * What {@link GpuLayoutSimulation.setDrawn} asks for: how many ring slots, and the owner's stride-4 rows (x, y, z, w
 * per node) that seed them.
 * @public
 */
export interface DrawnOutput {
    /** How many ring buffers the drawn positions rotate through. */
    readonly slots: number;
    /** The owner's stride-4 rows (x, y, z, w per node) that seed every slot. */
    readonly rows: Float32Array;
}

/**
 * The transform the drawn ring applies to scene positions: drawn = (scene - center) * scale + target, z = 0 in 2D.
 * @public
 */
export interface DrawnTransform {
    /** The scene point drawn at `target`. */
    readonly center: readonly [number, number, number];
    /** Drawn units per scene unit. */
    readonly scale: number;
    /** Where `center` is drawn. */
    readonly target: readonly [number, number, number];
}

/**
 * Spec 3.3 GpuLayoutTuning, verbatim; the grid knobs are accepted and stored in P3 but only `repulsion`,
 * `exactMaxNodes`, `deterministic` and `compat` have an effect (grid tier = P4).
 */
export interface GpuLayoutTuning {
    /** `"exact"` computes all pairs at any size, `"grid"` uses the grid tier at any size, `"auto"` picks exact up to `exactMaxNodes`. Default `"auto"`. */
    readonly repulsion?: "exact" | "grid" | "auto" | undefined;
    /** The largest graph `"auto"` runs on the exact tier. Default `EXACT_MAX_NODES` (32768); `calibrateLayout` measures one for the device. */
    readonly exactMaxNodes?: number | undefined;
    /** The grid tier's near-field neighbour cap. Default 64. */
    readonly nearMax?: number | undefined;
    /** Sum in a fixed order, so the same input gives the same layout. Default true. */
    readonly deterministic?: boolean | undefined;
    /** The largest grid side in 2D. Default 512. */
    readonly gridMax2D?: number | undefined;
    /** The largest grid side in 3D. Default 128. */
    readonly gridMax3D?: number | undefined;
    /** How far beyond the layout's spread the grid reaches. Default 6. */
    readonly extentFactor?: number | undefined;
    /** `"networkx"` reproduces NetworkX's ForceAtlas2 (gravity toward the origin); `"paper"` follows the paper. Default `"paper"`. */
    readonly compat?: "paper" | "networkx" | undefined;
}

/** The resolved tuning record (defaults from constants.ts LAYOUT_TUNING_DEFAULTS applied). */
export interface ResolvedLayoutTuning {
    readonly repulsion: "exact" | "grid" | "auto";
    readonly exactMaxNodes: number;
    readonly nearMax: number;
    readonly deterministic: boolean;
    readonly gridMax2D: number;
    readonly gridMax3D: number;
    readonly extentFactor: number;
    readonly compat: "paper" | "networkx";
}

/** Spec 2.2 CalibrateOptions, verbatim: the probe sizes of calibrateLayout (default 8k / 16k / 32k / 65k). */
export interface CalibrateOptions {
    /** The node counts to probe. Default 8k, 16k, 32k and 65k. */
    readonly sizes?: readonly number[] | undefined;
}

/**
 * Spec 2.2 GpuCalibration, verbatim: the per-size ms per iteration of both repulsion tiers on the actual device,
 * `pairsPerSecond` of the exact tier at the largest probed size, `suggestedExactMaxNodes` by the spec 7.8 rule
 * (the largest probed n with exactMs(n) <= min(4 ms, gridMs(n)), rounded down to a power of two; when NO probed size
 * qualifies -- the grid tier faster at every probe, or every probe over the budget -- the largest power of two strictly
 * below the smallest probe, so the exact tier runs at no probed size and a value below floorPow2(min(sizes)) tells the
 * caller the rule found nothing in the range: src/layouts/calibrate.ts) and the wall time of the whole call (pipeline
 * compilation included on the first call).
 */
export interface GpuCalibration {
    /** Node pairs per second of the exact tier at the largest probed size. */
    readonly pairsPerSecond: number;
    /** Milliseconds per iteration of the exact tier, by probed node count. */
    readonly exactMsPerIter: Readonly<Record<number, number>>;
    /** Milliseconds per iteration of the grid tier, by probed node count. */
    readonly gridMsPerIter: Readonly<Record<number, number>>;
    /** The `exactMaxNodes` to pass for this device: the largest probed size where the exact tier is fast enough and faster than the grid. */
    readonly suggestedExactMaxNodes: number;
    /** The wall time of the whole call, pipeline compilation included. */
    readonly firstCallMs: number;
}
