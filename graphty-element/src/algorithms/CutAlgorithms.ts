/**
 * @file Articulation points and bridges: the nodes and the edges whose removal would split the
 * piece of the graph they are in. Each publishes a set; only its own members carry `in: true`, so
 * the shape's suggested mark paints them and nothing else. Beside the set's count each publishes
 * `share`: the fraction of the scope's nodes (or edges) that are cut points (or bridges).
 */

import { articulationPoints, bridges } from "@graphty/algorithms";
import { type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

import type { EdgeId, NodeId } from "../catalog/types";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import { scopeEdges, type ScopeInputDeclaration, scopeNodeIds } from "./input/ScopedInput";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    caveat,
    DeclaredAlgorithm,
    declaredCaveats,
    forEachChunked,
    setFieldSpecs,
} from "./results";

/** What both cut algorithms share: the undirected input, kept with its parallel edges apart. */
abstract class CutAlgorithm extends DeclaredAlgorithm {
    static readonly namespace: string = "graphty";
    /** Works over the run's scope: the node and edge lists and the graph all come from the input. */
    static readonly scopeInput: ScopeInputDeclaration = "subgraph";
    /** Parallel edges stay apart: two edges between the same nodes back each other up. */
    static readonly parallelEdges = "none" as const;

    /** Whether the set is of nodes or of edges. */
    protected abstract readonly kind: "node" | "edge";

    /**
     * The members of the set, as indices into the snapshot.
     * @param snapshot - The undirected input.
     * @returns Node indices for a node set, edge indices for an edge set.
     */
    protected abstract find(snapshot: GraphSnapshot): U32;

    /**
     * Find the set and mark its members.
     * @param context - What the element gave the run.
     * @returns The set, or null when there is nothing to look at.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const { kind } = this;
        const input = this.input("undirected");
        const nodeIds: readonly NodeId[] = kind === "node" ? scopeNodeIds(input) : [];
        const graphEdges = kind === "edge" ? scopeEdges(input) : [];
        if (nodeIds.length + graphEdges.length === 0) {
            return null;
        }

        // The undirected view merges a reciprocal pair into one edge; the remap flags both halves.
        const { snapshot, edgeRemap } = input.derived();
        context.report({ phase: "finding-cuts", total: null });
        const flagged = new Uint8Array(kind === "node" ? snapshot.nodeCount : snapshot.edgeCount);
        for (const index of this.find(snapshot)) {
            flagged[index] = 1;
        }
        let members = 0;
        context.signal.throwIfAborted();

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "marking-cuts", nodeIds, (nodeId) => {
            const isIn = flagged[snapshot.ids.indexOf(nodeId)] === 1;
            members += isIn ? 1 : 0;
            nodes.push({ id: nodeId, values: { in: isIn } });
        });
        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "marking-cuts", graphEdges, (edge) => {
            const merged = edgeRemap === null ? edge.row : (edgeRemap[edge.row] ?? INVALID_INDEX);
            const isIn = merged !== INVALID_INDEX && flagged[merged] === 1;
            members += isIn ? 1 : 0;
            edges.push({ id: edge.id, values: { in: isIn } });
        });

        return {
            shape: kind === "node" ? "node-set" : "edge-set",
            fields: setFieldSpecs(kind, { name: "share", type: "number" }),
            ...(kind === "node" ? { nodes } : { edges }),
            graph: { share: members / (nodeIds.length + graphEdges.length) },
            caveats: declaredCaveats({
                method: (this.constructor as typeof CutAlgorithm & { type: string }).type,
                direction: "undirected",
                weight: null,
                facts: [caveat("components.weak")],
            }),
        };
    }
}

/** Articulation points: the nodes whose removal would split the piece of the graph they are in. */
export class ArticulationPointsAlgorithm extends CutAlgorithm {
    static readonly type: string = "articulation-points";
    protected readonly kind = "node";

    /**
     * Find the articulation points.
     * @param snapshot - The undirected input.
     * @returns The articulation points.
     */
    protected find(snapshot: GraphSnapshot): U32 {
        return articulationPoints(snapshot).nodes;
    }
}

/** Bridges: the edges whose removal would split the piece of the graph they are in. */
export class BridgesAlgorithm extends CutAlgorithm {
    static readonly type: string = "bridges";
    protected readonly kind = "edge";

    /**
     * Find the bridges.
     * @param snapshot - The undirected input.
     * @returns The bridges.
     */
    protected find(snapshot: GraphSnapshot): U32 {
        return bridges(snapshot).edges;
    }
}

// Auto-register these algorithms when the module is imported
Algorithm.register(ArticulationPointsAlgorithm);
Algorithm.register(BridgesAlgorithm);
