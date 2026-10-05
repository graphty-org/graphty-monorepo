/**
 * The skeleton the three force models share (spec 7.19; contract 3.13): ForceAtlas2, Fruchterman-Reingold and the
 * spring-electrical preset run the same four FA2 kernels K1 K2 K3 K5 (plus K4 for ForceAtlas2) over the same
 * buffers, so the buffer list, the binding of one load, the per-iteration recording on both repulsion tiers, the
 * shared Fa2Params fields, the shared stats fields and the release of the bind groups live here once. A model
 * supplies what differs: its pipelines (`compile`), its laws and option record, its controller resets and its own
 * stats fields; ForceAtlas2 also records K4 (`recordSpeed`) and zeroes oldForce on its first iteration
 * (`zeroesCarry`). Each model keeps its own pass labels and error wording through `ModelNames`. Layout zone.
 */

import { UNIFORM_SLOT_BYTES } from "../constants.js";
import { BufferUsage } from "../device/webgpu-constants.js";
import { WebGpuGraphError } from "../errors.js";
import { type CommandBatch } from "../kernel/batch.js";
import { type DispatchPlan, plan1d } from "../kernel/dispatch.js";
import { type BoundKernel, type Kernel } from "../kernel/kernel.js";
import { type UniformBlock, type UniformValues } from "../kernel/struct-block.js";
import { FA2_PARAMS, FA2_STATE, FA2_TRACE, FILL_PARAMS } from "../kernels.js";
import { arcCountOf } from "../primitives/core-shape.js";
import { type GridSpec, gridSpecFor } from "../primitives/grid.js";
import { type LayoutStatsBase, type ResolvedLayoutTuning } from "../types/layout.js";
import { type Binding } from "../types/memory.js";
import { type BufferSpec, type ModelResources, tierFor } from "./force-simulation.js";
import {
    type AttractionBindings,
    type AttractionBound,
    FILL_PARAMS_BUFFER,
    FORCE_BYTES_PER_NODE,
    invalid,
    type Overrides,
    recordAttraction,
    scalar,
    seedWord,
    vector,
} from "./model-common.js";
import { recordExactRepulsion, type RepulsionExactResources } from "./repulsion-exact.js";
import { type GridStage, RepulsionGrid } from "./repulsion-grid.js";

/** The stage names of both tiers in dispatch order plus the per-batch toScene (P4 PD-17: the union list; the exact tier records K1 K2 K3 [K4] K5, the grid tier K1 K2 G1..G7 [K4] K5). */
export const FORCE_STAGES = [
    "K1",
    "K2",
    "K3",
    "G1",
    "G2",
    "G3",
    "G4",
    "G5",
    "G6",
    "G7",
    "K4",
    "K5",
    "toScene",
] as const;

/** The FORCE_STAGES index of the first grid stage, of K4, of K5 and of toScene. */
const STAGE_G1 = 3;
const STAGE_K4 = 10;
const STAGE_K5 = 11;
const STAGE_TO_SCENE = 12;

/** The name of the model-owned hub-counter buffer K1 binds on every tier (P4 PD-14). */
const HUB_COUNTERS_BUFFER = "hubCounters";

/** The one-workgroup dispatch of K1. */
const ONE_WORKGROUP: DispatchPlan = { x: 1, y: 1, z: 1, items: 1, stride: null };

/** Every override K1 accepts, with its default (the FR and spring models; FA2 compiles K1 without overrides). */
export const LAW_K1_DEFAULTS: Overrides = { STATS_MODE: 0 };

/** Every override K2 accepts, with its default (plus the two standard graph overrides; the FR and spring models). */
export const LAW_K2_DEFAULTS: Overrides = {
    LINLOG: false,
    DISTRIBUTED: false,
    TIER: 0,
    USE_PERM: false,
    HAS_WEIGHTS: false,
    LAW: 0,
};

/** Every override K3 accepts, with its default (the FR and spring models). */
export const LAW_K3_DEFAULTS: Overrides = { SWING_MODE: 0, STRONG_GRAVITY: false, GRAVITY_CENTER: 0, LAW: 0 };

