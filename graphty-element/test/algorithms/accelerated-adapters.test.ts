/**
 * @file The five adapters that go through `accelerated()`, on both paths.
 *
 * Each of these algorithms has one result-writing loop and two ways of reaching it: the
 * index-based CPU port, and an accelerator that implements the same capability. What is checked
 * here is that the two agree about the answer and disagree about exactly one thing -- the
 * arithmetic the numbers were computed in, which the run publishes as `caveats.precision`.
 *
 * The rest is the seam's own rules. A capability the attached accelerator does not implement is
 * decided before the work starts, and the CPU port runs. A failure AFTER the work started is the
 * run's failure: nothing is quietly recomputed. `acceleration="required"` with no implementation
 * is loud. And a run no accelerator the element hands work to can answer -- a personalized
 * PageRank, a walk that stops at a target, Bellman-Ford, a depth-first walk, Prim, strongly
 * connected components -- runs on the CPU port and says so in its precision.
 *
 * The last block holds each of those runs to the reference implementation in
 * `@graphty/algorithms`, over the same graph, including the neighbour order a walk tries.
 */

import {
    bellmanFord,
    breadthFirstSearch,
    connectedComponents,
    depthFirstSearch,
    dijkstra,
    Graph as ReferenceGraph,
    kruskalMST,
    pageRank,
    primMST,
    stronglyConnectedComponents,
} from "@graphty/algorithms";
import { assert, describe, it } from "vitest";

import { BellmanFordAlgorithm } from "../../src/algorithms/BellmanFordAlgorithm";
import { BFSAlgorithm } from "../../src/algorithms/BFSAlgorithm";
import { ConnectedComponentsAlgorithm } from "../../src/algorithms/ConnectedComponentsAlgorithm";
import { DFSAlgorithm } from "../../src/algorithms/DFSAlgorithm";
import { DijkstraAlgorithm } from "../../src/algorithms/DijkstraAlgorithm";
import { KruskalAlgorithm } from "../../src/algorithms/KruskalAlgorithm";
import { PageRankAlgorithm } from "../../src/algorithms/PageRankAlgorithm";
import { PrimAlgorithm } from "../../src/algorithms/PrimAlgorithm";
import { type AlgorithmOutput, detachedRunContext } from "../../src/algorithms/results";
import { StronglyConnectedComponentsAlgorithm } from "../../src/algorithms/StronglyConnectedComponentsAlgorithm";
import { toAlgorithmGraph } from "../../src/algorithms/utils/snapshotGraph";
import type { NodeId } from "../../src/catalog/types";
import { GraphtyError, isGraphtyError } from "../../src/errors";
import type { Graph } from "../../src/Graph";
import { createFakeAccelerator, type FakeAccelerator } from "../../src/testing/fakeAccelerator";
import { createMockGraph, type MockGraphOpts } from "../helpers/mockGraph";

/**
 * A directed, weighted graph in which every node has an out-edge.
 *
 * No node is dangling, so PageRank's two implementations have no redistribution rule to differ
 * about, and no pair is reciprocal, so the undirected view merges nothing -- the merge is the
 * subject of its own case below. Every weight differs, so the cheapest spanning tree and the
 * cheapest route are each the only one of their cost and a tie-break cannot make two correct
 * implementations disagree.
 */
const FIXTURE: MockGraphOpts = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }],
    edges: [
        { srcId: "A", dstId: "B", weight: 1 },
        { srcId: "B", dstId: "C", weight: 2 },
        { srcId: "C", dstId: "D", weight: 3 },
        { srcId: "D", dstId: "E", weight: 4 },
        { srcId: "E", dstId: "A", weight: 5 },
        { srcId: "B", dstId: "D", weight: 6 },
        { srcId: "C", dstId: "A", weight: 7 },
    ],
};

/**
 * A graph that declares the same pair twice in the same direction.
 *
 * `@graphty/algorithms` cannot hold two edges between one pair, so the element has always merged a
 * parallel group into one edge of the summed weight before running anything over it -- and the
 * caveat a run over a multigraph carries says so. These cases hold the accelerated route to the
 * same bargain: the route from A to C costs 3 rather than 2, and BOTH records of the A-B pair are
 * flagged, because a style layer bound to the run would otherwise paint one of two coincident
 * lines and leave the other bare.
 */
