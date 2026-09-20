/**
 * The spring-electrical half of what test/helpers/fa2-parity.ts is for ForceAtlas2 (P5-T4 Step 1; spec 11.4, 11.9
 * items 2 and 4): the base options (ngraph's defaults, seeded, settling disabled), a simulation factory with
 * inspect() on, the stage-by-stage capture that compares every kernel's intermediate of one preset iteration with
 * the f64 oracle's (K2's springs, K3's force, K5's positions / velocity / displacement / partials with the kinetic
 * energy of partials B, toScene's scene, the K1 fold with the folded kinetic energy), the fixture names of the P5
 * spring noise members, the tolerance caps and the ONE resolver of every spring tolerance. Shares only what
 * fa2-parity.ts exports; never imports fr-parity.ts.
 *
 * The one-iteration lag of PD-4: K5 writes the kinetic energy into partials B and the NEXT K1 folds it, so the
 * `k1` stage here (a real step(1), then a debug K1) reads exactly the oracle's kinetic energy after ONE step.
 */

import { type F32, type F64, type GraphSnapshot, type NodeMask } from "@graphty/graph-format";

import { SE_DEFAULTS } from "../../src/constants.js";
import type { GpuContext } from "../../src/context.js";
import { FA2_STATE, type KernelId } from "../../src/kernels.js";
import { ForceSimulation } from "../../src/layouts/force-simulation.js";
import { createSpringElectrical } from "../../src/layouts/spring-electrical.js";
import type { GpuLayoutTuning, SpringElectricalStats } from "../../src/types/layout.js";
import type { SpringElectricalOptions } from "../../src/types/options.js";
import { type SeOracleOptions, SpringElectricalOracle } from "../oracle/spring-electrical.js";
import {
    asF32,
    assertUnitStart,
    layoutStart,
    readPartials,
    readState,
    stageError,
    type StageIo,
    xyzOf,
} from "./fa2-parity.js";
import { noiseFloorFor } from "./noise-floor.js";
import { type CheckReport, ratioOf } from "./sabotage.js";

// ---------------------------------------------------------------- options and simulations

/** The options every spring parity case starts from: SE_DEFAULTS (ngraph's constants) plus seed 7, settling disabled, one iteration per step, two in flight. */
export const SE_BASE_OPTIONS: SpringElectricalOptions = Object.freeze({
    ...SE_DEFAULTS,
    center: [0, 0, 0],
    seed: 7,
    settleThreshold: 0,
    iterationsPerStep: 1,
    maxInFlight: 2,
});
/** The tuning every spring parity case uses: the exact tier. */
export const SE_TUNING: GpuLayoutTuning = Object.freeze({ repulsion: "exact" });
/** True in a recording run: every spring parity test is then held to the spec cap, not to the derived value. */
const WRITE = process.env.GRAPHTY_NOISE_FLOOR_WRITE === "1";

/** The simulation createSpringElectrical builds, with its @internal members visible. */
type SeSim = ForceSimulation<SpringElectricalOptions, SpringElectricalStats>;

/**
 * A spring-electrical simulation with ctx.debug.inspect set BEFORE construction, asserted to be the ForceSimulation
 * the factory builds.
 * @param ctx - the context
 * @param options - the spring options
 * @param tuning - the GPU tuning
 * @returns the simulation
 */
function createSeSim(ctx: GpuContext, options: SpringElectricalOptions, tuning: GpuLayoutTuning): SeSim {
    ctx.debug.inspect = true;
    const sim = createSpringElectrical(ctx, { ...options, ...tuning });
    if (!(sim instanceof ForceSimulation)) {
        throw new Error("createSpringElectrical did not return a ForceSimulation");
    }
    return sim as SeSim;
}

/**
 * Runs `body` with a fresh simulation and disposes it afterwards (also on throw). The caller releases the snapshot.
 * @param ctx - the context
 * @param options - the spring options
 * @param tuning - the GPU tuning
 * @param body - the work
 * @returns whatever body returns
 */
export async function withSeSim<T>(
    ctx: GpuContext,
    options: SpringElectricalOptions,
    tuning: GpuLayoutTuning,
    body: (sim: SeSim) => Promise<T>,
): Promise<T> {
    const sim = createSeSim(ctx, options, tuning);
    try {
        return await body(sim);
    } finally {
        sim.dispose();
    }
}

/**
 * The inspect() / debugRunStages() pair of a spring simulation, or a throw when ctx.debug.inspect was not honoured.
 * @param sim - the simulation
 * @returns the pair
 */
