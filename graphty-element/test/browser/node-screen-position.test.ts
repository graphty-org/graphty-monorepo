/**
 * @file `element.nodeScreenPosition(id)`: where a node is drawn on screen, and whether it can be
 * seen there. The position is checked against the real pointer: a click at the reported centre
 * selects that node, a click inside the reported radius selects it too, and one well outside the
 * radius does not -- in 2D and in 3D.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

/** Four nodes at the corners of a diamond, far enough apart that their discs never touch. */
const NODES = [
    { id: "a", position: { x: -3, y: 0, z: 0 } },
    { id: "b", position: { x: 3, y: 0, z: 0 } },
    { id: "c", position: { x: 0, y: 3, z: 0 } },
    { id: "d", position: { x: 0, y: -3, z: 0 } },
];

/** `d` has one edge and every other node two or more, so a degree filter of 2 hides only `d`. */
const EDGES = [
    { src: "a", dst: "b" },
    { src: "a", dst: "c" },
    { src: "a", dst: "d" },
    { src: "b", dst: "c" },
];

const IDS = NODES.map((node) => node.id);

/**
 * Let the element's own render loop draw a few frames.
 */
async function frames(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
}

describe("nodeScreenPosition", () => {
    let container: HTMLDivElement;
    let element: Graphty;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        element = document.createElement("graphty-element");
        container.appendChild(element);
        await frames();

        await element.graph.addNodes(NODES);
        await element.graph.addEdges(EDGES);
        await element.graph.setLayout("fixed", { dim: 3 });
        await element.graph.waitForSettled();
        element.zoomToFit();
        await frames();
    });

    afterEach(() => {
        container.remove();
    });

    /**
     * Click the canvas at a point, the way a mouse does.
     * @param x - Pixels from the element's left edge.
     * @param y - Pixels from the element's top edge.
     * @returns The id of the node selected afterwards, or null.
     */
    function clickAt(x: number, y: number): string | number | null {
        const { canvas } = element.graph;
        const box = canvas.getBoundingClientRect();
        const init = { clientX: box.left + x, clientY: box.top + y, bubbles: true, pointerId: 1, pointerType: "mouse" };
        canvas.dispatchEvent(new PointerEvent("pointerdown", { ...init, button: 0, buttons: 1 }));
        canvas.dispatchEvent(new PointerEvent("pointerup", { ...init, button: 0, buttons: 0 }));
        return element.getSelectedNode()?.id ?? null;
    }

    /**
     * Put the element in a view mode and frame the graph again.
     * @param mode - The view mode.
     */
    async function view(mode: "2d" | "3d"): Promise<void> {
        await element.setViewMode(mode);
        await element.graph.waitForSettled();
        element.zoomToFit();
        await frames();
    }

    it("returns undefined for an id the graph does not hold", () => {
        assert.isUndefined(element.nodeScreenPosition("nobody"));
    });

    for (const mode of ["3d", "2d"] as const) {
        it(`${mode}: a click at the reported centre, or inside the reported radius, selects the node`, async () => {
            await view(mode);
            const middle = element.worldToScreen({ x: 0, y: 0, z: 0 });

            for (const id of IDS) {
                const at = element.nodeScreenPosition(id);
                assert.isDefined(at, id);
                assert.isTrue(at.visible, `${id} is on screen`);
                assert.isAbove(at.radius, 2, `${id} is drawn bigger than a dot`);
                assert.strictEqual(clickAt(at.x, at.y), id, `a click at ${id}'s centre selects it`);

                // Outward from the middle of the diamond, where no edge runs.
                const length = Math.hypot(at.x - middle.x, at.y - middle.y);
                const dx = (at.x - middle.x) / length;
                const dy = (at.y - middle.y) / length;
                clickAt(0, 0); // deselect: empty space
                assert.strictEqual(
                    clickAt(at.x + dx * at.radius * 0.6, at.y + dy * at.radius * 0.6),
                    id,
                    `a click inside ${id}'s radius selects it`,
                );
                assert.isNull(
                    clickAt(at.x + dx * at.radius * 1.6, at.y + dy * at.radius * 1.6),
                    `a click well outside ${id}'s radius misses it`,
                );
            }
        });

        it(`${mode}: a node a filter hides is not visible`, async () => {
            await view(mode);
            await element.session.visibility.set({ kind: "degree", min: 2 });
            await frames();

            assert.isFalse(element.nodeScreenPosition("d")?.visible, "the filtered node");
            assert.isTrue(element.nodeScreenPosition("a")?.visible, "a node the filter keeps");
        });
    }

    it("2d: a node panned out of the element is not visible", async () => {
        await view("2d");
        await element.setCameraState({ pan: { x: 100, y: 0 } });
        await frames();

        for (const id of IDS) {
            const at = element.nodeScreenPosition(id);
            assert.isDefined(at, id);
            assert.isBelow(at.x, 0, `${id} is left of the element`);
            assert.isFalse(at.visible, id);
        }
    });

    it("3d: a node to the side of the view is not visible", async () => {
        await view("3d");
        await element.setCameraState({ position: { x: 50, y: 0, z: -10 }, target: { x: 50, y: 0, z: 0 } });
        await frames();

        for (const id of IDS) {
            const at = element.nodeScreenPosition(id);
            assert.isDefined(at, id);
            assert.isBelow(at.x, 0, `${id} is left of the element`);
            assert.isFalse(at.visible, id);
            assert.isAbove(at.radius, 0, `${id} is in front of the camera and has a size`);
        }
    });

    it("3d: a node behind the camera is not visible, even where its mirror image would land on screen", async () => {
        await view("3d");
        // Looking away from the graph: every node is behind the viewer.
        await element.setCameraState({ position: { x: 0, y: 0, z: -10 }, target: { x: 0, y: 0, z: -20 } });
        await frames();

        let mirroredOnScreen = 0;
        for (const id of IDS) {
            const at = element.nodeScreenPosition(id);
            assert.isDefined(at, id);
            assert.isFalse(at.visible, id);
            assert.strictEqual(at.radius, 0, id);
            if (at.x >= 0 && at.x <= 640 && at.y >= 0 && at.y <= 480) {
                mirroredOnScreen++;
            }
        }

        assert.isAbove(mirroredOnScreen, 0, "the projection alone would have called some of them on screen");
    });
});
