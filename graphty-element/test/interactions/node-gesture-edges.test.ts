/**
 * @file The edges of a node gesture under the real mouse (test/helpers/real-input.ts): a press that
 * shakes less than the click tolerance is a click, a right-click on a node already in a selection
 * keeps the selection whole, an undo while the button still holds a node ends the drag, a
 * double-click on empty canvas expands nothing. Every outcome is read through the element's public API.
 */

import { assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { click, doubleClick, moveHeld, press, release, rightClick, shakyClick } from "../helpers/real-input";
import { applied, at, EMPTY, mounted } from "./helpers/mounted-element";

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

describe("a node gesture under the real mouse", () => {
    it("a press that shakes within the click tolerance selects the node and places nothing", async () => {
        const element = await mounted("3d");
        const start = where(element, "b");
        const point = at(element, "b");

        await shakyClick(element, point, { x: point.x + 2, y: point.y + 1 });
        await applied(element);

        assert.strictEqual(element.getSelectedNode()?.id, "b", "the shaky click selected the node");
        assert.isFalse(element.isPinned("b"), "a click the hand shook through is not a placement");
        assert.isBelow(apart(where(element, "b"), start), 0.5, "the node stayed about where it was");
    });

    it("a right-click on a node already in the selection keeps the whole selection", async () => {
        const element = await mounted("3d");
        await click(element, at(element, "a"));
        await click(element, at(element, "b"), { shift: true });
        await applied(element);
        assert.sameMembers([...element.session.selection.nodes], ["a", "b"]);

        await rightClick(element, at(element, "a"));
        await applied(element);

        assert.sameMembers([...element.session.selection.nodes], ["a", "b"], "the selection stayed whole");
    });

    it("an undo while the button holds a node ends the drag: it moves no further and records nothing", async () => {
        const element = await mounted("3d");
        const { session } = element;
        const start = where(element, "c");
        const steps = session.history.steps.length;
        const from = at(element, "c");

        await press(element, from);
        await moveHeld(element, { x: from.x + 40, y: from.y + 30 });
        await applied(element);
        assert.isAbove(apart(where(element, "c"), start), 0.1, "the drag moved node c");

        const outcome = await session.undo();
        assert.strictEqual(outcome.kind, "canceled", "the undo ended the open drag");
        await moveHeld(element, { x: from.x + 80, y: from.y + 60 });
        await release(element, { x: from.x + 80, y: from.y + 60 });
        await applied(element);

        assert.isBelow(apart(where(element, "c"), start), 1e-6, "node c is back where the drag began");
        assert.isFalse(element.isPinned("c"), "the drop of an ended drag does not pin");
        assert.lengthOf(session.history.steps, steps, "no step was recorded");
    });

    it("a double-click on empty canvas expands nothing and selects nothing", async () => {
        const element = await mounted("3d");
        element.layoutBehavior = { expand: { trigger: "double-click" } };
        const nodes = element.session.snapshot().nodeCount;

        await doubleClick(element, EMPTY);
        await applied(element);

        assert.strictEqual(element.session.snapshot().nodeCount, nodes, "no node was added");
        assert.isNull(element.getSelectedNode(), "nothing is selected");
    });
});
