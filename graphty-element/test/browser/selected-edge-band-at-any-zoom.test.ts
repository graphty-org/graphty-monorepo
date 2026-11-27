/**
 * @file A selected edge shows its band however thin its line is drawn (issue #10312).
 *
 * A line under a pixel wide is drawn one pixel wide, and the selection band was the same multiple
 * of the line's width with no floor: on a dense or zoomed-out graph both came out one pixel wide,
 * the band pushed behind its line, so selecting an edge changed no pixel at all. The band now has
 * the same multiple of the line's fewest pixels as its own, so it shows beside the line as a casing.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { type CanvasFrame, readCanvas } from "../helpers/whole-canvas";

afterEach(() => {
    document.body.replaceChildren();
});

/**
 * One horizontal edge, its line far thinner than a pixel, on a render path.
 * @param path - The render path.
 * @returns The element.
 */
async function hairline(path: "objects" | "batched"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = "webgl";
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.session.styles.add({
        name: "hairline",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.width": 0.001, "edge.arrowHead": "none" },
    } as never);
    await element.session.data.addNodes([
        { id: "a", position: { x: -3, y: 0, z: 0 } },
        { id: "b", position: { x: 3, y: 0, z: 0 } },
    ]);
    await element.session.data.addEdges([{ src: "a", dst: "b" }]);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * How many pixels of the canvas's middle column differ between two frames.
 * @param a - One frame.
 * @param b - The other.
 * @returns The count.
 */
function changedInMiddleColumn(a: CanvasFrame, b: CanvasFrame): number {
    const x = Math.floor(a.width / 2);
    let changed = 0;
    for (let y = 0; y < a.height; y++) {
        const i = (y * a.width + x) * 4;
        if ([0, 1, 2].some((c) => Math.abs(a.pixels[i + c] - b.pixels[i + c]) > 8)) {
            changed++;
        }
    }

    return changed;
}

describe("a selected edge's band at any zoom (#10312)", () => {
    for (const path of ["objects", "batched"] as const) {
        it(`${path}: selecting an edge drawn under a pixel wide changes pixels on both sides of its line`, async () => {
            const element = await hairline(path);
            const before = await readCanvas(element.graph);

            const [edge] = element.session.data.edges();
            await element.session.selection.apply({ edges: [edge.id] });
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
            const after = await readCanvas(element.graph);

            // The line is one pixel there; a band of 2 * edgeScale (2.5) times its pixel is five pixels, so
            // at least two pixels on each side of the line changed.
            assert.isAtLeast(changedInMiddleColumn(before, after), 4, "the band shows beside the line");
        });
    }
});
