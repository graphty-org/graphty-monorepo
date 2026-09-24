/**
 * Fruchterman-Reingold on the exact or the grid repulsion tier (spec 7.20, 7.8; contract 3.13): the ForceModel that
 * ForceSimulation drives -- the K1 K2 K3 K5 sequence per iteration on the exact tier (K1 K2 G1..G7 K5 on the grid
 * tier, P4-T13) and toScene per batch (no K4: no speed controller), the constant override set (`LAW` 1 on K2 / K3
 * and on G6 / G7, `APPLY` 1 on K5, `STATS_MODE` 1 on K1, PD-1), the per-iteration Fa2Params values
 * with the cooling schedule's temperature (PD-5), the controller resets and the stats decoder -- plus the option
 * resolver and `createFruchtermanReingold`. The model shares FA2's four kernels, buffers and blocks: `oldForce` is
 * allocated, bound and never read (K5 compiles `SWING_MODE = 1`, PD-2 / PD-20); the mass lane is 1 for every node
 * and weights are ignored (PD-11); the `fixed` option resolves at load through ModelInputs.fixed (PD-6); a
 * `setParams({ fixed })` patch is E_INVALID_ARGUMENT (PD-16).
 *
 * The temperature index (PD-5): the simulation hands paramsFor the GLOBAL iteration index, which load() restarts at 0
 * and reheat() does not touch. The model keeps `tempOrigin` (the global index at which the temperature index is 0):
 * onLoad sets it to 0; onReheat arms `pendingReheat`; the first paramsFor(global) after it sets
 * `tempOrigin = global - floor(0.7 * iterations)`, so the temperature restarts at floor(0.7 * iterations) exactly as
 * the CPU's reheat() does. The temperature is `max(0, 0.1 - dt * (global - tempOrigin))`, dt = 0.1 / (iterations + 1);
 * at 0 nothing moves and the settle window closes the run (DEP-P5-C: the budget restarts at 0, the temperature does
 * not).
 *
 * The grid tier (P4-T13, PD-22) is FA2's: `RepulsionGrid` with `LAW` 1 when `tierFor(tuning, n)` says so (PD-18),
 * the grid buffers from `buffers()`, K1's grid block under `gridMax > 0` (PD-14) over the model's own `hubCounters`,
 * the three passes `fr-k1` / `fr-attraction` / `fr-grid` before `fa2-to-scene` (PD-16), and the union stage list
 * (PD-17: `upTo` stops after the last stage recorded at or before its position; K4 is never recorded).
 */

import { type GraphSnapshot, type NodeMask } from "@graphty/graph-format";

import {
    FA2_FLAG_ADAPTIVE,
    FR_ADAPTIVE_MAX_ITERATIONS,
    FR_DEFAULTS,
    FR_REHEAT_FRACTION,
    FR_START_TEMPERATURE,
    MAX_ITERATIONS_PER_STEP,
    TRACE_RECORD_BYTES,
    UNIFORM_SLOT_BYTES,
} from "../constants.js";
import { type GpuContext } from "../context.js";
import { BufferUsage } from "../device/webgpu-constants.js";
import { WebGpuGraphError } from "../errors.js";
import { type CommandBatch } from "../kernel/batch.js";
import { type DispatchPlan, plan1d } from "../kernel/dispatch.js";
import { type BoundKernel, type Kernel } from "../kernel/kernel.js";
import { type UniformBlock, type UniformValues } from "../kernel/struct-block.js";
import { type WgslModuleSpec } from "../kernel/wgsl.js";
import { FA2_PARAMS, FA2_STATE, FA2_TRACE, FILL_PARAMS, kernelSpec } from "../kernels.js";
import { arcCountOf } from "../primitives/core-shape.js";
import { type GridSpec, gridSpecFor } from "../primitives/grid.js";
import {
    type FruchtermanReingoldStats,
    type FruchtermanReingoldTraceRecord,
    type GpuLayoutSimulation,
    type GpuLayoutTuning,
    type ResolvedLayoutTuning,
} from "../types/layout.js";
import { type Binding } from "../types/memory.js";
import { type FruchtermanReingoldOptions, type ResolvedFruchtermanReingoldOptions } from "../types/options.js";
import {
    type BufferSpec,
    type ForceModel,
    ForceSimulation,
    type ModelInputs,
    type ModelResources,
    type StateWriter,
    tierFor,
} from "./force-simulation.js";
import { resolveLayoutTuning, writeGridFrame } from "./forceatlas2.js";
import {
    type AttractionBound,
    bindAttraction,
    describeValue,
    FILL_PARAMS_BUFFER,
    FORCE_BYTES_PER_NODE,
    invalid,
    isPositiveInteger,
    type Overrides,
    pickCenter,
    pickDim,
    pickNumber,
    pickSeed,
    recordAttraction,
    scalar,
    seedWord,
    subset,
    vector,
} from "./model-common.js";
import { type GridStage, RepulsionGrid, type RepulsionGridOverrides } from "./repulsion-grid.js";