/** Every override K5 accepts, with its default (the FR and spring models). */
export const LAW_K5_DEFAULTS: Overrides = { SWING_MODE: 0, APPLY: 0 };

/**
 * The exact tier's repulsion stage as the skeleton records it: K3 over n nodes (RepulsionExact for FA2,
 * LawRepulsion otherwise). Exported for the type parameter of ForceModelBase.
 * @public
 */
export interface ExactStage {
    recordRepulsion(pass: GPUComputePassEncoder, n: number, paramsOffset: number): void;
    /** Drops the stage's bind groups at a rebind, when the stage owns a kernel the skeleton does not. */
    invalidate?(): void;
}

/** K3 alone: the exact tier of a model without a speed controller (Fruchterman-Reingold, spring-electrical). */
export class LawRepulsion implements ExactStage {
    /**
     * The exact-stage binder of a load that compiled K3 (CompiledModel.exact): binds K3 against the load's buffers.
     * @param kernel - the compiled `fa2-repulsion-exact`
     * @returns the binder
     */
    static binder(kernel: Kernel): (resources: RepulsionExactResources, plan: DispatchPlan) => LawRepulsion {
        return ({ pos, state, force, oldForce, fixedMask, partials, params }, plan) =>
            new LawRepulsion(
                kernel,
                kernel.bind({ pos, S: state, force, oldForce, fixedMask, partials, P: params }),
                plan,
            );
    }

    private constructor(
        private readonly kernel: Kernel,
        private readonly bound: BoundKernel,
        private readonly plan: DispatchPlan,
    ) {}

    /**
     * Records K3 through recordExactRepulsion (issue #87's pass split).
     * @param pass - the open compute pass
     * @param n - the node count
     * @param paramsOffset - the dynamic offset of the Fa2Params slot
     */
    recordRepulsion(pass: GPUComputePassEncoder, n: number, paramsOffset: number): void {
        recordExactRepulsion(this.kernel, pass, this.bound, this.plan, n, paramsOffset);
    }

    /** Drops K3's bind groups. */
    invalidate(): void {
        this.kernel.invalidate();
    }
}

/**
 * What a model's compile() hands the shared bind(): the pipelines of one load before any bind group exists.
 */
export interface CompiledModel<E extends ExactStage> {
    readonly k1: Kernel;
    readonly k5: Kernel;
    readonly toScene: Kernel;
    readonly fill: Kernel;
    /** The K2 tier dispatches; null when arcCount === 0 (the fill of force replaces K2, spec 7.5). */
    readonly attraction: AttractionBound | null;
    /** Binds the exact tier's stage against the load's buffers; null on the grid tier (P4 PD-18). */
    readonly exact: ((resources: RepulsionExactResources, plan: DispatchPlan) => E) | null;
    /** The grid-tier stage (G1-G7, and K4 for FA2), or null on the exact tier (P4 PD-18). */
    readonly grid: RepulsionGrid | null;
}

/** Everything bind() produced for one load(): the kernels, their bind groups and the dispatch plans of this n. */
interface BoundModel<E extends ExactStage> {
    readonly n: number;
    /** plan1d(n): K2, K3, K5, toScene (every kernel compiles with the same device-derived WG). */
    readonly plan: DispatchPlan;
    /** plan1d(3n): the fills of force / the carry buffer (3 words per node). */
    readonly fillPlan: DispatchPlan;
    readonly k1: Kernel;
    readonly k1Bound: BoundKernel;
    readonly attraction: AttractionBound | null;
    readonly exact: E | null;
    readonly grid: RepulsionGrid | null;
    readonly k5: Kernel;
    readonly k5Bound: BoundKernel;
    readonly toScene: Kernel;
    readonly toSceneBound: BoundKernel;
    readonly fill: Kernel;
    /** The fill of `force` (arcCount === 0 only). */
    readonly fillForceBound: BoundKernel | null;
    /** The fill of the carry buffer on the first iteration after load() (FA2's paper mode only). */
    readonly fillCarryBound: BoundKernel | null;
}

