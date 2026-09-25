/**
 * The CPU reference of the grid tier's fields (spec 7.7 G6, G7, K1's grid block; P4-T11; PD-19): per node, in f64
 * over the T8 / T9 oracles' build and pyramid,
 *
 * - `gridOracleFarField`: the exact loops of G6 -- the finest cell recomputed with G1's f32 arithmetic (PD-10),
 *   `c0.z` forced to 0 in 2D exactly as G6 does so the 3x3 exclusion fires at every level, the coarsest level minus
 *   the 3x3 (3x3x3) around the node's coarsest cell, then at every finer level the 6x6 (6x6x6) block that is the
 *   parent's 3x3 minus the level's own 3x3, plus the 2^dim outside pseudo-cells (one per orthant, issue #90) for an
 *   inside node; the coarsest level in
 *   full and no pseudo-cell for an outside node; every term `d * (k m_i M / (max(|d|^2, 0.01^2) + eps^2))` on the
 *   mass-weighted centroid with `eps` from the state;
 * - `gridOracleNearField`: G7's 9 (27) finest cells with the K3 pair law (the 0.01 floor, the coincident kick through
 *   kickDir), and above `nearMax` entries the SAME `nearMax` independent draws with replacement, draw `k` at slot
 *   `lowbias32(((c ^ (iteration * 0x9E3779B9)) ^ seed) ^ (k * 0x85EBCA6B)) % count` (JS `Math.imul` / `>>>` on
 *   hash words, the kickDir precedent), the node itself skipped and not replaced, with the realised-sample scale
 *   `others / sampled` of PD-15, so the oracle sums exactly the pairs the GPU sums and the two differ by f32 rounding
 *   alone;
 * - `gridOracleGravity` and `gridOracleAttraction`: the paper-mode gravity (spec 7.9, the centroid form) and the
 *   plain K2 attraction (spec 7.5: `sum_j (p_j - p_i)`, unit weights, no linlog, no distributed action), the two
 *   terms G7's fused epilogue and K2 add to the same `force` buffer, so a stage's expectation is the f64 TOTAL and
 *   never a difference of two f32 readbacks (a delta of two accumulated forces carries the rounding of the larger);
 * - `gridOracleK1`: the extent / cell size / eps arithmetic of K1's grid block in f32 (`Math.fround` at every step,
 *   the kernel's order of operations);
 * - `gridOracleIntegrate`: K4 (estimateFactor) and K5 (spec 7.11, paper mode) over a force vector, so the positions
 *   after one grid iteration have an f64 expectation from the f64 grid force.
 *
 * Pure; no device. The u32 hash re-implements the prelude's lowbias32 on HASH WORDS and node / cell indices below
 * 2^32; no arc index or byte offset is ever touched by a bitwise operator here (house rule).
 */

import { type F64, type GraphSnapshot, maskTest, type NodeMask } from "@graphty/graph-format";

import {
    FA2_COINCIDENT_SQ,
    FA2_DISTANCE_FLOOR,
    FA2_DISTANCE_FLOOR_SQ,
    GRID_BBOX_MARGIN,
    GRID_EXTENT_FLOOR,
} from "../../src/constants.js";
import { type GridSpec } from "../../src/primitives/grid.js";
import { estimateFactor, kickDir } from "./forceatlas2.js";
import { type GridOracleBuild, type GridOracleInput } from "./grid.js";
import { type GridOraclePyramid } from "./grid-pyramid.js";

/**
 * The Fa2Params / Fa2State fields the two field kernels read. A parameter / return type of the oracles (knip: exported for the signature,
 * not imported by name).
 * @public
 */
export interface GridFieldParams {
    readonly scalingRatio: number;
    /** `state.eps` (the far field's softening). */
    readonly eps: number;
    /** `P.nearMax` (the near field's per-cell sample size). */
    readonly nearMax: number;
    /** `P.iterationIndex` (the trace slot of the iteration inside its batch; 0 for a debugRunStages run). */
    readonly iterationIndex: number;
    /** `P.seed` (the option seed as a u32). */
    readonly seed: number;
}

/**
 * Wellons' lowbias32 integer hash of the prelude (contract 4.1), on u32 words.
 * @param x0 - the input word
 * @returns the hashed word in [0, 2^32)
 */
function lowbias32(x0: number): number {
    let x = x0 >>> 0;
    x = (x ^ (x >>> 16)) >>> 0;
    x = Math.imul(x, 0x7feb352d) >>> 0;
    x = (x ^ (x >>> 15)) >>> 0;
    x = Math.imul(x, 0x846ca68b) >>> 0;
    x = (x ^ (x >>> 16)) >>> 0;
    return x;
}

