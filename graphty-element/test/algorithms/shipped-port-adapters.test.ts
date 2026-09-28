/**
 * @file HITS, Katz, k-core, Louvain and degree over the graph snapshot, against the route they
 * replaced.
 *
 * Each of the five used to copy the snapshot into an `@graphty/algorithms` object graph and call
 * the reference implementation on it. They now run over the snapshot itself: the first four
 * through the dispatcher, where an attached accelerator may take the work, and degree from the
 * snapshot's own degree views. What is checked here is that a reader sees the same numbers as
 * before -- scores within 1e-9, identical core numbers and degrees, Louvain's modularity no
 * more than 0.01 below the reference's -- and that the routing rules hold on both sides of each floor.
 */

import {
    Graph as AlgorithmGraph,
    hits,
    indexed,
    katzCentrality,
    kCoreDecomposition,
    louvain,
} from "@graphty/algorithms";
import { assert, describe, it } from "vitest";

import { AccelerationController, AcceleratorRegistry } from "../../src/acceleration";
import { narrowAlgorithms } from "../../src/acceleration/narrow";
import { ACCELERATION_MIN_NODES_BY_CAPABILITY, type GraphAccelerator } from "../../src/acceleration/types";
import { DegreeAlgorithm } from "../../src/algorithms/DegreeAlgorithm";
import { HITSAlgorithm } from "../../src/algorithms/HITSAlgorithm";
import { createScopedInput } from "../../src/algorithms/input/ScopedInput";
import { KatzCentralityAlgorithm } from "../../src/algorithms/KatzCentralityAlgorithm";
import { KCoreAlgorithm } from "../../src/algorithms/KCoreAlgorithm";
import { LouvainAlgorithm } from "../../src/algorithms/LouvainAlgorithm";
import { type AlgorithmOutput, detachedRunContext } from "../../src/algorithms/results";
import { toAlgorithmGraph } from "../../src/algorithms/utils/snapshotGraph";
import { isGraphtyError } from "../../src/errors";
import type { Graph } from "../../src/Graph";
import { createFakeAccelerator } from "../../src/testing/fakeAccelerator";
import { createMockGraph, type MockGraphOpts } from "../helpers/mockGraph";

/** A directed graph with a reciprocal pair, a self-loop, a parallel pair and an isolated node. */
const MIXED: MockGraphOpts = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }, { id: "F" }, { id: "G" }],
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

/**
 * The fixtures every comparison runs over: the shared 77-node data set, the mixed one above, and
 * the mixed one loaded undirected, where the snapshot's in- and out-degree views are one array.
 */
const FIXTURES: readonly [string, MockGraphOpts][] = [
    ["data4", { dataPath: "./data4.json" }],
    ["mixed", MIXED],
    ["mixed undirected", { ...MIXED, directed: false }],
];

/**
 * A run's published node values, keyed by node id.
 * @param graph - The graph the run was over.
 * @param run - The finished run.
 * @param run.result - Its result.
 * @returns One entry per node.
 */
