/**
 * Camera tours whose stops name saved views and hold (issue #817): `playTour` and a recorded
 * `cameraPath`, in 2D and 3D. Holds are checked by counting the frames drawn while the camera sat
 * at a stop and adding up their frame time -- the same clock a hold counts in.
 */
import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import type { CameraState } from "../../../src/camera/types.js";
import type { Graph } from "../../../src/Graph.js";
import type { CameraWaypoint } from "../../../src/video/VideoCapture.js";
import { cleanupTestGraph, configureGraph, createTestGraph } from "../../helpers/testSetup.js";
import { restoreMockMediaRecorder, setupMockMediaRecorder } from "./mock-media-recorder.js";

const VIEW_A_3D: CameraState = { position: { x: 0, y: 0, z: 30 }, target: { x: 0, y: 0, z: 0 } };
const VIEW_B_3D: CameraState = { position: { x: 30, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } };
const VIEW_A_2D: CameraState = { zoom: 1, pan: { x: 0, y: 0 } };
const VIEW_B_2D: CameraState = { zoom: 2, pan: { x: 5, y: 5 } };

const HOLD = 300;

/**
 * Whether the camera stands where a view put it.
 * @param graph - The graph.
 * @param view - The view.
 * @returns True when every member the view gives matches.
 */
function standsAt(graph: Graph, view: CameraState): boolean {
    const now = graph.getCameraState();
    const near = (a: number | undefined, b: number): boolean => a !== undefined && Math.abs(a - b) < 0.01;
    if (view.position) {
        return (
            near(now.position?.x, view.position.x) &&
            near(now.position?.y, view.position.y) &&
            near(now.position?.z, view.position.z)
        );
    }
    return near(now.zoom, view.zoom ?? 1) && near(now.pan?.x, view.pan?.x ?? 0) && near(now.pan?.y, view.pan?.y ?? 0);
}

/**
 * Count the frames drawn at each view while `work` runs, and the frame time they add up to.
 * @param graph - The graph.
 * @param views - The views to count at.
 * @param work - What moves the camera.
 * @returns For each view, the frames drawn there and their summed frame time in milliseconds.
 */
async function framesAt(
    graph: Graph,
    views: readonly CameraState[],
    work: () => Promise<unknown>,
): Promise<{ frames: number; ms: number }[]> {
    const counts = views.map(() => ({ frames: 0, ms: 0 }));
    const observer = graph.scene.onAfterRenderObservable.add(() => {
        views.forEach((view, index) => {
            if (standsAt(graph, view)) {
                counts[index].frames++;
                counts[index].ms += graph.engine.getDeltaTime();
            }
        });
    });
    try {
        await work();
    } finally {
        graph.scene.onAfterRenderObservable.remove(observer);
    }
    return counts;
}

/**
 * The code a rejected promise carries.
 * @param work - The promise.
 * @returns The error's code, or undefined when it did not reject.
 */
async function codeOf(work: Promise<unknown>): Promise<unknown> {
    try {
        await work;
    } catch (error) {
        return (error as { code?: unknown }).code;
    }
    return undefined;
}

for (const mode of ["3d", "2d"] as const) {
    const [viewA, viewB] = mode === "3d" ? [VIEW_A_3D, VIEW_B_3D] : [VIEW_A_2D, VIEW_B_2D];
    const tour: CameraWaypoint[] = [
        { view: "tour-a", hold: HOLD },
        { view: "tour-b", duration: 200, hold: HOLD },
    ];

    describe(`camera tours through saved views (${mode})`, () => {
        let graph: Graph;
        let originalMediaRecorder: typeof MediaRecorder;

        beforeEach(async () => {
            originalMediaRecorder = globalThis.MediaRecorder;
            setupMockMediaRecorder(vi);
            graph = await createTestGraph();
            await configureGraph(graph, { viewMode: mode, layout: "fixed" });
            await graph.waitForSettled();
            graph.saveCameraPreset("tour-a", viewA);
            graph.saveCameraPreset("tour-b", viewB);
        });

        afterEach(() => {
            cleanupTestGraph(graph);
            restoreMockMediaRecorder(vi, originalMediaRecorder);
        });

        test("playTour stops at each saved view for its hold", async () => {
            const [atA, atB] = await framesAt(graph, [viewA, viewB], () => graph.playTour(tour));

            assert.isAtLeast(atA.frames, 2, "frames drawn at the first stop");
            assert.isAtLeast(atA.ms, HOLD, "frame time at the first stop");
            assert.isAtLeast(atB.frames, 2, "frames drawn at the second stop");
            assert.isAtLeast(atB.ms, HOLD, "frame time at the second stop");
            assert.isTrue(standsAt(graph, viewB), "the tour ends at its last stop");
        });

        test("a recorded tour holds each stop in the video", async () => {
            let result: Awaited<ReturnType<Graph["captureAnimation"]>> | undefined;
            const [atA, atB] = await framesAt(graph, [viewA, viewB], async () => {
                result = await graph.captureAnimation({
                    duration: 2 * HOLD + 200,
                    fps: 30,
                    cameraMode: "animated",
                    cameraPath: tour,
                });
            });

            assert.ok(result?.blob instanceof Blob);
            assert.isAbove(result.metadata.framesCaptured, 0);
            assert.isAtLeast(atA.frames, 2, "frames recorded at the first stop");
            assert.isAtLeast(atA.ms, HOLD, "frame time recorded at the first stop");
            assert.isAtLeast(atB.frames, 1, "frames recorded at the second stop");
        });

        test("an unknown view name is refused before the camera moves", async () => {
            const before = graph.getCameraState();
            const playing = graph.playTour([{ view: "tour-a" }, { view: "no-such-view", duration: 100 }]);

            assert.equal(await codeOf(playing), "E_UNKNOWN_CAMERA");
            assert.deepEqual(graph.getCameraState(), before);
            assert.equal(
                await codeOf(
                    graph.captureAnimation({
                        duration: 500,
                        cameraMode: "animated",
                        cameraPath: [{ view: "no-such-view", hold: 100 }, { view: "tour-a" }],
                    }),
                ),
                "E_UNKNOWN_CAMERA",
            );
        });

        test("a stop the drawing mode cannot use is refused with E_UNSUPPORTED", async () => {
            const other = mode === "3d" ? VIEW_A_2D : VIEW_A_3D;
            assert.equal(await codeOf(graph.playTour([{ view: other, hold: 10 }])), "E_UNSUPPORTED");
        });

        test("cancelCameraAnimation ends a tour during a hold", async () => {
            let arrived: () => void = () => undefined;
            const atFirstStop = new Promise<void>((resolve) => {
                arrived = resolve;
            });
            const observer = graph.scene.onAfterRenderObservable.add(() => {
                if (standsAt(graph, viewA)) {
                    arrived();
                }
            });
            const playing = graph.playTour([{ view: "tour-a", hold: Number.MAX_SAFE_INTEGER }, { view: "tour-b" }]);
            await atFirstStop;
            graph.scene.onAfterRenderObservable.remove(observer);

            assert.isTrue(graph.cancelCameraAnimation());
            await playing;
            assert.isTrue(standsAt(graph, viewA), "the tour stopped where it was");
            assert.isFalse(graph.cancelCameraAnimation(), "nothing is left to cancel");
        });
    });
}
