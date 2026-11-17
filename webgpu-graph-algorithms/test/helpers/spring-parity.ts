/**
 * The parts the Fruchterman-Reingold (fr-parity.ts) and spring-electrical (se-parity.ts) parity helpers share: the
 * one-ulp admission rule of the trajectory and distributional cases (G3-F3 / G3-F4), and the pieces of the stage
 * capture that do not depend on the model. Each model's file keeps its oracle construction and its own stages.
 */

import { type F32, type F64 } from "@graphty/graph-format";

import { FA2_STATE } from "../../src/kernels.js";
import type { SeOracleStages } from "../oracle/spring-electrical.js";
import { stageError, yieldToEventLoop } from "./fa2-parity.js";

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
export interface TrajectorySensitivity {
    readonly spread: number;
    readonly f32: number;
}

/** What trajectorySensitivity needs of an oracle: one iteration per step() and its layout positions. */
interface SteppedOracle {
    step(): unknown;
    readonly positions: ArrayLike<number>;
}

/**
 * The admission measurement of a free-running trajectory (G3-F3 / G3-F4): the f64 oracle from the seeded start
 * against itself from the PERTURBATIONS one-ulp starts (the spread of the trajectory's own sensitivity) and against
 * the f32 oracle (the model of any f32 implementation's rounding), both as the floored per-node position error of
 * spec 11.4, at every horizon asked for.
 * @param make - the model's oracle from a scene start at a precision
 * @param start - the scene start (scale 1, zero center)
 * @param n - the node count
 * @param dim - 2 or 3
 * @param horizons - the iteration counts to measure at
 * @returns the two errors per horizon
 */
export async function trajectorySensitivity(
    make: (start: F32, precision: "f64" | "f32") => SteppedOracle,
    start: F32,
    n: number,
    dim: 2 | 3,
    horizons: readonly number[],
): Promise<ReadonlyMap<number, TrajectorySensitivity>> {
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

/**
 * a - b elementwise (the displacement of both sides: the positions after K5 minus the start).
 * @param a - the positions after
 * @param b - the positions before
 * @returns the difference
 */
export function minus(a: ArrayLike<number>, b: ArrayLike<number>): F64 {
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
export function stateScalar(raw: Float32Array | Uint32Array, name: string): number {
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const v = FA2_STATE.readField(view, name, 0);
    if (typeof v !== "number") {
        throw new Error(`Fa2State.${name}: expected a scalar field`);
    }
    return v;
}

/** The folded partials A / C of an FR or spring oracle step (the spring oracle's adds partials B, its kinetic energy). */
type OraclePartials = Omit<SeOracleStages["partials"], "kineticEnergy">;

/**
 * The oracle's thirteen partials values, in the order of fa2-parity.ts partialsValues.
 * @param o - the oracle's folded partials
 * @returns sum xyz, sumSq, min xyz, max xyz, maxSq, disp, free
 */
export function oraclePartialsValues(o: OraclePartials): number[] {
    return [...o.sum, o.sumSq, ...o.min, ...o.max, o.maxSq, o.disp, o.free];
}

/** The K1 statistics of an FR or spring oracle trace record. */
interface OracleFold {
    readonly centroid: readonly [number, number, number];
    readonly rmsRadius: number;
    readonly layoutRadius: number;
    readonly meanDisplacement: number;
    readonly settledCount: number;
}

/**
 * The oracle's eight K1 fold values of iteration 2, in the order of fa2-parity.ts foldValues.
 * @param fold - the second step's trace record
 * @returns centroid xyz, rmsRadius, layoutRadius, meanDisplacement, settledCount, the iteration 2
 */
export function oracleFoldValues(fold: OracleFold): number[] {
    return [...fold.centroid, fold.rmsRadius, fold.layoutRadius, fold.meanDisplacement, fold.settledCount, 2];
}