export function seStages(sim: SeSim): StageIo {
    const run = sim.debugRunStages;
    const read = sim.inspect;
    if (run === undefined || read === undefined) {
        throw new Error("ctx.debug.inspect was not honoured: inspect / debugRunStages are absent");
    }
    return {
        run: (upTo: string): Promise<void> => run.call(sim, upTo),
        read: (name: string): Promise<Float32Array | Uint32Array> => read.call(sim, name),
    };
}

/**
 * The oracle options of a GPU configuration: ngraph's five constants with SE_DEFAULTS applied, the dimension, the
 * settle threshold, the mask and the precision.
 * @param options - the GPU options
 * @param mask - the fixed mask or null
 * @param precision - the oracle's scratch precision
 * @returns the SeOracleOptions
 */
export function seOracleOptions(
    options: SpringElectricalOptions,
    mask: NodeMask | null,
    precision: "f64" | "f32",
): SeOracleOptions {
    return {
        precision,
        dim: options.dim ?? SE_DEFAULTS.dim,
        springLength: options.springLength ?? SE_DEFAULTS.springLength,
        springCoefficient: options.springCoefficient ?? SE_DEFAULTS.springCoefficient,
        gravity: options.gravity ?? SE_DEFAULTS.gravity,
        dragCoefficient: options.dragCoefficient ?? SE_DEFAULTS.dragCoefficient,
        timeStep: options.timeStep ?? SE_DEFAULTS.timeStep,
        settleThreshold: options.settleThreshold ?? SE_DEFAULTS.settleThreshold,
        fixed: mask,
    };
}

// ---------------------------------------------------------------- the stage tables

/** The eight inspect() stages of one preset iteration in model order (K2, K3, K5 four ways, toScene, the K1 fold). */
export type SeStageKey =
    | "attraction"
    | "force"
    | "positions"
    | "velocity"
    | "displacement"
    | "partials"
    | "scene"
    | "k1";
/** The stage keys as an iteration list, in model order. */
export const SE_STAGE_KEYS: readonly SeStageKey[] = Object.freeze([
    "attraction",
    "force",
    "positions",
    "velocity",
    "displacement",
    "partials",
    "scene",
    "k1",
]);
/** The model stage debugRunStages() runs up to for each key. */
const SE_STAGE_UP_TO: Readonly<Record<SeStageKey, string>> = Object.freeze({
    attraction: "K2",
    force: "K3",
    positions: "K5",
    velocity: "K5",
    displacement: "K5",
    partials: "K5",
    scene: "toScene",
    k1: "K1",
});
/** The kernel each stage's values come from (the sabotage id and the noise fixture's kernel). */
export const SE_STAGE_KERNEL: Readonly<Record<SeStageKey, KernelId>> = Object.freeze({
    attraction: "fa2-attraction",
    force: "fa2-repulsion-exact",
    positions: "fa2-integrate",
    velocity: "fa2-integrate",
    displacement: "fa2-integrate",
    partials: "fa2-integrate",
    scene: "fa2-to-scene",
    k1: "fa2-stats-finalize",
});
/** The traced tolerance id each stage comparison is held to. */
export const SE_STAGE_TOLERANCE: Readonly<Record<SeStageKey, string>> = Object.freeze({
    attraction: "se-inspect.attraction",
    force: "se-force-parity",
    positions: "se-inspect.positions",
    velocity: "se-inspect.velocity",
    displacement: "se-displacement",
    partials: "se-inspect.partials",
    scene: "se-inspect.scene",
    k1: "se-inspect.k1",
});
/** A (kernel, fixture) pair of test/fixtures/noise. */
export interface SeNoiseFixtureName {
    readonly kernel: KernelId;
    readonly fixture: string;
}
/**
 * The (kernel, fixture) names of the P5 spring noise members: the eight stages on the UNSCALED random1k; the
 * layoutMetrics record after 100 iterations (`metrics100`, se-distributional.test.ts) on karate in 2D -- the plan's
 * fallback: random1k 2D fails the admission rule of that file (the f64 oracle's own metrics move 32% under a
 * one-ulp start perturbation) and karate 2D is the worst-conditioned admitted case (G5 section 7); and `traj10`, the free-running
 * 10-iteration positions on karate (se-trace.test.ts) -- not random1k: from the unit-square start ngraph's
 * defaults are chaotic there (the f64 oracle is 8.978 from ITSELF after 10 iterations under a one-ulp start
 * perturbation; G3-F3), so by the rule of fa2-distributional.test.ts the member is the worst-conditioned graph the
 * admission rule of se-trace.test.ts ADMITS at 10 (karate: the eight-perturbation spread 3.311e-4, 99.3% of a third
 * of the cap, the f32 oracle 5.279e-5 from the f64), and the record says so (P5-T4 deviation, G5 section 7). No
 * layout-oracle member: the design's 9.3 table has no CPU spring simulation.
 */
