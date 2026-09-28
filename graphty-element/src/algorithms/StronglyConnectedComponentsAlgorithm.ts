import { indexed } from "@graphty/algorithms";
import { INVALID_INDEX } from "@graphty/graph-format";

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
import { declarationArcOrder } from "./utils/graphUtils";

/**
 * Strongly connected components: the pieces a directed path can cross both ways.
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

        /* The declared orientation: strong connectivity is a directed notion. On an undirected graph
           every edge can be crossed both ways, so the strong pieces ARE the connected ones, and
           that is the question asked of it.

           Components are numbered in the order Tarjan's walk completes them, trying each node's
           neighbours in the order their edges were declared -- the numbering the element has
           always published, which is what a palette keyed on the group reads. No accelerator
           computes strong components, so this is the CPU port's decision. */
        const { snapshot, run } = this.accelerated("stronglyConnectedComponents", "directed");

        context.report({ phase: "Finding pieces", total: null });
        const { value, precision } = await run((_dispatch, s) =>
            Promise.resolve(
                s.directed
                    ? indexed.stronglyConnectedComponents(s, { arcOrder: declarationArcOrder(s) })
                    : indexed.connectedComponents(s),
            ),
        );

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Grouping nodes", nodeIds, (nodeId) => {
            const index = snapshot.ids.indexOf(nodeId);
            nodes.push({ id: nodeId, values: { group: index === INVALID_INDEX ? 0 : value.labels[index] } });
        });

        return {
            shape: "community",
            fields: communityFieldSpecs(false),
            nodes,
            caveats: declaredCaveats({
                method: "strongly-connected-components",
                direction: snapshot.directed ? "directed" : "undirected",
                weight: null,
                precision,
                notes: [
                    "Strength: strong. Two nodes share a piece only when a directed path runs each way.",
                    ...(snapshot.directed
                        ? []
                        : [
                              "The graph is undirected: every edge runs both ways, so the pieces are its connected ones.",
                          ]),
                ],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(StronglyConnectedComponentsAlgorithm);
