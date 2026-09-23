/**
 * @file The catalogue and the runtime publish the same field list, for every algorithm there is.
 *
 * A consumer builds a form, a legend and a style layer from the catalogue's field descriptors
 * before anything has run, so the descriptor is a promise. Two ways it can be broken, and this
 * file fails on both:
 *
 * - **Advertised but never written.** A descriptor naming a field no run ever fills sends a
 *   consumer to build a control for a value that will never arrive. That is worse than saying
 *   nothing, because the gap only shows up on the reader's screen as an empty column.
 * - **Written but never advertised.** A run publishing a field the descriptor does not declare
 *   makes the catalogue an incomplete answer to "what will I get", so the field is reachable only
 *   by someone who reads this package's source.
 *
 * Fields that depend on how the algorithm was asked to run -- whether breadth-first search was
 * given a target, whether shortest route was asked for every pair -- are covered by running the
 * algorithm both ways and holding the union of what the runs published against the descriptor.
 * That is why one catalogue key can have several entries below.
 *
 * The last check is the one that keeps this file honest as the package grows: every key in the
 * catalogue must appear here, so a new algorithm cannot be added without its agreement being
 * checked.
 */

import { assert, describe, it } from "vitest";

import { BellmanFordAlgorithm } from "../../../src/algorithms/BellmanFordAlgorithm";
import { BetweennessCentralityAlgorithm } from "../../../src/algorithms/BetweennessCentralityAlgorithm";
import { BFSAlgorithm } from "../../../src/algorithms/BFSAlgorithm";
import { BipartiteMatchingAlgorithm } from "../../../src/algorithms/BipartiteMatchingAlgorithm";
import { ClosenessCentralityAlgorithm } from "../../../src/algorithms/ClosenessCentralityAlgorithm";
import { ConnectedComponentsAlgorithm } from "../../../src/algorithms/ConnectedComponentsAlgorithm";
import { DegreeAlgorithm } from "../../../src/algorithms/DegreeAlgorithm";
import { DFSAlgorithm } from "../../../src/algorithms/DFSAlgorithm";
import { DijkstraAlgorithm } from "../../../src/algorithms/DijkstraAlgorithm";
import { EigenvectorCentralityAlgorithm } from "../../../src/algorithms/EigenvectorCentralityAlgorithm";
import { FloydWarshallAlgorithm } from "../../../src/algorithms/FloydWarshallAlgorithm";
import { GirvanNewmanAlgorithm } from "../../../src/algorithms/GirvanNewmanAlgorithm";
import { HITSAlgorithm } from "../../../src/algorithms/HITSAlgorithm";
import { KatzCentralityAlgorithm } from "../../../src/algorithms/KatzCentralityAlgorithm";
import { KruskalAlgorithm } from "../../../src/algorithms/KruskalAlgorithm";
import { LabelPropagationAlgorithm } from "../../../src/algorithms/LabelPropagationAlgorithm";
import { LeidenAlgorithm } from "../../../src/algorithms/LeidenAlgorithm";
import { LouvainAlgorithm } from "../../../src/algorithms/LouvainAlgorithm";
import { MaxFlowAlgorithm } from "../../../src/algorithms/MaxFlowAlgorithm";
import { MetricAlgorithm } from "../../../src/algorithms/metrics/MetricAlgorithm";
import { MinCutAlgorithm } from "../../../src/algorithms/MinCutAlgorithm";
import { PageRankAlgorithm } from "../../../src/algorithms/PageRankAlgorithm";
import { PrimAlgorithm } from "../../../src/algorithms/PrimAlgorithm";
import { type DeclaredAlgorithm, detachedRunContext } from "../../../src/algorithms/results";
import { StronglyConnectedComponentsAlgorithm } from "../../../src/algorithms/StronglyConnectedComponentsAlgorithm";
import { algorithmByKey, BUILT_IN_ALGORITHMS } from "../../../src/catalog/algorithms";
import type { Graph } from "../../../src/Graph";
import { createMockGraph } from "../../helpers/mockGraph";

/** A connected, weighted graph with a triangle, so every method has something to find. */
const FIXTURE = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }, { id: "F" }],
    edges: [
        { srcId: "A", dstId: "B", weight: 1, value: 1 },
        { srcId: "B", dstId: "C", weight: 1, value: 1 },
        { srcId: "A", dstId: "C", weight: 1, value: 1 },
        { srcId: "C", dstId: "D", weight: 5, value: 5 },
        { srcId: "D", dstId: "E", weight: 1, value: 1 },
        { srcId: "E", dstId: "F", weight: 1, value: 1 },
        { srcId: "D", dstId: "F", weight: 1, value: 1 },
    ],
};

/** One way of running one algorithm, and the catalogue key its fields must agree with. */
interface Case {
    /** What to call this way of running it in a test name. */
    readonly name: string;
    /** The catalogue key whose descriptor declares the fields. */
    readonly key: string;
    /**
     * Build and run it, and say which fields it published.
     * @param graph - The graph to run on.
     * @returns The published fields, written as "kind.name:type".
     */
    readonly publish: (graph: Graph) => Promise<readonly string[]>;
}

/**
 * Write one field the one way both halves are compared by.
 * @param field - The field, from a descriptor or from a run.
 * @returns Its comparison key.
 */
function fieldKey(field: { name: string; kind: string; type: string }): string {
    return `${field.kind}.${field.name}:${field.type}`;
}

