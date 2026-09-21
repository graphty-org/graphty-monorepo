import { labelPropagation } from "@graphty/algorithms";
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
 * Zod-based options schema for Label Propagation algorithm
 */
const labelPropagationOptionsSchema = defineOptions({
    maxIterations: {
        schema: z.number().int().min(1).max(500).default(100),
        meta: {
            label: "Max Iterations",
            description: "Maximum label propagation rounds",
        },
    },
    randomSeed: {
        schema: z.number().int().min(0).max(2147483647).default(42),
        meta: {
            label: "Random Seed",
            description: "Seed for reproducible tie-breaking",
            advanced: true,
        },
    },
});

/**
 * Options for the Label Propagation community detection algorithm
 */
interface LabelPropagationOptions extends Record<string, unknown> {
    /** Maximum label propagation rounds */
    maxIterations: number;
    /** Seed for reproducible tie-breaking */
    randomSeed: number;
}

/**
 *
 */
export class LabelPropagationAlgorithm extends DeclaredAlgorithm<LabelPropagationOptions> {
    static namespace = "graphty";
    static type = "label-propagation";

    static zodOptionsSchema: ZodOptionsSchema = labelPropagationOptionsSchema;

    static optionsSchema: OptionsSchema = {
        maxIterations: {
            type: "integer",
            default: 100,
            label: "Max Iterations",
            description: "Maximum label propagation rounds",
            min: 1,
            max: 500,
        },
        randomSeed: {
            type: "integer",
            default: 42,
            label: "Random Seed",
            description: "Seed for reproducible tie-breaking",
            min: 0,
            max: 2147483647,
            advanced: true,
        },
    };

    /**
     * Group the nodes into communities by letting labels spread between neighbours.
     *
     * Publishes a group per node and nothing the shape does not derive. Label propagation does
     * not score its own partition, so it reports no modularity: the community shape makes that
     * field optional for exactly this reason, and a number invented to fill it would be read as
     * a measurement.
     * @param context - What the element gave the run.
     * @returns The community result, or null when there are no nodes to group.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const nodeIds = Array.from(this.graph.getDataManager().nodes.keys());

        if (nodeIds.length === 0) {
            return null;
        }

        const { maxIterations, randomSeed } = this.schemaOptions;

        // Undirected: a label spreads across an edge in either direction.
        const graphData = this.algorithmGraph("undirected");

        context.report({ phase: "Spreading labels", total: null });
        const result = labelPropagation(graphData, {
            maxIterations,
            randomSeed,
        });

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Grouping nodes", nodeIds, (nodeId) => {
            nodes.push({ id: nodeId, values: { group: result.communities.get(String(nodeId)) ?? 0 } });
        });

        return {
            shape: "community",
            fields: communityFieldSpecs(false),
            nodes,
            caveats: declaredCaveats({
                method: "label-propagation",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "strength" },
                converged: result.converged,
                iterations: result.iterations,
                seed: randomSeed,
                notes: ["Label propagation does not score its own partition, so it reports no modularity."],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(LabelPropagationAlgorithm);
