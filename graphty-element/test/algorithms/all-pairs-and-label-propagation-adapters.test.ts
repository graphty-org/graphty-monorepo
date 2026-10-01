/**
 * @file Floyd-Warshall and label propagation, run through `accelerated()`.
 *
 * Both run on the index-based CPU port below their routing floors, whatever accelerator is
 * attached: one that implements the member is never asked, and the run says its numbers are double
 * precision. What each publishes is checked against answers worked out by hand. The routing above
 * the floors is in `accelerated-new-capabilities.test.ts`.
 */

import { assert, describe, it } from "vitest";

import { AccelerationController } from "../../src/acceleration/AccelerationController";
import { AcceleratorRegistry } from "../../src/acceleration/registry";
import { FloydWarshallAlgorithm } from "../../src/algorithms/FloydWarshallAlgorithm";
import { LabelPropagationAlgorithm } from "../../src/algorithms/LabelPropagationAlgorithm";
import { type AlgorithmOutput, detachedRunContext } from "../../src/algorithms/results";
import { isGraphtyError } from "../../src/errors";
import type { Graph } from "../../src/Graph";
import { createFakeAccelerator } from "../../src/testing/fakeAccelerator";
import { createMockGraph, type MockGraphOpts } from "../helpers/mockGraph";

/** A weighted path A -1- B -2- C -3- D. */
const PATH: MockGraphOpts = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }],
    edges: [
        { srcId: "A", dstId: "B", weight: 1 },
        { srcId: "B", dstId: "C", weight: 2 },
        { srcId: "C", dstId: "D", weight: 3 },
    ],
};

/** Two triangles and a node on its own: three groups, whatever the seed. */
const TWO_TRIANGLES: MockGraphOpts = {
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "x" }, { id: "y" }, { id: "z" }, { id: "alone" }],
    edges: [
        { srcId: "a", dstId: "b", weight: 1 },
        { srcId: "b", dstId: "c", weight: 1 },
        { srcId: "c", dstId: "a", weight: 1 },
        { srcId: "x", dstId: "y", weight: 1 },
        { srcId: "y", dstId: "z", weight: 1 },
        { srcId: "z", dstId: "x", weight: 1 },
    ],
};

/** A ring of eight: every node ties between its two neighbours, so the seed decides the groups. */
const RING: MockGraphOpts = {
    nodes: Array.from({ length: 8 }, (_, i) => ({ id: `n${String(i)}` })),
    edges: Array.from({ length: 8 }, (_, i) => ({
        srcId: `n${String(i)}`,
        dstId: `n${String((i + 1) % 8)}`,
        weight: 1,
    })),
};

/**
 * Run a declared algorithm and hand back what it published.
 * @param algorithm - The algorithm to run.
 * @returns Its output.
 */
async function computed(algorithm: {
    compute: (context: ReturnType<typeof detachedRunContext>) => Promise<AlgorithmOutput | null>;
}): Promise<AlgorithmOutput> {
    const output = await algorithm.compute(detachedRunContext());
    assert.isNotNull(output);
    return output;
}

/**
 * The published node values, keyed by id.
 * @param output - What the run published.
 * @returns One entry per published node.
 */
function nodeValues(output: AlgorithmOutput): Map<unknown, Record<string, unknown>> {
    return new Map((output.nodes ?? []).map((node) => [node.id, node.values]));
}

/**
 * A graph with an accelerator attached that implements both members and counts every call.
 * @param opts - The records to build it from.
 * @returns The graph and the call counts.
 */
async function withImplementingAccelerator(
    opts: MockGraphOpts,
    policy: "auto" | "required" = "auto",
): Promise<{ graph: Graph; calls: { allPairsShortestPath: number; labelPropagation: number } }> {
    const calls = { allPairsShortestPath: 0, labelPropagation: 0 };
    const fake = createFakeAccelerator({
        members: {
            allPairsShortestPath: (): Promise<never> => {
                calls.allPairsShortestPath++;
                return Promise.reject(new Error("the fake all-pairs member was called"));
            },
            labelPropagation: (): Promise<never> => {
                calls.labelPropagation++;
                return Promise.reject(new Error("the fake label propagation member was called"));
            },
        },
    });
    const graph = await createMockGraph(opts);
    // A controller with the built-in floors in force: the mock's own sets its threshold to 0.
    (graph as unknown as { acceleration: AccelerationController }).acceleration = new AccelerationController({
        policy,
        registry: new AcceleratorRegistry(),
    });
    graph.acceleration.setAccelerator(fake);
    return { graph, calls };
}

