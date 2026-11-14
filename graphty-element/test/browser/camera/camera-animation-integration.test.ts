import { afterEach, assert, test, vi } from "vitest";

import { Graph } from "../../../src/Graph.js";
import { ANIMATION_FRAME_MS, animationFramesOf, cameraStateAtFrame } from "../../helpers/animation-clock.js";
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
 * Assert a camera position is within 0.5 of an expected one on every axis.
 * @param actual - The position the camera reports.
 * @param expected - The position it should be at.
 * @param what - What the position is, for the failure message.
 */
function assertNear(
    actual: { x: number; y: number; z: number } | undefined,
    expected: { x: number; y: number; z: number },
    what: string,
): void {
    assert.isDefined(actual, `${what} is reported`);
    assert.closeTo(actual.x, expected.x, 0.5, `${what} x`);
    assert.closeTo(actual.y, expected.y, 0.5, `${what} y`);
    assert.closeTo(actual.z, expected.z, 0.5, `${what} z`);
}

/**
 * Phase 2 Integration Tests
 * These tests verify:
 * 1. All easing modes work correctly and produce different results
 * 2. Camera distance animation works
 * 3. Camera animation works during layout (integration with layout engine)
 * 4. Animation completion detection is accurate
 */

test("all easing modes produce different results", async () => {
    graph = await createTestGraph();

    const start = { x: 0, y: 0, z: 50 };
    const targetPos = { x: 100, y: 100, z: 100 };
    const targetState = { position: targetPos, target: { x: 0, y: 0, z: 0 } };

    // How far along its distance the camera is a quarter of the way through a 25-frame (400 ms)
    // animation, read on the constant animation clock so every easing is sampled at the same moment
    const progress: Record<string, number> = {};
    for (const easing of ["linear", "easeIn", "easeOut", "easeInOut"] as const) {
        await graph.setCameraState({ position: start, target: { x: 0, y: 0, z: 0 } }, { animate: false });
        const startDistance = graph.getCameraState().cameraDistance ?? Number.NaN;

        const { atFrame, end } = await cameraStateAtFrame(graph, 6, () =>
            graph.setCameraState(targetState, { animate: true, duration: 400, easing }),
        );

        assertNear(end.position, targetPos, `${easing} final position`);
        const endDistance = end.cameraDistance ?? Number.NaN;
        progress[easing] = ((atFrame.cameraDistance ?? Number.NaN) - startDistance) / (endDistance - startDistance);
    }

    const summary = JSON.stringify(progress);
    assert.isBelow(progress.easeIn, progress.linear, `easeIn starts slower than linear: ${summary}`);
    assert.isAbove(progress.easeOut, progress.linear, `easeOut starts faster than linear: ${summary}`);
    assert.isBelow(progress.easeInOut, progress.linear, `easeInOut starts slower than linear: ${summary}`);
});

test("camera distance animation works correctly", async () => {
    graph = await createTestGraph();

    // Set initial state with known distance
    const initialDistance = 50;
    await graph.setCameraState(
        {
            position: { x: 0, y: 0, z: initialDistance },
            target: { x: 0, y: 0, z: 0 },
        },
        { animate: false },
    );

    // Animate to a different distance
    const targetDistance = 100;
    await graph.setCameraState(
        {
            position: { x: 0, y: 0, z: targetDistance },
            target: { x: 0, y: 0, z: 0 },
        },
        { animate: true, duration: 500 },
    );

    const finalState = graph.getCameraState();

    // Verify final position reflects the target distance
    assert.ok(finalState.position, "Position should be defined");
    assert.ok(finalState.cameraDistance, "Camera distance should be defined");

    // Distance should be close to target (allowing small tolerance for animation precision)
    assert.ok(
        Math.abs(finalState.cameraDistance - targetDistance) < 5,
        `Camera distance is ${finalState.cameraDistance}, expected ~${targetDistance}`,
    );
});