// ============================================================ constants

/** The stage names of both tiers in dispatch order plus the per-batch toScene (spec 7.20; P4 PD-17: the union list; the exact tier records K1 K2 K3 K5, the grid tier K1 K2 G1..G7 K5, K4 never). */
const FR_STAGES = ["K1", "K2", "K3", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "K4", "K5", "toScene"] as const;

/** The FR_STAGES index of the first grid stage, of K4, of K5 and of toScene. */
const STAGE_G1 = 3;
const STAGE_K4 = 10;
const STAGE_K5 = 11;
const STAGE_TO_SCENE = 12;

/** The name of the model-owned hub-counter buffer K1 binds on every tier (P4 PD-14). */
const HUB_COUNTERS_BUFFER = "hubCounters";

/** The one-workgroup dispatch of K1 (spec 7.4). */
const ONE_WORKGROUP: DispatchPlan = { x: 1, y: 1, z: 1, items: 1, stride: null };

/** The model's override set, constant for every option record (PD-1, PD-20). */
const FR_OVERRIDES: Overrides = Object.freeze({
    LINLOG: false,
    DISTRIBUTED: false,
    TIER: 0,
    SWING_MODE: 1,
    STRONG_GRAVITY: false,
    GRAVITY_CENTER: 0,
    LAW: 1,
    APPLY: 1,
    STATS_MODE: 1,
});

/** The grid stage's override set (G6 / G7 / K4; P4-T13, PD-22): K3's constant three and the FR law. */
const FR_GRID_OVERRIDES: RepulsionGridOverrides = Object.freeze({
    SWING_MODE: 1,
    STRONG_GRAVITY: false,
    GRAVITY_CENTER: 0,
    LAW: 1,
});

/** Every override each kernel accepts, with its default (the names its registry entry declares). */
const K1_DEFAULTS: Overrides = { STATS_MODE: 0 };
const K2_DEFAULTS: Overrides = {
    LINLOG: false,
    DISTRIBUTED: false,
    TIER: 0,
    USE_PERM: false,
    HAS_WEIGHTS: false,
    LAW: 0,
};
const K3_DEFAULTS: Overrides = { SWING_MODE: 0, STRONG_GRAVITY: false, GRAVITY_CENTER: 0, LAW: 0 };
const K5_DEFAULTS: Overrides = { SWING_MODE: 0, APPLY: 0 };

/** The resolved record with no option given: FR_DEFAULTS plus the null / origin defaults. */
const DEFAULT_RESOLVED: ResolvedFruchtermanReingoldOptions = Object.freeze<ResolvedFruchtermanReingoldOptions>({
    ...FR_DEFAULTS,
    center: [0, 0, 0],
    seed: null,
});

// ============================================================ the resolver

/**
 * The `k` option: undefined keeps the fallback; null, 0 and NaN mean the auto default (null); else a finite
 * number > 0.
 * @param given - the value given
 * @param fallback - the previous record's value or the default
 * @returns k or null
 */
function resolveK(given: number | null | undefined, fallback: number | null): number | null {
    if (given === undefined) {
        return fallback;
    }
    if (given === null || given === 0 || Number.isNaN(given)) {
        return null;
    }
    return pickNumber("k", given, 1, (v) => v > 0, "> 0 or null");
}

/**
 * The `cooling` option: undefined keeps the fallback; else one of the two schedule names.
 * @param given - the value given
 * @param fallback - the previous record's value or the default
 * @returns the schedule
 */
function pickCooling(given: unknown, fallback: "linear" | "adaptive"): "linear" | "adaptive" {
    if (given === undefined) {
        return fallback;
    }
    if (given === "linear" || given === "adaptive") {
        return given;
    }
    throw invalid("cooling", given, '"linear" | "adaptive"');
}

/**
 * Applies FR_DEFAULTS to the option record and validates every range (spec 7.20, 9.3). `k`: null, 0 and NaN mean the
 * auto default `1 / sqrt(n)` (the CPU's `if (!k)`, `layout/src/simulation/fruchterman-reingold.ts:140-152`); a
 * negative or infinite k is E_INVALID_ARGUMENT. `iterations` is an integer >= 0 (0: settled at load); under
 * `cooling: "adaptive"` it is only the run's cap and a fresh record without one gets FR_ADAPTIVE_MAX_ITERATIONS. `fixed` is a
 * NodeMask, a bool node column name or null. With `previous` the record is a PATCH over it and `maxInFlight` may not
 * change (the uniform ring is sized by it at construction).
 * @param options - the caller's options (or a setParams patch)
 * @param previous - the current resolved record when resolving a patch
 * @returns the frozen resolved record
 */
