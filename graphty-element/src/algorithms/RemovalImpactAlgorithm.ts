import { INVALID_INDEX } from "@graphty/graph-format";
import { z } from "zod";

import type { EdgeId, NodeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema, parseOptions } from "../config";
import { GraphtyError } from "../errors";
import type { ResultElementValues } from "../session/results";
import { caveat } from "../session/runs/caveatFacts";
import { Algorithm } from "./Algorithm";
import { scopeEdges, type ScopeInputDeclaration, scopeNodeIds } from "./input/ScopedInput";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    forEachChunked,
    type ResultFieldSpec,
    setFieldSpecs,
} from "./results";

const removalImpactOptionsSchema = defineOptions({
    nodes: {
        schema: z.array(z.union([z.string(), z.number()])).default([]),
        meta: { label: "Nodes to remove", description: "The nodes to imagine removed, with their edges" },
    },
    edges: {
        schema: z.array(z.string()).default([]),
        meta: { label: "Edges to remove", description: "The edges to imagine removed" },
    },
});

/** Options for removal impact. */
interface RemovalImpactOptions extends Record<string, unknown> {
    /** The nodes to imagine removed. */
    nodes: NodeId[];
    /** The edges to imagine removed. */
    edges: EdgeId[];
}

/** The graph-level facts a removal-impact run publishes beside the set's own count. */
const IMPACT_FIELDS: readonly ResultFieldSpec[] = [
    { name: "componentsBefore", kind: "graph", type: "integer" },
    { name: "largestBefore", kind: "graph", type: "integer" },
    { name: "largestAfter", kind: "graph", type: "integer" },
    { name: "removedNodes", kind: "graph", type: "integer" },
    { name: "removedEdges", kind: "graph", type: "integer" },
    { name: "cutOffShare", kind: "graph", type: "number" },
];

/**
 * Union-find over node rows.
 * @param size - How many rows.
 * @returns `pieceOf` and `union`.
 */
function unionFind(size: number): { pieceOf: (row: number) => number; union: (a: number, b: number) => void } {
    const parent = Int32Array.from({ length: size }, (_, i) => i);
    const pieceOf = (row: number): number => {
        let r = row;
        while (parent[r] !== r) {
            parent[r] = parent[parent[r]];
            r = parent[r];
        }
        return r;
    };
    return {
        pieceOf,
        union: (a, b) => {
            parent[pieceOf(a)] = pieceOf(b);
        },
    };
}

/**
 * Count the members of each piece.
 * @param rows - The rows to count.
 * @param pieceOf - The piece of a row.
 * @returns Members per piece root.
 */
function pieceSizes(rows: readonly number[], pieceOf: (row: number) => number): Map<number, number> {
    const sizes = new Map<number, number>();
    for (const row of rows) {
        const root = pieceOf(row);
        sizes.set(root, (sizes.get(root) ?? 0) + 1);
    }
    return sizes;
}

/**
 * Removal impact: what removing some nodes or edges would cut off, worked out on the side so the
 * graph itself is never changed.
 *
 * Publishes a node set: the nodes left cut off from the rest of the piece they were in (every
 * survivor of a piece except those in the largest part it breaks into), plus the pieces and the
 * largest piece before and after, and the share of the surviving nodes that are cut off. Pieces
 * are weak: an edge joins its nodes whichever way it was declared.
 */
export class RemovalImpactAlgorithm extends DeclaredAlgorithm<RemovalImpactOptions> {
    static readonly namespace = "graphty";
    static readonly type = "removal-impact";
    /** Works over the run's scope: the node list and the edges both come from the input. */
    static readonly scopeInput: ScopeInputDeclaration = "subgraph";

    static readonly zodOptionsSchema: ZodOptionsSchema = removalImpactOptionsSchema;

    /**
     * Read the options from the Zod schema: the legacy schema has no list type.
     * @param options - What the caller gave.
     * @returns The options with their defaults.
     */
    protected override resolveOptions(options?: Partial<RemovalImpactOptions>): RemovalImpactOptions {
        return parseOptions(removalImpactOptionsSchema, options ?? {});
    }

    /**
     * Work out what the removal would cut off.
     * @param context - What the element gave the run.
     * @returns The node-set result, or null when there are no nodes.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const input = this.input("undirected");
        const nodeIds = scopeNodeIds(input);
        if (nodeIds.length === 0) {
            return null;
        }

        const { graph } = input;
        const edges = scopeEdges(input);
        const removedRows = new Set(this.schemaOptions.nodes.map((id) => this.nodeIndex(graph, "nodes", id)));
        const known = new Set(edges.map((edge) => edge.id));
        for (const id of this.schemaOptions.edges) {
            if (!known.has(id)) {
                throw new GraphtyError({
                    code: "E_OPTION_RANGE",
                    message: `the graph has no edge "${id}", so "edges" names nothing to remove`,
                    source: "run",
                    details: { option: "edges", value: id },
                });
            }
        }
        const removedEdgeIds = new Set(this.schemaOptions.edges);

        context.report({ phase: "finding-pieces", total: null });
        const rows = nodeIds.map((id) => graph.ids.indexOf(id)).filter((row) => row !== INVALID_INDEX);
        const before = unionFind(graph.nodeCount);
        const after = unionFind(graph.nodeCount);
        let removedEdges = 0;
        for (const edge of edges) {
            const s = graph.ids.indexOf(edge.source);
            const t = graph.ids.indexOf(edge.target);
            before.union(s, t);
            if (removedEdgeIds.has(edge.id) || removedRows.has(s) || removedRows.has(t)) {
                removedEdges++;
            } else {
                after.union(s, t);
            }
        }
        context.signal.throwIfAborted();

        const survivors = rows.filter((row) => !removedRows.has(row));
        const sizesBefore = pieceSizes(rows, before.pieceOf);
        const sizesAfter = pieceSizes(survivors, after.pieceOf);

        // The part of each old piece that stays whole: its largest surviving part, the first in row
        // order on a tie. Every other survivor of that piece is cut off.
        const kept = new Map<number, number>();
        for (const row of survivors) {
            const old = before.pieceOf(row);
            const part = after.pieceOf(row);
            const best = kept.get(old);
            if (best === undefined || (sizesAfter.get(part) ?? 0) > (sizesAfter.get(best) ?? 0)) {
                kept.set(old, part);
            }
        }

        const removedIds = new Set(rows.filter((row) => removedRows.has(row)).map((row) => graph.ids.idOf(row)));
        let cutOff = 0;
        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "marking-cut-off", nodeIds, (nodeId) => {
            const row = graph.ids.indexOf(nodeId);
            const off = !removedIds.has(nodeId) && kept.get(before.pieceOf(row)) !== after.pieceOf(row);
            cutOff += off ? 1 : 0;
            nodes.push({ id: nodeId, values: { in: off } });
        });

        return {
            shape: "node-set",
            fields: [...setFieldSpecs("node", { name: "componentsAfter", type: "integer" }), ...IMPACT_FIELDS],
            nodes,
            graph: {
                componentsBefore: sizesBefore.size,
                componentsAfter: sizesAfter.size,
                largestBefore: Math.max(0, ...sizesBefore.values()),
                largestAfter: Math.max(0, ...sizesAfter.values()),
                removedNodes: removedIds.size,
                removedEdges,
                cutOffShare: survivors.length === 0 ? 0 : cutOff / survivors.length,
            },
            caveats: declaredCaveats({
                method: "removal-impact",
                direction: "undirected",
                weight: null,
                facts: [caveat("components.weak")],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(RemovalImpactAlgorithm);
