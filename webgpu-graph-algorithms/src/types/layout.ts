/**
 * The layout-facing public types (spec 3.3, 7.19): the stats records, the GPU simulation interface that extends the
 * real `@graphty/layout` LayoutSimulation (design 14.3), the run options and the GPU-only tuning knobs. Types only.
 */

import type { F32, GraphSnapshot, NodeMask } from "@graphty/graph-format";

import type { LayoutSimulation } from "./accelerator.js";

/** Spec 3.3 LayoutStatsBase, verbatim; the three grid fields are null on the exact tier (P3 always). */
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
 * One per-iteration trace record of the last completed batch (spec 3.3 ForceAtlas2Stats.trace element).
 * Exported: the element type of ForceAtlas2Stats.trace; re-exported from src/index.ts at P3-T3.
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

/** Spec 3.3 ForceAtlas2Stats, verbatim. */
export interface ForceAtlas2Stats extends LayoutStatsBase {
    readonly swing: number;
    readonly traction: number;
    readonly speed: number;
    readonly speedEfficiency: number;
    readonly trace: ReadonlyArray<ForceAtlas2TraceRecord>;
}

/**
 * One per-iteration trace record of the last completed batch of a Fruchterman-Reingold simulation (spec 3.3
 * FruchtermanReingoldStats.trace element): K1 writes `temperature` from the iteration's uniform slot (spec 7.20).
 * @public
 */
export interface FruchtermanReingoldTraceRecord {
    readonly temperature: number;
    readonly meanDisplacement: number;
    readonly settledCount: number;
}

/** Spec 3.3 FruchtermanReingoldStats, verbatim: the cooling schedule's value replaces the controller fields. */
export interface FruchtermanReingoldStats extends LayoutStatsBase {
    readonly temperature: number;
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
    readonly kineticEnergy: number;
    readonly meanDisplacement: number;
    readonly settledCount: number;
}

/** Spec 3.3 SpringElectricalStats, verbatim; `kineticEnergy` is the last folded value, one iteration behind the last integrate (PD-4). */
export interface SpringElectricalStats extends LayoutStatsBase {
    readonly kineticEnergy: number;
    readonly trace: ReadonlyArray<SpringElectricalTraceRecord>;
}

/** Options of GpuLayoutSimulation.run (spec 3.3). */
export interface RunOptions {
    readonly maxIter?: number | undefined;
    readonly batch?: number | undefined;
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
}

/**
 * Spec 3.3 GpuLayoutTuning, verbatim; the grid knobs are accepted and stored in P3 but only `repulsion`,
 * `exactMaxNodes`, `deterministic` and `compat` have an effect (grid tier = P4).
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

/** Spec 2.2 CalibrateOptions, verbatim: the probe sizes of calibrateLayout (default 8k / 16k / 32k / 65k). */
export interface CalibrateOptions {
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
    readonly pairsPerSecond: number;
    readonly exactMsPerIter: Readonly<Record<number, number>>;
    readonly gridMsPerIter: Readonly<Record<number, number>>;
    readonly suggestedExactMaxNodes: number;
    readonly firstCallMs: number;
}