export function resolveFruchtermanReingoldOptions(
    options: FruchtermanReingoldOptions | undefined,
    previous?: ResolvedFruchtermanReingoldOptions,
): ResolvedFruchtermanReingoldOptions {
    const o: FruchtermanReingoldOptions = options ?? {};
    const base = previous ?? DEFAULT_RESOLVED;
    if (previous !== undefined && o.maxInFlight !== undefined && o.maxInFlight !== previous.maxInFlight) {
        throw new WebGpuGraphError(
            "E_INVALID_ARGUMENT",
            `maxInFlight cannot change after creation (the uniform ring is sized by it): got ${describeValue(o.maxInFlight)}, current ${previous.maxInFlight}`,
            { argument: "maxInFlight", value: o.maxInFlight, expected: previous.maxInFlight },
        );
    }
    const fixed: unknown = o.fixed === undefined ? base.fixed : o.fixed;
    if (fixed !== null && typeof fixed !== "string" && !(fixed instanceof Uint32Array)) {
        throw invalid("fixed", fixed, "a NodeMask (Uint32Array), the name of a bool node column, or null");
    }
    const cooling = pickCooling(o.cooling, base.cooling);
    // under adaptive cooling `iterations` is only a cap: a fresh record without one gets the adaptive budget, not the schedule's 50
    const iterationsFallback =
        previous === undefined && cooling === "adaptive" && o.iterations === undefined
            ? FR_ADAPTIVE_MAX_ITERATIONS
            : base.iterations;
    const resolved: ResolvedFruchtermanReingoldOptions = {
        k: resolveK(o.k, base.k),
        iterations: pickNumber(
            "iterations",
            o.iterations,
            iterationsFallback,
            (v) => Number.isInteger(v) && v >= 0,
            "an integer >= 0",
        ),
        cooling,
        fixed: fixed as NodeMask | string | null,
        dim: pickDim(o.dim, base.dim),
        scale: pickNumber("scale", o.scale, base.scale, (v) => v > 0, "> 0"),
        center: pickCenter(o.center, base.center),
        seed: pickSeed(o.seed, base.seed),
        settleThreshold: pickNumber("settleThreshold", o.settleThreshold, base.settleThreshold, (v) => v >= 0, ">= 0"),
        settleWindow: pickNumber(
            "settleWindow",
            o.settleWindow,
            base.settleWindow,
            isPositiveInteger,
            "an integer >= 1",
        ),
        iterationsPerStep: pickNumber(
            "iterationsPerStep",
            o.iterationsPerStep,
            base.iterationsPerStep,
            (v) => isPositiveInteger(v) && v <= MAX_ITERATIONS_PER_STEP,
            `an integer in [1, ${MAX_ITERATIONS_PER_STEP}]`,
        ),
        maxInFlight: pickNumber("maxInFlight", o.maxInFlight, base.maxInFlight, isPositiveInteger, "an integer >= 1"),
    };
    return Object.freeze(resolved);
}

/**
 * The fixed mask of a load (spec 7.12; the rule of `layout/src/simulation/fruchterman-reingold.ts:576-606` minus its
 * "previous pins" clause, which ForceSimulation.load() implements by keeping the words on a same-size reload): a
 * string names a bool node column (E_INVALID_ARGUMENT when absent or not bool); a mask is copied; null takes the
 * role-"fixed" bool column when present, else null (leave the words as they are).
 * @param s - the snapshot being loaded
 * @param spec - the resolved `fixed` option
 * @returns the mask words to apply at load, or null
 */
function resolveFixed(s: GraphSnapshot, spec: NodeMask | string | null): NodeMask | null {
    const words = Math.ceil(s.nodeCount / 32);
    if (typeof spec === "string") {
        const column = s.nodes.get(spec);
        if (column === null) {
            throw invalid(
                "fixed",
                spec,
                `the name of a bool node column (the snapshot holds no node column "${spec}")`,
            );
        }
        if (column.dtype !== "bool") {
            throw invalid("fixed", spec, `the name of a bool node column ("${spec}" is ${column.dtype})`);
        }
        return new Uint32Array(column.data.subarray(0, words));
    }
    if (spec !== null) {
        if (spec.length < words) {
            throw invalid("fixed", spec.length, `a mask of at least ${words} words for ${s.nodeCount} nodes`);
        }
        return new Uint32Array(spec.subarray(0, words));
    }
    const byRole = s.nodes.byRole("fixed");
    if (byRole !== null && byRole.dtype === "bool") {
        return new Uint32Array(byRole.data.subarray(0, words));
    }
    return null;
}

