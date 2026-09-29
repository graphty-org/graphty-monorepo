/**
 * @file Bipartite Matching Algorithm wrapper
 *
 * This algorithm finds the maximum matching in a bipartite graph.
 * A matching is a set of edges without common vertices.
 * Maximum matching has the largest possible number of edges.
 */

import { isBipartite } from "@graphty/algorithms";
import { INVALID_INDEX, maskTest } from "@graphty/graph-format";

import type { EdgeId } from "../catalog/types";
import type { ResultElementValues } from "../session/results";
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

/**
 * Bipartite Matching algorithm for finding maximum matchings
 *
 * Finds the maximum matching in a bipartite graph where nodes can be divided
 * into two disjoint sets with edges only between sets.
 */
export class BipartiteMatchingAlgorithm extends DeclaredAlgorithm {
    static namespace = "graphty";
    static type = "bipartite-matching";
    /** Pairs within the run's scope: the edge list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

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
        // The declared edges of the run's input: its scope's, or every edge of the graph.
        // Undirected: a matching is a set of unordered pairs.
        const input = this.input("undirected");
        const graphEdges = scopeEdges(input);

        if (graphEdges.length === 0) {
            return null;
        }

        const { snapshot, edgeRemap, run } = this.accelerated("maximumBipartiteMatching", "undirected");

        const fields: ResultFieldSpec[] = [
            ...setFieldSpecs("edge", { name: "bipartite", type: "boolean" }),
            { name: "side", kind: "node", type: "string" },
            { name: "matched", kind: "node", type: "boolean" },
        ];

        context.report({ phase: "Checking for two sides", total: null });
        const { sides } = isBipartite(snapshot);

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
        // The left side is the one `isBipartite` leaves clear, as the matching infers it.
        const { value: matching, precision } = await run((dispatch, s) => dispatch.maximumBipartiteMatching(s));
        const partnered = new Uint8Array(snapshot.nodeCount);
        for (let left = 0; left < snapshot.nodeCount; left++) {
            if (matching.matching[left] !== INVALID_INDEX) {
                partnered[left] = 1;
                partnered[matching.matching[left]] = 1;
            }
        }

        const edges: ResultElementValues<EdgeId>[] = [];
        const { src, dst } = snapshot.edgeList();
        await forEachChunked(context, "Marking the pairing", graphEdges, (edge) => {
            // Every declared edge maps onto the input edge it was merged into, so a reciprocal pair
            // and a parallel group are in the pairing together.
            const merged = edgeRemap === null ? edge.row : edgeRemap[edge.row];
            const paired =
                merged !== INVALID_INDEX &&
                (matching.matching[src[merged]] === dst[merged] || matching.matching[dst[merged]] === src[merged]);

            edges.push({ id: edge.id, values: { in: paired } });
        });

        // A right-hand node is matched when it is somebody's partner, which is what makes the
        // two halves of the pairing readable the same way.
        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Marking sides", scopeNodeIds(input), (nodeId) => {
            const row = snapshot.ids.indexOf(nodeId);

            nodes.push({
                id: nodeId,
                values: { side: maskTest(sides, row) ? "right" : "left", matched: partnered[row] === 1 },
            });
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
                precision,
                notes: [`${String(matching.size)} of the two sides' nodes found a partner.`],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(BipartiteMatchingAlgorithm);
