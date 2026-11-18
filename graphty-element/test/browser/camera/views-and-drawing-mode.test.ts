/**
 * @file Views and the drawing mode, on a real element: `viewProblem` answers what
 * `applyCameraView` would do, every camera door refuses a state the drawing mode does not read
 * instead of silently doing nothing, a camera view registered later takes a saved view's name,
 * `getCameraState()` says which mode its state belongs to, and two linked views in different modes
 * leave each other alone.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { clearRegisteredCamerasForTesting, isGraphtyError, registerCameraView } from "../../../extend";
import { type Graphty, linkCameras } from "../../../index.js";
import { Graph, operationQueueOf } from "../../../src/Graph.js";
import type { CodedFact } from "../../../src/session/shared";

/** A 3D state that a 2D camera reads nothing of. */
const DEEP = { mode: "3d" as const, position: { x: 30, y: 20, z: 10 }, target: { x: 0, y: 0, z: 0 } };

/**
 * The refusal a promise rejected with, as the coded fact `viewProblem` would give.
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

describe("views and the drawing mode", () => {
    let graph: Graph;
    let container: HTMLElement;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setLayout("circular");
        await graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await graph.addEdges([{ src: "a", dst: "b" }]);
        await operationQueueOf(graph).waitForCompletion();
    });

    afterEach(() => {
        clearRegisteredCamerasForTesting();
        graph.dispose();
        container.remove();
    });

    test("getCameraState says which mode its state belongs to", async () => {
        assert.strictEqual(graph.getCameraState().mode, "3d");
        await graph.setViewMode("2d");
        assert.strictEqual(graph.getCameraState().mode, "2d");
    });

    test("viewProblem answers what applyCameraView refuses, with the same params", async () => {
        await graph.getSession().views.save([{ name: "deep", camera: DEEP }]);
        await graph.setViewMode("2d");

        const cameraView = graph.viewProblem("frontView");
        assert.deepStrictEqual(cameraView, {
            code: "E_UNSUPPORTED",
            params: { reason: "mode", name: "frontView", modes: ["3d"], mode: "2d" },
        });
        assert.deepStrictEqual(await refusalOf(graph.applyCameraView("frontView")), cameraView);

        const saved = graph.viewProblem("deep");
        assert.deepStrictEqual(saved, {
            code: "E_UNSUPPORTED",
            params: { reason: "mode", name: "deep", modes: ["3d"], mode: "2d" },
        });
        assert.deepStrictEqual(await refusalOf(graph.applyCameraView("deep")), saved);
        assert.isNull(graph.viewProblem("fitToGraph"));

        const unknown = graph.viewProblem("nowhere");
        assert.strictEqual(unknown?.code, "E_UNKNOWN_CAMERA");
        assert.strictEqual(unknown?.params.name, "nowhere");
        assert.includeMembers(unknown?.params.available as string[], ["fitToGraph", "deep"]);
        assert.deepStrictEqual(await refusalOf(graph.applyCameraView("nowhere")), unknown);

        const empty = graph.viewProblem("");
        assert.deepStrictEqual(empty, { code: "E_BAD_COMMAND", params: { reason: "empty-name" } });
        assert.deepStrictEqual(await refusalOf(graph.applyCameraView("")), empty);
    });

    test("zoomToSelection in 2D pans the selection's center into view instead of refusing", async () => {
        await graph.setViewMode("2d");
        await graph.getSession().selection.apply({ nodes: ["a"] });
        const { zoom } = graph.getCameraState();

        await graph.zoomToSelection();

        const center = graph.getNode("a")?.drawnPosition;
        assert.isDefined(center);
        const after = graph.getCameraState();
        assert.closeTo(after.pan?.x ?? Number.NaN, center.x, 1e-3);
        assert.closeTo(after.pan?.y ?? Number.NaN, center.y, 1e-3);
        assert.strictEqual(after.zoom, zoom, "the zoom is kept");
    });

    test("every door refuses a state the drawing mode does not read", async () => {
        await graph.getSession().views.save([{ name: "deep", camera: DEEP }]);
        // In 3D: a 2D-only state is refused, and nothing moves.
        const before = graph.getCameraState();
        const zoomOnly = await refusalOf(graph.setCameraState({ zoom: 2 }));
        assert.deepStrictEqual(zoomOnly, {
            code: "E_UNSUPPORTED",
            params: { reason: "mode", modes: ["2d"], mode: "3d" },
        });
        assert.strictEqual((await refusalOf(graph.setCameraZoom(2)))?.code, "E_UNSUPPORTED");
        assert.deepStrictEqual(graph.getCameraState().position, before.position, "nothing moved");

        await graph.setViewMode("2d");
        const flat = graph.getCameraState();
        const doors: [string, () => Promise<unknown>][] = [
            ["setCameraState({ target })", () => graph.setCameraState({ target: { x: 1, y: 1, z: 1 } })],
            ["setCameraState(saved)", () => graph.setCameraState(DEEP)],
            ["setCameraPosition", () => graph.setCameraPosition({ x: 1, y: 2, z: 3 })],
            ["loadCameraPreset", () => graph.loadCameraPreset("deep")],
            ["applyCameraView", () => graph.applyCameraView("deep")],
            [
                "view.camera",
                () =>
                    graph
                        .getSession()
                        .execute({ op: "view.camera", position: { x: 1, y: 2, z: 3 }, target: { x: 0, y: 0, z: 0 } }),
            ],
            ["captureScreenshot camera", () => graph.captureScreenshot({ camera: { view: "deep" } })],
        ];
        for (const [door, call] of doors) {
            const refused = await refusalOf(call());
            assert.strictEqual(refused?.code, "E_UNSUPPORTED", door);
            assert.strictEqual(refused?.params.reason, "mode", door);
            assert.strictEqual(refused?.params.mode, "2d", door);
        }
        assert.deepStrictEqual(graph.getCameraState(), flat, "the 2D camera did not move");

        // A state that fits still lands: an empty state changes nothing, a zoom moves.
        await graph.setCameraState({});
        await graph.setCameraState({ zoom: 2 });
        assert.closeTo(graph.getCameraState().zoom ?? Number.NaN, 2, 1e-6);
    });

    test("a camera view registered later takes a saved view's name", async () => {
        await graph.getSession().views.save([{ name: "corner", camera: DEEP }]);
        assert.isNull(graph.viewProblem("corner", { saved: true }));

        registerCameraView({
            descriptor: {
                id: "corner",
                plainName: "Corner",
                description: "Stands at a fixed place.",
                modes: ["3d"],
                options: [],
            },
            compute: () => ({ position: { x: 5, y: 60, z: 5 }, target: { x: 0, y: 0, z: 0 } }),
        });

        assert.isNull(graph.viewProblem("corner"));
        assert.deepStrictEqual(graph.viewProblem("corner", { saved: true }), {
            code: "E_PROTECTED",
            params: { name: "corner" },
        });
        await graph.applyCameraView("corner");
        assert.closeTo(graph.getCameraState().position?.y ?? Number.NaN, 60, 0.5, "the camera view won the name");

        // Renaming the saved view recovers it.
        await graph.getSession().views.rename("corner", "my corner");
        assert.isNull(graph.viewProblem("my corner", { saved: true }));
    });

    test("views.save with no camera keeps where the camera stands, with its mode", async () => {
        await graph.setCameraState(DEEP);
        await graph.getSession().views.save([{ name: "here" }]);
        const saved = graph.getSession().views.get("here");
        assert.strictEqual(saved?.mode, "3d");
        assert.closeTo(saved?.position?.x ?? Number.NaN, 30, 0.5);
    });

    test("getCanvasSize reports the drawing surface in device pixels", () => {
        const size = graph.getCanvasSize();
        const engine = graph.getScene().getEngine();
        assert.strictEqual(size.width, engine.getRenderWidth());
        assert.strictEqual(size.height, engine.getRenderHeight());
        assert.isAbove(size.devicePixelRatio, 0);
    });
});

describe("linked views in different drawing modes", () => {
    const elements: Graphty[] = [];

    afterEach(() => {
        for (const element of elements.splice(0)) {
            element.remove();
        }
    });

    /**
     * A drawn element in a drawing mode.
     * @param mode - 2D or 3D.
     * @returns The element, settled.
     */
    async function drawn(mode: "2d" | "3d"): Promise<Graphty> {
        const element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "300px";
        element.style.height = "200px";
        element.viewMode = mode;
        document.body.append(element);
        elements.push(element);
        element.nodeData = [{ id: "a" }, { id: "b" }];
        element.edgeData = [{ src: "a", dst: "b" }];
        element.layout = "circular";
        await element.waitForSettled();
        return element;
    }

    test("a move in the 3D view leaves the 2D view alone and raises nothing", async () => {
        const deep = await drawn("3d");
        const flat = await drawn("2d");
        const before = flat.getCameraState();
        linkCameras(deep, flat);

        const reported = new Promise<void>((resolve) => {
            deep.addEventListener("overview-changed", () => {
                resolve();
            });
        });
        await deep.setCameraState(DEEP);
        await reported;

        assert.deepStrictEqual(flat.getCameraState(), before);
    });
});
