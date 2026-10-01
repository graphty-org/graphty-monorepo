/**
 * The near-far shortest-path checks (design 8.4, 9.7; P8-T9, the P8 plan's PD-9 / PD-10 / PD-20 / PD-22 / PD-27)
 * shared by test/algorithms/sssp.test.ts and test/sabotage/sssp.test.ts: the weighted fixture generators (uniform
 * [0.1, 10], integers 1..10, a third of the arcs at weight 0, six decades), the two PD-27 counterexamples
 * (`zeroPlateau`, whose plateau is joined by zero-weight arcs, and `absorbPath`, whose plateau is one f32 absorption
 * at 2^24), the weight-2 path whose round count P8-T9 Step 6 pins, the derived f32-versus-f64 tolerance
 * (`ssspTolerance`: the committed value of benchmarks/results/noise-floor.json under the design 9.7 cap, or the
 * cap itself during a recording run), and the report the sabotage suite measures, bitwise (ratioOf(|a - b|, 0):
 * any mismatch is Infinity): the `dist` bit patterns against the f32 Dijkstra oracle, `predArc` against the host's
 * PD-27 plateau rule and `reachedCount` on the uniform-weight grid, the integer-weight grid under a cutoff some node
 * attains exactly (the `<=` case), the weight-2 path under `delta 32` (its four buckets and its round count) and
 * `zeroPlateau(8)` (the chain the 2026-09-23 rule cycles on); a driver refusal (E_VALIDATION from the predecessor
 * pass, E_UNSUPPORTED from a stalled threshold) is the maximal miss.
 */

import { type GraphSnapshot, type U32 } from "@graphty/graph-format";

import { type SsspTuning, ssspWithTuning } from "../../src/algorithms/sssp.js";
import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { type UniformValues } from "../../src/kernel/struct-block.js";
import { type SsspOptions } from "../../src/types/accelerator.js";
import { type GpuSsspResult } from "../../src/types/traversal.js";
import { dijkstraOracle } from "../oracle/traversal.js";
import { bitwiseReports } from "./frontier.js";
import { type EdgeSpec, gridEdges, pathEdges, snapshotOf, xorshift } from "./graphs.js";
import { noiseFloorFor } from "./noise-floor.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";
import { predArcByRule } from "./traversal-check.js";

/** How `weightedEdges` draws a weight: uniform in [0.1, 10], an integer in 1..10, an integer in 0..2 (a third of the arcs at 0), or a power of ten from 1e-3 to 1e3 (six decades). */
type WeightKind = "uniform" | "integer" | "zeros" | "decades";

/** The row id of the f32-versus-f64 Dijkstra spread (the basis of the derived tolerance of the same name). */
export const SSSP_F32_VS_F64 = "sssp-relax.f32-vs-f64";

/** Design 9.7's parity cap for the f64 comparison; the derived tolerance is `min(cap, 10 x floor)` (test/noise-floor.test.ts). */
export const SSSP_TOLERANCE_CAPS: Readonly<Record<string, { readonly cap: number; readonly basis: string }>> =
    Object.freeze({
        [SSSP_F32_VS_F64]: { cap: 1e-5, basis: SSSP_F32_VS_F64 },
    });

/** The absolute floor of the relative f32-versus-f64 comparison (a distance below it is compared absolutely). */
const SSSP_ABS_FLOOR = 1e-6;

const WRITE = process.env.GRAPHTY_NOISE_FLOOR_WRITE === "1";

/** The weight-2 path of P8-T9 Step 6: 64 nodes, every arc at 2, `delta 32` through the tuning seam. */
const WEIGHT2_PATH_NODES = 64;
export const WEIGHT2_DELTA = 32;
/** One near round per node (the source included) plus one far pass-through per bucket transition (32, 64, 96). */
export const WEIGHT2_ROUNDS = WEIGHT2_PATH_NODES + 3;

/**
 * The edges with a weight drawn per edge from a seeded stream (an undirected snapshot gives both arcs of an edge the
 * same weight).
 * @param edges - the unweighted edges
 * @param kind - the distribution
 * @param seed - the generator seed
 * @returns the weighted edges
 */
