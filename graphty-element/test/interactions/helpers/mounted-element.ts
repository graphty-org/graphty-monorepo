/**
 * @file A `<graphty-element>` holding three nodes at fixed places, for the interaction tests that
 * drive real input (test/helpers/real-input.ts) and read every outcome through the element's public
 * API: where a node is drawn, the camera state, whether a node is pinned.
 */

import "../../../src/graphty-element";

import { afterEach, assert } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";
import { drawnFrames } from "../../helpers/drawn-frames";
import type { Point } from "../../helpers/real-input";

// Inside the test frame's 414-pixel-wide viewport, so the real pointer reaches every point.
export const WIDTH = 400;
export const HEIGHT = 300;

/** Three nodes at fixed places. Node c is off the Z = 0 plane. */
export const NODES = [
    { id: "a", position: { x: -4, y: 0, z: 0 } },
    { id: "b", position: { x: 4, y: 0, z: 0 } },
    { id: "c", position: { x: 0, y: 3, z: 4 } },
];

/** A spot with no node under it. */
export const EMPTY: Point = { x: 30, y: HEIGHT - 30 };

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Run something after the test, with the element removals.
 * @param cleanup - What to run.
 */
export function onCleanup(cleanup: () => void): void {
    cleanups.push(cleanup);
}

/**
 * A mounted element holding nodes a, b and c, drawn and at rest. Removed after the test.
 * @param viewMode - The view mode.
 * @param layout - The layout; "fixed" keeps the nodes where {@link NODES} puts them.
 * @returns The element.
 */
export async function mounted(viewMode: "2d" | "3d", layout = "fixed"): Promise<Graphty> {
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
    await element.graph.setLayout(layout, { dim: 3 });
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
export function at(element: Graphty, id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} is drawn`);
    assert.isTrue(position.visible, `node ${id} is on screen`);
    return { x: position.x, y: position.y };
}

/**
 * How far apart nodes a and b are drawn, on screen or not: how zoomed in a 2D view is.
 * @param element - The element.
 * @returns The distance in CSS pixels.
 */
export function spread(element: Graphty): number {
    const a = element.nodeScreenPosition("a");
    const b = element.nodeScreenPosition("b");
    assert.isDefined(a);
    assert.isDefined(b);
    return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * The camera as the element reports it, as a string for comparing before and after. JSON writes
 * -0 as 0, so the inertia step turning a resting 0 into -0 is no change.
 * @param element - The element.
 * @returns The camera state.
 */
export function camera(element: Graphty): string {
    return JSON.stringify(element.getCameraState());
}

/**
 * Wait until the element has applied the input just given and the picture has come to rest: a
 * drawn frame (the element reads input in its next update), then the stable frame, which also
 * waits out a camera still coasting from it.
 * @param element - The element.
 */
export async function applied(element: Graphty): Promise<void> {
    await drawnFrames(element.graph.getScene(), 1);
    await element.waitForStableFrame();
}
