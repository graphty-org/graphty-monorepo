/**
 * @file A grid graph framed on one node, and a real click on that node that counts the shaders it compiled: the
 * first selection after a load (issue #10124), shared by its test and its benchmark.
 */

import { assert } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { click, hover, type Point } from "./real-input";

/** A grid mounted and framed on the node a test clicks. */
export interface FramedGrid {
    element: Graphty;
    /** The node clicked. */
    id: string;
    /** Where it is on the element, with the pointer already resting there. */
    at: Point;
}

/**
 * Wait for everything an input started to be drawn.
 * @param element - The element.
 */
export async function drawn(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForSettled();
    for (let frame = 0; frame < 4; frame++) {
        await element.waitForStableFrame();
    }
}

/**
 * Mount a square grid of nodes, frame its middle node and rest the pointer on it.
 * @param count - How many nodes.
 * @param view - The view mode.
 * @param cleanups - Where the element's removal is queued.
 * @returns The element, the middle node and where it is.
 */
export async function framedGrid(count: number, view: "2d" | "3d", cleanups: (() => void)[]): Promise<FramedGrid> {
    (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
    const element = document.createElement("graphty-element");
    element.limits = { renderCeiling: count };
    element.style.display = "block";
    element.style.width = "800px";
    element.style.height = "600px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(view);
    await operationQueueOf(element.graph).waitForCompletion();
    const columns = Math.ceil(Math.sqrt(count));
    await element.session.data.addNodes(
        Array.from({ length: count }, (_, i) => ({
            id: `n${String(i)}`,
            position: { x: (i % columns) * 2, y: Math.floor(i / columns) * 2, z: 0 },
        })),
    );
    await element.graph.setLayout("fixed", { dim: view === "2d" ? 2 : 3 });
    const id = `n${String(Math.floor(count / 2))}`;
    // A whole 99,000-node grid puts nodes about a pixel apart: frame the clicked node.
    await element.zoomToNodes([id], { animate: false });
    await drawn(element);
    const at = element.nodeScreenPosition(id);
    assert.isDefined(at);
    // The pointer comes to rest on the node first, as a reader's does, so a click is only the click.
    await hover(element, at);
    await drawn(element);
    assert.equal(element.session.selection.hovered, id, "the pointer rests on the node");
    return { element, id, at };
}

/**
 * How many shaders the element's engine holds compiled.
 * @param element - The element.
 * @returns The count.
 */
function compiledShaders(element: Graphty): number {
    const engine = element.graph.getScene().getEngine() as unknown as { _compiledEffects: Record<string, unknown> };
    return Object.keys(engine._compiledEffects).length;
}

/**
 * Click the framed node, wait for the selection to be drawn, and clear it again.
 * @param grid - The framed grid.
 * @returns How long the click took to a finished frame, and the shaders it compiled.
 */
export async function selectByClick(grid: FramedGrid): Promise<{ ms: number; shaders: number }> {
    const { element, id, at } = grid;
    const before = compiledShaders(element);
    const start = performance.now();
    await click(element, at);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    const ms = Math.round(performance.now() - start);
    const shaders = compiledShaders(element) - before;
    assert.deepEqual(element.session.selection.nodes, [id], "the click selected the node");
    element.session.selection.clear();
    await drawn(element);
    return { ms, shaders };
}
