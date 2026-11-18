/**
 * @file `layoutBehavior.node.pinOnDrag`: a node dragged with the real mouse
 * (test/helpers/real-input.ts) is pinned or not as the setting says, and a pin holds the node where
 * it is while a force layout moves everything else. Read through the element's public API:
 * `isPinned` and the session's positions.
 */

import { assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { drag } from "../../helpers/real-input";
import { applied, at, mounted } from "../helpers/mounted-element";

interface Xyz {
    x: number;
    y: number;
    z: number;
}

/**
 * Where a node is, in scene units, from the session's positions.
 * @param element - The element.
 * @param id - The node.
 * @returns Its position.
 */
function where(element: Graphty, id: string): Xyz {
    const out = { x: 0, y: 0, z: 0 };
    element.session.positions.read(element.session.snapshot().ids.requireIndex(id), out);
    return out;
}

/**
 * How far apart two positions are.
 * @param p - One.
 * @param q - The other.
 * @returns The distance.
 */
function apart(p: Xyz, q: Xyz): number {
    return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
}

/**
 * Drag node c across the canvas with the real mouse and let the element apply the drop.
 * @param element - The element.
 */
async function dragC(element: Graphty): Promise<void> {
    const from = at(element, "c");
    await drag(element, from, { x: from.x + 50, y: from.y + 40 });
    await applied(element);
}

/**
 * Switch to a force layout and let it come to rest: it moves every node not pinned.
 * @param element - The element.
 */
async function runForceLayout(element: Graphty): Promise<void> {
    const a = where(element, "a");
    await element.graph.setLayout("ngraph", { dim: 3 });
    await element.waitForStableFrame();
    assert.isAbove(apart(where(element, "a"), a), 0.1, "the force layout moved node a");
}

/**
 * A 3D element with fixed nodes and pinOnDrag set.
 * @param pinOnDrag - The setting.
 * @returns The element.
 */
async function withPinOnDrag(pinOnDrag: boolean): Promise<Graphty> {
    const element = await mounted("3d");
    element.layoutBehavior = { node: { pinOnDrag } };
    return element;
}

describe("pinOnDrag on", () => {
    it("pins a dragged node, and the layout leaves it where it was dropped", async () => {
        const element = await withPinOnDrag(true);
        const start = where(element, "c");

        await dragC(element);
        const dropped = where(element, "c");
        assert.isAbove(apart(dropped, start), 0.1, "the drag moved node c");
        assert.isTrue(element.isPinned("c"), "the dragged node is pinned");

        await runForceLayout(element);

        assert.isBelow(apart(where(element, "c"), dropped), 1e-6, "node c stayed where it was dropped");
    });

    it("a node unpinned after the drag is moved by the layout again", async () => {
        const element = await withPinOnDrag(true);
        await dragC(element);
        const dropped = where(element, "c");

        await element.session.positions.unpin(["c"]);
        assert.isFalse(element.isPinned("c"), "node c is released");
        await runForceLayout(element);

        assert.isAbove(apart(where(element, "c"), dropped), 0.1, "the layout moved node c");
    });
});

describe("pinOnDrag off", () => {
    it("does not pin a dragged node, and the layout moves it", async () => {
        const element = await withPinOnDrag(false);
        const start = where(element, "c");

        await dragC(element);
        const dropped = where(element, "c");
        assert.isAbove(apart(dropped, start), 0.1, "the drag moved node c");
        assert.isFalse(element.isPinned("c"), "the dragged node is not pinned");

        await runForceLayout(element);

        assert.isAbove(apart(where(element, "c"), dropped), 0.1, "the layout moved node c");
    });

    it("a node pinned on purpose still stays where it was put", async () => {
        const element = await withPinOnDrag(false);
        const put = { x: 10, y: 10, z: 10 };
        await element.session.positions.set([{ id: "c", ...put }]);
        await element.session.positions.pin(["c"]);

        await runForceLayout(element);

        assert.isBelow(apart(where(element, "c"), put), 1e-6, "node c stayed where it was put");
    });
});
