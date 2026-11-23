import { afterEach, assert, test } from "vitest";

import type { Graph } from "../../../src/Graph.js";
import { drawnFrames } from "../../helpers/drawn-frames.js";
import { cleanupTestGraph, createTestGraph } from "../../helpers/testSetup.js";

let graph: Graph;

afterEach(() => {
    cleanupTestGraph(graph);
});

test("a camera state's fov sets the 3D field of view, immediately and animated", async () => {
    graph = await createTestGraph();

    await graph.setCameraState({ fov: 0.5 });
    assert.closeTo(graph.getCameraState().fov ?? Number.NaN, 0.5, 1e-9);

    await graph.setCameraState({ fov: 1.1, target: { x: 0, y: 0, z: 0 } }, { animate: true, duration: 100 });
    assert.closeTo(graph.getCameraState().fov ?? Number.NaN, 1.1, 1e-9);
});

test("a camera state read back restores the field of view", async () => {
    graph = await createTestGraph();
    const before = graph.getCameraState();

    await graph.setCameraState({ fov: 0.3 });
    await graph.setCameraState(before);

    assert.closeTo(graph.getCameraState().fov ?? Number.NaN, before.fov ?? Number.NaN, 1e-9);
});

test("a camera state's ortho edges set how much a 2D view shows, over its zoom", async () => {
    graph = await createTestGraph();
    await graph.setViewMode("2d");

    await graph.setCameraState({ orthoLeft: -4, orthoRight: 4 });
    const wide = graph.getCameraState().zoom ?? Number.NaN;

    await graph.setCameraState({ zoom: wide / 7, orthoLeft: -2, orthoRight: 2 });
    assert.closeTo(graph.getCameraState().zoom ?? Number.NaN, wide * 2, 1e-6, "the edges won over the zoom");

    await graph.setCameraState({ orthoLeft: -8, orthoRight: 8 }, { animate: true, duration: 100 });
    assert.closeTo(graph.getCameraState().zoom ?? Number.NaN, wide / 2, 1e-6, "an animated move lands on the edges");
});

test("a 2D zoom draws the same framing on every frame while the data grows (issue #9640)", async () => {
    graph = await createTestGraph();
    await graph.setViewMode("2d");
    // The camera is the caller's: the element does not frame the growing graph on its own.
    graph.setAutoFrame(false);
    await graph.addNodes([{ id: "n0" }]);
    await graph.waitForStableFrame();

    await graph.setCameraState({ zoom: 1.5, pan: { x: 0, y: 0 } }, { skipQueue: true });
    const drawnZooms: number[] = [];
    const observer = graph.scene.onAfterRenderObservable.add(() => {
        drawnZooms.push(graph.getCameraState().zoom ?? Number.NaN);
    });
    try {
        // A growing chain: the layout spreads it wider with every add.
        for (let i = 1; i <= 5; i++) {
            await graph.addNodes([{ id: `n${i}` }]);
            await graph.addEdges([{ src: `n${i - 1}`, dst: `n${i}` }]);
            await drawnFrames(graph.scene, 5);
        }
    } finally {
        graph.scene.onAfterRenderObservable.remove(observer);
    }

    assert.isAtLeast(drawnZooms.length, 25, "every add was drawn");
    for (const zoom of drawnZooms) {
        assert.closeTo(zoom, 1.5, 1e-9, `drawn zooms: ${drawnZooms.join(", ")}`);
    }
});