const PARALLEL: MockGraphOpts = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
    edges: [
        { srcId: "A", dstId: "B", weight: 1 },
        { srcId: "A", dstId: "B", weight: 1 },
        { srcId: "B", dstId: "C", weight: 1 },
    ],
};

/** Two pieces, so a partition has something to partition. */
const TWO_PIECES: MockGraphOpts = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "X" }, { id: "Y" }],
    edges: [
        { srcId: "A", dstId: "B", weight: 1 },
        { srcId: "B", dstId: "C", weight: 1 },
        { srcId: "X", dstId: "Y", weight: 1 },
    ],
};

/**
 * The element's own graph, with an accelerator attached to the controller it owns.
 * @param opts - The records to build it from.
 * @param fake - The accelerator to attach, when the case wants one.
 * @param policy - The acceleration policy, when the case wants one other than `"auto"`.
 * @returns The graph.
 */
async function graphWith(opts: MockGraphOpts, fake?: FakeAccelerator, policy?: "off" | "required"): Promise<Graph> {
    const graph = await createMockGraph(opts);

    if (policy !== undefined) {
        graph.acceleration.setPolicy(policy);
    }

    if (fake !== undefined) {
        graph.acceleration.setAccelerator(fake);
    }

    return graph;
}

/**
 * Run a declared algorithm and hand back what it published.
 * @param algorithm - The algorithm to run.
 * @returns Its output, which the cases below read directly.
 */
async function computed(algorithm: {
    compute: (context: ReturnType<typeof detachedRunContext>) => Promise<AlgorithmOutput | null>;
}): Promise<AlgorithmOutput> {
    const output = await algorithm.compute(detachedRunContext());
    assert.isNotNull(output);
    return output;
}

/**
 * The published values of one half of a result, keyed by element id.
 * @param elements - What the run published.
 * @returns One entry per element.
 */
function valuesOf<T extends NodeId>(
    elements: readonly { id: T; values: Record<string, unknown> }[] | undefined,
): Map<T, Record<string, unknown>> {
    return new Map((elements ?? []).map((element) => [element.id, element.values]));
}

/**
 * What a run threw, as a `GraphtyError`.
 * @param work - The run to make fail.
 * @returns The error it threw.
 */
async function rejection(work: () => Promise<unknown>): Promise<{ code: string; details?: unknown }> {
    try {
        await work();
    } catch (error) {
        assert.isTrue(isGraphtyError(error), `expected a GraphtyError, got ${String(error)}`);
        return error as { code: string; details?: unknown };
    }

    throw new Error("the run was expected to fail and did not");
}

/** A pair key that names an undirected edge whichever way it was declared. */
function pairKey(source: unknown, target: unknown): string {
    return [String(source), String(target)].sort().join("--");
}

