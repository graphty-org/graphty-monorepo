/**
 * @file A selected edge shows its band however thin its line is drawn and however dense the
 * drawing around it (issue #10312), and its own line still shows down the band's middle.
 *
 * Two defects hid the band on a dense graph of 10,000 nodes. A line under a pixel wide is drawn one
 * pixel wide, and the band was the same multiple of the line's width with no floor, so far away
 * both were one pixel. And the band was pushed back in depth so its own line would win their
 * shared middle, which made every other line at its depth win too: in a flat drawing that is every
 * line, and a dense one covers the whole canvas. The band now has a floor of the same multiple of
 * the line's fewest pixels, and stands in front with its middle left open for its own line.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { type CanvasFrame, readCanvas } from "../helpers/whole-canvas";

afterEach(() => {
    document.body.replaceChildren();
});

/** The selected edge's own color, told apart from the band's blue. */
const LINE = "#ff0000";

/**
 * A red edge across the canvas, crossed at the middle by a wide gray one in the same plane, on a render path.
 * @param path - The render path.
 * @param width - The red edge's width.
 * @returns The element and the red edge's id.
 */
async function crossing(path: "objects" | "batched", width: number): Promise<{ element: Graphty; id: string }> {
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
        name: "marked",
        target: "edge",
        selector: { match: "has", path: "data.marked" },
        set: { "edge.width": width, "edge.color": LINE, "edge.arrowHead": "none" },
    } as never);
    await element.session.styles.add({
        name: "wide",
        target: "edge",
        selector: { match: "has", path: "data.wide" },
        set: { "edge.width": 6, "edge.color": "#888888", "edge.arrowHead": "none" },
    } as never);
    await element.session.data.addNodes([
        { id: "a", position: { x: -3, y: 0, z: 0 } },
        { id: "b", position: { x: 3, y: 0, z: 0 } },
        { id: "c", position: { x: 0, y: -3, z: 0 } },
        { id: "d", position: { x: 0, y: 3, z: 0 } },
    ]);
    await element.session.data.addEdges([
        { src: "c", dst: "d", wide: true },
        { src: "a", dst: "b", marked: true },
    ]);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    const edge = element.session.data.edges().find((e) => e.source === "a");
    assert.isDefined(edge);
    return { element, id: edge?.id ?? "" };
}

/**
 * Select an edge and wait for the frame that shows it.
 * @param element - The element.
 * @param id - The edge.
 */
async function select(element: Graphty, id: string): Promise<void> {
    await element.session.selection.apply({ edges: [id] });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * One column of a frame, as r, g, b per row.
 * @param frame - The frame.
 * @param x - The column.
 * @returns The pixels.
 */
function column(frame: CanvasFrame, x: number): number[][] {
    return Array.from({ length: frame.height }, (_, y) => {
        const i = (y * frame.width + x) * 4;
        return [frame.pixels[i], frame.pixels[i + 1], frame.pixels[i + 2]];
    });
}

describe("a selected edge's band at any zoom and density (#10312)", () => {
    for (const path of ["objects", "batched"] as const) {
        it(`${path}: an edge drawn under a pixel wide shows its band where a wide line crosses it`, async () => {
            const { element, id } = await crossing(path, 0.001);
            const unselected = await readCanvas(element.graph);
            // the middle column runs inside the wide gray line, at the red edge's depth
            const x = Math.floor(unselected.width / 2);
            const before = column(unselected, x);
            await select(element, id);
            const after = column(await readCanvas(element.graph), x);

            const changed = before.filter((p, y) => p.some((c, k) => Math.abs(c - after[y][k]) > 8)).length;
            // a band of 2 * edgeScale (2.5) times the line's one pixel: at least two pixels each side of it
            assert.isAtLeast(changed, 4, "the band shows over the line that crosses it");
        });

        it(`${path}: a wide selected line keeps its own color down the band's middle`, async () => {
            const { element, id } = await crossing(path, 1);
            await select(element, id);
            const frame = await readCanvas(element.graph);
            // three eighths of the way across, clear of the node and of the wide gray line
            const pixels = column(frame, Math.floor((frame.width * 3) / 8));
            // the band's #0077BB: green and blue both well over red
            const isBand = (p: number[]): boolean => p[1] > p[0] + 60 && p[2] > p[0] + 60;
            const isLine = (p: number[]): boolean => p[0] > p[2] + 60;
            const first = pixels.findIndex(isBand);
            const last = pixels.length - 1 - [...pixels].reverse().findIndex(isBand);
            assert.isAbove(first, -1, "the band is drawn");
            const inside = pixels.slice(first, last + 1);
            assert.isAbove(inside.filter(isLine).length, 0, "the red line shows between the band's sides");
            assert.isAbove(inside.filter(isBand).length, 1, "the band shows on both sides");
        });
    }
});