// ============================================================ the model

/** Everything bind() produced for one load(): the kernels, their bind groups and the dispatch plans of this n. */
interface BoundModel {
    readonly n: number;
    /** plan1d(n): K2, K3, K5, toScene. */
    readonly plan: DispatchPlan;
    /** plan1d(3n): the fill of force (3 words per node). */
    readonly fillPlan: DispatchPlan;
    readonly k1: Kernel;
    readonly k1Bound: BoundKernel;
    /** The K2 tier dispatches (P4 PD-7); null when arcCount === 0 (K2 is not recorded; the fill below zeroes force instead, spec 7.5). */
    readonly attraction: AttractionBound | null;
    /** K3 and its bind group, or null on the grid tier (P4 PD-18): one tier's kernels compile per load. */
    readonly k3: Kernel | null;
    readonly k3Bound: BoundKernel | null;
    /** The grid-tier stage (G1-G7), or null on the exact tier (P4 PD-18). */
    readonly grid: RepulsionGrid | null;
    readonly k5: Kernel;
    readonly k5Bound: BoundKernel;
    readonly toScene: Kernel;
    readonly toSceneBound: BoundKernel;
    readonly fill: Kernel;
    /** The fill of `force` (arcCount === 0 only). */
    readonly fillForceBound: BoundKernel | null;
}

/** The Fruchterman-Reingold model (spec 7.20: K1 K2 K3 K5 per iteration on the exact tier, K1 K2 G1..G7 K5 on the grid tier; toScene once per batch). Stages: the union list of PD-17. */
export class FruchtermanReingoldModel implements ForceModel<FruchtermanReingoldOptions, FruchtermanReingoldStats> {
    /** The model kind of spec 7.19. */
    readonly kind = "fruchtermanReingold";
    /** The stage names in dispatch order (the `upTo` vocabulary of recordIteration and debugRunStages). */
    readonly stages: typeof FR_STAGES = FR_STAGES;
    /** Fa2Params: the per-iteration uniform block (the simulation writes the shared fields into it). */
    readonly params: UniformBlock = FA2_PARAMS;
    /** Fa2State: the state header block. */
    readonly state: UniformBlock = FA2_STATE;
    /** Fa2Trace: one record per iteration of a batch. */
    readonly trace: UniformBlock = FA2_TRACE;
    /** The resolved GPU-only tuning this model was created with. */
    readonly tuning: ResolvedLayoutTuning;

    /** The option record the model holds: the constructor's record, replaced by onSetParams() ONLY (as FA2's). */
    private current: ResolvedFruchtermanReingoldOptions;
    /** The global iteration index at which the temperature index is 0 (PD-5). */
    private tempOrigin = 0;
    /** Armed by onReheat(); consumed by the next paramsFor(), which re-anchors tempOrigin (PD-5). */
    private pendingReheat = false;
    private resources: ModelResources | null = null;
    private bound: BoundModel | null = null;
    /** The grid of the load inputs() last resolved (null on the exact tier): onLoad() writes its frame, specs() lists its kernels. */
    private nextGrid: GridSpec | null = null;
    /** The K1-K5 compute pass of the batch being recorded, keyed by CommandBatch.id (one pass per batch, contract 4.4). */
    private openPass: { readonly id: number; readonly pass: GPUComputePassEncoder } | null = null;

    /**
     * Creates the model for one simulation.
     * @param tuning - the resolved GPU-only tuning (the tier rule; compat has no effect on this model)
     * @param resolved - the resolved option record at creation
     */
    constructor(tuning: ResolvedLayoutTuning, resolved: ResolvedFruchtermanReingoldOptions) {
        this.tuning = tuning;
        this.current = resolved;
    }

    /**
     * force 12n and oldForce 12n (zeroed; bound and never read, PD-2), the 256-byte FillParams uniform buffer the
     * fill dispatch reads, the 16-byte `hubCounters` K1 binds on every tier (P4 PD-14), and the grid buffers of
     * `RepulsionGrid.buffers` exactly when `tierFor(tuning, n)` is the grid tier (PD-18). n = 0 reports one node's
     * worth of bytes so no zero-length buffer is ever created.
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
            { name: "oldForce", byteLength: bytes, usage, zero: true },
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
     * Mass 1 for every node and no weights (PD-11: FR has no mass and ignores weights), the fixed mask of the
     * `fixed` option applied at load (PD-6). Also remembers the grid of this load (`tierFor(tuning, n)`, spec 7.8)
     * for onLoad() and specs(): the simulation calls inputs() first, then onLoad() before bind().
     * @param s - the snapshot being loaded
     * @param options - the simulation's current option record
     * @returns the per-load inputs
     */
    inputs(s: GraphSnapshot, options: FruchtermanReingoldOptions): ModelInputs {
        const resolved = resolveFruchtermanReingoldOptions(options, this.current);
        // resolve first: a throwing mask resolution leaves the remembered grid of the previous load intact
        const inputs: ModelInputs = {
            mass: new Float32Array(s.nodeCount).fill(1),
            weights: { data: null, source: "none", column: null },
            fixed: resolveFixed(s, resolved.fixed),
        };
        const n = s.nodeCount;
        this.nextGrid = tierFor(this.tuning, n) === "grid" ? gridSpecFor(n, resolved.dim, this.tuning) : null;
        return inputs;
    }

