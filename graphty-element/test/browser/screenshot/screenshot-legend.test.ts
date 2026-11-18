import { CreateScreenshotAsync } from "@babylonjs/core";
import { afterEach, assert, beforeEach, test, vi } from "vitest";

import type { Graph } from "../../../src/Graph";
import { legendBox } from "../../../src/screenshot/drawLegend";
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

test("a framed capture keeps every node out from under the key it draws, not the screen's margins, then gives those back", async () => {
    graph = await createTestGraphWithData();
    // A ball of nodes wide enough that a fit centered on the whole canvas reaches its left edge.
    await graph.addNodes(
        Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return {
                id: `b${String(i)}`,
                position: { x: 40 * Math.cos(a), y: 25 * Math.sin(a), z: 10 * Math.sin(a * 2) },
            };
        }),
    );
    await graph.setLayout("fixed", { dim: 3 });
    await graph.waitForSettled();
    graph.setViewInsets({ right: 30 });

    // A tall key: twenty rows, so it is reserved at the left.
    const tall = [
        {
            title: "Color: Group",
            rows: Array.from({ length: 20 }, (_, i) => ({ label: `Group ${String(i)}`, color: "#ff0000", value: "1" })),
        },
    ];
    const { right } = legendBox(tall);

    let leftmost = Infinity;
    let insetsDuring: unknown;
    vi.mocked(CreateScreenshotAsync).mockImplementation(() => {
        insetsDuring = graph.getViewInsets();
        for (const node of graph.getNodes()) {
            const at = graph.nodeScreenPosition(node.id);
            if (at !== undefined && String(node.id).startsWith("b")) {
                leftmost = Math.min(leftmost, at.x);
            }
        }
        return Promise.resolve(document.createElement("canvas").toDataURL("image/png"));
    });

    await graph.captureScreenshot({ legend: tall, camera: { preset: "fitToGraph" } });

    // The picture has no screen chrome in it: only the key's margin applies.
    assert.deepEqual(insetsDuring, { top: 0, right: 0, bottom: 0, left: right });
    assert.isAbove(leftmost, right, "no node center lies under the key");
    assert.deepEqual(graph.getViewInsets(), { top: 0, right: 30, bottom: 0, left: 0 });
});

/**
 * How many pixels of one corner of an image are not white.
 * @param blob - The image.
 * @param corner - Which corner, as the legend option spells it.
 * @returns The count, over a quarter-width, quarter-height box in that corner.
 */
async function inkIn(blob: Blob, corner: "top-left" | "top-right" | "bottom-left" | "bottom-right"): Promise<number> {
    const image = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    assert.ok(ctx);
    ctx.drawImage(image, 0, 0);
    const w = Math.floor(image.width / 4);
    const h = Math.floor(image.height / 4);
    const x = corner.endsWith("left") ? 0 : image.width - w;
    const y = corner.startsWith("top") ? 0 : image.height - h;
    const { data } = ctx.getImageData(x, y, w, h);
    let ink = 0;
    for (let at = 0; at < data.length; at += 4) {
        if (data[at] < 200 || data[at + 1] < 200 || data[at + 2] < 200) {
            ink++;
        }
    }
    return ink;
}

/**
 * Colours the test graph's nodes by their degree, so the element's legend has a block to draw.
 * @param target - The graph.
 */
async function colorByDegree(target: Graph): Promise<void> {
    const session = target.getSession();
    await session.styles.add({
        name: "By degree",
        selector: { match: "everything" },
        encode: { "node.color": { by: "graphty.degree", scale: "linear", palette: "viridis" } },
    });
    await session.styles.settled();
}

test("legend: true draws the element's own legend in the bottom right, and nothing without it", async () => {
    graph = await createTestGraphWithData();
    await colorByDegree(graph);

    const plain = await graph.captureScreenshot();
    const keyed = await graph.captureScreenshot({ legend: true });

    assert.strictEqual(await inkIn(plain.blob, "bottom-right"), 0);
    assert.isAbove(await inkIn(keyed.blob, "bottom-right"), 0, "the key is drawn in its default corner");
    assert.strictEqual(await inkIn(keyed.blob, "top-left"), 0, "and nowhere else");
});

test("legend takes a corner and a heading in the caller's words", async () => {
    graph = await createTestGraphWithData();
    await colorByDegree(graph);

    const keyed = await graph.captureScreenshot({ legend: { position: "top-left", title: "Degree" } });

    assert.isAbove(await inkIn(keyed.blob, "top-left"), 0);
    assert.strictEqual(await inkIn(keyed.blob, "bottom-right"), 0);
});

test('legend: "auto" draws nothing while no layer binds a value', async () => {
    graph = await createTestGraphWithData();

    const auto = await graph.captureScreenshot({ legend: "auto" });

    for (const corner of ["top-left", "top-right", "bottom-left", "bottom-right"] as const) {
        assert.strictEqual(await inkIn(auto.blob, corner), 0, corner);
    }

    await colorByDegree(graph);
    const bound = await graph.captureScreenshot({ legend: "auto" });

    assert.isAbove(await inkIn(bound.blob, "bottom-right"), 0);
});
