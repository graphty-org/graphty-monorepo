/**
 * @file Every community, path and set algorithm publishes what its shape and the catalogue say
 * it does.
 *
 * Three things are checked here and they fail for three different reasons. The shape contract
 * fails when an algorithm skips a field its shape promised, which is what makes
 * `results.<run>.group` readable without opening the catalogue. The catalogue agreement fails
 * when a run publishes a field the descriptor never declared, or declares one at a type the
 * descriptor spells differently -- the two halves of the same fact, held against each other. And
 * the run context checks fail when an algorithm cannot be watched or stopped, which is the whole
 * reason a result is returned rather than written.
 */

import { assert, describe, it } from "vitest";

import { BellmanFordAlgorithm } from "../../../src/algorithms/BellmanFordAlgorithm";
import { BFSAlgorithm } from "../../../src/algorithms/BFSAlgorithm";
import { BipartiteMatchingAlgorithm } from "../../../src/algorithms/BipartiteMatchingAlgorithm";
import { ConnectedComponentsAlgorithm } from "../../../src/algorithms/ConnectedComponentsAlgorithm";
import { DFSAlgorithm } from "../../../src/algorithms/DFSAlgorithm";
import { DijkstraAlgorithm } from "../../../src/algorithms/DijkstraAlgorithm";
import { FloydWarshallAlgorithm } from "../../../src/algorithms/FloydWarshallAlgorithm";
import { GirvanNewmanAlgorithm } from "../../../src/algorithms/GirvanNewmanAlgorithm";
import { KruskalAlgorithm } from "../../../src/algorithms/KruskalAlgorithm";
import { LabelPropagationAlgorithm } from "../../../src/algorithms/LabelPropagationAlgorithm";
import { LeidenAlgorithm } from "../../../src/algorithms/LeidenAlgorithm";
import { LouvainAlgorithm } from "../../../src/algorithms/LouvainAlgorithm";
import { MaxFlowAlgorithm } from "../../../src/algorithms/MaxFlowAlgorithm";
import { MinCutAlgorithm } from "../../../src/algorithms/MinCutAlgorithm";
import { PrimAlgorithm } from "../../../src/algorithms/PrimAlgorithm";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    type DeclaredAlgorithm,
    detachedRunContext,
    type ResultFieldSpec,
} from "../../../src/algorithms/results";
import { StronglyConnectedComponentsAlgorithm } from "../../../src/algorithms/StronglyConnectedComponentsAlgorithm";
import { algorithmByKey } from "../../../src/catalog/algorithms";
import type { FieldDescriptor, ResultShape } from "../../../src/catalog/types";
import type { Graph } from "../../../src/Graph";
import { checkShapeContract, resultPath } from "../../../src/session/results";
import type { RunProgressReport } from "../../../src/session/runs";
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

/** One algorithm under test, with the catalogue key its result has to agree with. */
interface Case {
    /** What to call it in a test name. */
    readonly name: string;
    /** The catalogue key whose descriptor declares this algorithm's fields. */
    readonly key: string;
    /** The shape this run publishes at, which is the catalogue's except where noted. */
    readonly shape: ResultShape;
    /** The method the caveats must name. */
    readonly method: string;
    /**
     * Build the algorithm.
     * @param graph - The graph to run on.
     * @returns The algorithm.
     */
    readonly make: (graph: Graph) => DeclaredAlgorithm;
}

