/**
 * @file The selection mark, as a reader sees it: a node and an edge selected with the mouse are
 * marked on screen, the mark stands at least 3:1 off the canvas (WCAG 1.4.11) on the light
 * default background and on a dark one, and deleting the Selected row takes the mark away.
 *
 * The contrast is computed from the rendered pixels, not from the configured colours, so a mark
 * drawn see-through, blended or tinted by light is measured as it is drawn.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { DEFAULT_SELECTION_STYLE } from "../../src/config/GraphStyle";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { click, type Point } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

/** Two nodes far apart, so the edge between them has a long bare middle to click and to read. */
const NODES = [
    { id: "a", position: { x: -4, y: 0, z: 0 } },
    { id: "b", position: { x: 4, y: 0, z: 0 } },
];

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

type Rgb = readonly [number, number, number];

/**
 * A colour's relative luminance (WCAG 2).
 * @param rgb - 0-255 channels.
 * @returns 0 (black) to 1 (white).
 */
function luminance(rgb: Rgb): number {
    const [r, g, b] = rgb.map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The WCAG contrast ratio of two colours.
 * @param left - One colour.
 * @param right - The other.
 * @returns 1 to 21.
 */
function contrast(left: Rgb, right: Rgb): number {
    const [hi, lo] = [luminance(left), luminance(right)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/**
 * A hex colour's channels.
 * @param hex - `#rrggbb`.
 * @returns 0-255 channels.
 */
function rgbOf(hex: string): Rgb {
    const n = Number.parseInt(hex.slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * The element on the page, with the starting rows on, two nodes and the edge between them, in 2D.
 * @param background - The canvas colour; the default background when absent.
 * @returns The element.
 */
async function mounted(background?: string): Promise<Graphty> {
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
    if (background !== undefined) {
        element.background = { backgroundType: "color", color: background };
    }
    await element.session.config.set({ startingRows: true });
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges([{ src: "a", dst: "b" }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Wait until the element has applied the input just given and the picture has come to rest.
 * @param element - The element.
 */
async function applied(element: Graphty): Promise<void> {
    await drawnFrames(element.graph.getScene(), 1);
    await element.waitForStableFrame();
}

/**
 * Where a node is drawn and how big.
 * @param element - The element.
 * @param id - The node.
 * @returns Its centre and radius in CSS pixels.
 */
function at(element: Graphty, id: string): Point & { radius: number } {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} is drawn`);
    return { x: position.x, y: position.y, radius: position.radius };
}

/** The pixels of one drawn frame, with the canvas size they were read at. */
interface Frame {
    readonly pixels: Uint8Array;
    readonly width: number;
    readonly height: number;
    readonly scale: number;
}

/**
 * The frame as drawn.
 * @param element - The element.
 * @returns The frame, bottom row first.
 */
async function read(element: Graphty): Promise<Frame> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 2);
    element.graph.scene.render();
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const pixels = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
    return { pixels, width, height, scale: width / WIDTH };
}

/**
 * The colour at a point.
 * @param frame - The frame.
 * @param point - CSS pixels from the element's top-left corner.
 * @returns The colour.
 */
function pixel(frame: Frame, point: Point): Rgb {
    const x = Math.round(point.x * frame.scale);
    const y = frame.height - 1 - Math.round(point.y * frame.scale);
    const o = (y * frame.width + x) * 4;
    return [frame.pixels[o], frame.pixels[o + 1], frame.pixels[o + 2]];
}

/**
 * The drawn pixels in a square that are the selection mark's colour, give or take antialiasing.
 * @param frame - The frame.
 * @param center - The square's centre, CSS pixels.
 * @param half - Half its side, CSS pixels.
 * @param mark - The mark's configured colour.
 * @returns The matching pixels.
 */
function markPixels(frame: Frame, center: Point, half: number, mark: Rgb): Rgb[] {
    const found: Rgb[] = [];
    for (let dy = -half; dy <= half; dy += 0.5) {
        for (let dx = -half; dx <= half; dx += 0.5) {
            const color = pixel(frame, { x: center.x + dx, y: center.y + dy });
            if (Math.hypot(color[0] - mark[0], color[1] - mark[1], color[2] - mark[2]) < 24) {
                found.push(color);
            }
        }
    }
    return found;
}

/**
 * The least contrast any marked pixel stands off the canvas.
 * @param marked - The mark's pixels.
 * @param canvas - The canvas colour as drawn.
 * @returns The ratio.
 */
function leastContrast(marked: readonly Rgb[], canvas: Rgb): number {
    return Math.min(...marked.map((color) => contrast(color, canvas)));
}

describe("the selection mark", () => {
    const halo = rgbOf(DEFAULT_SELECTION_STYLE.color);
    const band = rgbOf(DEFAULT_SELECTION_STYLE.edgeColor);

    for (const [canvasName, background] of [
        ["the light default canvas", undefined],
        ["the darker of the dark canvases the element offers", "#202020"],
    ] as const) {
        it(`marks a clicked node and a clicked edge at 3:1 or better on ${canvasName}`, async () => {
            const element = await mounted(background);
            const a = at(element, "a");
            const b = at(element, "b");
            const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const corner = { x: 20, y: 20 };

            const before = await read(element);
            const canvas = pixel(before, corner);
            assert.isEmpty(markPixels(before, b, b.radius * 1.6, halo), "no node is marked before a click");
            assert.isEmpty(markPixels(before, middle, 6, band), "no edge is marked before a click");

            await click(element, b);
            await applied(element);
            assert.sameMembers([...element.session.selection.nodes], ["b"], "the click selected node b");
            await click(element, middle, { shift: true });
            await applied(element);
            assert.lengthOf(element.session.selection.edges, 1, "Shift-click added the edge");

            const after = await read(element);
            const ring = markPixels(after, b, b.radius * 1.6, halo);
            const casing = markPixels(after, middle, 6, band);
            assert.isNotEmpty(ring, "the selected node is ringed");
            assert.isNotEmpty(casing, "the selected edge is cased");
            assert.isAtLeast(leastContrast(ring, canvas), 3, `the node's mark on ${String(canvas)}`);
            assert.isAtLeast(leastContrast(casing, canvas), 3, `the edge's mark on ${String(canvas)}`);
        });
    }

    it("is gone once the reader deletes the Selected row", async () => {
        const element = await mounted();
        const a = at(element, "a");
        const b = at(element, "b");
        const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const selected = element.session.styles.tree().find((row) => row.name === "Selected");
        assert.isDefined(selected, "the starting rows include Selected");
        await element.session.styles.deleteRow(selected.id);

        await click(element, b);
        await applied(element);
        await click(element, middle, { shift: true });
        await applied(element);
        assert.sameMembers([...element.session.selection.nodes], ["b"], "the node is still selected");
        assert.lengthOf(element.session.selection.edges, 1, "the edge is still selected");

        const frame = await read(element);
        assert.isEmpty(markPixels(frame, b, b.radius * 1.6, halo), "no ring on the selected node");
        assert.isEmpty(markPixels(frame, middle, 6, band), "no casing on the selected edge");
    });
});
