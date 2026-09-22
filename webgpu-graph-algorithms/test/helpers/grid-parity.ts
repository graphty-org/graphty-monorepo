/**
 * The grid-tier half of what test/helpers/fa2-parity.ts is for the exact tier (P4-T11; spec 11.4, 11.9 items 2-4,
 * 7.8; PD-19, PD-20): the option / tuning constants, the stage-by-stage capture of one grid iteration against the
 * f64 field oracles of test/oracle/grid-field.ts (the u32 build stages bitwise, the pyramid, the far field, the near
 * field, the K5 positions and the K1 grid block within traced tolerances), the exact-vs-grid comparison whose
 * reference is the EXACT GPU TIER on the same adapter from the same start (design 7.8: the exact kernel is the
 * oracle of the approximation; PD-19), the fixture names of the P4 noise members, the tolerance caps and the ONE
 * resolver of every P4 tolerance. Shares what fa2-parity.ts exports (the options, the simulation factory, the
 * decoders, the metrics); never imports fr-parity.ts or se-parity.ts.
 *
 * Units: every capture runs at scale 1 with a zero centre (assertUnitStart), so the owner's scene array IS the
 * layout state on both sides. A one-cell fixture (`hubcell`, `onecell1k`, `onecell1025`: every position inside a
 * 1e-3 box around 0.1) takes ONE anchor node moved to (100, 100, 100) inside the layout (gridFixture): without it
 * the box itself would be the extent and its nodes would spread over the whole grid; with it K1's extent is
 * `extentFactor x rmsRadius` = 6 x 100 / sqrt(n) (4.2 at 20k nodes, 18 at 1,025), the finest cell is 8e-3 .. 4e-2
 * wide, the box sits in one finest cell and the anchor in the outside pseudo-cell, so the hub path (G4b) and the
 * sampling draws of G7 both run inside the simulation with a frame like the primitives suites' unit box
 * (test/helpers/grid.ts). A nearer anchor (1, 1, 1) was measured first: its 0.054 extent makes the finest cell
 * 1e-4 wide at coordinates of 0.1, and the far field's `pi - centroid` then cancels to a few f32 ulps, which the
 * RTX 4070 SUPER's 2.5-ulp division (G3-F6) turns into a 1.4e-3 far-field floor -- an ill-conditioned frame, not
 * a kernel defect (the record's item).
 */

import { type F32, type F64, type GraphSnapshot, type NodeMask, type U32 } from "@graphty/graph-format";

import { FA2_DEFAULTS } from "../../src/constants.js";
import type { GpuContext } from "../../src/context.js";
import { FA2_STATE } from "../../src/kernels.js";
import { resolveLayoutTuning } from "../../src/layouts/forceatlas2.js";
import { resolveNodeMass } from "../../src/layouts/inputs.js";
import { type GridSpec, gridSpecFor } from "../../src/primitives/grid.js";
import type { GpuLayoutTuning } from "../../src/types/layout.js";
import type { ForceAtlas2Options } from "../../src/types/options.js";
import { gridOracleBuild, type GridOracleInput } from "../oracle/grid.js";
import {
    gridOracleAttraction,
    gridOracleFarField,
    gridOracleGravity,
    gridOracleIntegrate,
    gridOracleK1,
    gridOracleNearField,
} from "../oracle/grid-field.js";
import { gridOraclePyramid } from "../oracle/grid-pyramid.js";
import {
    asF32,
    assertUnitStart,
    BASE_OPTIONS,
    debugStages,
    FLOOR_FRACTION,
    layoutStart,
    PAPER,
    stageError,
    type StageIo,
    startPositions,
    withSim,
    xyzOf,
} from "./fa2-parity.js";
import { fixture } from "./graphs.js";
import { fieldRelError, flooredRelError } from "./matchers.js";
import { noiseFloorFor } from "./noise-floor.js";
import { type CheckReport, ratioOf } from "./sabotage.js";

// ---------------------------------------------------------------- options and tunings

/** The options every grid parity case starts from: fa2-parity's BASE_OPTIONS (scale 1, zero centre, seed 7, settling off). */
export const GRID_BASE_OPTIONS: ForceAtlas2Options = BASE_OPTIONS;
/** The grid tier, bitwise reproducible (spec 7.16), paper mode. */
export const GRID_TUNING: GpuLayoutTuning = Object.freeze({ repulsion: "grid", deterministic: true, compat: "paper" });
/** The exact tier the approximation is measured against (PD-19): fa2-parity's paper-mode tuning. */
export const EXACT_TUNING: GpuLayoutTuning = PAPER;
/**
 * The seeds of the unbiasedness item (G4 item 2 after G4-F2): the mean of the force after G7 at NEAR_MAX_SAMPLING
 * over this many seeded iterations is held to grid-unbiased in the whole-field norm (fieldRelError). Measured on the
 * RTX 4070 SUPER (`tmp/p4/close/f2close/ladder-*.log`, in the G4 record): the ratio falls as 1 / sqrt(seeds) from
 * 2.7e-1 at 32 seeds to 4.9e-2 at 1,024 and 2.5e-2 at 4,096 on hubcell (20k), the same on onecell1025 and on the
 * 400-node lavapipe fixture, so 4,096 sits at half the 5 % cap; the floored per-node RMS of the same mean is
 * 1.8e-1 at 1,024 seeds (the cell's coincident kicks under a 2,500x sampling lever), which is why the item is held
 * in the whole-field norm. A power of two: the ladder prints every doubling from UNBIASED_LADDER_FIRST.
 */