const CASES: readonly Case[] = [
    { name: "louvain", key: "louvain", shape: "community", method: "louvain", make: (g) => new LouvainAlgorithm(g) },
    { name: "leiden", key: "leiden", shape: "community", method: "leiden", make: (g) => new LeidenAlgorithm(g) },
    {
        name: "label propagation",
        key: "label-propagation",
        shape: "community",
        method: "label-propagation",
        make: (g) => new LabelPropagationAlgorithm(g),
    },
    {
        name: "girvan-newman",
        key: "girvan-newman",
        shape: "community",
        method: "girvan-newman",
        make: (g) => new GirvanNewmanAlgorithm(g),
    },
    {
        name: "connected components",
        key: "components",
        shape: "community",
        method: "connected-components",
        make: (g) => new ConnectedComponentsAlgorithm(g),
    },
    {
        name: "strongly connected components",
        key: "components",
        shape: "community",
        method: "strongly-connected-components",
        make: (g) => new StronglyConnectedComponentsAlgorithm(g),
    },
    {
        name: "dijkstra",
        key: "shortest-path",
        shape: "path",
        method: "dijkstra",
        make: (g) => new DijkstraAlgorithm(g, { source: "A", target: "F" }),
    },
    {
        name: "bellman-ford",
        key: "shortest-path",
        shape: "path",
        method: "bellman-ford",
        make: (g) => new BellmanFordAlgorithm(g, { source: "A", target: "F" }),
    },
    {
        // Asked for every pair, shortest-path stops being one route: there is no `onPath` to
        // publish, so the run's shape is `fact` where the catalogue's key is `path`.
        name: "floyd-warshall",
        key: "shortest-path",
        shape: "fact",
        method: "floyd-warshall",
        make: (g) => new FloydWarshallAlgorithm(g),
    },
    {
        name: "bfs",
        key: "bfs",
        shape: "layered-grouping",
        method: "bfs",
        make: (g) => new BFSAlgorithm(g, { source: "A" }),
    },
    { name: "dfs", key: "dfs", shape: "node-metric", method: "dfs", make: (g) => new DFSAlgorithm(g, { source: "A" }) },
    { name: "kruskal", key: "kruskal", shape: "edge-set", method: "kruskal", make: (g) => new KruskalAlgorithm(g) },
    { name: "prim", key: "prim", shape: "edge-set", method: "prim", make: (g) => new PrimAlgorithm(g) },
    {
        name: "bipartite matching",
        key: "bipartite-matching",
        shape: "edge-set",
        method: "bipartite-matching",
        make: (g) => new BipartiteMatchingAlgorithm(g),
    },
    {
        name: "max flow",
        key: "max-flow",
        shape: "edge-metric",
        method: "ford-fulkerson",
        make: (g) => new MaxFlowAlgorithm(g, { source: "A", sink: "F" }),
    },
    {
        name: "min cut",
        key: "min-cut",
        shape: "edge-set",
        method: "stoer-wagner",
        make: (g) => new MinCutAlgorithm(g),
    },
];

/**
 * Turn a run's account of its fields into the descriptors the shape contract reads.
 * @param fields - What the run said it filled.
 * @returns The descriptors.
 */
function describeFields(fields: readonly ResultFieldSpec[]): FieldDescriptor[] {
    return fields.map((field) => ({
        name: field.name,
        plainName: field.name,
        technicalName: field.name,
        kind: field.kind,
        type: field.type,
        path: resultPath("run", field.name),
    }));
}

/** A context that records everything reported to it. */
interface RecordingContext extends AlgorithmRunContext {
    /** Every progress report the run made, in order. */
    readonly reports: RunProgressReport[];
}

/**
 * A run context that records progress and can be cancelled.
 * @param signal - The signal to hand the run.
 * @returns The context.
 */
function recordingContext(signal?: AbortSignal): RecordingContext {
    const reports: RunProgressReport[] = [];

    return {
        signal: signal ?? new AbortController().signal,
        reports,
        report: (progress) => {
            reports.push(progress);
        },
        yieldNow: () => Promise.resolve(),
    };
}

/**
 * Run one case against the fixture.
 * @param testCase - The algorithm to run.
 * @param context - The context to run it with.
 * @returns What it produced.
 */
async function runCase(testCase: Case, context: AlgorithmRunContext = detachedRunContext()): Promise<AlgorithmOutput> {
    const graph = await createMockGraph(FIXTURE);
    const output = await testCase.make(graph).compute(context);

    assert.isNotNull(output, `${testCase.name} produced no result on a connected graph`);

    return output;
}

