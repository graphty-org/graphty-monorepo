/**
 * @file Tours on a real element: `planTour` checks and times a tour the way `playTour` refuses it,
 * a camera view registered later takes a stop's name and says so with `views-changed`, and a
 * playing tour ends for every reason it can -- finished (and the camera put back), the reader's
 * drag or press, a cancel, an outside camera move, a mode switch -- while auto-rotate waits
 * through it. Input is real: the browser's own mouse, through the Chrome DevTools Protocol.
 */

import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { clearRegisteredCamerasForTesting, isGraphtyError, registerCameraView } from "../../../extend";
import type { TourEndReason } from "../../../src/camera/tour";
import type { CameraState } from "../../../src/camera/types";
import type { TourProgressEvent } from "../../../src/events";
import type { Graph } from "../../../src/Graph.js";
import type { CodedFact } from "../../../src/session/shared";
import { click, drag, nodePoint } from "../../helpers/real-input";
import { cleanupTestGraph, configureGraph, createTestGraph } from "../../helpers/testSetup.js";

const POSE_A: CameraState = { mode: "3d", position: { x: 0, y: 0, z: 30 }, target: { x: 0, y: 0, z: 0 } };
const POSE_B: CameraState = { mode: "3d", position: { x: 30, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } };
const FLAT: CameraState = { mode: "2d", zoom: 2, pan: { x: 0, y: 0 } };

/** A hold the tests end themselves, long past any test's run. */
const FOREVER = Number.MAX_SAFE_INTEGER;

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

/**
 * Settles once `count` frames have been drawn on which `when` held.
 * @param graph - The graph.
 * @param count - How many frames.
 * @param when - What must hold on a frame for it to count.
 * @returns When they have been drawn.
 */
function rendered(graph: Graph, count: number, when: () => boolean): Promise<void> {
    return new Promise((resolve) => {
        let drawn = 0;
        const observer = graph.scene.onAfterRenderObservable.add(() => {
            drawn += when() ? 1 : 0;
            if (drawn >= count) {
                graph.scene.onAfterRenderObservable.remove(observer);
                resolve();
            }
        });
    });
}

/**
 * Whether two camera positions are the same, to a hundredth.
 * @param a - One state.
 * @param b - The other.
 * @returns True when every axis of `position` matches.
 */
function samePosition(a: CameraState, b: CameraState): boolean {
    return (["x", "y", "z"] as const).every(
        (axis) => Math.abs((a.position?.[axis] ?? Number.NaN) - (b.position?.[axis] ?? Number.NaN)) < 0.01,
    );
}