export const UNBIASED_SEEDS = 4096;
/** The first rung of the printed ladder (the design's 32 seeds, so its number is always on record). */
export const UNBIASED_LADDER_FIRST = 32;
/** The `nearMax` of the unbiasedness item: eight draws of a 20,000-entry cell (the plan's T11 item 3). */
export const NEAR_MAX_SAMPLING = 8;

/** True in a recording run: every grid parity test is then held to the spec cap, not to the derived value. */
const WRITE = process.env.GRAPHTY_NOISE_FLOOR_WRITE === "1";
/** The one-cell fixtures that take an anchor node inside the layout (the module comment). */
const ONE_CELL_FIXTURES: readonly string[] = Object.freeze(["hubcell", "onecell1k", "onecell1025"]);
/** Every 4th node of a per-node noise fixture (the unscaled random20k: 5,000 nodes, 15,000 values per file). */
const NODE_STRIDE = 4;
/** At most this many cells of every pyramid level in the pyramid noise fixture (every level contributes; the coarse levels whole). */
const PYRAMID_LEVEL_SAMPLES = 1024;

/** The anchor's coordinate on every axis (the module comment). */
const ANCHOR = 100;

/**
 * A positioned fixture's start (its own positions, the seeded start when it supplies none), with the anchor of a
 * one-cell fixture: its LAST node moved to (ANCHOR, ANCHOR, ANCHOR).
 * @param name - the fixture name
 * @param scale - the fixture scale
 * @param options - the layout options (the seed and dimension of a seeded start)
 * @returns the snapshot and the scene start
 */
export function gridFixture(
    name: string,
    scale: number,
    options: ForceAtlas2Options,
): { readonly snapshot: GraphSnapshot; readonly start: F32 } {
    const f = fixture(name, scale);
    const start = f.positions === null ? startPositions(f.snapshot, options, false) : Float32Array.from(f.positions);
    if (ONE_CELL_FIXTURES.includes(name)) {
        const last = f.snapshot.nodeCount - 1;
        start[3 * last] = ANCHOR;
        start[3 * last + 1] = ANCHOR;
        start[3 * last + 2] = ANCHOR;
    }
    return { snapshot: f.snapshot, start };
}

// ---------------------------------------------------------------- the state header

/**
 * The Fa2State fields of the grid tier (spec 7.7), decoded from an inspect("state") readback. The type of a value the capture / comparison returns (knip: exported for the
 * signature, not imported by name).
 * @public
 */
export interface GridStateFields {
    readonly gridMin: readonly [number, number, number];
    /** `gridMin.w`. */
    readonly cellSize: number;
    readonly invCellSize: number;
    readonly eps: number;
    readonly outsideGrid: number;
    readonly maxCellOccupancy: number;
    readonly centroid: readonly [number, number, number];
}

/**
 * The grid fields of a state readback, through the generated block.
 * @param raw - the readback
 * @returns the fields
 */
function readGridState(raw: Float32Array | Uint32Array): GridStateFields {
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const scalar = (name: string): number => {
        const v = FA2_STATE.readField(view, name, 0);
        if (typeof v !== "number") {
            throw new Error(`Fa2State.${name}: expected a scalar field`);
        }
        return v;
    };
    const vector = (name: string): readonly number[] => {
        const v = FA2_STATE.readField(view, name, 0);
        if (typeof v === "number") {
            throw new Error(`Fa2State.${name}: expected a vector field`);
        }
        return v;
    };
    const gridMin = vector("gridMin");
    const centroid = vector("centroid");
    return {
        gridMin: [gridMin[0], gridMin[1], gridMin[2]],
        cellSize: gridMin[3],
        invCellSize: scalar("invCellSize"),
        eps: scalar("eps"),
        outsideGrid: scalar("outsideGrid"),
        maxCellOccupancy: scalar("maxCellOccupancy"),
        centroid: [centroid[0], centroid[1], centroid[2]],
    };
}

// ---------------------------------------------------------------- the stage tables

/** The inspect() stages of one grid iteration in model order (G1, G2, G3, G5, G6, G7, K5, the K1 grid block). */
export type GridStageKey =
    | "cellKey"
    | "sortedIdx"
    | "cellStart"
    | "pyramid"
    | "farField"
    | "nearField"
    | "positions"
    | "k1";
