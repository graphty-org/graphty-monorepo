/**
 * @file Bipartite Matching Algorithm wrapper
 *
 * This algorithm finds the maximum matching in a bipartite graph.
 * A matching is a set of edges without common vertices.
 * Maximum matching has the largest possible number of edges.
 */

import { bipartitePartition, maximumBipartiteMatching } from "@graphty/algorithms";

import type { EdgeId } from "../catalog/types";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    forEachChunked,
    type ResultFieldSpec,
    setFieldSpecs,
} from "./results";
import { edgePairKey } from "./utils/graphUtils";

/**
 * Bipartite Matching algorithm for finding maximum matchings
 *
 * Finds the maximum matching in a bipartite graph where nodes can be divided
 * into two disjoint sets with edges only between sets.
 */
export class BipartiteMatchingAlgorithm extends DeclaredAlgorithm {
    static namespace = "graphty";
    static type = "bipartite-matching";

    /**
     * Pair up the two sides of a two-sided graph so that as many nodes as possible get a partner.
     *
     * A matching is a set of edges, so the result is shaped as one: every edge says whether it is
     * in the pairing and the element counts how many are. The one number the answer is read for
     * is whether the graph has two sides at all -- a graph that does not cannot be paired up, and
     * the run says so rather than returning an empty pairing that looks like a bad result.
     * @param context - What the element gave the run.
     * @returns The edge set, or null when there are no edges to pair.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const graphEdges = Array.from(this.graph.getDataManager().edges.values());

        if (graphEdges.length === 0) {
            return null;
        }

        // Undirected: a matching is a set of unordered pairs.
        const graphData = this.algorithmGraph("undirected");

        const fields: ResultFieldSpec[] = [
            ...setFieldSpecs("edge", { name: "bipartite", type: "boolean" }),
            { name: "side", kind: "node", type: "string" },
            { name: "matched", kind: "node", type: "boolean" },
        ];

        context.report({ phase: "Checking for two sides", total: null });
        const sides = bipartitePartition(graphData);

        if (sides === null) {
            const unpaired: ResultElementValues<EdgeId>[] = [];
            await forEachChunked(context, "Marking the pairing", graphEdges, (edge) => {
                unpaired.push({ id: edge.id, values: { in: false } });
            });

            return {
                shape: "edge-set",
                fields,
                edges: unpaired,
                graph: { bipartite: false },
                caveats: declaredCaveats({
                    method: "bipartite-matching",
                    direction: "undirected",
                    weight: null,
                    notes: ["The graph does not have two sides, so nothing could be paired up."],
                }),
            };
        }

        context.report({ phase: "Pairing nodes", total: null });
        const matching = maximumBipartiteMatching(graphData, {
            leftNodes: sides.left,
            rightNodes: sides.right,
        });

        const paired = new Set<string>();
        for (const [left, right] of matching.matching) {
            paired.add(edgePairKey(left, right));
            paired.add(edgePairKey(right, left));
        }

        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "Marking the pairing", graphEdges, (edge) => {
            // The pair key looks the matching up; the element's own id is what is published.
            edges.push({ id: edge.id, values: { in: paired.has(edgePairKey(edge.srcId, edge.dstId)) } });
        });

        // A right-hand node is matched when it is somebody's partner, which is what makes the
        // two halves of the pairing readable the same way.
        const partners = new Set(matching.matching.values());
        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Marking sides", Array.from(sides.left), (nodeId) => {
            nodes.push({ id: nodeId, values: { side: "left", matched: matching.matching.has(nodeId) } });
        });
        await forEachChunked(context, "Marking sides", Array.from(sides.right), (nodeId) => {
            nodes.push({ id: nodeId, values: { side: "right", matched: partners.has(nodeId) } });
        });

        return {
            shape: "edge-set",
            fields,
            nodes,
            edges,
            graph: { bipartite: true },
            caveats: declaredCaveats({
                method: "bipartite-matching",
                direction: "undirected",
                weight: null,
                notes: [`${String(matching.size)} of the two sides' nodes found a partner.`],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(BipartiteMatchingAlgorithm);
