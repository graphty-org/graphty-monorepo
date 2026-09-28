/**
 * @file Link prediction: the pairs of unconnected nodes most likely to be joined next.
 *
 * The answer is a list of scored pairs, not a value on each node or edge -- a predicted link is
 * an edge that does not exist yet, so there is no element to hang it on. The result is shaped as
 * a pair list, which is why a run of it suggests no style: painting it would mean inventing the
 * thing it painted.
 */

import { indexed } from "@graphty/algorithms";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import { Algorithm } from "./Algorithm";
import type { ScopeInputDeclaration } from "./input/ScopedInput";
import { type AlgorithmOutput, type AlgorithmRunContext, DeclaredAlgorithm, declaredCaveats } from "./results";
import type { OptionsSchema } from "./types/OptionSchema";

/** The two scoring methods, by the name the `method` option takes. */
const METHODS = {
    "adamic-adar": indexed.adamicAdarPrediction,
    "common-neighbors": indexed.commonNeighborsPrediction,
} as const;

/** Zod-based options schema for link prediction. */
const linkPredictionOptionsSchema = defineOptions({
    method: {
        schema: z.enum(["adamic-adar", "common-neighbors"]).default("adamic-adar"),
        meta: {
            label: "Method",
            description:
                "Common neighbours counts the neighbours two nodes share. Adamic-Adar counts them too, but a shared neighbour with few connections counts for more than one with many.",
        },
    },
    topK: {
        schema: z.number().int().min(1).max(1000).default(10),
        meta: {
            label: "Pairs",
            description: "How many of the best-scoring pairs to keep.",
        },
    },
});

/** Options for link prediction. */
interface LinkPredictionOptions extends Record<string, unknown> {
    /** Which score ranks the pairs. */
    method: keyof typeof METHODS;
    /** How many of the best-scoring pairs to keep. */
    topK: number;
}

/**
 * Link prediction: scores every pair of nodes that is not already joined by how many neighbours
 * the two share, and keeps the best.
 */
export class LinkPredictionAlgorithm extends DeclaredAlgorithm<LinkPredictionOptions> {
    static namespace = "graphty";
    static type = "link-prediction";
    static scopeInput: ScopeInputDeclaration = "subgraph";

    static zodOptionsSchema: ZodOptionsSchema = linkPredictionOptionsSchema;

    static optionsSchema: OptionsSchema = {
        method: {
            type: "select",
            default: "adamic-adar",
            label: "Method",
            description:
                "Common neighbours counts the neighbours two nodes share. Adamic-Adar counts them too, but a shared neighbour with few connections counts for more than one with many.",
            options: [
                { value: "adamic-adar", label: "Adamic-Adar" },
                { value: "common-neighbors", label: "Common neighbours" },
            ],
        },
        topK: {
            type: "integer",
            default: 10,
            label: "Pairs",
            description: "How many of the best-scoring pairs to keep.",
            min: 1,
            max: 1000,
        },
    };

    /**
     * Score every unconnected pair of the run's nodes and keep the best. A pair is published as a
     * row of the result and never written into the graph.
     * @param context - What the element gave the run.
     * @returns The scored pairs, best first, or null when the graph has no nodes.
     */
    compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        // Undirected: a predicted link joins two nodes, whichever way a record would declare it.
        const input = this.input("undirected");
        if (input.nodeCount === 0) {
            return Promise.resolve(null);
        }

        const { method, topK } = this.schemaOptions;
        const snapshot = input.subgraph();

        context.report({ phase: "Scoring pairs", total: null });
        // The port lists an undirected pair twice, once each way round and lower index first, so
        // keep the lower-index-first copy.
        const ranked = METHODS[method](snapshot);
        const pairs: { source: string | number; target: string | number; score: number }[] = [];
        for (let k = 0; k < ranked.scores.length && pairs.length < topK; k++) {
            if (ranked.sources[k] < ranked.targets[k]) {
                pairs.push({
                    source: snapshot.ids.idOf(ranked.sources[k]),
                    target: snapshot.ids.idOf(ranked.targets[k]),
                    score: ranked.scores[k],
                });
            }
        }
        context.signal.throwIfAborted();

        return Promise.resolve({
            shape: "pair-list",
            fields: [{ name: "pairs", kind: "graph", type: "table" }],
            graph: { pairs },
            caveats: declaredCaveats({
                method,
                direction: "undirected",
                weight: null,
                notes: ["Only pairs that are not already joined, and that share at least one neighbour, are scored."],
            }),
        });
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(LinkPredictionAlgorithm);