export function weightedEdges(edges: readonly EdgeSpec[], kind: WeightKind, seed: number): EdgeSpec[] {
    const random = xorshift(seed);
    return edges.map(([u, v]) => {
        let w: number;
        switch (kind) {
            case "uniform":
                w = 0.1 + 9.9 * random();
                break;
            case "integer":
                w = 1 + Math.floor(random() * 10);
                break;
            case "zeros":
                w = Math.floor(random() * 3);
                break;
            case "decades":
                w = 10 ** (Math.floor(random() * 7) - 3);
                break;
            default:
                throw new Error(`weightedEdges: unknown kind ${String(kind)}`);
        }
        return [u, v, w];
    });
}

/**
 * PD-27's first counterexample: the source `k` joined to `k - 1` at weight 1, then `k - 1, k - 2, ..., 0` chained at
 * weight 0 (undirected), so every plateau node's SMALLEST tight in-arc comes from its deeper neighbour and the
 * smallest-attaining-arc rule walks `j -> j - 1 -> ... -> 0 -> 1 -> 0` forever, while the plateau rule walks
 * `j -> j + 1 -> ... -> k`.
 * @param k - the source and the plateau's length
 * @returns the edges
 */
export function zeroPlateau(k: number): EdgeSpec[] {
    const edges: EdgeSpec[] = [[k, k - 1, 1]];
    for (let j = k - 1; j >= 1; j--) {
        edges.push([j, j - 1, 0]);
    }
    return edges;
}

/**
 * PD-27's second counterexample: `zeroPlateau`'s shape with the first arc at 2^24 and the chain at weight 1, so
 * every chain node settles at exactly 2^24 (`Math.fround(2 ** 24 + 1) === 2 ** 24`): one plateau reached through
 * strictly positive weights.
 * @param k - the source and the plateau's length
 * @returns the edges
 */
export function absorbPath(k: number): EdgeSpec[] {
    const edges: EdgeSpec[] = [[k, k - 1, 2 ** 24]];
    for (let j = k - 1; j >= 1; j--) {
        edges.push([j, j - 1, 1]);
    }
    return edges;
}

/**
 * The weight-2 path: `pathEdges(WEIGHT2_PATH_NODES)` with every edge at 2.
 * @returns the edges
 */
export function weightTwoPath(): EdgeSpec[] {
    return pathEdges(WEIGHT2_PATH_NODES).map(([u, v]) => [u, v, 2]);
}

/**
 * The tolerance the f64 comparison uses: the derived value of benchmarks/results/noise-floor.json (noiseFloorFor),
 * asserted to sit under the design 9.7 cap with the basis row the caps table names, or the cap itself during a
 * recording run (GRAPHTY_NOISE_FLOOR_WRITE=1), when the derived value does not exist yet.
 * @returns the tolerance value and its basis row
 */
export function ssspTolerance(): { readonly value: number; readonly basis: string } {
    const spec = SSSP_TOLERANCE_CAPS[SSSP_F32_VS_F64];
    if (WRITE) {
        return { value: spec.cap, basis: spec.basis };
    }
    const derived = noiseFloorFor(SSSP_F32_VS_F64);
    if (derived.basis !== spec.basis) {
        throw new Error(`${SSSP_F32_VS_F64}: the committed basis row ${derived.basis} is not ${spec.basis}`);
    }
    if (!(derived.value <= spec.cap)) {
        throw new Error(
            `${SSSP_F32_VS_F64}: the derived tolerance ${derived.value} is above the spec cap ${spec.cap} (a finding, spec 10.4)`,
        );
    }
    return derived;
}

/**
 * The f32 bit patterns of distances (the form PD-9 stores and the bitwise comparison reads).
 * @param values - the distances (any numeric array; each is rounded to f32 first)
 * @returns the bit patterns
 */
export function distBits(values: ArrayLike<number>): U32 {
    return new Uint32Array(Float32Array.from(values).buffer);
}

/**
 * The largest relative difference between two distance arrays over the finite entries, with an absolute floor; a
 * node finite in one and infinite in the other is `Infinity`.
 * @param a - the first distances
 * @param b - the second distances
 * @returns the spread
 */
export function relSpread(a: ArrayLike<number>, b: ArrayLike<number>): number {
    let worst = 0;
    for (let v = 0; v < b.length; v++) {
        if (a[v] === Infinity || b[v] === Infinity) {
            if (a[v] !== b[v]) {
                return Infinity;
            }
            continue;
        }
        const error = Math.abs(a[v] - b[v]) / Math.max(Math.abs(b[v]), SSSP_ABS_FLOOR);
        if (!(error <= worst)) {
            worst = error;
        }
    }
    return worst;
}