/** The finest cell of a node as G1 / G6 / G7 compute it, and whether it is inside the grid. */
interface Cell {
    readonly c: readonly [number, number, number];
    readonly inside: boolean;
}

/**
 * G1's cell arithmetic in f32 (PD-10): `q = fround(fround(p - gridMin) * invCellSize)`, `c = floor(clamp(q, -1,
 * G + 1))`, inside iff `0 <= c < G` on every axis of `dim`; `c.z` forced to 0 in 2D (G6 / G7's text).
 * @param input - the frame
 * @param i - the node
 * @returns the cell and the inside flag
 */
function cellOf(input: GridOracleInput, i: number): Cell {
    const { positions, spec, gridMin, invCellSize } = input;
    const { g } = spec;
    const c: number[] = [];
    for (let axis = 0; axis < 3; axis++) {
        const q = Math.fround(Math.fround(positions[4 * i + axis] - gridMin[axis]) * invCellSize);
        const clamped = Number.isNaN(q) ? -1 : Math.min(Math.max(q, -1), g + 1);
        c.push(Math.floor(clamped));
    }
    let inside = c[0] >= 0 && c[0] < g && c[1] >= 0 && c[1] < g;
    if (spec.dim === 3) {
        inside = inside && c[2] >= 0 && c[2] < g;
    } else {
        c[2] = 0;
    }
    return { c: [c[0], c[1], c[2]], inside };
}

/**
 * One far-field term (G6's cell_force, FA2): zero for an empty cell, else `d * (k m_i M / (max(|d|^2, 0.01^2) +
 * eps^2))` toward the node from the mass-weighted centroid (the floor of the exact tier, issue #89).
 * @param px - the node's position and mass (x, y, z, m)
 * @param level - the level's values (4 per cell)
 * @param cell - the cell inside its level
 * @param params - scalingRatio and eps
 * @param out - the accumulator (x, y, z)
 */
function addCellForce(
    px: readonly [number, number, number, number],
    level: Float64Array,
    cell: number,
    params: GridFieldParams,
    out: [number, number, number],
): void {
    const mass = level[4 * cell + 3];
    if (mass <= 0) {
        return;
    }
    const dx = px[0] - level[4 * cell] / mass;
    const dy = px[1] - level[4 * cell + 1] / mass;
    const dz = px[2] - level[4 * cell + 2] / mass;
    const d2 = Math.max(dx * dx + dy * dy + dz * dz, FA2_DISTANCE_FLOOR_SQ) + params.eps * params.eps;
    const scale = (params.scalingRatio * px[3] * mass) / d2;
    out[0] += dx * scale;
    out[1] += dy * scale;
    out[2] += dz * scale;
}

/**
 * The far field of every node (G6's text, spec 7.7).
 * @param input - the frame and the positions (stride 4: xyz + mass)
 * @param pyramid - the T9 oracle's pyramid over the same frame
 * @param params - scalingRatio and eps
 * @returns stride-3 forces
 */
