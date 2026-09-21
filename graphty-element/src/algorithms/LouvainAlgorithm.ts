import { louvain } from "@graphty/algorithms";
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
 * Zod-based options schema for Louvain algorithm
 */
const louvainOptionsSchema = defineOptions({
    resolution: {
        schema: z.number().min(0.1).max(5.0).default(1.0),
        meta: {
            label: "Resolution",
            description: "Higher = more communities, lower = fewer larger communities",
            step: 0.1,
        },
    },
    maxIterations: {
        schema: z.number().int().min(1).max(500).default(100),
        meta: {
            label: "Max Iterations",
            description: "Maximum optimization iterations",
            advanced: true,
        },
    },
    tolerance: {
        schema: z.number().min(1e-10).max(0.01).default(1e-6),
        meta: {
            label: "Tolerance",
            description: "Minimum modularity improvement to continue",
            advanced: true,
        },
    },
    useOptimized: {
        schema: z.boolean().default(true),
        meta: {
            label: "Use Optimized",
            description: "Use optimized implementation for better performance on large graphs",
            advanced: true,
        },
    },
});

/**
 * Options for the Louvain community detection algorithm
 */
interface LouvainOptions extends Record<string, unknown> {
    /** Higher = more communities, lower = fewer larger communities */
    resolution: number;
    /** Maximum optimization iterations */
    maxIterations: number;
    /** Minimum modularity improvement to continue */
    tolerance: number;
    /** Use optimized implementation for better performance on large graphs */
    useOptimized: boolean;
}

/**
 *
 */
export class LouvainAlgorithm extends DeclaredAlgorithm<LouvainOptions> {
    static namespace = "graphty";
    static type = "louvain";

    static zodOptionsSchema: ZodOptionsSchema = louvainOptionsSchema;

    static optionsSchema: OptionsSchema = {
        resolution: {
            type: "number",
            default: 1.0,
            label: "Resolution",
            description: "Higher = more communities, lower = fewer larger communities",
            min: 0.1,
            max: 5.0,
            step: 0.1,
        },
        maxIterations: {
            type: "integer",
            default: 100,
            label: "Max Iterations",
            description: "Maximum optimization iterations",
            min: 1,
            max: 500,
            advanced: true,
        },
        tolerance: {
            type: "number",
            default: 1e-6,
            label: "Tolerance",
            description: "Minimum modularity improvement to continue",
            min: 1e-10,
            max: 0.01,
            advanced: true,
        },
        useOptimized: {
            type: "boolean",
            default: true,
            label: "Use Optimized",
            description: "Use optimized implementation for better performance on large graphs",
            advanced: true,
        },
    };

    /**
     * Group the nodes into communities by optimising modularity.
     *
     * Publishes the community shape's uniform fields: a group per node, and the modularity the
     * method reported for its own partition. The group sizes, the group count and the size table
     * are derived from the groups when the result is built, not counted again here.
     * @param context - What the element gave the run.
     * @returns The community result, or null when there are no nodes to group.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const nodeIds = Array.from(this.graph.getDataManager().nodes.keys());

        if (nodeIds.length === 0) {
            return null;
        }

        const { resolution, maxIterations, tolerance, useOptimized } = this.schemaOptions;

        // Undirected: modularity is defined over unordered pairs.
        const graphData = this.algorithmGraph("undirected");

        context.report({ phase: "Optimizing modularity", total: null });
        const result = louvain(graphData, {
            resolution,
            maxIterations,
            tolerance,
            useOptimized,
        });

        const groupOf = new Map<number | string, number>();
        for (let index = 0; index < result.communities.length; index++) {
            for (const nodeId of result.communities[index]) {
                groupOf.set(nodeId, index);
            }
        }

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Grouping nodes", nodeIds, (nodeId) => {
            nodes.push({ id: nodeId, values: { group: groupOf.get(nodeId) ?? 0 } });
        });

        return {
            shape: "community",
            fields: communityFieldSpecs(true),
            nodes,
            graph: { modularity: result.modularity },
            caveats: declaredCaveats({
                method: "louvain",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "strength" },
                notes: [`Resolution ${String(resolution)}.`],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(LouvainAlgorithm);
