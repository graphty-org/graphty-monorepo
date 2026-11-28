/**
 * @file `waitForPainted()` resolves only after a frame that shows the style edit has been drawn, with a layout
 * running (issue #10322).
 *
 * Style paint reaches the meshes before a frame draws it, and it can reach them between frames: a layout that keeps
 * nodes apart by their size applies the arrived paint before it reads the sizes, and `graph.update()` pumped by hand
 * applies it too. A wait that took "nothing left to apply" for "drawn" resolved with the old colors still on the
 * canvas. The canvas is read the moment the wait resolves, with no frame waited for in between, so what is on it is
 * what the last drawn frame showed; each node is read where it is now, which is where that frame drew it.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const COUNT = 200;

let element: Graphty | undefined;

afterEach(() => {
    element?.remove();
    element = undefined;
});

/**
 * How many of the points read red on the canvas now, without waiting for a frame.
 * @param graphty - The element.
 * @param points - CSS pixels from the element's top-left corner.
 * @returns The count.
 */
async function redNow(graphty: Graphty, points: readonly { x: number; y: number }[]): Promise<number> {
    const { engine } = graphty.graph;
    const canvas = engine.getRenderingCanvas();
    const scale = canvas === null || canvas.clientWidth === 0 ? 1 : engine.getRenderWidth() / canvas.clientWidth;
    // Every read starts before the first is awaited, so all of them read the same frame.
    const reads = points.map(
        (point) =>
            engine.readPixels(
                Math.round(point.x * scale),
                engine.getRenderHeight() - Math.round(point.y * scale) - 1,
                1,
                1,
            ) as unknown as Promise<Uint8Array>,
    );
    return (await Promise.all(reads)).filter(([r, g, b]) => r > 150 && g < 100 && b < 100).length;
}

describe("waitForPainted with a layout running", () => {
    it("resolves only once a drawn frame shows paint applied between frames", async () => {
        element = document.createElement("graphty-element");
        element.renderer = "webgl";
        element.style.cssText = "display:block;width:600px;height:450px";
        document.body.appendChild(element);
        await element.updateComplete;
        await element.setViewMode("2d");
        const ids = Array.from({ length: COUNT }, (_, at) => `n${String(at)}`);
        await element.session.data.addNodes(ids.map((id) => ({ id })));
        await element.graph.setLayout("ngraph", { dim: 2 });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForPainted();
        const graphty = element;
        const spots = (): { x: number; y: number }[] =>
            ids.flatMap((id) => {
                const spot = graphty.nodeScreenPosition(id);
                return spot?.visible === true ? [spot] : [];
            });
        assert.equal(await redNow(element, spots()), 0, "no node is red before the edit");

        await element.session.styles.add({
            name: "red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        } as never);
        await element.session.styles.settled();
        // The pass has announced: its paint is waiting for a frame. Applied now, between frames.
        assert.isTrue(element.graph.getStylePainter().hasPending, "the paint is waiting to be drawn");
        element.graph.update();
        assert.isFalse(element.graph.getStylePainter().hasPending, "the paint is on the meshes");

        await element.waitForPainted();

        assert.notEqual(element.session.layout.motion, "settled", "the layout is running");
        const drawn = spots();
        assert.isAbove(drawn.length, COUNT / 2, "most nodes are in view");
        const red = await redNow(element, drawn);
        // A node read at its antialiased rim, or under another node, can read another color; nearly all read red.
        assert.isAbove(red, drawn.length * 0.5, `${String(red)} of ${String(drawn.length)} nodes are drawn red`);
    });
});
