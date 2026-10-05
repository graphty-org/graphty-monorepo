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
    SETTLE_FLOOR_REFERENCE_NODES,
    TRACE_RECORD_BYTES,
} from "../constants.js";
import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { type UniformValues } from "../kernel/struct-block.js";
import { type WgslModuleSpec } from "../kernel/wgsl.js";
import { FA2_STATE, FA2_TRACE, kernelSpec } from "../kernels.js";
import { gridSpecFor } from "../primitives/grid.js";
import {
    type GpuLayoutSimulation,
    type GpuLayoutTuning,
    type ResolvedLayoutTuning,
    type SpringElectricalStats,
    type SpringElectricalTraceRecord,
} from "../types/layout.js";
import { type ResolvedSpringElectricalOptions, type SpringElectricalOptions } from "../types/options.js";
import {
    type CompiledModel,
    ForceModelBase,
    LAW_K1_DEFAULTS,
    LAW_K2_DEFAULTS,
    LAW_K3_DEFAULTS,
    LAW_K5_DEFAULTS,
    LawRepulsion,
} from "./force-model-base.js";
import {
    type ForceModel,
    ForceSimulation,
    type ModelInputs,
    type ModelResources,
    type StateWriter,
    tierFor,
} from "./force-simulation.js";
import { resolveLayoutTuning, writeGridFrame } from "./forceatlas2.js";
import {
    type AttractionBindings,
    bindAttraction,
    describeValue,
    isPositiveInteger,
    type Overrides,
    pickCenter,
    pickDim,
    pickNumber,
    pickSeed,
    scalar,
    subset,
} from "./model-common.js";
import { RepulsionGrid, type RepulsionGridOverrides } from "./repulsion-grid.js";

// ============================================================ constants

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
export class SpringElectricalModel
    extends ForceModelBase<LawRepulsion>
    implements ForceModel<SpringElectricalOptions, SpringElectricalStats>
{
    /** The model kind of spec 7.19. */
    readonly kind = "springElectrical";

    /** The option record the model holds: the constructor's record, replaced by onSetParams() ONLY (the query hooks never assign it). */
    private current: ResolvedSpringElectricalOptions;

    /**
     * Creates the model for one simulation. The velocity buffer takes the `oldForce` slot of K3, G7 and K5 (PD-2).
     * @param tuning - the resolved GPU-only tuning (only `repulsion` / `exactMaxNodes` / `nearMax` / `extentFactor`
     *   matter here)
     * @param resolved - the resolved option record at creation
     */
    constructor(tuning: ResolvedLayoutTuning, resolved: ResolvedSpringElectricalOptions) {
        super(tuning, { name: "spring-electrical", pass: "se", scenePass: "se-to-scene", carry: VELOCITY_BUFFER });
        this.current = resolved;
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
            kernelSpec("fa2-stats-finalize", subset(overrides, LAW_K1_DEFAULTS)),
            kernelSpec("fa2-attraction", subset(overrides, LAW_K2_DEFAULTS)),
            kernelSpec("fa2-repulsion-exact", subset(overrides, LAW_K3_DEFAULTS)),
            kernelSpec("fa2-integrate", subset(overrides, LAW_K5_DEFAULTS)),
            kernelSpec("fa2-to-scene"),
            kernelSpec("fill"),
            ...grid,
        ];
    }

    /**
     * Compiles the pipelines of one load: K1, K5, toScene and fill together, then K2 over the degree tiers through
     * bindAttraction (none when arcCount === 0), K3 on the exact tier or G1-G7 through RepulsionGrid on the grid tier
     * (PD-18). The K2 TIER 1 / 2 pipelines compile on the first load whose degrees need them (P4 PD-7).
     * @param resources - the graph, the shared and model buffers, the ring and the cache
     * @param overrides - the merged override set
     * @param attractionBindings - K2's group-1 / group-2 bindings
     * @returns the pipelines
     */
    protected async compile(
        resources: ModelResources,
        overrides: Overrides,
        attractionBindings: AttractionBindings,
    ): Promise<CompiledModel<LawRepulsion>> {
        const { n, pipelines } = resources;
        const [k1, k5, toScene, fill] = await Promise.all([
            pipelines.kernel(kernelSpec("fa2-stats-finalize", subset(overrides, LAW_K1_DEFAULTS))),
            pipelines.kernel(kernelSpec("fa2-integrate", subset(overrides, LAW_K5_DEFAULTS))),
            pipelines.kernel(kernelSpec("fa2-to-scene")),
            pipelines.kernel(kernelSpec("fill")),
        ]);
        const attraction =
            resources.core.colIdx !== null
                ? await bindAttraction(resources, subset(overrides, LAW_K2_DEFAULTS), attractionBindings)
                : null;
        const k3 =
            resources.tier === "grid"
                ? null
                : await pipelines.kernel(kernelSpec("fa2-repulsion-exact", subset(overrides, LAW_K3_DEFAULTS)));
        const grid =
            resources.tier === "grid"
                ? await RepulsionGrid.create(
                      resources,
                      k1.workgroupSize,
                      SE_GRID_OVERRIDES,
                      gridSpecFor(n, resources.dim, this.tuning),
                  )
                : null;
        const exact = k3 === null ? null : LawRepulsion.binder(k3);
        return { k1, k5, toScene, fill, attraction, exact, grid };
    }

    /**
     * The Fa2Params values of one iteration: the shared fields, the FA2 fields at 0 (no centre gravity, PD-12; no
     * FR temperature) and ngraph's five constants with `gravity` in `coulomb`.
     * @param iteration - the global iteration index
     * @param options - the simulation's current option record
     * @returns the uniform values
     */
    paramsFor(iteration: number, options: SpringElectricalOptions): UniformValues {
        const { n } = this.requireResources();
        const resolved = resolveSpringElectricalOptions(options, this.current);
        return {
            ...this.sharedParams(iteration, resolved),
            scalingRatio: 0,
            gravity: 0,
            jitterTolerance: 0,
            frK: 0,
            temperature: 0,
            springLength: resolved.springLength,
            settleFloor:
                SETTLE_FLOOR_FRACTION.springElectrical *
                resolved.springLength *
                (SETTLE_FLOOR_REFERENCE_NODES / Math.max(n, 1)) ** 0.25,
            springCoefficient: resolved.springCoefficient ?? SE_DEFAULTS.springCoefficient * springSizeFactor(n),
            coulomb: resolved.gravity ?? SE_DEFAULTS.gravity * springSizeFactor(n),
            dragCoefficient: resolved.dragCoefficient,
            timeStep: resolved.timeStep,
        };
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
     * Decodes the state header and the k trace records of a completed batch into SpringElectricalStats: the shared
     * fields (ForceModelBase.sharedStats), `kineticEnergy` (the last folded value, one iteration behind the last
     * integrate, PD-4) and the trace.
     * @param state - a DataView over the 256-byte state header
     * @param trace - a DataView over the k Fa2Trace records of the batch
     * @returns the stats
     */
    readStats(state: DataView, trace: DataView): SpringElectricalStats {
        const header = FA2_STATE.read(state);
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
        return {
            ...this.sharedStats(header),
            kineticEnergy: scalar(header, "kineticEnergy"),
            trace: records,
        };
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
