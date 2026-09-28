import { indexed } from "@graphty/algorithms";
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
    /** Groups over the run's scope: the node list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

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
        // The nodes of the run's input: its scope's, so a member with no edge in the scope stands alone.
        const nodeIds = scopeNodeIds(this.input("undirected"));

        if (nodeIds.length === 0) {
            return null;
        }

        const { maxCommunities, minCommunitySize, maxIterations } = this.schemaOptions;

        // Undirected: the edge betweenness this splits on is defined over unordered pairs.
        const { snapshot } = this.input("undirected").derived();

        context.report({ phase: "Cutting bridges", total: null });

        // maxCommunities is only passed on when it was set: 0 means "find the best split".
        const dendrogram = indexed.girvanNewman(snapshot, {
            maxCommunities: maxCommunities > 0 ? maxCommunities : undefined,
            minCommunitySize,
            maxIterations,
        });

        // A CUT CAN OVERSHOOT THE CAP. Girvan-Newman removes every edge tied for the highest
        // betweenness in one step, so the step that reaches `maxCommunities` can pass it -- two
        // tied bridges go together and a graph asked for two communities falls into three. The
        // dendrogram is right to record that, because it is what the cuts produced, but this
        // option reads "stop when this many communities reached", and publishing more communities
        // than the caller asked for would make that a false promise. So the published cut is
        // chosen among the levels that honour the cap, counting only communities of at least
        // `minCommunitySize` nodes, as the option says.
        const counted = (labels: Uint32Array): number => {
            const sizes = new Map<number, number>();
            for (const label of labels) {
                sizes.set(label, (sizes.get(label) ?? 0) + 1);
            }
            return [...sizes.values()].filter((size) => size >= minCommunitySize).length;
        };
        const levels = dendrogram.levels.map((labels, index) => ({ labels, modularity: dendrogram.modularity[index] }));
        const within = maxCommunities > 0 ? levels.filter((level) => counted(level.labels) <= maxCommunities) : levels;

        // Nothing honours the cap when the graph arrived in more pieces than the cap allows,
        // before a single edge was cut. The first level is then the closest thing to an answer,
        // and it is the graph's own shape rather than anything this chose.
        const choices = within.length > 0 ? within : levels.slice(0, 1);

        // The port always records the uncut graph first, so there is at least one level.
        const best = choices.reduce((winner, candidate) =>
            candidate.modularity > winner.modularity ? candidate : winner,
        );

        // Every node keeps the community its level put it in, a small one included: a community
        // below `minCommunitySize` only stops counting towards the cap.
        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Grouping nodes", nodeIds, (nodeId) => {
            nodes.push({ id: nodeId, values: { group: best.labels[snapshot.ids.indexOf(nodeId)] ?? 0 } });
        });

        return {
            shape: "community",
            fields: communityFieldSpecs(true),
            nodes,
            graph: { modularity: best.modularity },
            caveats: declaredCaveats({
                method: "girvan-newman",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "strength" },
                notes:
                    levels.length === 1
                        ? ["No edge could be cut, so every node is its own community."]
                        : [`Kept the best of ${String(levels.length)} successive cuts.`],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(GirvanNewmanAlgorithm);
