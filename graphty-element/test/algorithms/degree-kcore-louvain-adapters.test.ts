/**
 * @file Degree, k-core and Louvain over the graph snapshot, against the route they replaced.
 *
 * The three used to copy the snapshot into an `@graphty/algorithms` object graph and call the
 * reference implementation on it. Degree now reads the input snapshot's degree views, and k-core
 * and Louvain run the index-based ports through the dispatcher. The element forwards neither of
 * those two to an accelerator, so they stay on the CPU port under every policy. What is checked
 * here is that a reader sees the same numbers as before -- identical degrees and core numbers,
 * Louvain's modularity no more than 0.01 below the reference's -- and that the routing holds.
 */

import { indexed, kCoreDecomposition, louvain } from "@graphty/algorithms";
import type { U32 } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { DegreeAlgorithm } from "../../src/algorithms/DegreeAlgorithm";
import { createScopedInput } from "../../src/algorithms/input/ScopedInput";
import { KCoreAlgorithm } from "../../src/algorithms/KCoreAlgorithm";
import { LouvainAlgorithm } from "../../src/algorithms/LouvainAlgorithm";
import { type AlgorithmOutput, detachedRunContext } from "../../src/algorithms/results";
import { toAlgorithmGraph } from "../../src/algorithms/utils/snapshotGraph";
import type { NodeId } from "../../src/catalog/types";
import type { Graph } from "../../src/Graph";
import { createFakeAccelerator } from "../../src/testing/fakeAccelerator";
import { createMockGraph, type MockGraphOpts } from "../helpers/mockGraph";

/** A directed graph with a reciprocal pair, a self-loop, a parallel pair and an isolated node. */
const MIXED: MockGraphOpts = {
    nodes: ["A", "B", "C", "D", "E", "F", "G"].map((id) => ({ id })),
    edges: [
        { srcId: "A", dstId: "B" },
        { srcId: "B", dstId: "A" },
        { srcId: "B", dstId: "C" },
        { srcId: "C", dstId: "D" },
        { srcId: "C", dstId: "D" },
        { srcId: "D", dstId: "B" },
        { srcId: "E", dstId: "E" },
        { srcId: "E", dstId: "C" },
        { srcId: "A", dstId: "D" },
    ],
};

/** Weighted: two heavy triangles joined by a light bridge, so the weights decide the partition. */
const WEIGHTED: MockGraphOpts = {
    nodes: ["A", "B", "C", "D", "E", "F"].map((id) => ({ id })),
    edges: [
        { srcId: "A", dstId: "B", weight: 5 },
        { srcId: "B", dstId: "C", weight: 5 },
        { srcId: "C", dstId: "A", weight: 5 },
        { srcId: "C", dstId: "D", weight: 0.25 },
        { srcId: "D", dstId: "E", weight: 5 },
        { srcId: "E", dstId: "F", weight: 5 },
        { srcId: "F", dstId: "D", weight: 5 },
    ],
};

const FIXTURES: readonly [string, MockGraphOpts][] = [
    ["les miserables", { dataPath: "./data4.json" }],
    ["a mixed directed graph", MIXED],
    ["the mixed graph loaded undirected", { ...MIXED, directed: false }],
    ["a weighted graph", WEIGHTED],
];

/**
 * A metric run's published node values, keyed by node id.
 * @param graph - The graph the run was over.
 * @param run - The finished run.
 * @param run.result - Its result.
 * @returns One entry per node.
 */
function published(
    graph: Graph,
    run: { result?: { node: (id: NodeId) => Record<string, unknown> | undefined } },
): Map<NodeId, Record<string, unknown>> {
    const { result } = run;
    assert.isDefined(result);
    return new Map([...graph.getDataManager().nodes.keys()].map((id) => [id, result.node(id) ?? {}]));
}

/**
 * Run Louvain and hand back what it published.
 * @param algorithm - The run.
 * @returns Its output.
 */
async function computed(algorithm: LouvainAlgorithm): Promise<AlgorithmOutput> {
    const output = await algorithm.compute(detachedRunContext());
    assert.isNotNull(output);
    return output;
}

/**
 * The ids of the nodes that carry a self-loop.
 * @param graph - The graph.
 * @returns Those ids.
 */
function selfLooped(graph: Graph): Set<NodeId> {
    return new Set([...graph.getDataManager().edges.values()].filter((e) => e.srcId === e.dstId).map((e) => e.srcId));
}

