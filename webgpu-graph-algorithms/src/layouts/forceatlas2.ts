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
    SETTLE_FLOOR_UNBOUNDED,
    TRACE_RECORD_BYTES,
} from "../constants.js";
import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { type UniformValues } from "../kernel/struct-block.js";
import { type WgslModuleSpec } from "../kernel/wgsl.js";
import { FA2_STATE, FA2_TRACE, kernelSpec } from "../kernels.js";
import { type GridSpec, gridSpecFor } from "../primitives/grid.js";
import {
    type ForceAtlas2Stats,
    type ForceAtlas2TraceRecord,
    type GpuLayoutSimulation,
    type GpuLayoutTuning,
    type ResolvedLayoutTuning,
} from "../types/layout.js";
import { type ForceAtlas2Options, type ResolvedForceAtlas2Options } from "../types/options.js";
import { type CompiledModel, ForceModelBase } from "./force-model-base.js";
import {
    type ForceModel,
    ForceSimulation,
    type ModelInputs,
    type ModelResources,
    type StateWriter,
    tierFor,
} from "./force-simulation.js";
import { resolveNodeMass, resolveWeights } from "./inputs.js";
import {
    type AttractionBindings,
    bindAttraction,
    describeValue,
    invalid,
    isPositiveInteger,
    type Overrides,
    pickBoolean,
    pickCenter,
    pickDim,
    pickNumber,
    pickSeed,
    scalar,
    subset,
} from "./model-common.js";
import { RepulsionExact, type RepulsionExactOverrides, type RepulsionExactResources } from "./repulsion-exact.js";
import { RepulsionGrid, type RepulsionGridOverrides } from "./repulsion-grid.js";

// ============================================================ constants and small helpers

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

/** The ForceAtlas2 model (spec 7.4: K1 K2 K3 K4 K5 per iteration on the exact tier, K1 K2 G1..G7 K4 K5 on the grid tier; toScene once per batch). Stages: the union list of PD-17. */
export class ForceAtlas2Model
    extends ForceModelBase<RepulsionExact>
    implements ForceModel<ForceAtlas2Options, ForceAtlas2Stats>
{
    /** The model kind of spec 7.19. */
    readonly kind = "forceatlas2";

    /**
     * The option record the model holds: the constructor's record, replaced by onSetParams() ONLY. The query hooks
     * (inputs, overrides, paramsFor) never assign it: the simulation calls overrides(next) BEFORE onSetParams(patch)
     * (3.13 setParams: the recompile decision precedes the controller reset), so a hook that tracked the record would
     * hide every law change from onSetParams (PLAN DECISION 12).
     */
    private current: ResolvedForceAtlas2Options;

    /**
     * Creates the model for one simulation. oldForce is allocated in BOTH swing modes (3.10.1: a writable slot is
     * never aliased; mode 1 leaves it unread and unwritten).
     * @param tuning - the resolved GPU-only tuning (compat selects SWING_MODE / GRAVITY_CENTER; repulsion and
     *   exactMaxNodes the tier rule)
     * @param resolved - the resolved option record at creation
     */
    constructor(tuning: ResolvedLayoutTuning, resolved: ResolvedForceAtlas2Options) {
        super(tuning, { name: "ForceAtlas2", pass: "fa2", scenePass: "fa2-to-scene", carry: "oldForce" });
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
     * Compiles the pipelines of one load: K1, K5, toScene and fill together, then K3 + K4 through RepulsionExact on
     * the exact tier, K2 over the degree tiers through bindAttraction (none when arcCount === 0), and G1-G7 + K4
     * through RepulsionGrid on the grid tier (PD-18). The K2 TIER 1 / 2 pipelines compile on the first load whose
     * degrees need them (P4 PD-7), a one-time cost at that load.
     * @param resources - the graph, the shared and model buffers, the ring and the cache
     * @param overrides - the merged override set
     * @param attractionBindings - K2's group-1 / group-2 bindings
     * @returns the pipelines
     */
    protected async compile(
        resources: ModelResources,
        overrides: Overrides,
        attractionBindings: AttractionBindings,
    ): Promise<CompiledModel<RepulsionExact>> {
        const { n, pipelines, caps } = resources;
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
        const attraction =
            resources.core.colIdx !== null
                ? await bindAttraction(resources, subset(overrides, K2_DEFAULTS), attractionBindings)
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
        const exact =
            repulsion === null
                ? null
                : (buffers: RepulsionExactResources): RepulsionExact => {
                      repulsion.bind(buffers);
                      return repulsion;
                  };
        return { k1, k5, toScene, fill, attraction, exact, grid };
    }

    /**
     * Paper mode (SWING_MODE 0) zeroes oldForce before the first K1 after load().
     * @returns true in paper mode
     */
    protected override zeroesCarry(): boolean {
        return this.swingMode === 0;
    }

    /**
     * K4 (the speed controller) after the repulsion of either tier.
     * @param pass - the open compute pass
     * @param stage - the exact or the grid stage of the load
     * @param offset - the Fa2Params dynamic offset
     */
    protected override recordSpeed(
        pass: GPUComputePassEncoder,
        stage: RepulsionExact | RepulsionGrid,
        offset: number,
    ): void {
        stage.recordSpeedFinalize(pass, offset);
    }

    /**
     * The Fa2Params values of one iteration: the shared fields and the FA2 constants (the simulation overwrites the
     * shared fields n, dim, flags, iterationIndex, seed, scale, center and settleThreshold with the same values plus
     * the flags).
     * @param iteration - the trace slot of the iteration inside its batch
     * @param options - the simulation's current option record
     * @returns the uniform values
     */
    paramsFor(iteration: number, options: ForceAtlas2Options): UniformValues {
        this.requireResources();
        const resolved = resolveForceAtlas2Options(options, this.current);
        return {
            ...this.sharedParams(iteration, resolved),
            scalingRatio: resolved.scalingRatio,
            gravity: resolved.gravity,
            jitterTolerance: resolved.jitterTolerance,
            settleFloor: SETTLE_FLOOR_UNBOUNDED, // ForceAtlas2 does not drift after settling (issue #97)
        };
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
        this.resetCarry = true;
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
     * ForceAtlas2Stats: the shared fields (ForceModelBase.sharedStats; the grid fields `maxCellOccupancy` /
     * `outsideGrid` are the counts of the iteration before the last K1), the controller and the trace.
     * @param state - a DataView over the 256-byte state header
     * @param trace - a DataView over the k Fa2Trace records of the batch
     * @returns the stats
     */
    readStats(state: DataView, trace: DataView): ForceAtlas2Stats {
        const header = FA2_STATE.read(state);
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
        return {
            ...this.sharedStats(header),
            swing: scalar(header, "swing"),
            traction: scalar(header, "traction"),
            speed: scalar(header, "speed"),
            speedEfficiency: scalar(header, "speedEfficiency"),
            trace: records,
        };
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
