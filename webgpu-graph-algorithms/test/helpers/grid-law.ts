/**
 * The exact-vs-grid comparison of the Fruchterman-Reingold and spring-electrical models (P4-T13; PD-22): the
 * construction of test/helpers/grid-parity.ts exactVsGrid (the grid tier after G7 against the EXACT GPU tier after
 * K3 from the same start on the same adapter, PD-19), run through the two models' own factories with their own laws
 * (`LAW` 1 / 2 on K3 and on G6 / G7) and held to the FA2 caps of T11 (grid-exact.rms, grid-exact.p99), on the
 * REPULSION alone: each tier's `force` after its repulsion stage minus its `force` after K2. K2 is the same kernel
 * over the same positions on both tiers, so the difference is the far and near field (G6 + G7) against K3's pair
 * sum; measured on the whole force the FR comparison would say nothing about the law, because at the default `k`
 * (1 / sqrt(n)) FR's repulsion is a hundredth of its attraction on random20k (measured 2026-09-20: rms 1.7e-6 with
 * the attraction included). Two comparisons: the whole repulsion (the plan's item: the floored per-node error's
 * RMS and p99 under the caps), and on random20k the far field alone -- the grid's force after G6 minus its force
 * after K2, against design 7.7's far field in f64 (the pyramid traversal over the mass-weighted centroids the
 * grid's own keys define, the `eps`-softened per-cell law, the pseudo-cell; the shape of test/oracle/grid-field.ts
 * for the FA2 law) for a sample of FAR_SAMPLE_NODES nodes, as the whole-field relative error
 * `|grid - reference| / |reference|` over the sample under the rms cap -- so a far-field mutation is measured
 * against the far field's own scale, and the reference carries the law and not the monopole approximation the
 * whole comparison already bounds. Per node the far
 * field of a uniform cloud is its mean field, which cancels near the centre (a per-node relative error puts 15 %
 * on the interior nodes of the pristine kernel, measured 2026-09-20), so the far comparison is whole-field; and it
 * runs on random20k alone, because on the one-cell placement the anchor's 170-unit springs put the attraction six
 * decades above the far field and the f32 subtraction leaves nothing of it. Two fixtures: the plan's random20k
 * (scaled), where the net repulsion is the far field's mean field (zeroing the near field moves the FR repulsion by
 * 5 %, so a near-field mutation is invisible in the whole), and `onecell34`, karate with 33 nodes inside one finest
 * cell and the last far outside it (the gridFixture anchor construction), where the repulsion IS the near field.
 * `lawCheck` is the check the twelve `LAW` sabotage rows are measured by (test/sabotage/grid.test.ts): the worst
 * ratio over both comparisons, both fixtures and both dimensions.
 */

import { type F32, type F64, type GraphSnapshot, type U32 } from "@graphty/graph-format";

import { GRID_COARSEST_SIDE, SE_DEFAULTS } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { FA2_STATE } from "../../src/kernels.js";
import { resolveLayoutTuning } from "../../src/layouts/forceatlas2.js";
import { springSizeFactor } from "../../src/layouts/spring-electrical.js";
import { gridSpecFor } from "../../src/primitives/grid.js";
import { type GpuLayoutTuning } from "../../src/types/layout.js";
import { isSoftware } from "../setup/gpu.js";
import { asF32, FLOOR_FRACTION, type StageIo } from "./fa2-parity.js";
import { FR_BASE_OPTIONS, frStages, withFrSim } from "./fr-parity.js";
import { fixture } from "./graphs.js";
import { type ExactVsGrid, gridTolerance } from "./grid-parity.js";
import { flooredRelError } from "./matchers.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";
import { SE_BASE_OPTIONS, seStages, withSeSim } from "./se-parity.js";

/** The two models that reach the grid tier through `LAW` (1 = Fruchterman-Reingold, 2 = spring-electrical). */
export type LawModel = "fr" | "se";

/** The `LAW` value of each model (the P5 override constants). */
export const LAW_OF: Readonly<Record<LawModel, 1 | 2>> = Object.freeze({ fr: 1, se: 2 });

/** The grid tuning of every comparison (the radix path, so a run is bitwise repeatable). */
export const LAW_GRID_TUNING: GpuLayoutTuning = Object.freeze({ repulsion: "grid", deterministic: true });