/**
 * The names that differ between the models: the error wording and the compute pass labels the profiler reports.
 * Exported for the parameter type of the ForceModelBase constructor.
 * @public
 */
export interface ModelNames {
    /** The model's name in error messages ("the <name> model ..."). */
    readonly name: string;
    /** The exact tier's pass label; the grid tier's three passes are `<pass>-k1`, `<pass>-attraction`, `<pass>-grid`. */
    readonly pass: string;
    /** The label of the toScene pass. */
    readonly scenePass: string;
    /** The model buffer bound into the `oldForce` slot of K3, G7 and K5 ("oldForce", or the spring model's "velocity"). */
    readonly carry: string;
}

/** The resolved option fields every model's shared Fa2Params values read. */
interface SharedResolved {
    readonly dim: 2 | 3;
    readonly seed: number | null;
    readonly scale: number;
    readonly center: readonly [number, number, number];
    readonly settleThreshold: number;
}

/** The ForceModel members the three force models share; the model class supplies the rest (see the file header). */
export abstract class ForceModelBase<E extends ExactStage> {
    /** The stage names in dispatch order (the `upTo` vocabulary of recordIteration and debugRunStages). */
    readonly stages: typeof FORCE_STAGES = FORCE_STAGES;
    /** Fa2Params: the per-iteration uniform block (the simulation writes the shared fields into it). */
    readonly params: UniformBlock = FA2_PARAMS;
    /** Fa2State: the state header block (the simulation allocates and initialises it through this layout). */
    readonly state: UniformBlock = FA2_STATE;
    /** Fa2Trace: one record per iteration of a batch. */
    readonly trace: UniformBlock = FA2_TRACE;
    /** The resolved GPU-only tuning this model was created with. */
    readonly tuning: ResolvedLayoutTuning;

    /** The resources of the last bind(), or null before the first. */
    protected resources: ModelResources | null = null;
    /** The grid of the load inputs() last resolved (null on the exact tier): onLoad() writes its frame, specs() lists its kernels. */
    protected nextGrid: GridSpec | null = null;
    /** Armed by a model's onLoad(): the next recordIteration zeroes the carry buffer first (FA2's paper mode). */
    protected resetCarry = false;
    /** The kernels and bind groups of the last bind(), or null before it (and for n === 0). */
    private bound: BoundModel<E> | null = null;
    /**
     * The K1-K5 compute pass of the batch being recorded, keyed by CommandBatch.id (unique per batch): every
     * recordIteration of one batch dispatches into it (ONE pass per batch, contract 4.4); null between batches and
     * after the toScene pass ended it.
     */
    private openPass: { readonly id: number; readonly pass: GPUComputePassEncoder } | null = null;

    /**
     * Stores the tuning and the model's names.
     * @param tuning - the resolved GPU-only tuning
     * @param names - the model's error wording, pass labels and carry buffer
     */
    protected constructor(
        tuning: ResolvedLayoutTuning,
        private readonly names: ModelNames,
    ) {
        this.tuning = tuning;
    }

    /**
     * Compiles (through the cache) every pipeline of one load: K1, K5, toScene, fill, K2 over the degree tiers through
     * bindAttraction (or null when the graph has no arcs), the exact stage or the grid stage. The order of the
     * compiles is the model's.
     * @param resources - the graph, the shared and model buffers, the ring and the cache
     * @param overrides - the merged override set
     * @param attraction - K2's group-1 / group-2 bindings
     * @returns the pipelines
     */
    protected abstract compile(
        resources: ModelResources,
        overrides: Overrides,
        attraction: AttractionBindings,
    ): Promise<CompiledModel<E>>;

    /**
     * Whether the load zeroes the carry buffer before its first K1 (FA2's paper mode); a fill bind group exists only
     * then.
     * @returns false: only ForceAtlas2 zeroes it
     */
    protected zeroesCarry(): boolean {
        return false;
    }

    /**
     * K4 after the repulsion of either tier: nothing for a model without a speed controller.
     * @param _pass - the open compute pass
     * @param _stage - the exact or the grid stage of the load
     * @param _offset - the Fa2Params dynamic offset
     */
    protected recordSpeed(_pass: GPUComputePassEncoder, _stage: E | RepulsionGrid, _offset: number): void {
        // no speed controller
    }

