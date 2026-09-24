/**
 * Layout engines publish node coordinates into the element-owned position array.
 *
 * The array is a stride-3 Float32Array indexed by a node's dense graph index, and it is the one
 * copy of the layout: an engine writes into it, a reader reads out of it by index, and a row
 * nothing has placed stays NaN rather than sitting at the origin, which is a real coordinate and
 * therefore indistinguishable from an answer.
 *
 * What is pinned here, and why each one is a defect if it breaks:
 *
 * - The array belongs to the BASE class, so an engine that was never edited for it still publishes.
 *   That is what makes a second view of one graph, and a GPU layout writing the same rows, possible
 *   at all.
 * - A node with no row in the graph is never published. Its index is the `INVALID_INDEX` sentinel,
 *   which is 0xFFFFFFFF -- written as a row number it would either throw inside a layout step or
 *   silently balloon the array by four billion rows.
 * - A coordinate that cannot be stored is dropped rather than written. A force layout that divided
 *   by a zero distance produces NaN and an f32 overflow produces an infinity; either one, stored,
 *   reads back as a PLACE, and in a renderer that means a mesh that vanishes and takes the scene
 *   bounds and the camera framing with it.
 * - A read fills an object the CALLER owns. A renderer passes the vector it is about to draw with,
 *   so a frame allocates nothing per node.
 *
 * The nodes here are the bare shape a layout engine actually uses -- an id and a row number. A real
 * `Node` builds a Babylon mesh in its constructor, and none of this has anything to do with a mesh.
 */
