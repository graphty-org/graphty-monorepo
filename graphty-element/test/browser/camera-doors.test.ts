/**
 * @file The camera moves the graphty app's toolbar and Views menu make, as element members.
 *
 * Each app helper in `graphty/src/components/shell/graphCommands.ts` is written out below as the
 * sequence of raw `Graph` calls it makes today, and the element member that replaces it must put
 * the camera exactly where that sequence does, on the same graph from the same starting camera.
 * Every one is view state, so each call must leave the project state digest and the history
 * alone and dispatch nothing.
 *
 * Reset view and XR-button control are `resetCamera` and `setXRConfig` already, and the Top,
 * Front and Side presets are `loadCameraPreset` with the element's own view names; those rows
 * pin that the app's calls and the element's members agree.
 */

import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { CameraState } from "../../src/screenshot/types";
import { dispatcherOf } from "../../src/session/GraphSession";
import { stateDigest } from "../../src/session/project/digest";

/** Per-test budget: each builds a real Babylon scene. */
const TEST_TIMEOUT_MS = 30_000;

/** How close two camera coordinates must be to count as the same place. */
const TOLERANCE = 1e-6;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A real `Graph` holding a small graph, laid out in one pass, in the mode asked for.
 * @param mode - The drawing mode.
 * @returns The graph.
 */
async function loadedGraph(mode: "2d" | "3d"): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    if (mode === "2d") {
        await graph.setViewMode("2d");
    }

    await graph.setLayout("circular");
    await graph.addNodes([{ id: "n1" }, { id: "n2" }, { id: "n3" }]);
    await graph.addEdges([
        { src: "n1", dst: "n2" },
        { src: "n2", dst: "n3" },
    ]);
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForSettled();
    // The views frame the laid-out box, so wait for the nodes to be where the layout put them.
    for (let wait = 0; wait < 1000 && graph.getLayoutManager().running; wait++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
    }

    assert.isFalse(graph.getLayoutManager().running, "the layout came to rest");
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    return graph;
}

/**
 * The app's Zoom in / Zoom out helper, as the raw calls it makes.
 * @param graph - The graph.
 * @param direction - Which way.
 */
async function appZoomStep(graph: Graph, direction: "in" | "out"): Promise<void> {
    const factor = direction === "in" ? 1 / 1.25 : 1.25;
    const state = graph.getCameraState();
    if (graph.is2D()) {
        await graph.setCameraZoom((state.zoom ?? 1) / factor);
        return;
    }

    if (state.cameraDistance !== undefined) {
        await graph.setCameraState({ cameraDistance: state.cameraDistance * factor });
    }
}

/**
 * The app's Zoom to selection helper, as the raw calls it makes.
 * @param graph - The graph.
 * @param nodeId - The selected node.
 */
async function appZoomToSelection(graph: Graph, nodeId: string): Promise<void> {
    const mesh = graph.getNodeMesh(nodeId);
    assert.isNotNull(mesh);
    const { x, y, z } = mesh.position;
    await graph.setCameraTarget({ x, y, z });
}

/** The app's view-preset table. */
const APP_PRESETS = { top: "topView", front: "frontView", side: "sideView" } as const;

/**
 * Assert two camera states put the camera in the same place.
 * @param actual - The element member's result.
 * @param expected - The app recipe's result.
 * @param label - For the message.
 */
function assertSameCamera(actual: CameraState, expected: CameraState, label: string): void {
    for (const key of ["position", "target", "pan"] as const) {
        const a = actual[key] as Record<string, number> | undefined;
        const e = expected[key] as Record<string, number> | undefined;
        assert.strictEqual(a === undefined, e === undefined, `${label}: ${key} present in one state only`);
        for (const axis of Object.keys(e ?? {})) {
            assert.approximately(
                a?.[axis] ?? Number.NaN,
                e?.[axis] ?? Number.NaN,
                TOLERANCE,
                `${label}: ${key}.${axis}`,
            );
        }
    }

    for (const key of ["zoom", "cameraDistance"] as const) {
        assert.approximately(actual[key] ?? 0, expected[key] ?? 0, TOLERANCE, `${label}: ${key}`);
    }
}

/**
 * Run the app recipe and the element member from the same starting camera, and check they land
 * in the same place, that the camera moved, and that the member left the project alone.
 * @param graph - The graph.
 * @param label - For the message.
 * @param app - The app recipe.
 * @param door - The element member.
 */
async function compare(
    graph: Graph,
    label: string,
    app: () => Promise<void>,
    door: () => Promise<void>,
): Promise<void> {
    const session = graph.getSession();
    const dispatcher = dispatcherOf(session);
    const start = graph.getCameraState();

    await app();
    const expected = graph.getCameraState();
    assert.notDeepEqual(expected, start, `${label}: the app recipe moved the camera`);

    await graph.setCameraState(start);
    assertSameCamera(graph.getCameraState(), start, `${label}: the start was restored`);

    const digest = stateDigest(dispatcher.state);
    const steps = session.history.steps.length;
    const seen: unknown[] = [];
    const previous = dispatcher.events.dispatched;
    dispatcher.events.dispatched = (command) => {
        seen.push(command);
    };
    try {
        await door();
    } finally {
        dispatcher.events.dispatched = previous;
    }

    assertSameCamera(graph.getCameraState(), expected, label);
    assert.deepEqual(seen, [], `${label}: dispatched nothing`);
    assert.strictEqual(stateDigest(dispatcher.state), digest, `${label}: project state unchanged`);
    assert.lengthOf(session.history.steps, steps, `${label}: no history step`);

    await graph.setCameraState(start);
}

describe("camera doors", () => {
    for (const mode of ["3d", "2d"] as const) {
        it(
            `zoomStep moves the ${mode} camera as the app's zoom buttons do`,
            async () => {
                const graph = await loadedGraph(mode);
                for (const direction of ["in", "out"] as const) {
                    await compare(
                        graph,
                        `${mode} zoomStep ${direction}`,
                        () => appZoomStep(graph, direction),
                        () => graph.zoomStep(direction),
                    );
                }
            },
            TEST_TIMEOUT_MS,
        );
    }

    it(
        "zoomToSelection centres the camera on the selected node as the app's helper does",
        async () => {
            const graph = await loadedGraph("3d");
            assert.isTrue(graph.selectNode("n2"));
            await compare(
                graph,
                "zoomToSelection",
                () => appZoomToSelection(graph, "n2"),
                () => graph.zoomToSelection(),
            );
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "zoomToSelection with nothing selected leaves the camera where it is",
        async () => {
            const graph = await loadedGraph("3d");
            const start = graph.getCameraState();
            await graph.zoomToSelection();
            assertSameCamera(graph.getCameraState(), start, "nothing selected");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "loadCameraPreset answers the app's Top, Front and Side rows with the element's view names",
        async () => {
            const graph = await loadedGraph("3d");
            for (const [row, name] of Object.entries(APP_PRESETS)) {
                // The app recipe is the call its helper makes; the member is the one it moves to.
                await compare(
                    graph,
                    `preset ${row}`,
                    () => graph.setCameraState({ preset: name }),
                    () => graph.loadCameraPreset(name),
                );
            }
        },
        TEST_TIMEOUT_MS,
    );
});
