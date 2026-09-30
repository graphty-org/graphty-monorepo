import { z } from "zod/v4";

import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import { GraphtyError } from "../errors";
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
            description:
                "Only the optimized implementation remains, so a run with this switched off is refused. Leave it on",
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
    /** Only the optimized implementation remains, so `false` is refused */
    useOptimized: boolean;
}

/**
 * Louvain: communities found by moving nodes between groups while modularity improves, then
 * merging each group into one node and repeating.
 */
export class LouvainAlgorithm extends DeclaredAlgorithm<LouvainOptions> {
    static namespace = "graphty";
    static type = "louvain";
    /** Groups over the run's scope: the node list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

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
            description:
                "Only the optimized implementation remains, so a run with this switched off is refused. Leave it on",
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
        // The nodes of the run's input: its scope's, so a member with no edge in the scope stands alone.
        const nodeIds = scopeNodeIds(this.input("undirected"));

        if (nodeIds.length === 0) {
            return null;
        }

        const { resolution, maxIterations, tolerance, useOptimized } = this.schemaOptions;

        if (!useOptimized) {
            // The option chose between two implementations, and the unoptimized one is not carried
            // over to the snapshot. A run that asked for it is told so rather than quietly given
            // the other; `true`, the default, keeps saved documents running.
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                source: "run",
                message: "Louvain has only its optimized implementation now; leave useOptimized on.",
                details: { algorithm: "louvain", option: "useOptimized", value: false, permitted: [true] },
            });
        }

        // Undirected: modularity is defined over unordered pairs. No shipped accelerator groups
        // communities, so this runs the index-based CPU port.
        const { snapshot, run } = this.accelerated("louvain", "undirected");

        context.report({ phase: "Optimizing modularity", total: null });
        const { value: result, precision } = await run((dispatch, s) =>
            dispatch.louvain(s, { resolution, maxIterations, tolerance }),
        );

        const { ids } = snapshot;
        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Grouping nodes", nodeIds, (nodeId) => {
            nodes.push({ id: nodeId, values: { group: result.labels[ids.indexOf(nodeId)] ?? 0 } });
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
                precision,
                notes: [`Resolution ${String(resolution)}.`],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(LouvainAlgorithm);
