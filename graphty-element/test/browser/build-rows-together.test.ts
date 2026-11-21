/**
 * @file Building the `Node`s of many rows drawn with no `Node` releases the meshes they rebuild in
 * one teardown, not one per row (issue #9184).
 *
 * WHAT WENT WRONG. A row a batch drew with no `Node` gets one when something asks for it: framing
 * the graph, `getNodes`, label sampling. The new `Node` is painted at once, and when that paint
 * rebuilds its mesh, the old mesh was released through `disposeReleased` -- a pass over every mesh
 * in the scene -- for that one node. Framing a 50,000-node graph built every row that way: 50,000
 * passes over 50,000 meshes, about 4.5 minutes before the graph was in.
 *
 * A teardown is counted by what it does to the scene's mesh list: it empties it (`splice(0)`) to set
 * the survivors aside, and empties it again to put them back.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

const NODES = Array.from({ length: 200 }, (_, id) => ({ id }));

/**
 * A batched graph of 200 nodes, every row drawn with no `Node`.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
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
    element.graph.setRenderPath("batched");
    await element.graph.setLayout("random", { dim: 3, seed: 7 });
    await element.session.data.addNodes(NODES);
    await element.waitForSettled();
    await element.waitForStableFrame();
    return element;
}

/**
 * Count the teardowns `work` makes.
 * @param element - The element.
 * @param work - The work.
 * @returns How many teardowns.
 */
function teardownsOf(element: Graphty, work: () => void): number {
    const { meshes } = element.graph.scene;
    const splice = meshes.splice.bind(meshes);
    let emptied = 0;
    meshes.splice = (...args: Parameters<typeof splice>): ReturnType<typeof splice> => {
        if (args.length === 1 && args[0] === 0) {
            emptied++;
        }

        return splice(...args);
    };
    try {
        work();
    } finally {
        delete (meshes as { splice?: unknown }).splice;
    }

    return emptied / 2;
}

describe("building the Node of every row drawn with none", () => {
    it("releases the meshes the new Nodes rebuild in one teardown", async () => {
        const element = await mounted();
        const manager = element.graph.getDataManager();
        assert.strictEqual(dataManagerInternals.nodesBuilt(manager), 0, "every row is drawn with no Node");
        // A paint the batches have not drawn yet: every new `Node` is built as the batch drew its row,
        // and its paint rebuilds its mesh.
        await element.session.styles.add({
            name: "every node a box",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": "box" },
        });

        const teardowns = teardownsOf(element, () => {
            dataManagerInternals.buildAll(manager);
        });

        assert.strictEqual(dataManagerInternals.nodesBuilt(manager), NODES.length, "every row has its Node");
        assert.isAtMost(teardowns, 1, `teardowns: ${String(teardowns)}`);
        for (const node of element.graph.getNodes()) {
            assert.isFalse(node.mesh.isDisposed(), `node ${String(node.id)} has a live mesh`);
        }
    });
});
