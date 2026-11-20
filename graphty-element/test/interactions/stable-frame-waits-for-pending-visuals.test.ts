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
import { renderManagerOf } from "../../src/Graph.js";
import { nodeInternals } from "../../src/Node.js";
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
    return renderManagerOf(element.graph).holdFrames();
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
 * How far the selected node's ring reaches across the view, or undefined when none is drawn. The
 * selection's mark is the ring outside the node's border (`node.outerBorder*`); a new selection
 * scale builds the ring again at a new width, so its reach is what changes.
 * @param element - The element.
 * @returns The ring's half-width in world units, or undefined.
 */
function ringReach(element: Graphty): number | undefined {
    const ring = element.graph
        .getNodes()
        .filter((node) => node.isSelected())
        .map((node) => nodeInternals.drawn(node).outerBorder)
        .find((mesh): mesh is AbstractMesh => mesh !== null && !mesh.isDisposed() && mesh.isEnabled());
    if (ring === undefined) {
        return undefined;
    }
    ring.computeWorldMatrix(true);
    return ring.getBoundingInfo().boundingBox.extendSizeWorld.x;
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

    it("a tooltip asked for just before the wait", async () => {
        // The pointer case above, without the round trip of the pointer: Babylon announces a new
        // mesh a timer after it is built, and a wait asked for before that timer ran resolved on
        // the frame from before the tooltip (issue #5139). The hover test hit that gap only when
        // the timer happened to be slower than the pointer's reply; here it is certain.
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

        element.graph.getNode("a")?.showTooltip();
        await element.waitForStableFrame();

        assert.isDefined(element.graph.getNode("a")?.tooltip, "the tooltip was built");
        assert.isTrue(tooltipDrawn, "the stable frame drew the tooltip");
    });

    it("a selection style changed while a node is selected", async () => {
        const element = await mounted();
        element.graph.selectNode("a");
        await element.waitForStableFrame();

        let drawnReach = 0;
        afterEachFrame(element, () => {
            drawnReach = ringReach(element) ?? 0;
        });
        const before = ringReach(element);
        assert.isDefined(before, "the selected node has a ring");

        const release = holdFrames(element);
        element.selectionStyle = { scale: 2.6 };
        release();
        await element.waitForStableFrame();

        const now = ringReach(element);
        assert.isAbove(now ?? 0, before, "the new style reached the ring");
        assert.strictEqual(drawnReach, now, "the stable frame drew the ring at the new width");
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
