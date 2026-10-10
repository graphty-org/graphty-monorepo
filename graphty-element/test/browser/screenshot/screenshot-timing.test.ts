import { afterEach, assert, test, vi } from "vitest";

import type { AuthoredLayoutDescriptor } from "../../../src/catalog/types";
import type { Edge } from "../../../src/Edge";
import { type Graph, operationQueueOf } from "../../../src/Graph";
import { type EdgePosition, LayoutEngine, type Position } from "../../../src/layout/LayoutEngine";
import { layoutManagerInternals } from "../../../src/managers/LayoutManager";
import type { Node } from "../../../src/Node";
import { SCREENSHOT_CONSTANTS } from "../../../src/screenshot/constants";
import { nextFrame } from "../../helpers/real-input";
import { cleanupTestGraphWithData, createTestGraphWithData } from "./test-setup.js";

let graph: Graph;

afterEach(() => {
    vi.useRealTimers();
    cleanupTestGraphWithData(graph);
});

/**
 * Wait until a capture is waiting for the layout to settle: it has added its `graph-settled`
 * listener, and started its settle timeout in the same step.
 * @param before - The graph's listener count before the capture was asked for.
 */
async function captureWaitingForSettle(before: number): Promise<void> {
    await vi.waitFor(() => {
        assert.isAbove(graph.listenerCount(), before, "the capture is listening for graph-settled");
    });
}

// Mock layout engine for testing
class MockLayoutEngine extends LayoutEngine {
    static type = "mock";
    static maxDimensions = 3;

    // Every layout registered from outside the element declares what a picker would show, and
    // `LayoutEngine.register` refuses one that does not. A mock is registered the same way a
    // third party's engine is, so it declares the same thing.
    static descriptor: AuthoredLayoutDescriptor = {
        id: "mock",
        plainName: "Mock",
        technicalName: "Mock layout, for tests",
        description: "Puts every node at the origin so a test can drive the settle machinery.",
        family: "special",
        kind: "live",
        maxDimensions: 3,
        sizeRating: "any",
        structuralInputs: [],
        options: [],
        engine: "mock",
    };

    private _settled = false;
    private _nodes: Node[] = [];
    private _edges: Edge[] = [];

    async init(): Promise<void> {
        return Promise.resolve();
    }

    addNode(n: Node): void {
        this._nodes.push(n);
    }

    addEdge(e: Edge): void {
        this._edges.push(e);
    }

    getNodePosition(): Position {
        return { x: 0, y: 0, z: 0 };
    }

    setNodePosition(): void {
        // No-op
    }

    getEdgePosition(): EdgePosition {
        return {
            src: { x: 0, y: 0, z: 0 },
            dst: { x: 10, y: 10, z: 10 },
        };
    }

    step(): void {
        // No-op
    }

    pin(): void {
        // No-op
    }

    unpin(): void {
        // No-op
    }

    get nodes(): Iterable<Node> {
        return this._nodes;
    }

    get edges(): Iterable<Edge> {
        return this._edges;
    }

    get isSettled(): boolean {
        return this._settled;
    }

    setSettled(settled: boolean): void {
        this._settled = settled;
    }
}

// Register mock layout engine
LayoutEngine.register(MockLayoutEngine);

test("waitForSettle waits for layout to settle", async () => {
    graph = await createTestGraphWithData();

    // Set up mock layout engine
    const layoutManager = graph.getLayoutManager();
    await layoutManagerInternals.setLayout(layoutManager, "mock");

    const layoutEngine = layoutManager.layoutEngine as MockLayoutEngine;
    assert.ok(layoutEngine, "Layout engine should be set");
    layoutEngine.setSettled(false);

    let captured = false;
    const listenersBefore = graph.listenerCount();
    const capturePromise = graph
        .captureScreenshot({
            timing: { waitForSettle: true },
        })
        .then(() => {
            captured = true;
        });

    // Should not capture while it waits for the layout
    await captureWaitingForSettle(listenersBefore);
    assert.equal(captured, false, "Should not capture before settling");

    // Settle layout
    layoutEngine.setSettled(true);
    // Access private eventManager for testing purposes
    (
        graph as unknown as { eventManager: { emitGraphEvent: (type: string, data: Record<string, unknown>) => void } }
    ).eventManager.emitGraphEvent("graph-settled", { graph });

    // Now should capture
    await capturePromise;
    assert.equal(captured, true, "Should capture after settling");
});

