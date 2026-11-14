import { assert, beforeEach, describe, it, vi } from "vitest";

import type { StyleSchemaV1 } from "../../src/config/StyleTemplate";
import type { LayoutEngine } from "../../src/layout/LayoutEngine";
import { DataManager } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { LayoutManager, layoutManagerInternals } from "../../src/managers/LayoutManager";
import {
    type OperationCategory,
    type OperationContext,
    OperationQueueManager,
} from "../../src/managers/OperationQueueManager";
import { Styles } from "../../src/Styles";
import type { OperationMetadata } from "../../src/types/operations";

describe("Automatic Layout Updates", () => {
    let operationQueue: OperationQueueManager;
    let layoutManager: LayoutManager;
    let dataManager: DataManager;
    let eventManager: EventManager;
    let styles: Styles;
    // A stand-in engine: these tests check only that the queue triggers a layout-update while one
    // is installed. That the nodes reach a real engine is LayoutManager.test.ts's ("should get nodes
    // from layout engine").
    let mockLayoutEngine: LayoutEngine;

    beforeEach(() => {
        eventManager = new EventManager();
        // Styles needs a config - create a minimal one
        const minimalConfig = {
            graphtyTemplate: true as const,
            majorVersion: "1" as const,
            layers: [],
            graph: {
                addDefaultStyle: false,
                background: {
                    backgroundType: "color" as const,
                    color: "#000000",
                },
                startingCameraDistance: 100,
                layout: "none",
                twoD: false,
                viewMode: "3d",
            },
            behavior: {
                layout: {
                    type: "none",
                    preSteps: 0,
                    stepMultiplier: 1,
                    minDelta: 0.001,
                    zoomStepInterval: 100,
                    maxInFlight: 2,
                },
                node: {
                    pinOnDrag: false,
                },
                labels: {
                    declutter: false,
                    avoidNodesAndEdges: false,
                },
                rendering: {
                    onDemand: false,
                },
                camera: {
                    pivotOnSelection: false,
                    autoRotate: 0,
                    fitInsets: { top: 0, right: 0, bottom: 0, left: 0 },
                    fitBounds: "box",
                    refitOnResize: false,
                },
                expand: {
                    trigger: "none",
                    depth: 1,
                    direction: "both",
                    layout: "continue",
                },
                selection: {
                    region: "off",
                },
            },
            data: {
                knownFields: {
                    nodeIdPath: "id",
                    nodeLabelPath: null,
                    nodeWeightPath: null,
                    nodeTimePath: null,
                    edgeSrcIdPath: "source",
                    edgeDstIdPath: "target",
                    edgeIdPath: null,
                    repeatedEdges: "keep",
                    edgeWeightPath: null,
                    edgeTimePath: null,
                    edgeWeightMeaning: null,
                    positionScale: 1,
                    idCoercion: "canonical",
                },
                directed: "auto",
            },
        } satisfies StyleSchemaV1;
        styles = new Styles(minimalConfig);
        dataManager = new DataManager(eventManager, styles);
        layoutManager = new LayoutManager(eventManager, dataManager, styles);
        operationQueue = new OperationQueueManager(eventManager);
        // Set up the hasLayoutEngine callback
        operationQueue.hasLayoutEngine = () => layoutManager.hasLayoutEngine();

        // Create a mock layout engine
        mockLayoutEngine = {
            name: "mock-layout",
            step: vi.fn(),
            isSettled: vi.fn(() => true),
            getNodes: vi.fn(() => []),
            getEdges: vi.fn(() => []),
            getNodePosition: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
            addNode: vi.fn(),
            removeNode: vi.fn(),
            addEdge: vi.fn(),
            removeEdge: vi.fn(),
            updateNodePosition: vi.fn(),
        } as unknown as LayoutEngine;
    });

    it("should update layout when nodes added to existing layout", async () => {
        const operations: string[] = [];

        // Set up layout engine
        layoutManagerInternals.setEngine(layoutManager, mockLayoutEngine);
        layoutManager.running = true;

        // Track when layout update is triggered
        let layoutUpdateCalled = false;
        const originalQueueOp = operationQueue.queueOperationAsync.bind(operationQueue);
        operationQueue.queueOperationAsync = async function (
            category: OperationCategory,
            execute: (context: OperationContext) => Promise<void> | void,
            options?: Partial<OperationMetadata>,
        ) {
            if (category === "layout-update") {
                layoutUpdateCalled = true;
                operations.push("layout-update-queued");
            }

            return originalQueueOp(category, execute, options);
        };

        // Simulate adding nodes when layout exists
        await operationQueue.queueOperationAsync(
            "data-add",
            () => {
                operations.push("data-add");
            },
            {
                description: "Adding nodes",
            },
        );

        // Wait for operations and triggers to complete
        await operationQueue.waitForCompletion();

        assert.isTrue(layoutUpdateCalled, "layout-update should be triggered when nodes are added to existing layout");
        assert.include(operations, "data-add", "data-add should have executed");
        assert.include(operations, "layout-update-queued", "layout-update should have been queued");
    });

    it("should not update if no layout engine set", async () => {
        const operations: string[] = [];

        // No layout engine set
        layoutManagerInternals.setEngine(layoutManager, undefined);
        layoutManager.running = false;

        // Track if layout update is triggered
        let layoutUpdateCalled = false;
        const originalQueueOp = operationQueue.queueOperationAsync.bind(operationQueue);
        operationQueue.queueOperationAsync = async function (
            category: OperationCategory,
            execute: (context: OperationContext) => Promise<void> | void,
            options?: Partial<OperationMetadata>,
        ) {
            if (category === "layout-update") {
                layoutUpdateCalled = true;
                operations.push("layout-update-queued");
            }

            return originalQueueOp(category, execute, options);
        };

        // Simulate adding nodes when no layout exists
        await operationQueue.queueOperationAsync(
            "data-add",
            () => {
                operations.push("data-add");
            },
            {
                description: "Adding nodes",
            },
        );

        // Wait for operations, and the ones their triggers queue, to complete
        await operationQueue.waitForCompletion();

        assert.isFalse(layoutUpdateCalled, "layout-update should not be triggered when no layout engine exists");
        assert.include(operations, "data-add", "data-add should have executed");
        assert.notInclude(operations, "layout-update-queued", "layout-update should not have been queued");
    });

    it("does not coalesce layout updates in batch mode: one per data operation", async () => {
        const operations: string[] = [];
        let layoutUpdateCount = 0;

        // Set up layout engine
        layoutManagerInternals.setEngine(layoutManager, mockLayoutEngine);
        layoutManager.running = true;

        // Track layout updates
        const originalQueueOp = operationQueue.queueOperationAsync.bind(operationQueue);
        operationQueue.queueOperationAsync = async function (
            category: OperationCategory,
            execute: (context: OperationContext) => Promise<void> | void,
            options?: Partial<OperationMetadata>,
        ) {
            if (category === "layout-update") {
                layoutUpdateCount++;
                operations.push("layout-update-queued");
            }

            return originalQueueOp(category, execute, options);
        };

        // Enter batch mode
        operationQueue.enterBatchMode();

        // Queue multiple data operations
        const promises = [
            operationQueue.queueOperationAsync(
                "data-add",
                () => {
                    operations.push("data-add-1");
                },
                { description: "Adding nodes 1" },
            ),
            operationQueue.queueOperationAsync(
                "data-add",
                () => {
                    operations.push("data-add-2");
                },
                { description: "Adding nodes 2" },
            ),
            operationQueue.queueOperationAsync(
                "data-update",
                () => {
                    operations.push("data-update");
                },
                { description: "Updating nodes" },
            ),
        ];

        // Exit batch mode
        void operationQueue.exitBatchMode();

        // Wait for all operations
        await Promise.all(promises);
        await operationQueue.waitForCompletion();

        // Batch mode defers execution, not triggers: each data operation still queues its own
        // layout-update (one for each data-add and one for data-update)
        assert.equal(layoutUpdateCount, 3, "triggers one layout-update per data operation");
        assert.include(operations, "data-add-1", "first data-add should have executed");
        assert.include(operations, "data-add-2", "second data-add should have executed");
        assert.include(operations, "data-update", "data-update should have executed");
    });

    it("should handle edge additions with layout update", async () => {
        const operations: string[] = [];

        // Set up layout engine
        layoutManagerInternals.setEngine(layoutManager, mockLayoutEngine);
        layoutManager.running = true;

        // Track layout updates
        let layoutUpdateCalled = false;
        const originalQueueOp = operationQueue.queueOperationAsync.bind(operationQueue);
        operationQueue.queueOperationAsync = async function (
            category: OperationCategory,
            execute: (context: OperationContext) => Promise<void> | void,
            options?: Partial<OperationMetadata>,
        ) {
            if (category === "layout-update") {
                layoutUpdateCalled = true;
                operations.push("layout-update-queued");
            }

            return originalQueueOp(category, execute, options);
        };

        // Simulate adding edges when layout exists
        await operationQueue.queueOperationAsync(
            "data-add",
            () => {
                operations.push("edge-add");
            },
            {
                description: "Adding edges",
            },
        );

        // Wait for operations, and the ones their triggers queue, to complete
        await operationQueue.waitForCompletion();

        assert.isTrue(layoutUpdateCalled, "layout-update should be triggered when edges are added");
        assert.include(operations, "edge-add", "edge-add should have executed");
        assert.include(operations, "layout-update-queued", "layout-update should have been queued");
    });

    it("should skip layout update when skipTriggers is true", async () => {
        const operations: string[] = [];

        // Set up layout engine
        layoutManagerInternals.setEngine(layoutManager, mockLayoutEngine);
        layoutManager.running = true;

        // Track layout updates
        let layoutUpdateCalled = false;
        const originalQueueOp = operationQueue.queueOperationAsync.bind(operationQueue);
        operationQueue.queueOperationAsync = async function (
            category: OperationCategory,
            execute: (context: OperationContext) => Promise<void> | void,
            options?: Partial<OperationMetadata>,
        ) {
            if (category === "layout-update") {
                layoutUpdateCalled = true;
                operations.push("layout-update-queued");
            }

            return originalQueueOp(category, execute, options);
        };

        // Simulate adding nodes with skipTriggers
        await operationQueue.queueOperationAsync(
            "data-add",
            () => {
                operations.push("data-add");
            },
            {
                description: "Adding nodes",
                skipTriggers: true,
            },
        );

        // Wait for operations, and the ones their triggers queue, to complete
        await operationQueue.waitForCompletion();

        assert.isFalse(layoutUpdateCalled, "layout-update should not be triggered when skipTriggers is true");
        assert.include(operations, "data-add", "data-add should have executed");
        assert.notInclude(operations, "layout-update-queued", "layout-update should not have been queued");
    });
});
