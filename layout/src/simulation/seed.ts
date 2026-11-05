/**
 * The CANONICAL random number generator and NaN-row seeding of the WebGPU design (design 9.3 seedPositions, 7.2
 * "Initial positions", 7.14 `pos`, 7.19 topology change): a seed gives the same start on the CPU and the GPU
 * because both write the same f32 values in index order. Design 9.3 gives this copy to @graphty/layout; the GPU
 * package (@graphty/webgpu-graph-algorithms, src/layouts/seed.ts) keeps its own copy for its whole life (D27: it
 * cannot import @graphty/layout), cross-tested against this one at W1b. The Lcg is the package's own
 * RandomNumberGenerator (src/utils/random.ts) bit for bit; test/simulation/seed.test.ts is the W1 cross-test.
 */

import type { F32, F64, GraphSnapshot } from "@graphty/graph-format";

/** The CPU port's LCG constants (layout/src/utils/random.ts): m = 2^35 - 31, a = 185852, c = 1. */
export const LCG_M = 34359738337;
/** The multiplier a of the port's LCG. */
export const LCG_A = 185852;
/** The increment c of the port's LCG. */
export const LCG_C = 1;

/**
 * The port's RandomNumberGenerator, bit for bit: `seed || Math.floor(Math.random() * 1000000)` (seed 0 / null =
 * unseeded, the quirk preserved), state = seed % m, next = (a * state + c) % m, value = state / m. The product
 * a * state stays below 2^53 (a < 2^18, state < 2^35), so every step is exact in f64, as it is in the port.
 */
export class Lcg {
    /** The seed actually used (a random one when unseeded). */
    readonly seed: number;

    private state: number;

    /**
     * Creates the generator; a seed of 0, -0, NaN or null means unseeded (the port's `seed || random` quirk).
     * @param seed - the seed, or null for a random seed
     */
    constructor(seed: number | null) {
        this.seed = seed === null || seed === 0 || Number.isNaN(seed) ? Math.floor(Math.random() * 1000000) : seed;
        this.state = this.seed % LCG_M;
    }

    /**
     * Next value in [0, 1).
     * @returns state / m after one LCG step
     */
    next(): number {
        this.state = (LCG_A * this.state + LCG_C) % LCG_M;
        return this.state / LCG_M;
    }
}

/**
 * The three center components of a CommonLayoutOptions.center (missing components are 0).
 * @param center - the caller's center, or null
 * @returns [x, y, z]; RangeError when a component is not finite
 */
function resolveCenter(center: ArrayLike<number> | null): [number, number, number] {
    const out: [number, number, number] = [0, 0, 0];
    if (center === null) {
        return out;
    }
    for (let axis = 0; axis < 3 && axis < center.length; axis++) {
        const v = center[axis];
        if (!Number.isFinite(v)) {
            throw new RangeError(`center[${axis}] is not finite`);
        }
        out[axis] = v;
    }
    return out;
}

/**
 * Throws a RangeError unless dim is 2 or 3, positions holds 3 * n values and scale is finite and > 0.
 * @param n - the node count
 * @param positions - the owner's stride-3 array
 * @param dim - the dimension
 * @param scale - the scene scale
 */
function checkSeedArguments(n: number, positions: F32 | F64, dim: number, scale: number): void {
    if (dim !== 2 && dim !== 3) {
        throw new RangeError(`dim must be 2 or 3, got ${String(dim)}`);
    }
    if (positions.length !== 3 * n) {
        throw new RangeError(`positions has ${positions.length} entries, expected ${3 * n}`);
    }
    if (!Number.isFinite(scale) || scale <= 0) {
        throw new RangeError(`scale must be a finite number > 0, got ${scale}`);
    }
}

/**
 * Whether every one of row i's `dim` components is finite.
 * @param positions - the stride-3 array
 * @param i - the row
 * @param dim - 2 or 3
 * @returns true when the row needs no seeding
 */
function rowFinite(positions: F32 | F64, i: number, dim: number): boolean {
    for (let axis = 0; axis < dim; axis++) {
        if (!Number.isFinite(positions[3 * i + axis])) {
            return false;
        }
    }
    return true;
}

/**
 * Widen [lo, hi] per axis over every finite component, and count the fully finite rows.
 * @param positions - the stride-3 array
 * @param n - the row count
 * @param dim - 2 or 3
 * @param lo - per-axis minimum, widened in place
 * @param hi - per-axis maximum, widened in place
 * @returns the number of fully finite rows
 */
function finiteBox(positions: F32 | F64, n: number, dim: number, lo: number[], hi: number[]): number {
    let finiteRows = 0;
    for (let i = 0; i < n; i++) {
        let finite = true;
        for (let axis = 0; axis < dim; axis++) {
            const v = positions[3 * i + axis];
            if (!Number.isFinite(v)) {
                finite = false;
                continue;
            }
            // comparisons, not Math.min / Math.max, so a -0 never replaces a 0 already held (or the reverse)
            if (v < lo[axis]) {
                lo[axis] = v;
            }
            if (v > hi[axis]) {
                hi[axis] = v;
            }
        }
        if (finite) {
            finiteRows++;
        }
    }
    return finiteRows;
}

/**
 * Replace the range box, per axis with a finite value, by the finite components' box in layout units; a zero-width
 * axis is padded to the range box's width, centered on it.
 * @param lo - per-axis minimum of the finite components (scene units)
 * @param hi - per-axis maximum
 * @param c - the scene center
 * @param scale - the scene scale
 * @param dim - 2 or 3
 * @param boxLo - the range box's low corner, replaced in place
 * @param boxHi - the range box's high corner, replaced in place
 */