    /**
     * The constant FR override set (PD-1): no option changes a law, so setParams never recompiles.
     * @param _options - an option record (unused: the set is constant)
     * @returns the model's own override set
     */
    overrides(_options: FruchtermanReingoldOptions): Overrides {
        return FR_OVERRIDES;
    }

    /**
     * The six module specs of an override set in dispatch order -- K1, K2, K3, K5, toScene, fill -- each with only the
     * override names its entry declares (K2 also USE_PERM / HAS_WEIGHTS), for warm() and the compile matrix,
     * followed by the grid tier's specs (`RepulsionGrid.specs` under FR_GRID_OVERRIDES) when the load inputs() last
     * resolved is a grid load (the pipeline key carries no geometry).
     * @param overrides - the merged override set (the model's plus USE_PERM / HAS_WEIGHTS)
     * @param _subgroups - accepted for the ForceModel interface and unused (the composer picks the twin from caps)
     * @returns the specs
     */
    specs(overrides: Overrides, _subgroups: boolean): readonly WgslModuleSpec[] {
        const grid = this.nextGrid === null ? [] : RepulsionGrid.specs(FR_GRID_OVERRIDES, this.nextGrid);
        return [
            kernelSpec("fa2-stats-finalize", subset(overrides, K1_DEFAULTS)),
            kernelSpec("fa2-attraction", subset(overrides, K2_DEFAULTS)),
            kernelSpec("fa2-repulsion-exact", subset(overrides, K3_DEFAULTS)),
            kernelSpec("fa2-integrate", subset(overrides, K5_DEFAULTS)),
            kernelSpec("fa2-to-scene"),
            kernelSpec("fill"),
            ...grid,
        ];
    }

    /**
     * Compiles (through the cache) and binds every kernel against the buffers of this load(): K1, K2 over the degree
     * tiers through bindAttraction (or the fill of force when arcCount === 0), K3 on the exact tier or G1-G7 through
     * RepulsionGrid on the grid tier (PD-18), K5, toScene; writes the FillParams { count: 3n, value: 0, mode: 0 }
     * into the model's uniform buffer. With n === 0 nothing is bound. The K2 TIER 1 / 2 pipelines compile on the
     * first load whose degrees need them (P4 PD-7).
     * @param resources - the graph, the shared and model buffers, the ring and the cache
     * @param overrides - the merged override set
     */
    async bind(resources: ModelResources, overrides: Overrides): Promise<void> {
        this.dropBound();
        this.resources = resources;
        const { n, pipelines, caps, core, ring, device } = resources;
        if (n === 0) {
            return;
        }
        const pos = resources.buffer("positions");
        const force = resources.buffer("force");
        const params = ring.binding(FA2_PARAMS);
        const hasArcs = core.colIdx !== null;
        // sequential on purpose: PipelineCache.get compiles inside a validation scope, one stack per device
        const k1 = await pipelines.kernel(kernelSpec("fa2-stats-finalize", subset(overrides, K1_DEFAULTS)));
        const attraction = hasArcs
            ? await bindAttraction(resources, subset(overrides, K2_DEFAULTS), { pos, force, params })
            : null;
        const k3 =
            resources.tier === "grid"
                ? null
                : await pipelines.kernel(kernelSpec("fa2-repulsion-exact", subset(overrides, K3_DEFAULTS)));
        const k5 = await pipelines.kernel(kernelSpec("fa2-integrate", subset(overrides, K5_DEFAULTS)));
        const toScene = await pipelines.kernel(kernelSpec("fa2-to-scene"));
        const fill = await pipelines.kernel(kernelSpec("fill"));
        const grid =
            resources.tier === "grid"
                ? await RepulsionGrid.create(
                      resources,
                      k1.workgroupSize,
                      FR_GRID_OVERRIDES,
                      gridSpecFor(n, resources.dim, this.tuning),
                  )
                : null;
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
        const oldForce = resources.buffer("oldForce");
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
        grid?.bind({
            pos,
            state,
            trace,
            force,
            oldForce,
            fixedMask: fixed,
            partials,
            params,
            cellKey: resources.buffer("cellKey"),
            cellVal: resources.buffer("cellVal"),
            sortedKey: resources.buffer("sortedKey"),
            sortedIdx: resources.buffer("sortedIdx"),
            cellHist: resources.buffer("cellHist"),
            cellStart: resources.buffer("cellStart"),
            hubList: resources.buffer("hubList"),
            hubCounters,
            hubArgs: resources.buffer("hubArgs"),
            pyramid: resources.buffer("pyramid"),
        });
        const wg = k1.workgroupSize;
        this.bound = {
            n,
            plan: plan1d(n, wg, caps),
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
            attraction,
            k3,
            k3Bound: k3?.bind({ pos, S: state, force, oldForce, fixedMask: fixed, partials, P: params }) ?? null,
            grid,
            k5,
            k5Bound: k5.bind({ force, oldForce, fixedMask: fixed, S: state, pos, partials, P: params }),
            toScene,
            toSceneBound: toScene.bind({ pos, scene, P: params }),
            fill,
            fillForceBound: hasArcs ? null : fill.bind({ dst: force, P: fillParams }),
        };
    }