/** The exact tuning of every comparison. */
const LAW_EXACT_TUNING: GpuLayoutTuning = Object.freeze({ repulsion: "exact" });

/**
 * The fixtures the check runs on: the plan's random20k (at LAW_SOFTWARE_SCALE on a software adapter) and the
 * one-cell karate placement. The clumpy fixtures are not here because T11's own FA2 measurement puts clumpy10
 * above the caps (rms 0.12 in 2D, a G4 section 7 finding), and the spring law sits higher still there (0.19 /
 * 0.39 measured 2026-09-20).
 */
export const LAW_FIXTURES: readonly string[] = Object.freeze(["random20k", "onecell34"]);

/** The fixtures the far field is compared alone on (the module comment: the one-cell placement's far field is below the attraction's f32 resolution). */
const LAW_FAR_FIELD_FIXTURES: readonly string[] = Object.freeze(["random20k"]);

/**
 * random20k's scale on a software adapter: the larger of test/layouts/grid-exact.test.ts's two software sizes
 * (2,000 nodes), not gpuScale()'s 1 / 50 (400 nodes), where the spring law's per-node error in 2D sits at 5.7 %
 * against the 5 % cap (the 0.25-cell softening on the steepest law at the smallest size; 2.7 % at 2,000, 1.2 % at
 * 20,000; measured 2026-09-20).
 */
const LAW_SOFTWARE_SCALE = 1 / 10;

/** The side of the box the one-cell placement draws its 33 positions in (well above sqrt(FA2_COINCIDENT_SQ) apart, well inside one finest cell of the anchored extent). */
const ONE_CELL_BOX = 1e-2;
/** The anchor's coordinate on every axis (test/helpers/grid-parity.ts gridFixture: it sets the extent to about 100, so the box is one finest cell). */
const ANCHOR = 100;
/**
 * Karate's 34 nodes with 33 of them drawn from a seeded LCG inside a ONE_CELL_BOX box around 0.1 and the last at
 * (ANCHOR, ANCHOR, ANCHOR): the anchor makes the extent about 100 through the rms bound, so the box sits in one
 * finest cell (every pair is a near-field pair) and the anchor in the outside pseudo-cell.
 * @param n - the node count (34)
 * @returns the stride-3 start
 */
function oneCellStart(n: number): F32 {
    let seed = 0x9e3779b9;
    const random = (): number => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    };
    const start = new Float32Array(3 * n);
    for (let i = 0; i < n - 1; i++) {
        for (let a = 0; a < 3; a++) {
            start[3 * i + a] = 0.1 + ONE_CELL_BOX * (random() - 0.5);
        }
    }
    start[3 * (n - 1)] = ANCHOR;
    start[3 * (n - 1) + 1] = ANCHOR;
    start[3 * (n - 1) + 2] = ANCHOR;
    return start;
}

/**
 * The fixture's positions made point-symmetric: the second half of the nodes takes the negated positions of the
 * first half (an odd last node sits at the origin), so the centroid is exactly the bounding box's centre and K1's
 * frame (`gridMin = centroid - extent / 2`, `extent = 1.01 x the widest axis`) leaves no node outside. Without
 * this a uniform start at n = 400 or 2,000 puts ten-odd edge nodes outside the grid (the 1 % margin is under the
 * centroid's offset from the box centre at that n), and their pseudo-cell centroid, which then lies INSIDE the
 * grid next to some node, hands that node a many-mass neighbour under the 1 / d^2 law (measured 2026-09-20: a
 * 30x far field on the worst node at n = 2,000; a G4 finding on design 7.7's pseudo-cell term, not on the law).
 * @param positions - stride-3 positions
 * @returns the symmetric copy
 */
function symmetric(positions: F32): F32 {
    const n = Math.floor(positions.length / 3);
    const out = Float32Array.from(positions);
    const half = Math.floor(n / 2);
    for (let i = 0; i < half; i++) {
        for (let a = 0; a < 3; a++) {
            out[3 * (half + i) + a] = -positions[3 * i + a];
        }
    }
    if (n % 2 === 1) {
        out.fill(0, 3 * (n - 1), 3 * n);
    }
    return out;
}

/**
 * A fixture's snapshot and scene start: random20k at the adapter's scale with its positions made symmetric, or
 * karate under the one-cell placement.
 * @param name - a LAW_FIXTURES entry
 * @returns the snapshot and the scene start (a copy)
 */
