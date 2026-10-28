/**
 * @file A label sized on screen (`sizeMode: "screen"`) draws its words at that many CSS pixels at
 * every zoom, on Les Miserables framed whole and again zoomed in 2x, in 3D and in 2D. A label
 * sized in the scene (the default) grows with the zoom, as before.
 *
 * Measured independently of the renderer's own arithmetic: the label plane's world bounding box
 * after a frame, projected through the scene's transform, times the share of the plane the words
 * take; compared with the same words set at 14 px by a 2D canvas, as a web page would draw them.
 */

import "../../src/graphty-element";

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { LabelStyle } from "../../src/catalog/types";
import { Graph, operationQueueOf } from "../../src/Graph";
import { lesMiserables } from "../helpers/les-miserables";
import { nextFrame } from "../helpers/real-input";

/** The Les Miserables network, read once: the snapshot is frozen, so every test can share it. */
const LES_MISERABLES = await lesMiserables();

const SIZE = 14;
const WORDS = "Valjean";
const FONT = "Verdana";
const FRAMING_TIMEOUT_MS = 10_000;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Draw a few frames.
 * @param graph - The graph.
 * @param frames - How many.
 */
async function draw(graph: Graph, frames = 5): Promise<void> {
    for (let at = 0; at < frames; at++) {
        graph.scene.render();
        await nextFrame();
    }
}

/**
 * Les Miserables in a circle, labelled "Valjean" on every node, framed whole.
 * @param style - The label style.
 * @param viewMode - "2d" for the orthographic camera.
 * @returns The graph.
 */
async function framed(style: LabelStyle, viewMode: "2d" | "3d"): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "1000px";
    container.style.height = "700px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    await graph.init();
    const sample = LES_MISERABLES;
    const ids = sample.ids ?? [];
    await graph.addNodes(ids.map((id) => ({ id })));
    await graph.addEdges([...sample.src].map((src, e) => ({ src: ids[src], dst: ids[sample.dst[e]] })));
    await graph.setLayout("circular");
    if (viewMode === "2d") {
        await graph.setViewMode("2d");
    }

    await graph.getSession().styles.add({
        name: "labels",
        target: "node",
        selector: { match: "everything" },
        set: { "node.label": WORDS, "node.labelStyle": { font: FONT, ...style } },
    });
    await operationQueueOf(graph).waitForCompletion();
    await draw(graph);

    await new Promise<void>((done, fail) => {
        const timer = setTimeout(() => {
            off();
            fail(new Error("the element never framed the graph"));
        }, FRAMING_TIMEOUT_MS);
        const off = graph.on("zoom-to-fit-complete", () => {
            clearTimeout(timer);
            off();
            done();
        });
        graph.zoomToFit();
    });
    await draw(graph);

    return graph;
}

/**
 * Zoom the camera in 2x: half the distance in 3D, twice the zoom in 2D.
 * @param graph - The graph.
 */
async function zoomIn(graph: Graph): Promise<void> {
    const state = graph.getCameraState();
    if (state.zoom !== undefined && state.cameraDistance === undefined) {
        await graph.setCameraState({ zoom: state.zoom * 2 });
    } else {
        const distance = state.cameraDistance;
        assert.isNumber(distance);
        await graph.setCameraState({ cameraDistance: (distance ?? 0) / 2 });
    }

    await draw(graph);
}

/**
 * How tall the words of node Valjean's label are on screen, in CSS pixels.
 * @param graph - The graph.
 * @returns The height.
 */
function wordsHeight(graph: Graph): number {
    const label = graph.getNode("Valjean")?.label;
    const mesh = label?.labelMesh;
    assert.isOk(label);
    assert.isOk(mesh);
    const camera = graph.scene.activeCamera;
    assert.isNotNull(camera);
    const viewport = camera.viewport.toGlobal(graph.engine.getRenderWidth(), graph.engine.getRenderHeight());
    mesh.computeWorldMatrix(true);
    const ys = mesh
        .getBoundingInfo()
        .boundingBox.vectorsWorld.map(
            (corner) => Vector3.Project(corner, Matrix.Identity(), graph.scene.getTransformMatrix(), viewport).y,
        );
    const plane = (Math.max(...ys) - Math.min(...ys)) * graph.engine.getHardwareScalingLevel();
    const { top, bottom } = label.textBounds;

    return plane * (bottom - top);
}

/**
 * How tall a web page draws the same words at 14 px: the font box at the default line height.
 * @returns The height in CSS pixels.
 */
function pageHeight(): number {
    const ctx = document.createElement("canvas").getContext("2d");
    assert.isOk(ctx);
    ctx.font = `normal normal ${String(SIZE)}px ${FONT}`;
    const metrics = ctx.measureText(WORDS);

    return (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent) * 1.2;
}

describe("a label sized on screen", () => {
    for (const viewMode of ["3d", "2d"] as const) {
        it(`draws ${String(SIZE)} px letters framed whole and zoomed in 2x (${viewMode})`, async () => {
            const graph = await framed({ sizePx: SIZE, sizeMode: "screen" }, viewMode);
            const expected = pageHeight();

            const whole = wordsHeight(graph);
            assert.approximately(whole, expected, expected * 0.2, `framed whole: ${String(whole)} px`);

            await zoomIn(graph);
            const zoomed = wordsHeight(graph);
            assert.approximately(zoomed, expected, expected * 0.2, `zoomed in: ${String(zoomed)} px`);
        });
    }

    it("sits on its node at the size it is drawn at", async () => {
        const graph = await framed({ sizePx: SIZE, sizeMode: "screen" }, "3d");
        const mesh = graph.getNode("Valjean")?.label?.labelMesh;
        assert.isOk(mesh);
        const before = mesh.position.y;
        await zoomIn(graph);

        // Half the world size on screen 2x nearer: the plane's center comes down toward the node.
        assert.isBelow(mesh.position.y, before);
    });
});

describe("a label sized in the scene (the default)", () => {
    it("grows with the zoom", async () => {
        const graph = await framed({ sizePx: SIZE }, "3d");
        const whole = wordsHeight(graph);
        await zoomIn(graph);

        assert.approximately(wordsHeight(graph) / whole, 2, 0.4);
    });
});