export const SE_NOISE_FIXTURES: Readonly<Record<SeStageKey | "traj10" | "metrics100", SeNoiseFixtureName>> =
    Object.freeze({
        attraction: { kernel: "fa2-attraction", fixture: "se-random1k-K2" },
        force: { kernel: "fa2-repulsion-exact", fixture: "se-random1k-K3" },
        positions: { kernel: "fa2-integrate", fixture: "se-random1k-K5" },
        velocity: { kernel: "fa2-integrate", fixture: "se-random1k-K5-velocity" },
        displacement: { kernel: "fa2-integrate", fixture: "se-random1k-K5-disp" },
        partials: { kernel: "fa2-integrate", fixture: "se-random1k-K5-partials" },
        scene: { kernel: "fa2-to-scene", fixture: "se-random1k-toScene" },
        k1: { kernel: "fa2-stats-finalize", fixture: "se-random1k-K1" },
        traj10: { kernel: "fa2-integrate", fixture: "se-karate-traj10" },
        metrics100: { kernel: "fa2-integrate", fixture: "se-karate-metrics100" },
    });

/**
 * The widening members (the FA2 precedent of the states10 / karate resync members): the eight stages of karate at the
 * base options, whose 34-node sums near zero give the partials / K1 fold and their twin comparison a larger relative
 * noise than random1k's (P5-T4 Step 5 finding); they feed the SAME rows as the random1k members. Written by
 * se-inspect.test.ts beside the random1k fixtures.
 */
export const SE_KARATE_FIXTURES: Readonly<Record<SeStageKey, SeNoiseFixtureName>> = Object.freeze({
    attraction: { kernel: "fa2-attraction", fixture: "se-karate-K2" },
    force: { kernel: "fa2-repulsion-exact", fixture: "se-karate-K3" },
    positions: { kernel: "fa2-integrate", fixture: "se-karate-K5" },
    velocity: { kernel: "fa2-integrate", fixture: "se-karate-K5-velocity" },
    displacement: { kernel: "fa2-integrate", fixture: "se-karate-K5-disp" },
    partials: { kernel: "fa2-integrate", fixture: "se-karate-K5-partials" },
    scene: { kernel: "fa2-to-scene", fixture: "se-karate-toScene" },
    k1: { kernel: "fa2-stats-finalize", fixture: "se-karate-K1" },
});

/**
 * The P5 spring tolerance ids, their spec caps and BASIS ROWS, in the shape of P5_TOLERANCE_CAPS (fr-parity.ts) with
 * the same basis-row convention: `<id>.oracle-f64` for the oracle-compared ids, `<id>.twin` for the twins,
 * `se-force-parity.oracle-f64` for `se-force-sum`; 1e-4 for the stages, the velocity and the displacement, 1e-3 for
 * the trajectory, 0.1 for `se-distributional`, 1e-5 for the twins; the ten `.cross` caps as the FR table's (1e-4 for
 * the stages, the velocity and the displacement, 2e-3 for the trajectory, 0.2 for the distributional row).
 */
