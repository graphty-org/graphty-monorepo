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

const RANDOM_SEED_DESCRIPTION =
    "Visit the nodes in an order drawn from this seed, one at a time (empty = synchronous passes, which a GPU can run)";

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
        schema: z.number().int().min(0).max(2147483647).nullable().default(null),
        meta: {
            label: "Random Seed",
            description: RANDOM_SEED_DESCRIPTION,
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
    /** Seed of the asynchronous visit order, or null for synchronous passes. */
    randomSeed: number | null;
}

/**
 * Label propagation: every node takes the label most of its neighbours carry, until none moves.
 *
 * Two definitions, chosen by `randomSeed`. Each is one definition wherever it runs:
 *
 * - No seed (the default): synchronous passes. Every node reads its neighbours' labels from the
 *   previous pass and takes the lowest of the best-voted labels, with passes alternating between
 *   moving only up and only down so two neighbours cannot trade labels for ever. Deterministic.
 *   This is the definition a GPU runs, so it is the one routed to an accelerator above its floor;
 *   below the floor, or with no accelerator, `@graphty/algorithms`' synchronous port runs it. The
 *   two follow the same rule but differ in two details -- which direction the first pass moves,
 *   and whether a label tied for the lead is kept -- so on a graph with tied votes they can settle
 *   on different, equally valid partitions; on community structure they agree. `caveats.precision`
 *   says which one ran.
 * - A seed: the asynchronous (FLPA) definition. Nodes are visited one at a time in an order drawn
 *   from the seed, so one seed gives one partition. No GPU kernel has a seed to honour, so this
 *   always runs on the CPU, and under `acceleration="required"` it is refused.
 */
export class LabelPropagationAlgorithm extends DeclaredAlgorithm<LabelPropagationOptions> {
    static namespace = "graphty";
    static type = "label-propagation";
    /** Groups over the run's scope: the node list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

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
            default: null,
            label: "Random Seed",
            description: RANDOM_SEED_DESCRIPTION,
            min: 0,
            max: 2147483647,
            required: false,
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
        // The nodes of the run's input: its scope's, so a member with no edge in the scope stands alone.
        const nodeIds = scopeNodeIds(this.input("undirected"));

        if (nodeIds.length === 0) {
            return null;
        }

        const { maxIterations, randomSeed } = this.schemaOptions;

        const synchronous = randomSeed === null;
        // Undirected: a label spreads across an edge in either direction. Only the synchronous
        // definition is one an accelerator answers.
        const { snapshot, run } = this.accelerated("labelPropagation", "undirected", { accelerable: synchronous });
        const { ids } = snapshot;

        /* The CPU ports report their iterations and whether they converged; an accelerator's
           result does not. */
        context.report({ phase: "Spreading labels", total: null });
        const { value, precision } = await run((dispatch, s) =>
            synchronous
                ? dispatch.labelPropagationSynchronous(s, { maxIterations })
                : dispatch.labelPropagation(s, { maxIterations, randomSeed }),
        );
        const converged = "converged" in value && typeof value.converged === "boolean" ? value.converged : undefined;
        const iterations = "iterations" in value && typeof value.iterations === "number" ? value.iterations : undefined;

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Grouping nodes", nodeIds, (nodeId) => {
            nodes.push({ id: nodeId, values: { group: value.labels[ids.indexOf(nodeId)] ?? 0 } });
        });

        return {
            shape: "community",
            fields: communityFieldSpecs(false),
            nodes,
            caveats: declaredCaveats({
                method: synchronous ? "label-propagation-synchronous" : "label-propagation",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "strength" },
                converged,
                iterations,
                ...(synchronous ? {} : { seed: randomSeed }),
                precision,
                notes: ["Label propagation does not score its own partition, so it reports no modularity."],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(LabelPropagationAlgorithm);
