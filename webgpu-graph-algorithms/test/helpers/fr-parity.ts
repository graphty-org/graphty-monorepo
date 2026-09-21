/**
 * The Fruchterman-Reingold half of what test/helpers/fa2-parity.ts is for ForceAtlas2 (P5-T4 Step 1; spec 11.4,
 * 11.9 items 2 and 4): the base options, a simulation factory with inspect() on, the stage-by-stage capture that
 * compares every kernel's intermediate of one FR iteration with the f64 oracle's (K2's attraction, K3's force, K5's
 * positions / displacement / partials, toScene's scene, the K1 fold with the traced temperature), the fixture names
 * of the P5 FR noise members, the tolerance caps and the ONE resolver of every FR tolerance. Shares only what
 * fa2-parity.ts exports (the graphs, the start array, the pure metrics, the decoders); never imports se-parity.ts.
 *
 * Units: every capture runs at scale 1 with a zero centre so the owner's scene array IS the layout state on both
 * sides (assertUnitStart). The `displacement` stage is the G5 quantity (design 13 row P5): the positions after K5
 * minus the start in layout units, on both sides, compared with the floored per-node metric of spec 11.4.
 */

import { type F32, type F64, type GraphSnapshot, type NodeMask } from "@graphty/graph-format";

import { FR_DEFAULTS } from "../../src/constants.js";
import type { GpuContext } from "../../src/context.js";
import { FA2_STATE, type KernelId } from "../../src/kernels.js";
import { ForceSimulation } from "../../src/layouts/force-simulation.js";
import { createFruchtermanReingold } from "../../src/layouts/fruchterman-reingold.js";
import type { FruchtermanReingoldStats, GpuLayoutTuning } from "../../src/types/layout.js";
import type { FruchtermanReingoldOptions } from "../../src/types/options.js";
import { type FrOracleOptions, FruchtermanReingoldOracle } from "../oracle/fruchterman-reingold.js";
import {
    asF32,
    assertUnitStart,
    layoutStart,
    readPartials,
    readState,
    stageError,
    type StageIo,
    xyzOf,
    yieldToEventLoop,
} from "./fa2-parity.js";
import { noiseFloorFor } from "./noise-floor.js";
import { type CheckReport, ratioOf } from "./sabotage.js";

// ---------------------------------------------------------------- options and simulations

/** The options every FR parity case starts from: layout units = scene units, seeded, settling disabled, the default budget of 50. */
export const FR_BASE_OPTIONS: FruchtermanReingoldOptions = Object.freeze({
    dim: 2,
    scale: 1,
    center: [0, 0, 0],
    seed: 7,
    iterations: 50,
    settleThreshold: 0,
    settleWindow: 10,
    iterationsPerStep: 1,
    maxInFlight: 2,
});
/** The tuning every FR parity case uses: the exact tier (the only one, DEP-P5-D). */
export const FR_TUNING: GpuLayoutTuning = Object.freeze({ repulsion: "exact" });
/** True in a recording run: every FR parity test is then held to the spec cap, not to the derived value (the P3 rule of fa2-parity.ts toleranceOf). */
const WRITE = process.env.GRAPHTY_NOISE_FLOOR_WRITE === "1";

/** The simulation createFruchtermanReingold builds, with its @internal members visible. */
type FrSim = ForceSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>;

/**
 * A Fruchterman-Reingold simulation with ctx.debug.inspect set BEFORE construction, asserted to be the
 * ForceSimulation the factory builds.
 * @param ctx - the context
 * @param options - the FR options
 * @param tuning - the GPU tuning
 * @returns the simulation
 */
export function createFrSim(ctx: GpuContext, options: FruchtermanReingoldOptions, tuning: GpuLayoutTuning): FrSim {
    ctx.debug.inspect = true;
    const sim = createFruchtermanReingold(ctx, { ...options, ...tuning });
    if (!(sim instanceof ForceSimulation)) {
        throw new Error("createFruchtermanReingold did not return a ForceSimulation");
    }
    return sim as FrSim;
}

