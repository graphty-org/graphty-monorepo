/**
 * Mock Graph Context for AI testing.
 *
 * THE STYLE STACK IN HERE IS THE REAL ONE. `createStylesApi` and `createLayerRepaint` reach
 * neither Babylon.js nor the DOM, so a mock graph can hold a genuine session stack over a
 * handful of fake rows -- which is what makes the AI command tests worth running. A hand-written
 * fake would accept a selector the element refuses, and the commands exist precisely to report
 * that refusal.
 * @module test/helpers/mock-graph-context
 */

import { isCameraViewName } from "../../src/camera/resolve";
import type { Path } from "../../src/catalog/types";
import type { Graph } from "../../src/Graph";
import type { DataManager } from "../../src/managers";
import { StylePainter } from "../../src/managers/StylePainter";
import type { GraphSession } from "../../src/session";
import { createStylesApi } from "../../src/session/styles";
import type { SelectorSource } from "../../src/session/styles/predicate";
import { createLayerRepaint } from "../../src/session/styles/repaint";

/**
 * Options for creating a mock graph context.
 */
export interface MockGraphContextOptions {
    /** Initial node count */
    nodeCount?: number;
    /** Initial edge count */
    edgeCount?: number;
    /** Current layout type */
    layoutType?: string;
    /** Whether the graph is in 2D mode */
    twoD?: boolean;
}

/**
 * Mock node data for testing.
 */
export interface MockNodeData {
    id: string;
    data: Record<string, unknown>;
    algorithmResults?: Record<string, unknown>;
}

/**
 * Mock edge data for testing.
 */
export interface MockEdgeData {
    id: string;
    srcId: string;
    dstId: string;
    data: Record<string, unknown>;
}

/**
 * Get node type from index.
 */
function getNodeType(index: number): string {
    if (index % 3 === 0) {
        return "server";
    }

    if (index % 3 === 1) {
        return "client";
    }

    return "router";
}

/**
 * Create a mock graph context for testing AI functionality.
 * This creates a minimal mock that satisfies the Graph interface for AI commands.
 *
 * @param options - Configuration options
 * @returns A mock graph context
 */
