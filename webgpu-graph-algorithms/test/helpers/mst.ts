/**
 * The minimum spanning forest checks (design 8.5, 9.7; the P11 plan's P11-T4): the device forest against
 * `@graphty/algorithms`' `kruskalMST` -- the edge SET exactly (Boruvka under the total order (weight, edge index) is the
 * forest Kruskal accepts when its sort breaks ties by edge index, which `kruskalMST` does) and `totalWeight` to the f64
 * rounding of a different summation order -- plus the weighted fixtures the plain fixture list lacks, and the
 * sabotage check of `mst-best` and `mst-link`.
 */

import { kruskalMST } from "@graphty/algorithms";
import { type GraphSnapshot } from "@graphty/graph-format";

import { minimumSpanningTree } from "../../src/algorithms/mst.js";
import { type GpuContext } from "../../src/context.js";
import { type GpuMstResult } from "../../src/types/structure.js";
import { type EdgeSpec, KARATE_EDGES, randomEdgesLoose, snapshotOf, xorshift } from "./graphs.js";
// type-only: sabotage.ts pulls in the Node GPU setup, and the browser project imports this file
import type { CheckReport } from "./sabotage.js";

/** The relative tolerance of `totalWeight`: both sides sum the same f32 weights in f64, in different orders. */
const MST_TOTAL_TOLERANCE = 1e-9;

/**
 * A path of `2^levels` nodes whose edge `(i, i + 1)` weighs the trailing zeros of `i + 1`: every Boruvka round merges
 * pairs of the previous round's components, so it takes exactly `levels` rounds -- more than one submit's worth.
 * @param levels - log2 of the node count
 * @returns the weighted edges
 */
export function deepPathEdges(levels: number): EdgeSpec[] {
    const edges: EdgeSpec[] = [];
    for (let i = 0; i + 1 < 2 ** levels; i++) {
        edges.push([i, i + 1, Math.log2((i + 1) & -(i + 1))]);
    }
    return edges;
}

/**
 * Seeded G(n, m) with self-loops and parallel edges and weights drawn from `values` (so ties are common).
 * @param n - node count
 * @param m - edge count
 * @param seed - the generator seed
 * @param values - the weights to draw from
 * @returns the weighted edges
 */
export function drawnWeightEdges(n: number, m: number, seed: number, values: readonly number[]): EdgeSpec[] {
    const random = xorshift(seed);
    return randomEdgesLoose(n, m, seed).map(([u, v]) => [u, v, values[Math.floor(random() * values.length)]] as const);
}

/**
 * Seeded G(n, m) with distinct weights spread over both signs (the forest is unique without the tie rule).
 * @param n - node count
 * @param m - edge count
 * @param seed - the generator seed
 * @returns the weighted edges
 */
export function distinctWeightEdges(n: number, m: number, seed: number): EdgeSpec[] {
    const random = xorshift(seed);
    const order = Array.from({ length: m }, (_, i) => i);
    for (let i = m - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    return randomEdgesLoose(n, m, seed + 1).map(([u, v], e) => [u, v, order[e] - m / 2 + 0.25] as const);
}

/**
 * How far the device forest is from `kruskalMST`'s: Infinity when the edge sets differ (after sorting) or an edge
 * repeats, else the relative error of `totalWeight` over MST_TOTAL_TOLERANCE.
 * @param label - the report label
 * @param s - the snapshot
 * @param got - the device result
 * @returns the report
 */
export function mstAgreement(label: string, s: GraphSnapshot, got: GpuMstResult): CheckReport {
    const want = kruskalMST(s);
    const a = Uint32Array.from(got.edges).sort();
    const b = Uint32Array.from(want.edges).sort();
    let mismatch = a.length === b.length ? 0 : 1;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        mismatch += a[i] === b[i] ? 0 : 1;
    }
    if (mismatch > 0) {
        return { worst: Infinity, worstLabel: `${label}.edges (${mismatch} differ)`, samples: b.length };
    }
    if (Object.is(got.totalWeight, want.totalWeight) || got.totalWeight === want.totalWeight) {
        // equal, or both NaN: a forest holding +Infinity and -Infinity sums to NaN in any order
        return { worst: 0, worstLabel: `${label}.totalWeight`, samples: b.length };
    }
    // NaN on one side only is a mismatch
    const scale = Math.max(1, Math.abs(want.totalWeight));
    const error = Math.abs(got.totalWeight - want.totalWeight) / scale;
    return {
        worst: Number.isNaN(error) ? Infinity : error / MST_TOTAL_TOLERANCE,
        worstLabel: `${label}.totalWeight`,
        samples: b.length,
    };
}

/** The snapshots of the sabotage check: ties, negative weights, a deep path, a forest, a directed multigraph. */
function checkGraphs(): [string, GraphSnapshot][] {
    const forest: EdgeSpec[] = [];
    for (let t = 0; t < 20; t++) {
        forest.push([3 * t, 3 * t + 1, 2], [3 * t + 1, 3 * t + 2, 1], [3 * t, 3 * t + 2, 1]);
    }
    return [
        ["karate", snapshotOf(KARATE_EDGES)],
        ["negative", snapshotOf(distinctWeightEdges(200, 900, 5))],
        ["ties", snapshotOf(drawnWeightEdges(200, 900, 6, [-2, 0, 1, 3]))],
        ["deep", snapshotOf(deepPathEdges(9))],
        ["forest", snapshotOf(forest, { nodeCount: 64 })],
        ["directed", snapshotOf(drawnWeightEdges(120, 500, 7, [0.5, 1, 1.5]), { directed: true, nodeCount: 120 })],
    ];
}

/**
 * The sabotage check of `mst-best` and `mst-link`: the device forest against `kruskalMST` on the graphs above; a throw
 * is Infinity.
 * @param ctx - the context
 * @returns the merged report
 */
export async function mstReport(ctx: GpuContext): Promise<CheckReport> {
    const reports: CheckReport[] = [];
    for (const [label, s] of checkGraphs()) {
        try {
            reports.push(mstAgreement(label, s, await minimumSpanningTree(ctx, s)));
        } catch {
            reports.push({ worst: Infinity, worstLabel: `${label} threw`, samples: 1 });
        }
        ctx.release(s);
    }
    return reports.reduce((worst, r) => (r.worst > worst.worst ? r : worst), {
        worst: 0,
        worstLabel: "(no samples)",
        samples: 0,
    });
}
