/**
 * @file The "fitToGraph" camera view frames every node, in 2D and in 3D.
 *
 * This is the view an application's Fit command and `zoomToNodes` use. In 2D it once answered
 * with a zoom measured in pixels per world unit, while the camera reads a zoom as how far in from
 * its starting half-width of 5 units it is -- so on a graph a few dozen units wide, Fit filled the
 * screen with a single edge. Checked here the way a reader sees it: after Fit, every node is drawn
 * inside the canvas, and the graph is not lost in a corner of it either.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";

/**
 * A ring of nodes tens of units across, off the origin, so a wrong zoom unit is obvious.
 * @param rx - Half its width.
 * @param ry - Half its height.
 * @returns The nodes.
 */
function ring(rx: number, ry: number): { id: string; position: { x: number; y: number; z: number } }[] {
    return Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return { id: `n${String(i)}`, position: { x: rx * Math.cos(angle) + 7, y: ry * Math.sin(angle) - 3, z: 0 } };
    });
}

/** A wide ring fills the frame by its width; a tall one, on a landscape canvas, by its height. */
const SHAPES = { wide: ring(40, 25), tall: ring(15, 40) };

/** Canvas size in CSS pixels. */
const WIDTH = 640;
const HEIGHT = 480;

/**
 * Let the element's own render loop draw a few frames.
 */
async function frames(): Promise<void> {
    // eslint-disable-next-line local/no-test-timing -- fixed sleep, to become a wait on the condition it stands in for, tracked in #1636
    await new Promise((resolve) => setTimeout(resolve, 200));
}

describe("fitToGraph frames the whole graph", () => {
    let container: HTMLDivElement;
    let element: Graphty;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        element = document.createElement("graphty-element");
        container.appendChild(element);
        await frames();
    });

    afterEach(() => {
        container.remove();
    });

    for (const mode of ["2d", "3d"] as const) {
        for (const [shape, nodes] of Object.entries(SHAPES)) {
            it(`${mode}, ${shape} graph: every node is inside the canvas after Fit, even from a camera zoomed far in`, async () => {
                await element.graph.addNodes(nodes);
                await element.graph.addEdges(
                    nodes.map((node, i) => ({ src: node.id, dst: nodes[(i + 1) % nodes.length].id })),
                );
                await element.graph.setLayout("fixed", { dim: 3 });
                await element.graph.waitForSettled();
                await element.setViewMode(mode);
                await element.graph.waitForSettled();

                // Lose the reader first: zoom right in on one node, as the wheel does.
                await element.graph.zoomToNodes("n0");
                await element.graph.zoomStep("in");
                await element.graph.zoomStep("in");
                await frames();

                await element.applyCameraView("fitToGraph");
                await frames();

                let left = Infinity;
                let right = -Infinity;
                let top = Infinity;
                let bottom = -Infinity;
                for (const { id } of nodes) {
                    const at = element.nodeScreenPosition(id);
                    assert.isDefined(at, id);
                    assert.isTrue(at.visible, `${id} is visible`);
                    assert.isAtLeast(at.x, 0, `${id} is right of the canvas's left edge`);
                    assert.isAtMost(at.x, WIDTH, `${id} is left of the canvas's right edge`);
                    assert.isAtLeast(at.y, 0, `${id} is below the canvas's top edge`);
                    assert.isAtMost(at.y, HEIGHT, `${id} is above the canvas's bottom edge`);
                    left = Math.min(left, at.x);
                    right = Math.max(right, at.x);
                    top = Math.min(top, at.y);
                    bottom = Math.max(bottom, at.y);
                }

                // Framed, not merely inside: the ring spans a good part of the canvas. The 3D view
                // looks at it from a corner, which foreshortens it, so it is held to less.
                const span = shape === "wide" ? right - left : bottom - top;
                const across = shape === "wide" ? WIDTH : HEIGHT;
                const share = mode === "2d" ? 2 : 3;
                assert.isAbove(span, across / share, "the graph fills the frame rather than a corner of it");
            });
        }
    }
});