export const SE_TOLERANCE_CAPS: Readonly<Record<string, { readonly cap: number; readonly basis: string }>> =
    Object.freeze({
        "se-inspect.attraction": { cap: 1e-4, basis: "se-inspect.attraction.oracle-f64" },
        "se-inspect.attraction.cross": { cap: 1e-4, basis: "se-inspect.attraction.cross" },
        "se-force-parity": { cap: 1e-4, basis: "se-force-parity.oracle-f64" },
        "se-force-parity.cross": { cap: 1e-4, basis: "se-force-parity.cross" },
        // traced to the force-parity row, as fa2-force-sum is; no member of its own, so no .cross
        "se-force-sum": { cap: 1e-4, basis: "se-force-parity.oracle-f64" },
        "se-inspect.positions": { cap: 1e-4, basis: "se-inspect.positions.oracle-f64" },
        "se-inspect.positions.cross": { cap: 1e-4, basis: "se-inspect.positions.cross" },
        "se-inspect.velocity": { cap: 1e-4, basis: "se-inspect.velocity.oracle-f64" },
        "se-inspect.velocity.cross": { cap: 1e-4, basis: "se-inspect.velocity.cross" },
        "se-displacement": { cap: 1e-4, basis: "se-displacement.oracle-f64" },
        "se-displacement.cross": { cap: 1e-4, basis: "se-displacement.cross" },
        "se-inspect.partials": { cap: 1e-4, basis: "se-inspect.partials.oracle-f64" },
        "se-inspect.partials.cross": { cap: 1e-4, basis: "se-inspect.partials.cross" },
        "se-inspect.scene": { cap: 1e-4, basis: "se-inspect.scene.oracle-f64" },
        "se-inspect.scene.cross": { cap: 1e-4, basis: "se-inspect.scene.cross" },
        "se-inspect.k1": { cap: 1e-4, basis: "se-inspect.k1.oracle-f64" },
        "se-inspect.k1.cross": { cap: 1e-4, basis: "se-inspect.k1.cross" },
        // 10 free-running iterations vs the f64 oracle
        "se-trajectory": { cap: 1e-3, basis: "se-trajectory.oracle-f64" },
        "se-trajectory.cross": { cap: 2e-3, basis: "se-trajectory.cross" },
        // layoutMetrics after 100 iterations vs the f64 oracle (design 11.4)
        "se-distributional": { cap: 0.1, basis: "se-distributional.oracle-f64" },
        "se-distributional.cross": { cap: 0.2, basis: "se-distributional.cross" },
        // design 11.5: the subgroup twin -- the K3 force, and the positions with the reductions that fold them (K5's
        // partials, the K1 fold) under one row, since the preset's positions never read a reduction result
        "se-twins.force": { cap: 1e-5, basis: "se-twins.force.twin" },
        "se-twins.positions": { cap: 1e-5, basis: "se-twins.positions.twin" },
    });

/**
 * The tolerance a spring parity test uses: the derived value of benchmarks/results/noise-floor.json (noiseFloorFor),
 * asserted to sit under its spec cap with the basis row the caps table names (a floor above the cap is a finding,
 * spec 10.4, never a loosened cap), or the spec cap itself during a recording run (GRAPHTY_NOISE_FLOOR_WRITE=1).
 * @param id - a P5 spring tolerance id
 * @returns the tolerance value and its basis row
 */
export function seTolerance(id: string): { readonly value: number; readonly basis: string } {
    const spec = SE_TOLERANCE_CAPS[id];
    if (spec === undefined) {
        throw new Error(`${id}: not a P5 spring tolerance id`);
    }
    if (WRITE) {
        return { value: spec.cap, basis: spec.basis };
    }
    const derived = noiseFloorFor(id);
    if (derived.basis !== spec.basis) {
        throw new Error(`${id}: the committed basis row ${derived.basis} is not ${spec.basis}`);
    }
    if (!(derived.value <= spec.cap)) {
        throw new Error(
            `${id}: the derived tolerance ${derived.value} is above the spec cap ${spec.cap} (a finding, spec 10.4)`,
        );
    }
    return derived;
}

// ---------------------------------------------------------------- the admission rule of the trajectory and distributional cases (G3-F3 / G3-F4)

/** The perturbations of the admission rule: eight starts one f32 ulp away from the seeded one. */
export const PERTURBATIONS = 8;

/**
 * The start with ONE coordinate moved by one f32 ulp: perturbation k touches node floor(k n / PERTURBATIONS) on axis
 * k mod dim, moving its bit pattern away from zero by one. The f64 oracle run from every such start measures the
 * spread the trajectory's OWN sensitivity produces (docs/decisions/G3.md finding G3-F3 / G3-F4): a horizon or a
 * case is admitted to an assertion only where that spread, and the f32 oracle's distance from the f64 one (the
 * model of any f32 implementation's rounding), sit under a third of the cap.
 * @param start - the seeded start
 * @param n - the node count
 * @param dim - 2 or 3
 * @param k - the perturbation index, 0 .. PERTURBATIONS - 1
 * @returns a copy of the start with one coordinate nudged
 */
export function perturbedStart(start: F32, n: number, dim: 2 | 3, k: number): F32 {
    const out = Float32Array.from(start);
    const node = Math.floor((k * n) / PERTURBATIONS);
    const at = 3 * node + (k % dim);
    const one = new Float32Array([out[at]]);
    const bits = new Uint32Array(one.buffer);
    bits[0] += 1;
    out[at] = one[0];
    return out;
}

