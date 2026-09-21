import { girvanNewman } from "@graphty/algorithms";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
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
import type { OptionsSchema } from "./types/OptionSchema";

/**
 * Zod-based options schema for Girvan-Newman algorithm
 */
const girvanNewmanOptionsSchema = defineOptions({
    maxCommunities: {
        schema: z.number().int().min(0).max(100).default(0),
        meta: {
            label: "Max Communities",
            description: "Stop when this many communities reached (0 = find optimal)",
        },
    },
    minCommunitySize: {
        schema: z.number().int().min(1).max(100).default(1),
        meta: {
            label: "Min Community Size",
            description: "Minimum nodes per community",
            advanced: true,
        },
    },
    maxIterations: {
        schema: z.number().int().min(1).max(10000).default(1000),
        meta: {
            label: "Max Iterations",
            description: "Maximum edge removal iterations before stopping",
            advanced: true,
        },
    },
});

/**
 * Options for the Girvan-Newman community detection algorithm
 */
interface GirvanNewmanOptions extends Record<string, unknown> {
    /** Stop when this many communities reached (0 = find optimal) */
    maxCommunities: number;
    /** Minimum nodes per community */
    minCommunitySize: number;
    /** Maximum edge removal iterations before stopping */
    maxIterations: number;
}

/**
 *
 */
export class GirvanNewmanAlgorithm extends DeclaredAlgorithm<GirvanNewmanOptions> {
    static namespace = "graphty";
    static type = "girvan-newman";

    static zodOptionsSchema: ZodOptionsSchema = girvanNewmanOptionsSchema;

    static optionsSchema: OptionsSchema = {
        maxCommunities: {
            type: "integer",
            default: 0,
            label: "Max Communities",
            description: "Stop when this many communities reached (0 = find optimal)",
            min: 0,
            max: 100,
        },
        minCommunitySize: {
            type: "integer",
            default: 1,
            label: "Min Community Size",
            description: "Minimum nodes per community",
            min: 1,
            max: 100,
            advanced: true,
        },
        maxIterations: {
            type: "integer",
            default: 1000,
            label: "Max Iterations",
            description: "Maximum edge removal iterations before stopping",
            min: 1,
            max: 10000,
            advanced: true,
        },
    };

    /**
     * Group the nodes into communities by cutting the edges the most routes run through.
     *
     * The method produces a dendrogram -- one partition per cut -- and the run publishes the cut
     * that scored the highest modularity, with that score. A graph with no edges falls apart at
     * the first step, and every node is then its own community.
     * @param context - What the element gave the run.
     * @returns The community result, or null when there are no nodes to group.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const nodeIds = Array.from(this.graph.getDataManager().nodes.keys());

        if (nodeIds.length === 0) {
            return null;
        }

        const { maxCommunities, minCommunitySize, maxIterations } = this.schemaOptions;

        // Undirected: the edge betweenness this splits on is defined over unordered pairs.
        const graphData = this.algorithmGraph("undirected");

        context.report({ phase: "Cutting bridges", total: null });

        // maxCommunities is only passed on when it was set: 0 means "find the best split".
        const dendrogram = girvanNewman(graphData, {
            maxCommunities: maxCommunities > 0 ? maxCommunities : undefined,
            minCommunitySize,
            maxIterations,
        });

        const best = dendrogram.reduce<(typeof dendrogram)[number] | undefined>(
            (winner, candidate) => (winner === undefined || candidate.modularity > winner.modularity ? candidate : winner),
            undefined,
        );

        const groupOf = new Map<number | string, number>();
        if (best !== undefined) {
            for (let index = 0; index < best.communities.length; index++) {
                for (const nodeId of best.communities[index]) {
                    groupOf.set(nodeId, index);
                }
            }
        } else {
            // No cut was possible, which is what a graph with no edges looks like: every node
            // stands alone, and a partition of singletons scores nothing.
            nodeIds.forEach((nodeId, index) => groupOf.set(nodeId, index));
        }

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Grouping nodes", nodeIds, (nodeId) => {
            nodes.push({ id: nodeId, values: { group: groupOf.get(nodeId) ?? 0 } });
        });

        return {
            shape: "community",
            fields: communityFieldSpecs(true),
            nodes,
            graph: { modularity: best?.modularity ?? 0 },
            caveats: declaredCaveats({
                method: "girvan-newman",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "strength" },
                notes:
                    best === undefined
                        ? ["No edge could be cut, so every node is its own community."]
                        : [`Kept the best of ${String(dendrogram.length)} successive cuts.`],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(GirvanNewmanAlgorithm);
