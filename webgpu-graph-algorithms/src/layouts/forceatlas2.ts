/**
 * ForceAtlas2 on the exact repulsion tier (spec 7.1-7.18; contract 3.13): the ForceModel that ForceSimulation
 * drives -- the K1 K2 K3 K4 K5 sequence per iteration and toScene per batch (spec 7.4), the override set of the option
 * record (spec 7.2 with the 4.6 NetworkX corrections), the per-iteration Fa2Params values, the controller resets of
 * spec 7.17 and the stats decoder -- plus the two option resolvers and `createForceAtlas2`. Positions are vec4f
 * (xyz + mass) in layout units on the device (D23, 7.18); the speed controller runs on the device (D15); no
 * displacement clamp (D25); K2 runs the degree tiers over `degreeOrder()` (P4 PD-7).
 *
 * Model decisions this file fixes (the plan of P3-T2 lists the reasons): recordIteration with no `upTo` records every
 * stage including toScene; on the exact tier the K1-K5 dispatches of every iteration of one batch share ONE compute
 * pass (opened by the batch's first recordIteration and remembered by batch id) and toScene runs in a second pass
 * that ends it (contract 4.4); the fill kernel takes its FillParams from a model-owned 256-byte uniform buffer
 * ("fillParams"); the first iteration after every load() zeroes oldForce with a fill (paper mode). The grid tier
 * (P4-T10) is reached through `RepulsionGrid` when `tierFor(tuning, n)` says so (PD-18): `buffers()` adds the grid
 * buffers, K1 derives the frame under `gridMax > 0` (PD-14), the iteration is recorded as the three passes `fa2-k1`
 * / `fa2-attraction` / `fa2-grid` before `fa2-to-scene` (PD-16), and `stages` is the union list of both tiers
 * (PD-17: `upTo` stops after the last stage recorded at or before its position).
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import {
    EXACT_MAX_NODES,
    FA2_DEFAULTS,
    GRID_BBOX_MARGIN,
    GRID_EXTENT_FLOOR,
    LAYOUT_TUNING_DEFAULTS,
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
    type ForceAtlas2Stats,
    type ForceAtlas2TraceRecord,
    type GpuLayoutSimulation,
    type GpuLayoutTuning,
    type ResolvedLayoutTuning,
} from "../types/layout.js";
import { type Binding } from "../types/memory.js";
import { type ForceAtlas2Options, type ResolvedForceAtlas2Options } from "../types/options.js";
import {
    type BufferSpec,
    type ForceModel,
    ForceSimulation,
    type ModelInputs,
    type ModelResources,
    type StateWriter,
    tierFor,
} from "./force-simulation.js";
import { resolveNodeMass, resolveWeights } from "./inputs.js";
import {
    type AttractionBound,
    bindAttraction,
    describeValue,
    FILL_PARAMS_BUFFER,
    FORCE_BYTES_PER_NODE,
    invalid,
    isPositiveInteger,
    type Overrides,
    pickBoolean,
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
import { RepulsionExact, type RepulsionExactOverrides } from "./repulsion-exact.js";
import { type GridStage, RepulsionGrid, type RepulsionGridOverrides } from "./repulsion-grid.js";

// ============================================================ constants and small helpers

/** The stage names of both tiers in dispatch order plus the per-batch toScene (spec 7.4; contract 3.13; P4 PD-17): the exact tier records K1 K2 K3 K4 K5, the grid tier K1 K2 G1..G7 K4 K5. */
const FA2_STAGES = ["K1", "K2", "K3", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "K4", "K5", "toScene"] as const;

/** The FA2_STAGES index of the first grid stage, of K4, of K5 and of toScene. */
const STAGE_G1 = 3;
const STAGE_K4 = 10;
const STAGE_K5 = 11;
const STAGE_TO_SCENE = 12;

/** The name of the model-owned hub-counter buffer K1 binds on every tier (P4 PD-14). */
const HUB_COUNTERS_BUFFER = "hubCounters";

/** The one-workgroup dispatch of K1 (spec 7.4). */
const ONE_WORKGROUP: DispatchPlan = { x: 1, y: 1, z: 1, items: 1, stride: null };

/** Every override K2 accepts, with its default (contract 3.10.1 plus the two standard graph overrides). */
const K2_DEFAULTS: Overrides = { LINLOG: false, DISTRIBUTED: false, TIER: 0, USE_PERM: false, HAS_WEIGHTS: false };

/** Every override K5 accepts, with its default. */
const K5_DEFAULTS: Overrides = { SWING_MODE: 0 };