/** The stage keys as an iteration list, in model order. */
export const GRID_STAGE_KEYS: readonly GridStageKey[] = Object.freeze([
    "cellKey",
    "sortedIdx",
    "cellStart",
    "pyramid",
    "farField",
    "nearField",
    "positions",
    "k1",
]);
/** The model stage debugRunStages() runs up to for each key. */
const GRID_STAGE_UP_TO: Readonly<Record<GridStageKey, string>> = Object.freeze({
    cellKey: "G1",
    sortedIdx: "G3",
    cellStart: "G3",
    pyramid: "G5",
    farField: "G6",
    nearField: "G7",
    positions: "K5",
    k1: "K1",
});
/** The kernel each stage's values come from (the sabotage id and the noise fixture's kernel). */
export const GRID_STAGE_KERNEL: Readonly<Record<GridStageKey, string>> = Object.freeze({
    cellKey: "grid-cell-key",
    sortedIdx: "radix-scatter",
    cellStart: "histogram",
    pyramid: "grid-centroid",
    farField: "grid-far-field",
    nearField: "grid-near-field",
    positions: "fa2-integrate",
    k1: "fa2-stats-finalize",
});
/** The traced tolerance id of every f32 stage; the three u32 stages are bitwise (PD-10) and carry none. */
export const GRID_STAGE_TOLERANCE: Readonly<Record<GridStageKey, string | null>> = Object.freeze({
    cellKey: null,
    sortedIdx: null,
    cellStart: null,
    pyramid: "grid-inspect.pyramid",
    farField: "grid-inspect.farField",
    nearField: "grid-inspect.nearField",
    positions: "grid-inspect.positions",
    k1: "grid-inspect.k1",
});

/** A (kernel, fixture) pair of test/fixtures/noise; the approximation members carry a comparison name, not a kernel id. */
export interface GridNoiseFixtureName {
    readonly kernel: string;
    readonly fixture: string;
}
/**
 * The (kernel, fixture) names of the P4 f32 noise members: the five grid stages on the UNSCALED random20k in 2D
 * (written by grid-inspect.test.ts, the near field's twin by grid-twins.test.ts), the two pyramid rows the T9
 * primitives suite writes (`downsample`, `hubCentroid`; the twin of the latter by grid-twins.test.ts through the
 * same harness), the three tier rows the T5 / T6 suites write, and the five approximation members of PD-20 (the
 * exact-vs-grid force on random20k as the RMS and the p99 of the floored per-node error, the spread after 50 and
 * 200 iterations, the layoutMetrics record after 200 iterations, the UNBIASED_SEEDS-seed mean of the force after
 * G7 on hubcell at nearMax 8), written by grid-exact.test.ts (the writer case; the ladders themselves run in grid-unbiased.test.ts); their "oracle-f64" class holds the EXACT GPU TIER's
 * values (PD-19).
 * The WIDENING member (the P5 precedent of the karate / k 0.3 fixtures: an extra fixture feeding the SAME row so a
 * floor covers more than one geometry): `k1Isolated`, the K1 grid block on the UNSCALED isolated fixture in 2D,
 * whose first grid iteration throws the layout to a radius near 200 and makes the f32 fold of `sum |p - c|^2`
 * (K5's partials, folded by K1 into the rmsRadius the extent is taken from) 3e-6 from the f64 fold on the RTX
 * 4070 SUPER where random20k's is 9e-8 (measured at P4-T11; 9e-8 on lavapipe for both).
 */
export const GRID_NOISE_FIXTURES: Readonly<
    Record<
        | "pyramid"
        | "farField"
        | "nearField"
        | "positions"
        | "k1"
        | "k1Isolated"
        | "downsample"
        | "hubCentroid"
        | "tiersAttraction"
        | "tiersSegmentedReduce"
        | "tiersSpmv"
        | "exactRms"
        | "exactP99"
        | "expansion"
        | "distributional"
        | "unbiased",
        GridNoiseFixtureName
    >
> = Object.freeze({
    pyramid: { kernel: "grid-centroid", fixture: "random20k-pyramid" },
    farField: { kernel: "grid-far-field", fixture: "random20k-far" },
    nearField: { kernel: "grid-near-field", fixture: "random20k-near" },
    positions: { kernel: "fa2-integrate", fixture: "random20k-K5-grid" },
    k1: { kernel: "fa2-stats-finalize", fixture: "random20k-K1-grid" },
    k1Isolated: { kernel: "fa2-stats-finalize", fixture: "isolated-K1-grid" },
    downsample: { kernel: "grid-downsample", fixture: "random20k-L1" },
    hubCentroid: { kernel: "grid-centroid-hub", fixture: "hubcell-L0" },
    tiersAttraction: { kernel: "fa2-attraction", fixture: "hub10k-K2-tiers" },
    tiersSegmentedReduce: { kernel: "segmented-reduce", fixture: "hub10k-tiers" },
    tiersSpmv: { kernel: "spmv-pull", fixture: "hub10k-tiers" },
    exactRms: { kernel: "grid-exact", fixture: "random20k-rms" },
    exactP99: { kernel: "grid-exact", fixture: "random20k-p99" },
    expansion: { kernel: "grid-expansion", fixture: "random20k-spread200" },
    distributional: { kernel: "grid-distributional", fixture: "random20k-metrics200" },
    unbiased: { kernel: "grid-unbiased", fixture: `hubcell-mean${UNBIASED_SEEDS}` },
});

