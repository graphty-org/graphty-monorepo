/**
 * @file Pointer sequences around a node drag that a reader can make and the simple drag does not
 * cover: presses with no move, a drag let go away from the node, a view switch or new nodes while
 * the button is down. Real mouse input (test/helpers/real-input.ts), the outcome read through the
 * element's public API: where a node is drawn and placed, and whether it is pinned.
 */

import { assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { click, drag, hover, moveHeld, type Point, press, release } from "../../helpers/real-input";
import { applied, at, EMPTY, mounted } from "../helpers/mounted-element";

/**
 * Where a node is placed, in scene units, from the session's positions.
 * @param element - The element.
 * @param id - The node.
 * @returns Its position, as a string for comparing before and after.
 */
function placed(element: Graphty, id: string): string {
    const out = { x: 0, y: 0, z: 0 };
    element.session.positions.read(element.session.snapshot().ids.requireIndex(id), out);
    return JSON.stringify(out);
}

/**
 * Assert a node is drawn at a point, within 3 CSS pixels.
 * @param element - The element.
 * @param id - The node.
 * @param point - The point.
 * @param message - What it means.
 */
function assertDrawnAt(element: Graphty, id: string, point: Point, message: string): void {
    const now = at(element, id);
    assert.isBelow(Math.hypot(now.x - point.x, now.y - point.y), 3, message);
}

describe.each(["2d", "3d"] as const)("in %s", (viewMode) => {
    it("presses and releases on a node with no move leave it where it is, not pinned", async () => {
        const element = await mounted(viewMode);
        const before = placed(element, "b");

        for (let i = 0; i < 3; i++) {
            await click(element, at(element, "b"));
            await applied(element);
        }

        assert.strictEqual(placed(element, "b"), before, "node b did not move");
        assert.isFalse(element.isPinned("b"), "a click does not pin");
    });

    it("a drag let go far from where it started leaves the node under the pointer", async () => {
        const element = await mounted(viewMode);
        const from = at(element, "b");
        const to = { x: 40, y: 40 };

        await press(element, from);
        await moveHeld(element, { x: from.x + 50, y: from.y + 50 });
        await moveHeld(element, to);
        await release(element, to);
        await applied(element);

        assertDrawnAt(element, "b", to, "node b was dropped where the pointer let go");
        assert.isTrue(element.isPinned("b"), "the dropped node is pinned");
    });

    it("nodes added while the button is down do not stop the drag", async () => {
        const element = await mounted(viewMode);
        const from = at(element, "b");
        const to = { x: from.x - 40, y: from.y + 40 };

        await press(element, from);
        await moveHeld(element, { x: from.x - 20, y: from.y + 20 });
        await element.session.data.addNodes([{ id: "d", position: { x: 0, y: -3, z: 0 } }]);
        await moveHeld(element, to);
        await release(element, to);
        await applied(element);

        // The new node refits the camera, so the drop is checked in the scene: left and down
        const dropped = JSON.parse(placed(element, "b")) as { x: number; y: number };
        assert.isBelow(dropped.x, 4 - 0.5, "node b moved left with the pointer");
        assert.isBelow(dropped.y, -0.5, "node b moved down with the pointer");
        assert.isTrue(element.isPinned("b"), "the drop pinned it");
        assert.isDefined(element.nodeScreenPosition("d"), "the new node is drawn");
    });
});

it("a switch to 2D while a node is held leaves no drag behind: the pointer moves nothing after the release", async () => {
    const element = await mounted("3d");
    const from = at(element, "b");

    await press(element, from);
    await element.setViewMode("2d");
    await element.waitForStableFrame();
    await release(element, from);
    await applied(element);
    const after = placed(element, "b");

    // With no button down, moving the pointer must not carry the node
    await hover(element, { x: from.x + 60, y: from.y + 40 });
    await hover(element, EMPTY);
    await applied(element);
    assert.strictEqual(placed(element, "b"), after, "the pointer moving afterwards did not move node b");

    // And a drag across empty canvas pans the 2D view, as it should
    const start = at(element, "a");
    await drag(element, EMPTY, { x: EMPTY.x + 60, y: EMPTY.y - 30 });
    await applied(element);
    const end = at(element, "a");
    assert.closeTo(end.x - start.x, 60, 2, "the drawing moved right with the pointer");
    assert.closeTo(end.y - start.y, -30, 2, "the drawing moved up with the pointer");
});