/** The resolved record with no option given: FA2_DEFAULTS plus the null / origin defaults of spec 7.14. */
const DEFAULT_RESOLVED: ResolvedForceAtlas2Options = Object.freeze<ResolvedForceAtlas2Options>({
    ...FA2_DEFAULTS,
    nodeMass: null,
    nodeSize: null,
    weight: null,
    center: [0, 0, 0],
    seed: null,
});

/**
 * The K3 / K4 override values of a merged set (typed for RepulsionExact).
 * @param merged - the merged override set
 * @returns the three K3 / K4 overrides
 */
function repulsionOverrides(merged: Overrides): RepulsionExactOverrides {
    return {
        SWING_MODE: merged.SWING_MODE === 1 ? 1 : 0,
        STRONG_GRAVITY: merged.STRONG_GRAVITY === true,
        GRAVITY_CENTER: merged.GRAVITY_CENTER === 1 ? 1 : 0,
    };
}

/**
 * The G6 / G7 / K4 override values of a merged set (typed for RepulsionGrid): K3's three and the FA2 law (P4-T13).
 * @param merged - the merged override set
 * @returns the grid stage's overrides
 */
function gridOverrides(merged: Overrides): RepulsionGridOverrides {
    return { ...repulsionOverrides(merged), LAW: 0 };
}

// ============================================================ the resolvers

/**
 * Applies FA2_DEFAULTS to the option record; validates ranges (spec 7.14; contract 3.13). With `previous` the record
 * is a PATCH over it (an absent or explicitly undefined field keeps the previous value) and `maxInFlight` may not
 * change (the uniform ring is sized by it at construction). `nodeSize` is E_UNSUPPORTED { option: "nodeSize" } (the
 * adjustSizes correction is deferred); `dissuadeHubs` is kept and ignored, exactly like the CPU.
 * @param options - the caller's options (or a setParams patch)
 * @param previous - the current resolved record when resolving a patch
 * @returns the frozen resolved record
 */
