/**
 * @file Under `renderPath: "batched"`, a style the batches cannot draw (a border) gives each of its
 * rows a `Node` of its own, and those `Node`s are painted together: one pass over the scene's lists
 * for the lot, not one per row.
 *
 * WHAT WENT WRONG. A row stored with no `Node` that a style sent to the object path was built and
 * painted on its own, and a paint that rebuilds a mesh runs `disposeReleased`, which sets aside and
 * restores every scene list: a pass over every mesh in the scene. One pass per row made a styled load
 * or a restyle grow with the square of the node count: bordering 20,000 nodes took 29-49 s on batched
 * against 1-2 s on objects.
 *
 * Each paint batch now makes one teardown, as on the objects path, and a repaint is never split into
 * more than `REPAINT_FRAMES` batches, so the count is bounded whatever the graph's size.
 *
 * A teardown is counted by what it does to the scene's mesh list: it empties it (`splice(0)`) to set
 * the survivors aside, and empties it again to put them back.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import { REPAINT_FRAMES } from "../../src/managers/UpdateManager";

// Far more rows than a repaint has batches, so a teardown per row cannot pass for one per batch.
const COUNT = 20 * REPAINT_FRAMES;
const SIDE = Math.ceil(Math.sqrt(COUNT));
const NODES = Array.from({ length: COUNT }, (_unused, index) => ({
    id: `n${String(index)}`,
    position: { x: (index % SIDE) * 2, y: Math.floor(index / SIDE) * 2, z: 0 },
}));
const BORDER = {
    name: "every node bordered",
    target: "node" as const,
    selector: { match: "everything" as const },
    set: { "node.borderColor": "#000000", "node.borderWidth": 0.1 },
};

/**
 * Count the teardowns made while `work` runs.
 * @param graph - The graph.
 * @param work - What to count.
 * @returns How many.
 */
async function teardownsDuring(graph: Graph, work: () => Promise<void>): Promise<number> {
    const { meshes } = graph.scene;
    const splice = meshes.splice.bind(meshes);
    let emptied = 0;
    meshes.splice = (...args: Parameters<typeof splice>): ReturnType<typeof splice> => {
        if (args.length === 1 && args[0] === 0) {
            emptied++;
        }

        return splice(...args);
    };

    try {
        await work();
    } finally {
        delete (meshes as { splice?: unknown }).splice;
    }

    return emptied / 2;
}

describe("batched rows a style sends to the object path", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "480px";
        container.style.height = "320px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        graph.setRenderPath("batched");
        await graph.setLayout("fixed", { dim: 3 });
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("are torn down together when a restyle borders them", async () => {
        await graph.addNodes(NODES);
        await graph.waitForStableFrame();
        assert.equal(graph.rowCounts.objectNodes, 0, "every row starts on the batch");

        const teardowns = await teardownsDuring(graph, async () => {
            await graph.getSession().styles.add(BORDER);
            await graph.waitForPainted();
        });

        assert.equal(graph.rowCounts.objectNodes, COUNT, "every bordered row is drawn by its own Node");
        assert.isAtLeast(teardowns, 1, "the paint rebuilt meshes");
        assert.isAtMost(teardowns, REPAINT_FRAMES, `one teardown per paint batch, not per row (${String(COUNT)} rows)`);
    });

    it("are torn down together when a load arrives already bordered", async () => {
        await graph.getSession().styles.add(BORDER);
        await graph.waitForStableFrame();

        const teardowns = await teardownsDuring(graph, async () => {
            await graph.addNodes(NODES);
            await graph.waitForPainted();
        });

        assert.equal(graph.rowCounts.objectNodes, COUNT, "every bordered row is drawn by its own Node");
        assert.isAtLeast(teardowns, 1, "the paint rebuilt meshes");
        assert.isAtMost(teardowns, REPAINT_FRAMES, `one teardown per paint batch, not per row (${String(COUNT)} rows)`);
    });
});