    /**
     * force 12n and the carry buffer 12n (zeroed), the 256-byte FillParams uniform buffer the fill dispatches read,
     * the 16-byte `hubCounters` K1 binds on every tier (P4 PD-14), and the grid buffers of `RepulsionGrid.buffers`
     * exactly when `tierFor(tuning, n)` is the grid tier (PD-18). n = 0 reports one node's worth of bytes so no
     * zero-length buffer is ever created (spec 3.6).
     * @param n - the node count
     * @param dim - the layout dimension (the force arrays are stride 3 in both; the grid's geometry differs)
     * @returns the model-owned buffer specs
     */
    buffers(n: number, dim: 2 | 3): readonly BufferSpec[] {
        const bytes = Math.max(1, n) * FORCE_BYTES_PER_NODE;
        const usage = BufferUsage.STORAGE | BufferUsage.COPY_SRC | BufferUsage.COPY_DST;
        const grid =
            tierFor(this.tuning, n) === "grid" ? RepulsionGrid.buffers(n, gridSpecFor(n, dim, this.tuning)) : [];
        return [
            { name: "force", byteLength: bytes, usage, zero: true },
            { name: this.names.carry, byteLength: bytes, usage, zero: true },
            {
                name: FILL_PARAMS_BUFFER,
                byteLength: UNIFORM_SLOT_BYTES,
                usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
                zero: false,
            },
            { name: HUB_COUNTERS_BUFFER, byteLength: 16, usage, zero: true },
            ...grid,
        ];
    }

    /**
     * Compiles and binds every kernel against the buffers of this load(): the model's compile(), then the bind groups
     * of K1, K2, the exact or the grid stage, K5, toScene and the fills; writes the FillParams { count: 3n, value: 0,
     * mode: 0 } into the model's uniform buffer. With n === 0 nothing is bound.
     * @param resources - the graph, the shared and model buffers, the ring and the cache
     * @param overrides - the merged override set
     */
    async bind(resources: ModelResources, overrides: Overrides): Promise<void> {
        this.dropBound();
        this.resources = resources;
        const { n, caps, core, ring, device } = resources;
        if (n === 0) {
            return;
        }
        const pos = resources.buffer("positions");
        const force = resources.buffer("force");
        const params = ring.binding(FA2_PARAMS);
        const hasArcs = core.colIdx !== null;
        const compiled = await this.compile(resources, overrides, { pos, force, params });
        const { k1, k5, toScene, fill, grid } = compiled;
        if (this.resources !== resources) {
            // a newer bind() superseded this one while the pipelines compiled; its own bind groups stand
            grid?.dispose();
            return;
        }
        const scene = resources.buffer("scenePositions");
        const fixed = resources.buffer("fixed");
        const partials = resources.buffer("partials");
        const state = resources.buffer("state");
        const trace = resources.buffer("trace");
        const carry = resources.buffer(this.names.carry);
        const fillParamsBuffer = resources.buffer(FILL_PARAMS_BUFFER);
        const fillParams: Binding = {
            buffer: fillParamsBuffer.buffer,
            offset: fillParamsBuffer.offset,
            size: FILL_PARAMS.byteLength,
            window: null,
        };
        const fillBytes = new ArrayBuffer(FILL_PARAMS.byteLength);
        FILL_PARAMS.write(new DataView(fillBytes), { count: 3 * n, value: 0, mode: 0 });
        device.queue.writeBuffer(fillParamsBuffer.buffer, fillParamsBuffer.offset, fillBytes);
        const hubCounters = resources.buffer(HUB_COUNTERS_BUFFER);
        const exactResources = { pos, state, trace, force, oldForce: carry, fixedMask: fixed, partials, params };
        grid?.bind({
            ...exactResources,
            cellKey: resources.buffer("cellKey"),
            cellVal: resources.buffer("cellVal"),
            sortedKey: resources.buffer("sortedKey"),
            sortedIdx: resources.buffer("sortedIdx"),
            cellHist: resources.buffer("cellHist"),
            cellStart: resources.buffer("cellStart"),
            hubList: resources.buffer("hubList"),
            hubCounters,
            pyramid: resources.buffer("pyramid"),
        });
        const wg = k1.workgroupSize;
        const plan = plan1d(n, wg, caps);
        this.bound = {
            n,
            plan,
            fillPlan: plan1d(3 * n, wg, caps),
            k1,
            // PD-14: on the exact tier K1's cellHist slot takes a dummy (partials, both read-only) and the block is
            // dead under gridMax 0; hubCounters is the model's 16-byte buffer on every tier
            k1Bound: k1.bind({
                partials,
                S: state,
                T: trace,
                cellHist: grid === null ? partials : resources.buffer("cellHist"),
                hubCounters,
                P: params,
            }),
            attraction: compiled.attraction,
            exact: compiled.exact?.(exactResources, plan) ?? null,
            grid,
            k5,
            k5Bound: k5.bind({ force, oldForce: carry, fixedMask: fixed, S: state, pos, partials, P: params }),
            toScene,
            toSceneBound: toScene.bind({ pos, scene, P: params }),
            fill,
            fillForceBound: hasArcs ? null : fill.bind({ dst: force, P: fillParams }),
            fillCarryBound: this.zeroesCarry() ? fill.bind({ dst: carry, P: fillParams }) : null,
        };
    }

