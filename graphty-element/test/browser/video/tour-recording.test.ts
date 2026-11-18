/**
 * @file Recording a tour (design/ui/camera-views-tours-and-capture.md, section 4.4): the video
 * opens on stop 0, holds each stop, lasts as long as the tour, reports 100 only once the tour is
 * done and puts the camera back; a tour that ends early, a hidden tab's stand-in (a resize) and a
 * cancel fail it with a code; conflicting or missing options are refused before anything moves.
 * The recorder is the mock (frames are counted from the scene); a drag is the browser's own mouse.
 */

import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import { AnimationCancelledError, isGraphtyError } from "../../../index";
import type { CameraState } from "../../../src/camera/types";
import type { TourProgressEvent } from "../../../src/events";
import type { Graph } from "../../../src/Graph.js";
import type { CodedFact } from "../../../src/session/shared";
import { drag } from "../../helpers/real-input";
import { cleanupTestGraph, configureGraph, createTestGraph } from "../../helpers/testSetup.js";
import { MockMediaRecorder, restoreMockMediaRecorder, setupMockMediaRecorder } from "./mock-media-recorder.js";

const POSE_A: CameraState = { mode: "3d", position: { x: 0, y: 0, z: 30 }, target: { x: 0, y: 0, z: 0 } };
const POSE_B: CameraState = { mode: "3d", position: { x: 30, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } };
const HOLD = 300;
const FLIGHT = 300;
/** A hold the tests end themselves, long past any test's run. */
const FOREVER = Number.MAX_SAFE_INTEGER;

/**
 * Whether the camera stands at a pose, to a hundredth.
 * @param graph - The graph.
 * @param pose - The pose.
 * @returns True when every axis of `position` matches.
 */
function standsAt(graph: Graph, pose: CameraState): boolean {
    const now = graph.getCameraState();
    return (["x", "y", "z"] as const).every(
        (axis) => Math.abs((now.position?.[axis] ?? Number.NaN) - (pose.position?.[axis] ?? Number.NaN)) < 0.01,
    );
}

/**
 * The refusal a promise rejected with, as a coded fact.
 * @param work - The promise.
 * @returns The code and the details, or null when it resolved.
 */
async function refusalOf(work: Promise<unknown>): Promise<CodedFact | null> {
    try {
        await work;
        return null;
    } catch (error) {
        assert.isTrue(isGraphtyError(error), `refused with a GraphtyError, not ${String(error)}`);
        return isGraphtyError(error) ? { code: error.code, params: { ...error.details } as CodedFact["params"] } : null;
    }
}

/**
 * Settles on the first `tour-progress` that matches.
 * @param graph - The graph.
 * @param stop - The stop.
 * @param phase - The phase.
 * @returns When the tour reaches it.
 */
function reaches(graph: Graph, stop: number, phase: TourProgressEvent["phase"]): Promise<void> {
    return new Promise((resolve) => {
        const off = graph.on("tour-progress", (event) => {
            if (event.stop === stop && event.phase === phase) {
                off();
                resolve();
            }
        });
    });
}

