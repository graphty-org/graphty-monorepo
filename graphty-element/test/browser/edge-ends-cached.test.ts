/**
 * @file Under `renderPath: "batched"` a capped edge whose end is a batched non-round node casts no ray
 * while a drag moves it: its end sits on the node's bounding radius, and once the drag stops the end is
 * measured again and the picture is the `"objects"` path's. Stage 20 of design/rendering/row-renderer.md
 * (section 4.3); the bar is its section 7.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { RowScan } from "../../src/render/PickService";
import { moveHeld, nextFrame, press, release } from "../helpers/real-input";
import { pixelsOverBar as overBar, readCanvas } from "../helpers/whole-canvas";

afterEach(() => {
    document.body.replaceChildren();
});

const RING = Array.from({ length: 6 }, (_, at) => {
    const angle = (2 * Math.PI * at) / 6;
    return { id: `n${String(at)}`, position: { x: 3 * Math.cos(angle), y: 3 * Math.sin(angle), z: 0 } };
});

const MOVES = 8;

/**
 * Mount an element of figure-shaped nodes, each edge from the middle one capped, on a render path.
 * @param path - The render path.
 * @returns The element.
 */
async function loaded(path: RenderPath): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([{ id: "t", position: { x: 0, y: 0, z: 0 } }, ...RING]);
    await element.session.data.addEdges(RING.map(({ id }) => ({ src: "t", dst: id })));
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("3d");
    await element.session.styles.add({
        name: "figures",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shape": "man" },
    } as never);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Drag the middle node with the mouse, counting rays cast at a batched row and edge visits while it moves.
 * @param element - The element.
 * @returns The counts.
 */
async function dragCounted(element: Graphty): Promise<{ rays: number; visits: number }> {
    const position = element.nodeScreenPosition("t");
    assert.isDefined(position, "node t is drawn");
    const { x, y } = position;
    await press(element, { x, y });
    await moveHeld(element, { x: x + 10, y: y + 5 });

    const rays = vi.spyOn(RowScan.prototype, "rowRayHitOn");
    const visits = vi.spyOn(Edge.prototype, "update");
    try {
        for (let move = 1; move <= MOVES; move++) {
            await moveHeld(element, { x: x + 10 + 5 * move, y: y + 5 });
            await nextFrame();
        }

        return { rays: rays.mock.calls.length, visits: visits.mock.calls.length };
    } finally {
        rays.mockRestore();
        visits.mockRestore();
        await release(element, { x: x + 10 + 5 * MOVES, y: y + 5 });
        await element.waitForStableFrame();
    }
}

describe("cached non-round ends", () => {
    it("cast no ray at a batched row while a drag moves it, and draw the objects picture at rest", async () => {
        const objects = await loaded("objects");
        await dragCounted(objects);
        const objectsRest = await readCanvas(objects.graph);
        objects.remove();

        const batched = await loaded("batched");
        assert.isTrue(batched.graph.getNode("t")?.drawnInBatch, "the figure is drawn in a batch");
        const { rays, visits } = await dragCounted(batched);
        assert.isAbove(visits, 0, "the drag moved the edges");
        assert.equal(rays, 0, `rays cast during ${String(visits)} edge visits`);
        assert.equal(overBar(objectsRest, await readCanvas(batched.graph)), 0, "at rest after the drag");
    });
});