    /**
     * Records one iteration into the batch, stopping after stage `upTo` when given (spec 7.4; debugRunStages /
     * inspect, spec 11.9 item 2; PD-17: `upTo` names a position in the union list and the recording stops after the
     * last stage recorded at or before it, so "K3" on the grid tier stops after K2 and "G5" on the exact tier after
     * K3). The exact tier: K1, K2 (or the fill of force when arcCount === 0), K3, [K4,] K5 in the batch's ONE compute
     * pass (opened by the first call of a batch and reused by every later call with the same batch.id), then toScene
     * in a second pass that ends it. The grid tier (PD-16): the passes `<pass>-k1` (K1), `<pass>-attraction` (K2's
     * tiers) and `<pass>-grid` (G1-G7, [K4,] K5) per iteration, then the toScene pass. The simulation passes "K5" for
     * iterations 0..k-2 and undefined for the last, so toScene runs once per batch. With n === 0 nothing is recorded;
     * a call before bind() completed is E_NOT_LOADED (never a silent no-op).
     * @param batch - the batch being recorded
     * @param slot - the UniformRing slot holding this iteration's Fa2Params
     * @param tier - the tier the simulation resolved at load() (the same rule bind() applied, PD-18)
     * @param upTo - a stage name to stop after; undefined records every stage including toScene
     */
    recordIteration(batch: CommandBatch, slot: number, tier: "exact" | "grid", upTo?: string): void {
        const resources = this.requireResources();
        const stop = upTo === undefined ? STAGE_TO_SCENE : this.stageIndex(upTo);
        const { bound } = this;
        if (bound === null) {
            if (resources.n === 0) {
                return;
            }
            throw new WebGpuGraphError(
                "E_NOT_LOADED",
                `the ${this.names.name} model is not bound (bind() has not completed)`,
                { state: "loaded" },
            );
        }
        const offset = resources.ring.offsetOf(slot);
        if (tier === "grid") {
            this.recordGridIteration(batch, bound, offset, stop);
            return;
        }
        const { exact } = bound;
        if (exact === null) {
            throw new WebGpuGraphError("E_NOT_LOADED", `the ${this.names.name} model was bound on the grid tier`, {
                state: "loaded",
            });
        }
        const pass =
            this.openPass !== null && this.openPass.id === batch.id ? this.openPass.pass : batch.pass(this.names.pass);
        this.openPass = { id: batch.id, pass };
        this.recordK1(pass, bound, offset);
        if (stop < 1) {
            return;
        }
        this.recordK2(pass, bound, offset);
        if (stop < 2) {
            return;
        }
        exact.recordRepulsion(pass, bound.n, offset);
        if (stop < STAGE_K4) {
            return;
        }
        this.recordSpeed(pass, exact, offset);
        if (stop < STAGE_K5) {
            return;
        }
        bound.k5.dispatch(pass, bound.k5Bound, bound.plan, [offset]);
        if (stop < STAGE_TO_SCENE) {
            return;
        }
        this.recordToScene(batch, bound, offset);
    }