describe("tours on a real element", () => {
    let graph: Graph;

    beforeEach(async () => {
        graph = await createTestGraph();
        await configureGraph(graph, { viewMode: "3d", layout: "circular" });
        await graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await graph.addEdges([{ src: "a", dst: "b" }]);
        await graph.waitForSettled();
        await graph.getSession().views.save([
            { name: "a", camera: POSE_A },
            { name: "b", camera: POSE_B },
            { name: "flat", camera: FLAT },
        ]);
    });

    afterEach(() => {
        clearRegisteredCamerasForTesting();
        cleanupTestGraph(graph);
    });

    test("planTour totals the authored times, places each stop, and reports each problem", () => {
        const stops = [
            { view: "a", hold: 300 },
            { view: "fitToGraph", duration: 200, hold: 100 },
            { view: "flat" },
            { view: "nowhere", duration: 50 },
        ];
        const plan = graph.planTour({ stops });
        assert.strictEqual(plan.totalMs, 650);
        assert.deepStrictEqual(
            plan.stops.map((stop) => [stop.startMs, stop.duration, stop.hold]),
            [
                [0, 0, 300],
                [300, 200, 100],
                [600, 0, 0],
                [600, 50, 0],
            ],
        );
        assert.isNull(plan.problem);
        assert.isFalse(plan.playable);
        assert.isNull(plan.stops[0].problem);
        assert.deepStrictEqual(plan.stops[2].problem, {
            code: "E_UNSUPPORTED",
            params: { reason: "mode", name: "flat", modes: ["2d"], mode: "3d", stop: 2 },
        });
        assert.strictEqual(plan.stops[3].problem?.code, "E_UNKNOWN_CAMERA");
        assert.strictEqual(plan.stops[3].problem?.params.stop, 3);

        assert.deepStrictEqual(graph.planTour({ stops: [] }).problem, {
            code: "E_BAD_COMMAND",
            params: { reason: "no-stops" },
        });
        assert.deepStrictEqual(graph.planTour("unsaved").problem, {
            code: "E_BAD_COMMAND",
            params: { missing: ["unsaved"], available: [] },
        });
        assert.isTrue(
            graph.planTour([
                { view: "a", hold: 300 },
                { view: "b", duration: 200 },
            ]).playable,
        );

        // Reduced motion makes a flight a held cut, so the tour lasts as long.
        graph.setReducedMotion(true);
        assert.strictEqual(graph.planTour({ stops }).totalMs, 650);
    });

    test("playTour refuses with the problem planTour reports, before the camera moves", async () => {
        const before = graph.getCameraState();
        const tour = [{ view: "a" }, { view: "flat", duration: 100 }];
        const planned = graph.planTour(tour).stops[1].problem;
        assert.deepStrictEqual(await refusalOf(graph.playTour(tour)), planned);
        assert.deepStrictEqual(await refusalOf(graph.playTour("unsaved")), graph.planTour("unsaved").problem);
        assert.isTrue(samePosition(graph.getCameraState(), before), "nothing moved");
    });

    test("a camera view registered later takes a stop's name, and views-changed says so", () => {
        let changed = 0;
        graph.on("views-changed", () => {
            changed++;
        });
        // In 3D a 2D saved view is a broken stop; a 3D camera view registered under its name is not.
        assert.strictEqual(graph.planTour([{ view: "flat" }]).stops[0].problem?.code, "E_UNSUPPORTED");
        registerCameraView({
            descriptor: { id: "flat", plainName: "Flat", description: "A fixed place.", modes: ["3d"], options: [] },
            compute: () => ({ position: { x: 5, y: 60, z: 5 }, target: { x: 0, y: 0, z: 0 } }),
        });
        assert.isAbove(changed, 0);
        assert.isNull(graph.planTour([{ view: "flat" }]).stops[0].problem);
    });

    test("views-changed fires when the tours change and when the drawing mode switches", async () => {
        let changed = 0;
        graph.on("views-changed", () => {
            changed++;
        });
        await graph.getSession().tours.save([{ name: "t", tour: { stops: [{ view: "a" }] } }]);
        assert.strictEqual(changed, 1);
        await graph.setViewMode("2d");
        assert.isAbove(changed, 1);
    });

    test("a finished tour with restoreCamera puts the camera back, and a later load still frames", async () => {
        const before = graph.getCameraState();
        const placedBefore = graph.isCameraPlaced();
        const reached: string[] = [];
        graph.on("tour-progress", (event) => reached.push(`${event.stop}:${event.phase}`));
        const ended: TourEndReason[] = [];
        graph.on("tour-ended", (event) => ended.push(event.reason));
        await graph.getSession().tours.save([
            {
                name: "walk",
                tour: {
                    stops: [
                        { view: "a", hold: 100 },
                        { view: "b", duration: 100, hold: 100 },
                    ],
                },
            },
        ]);

        const { reason } = await graph.playTour("walk", { restoreCamera: true });
        assert.strictEqual(reason, "finished");
        assert.deepStrictEqual(ended, ["finished"]);
        assert.deepStrictEqual(reached, ["0:hold", "1:flight", "1:hold"], "no flight phase for a jump");
        assert.isTrue(samePosition(graph.getCameraState(), before), "the camera is back");
        assert.strictEqual(graph.isCameraPlaced(), placedBefore, "the tour's own moves are not a placement");

        const framed = new Promise<void>((resolve) => {
            const off = graph.on("zoom-to-fit-complete", () => {
                off();
                resolve();
            });
        });
        await graph.addNodes([{ id: "d" }, { id: "e" }]);
        await framed;
    });

    test("a drag mid-tour over a settling layout interrupts it, and the camera stays where the drag left it", async () => {
        await graph.setLayout("ngraph", { seed: 1 });
        const holding = reaches(graph, 0, "hold");
        const playing = graph.playTour([
            { view: "a", hold: FOREVER },
            { view: "b", duration: 100 },
        ]);
        await holding;

        await drag(graph.canvas, { x: 10, y: 10 }, { x: 120, y: 80 });
        assert.deepStrictEqual(await playing, { reason: "interrupted" });
        const left = graph.getCameraState();
        assert.isFalse(samePosition(left, POSE_A), "the drag moved the camera");
        assert.isTrue(graph.isCameraPlaced(), "the reader placed the camera");

        await graph.waitForSettled();
        assert.isTrue(samePosition(graph.getCameraState(), left), "the settled layout did not snap it back");
    });

    test("a click on a node interrupts a tour", async () => {
        await graph.waitForStableFrame();
        const at = nodePoint(graph, "a");
        // The tour holds the camera where it stands, so the node stays under the point.
        const holding = reaches(graph, 0, "hold");
        const playing = graph.playTour([
            { view: graph.getCameraState(), hold: FOREVER },
            { view: "b", duration: 100 },
        ]);
        await holding;
        await click(graph.canvas, at);
        assert.deepStrictEqual(await playing, { reason: "interrupted" });
    });

    test("an abort cancels a tour, and the element frames a later load again", async () => {
        const controller = new AbortController();
        const holding = reaches(graph, 0, "hold");
        const playing = graph.playTour([{ view: "a", hold: FOREVER }], { signal: controller.signal });
        await holding;
        controller.abort();
        assert.deepStrictEqual(await playing, { reason: "cancelled" });
        assert.isFalse(graph.isCameraPlaced(), "the tour's placement went with it");

        const framed = new Promise<void>((resolve) => {
            const off = graph.on("zoom-to-fit-complete", () => {
                off();
                resolve();
            });
        });
        await graph.addNodes([{ id: "d" }]);
        await framed;
    });

    test("a screenshot with a camera replaces a tour; one without leaves it playing", async () => {
        const holding = reaches(graph, 0, "hold");
        let ended: TourEndReason | undefined;
        const playing = graph.playTour([{ view: "a", hold: FOREVER }]).then(({ reason }) => {
            ended = reason;
            return reason;
        });
        await holding;

        await graph.captureScreenshot({ format: "png" });
        assert.isUndefined(ended, "a screenshot without a camera does not end the tour");

        await graph.captureScreenshot({ format: "png", camera: { view: "b" } });
        assert.strictEqual(await playing, "replaced");
        assert.isFalse(graph.isCameraPlaced(), "the capture puts back the pre-tour placement");

        const framed = new Promise<void>((resolve) => {
            const off = graph.on("zoom-to-fit-complete", () => {
                off();
                resolve();
            });
        });
        await graph.addNodes([{ id: "d" }]);
        await framed;
    });

    test("setCameraState and another tour replace a tour; a mode switch ends it as mode-changed", async () => {
        let holding = reaches(graph, 0, "hold");
        const first = graph.playTour([{ view: "a", hold: FOREVER }]);
        await holding;
        await graph.setCameraState(POSE_B);
        assert.deepStrictEqual(await first, { reason: "replaced" });

        holding = reaches(graph, 0, "hold");
        const second = graph.playTour([{ view: "a", hold: FOREVER }]);
        await holding;
        holding = reaches(graph, 0, "hold");
        const third = graph.playTour([{ view: "b", hold: FOREVER }]);
        assert.deepStrictEqual(await second, { reason: "replaced" });
        await holding;

        await graph.setViewMode("2d");
        assert.deepStrictEqual(await third, { reason: "mode-changed" });
    });

    test("auto-rotate holds still through a tour's holds and turns again after it", async () => {
        graph.setLayoutBehavior({ camera: { autoRotate: 1 } });
        const holding = reaches(graph, 0, "hold");
        const controller = new AbortController();
        const playing = graph.playTour([{ view: "a", hold: FOREVER }], { signal: controller.signal });
        await holding;

        const at = graph.getCameraState();
        await rendered(graph, 5, () => true);
        assert.isTrue(samePosition(graph.getCameraState(), at), "still through five frames of the hold");

        controller.abort();
        await playing;
        const after = graph.getCameraState();
        // Settles on the first frame drawn with the camera turned; a camera that never turns hangs here.
        await rendered(graph, 1, () => !samePosition(graph.getCameraState(), after));
    });
});