/** One horizon of a trajectory sensitivity: the eight-perturbation spread of the f64 oracle and the f32 oracle's distance from it. */
interface TrajectorySensitivity {
    readonly spread: number;
    readonly f32: number;
}

/**
 * The admission measurement of a free-running spring-electrical trajectory (G3-F3 / G3-F4): the f64 oracle from the seeded start
 * against itself from the PERTURBATIONS one-ulp starts (the spread of the trajectory's own sensitivity) and against
 * the f32 oracle (the model of any f32 implementation's rounding), both as the floored per-node position error of
 * spec 11.4, at every horizon asked for.
 * @param s - the snapshot
 * @param start - the scene start (scale 1, zero center)
 * @param options - the spring options
 * @param mask - the fixed mask or null
 * @param horizons - the iteration counts to measure at
 * @returns the two errors per horizon
 */
export function seTrajectorySensitivity(
    s: GraphSnapshot,
    start: F32,
    options: SpringElectricalOptions,
    mask: NodeMask | null,
    horizons: readonly number[],
): ReadonlyMap<number, TrajectorySensitivity> {
    assertUnitStart(options);
    const n = s.nodeCount;
    const dim = options.dim ?? SE_DEFAULTS.dim;
    const make = (p: F32, precision: "f64" | "f32"): SpringElectricalOracle =>
        new SpringElectricalOracle(s, layoutStart(p, n, dim), seOracleOptions(options, mask, precision));
    const base = make(start, "f64");
    const f32 = make(start, "f32");
    const nudged = Array.from({ length: PERTURBATIONS }, (_, k) => make(perturbedStart(start, n, dim, k), "f64"));
    const out = new Map<number, TrajectorySensitivity>();
    const last = Math.max(...horizons);
    for (let t = 1; t <= last; t++) {
        base.step();
        f32.step();
        for (const o of nudged) {
            o.step();
        }
        if (horizons.includes(t)) {
            const reference = Float64Array.from(base.positions);
            out.set(t, {
                spread: Math.max(...nudged.map((o) => stageError(true, o.positions, reference).rel)),
                f32: stageError(true, f32.positions, reference).rel,
            });
        }
    }
    return out;
}

// ---------------------------------------------------------------- the stage capture (spec 11.9 item 2)

/** One stage of a capture. */
interface SeStageResult {
    readonly key: SeStageKey;
    /** Vector stages are compared per node with the floored stride-3 metric, scalar stages elementwise. */
    readonly vector: boolean;
    /** This adapter's raw output (f32 values widened). */
    readonly values: F64;
    /** The oracle's expectation in the same layout. */
    readonly expected: F64;
    /** stageError(vector, values, expected).rel */
    readonly error: number;
    readonly maxAbs: number;
}
/** Every stage of one capture. */
type SeStageCapture = Readonly<Record<SeStageKey, SeStageResult>>;

function stageResult(
    key: SeStageKey,
    vector: boolean,
    values: ArrayLike<number>,
    expected: ArrayLike<number>,
): SeStageResult {
    const v = Float64Array.from(values);
    const e = Float64Array.from(expected);
    const err = stageError(vector, v, e);
    return { key, vector, values: v, expected: e, error: err.rel, maxAbs: err.abs };
}

function minus(a: ArrayLike<number>, b: ArrayLike<number>): F64 {
    const out = new Float64Array(a.length);
    for (let i = 0; i < a.length; i++) {
        out[i] = a[i] - b[i];
    }
    return out;
}

function stateScalar(raw: Float32Array | Uint32Array, name: string): number {
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const v = FA2_STATE.readField(view, name, 0);
    if (typeof v !== "number") {
        throw new Error(`Fa2State.${name}: expected a scalar field`);
    }
    return v;
}

/**
 * Runs one preset iteration of every stage on FRESH simulations and compares each intermediate with the f64
 * oracle's: K2's springs, K3's force, K5's positions, velocity (through inspect("velocity"), PD-2), displacement and
 * partials A / B / C, toScene's scene positions, and K1's fold of iteration 2 (after one real step(1)) with the
 * kinetic energy it folded from that step's partials B (the aligned form of PD-4).
 * @param ctx - the context (inspect is switched on)
 * @param s - the snapshot
 * @param start - the scene start (scale 1, zero center)
 * @param options - the spring options
 * @param mask - the fixed mask or null
 * @returns one result per stage
 */