export function lawFixture(name: string): { readonly snapshot: GraphSnapshot; readonly start: F32 } {
    if (name === "onecell34") {
        const { snapshot } = fixture("karate");
        return { snapshot, start: oneCellStart(snapshot.nodeCount) };
    }
    const f = fixture(name, isSoftware() ? LAW_SOFTWARE_SCALE : 1);
    if (f.positions === null) {
        throw new Error(`fixture ${name} supplies no positions`);
    }
    return { snapshot: f.snapshot, start: symmetric(f.positions) };
}

/** How many nodes the f64 far-field reference is computed for (every n / 256-th node; every node below 256). */
const FAR_SAMPLE_NODES = 256;

/** The repulsion fields of one tier: the whole (the force after the repulsion stage minus the force after K2) and, on the grid tier, its far part (G6 minus K2) with the layout positions (xyz + mass), the finest-cell key of every node (from the sorted pair) and the frame's softening `eps`; null on the exact tier. */
interface LawFields {
    readonly total: F64;
    readonly far: F64 | null;
    readonly positions: F32 | null;
    readonly cellKey: U32 | null;
    readonly eps: number | null;
}

/**
 * a - b in f64.
 * @param a - the minuend
 * @param b - the subtrahend
 * @returns the difference
 */
function minus(a: ArrayLike<number>, b: ArrayLike<number>): F64 {
    const out = new Float64Array(a.length);
    for (let i = 0; i < out.length; i++) {
        out[i] = a[i] - b[i];
    }
    return out;
}

/**
 * The repulsion fields of one model on one tier, read from one loaded simulation (debugRunStages records one
 * truncated first iteration per call from the same positions, so every read sees the same attraction). Scale 1,
 * zero centre: layout units = scene units. The FR budget is 1,000,000 so the iteration runs at the start
 * temperature.
 * @param ctx - the context
 * @param model - the model
 * @param s - the snapshot
 * @param start - the scene start
 * @param dim - 2 or 3
 * @param tuning - the tier
 * @returns the fields
 */
async function lawRepulsion(
    ctx: GpuContext,
    model: LawModel,
    s: GraphSnapshot,
    start: F32,
    dim: 2 | 3,
    tuning: GpuLayoutTuning,
): Promise<LawFields> {
    const grid = tuning.repulsion === "grid";
    const read = async (st: StageIo): Promise<LawFields> => {
        await st.run("K2");
        const attraction = asF32(await st.read("force"));
        if (!grid) {
            await st.run("K3");
            return {
                total: minus(asF32(await st.read("force")), attraction),
                far: null,
                positions: null,
                cellKey: null,
                eps: null,
            };
        }
        await st.run("G6");
        const afterFar = asF32(await st.read("force"));
        // the per-node key: after the three radix passes `cellKey` holds a pass-2 intermediate (PD-5), the sorted
        // pair is the result, so node sortedIdx[t] has key sortedKey[t]
        const sortedKey = await st.read("sortedKey");
        const sortedIdx = await st.read("sortedIdx");
        if (!(sortedKey instanceof Uint32Array) || !(sortedIdx instanceof Uint32Array)) {
            throw new Error("expected Uint32Array readbacks of sortedKey / sortedIdx");
        }
        const cellKey = new Uint32Array(sortedKey.length);
        for (let t = 0; t < sortedKey.length; t++) {
            cellKey[sortedIdx[t]] = sortedKey[t];
        }
        const state = await st.read("state");
        const header = FA2_STATE.read(new DataView(state.buffer, state.byteOffset, state.byteLength));
        const { eps } = header;
        if (typeof eps !== "number") {
            throw new Error("expected a scalar eps in the state header");
        }
        await st.run("G7");
        const afterNear = asF32(await st.read("force"));
        return {
            total: minus(afterNear, attraction),
            far: minus(afterFar, attraction),
            positions: asF32(await st.read("positions")),
            cellKey,
            eps,
        };
    };
    if (model === "fr") {
        return await withFrSim(ctx, { ...FR_BASE_OPTIONS, dim, iterations: 1_000_000 }, tuning, async (sim) => {
            sim.load(s, Float32Array.from(start));
            return await read(frStages(sim));
        });
    }
    return await withSeSim(ctx, { ...SE_BASE_OPTIONS, dim }, tuning, async (sim) => {
        sim.load(s, Float32Array.from(start));
        return await read(seStages(sim));
    });
}

