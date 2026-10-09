/**
 * ARF's `scalingFactor` is the number of scene units per layout unit: `@graphty/layout`'s arf puts the
 * farthest node 1 from the centre, and the engine multiplies by this option (default 100).
 */
import "../../src/layout";

import { assert, describe, it } from "vitest";

import type { Edge } from "../../src/Edge";
import { LayoutEngine, layoutEngineInternals } from "../../src/layout/LayoutEngine";
import type { Node } from "../../src/Node";

const nodes = ["a", "b", "c", "d", "e"].map((id) => ({ id }) as unknown as Node);
const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 0],
    [0, 2],
].map(
    ([s, d]) => ({ srcId: nodes[s].id, dstId: nodes[d].id, srcNode: nodes[s], dstNode: nodes[d] }) as unknown as Edge,
);

/**
 * Run ARF on the fixed graph with a fixed seed.
 * @param opts - extra engine options
 * @returns every node's x and y, in node order
 */
function run(opts: object): number[] {
    const engine = LayoutEngine.get("arf", { seed: 7, maxIter: 200, ...opts });
    assert.isNotNull(engine);
    if (engine === null) {
        return [];
    }

    layoutEngineInternals.addNodes(engine, nodes);
    layoutEngineInternals.addEdges(engine, edges);
    engine.step();
    return nodes.flatMap((n) => {
        const p = engine.getNodePosition(n);
        return [p.x, p.y];
    });
}

describe("arf scalingFactor", () => {
    it("scales the positions: 50 gives half of the default 100", () => {
        const full = run({});
        const half = run({ scalingFactor: 50 });
        assert.isAbove(Math.max(...full.map(Math.abs)), 1);
        full.forEach((v, i) => {
            assert.approximately(half[i], v / 2, 1e-3);
        });
    });
});
