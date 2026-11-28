import { distanceMeasures } from "@graphty/algorithms";

import type { OptionsSchema as ZodOptionsSchema } from "../config";
import type { ResultElementValues } from "../session/results";
import { caveat } from "../session/runs/caveatFacts";
import { Algorithm } from "./Algorithm";
import { SAMPLED_SOURCES_OPTIONS, sampledSourcesOptionsSchema } from "./ClosenessCentralityAlgorithm";
import { type ScopeInputDeclaration, scopeNodeIds } from "./input/ScopedInput";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    eccentricityFieldSpecs,
    forEachChunked,
} from "./results";
import type { OptionsSchema } from "./types/OptionSchema";

/** Options for distance measures. */
interface DistanceMeasuresOptions extends Record<string, unknown> {
    /** How many sources to draw for a sampled run, or null to search from every node. */
    k: number | null;
}

/**
 * Distance measures: each node's eccentricity -- the distance to the furthest node it reaches --
 * and the graph's diameter, radius and average shortest path length.
 *
 * One breadth-first search from every node (one Dijkstra when the run's `weight` option names an
 * edge weight), `O(n * m)`, where the all-pairs sweep is `O(n^3)`. A graph in several pieces is
 * measured per piece: a node's eccentricity counts only the nodes it reaches, and the graph-wide
 * figures are those of the largest piece, which the caveats state.
 *
 * With `k` the run is SAMPLED, bounding the work at `k` searches: only the drawn sources carry an
 * eccentricity, the diameter is a lower bound, the radius an upper bound and the average an
 * estimate.
 */
export class DistanceMeasuresAlgorithm extends DeclaredAlgorithm<DistanceMeasuresOptions> {
    static readonly namespace: string = "graphty";
    static readonly type: string = "distance-measures";
    /** The weight this algorithm reads: a distance, and only when the run's `weight` option names one. */
    static readonly weightMeaning = "distance" as const;
    static readonly loadedWeightByDefault: boolean = false;
    /** Measures over the run's scope: the node list and the graph both come from the input. */
    static readonly scopeInput: ScopeInputDeclaration = "subgraph";
    /**
     * A distance: of a group of parallel edges, the cheapest is the one a shortest path takes. An
     * unweighted run counts hops, which merging cannot change.
     */
    static readonly parallelEdges = "min" as const;

    static readonly zodOptionsSchema: ZodOptionsSchema = sampledSourcesOptionsSchema;

    static readonly optionsSchema: OptionsSchema = SAMPLED_SOURCES_OPTIONS;

    /**
     * Measure every node's eccentricity and the graph's diameter, radius and average distance.
     * @param context - What the element gave the run.
     * @returns The measurement, or null when there are no nodes to measure.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        // Undirected: a distance crosses an edge in either direction. No accelerator implements it.
        const input = this.input("undirected");
        const nodeIds = scopeNodeIds(input);
        const { snapshot } = input.derived();
        if (nodeIds.length === 0) {
            return null;
        }

        const { k } = this.schemaOptions;
        const weighted = this.weightReading().weight !== null;
        // A k past the node count (a small scope, say) searches from every node, the exact answer.
        const sampled = k !== null && k < snapshot.nodeCount;

        context.report({ phase: "measuring-distances", total: null, params: { sampled } });
        const value = distanceMeasures(snapshot, sampled ? { k, weighted } : { weighted });
        context.signal.throwIfAborted();

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "reading-eccentricities", nodeIds, (nodeId) => {
            const eccentricity = value.eccentricity[snapshot.ids.indexOf(nodeId)];
            // A node a sampled run did not search from has no eccentricity, so it carries nothing.
            nodes.push({
                id: nodeId,
                values: eccentricity === undefined || Number.isNaN(eccentricity) ? {} : { value: eccentricity },
            });
        });

        const facts = [
            sampled
                ? caveat("distance-measures.sampled", { sources: value.sourcesUsed, nodes: snapshot.nodeCount })
                : caveat("distance-measures.exact"),
            ...(value.componentCount > 1
                ? [
                      caveat("distance-measures.largest-component", {
                          components: value.componentCount,
                          nodes: value.componentSize[value.largestComponent],
                      }),
                  ]
                : []),
        ];

        return {
            shape: "node-metric",
            fields: [
                ...eccentricityFieldSpecs(),
                { name: "averageShortestPathLength", kind: "graph", type: "number" },
                { name: "componentCount", kind: "graph", type: "integer" },
            ],
            nodes,
            graph: {
                diameter: value.diameter,
                radius: value.radius,
                averageShortestPathLength: value.averageShortestPathLength,
                componentCount: value.componentCount,
            },
            caveats: declaredCaveats({
                exact: !sampled,
                ...(sampled ? { sampleSize: value.sourcesUsed } : {}),
                method: weighted ? "distance-measures-dijkstra" : "distance-measures-bfs",
                direction: "undirected",
                ...this.weightCaveats(),
                facts,
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(DistanceMeasuresAlgorithm);
