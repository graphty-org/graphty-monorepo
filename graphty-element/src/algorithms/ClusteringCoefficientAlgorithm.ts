import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import { type ScopeInputDeclaration, scopeNodeIds } from "./input/ScopedInput";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    forEachChunked,
    metricFieldSpecs,
} from "./results";

/**
 * The clustering coefficient: how many of a node's neighbours are also neighbours of each other.
 *
 * Counts the triangles every node lies in and publishes, per node, the local clustering
 * coefficient as `value` -- `2 T(v) / (d(v) (d(v) - 1))`, the share of the pairs of its `d(v)`
 * distinct neighbours that are joined by an edge -- with the triangle count `triangles` beside it.
 * A node with fewer than two neighbours has a coefficient of 0, a defined value rather than a
 * missing one. The graph-level `mean` of the values is the average clustering coefficient, and
 * two graph facts ride along: `transitivity`, the share of connected triples that close into a
 * triangle, and `triangleCount`, the triangles in the graph.
 *
 * The graph is read as simple and undirected: edge direction is ignored, parallel edges count
 * once, self-loops not at all, and weights are not read. Matches networkx's `triangles`,
 * `clustering`, `average_clustering` and `transitivity`.
 */
export class ClusteringCoefficientAlgorithm extends DeclaredAlgorithm {
    static namespace = "graphty";
    static type = "clustering-coefficient";
    /** Counts over the run's scope: the node list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

    /**
     * Count every node's triangles and publish its clustering coefficient.
     * @param context - What the element gave the run.
     * @returns The per-node coefficients and counts with the graph's transitivity, or null when
     *   there are no nodes to measure.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const nodeIds = scopeNodeIds(this.input("undirected"));
        if (nodeIds.length === 0) {
            return null;
        }

        const { snapshot, run } = this.accelerated("triangleCount", "undirected");
        const { ids } = snapshot;

        context.report({ phase: "Counting triangles", total: null });
        const { value, precision } = await run((dispatch, s) => dispatch.triangleCount(s));

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Reading coefficients", nodeIds, (nodeId) => {
            const index = ids.indexOf(nodeId);
            nodes.push({
                id: nodeId,
                values: { value: value.coefficient[index] ?? 0, triangles: value.perNode[index] ?? 0 },
            });
        });

        return {
            shape: "node-metric",
            fields: [
                ...metricFieldSpecs("node"),
                { name: "triangles", kind: "node", type: "integer" },
                { name: "transitivity", kind: "graph", type: "number" },
                { name: "triangleCount", kind: "graph", type: "integer" },
            ],
            nodes,
            graph: { transitivity: value.transitivity, triangleCount: value.total },
            caveats: declaredCaveats({
                method: "triangle-count",
                direction: "undirected",
                weight: null,
                precision,
                notes: [
                    "Each node's value is its local clustering coefficient: the share of the pairs of its neighbours that are joined by an edge. A node with fewer than two neighbours scores 0.",
                    "The graph is read as simple and undirected: direction is ignored, parallel edges count once and self-loops not at all.",
                ],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(ClusteringCoefficientAlgorithm);
