import { CreateScreenshotAsync } from "@babylonjs/core";
import { afterEach, assert, beforeEach, test, vi } from "vitest";

import type { Graph } from "../../../src/Graph";
import { cleanupTestGraphWithData, createTestGraphWithData } from "./test-setup.js";

let graph: Graph;

// test/setup.ts stubs the capture with one pixel; here it is a white image of the size asked for.
beforeEach(() => {
    vi.mocked(CreateScreenshotAsync).mockImplementation((_engine, _camera, size) => {
        const { width = 1, height = 1 } = typeof size === "number" ? { width: size, height: size } : size;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        assert.ok(ctx);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        return Promise.resolve(canvas.toDataURL("image/png"));
    });
});

afterEach(() => {
    cleanupTestGraphWithData(graph);
});

/**
 * Reads one pixel of an image.
 * @param blob - The image.
 * @param x - Column.
 * @param y - Row.
 * @returns Its red, green, blue and alpha.
 */
async function pixel(blob: Blob, x: number, y: number): Promise<number[]> {
    const image = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    assert.ok(ctx);
    ctx.drawImage(image, 0, 0);
    return Array.from(ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data);
}

const LEGEND = [{ title: "Color: Group", rows: [{ label: "First", color: "#ff0000", value: "3" }] }];

test("legend draws the caller's key at the image's top left, scaled as on the canvas", async () => {
    graph = await createTestGraphWithData();

    for (const multiplier of [1, 2]) {
        const plain = await graph.captureScreenshot({ multiplier });
        const keyed = await graph.captureScreenshot({ multiplier, legend: LEGEND });
        // The first row's color chip: 10 canvas pixels square, its center at (21, 40).
        const scale = keyed.metadata.width / 800;
        const [r, g, b, a] = await pixel(keyed.blob, 21 * scale, 40 * scale);
        assert.deepEqual([r, g, b, a], [255, 0, 0, 255], `chip at ${String(multiplier)}x`);
        assert.notDeepEqual(await pixel(plain.blob, 21 * scale, 40 * scale), [255, 0, 0, 255]);
        assert.equal(keyed.metadata.width, plain.metadata.width);
    }
});

test("legend keeps the requested format", async () => {
    graph = await createTestGraphWithData();

    const result = await graph.captureScreenshot({ format: "jpeg", legend: LEGEND });

    assert.equal(result.blob.type, "image/jpeg");
});

test("an empty legend leaves the image untouched", async () => {
    graph = await createTestGraphWithData();

    const result = await graph.captureScreenshot({ legend: [] });

    assert.equal(result.blob.type, "image/png");
});
