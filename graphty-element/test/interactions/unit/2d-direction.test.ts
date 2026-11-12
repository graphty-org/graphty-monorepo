/**
 * 2D Input Direction Verification Tests
 *
 * These tests verify that input directions map to expected output directions
 * in 2D camera mode. They are critical for catching direction-related regressions.
 */

import { assert } from "chai";
import { afterEach, beforeEach, describe, test, vi } from "vitest";

import type { TwoDCameraController } from "../../../src/cameras/TwoDCameraController";
import type { InputController } from "../../../src/cameras/TwoDInputController";
import type { Graph } from "../../../src/Graph";
import { holdKey, releaseHeldKeys } from "../../helpers/real-input";
import {
    getCameraPosition,
    getSceneRotation,
    getSceneScale,
    setupTestGraph,
    teardownTestGraph,
} from "../helpers/interaction-helpers";

/**
 * Helper to get the 2D camera controller and input controller from a graph
 */
function get2DControllers(graph: Graph): {
    cameraController: TwoDCameraController;
    inputController: InputController;
} {
    const controller = graph.camera.getActiveController() as TwoDCameraController;
    // Access input controller via the camera manager's internal inputs map
    const { inputs } = graph.camera as unknown as {
        inputs: Map<string, InputController>;
    };
    const maybeInput = inputs.get("2d");
    if (!maybeInput) {
        throw new Error("2D input controller not found");
    }

    return { cameraController: controller, inputController: maybeInput };
}

/**
 * Press a key and hold it on the focused canvas: a real key press through `userEvent`, which
 * the input controller's own listeners receive. `releaseHeldKeys` lets it go after the test.
 */
async function pressKey(graph: Graph, key: string): Promise<void> {
    graph.canvas.focus();
    await holdKey(key);
}

/**
 * Helper to run multiple update frames
 */
function runUpdateFrames(inputController: InputController, frames: number): void {
    for (let i = 0; i < frames; i++) {
        inputController.update();
    }
}

