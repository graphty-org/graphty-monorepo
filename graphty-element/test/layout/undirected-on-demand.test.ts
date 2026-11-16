/**
 * @file A one-pass layout makes the element's graph undirected only when it reads the graph.
 *
 * Making a directed graph undirected builds a second graph over every edge: about 180 ms at one
 * million edges, paid in the load's first layout pass. The fixed layout reads only where each
 * node's data puts it, so it must never pay for that graph; a layout that reads edges still gets it.
 */
import "../../src/layout";

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { LayoutEngine, layoutEngineInternals } from "../../src/layout/LayoutEngine";
import { fakeEdge, fakeNode } from "../helpers/layout-fakes";

/**
 * Lay out a directed three-node path whose nodes carry data positions, as an element's graph.
 * @param type - the layout
 * @returns how many times the graph was made undirected, and each node's position
 */
function layOut(type: string): { undirectedCalls: number; positions: number[][] } {
    const builder = new GraphBuilder({ directed: true });
    for (const id of ["a", "b", "c"]) {
        builder.addNode(id);
    }

    builder.addEdge("a", "b");
    builder.addEdge("b", "c");
    const stored = builder.freeze({ label: "test" });
    let undirectedCalls = 0;
    const source = {
        getSnapshot: (): GraphSnapshot => stored,
        undirected: (s: GraphSnapshot) => {
            undirectedCalls++;
            return s.toUndirected();
        },
    };
    const parentGraph = { getDataManager: () => source };
    const nodes = ["a", "b", "c"].map((id, index) =>
        fakeNode(id, {
            index,
            parentGraph,
            data: { position: { x: index * 10, y: 5, z: 0 } },
            setMeshPosition: () => undefined,
        }),
    );
    const edges = [fakeEdge(nodes[0], nodes[1]), fakeEdge(nodes[1], nodes[2])];

    const engine = LayoutEngine.get(type, { dim: 2 });
    assert.isNotNull(engine, `"${type}" is registered`);
    layoutEngineInternals.addNodes(engine, nodes);
    layoutEngineInternals.addEdges(engine, edges);

    engine.publishPositions();
    const positions = nodes.map((n) => {
        const p = engine.getNodePosition(n);
        return [p.x, p.y];
    });
    return { undirectedCalls, positions };
}

describe("the undirected graph is built on demand", () => {
    it("is never built for the fixed layout, which places every node where its data says", () => {
        const { undirectedCalls, positions } = layOut("fixed");
        assert.strictEqual(undirectedCalls, 0);
        assert.deepEqual(positions, [
            [0, 5],
            [10, 5],
            [20, 5],
        ]);
    });

    it("is built once for a layout that reads the edges", () => {
        const { undirectedCalls, positions } = layOut("circular");
        assert.strictEqual(undirectedCalls, 1);
        assert.lengthOf(positions, 3);
    });
});
