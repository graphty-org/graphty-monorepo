/**
 * @file Betweenness (exact and sampled), all-pairs shortest paths, the clustering coefficient and
 * label propagation through `accelerated()`: on both sides of each routing floor, with no
 * accelerator at all, and with the run saying which path answered.
 *
 * Which path ran is published as `caveats.precision`: `f32` when the accelerator computed the
 * numbers, `f64` when the CPU port did. The CPU answers are held to `@graphty/algorithms` run
 * directly over the snapshot the adapter reads; the routing to a fake accelerator that records
 * what it was handed.
 */

import {
    betweennessCentrality,
    labelPropagation,
    labelPropagationSynchronous,
    triangleCount,
} from "@graphty/algorithms";
import type { GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { AccelerationController } from "../../src/acceleration/AccelerationController";
import { narrowAlgorithms } from "../../src/acceleration/narrow";
import { AcceleratorRegistry } from "../../src/acceleration/registry";
import {
    ACCELERATION_MIN_EDGES_TIMES_DENSITY_BY_CAPABILITY,
    ACCELERATION_MIN_NODES_BY_CAPABILITY,
    ACCELERATION_MIN_SOURCE_EDGES_BY_CAPABILITY,
} from "../../src/acceleration/types";
import { BetweennessCentralityAlgorithm } from "../../src/algorithms/BetweennessCentralityAlgorithm";
import { ClusteringCoefficientAlgorithm } from "../../src/algorithms/ClusteringCoefficientAlgorithm";
import { FloydWarshallAlgorithm } from "../../src/algorithms/FloydWarshallAlgorithm";
import { LabelPropagationAlgorithm } from "../../src/algorithms/LabelPropagationAlgorithm";
import { type AlgorithmOutput, detachedRunContext } from "../../src/algorithms/results";
import type { NodeId } from "../../src/catalog/types";
import { isGraphtyError } from "../../src/errors";
import type { Graph } from "../../src/Graph";
import { createFakeAccelerator, type FakeAccelerator } from "../../src/testing/fakeAccelerator";
import { createMockGraph, type MockGraphOpts } from "../helpers/mockGraph";
import { byId, referenceSnapshot } from "../helpers/reference-snapshot";

const FLOORS = ACCELERATION_MIN_NODES_BY_CAPABILITY;

/** Les Miserables co-appearances. */
const LES_MIS: MockGraphOpts = { dataPath: "./data4.json" };

/**
 * A ring of n nodes.
 * @param n - The node count.
 * @returns The records.
 */
function ring(n: number): MockGraphOpts {
    const nodes = Array.from({ length: n }, (_, i) => ({ id: `n${String(i)}` }));
    return { nodes, edges: nodes.map((node, i) => ({ srcId: node.id, dstId: `n${String((i + 1) % n)}` })) };
}

/**
 * The complete graph on n nodes: n(n-1)/2 edges, so edges times edges per node is n(n-1)^2/4.
 * @param n - The node count.
 * @returns The records.
 */
function complete(n: number): MockGraphOpts {
    const nodes = Array.from({ length: n }, (_, i) => ({ id: `n${String(i)}` }));
    const edges: { srcId: string; dstId: string }[] = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            edges.push({ srcId: `n${String(i)}`, dstId: `n${String(j)}` });
        }
    }
    return { nodes, edges };
}

/**
 * The element's graph with the built-in floors in force and, when given, an accelerator.
 * @param opts - The records.
 * @param fake - The accelerator, or none.
 * @param policy - The acceleration policy.
 * @returns The graph.
 */
async function graphWith(
    opts: MockGraphOpts,
    fake?: FakeAccelerator,
    policy: "auto" | "required" = "auto",
): Promise<Graph> {
    const graph = await createMockGraph(opts);
    (graph as unknown as { acceleration: AccelerationController }).acceleration = new AccelerationController({
        policy,
        registry: new AcceleratorRegistry(),
    });
    if (fake !== undefined) {
        graph.acceleration.setAccelerator(fake);
    }
    return graph;
}

/** What a fake member was handed, one entry per call. */
type Handed = unknown[];