/**
 * The far field alone: the grid's (G6 minus K2) and the f64 reference over the sampled nodes, and the whole-field
 * relative error `|grid - reference| / |reference|`. Part of what lawExactVsGrid returns (knip: exported for the
 * signature, not imported by name).
 * @public
 */
export interface LawFarField {
    readonly grid: F64;
    readonly reference: F64;
    readonly error: number;
}

/**
 * The two comparisons of one model on one fixture: the whole repulsion (every node) and the far field alone (the
 * sampled nodes; null on a fixture outside LAW_FAR_FIELD_FIXTURES). What lawExactVsGrid returns (knip: exported
 * for the signature, not imported by name).
 * @public
 */
export interface LawExactVsGrid {
    readonly total: ExactVsGrid;
    readonly far: LawFarField | null;
}

/** The sampled node indices of the far-field reference: every step-th node, step = max(1, floor(n / FAR_SAMPLE_NODES)). */
function farSample(n: number): number[] {
    const step = Math.max(1, Math.floor(n / FAR_SAMPLE_NODES));
    const out: number[] = [];
    for (let i = 0; i < n; i += step) {
        out.push(i);
    }
    return out;
}

/**
 * The f64 far field of the sampled nodes under the model's law by design 7.7's own construction (G6's traversal,
 * test/oracle/grid-field.ts's shape for the FA2 law): the mass-weighted centroids of every pyramid level from the
 * layout positions and the finest-cell keys G1 assigned (`levelOffsets` implicit: one array per level; the 2^dim
 * outside pseudo-cells, one per orthant, from the outside nodes' keys), then per node the coarsest level minus its 3x3
 * (3x3x3), each finer level's parent 3x3 refined minus the level's own 3x3, and every pseudo-cell (an outside node:
 * the coarsest level in full),
 * every term `d * (k^2 M / d2)` (FR, LAW 1) or `d * (-g m_i M / d2^1.5)` (coulomb, LAW 2) with `d = p_i - c`
 * and `d2 = |d|^2 + eps^2`. The law is the P5 kernel text's in f64, never read from a kernel; the traversal
 * isolates the per-cell law from the monopole approximation (against a pair sum the coulomb far field sits at the
 * cap's edge in 2D, 4.9 % at 20k, measured 2026-09-20).
 * @param model - the model
 * @param positions - the layout positions (xyz + mass per node)
 * @param cellKey - the finest-cell key of every node (the pseudo-cells are `cells + orthant`)
 * @param eps - the frame's softening (0.25 x the finest cell)
 * @param g - the finest side G
 * @param dim - 2 or 3
 * @param sample - the sampled node indices
 * @returns the stride-3 far field of the sampled nodes, in sample order
 */
