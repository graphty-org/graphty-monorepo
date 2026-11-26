/**
 * @file A layer that turns every node translucent places each edge once, on both render paths, and
 * draws the picture of the same layer set before the data (issue #10018).
 *
 * WHAT WENT WRONG. A node whose painted opacity crosses 1 has its edges measure their ends again,
 * because a plain line leaves a translucent node at its outline (issue #9875). Inside a repaint of
 * every node that queued each node's edges to be placed on the frame that painted it, and then the
 * frame that finished the repaint walked every edge anyway. Split over frames, an edge was placed
 * once with the first of its ends and again in that walk: about 270 ms of a 680 ms restyle at
 * 10,000 nodes on "objects". The minimum-work mode splits the repaint into many frames, so the
 * count shows.
 */

import "../../src/graphty-element";

import { afterAll, afterEach, assert, beforeAll, describe, it, vi } from "vitest";

import { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import { MINIMUM_PAINT_BATCH, setMinimumWorkPerFrame } from "../../src/managers/minimumWork";
import { assertSameFrame, type CanvasFrame, readCanvas } from "../helpers/whole-canvas";

const SIDE = 8;
const NODES = Array.from({ length: SIDE * SIDE }, (_unused, index) => ({
    id: `n${String(index)}`,
    position: { x: (index % SIDE) * 2 - SIDE, y: Math.floor(index / SIDE) * 2 - SIDE, z: 0 },
}));
// Each node to its right and lower neighbors: every node has edges painted on frames other than its own.
const EDGES = NODES.flatMap((_node, index) => [
    ...(index % SIDE < SIDE - 1
        ? [{ source: `n${String(index)}`, target: `n${String(index + 1)}`, directed: false }]
        : []),
    ...(index + SIDE < NODES.length
        ? [{ source: `n${String(index)}`, target: `n${String(index + SIDE)}`, directed: false }]
        : []),
]);

const TRANSLUCENT = {
    name: "translucent",
    target: "node",
    selector: { match: "everything" },
    set: { "node.opacity": 0.5 },
} as const;

beforeAll(() => {
    setMinimumWorkPerFrame(true);
});

afterAll(() => {
    setMinimumWorkPerFrame(false);
});

afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
});

/**
 * Draw the grid, with the translucent layer added before the data or after the first stable frame.
 * @param path - The render path.
 * @param late - Whether the layer comes after the edges are drawn.
 * @returns The canvas and the edge placements the late layer cost.
 */
async function draw(path: "objects" | "batched", late: boolean): Promise<{ frame: CanvasFrame; placed: number }> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "400px";
    document.body.append(element);
    await element.updateComplete;
    await element.setViewMode("2d");
    await element.session.styles.add({
        name: "ink",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#ff00ff", "edge.width": 3 },
    });
    if (!late) {
        await element.session.styles.add(TRANSLUCENT);
    }

    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 2 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    let placed = 0;
    if (late) {
        const painter = element.graph.getStylePainter();
        let splitFrames = 0;
        const observer = element.graph.scene.onAfterRenderObservable.add(() => {
            if (painter.hasPendingNodes) {
                splitFrames++;
            }
        });
        // The measured part of `Edge.update`, run only for an edge whose ends moved or were measured again: a walk
        // that finds an edge already placed costs a comparison, not a placement.
        const update = vi.spyOn(Edge.prototype as unknown as { followLayout: () => void }, "followLayout");
        try {
            await element.session.styles.add(TRANSLUCENT);
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
        } finally {
            element.graph.scene.onAfterRenderObservable.remove(observer);
        }

        placed = update.mock.calls.length;
        update.mockRestore();
        assert.isAtLeast(splitFrames, Math.floor(NODES.length / MINIMUM_PAINT_BATCH) - 1, "the repaint was split");
    }

    const frame = await readCanvas(element.graph);
    element.remove();
    return { frame, placed };
}

describe.each(["objects", "batched"] as const)("every node turning translucent over many frames, %s", (path) => {
    it("places each edge once and draws the picture of the layer set first", async () => {
        const first = await draw(path, false);
        const late = await draw(path, true);

        // The walk that ends the repaint places every built edge once. Before it, only the edges of the rows
        // painted while the repaint could still have been a small one (a sixteenth of the nodes, here one paint
        // batch) are placed on their own frame. Placed on every frame, 112 edges took 176 placements.
        const early = 2 * MINIMUM_PAINT_BATCH;
        assert.isAtMost(late.placed, EDGES.length + early, `edge placements: ${String(late.placed)}`);
        if (path === "objects") {
            assert.isAtLeast(late.placed, EDGES.length, "every edge was placed against the translucent nodes");
        }

        assertSameFrame(
            first.frame,
            late.frame,
            "the late layer draws a different picture from the same layer set first",
        );
    });
});
