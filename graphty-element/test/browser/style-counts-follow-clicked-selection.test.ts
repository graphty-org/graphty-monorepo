/**
 * @file `styles.counts()` follows the selection a reader clicks, for a layer that reads the
 * selection through a scope rather than a `state` selector: `{ match: "member", of: "selection" }`,
 * and a rule tree holding `{ kind: "member", of: "selection" }` inside an `any` or a `not`. Counts
 * are kept across a click only for a layer no selection change can move (issue #10116); these
 * layers must be recounted on every click. Clicks are real mouse input (test/helpers/real-input.ts).
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { click } from "../helpers/real-input";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Three nodes in a row, drawn in 2D, with three layers that read the selection through a scope.
 * @returns The element and the layers' ids.
 */
async function mounted(): Promise<{ element: Graphty; member: string; any: string; not: string }> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -4, y: 0, z: 0 } },
        { id: "b", position: { x: 0, y: 0, z: 0 } },
        { id: "c", position: { x: 4, y: 0, z: 0 } },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    const { styles } = element.session;
    const member = await styles.add({
        name: "In the selection",
        target: "node",
        selector: { match: "member", of: "selection" },
        set: { "node.labelColor": "#d55e00" },
    });
    const any = await styles.add({
        name: "Any of the selection",
        target: "node",
        selector: { match: "rule", where: { kind: "any", of: [{ kind: "member", of: "selection" }] } },
        set: { "node.labelItalic": true },
    });
    const not = await styles.add({
        name: "Outside the selection",
        target: "node",
        selector: { match: "rule", where: { kind: "not", of: { kind: "member", of: "selection" } } },
        set: { "node.labelWeight": "bold" },
    });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return { element, member: member.id, any: any.id, not: not.id };
}

/**
 * Where a node is drawn.
 * @param element - The element.
 * @param id - The node.
 * @returns Its center, in CSS pixels from the element's top-left corner.
 */
function at(element: Graphty, id: string): { x: number; y: number } {
    const point = element.nodeScreenPosition(id);
    assert.isDefined(point, `node ${id} is on screen`);
    return { x: point.x, y: point.y };
}

describe("styles.counts for a layer scoped to the selection", () => {
    it("follows the selection as clicks grow and shrink it", async () => {
        const { element, member, any, not } = await mounted();
        const { styles, selection } = element.session;
        const counts = (): number[] => [member, any, not].map((id) => styles.counts(id).matched);
        /**
         * Click a node and let the click land.
         * @param id - The node.
         * @param shift - Whether shift is held, which toggles the node in the selection.
         */
        const clickNode = async (id: string, shift = false): Promise<void> => {
            await click(element, at(element, id), { shift });
            await drawnFrames(element.graph.getScene(), 3);
            await styles.settled();
        };

        assert.deepEqual(counts(), [0, 0, 3], "nothing selected");
        await clickNode("a");
        assert.sameMembers([...selection.nodes].map(String), ["a"]);
        assert.deepEqual(counts(), [1, 1, 2], "a selected");
        await clickNode("b", true);
        assert.sameMembers([...selection.nodes].map(String), ["a", "b"]);
        assert.deepEqual(counts(), [2, 2, 1], "a and b selected");
        await clickNode("c", true);
        assert.deepEqual(counts(), [3, 3, 0], "all three selected");
        await clickNode("a", true);
        assert.sameMembers([...selection.nodes].map(String), ["b", "c"]);
        assert.deepEqual(counts(), [2, 2, 1], "a toggled off");
        await clickNode("b");
        assert.sameMembers([...selection.nodes].map(String), ["b"]);
        assert.deepEqual(counts(), [1, 1, 2], "a plain click selects only b");
    });
});