export async function captureSeStages(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    options: SpringElectricalOptions,
    mask: NodeMask | null,
): Promise<SeStageCapture> {
    assertUnitStart(options);
    const n = s.nodeCount;
    const dim = options.dim ?? SE_DEFAULTS.dim;
    const before = layoutStart(start, n, dim);
    const oracle = new SpringElectricalOracle(s, before, seOracleOptions(options, mask, "f64"));
    const first = oracle.step();
    const { stages } = oracle;
    const after = Float64Array.from(oracle.positions);
    // the K1 fold of iteration 2: the second step's record (its kineticEnergy is the SECOND step's; the fold carries the first's)
    const fold = oracle.step();

    const run = <T>(upTo: string, afterFirstStep: boolean, read: (st: StageIo) => Promise<T>): Promise<T> =>
        withSeSim(ctx, options, SE_TUNING, async (sim) => {
            sim.load(s, Float32Array.from(start));
            if (mask !== null) {
                sim.setFixed(mask);
            }
            if (afterFirstStep) {
                await sim.step(1);
            }
            const st = seStages(sim);
            await st.run(upTo);
            return read(st);
        });

    const attraction = await run("K2", false, async (st) => asF32(await st.read("force")));
    const force = await run("K3", false, async (st) => asF32(await st.read("force")));
    const k5 = await run("K5", false, async (st) => ({
        positions: xyzOf(asF32(await st.read("positions")), n),
        velocity: asF32(await st.read("velocity")),
        partials: readPartials(await st.read("partials")),
    }));
    const scene = await run("toScene", false, async (st) => asF32(await st.read("scenePositions")));
    const k1 = await run("K1", true, async (st) => {
        const raw = await st.read("state");
        return { state: readState(raw), kineticEnergy: stateScalar(raw, "kineticEnergy") };
    });

    const p = k5.partials;
    const o = stages.partials;
    return {
        attraction: stageResult("attraction", true, attraction, stages.attraction),
        force: stageResult("force", true, force, stages.force),
        positions: stageResult("positions", true, k5.positions, after),
        velocity: stageResult("velocity", true, k5.velocity, stages.velocity),
        displacement: stageResult("displacement", true, minus(k5.positions, before), minus(after, before)),
        // partials A / C as FA2's thirteen values plus partials B: the kinetic energy (readPartials sums the
        // swingTraction.x lanes, which K5 fills with the per-group kinetic energy under APPLY 2)
        partials: stageResult(
            "partials",
            false,
            [
                p.sum[0],
                p.sum[1],
                p.sum[2],
                p.sum[3],
                p.min[0],
                p.min[1],
                p.min[2],
                p.max[0],
                p.max[1],
                p.max[2],
                p.maxW,
                p.disp,
                p.free,
                p.swing,
            ],
            [
                o.sum[0],
                o.sum[1],
                o.sum[2],
                o.sumSq,
                o.min[0],
                o.min[1],
                o.min[2],
                o.max[0],
                o.max[1],
                o.max[2],
                o.maxSq,
                o.disp,
                o.free,
                o.kineticEnergy,
            ],
        ),
        scene: stageResult("scene", true, scene, after),
        k1: stageResult(
            "k1",
            false,
            [
                k1.state.centroid[0],
                k1.state.centroid[1],
                k1.state.centroid[2],
                k1.state.rmsRadius,
                k1.state.radius,
                k1.state.meanDisplacement,
                k1.state.settledCount,
                k1.state.iteration,
                k1.kineticEnergy,
            ],
            [
                fold.centroid[0],
                fold.centroid[1],
                fold.centroid[2],
                fold.rmsRadius,
                fold.layoutRadius,
                fold.meanDisplacement,
                fold.settledCount,
                2,
                first.kineticEnergy,
            ],
        ),
    };
}

/**
 * The check report of one stage: its error over its traced tolerance (the CheckReport shape of sabotage.ts).
 * @param capture - a stage capture
 * @param key - the stage
 * @returns the report (worst = error / tolerance)
 */
export function seStageReport(capture: SeStageCapture, key: SeStageKey): CheckReport {
    const r = capture[key];
    return {
        worst: ratioOf(r.error, seTolerance(SE_STAGE_TOLERANCE[key]).value),
        worstLabel: `${key} (${SE_STAGE_UP_TO[key]})`,
        samples: r.values.length,
    };
}