    /**
     * The grid tier's iteration (PD-16): three compute passes before toScene.
     * @param batch - the batch being recorded
     * @param bound - the bound model
     * @param offset - the Fa2Params dynamic offset of the iteration
     * @param stop - the FORCE_STAGES index to stop after
     */
    private recordGridIteration(batch: CommandBatch, bound: BoundModel<E>, offset: number, stop: number): void {
        const { grid } = bound;
        if (grid === null) {
            throw new WebGpuGraphError("E_NOT_LOADED", `the ${this.names.name} model was bound on the exact tier`, {
                state: "loaded",
            });
        }
        this.openPass = null;
        this.recordK1(batch.pass(`${this.names.pass}-k1`), bound, offset);
        if (stop < 1) {
            return;
        }
        this.recordK2(batch.pass(`${this.names.pass}-attraction`), bound, offset);
        if (stop < STAGE_G1) {
            return;
        }
        const pass = batch.pass(`${this.names.pass}-grid`);
        const gridStop = stop < STAGE_K4 ? (FORCE_STAGES[stop] as GridStage) : undefined;
        grid.recordRepulsion(pass, bound.n, offset, gridStop);
        if (stop < STAGE_K4) {
            return;
        }
        this.recordSpeed(pass, grid, offset);
        if (stop < STAGE_K5) {
            return;
        }
        bound.k5.dispatch(pass, bound.k5Bound, bound.plan, [offset]);
        if (stop < STAGE_TO_SCENE) {
            return;
        }
        this.recordToScene(batch, bound, offset);
    }

    /**
     * The carry reset of the first iteration after load() (FA2's paper mode), then K1 (one workgroup).
     * @param pass - the open compute pass
     * @param bound - the bound model
     * @param offset - the Fa2Params dynamic offset
     */
    private recordK1(pass: GPUComputePassEncoder, bound: BoundModel<E>, offset: number): void {
        if (this.resetCarry) {
            this.resetCarry = false;
            if (bound.fillCarryBound !== null) {
                bound.fill.dispatch(pass, bound.fillCarryBound, bound.fillPlan, [0]);
            }
        }
        bound.k1.dispatch(pass, bound.k1Bound, ONE_WORKGROUP, [offset]);
    }

    /**
     * K2's tier dispatches, or the fill of force when the graph has no arcs (spec 7.5).
     * @param pass - the open compute pass
     * @param bound - the bound model
     * @param offset - the Fa2Params dynamic offset
     */
    private recordK2(pass: GPUComputePassEncoder, bound: BoundModel<E>, offset: number): void {
        if (bound.attraction !== null) {
            recordAttraction(pass, bound.attraction, offset);
        } else if (bound.fillForceBound !== null) {
            bound.fill.dispatch(pass, bound.fillForceBound, bound.fillPlan, [0]);
        }
    }

    /**
     * The toScene pass that ends the iteration's pass; the batch is complete after it, so nothing reuses the pass.
     * @param batch - the batch
     * @param bound - the bound model
     * @param offset - the Fa2Params dynamic offset
     */
    private recordToScene(batch: CommandBatch, bound: BoundModel<E>, offset: number): void {
        this.openPass = null;
        const scenePass = batch.pass(this.names.scenePass);
        bound.toScene.dispatch(scenePass, bound.toSceneBound, bound.plan, [offset]);
    }

