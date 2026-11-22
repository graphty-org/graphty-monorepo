/**
 * @file A real headless session holding a graph an algorithm runs on, whose data a test can grow
 * between runs through `session.data.addNodes` and `addEdges`, with scopes resolved as bitmaps
 * over the current snapshot. Also the built-ins that compute over their scope with the declaration
 * taken off, to test the whole-graph route a plugin that declares nothing takes.
 */

import { type GraphSnapshot, makeMask, maskCount, maskSet, type U32 } from "@graphty/graph-format";

import { BFSAlgorithm } from "../../../src/algorithms/BFSAlgorithm";
import { ConnectedComponentsAlgorithm } from "../../../src/algorithms/ConnectedComponentsAlgorithm";
import { DegreeAlgorithm } from "../../../src/algorithms/DegreeAlgorithm";
import { DijkstraAlgorithm } from "../../../src/algorithms/DijkstraAlgorithm";
import type { ResolvedInputScope } from "../../../src/algorithms/input/ScopedInput";
import { KruskalAlgorithm } from "../../../src/algorithms/KruskalAlgorithm";
import { PageRankAlgorithm } from "../../../src/algorithms/PageRankAlgorithm";
import { storeOfSession } from "../../../src/session/dispatchers";
import { createSessionGraph, type SessionGraph } from "../../helpers/session-graph";

/** One edge to add: source, target and an optional weight (1 when absent). */
export type EdgeSpec = readonly [string, string, number?];

/** A session holding a graph, which a test can grow between runs. */
export type InputGraph = SessionGraph & {
    /** The session's store, the identity a scope's resolution and the shared inputs are keyed by. */
    readonly store: object;
    /** The session's current snapshot. */
    snapshot(): GraphSnapshot;
    /**
     * Add records through the session; the next snapshot read freezes them. The `nodes` and
     * `edges` records stay those the graph was built with.
     */
    add(nodes: readonly string[], edges?: readonly EdgeSpec[]): Promise<void>;
    /**
     * A scope over the current snapshot: the named nodes, and of the edges between them those the
     * filter keeps (all of them, the induced reading, when there is no filter).
     */
    scope(
        nodeIds: readonly string[],
        keepEdge?: (source: string, target: string, index: number) => boolean,
    ): ResolvedInputScope;
    /** The whole graph as a scope. */
    everything(): ResolvedInputScope;
};

/**
 * An edge as the session loads it: with no weight column the store reads the legacy "value" key.
 * @param edge - The edge.
 * @returns The record.
 */
function edgeRecord(edge: EdgeSpec): { srcId: string; dstId: string; value: number } {
    const [srcId, dstId, weight] = edge;

    return { srcId, dstId, value: weight ?? 1 };
}

/**
 * A real headless session holding some records.
 * @param nodes - Node ids, in insertion order.
 * @param edges - Edges, in insertion order.
 * @param directed - The direction policy; `"auto"` leaves the graph directed.
 * @returns The graph.
 */
export async function inputGraph(
    nodes: readonly string[],
    edges: readonly EdgeSpec[],
    directed: boolean | "auto" = "auto",
): Promise<InputGraph> {
    const graph = await createSessionGraph({
        nodes: nodes.map((id) => ({ id })),
        edges: edges.map(edgeRecord),
        directed: directed === "auto" ? undefined : directed,
    });
    const store = storeOfSession(graph.session);
    // The test's own reads, held apart from the data manager an algorithm is handed.
    const data = graph.getDataManager();
    const snapshot = (): GraphSnapshot => data.getSnapshot();

    return Object.assign(graph, {
        store,
        snapshot,
        add: async (more: readonly string[], moreEdges: readonly EdgeSpec[] = []): Promise<void> => {
            await graph.session.data.addNodes(more.map((id) => ({ id })));
            await graph.session.data.addEdges(moreEdges.map(edgeRecord));
        },
        scope: (nodeIds: readonly string[], keepEdge?: (source: string, target: string, index: number) => boolean) =>
            scopeOver(snapshot(), store, nodeIds, keepEdge),
        everything: (): ResolvedInputScope => {
            const current = snapshot();

            return {
                graph: current,
                resolution: resolutionOver(
                    current,
                    makeMask(current.nodeCount, true),
                    makeMask(current.edgeCount, true),
                    store,
                ),
            };
        },
    });
}

