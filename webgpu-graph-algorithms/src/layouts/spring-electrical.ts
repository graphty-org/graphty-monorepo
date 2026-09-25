/**
 * The spring-electrical preset on the exact or the grid repulsion tier (spec 7.20 "the preset", 7.8; contract 3.13):
 * ngraph.forcelayout's physics under ngraph's option names and defaults -- Coulomb repulsion `-g m_i m_j / d^2` (K3,
 * LAW 2; G6 / G7 with LAW 2 on the grid tier, P4-T13), Hooke springs
 * `k_s (d - L)` (K2, LAW 2), drag and the semi-implicit Euler step with the unit speed clamp over a per-node velocity
 * (K5, APPLY 2), the kinetic energy folded into the trace (K1, STATS_MODE 2; PD-4) -- as the ForceModel that
 * ForceSimulation drives over the four FA2 kernels K1 K2 K3 K5 per iteration and toScene per batch. No K4: there is no
 * speed controller. The velocity is the model's `velocity` buffer bound into the `oldForce` slot of K3 and K5 (PD-2),
 * left alone by the FA2 text because the model compiles `SWING_MODE = 1` (PD-20). Mass is `1 + degree / 3` and the
 * weights are ignored (PD-11); `SpringElectricalOptions.gravity` is ngraph's Coulomb constant, written into
 * `Fa2Params.coulomb` while FA2's centre gravity is 0 (PD-12). Settlement is the shared rule of spec 7.17
 * (DEP-P5-A); `reheat()` leaves the velocities alone (ngraph has no reheat).
 *
 * Model decisions this file shares with forceatlas2.ts: on the exact tier the K1-K5 dispatches of one batch share ONE
 * compute pass and toScene runs in a second pass that ends it; the fill kernel takes its FillParams from a model-owned
 * 256-byte uniform buffer. The grid tier (P4-T13, PD-22) is FA2's: `RepulsionGrid` with `LAW` 2 when `tierFor(tuning,
 * n)` says so (PD-18), the grid buffers from `buffers()`, K1's grid block under `gridMax > 0` (PD-14) over the model's
 * own `hubCounters`, the three passes `se-k1` / `se-attraction` / `se-grid` before `se-to-scene` (PD-16), and the
 * union stage list (PD-17; K4 is never recorded).
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import {
    MAX_ITERATIONS_PER_STEP,
    SE_DEFAULTS,
    SE_SCALE_REFERENCE_NODES,
    SETTLE_FLOOR_FRACTION,
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
    type GpuLayoutSimulation,
    type GpuLayoutTuning,
    type ResolvedLayoutTuning,
    type SpringElectricalStats,
    type SpringElectricalTraceRecord,
} from "../types/layout.js";
import { type Binding } from "../types/memory.js";
import { type ResolvedSpringElectricalOptions, type SpringElectricalOptions } from "../types/options.js";
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
import { recordExactRepulsion } from "./repulsion-exact.js";
import { type GridStage, RepulsionGrid, type RepulsionGridOverrides } from "./repulsion-grid.js";

// ============================================================ constants

/** The stage names of both tiers in dispatch order plus the per-batch toScene (spec 7.20; P4 PD-17: the union list; the exact tier records K1 K2 K3 K5, the grid tier K1 K2 G1..G7 K5, K4 never). */
const SE_STAGES = ["K1", "K2", "K3", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "K4", "K5", "toScene"] as const;

/** The SE_STAGES index of the first grid stage, of K4, of K5 and of toScene. */
const STAGE_G1 = 3;
const STAGE_K4 = 10;
const STAGE_K5 = 11;
const STAGE_TO_SCENE = 12;

/** The name of the model-owned hub-counter buffer K1 binds on every tier (P4 PD-14). */
const HUB_COUNTERS_BUFFER = "hubCounters";

/** The one-workgroup dispatch of K1. */
const ONE_WORKGROUP: DispatchPlan = { x: 1, y: 1, z: 1, items: 1, stride: null };

/** The model's constant override set (PD-1, PD-20): the spring / coulomb laws, ngraph's Euler step, the kinetic-energy statistic, SWING_MODE 1 so the FA2 text never touches the oldForce slot. */
const SE_OVERRIDES: Overrides = Object.freeze({
    LINLOG: false,
    DISTRIBUTED: false,
    TIER: 0,
    SWING_MODE: 1,
    STRONG_GRAVITY: false,
    GRAVITY_CENTER: 0,
    LAW: 2,
    APPLY: 2,
    STATS_MODE: 2,
});

