/**
 * @file Adding to a full selection must not draw a halo the selection refused (issue #2978).
 *
 * The selection holds at most `DEFAULT_SELECTION_CAP` elements and truncates in index order. With
 * the selection full, adding a node with a higher index asks for one more; the selection keeps the
 * first cap's worth and drops the added node. What is drawn must follow what is held: every node
 * is drawn selected exactly when the session's selection holds it.
 *
 * The add is what a shift-click on a node does (`SelectionManager.toggle`), called directly rather
 * than through the mouse: at this graph size one pointer event costs tens of seconds while every
 * node picks the scene on its own (issue #2941).
 */
import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";
import { DEFAULT_SELECTION_CAP } from "../../../src/session/selection";
import { drawnFrames } from "../../helpers/drawn-frames";

const COLUMNS = 100;

let element: Graphty | null = null;

afterEach(() => {
    element?.remove();
    element = null;
});

/**
 * Mount an element holding a cap's worth of nodes, plus node "last", added last so it has the
 * highest index.
 * @returns The element, drawn.
 */
async function mounted(): Promise<Graphty> {
    const mount = document.createElement("graphty-element");
    mount.style.display = "block";
    mount.style.width = "400px";
    mount.style.height = "300px";
    document.body.appendChild(mount);
    element = mount;
    await mount.updateComplete;
    await operationQueueOf(mount.graph).waitForCompletion();
    const block = Array.from({ length: DEFAULT_SELECTION_CAP }, (_, at) => ({
        id: `n${String(at)}`,
        position: { x: at % COLUMNS, y: Math.floor(at / COLUMNS), z: 0 },
    }));
    await mount.session.data.addNodes([...block, { id: "last", position: { x: -20, y: 25, z: 0 } }]);
    await mount.graph.setLayout("fixed", { dim: 3 });
    await mount.setViewMode("2d");
    await operationQueueOf(mount.graph).waitForCompletion();
    await mount.waitForStableFrame();
    return mount;
}

/**
 * Wait until the element has drawn the change just made.
 * @param mount - The element.
 */
async function drawn(mount: Graphty): Promise<void> {
    await drawnFrames(mount.graph.getScene(), 1);
    await mount.waitForStableFrame();
}

/**
 * The nodes whose drawn selected state disagrees with the session's selection.
 * @param mount - The element.
 * @returns Their ids.
 */
function disagreeing(mount: Graphty): string[] {
    const { selection } = mount.session;
    return [...mount.graph.getDataManager().nodes.values()]
        .filter((node) => node.isSelected() !== selection.has(node.id))
        .map((node) => String(node.id));
}

describe("a capped selection", () => {
    it("draws no halo on a node the cap refused to add", async () => {
        const mount = await mounted();
        await mount.session.selection.apply({ nodes: [...mount.graph.getDataManager().nodes.keys()] });
        await drawn(mount);
        assert.strictEqual(mount.session.selection.nodes.length, DEFAULT_SELECTION_CAP, "the selection is full");
        assert.isFalse(mount.session.selection.has("last"), "the cap dropped the highest index");
        assert.deepStrictEqual(disagreeing(mount), [], "the full selection is drawn as held");

        const last = mount.graph.getNode("last");
        assert.isDefined(last);
        mount.graph.getSelectionManager().toggle(last);
        await drawn(mount);

        assert.isFalse(mount.session.selection.has("last"), "the cap refused the added node");
        assert.isTrue(mount.session.selection.truncated, "the selection says it truncated");
        assert.deepStrictEqual(disagreeing(mount), [], "every halo matches the selection");
    });
});
