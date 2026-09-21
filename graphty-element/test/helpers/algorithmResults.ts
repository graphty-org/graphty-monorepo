/**
 * @file Reading an algorithm's result the way the 1.x tests asked for it.
 *
 * WHY THIS EXISTS. Until the style migration, every algorithm scattered its numbers onto the
 * render objects at `node.algorithmResults.<namespace>.<type>.<key>`, and the tests read them
 * back from there. That projection existed for exactly one consumer -- the hand-written
 * `suggestedStyles` layers, whose selectors and calculated-style inputs named those paths -- and
 * it went with them. An algorithm now returns a `RunResult`, and a style layer reads
 * `results.<runId>.<field>`.
 *
 * So the old KEYS are translated here, in the tests, rather than kept alive in the element. The
 * table below is the whole of the 1.x vocabulary and what each name became; a name with no
 * counterpart reads `undefined`, which is the honest answer -- the value is no longer published,
 * and a test asserting on it is asserting on something the element does not do.
 */

import type { NodeId } from "../../src/catalog/types";
import type { RunResult } from "../../src/session/results";

/** Anything holding the result of the last run: every algorithm class does. */
export interface ResultCarrier {
    /** What the last run published. */
    readonly result?: RunResult | undefined;
}

/**
 * How one 1.x key is read out of a published result.
 *
 * THE HALF COMES FROM THE CALLER, not from the table. `isInPath` was one 1.x key on both halves
 * of a route -- the nodes it runs through and the edges between them -- so a table that fixed the
 * half would answer the node question to an edge caller and quietly report that no edge is on the
 * path. Whoever asked says which half they are asking about, because they already know.
 */
type Read = (result: RunResult, id: NodeId, half: "node" | "edge") => unknown;

/** Read one declared field of one element. */
function field(name: string): Read {
    return (result, id, half) => (half === "node" ? result.node(id) : result.edge(String(id)))?.[name];
}

/** Read one declared field and divide it by the highest value in its column, as `*Pct` did. */
function fraction(name: string): Read {
    return (result, id, half) => {
        const value = field(name)(result, id, half);

        if (typeof value !== "number") {
            return undefined;
        }

        const { max } = result.column(name);

        return max > 0 ? value / max : 0;
    };
}

/** Read a graph-level field, which is the same for every element. */
function graphField(name: string): Read {
    return (result) => result.graph[name];
}

/** Read the highest value in one column, which several 1.x "max<Thing>" graph keys were. */
function columnMax(name: string): Read {
    return (result) => result.column(name).max;
}

/** Read one of the caveats, which is where what qualifies the numbers lives now. */
function caveat(name: "converged" | "iterations"): Read {
    return (result) => result.summary().caveats[name];
}

/** Whether an element's declared field equals a value, which is what a 1.x boolean key was. */
function equals(name: string, wanted: unknown): Read {
    return (result, id, half) => field(name)(result, id, half) === wanted;
}

/**
 * The 1.x key vocabulary, by `"<type>.<key>"`, and how to read it now.
 *
 * Only the keys the tests actually ask for are here. A key that is absent from this table -- and
 * every key whose value the declared result does not carry -- reads `undefined`.
 */
