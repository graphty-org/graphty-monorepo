import {
    type EdgeMask,
    type F64,
    type GraphSnapshot,
    makeMask,
    maskCount,
    maskSet,
    maskTest,
    type U32,
} from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { edgeBetweennessCentrality } from "./betweenness.js";
import { type LabelResult, withGroups } from "./components.js";
import { arcWeightsOf, exactEdgeWeights } from "./label-propagation.js";
import { modularity } from "./modularity.js";
import { IntUnionFind } from "./structures/union-find.js";

/** Options of the index-based Girvan-Newman, matching the legacy `girvanNewman`. @public */
export interface GirvanNewmanOptions {
    /** Stop once a level has at least this many communities of `minCommunitySize` or more nodes. */
    readonly maxCommunities?: number | undefined;
    /** Communities smaller than this do not count towards `maxCommunities`; default 1. */
    readonly minCommunitySize?: number | undefined;
    /** Cap on rounds of edge removal; default 100. */
    readonly maxIterations?: number | undefined;
}

/**
 * The Girvan-Newman dendrogram: one partition per level, the uncut graph first. As a `LabelResult` it is the most
 * modular level, `levels[bestLevel]`. @public
 */
export interface GirvanNewmanResult extends LabelResult {
    /** The level with the highest modularity, the first of any tie; 0 when every level's modularity is NaN. */
    readonly bestLevel: number;
    /** Dense community label per node index at each level, in first-seen order. */
    readonly levels: U32[];
    /** Modularity of each level's partition over the original graph. */
    readonly modularity: F64;
}

/** Scores this close to the maximum are removed together, as the legacy function does. */
const TIE = 1e-10;

/**
 * Connected components over the edges still alive.
 * @param s - The snapshot
 * @param alive - Kept edges
 * @returns Dense labels and their count
 */
function aliveComponents(s: GraphSnapshot, alive: EdgeMask): { labels: U32; count: number } {
    const uf = new IntUnionFind(s.nodeCount);
    const el = s.edgeList();
    for (let e = 0; e < s.edgeCount; e++) {
        if (maskTest(alive, e)) {
            uf.union(el.src[e], el.dst[e]);
        }
    }
    return uf.toLabels();
}

/**
 * Girvan-Newman divisive community detection (PNAS 99:7821, 2002) over an undirected snapshot:
 * repeatedly delete every edge whose betweenness is the maximum (within 1e-10), recording the
 * connected components after each round as one level of a dendrogram.
 *
 * Edges are deleted by clearing bits of an alive mask over logical edges that the edge betweenness
 * reads, so no graph is rebuilt. Betweenness is unweighted, as in the legacy function; a pair of
 * nodes joined by parallel edges is one neighbour relation whose share goes to the first alive
 * parallel, so the parallels are deleted one round at a time. Modularity reads the edge weights,
 * the exact f64 ones when the snapshot keeps them, with graph-format's `weightedDegree()` rule (a
 * self-loop counts twice); on a graph without self-loops it equals the legacy function's.
 *
 * The run stops when no edge is left, after `maxIterations` rounds, when a level has
 * `maxCommunities` communities of at least `minCommunitySize` nodes, or when that count reaches
 * the node count. Every level is returned whole: the legacy function drops communities below
 * `minCommunitySize` from the lists it returns, which a caller does with `levels[i]` and a size
 * count.
 * @param s - An undirected snapshot
 * @param options - Stopping rules
 * @returns The levels and their modularity
 * @throws Error on a directed snapshot
 * @public
 */
export function girvanNewman(s: GraphSnapshot, options: GirvanNewmanOptions = {}): GirvanNewmanResult {
    if (s.directed) {
        throw withCode(
            new Error("Girvan-Newman requires an undirected graph. Pass s.toUndirected().snapshot."),
            "E_NEEDS_UNDIRECTED",
        );
    }
    const maxCommunities = options.maxCommunities ?? 0;
    const minCommunitySize = options.minCommunitySize ?? 1;
    const maxIterations = options.maxIterations ?? 100;
    const { nodeCount: n, edgeCount } = s;
    const weights = arcWeightsOf(s, exactEdgeWeights(s));
    const alive = makeMask(edgeCount, true);
    const levels: U32[] = [];
    const scores: number[] = [];
    const counts: number[] = [];
    const record = (): number => {
        const { labels, count } = aliveComponents(s, alive);
        levels.push(labels);
        counts.push(count);
        scores.push(modularity(s, labels, weights === null ? {} : { weights }));
        const sizes = new Uint32Array(count);
        for (let u = 0; u < n; u++) {
            sizes[labels[u]]++;
        }
        return sizes.filter((size) => size >= minCommunitySize).length;
    };
    record();
    for (let round = 0; round < maxIterations && maskCount(alive, edgeCount) > 0; round++) {
        const betweenness = edgeBetweennessCentrality(s, { alive }).scores;
        let max = -Infinity;
        for (let e = 0; e < edgeCount; e++) {
            if (maskTest(alive, e) && betweenness[e] > max) {
                max = betweenness[e];
            }
        }
        for (let e = 0; e < edgeCount; e++) {
            if (maskTest(alive, e) && Math.abs(betweenness[e] - max) < TIE) {
                maskSet(alive, e, false);
            }
        }
        const valid = record();
        if ((maxCommunities > 0 && valid >= maxCommunities) || valid === n) {
            break;
        }
    }
    let bestLevel = 0;
    for (let i = 1; i < scores.length; i++) {
        if (scores[i] > scores[bestLevel] || (Number.isNaN(scores[bestLevel]) && !Number.isNaN(scores[i]))) {
            bestLevel = i;
        }
    }
    return {
        ...withGroups(levels[bestLevel], counts[bestLevel]),
        bestLevel,
        levels,
        modularity: Float64Array.from(scores),
    };
}