describe("degree, k-core and louvain give the numbers the reference route gave", () => {
    for (const [name, fixture] of FIXTURES) {
        describe(name, () => {
            it("degree: identical in-, out- and total degree", async () => {
                const graph = await createMockGraph(fixture);
                const run = new DegreeAlgorithm(graph);
                await run.run();

                const reference = toAlgorithmGraph(graph.getDataManager(), "directed");
                const values = published(graph, run);
                assert.strictEqual(values.size, graph.getDataManager().nodes.size);
                for (const [id, value] of values) {
                    const inDegree = reference.inDegree(id);
                    const outDegree = reference.outDegree(id);
                    assert.deepInclude(
                        value,
                        { inDegree, outDegree, value: inDegree + outDegree },
                        `degree of ${String(id)}`,
                    );
                }
            });

            it("k-core: identical core numbers on every node without a self-loop", async () => {
                const graph = await createMockGraph(fixture);
                const run = new KCoreAlgorithm(graph);
                await run.run();

                /* The reference counted a node's self-loop as one of its own neighbours. A core
                   number is defined on the simple graph underneath, as NetworkX defines it, and
                   the port counts a self-loop not at all; the self-loop case is pinned below. */
                const loops = selfLooped(graph);
                const { coreness } = kCoreDecomposition(toAlgorithmGraph(graph.getDataManager(), "undirected"));
                for (const [id, value] of published(graph, run)) {
                    if (!loops.has(id)) {
                        assert.strictEqual(value.value, coreness.get(String(id)), `core number of ${String(id)}`);
                    }
                }
                assert.strictEqual(run.result?.summary().caveats.precision, "f64");
            });

            it("louvain: every node grouped, at a modularity at most 0.01 below the reference partition's", async () => {
                const graph = await createMockGraph(fixture);
                const output = await computed(new LouvainAlgorithm(graph));
                assert.strictEqual(output.nodes?.length, graph.getDataManager().nodes.size);
                assert.strictEqual(output.caveats.precision, "f64");

                /* Both partitions are scored by one definition over the snapshot the run read. The
                   reference's own modularity counts a self-loop once in a node's degree, so its
                   degrees do not sum to 2m; the port counts it twice, as NetworkX does. On a graph
                   with a self-loop the two published numbers differ for the same partition. */
                const snapshot = createScopedInput(graph.getDataManager(), "undirected").subgraph();
                const labelsOf = (groupOf: (id: NodeId) => number): U32 =>
                    Uint32Array.from({ length: snapshot.nodeCount }, (_, i) => groupOf(snapshot.ids.idOf(i)));
                const published = new Map(output.nodes?.map((n) => [n.id, n.values.group as number]));
                const portQ = indexed.modularity(
                    snapshot,
                    labelsOf((id) => published.get(id) ?? -1),
                );
                assert.approximately(output.graph?.modularity as number, portQ, 1e-9);

                const reference = louvain(toAlgorithmGraph(graph.getDataManager(), "undirected"));
                const referenceGroup = new Map<NodeId, number>();
                reference.communities.forEach((members, group) => {
                    for (const id of members) {
                        referenceGroup.set(id, group);
                    }
                });
                const referenceQ = indexed.modularity(
                    snapshot,
                    labelsOf((id) => referenceGroup.get(id) ?? -1),
                );
                // The port is not move-for-move identical to the reference, so the partitions can
                // differ; the quality they reach is what is held to the reference's.
                assert.isAtLeast(portQ, referenceQ - 0.01);
            });
        });
    }

    it("k-core: a node whose only extra edge is a self-loop sits in the 1-core", async () => {
        // E has a self-loop and one edge to C. The reference put it in the 2-core.
        const graph = await createMockGraph(MIXED);
        const run = new KCoreAlgorithm(graph);
        await run.run();
        assert.strictEqual(published(graph, run).get("E")?.value, 1);
    });

    it("louvain: the weights decide the partition, two heavy triangles apart", async () => {
        const graph = await createMockGraph(WEIGHTED);
        const output = await computed(new LouvainAlgorithm(graph));
        const group = new Map(output.nodes?.map((n) => [n.id, n.values.group]));
        assert.strictEqual(group.get("A"), group.get("B"));
        assert.strictEqual(group.get("B"), group.get("C"));
        assert.strictEqual(group.get("D"), group.get("E"));
        assert.strictEqual(group.get("E"), group.get("F"));
        assert.notStrictEqual(group.get("A"), group.get("D"));
    });

    it("louvain passes resolution through: a higher one never finds fewer groups", async () => {
        const graph = await createMockGraph({ dataPath: "./data4.json" });
        const count = (output: AlgorithmOutput): number => new Set(output.nodes?.map((n) => n.values.group)).size;
        const low = await computed(new LouvainAlgorithm(graph, { resolution: 0.2 }));
        const high = await computed(new LouvainAlgorithm(graph, { resolution: 3 }));
        assert.isBelow(count(low), count(high));
    });

    it("louvain runs useOptimized off on the one implementation there is, and says so", async () => {
        const graph = await createMockGraph(MIXED);
        const on = await computed(new LouvainAlgorithm(graph));
        const off = await computed(new LouvainAlgorithm(graph, { useOptimized: false }));
        assert.deepStrictEqual(off.nodes, on.nodes);
        assert.strictEqual(off.graph?.modularity, on.graph?.modularity);
        assert.isTrue(off.caveats.notes.some((note) => note.includes("useOptimized is off")));
        assert.isFalse(on.caveats.notes.some((note) => note.includes("useOptimized")));
    });
});

describe("k-core and louvain stay on the CPU port", () => {
    for (const policy of ["auto", "required"] as const) {
        it(`under ${policy}, even with an accelerator that implements both`, async () => {
            // The element forwards neither member, so the controller is not asked: the accelerator
            // is never planned, never labelled f32, and never made to fail the run.
            const calls: string[] = [];
            const fake = createFakeAccelerator({
                members: {
                    kCoreDecomposition: () => {
                        calls.push("kCoreDecomposition");
                        return Promise.reject(new Error("not here"));
                    },
                    louvain: () => {
                        calls.push("louvain");
                        return Promise.reject(new Error("not here"));
                    },
                },
            });
            const graph = await createMockGraph(MIXED);
            graph.acceleration.setPolicy(policy);
            graph.acceleration.setAccelerator(fake);

            const core = new KCoreAlgorithm(graph);
            await core.run();
            const communities = await computed(new LouvainAlgorithm(graph));

            assert.deepStrictEqual(calls, []);
            assert.strictEqual(core.result?.summary().caveats.precision, "f64");
            assert.strictEqual(communities.caveats.precision, "f64");
        });
    }
});
