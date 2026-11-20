import { afterEach, assert, test } from "vitest";

import type { Graph } from "../../../src/Graph.js";
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
