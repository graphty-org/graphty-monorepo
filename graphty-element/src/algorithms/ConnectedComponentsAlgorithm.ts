import { connectedComponents } from "@graphty/algorithms";

import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    communityFieldSpecs,
    DeclaredAlgorithm,
    declaredCaveats,
    forEachChunked,
} from "./results";

/**
 *
 */
export class ConnectedComponentsAlgorithm extends DeclaredAlgorithm {
    static namespace = "graphty";
    static type = "connected-components";

    /**
     * Find the separate pieces of the graph.
     *
     * A piece is a group in the community shape's sense -- two nodes are in the same one when a
     * path joins them -- so this publishes the same `group` per node that every grouping method
     * does, and no modularity, which is not defined for a partition nothing optimised.
     * @param context - What the element gave the run.
     * @returns The community result, or null when there are no nodes to group.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const nodeIds = Array.from(this.graph.getDataManager().nodes.keys());

        if (nodeIds.length === 0) {
            return null;
        }

        // Undirected: a component is reached across an edge whichever way the record declared it.
        const graphData = this.algorithmGraph("undirected");

        context.report({ phase: "Finding pieces", total: null });
        const components = connectedComponents(graphData);

        const groupOf = new Map<number | string, number>();
        for (let index = 0; index < components.length; index++) {
            for (const nodeId of components[index]) {
                groupOf.set(nodeId, index);
            }
        }

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Grouping nodes", nodeIds, (nodeId) => {
            nodes.push({ id: nodeId, values: { group: groupOf.get(nodeId) ?? 0 } });
        });

        return {
            shape: "community",
            fields: communityFieldSpecs(false),
            nodes,
            caveats: declaredCaveats({
                method: "connected-components",
                direction: "undirected",
                weight: null,
                notes: ["Strength: weak. An edge joins its two nodes whichever way it was declared."],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(ConnectedComponentsAlgorithm);