/**
 * A case that runs an algorithm returning its own result.
 * @param name - What to call it.
 * @param key - The catalogue key.
 * @param make - Builds the algorithm.
 * @returns The case.
 */
function declared(name: string, key: string, make: (graph: Graph) => DeclaredAlgorithm): Case {
    return {
        name,
        key,
        publish: async (graph) => {
            const output = await make(graph).compute(detachedRunContext());

            assert.isNotNull(output, `${name} produced no result on a connected graph`);

            return output.fields.map(fieldKey);
        },
    };
}

/**
 * A case that runs a metric, which publishes through the shared result pipeline.
 * @param name - What to call it, which is also its catalogue key.
 * @param make - Builds the metric.
 * @returns The case.
 */
function metric(name: string, make: (graph: Graph) => MetricAlgorithm): Case {
    return {
        name,
        key: name,
        publish: async (graph) => {
            const algorithm = make(graph);
            await algorithm.run();

            const { result } = algorithm;
            assert.isDefined(result, `${name} produced no result on a connected graph`);

            return result.fields.map(fieldKey);
        },
    };
}

const CASES: readonly Case[] = [
    metric("degree", (g) => new DegreeAlgorithm(g)),
    metric("betweenness", (g) => new BetweennessCentralityAlgorithm(g)),
    metric("closeness", (g) => new ClosenessCentralityAlgorithm(g)),
    metric("pagerank", (g) => new PageRankAlgorithm(g)),
    metric("eigenvector", (g) => new EigenvectorCentralityAlgorithm(g)),
    metric("katz", (g) => new KatzCentralityAlgorithm(g)),
    metric("hits", (g) => new HITSAlgorithm(g)),
    declared("louvain", "louvain", (g) => new LouvainAlgorithm(g)),
    declared("leiden", "leiden", (g) => new LeidenAlgorithm(g)),
    declared("label propagation", "label-propagation", (g) => new LabelPropagationAlgorithm(g)),
    declared("girvan-newman", "girvan-newman", (g) => new GirvanNewmanAlgorithm(g)),
    declared("connected components", "components", (g) => new ConnectedComponentsAlgorithm(g)),
    declared("strongly connected components", "components", (g) => new StronglyConnectedComponentsAlgorithm(g)),
    declared("dijkstra", "shortest-path", (g) => new DijkstraAlgorithm(g, { source: "A", target: "F" })),
    declared("bellman-ford", "shortest-path", (g) => new BellmanFordAlgorithm(g, { source: "A", target: "F" })),
    declared("floyd-warshall over every pair", "all-pairs-distance", (g) => new FloydWarshallAlgorithm(g)),
    declared("breadth-first search", "bfs", (g) => new BFSAlgorithm(g, { source: "A" })),
    declared("breadth-first search with a target", "bfs", (g) => new BFSAlgorithm(g, { source: "A", targetNode: "F" })),
    declared("depth-first search", "dfs", (g) => new DFSAlgorithm(g, { source: "A" })),
    declared("kruskal", "kruskal", (g) => new KruskalAlgorithm(g)),
    declared("prim", "prim", (g) => new PrimAlgorithm(g)),
    declared("bipartite matching", "bipartite-matching", (g) => new BipartiteMatchingAlgorithm(g)),
    declared("max flow", "max-flow", (g) => new MaxFlowAlgorithm(g, { source: "A", sink: "F" })),
    declared("min cut", "min-cut", (g) => new MinCutAlgorithm(g)),
];

/**
 * Every field published by every way of running one catalogue key.
 * @param key - The catalogue key.
 * @returns The union, sorted.
 */
async function publishedFields(key: string): Promise<string[]> {
    const union = new Set<string>();

    for (const testCase of CASES.filter((candidate) => candidate.key === key)) {
        const graph = await createMockGraph(FIXTURE);

        for (const field of await testCase.publish(graph)) {
            union.add(field);
        }
    }

    return [...union].sort();
}

/**
 * The fields one catalogue descriptor declares.
 * @param key - The catalogue key.
 * @returns The declared fields, sorted.
 */
function declaredFields(key: string): string[] {
    const descriptor = algorithmByKey(key);

    assert.isDefined(descriptor, `the catalogue has an entry for ${key}`);

    return [...new Set(descriptor.fields.map(fieldKey))].sort();
}

const KEYS = [...new Set(CASES.map((testCase) => testCase.key))];

describe("the catalogue and the runtime agree on every algorithm's fields", () => {
    for (const key of KEYS) {
        it(`${key} fills every field its catalogue descriptor advertises`, async () => {
            const published = new Set(await publishedFields(key));
            const advertised = declaredFields(key).filter((field) => !published.has(field));

            assert.deepStrictEqual(advertised, [], `${key} advertises fields no run of it writes`);
        });

        it(`${key} advertises every field it fills`, async () => {
            const advertised = new Set(declaredFields(key));
            const published = (await publishedFields(key)).filter((field) => !advertised.has(field));

            assert.deepStrictEqual(published, [], `${key} writes fields its catalogue descriptor never declares`);
        });
    }

    it("covers every algorithm the catalogue offers", () => {
        const covered = new Set(KEYS);
        const uncovered = BUILT_IN_ALGORITHMS.map((descriptor) => descriptor.key).filter((key) => !covered.has(key));

        assert.deepStrictEqual(uncovered, [], "an algorithm was added to the catalogue without a case in this file");
    });
});