function fitDrawBox(
    lo: readonly number[],
    hi: readonly number[],
    c: readonly number[],
    scale: number,
    dim: number,
    boxLo: number[],
    boxHi: number[],
): void {
    for (let axis = 0; axis < dim; axis++) {
        if (!Number.isFinite(lo[axis]) || !Number.isFinite(hi[axis])) {
            continue;
        }
        // the range box's half width, read before this axis is replaced
        const half = (boxHi[axis] - boxLo[axis]) / 2;
        boxLo[axis] = (lo[axis] - c[axis]) / scale;
        boxHi[axis] = (hi[axis] - c[axis]) / scale;
        if (boxLo[axis] === boxHi[axis]) {
            // a zero-width axis (one finite row, or every finite row on one line) would stack every drawn
            // row on that coordinate: pad it to the range box's width, centered on it
            boxLo[axis] -= half;
            boxHi[axis] += half;
        }
    }
}

/** What {@link seedRow} draws with. */
interface SeedDraw {
    /** The generator. */
    readonly rng: Lcg;
    /** The draw box's low corner (layout units). */
    readonly boxLo: readonly number[];
    /** The draw box's high corner. */
    readonly boxHi: readonly number[];
    /** The scene scale. */
    readonly scale: number;
    /** The scene center. */
    readonly c: readonly number[];
}

/**
 * Draw every non-finite component of row i, in axis order, inside the draw box; in 2D write center[2] as z.
 * @param positions - the stride-3 array
 * @param i - the row
 * @param dim - 2 or 3
 * @param draw - the generator, the box and the scene transform
 */
function seedRow(positions: F32 | F64, i: number, dim: number, draw: SeedDraw): void {
    const { rng, boxLo, boxHi, scale, c } = draw;
    for (let axis = 0; axis < dim; axis++) {
        const at = 3 * i + axis;
        if (!Number.isFinite(positions[at])) {
            const u = rng.next();
            const v = boxLo[axis] + u * (boxHi[axis] - boxLo[axis]);
            positions[at] = v * scale + c[axis];
        }
    }
    if (dim === 2) {
        positions[3 * i + 2] = c[2];
    }
}

/**
 * Seeds the unseeded rows of the owner's stride-3 SCENE array in index order (spec 9.3 seedPositions, 7.14 `pos`,
 * 7.19 topology change): a row is unseeded when any of its `dim` components is not finite; every such component
 * draws one LCG value; when NO row is fully finite the draw is uniform in [-1, 1) layout units per axis (`range:
 * "fa2"`; `"fr"` is [0, 1)), otherwise uniform inside the [min, max] box of the finite components per axis,
 * converted to layout units (an axis with no finite value falls back to the range box); the value is written as
 * `v * scale + center[axis]`, which for scale 1 / center 0 is bit-identical to the port's `u * 2 - 1` (resp. `u`);
 * in 2D the third component of a seeded row is written as center[2]. An axis whose finite box has zero width (one
 * finite row, or every finite row sharing that coordinate) is padded to the range box's width centered on it, so
 * the drawn rows never all land on one point or one line. Finite components are never changed and a
 * fully finite row is never touched. No random number is drawn when nothing needs seeding.
 * PLAN DECISION 12 (P3-T1): the box is taken over every finite COMPONENT (the port's rule), not over the fully
 * finite ROWS only; the two differ only when a partially finite row's finite axis lies outside the fully finite
 * rows' box (pinned by webgpu-graph-algorithms/test/layouts/seed.test.ts). PLAN DECISION 13: a 2D row whose x and y
 * are finite is seeded whatever its z holds.
 * @param s - the snapshot (nodeCount rows)
 * @param positions - the owner's stride-3 scene-unit array, length 3 * nodeCount, modified in place; an F64 array
 *     keeps the drawn values in float64, as the legacy layouts did
 * @param seed - the LCG seed (0 / null = unseeded, the port's quirk)
 * @param dim - 2 or 3
 * @param scale - the scene scale (> 0)
 * @param center - the scene center, or null for the origin
 * @param range - "fa2" for [-1, 1), "fr" for [0, 1)
 */
export function seedPositions(
    s: GraphSnapshot,
    positions: F32 | F64,
    seed: number | null,
    dim: 2 | 3,
    scale: number,
    center: ArrayLike<number> | null,
    range: "fa2" | "fr",
): void {
    const n = s.nodeCount;
    checkSeedArguments(n, positions, dim, scale);
    const c = resolveCenter(center);

    // classify the rows and collect the per-axis box of the finite components (scene units)
    const lo = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
    const hi = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
    const finiteRows = finiteBox(positions, n, dim, lo, hi);
    if (finiteRows === n) {
        return;
    }

    // the per-axis draw box in layout units
    const rangeLo = range === "fr" ? 0 : -1;
    const boxLo = [rangeLo, rangeLo, rangeLo];
    const boxHi = [1, 1, 1];
    if (finiteRows > 0) {
        fitDrawBox(lo, hi, c, scale, dim, boxLo, boxHi);
    }

    const draw: SeedDraw = { rng: new Lcg(seed), boxLo, boxHi, scale, c };
    for (let i = 0; i < n; i++) {
        if (!rowFinite(positions, i, dim)) {
            seedRow(positions, i, dim, draw);
        }
    }
}
