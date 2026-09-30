/**
 * @file Closeness centrality through `accelerated()`: exact and sampled, on both sides of the floor
 * and of the exact run's size cap.
 *
 * The CPU answers are held to `@graphty/algorithms`' `closenessCentrality` over the same
 * simplified graph; the routing to a fake accelerator that records what it was handed.
 */

import { closenessCentrality } from "@graphty/algorithms";
import type { GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { AccelerationController } from "../../src/acceleration/AccelerationController";
import { narrowAlgorithms } from "../../src/acceleration/narrow";
import { AcceleratorRegistry } from "../../src/acceleration/registry";
import {
    ACCELERATION_MIN_NODES_BY_CAPABILITY,
    ACCELERATION_MIN_SOURCE_EDGES_BY_CAPABILITY,
} from "../../src/acceleration/types";
import {
    ClosenessCentralityAlgorithm,
    EXACT_CLOSENESS_MAX_ACCELERATED_NODES,
} from "../../src/algorithms/ClosenessCentralityAlgorithm";
import type { NodeId } from "../../src/catalog/types";
import { isGraphtyError } from "../../src/errors";
import type { Graph } from "../../src/Graph";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { createFakeAccelerator, type FakeAccelerator } from "../../src/testing/fakeAccelerator";
import { createMockGraph, type MockGraphOpts } from "../helpers/mockGraph";
import { byId, referenceSnapshot } from "../helpers/reference-snapshot";
import { makeSession } from "../session/helpers";

const FLOOR = ACCELERATION_MIN_NODES_BY_CAPABILITY.closenessCentrality ?? NaN;
/** On a ring of FLOOR nodes (as many edges as nodes), the fewest sources that clear the source-edge floor. */
const K_AT_FLOOR = (ACCELERATION_MIN_SOURCE_EDGES_BY_CAPABILITY.closenessCentrality ?? NaN) / FLOOR;

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
 * The element's graph with the built-in floors in force and, when given, an accelerator.
 * @param opts - The records.
 * @param fake - The accelerator.
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

/** A fake whose closeness member records the options it was handed and answers 0.5 everywhere. */
function closenessFake(): { fake: FakeAccelerator; handed: unknown[] } {
    const handed: unknown[] = [];
    const fake = createFakeAccelerator({
        members: {
            closenessCentrality: (s: GraphSnapshot, options?: { sources?: readonly number[] }) => {
                handed.push(options);
                return Promise.resolve({
                    scores: new Float32Array(s.nodeCount).fill(0.5),
                    iterations: 1,
                    converged: true,
                    sourcesUsed: options?.sources?.length ?? s.nodeCount,
                });
            },
        },
    });
    return { fake, handed };
}

/**
 * Run closeness and read what it published.
 * @param graph - The graph.
 * @param algorithm - The run.
 * @returns The values by node id and the caveats.
 */
async function measured(graph: Graph, algorithm: ClosenessCentralityAlgorithm) {
    await algorithm.run();
    const { result } = algorithm;
    assert.isDefined(result);
    const values = new Map<NodeId, number | undefined>();
    for (const id of graph.getDataManager().nodes.keys()) {
        values.set(id, result.node(id)?.value as number | undefined);
    }
    return { values, caveats: result.summary().caveats };
}

describe("closeness centrality through accelerated()", () => {
    it("sampled by k on the CPU port equals the algorithms function's k draw, and says so in its caveats", async () => {
        const graph = await graphWith(LES_MIS);
        const { values, caveats } = await measured(graph, new ClosenessCentralityAlgorithm(graph, { k: 12 }));
        const s = referenceSnapshot(graph.getDataManager(), "undirected");
        const reference = byId(s, closenessCentrality(s, { k: 12 }).scores);
        for (const [id, value] of values) {
            assert.strictEqual(value, reference.get(id), `score of ${String(id)}`);
        }
        assert.isFalse(caveats.exact);
        assert.strictEqual(caveats.sampleSize, 12);
        assert.strictEqual(caveats.method, "closeness-bfs-sampled");
        assert.strictEqual(caveats.precision, "f64");
    });

    it("a k past the node count samples every node, which is the exact score", async () => {
        const graph = await graphWith(LES_MIS);
        const exact = await measured(graph, new ClosenessCentralityAlgorithm(graph));
        const all = await measured(graph, new ClosenessCentralityAlgorithm(graph, { k: 100_000 }));
        for (const [id, value] of exact.values) {
            assert.strictEqual(all.values.get(id), value, `score of ${String(id)}`);
        }
        assert.isTrue(exact.caveats.exact);
    });

    it("takes k through the public run path, the one a consumer uses", async () => {
        const params: Readonly<Record<string, unknown>>[] = [];
        const harness = makeSession({
            runs: {
                execute: async (context: RunExecutionContext): Promise<RunOutcome> => {
                    params.push(context.params);
                    return Promise.reject(new Error("not needed: the params were checked"));
                },
            },
        });
        harness.add([{ id: "a" }, { id: "b" }]);
        try {
            await harness.session.runs.start("closeness", { k: 1 }, { style: false });
        } catch {
            // The executor refuses on purpose; only what reached it is under test.
        }
        assert.deepStrictEqual(
            params.map((p) => p.k),
            [1],
        );
    });

    describe("routing", () => {
        it("forwards closeness, floored at the 4,000 nodes measured against the 3.0 port", () => {
            assert.strictEqual(FLOOR, 4_000);
            const narrowed = narrowAlgorithms(closenessFake().fake);
            assert.isFunction(narrowed.closenessCentrality);
        });

        it("a sampled run at both floors reaches the accelerator with the drawn sources and says f32", async () => {
            const { fake, handed } = closenessFake();
            const graph = await graphWith(ring(FLOOR), fake);
            const { values, caveats } = await measured(graph, new ClosenessCentralityAlgorithm(graph, { k: K_AT_FLOOR }));
            assert.strictEqual(handed.length, 1);
            const options = handed[0] as { sources: number[]; weighted: boolean };
            assert.strictEqual(options.sources.length, K_AT_FLOOR);
            assert.isFalse(options.weighted);
            assert.strictEqual(caveats.precision, "f32");
            assert.strictEqual(caveats.sampleSize, K_AT_FLOOR);
            assert.strictEqual(values.get("n0"), 0.5);
        });

        it("a sampled run with one source too few for the source-edge floor stays on the CPU port", async () => {
            const { fake, handed } = closenessFake();
            const graph = await graphWith(ring(FLOOR), fake);
            const { caveats } = await measured(graph, new ClosenessCentralityAlgorithm(graph, { k: K_AT_FLOOR - 1 }));
            assert.strictEqual(handed.length, 0);
            assert.strictEqual(caveats.precision, "f64");
        });

        it("a sampled run one node below the floor stays on the CPU port and says f64", async () => {
            const { fake, handed } = closenessFake();
            const graph = await graphWith(ring(FLOOR - 1), fake);
            const { caveats } = await measured(graph, new ClosenessCentralityAlgorithm(graph, { k: 10 }));
            assert.strictEqual(handed.length, 0);
            assert.strictEqual(caveats.precision, "f64");
        });

        it("an exact run at the floor reaches the accelerator with no sources", async () => {
            const { fake, handed } = closenessFake();
            const graph = await graphWith(ring(FLOOR), fake);
            const { caveats } = await measured(graph, new ClosenessCentralityAlgorithm(graph));
            assert.deepStrictEqual(handed, [{ weighted: false }]);
            assert.strictEqual(caveats.precision, "f32");
            assert.isTrue(caveats.exact);
        });

        it("an exact run above the size cap is never sent: under required it refuses before any work", async () => {
            const { fake, handed } = closenessFake();
            const graph = await graphWith(ring(EXACT_CLOSENESS_MAX_ACCELERATED_NODES + 1), fake, "required");
            let thrown: unknown;
            try {
                await new ClosenessCentralityAlgorithm(graph).run();
            } catch (error) {
                thrown = error;
            }
            assert.isTrue(isGraphtyError(thrown), String(thrown));
            assert.strictEqual((thrown as { code: string }).code, "E_NO_ACCELERATOR");
            assert.strictEqual(handed.length, 0);
        });
    });
});