function farReference(
    model: LawModel,
    positions: F32,
    cellKey: U32,
    eps: number,
    g: number,
    dim: 2 | 3,
    sample: readonly number[],
): F64 {
    const n = cellKey.length;
    const cells = dim === 3 ? g * g * g : g * g;
    const levels = Math.log2(g / GRID_COARSEST_SIDE) + 1;
    const frK = 1 / Math.sqrt(n);
    const coulomb = SE_BASE_OPTIONS.gravity ?? SE_DEFAULTS.gravity * springSizeFactor(n);
    // the pyramid: per level the mass-weighted sums (x, y, z, M) of every cell; the pseudo-cells apart
    const sums: Float64Array[] = [];
    for (let level = 0; level < levels; level++) {
        const side = g >> level;
        sums.push(new Float64Array(4 * (dim === 3 ? side * side * side : side * side)));
    }
    const pseudo = new Float64Array(4 * 2 ** dim);
    const cellOf = (key: number): readonly [number, number, number] => [
        key % g,
        Math.floor(key / g) % g,
        dim === 3 ? Math.floor(key / (g * g)) : 0,
    ];
    const index = (level: number, cx: number, cy: number, cz: number): number => {
        const side = g >> level;
        return cx + side * (cy + (dim === 3 ? side * cz : 0));
    };
    const add = (target: Float64Array, at: number, i: number): void => {
        const m = positions[4 * i + 3];
        target[4 * at] += m * positions[4 * i];
        target[4 * at + 1] += m * positions[4 * i + 1];
        target[4 * at + 2] += m * positions[4 * i + 2];
        target[4 * at + 3] += m;
    };
    for (let i = 0; i < n; i++) {
        if (cellKey[i] >= cells) {
            add(pseudo, cellKey[i] - cells, i);
            continue;
        }
        const [cx, cy, cz] = cellOf(cellKey[i]);
        for (let level = 0; level < levels; level++) {
            add(sums[level], index(level, cx >> level, cy >> level, cz >> level), i);
        }
    }
    const out = new Float64Array(3 * sample.length);
    sample.forEach((i, k) => {
        const mi = positions[4 * i + 3];
        let fx = 0;
        let fy = 0;
        let fz = 0;
        const term = (q: Float64Array, at: number): void => {
            const mass = q[4 * at + 3];
            if (mass <= 0) {
                return;
            }
            const dx = positions[4 * i] - q[4 * at] / mass;
            const dy = positions[4 * i + 1] - q[4 * at + 1] / mass;
            const dz = positions[4 * i + 2] - q[4 * at + 2] / mass;
            const d2 = dx * dx + dy * dy + dz * dz + eps * eps;
            const scale = model === "fr" ? (frK * frK * mass) / d2 : (-coulomb * mi * mass) / (d2 * Math.sqrt(d2));
            fx += dx * scale;
            fy += dy * scale;
            fz += dz * scale;
        };
        const top = levels - 1;
        const ts = g >> top;
        const zTop = dim === 3 ? ts - 1 : 0;
        const inside = cellKey[i] < cells;
        const [cx0, cy0, cz0] = inside ? cellOf(cellKey[i]) : [0, 0, 0];
        if (inside) {
            const ct = [cx0 >> top, cy0 >> top, cz0 >> top];
            for (let cz = 0; cz <= zTop; cz++) {
                for (let cy = 0; cy < ts; cy++) {
                    for (let cx = 0; cx < ts; cx++) {
                        if (Math.abs(cx - ct[0]) <= 1 && Math.abs(cy - ct[1]) <= 1 && Math.abs(cz - ct[2]) <= 1) {
                            continue;
                        }
                        term(sums[top], index(top, cx, cy, cz));
                    }
                }
            }
            for (let l = top; l > 0; l--) {
                const level = l - 1;
                const cl = [cx0 >> level, cy0 >> level, cz0 >> level];
                const cp = [cl[0] >> 1, cl[1] >> 1, cl[2] >> 1];
                const side = g >> level;
                const lo = (c: number): number => Math.max(0, 2 * (c - 1));
                const hi = (c: number): number => Math.min(side - 1, 2 * (c + 1) + 1);
                const zLo = dim === 3 ? lo(cp[2]) : 0;
                const zHi = dim === 3 ? hi(cp[2]) : 0;
                for (let cz = zLo; cz <= zHi; cz++) {
                    for (let cy = lo(cp[1]); cy <= hi(cp[1]); cy++) {
                        for (let cx = lo(cp[0]); cx <= hi(cp[0]); cx++) {
                            if (Math.abs(cx - cl[0]) <= 1 && Math.abs(cy - cl[1]) <= 1 && Math.abs(cz - cl[2]) <= 1) {
                                continue;
                            }
                            term(sums[level], index(level, cx, cy, cz));
                        }
                    }
                }
            }
            for (let o = 0; o < 2 ** dim; o++) {
                term(pseudo, o);
            }
        } else {
            for (let cz = 0; cz <= zTop; cz++) {
                for (let cy = 0; cy < ts; cy++) {
                    for (let cx = 0; cx < ts; cx++) {
                        term(sums[top], index(top, cx, cy, cz));
                    }
                }
            }
        }
        out[3 * k] = fx;
        out[3 * k + 1] = fy;
        out[3 * k + 2] = fz;
    });
    return out;
}

/**
 * The stride-3 rows of `values` at the sampled indices, in sample order.
 * @param values - stride-3 values of every node
 * @param sample - the sampled node indices
 * @returns the sampled rows
 */
function rowsOf(values: F64, sample: readonly number[]): F64 {
    const out = new Float64Array(3 * sample.length);
    sample.forEach((i, k) => {
        out[3 * k] = values[3 * i];
        out[3 * k + 1] = values[3 * i + 1];
        out[3 * k + 2] = values[3 * i + 2];
    });
    return out;
}

