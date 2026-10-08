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
import { assert, describe, it, vi } from "vitest";

import { ElementPositions } from "../../src/data/positions";
import type { Edge } from "../../src/Edge";
import { CircularLayout } from "../../src/layout/CircularLayoutEngine";
import { D3GraphEngine } from "../../src/layout/D3GraphLayoutEngine";
import { layoutEngineInternals } from "../../src/layout/LayoutEngine";
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
        const positions = new ElementPositions(0);
        layoutEngineInternals.attachPositions(layout, positions);
        layoutEngineInternals.addNodes(layout, [a, b, c]);
        const link = edge(b, c);
        layoutEngineInternals.addEdges(layout, [edge(a, b), link]);

        layout.removeEdge(link);
        layout.removeNode(c);

        assert.deepStrictEqual([...layout.nodes], [a, b], "the engine no longer holds the removed node");
        assert.strictEqual([...layout.edges].length, 1, "nor the edge that named it");
        layout.publishPositions();
        assert.isTrue(positions.isPlaced(b.index), "it recomputes a layout of the nodes it still holds");
        assert.isFalse(positions.isPlaced(c.index), "and places nothing for the removed one");
    });

    it("takes the node, and every link that named it, out of a live d3 simulation", () => {
        // d3's link force RESOLVES a link's endpoints against the node list every time the arrays
        // are re-pushed, and throws for an endpoint it cannot find. So an engine that forgot the
        // node but kept the link would not merely draw a line to nowhere -- it would take the next
        // tick down with it.
        const a = node("a", 0);
        const b = node("b", 1);
        const simulation = new D3GraphEngine({});
        layoutEngineInternals.addNodes(simulation, [a, b]);
        layoutEngineInternals.addEdges(simulation, [edge(a, b)]);
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
        layoutEngineInternals.addNodes(simulation, [a, b]);
        layoutEngineInternals.addEdges(simulation, [edge(a, b)]);

        simulation.removeNode(b);

        assert.deepStrictEqual([...simulation.nodes], [a], "the element's map lost it");
        assert.deepStrictEqual([...simulation.edges], [], "and the link with it");
        assert.isNull(simulation.ngraph.getNode("b") ?? null, "ngraph's own graph lost the node too");
        assert.strictEqual(simulation.ngraph.getLinksCount(), 0, "and the link");
    });

    it("keeps a parallel edge's link when the edge beside it is removed", () => {
        // ngraph names a link by its endpoints' strings unless it is a multigraph, so two edges
        // between the same pair -- or between "1" and 1 -- shared one link, and removing one took
        // the other's spring: its position was undefined and the next redraw threw.
        const a = node("a", 0);
        const b = node("b", 1);
        const simulation = new NGraphEngine({});
        layoutEngineInternals.addNodes(simulation, [a, b]);
        const first = edge(a, b);
        const second = edge(a, b);
        layoutEngineInternals.addEdges(simulation, [first, second]);

        simulation.removeEdge(first);

        assert.deepStrictEqual([...simulation.edges], [second]);
        assert.strictEqual(simulation.ngraph.getLinksCount(), 1, "ngraph keeps the other edge's link");
        assert.doesNotThrow(() => simulation.getEdgePosition(second), "and its position");
    });

    it("ignores a node or an edge it was never given, rather than throwing", () => {
        // Removal arrives from the element's data manager, which does not know which engine holds
        // what: a node added before the current engine was built, or one the reader removed twice,
        // must not take the frame down.
        const a = node("a", 0);
        const stranger = node("z", 9);
        const simulation = new NGraphEngine({});
        layoutEngineInternals.addNodes(simulation, [a]);

        assert.doesNotThrow(() => {
            simulation.removeNode(stranger);
            simulation.removeEdge(edge(a, stranger));
        });
        assert.deepStrictEqual([...simulation.nodes], [a]);
    });

    it("keeps the order of what it still holds, and puts a node added back at the end", () => {
        const [a, b, c, d] = ["a", "b", "c", "d"].map((id, i) => node(id, i));
        const layout = new CircularLayout({});
        layoutEngineInternals.addNodes(layout, [a, b, c, d]);

        layout.removeNode(b);
        layout.removeNode(d);
        assert.deepStrictEqual([...layout.nodes], [a, c]);

        layout.removeNode(a);
        layoutEngineInternals.addNode(layout, a);
        assert.deepStrictEqual([...layout.nodes], [c, a]);
    });

    it("tears a whole graph down in work linear in its size (issue #1373)", () => {
        // Each removal used to find the node with indexOf and splice it out, moving the rest of
        // the list: n removals in insertion order cost n^2/2 moves, 8.6 s at 100,000 nodes. Counted
        // as membership tests rather than timed, so machine load cannot move the result.
        const n = 2000;
        const nodes = Array.from({ length: n }, (_, i) => node(`n${i}`, i));
        const edges = nodes.slice(1).map((dst, i) => edge(nodes[i], dst));
        const layout = new CircularLayout({});
        layoutEngineInternals.addNodes(layout, nodes);
        layoutEngineInternals.addEdges(layout, edges);

        const indexOf = vi.spyOn(Array.prototype, "indexOf");
        const splice = vi.spyOn(Array.prototype, "splice");
        const has = vi.spyOn(Set.prototype, "has");
        try {
            for (const e of edges) {
                layoutEngineInternals.removeEdge(layout, e);
            }

            for (const v of nodes) {
                layoutEngineInternals.removeNode(layout, v);
            }

            const held = [...layout.nodes].length + [...layout.edges].length;
            const searches = indexOf.mock.calls.length + splice.mock.calls.length;
            const tests = has.mock.calls.length;
            vi.restoreAllMocks();

            assert.strictEqual(held, 0, "the engine holds nothing");
            assert.strictEqual(searches, 0, "no search per element");
            assert.isAtMost(tests, 2 * n, "one membership test per element held");
        } finally {
            vi.restoreAllMocks();
        }
    });

    describe("removes a batch of nodes visiting only their own edges (issue #1425)", () => {
        // Each removal used to scan every edge the engine held, so k removals from E edges cost
        // k x E. Counted as reads of an edge's (or link's) endpoints rather than timed.
        const n = 1000;
        const removed = 100;

        /**
         * A ring with two chords per node: 3,000 edges.
         * @returns the nodes, the edges, and a counter of endpoint reads
         */
        function graph(): { nodes: Node[]; edges: Edge[]; reads: { count: number } } {
            const reads = { count: 0 };
            const nodes = Array.from({ length: n }, (_, i) => node(`n${i}`, i));
            const edges: Edge[] = [];
            for (let i = 0; i < n; i++) {
                for (const step of [1, 7, 31]) {
                    const src = nodes[i];
                    const dst = nodes[(i + step) % n];
                    const e = {} as Edge;
                    Object.defineProperties(e, {
                        srcId: { get: () => (reads.count++, src.id) },
                        dstId: { get: () => (reads.count++, dst.id) },
                        srcNode: { value: src },
                        dstNode: { value: dst },
                    });
                    edges.push(e);
                }
            }

            return { nodes, edges, reads };
        }

        /**
         * The edges that survive removing the first `removed` nodes.
         * @param nodes - all nodes
         * @param edges - all edges
         * @returns how many endpoint reads a removal may make, and the edges left
         */
        function expected(nodes: Node[], edges: Edge[]): { touched: number; left: Edge[] } {
            const gone = new Set(nodes.slice(0, removed));
            const left = edges.filter((e) => !gone.has(e.srcNode) && !gone.has(e.dstNode));
            return { touched: edges.length - left.length, left };
        }

        it("in a d3 simulation", () => {
            const { nodes, edges, reads } = graph();
            const { touched, left } = expected(nodes, edges);
            const simulation = new D3GraphEngine({});
            layoutEngineInternals.addNodes(simulation, nodes);
            layoutEngineInternals.addEdges(simulation, edges);
            simulation.step();

            reads.count = 0;
            for (const v of nodes.slice(0, removed)) {
                simulation.removeNode(v);
            }

            const visits = reads.count;
            assert.isAtMost(visits, 2 * touched, "two endpoint reads per edge removed, not per edge held");
            assert.deepStrictEqual([...simulation.nodes], nodes.slice(removed), "exactly the other nodes remain");
            assert.sameMembers([...simulation.edges], left, "exactly the edges between them remain");
            assert.doesNotThrow(() => {
                simulation.step();
            }, "and the simulation still steps");
        });

        it("in an ngraph simulation", () => {
            const { nodes, edges } = graph();
            const { touched, left } = expected(nodes, edges);
            const simulation = new NGraphEngine({});
            layoutEngineInternals.addNodes(simulation, nodes);
            layoutEngineInternals.addEdges(simulation, edges);

            // The engine keys its sweep on ngraph's links, so count reads of THEIR endpoints.
            const reads = { count: 0 };
            for (const link of simulation.edgeMapping.values()) {
                const { fromId, toId } = link;
                Object.defineProperties(link, {
                    fromId: { get: () => (reads.count++, fromId) },
                    toId: { get: () => (reads.count++, toId) },
                });
            }

            for (const v of nodes.slice(0, removed)) {
                simulation.removeNode(v);
            }

            const visits = reads.count;
            assert.isAtMost(visits, 4 * touched, "a few endpoint reads per link removed, not per link held");
            assert.deepStrictEqual([...simulation.nodes], nodes.slice(removed), "exactly the other nodes remain");
            assert.sameMembers([...simulation.edges], left, "exactly the edges between them remain");
            assert.strictEqual(simulation.ngraph.getNodesCount(), n - removed, "ngraph holds the same nodes");
            assert.strictEqual(simulation.ngraph.getLinksCount(), left.length, "and the same links");
        });
    });
});
