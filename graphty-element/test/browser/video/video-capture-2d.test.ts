import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import { Graph } from "../../../src/Graph.js";
import type { CameraWaypoint, ViewWaypoint } from "../../../src/video/VideoCapture.js";
import { cleanupTestGraph, configureGraph, createTestGraph, setBehavior } from "../../helpers/testSetup.js";
import { restoreMockMediaRecorder, setupMockMediaRecorder } from "./mock-media-recorder.js";

// Store original MediaRecorder
let originalMediaRecorder: typeof MediaRecorder;

beforeEach(() => {
    // Save original
    originalMediaRecorder = globalThis.MediaRecorder;
    // Replace with mock
    setupMockMediaRecorder(vi);
});

afterEach(() => {
    // Restore original
    restoreMockMediaRecorder(vi, originalMediaRecorder);
});

describe("Video Capture - 2D Orthographic Camera", () => {
    let graph: Graph;

    beforeEach(async () => {
        // Create test graph
        graph = await createTestGraph();

        // Switch to 2D mode using proper template format
        graph.setBackground({ backgroundType: "color", color: "#f0f0f0" });
        await configureGraph(graph, { viewMode: "2d", layout: "fixed" });
        setBehavior(graph, { layout: { minDelta: 0.001, zoomStepInterval: 5 } });

        // Wait for the view mode and layout to be applied
        await graph.waitForSettled();

        // Verify 2D mode is active
        assert.isTrue(graph.getViewMode() === "2d", "Graph should be in 2D mode");
    });

    afterEach(() => {
        cleanupTestGraph(graph);
    });

    test("can capture video with 2D orthographic camera", async () => {
        const result = await graph.captureAnimation({
            duration: 1000,
            fps: 30,
            cameraMode: "stationary",
        });

        assert.ok(result.blob instanceof Blob);
        // Blob type includes codec, e.g., 'video/webm;codecs=vp9'
        assert.ok(result.blob.type.startsWith("video/webm"));
        assert.equal(result.metadata.fps, 30);
        assert.equal(result.metadata.format, "webm"); // Format detected from blob type
        // 1 s at 30 fps: every frame expected is either captured or dropped, and a 2D graph drawn
        // every frame while it records draws some of them.
        const { framesCaptured, framesDropped } = result.metadata;
        assert.ok(framesCaptured > 0, `frames captured: ${String(framesCaptured)}`);
        assert.equal(framesCaptured + framesDropped, 30);
        assert.equal(result.metadata.width, graph.canvas.width);
        assert.equal(result.metadata.height, graph.canvas.height);
    });

    test("2D video capture respects custom dimensions", async () => {
        const result = await graph.captureAnimation({
            duration: 500,
            fps: 30,
            cameraMode: "stationary",
            width: 1920,
            height: 1080,
        });

        assert.equal(result.metadata.width, 1920);
        assert.equal(result.metadata.height, 1080);
    });

    test("2D video capture fires animation-progress events", async () => {
        const progressEvents: number[] = [];

        graph.on("animation-progress", (event) => {
            assert.isNumber(event.progress);
            progressEvents.push(Number(event.progress));
        });

        await graph.captureAnimation({
            duration: 500,
            fps: 10,
            cameraMode: "stationary",
        });

        assert.ok(progressEvents.length > 0);
        // Last progress should be close to 100
        assert.ok(progressEvents[progressEvents.length - 1] >= 90);
    });
});