describe("the adapters that run through accelerated()", () => {
    describe("the CPU port answers what the reference implementation answers", () => {
        it("pagerank", async () => {
            const graph = await graphWith(FIXTURE);
            const algorithm = new PageRankAlgorithm(graph);
            await algorithm.run();

            const { result } = algorithm;
            assert.isDefined(result);

            /* Both implementations iterate until the L1 change falls below the same tolerance, and
               they sum in a different order, so they agree to that tolerance and not past it.
               Asking for more would be asking two correct answers to be the same answer. */
            const reference = pageRank(toAlgorithmGraph(graph.getDataManager(), "directed"), { useDelta: false });
            for (const id of graph.getDataManager().nodes.keys()) {
                assert.approximately(
                    result.node(id)?.value as number,
                    reference.ranks[String(id)],
                    1e-6,
                    `rank of ${String(id)}`,
                );
            }
        });

        it("dijkstra", async () => {
            const graph = await graphWith(FIXTURE);
            const output = await computed(new DijkstraAlgorithm(graph, { source: "A", target: "E" }));

            const reference = dijkstra(toAlgorithmGraph(graph.getDataManager(), "undirected"), "A");
            const values = valuesOf(output.nodes);
            for (const id of graph.getDataManager().nodes.keys()) {
                assert.strictEqual(values.get(id)?.distance, reference.get(id)?.distance, `distance to ${String(id)}`);
            }

            // The route itself: A and E are joined directly, which is cheaper than going round.
            assert.deepStrictEqual(
                [...values].filter(([, value]) => value.onPath === true).map(([id]) => id),
                ["A", "E"],
            );
            assert.strictEqual(output.graph?.cost, 5);
        });

        it("breadth-first search", async () => {
            const graph = await graphWith(FIXTURE);
            const output = await computed(new BFSAlgorithm(graph, { source: "A" }));

            const levels = new Map<NodeId, number>();
            breadthFirstSearch(toAlgorithmGraph(graph.getDataManager(), "undirected"), "A", {
                visitCallback: (node, level) => levels.set(node, level),
            });

            const values = valuesOf(output.nodes);
            assert.strictEqual(values.size, levels.size);
            for (const [id, level] of levels) {
                assert.strictEqual(values.get(id)?.level, level, `level of ${String(id)}`);
            }
        });

        it("connected components", async () => {
            const graph = await graphWith(TWO_PIECES);
            const output = await computed(new ConnectedComponentsAlgorithm(graph));

            const reference = connectedComponents(toAlgorithmGraph(graph.getDataManager(), "undirected"));
            const values = valuesOf(output.nodes);

            // The partition, not the numbering: two nodes are in the same piece here exactly when
            // the reference implementation puts them in the same piece.
            for (const piece of reference) {
                const groups = new Set(piece.map((id) => values.get(id)?.group));
                assert.strictEqual(groups.size, 1, `the piece ${piece.join(",")} is one group`);
            }

            assert.strictEqual(new Set([...values.values()].map((value) => value.group)).size, reference.length);
        });

        it("kruskal", async () => {
            const graph = await graphWith(FIXTURE);
            const output = await computed(new KruskalAlgorithm(graph));

            const reference = kruskalMST(toAlgorithmGraph(graph.getDataManager(), "undirected"));
            const chosen = new Set(reference.edges.map((edge) => pairKey(edge.source, edge.target)));

            assert.strictEqual(output.graph?.totalWeight, reference.totalWeight);
            for (const edge of graph.getDataManager().edges.values()) {
                const published = valuesOf(output.edges).get(edge.id)?.in;
                assert.strictEqual(published, chosen.has(pairKey(edge.srcId, edge.dstId)), `edge ${edge.id}`);
            }
        });
    });

    describe("with an accelerator that implements the capability", () => {
        it("pagerank runs on it, once, and says the numbers are single precision", async () => {
            const fake = createFakeAccelerator();
            const graph = await graphWith(FIXTURE, fake);
            const algorithm = new PageRankAlgorithm(graph);
            await algorithm.run();

            const { result } = algorithm;
            assert.isDefined(result);
            assert.strictEqual(fake.calls.pageRank, 1);
            assert.strictEqual(result.summary().caveats.precision, "f32");

            // The fake scores every node equally, so the numbers published are ITS numbers.
            for (const id of graph.getDataManager().nodes.keys()) {
                assert.approximately(result.node(id)?.value as number, 1 / 5, 1e-6, `rank of ${String(id)}`);
            }
        });

        it("connected components runs on it, once, and says the numbers are single precision", async () => {
            const fake = createFakeAccelerator();
            const graph = await graphWith(TWO_PIECES, fake);
            const output = await computed(new ConnectedComponentsAlgorithm(graph));

            assert.strictEqual(fake.calls.connectedComponents, 1);
            assert.strictEqual(output.caveats.precision, "f32");

            // The fake puts every node in one piece, which the CPU port would not, so the ids
            // carrying values are carrying the accelerator's answer.
            const values = valuesOf(output.nodes);
            assert.strictEqual(values.size, 5);
            assert.deepStrictEqual(new Set([...values.values()].map((value) => value.group)), new Set([0]));
        });
    });

    describe("with an accelerator that does not implement the capability", () => {
        it("dijkstra runs on the CPU port and says the numbers are double precision", async () => {
            const fake = createFakeAccelerator();
            const graph = await graphWith(FIXTURE, fake);
            const output = await computed(new DijkstraAlgorithm(graph, { source: "A", target: "E" }));

            assert.strictEqual(output.caveats.precision, "f64");
            assert.strictEqual(output.graph?.cost, 5);
        });

        it("breadth-first search runs on the CPU port and says the numbers are double precision", async () => {
            const fake = createFakeAccelerator();
            const graph = await graphWith(FIXTURE, fake);
            const output = await computed(new BFSAlgorithm(graph, { source: "A" }));

            assert.strictEqual(output.caveats.precision, "f64");
            assert.strictEqual(valuesOf(output.nodes).get("A")?.level, 0);
        });

        it("kruskal runs on the CPU port and says the numbers are double precision", async () => {
            const fake = createFakeAccelerator();
            const graph = await graphWith(FIXTURE, fake);
            const output = await computed(new KruskalAlgorithm(graph));

            assert.strictEqual(output.caveats.precision, "f64");
            assert.strictEqual(output.graph?.totalWeight, 10);
        });
    });

    it("a device lost mid-run fails the run with its code, and no result is published", async () => {
        const fake = createFakeAccelerator({
            members: {
                pageRank: (): Promise<never> =>
                    Promise.reject(
                        new GraphtyError({
                            code: "E_DEVICE_LOST",
                            message: "the fake device was lost",
                            source: "acceleration",
                        }),
                    ),
            },
        });
        const graph = await graphWith(FIXTURE, fake);
        const algorithm = new PageRankAlgorithm(graph);

        const error = await rejection(() => algorithm.run());

        assert.strictEqual(error.code, "E_DEVICE_LOST");
        // Nothing was recomputed on the CPU: the run has no numbers at all.
        assert.isUndefined(algorithm.result);
    });

    it("acceleration required, and the accelerator cannot do the work, fails before anything ran", async () => {
        const fake = createFakeAccelerator();
        const graph = await graphWith(FIXTURE, fake, "required");
        const algorithm = new DijkstraAlgorithm(graph, { source: "A", target: "E" });

        const error = await rejection(() => algorithm.compute(detachedRunContext()));

        assert.strictEqual(error.code, "E_NO_ACCELERATOR");
        assert.deepInclude(error.details, { capability: "sssp" });
    });

    describe("what no accelerator answers runs on the CPU port, and says so", () => {
        it("pagerank with a personalization vector", async () => {
            const fake = createFakeAccelerator({ members: { personalizedPageRank: spy() } });
            const graph = await graphWith(FIXTURE, fake);
            const personalization = new Map([["A", 1]]);
            const algorithm = new PageRankAlgorithm(graph, { personalization });
            await algorithm.run();

            const { result } = algorithm;
            assert.isDefined(result);

            const { caveats } = result.summary();
            assert.strictEqual(fake.calls.pageRank, 0);
            assert.strictEqual(called(fake, "personalizedPageRank"), 0);
            assert.strictEqual(caveats.precision, "f64");
        });

        it("pagerank over an undirected graph", async () => {
            const fake = createFakeAccelerator();
            const graph = await graphWith({ ...FIXTURE, directed: false }, fake);
            const algorithm = new PageRankAlgorithm(graph);
            await algorithm.run();

            const { result } = algorithm;
            assert.isDefined(result);

            const { caveats } = result.summary();
            assert.strictEqual(fake.calls.pageRank, 0);
            assert.strictEqual(caveats.precision, "f64");
            assert.strictEqual(caveats.direction, "undirected");
        });

        it("a breadth-first walk that stops at a target, even with an accelerator that walks", async () => {
            const fake = createFakeAccelerator({ members: { breadthFirstSearch: spy() } });
            const graph = await graphWith(FIXTURE, fake);
            const output = await computed(new BFSAlgorithm(graph, { source: "A", targetNode: "C" }));

            assert.strictEqual(called(fake, "breadthFirstSearch"), 0);
            assert.strictEqual(output.caveats.precision, "f64");
            assert.strictEqual(output.graph?.targetFound, true);
            assert.isTrue(
                output.caveats.notes.some((note) => note.includes("stopped at C")),
                output.caveats.notes.join(" | "),
            );
        });

        it("bellman-ford, although the accelerator implements it: the element does not hand it over", async () => {
            const fake = createFakeAccelerator({ members: { bellmanFord: spy() } });
            const graph = await graphWith(FIXTURE, fake);
            const output = await computed(new BellmanFordAlgorithm(graph, { source: "A", target: "E" }));

            assert.strictEqual(called(fake, "bellmanFord"), 0);
            assert.strictEqual(output.caveats.precision, "f64");
        });

        it("under acceleration required, a run no accelerator answers fails before anything ran", async () => {
            const fake = createFakeAccelerator({ members: { bellmanFord: spy() } });
            const graph = await graphWith(FIXTURE, fake, "required");

            for (const [algorithm, capability] of [
                [new BellmanFordAlgorithm(graph, { source: "A" }), "bellmanFord"],
                [new DFSAlgorithm(graph, { source: "A" }), "depthFirstSearch"],
                [new PrimAlgorithm(graph), "primMST"],
                [new StronglyConnectedComponentsAlgorithm(graph), "stronglyConnectedComponents"],
            ] as const) {
                const error = await rejection(() => algorithm.compute(detachedRunContext()));
                assert.strictEqual(error.code, "E_NO_ACCELERATOR", capability);
                assert.deepInclude(error.details, { capability });
            }

            assert.strictEqual(called(fake, "bellmanFord"), 0);
        });
    });

    it("kruskal flags both edges of a reciprocal pair the undirected view merged into one", async () => {
        const graph = await graphWith({
            nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
            edges: [
                { srcId: "A", dstId: "B", weight: 1 },
                { srcId: "B", dstId: "A", weight: 1 },
                { srcId: "B", dstId: "C", weight: 1 },
            ],
        });
        const output = await computed(new KruskalAlgorithm(graph));

        /* The tree is chosen over the merged edge space, where A and B are joined by ONE edge. Read
           back onto the graph the reader declared, both records of that pair are on the tree: a
           result that flagged only the merged edge's survivor would leave one of the two edges the
           reader can see unstyled. */
        const values = valuesOf(output.edges);
        assert.strictEqual(values.size, 3);
        assert.deepStrictEqual(
            [...values.values()].map((value) => value.in),
            [true, true, true],
        );
    });

    it("dijkstra flags both edges of a reciprocal pair the undirected view merged into one", async () => {
        const graph = await graphWith({
            nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
            edges: [
                { srcId: "A", dstId: "B", weight: 1 },
                { srcId: "B", dstId: "A", weight: 1 },
                { srcId: "B", dstId: "C", weight: 1 },
            ],
        });
        const output = await computed(new DijkstraAlgorithm(graph, { source: "A", target: "C" }));

        // The route crosses the merged A-B edge, and both records the reader declared are on it.
        const values = valuesOf(output.edges);
        assert.strictEqual(values.size, 3);
        assert.deepStrictEqual(
            [...values.values()].map((value) => value.onPath),
            [true, true, true],
        );
    });

    describe("over a multigraph, a parallel group is one edge", () => {
        it("dijkstra costs the cheapest edge of the group and flags only the edge the route took", async () => {
            const graph = await graphWith(PARALLEL);
            const output = await computed(new DijkstraAlgorithm(graph, { source: "A", target: "C" }));

            // A route takes one of the parallel edges, the cheapest: A-B at 1, then B-C at 1.
            assert.strictEqual(output.graph?.cost, 2);

            // The two A-B edges tie, so the route took the first; the other is off the route, and a
            // path set made from the run names one edge per step (design/sets 4.4).
            const values = valuesOf(output.edges);
            assert.deepStrictEqual(
                [...values.values()].map((value) => value.onPath),
                [true, false, true],
            );
        });

        it("kruskal costs the merged weight and flags every member of the group", async () => {
            const graph = await graphWith(PARALLEL);
            const output = await computed(new KruskalAlgorithm(graph));

            const reference = kruskalMST(toAlgorithmGraph(graph.getDataManager(), "undirected"));
            assert.strictEqual(output.graph?.totalWeight, reference.totalWeight);
            assert.strictEqual(output.graph?.totalWeight, 3);

            const values = valuesOf(output.edges);
            assert.deepStrictEqual(
                [...values.values()].map((value) => value.in),
                [true, true, true],
            );
        });
    });

    it("a source the graph does not have is reported as the option it came from", async () => {
        const graph = await graphWith(FIXTURE);
        const algorithm = new DijkstraAlgorithm(graph, { source: "nowhere", target: "E" });

        const error = await rejection(() => algorithm.compute(detachedRunContext()));

        assert.strictEqual(error.code, "E_OPTION_RANGE");
        assert.deepInclude(error.details, { option: "source", value: "nowhere" });
    });

    it("a target the graph does not have is reported the same way, not as an empty route", async () => {
        const graph = await graphWith(FIXTURE);
        const algorithm = new DijkstraAlgorithm(graph, { source: "A", target: "nowhere" });

        const error = await rejection(() => algorithm.compute(detachedRunContext()));

        assert.strictEqual(error.code, "E_OPTION_RANGE");
        assert.deepInclude(error.details, { option: "target", value: "nowhere" });
    });
});

