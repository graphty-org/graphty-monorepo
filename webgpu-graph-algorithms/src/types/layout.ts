/**
 * The layout-facing public types: the stats records, the GPU simulation interface that extends the
 * real `@graphty/layout` LayoutSimulation, the run options and the GPU-only tuning knobs. Types only.
 */

import type { F32, GraphSnapshot, NodeMask } from "@graphty/graph-format";

import type { LayoutSimulation } from "./accelerator.js";

/** The stats every GPU layout reports after a batch; the grid fields are null on the exact tier. */
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
 * One per-iteration trace record of the last completed batch of a ForceAtlas2 simulation: the element
 * type of ForceAtlas2Stats.trace.
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

/** The stats of a ForceAtlas2 simulation. */
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
 * One per-iteration trace record of the last completed batch of a Fruchterman-Reingold simulation (the
 * element type of FruchtermanReingoldStats.trace): K1 writes `temperature` from the iteration's uniform slot.
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

/** The stats of a Fruchterman-Reingold simulation: the cooling schedule's value replaces the controller fields. */
export interface FruchtermanReingoldStats extends LayoutStatsBase {
    /** The cooling schedule's temperature at the last completed iteration. */
    readonly temperature: number;
    /** One record per iteration of the last completed batch. */
    readonly trace: ReadonlyArray<FruchtermanReingoldTraceRecord>;
}

/**
 * One per-iteration trace record of the last completed batch of a spring-electrical simulation (the element
 * type of SpringElectricalStats.trace): `kineticEnergy` is `0.5 * sum m |v|^2` over the free nodes after the
 * PREVIOUS iteration's integrate: K5 writes it into partials B and the NEXT iteration's K1 folds it, so the
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

/** The stats of a spring-electrical simulation; `kineticEnergy` is the last folded value, one iteration behind the last integrate. */
export interface SpringElectricalStats extends LayoutStatsBase {
    /** The kinetic energy of the free nodes, one iteration behind the positions. */
    readonly kineticEnergy: number;
    /** One record per iteration of the last completed batch. */
    readonly trace: ReadonlyArray<SpringElectricalTraceRecord>;
}

/** Options of GpuLayoutSimulation.run. */
export interface RunOptions {
    /** Stop after this many iterations of this call, even if not settled. */
    readonly maxIter?: number | undefined;
    /** Iterations per submit. Larger batches cost fewer round trips. */
    readonly batch?: number | undefined;
    /** Aborts the run between batches with `E_ABORTED`. */
    readonly signal?: AbortSignal | undefined;
}

/** A layout simulation running on the GPU: `@graphty/layout`'s LayoutSimulation plus GPU batching and stats. */
export interface GpuLayoutSimulation<Options, Stats extends LayoutStatsBase> extends LayoutSimulation {
    load(snapshot: GraphSnapshot, positions: F32): void;
    /**
     * Submits k iterations; resolves when their batch has been read back into `positions`. With `maxInFlight`
     * batches in flight the call COALESCES: nothing is queued and the OLDEST pending batch's promise is returned.
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
    /**
     * The rows of `landedDrawn` read back to the host (stride 4), when `setDrawn` asked for `readBack`; else null. Valid
     * until the next landing, `setDrawn` or `load`, whose readback may reuse the buffer behind them: copy them to keep them.
     */
    readonly landedDrawnRows?: Float32Array | null;
    /** The landed batch's envelope of the scene rows the owner holds, with a drawn ring; else null. */
    readonly landedEnvelope?: LandedEnvelope | null;
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
    /**
     * Also read each landed slot back to the host, in the batch's one mapped readback, as `landedDrawnRows`: for a
     * renderer on another device, which cannot copy the slot on the card. False by default.
     */
    readonly readBack?: boolean;
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
    /**
     * Draw each batch fitted to its own landing instead of at `center` and `scale`: the mean of its finite rows at
     * `target`, and its row furthest from that mean `fit` drawn units out (scale 1 when the rows measure as a point).
     * A batch otherwise draws with the transform set before it was sent, measured over an earlier landing, and an
     * arrangement that grows quickly between the two is drawn larger than it measures. Ignored unless positive.
     * `landedDrawnTransform` reports the center and scale such a batch drew with.
     */
    readonly fit?: number;
}

/**
 * The finite scene rows of a landed batch measured on the device (issue #8801), so an owner fitting the arrangement to a
 * view reads these instead of walking every row: how many, their sum, their box, and the largest squared distance
 * of one from their mean as the device computed it. Measured in f32, so it agrees with an f64 walk of the same rows
 * to f32 rounding; the box is exact. The sums are taken about the origin, so the mean's error grows with the
 * arrangement's distance from it: about 1e-7 of that distance (a layout centered 10,000 radii out is off by about
 * 1e-3 of its radius), negligible for a force layout, which centers itself near the origin.
 * @public
 */
export interface LandedEnvelope {
    /**
     * How many rows were finite. Zero means nothing was measured, and the rest is meaningless. Counted in f32, so
     * exact up to 2^24 (16,777,216) rows; above that the count, and the mean taken with it, drift by f32 rounding.
     */
    readonly placed: number;
    /** The x, y and z sums of the finite rows. */
    readonly sum: readonly [number, number, number];
    /** The finite rows' min x, y, z then max x, y, z. */
    readonly box: readonly [number, number, number, number, number, number];
    /** The largest squared distance of a finite row from `sum / placed`. */
    readonly furthestSquared: number;
}

/**
 * The GPU-only tuning knobs of every GPU layout. `nearMax`, `gridMax2D`, `gridMax3D` and `extentFactor` shape the grid tier
 * (the cell sampling cap, the finest grid side in 2D and 3D, the grid's extent in RMS radii); `compat` is read by
 * ForceAtlas2 alone.
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

/** Options of calibrateLayout: the probe sizes of calibrateLayout (default 8k / 16k / 32k / 65k). */
export interface CalibrateOptions {
    /** The node counts to probe. Default 8k, 16k, 32k and 65k. */
    readonly sizes?: readonly number[] | undefined;
}

/**
 * What calibrateLayout returns: the per-size ms per iteration of both repulsion tiers on the actual device,
 * `pairsPerSecond` of the exact tier at the largest probed size, `suggestedExactMaxNodes` by this rule
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