/**
 * One run's three arrays and counts against the f32 oracle and the host's plateau rule, every sample bitwise; a
 * driver refusal is the maximal miss.
 * @param ctx - the context
 * @param label - the scenario
 * @param s - the snapshot
 * @param source - the source vertex
 * @param options - the run's options
 * @param tuning - the run's tuning
 * @returns the reports and the last counters block (null after a refusal)
 */
async function runReports(
    ctx: GpuContext,
    label: string,
    s: GraphSnapshot,
    source: number,
    options: SsspOptions | undefined,
    tuning: SsspTuning,
): Promise<{ readonly reports: CheckReport[]; readonly last: UniformValues | null }> {
    const want = dijkstraOracle(s, source, "f32", {
        cutoff: options?.cutoff === undefined ? undefined : Math.fround(options.cutoff),
        weights: options?.weights,
    });
    const blocks: UniformValues[] = [];
    let got: GpuSsspResult;
    try {
        got = await ssspWithTuning(ctx, s, source, options, {
            ...tuning,
            onRound: (_round, block) => {
                blocks.push(block);
            },
        });
    } catch (err) {
        if (isWebGpuGraphError(err) && (err.code === "E_VALIDATION" || err.code === "E_UNSUPPORTED")) {
            return {
                reports: [{ worst: Infinity, worstLabel: `${label}.dist (${err.message})`, samples: 1 }],
                last: null,
            };
        }
        throw err;
    }
    const reports = [
        ...bitwiseReports(`${label}.dist`, distBits(got.dist), distBits(want.dist)),
        ...bitwiseReports(
            `${label}.predArc`,
            got.predArc,
            predArcByRule(got.dist, s, source, "plateau", options?.weights),
        ),
        {
            worst: ratioOf(Math.abs(got.reachedCount - want.reachedCount), 0),
            worstLabel: `${label}.reachedCount`,
            samples: 1,
        },
    ];
    return { reports, last: blocks[blocks.length - 1] ?? null };
}

/**
 * The sabotage check of `sssp-relax` and `sssp-pred` in its f32 mode (spec 11.9 item 1): the uniform-weight grid,
 * the integer-weight grid under a cutoff attained exactly, the weight-2 path under `delta 32` with its round count,
 * and `zeroPlateau(8)`, every sample bitwise against the f32 oracle and the host's plateau rule.
 * @param ctx - the context
 * @returns the report
 */
export async function ssspReport(ctx: GpuContext): Promise<CheckReport> {
    const reports: CheckReport[] = [];
    const uniform = snapshotOf(weightedEdges(gridEdges(30, 30), "uniform", 11), { label: "sssp-report-uniform" });
    reports.push(...(await runReports(ctx, "grid30-uniform", uniform, 0, undefined, {})).reports);
    ctx.release(uniform);
    // the <= case: an integer cutoff some node attains exactly (the centre's distance from the corner)
    const integer = snapshotOf(weightedEdges(gridEdges(30, 30), "integer", 12), { label: "sssp-report-integer" });
    const cutoff = dijkstraOracle(integer, 0, "f32").dist[465];
    reports.push(...(await runReports(ctx, "grid30-integer-cutoff", integer, 0, { cutoff }, {})).reports);
    ctx.release(integer);
    // the four buckets of the weight-2 path: one near round per node, one far pass-through per bucket transition
    const path = snapshotOf(weightTwoPath(), { label: "sssp-report-weight2" });
    const run = await runReports(ctx, "path64-weight2", path, 0, undefined, { delta: WEIGHT2_DELTA });
    reports.push(...run.reports);
    if (run.last !== null) {
        reports.push({
            worst: ratioOf(Math.abs(Number(run.last.level) - WEIGHT2_ROUNDS), 0),
            worstLabel: "path64-weight2.level",
            samples: 1,
        });
    }
    ctx.release(path);
    const plateau = snapshotOf(zeroPlateau(8), { label: "sssp-report-plateau" });
    reports.push(...(await runReports(ctx, "zeroPlateau8", plateau, 8, undefined, {})).reports);
    ctx.release(plateau);
    return mergeReports(reports);
}
