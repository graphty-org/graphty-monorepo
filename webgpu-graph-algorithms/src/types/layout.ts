/**
 * The layout-facing public types: the stats records, the GPU simulation interface that extends the
 * real `@graphty/layout` LayoutSimulation, the run options and the GPU-only tuning knobs. Types only.
 */

import type { F32, GraphSnapshot, NodeMask } from "@graphty/graph-format";

import type { LayoutSimulation } from "./accelerator.js";

/** The stats every GPU layout reports after a batch; the grid fields are null on the exact tier. */
export interface LayoutStatsBase {
    readonly iteration: number;
    readonly meanDisplacement: number;
    readonly rmsRadius: number;
    readonly layoutRadius: number;
    readonly centroid: readonly [number, number, number];
    readonly repulsionTier: "exact" | "grid";
    readonly maxCellOccupancy: number | null;
    readonly outsideGrid: number | null;
    readonly msPerIteration: number | null;
}

/**
 * One per-iteration trace record of the last completed batch of a ForceAtlas2 simulation: the element
 * type of ForceAtlas2Stats.trace.
 * @public
 */
export interface ForceAtlas2TraceRecord {
    readonly swing: number;
    readonly traction: number;
    readonly speed: number;
    readonly speedEfficiency: number;
    readonly meanDisplacement: number;
    readonly settledCount: number;
}

/** The stats of a ForceAtlas2 simulation. */
export interface ForceAtlas2Stats extends LayoutStatsBase {
    readonly swing: number;
    readonly traction: number;
    readonly speed: number;
    readonly speedEfficiency: number;
    readonly trace: ReadonlyArray<ForceAtlas2TraceRecord>;
}

/**
 * One per-iteration trace record of the last completed batch of a Fruchterman-Reingold simulation (the
 * element type of FruchtermanReingoldStats.trace): K1 writes `temperature` from the iteration's uniform slot.
 * @public
 */
export interface FruchtermanReingoldTraceRecord {
    readonly temperature: number;
    readonly meanDisplacement: number;
    readonly settledCount: number;
}

/** The stats of a Fruchterman-Reingold simulation: the cooling schedule's value replaces the controller fields. */
export interface FruchtermanReingoldStats extends LayoutStatsBase {
    readonly temperature: number;
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
    readonly kineticEnergy: number;
    readonly meanDisplacement: number;
    readonly settledCount: number;
}

/** The stats of a spring-electrical simulation; `kineticEnergy` is the last folded value, one iteration behind the last integrate. */
export interface SpringElectricalStats extends LayoutStatsBase {
    readonly kineticEnergy: number;
    readonly trace: ReadonlyArray<SpringElectricalTraceRecord>;
}

/** Options of GpuLayoutSimulation.run. */
export interface RunOptions {
    readonly maxIter?: number | undefined;
    readonly batch?: number | undefined;
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
    readonly settled: boolean;
    setFixed(mask: NodeMask): void;
    setPosition(index: number, x: number, y: number, z: number): void;
    dispose(): void;
    readonly inFlight: number;
    readonly iterationsDone: number;
    readonly stats: Stats;
    flush(): Promise<void>;
    reheat(): void;
    setParams(patch: Partial<Options>): void;
    run(options?: RunOptions): Promise<Stats>;
    inspect?(name: string): Promise<Float32Array | Uint32Array>;
    /** The drawn ring slot of the last batch that landed, or null (design/rendering/row-renderer.md 4.5). */
    readonly landedDrawn?: GPUBuffer | null;
    /** The transform the batch of `landedDrawn` drew with, or null with it. */
    readonly landedDrawnTransform?: DrawnTransform | null;
    /** The rows of `landedDrawn` read back to the host (stride 4), when `setDrawn` asked for `readBack`; else null. */
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
    readonly slots: number;
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
}

/**
 * The finite scene rows of a landed batch measured on the device (issue #8801), so an owner fitting the arrangement to a
 * view reads these instead of walking every row: how many, their sum, their box, and the largest squared distance
 * of one from their mean as the device computed it. Measured in f32, so it agrees with an f64 walk of the same rows
 * to f32 rounding; the box is exact.
 * @public
 */
export interface LandedEnvelope {
    /** How many rows were finite. Zero means nothing was measured, and the rest is meaningless. */
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
    readonly repulsion?: "exact" | "grid" | "auto" | undefined;
    readonly exactMaxNodes?: number | undefined;
    readonly nearMax?: number | undefined;
    readonly deterministic?: boolean | undefined;
    readonly gridMax2D?: number | undefined;
    readonly gridMax3D?: number | undefined;
    readonly extentFactor?: number | undefined;
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
    readonly pairsPerSecond: number;
    readonly exactMsPerIter: Readonly<Record<number, number>>;
    readonly gridMsPerIter: Readonly<Record<number, number>>;
    readonly suggestedExactMaxNodes: number;
    readonly firstCallMs: number;
}
