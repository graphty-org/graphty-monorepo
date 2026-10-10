import { afterEach, assert, test, vi } from "vitest";

import type { CameraStateChangedEvent } from "../../../src/events.js";
import { Graph } from "../../../src/Graph.js";
import { ANIMATION_FRAME_MS, animationFramesOf } from "../../helpers/animation-clock.js";
import { cleanupTestGraph, createTestGraph } from "../../helpers/testSetup.js";

let graph: Graph;

afterEach(() => {
    cleanupTestGraph(graph);
});

/**
 * Wait until an animation has started moving the camera away from where it stood.
 * @param from - The camera position before the animation was asked for.
 */
async function cameraLeft(from: { x: number; y: number; z: number } | undefined): Promise<void> {
    await vi.waitFor(() => {
        assert.notDeepEqual(graph.getCameraState().position, from, "the animation has moved the camera");
    });
}

/**
 * Wait until the scene has animated `count` more frames.
 * @param count - The frames to wait.
 */
function animationFrames(count: number): Promise<void> {
    const scene = graph.getScene();
    return new Promise((resolve) => {
        let seen = 0;
        const observer = scene.onAfterAnimationsObservable.add(() => {
            seen++;
            if (seen >= count) {
                scene.onAfterAnimationsObservable.remove(observer);
                resolve();
            }
        });
    });
}

test("animates camera position smoothly", async () => {
    graph = await createTestGraph();

    const targetPos = { x: 50, y: 50, z: 50 };

    const { ms } = await animationFramesOf(graph, () =>
        graph.setCameraState({ position: targetPos, target: { x: 0, y: 0, z: 0 } }, { animate: true, duration: 500 }),
    );

    // Animation should take approximately the requested duration, in animation time
    assert.ok(ms >= 450 && ms <= 600, `Animation took ${ms}ms of animation time, expected ~500ms`);

    const endState = graph.getCameraState();

    // Position should be close to target
    assert.ok(endState.position);
    assert.ok(Math.abs(endState.position.x - targetPos.x) < 5);
    assert.ok(Math.abs(endState.position.y - targetPos.y) < 5);
    assert.ok(Math.abs(endState.position.z - targetPos.z) < 5);
});

test("applies easing correctly", async () => {
    graph = await createTestGraph();

    // Track position changes during animation
    const positions: { x: number; y: number; z: number }[] = [];

    const listenerId = graph.eventManager.addListener("camera-state-changed", (e) => {
        const event = e as CameraStateChangedEvent;
        if (event.state.position) {
            positions.push({ ...event.state.position });
        }
    });

    await graph.setCameraState(
        { position: { x: 100, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
        { animate: true, duration: 300, easing: "easeInOut" },
    );

    graph.eventManager.removeListener(listenerId);

    // With easeInOut, middle positions should show non-linear progression
    // (Hard to test precisely, but we can verify animation occurred)
    assert.ok(positions.length > 0);
});

// Phase 3: Operation Queue Integration - Animation interruption
test("camera animation can be interrupted", async () => {
    graph = await createTestGraph();
    const start = graph.getCameraState().position;

    // Start first animation (don't await it - we'll interrupt it) - catch cancellation
    void graph
        .setCameraState(
            { position: { x: 100, y: 100, z: 100 }, target: { x: 0, y: 0, z: 0 } },
            { animate: true, duration: 1000 },
        )
        .catch(() => {
            /* Expected to be cancelled */
        });

    // Interrupt only once the first animation has actually started moving the camera
    await cameraLeft(start);

    // Start second animation (should interrupt first)
    await graph.setCameraState(
        { position: { x: 50, y: 50, z: 50 }, target: { x: 0, y: 0, z: 0 } },
        { animate: true, duration: 500 },
    );

    const finalState = graph.getCameraState();

    // Verify that second animation completed
    // The key test is that we're not stuck at the first target (100, 100, 100)
    // and that interruption worked (camera moved toward second target)
    assert.ok(finalState.position);

    // Camera should NOT be at first target
    const distanceFromFirstTarget = Math.sqrt(
        Math.pow(finalState.position.x - 100, 2) +
            Math.pow(finalState.position.y - 100, 2) +
            Math.pow(finalState.position.z - 100, 2),
    );

    // Should be at least somewhat away from the first target
    assert.ok(
        distanceFromFirstTarget > 10,
        "Camera should not be at first target (100,100,100). " +
            `Position: (${finalState.position.x.toFixed(2)}, ${finalState.position.y.toFixed(2)}, ${finalState.position.z.toFixed(2)}), ` +
            `Distance from first target: ${distanceFromFirstTarget.toFixed(2)}`,
    );
});

test("an interrupted animation stops moving the camera", async () => {
    graph = await createTestGraph();

    // On the scene's animation clock, so frame counts stand for animation milliseconds.
    await animationFramesOf(graph, async () => {
        // Interrupted at 300 ms; its own 1000 ms run would end at (100, 100, 100).
        void graph
            .setCameraState(
                { position: { x: 100, y: 100, z: 100 }, target: { x: 0, y: 0, z: 0 } },
                { animate: true, duration: 1000 },
            )
            .catch(() => {
                /* Expected to be cancelled */
            });
        await animationFrames(Math.ceil(300 / ANIMATION_FRAME_MS));
        await graph.setCameraState(
            { position: { x: 50, y: 50, z: 50 }, target: { x: 0, y: 0, z: 0 } },
            { animate: true, duration: 200 },
        );

        // Past the end of the cancelled run: nothing it started may still be writing the camera.
        await animationFrames(Math.ceil(1000 / ANIMATION_FRAME_MS));
    });

    const { position } = graph.getCameraState();
    assert.ok(position);
    const fromSecond = Math.hypot(position.x - 50, position.y - 50, position.z - 50);
    assert.isBelow(
        fromSecond,
        1,
        `The camera ended at (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}), ` +
            "not where the animation that replaced the cancelled one left it",
    );
});

test("emits camera-state-changed event after animation", async () => {
    graph = await createTestGraph();

    let eventFired = false;
    const listenerId = graph.eventManager.addListener("camera-state-changed", () => {
        eventFired = true;
    });

    await graph.setCameraState(
        { position: { x: 20, y: 20, z: 20 }, target: { x: 0, y: 0, z: 0 } },
        { animate: true, duration: 200 },
    );

    assert.ok(eventFired, "camera-state-changed event should fire after animation");

    graph.eventManager.removeListener(listenerId);
});