/**
 * Runs `body` with a fresh simulation and disposes it afterwards (also on throw). The caller releases the snapshot.
 * @param ctx - the context
 * @param options - the FR options
 * @param tuning - the GPU tuning
 * @param body - the work
 * @returns whatever body returns
 */
export async function withFrSim<T>(
    ctx: GpuContext,
    options: FruchtermanReingoldOptions,
    tuning: GpuLayoutTuning,
    body: (sim: FrSim) => Promise<T>,
): Promise<T> {
    const sim = createFrSim(ctx, options, tuning);
    try {
        return await body(sim);
    } finally {
        sim.dispose();
    }
}

/**
 * The inspect() / debugRunStages() pair of an FR simulation, or a throw when ctx.debug.inspect was not honoured.
 * @param sim - the simulation
 * @returns the pair
 */
export function frStages(sim: FrSim): StageIo {
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
 * The oracle options of a GPU configuration: the record's k / budget / settle threshold with FR_DEFAULTS applied,
 * the dimension, the mask and the precision.
 * @param options - the GPU options
 * @param mask - the fixed mask or null
 * @param precision - the oracle's scratch precision
 * @returns the FrOracleOptions
 */
export function frOracleOptions(
    options: FruchtermanReingoldOptions,
    mask: NodeMask | null,
    precision: "f64" | "f32",
): FrOracleOptions {
    return {
        precision,
        dim: options.dim ?? FR_DEFAULTS.dim,
        k: options.k ?? FR_DEFAULTS.k,
        iterations: options.iterations ?? FR_DEFAULTS.iterations,
        cooling: options.cooling ?? FR_DEFAULTS.cooling,
        settleThreshold: options.settleThreshold ?? FR_DEFAULTS.settleThreshold,
        fixed: mask,
    };
}

// ---------------------------------------------------------------- the stage tables

/** The seven inspect() stages of one FR iteration in model order (K2, K3, K5 three ways, toScene, the K1 fold). */
export type FrStageKey = "attraction" | "force" | "positions" | "displacement" | "partials" | "scene" | "k1";
/** The stage keys as an iteration list, in model order. */
export const FR_STAGE_KEYS: readonly FrStageKey[] = Object.freeze([
    "attraction",
    "force",
    "positions",
    "displacement",
    "partials",
    "scene",
    "k1",
]);
/** The model stage debugRunStages() runs up to for each key. */
const FR_STAGE_UP_TO: Readonly<Record<FrStageKey, string>> = Object.freeze({
    attraction: "K2",
    force: "K3",
    positions: "K5",
    displacement: "K5",
    partials: "K5",
    scene: "toScene",
    k1: "K1",
});
/** The kernel each stage's values come from (the sabotage id and the noise fixture's kernel). */
export const FR_STAGE_KERNEL: Readonly<Record<FrStageKey, KernelId>> = Object.freeze({
    attraction: "fa2-attraction",
    force: "fa2-repulsion-exact",
    positions: "fa2-integrate",
    displacement: "fa2-integrate",
    partials: "fa2-integrate",
    scene: "fa2-to-scene",
    k1: "fa2-stats-finalize",
});
/** The traced tolerance id each stage comparison is held to. */
export const FR_STAGE_TOLERANCE: Readonly<Record<FrStageKey, string>> = Object.freeze({
    attraction: "fr-inspect.attraction",
    force: "fr-force-parity",
    positions: "fr-inspect.positions",
    displacement: "fr-displacement",
    partials: "fr-inspect.partials",
    scene: "fr-inspect.scene",
    k1: "fr-inspect.k1",
});
/** A (kernel, fixture) pair of test/fixtures/noise. */
export interface FrNoiseFixtureName {
    readonly kernel: KernelId;
    readonly fixture: string;
}
/**
 * The (kernel, fixture) names of the P5 FR noise members: the seven stages on the UNSCALED random1k (the P3 rule);
 * the layoutMetrics record after 100 iterations (`metrics100`, fr-distributional.test.ts) on the UNSCALED random1k
 * in 3D -- not 2D: no 2D candidate passes the admission rule of that file (the f64 oracle's own metrics move 5-9%
 * under a one-ulp start perturbation), so the member is the worst-conditioned ADMITTED case, as the plan's own
 * fallback rule directs (G5 section 7); `layout10`, the karate comparison with @graphty/layout's CPU class after
 * 10 iterations WITH the fixed mask (fr-layout-oracle.test.ts: the free karate is not admitted at 10, the f32 oracle
 * 3.728e-4 from the f64 there, and the pinned karate is, 1.813e-5); and `traj10`, the
 * free-running 10-iteration positions on the UNSCALED grid10 (fr-trace.test.ts) -- not random1k: the plan named the
 * random1k trajectory, but its f32 arithmetic is 3.9e-3 (NVIDIA) / 8.8e-3 (the f32 oracle, lavapipe) from the f64
 * oracle after 10 iterations, above the 1e-3 cap, so by the rule of fa2-distributional.test.ts the member is the
 * worst-conditioned graph the admission rule of fr-trace.test.ts ADMITS at 10 (grid10: the f32 oracle 1.817e-4
 * from the f64, the eight-perturbation spread 1.125e-4), and the record says so (P5-T4 deviation, G5 section 7).
 */
export const FR_NOISE_FIXTURES: Readonly<
    Record<FrStageKey | "traj10" | "layout10" | "metrics100", FrNoiseFixtureName>
> = Object.freeze({
    attraction: { kernel: "fa2-attraction", fixture: "fr-random1k-K2" },
    force: { kernel: "fa2-repulsion-exact", fixture: "fr-random1k-K3" },
    positions: { kernel: "fa2-integrate", fixture: "fr-random1k-K5" },
    displacement: { kernel: "fa2-integrate", fixture: "fr-random1k-K5-disp" },
    partials: { kernel: "fa2-integrate", fixture: "fr-random1k-K5-partials" },
    scene: { kernel: "fa2-to-scene", fixture: "fr-random1k-toScene" },
    k1: { kernel: "fa2-stats-finalize", fixture: "fr-random1k-K1" },
    traj10: { kernel: "fa2-integrate", fixture: "fr-grid10-traj10" },
    layout10: { kernel: "fa2-integrate", fixture: "fr-karate-layout10" },
    metrics100: { kernel: "fa2-integrate", fixture: "fr-random1k-3d-metrics100" },
});

/**
 * The widening members (the FA2 precedent of the states10 / karate resync members: extra fixtures that feed the SAME
 * rows so a floor covers more than one geometry): the seven stages of karate at the base options, whose 34-node
 * sums near zero give the partials / K1 fold a larger relative noise than random1k's, and K3's force on random1k
 * under `k: 0.3`, where the 90x larger repulsion sums 999 nearly cancelling terms and NVIDIA's 2.5-ulp division
 * leaves 2e-5 where the k = auto member measured 6e-7 (P5-T4 Step 5 finding). Written by fr-inspect.test.ts and
 * fr-twins.test.ts beside the random1k fixtures.
 */
export const FR_KARATE_FIXTURES: Readonly<Record<FrStageKey, FrNoiseFixtureName>> = Object.freeze({
    attraction: { kernel: "fa2-attraction", fixture: "fr-karate-K2" },
    force: { kernel: "fa2-repulsion-exact", fixture: "fr-karate-K3" },
    positions: { kernel: "fa2-integrate", fixture: "fr-karate-K5" },
    displacement: { kernel: "fa2-integrate", fixture: "fr-karate-K5-disp" },
    partials: { kernel: "fa2-integrate", fixture: "fr-karate-K5-partials" },
    scene: { kernel: "fa2-to-scene", fixture: "fr-karate-toScene" },
    k1: { kernel: "fa2-stats-finalize", fixture: "fr-karate-K1" },
});
/**
 * The k = 0.3 members on the unscaled random1k (the file's widening note): every stage, because the conditioning of
 * the force carries into K5's direction and so into the displacement, the positions and the scene; they feed the
 * same rows as the k = auto members (no twin rows: fr-twins.test.ts runs the base options only).
 */
export const FR_K03_FIXTURES: Readonly<Record<FrStageKey, FrNoiseFixtureName>> = Object.freeze({
    attraction: { kernel: "fa2-attraction", fixture: "fr-random1k-k03-K2" },
    force: { kernel: "fa2-repulsion-exact", fixture: "fr-random1k-k03-K3" },
    positions: { kernel: "fa2-integrate", fixture: "fr-random1k-k03-K5" },
    displacement: { kernel: "fa2-integrate", fixture: "fr-random1k-k03-K5-disp" },
    partials: { kernel: "fa2-integrate", fixture: "fr-random1k-k03-K5-partials" },
    scene: { kernel: "fa2-to-scene", fixture: "fr-random1k-k03-toScene" },
    k1: { kernel: "fa2-stats-finalize", fixture: "fr-random1k-k03-K1" },
});
/** The explicit optimal distance of that member. */
export const FR_K03 = 0.3;

/**
 * The P5 FR tolerance ids, their spec caps and BASIS ROWS, in the shape of P3_TOLERANCE_CAPS (fa2-parity.ts):
 * `basis` is the id of a noise ROW of benchmarks/results/noise-floor.json (test/noise-floor.test.ts looks it up and
 * throws when it was not recorded), never prose. Caps: design 13 row P5 for the displacement (<= 1e-4); the FA2 caps
 * for the stage kinds it shares (1e-4 per stage, 1e-5 for the twins, 0.1 for the metrics); 1e-3 for the two
 * 10-iteration trajectories (no controller: linear error growth). Every id a noise MEMBER carries also needs the
 * `<id>.cross` cap of its cross-adapter row (stageTolerances names it `<stem>.cross` and check() resolves it through
 * limitOf, which is capOf in write mode and throws for an id this table lacks). The cross caps follow P3: the oracle
 * cap for the stages and the displacement, twice the oracle cap for the trajectories (the triangle-inequality rule of
 * fa2-trace-parity.cross10) and 0.2 for the distributional row (as fa2-distributional.cross).
 */
export const P5_TOLERANCE_CAPS: Readonly<Record<string, { readonly cap: number; readonly basis: string }>> =
    Object.freeze({
        "fr-displacement": { cap: 1e-4, basis: "fr-displacement.oracle-f64" },
        "fr-displacement.cross": { cap: 1e-4, basis: "fr-displacement.cross" },
        "fr-force-parity": { cap: 1e-4, basis: "fr-force-parity.oracle-f64" },
        "fr-force-parity.cross": { cap: 1e-4, basis: "fr-force-parity.cross" },
        // traced to the force-parity row, as fa2-force-sum is; no member of its own, so no .cross
        "fr-force-sum": { cap: 1e-4, basis: "fr-force-parity.oracle-f64" },
        "fr-inspect.attraction": { cap: 1e-4, basis: "fr-inspect.attraction.oracle-f64" },
        "fr-inspect.attraction.cross": { cap: 1e-4, basis: "fr-inspect.attraction.cross" },
        "fr-inspect.positions": { cap: 1e-4, basis: "fr-inspect.positions.oracle-f64" },
        "fr-inspect.positions.cross": { cap: 1e-4, basis: "fr-inspect.positions.cross" },
        "fr-inspect.partials": { cap: 1e-4, basis: "fr-inspect.partials.oracle-f64" },
        "fr-inspect.partials.cross": { cap: 1e-4, basis: "fr-inspect.partials.cross" },
        "fr-inspect.scene": { cap: 1e-4, basis: "fr-inspect.scene.oracle-f64" },
        "fr-inspect.scene.cross": { cap: 1e-4, basis: "fr-inspect.scene.cross" },
        "fr-inspect.k1": { cap: 1e-4, basis: "fr-inspect.k1.oracle-f64" },
        "fr-inspect.k1.cross": { cap: 1e-4, basis: "fr-inspect.k1.cross" },
        // 10 free-running iterations vs the f64 oracle
        "fr-trajectory": { cap: 1e-3, basis: "fr-trajectory.oracle-f64" },
        "fr-trajectory.cross": { cap: 2e-3, basis: "fr-trajectory.cross" },
        // 10 iterations vs @graphty/layout's CPU FR (its row's "oracle-f64" class IS the CPU class)
        "fr-layout-oracle": { cap: 1e-3, basis: "fr-layout-oracle.oracle-f64" },
        "fr-layout-oracle.cross": { cap: 2e-3, basis: "fr-layout-oracle.cross" },
        // layoutMetrics after 100 iterations vs the f64 oracle (design 11.4)
        "fr-distributional": { cap: 0.1, basis: "fr-distributional.oracle-f64" },
        "fr-distributional.cross": { cap: 0.2, basis: "fr-distributional.cross" },
        // design 11.5: the subgroup twin -- the K3 force, and the positions with the reductions that fold them (K5's
        // partials, the K1 fold) under one row, since FR's positions never read a reduction result (no controller)
        "fr-twins.force": { cap: 1e-5, basis: "fr-twins.force.twin" },
        "fr-twins.positions": { cap: 1e-5, basis: "fr-twins.positions.twin" },
    });

/**
 * The tolerance an FR parity test uses: the derived value of benchmarks/results/noise-floor.json (noiseFloorFor),
 * asserted to sit under its spec cap with the basis row the caps table names (a floor above the cap is a finding,
 * spec 10.4, never a loosened cap), or the spec cap itself during a recording run (GRAPHTY_NOISE_FLOOR_WRITE=1),
 * when the derived values do not exist yet.
 * @param id - a P5 FR tolerance id
 * @returns the tolerance value and its basis row
 */
export function frTolerance(id: string): { readonly value: number; readonly basis: string } {
    const spec = P5_TOLERANCE_CAPS[id];
    if (spec === undefined) {
        throw new Error(`${id}: not a P5 FR tolerance id`);
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
 * The admission measurement of a free-running FR trajectory (G3-F3 / G3-F4): the f64 oracle from the seeded start
 * against itself from the PERTURBATIONS one-ulp starts (the spread of the trajectory's own sensitivity) and against
 * the f32 oracle (the model of any f32 implementation's rounding), both as the floored per-node position error of
 * spec 11.4, at every horizon asked for.
 * @param s - the snapshot
 * @param start - the scene start (scale 1, zero center)
 * @param options - the FR options
 * @param mask - the fixed mask or null
 * @param horizons - the iteration counts to measure at
 * @returns the two errors per horizon
 */
export async function frTrajectorySensitivity(
    s: GraphSnapshot,
    start: F32,
    options: FruchtermanReingoldOptions,
    mask: NodeMask | null,
    horizons: readonly number[],
): Promise<ReadonlyMap<number, TrajectorySensitivity>> {
    assertUnitStart(options);
    const n = s.nodeCount;
    const dim = options.dim ?? FR_DEFAULTS.dim;
    const make = (p: F32, precision: "f64" | "f32"): FruchtermanReingoldOracle =>
        new FruchtermanReingoldOracle(s, layoutStart(p, n, dim), frOracleOptions(options, mask, precision));
    const base = make(start, "f64");
    const f32 = make(start, "f32");
    const nudged = Array.from({ length: PERTURBATIONS }, (_, k) => make(perturbedStart(start, n, dim, k), "f64"));
    const out = new Map<number, TrajectorySensitivity>();
    const last = Math.max(...horizons);
    for (let t = 1; t <= last; t++) {
        await yieldToEventLoop(); // the ensemble runs for tens of seconds on random1k
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
interface FrStageResult {
    readonly key: FrStageKey;
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
type FrStageCapture = Readonly<Record<FrStageKey, FrStageResult>>;

function stageResult(
    key: FrStageKey,
    vector: boolean,
    values: ArrayLike<number>,
    expected: ArrayLike<number>,
): FrStageResult {
    const v = Float64Array.from(values);
    const e = Float64Array.from(expected);
    const err = stageError(vector, v, e);
    return { key, vector, values: v, expected: e, error: err.rel, maxAbs: err.abs };
}

/**
 * a - b elementwise (the displacement of both sides: the positions after K5 minus the start).
 * @param a - the positions after
 * @param b - the positions before
 * @returns the difference
 */
function minus(a: ArrayLike<number>, b: ArrayLike<number>): F64 {
    const out = new Float64Array(a.length);
    for (let i = 0; i < a.length; i++) {
        out[i] = a[i] - b[i];
    }
    return out;
}

/**
 * The model field `name` of an inspect("state") readback, decoded through the generated block.
 * @param raw - the readback
 * @param name - "temperature" or "kineticEnergy"
 * @returns the value
 */
function readStateScalar(raw: Float32Array | Uint32Array, name: string): number {
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const v = FA2_STATE.readField(view, name, 0);
    if (typeof v !== "number") {
        throw new Error(`Fa2State.${name}: expected a scalar field`);
    }
    return v;
}

/**
 * Runs one FR iteration of every stage on FRESH simulations (the FA2 rule: no stage sees another's debug run) and
 * compares each intermediate with the f64 oracle's: K2's attraction, K3's force, K5's positions, displacement and
 * partials A / C, toScene's scene positions, and K1's fold of iteration 2 (after one real step(1)) with the traced
 * temperature of that iteration.
 * @param ctx - the context (inspect is switched on)
 * @param s - the snapshot
 * @param start - the scene start (scale 1, zero center)
 * @param options - the FR options
 * @param mask - the fixed mask or null
 * @returns one result per stage
 */
export async function captureFrStages(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    options: FruchtermanReingoldOptions,
    mask: NodeMask | null,
): Promise<FrStageCapture> {
    assertUnitStart(options);
    const n = s.nodeCount;
    const dim = options.dim ?? FR_DEFAULTS.dim;
    const before = layoutStart(start, n, dim);
    const oracle = new FruchtermanReingoldOracle(s, before, frOracleOptions(options, mask, "f64"));
    oracle.step();
    const { stages } = oracle;
    const after = Float64Array.from(oracle.positions);
    // the K1 fold of iteration 2 and its temperature (index 1): the second step's record
    const fold = oracle.step();

    const run = <T>(upTo: string, afterFirstStep: boolean, read: (st: StageIo) => Promise<T>): Promise<T> =>
        withFrSim(ctx, options, FR_TUNING, async (sim) => {
            sim.load(s, Float32Array.from(start));
            if (mask !== null) {
                sim.setFixed(mask);
            }
            if (afterFirstStep) {
                await sim.step(1);
            }
            const st = frStages(sim);
            await st.run(upTo);
            return read(st);
        });

    const attraction = await run("K2", false, async (st) => asF32(await st.read("force")));
    const force = await run("K3", false, async (st) => asF32(await st.read("force")));
    const k5 = await run("K5", false, async (st) => ({
        positions: xyzOf(asF32(await st.read("positions")), n),
        partials: readPartials(await st.read("partials")),
    }));
    const scene = await run("toScene", false, async (st) => asF32(await st.read("scenePositions")));
    const k1 = await run("K1", true, async (st) => {
        const raw = await st.read("state");
        return { state: readState(raw), temperature: readStateScalar(raw, "temperature") };
    });

    const p = k5.partials;
    const o = stages.partials;
    return {
        attraction: stageResult("attraction", true, attraction, stages.attraction),
        force: stageResult("force", true, force, stages.force),
        positions: stageResult("positions", true, k5.positions, after),
        displacement: stageResult("displacement", true, minus(k5.positions, before), minus(after, before)),
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
                k1.temperature,
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
                fold.temperature,
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
export function frStageReport(capture: FrStageCapture, key: FrStageKey): CheckReport {
    const r = capture[key];
    return {
        worst: ratioOf(r.error, frTolerance(FR_STAGE_TOLERANCE[key]).value),
        worstLabel: `${key} (${FR_STAGE_UP_TO[key]})`,
        samples: r.values.length,
    };
}
