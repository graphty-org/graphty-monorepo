/**
 * @file Betweenness, closeness, eigenvector, Leiden and Girvan-Newman over the index-based ports.
 *
 * Each case runs the adapter and the legacy `@graphty/algorithms` function over the SAME
 * simplified graph the element built for it (`toAlgorithmGraph`), and compares what was
 * published. Scores agree to 1e-9 relative. On a graph without a self-loop Girvan-Newman's
 * partition is the same partition and its modularity agrees to 1e-9; with one, modularity counts
 * the self-loop twice in its node's degree where the legacy function counted it once, so the
 * published score is checked against the port's own modularity instead. Leiden is a randomised
 * heuristic whose port does not move nodes in the legacy order, so its partition is not compared:
 * its modularity is within 0.02 of the legacy one on the two fixtures, within 0.05 either way on
 * small random graphs without self-loops and no lower on average, and it is the modularity of the
 * partition it published.
 *
 * Then the routing: eigenvector goes to the accelerator at 6,600 nodes and above and stays on the
 * processor below, and a run the dispatcher answers on the processor says `f64` even when an
 * accelerator was attached.
 */

import { readFileSync } from "node:fs";

import {
    betweennessCentrality,
    closenessCentrality,
    eigenvectorCentrality,
    girvanNewman,
    indexed,
    leiden,
    toSnapshot,
} from "@graphty/algorithms";
import type { GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { AccelerationController } from "../../src/acceleration/AccelerationController";
import { narrowAlgorithms } from "../../src/acceleration/narrow";
import { AcceleratorRegistry } from "../../src/acceleration/registry";
import { ACCELERATION_MIN_NODES_BY_CAPABILITY } from "../../src/acceleration/types";
import { BetweennessCentralityAlgorithm } from "../../src/algorithms/BetweennessCentralityAlgorithm";
import { ClosenessCentralityAlgorithm } from "../../src/algorithms/ClosenessCentralityAlgorithm";
import { EigenvectorCentralityAlgorithm } from "../../src/algorithms/EigenvectorCentralityAlgorithm";
import { GirvanNewmanAlgorithm } from "../../src/algorithms/GirvanNewmanAlgorithm";
import { LeidenAlgorithm } from "../../src/algorithms/LeidenAlgorithm";
import type { MetricAlgorithm } from "../../src/algorithms/metrics/MetricAlgorithm";
import { type AlgorithmOutput, detachedRunContext } from "../../src/algorithms/results";
import { toAlgorithmGraph } from "../../src/algorithms/utils/snapshotGraph";
import type { NodeId } from "../../src/catalog/types";
import { isGraphtyError } from "../../src/errors";
import type { Graph } from "../../src/Graph";
import { createFakeAccelerator, type FakeAccelerator } from "../../src/testing/fakeAccelerator";
import { createMockGraph, type MockGraphOpts } from "../helpers/mockGraph";

/** Two triangles joined by a path, with a parallel pair and a reciprocal pair, all weighted. */
const WEIGHTED_MULTI: MockGraphOpts = {
    nodes: ["A", "B", "C", "D", "E", "F", "G"].map((id) => ({ id })),
    edges: [
        { srcId: "A", dstId: "B", weight: 2 },
        { srcId: "A", dstId: "B", weight: 1.5 },
        { srcId: "B", dstId: "C", weight: 1 },
        { srcId: "C", dstId: "A", weight: 3 },
        { srcId: "C", dstId: "D", weight: 0.5 },
        { srcId: "D", dstId: "C", weight: 0.25 },
        { srcId: "D", dstId: "E", weight: 1 },
        { srcId: "E", dstId: "F", weight: 2 },
        { srcId: "F", dstId: "G", weight: 1 },
        { srcId: "G", dstId: "E", weight: 4 },
    ],
};

/** Les Miserables co-appearances, the fixture the per-adapter tests already use. */
const LES_MIS: MockGraphOpts = { dataPath: "./data4.json" };

const FIXTURES: readonly [string, MockGraphOpts][] = [
    ["a weighted multigraph", WEIGHTED_MULTI],
    ["les miserables", LES_MIS],
];

/**
 * The element's graph, with a fake accelerator attached when the case wants one.
 * @param opts - The records.
 * @param fake - The accelerator.
 * @param floors - Whether the built-in per-capability floors apply.
 * @param policy - The acceleration policy; `"required"` also applies the floors, which it ignores.
 * @returns The graph.
 */
async function graphWith(
    opts: MockGraphOpts,
    fake?: FakeAccelerator,
    floors = false,
    policy: "auto" | "required" = "auto",
): Promise<Graph> {
    const graph = await createMockGraph(opts);
    if (policy === "required") {
        (graph as unknown as { acceleration: AccelerationController }).acceleration = new AccelerationController({
            policy,
            registry: new AcceleratorRegistry(),
        });
    } else if (floors) {
        // The shared mock pins the threshold at 0, which switches the built-in floors off; a
        // controller left at its default is what a consumer who set nothing gets.
        (graph as unknown as { acceleration: AccelerationController }).acceleration = new AccelerationController({
            policy: "auto",
            registry: new AcceleratorRegistry(),
        });
    }
    if (fake !== undefined) {
        graph.acceleration.setAccelerator(fake);
    }
    return graph;
}

/**
 * Run a metric and read its published values and precision.
 * @param graph - The graph it ran over.
 * @param algorithm - The metric.
 * @returns The value per node id, and the precision caveat.
 */
async function measured(
    graph: Graph,
    algorithm: MetricAlgorithm,
): Promise<{ values: Map<NodeId, number>; precision: string }> {
    await algorithm.run();
    const { result } = algorithm;
    assert.isDefined(result);
    const values = new Map<NodeId, number>();
    for (const id of graph.getDataManager().nodes.keys()) {
        values.set(id, result.node(id)?.value as number);
    }
    return { values, precision: result.summary().caveats.precision };
}

/**
 * Run a declared algorithm and hand back its output.
 * @param algorithm - The algorithm.
 * @returns What it published.
 */
async function computed(algorithm: {
    compute: (context: ReturnType<typeof detachedRunContext>) => Promise<AlgorithmOutput | null>;
}): Promise<AlgorithmOutput> {
    const output = await algorithm.compute(detachedRunContext());
    assert.isNotNull(output);
    return output;
}

/**
 * Assert two numbers agree to 1e-9 relative (absolute below 1).
 * @param actual - The adapter's number.
 * @param expected - The legacy number.
 * @param what - Named in the failure.
 */
function close(actual: number | undefined, expected: number | undefined, what: string): void {
    if (actual === undefined || expected === undefined) {
        assert.fail(`${what}: missing (${String(actual)} vs ${String(expected)})`);
    }
    assert.approximately(actual, expected, 1e-9 * Math.max(1, Math.abs(expected)), what);
}

/**
 * A partition as a set of member lists, independent of how its groups are numbered.
 * @param groupOf - Group per node id.
 * @returns One sorted string per group, sorted.
 */
function partition(groupOf: Map<unknown, unknown>): string[] {
    const groups = new Map<unknown, string[]>();
    for (const [id, group] of groupOf) {
        const members = groups.get(group) ?? [];
        members.push(String(id));
        groups.set(group, members);
    }
    return [...groups.values()].map((members) => members.sort().join(",")).sort();
}

/**
 * The published group per node id.
 * @param output - A community output.
 * @returns Group per node id.
 */
function groupsOf(output: AlgorithmOutput): Map<unknown, unknown> {
    return new Map((output.nodes ?? []).map((node) => [node.id, node.values.group]));
}

/**
 * An odd ring, which no bipartite check can fail and on which power iteration starts converged.
 * @param nodeCount - How many nodes; odd.
 * @returns The records.
 */
function oddRing(nodeCount: number): MockGraphOpts {
    const nodes = Array.from({ length: nodeCount }, (_, index) => ({ id: `n${String(index)}` }));
    const edges = nodes.map((node, index) => ({ srcId: node.id, dstId: nodes[(index + 1) % nodeCount].id }));
    return { nodes, edges };
}

/**
 * A fake accelerator with an eigenvector member that scores every node 0.5 and counts its calls.
 * @returns The fake and its call counter.
 */
function eigenvectorFake(): { fake: FakeAccelerator; calls: { eigenvector: number; closeness: number } } {
    const calls = { eigenvector: 0, closeness: 0 };
    const half = (s: GraphSnapshot): Float32Array => new Float32Array(s.nodeCount).fill(0.5);
    const fake = createFakeAccelerator({
        members: {
            eigenvectorCentrality: (s: GraphSnapshot) => {
                calls.eigenvector += 1;
                return Promise.resolve({ scores: half(s), iterations: 1, converged: true });
            },
            closenessCentrality: (s: GraphSnapshot) => {
                calls.closeness += 1;
                return Promise.resolve({ scores: half(s), iterations: 1, converged: true });
            },
            betweennessCentrality: (s: GraphSnapshot) => {
                calls.closeness += 1;
                return Promise.resolve({ scores: half(s), iterations: 1, converged: true });
            },
        },
    });
    return { fake, calls };
}

describe("centrality and community adapters on the index-based ports", () => {
    describe.each(FIXTURES)("equal the legacy route over %s", (_name, fixture) => {
        it("betweenness", async () => {
            const graph = await graphWith(fixture);
            const { values, precision } = await measured(graph, new BetweennessCentralityAlgorithm(graph));
            const reference = betweennessCentrality(toAlgorithmGraph(graph.getDataManager(), "undirected"));
            for (const id of graph.getDataManager().nodes.keys()) {
                close(values.get(id), reference[String(id)], `betweenness of ${String(id)}`);
            }
            assert.strictEqual(precision, "f64");
        });

        it("closeness", async () => {
            const graph = await graphWith(fixture);
            const { values } = await measured(graph, new ClosenessCentralityAlgorithm(graph));
            const reference = closenessCentrality(toAlgorithmGraph(graph.getDataManager(), "undirected"));
            for (const id of graph.getDataManager().nodes.keys()) {
                close(values.get(id), reference[String(id)], `closeness of ${String(id)}`);
            }
        });

        it("eigenvector, normalised and raw", async () => {
            for (const normalized of [true, false]) {
                const graph = await graphWith(fixture);
                const { values } = await measured(graph, new EigenvectorCentralityAlgorithm(graph, { normalized }));
                const reference = eigenvectorCentrality(toAlgorithmGraph(graph.getDataManager(), "undirected"), {
                    normalized,
                    maxIterations: 1000,
                    tolerance: 1e-6,
                    mode: "total",
                });
                for (const id of graph.getDataManager().nodes.keys()) {
                    close(values.get(id), reference[String(id)], `eigenvector of ${String(id)}`);
                }
            }
        });

        it("girvan-newman", async () => {
            for (const maxCommunities of [0, 2, 3]) {
                const graph = await graphWith(fixture);
                const output = await computed(new GirvanNewmanAlgorithm(graph, { maxCommunities }));

                // The legacy adapter's choice: the best-modularity level among those within the cap.
                const dendrogram = girvanNewman(toAlgorithmGraph(graph.getDataManager(), "undirected"), {
                    maxCommunities: maxCommunities > 0 ? maxCommunities : undefined,
                    maxIterations: 1000,
                });
                const within =
                    maxCommunities > 0
                        ? dendrogram.filter((level) => level.communities.length <= maxCommunities)
                        : dendrogram;
                const choices = within.length > 0 ? within : dendrogram.slice(0, 1);
                const best = choices.reduce((a, b) => (b.modularity > a.modularity ? b : a));

                const expected = new Map<unknown, unknown>();
                best.communities.forEach((members, group) => {
                    for (const id of members) {
                        expected.set(id, group);
                    }
                });
                assert.deepStrictEqual(
                    partition(groupsOf(output)),
                    partition(expected),
                    `cap ${String(maxCommunities)}`,
                );
                close(
                    output.graph?.modularity as number,
                    best.modularity,
                    `modularity at cap ${String(maxCommunities)}`,
                );
            }
        });

        it("leiden", async () => {
            const graph = await graphWith(fixture);
            const output = await computed(new LeidenAlgorithm(graph));
            const reference = leiden(toAlgorithmGraph(graph.getDataManager(), "undirected"), {
                resolution: 1,
                randomSeed: 42,
                maxIterations: 100,
                threshold: 1e-6,
            });
            const published = output.graph?.modularity as number;
            assert.approximately(published, reference.modularity, 0.02);

            // The modularity published is the modularity of the partition published.
            const snapshot = toSnapshot(toAlgorithmGraph(graph.getDataManager(), "undirected"));
            const groups = groupsOf(output);
            const labels = Uint32Array.from({ length: snapshot.nodeCount }, (_, i) =>
                Number(groups.get(snapshot.ids.idOf(i))),
            );
            // The snapshot's weight column is f32; the port reads the exact weights.
            assert.approximately(indexed.modularity(snapshot, labels), published, 1e-6);
        });
    });

    it("girvan-newman keeps a node of a community below minCommunitySize in its own group", async () => {
        // Two triangles and a lone pair: with minCommunitySize 3 the pair is below the size, and it
        // must not be published as a member of the first triangle's group.
        const graph = await graphWith({
            nodes: ["A", "B", "C", "D", "E", "F", "X", "Y"].map((id) => ({ id })),
            edges: [
                { srcId: "A", dstId: "B" },
                { srcId: "B", dstId: "C" },
                { srcId: "C", dstId: "A" },
                { srcId: "D", dstId: "E" },
                { srcId: "E", dstId: "F" },
                { srcId: "F", dstId: "D" },
                { srcId: "C", dstId: "D" },
                { srcId: "X", dstId: "Y" },
            ],
        });
        const output = await computed(new GirvanNewmanAlgorithm(graph, { minCommunitySize: 3 }));
        const groups = groupsOf(output);
        assert.strictEqual(groups.get("X"), groups.get("Y"));
        assert.notStrictEqual(groups.get("X"), groups.get("A"));
        assert.notStrictEqual(groups.get("X"), groups.get("D"));
    });

    it("girvan-newman counts a self-loop twice in its node's degree", async () => {
        // One node with a self-loop and one without an edge: each is its own community, and a
        // community holding all of its degree scores 0. The legacy function scored this 0.75.
        const lone = await computed(
            new GirvanNewmanAlgorithm(
                await graphWith({ nodes: [{ id: "A" }, { id: "B" }], edges: [{ srcId: "A", dstId: "A" }] }),
            ),
        );
        close(lone.graph?.modularity as number, 0, "modularity of a lone self-loop");

        // Two triangles joined by a bridge, with self-loops: the published score is the port's
        // modularity of the published partition.
        const graph = await graphWith({
            nodes: ["A", "B", "C", "D", "E", "F"].map((id) => ({ id })),
            edges: [
                { srcId: "A", dstId: "B" },
                { srcId: "B", dstId: "C" },
                { srcId: "C", dstId: "A" },
                { srcId: "D", dstId: "E" },
                { srcId: "E", dstId: "F" },
                { srcId: "F", dstId: "D" },
                { srcId: "C", dstId: "D" },
                { srcId: "A", dstId: "A", weight: 2 },
                { srcId: "E", dstId: "E" },
            ],
        });
        const output = await computed(new GirvanNewmanAlgorithm(graph));
        const snapshot = toSnapshot(toAlgorithmGraph(graph.getDataManager(), "undirected"));
        const groups = groupsOf(output);
        const labels = Uint32Array.from({ length: snapshot.nodeCount }, (_, i) =>
            Number(groups.get(snapshot.ids.idOf(i))),
        );
        close(output.graph?.modularity as number, indexed.modularity(snapshot, labels), "modularity with self-loops");
        assert.deepStrictEqual(partition(groups), ["A,B,C", "D,E,F"]);
    });

    it("leiden stays within 0.05 of the legacy modularity on small random graphs, and no lower on average", async () => {
        // Small graphs are where the port and the legacy function part ways most. Over 3,000 such
        // graphs the port scored between 0.046 below and 0.040 above the legacy function, and
        // 0.002 above it on average: a different partition, not a worse one.
        let random = 0x2545f491;
        const next = (): number => {
            random = (Math.imul(random, 1103515245) + 12345) >>> 0;
            return random / 2 ** 32;
        };
        let publishedTotal = 0;
        let referenceTotal = 0;
        for (let trial = 0; trial < 60; trial++) {
            const n = 3 + Math.floor(next() * 23);
            const p = 0.05 + next() * 0.3;
            const nodes = Array.from({ length: n }, (_, index) => ({ id: index }));
            const edges: MockGraphOpts["edges"] = [];
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    if (next() < p) {
                        edges.push({ srcId: i, dstId: j, weight: 1 + Math.floor(next() * 4) });
                    }
                }
            }
            const graph = await graphWith({ nodes, edges });
            const output = await computed(new LeidenAlgorithm(graph));
            const reference = leiden(toAlgorithmGraph(graph.getDataManager(), "undirected"), {
                resolution: 1,
                randomSeed: 42,
                maxIterations: 100,
                threshold: 1e-6,
            });
            const published = output.graph?.modularity as number;
            if (Number.isNaN(reference.modularity)) {
                continue;
            }
            assert.approximately(published, reference.modularity, 0.05, `trial ${String(trial)}`);
            publishedTotal += published;
            referenceTotal += reference.modularity;
        }
        assert.isAtLeast(publishedTotal, referenceTotal);
    });

    it("eigenvector with mode in or out on a directed graph equals the legacy directed route", async () => {
        for (const mode of ["in", "out"] as const) {
            const graph = await graphWith({ ...WEIGHTED_MULTI, directed: true });
            const { values } = await measured(graph, new EigenvectorCentralityAlgorithm(graph, { mode }));
            const reference = eigenvectorCentrality(toAlgorithmGraph(graph.getDataManager(), "directed"), {
                maxIterations: 1000,
                tolerance: 1e-6,
                mode,
            });
            for (const id of graph.getDataManager().nodes.keys()) {
                close(values.get(id), reference[String(id)], `eigenvector ${mode} of ${String(id)}`);
            }
        }
    });

    it("eigenvector turns a start vector keyed by node id into one keyed by row", async () => {
        const graph = await graphWith(WEIGHTED_MULTI);
        const startVector = new Map([
            ["A", 5],
            ["E", 0.1],
        ]);
        const algorithm = new EigenvectorCentralityAlgorithm(graph);
        // Programmatic only: the options schema does not carry a Map, so it is set on the options.
        (algorithm as unknown as { _schemaOptions: Record<string, unknown> })._schemaOptions.startVector = startVector;
        const { values } = await measured(graph, algorithm);
        const reference = eigenvectorCentrality(toAlgorithmGraph(graph.getDataManager(), "undirected"), {
            maxIterations: 1000,
            tolerance: 1e-6,
            mode: "total",
            startVector,
        });
        for (const id of graph.getDataManager().nodes.keys()) {
            close(values.get(id), reference[String(id)], `eigenvector of ${String(id)}`);
        }
    });

    describe("routing", () => {
        const floor = ACCELERATION_MIN_NODES_BY_CAPABILITY.eigenvectorCentrality;

        it("eigenvector carries a 6,600-node floor and is forwarded to the accelerator", () => {
            assert.strictEqual(floor, 6_600);
            const { fake } = eigenvectorFake();
            assert.isFunction(narrowAlgorithms(fake).eigenvectorCentrality);
        });

        it("eigenvector at the floor runs on the accelerator and says f32", async () => {
            const { fake, calls } = eigenvectorFake();
            const graph = await graphWith(oddRing(6_601), fake, true);
            const { values, precision } = await measured(graph, new EigenvectorCentralityAlgorithm(graph));
            assert.strictEqual(calls.eigenvector, 1);
            assert.strictEqual(precision, "f32");
            // A flat vector rescales to all 1, the dispatcher's finish of the accelerator's answer.
            assert.strictEqual(values.get("n0"), 1);
        });

        it("eigenvector below the floor runs on the processor and says f64", async () => {
            const { fake, calls } = eigenvectorFake();
            const graph = await graphWith(oddRing(6_599), fake, true);
            const { precision } = await measured(graph, new EigenvectorCentralityAlgorithm(graph));
            assert.strictEqual(calls.eigenvector, 0);
            assert.strictEqual(precision, "f64");
        });

        it("eigenvector above the floor on a graph the accelerator cannot answer says f64", async () => {
            // An even ring is bipartite, which the dispatcher keeps on the processor.
            const { fake, calls } = eigenvectorFake();
            const graph = await graphWith(oddRing(6_601 + 1), fake, true);
            const { precision } = await measured(graph, new EigenvectorCentralityAlgorithm(graph));
            assert.strictEqual(calls.eigenvector, 0);
            assert.strictEqual(precision, "f64");
        });

        it("eigenvector that does not converge on the accelerator fails with E_NOT_CONVERGED", async () => {
            const fake = createFakeAccelerator({
                members: {
                    eigenvectorCentrality: (s: GraphSnapshot) =>
                        Promise.resolve({ scores: new Float32Array(s.nodeCount), iterations: 1000, converged: false }),
                },
            });
            const graph = await graphWith(oddRing(6_601), fake, true);
            let thrown: unknown;
            try {
                await new EigenvectorCentralityAlgorithm(graph).publishResult(detachedRunContext(), "eigen_gpu");
            } catch (error) {
                thrown = error;
            }
            assert.isTrue(isGraphtyError(thrown));
            assert.strictEqual((thrown as { code: string }).code, "E_NOT_CONVERGED");
        });

        it("betweenness and closeness stay on the processor with an accelerator that has them", async () => {
            const { fake, calls } = eigenvectorFake();
            const graph = await graphWith(WEIGHTED_MULTI, fake);
            const betweenness = await measured(graph, new BetweennessCentralityAlgorithm(graph));
            const closeness = await measured(graph, new ClosenessCentralityAlgorithm(graph));
            assert.strictEqual(calls.closeness, 0);
            assert.strictEqual(betweenness.precision, "f64");
            assert.strictEqual(closeness.precision, "f64");
        });

        it("betweenness and closeness run on the processor under required with an accelerator that lacks them", async () => {
            // The element does not forward either, so the controller is never asked -- asked, it
            // would refuse with E_NO_ACCELERATOR because this accelerator has no such member.
            const fake = createFakeAccelerator();
            assert.notProperty(fake, "betweennessCentrality");
            assert.notProperty(fake, "closenessCentrality");
            const graph = await graphWith(WEIGHTED_MULTI, fake, true, "required");
            const betweenness = await measured(graph, new BetweennessCentralityAlgorithm(graph));
            const closeness = await measured(graph, new ClosenessCentralityAlgorithm(graph));
            assert.strictEqual(betweenness.precision, "f64");
            assert.strictEqual(closeness.precision, "f64");
            assert.isAbove(betweenness.values.get("C") ?? 0, 0);
        });
    });

    it("none of the five builds a legacy graph or imports a legacy function", () => {
        for (const name of [
            "BetweennessCentrality",
            "ClosenessCentrality",
            "EigenvectorCentrality",
            "Leiden",
            "GirvanNewman",
        ]) {
            const source = readFileSync(new URL(`../../src/algorithms/${name}Algorithm.ts`, import.meta.url), "utf8");
            assert.notInclude(source, "algorithmGraph(", name);
            assert.notInclude(source, "toAlgorithmGraph", name);
            for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@graphty\/algorithms"/g)) {
                const values = match[1]
                    .split(",")
                    .map((part) => part.trim())
                    .filter((part) => part !== "" && !part.startsWith("type "));
                for (const value of values) {
                    assert.include(["accelerated", "indexed", "toSnapshot", "ConvergenceError"], value, name);
                }
            }
        }
    });
});
