/**
 * @file A node repaint that rebuilds meshes pays the pass over the scene's lists about once a frame,
 * not once per 128 nodes (design/ui/studio/tier5/ws-polish-3-scale.md).
 *
 * WHAT WENT WRONG. A paint that changes a node's geometry (its shape, its size) disposes the
 * old mesh inside `disposeReleased`, which sets aside and restores every scene list: a pass over
 * every mesh in the scene, whatever the batch holds. Batches were a fixed 128 nodes, and a frame
 * ran as many as its budget allowed, so a 50,000-node repaint made about 390 passes over 50,000
 * meshes: 3.3 s of one checklist tick in the selection workspace. A frame now takes one batch,
 * sized to its budget, so it makes one teardown at most.
 *
 * A frame that rebuilt nodes also walked every edge; it now places only those nodes' edges.
 *
 * A teardown is counted by what it does to the scene's mesh list: it empties it (`splice(0)`) to set
 * the survivors aside, and empties it again to put them back.
 */

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import { Edge } from "../../src/Edge";
import { Graph } from "../../src/Graph";
import { MINIMUM_PAINT_BATCH, setMinimumWorkPerFrame } from "../../src/managers/minimumWork";

const COUNT = 2000;
const SIDE = Math.ceil(Math.sqrt(COUNT));
const NODES = Array.from({ length: COUNT }, (_unused, index) => ({
    id: `n${String(index)}`,
    position: { x: (index % SIDE) * 2, y: Math.floor(index / SIDE) * 2, z: 0 },
}));

describe("a node repaint that rebuilds meshes", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "480px";
        container.style.height = "320px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        // A teardown is of a node's own mesh: a batched row has none to rebuild.
        graph.setRenderPath("objects");
        await graph.addNodes(NODES);
        await graph.setLayout("fixed", { dim: 3 });
        await graph.waitForStableFrame();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    it("makes at most one teardown a frame", async () => {
        const { meshes } = graph.scene;
        const splice = meshes.splice.bind(meshes);
        let emptied = 0;
        const perFrame: number[] = [];
        meshes.splice = (...args: Parameters<typeof splice>): ReturnType<typeof splice> => {
            if (args.length === 1 && args[0] === 0) {
                emptied++;
            }

            return splice(...args);
        };
        const observer = graph.scene.onAfterRenderObservable.add(() => {
            if (emptied > 0) {
                perFrame.push(emptied / 2);
            }

            emptied = 0;
        });

        try {
            // A shape is the node's geometry, so every node's mesh is rebuilt. An opacity alone moves
            // the mesh onto another source and rebuilds nothing (faint-view-keeps-meshes.test.ts).
            await graph.getSession().styles.add({
                name: "every node a box",
                target: "node",
                selector: { match: "everything" },
                set: { "node.shape": "box" },
            });
            await graph.waitForPainted();
        } finally {
            graph.scene.onAfterRenderObservable.remove(observer);
            delete (meshes as { splice?: unknown }).splice;
        }

        const teardowns = perFrame.reduce((sum, each) => sum + each, 0);
        assert.isAtLeast(teardowns, 1, "the repaint rebuilt meshes");
        assert.isAtMost(Math.max(...perFrame), 1, `teardowns per frame: ${JSON.stringify(perFrame)}`);
    });
});

const CHAIN = Array.from({ length: 120 }, (_unused, index) => ({ id: `c${String(index)}` }));
const LINKS = CHAIN.slice(1).map((node, index) => ({ src: CHAIN[index].id, dst: node.id }));

/*
 * A frame that rebuilt nodes used to force the walk of every edge, so a node repaint spread over
 * many frames placed every edge on each of them: 200,000 edges on every frame of a 50,000-node
 * view switch. It now places the rebuilt nodes' own edges, and every edge once when the queue empties.
 */
describe("a node repaint that rebuilds meshes, split across frames", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeAll(async () => {
        setMinimumWorkPerFrame(true);
        container = document.createElement("div");
        container.style.width = "480px";
        container.style.height = "320px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes(CHAIN);
        await graph.addEdges(LINKS);
        await graph.setLayout("circular");
        await graph.waitForStableFrame();
    });

    afterAll(() => {
        vi.restoreAllMocks();
        setMinimumWorkPerFrame(false);
        graph.dispose();
        container.remove();
    });

    it("places only the rebuilt nodes' edges on each frame, and every edge once at the end", async () => {
        const painter = graph.getStylePainter();
        let splitFrames = 0;
        const observer = graph.scene.onAfterRenderObservable.add(() => {
            if (painter.hasPendingNodes) {
                splitFrames++;
            }
        });
        const update = vi.spyOn(Edge.prototype, "update");

        try {
            await graph.getSession().styles.add({
                name: "every node a box",
                target: "node",
                selector: { match: "everything" },
                set: { "node.shape": "box" },
            });
            await graph.waitForPainted();
        } finally {
            graph.scene.onAfterRenderObservable.remove(observer);
        }

        assert.isAtLeast(splitFrames, Math.floor(CHAIN.length / MINIMUM_PAINT_BATCH) - 1, "the repaint was split");
        // Each rebuilt node's edges once with its batch (two per node on a chain), every edge once
        // at the end, and a frame or two of slack: a walk on every split frame would be splitFrames
        // times the edges.
        assert.isBelow(update.mock.calls.length, LINKS.length * 6, `edge updates: ${String(update.mock.calls.length)}`);
        assert.isFalse(painter.hasPending, "every batch was applied");
    });
});