describe("declared algorithm results", () => {
    describe("the shape contract", () => {
        for (const testCase of CASES) {
            it(`${testCase.name} fills every field its shape declares`, async () => {
                const output = await runCase(testCase);

                assert.strictEqual(output.shape, testCase.shape);

                const violations = checkShapeContract(output.shape, describeFields(output.fields));

                assert.deepStrictEqual(
                    violations.map((violation) => violation.reason),
                    [],
                );
            });
        }
    });

    describe("agreement with the catalogue", () => {
        for (const testCase of CASES) {
            it(`${testCase.name} publishes only fields the catalogue declares`, async () => {
                const descriptor = algorithmByKey(testCase.key);
                assert.ok(descriptor, `no catalogue descriptor for ${testCase.key}`);

                const declared = new Set(
                    descriptor.fields.map((field) => `${field.kind}.${field.name}:${field.type}`),
                );
                const output = await runCase(testCase);
                const undeclared = output.fields
                    .map((field) => `${field.kind}.${field.name}:${field.type}`)
                    .filter((field) => !declared.has(field));

                assert.deepStrictEqual(undeclared, []);
            });
        }
    });

    describe("caveats", () => {
        for (const testCase of CASES) {
            it(`${testCase.name} says which method produced the numbers`, async () => {
                const output = await runCase(testCase);

                assert.strictEqual(output.caveats.method, testCase.method);
                assert.isTrue(["directed", "undirected", "as-loaded"].includes(output.caveats.direction));
                assert.strictEqual(output.caveats.precision, "f64");
            });
        }

        it("components says which strength ran, because weak and strong differ on a directed graph", async () => {
            const weak = await runCase(CASES.find((entry) => entry.name === "connected components")!);
            const strong = await runCase(CASES.find((entry) => entry.name === "strongly connected components")!);

            assert.isTrue(weak.caveats.notes.some((note) => note.includes("weak")));
            assert.strictEqual(weak.caveats.direction, "undirected");
            assert.isTrue(strong.caveats.notes.some((note) => note.includes("strong")));
            assert.strictEqual(strong.caveats.direction, "directed");
        });
    });

    describe("the run context", () => {
        for (const testCase of CASES) {
            it(`${testCase.name} reports progress`, async () => {
                const context = recordingContext();
                await runCase(testCase, context);

                assert.isAtLeast(context.reports.length, 1);
                assert.isTrue(context.reports.every((report) => typeof report.phase === "string"));
            });

            it(`${testCase.name} stops when the run is cancelled`, async () => {
                const controller = new AbortController();
                controller.abort();

                let thrown: unknown;
                try {
                    await runCase(testCase, recordingContext(controller.signal));
                } catch (error) {
                    thrown = error;
                }

                assert.instanceOf(thrown, Error, `${testCase.name} ran to completion after being cancelled`);
                assert.strictEqual(thrown.name, "AbortError");
            });
        }
    });

    describe("uniform fields", () => {
        it("a community result publishes a group per node", async () => {
            const output = await runCase(CASES[0]);
            const first = output.nodes?.[0];

            assert.ok(first);
            assert.isNumber(first.values.group);
            assert.isNumber(output.graph?.modularity);
        });

        it("a route publishes membership and position, and what the route costs", async () => {
            const output = await runCase(CASES.find((entry) => entry.name === "dijkstra")!);
            const onRoute = output.nodes?.filter((node) => node.values.onPath === true) ?? [];

            const {graph} = output;
            assert.ok(graph);
            assert.isAtLeast(onRoute.length, 2);
            assert.strictEqual(graph.length, onRoute.length);
            assert.strictEqual(graph.hops, onRoute.length - 1);
            assert.isNumber(graph.cost);
            assert.deepStrictEqual(
                onRoute.map((node) => node.values.order).sort((left, right) => Number(left) - Number(right)),
                onRoute.map((_node, index) => index),
            );
            assert.isTrue(output.edges?.some((edge) => edge.values.onPath === true));
        });

        it("a set publishes membership per element and one headline number", async () => {
            const output = await runCase(CASES.find((entry) => entry.name === "kruskal")!);
            const chosen = output.edges?.filter((edge) => edge.values.in === true) ?? [];

            // A spanning tree of six nodes has five edges, whichever edges they are.
            assert.strictEqual(chosen.length, 5);
            assert.isNumber(output.graph?.totalWeight);
        });
    });

    describe("what the 1.x entry point leaves behind", () => {
        it("publishes a result, rather than scattering values onto the render objects", async () => {
            const graph = await createMockGraph(FIXTURE);
            const algorithm = new LouvainAlgorithm(graph);
            await algorithm.run();

            const { result } = algorithm;
            assert.ok(result);
            assert.isNumber(result.node("A")?.group);
        });

        it("carries the fields the element filled, not only the ones the algorithm returned", async () => {
            const graph = await createMockGraph(FIXTURE);
            const algorithm = new LouvainAlgorithm(graph);
            await algorithm.run();

            // groupSize is derived where the result is built; the algorithm never counts it.
            const { result } = algorithm;
            assert.ok(result);
            assert.isNumber(result.node("A")?.groupSize);
        });
    });
});
