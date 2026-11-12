import { z } from "zod";

import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import type { ResultElementValues } from "../session/results";
import { caveat } from "../session/runs/caveatFacts";
import { Algorithm } from "./Algorithm";
import { drawSeed } from "./drawSeed";
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

const SEED_DESCRIPTION = "Seed for reproducible results; empty draws a new one every run";

/**
 * Zod-based options schema for Leiden algorithm
 */
const leidenOptionsSchema = defineOptions({
    resolution: {
        schema: z.number().min(0.1).max(5).default(1),
        meta: {
            label: "Resolution",
            description: "Controls community granularity",
            step: 0.1,
        },
    },
    randomSeed: {
        schema: z.number().int().min(0).max(2147483647).nullable().default(null),
        meta: {
            label: "Random Seed",
            description: SEED_DESCRIPTION,
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
    /** Seed for reproducible results, or null for a new one every run */
    randomSeed: number | null;
    /** Maximum refinement iterations */
    maxIterations: number;
    /** Convergence threshold */
    threshold: number;
}

/**
 *
 */
export class LeidenAlgorithm extends DeclaredAlgorithm<LeidenOptions> {
    static readonly namespace: string = "graphty";
    static readonly type: string = "leiden";
    /** The weight this algorithm reads; see `Algorithm.weightMeaning`. */
    static readonly weightMeaning = "strength" as const;
    /** Groups over the run's scope: the node list and the graph both come from the input. */
    static readonly scopeInput: ScopeInputDeclaration = "subgraph";

    static readonly zodOptionsSchema: ZodOptionsSchema = leidenOptionsSchema;

    static readonly optionsSchema: OptionsSchema = {
        resolution: {
            type: "number",
            default: 1,
            label: "Resolution",
            description: "Controls community granularity",
            min: 0.1,
            max: 5,
            step: 0.1,
        },
        randomSeed: {
            type: "integer",
            default: null,
            label: "Random Seed",
            description: SEED_DESCRIPTION,
            min: 0,
            max: 2147483647,
            required: false,
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
     *
     * The modularity counts a self-loop twice in its node's degree, the standard (NetworkX)
     * reading; the object-graph route this replaced counted it once. The partition is a
     * randomised heuristic's and not the replaced route's: on small graphs without self-loops its
     * modularity lands within about 0.05 of that route's either way, and no lower on average.
     * @param context - What the element gave the run.
     * @returns The community result, or null when there are no nodes to group.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        // The nodes of the run's input: its scope's, so a member with no edge in the scope stands alone.
        const nodeIds = scopeNodeIds(this.input("undirected"));

        if (nodeIds.length === 0) {
            return null;
        }

        const { resolution, maxIterations, threshold } = this.schemaOptions;
        const randomSeed = this.schemaOptions.randomSeed ?? drawSeed();

        // Undirected: modularity is defined over unordered pairs.
        const { snapshot, run } = this.accelerated("leiden", "undirected");

        context.report({ phase: "Refining communities", total: null });

        const { value: result, precision } = await run((dispatch, s) =>
            dispatch.leiden(s, {
                resolution,
                randomSeed,
                maxIterations,
                threshold,
            }),
        );

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Grouping nodes", nodeIds, (nodeId) => {
            nodes.push({ id: nodeId, values: { group: result.labels[snapshot.ids.indexOf(nodeId)] ?? 0 } });
        });

        return {
            shape: "community",
            fields: communityFieldSpecs(true),
            nodes,
            graph: { modularity: result.modularity },
            caveats: declaredCaveats({
                method: "leiden",
                direction: "undirected",
                ...this.weightCaveats(),
                precision,
                iterations: result.iterations,
                seed: randomSeed,
                facts: [caveat("community.resolution", { resolution })],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(LeidenAlgorithm);
