/**
 * The fixed layout puts every node that has a `data.position` there, every time it runs.
 *
 * The element keeps one position array shared by every layout engine. A node another layout has
 * already placed -- the default force layout, or the layout the reader switched away from -- has a
 * placed row in that array. If the fixed layout only kept placed rows, a graph switched to
 * `layout: "fixed"` would stay where the previous layout left it instead of moving to the
 * positions its data gives.
 */
import { assert, describe, it } from "vitest";

import { ElementPositions } from "../../src/data/positions";
import { FixedLayout } from "../../src/layout/FixedLayoutEngine";
import type { Node } from "../../src/Node";

/**
 * A node as the fixed layout sees one: an id, a row, its data and a mesh it can move.
 * @param id - the node id
 * @param index - the node's row in the position array
 * @param position - the node's `data.position`, if it has one
 * @returns the stand-in
 */
function node(id: string, index: number, position?: { x: number; y: number; z?: number }): Node {
    return {
        id,
        index,
        data: position ? { position } : {},
        mesh: { position: { set: (): void => undefined } },
    } as unknown as Node;
}

describe("FixedLayout", () => {
    it("moves a node another layout already placed to its data.position", () => {
        const positions = new ElementPositions(0);
        positions.grow(2);
        positions.write(0, 50, 60, 70);
        positions.write(1, 8, 9, 10);
        const layout = new FixedLayout();
        layout.attachPositions(positions);
        layout.addNodes([node("a", 0, { x: 1, y: 2, z: 3 }), node("b", 1)]);

        layout.publishPositions();

        const out = { x: 0, y: 0, z: 0 };
        positions.read(0, out);
        assert.deepEqual([out.x, out.y, out.z], [1, 2, 3], "the data position wins over the earlier layout");
        positions.read(1, out);
        assert.deepEqual([out.x, out.y, out.z], [8, 9, 10], "a node with no data position keeps its row");
    });

    it("follows a data.position changed after the first run", () => {
        const positions = new ElementPositions(0);
        const a = node("a", 0, { x: 1, y: 2 });
        const layout = new FixedLayout();
        layout.attachPositions(positions);
        layout.addNodes([a]);
        layout.publishPositions();

        (a as unknown as { data: { position: { x: number; y: number } } }).data.position = { x: 4, y: 5 };
        layout.addNodes([node("b", 1)]);
        layout.publishPositions();

        const out = { x: 0, y: 0, z: 0 };
        positions.read(0, out);
        assert.deepEqual([out.x, out.y, out.z], [4, 5, 0]);
    });
});
