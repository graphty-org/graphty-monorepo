/**
 * @file Kruskal's minimum spanning tree through `accelerated()`: on both sides of its routing
 * floor, with no accelerator, and with the run saying which path answered (`caveats.precision`:
 * `f32` when the accelerator chose the edges, `f64` when the CPU port did).
 */

import { kruskalMST } from "@graphty/algorithms";
import type { GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { AccelerationController } from "../../src/acceleration/AccelerationController";
import { narrowAlgorithms } from "../../src/acceleration/narrow";
import { AcceleratorRegistry } from "../../src/acceleration/registry";
import {
    ACCELERATION_MIN_NODES_BY_CAPABILITY,
    ACCELERATION_MIN_NODES_UNWEIGHTED_BY_CAPABILITY,
} from "../../src/acceleration/types";
import { KruskalAlgorithm } from "../../src/algorithms/KruskalAlgorithm";
import { type AlgorithmOutput, detachedRunContext } from "../../src/algorithms/results";
import type { Graph } from "../../src/Graph";
import { createFakeAccelerator, type FakeAccelerator } from "../../src/testing/fakeAccelerator";
import { createMockGraph, type MockGraphOpts } from "../helpers/mockGraph";
import { referenceSnapshot } from "../helpers/reference-snapshot";

const floor = ACCELERATION_MIN_NODES_BY_CAPABILITY.minimumSpanningTree ?? NaN;
const unweightedFloor = ACCELERATION_MIN_NODES_UNWEIGHTED_BY_CAPABILITY.minimumSpanningTree ?? NaN;

/**
 * A weighted ring of n nodes: the tree drops the heaviest edge, the one closing the ring.
 * @param n - The node count.
 * @returns The records.
 */
function ring(n: number): MockGraphOpts {
    const nodes = Array.from({ length: n }, (_, i) => ({ id: `n${String(i)}` }));
    return {
        nodes,
        edges: nodes.map((node, i) => ({ srcId: node.id, dstId: `n${String((i + 1) % n)}`, weight: i + 1 })),
    };
}

/**
 * The same ring with no weights at all.
 * @param n - The node count.
 * @returns The records.
 */
function bareRing(n: number): MockGraphOpts {
    const { nodes, edges } = ring(n);
    return { nodes, edges: (edges ?? []).map(({ srcId, dstId }) => ({ srcId, dstId })) };
}

/**
 * The element's graph with the built-in floors in force and, when given, an accelerator.
 * @param opts - The records.
 * @param fake - The accelerator, or none.
 * @returns The graph.
 */
async function graphWith(opts: MockGraphOpts, fake?: FakeAccelerator): Promise<Graph> {
    const graph = await createMockGraph(opts);
    (graph as unknown as { acceleration: AccelerationController }).acceleration = new AccelerationController({
        policy: "auto",
        registry: new AcceleratorRegistry(),
    });
    if (fake !== undefined) {
        graph.acceleration.setAccelerator(fake);
    }
    return graph;
}

/**
 * A fake whose minimum spanning tree records each call and answers the first edge alone, weight
 * 42, a forest the CPU port would never choose.
 * @returns The fake and the snapshots it was handed.
 */
function mstFake(): { fake: FakeAccelerator; handed: GraphSnapshot[] } {
    const handed: GraphSnapshot[] = [];
    const fake = createFakeAccelerator({
        members: {
            minimumSpanningTree: (s: GraphSnapshot) => {
                handed.push(s);
                return Promise.resolve({ edges: Uint32Array.of(0), totalWeight: 42 });
            },
        },
    });
    return { fake, handed };
}

/**
 * Run Kruskal and hand back what it published.
 * @param graph - The graph.
 * @returns Its output.
 */
async function computed(graph: Graph): Promise<AlgorithmOutput> {
    const output = await new KruskalAlgorithm(graph).compute(detachedRunContext());
    assert.isNotNull(output);
    return output;
}

describe("kruskal through accelerated()", () => {
    it("forwards minimumSpanningTree, with a floor", () => {
        assert.isFunction(narrowAlgorithms(mstFake().fake).minimumSpanningTree);
        assert.isAbove(floor, 0);
    });

    it("with no accelerator, publishes the algorithms function's tree and says f64", async () => {
        const graph = await graphWith(ring(floor));
        const output = await computed(graph);
        const reference = kruskalMST(referenceSnapshot(graph.getDataManager(), "undirected"));
        assert.strictEqual(output.graph?.totalWeight, reference.totalWeight);
        assert.strictEqual(output.caveats.precision, "f64");
        const inTree = (output.edges ?? []).filter((edge) => edge.values.in === true);
        assert.strictEqual(inTree.length, floor - 1);
    });

    it("at the floor reaches the accelerator, publishes its tree and says f32", async () => {
        const { fake, handed } = mstFake();
        const output = await computed(await graphWith(ring(floor), fake));
        assert.lengthOf(handed, 1);
        assert.strictEqual(output.caveats.precision, "f32");
        assert.strictEqual(output.graph?.totalWeight, 42);
        assert.strictEqual((output.edges ?? []).filter((edge) => edge.values.in === true).length, 1);
    });

    it("one node below the floor stays on the CPU port and says f64", async () => {
        const { fake, handed } = mstFake();
        const output = await computed(await graphWith(ring(floor - 1), fake));
        assert.lengthOf(handed, 0);
        assert.strictEqual(output.caveats.precision, "f64");
        assert.strictEqual(output.graph?.totalWeight, ((floor - 2) * (floor - 1)) / 2);
    });

    it("an unweighted graph at the weighted floor stays on the CPU port: its own floor is higher", async () => {
        assert.isAbove(unweightedFloor, floor);
        const { fake, handed } = mstFake();
        const output = await computed(await graphWith(bareRing(floor), fake));
        assert.lengthOf(handed, 0);
        assert.strictEqual(output.caveats.precision, "f64");
        assert.strictEqual(output.graph?.totalWeight, floor - 1);
    });

    it("an unweighted graph at its own floor reaches the accelerator", async () => {
        const { fake, handed } = mstFake();
        const output = await computed(await graphWith(bareRing(unweightedFloor), fake));
        assert.lengthOf(handed, 1);
        assert.isTrue(handed[0].weights?.every((weight) => weight === 1) ?? true);
        assert.strictEqual(output.caveats.precision, "f32");
    });
});