test("waitForSettle times out if layout never settles", async () => {
    graph = await createTestGraphWithData();

    // Set up mock layout engine
    const layoutManager = graph.getLayoutManager();
    await layoutManagerInternals.setLayout(layoutManager, "mock");

    const layoutEngine = layoutManager.layoutEngine as MockLayoutEngine;
    assert.ok(layoutEngine, "Layout engine should be set");
    layoutEngine.setSettled(false);

    // The settle timeout runs on a fake clock, so the test does not wait it out.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const listenersBefore = graph.listenerCount();
    const outcome = graph
        .captureScreenshot({
            timing: { waitForSettle: true },
        })
        .then(
            () => null,
            (error: unknown) => error,
        );
    await captureWaitingForSettle(listenersBefore);
    await vi.advanceTimersByTimeAsync(SCREENSHOT_CONSTANTS.LAYOUT_SETTLE_TIMEOUT_MS);

    const error = await outcome;
    assert.ok(error instanceof Error, "Should throw an error");
    assert.match(error.message, /settle|timeout/i, "Error message should mention settling or timeout");
});

test("waitForOperations waits for pending operations", async () => {
    graph = await createTestGraphWithData();

    // Queue an operation that stays pending until the test releases it (use style-apply to
    // avoid triggering layout-update)
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    let operationComplete = false;
    const longOperation = operationQueueOf(graph).queueOperationAsync("style-apply", async () => {
        await gate;
        operationComplete = true;
    });

    let captured = false;
    const capturePromise = graph
        .captureScreenshot({
            timing: { waitForOperations: true, waitForSettle: false },
        })
        .then(() => {
            captured = true;
        });

    // Should not capture while the operation is pending, however many frames are drawn
    for (let frame = 0; frame < 5; frame++) {
        await nextFrame();
    }
    assert.equal(captured, false, "Should not capture before operations complete");

    // Let the operation complete
    release();
    await longOperation;
    assert.equal(operationComplete, true, "Long operation should complete");

    // Now should capture
    await capturePromise;
    assert.equal(captured, true, "Should capture after operations complete");
});

test("can skip waiting with timing.waitForSettle: false", async () => {
    graph = await createTestGraphWithData();

    // Set up mock layout engine
    const layoutManager = graph.getLayoutManager();
    await layoutManagerInternals.setLayout(layoutManager, "mock");

    const layoutEngine = layoutManager.layoutEngine as MockLayoutEngine;
    assert.ok(layoutEngine, "Layout engine should be set");
    layoutEngine.setSettled(false);

    // Should capture immediately without waiting
    const result = await graph.captureScreenshot({
        timing: {
            waitForSettle: false,
            waitForOperations: false,
        },
    });

    assert.ok(result.blob instanceof Blob, "Should return a blob");
});

test("can skip waiting for operations with timing.waitForOperations: false", async () => {
    graph = await createTestGraphWithData();

    // Queue an operation that stays pending until the test releases it (use style-apply to
    // avoid triggering layout-update)
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    let operationDone = false;
    const operation = operationQueueOf(graph).queueOperationAsync("style-apply", async () => {
        await gate;
        operationDone = true;
    });

    // Should capture without waiting for the pending operation
    const result = await graph.captureScreenshot({
        timing: {
            waitForSettle: false,
            waitForOperations: false,
        },
    });

    assert.ok(result.blob instanceof Blob, "Should return a blob");
    assert.isFalse(operationDone, "Should capture while the operation is still pending");

    release();
    await operation;
});