describe("FloydWarshallAlgorithm through accelerated()", () => {
    it("publishes each node's eccentricity and the graph's diameter and radius", async () => {
        const output = await computed(new FloydWarshallAlgorithm(await createMockGraph(PATH)));

        const values = nodeValues(output);
        assert.deepStrictEqual(
            ["A", "B", "C", "D"].map((id) => values.get(id)?.value),
            [6, 5, 3, 6],
        );
        assert.deepStrictEqual(output.graph, { diameter: 6, radius: 3, hasNegativeCycle: false });
        assert.strictEqual(output.caveats.precision, "f64");
    });

    it("measures across the cheapest of a group of parallel edges", async () => {
        const output = await computed(
            new FloydWarshallAlgorithm(
                await createMockGraph({
                    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
                    edges: [
                        { srcId: "A", dstId: "B", weight: 1 },
                        { srcId: "A", dstId: "B", weight: 4 },
                        { srcId: "B", dstId: "C", weight: 1 },
                    ],
                }),
            ),
        );

        // Summed, A-B would cost 5 and the diameter 6; the cheapest edge makes it 1 and 2.
        assert.strictEqual(nodeValues(output).get("A")?.value, 2);
        assert.strictEqual(output.graph?.diameter, 2);
        assert.strictEqual(output.graph?.radius, 1);
    });

    it("skips unreachable nodes, so a graph in pieces keeps a finite diameter", async () => {
        const output = await computed(
            new FloydWarshallAlgorithm(
                await createMockGraph({
                    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
                    edges: [{ srcId: "A", dstId: "B", weight: 2 }],
                }),
            ),
        );

        const values = nodeValues(output);
        assert.strictEqual(values.get("A")?.value, 2);
        assert.strictEqual(values.get("C")?.value, 0);
        assert.strictEqual(output.graph?.diameter, 2);
        assert.strictEqual(output.graph?.radius, 0);
    });

    it("measures a graph with a weight above the f32 range instead of refusing it", async () => {
        // The snapshot holds f32 weights; 1e39 would be Infinity there, which the all-pairs run
        // refuses. The element reads such a weight as it reads an infinite one: as no weight, 1.
        const output = await computed(
            new FloydWarshallAlgorithm(
                await createMockGraph({
                    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
                    edges: [
                        { srcId: "A", dstId: "B", weight: 1 },
                        { srcId: "B", dstId: "C", weight: 1e39 },
                    ],
                }),
            ),
        );

        assert.deepStrictEqual(output.graph, { diameter: 2, radius: 1, hasNegativeCycle: false });
    });

    it("reports a negative cycle and publishes no distance", async () => {
        // An undirected edge of negative weight is a negative cycle: cross it and come back.
        const output = await computed(
            new FloydWarshallAlgorithm(
                await createMockGraph({
                    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
                    edges: [
                        { srcId: "A", dstId: "B", weight: -1 },
                        { srcId: "B", dstId: "C", weight: 2 },
                    ],
                }),
            ),
        );

        assert.strictEqual(output.graph?.hasNegativeCycle, true);
        assert.strictEqual(nodeValues(output).size, 0);
        assert.notProperty(output.graph, "diameter");
        assert.notProperty(output.graph, "radius");
    });

    it("refuses a graph above the all-pairs node bound before any work starts", async () => {
        const nodes = Array.from({ length: 5793 }, (_, i) => ({ id: i }));
        const { graph, calls } = await withImplementingAccelerator({ nodes, edges: [] });

        let caught: unknown;
        try {
            await new FloydWarshallAlgorithm(graph).compute(detachedRunContext());
        } catch (error) {
            caught = error;
        }

        assert.isTrue(isGraphtyError(caught), `expected a GraphtyError, got ${String(caught)}`);
        const error = caught as { code: string; details?: unknown };
        assert.strictEqual(error.code, "E_TOO_LARGE");
        assert.deepInclude(error.details, { nodeCount: 5793, limit: 5792 });
        assert.strictEqual(calls.allPairsShortestPath, 0);
    });

    it("runs on the CPU port with an accelerator that implements the member attached", async () => {
        const { graph, calls } = await withImplementingAccelerator(PATH);
        const output = await computed(new FloydWarshallAlgorithm(graph));

        assert.strictEqual(calls.allPairsShortestPath, 0);
        assert.strictEqual(output.caveats.precision, "f64");
        assert.strictEqual(output.graph?.diameter, 6);
    });
});

