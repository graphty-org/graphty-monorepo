import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import { Graph } from "../../../src/Graph.js";
import type { CameraWaypoint } from "../../../src/video/VideoCapture.js";
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

describe("Video Capture - Animated Camera Mode", () => {
    test("can capture video with animated camera", async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 600;
        const graph = new Graph(canvas);

        const cameraPath: CameraWaypoint[] = [
            { position: { x: 10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 } },
            { position: { x: -10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 }, duration: 2000 },
        ];

        const result = await graph.captureAnimation({
            duration: 2000,
            fps: 30,
            cameraMode: "animated",
            cameraPath,
        });

        assert.ok(result.blob instanceof Blob);
        assert.ok(result.blob.type.startsWith("video/webm"));
        assert.equal(result.metadata.fps, 30);
        assert.equal(result.metadata.format, "webm");
        assert.ok(result.metadata.width > 0);
        assert.ok(result.metadata.height > 0);

        graph.dispose();
    });

    test("supports multiple waypoints", async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 600;
        const graph = new Graph(canvas);

        const cameraPath: CameraWaypoint[] = [
            { position: { x: 10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 } },
            { position: { x: 0, y: 20, z: 0 }, target: { x: 0, y: 0, z: 0 }, duration: 1000 },
            { position: { x: -10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 }, duration: 1000 },
            { position: { x: 0, y: 0, z: 20 }, target: { x: 0, y: 0, z: 0 }, duration: 1000 },
        ];

        const result = await graph.captureAnimation({
            duration: 3000,
            fps: 30,
            cameraMode: "animated",
            cameraPath,
        });

        assert.ok(result.blob instanceof Blob);
        assert.equal(result.metadata.fps, 30);

        graph.dispose();
    });

    test("supports easing options", async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 600;
        const graph = new Graph(canvas);

        const cameraPath: CameraWaypoint[] = [
            { position: { x: 10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 } },
            { position: { x: -10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 }, duration: 250 },
        ];

        // Test all easing options. A capture runs in real time, so each is a quarter of a second:
        // about eight frames, every one placed through the easing.
        for (const easing of ["linear", "easeInOut", "easeIn", "easeOut"] as const) {
            const result = await graph.captureAnimation({
                duration: 250,
                fps: 30,
                cameraMode: "animated",
                cameraPath,
                easing,
            });

            assert.ok(result.blob instanceof Blob);
        }

        graph.dispose();
    });

    test("fires animation-progress events", async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 600;
        const graph = new Graph(canvas);

        const progressEvents: number[] = [];

        graph.on("animation-progress", (event) => {
            assert.isNumber(event.progress);
            progressEvents.push(Number(event.progress));
        });

        const cameraPath: CameraWaypoint[] = [
            { position: { x: 10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 } },
            { position: { x: -10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 }, duration: 1000 },
        ];

        await graph.captureAnimation({
            duration: 1000,
            fps: 10,
            cameraMode: "animated",
            cameraPath,
        });

        assert.ok(progressEvents.length > 0);
        // Last progress should be close to 100
        assert.ok(progressEvents[progressEvents.length - 1] >= 90);

        graph.dispose();
    });

    test("refuses an animated recording with no tour as a missing option", async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 600;
        const graph = new Graph(canvas);

        const error = await graph.captureAnimation({ duration: 2000, fps: 30, cameraMode: "animated" }).then(
            () => undefined,
            (caught: unknown) => caught as { code?: unknown; details?: unknown },
        );
        assert.equal(error?.code, "E_BAD_COMMAND");
        assert.deepEqual(error?.details, { reason: "missing-option", option: "tour" });

        graph.dispose();
    });

    test("records a single waypoint", async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 600;
        const graph = new Graph(canvas);
        // A tour without a duration runs on drawn frames, so the graph must be drawing.
        await graph.init();

        const cameraPath: CameraWaypoint[] = [
            { position: { x: 10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 }, hold: 100 },
        ];

        const result = await graph.captureAnimation({ fps: 30, cameraPath });
        assert.ok(result.blob instanceof Blob);

        graph.dispose();
    });

    test("respects custom fps setting", async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 600;
        const graph = new Graph(canvas);

        const cameraPath: CameraWaypoint[] = [
            { position: { x: 10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 } },
            { position: { x: -10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 }, duration: 500 },
        ];

        const result = await graph.captureAnimation({
            duration: 500,
            fps: 60,
            cameraMode: "animated",
            cameraPath,
        });

        assert.equal(result.metadata.fps, 60);

        graph.dispose();
    });

    test("respects custom dimensions", async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 600;
        const graph = new Graph(canvas);

        const cameraPath: CameraWaypoint[] = [
            { position: { x: 10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 } },
            { position: { x: -10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 }, duration: 500 },
        ];

        const result = await graph.captureAnimation({
            duration: 500,
            fps: 30,
            cameraMode: "animated",
            cameraPath,
            width: 1920,
            height: 1080,
        });

        assert.equal(result.metadata.width, 1920);
        assert.equal(result.metadata.height, 1080);

        graph.dispose();
    });
});

describe("Video Capture - Animated vs Stationary Comparison", () => {
    test("stationary mode still works after animated mode implementation", async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 600;
        const graph = new Graph(canvas);

        const result = await graph.captureAnimation({
            duration: 1000,
            fps: 30,
            cameraMode: "stationary",
        });

        assert.ok(result.blob instanceof Blob);
        assert.equal(result.metadata.fps, 30);

        graph.dispose();
    });

    test("animated mode produces valid video output", async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 600;
        const graph = new Graph(canvas);

        const cameraPath: CameraWaypoint[] = [
            { position: { x: 10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 } },
            { position: { x: -10, y: 10, z: 10 }, target: { x: 0, y: 0, z: 0 }, duration: 500 },
        ];

        const result = await graph.captureAnimation({
            duration: 500,
            fps: 30,
            cameraMode: "animated",
            cameraPath,
        });

        // Verify video output
        assert.ok(result.blob instanceof Blob);
        assert.ok(result.blob.size > 0);
        assert.ok(result.blob.type.includes("video"));

        graph.dispose();
    });

    test("a tour flies through named views", async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 600;
        const graph = new Graph(canvas);
        await graph.init();

        const result = await graph.captureAnimation({
            duration: 1000,
            fps: 30,
            cameraMode: "animated",
            tour: ["topView", "frontView", "isometric"],
        });

        assert.ok(result.blob instanceof Blob);
        assert.equal(result.metadata.fps, 30);

        graph.dispose();
    });

    test("a tour refuses a view nothing answers to", async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 600;
        const graph = new Graph(canvas);
        await graph.init();

        let code: unknown;
        try {
            await graph.captureAnimation({
                duration: 1000,
                cameraMode: "animated",
                tour: ["topView", "no-such-view"],
            });
        } catch (error) {
            ({ code } = error as { code?: unknown });
        }
        assert.equal(code, "E_UNKNOWN_CAMERA");

        graph.dispose();
    });
});