/**
 * An undirected walk's fixture whose declaration order is not its node order: A's edges are
 * declared to D, then B, then C. The reference implementation tries neighbours in the order their
 * edges were declared, so a walk that tried them in node order would reach them in another order.
 * Every weight differs, so a tree and a route are each the only one of their cost.
 */
const DECLARED_ORDER: MockGraphOpts = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }, { id: "F" }],
    edges: [
        { srcId: "A", dstId: "D", weight: 1 },
        { srcId: "A", dstId: "B", weight: 2 },
        { srcId: "D", dstId: "E", weight: 3 },
        { srcId: "B", dstId: "C", weight: 4 },
        { srcId: "C", dstId: "F", weight: 5 },
        { srcId: "E", dstId: "F", weight: 6 },
        { srcId: "A", dstId: "C", weight: 7 },
    ],
};

/** Two strongly connected pieces and a loner, declared out of node order. */
const STRONG: MockGraphOpts = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }, { id: "F" }],
    edges: [
        { srcId: "C", dstId: "A" },
        { srcId: "A", dstId: "B" },
        { srcId: "B", dstId: "C" },
        { srcId: "B", dstId: "D" },
        { srcId: "D", dstId: "E" },
        { srcId: "E", dstId: "D" },
        { srcId: "F", dstId: "E" },
    ],
};