describe("recording a tour", () => {
    let graph: Graph;
    let originalMediaRecorder: typeof MediaRecorder;

    beforeEach(async () => {
        originalMediaRecorder = globalThis.MediaRecorder;
        setupMockMediaRecorder(vi);
        MockMediaRecorder.last = undefined;
        graph = await createTestGraph();
        await configureGraph(graph, { viewMode: "3d", layout: "fixed" });
        await graph.waitForSettled();
        await graph.getSession().views.save([
            { name: "a", camera: POSE_A },
            { name: "b", camera: POSE_B },
        ]);
        await graph.getSession().tours.save([
            {
                name: "walk",
                tour: {
                    stops: [
                        { view: "a", hold: HOLD },
                        { view: "b", duration: FLIGHT, hold: HOLD },
                    ],
                },
            },
        ]);
    });

    afterEach(() => {
        cleanupTestGraph(graph);
        restoreMockMediaRecorder(vi, originalMediaRecorder);
    });

    test("an authored recording opens on stop 0, holds both stops, lasts the tour and puts the camera back", async () => {
        // Reduced motion would make the flight a cut; "authored" records it as authored.
        graph.setReducedMotion(true);
        const before = graph.getCameraState();
        assert.isFalse(standsAt(graph, POSE_A), "the camera starts away from stop 0");

        let firstRecorded: boolean | undefined;
        let between = 0;
        const held = { a: 0, b: 0 };
        const observer = graph.scene.onAfterRenderObservable.add(() => {
            if (MockMediaRecorder.last?.state !== "recording") {
                return;
            }
            const atA = standsAt(graph, POSE_A);
            const atB = standsAt(graph, POSE_B);
            firstRecorded ??= atA;
            held.a += atA ? graph.engine.getDeltaTime() : 0;
            held.b += atB ? graph.engine.getDeltaTime() : 0;
            between += !atA && !atB ? 1 : 0;
        });
        const order: string[] = [];
        const offProgress = graph.on("animation-progress", (event) => {
            if (Number(event.progress) === 100) {
                order.push("100");
            }
        });
        const offTour = graph.on("tour-progress", (event) => {
            if (event.stop === 1 && event.phase === "hold") {
                order.push("last hold");
            }
        });

        let result: Awaited<ReturnType<Graph["captureAnimation"]>>;
        try {
            result = await graph.captureAnimation({ tour: "walk", motion: "authored", fps: 30 });
        } finally {
            graph.scene.onAfterRenderObservable.remove(observer);
            offProgress();
            offTour();
        }

        assert.isTrue(firstRecorded, "the first recorded frame shows stop 0");
        assert.isAtLeast(held.a, HOLD, "stop 0's hold is in the video");
        assert.isAtLeast(held.b, HOLD, "stop 1's hold is in the video");
        assert.isAbove(between, 0, "the flight is recorded as authored, not as a cut");
        assert.isAtLeast(result.metadata.duration, graph.planTour("walk").totalMs);
        assert.deepStrictEqual(order, ["last hold", "100"], "progress reaches 100 once, after the last hold began");
        assert.isTrue(
            (["x", "y", "z"] as const).every(
                (axis) =>
                    Math.abs((graph.getCameraState().position?.[axis] ?? 0) - (before.position?.[axis] ?? 0)) < 0.01,
            ),
            "the camera is put back",
        );
    });

    test("a one-stop tour records", async () => {
        const result = await graph.captureAnimation({ tour: [{ view: "a", hold: 100 }] });
        assert.instanceOf(result.blob, Blob);
    });

    test("a drag fails the recording with interrupted, and no file is made", async () => {
        const holding = reaches(graph, 0, "hold");
        const recording = refusalOf(graph.captureAnimation({ tour: [{ view: "a", hold: FOREVER }] }));
        await holding;
        await drag(graph.canvas, { x: 10, y: 10 }, { x: 120, y: 80 });
        assert.deepStrictEqual(await recording, {
            code: "E_CAPTURE_FAILED",
            params: { media: "video", reason: "interrupted" },
        });
    });

    test("a drag in a longer duration's trailing hold keeps the recording", async () => {
        const trailing = new Promise<void>((resolve) => {
            const off = graph.on("animation-progress", (event) => {
                if (Number(event.progress) >= 50) {
                    off();
                    resolve();
                }
            });
        });
        const recording = graph.captureAnimation({ tour: [{ view: "a", hold: 50 }], duration: 1500 });
        await trailing;
        await drag(graph.canvas, { x: 10, y: 10 }, { x: 120, y: 80 });
        assert.instanceOf((await recording).blob, Blob);
    });

    test("another tour fails the recording with replaced; a mode switch with mode-changed", async () => {
        let holding = reaches(graph, 0, "hold");
        const replaced = refusalOf(graph.captureAnimation({ tour: [{ view: "a", hold: FOREVER }] }));
        await holding;
        const playing = graph.playTour([{ view: "b", hold: 10 }]);
        assert.strictEqual((await replaced)?.params.reason, "replaced");
        await playing;

        holding = reaches(graph, 0, "hold");
        const switched = refusalOf(graph.captureAnimation({ tour: [{ view: "a", hold: FOREVER }] }));
        await holding;
        await graph.setViewMode("2d");
        assert.strictEqual((await switched)?.params.reason, "mode-changed");
    });

    test("a resize while recording at a fixed size fails it with resized", async () => {
        const holding = reaches(graph, 0, "hold");
        const recording = refusalOf(
            graph.captureAnimation({ tour: [{ view: "a", hold: FOREVER }], width: 320, height: 240 }),
        );
        await holding;
        // A layout change of the element's box, which its ResizeObserver hands to the graph.
        const container = graph.canvas.parentElement;
        assert.isNotNull(container);
        if (container !== null) {
            container.style.width = "300px";
        }
        graph.resize();
        assert.deepStrictEqual(await recording, {
            code: "E_CAPTURE_FAILED",
            params: { media: "video", reason: "resized" },
        });
    });

    test("an abort cancels the recording with E_CANCELLED, an AnimationCancelledError", async () => {
        const controller = new AbortController();
        const holding = reaches(graph, 0, "hold");
        const recording = graph.captureAnimation({ tour: [{ view: "a", hold: FOREVER }], signal: controller.signal });
        await holding;
        controller.abort();
        const error = await recording.then(
            () => undefined,
            (caught: unknown) => caught,
        );
        assert.instanceOf(error, AnimationCancelledError);
        assert.isTrue(isGraphtyError(error));
        assert.strictEqual(isGraphtyError(error) ? error.code : undefined, "E_CANCELLED");
        assert.strictEqual(error instanceof Error ? error.name : undefined, "AnimationCancelledError");
        assert.isFalse(standsAt(graph, POSE_A), "a cancelled recording puts the camera back");
    });

    test("an abort or a tour ending while stop 0 is placed, before the recorder exists, still ends the recording", async () => {
        const controller = new AbortController();
        // Stop 0 is placed before the recorder is made; its camera change is that moment.
        const offAbort = graph.on("camera-state-changed", () => {
            offAbort();
            controller.abort();
        });
        const aborted = refusalOf(
            graph.captureAnimation({ tour: [{ view: "a", hold: FOREVER }], signal: controller.signal }),
        );
        assert.strictEqual((await aborted)?.code, "E_CANCELLED");

        const offCancel = graph.on("camera-state-changed", () => {
            offCancel();
            graph.cancelCameraAnimation();
        });
        const ended = refusalOf(graph.captureAnimation({ tour: [{ view: "a", hold: FOREVER }] }));
        assert.strictEqual((await ended)?.code, "E_CANCELLED");
    });

    test("cancelCameraAnimation cancels a recording and leaves the element's framing as before the tour", async () => {
        const placed = graph.isCameraPlaced();
        const framing = graph.getUpdateManager().isZoomToFitEnabled();
        const holding = reaches(graph, 0, "hold");
        const recording = refusalOf(graph.captureAnimation({ tour: [{ view: "a", hold: FOREVER }] }));
        await holding;
        graph.cancelCameraAnimation();
        assert.strictEqual((await recording)?.code, "E_CANCELLED");
        assert.isFalse(standsAt(graph, POSE_A), "the camera is put back");
        assert.strictEqual(graph.isCameraPlaced(), placed, "putting the camera back is not a placement");
        assert.strictEqual(graph.getUpdateManager().isZoomToFitEnabled(), framing, "the framing is as before");
    });

    test("shutting the graph down cancels a recording without a duration", async () => {
        const holding = reaches(graph, 0, "hold");
        const recording = refusalOf(graph.captureAnimation({ tour: [{ view: "a", hold: FOREVER }] }));
        await holding;
        graph.shutdown();
        assert.strictEqual((await recording)?.code, "E_CANCELLED");
    });

    test("conflicting and missing options, and an empty tour, are refused with their codes", async () => {
        assert.deepStrictEqual(await refusalOf(graph.captureAnimation({ tour: "walk", cameraPath: [{ view: "a" }] })), {
            code: "E_BAD_COMMAND",
            params: { reason: "conflict", options: ["tour", "cameraPath"] },
        });
        assert.deepStrictEqual(await refusalOf(graph.captureAnimation({ tour: "walk", cameraMode: "stationary" })), {
            code: "E_BAD_COMMAND",
            params: { reason: "conflict", options: ["tour", "cameraMode"] },
        });
        assert.deepStrictEqual(await refusalOf(graph.captureAnimation({})), {
            code: "E_BAD_COMMAND",
            params: { reason: "missing-option", option: "duration" },
        });
        assert.deepStrictEqual(await refusalOf(graph.captureAnimation({ tour: ["a", "b"] })), {
            code: "E_BAD_COMMAND",
            params: { reason: "missing-option", option: "duration" },
        });
        assert.deepStrictEqual(await refusalOf(graph.captureAnimation({ tour: [] })), {
            code: "E_BAD_COMMAND",
            params: { reason: "no-stops" },
        });
        assert.strictEqual((await refusalOf(graph.captureAnimation({ tour: "nowhere" })))?.code, "E_BAD_COMMAND");
    });

    test("estimateAnimationCapture times a tour and sizes it from the canvas", async () => {
        const estimate = await graph.estimateAnimationCapture({ tour: "walk", fps: 10, videoBitrate: 8000 });
        const { totalMs } = graph.planTour("walk");
        assert.strictEqual(estimate.totalFrames, Math.floor((totalMs / 1000) * 10));
        assert.strictEqual(estimate.estimatedFileSize, Math.ceil((8000 * (totalMs / 1000)) / 8));
        const { width, height } = graph.canvas;
        const big = await graph.estimateAnimationCapture({
            duration: 1000,
            fps: 60,
            width: width * 10,
            height: height * 10,
        });
        assert.isTrue(big.likelyToDropFrames);
        const ratio = (big.recommendedResolution?.width ?? 0) / (big.recommendedResolution?.height ?? 1);
        assert.closeTo(ratio, width / height, 0.01, "the recommended size keeps the canvas's aspect");
    });
});
