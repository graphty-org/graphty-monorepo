/**
 * @file `nodeScreenPosition` and `elementAt` read where a node is drawn once `waitForStableFrame` resolves, even
 * when the canvas's box changed just before (issue #10320).
 *
 * A panel opening beside the canvas shrinks its box. The element hears of it from its ResizeObserver, which runs
 * after the page's animation frames, and a frame loop at rest does not look. A wait that ended before the observer
 * ran left the drawing buffer at the old size: the reads framed every node for it, and pointed at empty canvas once
 * the observer resized it. In the graphty app that put a yEd file's nodes up to 200 px from where they were drawn.
 *
 * Nothing here calls `graph.resize()`: the box changes and the wait starts at once, as when a page opens a panel and
 * then asks the element where a node is.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { pixelsAt } from "../../helpers/canvas-pixels";

const SIDE = 4;
const IDS = Array.from({ length: SIDE * SIDE }, (_, id) => `n${String(id)}`);

let container: HTMLDivElement | undefined;

afterEach(() => {
    container?.remove();
    container = undefined;
});

describe("reads after the canvas's box changes", () => {
    it("place each node where it is drawn once the picture is stable", async () => {
        container = document.createElement("div");
        container.style.cssText = "width:400px;height:400px";
        document.body.appendChild(container);
        const element: Graphty = document.createElement("graphty-element");
        element.style.cssText = "display:block;width:100%;height:100%";
        container.appendChild(element);
        await element.setViewMode("2d");
        await element.graph.addNodes(
            IDS.map((id, i) => ({
                id,
                position: { x: (i % SIDE) * 3 - 4.5, y: Math.floor(i / SIDE) * 3 - 4.5, z: 0 },
            })),
        );
        await element.graph.setLayout("fixed", { dim: 2 });
        await element.waitForStableFrame();

        // A panel opens beside the canvas. The 2D camera keeps its half-width, so every node stays in view.
        container.style.width = "240px";
        await element.waitForStableFrame();

        const { engine } = element.graph;
        assert.equal(
            engine.getRenderWidth(),
            engine.getRenderingCanvas()?.clientWidth,
            "the stable picture is drawn at the canvas's box",
        );
        const spots = IDS.map((id) => {
            const spot = element.nodeScreenPosition(id);
            assert.isTrue(spot?.visible, `${id} is visible`);
            assert.deepEqual(
                element.elementAt({ x: spot.x, y: spot.y }),
                { kind: "node", id },
                `${id} is picked there`,
            );
            return spot;
        });
        const [corner, ...centers] = await pixelsAt(element, [{ x: 2, y: 2 }, ...spots]);
        const empty = IDS.filter((_, i) => {
            const [r, g, b] = centers[i];
            return Math.hypot(r - corner[0], g - corner[1], b - corner[2]) < 16;
        });
        assert.deepEqual(empty, [], "every node is drawn where nodeScreenPosition puts it");
    });
});
