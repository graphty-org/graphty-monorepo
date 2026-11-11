/**
 * @file Capture options a consumer's Export dialog needs: a solid background color, the output size
 * before capturing, cancelling a waiting capture or capturing now, and capturing from a canvas that
 * keeps no frames (`preserveDrawingBuffer: false`).
 */

import { CreateScreenshotAsync } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthoredLayoutDescriptor } from "../../../src/catalog/types";
import type { Edge } from "../../../src/Edge";
import { type Graph, operationQueueOf } from "../../../src/Graph";
import { type EdgePosition, LayoutEngine, type Position } from "../../../src/layout/LayoutEngine";
import { layoutManagerInternals } from "../../../src/managers/LayoutManager";
import type { Node } from "../../../src/Node";
import { ScreenshotErrorCode } from "../../../src/screenshot/ScreenshotError.js";
import { cleanupTestGraphWithData, createTestGraphWithData } from "./test-setup.js";

let graph: Graph;

// test/setup.ts stubs the capture with one pixel; these tests read the real drawing.
beforeEach(async () => {
    const actual = await vi.importActual<typeof import("@babylonjs/core")>("@babylonjs/core");
    vi.mocked(CreateScreenshotAsync).mockImplementation(actual.CreateScreenshotAsync);
});

afterEach(() => {
    cleanupTestGraphWithData(graph);
});

/**
 * The color of an image's top-left pixel, where the graph's background shows.
 * @param blob - The image.
 * @returns Its red, green and blue.
 */
async function cornerColor(blob: Blob): Promise<[number, number, number]> {
    const image = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    assert.ok(ctx);
    ctx.drawImage(image, 0, 0);
    const [r, g, b] = ctx.getImageData(1, 1, 1, 1).data;
    return [r, g, b];
}

/**
 * Asserts a color within a lossy encoder's error of the one expected.
 * @param actual - The color read.
 * @param expected - The color wanted.
 */
function assertNear(actual: readonly number[], expected: readonly number[]): void {
    for (let i = 0; i < 3; i++) {
        assert.approximately(actual[i], expected[i], 10, `channel ${i} of ${actual.join(",")}`);
    }
}

/** A layout that never comes to rest until the test says so. */
class UnsettledLayout extends LayoutEngine {
    static type = "capture-options-unsettled";
    static maxDimensions = 3;
    static descriptor: AuthoredLayoutDescriptor = {
        id: "capture-options-unsettled",
        plainName: "Unsettled",
        technicalName: "Unsettled layout, for tests",
        description: "Keeps every node at the origin and never settles, so a capture waits for it.",
        family: "special",
        kind: "live",
        maxDimensions: 3,
        sizeRating: "any",
        structuralInputs: [],
        options: [],
        engine: "capture-options-unsettled",
    };

    readonly #nodes: Node[] = [];
    readonly #edges: Edge[] = [];

    async init(): Promise<void> {
        return Promise.resolve();
    }
    addNode(n: Node): void {
        this.#nodes.push(n);
    }
    addEdge(e: Edge): void {
        this.#edges.push(e);
    }
    getNodePosition(): Position {
        return { x: 0, y: 0, z: 0 };
    }
    setNodePosition(): void {
        // A still layout.
    }
    getEdgePosition(): EdgePosition {
        return { src: { x: 0, y: 0, z: 0 }, dst: { x: 1, y: 1, z: 1 } };
    }
    step(): void {
        // A still layout.
    }
    pin(): void {
        // A still layout.
    }
    unpin(): void {
        // A still layout.
    }
    get nodes(): Iterable<Node> {
        return this.#nodes;
    }
    get edges(): Iterable<Edge> {
        return this.#edges;
    }
    get isSettled(): boolean {
        return false;
    }
}

LayoutEngine.register(UnsettledLayout);

/**
 * A graph whose layout never settles, so a capture waits for it until told otherwise.
 * @returns The graph and how many listeners it had before any capture.
 */
async function unsettledGraph(): Promise<number> {
    graph = await createTestGraphWithData();
    await layoutManagerInternals.setLayout(graph.getLayoutManager(), "capture-options-unsettled");
    return graph.listenerCount();
}

/**
 * Waits until a capture is waiting for the layout: it has added its `graph-settled` listener.
 * @param before - The listener count before the capture was asked for.
 */
async function waitingForSettle(before: number): Promise<void> {
    await vi.waitFor(() => {
        assert.isAbove(graph.listenerCount(), before, "the capture is waiting for the layout");
    });
}

/**
 * Holds the graph's operation queue until released, so a capture queued after it waits.
 * @returns Releases the queue, and the held operation's completion.
 */
function holdQueue(): { release: () => void; done: Promise<void> } {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    const done = operationQueueOf(graph).queueOperationAsync("style-apply", async () => {
        await gate;
    });
    return { release, done };
}

