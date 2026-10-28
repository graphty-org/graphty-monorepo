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

import { afterEach, assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderManager } from "../../src/managers/RenderManager";
import { drawnFrames } from "../helpers/drawn-frames";
import {
    click,
    doubleClick,
    drag,
    hover,
    nextFrame,
    pinch,
    type Point,
    rightClick,
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
 * Wait until the element has applied the input just given and the picture has come to rest.
 *
 * The element reads pointer input in its next update, so a drawn frame first; then the stable
 * frame, which also waits out a camera still coasting from it.
 * @param element - The element.
 */
async function applied(element: Graphty): Promise<void> {
    await drawnFrames(element.graph.getScene(), 1);
    await element.waitForStableFrame();
}

/**
 * The frame as drawn, in device pixels, bottom row first.
 * @param element - The element.
 * @returns RGBA bytes.
 */
async function readCanvas(element: Graphty): Promise<Uint8Array> {
    const { engine } = element.graph;
    element.graph.scene.render();
    return (await engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight())) as unknown as Uint8Array;
}

/**
 * How strongly the selection gold (#FFD700) shows around a point: the largest red-over-blue
 * excess in a square there. The canvas, the nodes and the edges are all near-gray.
 * @param element - The element.
 * @param pixels - The frame from {@link readCanvas}.
 * @param center - The point, CSS pixels from the element's top-left corner.
 * @param half - Half the square's side, CSS pixels.
 * @returns The excess, 0-255.
 */
function gold(element: Graphty, pixels: Uint8Array, center: Point, half: number): number {
    const { engine } = element.graph;
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const scale = width / WIDTH;
    let best = 0;
    for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
            const x = Math.round((center.x + dx) * scale);
            const y = height - 1 - Math.round((center.y + dy) * scale);
            if (x < 0 || y < 0 || x >= width || y >= height) {
                continue;
            }
            const o = (y * width + x) * 4;
            best = Math.max(best, pixels[o] - pixels[o + 2]);
        }
    }
    return best;
}

