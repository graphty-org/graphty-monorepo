import { spectralClustering } from "@graphty/algorithms";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
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
import type { OptionsSchema } from "./types/OptionSchema";

const CLUSTERS_DESCRIPTION = "How many clusters to split the nodes into, at most";
const LAPLACIAN_DESCRIPTION = "Which graph Laplacian the embedding comes from";
const MAX_ITERATIONS_DESCRIPTION = "Maximum k-means rounds";
const SEED_DESCRIPTION = "Seed of the k-means start: one seed gives one result";

const LAPLACIANS = ["normalized", "unnormalized", "randomWalk"] as const;

const spectralClusteringOptionsSchema = defineOptions({
    clusters: {
        schema: z.number().int().min(1).max(100).default(2),
        meta: { label: "Clusters", description: CLUSTERS_DESCRIPTION },
    },
    laplacian: {
        schema: z.enum(LAPLACIANS).default("normalized"),
        meta: { label: "Laplacian", description: LAPLACIAN_DESCRIPTION, advanced: true },
    },
    maxIterations: {
        schema: z.number().int().min(1).max(1000).default(100),
        meta: { label: "Max Iterations", description: MAX_ITERATIONS_DESCRIPTION, advanced: true },
    },
    seed: {
        schema: z.number().int().min(0).max(2147483647).default(42),
        meta: { label: "Random Seed", description: SEED_DESCRIPTION, advanced: true },
    },
});

/** Options for spectral clustering. */
interface SpectralClusteringOptions extends Record<string, unknown> {
    /** Number of clusters asked for. */
    clusters: number;
    /** Which Laplacian the embedding comes from. */
    laplacian: (typeof LAPLACIANS)[number];
    /** Cap on k-means rounds. */
    maxIterations: number;
    /** Seed of the k-means start. */
    seed: number;
}

/**
 * Spectral clustering: the eigenvectors of the graph Laplacian place every node as a point, and
 * k-means splits the points into at most `clusters` groups.
 *
 * Publishes a group per node. It does not score its own partition, so it reports no modularity.
 * Fewer groups than asked for come back when k-means leaves a cluster empty.
 */
export class SpectralClusteringAlgorithm extends DeclaredAlgorithm<SpectralClusteringOptions> {
    static readonly namespace = "graphty";
    static readonly type = "spectral-clustering";
    /** Groups over the run's scope: the node list and the graph both come from the input. */
    static readonly scopeInput: ScopeInputDeclaration = "subgraph";

    static readonly zodOptionsSchema: ZodOptionsSchema = spectralClusteringOptionsSchema;

    static readonly optionsSchema: OptionsSchema = {
        clusters: {
            type: "integer",
            default: 2,
            label: "Clusters",
            description: CLUSTERS_DESCRIPTION,
            min: 1,
            max: 100,
        },
        laplacian: {
            type: "select",
            default: "normalized",
            label: "Laplacian",
            description: LAPLACIAN_DESCRIPTION,
            options: LAPLACIANS.map((value) => ({ value, label: value })),
            advanced: true,
        },
        maxIterations: {
            type: "integer",
            default: 100,
            label: "Max Iterations",
            description: MAX_ITERATIONS_DESCRIPTION,
            min: 1,
            max: 1000,
            advanced: true,
        },
        seed: {
            type: "integer",
            default: 42,
            label: "Random Seed",
            description: SEED_DESCRIPTION,
            min: 0,
            max: 2147483647,
            advanced: true,
        },
    };

    /**
     * Split the nodes into clusters from the Laplacian's eigenvectors.
     * @param context - What the element gave the run.
     * @returns The community result, or null when there are no nodes to group.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const input = this.input("undirected");
        const nodeIds = scopeNodeIds(input);

        if (nodeIds.length === 0) {
            return null;
        }

        // Undirected: the Laplacian is symmetric. No accelerator implements spectral clustering.
        const { snapshot } = input.derived();
        const { clusters, laplacian, maxIterations, seed } = this.schemaOptions;

        context.report({ phase: "Embedding nodes", total: null });
        const value = spectralClustering(snapshot, { k: clusters, laplacianType: laplacian, maxIterations, seed });
        context.signal.throwIfAborted();

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Grouping nodes", nodeIds, (nodeId) => {
            nodes.push({ id: nodeId, values: { group: value.labels[snapshot.ids.indexOf(nodeId)] ?? 0 } });
        });

        return {
            shape: "community",
            fields: communityFieldSpecs(false),
            nodes,
            caveats: declaredCaveats({
                method: "spectral-clustering",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "strength" },
                converged: value.converged,
                seed,
                notes: ["Spectral clustering does not score its own partition, so it reports no modularity."],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(SpectralClusteringAlgorithm);
