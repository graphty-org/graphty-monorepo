import { afterEach, assert, beforeEach, test, vi } from "vitest";

import { Graph } from "../../../src/Graph.js";
import { cleanupTestGraph, createTestGraph } from "../../helpers/testSetup.js";
import { MockMediaRecorder, restoreMockMediaRecorder, setupMockMediaRecorder } from "./mock-media-recorder.js";

/**
 * The canvas the last recording was made from.
 * @returns The recorded canvas.
 */
function recordedCanvas(): HTMLCanvasElement {
    const track = MockMediaRecorder.lastStream?.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
    assert.ok(track, "a recording was made");
    return track.canvas;
}

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

test("can capture video with stationary camera", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const graph = new Graph(canvas);

    const result = await graph.captureAnimation({
        duration: 2000,
        fps: 30,
        cameraMode: "stationary",
    });

    assert.ok(result.blob instanceof Blob);
    // Blob type includes codec, e.g., 'video/webm;codecs=vp9'
    assert.ok(result.blob.type.startsWith("video/webm"));
    assert.equal(result.metadata.fps, 30);
    assert.equal(result.metadata.format, "webm"); // Format detected from blob type
    // 2 s at 30 fps: every frame expected is either captured or dropped.
    const { framesCaptured, framesDropped, dropRate } = result.metadata;
    assert.equal(framesCaptured + framesDropped, 60);
    assert.equal(dropRate, Math.round((framesDropped / 60) * 100));
    // Recorded from the canvas the graph draws on, at its own size.
    assert.equal(result.metadata.width, graph.canvas.width);
    assert.equal(result.metadata.height, graph.canvas.height);
    assert.equal(recordedCanvas(), graph.canvas, "recorded from the graph's own canvas at its own size");

    graph.dispose();
});

test("fires animation-progress events", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const graph = new Graph(canvas);

    const progressEvents: number[] = [];

    // Use eventManager to listen for events
    const { eventManager } = graph as {
        eventManager: { addListener: (event: string, handler: (data: unknown) => void) => void };
    };
    eventManager.addListener("animation-progress", (data) => {
        const progressData = data as { progress: number };
        progressEvents.push(progressData.progress);
    });

    await graph.captureAnimation({
        duration: 1000,
        fps: 10,
        cameraMode: "stationary",
    });

    assert.ok(progressEvents.length > 0);
    // Last progress should be close to 100
    assert.ok(progressEvents[progressEvents.length - 1] >= 90);

    graph.dispose();
});

test("respects custom fps setting", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const graph = new Graph(canvas);

    const result = await graph.captureAnimation({
        duration: 1000,
        fps: 60,
        cameraMode: "stationary",
    });

    assert.equal(result.metadata.fps, 60);

    graph.dispose();
});

test("records at the size asked for", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const graph = new Graph(canvas);

    const result = await graph.captureAnimation({
        duration: 1000,
        fps: 30,
        cameraMode: "stationary",
        width: 1920,
        height: 1080,
    });

    // The recorder was handed a canvas of that size, not the graph's.
    assert.notEqual(recordedCanvas(), graph.canvas);
    assert.equal(recordedCanvas().width, 1920);
    assert.equal(recordedCanvas().height, 1080);
    assert.equal(result.metadata.width, 1920);
    assert.equal(result.metadata.height, 1080);

    graph.dispose();
});

test("a resized recording holds the frames the graph draws", async () => {
    const graph = await createTestGraph();
    graph.setBackground({ backgroundType: "color", color: "#ff0000" });

    await graph.captureAnimation({ duration: 500, cameraMode: "stationary", width: 200, height: 100 });

    // The middle of the recorded picture is the graph's red background, not the black the
    // recording's canvas starts as.
    const [red, green, blue] = recordedCanvas().getContext("2d")?.getImageData(100, 50, 1, 1).data ?? [];
    assert.ok(red > 200 && green < 60 && blue < 60, `recorded pixel: ${String([red, green, blue])}`);

    cleanupTestGraph(graph);
});