export function resolveForceAtlas2Options(
    options: ForceAtlas2Options | undefined,
    previous?: ResolvedForceAtlas2Options,
): ResolvedForceAtlas2Options {
    const o: ForceAtlas2Options = options ?? {};
    const base = previous ?? DEFAULT_RESOLVED;
    if (previous !== undefined && o.maxInFlight !== undefined && o.maxInFlight !== previous.maxInFlight) {
        throw new WebGpuGraphError(
            "E_INVALID_ARGUMENT",
            `maxInFlight cannot change after creation (the uniform ring is sized by it): got ${describeValue(o.maxInFlight)}, current ${previous.maxInFlight}`,
            { argument: "maxInFlight", value: o.maxInFlight, expected: previous.maxInFlight },
        );
    }
    const nodeSize = o.nodeSize === undefined ? base.nodeSize : o.nodeSize;
    if (nodeSize !== null) {
        throw new WebGpuGraphError(
            "E_UNSUPPORTED",
            "nodeSize (the adjustSizes correction) is not supported by the GPU ForceAtlas2 yet (spec 7.14)",
            { option: "nodeSize", hint: "pass nodeSize: null; the size-aware repulsion is deferred (spec 7.2, Q-25)" },
        );
    }
    const resolved: ResolvedForceAtlas2Options = {
        maxIter: pickNumber("maxIter", o.maxIter, base.maxIter, isPositiveInteger, "an integer >= 1"),
        jitterTolerance: pickNumber("jitterTolerance", o.jitterTolerance, base.jitterTolerance, (v) => v > 0, "> 0"),
        scalingRatio: pickNumber("scalingRatio", o.scalingRatio, base.scalingRatio, (v) => v > 0, "> 0"),
        gravity: pickNumber("gravity", o.gravity, base.gravity, (v) => v >= 0, ">= 0"),
        strongGravity: pickBoolean("strongGravity", o.strongGravity, base.strongGravity),
        distributedAction: pickBoolean("distributedAction", o.distributedAction, base.distributedAction),
        linlog: pickBoolean("linlog", o.linlog, base.linlog),
        nodeMass: o.nodeMass === undefined ? base.nodeMass : o.nodeMass,
        nodeSize,
        weight: o.weight === undefined ? base.weight : o.weight,
        dissuadeHubs: pickBoolean("dissuadeHubs", o.dissuadeHubs, base.dissuadeHubs),
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
 * Applies LAYOUT_TUNING_DEFAULTS (spec 7.14; contract 3.3). `nearMax` is an integer >= 2 (P4 DEP-P4-M: the
 * near-field estimator needs at least one sampled entry besides the node itself).
 * @param tuning - the GPU-only knobs given (any object carrying them, e.g. the createForceAtlas2 options)
 * @returns the frozen resolved tuning
 */
export function resolveLayoutTuning(tuning: GpuLayoutTuning | undefined): ResolvedLayoutTuning {
    const t: GpuLayoutTuning = tuning ?? {};
    const repulsion: unknown = t.repulsion ?? LAYOUT_TUNING_DEFAULTS.repulsion;
    if (repulsion !== "exact" && repulsion !== "grid" && repulsion !== "auto") {
        throw invalid("repulsion", repulsion, '"exact", "grid" or "auto"');
    }
    const compat: unknown = t.compat ?? LAYOUT_TUNING_DEFAULTS.compat;
    if (compat !== "paper" && compat !== "networkx") {
        throw invalid("compat", compat, '"paper" or "networkx"');
    }
    const resolved: ResolvedLayoutTuning = {
        repulsion,
        exactMaxNodes: pickNumber(
            "exactMaxNodes",
            t.exactMaxNodes,
            LAYOUT_TUNING_DEFAULTS.exactMaxNodes,
            isPositiveInteger,
            "an integer >= 1",
        ),
        nearMax: pickNumber(
            "nearMax",
            t.nearMax,
            LAYOUT_TUNING_DEFAULTS.nearMax,
            (v) => isPositiveInteger(v) && v >= 2,
            "an integer >= 2",
        ),
        deterministic: pickBoolean("deterministic", t.deterministic, LAYOUT_TUNING_DEFAULTS.deterministic),
        gridMax2D: pickNumber(
            "gridMax2D",
            t.gridMax2D,
            LAYOUT_TUNING_DEFAULTS.gridMax2D,
            isPositiveInteger,
            "an integer >= 1",
        ),
        gridMax3D: pickNumber(
            "gridMax3D",
            t.gridMax3D,
            LAYOUT_TUNING_DEFAULTS.gridMax3D,
            isPositiveInteger,
            "an integer >= 1",
        ),
        extentFactor: pickNumber(
            "extentFactor",
            t.extentFactor,
            LAYOUT_TUNING_DEFAULTS.extentFactor,
            (v) => v > 0,
            "> 0",
        ),
        compat,
    };
    return Object.freeze(resolved);
}

// ============================================================ the model

/** Everything bind() produced for one load(): the kernels, their bind groups and the dispatch plans of this n. */
interface BoundModel {
    readonly n: number;
    /** plan1d(n): K2, K5, toScene (every kernel compiles with the same device-derived WG). */
    readonly plan: DispatchPlan;
    /** plan1d(3n): the fills of force / oldForce (3 words per node). */
    readonly fillPlan: DispatchPlan;
    readonly k1: Kernel;
    readonly k1Bound: BoundKernel;
    /** The K2 tier dispatches (P4 PD-7); null when arcCount === 0 (K2 is not recorded; the fill below zeroes force instead, spec 7.5). */
    readonly attraction: AttractionBound | null;
    /** The exact-tier stage (K3 and K4), or null on the grid tier (P4 PD-18): one tier's kernels compile per load. */
    readonly repulsion: RepulsionExact | null;
    /** The grid-tier stage (G1-G7 and K4), or null on the exact tier (P4 PD-18). */
    readonly grid: RepulsionGrid | null;
    readonly k5: Kernel;
    readonly k5Bound: BoundKernel;
    readonly toScene: Kernel;
    readonly toSceneBound: BoundKernel;
    readonly fill: Kernel;
    /** The fill of `force` (arcCount === 0 only). */
    readonly fillForceBound: BoundKernel | null;
    /** The fill of `oldForce` on the first iteration after load() (paper mode only). */
    readonly fillOldBound: BoundKernel | null;
}

/** The ForceAtlas2 model (spec 7.4: K1 K2 K3 K4 K5 per iteration on the exact tier, K1 K2 G1..G7 K4 K5 on the grid tier; toScene once per batch). Stages: the union list of PD-17. */
export class ForceAtlas2Model implements ForceModel<ForceAtlas2Options, ForceAtlas2Stats> {
    /** The model kind of spec 7.19. */
    readonly kind = "forceatlas2";
    /** The stage names in dispatch order (the `upTo` vocabulary of recordIteration and debugRunStages). */
    readonly stages: typeof FA2_STAGES = FA2_STAGES;
    /** Fa2Params: the per-iteration uniform block (the simulation writes the shared fields into it). */
    readonly params: UniformBlock = FA2_PARAMS;
    /** Fa2State: the state header block (the simulation allocates and initialises it through this layout). */
    readonly state: UniformBlock = FA2_STATE;
    /** Fa2Trace: one record per iteration of a batch. */
    readonly trace: UniformBlock = FA2_TRACE;
    /** The resolved GPU-only tuning this model was created with. */
    readonly tuning: ResolvedLayoutTuning;

    /**
     * The option record the model holds: the constructor's record, replaced by onSetParams() ONLY. The query hooks
     * (inputs, overrides, paramsFor) never assign it: the simulation calls overrides(next) BEFORE onSetParams(patch)
     * (3.13 setParams: the recompile decision precedes the controller reset), so a hook that tracked the record would
     * hide every law change from onSetParams (PLAN DECISION 12).
     */
    private current: ResolvedForceAtlas2Options;
    /** The resources of the last bind(), or null before the first. */
    private resources: ModelResources | null = null;
    /** The kernels and bind groups of the last bind(), or null before it (and for n === 0). */
    private bound: BoundModel | null = null;
    /** Armed by onLoad(): the next recordIteration zeroes oldForce first (paper mode). */
    private resetOldForce = false;
    /** The grid of the load inputs() last resolved (null on the exact tier): onLoad() writes its frame, specs() lists its kernels. */
    private nextGrid: GridSpec | null = null;
    /**
     * The K1-K5 compute pass of the batch being recorded, keyed by CommandBatch.id (unique per batch): every
     * recordIteration of one batch dispatches into it (ONE pass per batch, contract 4.4); null between batches and
     * after the toScene pass ended it (PLAN DECISION 2).
     */
    private openPass: { readonly id: number; readonly pass: GPUComputePassEncoder } | null = null;

    /**
     * Creates the model for one simulation.
     * @param tuning - the resolved GPU-only tuning (compat selects SWING_MODE / GRAVITY_CENTER; repulsion and
     *   exactMaxNodes the tier rule)
     * @param resolved - the resolved option record at creation
     */
    constructor(tuning: ResolvedLayoutTuning, resolved: ResolvedForceAtlas2Options) {
        this.tuning = tuning;
        this.current = resolved;
    }

    /**
     * The SWING_MODE of this model: 1 in networkx mode (accumulated, position-mixed sums; m|F| local swing), else 0.
     * @returns 0 or 1
     */
    private get swingMode(): 0 | 1 {
        return this.tuning.compat === "networkx" ? 1 : 0;
    }

    /**
     * force 12n and oldForce 12n (zeroed) in BOTH swing modes (3.10.1: a writable slot is never aliased; mode 1 leaves
     * oldForce unread and unwritten), the 256-byte FillParams uniform buffer the fill dispatches read, the 16-byte
     * `hubCounters` K1 binds on every tier (P4 PD-14), and the grid buffers of `RepulsionGrid.buffers` exactly when
     * `tierFor(tuning, n)` is the grid tier (PD-18). n = 0 reports one node's worth of bytes so no zero-length buffer
     * is ever created (spec 3.6).
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
     * { mass: resolveNodeMass(s, resolved.nodeMass), weights: resolveWeights(s, resolved.weight) } (3.13 inputs.ts).
     * Also remembers the grid of this load (`tierFor(tuning, n)`, spec 7.8) for onLoad() and specs(): the simulation
     * calls inputs() first, then onLoad() before bind().
     * @param s - the snapshot being loaded
     * @param options - the simulation's current option record
     * @returns the per-load inputs
     */
    inputs(s: GraphSnapshot, options: ForceAtlas2Options): ModelInputs {
        const resolved = resolveForceAtlas2Options(options, this.current);
        const n = s.nodeCount;
        // resolve first: a throwing mass / weight resolution leaves the remembered grid of the previous load intact
        const inputs = { mass: resolveNodeMass(s, resolved.nodeMass), weights: resolveWeights(s, resolved.weight) };
        this.nextGrid = tierFor(this.tuning, n) === "grid" ? gridSpecFor(n, resolved.dim, this.tuning) : null;
        return inputs;
    }

    /**
     * { LINLOG, DISTRIBUTED, TIER: 0, SWING_MODE: compat === "networkx" ? 1 : 0, STRONG_GRAVITY, GRAVITY_CENTER:
     * compat === "networkx" ? 1 : 0 }; USE_PERM / HAS_WEIGHTS are merged in by the simulation from ModelResources
     * (3.10, never from core.hasWeights). A pure query: the simulation calls it with the current AND the next record
     * inside setParams() to decide the recompile, so it never touches the model's record (PLAN DECISION 12).
     * @param options - an option record (the simulation's current one, or the next one of a setParams patch)
     * @returns the model's own override set
     */
    overrides(options: ForceAtlas2Options): Overrides {
        const resolved = resolveForceAtlas2Options(options, this.current);
        const mode = this.swingMode;
        return {
            LINLOG: resolved.linlog,
            DISTRIBUTED: resolved.distributedAction,
            TIER: 0,
            SWING_MODE: mode,
            STRONG_GRAVITY: resolved.strongGravity,
            GRAVITY_CENTER: mode,
        };
    }

    /**
     * The seven module specs of an override set in dispatch order -- K1, K2, K3, K4, K5, toScene, fill -- each with
     * only the override names its entry declares (K2 also USE_PERM / HAS_WEIGHTS), for warm() and the compile matrix,
     * followed by the grid tier's specs (`RepulsionGrid.specs`) when the load inputs() last resolved is a grid load
     * (the pipeline key carries no geometry, so the spec's size is immaterial).
     * @param overrides - the merged override set (the model's plus USE_PERM / HAS_WEIGHTS)
     * @param _subgroups - accepted for the ForceModel interface and unused: every reducing FA2 body carries
     *   needs: ["subgroups"] in its registry entry and the composer picks the twin from caps.features (contract 4.3)
     * @returns the specs
     */
    specs(overrides: Overrides, _subgroups: boolean): readonly WgslModuleSpec[] {
        const [repulsionSpec, speedSpec] = RepulsionExact.specs(repulsionOverrides(overrides));
        const grid =
            this.nextGrid === null
                ? []
                : RepulsionGrid.specs(gridOverrides(overrides), gridSpecFor(EXACT_MAX_NODES + 1, 2, this.tuning));
        return [
            kernelSpec("fa2-stats-finalize"),
            kernelSpec("fa2-attraction", subset(overrides, K2_DEFAULTS)),
            repulsionSpec,
            speedSpec,
            kernelSpec("fa2-integrate", subset(overrides, K5_DEFAULTS)),
            kernelSpec("fa2-to-scene"),
            kernelSpec("fill"),
            ...grid,
        ];
    }

    /**
     * Compiles (through the cache) and binds every kernel against the buffers of this load(): K1, K2 over the degree
     * tiers through bindAttraction (or the fill of force when arcCount === 0), K3 + K4 through RepulsionExact, K5,
     * toScene, and the fill of oldForce; writes the FillParams { count: 3n, value: 0, mode: 0 } into the model's
     * uniform buffer. With n === 0 nothing is bound. The K2 TIER 1 / 2 pipelines compile on the first load whose
     * degrees need them (P4 PD-7), a one-time cost at that load.
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
            pipelines.kernel(kernelSpec("fa2-stats-finalize")),
            pipelines.kernel(kernelSpec("fa2-integrate", subset(overrides, K5_DEFAULTS))),
            pipelines.kernel(kernelSpec("fa2-to-scene")),
            pipelines.kernel(kernelSpec("fill")),
        ]);
        const repulsion =
            resources.tier === "grid"
                ? null
                : await RepulsionExact.create(pipelines, caps, repulsionOverrides(overrides));
        const attraction = hasArcs
            ? await bindAttraction(resources, subset(overrides, K2_DEFAULTS), { pos, force, params })
            : null;
        const grid =
            resources.tier === "grid"
                ? await RepulsionGrid.create(
                      resources,
                      k1.workgroupSize,
                      gridOverrides(overrides),
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
        const exact = { pos, state, trace, force, oldForce, fixedMask: fixed, partials, params };
        repulsion?.bind(exact);
        grid?.bind({
            ...exact,
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
            // PD-14: on the exact tier K1's grid slots take dummies (cellHist := partials, both read-only; hubCounters
            // is the model's 16-byte buffer on every tier) and the block is dead under gridMax 0
            k1Bound: k1.bind({
                partials,
                S: state,
                T: trace,
                cellHist: grid === null ? partials : resources.buffer("cellHist"),
                hubCounters,
                P: params,
            }),
            attraction,
            repulsion,
            grid,
            k5,
            k5Bound: k5.bind({ force, oldForce, fixedMask: fixed, S: state, pos, partials, P: params }),
            toScene,
            toSceneBound: toScene.bind({ pos, scene, P: params }),
            fill,
            fillForceBound: hasArcs ? null : fill.bind({ dst: force, P: fillParams }),
            fillOldBound: this.swingMode === 0 ? fill.bind({ dst: oldForce, P: fillParams }) : null,
        };
    }

    /**
     * The Fa2Params values of one iteration (the simulation overwrites the shared fields n, dim, flags,
     * iterationIndex, seed, scale, center and settleThreshold with the same values plus the flags).
     * @param iteration - the trace slot of the iteration inside its batch
     * @param options - the simulation's current option record
     * @returns the uniform values
     */
    paramsFor(iteration: number, options: ForceAtlas2Options): UniformValues {
        const { n, core, tiers, tier, dim } = this.requireResources();
        const resolved = resolveForceAtlas2Options(options, this.current);
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
            scalingRatio: resolved.scalingRatio,
            gravity: resolved.gravity,
            jitterTolerance: resolved.jitterTolerance,
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
     * Records one iteration into the batch, stopping after stage `upTo` when given (spec 7.4; debugRunStages /
     * inspect, spec 11.9 item 2; PD-17: `upTo` names a position in the union list and the recording stops after the
     * last stage recorded at or before it, so "K3" on the grid tier stops after K2 and "G5" on the exact tier after
     * K3). The exact tier: K1, K2 (or the fill of force when arcCount === 0), K3, K4, K5 in the batch's ONE compute
     * pass (opened by the first call of a batch and reused by every later call with the same batch.id, PLAN
     * DECISION 2), then toScene in a second pass that ends it. The grid tier (PD-16): the passes `fa2-k1` (K1),
     * `fa2-attraction` (K2's tiers) and `fa2-grid` (G1-G7, K4, K5) per iteration, then `fa2-to-scene`. The profiler
     * budgets PROFILER_QUERY_SLOTS / 2 = 128 passes per batch, so a grid batch above 42 iterations is timed only in
     * part (the exact tier's two passes per batch always fit): the simulation then reports msPerIteration from the
     * wall time, never from the sum of the timed prefix (`ForceSimulation.batchMilliseconds`). The simulation
     * passes "K5" for iterations 0..k-2 and undefined for the last, so toScene runs once per batch. The first call
     * after load() zeroes oldForce before K1 (paper mode). With n === 0 nothing is recorded (PLAN DECISION 9); a
     * call before bind() completed is E_NOT_LOADED (never a silent no-op).
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
                "the ForceAtlas2 model is not bound (bind() has not completed)",
                {
                    state: "loaded",
                },
            );
        }
        const offset = resources.ring.offsetOf(slot);
        if (tier === "grid") {
            this.recordGridIteration(batch, bound, offset, stop);
            return;
        }
        const { repulsion } = bound;
        if (repulsion === null) {
            throw new WebGpuGraphError("E_NOT_LOADED", "the ForceAtlas2 model was bound on the grid tier", {
                state: "loaded",
            });
        }
        const pass = this.openPass !== null && this.openPass.id === batch.id ? this.openPass.pass : batch.pass("fa2");
        this.openPass = { id: batch.id, pass };
        this.recordK1(pass, bound, offset);
        if (stop < 1) {
            return;
        }
        this.recordK2(pass, bound, offset);
        if (stop < 2) {
            return;
        }
        repulsion.recordRepulsion(pass, bound.n, offset);
        if (stop < STAGE_K4) {
            return;
        }
        repulsion.recordSpeedFinalize(pass, offset);
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
     * @param stop - the FA2_STAGES index to stop after
     */
    private recordGridIteration(batch: CommandBatch, bound: BoundModel, offset: number, stop: number): void {
        const { grid } = bound;
        if (grid === null) {
            throw new WebGpuGraphError("E_NOT_LOADED", "the ForceAtlas2 model was bound on the exact tier", {
                state: "loaded",
            });
        }
        this.openPass = null;
        this.recordK1(batch.pass("fa2-k1"), bound, offset);
        if (stop < 1) {
            return;
        }
        this.recordK2(batch.pass("fa2-attraction"), bound, offset);
        if (stop < STAGE_G1) {
            return;
        }
        const pass = batch.pass("fa2-grid");
        const gridStop = stop < STAGE_K4 ? (FA2_STAGES[stop] as GridStage) : undefined;
        grid.recordRepulsion(pass, bound.n, offset, gridStop);
        if (stop < STAGE_K4) {
            return;
        }
        grid.recordSpeedFinalize(pass, offset);
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
     * The oldForce reset of the first iteration after load() (paper mode), then K1 (one workgroup).
     * @param pass - the open compute pass
     * @param bound - the bound model
     * @param offset - the Fa2Params dynamic offset
     */
    private recordK1(pass: GPUComputePassEncoder, bound: BoundModel, offset: number): void {
        if (this.resetOldForce) {
            this.resetOldForce = false;
            if (bound.fillOldBound !== null) {
                bound.fill.dispatch(pass, bound.fillOldBound, bound.fillPlan, [0]);
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
     * speed = 1, speedEfficiency = 1, swing = 1, traction = 1 (mode 1 accumulates from 1; mode 0 overwrites them each
     * iteration, the initial value is irrelevant); arms the oldForce reset of the next recordIteration. On a grid
     * load the frame of the first build (K1 folds nothing on the first iteration): the same six values K1 derives,
     * in f32 with the kernel's order of operations, from the host-written min / max / centroid / rmsRadius.
     * @param state - the state writer of the simulation
     */
    onLoad(state: StateWriter): void {
        state.set("speed", 1);
        state.set("speedEfficiency", 1);
        state.set("swing", 1);
        state.set("traction", 1);
        this.resetOldForce = true;
        if (this.nextGrid !== null) {
            writeGridFrame(state, this.nextGrid, this.tuning.extentFactor);
        }
    }

    /**
     * Mode 0: nothing (D8). Mode 1 (networkx): swing = traction = 1 (spec 7.2 "load() and reheat() reset them to 1").
     * @param state - the state writer of the simulation
     */
    onReheat(state: StateWriter): void {
        if (this.swingMode === 1) {
            state.set("swing", 1);
            state.set("traction", 1);
        }
    }

    /**
     * Resets speed / speedEfficiency to 1 only when linlog, strongGravity or distributedAction changed (spec 7.17);
     * a numeric tweak leaves the controller alone. The patch is validated by the same resolver the simulation uses
     * and applied over the record of the constructor / the previous onSetParams -- the only place `current` moves
     * (PLAN DECISION 12), so the comparison sees the record from BEFORE this setParams even though the simulation
     * already queried overrides(next).
     * @param patch - the setParams patch
     * @param state - the state writer of the simulation
     */
    onSetParams(patch: Partial<ForceAtlas2Options>, state: StateWriter): void {
        const next = resolveForceAtlas2Options(patch, this.current);
        const lawChanged =
            next.linlog !== this.current.linlog ||
            next.strongGravity !== this.current.strongGravity ||
            next.distributedAction !== this.current.distributedAction;
        this.current = next;
        if (lawChanged) {
            state.set("speed", 1);
            state.set("speedEfficiency", 1);
        }
    }

    /**
     * Decodes the state header and the k trace records of a completed batch (k = trace.byteLength / 32) into
     * ForceAtlas2Stats: `repulsionTier` is the bound tier, the grid fields are the header's on the grid tier
     * (`maxCellOccupancy` / `outsideGrid`: the counts of the iteration before the last K1) and null on the exact
     * tier; msPerIteration null (the simulation owns the clock).
     * @param state - a DataView over the 256-byte state header
     * @param trace - a DataView over the k Fa2Trace records of the batch
     * @returns the stats
     */
    readStats(state: DataView, trace: DataView): ForceAtlas2Stats {
        const header = FA2_STATE.read(state);
        const centroid = vector(header, "centroid");
        const records: ForceAtlas2TraceRecord[] = [];
        const count = Math.floor(trace.byteLength / TRACE_RECORD_BYTES);
        for (let i = 0; i < count; i++) {
            const record = FA2_TRACE.read(trace, i * TRACE_RECORD_BYTES);
            records.push({
                swing: scalar(record, "swing"),
                traction: scalar(record, "traction"),
                speed: scalar(record, "speed"),
                speedEfficiency: scalar(record, "speedEfficiency"),
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
            swing: scalar(header, "swing"),
            traction: scalar(header, "traction"),
            speed: scalar(header, "speed"),
            speedEfficiency: scalar(header, "speedEfficiency"),
            trace: records,
        };
    }

    /**
     * The resources of the last bind(), or E_NOT_LOADED before it.
     * @returns the resources
     */
    private requireResources(): ModelResources {
        if (this.resources === null) {
            throw new WebGpuGraphError("E_NOT_LOADED", "the ForceAtlas2 model has not been bound (load() first)", {
                state: "created",
            });
        }
        return this.resources;
    }

    /**
     * The index of a stage name in FA2_STAGES, or E_INVALID_ARGUMENT.
     * @param upTo - the stage name
     * @returns its index
     */
    private stageIndex(upTo: string): number {
        for (let i = 0; i < FA2_STAGES.length; i++) {
            if (FA2_STAGES[i] === upTo) {
                return i;
            }
        }
        throw invalid("upTo", upTo, FA2_STAGES.join(" | "));
    }

    /**
     * Releases the grid stage's lease and the bind groups (the simulation calls it from dispose() once every
     * in-flight batch has settled).
     */
    dispose(): void {
        this.dropBound();
    }

    /**
     * Drops the bind groups of the previous bind() (the buffers changed) so the cached kernels do not accumulate stale
     * groups across reloads; K3 / K4 live inside RepulsionExact and keep the P1-T6 behaviour; the grid stage
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
        for (const [kernel] of bound.attraction?.kernels ?? []) {
            kernel.invalidate();
        }
        bound.grid?.dispose();
        this.bound = null;
    }
}

/**
 * The grid frame of the first build after load() (spec 7.7 geometry table; PD-10): K1's text in f32 with the same
 * order of operations -- `box = (max - min) * GRID_BBOX_MARGIN`, `extent = max(min(max(box), extentFactor *
 * rmsRadius), GRID_EXTENT_FLOOR)`, `cellSize = extent / G`, `gridMin = centroid - extent / 2` (cellSize in `.w`),
 * `invCellSize = 1 / cellSize`, `eps = 0.25 cellSize` -- plus zero counts. Shared with the FR and spring-electrical
 * models' onLoad (P4-T13).
 * @param state - the state writer (min / max / centroid / rmsRadius already written by the simulation)
 * @param spec - the grid of the load
 * @param extentFactor - the tuning's extent factor
 */
export function writeGridFrame(state: StateWriter, spec: GridSpec, extentFactor: number): void {
    const f = Math.fround;
    const axis = (name: string): readonly number[] => {
        const value = state.get(name);
        return typeof value === "number" ? [value, value, value] : value;
    };
    const min = axis("min");
    const max = axis("max");
    const centroid = axis("centroid");
    const rms = state.get("rmsRadius");
    const box = [0, 1, 2].map((a) => f(f(f(max[a]) - f(min[a])) * f(GRID_BBOX_MARGIN)));
    const bboxExtent = spec.dim === 3 ? Math.max(box[0], box[1], box[2]) : Math.max(box[0], box[1]);
    const rmsTerm = f(f(extentFactor) * f(typeof rms === "number" ? rms : 0));
    const extent = Math.max(Math.min(bboxExtent, rmsTerm), f(GRID_EXTENT_FLOOR));
    const cellSize = f(extent / spec.g);
    const half = f(0.5 * extent);
    state.set("gridMin", [f(f(centroid[0]) - half), f(f(centroid[1]) - half), f(f(centroid[2]) - half), cellSize]);
    state.set("invCellSize", f(1 / cellSize));
    state.set("eps", f(0.25 * cellSize));
    state.set("outsideGrid", 0);
    state.set("maxCellOccupancy", 0);
}

// ============================================================ the factory

/**
 * The resolve callback of the simulation's setParams: the patch over the current record, re-validated (the current
 * record is re-resolved first so the callback is typed without a cast).
 * @param patch - the setParams patch
 * @param current - the simulation's current option record
 * @returns the new record
 */
function resolvePatch(patch: Partial<ForceAtlas2Options>, current: ForceAtlas2Options): ForceAtlas2Options {
    return resolveForceAtlas2Options(patch, resolveForceAtlas2Options(current));
}

/**
 * Spec 3.3 createForceAtlas2, verbatim: a GpuLayoutSimulation running ForceAtlas2 on the exact or the grid repulsion
 * tier (spec 7.8) with the option defaults of spec 7.14 and the GPU-only tuning of GpuLayoutTuning (contract 3.13
 * "Contracts").
 * @param ctx - the context (E_DISPOSED / E_DEVICE_LOST through assertReady)
 * @param options - the ForceAtlas2 options and the GPU-only tuning knobs in one record
 * @returns the simulation in state "created"; load() next
 */
export function createForceAtlas2(
    ctx: GpuContext,
    options?: ForceAtlas2Options & GpuLayoutTuning,
): GpuLayoutSimulation<ForceAtlas2Options, ForceAtlas2Stats> {
    ctx.assertReady();
    const resolved = resolveForceAtlas2Options(options);
    const tuning = resolveLayoutTuning(options);
    const model = new ForceAtlas2Model(tuning, resolved);
    return new ForceSimulation<ForceAtlas2Options, ForceAtlas2Stats>(ctx, model, resolved, tuning, resolvePatch);
}