    /**
     * The Fa2Params values of one iteration: the FA2 fields at their neutral values (scalingRatio, gravity and
     * jitterTolerance 0), `frK` = k or 1 / sqrt(n), and this iteration's temperature (PD-5 anchors here). Under
     * `cooling: "adaptive"` the flags carry FA2_FLAG_ADAPTIVE and the kernels take the temperature from the state
     * block instead (K1 updates it, K5 reads it); the uniform's value is then the start temperature and unused. The
     * simulation overwrites the shared fields with the same values and OR-s in its own flags.
     * @param iteration - the GLOBAL iteration index
     * @param options - the simulation's current option record
     * @returns the uniform values
     */
    paramsFor(iteration: number, options: FruchtermanReingoldOptions): UniformValues {
        const { n, core, tiers, tier, dim } = this.requireResources();
        const resolved = resolveFruchtermanReingoldOptions(options, this.current);
        const { nearMax, extentFactor } = this.tuning;
        const adaptive = resolved.cooling === "adaptive";
        const grid = tier === "grid" ? gridSpecFor(n, dim, this.tuning) : null;
        // P4 PD-7: TIER 2 reads [0, hiEnd), TIER 1 [hiEnd, midEnd), TIER 0 [tierStart, tierEnd) = [midEnd, n)
        const so = tiers?.segmentOffsets;
        const hiEnd = so?.[1] ?? 0;
        const midEnd = so?.[2] ?? 0;
        return {
            n,
            dim: resolved.dim,
            flags: adaptive ? FA2_FLAG_ADAPTIVE : 0,
            tierStart: midEnd,
            tierEnd: n,
            iterationIndex: iteration,
            seed: seedWord(resolved.seed),
            nearMax,
            scalingRatio: 0,
            gravity: 0,
            jitterTolerance: 0,
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
            frK: resolved.k ?? 1 / Math.sqrt(n),
            temperature: adaptive ? FR_START_TEMPERATURE : this.temperatureAt(iteration, resolved),
        };
    }