test("a width alone keeps the canvas's aspect", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const graph = new Graph(canvas);

    const result = await graph.captureAnimation({ duration: 500, cameraMode: "stationary", width: 400 });

    const height = Math.round(400 * (graph.canvas.height / graph.canvas.width));
    assert.equal(recordedCanvas().width, 400);
    assert.equal(recordedCanvas().height, height);
    assert.equal(result.metadata.height, height);

    graph.dispose();
});

test("counts the frames the graph draws while recording, at most one per 1/fps", async () => {
    const graph = await createTestGraph();
    // The test draws every frame itself: none while the recorder starts, then five at once.
    graph.engine.stopRenderLoop();
    let drawn = false;
    graph.eventManager.addListener("animation-progress", () => {
        if (!drawn) {
            drawn = true;
            for (let i = 0; i < 5; i++) {
                graph.engine.beginFrame();
                graph.scene.render();
                graph.engine.endFrame();
            }
        }
    });

    const result = await graph.captureAnimation({ duration: 1000, fps: 10, cameraMode: "stationary" });

    // Five frames drawn within one 1/fps interval are one frame of the video; the other nine
    // frames expected were never drawn.
    assert.equal(result.metadata.framesCaptured, 1);
    assert.equal(result.metadata.framesDropped, 9);
    assert.equal(result.metadata.dropRate, 90);

    cleanupTestGraph(graph);
});

test("a graph that draws nothing while recording drops every frame", async () => {
    const graph = await createTestGraph();
    graph.engine.stopRenderLoop();

    const result = await graph.captureAnimation({ duration: 500, fps: 20, cameraMode: "stationary" });

    assert.equal(result.metadata.framesCaptured, 0);
    assert.equal(result.metadata.framesDropped, 10);
    assert.equal(result.metadata.dropRate, 100);

    cleanupTestGraph(graph);
});

test("records from the camera asked for, then puts the camera back", async () => {
    const graph = await createTestGraph();
    const before = graph.getCameraState();
    const asked = { position: { x: 3, y: 4, z: 25 }, target: { x: 0, y: 0, z: 0 } };

    const recording = graph.eventManager.waitFor("animation-progress");
    const capturePromise = graph.captureAnimation({ duration: 500, cameraMode: "stationary", camera: asked });
    await recording;
    const during = graph.getCameraState();
    await capturePromise;
    const after = graph.getCameraState();

    for (const axis of ["x", "y", "z"] as const) {
        assert.closeTo(during.position?.[axis] ?? Number.NaN, asked.position[axis], 1e-4, `recorded from ${axis}`);
        assert.closeTo(
            after.position?.[axis] ?? Number.NaN,
            before.position?.[axis] ?? Number.NaN,
            1e-4,
            `put back on ${axis}`,
        );
    }

    cleanupTestGraph(graph);
});

test("supports cancellation", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const graph = new Graph(canvas);

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

    // Cancelling again should return false
    const secondCancel = graph.cancelAnimationCapture();
    assert.equal(secondCancel, false, "Second cancel should return false");

    // Should throw or reject with AnimationCancelledError
    try {
        await capturePromise;
        assert.fail("Should have thrown cancellation error");
    } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.name, "AnimationCancelledError", "Error should be AnimationCancelledError");
        assert.ok(error.message.includes("cancel"), "Error message should mention cancellation");
    }

    graph.dispose();
});

test("cancelAnimationCapture returns false when no capture is in progress", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const graph = new Graph(canvas);

    // Cancel when nothing is running
    const result = graph.cancelAnimationCapture();
    assert.equal(result, false, "Should return false when no capture is in progress");

    // Check isAnimationCapturing
    assert.equal(graph.isAnimationCapturing(), false, "Should not be capturing");

    graph.dispose();
});
