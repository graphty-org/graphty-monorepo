/**
 * @file `waitForStableFrame()` resolves only once a frame has drawn what was just asked for.
 *
 * Four kinds of visual work used to be invisible to the wait, so it resolved on the frame from
 * before them (issues #3287 and #3361): a camera move the element makes for a consumer, a tooltip
 * the pointer brings up, a selection style changed while a node is selected, and a framing
 * request still outstanding. Each test records what every frame drew, asks for the work with the
 * frames held (so "asked for, not drawn yet" is certain rather than a matter of whether an
 * animation frame happened to land), releases them, waits, and checks that the last frame drawn
 * before the wait resolved shows it. The pointer is the browser's own (test/helpers/real-input.ts).
 */

import "../../src/graphty-element";

import type { AbstractMesh, Observer, Scene } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { RenderManager } from "../../src/managers/RenderManager.js";
import { hover, type Point } from "../helpers/real-input";

const WIDTH = 480;
const HEIGHT = 360;

const NODES = [
    { id: "a", position: { x: -4, y: 0, z: 0 } },
    { id: "b", position: { x: 4, y: 0, z: 0 } },
    { id: "c", position: { x: 0, y: 3, z: 0 } },
];
const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
];

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element with three nodes at fixed places, drawn and final.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.waitForStableFrame();
    return element;
}

/**
 * Call `record` after every frame the scene draws, until the test ends.
 * @param element - The element.
 * @param record - Called after each drawn frame.
 */
function afterEachFrame(element: Graphty, record: () => void): void {
    const scene = element.graph.getScene();
    const observer: Observer<Scene> = scene.onAfterRenderObservable.add(record);
    cleanups.unshift(() => {
        scene.onAfterRenderObservable.remove(observer);
    });
}

/**
 * Stop drawing frames.
 * @param element - The element.
 * @returns The release.
 */
function holdFrames(element: Graphty): () => void {
    const graphAny = element.graph as unknown as Record<string, unknown>;
    return (graphAny.renderManager as RenderManager).holdFrames();
}

/**
 * The camera's view and projection, as one list.
 * @param element - The element.
 * @returns Both matrices, view first.
 */
function cameraView(element: Graphty): number[] {
    const camera = element.graph.getScene().activeCamera;
    assert.isNotNull(camera);
    return [...camera.getViewMatrix().m, ...camera.getProjectionMatrix().m];
}

/**
 * Where a node is drawn.
 * @param element - The element.
 * @param id - The node.
 * @returns Its center in CSS pixels from the element's top-left corner.
 */
function at(element: Graphty, id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} is drawn`);
    return { x: position.x, y: position.y };
}

/**
 * The selection halo on screen: the visible instance, never the hidden cached source.
 * @param element - The element.
 * @returns The halo mesh, or undefined when none is drawn.
 */
function haloOnScreen(element: Graphty): AbstractMesh | undefined {
    return element.graph
        .getScene()
        .meshes.find((mesh) => mesh.name.startsWith("graphty-selection-halo") && mesh.isVisible && mesh.isEnabled());
}

describe("waitForStableFrame waits for the frame that draws", () => {
    it("a camera move animated to a camera view", async () => {
        const element = await mounted();
        let drawn: number[] = [];
        afterEachFrame(element, () => {
            drawn = cameraView(element);
        });

        await element.graph.zoomStep("in");
        await element.graph.zoomStep("in");
        const moved = element.applyCameraView("fitToGraph", { animate: true, duration: 200 });
        await element.waitForStableFrame();

        assert.deepEqual(drawn, cameraView(element), "the stable frame drew the camera as it is now");
        await moved;
        assert.deepEqual(cameraView(element), drawn, "the camera did not move on after the stable frame");
    });

    it("a camera move to a camera view without animation", async () => {
        const element = await mounted();
        let drawn: number[] = [];
        afterEachFrame(element, () => {
            drawn = cameraView(element);
        });

        await element.graph.zoomStep("in");
        await element.graph.zoomStep("in");
        const release = holdFrames(element);
        await element.applyCameraView("fitToGraph");
        release();
        await element.waitForStableFrame();

        assert.deepEqual(drawn, cameraView(element), "the stable frame drew the fitted camera");
    });

    it("a tooltip the pointer brings up", async () => {
        const element = await mounted();
        await element.session.styles.add({
            name: "tooltips",
            target: "node",
            selector: { match: "everything" },
            set: { "node.tooltip": "a few words" },
        });
        await element.waitForStableFrame();

        let tooltipDrawn = false;
        afterEachFrame(element, () => {
            const mesh = element.graph.getNode("a")?.tooltip?.labelMesh;
            tooltipDrawn =
                mesh !== undefined && mesh !== null && element.graph.getScene().getActiveMeshes().data.includes(mesh);
        });

        const point = at(element, "a");
        const release = holdFrames(element);
        await hover(element, point);
        release();
        await element.waitForStableFrame();

        assert.isDefined(element.graph.getNode("a")?.tooltip, "pointing at the node built its tooltip");
        assert.isTrue(tooltipDrawn, "the stable frame drew the tooltip");
    });

    it("a selection style changed while a node is selected", async () => {
        const element = await mounted();
        element.graph.selectNode("a");
        await element.waitForStableFrame();

        let drawnScale = 0;
        afterEachFrame(element, () => {
            drawnScale = haloOnScreen(element)?.scaling.x ?? 0;
        });
        const before = haloOnScreen(element)?.scaling.x;
        assert.isDefined(before, "the selected node has a halo");

        const release = holdFrames(element);
        element.selectionStyle = { scale: 2.6 };
        release();
        await element.waitForStableFrame();

        const now = haloOnScreen(element)?.scaling.x;
        assert.notStrictEqual(now, before, "the new style reached the halo");
        assert.strictEqual(drawnScale, now, "the stable frame drew the halo at the new scale");
    });

    it("a framing request", async () => {
        const element = await mounted();
        await element.setCameraState({ position: { x: 30, y: 20, z: 40 }, target: { x: 5, y: 0, z: 0 } });
        await element.waitForStableFrame();

        let drawn: number[] = [];
        afterEachFrame(element, () => {
            drawn = cameraView(element);
        });
        const before = cameraView(element);

        const release = holdFrames(element);
        element.graph.zoomToFit();
        release();
        await element.waitForStableFrame();

        assert.notDeepEqual(cameraView(element), before, "the camera was framed");
        assert.deepEqual(drawn, cameraView(element), "the stable frame drew the framed camera");
    });

    it("the framing a layout change asks for", async () => {
        const element = await mounted();
        let drawn: number[] = [];
        let framings = 0;
        afterEachFrame(element, () => {
            drawn = cameraView(element);
        });
        element.graph.on("zoom-to-fit-complete", () => {
            framings++;
        });

        const release = holdFrames(element);
        await element.session.layout.set("circular");
        release();
        await element.waitForStableFrame();

        assert.isAbove(framings, 0, "the layout change framed the graph");
        assert.deepEqual(drawn, cameraView(element), "the stable frame drew the framed camera");
        assert.isFalse(element.graph.getUpdateManager().isZoomToFitEnabled(), "no framing is still owed");
    });
});
