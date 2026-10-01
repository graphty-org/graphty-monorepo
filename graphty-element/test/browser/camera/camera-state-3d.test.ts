import { afterEach, assert, test } from "vitest";

import type { CameraStateChangedEvent } from "../../../src/events.js";
import { Graph } from "../../../src/Graph.js";
import { cleanupTestGraph, createTestGraph } from "../../helpers/testSetup.js";

let graph: Graph;

afterEach(() => {
    cleanupTestGraph(graph);
});

test("getCameraState returns camera state with position and target", async () => {
    graph = await createTestGraph();

    const state = graph.getCameraState();

    // Should have position and target (from OrbitCameraController)
    assert.ok(state.position);
    assert.ok(state.target);
    assert.ok(typeof state.position.x === "number");
    assert.ok(typeof state.position.y === "number");
    assert.ok(typeof state.position.z === "number");
});

test("setCameraState applies state correctly", async () => {
    graph = await createTestGraph();

    await graph.setCameraState({
        position: { x: 20, y: 20, z: 20 },
        target: { x: 5, y: 5, z: 5 },
    });

    const newState = graph.getCameraState();

    // Position and target should be close to what we set (may not be exact due to controller logic)
    assert.ok(newState.position);
    assert.ok(newState.target);
    assert.ok(Math.abs(newState.position.x - 20) < 5);
    assert.ok(Math.abs(newState.position.y - 20) < 5);
    assert.ok(Math.abs(newState.position.z - 20) < 5);
    assert.ok(Math.abs(newState.target.x - 5) < 5);
    assert.ok(Math.abs(newState.target.y - 5) < 5);
    assert.ok(Math.abs(newState.target.z - 5) < 5);
});

test("setCameraState with animation completes", async () => {
    graph = await createTestGraph();

    const startState = graph.getCameraState();
    assert.ok(startState.position);

    await graph.setCameraState(
        {
            position: { x: 10, y: 10, z: 10 },
            target: { x: 0, y: 0, z: 0 },
        },
        { animate: true, duration: 500 },
    );

    const endState = graph.getCameraState();
    assert.ok(endState.position);

    // State should have changed
    const moved =
        Math.abs(endState.position.x - startState.position.x) > 0.1 ||
        Math.abs(endState.position.y - startState.position.y) > 0.1 ||
        Math.abs(endState.position.z - startState.position.z) > 0.1;
    assert.ok(moved);
});

test("camera-state-changed event fires when state changes", async () => {
    graph = await createTestGraph();

    let eventFired = false;
    let eventDetail: CameraStateChangedEvent | undefined;

    const listenerId = graph.eventManager.addListener("camera-state-changed", (e) => {
        eventFired = true;
        eventDetail = e as CameraStateChangedEvent;
    });

    await graph.setCameraState({
        position: { x: 20, y: 20, z: 20 },
        target: { x: 0, y: 0, z: 0 },
    });

    assert.ok(eventFired);
    assert.ok(eventDetail?.state);

    // Clean up
    graph.eventManager.removeListener(listenerId);
});

// The orbit camera's configured zoom floor (RenderManager's minZoomDistance). A saved state or a
// preset that asks for less used to be applied as given, and the first zoom in then snapped the
// camera outwards to the floor.
const MIN_ZOOM_DISTANCE = 2;

test("setCameraState floors a distance below the zoom minimum, immediately and animated", async () => {
    graph = await createTestGraph();

    await graph.setCameraState({ target: { x: 0, y: 0, z: 0 }, cameraDistance: 0.1 });
    assert.strictEqual(graph.getCameraState().cameraDistance, MIN_ZOOM_DISTANCE);

    await graph.setCameraState({ target: { x: 0, y: 0, z: 0 }, cameraDistance: 50 });
    await graph.setCameraState({ target: { x: 0, y: 0, z: 0 }, cameraDistance: 0.1 }, { animate: true, duration: 100 });
    assert.strictEqual(graph.getCameraState().cameraDistance, MIN_ZOOM_DISTANCE);

    // A position closer to the target than the floor is floored the same way.
    await graph.setCameraState({ position: { x: 0, y: 0, z: 0.5 }, target: { x: 0, y: 0, z: 0 } });
    assert.strictEqual(graph.getCameraState().cameraDistance, MIN_ZOOM_DISTANCE);
});

test("setCameraState keeps a distance beyond the zoom-out ceiling, immediately and animated", async () => {
    graph = await createTestGraph();

    await graph.setCameraState({ target: { x: 0, y: 0, z: 0 }, cameraDistance: 1e6 });
    assert.strictEqual(graph.getCameraState().cameraDistance, 1e6);

    await graph.setCameraState({ target: { x: 0, y: 0, z: 0 }, cameraDistance: 50 });
    await graph.setCameraState({ target: { x: 0, y: 0, z: 0 }, cameraDistance: 1e6 }, { animate: true, duration: 100 });
    assert.strictEqual(graph.getCameraState().cameraDistance, 1e6);
});
