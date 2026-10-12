// The graph: data, layout and every algorithm result, all computed once at load, before the
// session (design section 3, rule 2 of section 10.2). Only breadth-first search runs later, at a
// pinch, and it is small.

import {
    betweennessCentrality,
    breadthFirstSearch,
    connectedComponents,
    degreeCentrality,
    louvain,
    pageRank,
} from "@graphty/algorithms";
import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { florentineFamilies } from "@graphty/graph-samples/datasets/florentine-families";
import { plantedPartitionGraph } from "@graphty/graph-samples/generators";
import { forceAtlas2, kamadaKawai } from "@graphty/layout";

/** The loaded graph and everything computed from it. */
export interface GraphData {
    kind: "florentine" | "dense";
    snapshot: GraphSnapshot;
    nodeCount: number;
    /** Edge endpoints, by node index. */
    src: Uint32Array;
    dst: Uint32Array;
    names: string[];
    noun: [string, string];
    /** Positions in a 0.5 m box centered on the origin, x y z per node. */
    positions: Float32Array;
    results: Record<string, Float64Array>;
    resultNames: Record<string, string>;
    /** Whether a result is categorical (colored by category, not by a ramp). */
    categorical: Record<string, boolean>;
    /** Node indices by result value, highest first. */
    order: Record<string, number[]>;
    /** Rank of each node for each result, 1 = highest. */
    rank: Record<string, Uint32Array>;
    neighbors(id: number, hops: number): number[];
    loadMs: number;
}

/** The size of the box the layout is scaled into, in meters. */
const BOX_M = 0.5;

/**
 * Load a graph, lay it out in 3D and compute every result.
 * @param kind - Florentine families or the seeded dense graph
 * @param n - node count of the dense graph
 * @param seed - seed of the dense graph and its layout
 * @returns the graph data
 */
export function loadGraph(kind: "florentine" | "dense", n: number, seed: number): GraphData {
    const t0 = performance.now();
    const groups = 8;
    const sample =
        kind === "florentine"
            ? florentineFamilies()
            : plantedPartitionGraph({ groups, groupSize: Math.ceil(n / groups), pIn: 0.1, pOut: 0.002, seed });
    const s = fromEdgeArrays(sample);
    const layout = kind === "florentine" ? kamadaKawai(s, { dim: 3 }) : forceAtlas2(s, { dim: 3, seed });
    const positions = normalize(layout.positions, s.nodeCount);

    const results: Record<string, Float64Array> = {
        pagerank: pageRank(s).scores,
        degree: Float64Array.from(degreeCentrality(s)),
        betweenness: betweennessCentrality(s).scores,
        community: Float64Array.from(louvain(s).labels),
        component: Float64Array.from(connectedComponents(s).labels),
    };
    const order: Record<string, number[]> = {};
    const rank: Record<string, Uint32Array> = {};
    for (const [id, v] of Object.entries(results)) {
        order[id] = Array.from(v.keys()).sort((a, b) => v[b] - v[a]);
        rank[id] = new Uint32Array(v.length);
        order[id].forEach((node, r) => (rank[id][node] = r + 1));
    }
    const names = Array.from({ length: s.nodeCount }, (_, i) =>
        kind === "florentine" ? String(s.ids.idOf(i)) : `n${i}`,
    );
    const hopCache = new Map<number, ReturnType<typeof breadthFirstSearch>["depth"]>();

    return {
        kind,
        snapshot: s,
        nodeCount: s.nodeCount,
        src: Uint32Array.from(sample.src),
        dst: Uint32Array.from(sample.dst),
        names,
        noun: kind === "florentine" ? ["family", "families"] : ["node", "nodes"],
        positions,
        results,
        resultNames: {
            pagerank: "PageRank",
            degree: "degree",
            betweenness: "betweenness",
            community: "community",
            component: "component",
        },
        categorical: { community: true, component: true },
        order,
        rank,
        neighbors(id, hops) {
            // ponytail: one BFS to depth 8 per source, cached; hops past 8 read as 8.
            let depth = hopCache.get(id);
            if (!depth) {
                ({ depth } = breadthFirstSearch(s, id, { maxDepth: 8 }));
                hopCache.set(id, depth);
            }
            const out: number[] = [];
            for (let i = 0; i < depth.length; i++) {
                if (depth[i] >= 0 && depth[i] <= hops) {
                    out.push(i);
                }
            }
            return out;
        },
        loadMs: performance.now() - t0,
    };
}

/**
 * Scale positions into a box of BOX_M meters centered on the origin.
 * @param p - x y z per node, any scale
 * @param n - node count
 * @returns new positions
 */
function normalize(p: Float32Array, n: number): Float32Array {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) {
        for (let k = 0; k < 3; k++) {
            min[k] = Math.min(min[k], p[i * 3 + k]);
            max[k] = Math.max(max[k], p[i * 3 + k]);
        }
    }
    const span = Math.max(1e-9, max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        for (let k = 0; k < 3; k++) {
            out[i * 3 + k] = ((p[i * 3 + k] - (min[k] + max[k]) / 2) / span) * BOX_M;
        }
    }
    return out;
}
