/**
 * @file The fixed layout spreads data positions drawn too close together (issue #1171).
 *
 * Many files store coordinates on unit spacing, and a default node is about one scene unit
 * across, so drawn as given the nodes touch and an edge between neighbors has no room. The
 * layout multiplies every position by one factor so the median edge is `spacing` node widths
 * long, keeping the drawing's proportions, unless the reader set a scale or `spacing: 0`.
 */
import "../../src/layout";

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { FixedLayout } from "../../src/layout/FixedLayoutEngine";
import { LayoutEngine, layoutEngineInternals } from "../../src/layout/LayoutEngine";
import { fakeEdge, fakeNode } from "../helpers/layout-fakes";

/**
 * Lay out a three-node path whose nodes the data puts `gap` apart on x.
 * @param gap - the data's distance between neighbors
 * @param options - the fixed layout's options
 * @returns each node's x, the spread applied and how often the undirected graph was built
 */
function layOut(
    gap: number,
    options: Record<string, unknown> = {},
): { xs: number[]; spread: number; undirected: number } {
    const builder = new GraphBuilder({ directed: true });
    for (const id of ["a", "b", "c"]) {
        builder.addNode(id);
    }

    builder.addEdge("a", "b");
    builder.addEdge("b", "c");
    const stored = builder.freeze({ label: "test" });
    let undirected = 0;
    const source = {
        getSnapshot: (): GraphSnapshot => stored,
        undirected: (s: GraphSnapshot) => {
            undirected++;
            return s.toUndirected();
        },
    };
    const parentGraph = { getDataManager: () => source };
    const nodes = ["a", "b", "c"].map((id, index) =>
        fakeNode(id, {
            index,
            parentGraph,
            data: { position: { x: index * gap, y: 0, z: 0 } },
            setMeshPosition: () => undefined,
        }),
    );

    const engine = LayoutEngine.get("fixed", options);
    assert.instanceOf(engine, FixedLayout);
    layoutEngineInternals.addNodes(engine, nodes);
    layoutEngineInternals.addEdges(engine, [fakeEdge(nodes[0], nodes[1]), fakeEdge(nodes[1], nodes[2])]);
    engine.publishPositions();
    return { xs: nodes.map((n) => engine.getNodePosition(n).x), spread: engine.spread, undirected };
}

describe("the fixed layout keeps neighbors apart", () => {
    it("spreads unit-spaced positions to three node widths, in proportion", () => {
        const { xs, spread, undirected } = layOut(1);
        assert.deepEqual(xs, [0, 3, 6]);
        assert.strictEqual(spread, 3);
        assert.strictEqual(undirected, 0, "reads the stored edges, never the undirected graph");
    });

    it("draws positions already far enough apart as given", () => {
        assert.deepEqual(layOut(10).xs, [0, 10, 20]);
    });

    it("draws positions as given with spacing 0", () => {
        assert.deepEqual(layOut(1, { spacing: 0 }).xs, [0, 1, 2]);
    });

    it("keeps a scale the reader chose", () => {
        const { xs, spread } = layOut(1, { scale: 2 });
        assert.deepEqual(xs, [0, 2, 4]);
        assert.strictEqual(spread, 1);
    });
});
