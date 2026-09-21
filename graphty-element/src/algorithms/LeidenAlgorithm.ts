import { leiden } from "@graphty/algorithms";
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
 * Zod-based options schema for Leiden algorithm
 */
const leidenOptionsSchema = defineOptions({
    resolution: {
        schema: z.number().min(0.1).max(5.0).default(1.0),
        meta: {
            label: "Resolution",
            description: "Controls community granularity",
            step: 0.1,
        },
    },
    randomSeed: {
        schema: z.number().int().min(0).max(2147483647).default(42),
        meta: {
            label: "Random Seed",
            description: "Seed for reproducible results",
            advanced: true,
        },
    },
    maxIterations: {
        schema: z.number().int().min(1).max(500).default(100),
        meta: {
            label: "Max Iterations",
            description: "Maximum refinement iterations",
            advanced: true,
        },
    },
    threshold: {
        schema: z.number().min(1e-10).max(0.01).default(1e-6),
        meta: {
            label: "Threshold",
            description: "Convergence threshold",
            advanced: true,
        },
    },
});

/**
 * Options for the Leiden community detection algorithm
 */
interface LeidenOptions extends Record<string, unknown> {
    /** Controls community granularity */
    resolution: number;
    /** Seed for reproducible results */
    randomSeed: number;
    /** Maximum refinement iterations */
    maxIterations: number;
    /** Convergence threshold */
    threshold: number;
}

/**
 *
 */
export class LeidenAlgorithm extends DeclaredAlgorithm<LeidenOptions> {
    static namespace = "graphty";
    static type = "leiden";

    static zodOptionsSchema: ZodOptionsSchema = leidenOptionsSchema;

    static optionsSchema: OptionsSchema = {
        resolution: {
            type: "number",
            default: 1.0,
            label: "Resolution",
            description: "Controls community granularity",
            min: 0.1,
            max: 5.0,
            step: 0.1,
        },
        randomSeed: {
            type: "integer",
            default: 42,
            label: "Random Seed",
            description: "Seed for reproducible results",
            min: 0,
            max: 2147483647,
            advanced: true,
        },
        maxIterations: {
            type: "integer",
            default: 100,
            label: "Max Iterations",
            description: "Maximum refinement iterations",
            min: 1,
            max: 500,
            advanced: true,
        },
        threshold: {
            type: "number",
            default: 1e-6,
            label: "Threshold",
            description: "Convergence threshold",
            min: 1e-10,
            max: 0.01,
            advanced: true,
        },
    };

    /**
     * Group the nodes into communities, refining each group before it is kept.
     *
     * Publishes the community shape's uniform fields: a group per node, and the modularity the
     * method reported. How many passes it took qualifies those numbers rather than being one of
     * them, so it travels in the caveats.
     * @param context - What the element gave the run.
     * @returns The community result, or null when there are no nodes to group.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const nodeIds = Array.from(this.graph.getDataManager().nodes.keys());

        if (nodeIds.length === 0) {
            return null;
        }

        const { resolution, maxIterations, threshold } = this.schemaOptions;

        // Undirected: modularity is defined over unordered pairs.
        const graphData = this.algorithmGraph("undirected");

        context.report({ phase: "Refining communities", total: null });
        const result = leiden(graphData, {
            resolution,
            maxIterations,
            threshold,
        });

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Grouping nodes", nodeIds, (nodeId) => {
            nodes.push({ id: nodeId, values: { group: result.communities.get(String(nodeId)) ?? 0 } });
        });

        return {
            shape: "community",
            fields: communityFieldSpecs(true),
            nodes,
            graph: { modularity: result.modularity },
            caveats: declaredCaveats({
                method: "leiden",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "strength" },
                iterations: result.iterations,
                notes: [`Resolution ${String(resolution)}.`],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(LeidenAlgorithm);
