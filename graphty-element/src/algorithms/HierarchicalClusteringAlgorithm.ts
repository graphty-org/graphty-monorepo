import { z } from "zod";

import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import { Algorithm } from "./Algorithm";
import { type ScopeInputDeclaration, scopeNodeIds } from "./input/ScopedInput";
import { offThread } from "./offThread";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    caveat,
    DeclaredAlgorithm,
    declaredCaveats,
    unscoredPartition,
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

        context.report({ phase: "merging-clusters", total: null });
        // Cut no finer than the tree's unlinked parts, nor finer than nodes (see offThreadTasks.ts).
        const value = await offThread("hierarchicalClustering", snapshot, context.signal, { linkage, clusters });
        const { cut } = value;

        return {
            ...(await unscoredPartition(context, nodeIds, snapshot.ids, value.labels)),
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