export function gridOracleFarField(input: GridOracleInput, pyramid: GridOraclePyramid, params: GridFieldParams): F64 {
    const { positions, n, spec } = input;
    const { g, dim, levels: levelCount, cells } = spec;
    const out = new Float64Array(3 * n);
    const top = levelCount - 1;
    const ts = g >> top;
    const zTop = dim === 3 ? ts - 1 : 0;
    const topLevel = pyramid.levels[top];
    const level0 = pyramid.levels[0];
    for (let i = 0; i < n; i++) {
        const px: [number, number, number, number] = [
            positions[4 * i],
            positions[4 * i + 1],
            positions[4 * i + 2],
            positions[4 * i + 3],
        ];
        const { c, inside } = cellOf(input, i);
        const f: [number, number, number] = [0, 0, 0];
        if (inside) {
            const ct = [c[0] >> top, c[1] >> top, c[2] >> top];
            for (let cz = 0; cz <= zTop; cz++) {
                for (let cy = 0; cy < ts; cy++) {
                    for (let cx = 0; cx < ts; cx++) {
                        if (Math.abs(cx - ct[0]) <= 1 && Math.abs(cy - ct[1]) <= 1 && Math.abs(cz - ct[2]) <= 1) {
                            continue;
                        }
                        addCellForce(px, topLevel, cx + ts * (cy + (dim === 3 ? ts * cz : 0)), params, f);
                    }
                }
            }
            for (let l = top; l > 0; l--) {
                const level = l - 1;
                const cl = [c[0] >> level, c[1] >> level, c[2] >> level];
                const cp = [cl[0] >> 1, cl[1] >> 1, cl[2] >> 1];
                const side = g >> level;
                const values = pyramid.levels[level];
                const zLo = dim === 3 ? Math.max(0, 2 * (cp[2] - 1)) : 0;
                const zHi = dim === 3 ? Math.min(side - 1, 2 * (cp[2] + 1) + 1) : 0;
                for (let cz = zLo; cz <= zHi; cz++) {
                    for (let cy = Math.max(0, 2 * (cp[1] - 1)); cy <= Math.min(side - 1, 2 * (cp[1] + 1) + 1); cy++) {
                        for (
                            let cx = Math.max(0, 2 * (cp[0] - 1));
                            cx <= Math.min(side - 1, 2 * (cp[0] + 1) + 1);
                            cx++
                        ) {
                            if (Math.abs(cx - cl[0]) <= 1 && Math.abs(cy - cl[1]) <= 1 && Math.abs(cz - cl[2]) <= 1) {
                                continue;
                            }
                            addCellForce(px, values, cx + side * (cy + (dim === 3 ? side * cz : 0)), params, f);
                        }
                    }
                }
            }
            for (let o = 0; o < spec.outsideCells; o++) {
                addCellForce(px, level0, cells + o, params, f);
            }
        } else {
            for (let cz = 0; cz <= zTop; cz++) {
                for (let cy = 0; cy < ts; cy++) {
                    for (let cx = 0; cx < ts; cx++) {
                        addCellForce(px, topLevel, cx + ts * (cy + (dim === 3 ? ts * cz : 0)), params, f);
                    }
                }
            }
        }
        out[3 * i] = f[0];
        out[3 * i + 1] = f[1];
        out[3 * i + 2] = f[2];
    }
    return out;
}

/**
 * G7's pair_force: the K3 pair law (spec 7.6) with the 0.01 floor and the antisymmetric coincident kick.
 * @param input - the positions
 * @param i - the node receiving the force
 * @param px - its position and mass
 * @param j - the other node
 * @param dim - 2 or 3
 * @param scalingRatio - k
 * @param out - the accumulator
 */
function addPairForce(
    input: GridOracleInput,
    i: number,
    px: readonly [number, number, number, number],
    j: number,
    dim: 2 | 3,
    scalingRatio: number,
    out: [number, number, number],
): void {
    const { positions } = input;
    const mj = positions[4 * j + 3];
    const dx = px[0] - positions[4 * j];
    const dy = px[1] - positions[4 * j + 1];
    const dz = px[2] - positions[4 * j + 2];
    let d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < FA2_COINCIDENT_SQ) {
        const kick = kickDir(i, j, dim);
        const magnitude = (scalingRatio * px[3] * mj) / FA2_DISTANCE_FLOOR;
        out[0] += kick[0] * magnitude;
        out[1] += kick[1] * magnitude;
        out[2] += kick[2] * magnitude;
        return;
    }
    d2 = Math.max(d2, FA2_DISTANCE_FLOOR_SQ);
    const scale = (scalingRatio * px[3] * mj) / d2;
    out[0] += dx * scale;
    out[1] += dy * scale;
    out[2] += dz * scale;
}

/**
 * G7's cell_sum: every entry of a cell below `nearMax`, else the `nearMax` independent hashed draws of PD-15 (with
 * replacement; the node itself skipped, not replaced) scaled by `others / sampled` over the realised sample
 * (DEP-P4-K).
 * @param input - the positions
 * @param build - the T8 oracle's build (sortedIdx, cellStart)
 * @param i - the node
 * @param px - its position and mass
 * @param cell - the cell
 * @param own - whether the cell is the node's own
 * @param params - the field params
 * @param out - the accumulator
 */
function addCellSum(
    input: GridOracleInput,
    build: GridOracleBuild,
    i: number,
    px: readonly [number, number, number, number],
    cell: number,
    own: boolean,
    params: GridFieldParams,
    out: [number, number, number],
): void {
    const { dim } = input.spec;
    const start = build.cellStart[cell];
    const count = build.cellStart[cell + 1] - start;
    if (count <= params.nearMax) {
        for (let k = start; k < start + count; k++) {
            const j = build.sortedIdx[k];
            if (j !== i) {
                addPairForce(input, i, px, j, dim, params.scalingRatio, out);
            }
        }
        return;
    }
    const salt = Math.imul(params.iterationIndex >>> 0, 0x9e3779b9) >>> 0;
    const base = ((((cell >>> 0) ^ salt) >>> 0) ^ (params.seed >>> 0)) >>> 0;
    const f: [number, number, number] = [0, 0, 0];
    let sampled = 0;
    for (let k = 0; k < params.nearMax; k++) {
        const draw = lowbias32((base ^ (Math.imul(k, 0x85ebca6b) >>> 0)) >>> 0) % count;
        const j = build.sortedIdx[start + draw];
        if (j === i) {
            continue;
        }
        addPairForce(input, i, px, j, dim, params.scalingRatio, f);
        sampled++;
    }
    if (sampled === 0) {
        return;
    }
    const others = own ? count - 1 : count;
    const scale = others / sampled;
    out[0] += f[0] * scale;
    out[1] += f[1] * scale;
    out[2] += f[2] * scale;
}