    /**
     * The Fa2Params fields every model writes the same way: the counts, the shared options, the grid geometry of a
     * grid load and the K2 tier ranges (P4 PD-7: TIER 2 reads [0, hiEnd), TIER 1 [hiEnd, midEnd), TIER 0
     * [tierStart, tierEnd) = [midEnd, n)); `flags` is 0 unless the model overrides it.
     * @param iteration - the iteration index the simulation passed to paramsFor
     * @param resolved - the model's resolved option record
     * @returns the shared uniform values
     */
    protected sharedParams(iteration: number, resolved: SharedResolved): UniformValues {
        const { n, core, tiers, tier, dim } = this.requireResources();
        const { nearMax, extentFactor } = this.tuning;
        const grid = tier === "grid" ? gridSpecFor(n, dim, this.tuning) : null;
        const so = tiers?.segmentOffsets;
        const hiEnd = so?.[1] ?? 0;
        const midEnd = so?.[2] ?? 0;
        return {
            n,
            dim: resolved.dim,
            flags: 0,
            tierStart: midEnd,
            tierEnd: n,
            iterationIndex: iteration,
            seed: seedWord(resolved.seed),
            nearMax,
            scale: resolved.scale,
            center: [resolved.center[0], resolved.center[1], resolved.center[2], 0],
            settleThreshold: resolved.settleThreshold,
            extentFactor,
            gridMax: grid?.g ?? 0,
            levels: grid?.levels ?? 0,
            arcBase: 0,
            arcEnd: arcCountOf(core),
            accumulate: 0,
            hiEnd,
            midEnd,
        };
    }

    /**
     * The stats fields every model decodes the same way from the state header: `repulsionTier` is the bound tier,
     * the grid fields are the header's on the grid tier and null on the exact tier, msPerIteration null (the
     * simulation owns the clock).
     * @param header - the decoded state header
     * @returns the shared stats fields
     */
    protected sharedStats(header: UniformValues): LayoutStatsBase {
        const centroid = vector(header, "centroid");
        const grid = this.resources?.tier === "grid";
        return {
            iteration: scalar(header, "iteration"),
            meanDisplacement: scalar(header, "meanDisplacement"),
            rmsRadius: scalar(header, "rmsRadius"),
            layoutRadius: scalar(header, "radius"),
            centroid: [centroid[0], centroid[1], centroid[2]],
            repulsionTier: grid ? "grid" : "exact",
            maxCellOccupancy: grid ? scalar(header, "maxCellOccupancy") : null,
            outsideGrid: grid ? scalar(header, "outsideGrid") : null,
            msPerIteration: null,
        };
    }

    /**
     * The resources of the last bind(), or E_NOT_LOADED before it.
     * @returns the resources
     */
    protected requireResources(): ModelResources {
        if (this.resources === null) {
            throw new WebGpuGraphError(
                "E_NOT_LOADED",
                `the ${this.names.name} model has not been bound (load() first)`,
                { state: "created" },
            );
        }
        return this.resources;
    }

    /**
     * The index of a stage name in FORCE_STAGES, or E_INVALID_ARGUMENT.
     * @param upTo - the stage name
     * @returns its index
     */
    private stageIndex(upTo: string): number {
        for (let i = 0; i < FORCE_STAGES.length; i++) {
            if (FORCE_STAGES[i] === upTo) {
                return i;
            }
        }
        throw invalid("upTo", upTo, FORCE_STAGES.join(" | "));
    }

    /** Releases the grid stage's lease and the bind groups (the simulation calls it from dispose() once every in-flight batch has settled). */
    dispose(): void {
        this.dropBound();
    }

    /**
     * Drops the bind groups of the previous bind() (the buffers changed) so the cached kernels do not accumulate stale
     * groups across reloads (FA2's K3 / K4 live inside RepulsionExact and keep the P1-T6 behaviour); the grid stage
     * releases its lease. Also forgets the pass of a batch recorded before the rebind.
     */
    private dropBound(): void {
        this.openPass = null;
        const { bound } = this;
        if (bound === null) {
            return;
        }
        for (const kernel of [bound.k1, bound.k5, bound.toScene, bound.fill]) {
            kernel.invalidate();
        }
        bound.exact?.invalidate?.();
        for (const [kernel] of bound.attraction?.kernels ?? []) {
            kernel.invalidate();
        }
        bound.grid?.dispose();
        this.bound = null;
    }
}
