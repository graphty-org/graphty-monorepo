/**
 * @file HITS, Katz and eigenvector centrality through `accelerated()`, on both sides of their floors.
 *
 * Each adapter runs over the index-based port through the dispatcher, so its CPU answer is held
 * to the `@graphty/algorithms` function over the same simplified graph. Then the routing, with a
 * fake accelerator and the built-in floors in force: at a capability's floor the run reaches the
 * accelerator and says `f32`, one node below it the run stays on the CPU port and says `f64`.
 */

import { readFileSync } from "node:fs";

import { eigenvectorCentrality, hits, katzCentrality } from "@graphty/algorithms";
import type { GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { AccelerationController } from "../../src/acceleration/AccelerationController";
import { narrowAlgorithms } from "../../src/acceleration/narrow";
import { AcceleratorRegistry } from "../../src/acceleration/registry";
import { ACCELERATION_MIN_NODES_BY_CAPABILITY, type FlooredCapability } from "../../src/acceleration/types";
import { EigenvectorCentralityAlgorithm } from "../../src/algorithms/EigenvectorCentralityAlgorithm";
import { HITSAlgorithm } from "../../src/algorithms/HITSAlgorithm";
import { KatzCentralityAlgorithm } from "../../src/algorithms/KatzCentralityAlgorithm";
import type { MetricAlgorithm } from "../../src/algorithms/metrics/MetricAlgorithm";
import type { NodeId } from "../../src/catalog/types";
import { isGraphtyError } from "../../src/errors";
import type { Graph } from "../../src/Graph";
import { createFakeAccelerator, type FakeAccelerator } from "../../src/testing/fakeAccelerator";
import { createMockGraph, type MockGraphOpts } from "../helpers/mockGraph";
import { byId, referenceSnapshot } from "../helpers/reference-snapshot";

/** Two triangles joined by a path, with a parallel pair and a reciprocal pair. */
const MULTI: MockGraphOpts = {
    nodes: ["A", "B", "C", "D", "E", "F", "G"].map((id) => ({ id })),
    edges: [
        { srcId: "A", dstId: "B" },
        { srcId: "A", dstId: "B" },
        { srcId: "B", dstId: "C" },
        { srcId: "C", dstId: "A" },
        { srcId: "C", dstId: "D" },
        { srcId: "D", dstId: "C" },
        { srcId: "D", dstId: "E" },
        { srcId: "E", dstId: "F" },
        { srcId: "F", dstId: "G" },
        { srcId: "G", dstId: "E" },
    ],
};

/** Les Miserables co-appearances, the fixture the per-adapter tests already use. */
const LES_MIS: MockGraphOpts = { dataPath: "./data4.json" };

/**
 * A ring of n nodes with one chord closing a triangle, so no component is bipartite whatever n is
 * and eigenvector centrality is a question the device kernel answers the port's way.
 * @param n - The node count.
 * @returns The records.
 */
function chordedRing(n: number): MockGraphOpts {
    const nodes = Array.from({ length: n }, (_, i) => ({ id: `n${String(i)}` }));
    const edges = nodes.map((node, i) => ({ srcId: node.id, dstId: `n${String((i + 1) % n)}` }));
    edges.push({ srcId: "n0", dstId: "n2" });
    return { nodes, edges };
}

/**
 * A plain ring of an even count: bipartite, which the dispatcher keeps off the device for
 * eigenvector centrality.
 * @param n - The node count, even.
 * @returns The records.
 */
function evenRing(n: number): MockGraphOpts {
    const nodes = Array.from({ length: n }, (_, i) => ({ id: `n${String(i)}` }));
    return { nodes, edges: nodes.map((node, i) => ({ srcId: node.id, dstId: `n${String((i + 1) % n)}` })) };
}

/**
 * The element's graph, with an accelerator attached when the case wants one.
 * @param opts - The records.
 * @param fake - The accelerator.
 * @param floors - Whether the built-in per-capability floors apply.
 * @returns The graph.
 */
async function graphWith(opts: MockGraphOpts, fake?: FakeAccelerator, floors = false): Promise<Graph> {
    const graph = await createMockGraph(opts);
    if (floors) {
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
 * Run a metric and read what it published.
 * @param graph - The graph it ran over.
 * @param algorithm - The metric.
 * @returns The values per node id, and the precision caveat.
 */
async function measured(
    graph: Graph,
    algorithm: MetricAlgorithm,
): Promise<{ values: Map<NodeId, Record<string, unknown>>; precision: string }> {
    await algorithm.run();
    const { result } = algorithm;
    assert.isDefined(result);
    const values = new Map<NodeId, Record<string, unknown>>();
    for (const id of graph.getDataManager().nodes.keys()) {
        values.set(id, result.node(id) ?? {});
    }
    return { values, precision: result.summary().caveats.precision };
}

/**
 * Relative agreement to 1e-9.
 * @param actual - The adapter's value.
 * @param expected - The reference value.
 * @param what - What is compared, for the message.
 */
function close(actual: unknown, expected: number | undefined, what: string): void {
    assert.isNumber(actual, what);
    assert.isDefined(expected, what);
    assert.approximately(actual as number, expected, 1e-9 * Math.max(1, Math.abs(expected)), what);
}

/** A fake that implements the three members and counts the calls to each. */
function centralityFake(): { fake: FakeAccelerator; calls: Record<string, number> } {
    const calls = { hits: 0, katzCentrality: 0, eigenvectorCentrality: 0 };
    const flat = (s: GraphSnapshot): Float32Array => new Float32Array(s.nodeCount).fill(0.5);
    const fake = createFakeAccelerator({
        members: {
            hits: (s: GraphSnapshot) => {
                calls.hits++;
                return Promise.resolve({ hubs: flat(s), authorities: flat(s), iterations: 3, converged: true });
            },
            katzCentrality: (s: GraphSnapshot) => {
                calls.katzCentrality++;
                return Promise.resolve({ scores: flat(s), iterations: 3, converged: true });
            },
            eigenvectorCentrality: (s: GraphSnapshot) => {
                calls.eigenvectorCentrality++;
                return Promise.resolve({ scores: flat(s), iterations: 3, converged: true });
            },
        },
    });
    return { fake, calls };
}

/**
 * The built-in floor of a capability.
 * @param capability - The capability.
 * @returns Its floor.
 */
function floorOf(capability: FlooredCapability): number {
    const floor = ACCELERATION_MIN_NODES_BY_CAPABILITY[capability];
    assert.isDefined(floor, `${capability} has a floor`);
    return floor;
}

const FIXTURES: readonly [string, MockGraphOpts][] = [
    ["a multigraph", MULTI],
    ["les miserables", LES_MIS],
];

describe("hits, katz and eigenvector centrality through accelerated()", () => {
    describe("the CPU port answers what the @graphty/algorithms function answers", () => {
        for (const [name, opts] of FIXTURES) {
            it(`hits, ${name}`, async () => {
                const graph = await graphWith(opts);
                const { values, precision } = await measured(graph, new HITSAlgorithm(graph));
                const s = referenceSnapshot(graph.getDataManager(), "directed");
                const reference = hits(s, { weighted: false });
                const hubs = byId(s, reference.hubs);
                const authorities = byId(s, reference.authorities);
                assert.strictEqual(precision, "f64");
                for (const [id, value] of values) {
                    const hub = hubs.get(id) as number;
                    const authority = authorities.get(id) as number;
                    close(value.hub, hub, `hub of ${String(id)}`);
                    close(value.authority, authority, `authority of ${String(id)}`);
                    close(value.value, (hub + authority) / 2, `value of ${String(id)}`);
                }
            });

            it(`katz, ${name}`, async () => {
                const graph = await graphWith(opts);
                const { values, precision } = await measured(graph, new KatzCentralityAlgorithm(graph));
                const s = referenceSnapshot(graph.getDataManager(), "undirected");
                const reference = byId(s, katzCentrality(s, { weighted: false }).scores);
                assert.strictEqual(precision, "f64");
                for (const [id, value] of values) {
                    close(value.value, reference.get(id), `score of ${String(id)}`);
                }
            });

            it(`eigenvector, ${name}`, async () => {
                const graph = await graphWith(opts);
                const { values, precision } = await measured(graph, new EigenvectorCentralityAlgorithm(graph));
                const s = referenceSnapshot(graph.getDataManager(), "undirected");
                const reference = byId(s, eigenvectorCentrality(s, { weighted: false, maxIterations: 1000 }).scores);
                assert.strictEqual(precision, "f64");
                for (const [id, value] of values) {
                    close(value.value, reference.get(id), `score of ${String(id)}`);
                }
            });
        }

        it("hits unnormalised and katz raw agree too", async () => {
            const graph = await graphWith(LES_MIS);
            const hitsRun = await measured(graph, new HITSAlgorithm(graph, { normalized: false }));
            const katzRun = await measured(graph, new KatzCentralityAlgorithm(graph, { normalized: false }));
            const directed = referenceSnapshot(graph.getDataManager(), "directed");
            const undirected = referenceSnapshot(graph.getDataManager(), "undirected");
            const hitsRef = byId(directed, hits(directed, { weighted: false, normalized: false }).hubs);
            const katzRef = byId(undirected, katzCentrality(undirected, { weighted: false, normalized: false }).scores);
            for (const id of graph.getDataManager().nodes.keys()) {
                close(hitsRun.values.get(id)?.hub, hitsRef.get(id), `hub of ${String(id)}`);
                close(katzRun.values.get(id)?.value, katzRef.get(id), `katz of ${String(id)}`);
            }
        });
    });

    describe("routing", () => {
        it("carries the measured floors and forwards the three members, and not the unmeasured ones", () => {
            assert.strictEqual(floorOf("hits"), 15_000);
            assert.strictEqual(floorOf("katzCentrality"), 100_000);
            assert.strictEqual(floorOf("eigenvectorCentrality"), 100_000);

            const noop = (): Promise<never> => Promise.reject(new Error("not called"));
            const narrowed = narrowAlgorithms(
                createFakeAccelerator({
                    members: {
                        hits: noop,
                        katzCentrality: noop,
                        eigenvectorCentrality: noop,
                        kCoreDecomposition: noop,
                        louvain: noop,
                    },
                }),
            );
            assert.isFunction(narrowed.hits);
            assert.isFunction(narrowed.katzCentrality);
            assert.isFunction(narrowed.eigenvectorCentrality);
            assert.isFalse("kCoreDecomposition" in narrowed);
            assert.isFalse("louvain" in narrowed);
        });

        const cases: readonly [FlooredCapability, (graph: Graph) => MetricAlgorithm][] = [
            ["hits", (graph) => new HITSAlgorithm(graph)],
            ["katzCentrality", (graph) => new KatzCentralityAlgorithm(graph)],
            ["eigenvectorCentrality", (graph) => new EigenvectorCentralityAlgorithm(graph)],
        ];

        for (const [capability, make] of cases) {
            it(`${capability} at its floor runs on the accelerator and says f32`, async () => {
                const { fake, calls } = centralityFake();
                const graph = await graphWith(chordedRing(floorOf(capability)), fake, true);
                const { values, precision } = await measured(graph, make(graph));
                assert.strictEqual(calls[capability], 1);
                assert.strictEqual(precision, "f32");
                // The fake's flat 0.5 is what was published, on the port's scale: eigenvector's is
                // rescaled to 1 and HITS's to unit length by the dispatcher, and Katz's equal scores
                // are left as they are, as the port leaves its own.
                const n = floorOf(capability);
                const expected: Partial<Record<FlooredCapability, number>> = {
                    hits: 1 / Math.sqrt(n),
                    katzCentrality: 0.5,
                    eigenvectorCentrality: 1,
                };
                close(values.get("n0")?.value, expected[capability], `${capability} n0`);
            });

            it(`${capability} one node below its floor runs on the CPU port and says f64`, async () => {
                const { fake, calls } = centralityFake();
                const graph = await graphWith(chordedRing(floorOf(capability) - 1), fake, true);
                const { precision } = await measured(graph, make(graph));
                assert.strictEqual(calls[capability], 0);
                assert.strictEqual(precision, "f64");
            });
        }

        it("eigenvector above its floor on a graph the device cannot answer runs the port and says f64", async () => {
            const { fake, calls } = centralityFake();
            const graph = await graphWith(evenRing(floorOf("eigenvectorCentrality") + 2), fake, true);
            const { precision } = await measured(graph, new EigenvectorCentralityAlgorithm(graph));
            assert.strictEqual(calls.eigenvectorCentrality, 0);
            assert.strictEqual(precision, "f64");
        });

        it("eigenvector under acceleration=required on a graph the device cannot answer fails with E_NO_ACCELERATOR", async () => {
            const { fake, calls } = centralityFake();
            const graph = await graphWith(evenRing(8), fake);
            (graph as unknown as { acceleration: AccelerationController }).acceleration = new AccelerationController({
                policy: "required",
                registry: new AcceleratorRegistry(),
            });
            graph.acceleration.setAccelerator(fake);
            const algorithm = new EigenvectorCentralityAlgorithm(graph);
            let thrown: unknown;
            try {
                await algorithm.run();
            } catch (error) {
                thrown = error;
            }
            assert.isTrue(isGraphtyError(thrown), String(thrown));
            assert.strictEqual((thrown as { code: string }).code, "E_NO_ACCELERATOR");
            assert.strictEqual(calls.eigenvectorCentrality, 0);
            assert.isUndefined(algorithm.result);
        });

        it("eigenvector that does not converge on the accelerator fails with E_NOT_CONVERGED", async () => {
            const fake = createFakeAccelerator({
                members: {
                    eigenvectorCentrality: (s: GraphSnapshot) =>
                        Promise.resolve({ scores: new Float32Array(s.nodeCount), iterations: 1000, converged: false }),
                },
            });
            const graph = await graphWith(chordedRing(floorOf("eigenvectorCentrality")), fake, true);
            const algorithm = new EigenvectorCentralityAlgorithm(graph);
            let thrown: unknown;
            try {
                await algorithm.run();
            } catch (error) {
                thrown = error;
            }
            assert.isTrue(isGraphtyError(thrown), String(thrown));
            assert.strictEqual((thrown as { code: string }).code, "E_NOT_CONVERGED");
            assert.isUndefined(algorithm.result);
        });
    });

    it("none of the three adapters imports a legacy algorithm function", () => {
        for (const file of ["HITSAlgorithm", "KatzCentralityAlgorithm", "EigenvectorCentralityAlgorithm"]) {
            const source = readFileSync(new URL(`../../src/algorithms/${file}.ts`, import.meta.url), "utf8");
            const imported = /import\s*\{([^}]*)\}\s*from\s*"@graphty\/algorithms"/.exec(source)?.[1] ?? "";
            for (const legacy of ["hits", "katzCentrality", "eigenvectorCentrality"]) {
                assert.notMatch(imported, new RegExp(`\\b${legacy}\\b`), `${file} imports ${legacy}`);
            }
            assert.notInclude(source, "this.algorithmGraph(", `${file} builds a legacy graph`);
        }
    });
});