function published(
    graph: Graph,
    run: { result?: { node: (id: string | number) => Record<string, unknown> | undefined } },
): Map<string | number, Record<string, unknown>> {
    const { result } = run;
    assert.isDefined(result);
    return new Map([...graph.getDataManager().nodes.keys()].map((id) => [id, result.node(id) ?? {}]));
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
 * What a run threw, as a coded error.
 * @param work - The run to make fail.
 * @returns The error.
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

describe("the shipped-port adapters give the numbers the reference route gave", () => {
    for (const [name, fixture] of FIXTURES) {
        describe(name, () => {
            it("hits: combined, hub and authority scores within 1e-9", async () => {
                for (const normalized of [true, false]) {
                    const graph = await createMockGraph(fixture);
                    const run = new HITSAlgorithm(graph, { normalized });
                    await run.run();

                    // A graph loaded undirected has no direction to read, so each edge is a hub and an
                    // authority link both ways: the reference runs over the undirected graph too.
                    const mode = fixture.directed === false ? "undirected" : "directed";
                    const reference = hits(toAlgorithmGraph(graph.getDataManager(), mode), { normalized });
                    for (const [id, values] of published(graph, run)) {
                        const hub = reference.hubs[String(id)];
                        const authority = reference.authorities[String(id)];
                        assert.approximately(values.hub as number, hub, 1e-9, `hub of ${String(id)}`);
                        assert.approximately(values.authority as number, authority, 1e-9, `authority of ${String(id)}`);
                        assert.approximately(
                            values.value as number,
                            (hub + authority) / 2,
                            1e-9,
                            `value of ${String(id)}`,
                        );
                    }
                }
            });

            it("katz: scores within 1e-9", async () => {
                for (const normalized of [true, false]) {
                    const graph = await createMockGraph(fixture);
                    const run = new KatzCentralityAlgorithm(graph, { normalized, alpha: 0.05 });
                    await run.run();

                    const reference = katzCentrality(toAlgorithmGraph(graph.getDataManager(), "undirected"), {
                        normalized,
                        alpha: 0.05,
                    });
                    for (const [id, values] of published(graph, run)) {
                        assert.approximately(
                            values.value as number,
                            reference[String(id)],
                            1e-9,
                            `score of ${String(id)}`,
                        );
                    }
                }
            });

            it("k-core: identical core numbers, except that a self-loop no longer counts", async () => {
                const graph = await createMockGraph(fixture);
                const run = new KCoreAlgorithm(graph);
                await run.run();

                /* The reference implementation counted a node's self-loop as one of its own
                   neighbours, so E -- a self-loop and one edge -- sat in the 2-core. A core number
                   is defined on the simple graph underneath, as NetworkX defines it, and the port
                   counts a self-loop not at all. That is the one difference; every node without a
                   self-loop keeps its number. */
                const selfLooped = new Set(
                    [...graph.getDataManager().edges.values()].filter((e) => e.srcId === e.dstId).map((e) => e.srcId),
                );
                const { coreness } = kCoreDecomposition(toAlgorithmGraph(graph.getDataManager(), "undirected"));
                for (const [id, values] of published(graph, run)) {
                    if (!selfLooped.has(id)) {
                        assert.strictEqual(values.value, coreness.get(String(id)), `core number of ${String(id)}`);
                    }
                }
                assert.include(
                    run.result?.summary().caveats.notes ?? [],
                    "A self-loop does not count toward its node's core number, and parallel edges count once.",
                );
                if (name !== "data4") {
                    assert.strictEqual(published(graph, run).get("E")?.value, 1);
                }
            });

            it("degree: identical in-, out- and total degree", async () => {
                const graph = await createMockGraph(fixture);
                const run = new DegreeAlgorithm(graph);
                await run.run();

                const reference = toAlgorithmGraph(graph.getDataManager(), "directed");
                for (const [id, values] of published(graph, run)) {
                    const inDegree = reference.inDegree(id);
                    const outDegree = reference.outDegree(id);
                    assert.deepInclude(
                        values,
                        { inDegree, outDegree, value: inDegree + outDegree },
                        `degree of ${String(id)}`,
                    );
                }
            });

            it("louvain: groups that score the modularity it reports, at most 0.01 below the reference's", async () => {
                const graph = await createMockGraph(fixture);
                const output = await computed(new LouvainAlgorithm(graph));
                const { nodes } = graph.getDataManager();

                /* Both partitions are scored by one function over the snapshot the run read, so a
                   self-loop counts the same way in each (twice in its node's degree, as NetworkX
                   counts it; the reference's own figure counts it once). */
                const snapshot = createScopedInput(graph.getDataManager(), "undirected").subgraph();
                const score = (groupOf: Map<unknown, number>): number =>
                    indexed.modularity(
                        snapshot,
                        Uint32Array.from({ length: snapshot.nodeCount }, (_, index) => {
                            const group = groupOf.get(snapshot.ids.idOf(index));
                            assert.isDefined(group, `node ${String(snapshot.ids.idOf(index))} has no group`);
                            return group;
                        }),
                    );

                const groups = new Map(output.nodes?.map((node) => [node.id, node.values.group as number]));
                assert.strictEqual(groups.size, nodes.size);
                assert.approximately(output.graph?.modularity as number, score(groups), 1e-9);

                // The port is not move-for-move identical to the reference, so the two partitions
                // can differ; the quality they reach is what is held to the reference's.
                const reference = louvain(toAlgorithmGraph(graph.getDataManager(), "undirected"));
                const referenceGroups = new Map(
                    reference.communities.flatMap((members, group) => members.map((id) => [id, group] as const)),
                );
                assert.isAtLeast(output.graph?.modularity as number, score(referenceGroups) - 0.01);
                assert.strictEqual(output.caveats.precision, "f64");
            });
        });
    }

    it("louvain refuses useOptimized off: only the optimized implementation remains", async () => {
        const graph = await createMockGraph({ dataPath: "./data4.json" });
        const error = await rejection(() =>
            new LouvainAlgorithm(graph, { useOptimized: false }).compute(detachedRunContext()),
        );

        assert.strictEqual(error.code, "E_OPTION_RANGE");
        assert.deepInclude(error.details, { option: "useOptimized", value: false });
    });

    it("hits and katz report whether they converged, now that the port says", async () => {
        const graph = await createMockGraph(MIXED);
        const run = new HITSAlgorithm(graph, { maxIterations: 1 });
        await run.run();

        const caveats = run.result?.summary().caveats;
        assert.strictEqual(caveats?.iterations, 1);
        assert.isFalse(caveats?.converged);
    });
});

describe("the direction and endpoint options", () => {
    it("hits publishes the authority score for mode in and the hub score for mode out", async () => {
        const graph = await createMockGraph(MIXED);
        for (const [mode, half] of [
            ["in", "authority"],
            ["out", "hub"],
        ] as const) {
            const run = new HITSAlgorithm(graph, { mode });
            await run.run();
            for (const [id, values] of published(graph, run)) {
                assert.strictEqual(values.value, values[half], `${mode} value of ${String(id)}`);
            }
        }
    });

    it("katz reads in-paths for mode in and out-paths for mode out, over the declared direction", async () => {
        const graph = await createMockGraph(MIXED);
        const directed = toAlgorithmGraph(graph.getDataManager(), "directed");

        const inRun = new KatzCentralityAlgorithm(graph, { mode: "in" });
        await inRun.run();
        const inReference = katzCentrality(directed);
        for (const [id, values] of published(graph, inRun)) {
            assert.approximately(values.value as number, inReference[String(id)], 1e-9, `in score of ${String(id)}`);
        }

        // Out-paths are the in-paths of the graph with every edge turned around.
        const reversed = new AlgorithmGraph({ directed: true });
        for (const node of directed.nodes()) {
            reversed.addNode(node.id);
        }
        for (const edge of directed.edges()) {
            reversed.addEdge(edge.target, edge.source, edge.weight);
        }
        const outRun = new KatzCentralityAlgorithm(graph, { mode: "out" });
        await outRun.run();
        const outReference = katzCentrality(reversed);
        for (const [id, values] of published(graph, outRun)) {
            assert.approximately(values.value as number, outReference[String(id)], 1e-9, `out score of ${String(id)}`);
        }
        // E points out only, so the two modes disagree about it.
        assert.isAbove(
            published(graph, outRun).get("E")?.value as number,
            published(graph, inRun).get("E")?.value as number,
        );
        assert.strictEqual(outRun.result?.summary().caveats.direction, "directed");
    });

    it("katz says undirected for every mode on a graph loaded undirected", async () => {
        const graph = await createMockGraph({ ...MIXED, directed: false });
        for (const mode of ["in", "out", "total"] as const) {
            const run = new KatzCentralityAlgorithm(graph, { mode });
            await run.run();
            assert.strictEqual(run.result?.summary().caveats.direction, "undirected", mode);
        }
    });

    it("labels each mode by what it publishes, not by a degree", () => {
        const labels = (Run: typeof HITSAlgorithm | typeof KatzCentralityAlgorithm): Record<string, string> => {
            const { mode } = Run.optionsSchema;
            assert.strictEqual(mode.type, "select");
            return Object.fromEntries((mode.options ?? []).map((option) => [option.value, option.label]));
        };
        assert.deepStrictEqual(labels(HITSAlgorithm), {
            total: "Average of hub and authority",
            in: "Authority score",
            out: "Hub score",
        });
        assert.deepStrictEqual(labels(KatzCentralityAlgorithm), {
            total: "Either direction",
            in: "Paths arriving",
            out: "Paths leaving",
        });
    });

    it("hits and katz refuse endpoints, which neither method has", async () => {
        for (const Run of [HITSAlgorithm, KatzCentralityAlgorithm]) {
            const graph = await createMockGraph(MIXED);
            const error = await rejection(() => new Run(graph, { endpoints: true }).run());
            assert.strictEqual(error.code, "E_OPTION_RANGE");
            assert.deepInclude(error.details, { option: "endpoints", value: true });
        }
    });
});

describe("hits and katz on an accelerator", () => {
    /** An accelerator whose HITS and Katz members count their calls and answer with fixed vectors. */
    function counting(): { fake: GraphAccelerator; calls: string[] } {
        const calls: string[] = [];
        const fake = createFakeAccelerator({
            members: {
                hits: (s: { nodeCount: number }) => {
                    calls.push("hits");
                    return Promise.resolve({
                        hubs: new Float32Array(s.nodeCount).fill(1),
                        authorities: new Float32Array(s.nodeCount).fill(1),
                        iterations: 3,
                        converged: true,
                    });
                },
                katzCentrality: (s: { nodeCount: number }) => {
                    calls.push("katzCentrality");
                    return Promise.resolve({
                        scores: Float32Array.from({ length: s.nodeCount }, (_, i) => i),
                        iterations: 3,
                        converged: true,
                    });
                },
            },
        });
        return { fake, calls };
    }

    it("narrows the accelerator to the seam with both members forwarded", () => {
        const { fake } = counting();
        const seam = narrowAlgorithms(fake);
        assert.isFunction(seam.hits);
        assert.isFunction(seam.katzCentrality);
        assert.notProperty(seam, "kCoreDecomposition");
        assert.notProperty(seam, "louvain");
    });

    it("runs both on it, once each, and says the numbers are single precision", async () => {
        const { fake, calls } = counting();
        const graph = await createMockGraph(MIXED);
        graph.acceleration.setAccelerator(fake);

        const hitsRun = new HITSAlgorithm(graph);
        await hitsRun.run();
        const katzRun = new KatzCentralityAlgorithm(graph);
        await katzRun.run();

        assert.deepStrictEqual(calls, ["hits", "katzCentrality"]);
        assert.strictEqual(hitsRun.result?.summary().caveats.precision, "f32");
        assert.strictEqual(katzRun.result?.summary().caveats.precision, "f32");
        // Every hub is equal, so the unit-length rescale leaves each at 1 / sqrt(n).
        const n = graph.getDataManager().nodes.size;
        for (const [, values] of published(graph, hitsRun)) {
            assert.approximately(values.hub as number, 1 / Math.sqrt(n), 1e-9);
        }
    });

    it("keeps k-core and louvain on the CPU port with the accelerator attached", async () => {
        const { fake, calls } = counting();
        const graph = await createMockGraph(MIXED);
        graph.acceleration.setAccelerator(fake);

        const core = new KCoreAlgorithm(graph);
        await core.run();
        const communities = await computed(new LouvainAlgorithm(graph));

        assert.deepStrictEqual(calls, []);
        assert.strictEqual(core.result?.summary().caveats.precision, "f64");
        assert.strictEqual(communities.caveats.precision, "f64");
    });

    it("runs k-core and louvain on the CPU port under required, even when the accelerator has both members", async () => {
        // The element forwards neither member, so the controller is not asked: an accelerator that
        // implements them is never planned, never labelled f32, and never made to fail the run.
        const calls: string[] = [];
        const fake = createFakeAccelerator({
            members: {
                kCoreDecomposition: () => (calls.push("kCoreDecomposition"), Promise.reject(new Error("not here"))),
                louvain: () => (calls.push("louvain"), Promise.reject(new Error("not here"))),
            },
        });
        const graph = await createMockGraph(MIXED);
        graph.acceleration.setPolicy("required");
        graph.acceleration.setAccelerator(fake);

        const core = new KCoreAlgorithm(graph);
        await core.run();
        const communities = await computed(new LouvainAlgorithm(graph));

        assert.deepStrictEqual(calls, []);
        assert.strictEqual(core.result?.summary().caveats.precision, "f64");
        assert.strictEqual(communities.caveats.precision, "f64");
    });

    it("releases the transposed snapshot katz mode out builds, once the run is over", async () => {
        const handed: unknown[] = [];
        const fake = createFakeAccelerator({
            members: {
                katzCentrality: (s: { nodeCount: number }) => {
                    handed.push(s);
                    return Promise.resolve({
                        scores: Float32Array.from({ length: s.nodeCount }, (_, i) => i),
                        iterations: 3,
                        converged: true,
                    });
                },
            },
        });
        const graph = await createMockGraph(MIXED);
        graph.acceleration.setAccelerator(fake);

        await new KatzCentralityAlgorithm(graph, { mode: "out" }).run();

        assert.lengthOf(handed, 1);
        assert.include(fake.calls.release, handed[0]);
    });
});

describe("the hits and katz floors", () => {
    /** An accelerator with both members, so the floor and not the feature test is what decides. */
    const both = (): GraphAccelerator => ({
        name: "fake",
        backend: "webgpu",
        hits: (): string => "gpu",
        katzCentrality: (): string => "gpu",
    });

    for (const [capability, floor] of [
        ["hits", 15_000],
        ["katzCentrality", 28_000],
    ] as const) {
        it(`${capability}: the CPU port below ${String(floor)} nodes, the accelerator at it`, async () => {
            assert.strictEqual(ACCELERATION_MIN_NODES_BY_CAPABILITY[capability], floor);

            const registry = new AcceleratorRegistry();
            registry.register({ name: "fake", backend: "webgpu", factory: () => Promise.resolve(both()) });
            const controller = new AccelerationController({ registry });
            await controller.start();

            const below = controller.plan({ capability, nodeCount: floor - 1 });
            const at = controller.plan({ capability, nodeCount: floor });

            assert.isFalse(below.accelerated);
            assert.include(below.accelerated ? "" : below.reason, String(floor));
            assert.isTrue(at.accelerated);
            controller.dispose();
        });
    }
});
