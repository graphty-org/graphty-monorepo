/**
 * Layout engines let go of a node the graph no longer holds.
 *
 * `LayoutEngine.removeNode` and `removeEdge` were declared on the base class with a do-nothing
 * default and implemented by NONE of the sixteen engines the element ships. So a removed node
 * stayed in whichever engine was running for the rest of the session: the frame loop walks the
 * ENGINE's node and edge lists, so the node kept being stepped and its edges kept being drawn, and
 * the engine held the node -- and through it a Babylon mesh, a data record and two endpoints --
 * until the engine itself was thrown away. On a large graph that is the removal leak that matters.
 *
 * The engines here are driven directly, with no element around them, because that is the contract
 * being tested: an engine is handed a node and must be able to give it back.
 *
 * The nodes and edges are the bare shape a layout engine uses -- a real `Node` builds a Babylon
 * mesh in its constructor, and none of this has anything to do with a mesh.
 */
import { assert, describe, it } from "vitest";

import type { Edge } from "../../src/Edge";
import { CircularLayout } from "../../src/layout/CircularLayoutEngine";
import { D3GraphEngine } from "../../src/layout/D3GraphLayoutEngine";
import { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import type { Node } from "../../src/Node";

/**
 * A node as a layout engine sees one: an id and the row it owns in the position array.
 * @param id - the node id, which is how a layout function keys its answer
 * @param index - the node's dense index in the graph
 * @returns the stand-in
 */
function node(id: string, index: number): Node {
    return { id, index } as unknown as Node;
}

/**
 * An edge as a layout engine sees one: two ids and the two nodes they name.
 * @param src - the source node
 * @param dst - the destination node
 * @returns the stand-in
 */
function edge(src: Node, dst: Node): Edge {
    return { srcId: src.id, dstId: dst.id, srcNode: src, dstNode: dst } as unknown as Edge;
}

describe("a layout engine gives back a node the graph has removed", () => {
    it("takes the node and its edge out of a static layout's own lists", () => {
        const a = node("a", 0);
        const b = node("b", 1);
        const c = node("c", 2);
        const layout = new CircularLayout({});
        layout.addNodes([a, b, c]);
        const link = edge(b, c);
        layout.addEdges([edge(a, b), link]);

        layout.removeEdge(link);
        layout.removeNode(c);

        assert.deepStrictEqual([...layout.nodes], [a, b], "the engine no longer holds the removed node");
        assert.strictEqual([...layout.edges].length, 1, "nor the edge that named it");
        assert.doesNotHaveAnyKeys(layout.positions, ["c"], "and it recomputes a layout without it");
    });

    it("takes the node, and every link that named it, out of a live d3 simulation", () => {
        // d3's link force RESOLVES a link's endpoints against the node list every time the arrays
        // are re-pushed, and throws for an endpoint it cannot find. So an engine that forgot the
        // node but kept the link would not merely draw a line to nowhere -- it would take the next
        // tick down with it.
        const a = node("a", 0);
        const b = node("b", 1);
        const simulation = new D3GraphEngine({});
        simulation.addNodes([a, b]);
        simulation.addEdges([edge(a, b)]);
        simulation.step();

        assert.deepStrictEqual([...simulation.nodes], [a, b], "both nodes are in the simulation to begin with");

        simulation.removeNode(b);
        assert.doesNotThrow(() => {
            simulation.step();
        }, "the simulation still steps after a removal");

        assert.deepStrictEqual([...simulation.nodes], [a], "the removed node is gone");
        assert.deepStrictEqual([...simulation.edges], [], "and so is the link that named it");
    });

    it("takes the node and its link out of ngraph's own graph, not just out of the element's map", () => {
        // ngraph keeps its own graph and its own bodies. Deleting only the element's mapping would
        // leave the simulation spending force on a body nothing can see or reach.
        const a = node("a", 0);
        const b = node("b", 1);
        const simulation = new NGraphEngine({});
        simulation.addNodes([a, b]);
        simulation.addEdges([edge(a, b)]);

        simulation.removeNode(b);

        assert.deepStrictEqual([...simulation.nodes], [a], "the element's map lost it");
        assert.deepStrictEqual([...simulation.edges], [], "and the link with it");
        assert.isNull(simulation.ngraph.getNode("b") ?? null, "ngraph's own graph lost the node too");
        assert.strictEqual(simulation.ngraph.getLinksCount(), 0, "and the link");
    });

    it("ignores a node or an edge it was never given, rather than throwing", () => {
        // Removal arrives from the element's data manager, which does not know which engine holds
        // what: a node added before the current engine was built, or one the reader removed twice,
        // must not take the frame down.
        const a = node("a", 0);
        const stranger = node("z", 9);
        const simulation = new NGraphEngine({});
        simulation.addNodes([a]);

        assert.doesNotThrow(() => {
            simulation.removeNode(stranger);
            simulation.removeEdge(edge(a, stranger));
        });
        assert.deepStrictEqual([...simulation.nodes], [a]);
    });
});
