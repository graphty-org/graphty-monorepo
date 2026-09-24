/**
 * @file Asking for the 2D view and asking for a layout are two requests, and neither cancels the
 * other.
 *
 * WHAT WENT WRONG. `Graph.setViewMode` queued its work under the `camera-update` category, and
 * `src/constants/obsolescence-rules.ts` says a `layout-set` obsoletes a pending `camera-update`.
 * That rule is right about what it was written for -- a zoom-to-fit aimed at positions a new
 * layout is about to move is stale -- and wrong about a view-mode switch, which stays correct
 * whatever the nodes do next.
 *
 * So the two most ordinary lines a consumer writes,
 *
 * ```js
 * element.viewMode = "2d";
 * element.layout = "circular";
 * ```
 *
 * queued the switch and then cancelled it. Nothing threw, nothing was reported, and the element's
 * own `viewMode` getter went on answering `"2d"` because it answers from a field of its own --
 * while `graph.getViewMode()` said `"3d"` and the scene was drawn through a perspective camera.
 * Reversing the two lines worked. Setting the mode a second time, a moment later, worked. Twelve
 * `Layout/2D` stories and two `Styles/Edge` ones were red on it, every one of them saying "asks
 * for 2d and is drawn through a perspective camera".
 *
 * WHAT IS PINNED HERE. Not the category name and not the rule table -- those are how, and how may
 * change. What is pinned is the promise: after both requests, whatever order they arrive in, the
 * element and the graph agree about the mode, and the camera drawing the scene is the one that
 * mode means. Babylon's `Camera.ORTHOGRAPHIC_CAMERA` is 1 and `PERSPECTIVE_CAMERA` is 0, and
 * `camera.mode` is the element's own test for which view it is in.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";

/** Babylon's `Camera.ORTHOGRAPHIC_CAMERA`, compared as a number so no renderer class is imported. */
const ORTHOGRAPHIC = 1;

/** Babylon's `Camera.PERSPECTIVE_CAMERA`. */
const PERSPECTIVE = 0;

/** How long the element needs to connect, drain its queue and draw. */
const SETTLE_MS = 1500;

/** A graph small enough that every layout below finishes instantly. */
const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

/** A path through them. */
const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
    { src: "c", dst: "d" },
];

let mounted: Graphty | null = null;

/**
 * Put an element on the page with some data on it.
 * @returns the element, before anything has been asked of it
 */
function mount(): Graphty {
    const container = document.createElement("div");

    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);

    const element = document.createElement("graphty-element");

    element.nodeData = NODES;
    element.edgeData = EDGES;
    container.appendChild(element);
    mounted = element;

    return element;
}

/**
 * Wait for the element to finish everything it has been asked to do.
 * @param element - the mounted element
 */
async function settle(element: Graphty): Promise<void> {
    await element.graph.operationQueue.waitForCompletion();
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
}

/**
 * What the scene is actually being drawn through.
 * @param element - the mounted element
 * @returns the active camera's projection mode
 */
function cameraMode(element: Graphty): number | undefined {
    return element.graph.scene.activeCamera?.mode;
}

afterEach(() => {
    mounted?.parentElement?.remove();
    mounted = null;
});

describe("asking for a view and asking for a layout", () => {
    test("the 2d view survives a layout asked for in the very next line", async () => {
        const element = mount();

        element.viewMode = "2d";
        element.layout = "circular";
        await settle(element);

        assert.equal(
            element.graph.getViewMode(),
            "2d",
            "the element was asked for the 2d view and then for a layout, and the graph came to rest in " +
                "another view. The layout cancelled the view-mode switch: see the `view-mode` category in " +
                "src/managers/OperationQueueManager.ts.",
        );
        assert.equal(
            cameraMode(element),
            ORTHOGRAPHIC,
            "the graph says it is in the 2d view and the scene is drawn through a perspective camera, which " +
                "is the element's own test for which view it is in",
        );
    });

    test("and so does the 3d view, with the layout asked for first", async () => {
        const element = mount();

        element.layout = "circular";
        element.viewMode = "2d";
        await settle(element);

        assert.equal(element.graph.getViewMode(), "2d", "the layout came first and the view was still asked for");
        assert.equal(cameraMode(element), ORTHOGRAPHIC, "the 2d view is drawn through an orthographic camera");
    });

    test("the element and the graph never disagree about the view", async () => {
        const element = mount();

        element.viewMode = "2d";
        element.layout = "spring";
        await settle(element);

        assert.equal(
            element.viewMode,
            element.graph.getViewMode(),
            "the element answers from a field of its own, so when a switch is dropped the getter goes on " +
                "reporting a view the graph is not drawing. That disagreement is the whole reason the defect " +
                "was invisible.",
        );
    });

    test("switching back to 3d beside another layout works the same way", async () => {
        const element = mount();

        element.viewMode = "2d";
        element.layout = "circular";
        await settle(element);

        element.viewMode = "3d";
        element.layout = "spring";
        await settle(element);

        assert.equal(element.graph.getViewMode(), "3d", "the graph was asked back to 3d beside a new layout");
        assert.equal(cameraMode(element), PERSPECTIVE, "the 3d view is drawn through a perspective camera");
    });
});