/** The grid stage's override set (G6 / G7 / K4; P4-T13, PD-22): K3's constant three and the coulomb law. */
const SE_GRID_OVERRIDES: RepulsionGridOverrides = Object.freeze({
    SWING_MODE: 1,
    STRONG_GRAVITY: false,
    GRAVITY_CENTER: 0,
    LAW: 2,
});

/** Every override K1 accepts, with its default. */
const K1_DEFAULTS: Overrides = { STATS_MODE: 0 };

/** Every override K2 accepts, with its default (plus the two standard graph overrides). */
const K2_DEFAULTS: Overrides = {
    LINLOG: false,
    DISTRIBUTED: false,
    TIER: 0,
    USE_PERM: false,
    HAS_WEIGHTS: false,
    LAW: 0,
};

/** Every override K3 accepts, with its default. */
const K3_DEFAULTS: Overrides = { SWING_MODE: 0, STRONG_GRAVITY: false, GRAVITY_CENTER: 0, LAW: 0 };

/** Every override K5 accepts, with its default. */
const K5_DEFAULTS: Overrides = { SWING_MODE: 0, APPLY: 0 };

/** The name of the model's velocity buffer (bound into the `oldForce` slot of K3 / K5, PD-2). */
const VELOCITY_BUFFER = "velocity";

/** The resolved record with no option given: SE_DEFAULTS plus the origin centre and the null seed; the two force constants null = size-scaled at load. */
const DEFAULT_RESOLVED: ResolvedSpringElectricalOptions = Object.freeze<ResolvedSpringElectricalOptions>({
    ...SE_DEFAULTS,
    gravity: null,
    springCoefficient: null,
    center: [0, 0, 0],
    seed: null,
});

/**
 * The size factor of the default force constants: 1 up to SE_SCALE_REFERENCE_NODES nodes (ngraph's constants as
 * they are), then SE_SCALE_REFERENCE_NODES / n, so the per-node force stays at the level ngraph's constants were
 * tuned for instead of pinning every node at the unit speed clamp.
 * @param n - the node count
 * @returns the factor in (0, 1]
 */
export function springSizeFactor(n: number): number {
    return Math.min(1, SE_SCALE_REFERENCE_NODES / Math.max(1, n));
}

/**
 * An optional force constant: undefined keeps the fallback; null means the size-scaled default; else a finite number
 * passing `ok`.
 * @param name - the option name
 * @param given - the value given
 * @param fallback - the previous record's value or the default
 * @param ok - the range predicate
 * @param range - the range text of the error
 * @returns the number or null
 */
function pickNullable(
    name: string,
    given: unknown,
    fallback: number | null,
    ok: (v: number) => boolean,
    range: string,
): number | null {
    if (given === undefined) {
        return fallback;
    }
    if (given === null) {
        return null;
    }
    return pickNumber(name, given as number | undefined, 1, ok, `${range} or null`);
}

// ============================================================ the resolver

/**
 * Applies SE_DEFAULTS to the option record; validates ranges (spec 7.20; ngraph's constraints): `springLength` > 0,
 * `springCoefficient` > 0, `dragCoefficient` >= 0, `timeStep` > 0, `gravity` any finite number (negative repels; ngraph's
 * comment: "if you make it positive nodes start attract each other"). `gravity` and `springCoefficient` left out (or
 * null) resolve to null: ngraph's constant times springSizeFactor(n), applied in paramsFor once n is known. With `previous` the record is a PATCH over it and
 * `maxInFlight` may not change (the uniform ring is sized by it at construction).
 * @param options - the caller's options (or a setParams patch)
 * @param previous - the current resolved record when resolving a patch
 * @returns the frozen resolved record
 */
