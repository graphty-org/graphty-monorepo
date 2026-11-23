/**
 * Columns by group spreads its columns so the drawing is a readable shape: 17 groups used to draw
 * as a band about a sixth as wide as it was tall, about 80 px wide at Fit (issue #9301).
 */
import "../../src/layout";

import { assert, describe, it } from "vitest";

import { LayoutEngine, layoutEngineInternals } from "../../src/layout/LayoutEngine";
import { fakeNode } from "../helpers/layout-fakes";

/**
 * Lay out 17 groups, the first of 40 nodes and the rest of 3, and measure the drawing.
 * @param opts - further engine options
 * @returns width over height of the laid-out nodes
 */
function ratioOf(opts: object): number {
    const subsetKey: Record<string, string[]> = {};
    for (let k = 0; k < 17; k++) {
        subsetKey[`g${String(k)}`] = Array.from({ length: k === 0 ? 40 : 3 }, (_, j) => `${String(k)}-${String(j)}`);
    }
    const engine = LayoutEngine.get("multipartite", { subsetKey, ...opts });
    assert.isNotNull(engine);
    if (engine === null) {
        return Number.NaN;
    }
    const nodes = Object.values(subsetKey)
        .flat()
        .map((id) => fakeNode(id));
    layoutEngineInternals.addNodes(engine, nodes);
    engine.step();
    const points = nodes.map((n) => engine.getNodePosition(n));
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
}

describe("multipartite aspect ratio", () => {
    it("17 groups draw about as wide over high as a canvas by default", () => {
        const ratio = ratioOf({});
        assert.approximately(ratio, 4 / 3, 1e-3);
    });

    it("the aspectRatio option sets the shape", () => {
        assert.approximately(ratioOf({ aspectRatio: 2 }), 2, 1e-3);
        assert.approximately(ratioOf({ align: "horizontal", aspectRatio: 2 }), 2, 1e-3);
    });
});
