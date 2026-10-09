/**
 * @file View insets keep every fit clear of what covers the canvas.
 *
 * An application lays a key over the canvas's left edge and tells the element how much of the
 * canvas it covers. After any fit -- the element's own `zoomToFit()` and the `fitToGraph` camera
 * view -- every node must be drawn in the part left free, in 2D and in 3D. Without the insets
 * both fits center the graph on the whole canvas, and the nodes on its left fall under the key.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";

/** Canvas size in CSS pixels. */
const WIDTH = 640;
const HEIGHT = 480;
/** The key's width, reserved at the left. */
const LEFT = 200;

/**
 * A ball of nodes with depth, so a 3D fit has near and far corners to get right.
 * @returns The nodes.
 */
function ball(): { id: string; position: { x: number; y: number; z: number } }[] {
    return Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const b = ((i % 6) / 6) * Math.PI - Math.PI / 2;
        return {
            id: `n${String(i)}`,
            position: { x: 30 * Math.cos(a) * Math.cos(b) + 5, y: 20 * Math.sin(b), z: 25 * Math.sin(a) * Math.cos(b) },
        };
    });
}

/**
 * Let the element's own render loop draw a few frames.
 */
async function frames(): Promise<void> {
    // eslint-disable-next-line local/no-test-timing -- fixed sleep, to become a wait on the condition it stands in for, tracked in #1636
    await new Promise((resolve) => setTimeout(resolve, 200));
}

describe("view insets", () => {
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
        for (const fit of ["zoomToFit", "fitToGraph"] as const) {
            it(`${mode}, ${fit}: with a ${String(LEFT)} px left inset every node lies right of it`, async () => {
                const nodes = ball();
                await element.graph.addNodes(nodes);
                await element.graph.setLayout("fixed", { dim: 3 });
                await element.graph.waitForSettled();
                await element.setViewMode(mode);
                await element.graph.waitForSettled();

                element.viewInsets = { left: LEFT };
                assert.deepEqual(element.viewInsets, { top: 0, right: 0, bottom: 0, left: LEFT });

                if (fit === "zoomToFit") {
                    element.zoomToFit();
                } else {
                    await element.applyCameraView("fitToGraph");
                }
                await frames();

                let leftmost = Infinity;
                let rightmost = -Infinity;
                for (const { id } of nodes) {
                    const at = element.nodeScreenPosition(id);
                    assert.isDefined(at, id);
                    assert.isTrue(at.visible, `${id} is visible`);
                    assert.isAbove(at.x, LEFT, `${id} is right of the inset`);
                    assert.isAtMost(at.x, WIDTH, `${id} is left of the canvas's right edge`);
                    assert.isAtLeast(at.y, 0, `${id} is below the canvas's top edge`);
                    assert.isAtMost(at.y, HEIGHT, `${id} is above the canvas's bottom edge`);
                    leftmost = Math.min(leftmost, at.x);
                    rightmost = Math.max(rightmost, at.x);
                }

                // Centered on what is left free, not pushed against the far edge.
                const middle = (leftmost + rightmost) / 2;
                const freeMiddle = (LEFT + WIDTH) / 2;
                assert.isBelow(Math.abs(middle - freeMiddle), (WIDTH - LEFT) / 6, "centered on the free area");
            });
        }
    }

    for (const mode of ["2d", "3d"] as const) {
        it(`${mode}: changing the insets leaves every node where it was drawn until the next fit`, async () => {
            const nodes = ball();
            await element.graph.addNodes(nodes);
            await element.graph.setLayout("fixed", { dim: 3 });
            await element.graph.waitForSettled();
            await element.setViewMode(mode);
            await element.graph.waitForSettled();
            element.zoomToFit();
            await frames();

            const before = new Map(nodes.map(({ id }) => [id, element.nodeScreenPosition(id)]));
            // A key grows over the top of the canvas, as one does when a new channel is painted.
            element.viewInsets = { top: 150, bottom: 70 };
            await frames();
            for (const { id } of nodes) {
                const was = before.get(id);
                const now = element.nodeScreenPosition(id);
                assert.isDefined(was, id);
                assert.isDefined(now, id);
                assert.closeTo(now.x, was.x, 0.5, `${id} kept its x`);
                assert.closeTo(now.y, was.y, 0.5, `${id} kept its y`);
            }

            // The key hides nodes, so the consumer frames again; the fit keeps clear of the margins.
            assert.isNotEmpty(element.nodesInRect({ x: 0, y: 0, width: WIDTH, height: 150 }));
            element.zoomToFit();
            await frames();
            for (const { id } of nodes) {
                const at = element.nodeScreenPosition(id);
                assert.isDefined(at, id);
                assert.isAbove(at.y, 150, `${id} is below the top inset`);
                assert.isBelow(at.y, HEIGHT - 70, `${id} is above the bottom inset`);
            }
            assert.isEmpty(element.nodesInRect({ x: 0, y: 0, width: WIDTH, height: 140 }));
        });
    }

    it("no insets leave every side at 0, and a refused side reads 0", () => {
        assert.deepEqual(element.viewInsets, { top: 0, right: 0, bottom: 0, left: 0 });
        element.viewInsets = { top: -5, left: Number.NaN, right: 12 };
        assert.deepEqual(element.viewInsets, { top: 0, right: 12, bottom: 0, left: 0 });
    });
});
