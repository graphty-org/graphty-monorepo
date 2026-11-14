import { afterEach, assert, test, vi } from "vitest";

import { GraphtyError } from "../../../src/errors";
import type { Graph } from "../../../src/Graph.js";
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
 * Asserts a clipboard error is the browser refusing, for one reason.
 * @param error - The result's clipboardError.
 * @param reason - The `details.reason` it must carry.
 */
function assertRefused(error: Error | undefined, reason: string): void {
    assert.ok(error instanceof GraphtyError, "clipboardError should be a GraphtyError");
    assert.equal(error.code, "E_UNSUPPORTED");
    assert.equal(error.details.reason, reason);
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
    assertRefused(result.clipboardError, "clipboard");
    assert.ok(result.blob instanceof Blob);
});

test("an insecure page reports not-secure-context", async () => {
    graph = await createTestGraphWithData();
    vi.stubGlobal("isSecureContext", false);

    const result = await graph.captureScreenshot({ destination: { clipboard: true } });

    assert.equal(result.clipboardStatus, "not-secure-context");
    assertRefused(result.clipboardError, "clipboard-insecure-context");
});

test("a write the browser refuses reports permission-denied", async () => {
    graph = await createTestGraphWithData();
    stubClipboard({ write: vi.fn().mockRejectedValue(new DOMException("refused", "NotAllowedError")) });

    const result = await graph.captureScreenshot({ destination: { clipboard: true } });

    assert.equal(result.clipboardStatus, "permission-denied");
    assertRefused(result.clipboardError, "clipboard-permission");
});

test("a denied clipboard-write permission reports permission-denied without writing", async () => {
    graph = await createTestGraphWithData();
    const write = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ write });
    vi.spyOn(navigator.permissions, "query").mockResolvedValue({ state: "denied" } as PermissionStatus);

    const result = await graph.captureScreenshot({ destination: { clipboard: true } });

    assert.equal(result.clipboardStatus, "permission-denied");
    assertRefused(result.clipboardError, "clipboard-permission");
    assert.equal(write.mock.calls.length, 0);
});

test("a write that fails for another reason reports failed", async () => {
    graph = await createTestGraphWithData();
    stubClipboard({ write: vi.fn().mockRejectedValue(new Error("device busy")) });

    const result = await graph.captureScreenshot({ destination: { clipboard: true } });

    assert.equal(result.clipboardStatus, "failed");
    assert.ok(result.clipboardError instanceof GraphtyError);
    assert.equal(result.clipboardError.code, "E_CAPTURE_FAILED");
    assert.deepEqual(result.clipboardError.details, { media: "image", destination: "clipboard" });
    assert.ok(result.blob instanceof Blob);
});