describe("LabelPropagationAlgorithm through accelerated()", () => {
    it("groups two triangles and a lone node into three communities", async () => {
        const output = await computed(new LabelPropagationAlgorithm(await createMockGraph(TWO_TRIANGLES)));

        const group = nodeValues(output);
        assert.strictEqual(group.size, 7);
        assert.strictEqual(group.get("a")?.group, group.get("b")?.group);
        assert.strictEqual(group.get("a")?.group, group.get("c")?.group);
        assert.strictEqual(group.get("x")?.group, group.get("y")?.group);
        assert.strictEqual(group.get("x")?.group, group.get("z")?.group);
        assert.strictEqual(new Set([...group.values()].map((value) => value.group)).size, 3);

        assert.strictEqual(output.caveats.precision, "f64");
        // No seed: the synchronous definition, which has none to report.
        assert.isUndefined(output.caveats.seed);
        assert.strictEqual(output.caveats.method, "label-propagation-synchronous");
        assert.strictEqual(output.caveats.converged, true);
    });

    it("gives one partition per seed", async () => {
        const graph = await createMockGraph(TWO_TRIANGLES);
        const first = await computed(new LabelPropagationAlgorithm(graph, { randomSeed: 7 }));
        const second = await computed(new LabelPropagationAlgorithm(graph, { randomSeed: 7 }));

        assert.deepStrictEqual(first.nodes, second.nodes);
        assert.strictEqual(first.caveats.seed, 7);
    });

    it("hands the seed to the run, so a different seed can give a different partition", async () => {
        const graph = await createMockGraph(RING);
        const groups = async (randomSeed: number): Promise<unknown[]> =>
            (await computed(new LabelPropagationAlgorithm(graph, { randomSeed }))).nodes?.map(
                (node) => node.values.group,
            ) ?? [];

        // Worked out on the port: seed 42 settles the ring into one group, seed 2 into two.
        assert.deepStrictEqual(await groups(42), [0, 0, 0, 0, 0, 0, 0, 0]);
        assert.deepStrictEqual(await groups(2), [0, 0, 0, 0, 1, 1, 0, 0]);
    });

    it("hands maxIterations to the run, so a capped run stops there unconverged", async () => {
        const output = await computed(
            new LabelPropagationAlgorithm(await createMockGraph(RING), { maxIterations: 1, randomSeed: 42 }),
        );

        assert.strictEqual(output.caveats.iterations, 1);
        assert.strictEqual(output.caveats.converged, false);
    });

    it("runs on the CPU port with an accelerator that implements the member attached", async () => {
        const { graph, calls } = await withImplementingAccelerator(TWO_TRIANGLES);
        const output = await computed(new LabelPropagationAlgorithm(graph));

        assert.strictEqual(calls.labelPropagation, 0);
        assert.strictEqual(output.caveats.precision, "f64");
        assert.strictEqual(new Set([...nodeValues(output).values()].map((value) => value.group)).size, 3);
    });
});

describe("under acceleration=required both reach the accelerator at any size", () => {
    it("hands both to an accelerator that implements the members, and its failure is the run's", async () => {
        const path = await withImplementingAccelerator(PATH, "required");
        let allPairs: unknown;
        try {
            await computed(new FloydWarshallAlgorithm(path.graph));
        } catch (error) {
            allPairs = error;
        }
        assert.strictEqual(path.calls.allPairsShortestPath, 1);
        assert.include(String(allPairs), "the fake all-pairs member was called");

        const triangles = await withImplementingAccelerator(TWO_TRIANGLES, "required");
        let groups: unknown;
        try {
            await computed(new LabelPropagationAlgorithm(triangles.graph));
        } catch (error) {
            groups = error;
        }
        assert.strictEqual(triangles.calls.labelPropagation, 1);
        assert.include(String(groups), "the fake label propagation member was called");
    });

    it("refuses a seeded label propagation, which no accelerator answers, before any work", async () => {
        const { graph, calls } = await withImplementingAccelerator(TWO_TRIANGLES, "required");
        let caught: unknown;
        try {
            await computed(new LabelPropagationAlgorithm(graph, { randomSeed: 7 }));
        } catch (error) {
            caught = error;
        }
        assert.isTrue(isGraphtyError(caught), String(caught));
        assert.strictEqual((caught as { code: string }).code, "E_NO_ACCELERATOR");
        assert.strictEqual(calls.labelPropagation, 0);
    });
});