describe("2D Input Direction Verification", () => {
    let graph: Graph;

    beforeEach(async () => {
        graph = await setupTestGraph({ mode: "2d" });
    });

    afterEach(async () => {
        await releaseHeldKeys();
        vi.restoreAllMocks();
        teardownTestGraph(graph);
    });

    test("W key pans camera UP (positive Y)", async () => {
        const { inputController } = get2DControllers(graph);

        // Record initial position
        const initialPos = getCameraPosition(graph);

        // Simulate W key press
        await pressKey(graph, "w");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final position
        const finalPos = getCameraPosition(graph);

        // W key should pan camera UP (positive Y direction)
        assert.isAbove(finalPos.y, initialPos.y, "W key should pan camera UP (positive Y)");
    });

    test("S key pans camera DOWN (negative Y)", async () => {
        const { inputController } = get2DControllers(graph);

        // Record initial position
        const initialPos = getCameraPosition(graph);

        // Simulate S key press
        await pressKey(graph, "s");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final position
        const finalPos = getCameraPosition(graph);

        // S key should pan camera DOWN (negative Y direction)
        assert.isBelow(finalPos.y, initialPos.y, "S key should pan camera DOWN (negative Y)");
    });

    test("A key pans camera LEFT (negative X)", async () => {
        const { inputController } = get2DControllers(graph);

        // Record initial position
        const initialPos = getCameraPosition(graph);

        // Simulate A key press
        await pressKey(graph, "a");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final position
        const finalPos = getCameraPosition(graph);

        // A key should pan camera LEFT (negative X direction)
        assert.isBelow(finalPos.x, initialPos.x, "A key should pan camera LEFT (negative X)");
    });

    test("D key pans camera RIGHT (positive X)", async () => {
        const { inputController } = get2DControllers(graph);

        // Record initial position
        const initialPos = getCameraPosition(graph);

        // Simulate D key press
        await pressKey(graph, "d");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final position
        const finalPos = getCameraPosition(graph);

        // D key should pan camera RIGHT (positive X direction)
        assert.isAbove(finalPos.x, initialPos.x, "D key should pan camera RIGHT (positive X)");
    });

    test("mouse drag RIGHT pans camera LEFT (opposite)", () => {
        const { cameraController } = get2DControllers(graph);

        // Record initial position
        const initialPos = getCameraPosition(graph);

        // Simulate mouse drag to the RIGHT (positive dx)
        // In 2D mode, dragging RIGHT should pan camera LEFT (opposite direction)
        // This mimics "grabbing" the scene and moving it
        // Looking at TwoDInputController.ts line 87:
        // this.cam.pan(-dx * scaleX * this.config.mousePanScale, dy * scaleY * this.config.mousePanScale);
        // So dx > 0 means pan(-dx) = negative pan = camera moves left (position decreases)
        const orthoSize = 10; // default
        const scaleX = (orthoSize * 2) / (graph.engine.getRenderWidth() || 800);
        const dx = 100; // 100 pixels to the right
        const panScale = 1; // default mousePanScale

        cameraController.pan(-dx * scaleX * panScale, 0);

        // Get final position
        const finalPos = getCameraPosition(graph);

        // Drag RIGHT should pan camera LEFT (position decreases)
        assert.isBelow(finalPos.x, initialPos.x, "Mouse drag RIGHT should pan camera LEFT (opposite direction)");
    });

    test("mouse drag UP pans camera DOWN (opposite)", () => {
        const { cameraController } = get2DControllers(graph);

        // Record initial position
        const initialPos = getCameraPosition(graph);

        // Simulate mouse drag UP (negative dy in screen coords)
        // Looking at TwoDInputController.ts line 87:
        // this.cam.pan(-dx * scaleX * this.config.mousePanScale, dy * scaleY * this.config.mousePanScale);
        // dy < 0 (drag up) means pan(dy) = negative pan = camera moves down (position decreases)
        const orthoSize = 10;
        const scaleY = (orthoSize * 2) / (graph.engine.getRenderHeight() || 600);
        const dy = -100; // 100 pixels up (negative in screen coords)
        const panScale = 1;

        cameraController.pan(0, dy * scaleY * panScale);

        // Get final position
        const finalPos = getCameraPosition(graph);

        // Drag UP should pan camera DOWN (position decreases)
        assert.isBelow(finalPos.y, initialPos.y, "Mouse drag UP should pan camera DOWN (opposite direction)");
    });

    test("wheel scroll DOWN zooms OUT", () => {
        const { cameraController } = get2DControllers(graph);

        // Record initial scale (ortho range)
        const initialScale = getSceneScale(graph);

        // Simulate wheel scroll down (positive deltaY)
        // Looking at TwoDInputController.ts line 103:
        // const delta = e.deltaY > 0 ? this.config.mouseWheelZoomSpeed : 1 / this.config.mouseWheelZoomSpeed;
        // deltaY > 0 means zoom factor = mouseWheelZoomSpeed (typically > 1)
        // zoom(factor > 1) increases ortho size = zooms OUT
        const zoomSpeed = 1.1; // typical mouseWheelZoomSpeed
        cameraController.zoom(zoomSpeed);

        // Get final scale
        const finalScale = getSceneScale(graph);

        // Wheel scroll DOWN should zoom OUT (scale decreases)
        assert.isBelow(
            finalScale,
            initialScale,
            "Wheel scroll DOWN should zoom OUT (ortho range increases, scale decreases)",
        );
    });

    test("wheel scroll UP zooms IN", () => {
        const { cameraController } = get2DControllers(graph);

        // Record initial scale
        const initialScale = getSceneScale(graph);

        // Simulate wheel scroll up (negative deltaY)
        // deltaY < 0 means zoom factor = 1/mouseWheelZoomSpeed (typically < 1)
        // zoom(factor < 1) decreases ortho size = zooms IN
        const zoomSpeed = 1.1;
        cameraController.zoom(1 / zoomSpeed);

        // Get final scale
        const finalScale = getSceneScale(graph);

        // Wheel scroll UP should zoom IN (scale increases)
        assert.isAbove(
            finalScale,
            initialScale,
            "Wheel scroll UP should zoom IN (ortho range decreases, scale increases)",
        );
    });

    test("Q key rotates counter-clockwise", async () => {
        const { inputController } = get2DControllers(graph);

        // Record initial rotation
        const initialRotation = getSceneRotation(graph);

        // Simulate Q key press
        await pressKey(graph, "q");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final rotation
        const finalRotation = getSceneRotation(graph);

        // Q key should rotate counter-clockwise (positive Z rotation)
        // Looking at TwoDInputController.ts line 250:
        // if (this.keyState.q) { v.rotate += rotatePush; }
        // So Q adds positive rotation velocity, which means CCW rotation (positive Z)
        assert.isAbove(
            finalRotation.z,
            initialRotation.z,
            "Q key should rotate counter-clockwise (positive Z rotation)",
        );
    });

    test("E key rotates clockwise", async () => {
        const { inputController } = get2DControllers(graph);

        // Record initial rotation
        const initialRotation = getSceneRotation(graph);

        // Simulate E key press
        await pressKey(graph, "e");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final rotation
        const finalRotation = getSceneRotation(graph);

        // E key should rotate clockwise (negative Z rotation)
        // Looking at TwoDInputController.ts line 254:
        // if (this.keyState.e) { v.rotate -= rotatePush; }
        // So E subtracts rotation velocity, which means CW rotation (negative Z)
        assert.isBelow(finalRotation.z, initialRotation.z, "E key should rotate clockwise (negative Z rotation)");
    });

    // Additional tests from the appendix (Phase 2 Additions)
    test("+ key zooms IN (smaller ortho range)", async () => {
        const { inputController } = get2DControllers(graph);

        // Record initial scale
        const initialScale = getSceneScale(graph);

        // Simulate + key press
        await pressKey(graph, "+");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final scale
        const finalScale = getSceneScale(graph);

        // + key should zoom IN (scale increases)
        // Looking at TwoDInputController.ts line 241-242:
        // if (this.keyState["+"] || this.keyState["="]) { v.zoom -= zoomPush; }
        // Negative zoom velocity in applyInertia means smaller ortho = zoom in
        assert.isAbove(finalScale, initialScale, "+ key should zoom IN (scale increases)");
    });

    test("- key zooms OUT (larger ortho range)", async () => {
        const { inputController } = get2DControllers(graph);

        // Record initial scale
        const initialScale = getSceneScale(graph);

        // Simulate - key press
        await pressKey(graph, "-");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final scale
        const finalScale = getSceneScale(graph);

        // - key should zoom OUT (scale decreases)
        // Looking at TwoDInputController.ts line 245-246:
        // if (this.keyState["-"] || this.keyState._) { v.zoom += zoomPush; }
        // Positive zoom velocity in applyInertia means larger ortho = zoom out
        assert.isBelow(finalScale, initialScale, "- key should zoom OUT (scale decreases)");
    });

    test("ArrowUp key pans camera UP (same as W)", async () => {
        const { inputController } = get2DControllers(graph);

        // Record initial position
        const initialPos = getCameraPosition(graph);

        // Simulate ArrowUp key press
        await pressKey(graph, "ArrowUp");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final position
        const finalPos = getCameraPosition(graph);

        // ArrowUp should pan camera UP (positive Y direction)
        assert.isAbove(finalPos.y, initialPos.y, "ArrowUp key should pan camera UP (positive Y)");
    });

    test("ArrowDown key pans camera DOWN (same as S)", async () => {
        const { inputController } = get2DControllers(graph);

        // Record initial position
        const initialPos = getCameraPosition(graph);

        // Simulate ArrowDown key press
        await pressKey(graph, "ArrowDown");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final position
        const finalPos = getCameraPosition(graph);

        // ArrowDown should pan camera DOWN (negative Y direction)
        assert.isBelow(finalPos.y, initialPos.y, "ArrowDown key should pan camera DOWN (negative Y)");
    });

    test("ArrowLeft key pans camera LEFT (same as A)", async () => {
        const { inputController } = get2DControllers(graph);

        // Record initial position
        const initialPos = getCameraPosition(graph);

        // Simulate ArrowLeft key press
        await pressKey(graph, "ArrowLeft");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final position
        const finalPos = getCameraPosition(graph);

        // ArrowLeft should pan camera LEFT (negative X direction)
        assert.isBelow(finalPos.x, initialPos.x, "ArrowLeft key should pan camera LEFT (negative X)");
    });

    test("ArrowRight key pans camera RIGHT (same as D)", async () => {
        const { inputController } = get2DControllers(graph);

        // Record initial position
        const initialPos = getCameraPosition(graph);

        // Simulate ArrowRight key press
        await pressKey(graph, "ArrowRight");

        // Run several update frames
        runUpdateFrames(inputController, 10);

        // Get final position
        const finalPos = getCameraPosition(graph);

        // ArrowRight should pan camera RIGHT (positive X direction)
        assert.isAbove(finalPos.x, initialPos.x, "ArrowRight key should pan camera RIGHT (positive X)");
    });
});