const READS: Readonly<Record<string, Read>> = {
    // -- metrics: one measurement per node, published as `value` with a rank and a percentile ----
    "degree.degree": field("value"),
    "degree.degreePct": fraction("value"),
    "degree.inDegree": field("inDegree"),
    "degree.outDegree": field("outDegree"),
    "degree.inDegreePct": fraction("inDegree"),
    "degree.outDegreePct": fraction("outDegree"),
    "degree.maxDegree": graphField("max"),
    "degree.maxInDegree": columnMax("inDegree"),
    "degree.maxOutDegree": columnMax("outDegree"),
    "pagerank.rank": field("value"),
    "pagerank.rankPct": fraction("value"),
    "pagerank.maxRank": graphField("max"),
    "pagerank.iterations": caveat("iterations"),
    "pagerank.converged": caveat("converged"),
    "betweenness.score": field("value"),
    "betweenness.scorePct": fraction("value"),
    "closeness.score": field("value"),
    "closeness.scorePct": fraction("value"),
    "eigenvector.score": field("value"),
    "eigenvector.scorePct": fraction("value"),
    "katz.score": field("value"),
    "katz.scorePct": fraction("value"),
    "hits.hubScore": field("hub"),
    "hits.authorityScore": field("authority"),
    "hits.combinedScore": field("value"),
    "hits.hubScorePct": fraction("hub"),
    "hits.authorityScorePct": fraction("authority"),
    "hits.combinedScorePct": fraction("value"),

    // -- communities and components: a group per node -------------------------------------------
    "louvain.communityId": field("group"),
    "louvain.groupCount": graphField("groupCount"),
    "louvain.modularity": graphField("modularity"),
    "leiden.communityId": field("group"),
    "leiden.communityCount": graphField("groupCount"),
    "leiden.modularity": graphField("modularity"),
    "label-propagation.communityId": field("group"),
    "label-propagation.communityCount": graphField("groupCount"),
    "girvan-newman.communityId": field("group"),
    "girvan-newman.communityCount": graphField("groupCount"),
    "girvan-newman.modularity": graphField("modularity"),
    "connected-components.componentId": field("group"),
    "connected-components.componentCount": graphField("groupCount"),
    "scc.componentId": field("group"),
    "scc.componentCount": graphField("groupCount"),

    // -- traversals: a layer per node, plus the order it was reached in -------------------------
    "bfs.level": field("level"),
    "bfs.visitOrder": field("order"),
    "bfs.targetFound": graphField("targetFound"),
    "bfs.levelPct": fraction("level"),
    "dfs.discoveryTime": field("value"),
    "dfs.discoveryTimePct": fraction("value"),
    "dfs.visited": field("visited"),

    // -- routes: which elements are on the path -------------------------------------------------
    "dijkstra.distance": field("distance"),
    "dijkstra.isInPath": field("onPath"),
    "bellman-ford.distance": field("distance"),
    "bellman-ford.distancePct": fraction("distance"),
    "bellman-ford.isInPath": field("onPath"),
    "bellman-ford.hasNegativeCycle": graphField("hasNegativeCycle"),

    // -- chosen sets: which elements the algorithm picked ---------------------------------------
    "kruskal.inMST": field("in"),
    "kruskal.totalWeight": graphField("totalWeight"),
    "kruskal.edgeCount": graphField("count"),
    "prim.inMST": field("in"),
    "prim.totalWeight": graphField("totalWeight"),
    "prim.edgeCount": graphField("count"),
    "bipartite-matching.inMatching": field("in"),
    "bipartite-matching.isMatched": field("matched"),
    "bipartite-matching.partition": field("side"),
    "bipartite-matching.matchingSize": graphField("count"),
    "min-cut.inCut": field("in"),
    "min-cut.cutValue": graphField("cutValue"),
    "min-cut.cutWeight": graphField("cutValue"),
    "min-cut.isInPartition1": equals("side", "1"),
    "min-cut.isInPartition2": equals("side", "2"),

    // -- flow: how much goes along each edge ----------------------------------------------------
    "max-flow.flow": field("value"),
    "max-flow.capacity": field("capacity"),
    "max-flow.utilization": field("utilization"),
    "max-flow.netFlow": field("netFlow"),
    "max-flow.maxFlow": graphField("maxFlow"),

    // -- all pairs: how far each node is from the farthest one ----------------------------------
    "floyd-warshall.eccentricity": field("eccentricity"),
    "floyd-warshall.diameter": graphField("diameter"),
    "floyd-warshall.radius": graphField("radius"),
    "floyd-warshall.hasNegativeCycle": graphField("hasNegativeCycle"),
};

/**
 * Read one 1.x key of one element out of what the algorithm published.
 * @param algorithm - The algorithm that ran.
 * @param id - The element, a node id or an edge's `"src:dst"` key.
 * @param type - The algorithm's 1.x type, such as "pagerank".
 * @param key - The 1.x result key, such as "rankPct".
 * @returns The value, or undefined when the run published none.
 */
function read(
    algorithm: ResultCarrier,
    id: NodeId,
    type: string,
    key: string,
    half: "node" | "edge",
): unknown {
    const { result } = algorithm;
    const reader = READS[`${type}.${key}`];

    if (result === undefined || reader === undefined) {
        return undefined;
    }

    return reader(result, id, half);
}

/**
 * One node's value, addressed the 1.x way.
 * @param algorithm - The algorithm that ran.
 * @param nodeId - The node.
 * @param _namespace - The 1.x namespace, which every built-in shares.
 * @param type - The 1.x algorithm type.
 * @param key - The 1.x result key.
 * @returns The value, or undefined when the run published none.
 */
 
export function getNodeResult(
    algorithm: ResultCarrier,
    nodeId: string | number,
    _namespace: string,
    type: string,
    key: string,
     
): any {
    return read(algorithm, nodeId, type, key, "node");
}

/**
 * One edge's value, addressed the 1.x way.
 * @param algorithm - The algorithm that ran.
 * @param srcId - The source node.
 * @param dstId - The destination node.
 * @param _namespace - The 1.x namespace.
 * @param type - The 1.x algorithm type.
 * @param key - The 1.x result key.
 * @returns The value, or undefined when the run published none.
 */
export function getEdgeResult(
    algorithm: ResultCarrier,
    srcId: string | number,
    dstId: string | number,
    _namespace: string,
    type: string,
    key: string,
     
): any {
    return read(algorithm, `${String(srcId)}:${String(dstId)}`, type, key, "edge");
}

/**
 * One graph-level value, addressed the 1.x way.
 * @param algorithm - The algorithm that ran.
 * @param _namespace - The 1.x namespace.
 * @param type - The 1.x algorithm type.
 * @param key - The 1.x result key.
 * @returns The value, or undefined when the run published none.
 */
export function getGraphResult(
    algorithm: ResultCarrier,
    _namespace: string,
    type: string,
    key: string,
     
): any {
    return read(algorithm, "", type, key, "node");
}
