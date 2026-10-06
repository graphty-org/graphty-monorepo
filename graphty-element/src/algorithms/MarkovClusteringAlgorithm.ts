import { markovClustering } from "@graphty/algorithms";
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

const INFLATION_DESCRIPTION = "How sharply flow is concentrated each round: higher gives more, smaller clusters";
const EXPANSION_DESCRIPTION = "How many steps flow spreads each round";
const MAX_ITERATIONS_DESCRIPTION = "Maximum expansion and inflation rounds";
const SELF_LOOPS_DESCRIPTION = "Let every node keep some of its own flow, which steadies the result";

const markovClusteringOptionsSchema = defineOptions({
    inflation: {
        schema: z.number().min(1.1).max(10).default(2),
        meta: { label: "Inflation", description: INFLATION_DESCRIPTION, step: 0.1 },
    },
    expansion: {
        schema: z.number().int().min(2).max(10).default(2),
        meta: { label: "Expansion", description: EXPANSION_DESCRIPTION, advanced: true },
    },
    maxIterations: {
        schema: z.number().int().min(1).max(1000).default(100),
        meta: { label: "Max Iterations", description: MAX_ITERATIONS_DESCRIPTION, advanced: true },
    },
    selfLoops: {
        schema: z.boolean().default(true),
        meta: { label: "Self Loops", description: SELF_LOOPS_DESCRIPTION, advanced: true },
    },
});

/** Options for Markov clustering. */
interface MarkovClusteringOptions extends Record<string, unknown> {
    /** Element-wise power of each inflation step. */
    inflation: number;
    /** Matrix power of each expansion step. */
    expansion: number;
    /** Cap on expansion-inflation rounds. */
    maxIterations: number;
    /** Whether every node gets a self-loop before the first round. */
    selfLoops: boolean;
}

/**
 * Markov clustering (MCL): flow is spread along the edges and then concentrated, round after
 * round, until it settles inside clusters it cannot leave.
 *
 * Publishes a group per node. MCL does not score its own partition, so it reports no modularity.
 * Weights are read as strengths: a heavier edge carries more flow.
 */
export class MarkovClusteringAlgorithm extends DeclaredAlgorithm<MarkovClusteringOptions> {
    static namespace = "graphty";
    static type = "markov-clustering";
    /** Groups over the run's scope: the node list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

    static zodOptionsSchema: ZodOptionsSchema = markovClusteringOptionsSchema;

    static optionsSchema: OptionsSchema = {
        inflation: {
            type: "number",
            default: 2,
            label: "Inflation",
            description: INFLATION_DESCRIPTION,
            min: 1.1,
            max: 10,
            step: 0.1,
        },
        expansion: {
            type: "integer",
            default: 2,
            label: "Expansion",
            description: EXPANSION_DESCRIPTION,
            min: 2,
            max: 10,
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
        selfLoops: {
            type: "boolean",
            default: true,
            label: "Self Loops",
            description: SELF_LOOPS_DESCRIPTION,
            advanced: true,
        },
    };

    /**
     * Group the nodes into the clusters flow settles in.
     * @param context - What the element gave the run.
     * @returns The community result, or null when there are no nodes to group.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const input = this.input("undirected");
        const nodeIds = scopeNodeIds(input);

        if (nodeIds.length === 0) {
            return null;
        }

        // Undirected: flow crosses an edge in either direction. No accelerator implements MCL.
        const { snapshot } = input.derived();
        const { inflation, expansion, maxIterations, selfLoops } = this.schemaOptions;

        context.report({ phase: "Spreading flow", total: null });
        const value = markovClustering(snapshot, { inflation, expansion, maxIterations, selfLoops });
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
                method: "markov-clustering",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "strength" },
                converged: value.converged,
                iterations: value.iterations,
                notes: ["Markov clustering does not score its own partition, so it reports no modularity."],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(MarkovClusteringAlgorithm);
