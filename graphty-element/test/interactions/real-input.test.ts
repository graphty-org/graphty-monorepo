/**
 * @file The element under real input: the mouse, the wheel, the keyboard (Ctrl and Cmd), a
 * two-finger pinch and a high-DPI screen, every event made by the browser's own input pipeline
 * (test/helpers/real-input.ts), and every outcome read through the element's public API -- the
 * camera moved, a node selected and not pinned, a hover reported, a step undone.
 *
 * Nothing here calls `notifyObservers`, writes a controller's state or fires a synthetic DOM
 * event, so a removed listener, a lost `touch-action`, focus handling or a pixel-ratio mistake
 * fails here, where the older interaction tests (which reach their state through internals) pass.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import {
    click,
    drag,
    hover,
    nextFrame,
    pinch,
    type Point,
    touchDrag,
    wheel,
    withDevicePixelRatio,
} from "../helpers/real-input";

// Inside the test frame's 414-pixel-wide viewport.
const WIDTH = 400;
const HEIGHT = 300;

/**
 * Three nodes at fixed places, so each one's spot on screen is known before any input. Node c is
 * off the Z = 0 plane: a 2D view must put it on the plane (issue #1341).
 */
const NODES = [
    { id: "a", position: { x: -4, y: 0, z: 0 } },
    { id: "b", position: { x: 4, y: 0, z: 0 } },
    { id: "c", position: { x: 0, y: 3, z: 4 } },
];

/** A spot with no node under it. */
const EMPTY: Point = { x: 30, y: HEIGHT - 30 };

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element holding three nodes at fixed places, drawn.
 * @param viewMode - The view mode.
 * @returns The element.
 */