export function resolveSpringElectricalOptions(
    options: SpringElectricalOptions | undefined,
    previous?: ResolvedSpringElectricalOptions,
): ResolvedSpringElectricalOptions {
    const o: SpringElectricalOptions = options ?? {};
    const base = previous ?? DEFAULT_RESOLVED;
    if (previous !== undefined && o.maxInFlight !== undefined && o.maxInFlight !== previous.maxInFlight) {
        throw new WebGpuGraphError(
            "E_INVALID_ARGUMENT",
            `maxInFlight cannot change after creation (the uniform ring is sized by it): got ${describeValue(o.maxInFlight)}, current ${previous.maxInFlight}`,
            { argument: "maxInFlight", value: o.maxInFlight, expected: previous.maxInFlight },
        );
    }
    const resolved: ResolvedSpringElectricalOptions = {
        springLength: pickNumber("springLength", o.springLength, base.springLength, (v) => v > 0, "> 0"),
        springCoefficient: pickNullable(
            "springCoefficient",
            o.springCoefficient,
            base.springCoefficient,
            (v) => v > 0,
            "> 0",
        ),
        gravity: pickNullable("gravity", o.gravity, base.gravity, () => true, "a finite number (negative repels)"),
        dragCoefficient: pickNumber("dragCoefficient", o.dragCoefficient, base.dragCoefficient, (v) => v >= 0, ">= 0"),
        timeStep: pickNumber("timeStep", o.timeStep, base.timeStep, (v) => v > 0, "> 0"),
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

// ============================================================ the model

/** Everything bind() produced for one load(): the kernels, their bind groups and the dispatch plans of this n. */
interface BoundModel {
    readonly n: number;
    /** plan1d(n): K2, K3, K5, toScene. */
    readonly plan: DispatchPlan;
    /** plan1d(3n): the fill of force (arcCount === 0 only). */
    readonly fillPlan: DispatchPlan;
    readonly k1: Kernel;
    readonly k1Bound: BoundKernel;
    /** The K2 tier dispatches (P4 PD-7); null when arcCount === 0 (K2 is not recorded; the fill below zeroes force instead). */
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

/**
 * The mass of the preset: `1 + degree / 3` per node (ngraph index.js:391-395; the undirected snapshot's outDegree is
 * the degree), as the Float32Array the simulation packs into pos.w.
 * @param s - the snapshot
 * @returns n masses
 */
function massOf(s: GraphSnapshot): Float32Array<ArrayBuffer> {
    const degree = s.outDegree();
    const out = new Float32Array(s.nodeCount);
    for (let i = 0; i < s.nodeCount; i++) {
        out[i] = 1 + degree[i] / 3;
    }
    return out;
}

/** The spring-electrical model (spec 7.20: K1 K2 K3 K5 per iteration on the exact tier, K1 K2 G1..G7 K5 on the grid tier; toScene once per batch). Stages: the union list of PD-17. */
export class SpringElectricalModel implements ForceModel<SpringElectricalOptions, SpringElectricalStats> {
    /** The model kind of spec 7.19. */
    readonly kind = "springElectrical";
    /** The stage names in dispatch order (the `upTo` vocabulary of recordIteration and debugRunStages). */
    readonly stages: typeof SE_STAGES = SE_STAGES;
    /** Fa2Params: the per-iteration uniform block (the simulation writes the shared fields into it). */
    readonly params: UniformBlock = FA2_PARAMS;
    /** Fa2State: the state header block. */
    readonly state: UniformBlock = FA2_STATE;
    /** Fa2Trace: one record per iteration of a batch. */
    readonly trace: UniformBlock = FA2_TRACE;
    /** The resolved GPU-only tuning this model was created with (only `repulsion` / `exactMaxNodes` / `nearMax` / `extentFactor` matter here). */
    readonly tuning: ResolvedLayoutTuning;

    /** The option record the model holds: the constructor's record, replaced by onSetParams() ONLY (the query hooks never assign it). */
    private current: ResolvedSpringElectricalOptions;
    /** The resources of the last bind(), or null before the first. */
    private resources: ModelResources | null = null;
    /** The kernels and bind groups of the last bind(), or null before it (and for n === 0). */
    private bound: BoundModel | null = null;
    /** The grid of the load inputs() last resolved (null on the exact tier): onLoad() writes its frame, specs() lists its kernels. */
    private nextGrid: GridSpec | null = null;
    /** The K1-K5 compute pass of the batch being recorded, keyed by CommandBatch.id; null between batches. */
    private openPass: { readonly id: number; readonly pass: GPUComputePassEncoder } | null = null;

    /**
     * Creates the model for one simulation.
     * @param tuning - the resolved GPU-only tuning
     * @param resolved - the resolved option record at creation
     */
    constructor(tuning: ResolvedLayoutTuning, resolved: ResolvedSpringElectricalOptions) {
        this.tuning = tuning;
        this.current = resolved;
    }

    /**
     * force 12n (zeroed), velocity 12n (zeroed: every load() starts at rest, `allocate()` / `clearKept()` honour
     * `zero`), the 256-byte FillParams uniform buffer, the 16-byte `hubCounters` K1 binds on every tier (P4 PD-14),
     * and the grid buffers of `RepulsionGrid.buffers` exactly when `tierFor(tuning, n)` is the grid tier (PD-18).
     * n = 0 reports one node's worth of bytes so no zero-length buffer is ever created.
     * @param n - the node count
     * @param dim - the layout dimension (the arrays are stride 3 in both; the grid's geometry differs)
     * @returns the model-owned buffer specs
     */
    buffers(n: number, dim: 2 | 3): readonly BufferSpec[] {
        const bytes = Math.max(1, n) * FORCE_BYTES_PER_NODE;
        const usage = BufferUsage.STORAGE | BufferUsage.COPY_SRC | BufferUsage.COPY_DST;
        const grid =
            tierFor(this.tuning, n) === "grid" ? RepulsionGrid.buffers(n, gridSpecFor(n, dim, this.tuning)) : [];
        return [
            { name: "force", byteLength: bytes, usage, zero: true },
            { name: VELOCITY_BUFFER, byteLength: bytes, usage, zero: true },
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
     * { mass: 1 + degree / 3, weights: none } (PD-11): the preset has no mass or weight option, and K2 compiles
     * HAS_WEIGHTS = false. No `fixed` (setFixed is the live API). Also remembers the grid of this load
     * (`tierFor(tuning, n)`, spec 7.8) for onLoad() and specs(): the simulation calls inputs() first, then onLoad()
     * before bind().
     * @param s - the snapshot being loaded
     * @param options - the simulation's current option record (its dimension picks the grid's geometry)
     * @returns the per-load inputs
     */
    inputs(s: GraphSnapshot, options: SpringElectricalOptions): ModelInputs {
        const { dim } = resolveSpringElectricalOptions(options, this.current);
        const n = s.nodeCount;
        this.nextGrid = tierFor(this.tuning, n) === "grid" ? gridSpecFor(n, dim, this.tuning) : null;
        return { mass: massOf(s), weights: { data: null, source: "none", column: null } };
    }

    /**
     * The constant SE_OVERRIDES (PD-1): no option changes a law, so setParams never recompiles.
     * @param _options - an option record (unused)
     * @returns the model's own override set
     */
    overrides(_options: SpringElectricalOptions): Overrides {
        return SE_OVERRIDES;
    }

    /**
     * The six module specs of an override set in dispatch order -- K1, K2, K3, K5, toScene, fill -- each with only the
     * override names its entry declares (K2 also USE_PERM / HAS_WEIGHTS), for warm() and the compile matrix,
     * followed by the grid tier's specs (`RepulsionGrid.specs` under SE_GRID_OVERRIDES) when the load inputs() last
     * resolved is a grid load (the pipeline key carries no geometry).
     * @param overrides - the merged override set (the model's plus USE_PERM / HAS_WEIGHTS)
     * @param _subgroups - accepted for the ForceModel interface and unused (the composer picks the twin from caps)
     * @returns the specs
     */
    specs(overrides: Overrides, _subgroups: boolean): readonly WgslModuleSpec[] {
        const grid = this.nextGrid === null ? [] : RepulsionGrid.specs(SE_GRID_OVERRIDES, this.nextGrid);
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
     * RepulsionGrid on the grid tier (PD-18), K5, with the velocity in the `oldForce` slot of K3 / G7 / K5 (PD-2),
     * toScene; writes the FillParams { count: 3n, value: 0, mode: 0 } into the model's uniform buffer. With n === 0
     * nothing is bound. The K2 TIER 1 / 2 pipelines compile on the first load whose degrees need them (P4 PD-7).
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
        const [k1, k5, toScene, fill] = await Promise.all([
            pipelines.kernel(kernelSpec("fa2-stats-finalize", subset(overrides, K1_DEFAULTS))),
            pipelines.kernel(kernelSpec("fa2-integrate", subset(overrides, K5_DEFAULTS))),
            pipelines.kernel(kernelSpec("fa2-to-scene")),
            pipelines.kernel(kernelSpec("fill")),
        ]);
        const k3 =
            resources.tier === "grid"
                ? null
                : await pipelines.kernel(kernelSpec("fa2-repulsion-exact", subset(overrides, K3_DEFAULTS)));
        const attraction = hasArcs
            ? await bindAttraction(resources, subset(overrides, K2_DEFAULTS), { pos, force, params })
            : null;
        const grid =
            resources.tier === "grid"
                ? await RepulsionGrid.create(
                      resources,
                      k1.workgroupSize,
                      SE_GRID_OVERRIDES,
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
        const velocity = resources.buffer(VELOCITY_BUFFER);
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
            oldForce: velocity,
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
            k3Bound:
                k3?.bind({ pos, S: state, force, oldForce: velocity, fixedMask: fixed, partials, P: params }) ?? null,
            grid,
            k5,
            k5Bound: k5.bind({ force, oldForce: velocity, fixedMask: fixed, S: state, pos, partials, P: params }),
            toScene,
            toSceneBound: toScene.bind({ pos, scene, P: params }),
            fill,
            fillForceBound: hasArcs ? null : fill.bind({ dst: force, P: fillParams }),
        };
    }

    /**
     * The Fa2Params values of one iteration: the shared fields, the FA2 fields at 0 (no centre gravity, PD-12; no
     * FR temperature) and ngraph's five constants with `gravity` in `coulomb`.
     * @param iteration - the global iteration index
     * @param options - the simulation's current option record
     * @returns the uniform values
     */
    paramsFor(iteration: number, options: SpringElectricalOptions): UniformValues {
        const { n, core, tiers, tier, dim } = this.requireResources();
        const resolved = resolveSpringElectricalOptions(options, this.current);
        const { nearMax, extentFactor } = this.tuning;
        const grid = tier === "grid" ? gridSpecFor(n, dim, this.tuning) : null;
        // P4 PD-7: TIER 2 reads [0, hiEnd), TIER 1 [hiEnd, midEnd), TIER 0 [tierStart, tierEnd) = [midEnd, n)
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
            frK: 0,
            temperature: 0,
            springLength: resolved.springLength,
            settleFloor: SETTLE_FLOOR_FRACTION.springElectrical * resolved.springLength,
            springCoefficient: resolved.springCoefficient ?? SE_DEFAULTS.springCoefficient * springSizeFactor(n),
            coulomb: resolved.gravity ?? SE_DEFAULTS.gravity * springSizeFactor(n),
            dragCoefficient: resolved.dragCoefficient,
            timeStep: resolved.timeStep,
        };
    }

    /**
     * Records one iteration into the batch, stopping after stage `upTo` when given (PD-17: `upTo` names a position
     * in the union list and the recording stops after the last stage recorded at or before it, so "K3" on the grid
     * tier stops after K2 and "G5" on the exact tier after K3). The exact tier: K1, K2 (or the fill of force when
     * arcCount === 0), K3, K5 in the batch's ONE compute pass, then toScene in a second pass that ends it. The grid
     * tier (PD-16): the passes `se-k1` (K1), `se-attraction` (K2's tiers) and `se-grid` (G1-G7, K5) per iteration,
     * then `se-to-scene`. With n === 0 nothing is recorded; a call before bind() completed is E_NOT_LOADED.
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
                "the spring-electrical model is not bound (bind() has not completed)",
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
            throw new WebGpuGraphError("E_NOT_LOADED", "the spring-electrical model was bound on the grid tier", {
                state: "loaded",
            });
        }
        const pass = this.openPass !== null && this.openPass.id === batch.id ? this.openPass.pass : batch.pass("se");
        this.openPass = { id: batch.id, pass };
        bound.k1.dispatch(pass, bound.k1Bound, ONE_WORKGROUP, [offset]);
        if (stop < 1) {
            return;
        }
        this.recordK2(pass, bound, offset);
        if (stop < 2) {
            return;
        }
        recordExactRepulsion(k3, pass, k3Bound, bound.plan, bound.n, offset);
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
     * @param stop - the SE_STAGES index to stop after
     */
    private recordGridIteration(batch: CommandBatch, bound: BoundModel, offset: number, stop: number): void {
        const { grid } = bound;
        if (grid === null) {
            throw new WebGpuGraphError("E_NOT_LOADED", "the spring-electrical model was bound on the exact tier", {
                state: "loaded",
            });
        }
        this.openPass = null;
        bound.k1.dispatch(batch.pass("se-k1"), bound.k1Bound, ONE_WORKGROUP, [offset]);
        if (stop < 1) {
            return;
        }
        this.recordK2(batch.pass("se-attraction"), bound, offset);
        if (stop < STAGE_G1) {
            return;
        }
        const pass = batch.pass("se-grid");
        const gridStop = stop < STAGE_K4 ? (SE_STAGES[stop] as GridStage) : undefined;
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
        const scenePass = batch.pass("se-to-scene");
        bound.toScene.dispatch(scenePass, bound.toSceneBound, bound.plan, [offset]);
    }

    /**
     * kineticEnergy = 0 and temperature = 0 in the header (the velocities start at 0 through the buffer's `zero`);
     * on a grid load the frame of the first build (K1 folds nothing on the first iteration).
     * @param state - the state writer of the simulation
     */
    onLoad(state: StateWriter): void {
        state.set("kineticEnergy", 0);
        state.set("temperature", 0);
        if (this.nextGrid !== null) {
            writeGridFrame(state, this.nextGrid, this.tuning.extentFactor);
        }
    }

    /**
     * Nothing: the velocities carry on (ngraph has no reheat; a drag lands in the next batch through the override
     * list, spec 7.12).
     * @param _state - the state writer of the simulation (unused)
     */
    onReheat(_state: StateWriter): void {
        // intentionally empty (D8; DEP-P5-A)
    }

    /**
     * Replaces the record with the patch applied (every option is a numeric tweak; nothing recompiles, no reset).
     * @param patch - the setParams patch
     * @param _state - the state writer of the simulation (unused)
     */
    onSetParams(patch: Partial<SpringElectricalOptions>, _state: StateWriter): void {
        this.current = resolveSpringElectricalOptions(patch, this.current);
    }

    /**
     * Decodes the state header and the k trace records of a completed batch into SpringElectricalStats:
     * `repulsionTier` is the bound tier, the grid fields are the header's on the grid tier and null on the exact
     * tier; msPerIteration null (the simulation owns the clock); `kineticEnergy` is the last folded value (one
     * iteration behind the last integrate, PD-4).
     * @param state - a DataView over the 256-byte state header
     * @param trace - a DataView over the k Fa2Trace records of the batch
     * @returns the stats
     */
    readStats(state: DataView, trace: DataView): SpringElectricalStats {
        const header = FA2_STATE.read(state);
        const centroid = vector(header, "centroid");
        const records: SpringElectricalTraceRecord[] = [];
        const count = Math.floor(trace.byteLength / TRACE_RECORD_BYTES);
        for (let i = 0; i < count; i++) {
            const record = FA2_TRACE.read(trace, i * TRACE_RECORD_BYTES);
            records.push({
                kineticEnergy: scalar(record, "modelScalar"),
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
            kineticEnergy: scalar(header, "kineticEnergy"),
            trace: records,
        };
    }

    /**
     * The resources of the last bind(), or E_NOT_LOADED before it.
     * @returns the resources
     */
    private requireResources(): ModelResources {
        if (this.resources === null) {
            throw new WebGpuGraphError(
                "E_NOT_LOADED",
                "the spring-electrical model has not been bound (load() first)",
                { state: "created" },
            );
        }
        return this.resources;
    }

    /**
     * The index of a stage name in SE_STAGES, or E_INVALID_ARGUMENT.
     * @param upTo - the stage name
     * @returns its index
     */
    private stageIndex(upTo: string): number {
        for (let i = 0; i < SE_STAGES.length; i++) {
            if (SE_STAGES[i] === upTo) {
                return i;
            }
        }
        throw invalid("upTo", upTo, SE_STAGES.join(" | "));
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
 * The resolve callback of the simulation's setParams: the patch over the current record, re-validated.
 * @param patch - the setParams patch
 * @param current - the simulation's current option record
 * @returns the new record
 */
function resolvePatch(
    patch: Partial<SpringElectricalOptions>,
    current: SpringElectricalOptions,
): SpringElectricalOptions {
    return resolveSpringElectricalOptions(patch, resolveSpringElectricalOptions(current));
}

/**
 * Spec 3.3 createSpringElectrical, verbatim: a GpuLayoutSimulation running ngraph's spring-electrical model on the
 * exact or the grid repulsion tier (spec 7.8) with ngraph's defaults (spec 7.20) and the GPU-only tuning of
 * GpuLayoutTuning.
 * @param ctx - the context (E_DISPOSED / E_DEVICE_LOST through assertReady)
 * @param options - the spring-electrical options and the GPU-only tuning knobs in one record
 * @returns the simulation in state "created"; load() next
 */
export function createSpringElectrical(
    ctx: GpuContext,
    options?: SpringElectricalOptions & GpuLayoutTuning,
): GpuLayoutSimulation<SpringElectricalOptions, SpringElectricalStats> {
    ctx.assertReady();
    const resolved = resolveSpringElectricalOptions(options);
    const tuning = resolveLayoutTuning(options);
    const model = new SpringElectricalModel(tuning, resolved);
    return new ForceSimulation<SpringElectricalOptions, SpringElectricalStats>(
        ctx,
        model,
        resolved,
        tuning,
        resolvePatch,
    );
}
