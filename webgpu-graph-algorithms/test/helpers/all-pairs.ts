/**
 * The all-pairs checks shared by test/algorithms/all-pairs.test.ts and test/sabotage/all-pairs.test.ts: the fixtures
 * that reach every line of the two kernels (parallel arcs whose cheaper arc comes first and last, weights, a
 * self-loop, a 33-node graph whose last block is a one-row edge tile, and the 30 x 30 grid, whose 29 blocks per side
 * make most blocks phase-2 blocks), and the report the sabotage suite measures: every matrix entry BITWISE against
 * the blocked f32 Floyd-Warshall reference (ratioOf(|a - b|, 0): any mismatch is Infinity). A driver refusal is the
 * maximal miss.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { allPairsShortestPath } from "../../src/algorithms/all-pairs.js";
import { APSP_TILE } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { floydWarshallOracle } from "../oracle/all-pairs.js";
import { type EdgeSpec, gridEdges, KARATE_EDGES, randomEdges, randomEdgesLoose, snapshotOf } from "./graphs.js";
import { type CheckReport, mergeReports } from "./sabotage.js";
import { weightedEdges } from "./sssp.js";

/** Two parallel pairs, the cheaper arc listed first on one and last on the other, plus a weighted self-loop. */
export const PARALLEL_EDGES: readonly EdgeSpec[] = [
    [0, 1, 5],
    [0, 1, 1],
    [1, 2, 1],
    [1, 2, 5],
    [2, 2, 3],
    [2, 3, 2],
];

/** The fixtures of the sabotage report, built once. */
const REPORT_FIXTURES: readonly { readonly name: string; readonly s: GraphSnapshot }[] = [
    { name: "parallel", s: snapshotOf(PARALLEL_EDGES) },
    { name: "karate/uniform", s: snapshotOf(weightedEdges(KARATE_EDGES, "uniform", 1)) },
    { name: "loose", s: snapshotOf(randomEdgesLoose(200, 800, 7), { directed: true, nodeCount: 200 }) },
    { name: "random33/integer", s: snapshotOf(weightedEdges(randomEdges(33, 80, 3), "integer", 4)) },
    { name: "grid30/integer", s: snapshotOf(weightedEdges(gridEdges(30, 30), "integer", 2)) },
];

/** The blocked f32 references of the report fixtures, computed on first use. */
const references = new Map<string, Float64Array>();

/**
 * The blocked f32 Floyd-Warshall reference of a snapshot (the device's exact order of additions).
 * @param s - the snapshot
 * @param weighted - whether the run uses the weight column
 * @returns the row-major matrix
 */
export function blockedF32(s: GraphSnapshot, weighted: boolean): Float64Array {
    return floydWarshallOracle(s, { weighted, precision: "f32", tile: APSP_TILE });
}

/**
 * One matrix against its reference, every entry bitwise (`Object.is`, so two `+Infinity` entries agree): Infinity at
 * the first mismatch, 0 when there is none.
 * @param label - the scenario
 * @param got - the device's matrix
 * @param want - the reference
 * @returns the report
 */
function matrixReport(label: string, got: ArrayLike<number>, want: ArrayLike<number>): CheckReport {
    if (got.length !== want.length) {
        return { worst: Infinity, worstLabel: `${label}.length ${got.length} != ${want.length}`, samples: 1 };
    }
    for (let i = 0; i < want.length; i++) {
        if (!Object.is(got[i], want[i])) {
            return { worst: Infinity, worstLabel: `${label}[${i}] = ${got[i]}, want ${want[i]}`, samples: want.length };
        }
    }
    return { worst: 0, worstLabel: label, samples: want.length };
}

/**
 * The sabotage report: every fixture's matrix bitwise against the blocked f32 reference.
 * @param ctx - the context
 * @returns the merged report
 */
export async function allPairsReport(ctx: GpuContext): Promise<CheckReport> {
    const reports: CheckReport[] = [];
    for (const { name, s } of REPORT_FIXTURES) {
        let want = references.get(name);
        if (want === undefined) {
            want = blockedF32(s, true);
            references.set(name, want);
        }
        try {
            const { dist } = await allPairsShortestPath(ctx, s);
            reports.push(matrixReport(`${name}.dist`, dist, want));
        } catch (err) {
            if (!isWebGpuGraphError(err)) {
                throw err;
            }
            reports.push({ worst: Infinity, worstLabel: `${name}: ${err.code}`, samples: 1 });
        } finally {
            ctx.release(s);
        }
    }
    return mergeReports(reports);
}
