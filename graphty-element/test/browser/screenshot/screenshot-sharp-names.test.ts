import { CreateScreenshotAsync } from "@babylonjs/core";
import { afterEach, assert, beforeEach, test, vi } from "vitest";

import { Graph, operationQueueOf } from "../../../src/Graph";

/**
 * A capture larger than the canvas is drawn again at that size, not the canvas stretched: a name
 * on a node keeps glyph edges as sharp, in output pixels, at 4x as at 1x, and a line keeps its
 * width relative to the picture.
 */

const WIDTH = 640;
const HEIGHT = 480;

let container: HTMLElement;
let graph: Graph;

// test/setup.ts stubs the capture with one pixel; this test needs the real drawing.
beforeEach(async () => {
    const actual = await vi.importActual<typeof import("@babylonjs/core")>("@babylonjs/core");
    vi.mocked(CreateScreenshotAsync).mockImplementation(actual.CreateScreenshotAsync);

    container = document.createElement("div");
    container.style.width = `${String(WIDTH)}px`;
    container.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(container);
    graph = new Graph(container);
    await graph.init();
    await graph.addNodes([{ id: "Medici" }, { id: "Strozzi" }]);
    await graph.addEdges([{ src: "Medici", dst: "Strozzi" }]);
    await graph.setLayout("circular", { scale: 0.12 });
    await graph.getSession().styles.add({
        name: "Names",
        target: "node",
        selector: { match: "everything" },
        set: { "node.labelStyle": { enabled: true } },
    });
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    for (let i = 0; i < 30; i++) {
        await new Promise<void>((resolve) => graph.scene.onAfterRenderObservable.addOnce(() => resolve()));
    }
});

afterEach(() => {
    graph.dispose();
    container.remove();
});

interface Image {
    width: number;
    height: number;
    data: Uint8ClampedArray;
}

/**
 * Decodes an image.
 * @param blob - The image.
 * @returns Its size and RGBA bytes.
 */
async function decode(blob: Blob): Promise<Image> {
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    assert.ok(ctx);
    ctx.drawImage(bitmap, 0, 0);
    return {
        width: bitmap.width,
        height: bitmap.height,
        data: ctx.getImageData(0, 0, bitmap.width, bitmap.height).data,
    };
}

/**
 * The median width, in output pixels, of a glyph's edge. Along each row, every step from the
 * paper down to a stroke that reaches at least half the darkest ink is measured: the number of
 * pixels it spends strictly between 10% and 90% of the way from the paper to that stroke.
 * @param image - The capture.
 * @returns The median rise, and how many edges it was taken over.
 */
function glyphEdge(image: Image): { rise: number; edges: number } {
    const { width, height, data } = image;
    const lum = (i: number): number => 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    // The words are drawn in gray tones; the nodes are indigo, the paper whitesmoke.
    const gray = (i: number): boolean =>
        Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) -
            Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) <
        24;
    const paper = lum(0);
    let ink = paper;
    for (let i = 0; i < width * height; i++) {
        if (gray(i)) {
            ink = Math.min(ink, lum(i));
        }
    }
    const rises: number[] = [];
    for (let y = 0; y < height; y++) {
        for (let x = 1; x < width; x++) {
            const at = y * width + x;
            // Start where a row leaves the paper.
            if (!(gray(at) && lum(at) < paper - 2 && lum(at - 1) >= paper - 2)) {
                continue;
            }
            // Walk down to the stroke's darkest point.
            let end = x;
            while (end + 1 < width && gray(y * width + end + 1) && lum(y * width + end + 1) <= lum(y * width + end)) {
                end++;
            }
            const floor = lum(y * width + end);
            if (paper - floor < 0.5 * (paper - ink)) {
                continue;
            }
            const t10 = paper - 0.1 * (paper - floor);
            const t90 = paper - 0.9 * (paper - floor);
            let between = 0;
            for (let k = x; k <= end; k++) {
                const l = lum(y * width + k);
                if (l < t10 && l > t90) {
                    between++;
                }
            }
            rises.push(between);
        }
    }
    rises.sort((a, b) => a - b);
    return { rise: rises[Math.floor(rises.length / 2)] ?? Infinity, edges: rises.length };
}

/**
 * How many pixels thick the edge is where it crosses the column halfway between the two nodes.
 * @param image - The capture.
 * @returns The count of drawn pixels in that column that are neither paper nor a node.
 */
function edgeThickness(image: Image): number {
    const { width, height, data } = image;
    const isNode = (i: number): boolean => data[i * 4 + 2] > data[i * 4] + 60;
    const xs: number[] = [];
    for (let i = 0; i < width * height; i++) {
        if (isNode(i)) {
            xs.push(i % width);
        }
    }
    xs.sort((a, b) => a - b);
    const x = Math.round((xs[0] + xs[xs.length - 1]) / 2);
    let count = 0;
    for (let y = 0; y < height; y++) {
        const i = y * width + x;
        if (!isNode(i) && Math.abs(data[i * 4] - data[0]) > 8) {
            count++;
        }
    }
    return count;
}

test("a 4x capture is drawn at 4x: four times the canvas per side, names as sharp as at 1x, lines as wide", async () => {
    const opts = { timing: { waitForSettle: false } };
    const one = await graph.captureScreenshot({ ...opts, multiplier: 1 });
    const four = await graph.captureScreenshot({ ...opts, multiplier: 4 });

    const canvas = graph.engine.getRenderingCanvas();
    assert.ok(canvas);
    assert.equal(four.metadata.width, canvas.width * 4);
    assert.equal(four.metadata.height, canvas.height * 4);

    const imageOne = await decode(one.blob);
    const imageFour = await decode(four.blob);
    assert.equal(imageOne.width, canvas.width, "1x is the canvas");
    assert.equal(imageFour.width, canvas.width * 4, "4x is four canvases wide");
    assert.equal(imageFour.height, canvas.height * 4, "and four tall");

    const edgeOne = glyphEdge(imageOne);
    const edgeFour = glyphEdge(imageFour);
    assert.isAbove(edgeOne.edges, 20, "the names are on the 1x image");
    assert.isAbove(edgeFour.edges, 20, "the names are on the 4x image");
    assert.isAtMost(
        edgeFour.rise,
        edgeOne.rise,
        `a glyph edge spans ${String(edgeFour.rise)} output pixels at 4x and ${String(edgeOne.rise)} at 1x`,
    );

    const lineOne = edgeThickness(imageOne);
    const lineFour = edgeThickness(imageFour);
    assert.isAbove(lineOne, 0, "the edge is on the 1x image");
    assert.isAtLeast(
        lineFour,
        3 * lineOne,
        `the edge is ${String(lineFour)} pixels thick at 4x and ${String(lineOne)} at 1x`,
    );
    assert.isAtMost(
        lineFour,
        5 * lineOne,
        `the edge is ${String(lineFour)} pixels thick at 4x and ${String(lineOne)} at 1x`,
    );
});

test("a capture larger than the canvas is refused, not left pending, when its pixels cannot be encoded", async () => {
    // Babylon encodes a render-target capture in a promise nobody awaits; a graph disposed
    // mid-capture fails there, and the failure must reach the caller.
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
        callback(null);
    });
    let refused = false;
    try {
        await graph.captureScreenshot({ timing: { waitForSettle: false }, multiplier: 2 });
    } catch {
        refused = true;
    } finally {
        toBlob.mockRestore();
    }
    assert.isTrue(refused, "the capture is refused");
});
