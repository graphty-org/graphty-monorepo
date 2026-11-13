import { afterEach, assert, test, vi } from "vitest";

import type { Graph } from "../../../src/Graph.js";
import type { CapabilityCheck } from "../../../src/screenshot/capability-check.js";
import { ScreenshotErrorCode } from "../../../src/screenshot/ScreenshotError.js";
import { cleanupTestGraphWithData, createTestGraphWithData } from "./test-setup.js";

let graph: Graph;

afterEach(() => {
    vi.restoreAllMocks();
    cleanupTestGraphWithData(graph);
});

test("canCaptureScreenshot returns supported for normal dimensions", async () => {
    graph = await createTestGraphWithData();

    const check: CapabilityCheck = await graph.canCaptureScreenshot({
        width: 1920,
        height: 1080,
    });

    assert.equal(check.supported, true, "Should be supported");
    assert.ok(typeof check.estimatedMemoryMB === "number", "Should have memory estimate");
    assert.ok(check.estimatedMemoryMB > 0, "Memory estimate should be positive");
});

test("canCaptureScreenshot warns about large dimensions", async () => {
    graph = await createTestGraphWithData();

    const check: CapabilityCheck = await graph.canCaptureScreenshot({
        width: 3840, // 4K
        height: 2160,
    });

    assert.equal(check.supported, true, "4K should be supported");
    // 3840 x 2160 is exactly the 4K warning threshold; 31.6 MB is under the memory warning.
    assert.deepEqual(check.warnings, [
        { code: "W_LARGE_CAPTURE", params: { width: 3840, height: 2160, megapixels: 8.3 } },
    ]);
});

test("canCaptureScreenshot rejects excessive dimensions", async () => {
    graph = await createTestGraphWithData();

    const check: CapabilityCheck = await graph.canCaptureScreenshot({
        width: 20000,
        height: 20000,
    });

    assert.equal(check.supported, false, "Excessive dimensions should not be supported");
    assert.deepEqual(check.reason, {
        code: ScreenshotErrorCode.DIMENSION_TOO_LARGE,
        params: { width: 20000, height: 20000, maxDimension: 16384 },
    });
});

test("canCaptureScreenshot supports 8K with a size and a memory warning", async () => {
    graph = await createTestGraphWithData();

    // 7680 x 4320 is exactly the pixel limit, which is allowed: only more pixels are refused.
    const check: CapabilityCheck = await graph.canCaptureScreenshot({
        width: 7680,
        height: 4320,
    });

    assert.equal(check.supported, true);
    assert.equal(check.reason, undefined);
    assert.deepEqual(check.warnings, [
        { code: "W_LARGE_CAPTURE", params: { width: 7680, height: 4320, megapixels: 33.2 } },
        { code: "W_HIGH_MEMORY", params: { memoryMB: 127 } },
    ]);
});

test("canCaptureScreenshot estimates memory usage accurately", async () => {
    graph = await createTestGraphWithData();

    const check: CapabilityCheck = await graph.canCaptureScreenshot({
        width: 1920,
        height: 1080,
    });

    // 1920 * 1080 * 4 bytes (RGBA) = 8,294,400 bytes ≈ 7.9 MB
    const expectedMemoryMB = (1920 * 1080 * 4) / (1024 * 1024);

    assert.ok(typeof check.estimatedMemoryMB === "number", "Should have memory estimate");
    assert.ok(
        Math.abs(check.estimatedMemoryMB - expectedMemoryMB) < 0.1,
        `Memory estimate should be ~${expectedMemoryMB.toFixed(1)}MB, got ${check.estimatedMemoryMB.toFixed(1)}MB`,
    );
});

test("canCaptureScreenshot works with multiplier", async () => {
    graph = await createTestGraphWithData();

    const check: CapabilityCheck = await graph.canCaptureScreenshot({
        multiplier: 2,
    });

    assert.equal(check.supported, true, "2x multiplier should be supported");
    assert.ok(typeof check.estimatedMemoryMB === "number", "Should have memory estimate");
});

test("canCaptureScreenshot refuses a multiplier past the pixel limit", async () => {
    graph = await createTestGraphWithData();

    const check: CapabilityCheck = await graph.canCaptureScreenshot({
        multiplier: 10,
    });

    assert.equal(check.supported, false);
    assert.equal(check.reason?.code, ScreenshotErrorCode.RESOLUTION_TOO_HIGH);
    assert.equal(check.reason?.params.maxPixels, 33_177_600);
});

test("canCaptureScreenshot works with default options", async () => {
    graph = await createTestGraphWithData();

    const check: CapabilityCheck = await graph.canCaptureScreenshot();

    assert.equal(check.supported, true, "Default options should be supported");
    assert.ok(typeof check.estimatedMemoryMB === "number", "Should have memory estimate");
});

test("canCaptureScreenshot supports WebP where the browser encodes it", async () => {
    graph = await createTestGraphWithData();

    const check: CapabilityCheck = await graph.canCaptureScreenshot({ format: "webp" });

    assert.equal(check.supported, true);
    assert.equal(check.reason, undefined);
});

test("canCaptureScreenshot refuses WebP where the browser cannot encode it", async () => {
    graph = await createTestGraphWithData();
    // A browser without a WebP encoder hands back a PNG when asked for WebP.
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
        callback(new Blob([], { type: "image/png" }));
    });

    const check: CapabilityCheck = await graph.canCaptureScreenshot({ format: "webp" });

    assert.equal(check.supported, false);
    assert.deepEqual(check.reason, { code: ScreenshotErrorCode.UNSUPPORTED_FORMAT, params: { format: "webp" } });
});

test("canCaptureScreenshot handles edge case: very small dimensions", async () => {
    graph = await createTestGraphWithData();

    const check: CapabilityCheck = await graph.canCaptureScreenshot({
        width: 100,
        height: 100,
    });

    assert.equal(check.supported, true, "Small dimensions should be supported");
    assert.ok(check.estimatedMemoryMB < 1, "Small dimensions should use minimal memory");
});