/** A reciprocal pair the undirected view merges into one edge, and one more edge. */
const RECIPROCAL: MockGraphOpts = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
    edges: [
        { srcId: "A", dstId: "B", weight: 1 },
        { srcId: "B", dstId: "A", weight: 1 },
        { srcId: "B", dstId: "C", weight: 1 },
    ],
};

/** A directed graph with a dangling node, D, so PageRank's redistribution rule is exercised. */
const DANGLING: MockGraphOpts = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }],
    edges: [
        { srcId: "A", dstId: "B", weight: 1 },
        { srcId: "B", dstId: "C", weight: 2 },
        { srcId: "C", dstId: "A", weight: 3 },
        { srcId: "C", dstId: "D", weight: 5 },
    ],
};

/**
 * An accelerator member that records it was called and never answers.
 * @returns The member.
 */
function spy(): { (): Promise<never>; calls: number } {
    const member = (): Promise<never> => {
        member.calls++;
        return Promise.reject(new Error("the element was not meant to call this member"));
    };
    member.calls = 0;
    return member;
}

/**
 * How many times a spied member was called.
 * @param fake - The accelerator the spy was attached to.
 * @param member - The member's name.
 * @returns The call count.
 */
function called(fake: FakeAccelerator, member: string): number {
    return (fake as unknown as Record<string, { calls: number }>)[member].calls;
}

