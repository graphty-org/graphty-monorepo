import { hierarchicalClustering } from "@graphty/algorithms";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import type { ResultElementValues } from "../session/results";
import { caveat } from "../session/runs/caveatFacts";
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
import type { OptionsSchema } from "./types/OptionSchema";

const CLUSTERS_DESCRIPTION = "How many clusters to stop merging at";
const LINKAGE_DESCRIPTION =
    "How far apart two clusters are: their closest members (single), their furthest (complete), the mean (average) or Ward's scaled mean";

const LINKAGES = ["single", "complete", "average", "ward"] as const;

const hierarchicalClusteringOptionsSchema = defineOptions({
    clusters: {
        schema: z.number().int().min(1).max(1000).default(2),
        meta: { label: "Clusters", description: CLUSTERS_DESCRIPTION },
    },
    linkage: {
        schema: z.enum(LINKAGES).default("single"),
        meta: { label: "Linkage", description: LINKAGE_DESCRIPTION, advanced: true },
    },
});

/** Options for hierarchical clustering. */
interface HierarchicalClusteringOptions extends Record<string, unknown> {
    /** Number of clusters to stop at. */
    clusters: number;
    /** How the distance between two clusters is measured. */
    linkage: (typeof LINKAGES)[number];
}

/**
 * Agglomerative hierarchical clustering: every node starts alone and the two closest clusters are
 * merged, by hop distance, until `clusters` remain.
 *
 * Publishes a group per node: the flat partition cut from the merge tree. Two parts of the graph
 * no path joins are never merged, so a graph in more pieces than `clusters` keeps one cluster per
 * piece, and the caveats say so.
 */
export class HierarchicalClusteringAlgorithm extends DeclaredAlgorithm<HierarchicalClusteringOptions> {
    static readonly namespace = "graphty";
    static readonly type = "hierarchical-clustering";
    /** Groups over the run's scope: the node list and the graph both come from the input. */
    static readonly scopeInput: ScopeInputDeclaration = "subgraph";

    static readonly zodOptionsSchema: ZodOptionsSchema = hierarchicalClusteringOptionsSchema;

    static readonly optionsSchema: OptionsSchema = {
        clusters: {
            type: "integer",
            default: 2,
            label: "Clusters",
            description: CLUSTERS_DESCRIPTION,
            min: 1,
            max: 1000,
        },
        linkage: {
            type: "select",
            default: "single",
            label: "Linkage",
            description: LINKAGE_DESCRIPTION,
            options: LINKAGES.map((value) => ({ value, label: value })),
            advanced: true,
        },
    };

    /**
     * Merge the closest clusters until the asked-for number remain.
     * @param context - What the element gave the run.
     * @returns The community result, or null when there are no nodes to group.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const input = this.input("undirected");
        const nodeIds = scopeNodeIds(input);

        if (nodeIds.length === 0) {
            return null;
        }

        // Undirected: a hop counts whichever way the edge was declared. No accelerator implements it.
        const { snapshot } = input.derived();
        const { clusters, linkage } = this.schemaOptions;

        context.report({ phase: "Merging clusters", total: null });
        const tree = hierarchicalClustering(snapshot, { linkage });
        context.signal.throwIfAborted();

        // The merge tree cannot be cut into fewer clusters than it has unlinked parts, nor more than nodes.
        const cut = Math.min(Math.max(clusters, tree.roots.length), snapshot.nodeCount);
        const value = tree.cutAt({ clusters: cut });

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Grouping nodes", nodeIds, (nodeId) => {
            nodes.push({ id: nodeId, values: { group: value.labels[snapshot.ids.indexOf(nodeId)] ?? 0 } });
        });

        return {
            shape: "community",
            fields: communityFieldSpecs(false),
            nodes,
            caveats: declaredCaveats({
                method: `hierarchical-clustering-${linkage}`,
                direction: "undirected",
                weight: null,
                facts: [
                    caveat("hierarchical.hop-distances"),
                    caveat("partition.unscored", { algorithm: "hierarchical-clustering" }),
                    ...(cut === clusters
                        ? []
                        : [caveat("hierarchical.fewer-clusters", { asked: clusters, allowed: cut })]),
                ],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(HierarchicalClusteringAlgorithm);