describe("Video Capture - 2D Animated Camera", () => {
    let graph: Graph;

    beforeEach(async () => {
        // Create test graph
        graph = await createTestGraph();

        // Switch to 2D mode using proper template format
        graph.setBackground({ backgroundType: "color", color: "#f0f0f0" });
        await configureGraph(graph, { viewMode: "2d", layout: "fixed" });
        setBehavior(graph, { layout: { minDelta: 0.001, zoomStepInterval: 5 } });

        // Wait for the view mode and layout to be applied
        await graph.waitForSettled();

        // Verify 2D mode is active
        assert.isTrue(graph.getViewMode() === "2d", "Graph should be in 2D mode");
    });

    afterEach(() => {
        cleanupTestGraph(graph);
    });

    test("can capture video with 2D animated camera using waypoints", async () => {
        // A 2D path's stops are views: a zoom and a pan, as setCameraState takes them
        const cameraPath: ViewWaypoint[] = [
            { view: { zoom: 1, pan: { x: 0, y: 0 } } },
            { view: { zoom: 0.67, pan: { x: 5, y: 5 } }, duration: 500 },
        ];

        const result = await graph.captureAnimation({
            duration: 500,
            fps: 30,
            cameraMode: "animated",
            cameraPath,
        });

        assert.ok(result.blob instanceof Blob);
        assert.ok(result.blob.type.startsWith("video/webm"));
        assert.equal(result.metadata.fps, 30);
        assert.equal(result.metadata.format, "webm");
    });

    test("2D animated video supports multiple waypoints", async () => {
        // Create a path that pans and zooms
        const cameraPath: ViewWaypoint[] = [
            { view: { zoom: 1, pan: { x: 0, y: 0 } } }, // Start centered
            { view: { zoom: 1, pan: { x: 5, y: 0 } }, duration: 250 }, // Pan right
            { view: { zoom: 2, pan: { x: 5, y: 5 } }, duration: 250 }, // Pan up + zoom in
            { view: { zoom: 1, pan: { x: 0, y: 0 } }, duration: 250 }, // Return to start
        ];

        const result = await graph.captureAnimation({
            duration: 750,
            fps: 30,
            cameraMode: "animated",
            cameraPath,
        });

        assert.ok(result.blob instanceof Blob);
        assert.equal(result.metadata.fps, 30);
    });

    test("2D animated video supports easing options", async () => {
        const cameraPath: ViewWaypoint[] = [
            { view: { zoom: 1, pan: { x: 0, y: 0 } } },
            { view: { zoom: 0.5, pan: { x: 10, y: 10 } }, duration: 500 },
        ];

        // Test all easing options with 2D camera
        for (const easing of ["linear", "easeInOut", "easeIn", "easeOut"] as const) {
            const result = await graph.captureAnimation({
                duration: 500,
                fps: 30,
                cameraMode: "animated",
                cameraPath,
                easing,
            });

            assert.ok(result.blob instanceof Blob, `Easing '${easing}' should produce valid blob`);
        }
    });

    test("2D animated video fires animation-progress events", async () => {
        const progressEvents: number[] = [];

        graph.on("animation-progress", (event) => {
            assert.isNumber(event.progress);
            progressEvents.push(Number(event.progress));
        });

        const cameraPath: ViewWaypoint[] = [
            { view: { zoom: 1, pan: { x: 0, y: 0 } } },
            { view: { zoom: 0.67, pan: { x: 5, y: 5 } }, duration: 500 },
        ];

        await graph.captureAnimation({
            duration: 500,
            fps: 10,
            cameraMode: "animated",
            cameraPath,
        });

        assert.ok(progressEvents.length > 0);
        // Last progress should be close to 100
        assert.ok(progressEvents[progressEvents.length - 1] >= 90);
    });

    test("2D animated video ends at the last stop's zoom and pan", async () => {
        const cameraPath: ViewWaypoint[] = [
            { view: { zoom: 1, pan: { x: 0, y: 0 } } },
            { view: { zoom: 2, pan: { x: 5, y: 5 } }, duration: 200 },
        ];

        await graph.captureAnimation({ duration: 500, fps: 30, cameraMode: "animated", cameraPath });

        const { zoom, pan } = graph.getCameraState();
        assert.closeTo(zoom ?? Number.NaN, 2, 0.01);
        assert.closeTo(pan?.x ?? Number.NaN, 5, 0.01);
        assert.closeTo(pan?.y ?? Number.NaN, 5, 0.01);
    });

    test("2D animated video throws error with insufficient waypoints", async () => {
        const cameraPath: CameraWaypoint[] = [{ position: { x: 0, y: 0, z: 10 }, target: { x: 0, y: 0, z: 0 } }];

        try {
            await graph.captureAnimation({
                duration: 500,
                fps: 30,
                cameraMode: "animated",
                cameraPath,
            });
            assert.fail("Should have thrown error");
        } catch (error) {
            assert.ok((error as Error).message.includes("2 waypoints"));
        }
    });

    test("2D animated video throws error without camera path", async () => {
        try {
            await graph.captureAnimation({
                duration: 500,
                fps: 30,
                cameraMode: "animated",
                // No cameraPath provided
            });
            assert.fail("Should have thrown error");
        } catch (error) {
            assert.ok((error as Error).message.includes("waypoints"));
        }
    });
});

describe("Video Capture - 2D Camera Preservation", () => {
    let graph: Graph;

    beforeEach(async () => {
        // Create test graph
        graph = await createTestGraph();

        // Switch to 2D mode
        graph.setBackground({ backgroundType: "color", color: "#f0f0f0" });
        await configureGraph(graph, { viewMode: "2d", layout: "fixed" });
        setBehavior(graph, { layout: { minDelta: 0.001, zoomStepInterval: 5 } });

        // Wait for the view mode and layout to be applied
        await graph.waitForSettled();
    });

    afterEach(() => {
        cleanupTestGraph(graph);
    });

    test("2D mode is maintained during video capture", async () => {
        // Verify 2D mode before capture
        assert.isTrue(graph.getViewMode() === "2d", "Graph should be in 2D mode before capture");

        const result = await graph.captureAnimation({
            duration: 500,
            fps: 30,
            cameraMode: "stationary",
        });

        // Verify 2D mode after capture
        assert.isTrue(graph.getViewMode() === "2d", "Graph should remain in 2D mode after capture");
        assert.ok(result.blob instanceof Blob);
    });

    test("2D video capture supports cancellation", async () => {
        // Start a long capture
        const recording = graph.eventManager.waitFor("animation-progress");
        const capturePromise = graph.captureAnimation({
            duration: 5000,
            fps: 30,
            cameraMode: "stationary",
        });

        // Cancel once it is recording
        await recording;

        // Should be capturing
        assert.ok(graph.isAnimationCapturing(), "Should be capturing before cancel");

        // Cancel and check return value
        const wasCancelled = graph.cancelAnimationCapture();
        assert.ok(wasCancelled, "cancelAnimationCapture should return true when cancelling active capture");

        // Should no longer be capturing
        assert.equal(graph.isAnimationCapturing(), false, "Should not be capturing after cancel");

        // Should throw or reject with AnimationCancelledError
        try {
            await capturePromise;
            assert.fail("Should have thrown cancellation error");
        } catch (error) {
            assert.ok(error instanceof Error);
            assert.equal(error.name, "AnimationCancelledError", "Error should be AnimationCancelledError");
            assert.ok(error.message.includes("cancel"), "Error message should mention cancellation");
        }
    });
});
