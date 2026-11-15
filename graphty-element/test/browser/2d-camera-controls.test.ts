import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, expect, test, vi } from "vitest";

import { TwoDCameraController } from "../../src/cameras/TwoDCameraController";
import { Graph } from "../../src/Graph";
import type { CameraState } from "../../src/screenshot/types";
import { click, drag, holdKey, releaseHeldKeys, releaseKey, wheel } from "../helpers/real-input";
import { cleanupTestGraph, createTestGraph, setBehavior } from "../helpers/testSetup";

describe("2D Camera Controls", () => {
    let graph: Graph;
    let cameraController: TwoDCameraController;

    beforeEach(async () => {
        // Create test graph
        graph = await createTestGraph();

        graph.setBackground({ backgroundType: "color", color: "#f0f0f0" });
        setBehavior(graph, { layout: { minDelta: 0.001, zoomStepInterval: 5 } });
        await graph.setViewMode("2d");
        await graph.setLayout("ngraph");

        // Wait for the view change and the layout to finish on the queue
        await graph.waitForSettled();

        const controller = graph.camera.getActiveController();
        assert.instanceOf(controller, TwoDCameraController, "2D mode uses the 2D camera");
        cameraController = controller;
    });

    afterEach(async () => {
        await releaseHeldKeys();
        cleanupTestGraph(graph);
    });

    test("mouse pan updates camera position", async () => {
        const initialPos = new Vector3(
            cameraController.camera.position.x,
            cameraController.camera.position.y,
            cameraController.camera.position.z,
        );

        // A real drag across the canvas
        await drag(graph.canvas, { x: 100, y: 100 }, { x: 200, y: 150 });

        // Camera position should have changed
        assert.notEqual(cameraController.camera.position.x, initialPos.x);
        assert.notEqual(cameraController.camera.position.y, initialPos.y);
    });

    /** What a camera key moves, read from `getCameraState`. */
    const PAN_Y = (state: CameraState): number => state.pan?.y ?? Number.NaN;
    const PAN_X = (state: CameraState): number => state.pan?.x ?? Number.NaN;
    const ZOOM = (state: CameraState): number => state.zoom ?? Number.NaN;
    const ROLL = (state: CameraState): number => state.rotation ?? Number.NaN;

    // Each key on a fresh graph, so nothing a key before it left coasting adds to its move.
    test.for([
        ["w", PAN_Y, 1],
        ["s", PAN_Y, -1],
        ["a", PAN_X, -1],
        ["d", PAN_X, 1],
        ["ArrowUp", PAN_Y, 1],
        ["ArrowDown", PAN_Y, -1],
        ["ArrowLeft", PAN_X, -1],
        ["ArrowRight", PAN_X, 1],
        ["+", ZOOM, 1],
        ["=", ZOOM, 1],
        ["-", ZOOM, -1],
        ["q", ROLL, -1],
        ["e", ROLL, 1],
    ] as const)("the %s key moves the camera", async ([key, read, sign]) => {
        graph.canvas.focus();
        const before = read(graph.getCameraState());

        await holdKey(key);
        graph.camera.update();
        const moved = read(graph.getCameraState()) - before;
        await releaseKey(key);

        assert.isAbove(moved * sign, 0, `${key} moved the camera the expected way (moved ${moved})`);
    });

    test("mouse wheel zooms camera", async () => {
        const initialOrthoTop = cameraController.camera.orthoTop;
        const initialOrthoBottom = cameraController.camera.orthoBottom;
        const initialZoom = (initialOrthoTop ?? 1) - (initialOrthoBottom ?? -1);

        // A real wheel turn toward the reader (negative deltaY) over the canvas
        await wheel(graph.canvas, { x: 100, y: 100 }, -100);

        await expect
            .poll(() => (cameraController.camera.orthoTop ?? 1) - (cameraController.camera.orthoBottom ?? -1), {
                message: "Negative wheel delta should zoom in (decrease ortho range)",
            })
            .toBeLessThan(initialZoom);
    });

    test("a wheel turn on two axes zooms one step", async () => {
        const range = (): number =>
            (cameraController.camera.orthoTop ?? 1) - (cameraController.camera.orthoBottom ?? -1);
        const before = range();

        // A trackpad turn: Babylon raises one POINTERWHEEL per changed axis (issue #2937)
        await wheel(graph.canvas, { x: 100, y: 100 }, 100, 10);

        await expect.poll(range, { message: "the wheel zoomed out" }).toBeGreaterThan(before);
        assert.closeTo(range() / before, 1.1, 1e-6, "exactly one zoom step of mouseWheelZoomSpeed");
    });

    test("canvas gains focus on pointer down", async () => {
        const { canvas } = graph;

        (document.activeElement as HTMLElement | null)?.blur();
        const focusSpy = vi.spyOn(canvas, "focus");

        // A real click on the canvas
        await click(canvas, { x: 100, y: 100 });

        // Canvas should have been focused. A real click focuses it more than once, on purpose: the
        // render manager focuses on the press and on the release (standing in for Babylon's own
        // handler), and the 2D input controller on the press.
        assert.isAtLeast(focusSpy.mock.calls.length, 1, "the element focused the canvas");
        assert.strictEqual(document.activeElement, canvas, "the canvas has focus");
    });

    test("canvas is made focusable with tabindex", () => {
        const { canvas } = graph;

        // Canvas should have tabindex attribute for keyboard focus
        assert.equal(canvas.getAttribute("tabindex"), "0");
    });

    test("disabled input does not move the camera, and enabled input does again", async () => {
        const { canvas } = graph;
        canvas.focus();

        // Compared as JSON: the frame's inertia step turns a resting roll of 0 into -0, which is no move
        const view = (): string => JSON.stringify(graph.getCameraState());
        graph.camera.temporarilyDisableInput();
        const before = view();
        await drag(canvas, { x: 100, y: 100 }, { x: 200, y: 150 });
        await wheel(canvas, { x: 100, y: 100 }, -100);
        await holdKey("w");
        graph.camera.update();
        assert.equal(view(), before, "neither mouse, wheel nor key moved the camera");

        // Let go of the key the disabled controller never heard, as a reader would before trying again
        await releaseKey("w");
        graph.camera.temporarilyEnableInput();
        await drag(canvas, { x: 100, y: 100 }, { x: 200, y: 150 });
        assert.notEqual(view(), before, "the drag moved the camera once input was enabled");
    });

    test("velocity components start at zero", () => {
        assert.equal(cameraController.velocity.x, 0);
        assert.equal(cameraController.velocity.y, 0);
        assert.equal(cameraController.velocity.zoom, 0);
        assert.equal(cameraController.velocity.rotate, 0);
    });
});
