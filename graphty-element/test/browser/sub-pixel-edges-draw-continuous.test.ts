/**
 * @file An edge thinner than one pixel draws as a continuous faint line, not a row of dots.
 *
 * A zoomed-out file graph (Cytoscape sessions, XGMML, CX, CX2, DOT) draws its edges 0.13 to
 * 0.27 pixels wide. Rasterized at that width, a line's triangles cover a pixel centre only here
 * and there, and the edge broke into dots where Cytoscape.js and Graphviz draw a continuous
 * hairline. Both line renderers now draw a sub-pixel line one pixel wide with its opacity scaled
 * by its width in pixels. These read the drawn pixels back: every column the line crosses has
 * ink, the ink is fainter than the line's color, and a line of one pixel or more is unchanged.
 */

import { Color4, Engine, FreeCamera, Scene, ShaderMaterial, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";
import { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
import { styleEveryEdge } from "../helpers/testSetup";

const WIDTH = 800;
const HEIGHT = 400;

/** The drawn line's width in pixels in the sub-pixel cases. */
const SUB_PIXEL = 0.13;

/**
 * Columns in the middle of the canvas whose darkest pixel stays within `tolerance` of the
 * background, and the darkest pixel seen anywhere in them.
 * @param pixels - The frame, four bytes per pixel.
 * @param channel - Which channel the line moves: the one compared.
 * @param background - That channel's background value.
 * @returns The columns with no ink, and the strongest ink as a distance from the background.
 */
function scanColumns(pixels: Uint8Array, channel: number, background: number): { blank: number[]; strongest: number } {
    const blank: number[] = [];
    let strongest = 0;
    for (let x = WIDTH * 0.3; x < WIDTH * 0.7; x++) {
        let ink = 0;
        for (let y = 0; y < HEIGHT; y++) {
            ink = Math.max(ink, Math.abs(pixels[(y * WIDTH + x) * 4 + channel] - background));
        }
        if (ink <= 8) {
            blank.push(x);
        }
        strongest = Math.max(strongest, ink);
    }
    return { blank, strongest };
}

describe("a sub-pixel 3D line", () => {
    let engine: Engine | undefined;

    afterEach(() => {
        engine?.dispose();
        document.querySelectorAll("canvas[data-sub-pixel]").forEach((c) => c.remove());
    });

    /**
     * Draw one red diagonal line on black and read the frame.
     * @param pixelsWide - The line's width on screen, by the shader's arithmetic.
     * @returns The frame.
     */
    async function drawLine(pixelsWide: number): Promise<Uint8Array> {
        const canvas = document.createElement("canvas");
        canvas.dataset.subPixel = "";
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        canvas.style.width = `${String(WIDTH)}px`;
        canvas.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(canvas);
        engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
        const scene = new Scene(engine);
        scene.clearColor = new Color4(0, 0, 0, 1);
        const depth = 50;
        const camera = new FreeCamera("perspective", new Vector3(0, 0, -depth), scene);
        camera.setTarget(Vector3.Zero());
        // The shader draws a width uniform w at clip w d as w / (2 d) pixels.
        // The joined line every 3D solid edge is drawn with, one straight piece in its batch.
        const line = new EdgeLineBatch(
            CustomLineRenderer.createJoinedLineMesh({ width: pixelsWide * 2 * depth, color: "#FF0000" }, scene),
            scene,
        );
        line.place(line.acquire(), new Vector3(-30, -8, 0), new Vector3(30, 8, 0));
        await scene.whenReadyAsync();
        scene.render();
        return (await engine.readPixels(0, 0, WIDTH, HEIGHT)) as unknown as Uint8Array;
    }

    test("draws ink in every column it crosses, fainter than its color", async () => {
        const { blank, strongest } = scanColumns(await drawLine(SUB_PIXEL), 0, 0);
        assert.deepEqual(blank, [], `columns with no line: ${blank.slice(0, 20).join(", ")}`);
        assert.isBelow(strongest, 200, "a 0.13 px line draws at a fraction of its color");
    });

    test("a line of one pixel or more draws its full color", async () => {
        const { blank, strongest } = scanColumns(await drawLine(4), 0, 0);
        assert.deepEqual(blank, []);
        assert.equal(strongest, 255);
    });
});

describe("a sub-pixel 2D line", () => {
    let graph: Graph | undefined;
    let container: HTMLElement | undefined;

    afterEach(() => {
        graph?.dispose();
        container?.remove();
    });

    /**
     * A 2D graph of one black diagonal edge, drawn `pixelsWide` thick at the fitted zoom.
     * @param pixelsWide - The edge's width on screen, in render pixels.
     * @returns The frame and the edge's line batch.
     */
    async function drawEdge(pixelsWide: number): Promise<{ pixels: Uint8Array; batch: EdgeLineBatch }> {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setViewMode("2d");
        await graph.addNodes([
            { id: "a", position: { x: -5, y: -2, z: 0 } },
            { id: "b", position: { x: 5, y: 2, z: 0 } },
        ]);
        await graph.addEdges([{ src: "a", dst: "b" }]);
        await graph.setLayout("fixed", { dim: 3 });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();

        const scene = graph.getScene();
        const camera = scene.activeCamera;
        const top = camera?.orthoTop ?? null;
        const bottom = camera?.orthoBottom ?? null;
        assert(top !== null && bottom !== null, "the 2D camera is orthographic");
        const worldPerPx = (top - bottom) / scene.getEngine().getRenderHeight();
        // A 2D line is `edge.width / 40` world units wide.
        await styleEveryEdge(graph, {
            "edge.width": pixelsWide * worldPerPx * 40,
            "edge.color": "#000000",
            "edge.arrowHead": "none",
        });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        scene.render();

        const engine = scene.getEngine();
        assert.equal(engine.getRenderWidth(), WIDTH);
        const pixels = (await engine.readPixels(0, 0, WIDTH, HEIGHT)) as unknown as Uint8Array;
        const [edge] = graph.getDataManager().edges.values();
        const batch = (edge as unknown as { lineBatch: EdgeLineBatch | null }).lineBatch;
        assert(batch, "the edge is a slot in a line batch");
        return { pixels, batch };
    }

    test("draws ink in every column it crosses, fainter than its color", async () => {
        const { pixels } = await drawEdge(SUB_PIXEL);
        const background = pixels[0];
        const { blank, strongest } = scanColumns(pixels, 0, background);
        assert.deepEqual(blank, [], `columns with no line: ${blank.slice(0, 20).join(", ")}`);
        assert.isBelow(strongest, background * 0.6, "a 0.13 px line draws at a fraction of its color");
    });

    test("a line of one pixel or more keeps its own width and opacity", async () => {
        const { batch } = await drawEdge(3);
        const { material } = batch.mesh;
        assert(material, "the batch has a material");
        assert.equal(material.alpha, 1);
        assert.equal(batch.mesh.visibility, 1, "an opaque line stays in the opaque pass");
        const { lineWidth, lineOpacity } = batch.mesh.metadata as { lineWidth: number; lineOpacity: number };
        assert.equal(lineOpacity, 1);
        assert.closeTo((material as ShaderMaterial).serialize().floats.width as number, lineWidth, 1e-9);
    });
});