/**
 * A scope over a snapshot: the named nodes, and of the edges between them those the filter keeps
 * (all of them, the induced reading, when there is no filter).
 * @param graph - The snapshot.
 * @param store - The store it came from.
 * @param nodeIds - The nodes.
 * @param keepEdge - Which induced edges stay, by `[source, target]` id and row.
 * @returns The scope.
 */
export function scopeOver(
    graph: GraphSnapshot,
    store: object | null,
    nodeIds: readonly string[],
    keepEdge?: (source: string, target: string, index: number) => boolean,
): ResolvedInputScope {
    const nodes = makeMask(graph.nodeCount);
    for (const id of nodeIds) {
        maskSet(nodes, graph.ids.indexOf(id), true);
    }

    const edges = makeMask(graph.edgeCount);
    const { src, dst } = graph.edgeList();
    for (let edge = 0; edge < graph.edgeCount; edge++) {
        const inside =
            (nodes[src[edge] >>> 5] & (1 << (src[edge] & 31))) !== 0 &&
            (nodes[dst[edge] >>> 5] & (1 << (dst[edge] & 31))) !== 0;
        if (
            inside &&
            (keepEdge?.(String(graph.ids.idOf(src[edge])), String(graph.ids.idOf(dst[edge])), edge) ?? true)
        ) {
            maskSet(edges, edge, true);
        }
    }

    return { graph, resolution: resolutionOver(graph, nodes, edges, store) };
}

/**
 * A resolution of two bitmaps.
 * @param graph - The snapshot they cover.
 * @param nodes - The node bitmap.
 * @param edges - The edge bitmap.
 * @param store - The store.
 * @returns The resolution.
 */
export function resolutionOver(
    graph: GraphSnapshot,
    nodes: U32,
    edges: U32,
    store: object | null,
): ResolvedInputScope["resolution"] {
    return Object.freeze({
        nodes,
        edges,
        nodeCount: maskCount(nodes, graph.nodeCount),
        edgeCount: maskCount(edges, graph.edgeCount),
        serial: graph.serial,
        store,
        missingNodes: 0,
        missingEdges: 0,
        ambiguousEdges: 0,
    });
}

/**
 * The node ids of a snapshot, in row order.
 * @param snapshot - It.
 * @returns The ids.
 */
export function idsOf(snapshot: GraphSnapshot): string[] {
    return Array.from({ length: snapshot.nodeCount }, (_, index) => String(snapshot.ids.idOf(index)));
}

/**
 * The edges of a snapshot as `source>target:weight` strings, in row order.
 * @param snapshot - It.
 * @returns The edges.
 */
export function edgesOf(snapshot: GraphSnapshot): string[] {
    const { src, dst, weights } = snapshot.edgeList();

    return Array.from(
        { length: snapshot.edgeCount },
        (_, edge) =>
            `${String(snapshot.ids.idOf(src[edge]))}>${String(snapshot.ids.idOf(dst[edge]))}:${String(weights === null ? 1 : Math.round(weights[edge] * 1000) / 1000)}`,
    );
}

// Each built-in with its declaration taken off, as a plugin that declares nothing runs.
/** PageRankAlgorithm, computing on the whole graph. */
export class WholePageRank extends PageRankAlgorithm {
    static scopeInput = "none" as const;
}

/** DegreeAlgorithm, computing on the whole graph. */
export class WholeDegree extends DegreeAlgorithm {
    static scopeInput = "none" as const;
}

/** ConnectedComponentsAlgorithm, computing on the whole graph. */
export class WholeComponents extends ConnectedComponentsAlgorithm {
    static scopeInput = "none" as const;
}

/** DijkstraAlgorithm, computing on the whole graph. */
export class WholeDijkstra extends DijkstraAlgorithm {
    static scopeInput = "none" as const;
}

/** BFSAlgorithm, computing on the whole graph. */
export class WholeBFS extends BFSAlgorithm {
    static scopeInput = "none" as const;
}

/** KruskalAlgorithm, computing on the whole graph. */
export class WholeKruskal extends KruskalAlgorithm {
    static scopeInput = "none" as const;
}