export function createMockGraphContext(options: MockGraphContextOptions = {}): Graph {
    const { nodeCount = 10, edgeCount = 15, layoutType = "ngraph", twoD = false } = options;

    // Create mock nodes
    // Data structure uses {data: {type: ...}} format to match JMESPath selectors like "data.type == 'server'"
    const mockNodes = new Map<string, MockNodeData>();
    for (let i = 0; i < nodeCount; i++) {
        const id = `node-${i}`;
        mockNodes.set(id, {
            id,
            data: {
                id,
                label: `Node ${i}`,
                data: {
                    type: getNodeType(i),
                },
            },
        });
    }

    // Create mock edges
    const mockEdges = new Map<string, MockEdgeData>();
    const nodeIds = Array.from(mockNodes.keys());
    for (let i = 0; i < edgeCount; i++) {
        const id = `edge-${i}`;
        // Create edges connecting nodes in a round-robin fashion
        const srcIdx = i % nodeIds.length;
        const dstIdx = (i + 1) % nodeIds.length;
        mockEdges.set(id, {
            id,
            srcId: nodeIds[srcIdx],
            dstId: nodeIds[dstIdx],
            data: { id, weight: Math.random() },
        });
    }

    // Current layout type (mutable for testing layout changes)
    let currentLayoutType = layoutType;
    let currentTwoD = twoD;
    let currentLayoutEngine = { type: layoutType };

    // Track layout running state
    let layoutRunning = false;

    // XR helper mock
    let xrHelperMock: {
        enterVR: () => Promise<void>;
        enterAR: () => Promise<void>;
    } | null = null;

    // Create mock data manager
    const mockDataManager = {
        nodes: mockNodes,
        edges: mockEdges,
        getNode: (id: string | number) => mockNodes.get(String(id)),
        getEdge: (id: string) => mockEdges.get(id),
    } as unknown as DataManager;

    // Create mock layout manager
    const mockLayoutManager = {
        get layoutEngine() {
            return currentLayoutEngine;
        },
        get running() {
            return layoutRunning;
        },
        set running(value: boolean) {
            layoutRunning = value;
        },
        get isSettled() {
            return !layoutRunning;
        },
        setLayout(type: string): void {
            currentLayoutType = type;
            currentLayoutEngine = { type };
        },
        updateLayoutDimension(is2D: boolean): void {
            currentTwoD = is2D;
        },
    };

    // The listeners a test attaches, and the one way this mock tells them anything. The verbs
    // below announce through it for the same reason the real graph does: a change nobody is told
    // about is a change nothing redraws from.
    const listeners = new Map<string, ((event: { type: string }) => void)[]>();

    /**
     * Tell whoever is listening that something changed.
     * @param type - The event type.
     */
    function announce(type: string): void {
        for (const listener of listeners.get(type) ?? []) {
            listener({ type });
        }
    }

    const mockEventManager = {
        addListener(type: string, listener: (event: { type: string }) => void): void {
            listeners.set(type, [...(listeners.get(type) ?? []), listener]);
        },
        emitGraphEvent(type: string): void {
            announce(type);
        },
    };

    // What a selector reads. The paths are spelled the way the session publishes them: a
    // record's own fields live under `data.`, so a layer selects on `data.type`.
    const nodeRows: Readonly<Record<Path, unknown>>[] = [];
    for (let i = 0; i < nodeCount; i++) {
        nodeRows.push({ "data.id": `node-${i}`, "data.label": `Node ${i}`, "data.type": getNodeType(i) });
    }

    const edgeRows: Readonly<Record<Path, unknown>>[] = [];
    for (let i = 0; i < edgeCount; i++) {
        // Fixed rather than random, so a selector that compares against a weight selects the
        // same edges on every run.
        edgeRows.push({ "data.id": `edge-${i}`, "data.weight": (i % 10) / 10 });
    }

    const selectorSource: SelectorSource = {
        nodeValue: (index, path) => nodeRows[index]?.[path],
        edgeValue: (index, path) => edgeRows[index]?.[path],
    };

    const repaintEngine = createLayerRepaint({
        nodeCount: () => nodeRows.length,
        edgeCount: () => edgeRows.length,
        elements: selectorSource,
        measured: () => undefined,
    });

    // No base layers: the element seeds its own two, and nothing here draws anything, so the
    // stack a test reads back holds exactly the layers the commands put in it. The path
    // directory is what lets a layer be told apart from a layer over a column nothing answers,
    // which is the difference between "this will paint" and "this will paint later, or never".
    const mockSessionStyles = createStylesApi({
        elements: selectorSource,
        base: [],
        repaint: repaintEngine.repaint,
        paths: {
            answers: (path, target) => (target === "node" ? path in nodeRows[0] : path in edgeRows[0]),
        },
    });

    const mockSession = { styles: mockSessionStyles } as unknown as GraphSession;

    // The renderer's door onto that stack. A test that wants to know what a command actually
    // painted asks this rather than reading the layer back, because the layer says "red" and the
    // picture is what the channel made of it.
    const mockPainter = new StylePainter();
    mockPainter.bind(repaintEngine);

    // Create mock styles config
    const mockStyles = {
        config: {
            graph: {
                get twoD() {
                    return currentTwoD;
                },
                get layout() {
                    return currentLayoutType;
                },
                addDefaultStyle: true,
                background: {
                    backgroundType: "color" as const,
                    color: "#F5F5F5",
                },
                startingCameraDistance: 100,
                layoutOptions: undefined,
            },
            data: {
                algorithms: [],
            },
            behavior: {},
        },
    };

    // Create the mock graph object
    const mockGraph = {
        // Data access
        getNodeCount: () => mockNodes.size,
        getEdgeCount: () => mockEdges.size,
        getDataManager: () => mockDataManager,
        getLayoutManager: () => mockLayoutManager,
        getStyles: () => mockStyles,

        // The session, whose `styles` is the one style stack there is. A command that adds a
        // layer adds it here, and the repaint it waits on is the one the stack drives.
        getSession: () => mockSession,
        getStylePainter: () => mockPainter,

        // Layout methods
        setLayout(type: string): void {
            // Simulate error for unknown layout types
            const knownLayouts = [
                "circular",
                "ngraph",
                "random",
                "d3",
                "spiral",
                "shell",
                "spring",
                "planar",
                "kamada-kawai",
                "forceatlas2",
                "arf",
                "spectral",
                "bfs",
                "bipartite",
                "multipartite",
                "fixed",
            ];

            if (!knownLayouts.includes(type)) {
                throw new Error(`Unknown layout type: "${type}" not found`);
            }

            mockLayoutManager.setLayout(type);
        },

        // The view mode is its own setting, which is what the dimension command says now.
        setViewMode(mode: string): Promise<void> {
            currentTwoD = mode === "2d";
            announce("view-mode-changed");

            return Promise.resolve();
        },

        // Style access
        styles: mockStyles,

        // Camera methods (mock)
        async setCameraState(state: {
            preset?: string;
            position?: { x: number; y: number; z: number };
            target?: { x: number; y: number; z: number };
        }): Promise<void> {
            // Asked of the catalogue rather than of a copied list. A hard-coded five here would
            // make this mock refuse a registered view -- the very defect the camera extension
            // point exists to remove, reproduced inside a test helper.
            if (state.preset && !isCameraViewName(state.preset)) {
                throw new Error(`Unknown camera preset: "${state.preset}"`);
            }

            // Mock implementation accepts all valid presets and positions
            return Promise.resolve();
        },
        // A named camera view, optionally framing a subset rather than the whole graph. The
        // command layer reaches views through here now, so the mock has to answer to it.
        applyCameraView(id: string): Promise<void> {
            if (!isCameraViewName(id)) {
                throw new Error(`Unknown camera view: "${id}"`);
            }

            return Promise.resolve();
        },
        getCameraState: () => ({
            position: { x: 0, y: 10, z: 10 },
            target: { x: 0, y: 0, z: 0 },
        }),

        // Mode check
        is2D: () => currentTwoD,
        getViewMode: () => (currentTwoD ? "2d" : "3d"),

        // XR methods
        getXRHelper: () => xrHelperMock,
        setXRHelper: (helper: typeof xrHelperMock) => {
            xrHelperMock = helper;
        },
        exitImmersiveMode(): void {
            // Mock implementation
        },

        // Event handling (mock)
        on: (): void => undefined,
        addListener: (): void => undefined,
        eventManager: mockEventManager,

        // Screenshot capture (mock)
        captureScreenshot() {
            return {
                blob: new Blob(["mock"], { type: "image/png" }),
                dataUrl: "data:image/png;base64,mock",
                metadata: {
                    width: 800,
                    height: 600,
                    format: "png" as const,
                    timestamp: Date.now(),
                },
            };
        },

        // For testing - ability to set mock XR helper
        __testSetXRHelper: (helper: typeof xrHelperMock) => {
            xrHelperMock = helper;
        },

        // Algorithm methods
        async runAlgorithm(namespace: string, type: string): Promise<void> {
            // Mock implementation - use parameters to avoid lint warnings
            void namespace;
            void type;
            return Promise.resolve();
        },
    } as unknown as Graph;

    return mockGraph;
}
