import { afterEach, assert, test, vi } from "vitest";

import type { Graph } from "../../../src/Graph.js";
import { ScreenshotError, ScreenshotErrorCode } from "../../../src/screenshot/ScreenshotError.js";
import { cleanupTestGraphWithData, createTestGraphWithData } from "./test-setup.js";

let graph: Graph;

/**
 * Replaces the browser's clipboard for one test, and grants clipboard-write so the outcome is the
 * write's own.
 * @param clipboard - What `navigator.clipboard` reads as; undefined for a browser without one.
 */
function stubClipboard(clipboard: Pick<Clipboard, "write"> | undefined): void {
    Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
    vi.spyOn(navigator.permissions, "query").mockResolvedValue({ state: "granted" } as PermissionStatus);
}

afterEach(() => {
    Reflect.deleteProperty(navigator, "clipboard");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    cleanupTestGraphWithData(graph);
});

/**
 * Asserts a clipboard error carries one code.
 * @param error - The result's clipboardError.
 * @param code - The code it must carry.
 */
function assertCode(error: Error | undefined, code: ScreenshotErrorCode): void {
    assert.ok(error instanceof ScreenshotError, "clipboardError should be a ScreenshotError");
    assert.equal(error.code, code);
}

test("a capture without the clipboard as a destination reports not-requested", async () => {
    graph = await createTestGraphWithData();

    const result = await graph.captureScreenshot({ destination: { blob: true } });

    assert.equal(result.clipboardStatus, "not-requested");
    assert.equal(result.clipboardError, undefined);
});

test("a successful clipboard write reports success with no error", async () => {
    graph = await createTestGraphWithData();
    const write = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ write });

    const result = await graph.captureScreenshot({ destination: { clipboard: true } });

    assert.equal(result.clipboardStatus, "success");
    assert.equal(result.clipboardError, undefined);
    assert.equal(write.mock.calls.length, 1);
    assert.ok(result.blob instanceof Blob);
});

test("a browser without a clipboard reports not-supported and still returns the image", async () => {
    graph = await createTestGraphWithData();
    stubClipboard(undefined);

    const result = await graph.captureScreenshot({ destination: { clipboard: true } });

    assert.equal(result.clipboardStatus, "not-supported");
    assertCode(result.clipboardError, ScreenshotErrorCode.CLIPBOARD_NOT_SUPPORTED);
    assert.ok(result.blob instanceof Blob);
});

test("an insecure page reports not-secure-context", async () => {
    graph = await createTestGraphWithData();
    vi.stubGlobal("isSecureContext", false);

    const result = await graph.captureScreenshot({ destination: { clipboard: true } });

    assert.equal(result.clipboardStatus, "not-secure-context");
    assertCode(result.clipboardError, ScreenshotErrorCode.CLIPBOARD_NOT_SECURE_CONTEXT);
});

test("a write the browser refuses reports permission-denied", async () => {
    graph = await createTestGraphWithData();
    stubClipboard({ write: vi.fn().mockRejectedValue(new DOMException("refused", "NotAllowedError")) });

    const result = await graph.captureScreenshot({ destination: { clipboard: true } });

    assert.equal(result.clipboardStatus, "permission-denied");
    assertCode(result.clipboardError, ScreenshotErrorCode.CLIPBOARD_PERMISSION_DENIED);
});

test("a denied clipboard-write permission reports permission-denied without writing", async () => {
    graph = await createTestGraphWithData();
    const write = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ write });
    vi.spyOn(navigator.permissions, "query").mockResolvedValue({ state: "denied" } as PermissionStatus);

    const result = await graph.captureScreenshot({ destination: { clipboard: true } });

    assert.equal(result.clipboardStatus, "permission-denied");
    assertCode(result.clipboardError, ScreenshotErrorCode.CLIPBOARD_PERMISSION_DENIED);
    assert.equal(write.mock.calls.length, 0);
});

test("a write that fails for another reason reports failed", async () => {
    graph = await createTestGraphWithData();
    stubClipboard({ write: vi.fn().mockRejectedValue(new Error("device busy")) });

    const result = await graph.captureScreenshot({ destination: { clipboard: true } });

    assert.equal(result.clipboardStatus, "failed");
    assertCode(result.clipboardError, ScreenshotErrorCode.CLIPBOARD_WRITE_FAILED);
    assert.ok(result.blob instanceof Blob);
});