/**
 * The floored per-node relative error of `grid` against `exact`.
 * @param grid - the grid tier's values
 * @param exact - the reference
 * @returns both and the error
 */
function compare(grid: F64, exact: F64): ExactVsGrid {
    const err = flooredRelError(grid, exact, FLOOR_FRACTION);
    return { grid, exact, rms: err.rms, p99: err.p99, max: err.max };
}

/**
 * `|grid - reference| / |reference|` over the whole sampled field (Euclidean norms).
 * @param grid - the grid's far field
 * @param reference - the f64 far field
 * @returns the relative error
 */
function wholeFieldError(grid: F64, reference: F64): number {
    let e2 = 0;
    let r2 = 0;
    for (let i = 0; i < reference.length; i++) {
        e2 += (grid[i] - reference[i]) ** 2;
        r2 += reference[i] ** 2;
    }
    return Math.sqrt(e2 / r2);
}

/**
 * One model's grid tier against its own exact tier from one start (PD-22): the whole repulsion (G7 minus K2
 * against K3 minus K2, every node, the floored per-node relative error's RMS, p99 and max) and, on a
 * LAW_FAR_FIELD_FIXTURES fixture, the far field alone (G6 minus K2 against the f64 far pair sum over the sampled
 * nodes, the whole-field relative error).
 * @param ctx - the context
 * @param model - the model
 * @param name - the fixture's name (decides whether the far field is compared)
 * @param s - the snapshot
 * @param start - the scene start
 * @param dim - 2 or 3
 * @returns the two comparisons
 */
export async function lawExactVsGrid(
    ctx: GpuContext,
    model: LawModel,
    name: string,
    s: GraphSnapshot,
    start: F32,
    dim: 2 | 3,
): Promise<LawExactVsGrid> {
    const grid = await lawRepulsion(ctx, model, s, start, dim, LAW_GRID_TUNING);
    const exact = await lawRepulsion(ctx, model, s, start, dim, LAW_EXACT_TUNING);
    const total = compare(grid.total, exact.total);
    if (!LAW_FAR_FIELD_FIXTURES.includes(name)) {
        return { total, far: null };
    }
    if (grid.far === null || grid.positions === null || grid.cellKey === null || grid.eps === null) {
        throw new Error("the grid tier reported no far field");
    }
    const sample = farSample(s.nodeCount);
    const { g } = gridSpecFor(s.nodeCount, dim, resolveLayoutTuning(LAW_GRID_TUNING));
    const farGrid = rowsOf(grid.far, sample);
    const reference = farReference(model, grid.positions, grid.cellKey, grid.eps, g, dim, sample);
    return { total, far: { grid: farGrid, reference, error: wholeFieldError(farGrid, reference) } };
}

/**
 * The check a `LAW` sabotage row is measured by: the worst of rms / grid-exact.rms and p99 / grid-exact.p99 of the
 * whole repulsion and of the far field's whole-field error / grid-exact.rms, over LAW_FIXTURES and both dimensions
 * on one model. The pristine kernels pass it (test/layouts/grid-law.test.ts item 1 is the same measurement,
 * asserted per case).
 * @param ctx - the context (a fresh one per mutant: the pipeline key does not include the body)
 * @param model - the model the row's law belongs to
 * @returns the merged report
 */
export async function lawCheck(ctx: GpuContext, model: LawModel): Promise<CheckReport> {
    const rms = gridTolerance("grid-exact.rms").value;
    const p99 = gridTolerance("grid-exact.p99").value;
    const reports: CheckReport[] = [];
    for (const name of LAW_FIXTURES) {
        const { snapshot: s, start } = lawFixture(name);
        try {
            for (const dim of [2, 3] as const) {
                const a = await lawExactVsGrid(ctx, model, name, s, start, dim);
                const label = `${model}/${name}/${dim}d`;
                reports.push(
                    { worst: ratioOf(a.total.rms, rms), worstLabel: `${label}/rms`, samples: s.nodeCount },
                    { worst: ratioOf(a.total.p99, p99), worstLabel: `${label}/p99`, samples: s.nodeCount },
                );
                if (a.far !== null) {
                    reports.push({
                        worst: ratioOf(a.far.error, rms),
                        worstLabel: `${label}/far`,
                        samples: Math.floor(a.far.reference.length / 3),
                    });
                }
            }
        } finally {
            ctx.release(s);
        }
    }
    return mergeReports(reports);
}