/**
 * The P4 tolerance ids, their spec caps and BASIS ROWS, in the shape of P3_TOLERANCE_CAPS / P5_TOLERANCE_CAPS:
 * `basis` is the id of a noise ROW of benchmarks/results/noise-floor.json, never prose. Caps: 1e-4 per f32 stage
 * (the FA2 stage cap; 1e-5 for the pull, its P2 cap), 1e-6 for the two twin rows (the one pyramid kernel with a
 * reduction, G4b, and the near field whose kernel carries the epilogue's reduction), and the gate's approximation
 * bounds of design 11.4 (RMS <= 5 %, p99 <= 25 %, expansion 25 %, distributional 15 %, unbiasedness 5 %), whose
 * basis rows record the MEASURED approximation floor against the exact GPU tier (PD-20: the derived value is
 * min(cap, 10 x floor); a floor above its cap is a finding for G4 section 7, never a loosened cap). Every id a
 * noise MEMBER carries also needs the `<id>.cross` cap of its cross-adapter row (the P5 rule: stageTolerances names
 * `<stem>.cross` and check() resolves it through limitOf, which throws for an id this table lacks): the stage cap
 * for the stages and the two force-vector approximation members (two adapters' grid forces differ by f32 rounding
 * alone), twice the oracle cap for the two trajectory-shaped members (the fa2-distributional.cross rule; a
 * 200-iteration paper-mode trajectory amplifies reduction noise chaotically, G3-F3) and the stage cap for the
 * many-seed mean (the same draws on every adapter). The unbiasedness cap is held to the WHOLE-FIELD ratio of the
 * UNBIASED_SEEDS-seed mean (fieldRelError; G4-F2: the floored per-node RMS of a 32-seed mean at nearMax 8 is the
 * sampling variance of one draw in 2,500, not the estimator's bias).
 */
export const P4_TOLERANCE_CAPS: Readonly<Record<string, { readonly cap: number; readonly basis: string }>> =
    Object.freeze({
        // grid-centroid / random20k-pyramid (every level; grid-inspect.test.ts writes it)
        "grid-inspect.pyramid": { cap: 1e-4, basis: "grid-inspect.pyramid.oracle-f64" },
        "grid-inspect.pyramid.cross": { cap: 1e-4, basis: "grid-inspect.pyramid.cross" },
        // grid-downsample / random20k-L1 (test/primitives/grid-pyramid.test.ts writes it)
        "grid-inspect.downsample": { cap: 1e-4, basis: "grid-inspect.downsample.oracle-f64" },
        "grid-inspect.downsample.cross": { cap: 1e-4, basis: "grid-inspect.downsample.cross" },
        // grid-centroid-hub / hubcell-L0 (test/primitives/grid-pyramid.test.ts writes it)
        "grid-inspect.hubCentroid": { cap: 1e-4, basis: "grid-inspect.hubCentroid.oracle-f64" },
        "grid-inspect.hubCentroid.cross": { cap: 1e-4, basis: "grid-inspect.hubCentroid.cross" },
        "grid-inspect.farField": { cap: 1e-4, basis: "grid-inspect.farField.oracle-f64" },
        "grid-inspect.farField.cross": { cap: 1e-4, basis: "grid-inspect.farField.cross" },
        "grid-inspect.nearField": { cap: 1e-4, basis: "grid-inspect.nearField.oracle-f64" },
        "grid-inspect.nearField.cross": { cap: 1e-4, basis: "grid-inspect.nearField.cross" },
        "grid-inspect.k1": { cap: 1e-4, basis: "grid-inspect.k1.oracle-f64" },
        "grid-inspect.k1.cross": { cap: 1e-4, basis: "grid-inspect.k1.cross" },
        "grid-inspect.positions": { cap: 1e-4, basis: "grid-inspect.positions.oracle-f64" },
        "grid-inspect.positions.cross": { cap: 1e-4, basis: "grid-inspect.positions.cross" },
        // design 11.5: the subgroup twins of the near field (G7's epilogue reduction) and the hub centroid (G4b's)
        "grid-twins.force": { cap: 1e-6, basis: "grid-twins.force.twin" },
        "grid-twins.hubCentroid": { cap: 1e-6, basis: "grid-twins.hubCentroid.twin" },
        // the P4-T5 / T6 tier rows (hub10k-tiers, hub10k-K2-tiers)
        "tiers-inspect.attraction": { cap: 1e-4, basis: "tiers-inspect.attraction.oracle-f64" },
        "tiers-inspect.attraction.cross": { cap: 1e-4, basis: "tiers-inspect.attraction.cross" },
        "segmented-reduce.tiers": { cap: 1e-4, basis: "segmented-reduce.tiers.oracle-f64" },
        "segmented-reduce.tiers.cross": { cap: 1e-4, basis: "segmented-reduce.tiers.cross" },
        "spmv-pull.tiers": { cap: 1e-5, basis: "spmv-pull.tiers.oracle-f64" },
        "spmv-pull.tiers.cross": { cap: 1e-5, basis: "spmv-pull.tiers.cross" },
        // the approximation caps (PD-20): the "oracle" row class here is the EXACT GPU tier (PD-19)
        "grid-exact.rms": { cap: 0.05, basis: "grid-exact.rms.oracle-f64" },
        "grid-exact.rms.cross": { cap: 1e-4, basis: "grid-exact.rms.cross" },
        "grid-exact.p99": { cap: 0.25, basis: "grid-exact.p99.oracle-f64" },
        "grid-exact.p99.cross": { cap: 1e-4, basis: "grid-exact.p99.cross" },
        "grid-expansion": { cap: 0.25, basis: "grid-expansion.oracle-f64" },
        "grid-expansion.cross": { cap: 0.5, basis: "grid-expansion.cross" },
        "grid-distributional": { cap: 0.15, basis: "grid-distributional.oracle-f64" },
        "grid-distributional.cross": { cap: 0.3, basis: "grid-distributional.cross" },
        "grid-unbiased": { cap: 0.05, basis: "grid-unbiased.oracle-f64" },
        "grid-unbiased.cross": { cap: 1e-4, basis: "grid-unbiased.cross" },
    });