/**
 * A fake accelerator implementing the four members, each recording its options and answering a
 * sentinel the tests recognise: every score 0.5, every distance 1, every coefficient 0.25, one
 * community.
 * @returns The fake and what each member was handed.
 */
function fourMemberFake(): { fake: FakeAccelerator; handed: Record<string, Handed> } {
    const handed: Record<string, Handed> = {
        betweennessCentrality: [],
        allPairsShortestPath: [],
        triangleCount: [],
        labelPropagation: [],
    };
    const fake = createFakeAccelerator({
        members: {
            betweennessCentrality: (s: GraphSnapshot, options?: { sources?: readonly number[] }) => {
                handed.betweennessCentrality.push(options);
                return Promise.resolve({
                    scores: new Float32Array(s.nodeCount).fill(0.5),
                    iterations: 1,
                    converged: true,
                    sourcesUsed: options?.sources?.length ?? s.nodeCount,
                });
            },
            allPairsShortestPath: (s: GraphSnapshot, options?: unknown) => {
                handed.allPairsShortestPath.push(options);
                const n = s.nodeCount;
                const dist = new Float32Array(n * n).fill(1);
                for (let i = 0; i < n; i++) {
                    dist[i * n + i] = 0;
                }
                return Promise.resolve({ dist, n });
            },
            triangleCount: (s: GraphSnapshot) => {
                handed.triangleCount.push(undefined);
                return Promise.resolve({
                    perNode: new Uint32Array(s.nodeCount).fill(2),
                    total: 7,
                    coefficient: new Float32Array(s.nodeCount).fill(0.25),
                    transitivity: 0.125,
                });
            },
            labelPropagation: (s: GraphSnapshot, options?: unknown) => {
                handed.labelPropagation.push(options);
                const labels = new Uint32Array(s.nodeCount);
                return Promise.resolve({ labels, count: 1, groups: () => [labels.map((_, i) => i)] });
            },
        },
    });
    return { fake, handed };
}

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
 * Run betweenness and read what it published.
 * @param graph - The graph.
 * @param algorithm - The run.
 * @returns The values by node id and the caveats.
 */
async function measured(graph: Graph, algorithm: BetweennessCentralityAlgorithm) {
    await algorithm.run();
    const { result } = algorithm;
    assert.isDefined(result);
    const values = new Map<NodeId, number | undefined>();
    for (const id of graph.getDataManager().nodes.keys()) {
        values.set(id, result.node(id)?.value as number | undefined);
    }
    return { values, caveats: result.summary().caveats };
}

