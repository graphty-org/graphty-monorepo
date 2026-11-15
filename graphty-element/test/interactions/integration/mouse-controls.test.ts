/**
 * @file The mouse in the 3D view: which way a drag across empty canvas turns the camera, in
 * proportion to how far it went, and the wheel zooming without scrolling the page. Real mouse
 * input (test/helpers/real-input.ts), the render loop running, the outcome read from
 * `element.getCameraState()`.
 *
 * Panning and zooming the 2D view with the mouse, and clicking and dragging nodes, are in
 * test/interactions/real-input.test.ts.
 */

import { assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { drag, wheel } from "../../helpers/real-input";
import { applied, EMPTY, HEIGHT, mounted, onCleanup, WIDTH } from "../helpers/mounted-element";

/**
 * The 3D camera's turn about one axis, as the element reports it.
 * @param element - The element.
 * @param axis - The axis.
 * @returns The angle, in radians.
 */
function turn(element: Graphty, axis: "x" | "y"): number {
    const rotation = element.getCameraState().pivotRotation;
    assert.isDefined(rotation, "the 3D camera reports its turn");
    return rotation[axis];
}

/**
 * Drag across empty canvas from {@link EMPTY} and wait for the camera to come to rest.
 * @param element - The element.
 * @param dx - How far right, in CSS pixels.
 * @param dy - How far down, in CSS pixels.
 */
async function dragEmpty(element: Graphty, dx: number, dy: number): Promise<void> {
    await drag(element, EMPTY, { x: EMPTY.x + dx, y: EMPTY.y + dy });
    await applied(element);
}

/**
 * A 3D element with its camera square to the graph, so a turn reads as one axis.
 * @returns The element.
 */
async function level(): Promise<Graphty> {
    const element = await mounted("3d");
    await element.setCameraState({ pivotRotation: { x: 0, y: 0, z: 0 } });
    await applied(element);
    return element;
}

describe("a drag across empty canvas in 3D", () => {
    it("to the right turns the camera about the vertical, and to the left turns it back", async () => {
        const element = await level();

        await dragEmpty(element, 100, 0);
        const right = turn(element, "y");
        await dragEmpty(element, -100, 0);

        assert.isAbove(Math.abs(right), 0.05, "the drag right turned the camera");
        assert.closeTo(turn(element, "y"), 0, Math.abs(right) / 10, "the drag left turned it back");
        assert.closeTo(turn(element, "x"), 0, Math.abs(right) / 10, "neither tilted it");
    });

    it("down tilts the camera, the other way from up", async () => {
        const element = await level();

        await dragEmpty(element, 0, -100);
        const up = turn(element, "x");
        await dragEmpty(element, 0, 100);

        assert.isAbove(Math.abs(up), 0.05, "the drag up tilted the camera");
        assert.closeTo(turn(element, "x"), 0, Math.abs(up) / 10, "the drag down tilted it back");
    });

    it("turns the camera twice as far for twice the distance", async () => {
        const short = await level();
        await dragEmpty(short, 60, 0);
        const long = await level();
        await dragEmpty(long, 120, 0);

        assert.closeTo(turn(long, "y") / turn(short, "y"), 2, 0.2, "the turn is in proportion to the drag");
    });
});

describe("the wheel in 3D", () => {
    it("zooms in and back out, and does not scroll the page", async () => {
        const element = await mounted("3d");
        const center = { x: WIDTH / 2, y: HEIGHT / 2 };
        const distance = (): number => element.getCameraState().cameraDistance ?? Number.NaN;
        // Whether each real wheel event reaching the page was cancelled, read once it is handled.
        const cancelled: boolean[] = [];
        const onWheel = (event: WheelEvent): void => {
            cancelled.push(event.defaultPrevented);
        };
        globalThis.addEventListener("wheel", onWheel);
        onCleanup(() => {
            globalThis.removeEventListener("wheel", onWheel);
        });
        const start = distance();

        await wheel(element, center, -100);
        await applied(element);
        const zoomedIn = distance();
        await wheel(element, center, 100);
        await applied(element);

        assert.lengthOf(cancelled, 2, "the page got both wheel turns");
        assert.deepEqual(cancelled, [true, true], "the element kept the wheel from scrolling the page");
        assert.isBelow(zoomedIn, start * 0.95, "wheel up moved the camera closer");
        assert.isAbove(zoomedIn, start * 0.5, "one notch did not jump the camera");
        assert.isAbove(distance(), zoomedIn, "wheel down moved the camera away");
    });
});
