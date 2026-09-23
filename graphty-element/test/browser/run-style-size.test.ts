/**
 * @file `runs.start(..., { style: { size: true } })` sizes the nodes on screen, and removing the
 * run takes the size away again.
 *
 * Read off the meshes the renderer draws, not off the style model, so a size layer that the model
 * holds and the renderer never applies is caught here.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

/** A star with a tail: degrees run 1 (tail) to 4 (hub). */
const NODES = [{ id: "hub" }, { id: "a" }, { id: "b" }, { id: "c" }, { id: "tail" }];
const EDGES = [
    { src: "hub", dst: "a" },
    { src: "hub", dst: "b" },
    { src: "hub", dst: "c" },
    { src: "hub", dst: "tail" },
    { src: "a", dst: "b" },
];

describe("sizing nodes by a run with style: { size }", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Let queued style edits land and draw a few frames, then read each node's drawn half-width.
     * @returns Half the world-space bounding box width of each node's mesh, by id.
     */
    async function drawnRadii(): Promise<Map<string, number>> {
        await graph.operationQueue.waitForCompletion();

        for (let frame = 0; frame < 10; frame++) {
            graph.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, 10);
            });
        }

        return new Map(
            graph.getNodes().map((node) => {
                node.mesh.computeWorldMatrix(true);

                return [String(node.id), node.mesh.getBoundingInfo().boundingBox.extendSizeWorld.x];
            }),
        );
    }

    it("draws the busiest node three times the size of the quietest, and removes the size layer with the run", async () => {
        const before = await drawnRadii();

        assert.closeTo(before.get("hub") ?? 0, before.get("tail") ?? -1, 1e-6, "every node starts the same size");

        const run = session.runs.start("degree", {}, { style: { size: true } });
        await run;

        const sized = await drawnRadii();
        const hub = sized.get("hub") ?? 0;
        const tail = sized.get("tail") ?? 0;

        assert.isAbove(tail, 0, "the tail is drawn");
        assert.closeTo(hub / tail, 3, 0.05, "the default range is [1, 3], so the hub is drawn three times the tail");
        assert.closeTo(tail, before.get("tail") ?? 0, 1e-6, "the least connected node keeps the default size");

        const sizeLayers = session.styles.list().filter((layer) => layer.encode?.["node.size"] !== undefined);

        assert.lengthOf(sizeLayers, 1, "one size layer");
        assert.deepStrictEqual(sizeLayers[0].selector, { match: "has", path: `results.${run.id}.value` });

        const removal = session.runs.remove(run.id);

        assert.include(removal.layerIds, sizeLayers[0].id, "the size layer is one of the run's layers");

        await drawnRadii();

        assert.lengthOf(
            session.styles.list().filter((layer) => layer.encode?.["node.size"] !== undefined),
            0,
            "the size layer went with the run",
        );
    });

    it("draws the nodes at the default size again once the size layer is removed", async () => {
        const before = await drawnRadii();
        const run = session.runs.start("degree", {}, { style: { size: true } });
        await run;
        await drawnRadii();

        const sizeLayer = session.styles.list().find((layer) => layer.encode?.["node.size"] !== undefined);

        assert.isDefined(sizeLayer);
        await session.styles.remove(sizeLayer?.id ?? "");

        const after = await drawnRadii();

        assert.closeTo(after.get("hub") ?? 0, before.get("hub") ?? -1, 1e-6, "the hub is back to the default size");
    });

    // KNOWN ELEMENT DEFECT, pinned so it is seen: `runs.remove()` deletes the run -- and with it
    // the result column -- before the queued removal of its layers repaints. The repaint marks the
    // elements a removed layer's selector matches NOW, `{ match: "has" }` over a column that has
    // gone matches nothing, and so nothing loses the paint: the nodes keep the run's size (and its
    // colour, for any run) on screen after the run and its layers are gone. Removing the layer
    // itself, as the test above does, repaints correctly. When this starts passing, drop `.fails`.
    it.fails("draws the nodes at the default size again once the RUN is removed", async () => {
        const before = await drawnRadii();
        const run = session.runs.start("degree", {}, { style: { size: true } });
        await run;
        await drawnRadii();

        session.runs.remove(run.id);

        const after = await drawnRadii();

        assert.closeTo(after.get("hub") ?? 0, before.get("hub") ?? -1, 1e-6, "the hub is back to the default size");
    });
});
