/**
 * @file A pen on both render paths: hovering over a node hovers it, as a mouse does, and a tap
 * selects it. Babylon.js 9 drops a pen's moves made with no button pressed (issue #10199), so a
 * hovering pen hovered nothing.
 *
 * Every input is made by the browser's own input pipeline (test/helpers/real-input.ts) and every
 * outcome is read through the element's public API, or counted.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { penHover, penTap, type Point } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

/** A spot with no node under it. */
const EMPTY: Point = { x: 30, y: HEIGHT - 30 };

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted 3D element on one render path, with two nodes at fixed places, drawn.
 * @param path - The path.
 * @returns The element.
 */
async function mounted(path: RenderPath): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -4, y: 0, z: 0 } },
        { id: "b", position: { x: 4, y: 0, z: 0 } },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Where a node is drawn.
 * @param element - The element.
 * @param id - The node.
 * @returns Its center in CSS pixels from the element's top-left corner.
 */
function at(element: Graphty, id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} is drawn`);
    return { x: position.x, y: position.y };
}

describe("a pen", () => {
    for (const path of ["objects", "batched"] as const) {
        describe(`on the ${path} path`, () => {
            it("hovers a node while hovering over it, once per change, and leaves it when moved off", async () => {
                const element = await mounted(path);
                const changes: string[] = [];
                element.session.on("selection:hover-changed", ({ before, after }) => {
                    changes.push(`${String(before)} -> ${String(after)}`);
                });

                await penHover(element, EMPTY);
                await penHover(element, at(element, "a"));
                await element.waitForStableFrame();
                assert.strictEqual(element.session.selection.hovered, "a", "the pen over a node hovers it");

                await penHover(element, EMPTY);
                await element.waitForStableFrame();
                assert.isNull(element.session.selection.hovered, "the pen off the node leaves it");
                // Each move heard once: two would mean Babylon delivers a hovering pen again by itself.
                assert.deepStrictEqual(changes, ["null -> a", "a -> null"]);
            });

            it("selects a node it taps", async () => {
                const element = await mounted(path);

                await penTap(element, at(element, "b"));
                await element.waitForStableFrame();

                assert.deepStrictEqual(element.session.selection.nodes, ["b"]);
            });
        });
    }
});