/**
 * The near field of every node (G7's text before the epilogue, spec 7.7): the 9 (27) finest cells around an inside
 * node's own, the 2^dim outside pseudo-cells for an outside node (issue #90).
 * @param input - the frame and the positions
 * @param build - the T8 oracle's build over the same frame
 * @param params - the field params
 * @returns stride-3 forces
 */
export function gridOracleNearField(input: GridOracleInput, build: GridOracleBuild, params: GridFieldParams): F64 {
    const { positions, n, spec } = input;
    const { g, dim, cells } = spec;
    const out = new Float64Array(3 * n);
    const zr = dim === 3 ? 1 : 0;
    for (let i = 0; i < n; i++) {
        const px: [number, number, number, number] = [
            positions[4 * i],
            positions[4 * i + 1],
            positions[4 * i + 2],
            positions[4 * i + 3],
        ];
        const { c, inside } = cellOf(input, i);
        const f: [number, number, number] = [0, 0, 0];
        if (inside) {
            for (let dz = -zr; dz <= zr; dz++) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const cx = c[0] + dx;
                        const cy = c[1] + dy;
                        const cz = c[2] + dz;
                        if (cx < 0 || cx >= g || cy < 0 || cy >= g || cz < 0 || cz >= g) {
                            continue;
                        }
                        const cell = cx + g * (cy + (dim === 3 ? g * cz : 0));
                        addCellSum(input, build, i, px, cell, dx === 0 && dy === 0 && dz === 0, params, f);
                    }
                }
            }
        } else {
            const own = build.cellKey[i];
            for (let o = cells; o < cells + spec.outsideCells; o++) {
                addCellSum(input, build, i, px, o, o === own, params, f);
            }
        }
        out[3 * i] = f[0];
        out[3 * i + 1] = f[1];
        out[3 * i + 2] = f[2];
    }
    return out;
}

/**
 * The paper-mode gravity of every node (spec 7.9, GRAVITY_CENTER 0, regular law): `-g m q / |q|` about the
 * state's centroid when `|q| > 0.01`, else zero -- the term G7's fused epilogue adds.
 * @param input - the positions (stride 4)
 * @param centroid - `state.centroid` as the kernel read it
 * @param gravity - the gravity option
 * @returns stride-3 forces
 */
export function gridOracleGravity(
    input: GridOracleInput,
    centroid: readonly [number, number, number],
    gravity: number,
): F64 {
    const { positions, n } = input;
    const out = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
        const qx = positions[4 * i] - centroid[0];
        const qy = positions[4 * i + 1] - centroid[1];
        const qz = positions[4 * i + 2] - centroid[2];
        const d = Math.sqrt(qx * qx + qy * qy + qz * qz);
        if (d > FA2_DISTANCE_FLOOR) {
            const gm = -gravity * positions[4 * i + 3];
            out[3 * i] = (gm * qx) / d;
            out[3 * i + 1] = (gm * qy) / d;
            out[3 * i + 2] = (gm * qz) / d;
        }
    }
    return out;
}

/**
 * K2's attraction of every node under the P4 parity options (spec 7.5; unit weights, no linlog, no distributed
 * action): `sum over arcs (p_j - p_i)`, a self-loop exerting no force.
 * @param s - the snapshot (both arcs of every edge present)
 * @param input - the positions (stride 4)
 * @returns stride-3 forces
 */
export function gridOracleAttraction(s: GraphSnapshot, input: GridOracleInput): F64 {
    const { positions, n } = input;
    const out = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
        for (let a = s.rowPtr[i]; a < s.rowPtr[i + 1]; a++) {
            const j = s.colIdx[a];
            if (j === i) {
                continue;
            }
            out[3 * i] += positions[4 * j] - positions[4 * i];
            out[3 * i + 1] += positions[4 * j + 1] - positions[4 * i + 1];
            out[3 * i + 2] += positions[4 * j + 2] - positions[4 * i + 2];
        }
    }
    return out;
}