describe("the mouse", () => {
    it("a drag across empty canvas turns the 3D camera", async () => {
        const element = await mounted("3d");
        const before = camera(element);

        await drag(element, EMPTY, { x: EMPTY.x + 120, y: EMPTY.y - 40 });
        await applied(element);

        assert.notStrictEqual(camera(element), before, "the camera turned");
        assert.isNull(element.getSelectedNode(), "a drag on empty canvas selects nothing");
    });

    it("a drag across empty canvas pans the 2D view, and the drawing follows the pointer", async () => {
        const element = await mounted("2d");
        const start = at(element, "a");

        await drag(element, EMPTY, { x: EMPTY.x + 60, y: EMPTY.y - 30 });
        await applied(element);

        const end = at(element, "a");
        assert.closeTo(end.x - start.x, 60, 2, "the node moved right with the pointer");
        assert.closeTo(end.y - start.y, -30, 2, "the node moved up with the pointer");
    });

    for (const viewMode of ["2d", "3d"] as const) {
        it(`with zoomToPointer, the wheel in ${viewMode} keeps the node under the pointer under it`, async () => {
            const element = await mounted(viewMode);
            element.zoomToPointer = true;
            const start = at(element, "a");
            const gap = spread(element);

            for (let notch = 0; notch < 3; notch++) {
                await wheel(element, start, -100);
            }
            await applied(element);

            assert.isAbove(spread(element), gap * 1.2, "scrolling up zoomed in");
            const end = at(element, "a");
            assert.isBelow(Math.hypot(end.x - start.x, end.y - start.y), 3, "node a stayed under the pointer");
        });
    }

    it("without zoomToPointer, the wheel zooms toward the center and the node off center moves", async () => {
        const element = await mounted("2d");
        const start = at(element, "a");

        for (let notch = 0; notch < 3; notch++) {
            await wheel(element, start, -100);
        }
        await applied(element);

        // Drawn or not: it may slide off the canvas.
        const end = element.nodeScreenPosition("a");
        assert.isDefined(end);
        assert.isAbove(Math.hypot(end.x - start.x, end.y - start.y), 10, "node a slid away from the pointer");
    });

    it("the wheel zooms the 2D view", async () => {
        const element = await mounted("2d");
        const gap = spread(element);

        await wheel(element, { x: WIDTH / 2, y: HEIGHT / 2 }, -200);
        await applied(element);

        assert.isAbove(spread(element), gap, "scrolling up zoomed in");
    });

    for (const viewMode of ["2d", "3d"] as const) {
        it(`three wheel turns out in ${viewMode} zoom out as far as three turns in zoom in`, async () => {
            const element = await mounted(viewMode);
            element.zoomToPointer = true;
            const point = at(element, "a");
            // In 3D, nodes a and b are off the plane through the pivot (node c lifts the graph's
            // center), so their spread on screen is not in proportion to the zoom: read the
            // camera's distance instead.
            const zoom = (): number =>
                viewMode === "3d" ? 1 / (element.getCameraState().cameraDistance ?? Number.NaN) : spread(element);
            const turns = async (deltaY: number): Promise<number> => {
                for (let notch = 0; notch < 3; notch++) {
                    await wheel(element, point, deltaY);
                }
                await applied(element);
                return zoom();
            };

            const start = zoom();
            const zoomedIn = await turns(-100);
            const back = await turns(100);
            const zoomedOut = await turns(100);

            assert.isAbove(zoomedIn, start * 1.2, "three turns in zoomed in");
            assert.closeTo(back / start, 1, 0.01, "three turns out undid three turns in");
            assert.closeTo(start / zoomedOut, zoomedIn / start, 0.01, "out shrank the drawing as much as in grew it");
        });
    }

    describe.each(["2d", "3d"] as const)("in %s", (viewMode) => {
        it("a click on a node selects it and does not pin it", async () => {
            const element = await mounted(viewMode);

            await click(element, at(element, "b"));
            await applied(element);

            assert.strictEqual(element.getSelectedNode()?.id, "b", "the click selected the node under it");
            assert.isFalse(element.isPinned("b"), "a click is not a placement, so nothing is pinned");

            await click(element, EMPTY);
            await applied(element);
            assert.isNull(element.getSelectedNode(), "a click on empty canvas clears the selection");
        });

        it("Shift-click adds a node to the selection, a plain click replaces it", async () => {
            const element = await mounted(viewMode);

            await click(element, at(element, "a"));
            await click(element, at(element, "b"), { shift: true });
            await applied(element);
            assert.sameMembers([...element.session.selection.nodes], ["a", "b"], "Shift-click added b to a");

            await click(element, at(element, "c"));
            await applied(element);
            assert.sameMembers([...element.session.selection.nodes], ["c"], "a plain click replaced the selection");

            await click(element, at(element, "a"), { shift: true });
            await click(element, at(element, "c"));
            await applied(element);
            assert.sameMembers(
                [...element.session.selection.nodes],
                ["c"],
                "a plain click on a node already selected leaves only that node",
            );

            const from = at(element, "a");
            const to = { x: from.x + 50, y: from.y + 40 };
            await drag(element, from, to, 8, undefined, { shift: true });
            await applied(element);
            const now = at(element, "a");
            assert.closeTo(now.x, to.x, 3, "a drag with Shift held still moves the node");
            assert.closeTo(now.y, to.y, 3);
        });

        it("a click on empty canvas is published, with or without a selection", async () => {
            const element = await mounted(viewMode);
            let heard = 0;
            let where = { x: 0, y: 0, secondary: false };
            const stop = element.session.on("canvas:empty-click", (at) => {
                heard++;
                where = at;
            });
            cleanups.push(stop);

            await click(element, EMPTY);
            await applied(element);
            assert.strictEqual(heard, 1, "a click with nothing selected is heard");
            assert.closeTo(where.x, EMPTY.x, 1, "and says where it landed");
            assert.closeTo(where.y, EMPTY.y, 1);

            await click(element, at(element, "b"));
            await applied(element);
            assert.strictEqual(heard, 1, "a click on a node is not an empty click");

            await click(element, EMPTY);
            await applied(element);
            assert.strictEqual(heard, 2, "a click that clears a selection is heard too");
            assert.isFalse(where.secondary, "a left click is not a secondary one");

            await rightClick(element, EMPTY);
            await applied(element);
            assert.strictEqual(heard, 3, "a right-click on empty canvas is heard");
            assert.isTrue(where.secondary, "and says it was a secondary click");
        });

        it("a click on a node is published, also on the node already selected", async () => {
            const element = await mounted(viewMode);
            const heard: unknown[] = [];
            cleanups.push(
                element.session.on("canvas:element-click", (target) => {
                    heard.push(target);
                }),
            );

            await click(element, at(element, "b"));
            await applied(element);
            await click(element, at(element, "b"));
            await applied(element);
            assert.deepStrictEqual(heard, [{ node: "b" }, { node: "b" }], "both clicks on b are heard");
            assert.sameMembers([...element.session.selection.nodes], ["b"]);

            await click(element, EMPTY);
            await applied(element);
            assert.strictEqual(heard.length, 2, "a click on empty canvas is not an element click");
        });

        it("a right-click 3 pixels off a tie selects the tie", async () => {
            const element = await mounted(viewMode);
            const a = at(element, "a");
            const b = at(element, "b");

            // The tie a-b runs level between the two nodes; the pointer is 3 pixels below its middle.
            await rightClick(element, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 3 });
            await applied(element);

            assert.lengthOf(element.session.selection.edges, 1, "the tie is selected");
            assert.isEmpty(element.session.selection.nodes, "no node is selected");
        });

        it("dragging a node moves it to the pointer and pins it there", async () => {
            const element = await mounted(viewMode);
            const from = at(element, "c");
            const to = { x: from.x + 50, y: from.y + 40 };

            await drag(element, from, to);
            await applied(element);

            const now = at(element, "c");
            assert.closeTo(now.x, to.x, 3, "the node followed the pointer across");
            assert.closeTo(now.y, to.y, 3, "the node followed the pointer down");
            assert.isTrue(element.isPinned("c"), "a node the pointer placed is pinned");
        });

        it("a double-click on a node asks the layout behaviour for its neighbourhood", async () => {
            const element = await mounted(viewMode);
            const asked: unknown[] = [];
            element.graph.setLayoutBehavior({
                fetchEdges: (node: { id: unknown }) => {
                    asked.push(node.id);
                    return new Set([{ source: "b", target: "x" }]);
                },
                fetchNodes: () => [{ id: "x" }],
            });

            const point = at(element, "b");
            // One doubleClick, not two awaited clicks: the scene counts two presses as a double-click
            // only within its 300 ms delay, and two round trips can take longer than that.
            await doubleClick(element, point);
            await vi.waitFor(() => {
                assert.isDefined(element.getNode("x"), "the fetched neighbour was added");
            });

            assert.deepStrictEqual(asked, ["b"], "the node under the pointer was expanded, once");
        });

        it("a wheel turn on two axes reaches input:wheel once", async () => {
            const element = await mounted(viewMode);
            let wheels = 0;
            element.addEventListener("input:wheel", () => {
                wheels++;
            });

            // A trackpad turn: Babylon raises one POINTERWHEEL per changed axis (issue #2937)
            await wheel(element, EMPTY, 100, 10);
            await applied(element);

            assert.strictEqual(wheels, 1, "one wheel turn is one input:wheel");
        });

        it("a selected node's halo follows it while it is dragged, before the button is released", async () => {
            const element = await mounted(viewMode);
            const from = at(element, "b");
            await click(element, from);
            await applied(element);
            assert.strictEqual(element.getSelectedNode()?.id, "b");

            // Straight up, away from the edge a-b, so the old spot is bare canvas once b leaves.
            const to = { x: from.x, y: from.y - 80 };
            let atOld = Number.NaN;
            let atNew = Number.NaN;
            await drag(element, from, to, 8, async () => {
                await drawnFrames(element.graph.getScene(), 2);
                const radius = element.nodeScreenPosition("b")?.radius ?? 0;
                const pixels = await readCanvas(element);
                atOld = gold(element, pixels, from, 2);
                // The ring lies past the node's edge, so look over a square just wider than it.
                atNew = gold(element, pixels, at(element, "b"), radius * 1.6);
            });

            assert.isAbove(atNew, 40, "the halo rings the node where the pointer holds it");
            assert.isBelow(atOld, 20, "no halo is left behind where the drag began");
        });

        it("pointing at a node reports the hover", async () => {
            const element = await mounted(viewMode);
            const hovered: unknown[] = [];
            element.addEventListener("graphty-node-hover", (event) => {
                hovered.push((event as CustomEvent<{ nodeId: unknown }>).detail.nodeId);
            });

            await hover(element, EMPTY);
            await nextFrame();
            await hover(element, at(element, "a"));
            await nextFrame();

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

/**
 * Wait until a count of updates reaches a number.
 * @param count - The count.
 * @param target - The number to wait for.
 */
async function updatesReach(count: () => number, target: number): Promise<void> {
    while (count() < target) {
        await nextFrame();
    }
}

/**
 * Wait until the camera has stopped moving: two input updates in a row with the same camera state.
 * Animation frames are not that count: a skipped render tick runs no input update.
 * @param element - The element.
 * @param updates - The count of the camera input's updates.
 */
async function settled(element: Graphty, updates: () => number): Promise<void> {
    let last = camera(element);
    for (;;) {
        await updatesReach(updates, updates() + 1);
        const now = camera(element);
        if (now === last) {
            return;
        }

        last = now;
    }
}

/**
 * Hold a key for exactly `count` of the camera input's per-frame updates, then let the camera
 * coast to a stop.
 *
 * The frames are counted where the input runs, not as animation frames: the render loop skips a
 * tick while the GPU is still drawing the last frame, so 30 animation frames can bring 29 updates.
 * And the frames stop at the count: from the last one until the key-up arrives the render loop is
 * held, so however long the browser takes to deliver the key-up, the key moves the camera exactly
 * `count` times and never as far as a zoom limit. The key itself is real input; only the clock is
 * stopped.
 * @param element - The element.
 * @param key - The key, as userEvent names it.
 * @param name - The camera whose input reads the key: "orbit" (3D) or "2d".
 * @param count - How many frames to hold it for.
 * @param onHeldFrame - Called after each update the key is held for.
 */
async function hold(
    element: Graphty,
    key: string,
    name: "orbit" | "2d",
    count: number,
    onHeldFrame: () => void = () => undefined,
): Promise<void> {
    const { canvas } = element.graph;
    const input = (element.graph.camera as unknown as { inputs: Map<string, { update(): void }> }).inputs.get(name);
    assert.isDefined(input);
    const { renderManager } = element.graph as unknown as { renderManager: RenderManager };
    const update = input.update.bind(input);
    let held = false;
    let all = 0;
    let heldFrames = 0;
    let releaseFrames = (): void => undefined;
    input.update = (): void => {
        all++;
        update();
        if (!held) {
            return;
        }

        onHeldFrame();
        if (++heldFrames === count) {
            releaseFrames = renderManager.holdFrames();
        }
    };
    // The controller's own key listeners were added first, so these run after it saw each key
    const press = (): void => {
        held = true;
    };
    const release = (): void => {
        held = false;
        releaseFrames();
    };
    canvas.addEventListener("keydown", press);
    canvas.addEventListener("keyup", release);
    cleanups.push(() => {
        releaseFrames();
        input.update = update;
        canvas.removeEventListener("keydown", press);
        canvas.removeEventListener("keyup", release);
    });

    await userEvent.keyboard(`{${key}>}`);
    await updatesReach(() => heldFrames, count);
    await userEvent.keyboard(`{/${key}}`);
    await settled(element, () => all);
    assert.strictEqual(heldFrames, count, "the key was held for the frames counted");
}

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

    for (const key of ["w", "="]) {
        it(`each tap of "${key}" zooms the 3D view in`, async () => {
            const element = await mounted("3d");
            await click(element, EMPTY);
            const gap = spread(element);
            const input = (element.graph.camera as unknown as { inputs: Map<string, { busy: boolean }> }).inputs.get(
                "orbit",
            );
            assert.isDefined(input);
            // A tap zooms over the frames it owes; the stable frame does not wait for the reader's
            // own camera moves, so wait until the input says it is done.
            const tapped = async (): Promise<void> => {
                await userEvent.keyboard(key);
                while (input.busy) {
                    await nextFrame();
                }

                await applied(element);
            };

            // A tap: down and up before the next frame, which a key read once a frame never saw.
            await tapped();
            const once = spread(element);
            await tapped();

            assert.isAbove(once, gap * 1.05, "the first tap zoomed in");
            assert.isAbove(spread(element), once * 1.05, "and so did the second");
        });
    }

    it("a tap of = zooms the 2D view in", async () => {
        const element = await mounted("2d");
        await click(element, EMPTY);
        const gap = spread(element);

        await userEvent.keyboard("=");
        await applied(element);

        assert.isAbove(spread(element), gap, "the tap zoomed in");
    });

    it("holding an arrow key turns the 3D camera", async () => {
        const element = await mounted("3d");
        await click(element, EMPTY);
        const before = camera(element);

        await hold(element, "ArrowLeft", "orbit", 5);

        assert.notStrictEqual(camera(element), before, "the camera turned");
    });

    // A and D spin by a fixed angle every frame they are held. A held arrow must turn at the same
    // angular speed and hold it, not keep speeding up (issue #2292): over the press and the coast
    // after it, the angle turned is the A and D rate times the frames held.
    it.each([
        ["a", "z", 1],
        ["d", "z", -1],
        ["ArrowLeft", "y", -1],
        ["ArrowRight", "y", 1],
        ["ArrowUp", "x", -1],
        ["ArrowDown", "x", 1],
    ] as const)("holding %s turns the 3D camera at the A and D rate", async (key, axis, sign) => {
        const element = await mounted("3d");
        await element.setCameraState({ pivotRotation: { x: 0, y: 0, z: 0 } });
        await click(element, EMPTY);
        const before = element.getCameraState().pivotRotation?.[axis] ?? Number.NaN;

        const heldFrames = 30;
        await hold(element, key, "orbit", heldFrames);

        const after = element.getCameraState().pivotRotation?.[axis] ?? Number.NaN;
        const perFrame = (sign * (after - before)) / heldFrames;
        // 0.02 radians a frame is keyboardYawSpeed, A and D's rate
        assert.closeTo(perFrame, 0.02, 0.0004, `radians per frame held, about ${axis}`);
    });

    // Steady from the first frame held to the last: an arrow turned slowly at first and sped up
    // while the velocity it pushed built up, then coasted on after the key was let go.
    it("a held arrow key turns the 3D camera by the same angle every frame", async () => {
        const element = await mounted("3d");
        await element.setCameraState({ pivotRotation: { x: 0, y: 0, z: 0 } });
        await click(element, EMPTY);
        const yaw = (): number => element.getCameraState().pivotRotation?.y ?? Number.NaN;
        const angles = [yaw()];

        await hold(element, "ArrowRight", "orbit", 20, () => angles.push(yaw()));

        for (let i = 1; i < angles.length; i++) {
            assert.closeTo(angles[i] - angles[i - 1], 0.02, 1e-6, `radians turned in held frame ${String(i)}`);
        }

        assert.closeTo(yaw() - angles[0], 20 * 0.02, 1e-6, "nothing coasted on after the key was let go");
    });

    // The 2D view's + and - keys zoom by zoomFactorPerFrame (0.02 in log space) per frame held,
    // not by the many times that a velocity accumulated every frame reaches.
    it.each([
        ["=", 1],
        ["-", -1],
    ] as const)("holding %s zooms the 2D view by 0.02 (log) per frame held", async (key, sign) => {
        const element = await mounted("2d");
        await click(element, EMPTY);
        const before = element.getCameraState().zoom ?? Number.NaN;

        const heldFrames = 30;
        await hold(element, key, "2d", heldFrames);

        const after = element.getCameraState().zoom ?? Number.NaN;
        assert.closeTo((sign * Math.log(after / before)) / heldFrames, 0.02, 0.0004, "log zoom per frame held");
    });

    // W and S zoom like every other camera key moves: by the same fraction of the distance every
    // frame they are on, from the first frame to the last, so the zoom is as quick far out as close
    // in: 0.985 per frame, tenfold over the 157 frames A or D take to spin half a turn. They once
    // jumped a whole wheel notch (10%) on the press and then sat still for 8 frames before zooming
    // smoothly (issue #3315). userEvent holds a key with one keydown and no auto-repeats, as macOS
    // does for a held letter (press and hold shows the accent menu), so the zoom must come from the
    // frames, not repeats.
    describe.each([
        ["close in", 6],
        ["far out", 600],
    ])("holding W or S, %s", (_where, start) => {
        it.each([
            ["W", 0.985],
            ["S", 1 / 0.985],
        ])("%s zooms by a factor of %f every frame held, the first frame included", async (key, perFrame) => {
            const element = await mounted("3d");
            await element.setCameraState({ cameraDistance: start });
            await click(element, EMPTY);
            const distance = (): number => element.getCameraState().cameraDistance ?? Number.NaN;
            let repeats = 0;
            const countRepeats = (evt: KeyboardEvent): void => {
                repeats += evt.repeat ? 1 : 0;
            };
            element.graph.canvas.addEventListener("keydown", countRepeats);
            cleanups.push(() => {
                element.graph.canvas.removeEventListener("keydown", countRepeats);
            });

            const before = distance();
            assert.closeTo(before, start, 1e-6, "the camera starts at the distance set");

            const heldFrames = 40;
            const distances = [before];
            await hold(element, key.toLowerCase(), "orbit", heldFrames, () => distances.push(distance()));

            assert.strictEqual(repeats, 0, "the key was held with no auto-repeat");
            for (let frame = 1; frame <= heldFrames; frame++) {
                assert.closeTo(
                    distances[frame] / distances[frame - 1],
                    perFrame,
                    1e-9,
                    `zoomed in held frame ${String(frame)}: no jump on the press, no pause after it`,
                );
            }

            const after = distance();
            assert.closeTo(after / before, perFrame ** heldFrames, 1e-9, "a factor a frame, nothing more");

            // Let go, the camera stays where it is however many frames follow
            const input = (element.graph.camera as unknown as { inputs: Map<string, { update(): void }> }).inputs.get(
                "orbit",
            );
            for (let frame = 0; frame < 20; frame++) {
                input?.update();
            }
            assert.strictEqual(distance(), after, "the zoom stopped when the key was let go");
        });

        it.each([
            ["W", 0.985],
            ["S", 1 / 0.985],
        ])("a short press of %s zooms over a tap's 8 frames, as an arrow turns", async (key, perFrame) => {
            const element = await mounted("3d");
            await element.setCameraState({ cameraDistance: start });
            await click(element, EMPTY);
            const before = element.getCameraState().cameraDistance ?? Number.NaN;

            await hold(element, key.toLowerCase(), "orbit", 3);

            const after = element.getCameraState().cameraDistance ?? Number.NaN;
            assert.closeTo(after / before, perFrame ** 8, 1e-9, "8 frames of zoom");
        });
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
        await applied(element);

        assert.strictEqual(window.scrollY, 0, "the page did not scroll");
        const end = at(element, "a");
        assert.closeTo(end.x - start.x, 40, 3, "the drawing followed the finger across");
        assert.closeTo(end.y - start.y, -80, 3, "the drawing followed the finger up");
    });

    it("spreading two fingers zooms the 2D view in", async () => {
        const element = await mounted("2d");
        const gap = spread(element);

        await pinch(element, { x: WIDTH / 2, y: HEIGHT / 2 }, 60, 180);
        await applied(element);

        assert.isAbove(spread(element), gap * 1.5, "the drawing grew with the fingers");
    });

    it("spreading two fingers zooms the 3D view in", async () => {
        const element = await mounted("3d");
        const gap = spread(element);

        await pinch(element, { x: WIDTH / 2, y: HEIGHT / 2 }, 60, 180);
        await applied(element);

        assert.isAbove(spread(element), gap, "the drawing grew with the fingers");
    });
});

describe("the input:* events", () => {
    /** Every `input:*` event the element sends, with the type of each field `src/events.ts` declares. */
    const DECLARED: Record<string, Record<string, "number" | "string" | "boolean">> = {
        "input:pointer-down": { x: "number", y: "number" },
        "input:pointer-move": { x: "number", y: "number" },
        "input:pointer-up": { x: "number", y: "number" },
        "input:wheel": { deltaX: "number", deltaY: "number", deltaZ: "number", deltaMode: "number" },
        "input:key-down": {
            key: "string",
            code: "string",
            ctrlKey: "boolean",
            shiftKey: "boolean",
            altKey: "boolean",
            metaKey: "boolean",
        },
        "input:key-up": {
            key: "string",
            code: "string",
            ctrlKey: "boolean",
            shiftKey: "boolean",
            altKey: "boolean",
            metaKey: "boolean",
        },
        "input:touch-start": {},
        "input:touch-move": {},
        "input:touch-end": {},
        "input:undo": {},
        "input:redo": {},
        "input:select-all": {},
    };

    it("carry each field as the plain value their declared types promise (issue #2976)", async () => {
        const element = await mounted("2d");
        const seen = new Map<string, Record<string, unknown>[]>();
        for (const name of Object.keys(DECLARED)) {
            const listener = (event: Event): void => {
                const list = seen.get(name) ?? [];
                list.push((event as CustomEvent<Record<string, unknown>>).detail);
                seen.set(name, list);
            };
            element.addEventListener(name, listener);
            cleanups.push(() => {
                element.removeEventListener(name, listener);
            });
        }

        await hover(element, EMPTY);
        await click(element, EMPTY);
        await wheel(element, EMPTY, 100, 10);
        await userEvent.keyboard("q");
        await userEvent.keyboard("{Control>}z{/Control}");
        await userEvent.keyboard("{Control>}y{/Control}");
        await userEvent.keyboard("{Control>}a{/Control}");
        await touchDrag(element, EMPTY, { x: EMPTY.x + 20, y: EMPTY.y - 20 }, 2);
        await applied(element);

        for (const [name, fields] of Object.entries(DECLARED)) {
            const details = seen.get(name) ?? [];
            assert.isNotEmpty(details, `${name} was sent`);
            for (const detail of details) {
                for (const [field, type] of Object.entries(fields)) {
                    assert.strictEqual(typeof detail[field], type, `${name} ${field} is a ${type}`);
                }
            }
        }

        const wheels = seen.get("input:wheel") ?? [];
        assert.strictEqual(wheels[0]?.deltaY, 100, "input:wheel deltaY is the turn's");
        const keys = (seen.get("input:key-down") ?? []).map((detail) => detail.key);
        assert.include(keys, "q", "input:key-down key is the key pressed");
        for (const name of ["input:touch-start", "input:touch-move"]) {
            for (const detail of seen.get(name) ?? []) {
                for (const touch of detail.array as Record<string, unknown>[]) {
                    assert.strictEqual(typeof touch.x, "number", `${name} touch x is a number`);
                    assert.strictEqual(typeof touch.y, "number", `${name} touch y is a number`);
                }
            }
        }
        for (const detail of seen.get("input:touch-end") ?? []) {
            for (const touch of detail.array as Record<string, unknown>[]) {
                assert.strictEqual(typeof touch.value, "number", "input:touch-end holds each touch id");
            }
        }
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
                await applied(element);
                assert.strictEqual(element.getSelectedNode()?.id, "b", "the click selected the node drawn under it");

                const from = at(element, "c");
                const to = { x: from.x - 40, y: from.y + 30 };
                await drag(element, from, to);
                await applied(element);
                const now = at(element, "c");
                assert.closeTo(now.x, to.x, 3, "the dragged node is under the pointer");
                assert.closeTo(now.y, to.y, 3, "the dragged node is under the pointer");
            });
        },
    );
});

/**
 * The plain average of nodes' positions.
 * @param element - The element.
 * @param ids - The nodes.
 * @returns The mean position.
 */
function meanOf(element: Graphty, ids: readonly string[]): { x: number; y: number; z: number } {
    const sum = { x: 0, y: 0, z: 0 };
    for (const id of ids) {
        const position = element.getNode(id)?.getPosition();
        assert.isDefined(position, `node ${id} exists`);
        sum.x += position.x / ids.length;
        sum.y += position.y / ids.length;
        sum.z += position.z / ids.length;
    }

    return sum;
}

// Issues #2293 and #2294: with `camera.pivotOnSelection` on, the selection is what the camera turns
// about -- one node, or the mean of several.
describe("the selection as the camera's pivot", () => {
    it("is off by default: a click on a node leaves the camera where it is", async () => {
        const element = await mounted("3d");
        const before = element.getCameraState().target;

        await click(element, at(element, "c"));
        await applied(element);

        assert.strictEqual(element.getSelectedNode()?.id, "c");
        assert.deepStrictEqual(element.getCameraState().target, before, "the pivot did not move");
    });

    it("a clicked node becomes the 3D pivot, and orbiting keeps it at the same spot on screen", async () => {
        const element = await mounted("3d");
        element.layoutBehavior = { camera: { pivotOnSelection: true } };

        await click(element, at(element, "c"));
        // The picture is not final until the camera has arrived, so a stable frame is the arrival
        await applied(element);

        const { target } = element.getCameraState();
        const c = meanOf(element, ["c"]);
        assert.isDefined(target);
        assert.closeTo(target.x, c.x, 0.01, "the pivot is on the node");
        assert.closeTo(target.y, c.y, 0.01, "the pivot is on the node");
        assert.closeTo(target.z, c.z, 0.01, "the pivot is on the node");

        const before = at(element, "c");
        const unturned = camera(element);
        await drag(element, EMPTY, { x: EMPTY.x + 120, y: EMPTY.y - 40 });
        await applied(element);

        assert.notStrictEqual(camera(element), unturned, "the camera turned");
        const after = at(element, "c");
        assert.closeTo(after.x, before.x, 1, "the node stayed put across");
        assert.closeTo(after.y, before.y, 1, "the node stayed put down");
    });

    it("a stable frame after a re-frame waits for the glide back to the selection", async () => {
        const element = await mounted("3d");
        element.layoutBehavior = { camera: { pivotOnSelection: true } };
        await click(element, at(element, "c"));
        await applied(element);

        // The framing puts the pivot on the graph's middle; the selection then takes it back.
        element.zoomToFit();
        await element.waitForStableFrame();

        const { target } = element.getCameraState();
        const c = meanOf(element, ["c"]);
        assert.isDefined(target);
        assert.closeTo(target.x, c.x, 0.01, "the pivot is back on the node");
        assert.closeTo(target.y, c.y, 0.01, "the pivot is back on the node");
        assert.closeTo(target.z, c.z, 0.01, "the pivot is back on the node");
    });

    it("shift-clicking several nodes makes their mean position the 3D pivot", async () => {
        const element = await mounted("3d");
        element.layoutBehavior = { camera: { pivotOnSelection: true } };
        // Far enough out that every node stays on screen wherever the pivot goes
        await element.setCameraState({ cameraDistance: 40 });
        await applied(element);

        await click(element, at(element, "a"));
        await applied(element);
        assert.deepStrictEqual(element.session.selection.nodes.map(String), ["a"], "the click selected a");
        await click(element, at(element, "b"), { shift: true });
        await applied(element);
        assert.deepStrictEqual(element.session.selection.nodes.map(String), ["a", "b"], "the shift-click added b");
        await applied(element);
        await click(element, at(element, "c"), { shift: true });
        await applied(element);

        const selected = element.session.selection.nodes.map(String);
        assert.sameMembers(selected, ["a", "b", "c"], "shift-clicks added to the selection");
        const mean = meanOf(element, ["a", "b", "c"]);
        const { target } = element.getCameraState();
        assert.isDefined(target);
        assert.closeTo(target.x, mean.x, 0.01, "the pivot is the mean");
        assert.closeTo(target.y, mean.y, 0.01, "the pivot is the mean");
        assert.closeTo(target.z, mean.z, 0.01, "the pivot is the mean");

        // A shift-click on a selected node takes it out, and the pivot follows.
        await click(element, at(element, "c"), { shift: true });
        await applied(element);
        const pair = meanOf(element, ["a", "b"]);
        const moved = element.getCameraState().target;
        assert.isDefined(moved);
        assert.closeTo(moved.x, pair.x, 0.01, "the pivot is the mean of the two left");
        assert.closeTo(moved.y, pair.y, 0.01, "the pivot is the mean of the two left");
        assert.closeTo(moved.z, pair.z, 0.01, "the pivot is the mean of the two left");
    });

    it("a clicked node becomes the 2D view's center", async () => {
        const element = await mounted("2d");
        element.layoutBehavior = { camera: { pivotOnSelection: true } };

        await click(element, at(element, "a"));
        await applied(element);

        const { pan } = element.getCameraState();
        const a = meanOf(element, ["a"]);
        assert.isDefined(pan);
        assert.closeTo(pan.x, a.x, 0.01, "the view is centered on the node");
        assert.closeTo(pan.y, a.y, 0.01, "the view is centered on the node");
        const drawn = at(element, "a");
        assert.closeTo(drawn.x, WIDTH / 2, 1, "the node is drawn at the middle");
        assert.closeTo(drawn.y, HEIGHT / 2, 1, "the node is drawn at the middle");
    });
});