import { INVALID_INDEX } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { ElementPositions } from "../../src/data/positions";
import type { Edge } from "../../src/Edge";
import { CircularLayout } from "../../src/layout/CircularLayoutEngine";
import { D3GraphEngine } from "../../src/layout/D3GraphLayoutEngine";
import { SimpleLayoutEngine } from "../../src/layout/LayoutEngine";
import { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import type { Node } from "../../src/Node";

/**
 * A node as a layout engine sees one: an id, and the row it owns in the position array.
 * @param id - the node id, which is how a layout function keys its answer
 * @param index - the node's dense index in the graph, or INVALID_INDEX for a node with no row
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

/** A layout whose answer is written by the test, including coordinates that cannot be stored. */
class ScriptedLayout extends SimpleLayoutEngine {
    static override type = "test-scripted";
    static override maxDimensions = 3;

    /** What `doLayout` will publish, keyed by node id. */
    scripted: Record<string | number, number[]> = {};

    /**
     * Hand the scripted answer to the base class.
     */
    doLayout(): void {
        this.stale = false;
        this.positions = this.scripted;
    }
}

describe("layout engines and the element-owned position array", () => {
    it("publishes every node into the array it was handed, keyed by the node's graph index", () => {
        const positions = new ElementPositions(0);
        const layout = new CircularLayout({});
        layout.attachPositions(positions);
        layout.addNodes([node("a", 0), node("b", 1), node("c", 2)]);

        layout.publishPositions();

        assert.strictEqual(positions.count, 3, "the array grew to reach the last row published");
        assert.isTrue(positions.isPlaced(0));
        assert.isTrue(positions.isPlaced(1));
        assert.isTrue(positions.isPlaced(2));
    });

    it("keeps the layout in the array the host attached, not in one of its own", () => {
        // The whole point: a host lends the engine the array it also lends to its snapshots, so a
        // layout, a drag and a GPU readback all land in the same rows and a re-freeze loses none of
        // them. An engine that quietly kept publishing into a private array would look identical
        // from the engine's own API and lose every coordinate at the first freeze.
        const positions = new ElementPositions(0);
        const layout = new CircularLayout({});
        layout.attachPositions(positions);
        layout.addNodes([node("a", 0), node("b", 1)]);

        layout.publishPositions();

        assert.strictEqual(layout.nodePositions, positions, "the engine holds the array it was given");
        const out = { x: 0, y: 0, z: 0 };
        positions.read(0, out);
        const reported = layout.getNodePosition(node("a", 0));
        assert.strictEqual(out.x, reported.x, "and the engine answers out of it");
        assert.strictEqual(out.y, reported.y);
    });

    it("shares one array between engines, so two layouts of one graph are one set of rows", () => {
        const positions = new ElementPositions(0);
        const circular = new CircularLayout({});
        const scripted = new ScriptedLayout();
        circular.attachPositions(positions);
        scripted.attachPositions(positions);

        circular.addNodes([node("a", 0), node("b", 1)]);
        scripted.scripted = { c: [3, 4, 5] };
        scripted.addNodes([node("c", 2)]);

        circular.publishPositions();
        scripted.publishPositions();

        assert.isTrue(positions.isPlaced(0), "the circular layout's rows");
        assert.isTrue(positions.isPlaced(1));
        assert.isTrue(positions.isPlaced(2), "and the scripted layout's row, in the same array");
    });

    it("never publishes a node that has no row in the graph, and still reports where it is", () => {
        // INVALID_INDEX is 0xFFFFFFFF. Written as a row number it would grow the array by four
        // billion rows; refused with an error it would abort a layout step in the middle.
        const positions = new ElementPositions(0);
        const layout = new CircularLayout({});
        layout.attachPositions(positions);
        const orphan = node("b", INVALID_INDEX);
        layout.addNodes([node("a", 0), orphan]);

        layout.publishPositions();

        assert.strictEqual(positions.count, 1, "only the node with a row reached the array");
        const reported = layout.getNodePosition(orphan);
        assert.isTrue(Number.isFinite(reported.x), "and the node with no row still renders somewhere");
        assert.isTrue(Number.isFinite(reported.y));
    });

    it("leaves a row unplaced when the coordinate cannot be stored", () => {
        const positions = new ElementPositions(0);
        const layout = new ScriptedLayout();
        layout.attachPositions(positions);
        layout.scripted = {
            a: [1, 2, 3],
            b: [Number.NaN, 0, 0],
            c: [1e39, 0, 0],
        };
        layout.addNodes([node("a", 0), node("b", 1), node("c", 2)]);

        layout.publishPositions();

        assert.isTrue(positions.isPlaced(0), "a storable coordinate is published");
        assert.isFalse(positions.isPlaced(1), "NaN is what unplaced MEANS, so it is never written");
        assert.isFalse(positions.isPlaced(2), "1e39 is finite as a double and an infinity as an f32");
    });

    it("leaves a row unplaced until an engine places it", () => {
        const positions = new ElementPositions(0);
        positions.grow(3);
        const layout = new ScriptedLayout();
        layout.attachPositions(positions);
        layout.scripted = { a: [1, 2, 3] };
        layout.addNodes([node("a", 0)]);

        assert.isFalse(positions.isPlaced(0), "nothing has run yet");
        layout.publishPositions();
        assert.isTrue(positions.isPlaced(0), "and now one row is placed");
        assert.isFalse(positions.isPlaced(1), "the rows no engine spoke for are untouched");
        assert.isFalse(positions.isPlaced(2));
    });

    it("reads a placed row into an object the caller owns", () => {
        const positions = new ElementPositions(0);
        const layout = new ScriptedLayout();
        layout.attachPositions(positions);
        layout.scripted = { a: [1, 2, 3] };
        const a = node("a", 0);
        layout.addNodes([a]);
        layout.publishPositions();

        const out = { x: -1, y: -1, z: -1 };
        assert.isTrue(layout.readNodePosition(a, out));
        // scalingFactor defaults to 100 for a simple layout, so the record's 1,2,3 is 100,200,300.
        assert.strictEqual(out.x, 100);
        assert.strictEqual(out.y, 200);
        assert.strictEqual(out.z, 300);
    });

    it("answers false for an unplaced row and leaves the caller's object alone", () => {
        // A renderer passes the vector it is about to draw with. Filling it with NaN, or with the
        // origin, would move a node that nothing has laid out yet.
        const positions = new ElementPositions(0);
        positions.grow(2);
        const layout = new ScriptedLayout();
        layout.attachPositions(positions);

        const out = { x: 7, y: 8, z: 9 };
        assert.isFalse(layout.readNodePosition(node("a", 1), out));
        assert.deepStrictEqual(out, { x: 7, y: 8, z: 9 });
    });

    it("draws an edge between the rows its endpoints render at", () => {
        const positions = new ElementPositions(0);
        const layout = new ScriptedLayout();
        layout.attachPositions(positions);
        const a = node("a", 0);
        const b = node("b", 1);
        layout.scripted = { a: [1, 0, 0], b: [0, 1, 0] };
        layout.addNodes([a, b]);
        layout.addEdges([edge(a, b)]);
        layout.publishPositions();

        const link = layout.getEdgePosition(edge(a, b));
        const src = { x: 0, y: 0, z: 0 };
        const dst = { x: 0, y: 0, z: 0 };
        positions.read(0, src);
        positions.read(1, dst);
        assert.deepStrictEqual({ x: link.src.x, y: link.src.y, z: link.src.z }, src);
        assert.deepStrictEqual({ x: link.dst.x, y: link.dst.y, z: link.dst.z }, dst);
    });

    it("keeps its own array when the node belongs to no graph", () => {
        // A third party driving an engine by hand, and every test above, has nodes that belong to no
        // element. The engine must still work, and must not reach into anything for an array.
        const layout = new ScriptedLayout();
        layout.scripted = { a: [1, 2, 3] };
        layout.addNodes([node("a", 0)]);

        layout.publishPositions();

        assert.instanceOf(layout.nodePositions, ElementPositions);
        assert.isTrue(layout.nodePositions.isPlaced(0));
    });

    describe("the force layouts publish on every step", () => {
        it("d3 publishes the tick it just ran", () => {
            const positions = new ElementPositions(0);
            const d3 = new D3GraphEngine();
            d3.attachPositions(positions);
            const a = node("a", 0);
            const b = node("b", 1);
            d3.addNodes([a, b]);
            d3.addEdges([edge(a, b)]);

            d3.step();

            assert.isTrue(positions.isPlaced(0), "the simulation's coordinates reached the array");
            assert.isTrue(positions.isPlaced(1));
            const out = { x: 0, y: 0, z: 0 };
            assert.isTrue(d3.readNodePosition(a, out));
            const reported = d3.getNodePosition(a);
            assert.strictEqual(reported.x, out.x, "and the engine answers out of the array");
            assert.strictEqual(reported.y, out.y);
        });

        it("ngraph publishes the step it just ran", () => {
            const positions = new ElementPositions(0);
            const ngraph = new NGraphEngine({ dim: 3 });
            ngraph.attachPositions(positions);
            const a = node("a", 0);
            const b = node("b", 1);
            ngraph.addNodes([a, b]);
            ngraph.addEdges([edge(a, b)]);

            ngraph.step();

            assert.isTrue(positions.isPlaced(0), "the simulation's coordinates reached the array");
            assert.isTrue(positions.isPlaced(1));
            const out = { x: 0, y: 0, z: 0 };
            assert.isTrue(ngraph.readNodePosition(b, out));
            const reported = ngraph.getNodePosition(b);
            assert.strictEqual(reported.x, out.x, "and the engine answers out of the array");
            assert.strictEqual(reported.y, out.y);
        });

        it("a dragged node lands in the array without waiting for a step", () => {
            // A settled simulation may never step again, so a drop that only reached the engine's
            // own copy would leave the array holding the node's pre-drag coordinates for good.
            const positions = new ElementPositions(0);
            const d3 = new D3GraphEngine();
            d3.attachPositions(positions);
            const a = node("a", 0);
            d3.addNodes([a]);
            d3.step();

            d3.setNodePosition(a, { x: 11, y: 22, z: 33 });

            const out = { x: 0, y: 0, z: 0 };
            assert.isTrue(d3.readNodePosition(a, out));
            assert.deepStrictEqual(out, { x: 11, y: 22, z: 33 });
        });
    });
});