    /**
     * Records one iteration into the batch, stopping after stage `upTo` when given (PD-17: `upTo` names a position
     * in the union list and the recording stops after the last stage recorded at or before it, so "K3" on the grid
     * tier stops after K2 and "G5" on the exact tier after K3). The exact tier: K1, K2 (or the fill of force when
     * arcCount === 0), K3, K5 in the batch's ONE compute pass (opened by the first call of a batch and reused by
     * every later call with the same batch.id), then toScene in a second pass that ends it. The grid tier (PD-16):
     * the passes `fr-k1` (K1), `fr-attraction` (K2's tiers) and `fr-grid` (G1-G7, K5) per iteration, then
     * `fa2-to-scene`. With n === 0 nothing is recorded; a call before bind() completed is E_NOT_LOADED (never a
     * silent no-op).
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
                "the Fruchterman-Reingold model is not bound (bind() has not completed)",
                { state: "loaded" },
            );
        }
        const offset = resources.ring.offsetOf(slot);
        if (tier === "grid") {
            this.recordGridIteration(batch, bound, offset, stop);
            return;
        }
        const { k3, k3Bound } = bound;
        if (k3 === null || k3Bound === null) {
            throw new WebGpuGraphError("E_NOT_LOADED", "the Fruchterman-Reingold model was bound on the grid tier", {
                state: "loaded",
            });
        }
        const pass = this.openPass !== null && this.openPass.id === batch.id ? this.openPass.pass : batch.pass("fr");
        this.openPass = { id: batch.id, pass };
        bound.k1.dispatch(pass, bound.k1Bound, ONE_WORKGROUP, [offset]);
        if (stop < 1) {
            return;
        }
        this.recordK2(pass, bound, offset);
        if (stop < 2) {
            return;
        }
        k3.dispatch(pass, k3Bound, bound.plan, [offset]);
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
     * The grid tier's iteration (PD-16): three compute passes before toScene; no K4.
     * @param batch - the batch being recorded
     * @param bound - the bound model
     * @param offset - the Fa2Params dynamic offset of the iteration
     * @param stop - the FR_STAGES index to stop after
     */
    private recordGridIteration(batch: CommandBatch, bound: BoundModel, offset: number, stop: number): void {
        const { grid } = bound;
        if (grid === null) {
            throw new WebGpuGraphError("E_NOT_LOADED", "the Fruchterman-Reingold model was bound on the exact tier", {
                state: "loaded",
            });
        }
        this.openPass = null;
        bound.k1.dispatch(batch.pass("fr-k1"), bound.k1Bound, ONE_WORKGROUP, [offset]);
        if (stop < 1) {
            return;
        }
        this.recordK2(batch.pass("fr-attraction"), bound, offset);
        if (stop < STAGE_G1) {
            return;
        }
        const pass = batch.pass("fr-grid");
        const gridStop = stop < STAGE_K4 ? (FR_STAGES[stop] as GridStage) : undefined;
        grid.recordRepulsion(pass, bound.n, offset, gridStop);
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
     * K2's tier dispatches, or the fill of force when the graph has no arcs (spec 7.5).
     * @param pass - the open compute pass
     * @param bound - the bound model
     * @param offset - the Fa2Params dynamic offset
     */
    private recordK2(pass: GPUComputePassEncoder, bound: BoundModel, offset: number): void {
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
    private recordToScene(batch: CommandBatch, bound: BoundModel, offset: number): void {
        this.openPass = null;
        const scenePass = batch.pass("fa2-to-scene");
        bound.toScene.dispatch(scenePass, bound.toSceneBound, bound.plan, [offset]);
    }

    /**
     * temperature = 0.1 (what stats reads before the first batch lands), kineticEnergy = 0; the temperature index
     * restarts at 0 (PD-5). On a grid load the frame of the first build (K1 folds nothing on the first iteration).
     * @param state - the state writer of the simulation
     */
    onLoad(state: StateWriter): void {
        this.resetAdaptive(state);
        state.set("kineticEnergy", 0);
        this.tempOrigin = 0;
        this.pendingReheat = false;
        if (this.nextGrid !== null) {
            writeGridFrame(state, this.nextGrid, this.tuning.extentFactor);
        }
    }

    /**
     * temperature = 0.1, the adaptive controller's energy = +infinity (the first fold always counts as a fall) and
     * its progress counter = 0: the state K1 reads under `cooling: "adaptive"`, and what stats reads before the first
     * batch lands under either schedule.
     * @param state - the state writer of the simulation
     */
    private resetAdaptive(state: StateWriter): void {
        state.set("temperature", FR_START_TEMPERATURE);
        state.set("frEnergy", Number.POSITIVE_INFINITY);
        state.set("frProgress", 0);
    }

    /**
     * Arms the re-anchoring of the temperature index at floor(0.7 * iterations), placed by the next paramsFor (PD-5);
     * under `cooling: "adaptive"` restarts the controller at the start temperature instead.
     * @param state - the state writer of the simulation
     */
    onReheat(state: StateWriter): void {
        this.pendingReheat = true;
        if (this.current.cooling === "adaptive") {
            this.resetAdaptive(state);
        }
    }

    /**
     * Replaces the record (a new k or budget takes effect at the next paramsFor: a new dt, a new frK; no recompile).
     * The PD-16 `fixed` check already ran in the simulation's resolve callback.
     * @param patch - the setParams patch
     * @param _state - the state writer of the simulation (nothing to write)
     */
    onSetParams(patch: Partial<FruchtermanReingoldOptions>, _state: StateWriter): void {
        this.current = resolveFruchtermanReingoldOptions(patch, this.current);
    }

    /**
     * Decodes the state header and the k trace records of a completed batch into FruchtermanReingoldStats:
     * `repulsionTier` is the bound tier, the grid fields are the header's on the grid tier and null on the exact
     * tier, msPerIteration null (the simulation owns the clock), the temperature K1 wrote.
     * @param state - a DataView over the 256-byte state header
     * @param trace - a DataView over the k Fa2Trace records of the batch
     * @returns the stats
     */
    readStats(state: DataView, trace: DataView): FruchtermanReingoldStats {
        const header = FA2_STATE.read(state);
        const centroid = vector(header, "centroid");
        const records: FruchtermanReingoldTraceRecord[] = [];
        const count = Math.floor(trace.byteLength / TRACE_RECORD_BYTES);
        for (let i = 0; i < count; i++) {
            const record = FA2_TRACE.read(trace, i * TRACE_RECORD_BYTES);
            records.push({
                temperature: scalar(record, "modelScalar"),
                meanDisplacement: scalar(record, "meanDisplacement"),
                settledCount: scalar(record, "settledCount"),
            });
        }
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
            temperature: scalar(header, "temperature"),
            trace: records,
        };
    }

    /**
     * The temperature of a global iteration (PD-5): a pending reheat re-anchors tempOrigin so this iteration's
     * temperature index is floor(0.7 * iterations); then max(0, 0.1 - dt * index), dt = 0.1 / (iterations + 1).
     * @param global - the global iteration index
     * @param resolved - the current record
     * @returns the temperature (f64; the uniform slot rounds it to f32)
     */
    private temperatureAt(global: number, resolved: ResolvedFruchtermanReingoldOptions): number {
        if (this.pendingReheat) {
            this.tempOrigin = global - Math.floor(FR_REHEAT_FRACTION * resolved.iterations);
            this.pendingReheat = false;
        }
        const dt = FR_START_TEMPERATURE / (resolved.iterations + 1);
        return Math.max(0, FR_START_TEMPERATURE - dt * (global - this.tempOrigin));
    }

    /**
     * The resources of the last bind(), or E_NOT_LOADED before it.
     * @returns the resources
     */
    private requireResources(): ModelResources {
        if (this.resources === null) {
            throw new WebGpuGraphError(
                "E_NOT_LOADED",
                "the Fruchterman-Reingold model has not been bound (load() first)",
                { state: "created" },
            );
        }
        return this.resources;
    }

    /**
     * The index of a stage name in FR_STAGES, or E_INVALID_ARGUMENT.
     * @param upTo - the stage name
     * @returns its index
     */
    private stageIndex(upTo: string): number {
        for (let i = 0; i < FR_STAGES.length; i++) {
            if (FR_STAGES[i] === upTo) {
                return i;
            }
        }
        throw invalid("upTo", upTo, FR_STAGES.join(" | "));
    }

    /** Releases the grid stage's lease and the bind groups (the simulation calls it from dispose() once every in-flight batch has settled). */
    dispose(): void {
        this.dropBound();
    }

    /** Drops the bind groups of the previous bind() (the buffers changed), releases the grid stage's lease and forgets the pass of a batch recorded before the rebind. */
    private dropBound(): void {
        this.openPass = null;
        const { bound } = this;
        if (bound === null) {
            return;
        }
        for (const kernel of [bound.k1, bound.k5, bound.toScene, bound.fill]) {
            kernel.invalidate();
        }
        bound.k3?.invalidate();
        for (const [kernel] of bound.attraction?.kernels ?? []) {
            kernel.invalidate();
        }
        bound.grid?.dispose();
        this.bound = null;
    }
}

// ============================================================ the factory

/**
 * The resolve callback of the simulation's setParams: the PD-16 `fixed` check first (fixed is applied at load; a
 * rejected patch leaves the simulation unchanged because ForceSimulation.setParams runs this before any state moves),
 * then the patch over the current record, re-validated.
 * @param patch - the setParams patch
 * @param current - the simulation's current option record
 * @returns the new record
 */
function resolvePatch(
    patch: Partial<FruchtermanReingoldOptions>,
    current: FruchtermanReingoldOptions,
): FruchtermanReingoldOptions {
    if ("fixed" in patch) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", "setParams({ fixed }) is not a live option (spec 7.12)", {
            argument: "fixed",
            value: patch.fixed,
            expected: "absent",
            hint: "use setFixed(mask); fixed is applied at load()",
        });
    }
    return resolveFruchtermanReingoldOptions(patch, resolveFruchtermanReingoldOptions(current));
}

/**
 * Spec 3.3 createFruchtermanReingold, verbatim: a GpuLayoutSimulation running Fruchterman-Reingold on the exact or
 * the grid repulsion tier (spec 7.8) with the option defaults of spec 7.20 and the GPU-only tuning of GpuLayoutTuning.
 * @param ctx - the context (E_DISPOSED / E_DEVICE_LOST through assertReady)
 * @param options - the Fruchterman-Reingold options and the GPU-only tuning knobs in one record
 * @returns the simulation in state "created"; load() next
 */
export function createFruchtermanReingold(
    ctx: GpuContext,
    options?: FruchtermanReingoldOptions & GpuLayoutTuning,
): GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats> {
    ctx.assertReady();
    const resolved = resolveFruchtermanReingoldOptions(options);
    const tuning = resolveLayoutTuning(options);
    const model = new FruchtermanReingoldModel(tuning, resolved);
    return new ForceSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>(
        ctx,
        model,
        resolved,
        tuning,
        resolvePatch,
    );
}