/**
 * The tolerance a grid parity test uses: the derived value of benchmarks/results/noise-floor.json (noiseFloorFor),
 * asserted to sit under its spec cap with the basis row the caps table names (a floor above the cap is a finding,
 * spec 10.4, never a loosened cap), or the spec cap itself during a recording run (GRAPHTY_NOISE_FLOOR_WRITE=1),
 * when the derived values do not exist yet.
 * @param id - a P4 tolerance id
 * @returns the tolerance value and its basis row
 */
export function gridTolerance(id: string): { readonly value: number; readonly basis: string } {
    const spec = P4_TOLERANCE_CAPS[id];
    if (spec === undefined) {
        throw new Error(`${id}: not a P4 grid tolerance id`);
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

// ---------------------------------------------------------------- the noise fixture samples

/**
 * Every NODE_STRIDE-th node's three lanes of a stride-3 array (the per-node noise fixtures of the unscaled
 * random20k; the same nodes on every adapter and in the reference, so the floored metric's floor is the same).
 * @param values - stride-3 values
 * @param n - the node count
 * @returns the sampled stride-3 values
 */
export function sampleNodes(values: ArrayLike<number>, n: number): F64 {
    const count = Math.ceil(n / NODE_STRIDE);
    const out = new Float64Array(3 * count);
    for (let k = 0; k < count; k++) {
        const i = k * NODE_STRIDE;
        out[3 * k] = values[3 * i];
        out[3 * k + 1] = values[3 * i + 1];
        out[3 * k + 2] = values[3 * i + 2];
    }
    return out;
}

/**
 * The xyz lanes of at most PYRAMID_LEVEL_SAMPLES cells of every level (a per-level stride, so the coarse levels --
 * the accumulated sums -- are in the fixture whole and level 0 by a sample), as one stride-3 array.
 * @param xyz - the stride-3 xyz lanes of the whole pyramid (level 0 first, the pseudo-cell at index cells)
 * @param spec - the grid
 * @returns the sampled stride-3 values
 */
export function samplePyramid(xyz: ArrayLike<number>, spec: GridSpec): F64 {
    const out: number[] = [];
    for (let level = 0; level < spec.levels; level++) {
        const base = spec.levelOffsets[level];
        const count = (level + 1 < spec.levels ? spec.levelOffsets[level + 1] : spec.pyramidCells) - base;
        const stride = Math.max(1, Math.ceil(count / PYRAMID_LEVEL_SAMPLES));
        for (let c = 0; c < count; c += stride) {
            out.push(xyz[3 * (base + c)], xyz[3 * (base + c) + 1], xyz[3 * (base + c) + 2]);
        }
    }
    return Float64Array.from(out);
}

// ---------------------------------------------------------------- the stage capture (spec 11.9 item 2)

/**
 * One stage of a capture: u32 stages are bitwise (error 0 or Infinity), vector stages use the floored stride-3 metric, scalar stages the elementwise one. The type of a value the capture / comparison returns (knip: exported for the
 * signature, not imported by name).
 * @public
 */
export interface GridStageResult {
    readonly key: GridStageKey;
    readonly kind: "u32" | "vector" | "scalar";
    /** This adapter's raw output (f32 values widened; u32 as read). */
    readonly values: F64 | U32;
    /** The oracle's expectation in the same layout. */
    readonly expected: F64 | U32;
    readonly error: number;
    readonly maxAbs: number;
}
/**
 * The f64 field oracles a capture computed (stride 3 each), for checks that need one term alone (the isolated-node item). The type of a value the capture / comparison returns (knip: exported for the
 * signature, not imported by name).
 * @public
 */
export interface GridOracleFields {
    readonly attraction: F64;
    readonly farField: F64;
    readonly nearField: F64;
    readonly gravity: F64;
}
/** Every stage of one capture, the mass lane of the pyramid (exact integer sums, compared bitwise) and the oracle's terms. */
export interface GridStageCapture {
    readonly stages: Readonly<Record<GridStageKey, GridStageResult>>;
    /** The `sum m` lane of every pyramid cell as the GPU wrote it and as the oracle sums it. */
    readonly pyramidMass: { readonly values: F32; readonly expected: F64 };
    readonly oracle: GridOracleFields;
    readonly spec: GridSpec;
    /** The frame the GPU built the iteration's grid with (the state after load, read after G3). */
    readonly frame: GridStateFields;
}

function u32Result(key: GridStageKey, values: U32, expected: U32): GridStageResult {
    let mismatches = values.length === expected.length ? 0 : Infinity;
    let maxAbs = 0;
    for (let i = 0; i < values.length && mismatches === 0; i++) {
        if (values[i] !== expected[i]) {
            mismatches = 1;
            maxAbs = Math.abs(values[i] - expected[i]);
        }
    }
    return { key, kind: "u32", values, expected, error: mismatches === 0 ? 0 : Infinity, maxAbs };
}

function f32Result(
    key: GridStageKey,
    kind: "vector" | "scalar",
    values: ArrayLike<number>,
    expected: ArrayLike<number>,
): GridStageResult {
    const v = Float64Array.from(values);
    const e = Float64Array.from(expected);
    const err = stageError(kind === "vector", v, e);
    return { key, kind, values: v, expected: e, error: err.rel, maxAbs: err.abs };
}

/**
 * a + b (+ c + d) elementwise.
 * @param terms - stride-3 arrays of one length
 * @returns the sum
 */
function sum3(...terms: readonly F64[]): F64 {
    const out = new Float64Array(terms[0].length);
    for (const t of terms) {
        for (let i = 0; i < out.length; i++) {
            out[i] += t[i];
        }
    }
    return out;
}

/**
 * A u32 readback, or a throw on a Float32Array one.
 * @param x - the readback
 * @returns the words
 */
function asU32(x: Float32Array | Uint32Array): U32 {
    if (!(x instanceof Uint32Array)) {
        throw new Error("expected a Uint32Array readback");
    }
    return Uint32Array.from(x);
}

/**
 * Runs one grid iteration of every stage on FRESH simulations (the FA2 rule: no stage sees another's debug run) and
 * compares each intermediate with the f64 oracles': the cell keys after G1 (bitwise; the radix passes ping-pong
 * through cellKey afterwards), the sorted order and the cell starts after G3 (bitwise, the oracle SEEDED with the
 * GPU's own gridMin / invCellSize so every key is reproducible, PD-10), every level of the pyramid after G5 (the xyz
 * lanes by the floored per-cell metric, the mass lane bitwise), the force after G6 against the f64 attraction plus
 * far field, the force after G7 against the f64 total (attraction, far field, near field, gravity: G7's fused
 * epilogue writes the total, and a delta of two f32 readbacks would carry the rounding of the larger term), the
 * positions after K5 against K4 / K5 in f64 over the f64 total, and the K1 grid block of iteration 2 (after one
 * real step(1)) against the f32 frame arithmetic over the fold of the f64 positions, with `outsideGrid` and
 * `maxCellOccupancy` the counts of the first build.
 * @param ctx - the context (inspect is switched on)
 * @param s - the snapshot
 * @param start - the scene start (scale 1, zero center)
 * @param options - the FA2 options
 * @param mask - the fixed mask or null
 * @param tuning - the grid tuning (default GRID_TUNING; a case passes `nearMax` through it)
 * @returns the capture
 */
export async function captureGridStages(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    options: ForceAtlas2Options,
    mask: NodeMask | null,
    tuning: GpuLayoutTuning = GRID_TUNING,
): Promise<GridStageCapture> {
    assertUnitStart(options);
    const n = s.nodeCount;
    const dim = options.dim ?? FA2_DEFAULTS.dim;
    const resolvedTuning = resolveLayoutTuning(tuning);
    const spec = gridSpecFor(n, dim, resolvedTuning);
    const before = layoutStart(start, n, dim);

    const run = <T>(upTo: string, afterFirstStep: boolean, read: (st: StageIo) => Promise<T>): Promise<T> =>
        withSim(ctx, options, tuning, async (sim) => {
            sim.load(s, Float32Array.from(start));
            if (mask !== null) {
                sim.setFixed(mask);
            }
            if (afterFirstStep) {
                await sim.step(1);
            }
            const st = debugStages(sim);
            await st.run(upTo);
            return read(st);
        });

    const cellKey = await run("G1", false, async (st) => asU32(await st.read("cellKey")));
    const g3 = await run("G3", false, async (st) => ({
        state: readGridState(await st.read("state")),
        positions: asF32(await st.read("positions")),
        sortedIdx: asU32(await st.read("sortedIdx")),
        cellStart: asU32(await st.read("cellStart")),
    }));
    const pyramid = await run("G5", false, async (st) => asF32(await st.read("pyramid")));
    const afterG6 = await run("G6", false, async (st) => asF32(await st.read("force")));
    const afterG7 = await run("G7", false, async (st) => asF32(await st.read("force")));
    const k5 = await run("K5", false, async (st) => xyzOf(asF32(await st.read("positions")), n));
    const k1 = await run("K1", true, async (st) => readGridState(await st.read("state")));

    // the oracles over the GPU's own frame and its f32 positions (xyz + mass)
    const { state } = g3;
    const input: GridOracleInput = {
        positions: g3.positions,
        n,
        spec,
        gridMin: state.gridMin,
        invCellSize: state.invCellSize,
    };
    const build = gridOracleBuild(input);
    const oraclePyramid = gridOraclePyramid(build, input, ctx.workgroupSize);
    const params = {
        scalingRatio: options.scalingRatio ?? FA2_DEFAULTS.scalingRatio,
        eps: state.eps,
        nearMax: resolvedTuning.nearMax,
        iterationIndex: 0,
        seed: seedWordOf(options.seed),
    };
    const oracle: GridOracleFields = {
        attraction: gridOracleAttraction(s, input),
        farField: gridOracleFarField(input, oraclePyramid, params),
        nearField: gridOracleNearField(input, build, params),
        gravity: gridOracleGravity(input, state.centroid, options.gravity ?? FA2_DEFAULTS.gravity),
    };
    const total = sum3(oracle.attraction, oracle.farField, oracle.nearField, oracle.gravity);
    const mass = resolveNodeMass(s, options.nodeMass);
    const after = gridOracleIntegrate(
        total,
        before,
        mass,
        dim,
        options.jitterTolerance ?? FA2_DEFAULTS.jitterTolerance,
        mask,
    ).positions;

    // the pyramid's lanes: xyz per cell (the floored metric) and the mass lane (exact integer sums)
    const cellsTotal = spec.pyramidCells;
    const gpuXyz = new Float64Array(3 * cellsTotal);
    const gpuMass = new Float32Array(cellsTotal);
    const wantXyz = new Float64Array(3 * cellsTotal);
    const wantMass = new Float64Array(cellsTotal);
    for (let level = 0; level < spec.levels; level++) {
        const base = spec.levelOffsets[level];
        const values = oraclePyramid.levels[level];
        for (let c = 0; c < values.length / 4; c++) {
            const at = base + c;
            gpuXyz[3 * at] = pyramid[4 * at];
            gpuXyz[3 * at + 1] = pyramid[4 * at + 1];
            gpuXyz[3 * at + 2] = pyramid[4 * at + 2];
            gpuMass[at] = pyramid[4 * at + 3];
            wantXyz[3 * at] = values[4 * c];
            wantXyz[3 * at + 1] = values[4 * c + 1];
            wantXyz[3 * at + 2] = values[4 * c + 2];
            wantMass[at] = values[4 * c + 3];
        }
    }

    // the K1 grid block of iteration 2: the fold of the positions after K5 (min / max / centroid, the rms radius
    // about the start-of-iteration centroid), then the f32 frame arithmetic; the counts are the first build's
    const c0 = [0, 0, 0];
    for (let i = 0; i < n; i++) {
        for (let k = 0; k < 3; k++) {
            c0[k] += before[3 * i + k] / n;
        }
    }
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    const sum = [0, 0, 0];
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
        let q2 = 0;
        for (let k = 0; k < 3; k++) {
            const p = after[3 * i + k];
            lo[k] = Math.min(lo[k], p);
            hi[k] = Math.max(hi[k], p);
            sum[k] += p;
            q2 += (p - c0[k]) * (p - c0[k]);
        }
        sumSq += q2;
    }
    const frame = gridOracleK1(
        {
            min: [lo[0], lo[1], lo[2]],
            max: [hi[0], hi[1], hi[2]],
            centroid: [sum[0] / n, sum[1] / n, sum[2] / n],
            rmsRadius: Math.sqrt(sumSq / n),
        },
        spec,
        resolvedTuning.extentFactor,
    );

    return {
        stages: {
            cellKey: u32Result("cellKey", cellKey, build.cellKey),
            sortedIdx: u32Result("sortedIdx", g3.sortedIdx, build.sortedIdx),
            cellStart: u32Result("cellStart", g3.cellStart, build.cellStart),
            pyramid: f32Result("pyramid", "vector", gpuXyz, wantXyz),
            farField: f32Result("farField", "vector", afterG6, sum3(oracle.attraction, oracle.farField)),
            nearField: f32Result("nearField", "vector", afterG7, total),
            positions: f32Result("positions", "vector", k5, after),
            k1: f32Result(
                "k1",
                "scalar",
                [
                    k1.gridMin[0],
                    k1.gridMin[1],
                    k1.gridMin[2],
                    k1.cellSize,
                    k1.invCellSize,
                    k1.eps,
                    k1.outsideGrid,
                    k1.maxCellOccupancy,
                ],
                [
                    frame.gridMin[0],
                    frame.gridMin[1],
                    frame.gridMin[2],
                    frame.cellSize,
                    frame.invCellSize,
                    frame.eps,
                    build.outside,
                    Math.max(build.maxOccupancy, build.outside),
                ],
            ),
        },
        pyramidMass: { values: gpuMass, expected: wantMass },
        oracle,
        spec,
        frame: state,
    };
}

/**
 * The option seed as the u32 the simulation writes into `P.seed` (ForceSimulation.seedU32: 0 when unseeded).
 * @param seed - the option seed
 * @returns the word
 */
function seedWordOf(seed: number | null | undefined): number {
    if (seed === null || seed === undefined || !Number.isFinite(seed)) {
        return 0;
    }
    return Math.floor(Math.abs(seed)) % 4294967296;
}

/**
 * The check report of one stage: its error over its traced tolerance (a u32 stage over 0: any mismatch is Infinity).
 * @param capture - a capture
 * @param key - the stage
 * @returns the report (worst = error / tolerance)
 */
export function gridStageReport(capture: GridStageCapture, key: GridStageKey): CheckReport {
    const r = capture.stages[key];
    const id = GRID_STAGE_TOLERANCE[key];
    return {
        worst: ratioOf(r.error, id === null ? 0 : gridTolerance(id).value),
        worstLabel: `${key} (${GRID_STAGE_UP_TO[key]})`,
        samples: r.values.length,
    };
}

// ---------------------------------------------------------------- exact vs grid (spec 11.4; PD-19)

/**
 * The exact-vs-grid comparison of one start: the two tiers' forces and the floored per-node error's statistics. The type of a value the capture / comparison returns (knip: exported for the
 * signature, not imported by name).
 * @public
 */
export interface ExactVsGrid {
    /** The grid tier's force after G7 (stride 3). */
    readonly grid: F64;
    /** The exact tier's force after K3 from the same start on the same adapter (stride 3). */
    readonly exact: F64;
    /** sqrt(mean over nodes of the floored per-node relative error squared). */
    readonly rms: number;
    /** The 99th percentile of the floored per-node relative error. */
    readonly p99: number;
    /** The largest floored per-node relative error. */
    readonly max: number;
}

/**
 * The force after the repulsion stage of one iteration on both tiers from the same start (the grid tier after G7,
 * the exact tier after K3: attraction, repulsion and gravity in both), and the floored per-node relative error of
 * spec 11.4 (`max(|F_exact(i)|, 1e-3 max_j |F_exact(j)|)` in the denominator) as its RMS and p99 over nodes.
 * @param ctx - the context (inspect is switched on)
 * @param s - the snapshot
 * @param start - the scene start (scale 1, zero center)
 * @param options - the FA2 options
 * @param tuning - the grid tuning (default GRID_TUNING)
 * @returns the comparison
 */
export async function exactVsGrid(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    options: ForceAtlas2Options,
    tuning: GpuLayoutTuning = GRID_TUNING,
): Promise<ExactVsGrid> {
    assertUnitStart(options);
    const force = (t: GpuLayoutTuning, upTo: string): Promise<F64> =>
        withSim(ctx, options, t, async (sim) => {
            sim.load(s, Float32Array.from(start));
            const st = debugStages(sim);
            await st.run(upTo);
            return Float64Array.from(asF32(await st.read("force")));
        });
    const grid = await force(tuning, "G7");
    const exact = await force(EXACT_TUNING, "K3");
    const err = flooredRelError(grid, exact, FLOOR_FRACTION);
    return { grid, exact, rms: err.rms, p99: err.p99, max: err.max };
}

/** One rung of the unbiasedness ladder: the S-seed mean of the force after G7 against the exact tier's after K3. */
interface UnbiasedRung {
    readonly seeds: number;
    /** The whole-field ratio |mean - exact| / |exact| (fieldRelError): the item's metric. */
    readonly field: number;
    /** The RMS of the floored per-node error of the mean (spec 11.4's per-node metric, printed). */
    readonly rms: number;
}

/** The unbiasedness ladder: the mean over every seed, the exact force, the rungs, and one seed's per-node RMS. */
interface UnbiasedLadder {
    readonly mean: F64;
    readonly exact: F64;
    /** At UNBIASED_LADDER_FIRST, 2x, 4x, ... `seeds` seeds. */
    readonly rungs: readonly UnbiasedRung[];
    /** The floored per-node RMS of seed 1 alone. */
    readonly rmsOneSeed: number;
}

/**
 * The mean over `seeds` seeded grid iterations (seeds 1..seeds, `deterministic: true`) of the force after G7 at
 * NEAR_MAX_SAMPLING from `start`, against the exact tier's force after K3 from the same start, with the ladder of
 * the whole-field ratio and the floored per-node RMS at every doubling from UNBIASED_LADDER_FIRST: the unbiasedness
 * item of G4 (spec 11.4). The mean is accumulated in f64 from each seed's f32 readback.
 * @param ctx - the context (inspect is switched on)
 * @param s - the snapshot
 * @param start - the scene start (a one-cell fixture with its anchor)
 * @param options - the FA2 options (the seed is overridden per iteration)
 * @param seeds - the seed count, a power of two >= UNBIASED_LADDER_FIRST (default UNBIASED_SEEDS)
 * @returns the ladder
 */
export async function unbiasedLadder(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    options: ForceAtlas2Options,
    seeds: number = UNBIASED_SEEDS,
): Promise<UnbiasedLadder> {
    assertUnitStart(options);
    if (seeds < UNBIASED_LADDER_FIRST || (seeds & (seeds - 1)) !== 0) {
        throw new RangeError(`unbiasedLadder: seeds must be a power of two >= ${UNBIASED_LADDER_FIRST}, got ${seeds}`);
    }
    const tuning: GpuLayoutTuning = { ...GRID_TUNING, nearMax: NEAR_MAX_SAMPLING };
    const force = (o: ForceAtlas2Options, t: GpuLayoutTuning, upTo: string): Promise<F32> =>
        withSim(ctx, o, t, async (sim) => {
            sim.load(s, Float32Array.from(start));
            const st = debugStages(sim);
            await st.run(upTo);
            return asF32(await st.read("force"));
        });
    const exact = Float64Array.from(await force(options, EXACT_TUNING, "K3"));
    const sum = new Float64Array(exact.length);
    const mean = new Float64Array(exact.length);
    const rungs: UnbiasedRung[] = [];
    let rmsOneSeed = 0;
    for (let seed = 1; seed <= seeds; seed++) {
        const f = await force({ ...options, seed }, tuning, "G7");
        if (seed === 1) {
            rmsOneSeed = flooredRelError(f, exact, FLOOR_FRACTION).rms;
        }
        for (let i = 0; i < sum.length; i++) {
            sum[i] += f[i];
        }
        if (seed >= UNBIASED_LADDER_FIRST && (seed & (seed - 1)) === 0) {
            for (let i = 0; i < sum.length; i++) {
                mean[i] = sum[i] / seed;
            }
            rungs.push({
                seeds: seed,
                field: fieldRelError(mean, exact),
                rms: flooredRelError(mean, exact, FLOOR_FRACTION).rms,
            });
        }
    }
    return { mean, exact, rungs, rmsOneSeed };
}