async function mounted(viewMode: "2d" | "3d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "a", dst: "c" },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Where a node is drawn, from the element's public API.
 * @param element - The element.
 * @param id - The node.
 * @returns Its centre in CSS pixels from the element's top-left corner.
 */
function at(element: Graphty, id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} is drawn`);
    assert.isTrue(position.visible, `node ${id} is on screen`);
    return { x: position.x, y: position.y };
}

/**
 * How far apart nodes a and b are drawn, on screen or not: how zoomed in the view is.
 * @param element - The element.
 * @returns The distance in CSS pixels.
 */
function spread(element: Graphty): number {
    const a = element.nodeScreenPosition("a");
    const b = element.nodeScreenPosition("b");
    assert.isDefined(a);
    assert.isDefined(b);
    return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * The camera as the element reports it, for comparing before and after.
 * @param element - The element.
 * @returns The camera state as a string.
 */
function camera(element: Graphty): string {
    return JSON.stringify(element.getCameraState());
}

/**
 * Let a few frames run, so input the element reads once a frame has landed.
 * @param frames - How many.
 */
async function frames(frames = 3): Promise<void> {
    for (let i = 0; i < frames; i++) {
        await nextFrame();
    }
}

describe("the mouse", () => {
    it("a drag across empty canvas turns the 3D camera", async () => {
        const element = await mounted("3d");
        const before = camera(element);

        await drag(element, EMPTY, { x: EMPTY.x + 120, y: EMPTY.y - 40 });
        await frames();

        assert.notStrictEqual(camera(element), before, "the camera turned");
        assert.isNull(element.getSelectedNode(), "a drag on empty canvas selects nothing");
    });

    it("a drag across empty canvas pans the 2D view, and the drawing follows the pointer", async () => {
        const element = await mounted("2d");
        const start = at(element, "a");

        await drag(element, EMPTY, { x: EMPTY.x + 60, y: EMPTY.y - 30 });
        await frames();

        const end = at(element, "a");
        assert.closeTo(end.x - start.x, 60, 2, "the node moved right with the pointer");
        assert.closeTo(end.y - start.y, -30, 2, "the node moved up with the pointer");
    });

    it("the wheel zooms the 2D view", async () => {
        const element = await mounted("2d");
        const gap = spread(element);

        await wheel(element, { x: WIDTH / 2, y: HEIGHT / 2 }, -200);
        await frames();

        assert.isAbove(spread(element), gap, "scrolling up zoomed in");
    });

    describe.each(["2d", "3d"] as const)("in %s", (viewMode) => {
        it("a click on a node selects it and does not pin it", async () => {
            const element = await mounted(viewMode);

            await click(element, at(element, "b"));
            await frames();

            assert.strictEqual(element.getSelectedNode()?.id, "b", "the click selected the node under it");
            assert.isFalse(element.isPinned("b"), "a click is not a placement, so nothing is pinned");

            await click(element, EMPTY);
            await frames();
            assert.isNull(element.getSelectedNode(), "a click on empty canvas clears the selection");
        });

        it("a click on empty canvas is published, with or without a selection", async () => {
            const element = await mounted(viewMode);
            let heard = 0;
            let where = { x: 0, y: 0 };
            const stop = element.session.on("canvas:empty-click", (at) => {
                heard++;
                where = at;
            });
            cleanups.push(stop);

            await click(element, EMPTY);
            await frames();
            assert.strictEqual(heard, 1, "a click with nothing selected is heard");
            assert.closeTo(where.x, EMPTY.x, 1, "and says where it landed");
            assert.closeTo(where.y, EMPTY.y, 1);

            await click(element, at(element, "b"));
            await frames();
            assert.strictEqual(heard, 1, "a click on a node is not an empty click");

            await click(element, EMPTY);
            await frames();
            assert.strictEqual(heard, 2, "a click that clears a selection is heard too");
        });

        it("dragging a node moves it to the pointer and pins it there", async () => {
            const element = await mounted(viewMode);
            const from = at(element, "c");
            const to = { x: from.x + 50, y: from.y + 40 };

            await drag(element, from, to);
            await frames();

            const now = at(element, "c");
            assert.closeTo(now.x, to.x, 3, "the node followed the pointer across");
            assert.closeTo(now.y, to.y, 3, "the node followed the pointer down");
            assert.isTrue(element.isPinned("c"), "a node the pointer placed is pinned");
        });

        it("pointing at a node reports the hover", async () => {
            const element = await mounted(viewMode);
            const hovered: unknown[] = [];
            element.addEventListener("graphty-node-hover", (event) => {
                hovered.push((event as CustomEvent<{ nodeId: unknown }>).detail.nodeId);
            });

            await hover(element, EMPTY);
            await frames(1);
            await hover(element, at(element, "a"));
            await frames(1);

            assert.deepStrictEqual(hovered, ["a"], "one hover, for the node under the pointer");
        });
    });
});

describe("the 2D view", () => {
    it("a graph laid out in 3D lies flat once the view is 2D, so its edges end at their nodes", async () => {
        // The reader loads in 3D and switches to 2D: the orthographic camera hides a leftover Z,
        // but an edge to that node is drawn as long as the 3D distance and runs past it.
        const element = await mounted("2d");

        for (const { id } of NODES) {
            assert.closeTo(element.getNode(id)?.getPosition().z ?? Number.NaN, 0, 1e-6, `node ${id} is on the plane`);
        }
    });
});

describe("the keyboard", () => {
    it("does not take focus from the page when it loads", async () => {
        const input = document.createElement("input");
        document.body.appendChild(input);
        cleanups.push(() => {
            input.remove();
        });
        input.focus();

        await mounted("3d");

        assert.strictEqual(document.activeElement, input, "the page's field kept its focus");
    });

    it.each([
        ["Ctrl", "Control"],
        ["Cmd", "Meta"],
    ])("%s+Z undoes, %s+Shift+Z redoes, after a click focused the canvas", async (_name, modifier) => {
        const element = await mounted("3d");
        // A click is how a reader gives the canvas the keyboard; it must take focus itself.
        await click(element, EMPTY);
        assert.isTrue(element.graph.canvas.matches(":focus"), "the click focused the canvas");
        const { position } = element.session.history;

        await userEvent.keyboard(`{${modifier}>}z{/${modifier}}`);
        assert.strictEqual(element.session.history.position, position - 1, "one step undone");

        await userEvent.keyboard(`{${modifier}>}{Shift>}z{/Shift}{/${modifier}}`);
        assert.strictEqual(element.session.history.position, position, "and redone");
    });

    it("holding an arrow key turns the 3D camera", async () => {
        const element = await mounted("3d");
        await click(element, EMPTY);
        const before = camera(element);

        await userEvent.keyboard("{ArrowLeft>}");
        await frames(5);
        await userEvent.keyboard("{/ArrowLeft}");
        await frames();

        assert.notStrictEqual(camera(element), before, "the camera turned");
    });
});

describe("touch", () => {
    it("a finger dragged across the 2D view pans the drawing and does not scroll the page", async () => {
        // A page taller than the frame, so a finger the canvas did not claim (touch-action) would
        // scroll the page instead of reaching the element.
        const element = await mounted("2d");
        const spacer = document.createElement("div");
        spacer.style.height = "3000px";
        document.body.appendChild(spacer);
        cleanups.push(() => {
            spacer.remove();
            window.scrollTo(0, 0);
        });
        const start = at(element, "a");

        await touchDrag(element, EMPTY, { x: EMPTY.x + 40, y: EMPTY.y - 80 });
        await frames();

        assert.strictEqual(window.scrollY, 0, "the page did not scroll");
        const end = at(element, "a");
        assert.closeTo(end.x - start.x, 40, 3, "the drawing followed the finger across");
        assert.closeTo(end.y - start.y, -80, 3, "the drawing followed the finger up");
    });

    it("spreading two fingers zooms the 2D view in", async () => {
        const element = await mounted("2d");
        const gap = spread(element);

        await pinch(element, { x: WIDTH / 2, y: HEIGHT / 2 }, 60, 180);
        await frames();

        assert.isAbove(spread(element), gap * 1.5, "the drawing grew with the fingers");
    });

    it("spreading two fingers zooms the 3D view in", async () => {
        const element = await mounted("3d");
        const gap = spread(element);

        await pinch(element, { x: WIDTH / 2, y: HEIGHT / 2 }, 60, 180);
        await frames();

        assert.isAbove(spread(element), gap, "the drawing grew with the fingers");
    });
});

describe("a high-DPI screen", () => {
    it.each(["2d", "3d"] as const)(
        "at a device pixel ratio of 2, in %s, a click lands on the node drawn under it and a drag follows the pointer",
        async (viewMode) => {
            await withDevicePixelRatio(2, async () => {
                assert.strictEqual(window.devicePixelRatio, 2);
                const element = await mounted(viewMode);

                await click(element, at(element, "b"));
                await frames();
                assert.strictEqual(element.getSelectedNode()?.id, "b", "the click selected the node drawn under it");

                const from = at(element, "c");
                const to = { x: from.x - 40, y: from.y + 30 };
                await drag(element, from, to);
                await frames();
                const now = at(element, "c");
                assert.closeTo(now.x, to.x, 3, "the dragged node is under the pointer");
                assert.closeTo(now.y, to.y, 3, "the dragged node is under the pointer");
            });
        },
    );
});