test("camera animation works during rendering activity", async () => {
    graph = await createTestGraph();

    // Start multiple camera animations to create rendering activity
    // This simulates the scenario where the camera is animating while
    // other operations might be happening in the graph
    const targetPos = { x: 50, y: 50, z: 50 };
    const start = graph.getCameraState().position;

    // Fire off animation
    const animationPromise = graph.setCameraState(
        { position: targetPos, target: { x: 0, y: 0, z: 0 } },
        { animate: true, duration: 500 },
    );

    // Wait until the animation is in progress
    await cameraLeft(start);

    // Do some other camera operation during animation
    void graph.setCameraState({ position: { x: 25, y: 25, z: 25 }, target: { x: 0, y: 0, z: 0 } }, { animate: false });

    // Wait for original animation to try to complete
    await animationPromise;

    // The placement asked for last is where the camera stays
    assertNear(graph.getCameraState().position, { x: 25, y: 25, z: 25 }, "final position");
});

test("animation completion event timing is accurate", async () => {
    graph = await createTestGraph();

    // Frames are counted on the scene's animation clock (16 ms per frame), not the wall clock.
    let framesSoFar = 0;
    let completionFrames = 0;
    const listenerId = graph.eventManager.addListener("camera-state-changed", () => {
        completionFrames = framesSoFar;
    });

    const { frames } = await animationFramesOf(
        graph,
        () =>
            graph.setCameraState(
                { position: { x: 100, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
                { animate: true, duration: 500 },
            ),
        (count) => {
            framesSoFar = count;
        },
    );

    graph.eventManager.removeListener(listenerId);

    // Completion event should have fired, and at the animation's end rather than its start
    assert.ok(completionFrames > 0, "Completion event should have fired after the animation started");
    assert.ok(completionFrames <= frames, "Completion event should fire before the call resolves");

    const actualDuration = completionFrames * ANIMATION_FRAME_MS;
    assert.ok(
        actualDuration >= 450 && actualDuration <= 600,
        `Completion fired after ${actualDuration}ms of animation time, expected ~500ms`,
    );
});

test("camera animation with target and position simultaneously", async () => {
    graph = await createTestGraph();

    // Animate both position AND target at the same time
    const targetPos = { x: 100, y: 50, z: 75 };
    const targetTarget = { x: 20, y: 10, z: 15 };

    await graph.setCameraState({ position: targetPos, target: targetTarget }, { animate: true, duration: 500 });

    const finalState = graph.getCameraState();

    // Both position and target should have changed
    assert.ok(finalState.position, "Position should be defined");
    assert.ok(finalState.target, "Target should be defined");

    assert.ok(
        Math.abs(finalState.position.x - targetPos.x) < 10,
        `Position X is ${finalState.position.x}, expected ~${targetPos.x}`,
    );
    assert.ok(
        Math.abs(finalState.target.x - targetTarget.x) < 5,
        `Target X is ${finalState.target.x}, expected ~${targetTarget.x}`,
    );
});

test("short animation durations complete correctly", async () => {
    graph = await createTestGraph();

    // Test very short animation (100ms)
    const { ms } = await animationFramesOf(graph, () =>
        graph.setCameraState(
            { position: { x: 30, y: 30, z: 30 }, target: { x: 0, y: 0, z: 0 } },
            { animate: true, duration: 100 },
        ),
    );

    // Should complete in approximately 100ms of animation time
    assert.ok(ms >= 80 && ms <= 160, `Short animation took ${ms}ms of animation time, expected ~100ms`);

    assertNear(graph.getCameraState().position, { x: 30, y: 30, z: 30 }, "final position");
});

test("long animation durations complete correctly", async () => {
    graph = await createTestGraph();

    // Test longer animation (1000ms)
    const { ms } = await animationFramesOf(graph, () =>
        graph.setCameraState(
            { position: { x: 50, y: 50, z: 50 }, target: { x: 0, y: 0, z: 0 } },
            { animate: true, duration: 1000 },
        ),
    );

    // Should complete in approximately 1000ms of animation time
    assert.ok(ms >= 950 && ms <= 1100, `Long animation took ${ms}ms of animation time, expected ~1000ms`);

    assertNear(graph.getCameraState().position, { x: 50, y: 50, z: 50 }, "final position");
});