describe("backgroundColor", () => {
    it("paints a solid background in every format, and puts the canvas's back", async () => {
        graph = await createTestGraphWithData();
        const before = graph.getScene().clearColor.clone();

        for (const format of ["png", "jpeg", "webp"] as const) {
            const result = await graph.captureScreenshot({ backgroundColor: "#ff0000", format });
            assertNear(await cornerColor(result.blob), [255, 0, 0]);
        }

        assert.isTrue(graph.getScene().clearColor.equals(before), "the canvas background is restored");
    });

    it("reads any CSS color and wins over transparentBackground, even for JPEG", async () => {
        graph = await createTestGraphWithData();

        const result = await graph.captureScreenshot({
            backgroundColor: "blue",
            transparentBackground: true,
            format: "jpeg",
        });

        assertNear(await cornerColor(result.blob), [0, 0, 255]);
    });

    it("refuses something that is not a color", async () => {
        graph = await createTestGraphWithData();

        await expect(graph.captureScreenshot({ backgroundColor: "not a color" })).rejects.toMatchObject({
            code: ScreenshotErrorCode.INVALID_BACKGROUND_COLOR,
        });
    });
});

describe("canCaptureScreenshot output size", () => {
    it("reports the pixels the capture would produce", async () => {
        graph = await createTestGraphWithData();
        const canvas = graph.getScene().getEngine().getRenderingCanvas();
        assert.ok(canvas);

        const doubled = await graph.canCaptureScreenshot({ multiplier: 2 });
        assert.equal(doubled.width, canvas.width * 2);
        assert.equal(doubled.height, canvas.height * 2);

        const wide = await graph.canCaptureScreenshot({ width: 1000 });
        assert.equal(wide.width, 1000);
        assert.equal(wide.height, Math.round(1000 / (canvas.width / canvas.height)));

        const result = await graph.captureScreenshot({ multiplier: 2 });
        assert.equal(result.metadata.width, doubled.width, "the capture is the size reported");
        assert.equal(result.metadata.height, doubled.height);
    });

    it("reads a preset's size, as the capture does", async () => {
        graph = await createTestGraphWithData();

        const check = await graph.canCaptureScreenshot({ preset: "thumbnail" });

        assert.isTrue(check.supported);
        assert.equal(check.width, 400);
        assert.equal(check.height, 300);
    });

    it("reports no size when the size is not possible", async () => {
        graph = await createTestGraphWithData();

        const check = await graph.canCaptureScreenshot({ width: 20000, height: 20000 });

        assert.isFalse(check.supported);
        assert.isUndefined(check.width);
        assert.isUndefined(check.height);
    });
});

describe("signal", () => {
    it("rejects at once when already aborted", async () => {
        graph = await createTestGraphWithData();

        await expect(graph.captureScreenshot({ signal: AbortSignal.abort() })).rejects.toMatchObject({
            code: ScreenshotErrorCode.CAPTURE_ABORTED,
        });
    });

    it("withdraws a capture waiting for the layout to settle", async () => {
        const before = await unsettledGraph();
        const controller = new AbortController();
        const outcome = graph.captureScreenshot({ signal: controller.signal }).then(
            () => null,
            (error: unknown) => error,
        );
        await waitingForSettle(before);

        controller.abort();

        assert.propertyVal(await outcome, "code", ScreenshotErrorCode.CAPTURE_ABORTED);
        assert.equal(graph.listenerCount(), before, "it stopped listening for the layout");
    });

    it("withdraws a capture still queued, and the queue goes on", async () => {
        graph = await createTestGraphWithData();
        const held = holdQueue();
        const controller = new AbortController();
        const outcome = graph.captureScreenshot({ signal: controller.signal, timing: { waitForSettle: false } }).then(
            () => null,
            (error: unknown) => error,
        );

        controller.abort();

        assert.propertyVal(await outcome, "code", ScreenshotErrorCode.CAPTURE_ABORTED);
        held.release();
        await held.done;
        const next = await graph.captureScreenshot({ timing: { waitForSettle: false } });
        assert.instanceOf(next.blob, Blob, "a later capture still runs");
    });
});

describe("timing.captureNow", () => {
    it("stops waiting for the layout and captures the frame on screen", async () => {
        const before = await unsettledGraph();
        const now = new AbortController();
        const capture = graph.captureScreenshot({ timing: { captureNow: now.signal } });
        await waitingForSettle(before);

        now.abort();

        const result = await capture;
        assert.instanceOf(result.blob, Blob);
        assert.equal(graph.listenerCount(), before, "it stopped listening for the layout");
    });

    it("starts a capture queued behind other work at once", async () => {
        graph = await createTestGraphWithData();
        const held = holdQueue();
        const now = new AbortController();
        const capture = graph.captureScreenshot({ timing: { captureNow: now.signal, waitForSettle: false } });

        now.abort();

        const result = await capture;
        assert.instanceOf(result.blob, Blob, "captured while the queue was still held");
        held.release();
        await held.done;
    });

    it("waits for nothing when already aborted", async () => {
        await unsettledGraph();

        const result = await graph.captureScreenshot({ timing: { captureNow: AbortSignal.abort() } });

        assert.instanceOf(result.blob, Blob);
    });
});

describe("preserveDrawingBuffer: false", () => {
    it("builds a context that keeps no frames, and still captures the graph", async () => {
        graph = await createTestGraphWithData({ preserveDrawingBuffer: false });
        const canvas = graph.getScene().getEngine().getRenderingCanvas();
        assert.isFalse(canvas?.getContext("webgl2")?.getContextAttributes()?.preserveDrawingBuffer);

        const result = await graph.captureScreenshot({ backgroundColor: "#00ff00" });

        assertNear(await cornerColor(result.blob), [0, 255, 0]);
    });
});
