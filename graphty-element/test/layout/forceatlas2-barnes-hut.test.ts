/**
 * ForceAtlas2's `barnesHut` option, by counted work (issue #10447): the pair forces one node feels in one step.
 *
 * Off (the default), every node is pushed by every other one, so the count per node grows with the graph. On, a far
 * group of nodes pushes as one, so the count per node stays bounded as the graph grows. The simulation is built from
 * the options the element's own mapping hands it, so a mapping that dropped the option fails here.
 */
import { fromEdgeArrays } from "@graphty/graph-format";
import { createSimulation, type ForceAtlas2Options, ForceAtlas2Simulation } from "@graphty/layout";
import { afterEach, assert, describe, it, vi } from "vitest";

import { resolveSimulationOptions } from "../../src/managers/LayoutManager";

const BEHAVIOR = {
    type: "ngraph",
    preSteps: 0,
    stepMultiplier: 1,
    minDelta: 0,
    zoomStepInterval: 1,
    maxInFlight: 2,
} as const;

/**
 * Exact pair forces per node in one step of ForceAtlas2 over a ring of n nodes.
 * @param n - the node count
 * @param options - the element options the reader set
 * @returns pair forces evaluated, divided by n
 */
function pairsPerNode(n: number, options: Record<string, unknown>): number {
    const src = new Uint32Array(n).map((_, i) => i);
    const dst = new Uint32Array(n).map((_, i) => (i + 1) % n);
    const graph = fromEdgeArrays({ directed: false, nodeCount: n, src, dst });
    const model = resolveSimulationOptions("forceatlas2", { seed: 7, dim: 2, ...options }, BEHAVIOR)
        .model as ForceAtlas2Options;
    const simulation = createSimulation("forceatlas2", model);
    simulation.load(graph, new Float32Array(3 * n).fill(Number.NaN));
    // pairScale is the one place a pair's push is computed, on the exact and the Barnes-Hut path alike.
    const spy = vi.spyOn(ForceAtlas2Simulation.prototype as unknown as { pairScale: () => number }, "pairScale");
    assert.isUndefined(simulation.step(1), "the processor simulation steps in place");
    const pairs = spy.mock.calls.length;
    spy.mockRestore();
    simulation.dispose();
    return pairs / n;
}

describe("forceatlas2 barnesHut", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("off by default: every node feels every other one, so the count grows with the graph", () => {
        assert.isAtLeast(pairsPerNode(500, {}), 499);
        assert.isAtLeast(pairsPerNode(2000, {}), 1999);
    });

    it("on: the pair forces per node stay bounded as the graph grows fourfold", () => {
        const small = pairsPerNode(500, { barnesHut: true });
        const large = pairsPerNode(2000, { barnesHut: true });
        assert.isBelow(small, 100, `${small} pairs per node at 500 nodes`);
        assert.isBelow(large, 100, `${large} pairs per node at 2000 nodes`);
        assert.isBelow(large, 2 * small, "fourfold the nodes is far less than fourfold the work per node");
    });

    it("a lower theta does more exact work", () => {
        assert.isAbove(
            pairsPerNode(1000, { barnesHut: true, barnesHutTheta: 0.3 }),
            pairsPerNode(1000, { barnesHut: true }),
        );
    });
});
