/**
 * @file A solid node's overlay is drawn in front of the whole solid from wherever the camera looks in 3D, so the
 * overlay's color wins at the node's center (issue #10405: a box's overlay sat inside the box seen off its front, and
 * the red fill covered it).
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const SIZE = 320;
const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * One node of a shape, painted red with an opaque blue overlay, in a 3D element of its own.
 * @param shape - The node shape.
 * @returns The element.
 */
async function mounted(shape: string): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(SIZE)}px`;
    element.style.height = `${String(SIZE)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode("3d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.styles.add({
        name: "probe",
        target: "node",
        selector: { match: "ids", nodes: ["n"] },
        set: {
            "node.shape": shape,
            "node.size": 4,
            "node.color": "#ff0000",
            "node.overlayOpacity": 1,
            "node.overlayColor": "#0000ff",
            "node.overlayPadding": 0.3,
        },
    });
    await element.session.data.addNodes([{ id: "n", position: { x: 0, y: 0, z: 0 } }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();

    return element;
}

/**
 * The color drawn at the middle of the canvas, where the node is.
 * @param element - The element.
 * @returns The red, green and blue there.
 */
async function centerColor(element: Graphty): Promise<[number, number, number]> {
    await element.waitForStableFrame();
    element.graph.scene.render();
    const { engine } = element.graph;
    const x = Math.floor(engine.getRenderWidth() / 2);
    const y = Math.floor(engine.getRenderHeight() / 2);
    const data = (await engine.readPixels(x, y, 1, 1)) as unknown as Uint8Array;

    return [data[0], data[1], data[2]];
}

describe("a solid's overlay is drawn in front of it in 3D (#10405)", () => {
    for (const shape of ["box", "cylinder", "capsule", "sphere"]) {
        it(`draws a ${shape}'s overlay over its center from three angles`, async () => {
            const element = await mounted(shape);
            const views = [undefined, { x: 7, y: 5, z: -9 }, { x: -6, y: -8, z: 6 }];
            for (const position of views) {
                if (position !== undefined) {
                    await element.setCameraTarget({ x: 0, y: 0, z: 0 });
                    await element.setCameraPosition(position);
                }
                const [r, g, b] = await centerColor(element);
                const at = JSON.stringify(position ?? "default");

                // the overlay is pure blue: blue leads red by at least 128 of 255 where it wins
                assert.isAbove(b - r, 128, `${shape} from ${at}: center is rgb(${String([r, g, b])}), not the overlay`);
            }
        });
    }
});