describe("the capabilities routed since the algorithms 3.0 ports", () => {
    it("forwards all four, each with a floor", () => {
        const narrowed = narrowAlgorithms(fourMemberFake().fake);
        for (const member of [
            "betweennessCentrality",
            "allPairsShortestPath",
            "triangleCount",
            "labelPropagation",
        ] as const) {
            assert.isFunction(narrowed[member], member);
            const floor = FLOORS[member] ?? ACCELERATION_MIN_EDGES_TIMES_DENSITY_BY_CAPABILITY[member] ?? 0;
            assert.isAbove(floor, 0, `${member} has a floor`);
        }
    });

    describe("betweenness", () => {
        const floor = FLOORS.betweennessCentrality ?? NaN;
        const sourceFloor = ACCELERATION_MIN_SOURCE_EDGES_BY_CAPABILITY.betweennessCentrality ?? NaN;
        // A ring has as many edges as nodes, so its sources x edges is sources x n.
        const exactRing = Math.ceil(Math.sqrt(sourceFloor));
        const sampledRing = 1_000;
        const sampledK = sourceFloor / sampledRing;

        it("with no accelerator, the exact run is the algorithms function's and says f64", async () => {
            const graph = await graphWith(LES_MIS);
            const { values, caveats } = await measured(graph, new BetweennessCentralityAlgorithm(graph));
            const s = referenceSnapshot(graph.getDataManager(), "undirected");
            const reference = byId(s, betweennessCentrality(s).scores);
            for (const [id, value] of values) {
                assert.strictEqual(value, reference.get(id), `score of ${String(id)}`);
            }
            assert.isTrue(caveats.exact);
            assert.strictEqual(caveats.method, "brandes");
            assert.strictEqual(caveats.precision, "f64");
        });

        it("with no accelerator, a sampled run is the algorithms function's k draw, and says so", async () => {
            const graph = await graphWith(LES_MIS);
            const { values, caveats } = await measured(graph, new BetweennessCentralityAlgorithm(graph, { k: 12 }));
            const s = referenceSnapshot(graph.getDataManager(), "undirected");
            const reference = byId(s, betweennessCentrality(s, { k: 12 }).scores);
            for (const [id, value] of values) {
                assert.strictEqual(value, reference.get(id), `score of ${String(id)}`);
            }
            assert.isFalse(caveats.exact);
            assert.strictEqual(caveats.sampleSize, 12);
            assert.strictEqual(caveats.method, "brandes-sampled");
        });

        it("an exact run past both floors reaches the accelerator with every node as a source and says f32", async () => {
            const { fake, handed } = fourMemberFake();
            const graph = await graphWith(ring(exactRing), fake);
            const { values, caveats } = await measured(graph, new BetweennessCentralityAlgorithm(graph));
            assert.strictEqual(handed.betweennessCentrality.length, 1);
            assert.strictEqual((handed.betweennessCentrality[0] as { sources: number[] }).sources.length, exactRing);
            assert.strictEqual(caveats.precision, "f32");
            assert.strictEqual(values.get("n0"), 0.5);
        });

        it("an exact run on a sparse graph at the node floor stays on the CPU port: too few source-edges", async () => {
            const { fake, handed } = fourMemberFake();
            const graph = await graphWith(ring(floor), fake);
            const { caveats } = await measured(graph, new BetweennessCentralityAlgorithm(graph));
            assert.strictEqual(handed.betweennessCentrality.length, 0);
            assert.strictEqual(caveats.precision, "f64");
        });

        it("a sampled run at the source-edge floor reaches the accelerator with the drawn sources", async () => {
            const { fake, handed } = fourMemberFake();
            const graph = await graphWith(ring(sampledRing), fake);
            const { caveats } = await measured(graph, new BetweennessCentralityAlgorithm(graph, { k: sampledK }));
            assert.strictEqual((handed.betweennessCentrality[0] as { sources: number[] }).sources.length, sampledK);
            assert.strictEqual(caveats.precision, "f32");
            assert.strictEqual(caveats.sampleSize, sampledK);
        });

        it("a sampled run one source below the source-edge floor stays on the CPU port and says f64", async () => {
            const { fake, handed } = fourMemberFake();
            const graph = await graphWith(ring(sampledRing), fake);
            const { caveats } = await measured(graph, new BetweennessCentralityAlgorithm(graph, { k: sampledK - 1 }));
            assert.strictEqual(handed.betweennessCentrality.length, 0);
            assert.strictEqual(caveats.precision, "f64");
        });

        it("one node below the floor stays on the CPU port and says f64", async () => {
            const { fake, handed } = fourMemberFake();
            const graph = await graphWith(ring(floor - 1), fake);
            const { caveats } = await measured(graph, new BetweennessCentralityAlgorithm(graph, { k: 10 }));
            assert.strictEqual(handed.betweennessCentrality.length, 0);
            assert.strictEqual(caveats.precision, "f64");
        });
    });

    describe("all-pairs shortest paths", () => {
        const floor = FLOORS.allPairsShortestPath ?? NaN;

        it("at the floor reaches the accelerator and says f32", async () => {
            const { fake, handed } = fourMemberFake();
            const output = await computed(new FloydWarshallAlgorithm(await graphWith(ring(floor), fake)));
            assert.strictEqual(handed.allPairsShortestPath.length, 1);
            assert.strictEqual(output.caveats.precision, "f32");
            assert.deepStrictEqual(output.graph, { diameter: 1, radius: 1, hasNegativeCycle: false });
        });

        it("one node below the floor stays on the CPU port and says f64", async () => {
            const { fake, handed } = fourMemberFake();
            const output = await computed(new FloydWarshallAlgorithm(await graphWith(ring(floor - 1), fake)));
            assert.strictEqual(handed.allPairsShortestPath.length, 0);
            assert.strictEqual(output.caveats.precision, "f64");
            // A ring of n: the furthest node is n / 2 steps away, rounded down.
            assert.strictEqual(output.graph?.diameter, Math.floor((floor - 1) / 2));
        });

        it("with no accelerator, runs on the CPU port at the floor too", async () => {
            const output = await computed(new FloydWarshallAlgorithm(await graphWith(ring(floor))));
            assert.strictEqual(output.caveats.precision, "f64");
            assert.strictEqual(output.graph?.diameter, Math.floor(floor / 2));
        });
    });

    describe("the clustering coefficient", () => {

        it("with no accelerator, publishes the algorithms function's coefficient, counts and transitivity", async () => {
            const graph = await graphWith(LES_MIS);
            const output = await computed(new ClusteringCoefficientAlgorithm(graph));
            const s = referenceSnapshot(graph.getDataManager(), "undirected");
            const reference = triangleCount(s);
            const coefficient = byId(s, reference.coefficient);
            const triangles = byId(s, reference.perNode);
            for (const [id, values] of nodeValues(output)) {
                assert.strictEqual(values.value, coefficient.get(id as NodeId), `coefficient of ${String(id)}`);
                assert.strictEqual(values.triangles, triangles.get(id as NodeId), `triangles of ${String(id)}`);
            }
            assert.deepStrictEqual(output.graph, {
                transitivity: reference.transitivity,
                triangleCount: reference.total,
            });
            assert.strictEqual(output.caveats.precision, "f64");
            assert.strictEqual(output.shape, "node-metric");
        });

        it("gives a node with fewer than two neighbours 0, not a missing value", async () => {
            const output = await computed(
                new ClusteringCoefficientAlgorithm(
                    await graphWith({
                        nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "leaf" }, { id: "alone" }],
                        edges: [
                            { srcId: "a", dstId: "b" },
                            { srcId: "b", dstId: "c" },
                            { srcId: "c", dstId: "a" },
                            { srcId: "a", dstId: "leaf" },
                        ],
                    }),
                ),
            );
            const values = nodeValues(output);
            assert.strictEqual(values.get("b")?.value, 1);
            assert.strictEqual(values.get("a")?.value, 1 / 3);
            assert.strictEqual(values.get("leaf")?.value, 0);
            assert.strictEqual(values.get("alone")?.value, 0);
            assert.deepStrictEqual(output.graph, { transitivity: 3 / 5, triangleCount: 1 });
        });

        // The floor is on edges times edges per node. The complete graph on 160 nodes clears it
        // (12,720 edges, 1,011,240); on 159 it does not (12,561 edges, 992,319).
        const floor = ACCELERATION_MIN_EDGES_TIMES_DENSITY_BY_CAPABILITY.triangleCount ?? NaN;
        const density = (n: number): number => (n * (n - 1) * (n - 1)) / 4;

        it("a dense graph at the floor reaches the accelerator, publishes its coefficient and says f32", async () => {
            assert.isAtLeast(density(160), floor);
            const { fake, handed } = fourMemberFake();
            const output = await computed(new ClusteringCoefficientAlgorithm(await graphWith(complete(160), fake)));
            assert.strictEqual(handed.triangleCount.length, 1);
            assert.strictEqual(output.caveats.precision, "f32");
            assert.deepInclude(nodeValues(output).get("n0"), { value: 0.25, triangles: 2 });
        });

        it("the same shape one node below the floor stays on the CPU port and says f64", async () => {
            assert.isBelow(density(159), floor);
            const { fake, handed } = fourMemberFake();
            const output = await computed(new ClusteringCoefficientAlgorithm(await graphWith(complete(159), fake)));
            assert.strictEqual(handed.triangleCount.length, 0);
            assert.strictEqual(output.caveats.precision, "f64");
            assert.deepStrictEqual(output.graph, { transitivity: 1, triangleCount: (159 * 158 * 157) / 6 });
        });

        it("a sparse graph of 50,000 nodes stays on the CPU port and says f64", async () => {
            const { fake, handed } = fourMemberFake();
            const output = await computed(new ClusteringCoefficientAlgorithm(await graphWith(ring(50_000), fake)));
            assert.strictEqual(handed.triangleCount.length, 0);
            assert.strictEqual(output.caveats.precision, "f64");
            assert.deepStrictEqual(output.graph, { transitivity: 0, triangleCount: 0 });
        });
    });

    describe("label propagation", () => {
        const floor = FLOORS.labelPropagation ?? NaN;

        it("with no seed and no accelerator, the partition is the synchronous port's", async () => {
            const graph = await graphWith(LES_MIS);
            const output = await computed(new LabelPropagationAlgorithm(graph));
            const s = referenceSnapshot(graph.getDataManager(), "undirected");
            const reference = byId(s, labelPropagationSynchronous(s).labels);
            for (const [id, values] of nodeValues(output)) {
                assert.strictEqual(values.group, reference.get(id as NodeId), `group of ${String(id)}`);
            }
            assert.strictEqual(output.caveats.method, "label-propagation-synchronous");
            assert.strictEqual(output.caveats.precision, "f64");
        });

        it("with a seed, the partition is the seeded port's, whatever is attached", async () => {
            const { fake, handed } = fourMemberFake();
            const graph = await graphWith(LES_MIS, fake);
            const output = await computed(new LabelPropagationAlgorithm(graph, { randomSeed: 7 }));
            const s = referenceSnapshot(graph.getDataManager(), "undirected");
            const reference = byId(s, labelPropagation(s, { randomSeed: 7 }).labels);
            for (const [id, values] of nodeValues(output)) {
                assert.strictEqual(values.group, reference.get(id as NodeId), `group of ${String(id)}`);
            }
            assert.strictEqual(handed.labelPropagation.length, 0);
            assert.strictEqual(output.caveats.seed, 7);
            assert.strictEqual(output.caveats.method, "label-propagation");
        });

        it("with no seed, at the floor reaches the accelerator with the pass cap and says f32", async () => {
            const { fake, handed } = fourMemberFake();
            const output = await computed(
                new LabelPropagationAlgorithm(await graphWith(ring(floor), fake), { maxIterations: 30 }),
            );
            assert.deepStrictEqual(handed.labelPropagation, [{ maxIterations: 30, weighted: undefined }]);
            assert.strictEqual(output.caveats.precision, "f32");
            assert.strictEqual(nodeValues(output).get("n0")?.group, 0);
        });

        it("a seeded run at the floor stays on the CPU port and says f64", async () => {
            const { fake, handed } = fourMemberFake();
            const output = await computed(
                new LabelPropagationAlgorithm(await graphWith(ring(floor), fake), { randomSeed: 3, maxIterations: 2 }),
            );
            assert.strictEqual(handed.labelPropagation.length, 0);
            assert.strictEqual(output.caveats.precision, "f64");
        });

        it("one node below the floor stays on the CPU port and says f64", async () => {
            const { fake, handed } = fourMemberFake();
            const output = await computed(
                new LabelPropagationAlgorithm(await graphWith(ring(floor - 1), fake), { maxIterations: 2 }),
            );
            assert.strictEqual(handed.labelPropagation.length, 0);
            assert.strictEqual(output.caveats.precision, "f64");
        });

        it("under acceleration=required a seeded run is refused before any work", async () => {
            const { fake, handed } = fourMemberFake();
            let caught: unknown;
            try {
                await computed(
                    new LabelPropagationAlgorithm(await graphWith(ring(8), fake, "required"), { randomSeed: 3 }),
                );
            } catch (error) {
                caught = error;
            }
            assert.isTrue(isGraphtyError(caught), String(caught));
            assert.strictEqual((caught as { code: string }).code, "E_NO_ACCELERATOR");
            assert.strictEqual(handed.labelPropagation.length, 0);
        });
    });
});
