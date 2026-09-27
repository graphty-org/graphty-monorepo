import { stronglyConnectedComponents } from "@graphty/algorithms";

import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import { type ScopeInputDeclaration, scopeNodeIds } from "./input/ScopedInput";
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
export class StronglyConnectedComponentsAlgorithm extends DeclaredAlgorithm {
    static namespace = "graphty";
    static type = "scc";
    /** Groups over the run's scope: the node list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

    /**
     * Find the pieces of the graph that a directed path can cross both ways.
     *
     * The same community shape as the weak reading, run at the other strength: two nodes share a
     * group only when a directed path runs each way between them. The caveats say which strength
     * ran, because on a directed graph the two answers differ and the numbers do not say so.
     * @param context - What the element gave the run.
     * @returns The community result, or null when there are no nodes to group.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        // The nodes of the run's input: its scope's, so a member with no edge in the scope stands alone.
        const nodeIds = scopeNodeIds(this.input("declared"));

        if (nodeIds.length === 0) {
            return null;
        }

        // Directed: strong connectivity is a directed notion and has no undirected meaning.
        const graphData = this.algorithmGraph("directed");

        context.report({ phase: "Finding pieces", total: null });
        const components = stronglyConnectedComponents(graphData);

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
                method: "strongly-connected-components",
                direction: "directed",
                weight: null,
                notes: ["Strength: strong. Two nodes share a piece only when a directed path runs each way."],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(StronglyConnectedComponentsAlgorithm);