/**
 * The published values of every edge, in the order the graph declared them.
 * @param graph - The graph the run was over.
 * @param output - What the run published.
 * @param field - The edge field to read.
 * @returns One value per declared edge.
 */
function edgeFlags(graph: Graph, output: AlgorithmOutput, field: string): unknown[] {
    const values = valuesOf(output.edges);
    return [...graph.getDataManager().edges.values()].map((edge) => values.get(edge.id)?.[field]);
}

describe("the traversal, path and tree adapters answer what the reference implementation answers", () => {
    it("breadth-first search with a target expands the nodes the reference expands, in its order", async () => {
        const graph = await graphWith(DECLARED_ORDER);
        const output = await computed(new BFSAlgorithm(graph, { source: "A", targetNode: "E" }));

        const expected: [NodeId, number][] = [];
        breadthFirstSearch(toAlgorithmGraph(graph.getDataManager(), "undirected"), "A", {
            targetNode: "E",
            visitCallback: (node, level) => expected.push([node, level]),
        });

        // D is declared before B and C, so the walk reaches E before F; in node order it would not.
        assert.deepStrictEqual(
            expected.map(([id]) => id),
            ["A", "D", "B", "C", "E"],
        );
        const values = valuesOf(output.nodes);
        assert.deepStrictEqual(
            [...values].map(([id, value]) => [id, value.level, value.order]),
            expected
                .map(([id, level], order) => [id, level, order])
                .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
        );
        assert.strictEqual(output.graph?.targetFound, true);
    });

    it("a breadth-first walk whose target it never reaches says so", async () => {
        const graph = await graphWith(TWO_PIECES);
        const output = await computed(new BFSAlgorithm(graph, { source: "A", targetNode: "X" }));

        assert.strictEqual(output.graph?.targetFound, false);
        assert.deepStrictEqual([...valuesOf(output.nodes).keys()], ["A", "B", "C"]);
    });

    for (const options of [
        { preOrder: true, targetNode: null },
        { preOrder: false, targetNode: null },
        { preOrder: true, targetNode: "F" },
        { preOrder: false, targetNode: "F" },
    ]) {
        it(`depth-first search, ${options.preOrder ? "pre" : "post"}-order${options.targetNode === null ? "" : ", with a target"}`, async () => {
            const graph = await graphWith(DECLARED_ORDER);
            const output = await computed(new DFSAlgorithm(graph, { source: "A", ...options }));

            const reference = depthFirstSearch(toAlgorithmGraph(graph.getDataManager(), "undirected"), "A", {
                preOrder: options.preOrder,
                targetNode: options.targetNode ?? undefined,
            });

            const values = valuesOf(output.nodes);
            for (const id of graph.getDataManager().nodes.keys()) {
                const position = reference.order.indexOf(id);
                assert.deepStrictEqual(
                    values.get(id),
                    { value: position === -1 ? undefined : position, visited: reference.visited.has(id) },
                    `node ${String(id)}`,
                );
            }
        });
    }

    it("strongly connected components number the pieces as the reference does", async () => {
        const graph = await graphWith(STRONG);
        const output = await computed(new StronglyConnectedComponentsAlgorithm(graph));

        const reference = stronglyConnectedComponents(toAlgorithmGraph(graph.getDataManager(), "directed"));
        const values = valuesOf(output.nodes);
        reference.forEach((piece, group) => {
            for (const id of piece) {
                assert.strictEqual(values.get(id)?.group, group, `group of ${String(id)}`);
            }
        });
        assert.strictEqual(reference.length, 3);
    });

    it("strongly connected components of an undirected graph are its connected pieces", async () => {
        const graph = await graphWith({ ...STRONG, directed: false });
        const output = await computed(new StronglyConnectedComponentsAlgorithm(graph));

        // Every edge can be crossed both ways, so A to F are one piece.
        const values = valuesOf(output.nodes);
        assert.deepStrictEqual(new Set([...values.values()].map((value) => value.group)), new Set([0]));
        assert.strictEqual(values.size, 6);
    });

    it("bellman-ford", async () => {
        const graph = await graphWith(FIXTURE);
        const output = await computed(new BellmanFordAlgorithm(graph, { source: "A", target: "C" }));

        const reference = bellmanFord(toAlgorithmGraph(graph.getDataManager(), "undirected"), "A");
        const values = valuesOf(output.nodes);
        for (const id of graph.getDataManager().nodes.keys()) {
            assert.strictEqual(values.get(id)?.distance, reference.distances.get(id), `distance to ${String(id)}`);
        }

        // A-B-C costs 3, against 7 for the direct C-A edge.
        assert.deepStrictEqual(
            [...values].filter(([, value]) => value.onPath === true).map(([id, value]) => [id, value.order]),
            [
                ["A", 0],
                ["B", 1],
                ["C", 2],
            ],
        );
        assert.deepStrictEqual(output.graph, { length: 3, cost: 3, hops: 2, hasNegativeCycle: false });
        assert.deepStrictEqual(edgeFlags(graph, output, "onPath"), [true, true, false, false, false, false, false]);
    });

    it("bellman-ford finds a loop that costs less every time round", async () => {
        const graph = await graphWith({
            nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
            edges: [
                { srcId: "A", dstId: "B", weight: 1 },
                { srcId: "B", dstId: "C", weight: -2 },
            ],
        });
        const output = await computed(new BellmanFordAlgorithm(graph, { source: "A", target: "B" }));

        const reference = bellmanFord(toAlgorithmGraph(graph.getDataManager(), "undirected"), "A");
        assert.isTrue(reference.hasNegativeCycle);
        assert.strictEqual(output.graph?.hasNegativeCycle, true);
    });

    it("bellman-ford flags both edges of a reciprocal pair and every edge of a parallel group", async () => {
        for (const fixture of [RECIPROCAL, PARALLEL]) {
            const graph = await graphWith(fixture);
            const output = await computed(new BellmanFordAlgorithm(graph, { source: "A", target: "C" }));

            assert.deepStrictEqual(edgeFlags(graph, output, "onPath"), [true, true, true]);
        }
    });

    it("prim, from a start node", async () => {
        const graph = await graphWith(DECLARED_ORDER);
        const output = await computed(new PrimAlgorithm(graph, { startNode: "C" }));

        const reference = primMST(toAlgorithmGraph(graph.getDataManager(), "undirected"), "C");
        const chosen = new Set(reference.edges.map((edge) => pairKey(edge.source, edge.target)));

        assert.strictEqual(output.graph?.totalWeight, reference.totalWeight);
        for (const edge of graph.getDataManager().edges.values()) {
            const published = valuesOf(output.edges).get(edge.id)?.in;
            assert.strictEqual(published, chosen.has(pairKey(edge.srcId, edge.dstId)), `edge ${edge.id}`);
        }
    });

    it("prim spans every piece of a graph in several", async () => {
        const graph = await graphWith(TWO_PIECES);
        const output = await computed(new PrimAlgorithm(graph, { startNode: "X" }));

        // The reference refuses a graph in two pieces, so each piece's tree is its own reference.
        let totalWeight = 0;
        for (const piece of [
            ["A", "B", "C"],
            ["X", "Y"],
        ]) {
            const part = new ReferenceGraph({ directed: false });
            for (const edge of TWO_PIECES.edges ?? []) {
                if (piece.includes(String(edge.srcId))) {
                    part.addEdge(edge.srcId, edge.dstId, edge.weight as number);
                }
            }
            totalWeight += primMST(part).totalWeight;
        }

        assert.strictEqual(output.graph?.totalWeight, totalWeight);
        assert.deepStrictEqual(edgeFlags(graph, output, "in"), [true, true, true]);
    });

    it("prim flags both edges of a reciprocal pair and every edge of a parallel group", async () => {
        for (const fixture of [RECIPROCAL, PARALLEL]) {
            const graph = await graphWith(fixture);
            const output = await computed(new PrimAlgorithm(graph));

            assert.deepStrictEqual(edgeFlags(graph, output, "in"), [true, true, true]);
        }
    });

    describe("pagerank on what the index-based route did not take before", () => {
        const personalization = new Map<NodeId, number>([
            ["A", 1],
            ["C", 3],
        ]);
        const initialRanks = new Map<NodeId, number>([
            ["A", 0.7],
            ["B", 0.1],
        ]);

        for (const [name, options] of [
            ["a personalization vector", { personalization }],
            ["initial ranks", { initialRanks }],
            ["both, weighted", { personalization, initialRanks, weight: "weight" }],
        ] as const) {
            it(name, async () => {
                const graph = await graphWith(DANGLING);
                const algorithm = new PageRankAlgorithm(graph, options);
                await algorithm.run();

                const { result } = algorithm;
                assert.isDefined(result);

                const reference = pageRank(toAlgorithmGraph(graph.getDataManager(), "directed"), options);
                for (const id of graph.getDataManager().nodes.keys()) {
                    assert.approximately(
                        result.node(id)?.value as number,
                        reference.ranks[String(id)],
                        1e-12,
                        `rank of ${String(id)}`,
                    );
                }
                assert.strictEqual(result.summary().caveats.iterations, reference.iterations);
            });
        }

        it("an undirected graph carries rank both ways along every edge", async () => {
            const graph = await graphWith({ ...DANGLING, directed: false });
            const algorithm = new PageRankAlgorithm(graph);
            await algorithm.run();

            const { result } = algorithm;
            assert.isDefined(result);

            const both = new ReferenceGraph({ directed: true });
            for (const edge of DANGLING.edges ?? []) {
                both.addEdge(edge.srcId, edge.dstId);
                both.addEdge(edge.dstId, edge.srcId);
            }

            const reference = pageRank(both);
            for (const id of graph.getDataManager().nodes.keys()) {
                assert.approximately(
                    result.node(id)?.value as number,
                    reference.ranks[String(id)],
                    1e-12,
                    `rank of ${String(id)}`,
                );
            }
        });
    });
});