/**
 * The K1 statistics the grid block reads (the fold of the previous integrate's partials). A parameter / return type of the oracles (knip: exported for the signature,
 * not imported by name).
 * @public
 */
export interface GridFrameStats {
    readonly min: readonly [number, number, number];
    readonly max: readonly [number, number, number];
    readonly centroid: readonly [number, number, number];
    readonly rmsRadius: number;
}

/**
 * What K1's grid block writes (spec 7.7 geometry table). A parameter / return type of the oracles (knip: exported for the signature,
 * not imported by name).
 * @public
 */
export interface GridFrame {
    /** `state.gridMin.xyz`. */
    readonly gridMin: readonly [number, number, number];
    /** `state.gridMin.w`. */
    readonly cellSize: number;
    readonly invCellSize: number;
    readonly eps: number;
}

/**
 * K1's grid block in f32 with the kernel's order of operations: `box = (max - min) * GRID_BBOX_MARGIN`, `extent =
 * max(min(max(box), extentFactor * rmsRadius), GRID_EXTENT_FLOOR)`, `cellSize = extent / G`, `gridMin = centroid -
 * extent / 2`, `invCellSize = 1 / cellSize`, `eps = 0.25 cellSize`.
 * @param stats - the fold K1 read
 * @param spec - the grid
 * @param extentFactor - the tuning's extent factor
 * @returns the frame
 */
export function gridOracleK1(stats: GridFrameStats, spec: GridSpec, extentFactor: number): GridFrame {
    const f = Math.fround;
    const box = [0, 1, 2].map((a) => f(f(f(stats.max[a]) - f(stats.min[a])) * f(GRID_BBOX_MARGIN)));
    const bboxExtent = spec.dim === 3 ? Math.max(box[0], box[1], box[2]) : Math.max(box[0], box[1]);
    const rmsTerm = f(f(extentFactor) * f(stats.rmsRadius));
    const extent = Math.max(Math.min(bboxExtent, rmsTerm), f(GRID_EXTENT_FLOOR));
    const cellSize = f(extent / spec.g);
    const half = f(0.5 * extent);
    return {
        gridMin: [f(f(stats.centroid[0]) - half), f(f(stats.centroid[1]) - half), f(f(stats.centroid[2]) - half)],
        cellSize,
        invCellSize: f(1 / cellSize),
        eps: f(0.25 * cellSize),
    };
}

/**
 * K4 and K5 of the first iteration after load() in paper mode (spec 7.10, 7.11): the global swing `sum m |F|` and
 * traction `0.5 sum m |F|` (F(t-1) = 0 after load), estimateFactor from speed 1 / efficiency 1, then per free node
 * `p += F * speed / (1 + sqrt(speed * m |F|))`; a fixed node and the z of a 2D layout never move (D25: no clamp).
 * @param force - the stride-3 force after the repulsion stage (f64)
 * @param start - the stride-3 layout positions before the iteration
 * @param mass - the mass vector
 * @param dim - 2 or 3
 * @param jitterTolerance - the option
 * @param fixed - the fixed mask or null
 * @returns the stride-3 positions after K5 and the K4 speed
 */
export function gridOracleIntegrate(
    force: ArrayLike<number>,
    start: ArrayLike<number>,
    mass: ArrayLike<number>,
    dim: 2 | 3,
    jitterTolerance: number,
    fixed: NodeMask | null,
): { readonly positions: F64; readonly speed: number } {
    const n = mass.length;
    const norm = new Float64Array(n);
    let swing = 0;
    let traction = 0;
    for (let i = 0; i < n; i++) {
        const fx = force[3 * i];
        const fy = force[3 * i + 1];
        const fz = force[3 * i + 2];
        norm[i] = mass[i] * Math.sqrt(fx * fx + fy * fy + fz * fz);
        if (fixed === null || !maskTest(fixed, i)) {
            swing += norm[i];
            traction += 0.5 * norm[i];
        }
    }
    const { speed } = estimateFactor(n, swing, traction, 1, 1, jitterTolerance, "f64");
    const positions = Float64Array.from(start);
    for (let i = 0; i < n; i++) {
        if (fixed !== null && maskTest(fixed, i)) {
            continue;
        }
        const factor = speed / (1 + Math.sqrt(speed * norm[i]));
        positions[3 * i] += force[3 * i] * factor;
        positions[3 * i + 1] += force[3 * i + 1] * factor;
        if (dim === 3) {
            positions[3 * i + 2] += force[3 * i + 2] * factor;
        }
    }
    return { positions, speed };
}
