/**
 * @file A store-backed stand-in for the graph an algorithm runs on, whose data can change between
 * runs: the two data-manager members the input accessor reads, the acceleration controller a real
 * `Graph` builds, and scopes resolved as bitmaps over the current snapshot. Also the built-ins that
 * compute over their scope with the declaration taken off, to test the whole-graph route a plugin
 * that declares nothing takes.
 */

import { type GraphSnapshot, makeMask, maskCount, maskSet, type U32 } from "@graphty/graph-format";

import { AccelerationController, AcceleratorRegistry } from "../../../src/acceleration";
import { BFSAlgorithm } from "../../../src/algorithms/BFSAlgorithm";
import { ConnectedComponentsAlgorithm } from "../../../src/algorithms/ConnectedComponentsAlgorithm";
import { DegreeAlgorithm } from "../../../src/algorithms/DegreeAlgorithm";
import { DijkstraAlgorithm } from "../../../src/algorithms/DijkstraAlgorithm";
import type { ResolvedInputScope } from "../../../src/algorithms/input/ScopedInput";
import { KruskalAlgorithm } from "../../../src/algorithms/KruskalAlgorithm";
import { PageRankAlgorithm } from "../../../src/algorithms/PageRankAlgorithm";
import { GraphStore } from "../../../src/data/GraphStore";
import { ingestEdge, ingestNode } from "../../../src/data/ingest";
import type { Graph } from "../../../src/Graph";

/** One edge to add: source, target and an optional weight. */
export type EdgeSpec = readonly [string, string, number?];

/** A graph whose store a test can grow between runs. */
export class InputGraph {
    readonly store: GraphStore;
    readonly acceleration = new AccelerationController({ policy: "auto", minNodes: 0, registry: new AcceleratorRegistry() });
    readonly nodes = new Map<string, { id: string }>();
    readonly edges = new Map<string, { id: string; srcId: string; dstId: string; index: number; data?: Record<string, unknown> }>();

    /**
     * A graph over some records.
     * @param nodes - Node ids, in insertion order.
     * @param edges - Edges, in insertion order.
     * @param directed - The direction policy.
     */
    constructor(nodes: readonly string[], edges: readonly EdgeSpec[], directed: boolean | "auto" = "auto") {
        this.store = new GraphStore({
            directed,
            positionScale: () => 1,
            onNodeRemap: () => undefined,
            onEdgeRemap: () => undefined,
            onReplaced: () => undefined,
        });
        this.add(nodes, edges);
    }

    /**
     * Add records; the next snapshot read freezes them.
     * @param nodes - Node ids.
     * @param edges - Edges.
     */
    add(nodes: readonly string[], edges: readonly EdgeSpec[] = []): void {
        for (const id of nodes) {
            ingestNode(this.store, id, {});
            this.nodes.set(id, { id });
        }

        for (const [srcId, dstId, weight] of edges) {
            const { index } = ingestEdge(this.store, srcId, dstId, weight ?? 1);
            const id = String(this.edges.size);
            this.edges.set(id, { id, srcId, dstId, index });
        }
    }

    /**
     * The current snapshot.
     * @returns It.
     */
    snapshot(): GraphSnapshot {
        return this.store.getSnapshot();
    }

    /**
     * What an algorithm reads through `getDataManager()`.
     * @returns The members it reads.
     */
    getDataManager(): {
        nodes: Map<string, { id: string }>;
        edges: Map<string, { id: string; srcId: string; dstId: string; index: number; data?: Record<string, unknown> }>;
        getSnapshot: () => GraphSnapshot;
        undirected: GraphStore["undirected"];
        getEdge: (id: string) => { data?: Record<string, unknown> } | undefined;
    } {
        return {
            nodes: this.nodes,
            edges: this.edges,
            getEdge: (id) => this.edges.get(id),
            getSnapshot: () => this.store.getSnapshot(),
            undirected: (snapshot) => this.store.undirected(snapshot),
        };
    }

    /**
     * This object as the `Graph` an algorithm's constructor takes.
     * @returns It.
     */
    asGraph(): Graph {
        return this as unknown as Graph;
    }

    /**
     * A scope over the current snapshot: the named nodes, and of the edges between them those the
     * filter keeps (all of them, the induced reading, when there is no filter).
     * @param nodeIds - The nodes.
     * @param keepEdge - Which induced edges stay, by `[source, target]` id.
     * @returns The scope.
     */
    scope(nodeIds: readonly string[], keepEdge?: (source: string, target: string, index: number) => boolean): ResolvedInputScope {
        const graph = this.snapshot();
        const nodes = makeMask(graph.nodeCount);
        for (const id of nodeIds) {
            maskSet(nodes, graph.ids.indexOf(id), true);
        }

        const edges = makeMask(graph.edgeCount);
        const { src, dst } = graph.edgeList();
        for (let edge = 0; edge < graph.edgeCount; edge++) {
            const inside = (nodes[src[edge] >>> 5] & (1 << (src[edge] & 31))) !== 0 && (nodes[dst[edge] >>> 5] & (1 << (dst[edge] & 31))) !== 0;
            if (inside && (keepEdge?.(String(graph.ids.idOf(src[edge])), String(graph.ids.idOf(dst[edge])), edge) ?? true)) {
                maskSet(edges, edge, true);
            }
        }

        return { graph, resolution: resolutionOver(graph, nodes, edges, this.store) };
    }

    /**
     * The whole graph as a scope.
     * @returns The scope.
     */
    everything(): ResolvedInputScope {
        const graph = this.snapshot();

        return { graph, resolution: resolutionOver(graph, makeMask(graph.nodeCount, true), makeMask(graph.edgeCount, true), this.store) };
    }
}

/**
 * A resolution of two bitmaps.
 * @param graph - The snapshot they cover.
 * @param nodes - The node bitmap.
 * @param edges - The edge bitmap.
 * @param store - The store.
 * @returns The resolution.
 */
export function resolutionOver(graph: GraphSnapshot, nodes: U32, edges: U32, store: object | null): ResolvedInputScope["resolution"] {
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
        (_, edge) => `${String(snapshot.ids.idOf(src[edge]))}>${String(snapshot.ids.idOf(dst[edge]))}:${String(weights === null ? 1 : Math.round(weights[edge] * 1000) / 1000)}`,
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
