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

import { type F32, type GraphSnapshot, type NodeMask } from "@graphty/graph-format";

import { FR_DEFAULTS } from "../../src/constants.js";
import type { GpuContext } from "../../src/context.js";
import type { KernelId } from "../../src/kernels.js";
import { ForceSimulation } from "../../src/layouts/force-simulation.js";
import { createFruchtermanReingold } from "../../src/layouts/fruchterman-reingold.js";
import type { FruchtermanReingoldStats, GpuLayoutTuning } from "../../src/types/layout.js";
import type { FruchtermanReingoldOptions } from "../../src/types/options.js";
import { type FrOracleOptions, FruchtermanReingoldOracle } from "../oracle/fruchterman-reingold.js";
import type { CheckReport } from "./check-report.js";
import {
    asF32,
    assertUnitStart,
    foldValues,
    layoutStart,
    partialsValues,
    readPartials,
    readState,
    stageCheck,
    type StageIo,
    type StageResult,
    stageResult,
    stageRunner,
    xyzOf,
} from "./fa2-parity.js";
import { resolveTolerance } from "./noise-floor.js";
import {
    minus,
    oracleFoldValues,
    oraclePartialsValues,
    stateScalar,
    type TrajectorySensitivity,
    trajectorySensitivity,
} from "./spring-parity.js";

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
 * The tolerance an FR parity test uses: resolveTolerance over P5_TOLERANCE_CAPS.
 * @param id - a P5 FR tolerance id
 * @returns the tolerance value and its basis row
 */
export function frTolerance(id: string): { readonly value: number; readonly basis: string } {
    return resolveTolerance(P5_TOLERANCE_CAPS, id, "P5 FR");
}

// ---------------------------------------------------------------- the admission rule of the trajectory and distributional cases (G3-F3 / G3-F4)

export { PERTURBATIONS, perturbedStart } from "./spring-parity.js";

/**
 * The admission measurement of a free-running FR trajectory (spring-parity.ts trajectorySensitivity over the FR
 * oracle).
 * @param s - the snapshot
 * @param start - the scene start (scale 1, zero center)
 * @param options - the FR options
 * @param mask - the fixed mask or null
 * @param horizons - the iteration counts to measure at
 * @returns the two errors per horizon
 */
export function frTrajectorySensitivity(
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
    return trajectorySensitivity(make, start, n, dim, horizons);
}

// ---------------------------------------------------------------- the stage capture (spec 11.9 item 2)

/** Every stage of one capture. */
type FrStageCapture = Readonly<Record<FrStageKey, StageResult<FrStageKey>>>;

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

    const run = stageRunner((body) => withFrSim(ctx, options, FR_TUNING, body), frStages, s, start, mask);

    const attraction = await run("K2", false, async (st) => asF32(await st.read("force")));
    const force = await run("K3", false, async (st) => asF32(await st.read("force")));
    const k5 = await run("K5", false, async (st) => ({
        positions: xyzOf(asF32(await st.read("positions")), n),
        partials: readPartials(await st.read("partials")),
    }));
    const scene = await run("toScene", false, async (st) => asF32(await st.read("scenePositions")));
    const k1 = await run("K1", true, async (st) => {
        const raw = await st.read("state");
        return { state: readState(raw), temperature: stateScalar(raw, "temperature") };
    });

    return {
        attraction: stageResult("attraction", true, attraction, stages.attraction),
        force: stageResult("force", true, force, stages.force),
        positions: stageResult("positions", true, k5.positions, after),
        displacement: stageResult("displacement", true, minus(k5.positions, before), minus(after, before)),
        partials: stageResult("partials", false, partialsValues(k5.partials), oraclePartialsValues(stages.partials)),
        scene: stageResult("scene", true, scene, after),
        k1: stageResult(
            "k1",
            false,
            [...foldValues(k1.state), k1.temperature],
            [...oracleFoldValues(fold), fold.temperature],
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
    return stageCheck(capture[key], frTolerance(FR_STAGE_TOLERANCE[key]).value, FR_STAGE_UP_TO[key]);
}
