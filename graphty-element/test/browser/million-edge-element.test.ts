/**
 * @file A graphty-element on `renderPath: "batched"` loads a million edges and draws them on
 * whatever renderer the browser has, SwiftShader included. Before stage 16 a software renderer drew
 * joined lines expanded and died past 524,288 pieces; test/browser/million-edge-lines.test.ts pins
 * the two batch classes, this pins the whole load through the element. Design:
 * `design/rendering/row-renderer.md`, section 4.3 and stage 16.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { operationQueueOf } from "../../src/Graph";
import { readCanvas } from "../helpers/whole-canvas";

const EDGES = 1_000_000;
/** C(1415, 2) = 1,000,405 pairs, enough for every edge but the last inside the cluster. */
const CLUSTER = 1415;
const FAR = CLUSTER;

afterEach(() => {
    document.body.replaceChildren();
});

/**
 * Every node but one sits in a small cluster at the left, so the first 999,999 edges are specks
 * and a frame does not fill a million lines' worth of pixels; the last edge runs from the cluster
 * to the far node at the right, across the middle of the canvas.
 * @returns The nodes and edges.
 */
function graph(): { nodes: Record<string, unknown>[]; edges: { src: number; dst: number }[] } {
    const nodes: Record<string, unknown>[] = Array.from({ length: CLUSTER }, (_, id) => ({
        id,
        position: { x: -3 + (id % 38) * 0.002, y: Math.floor(id / 38) * 0.002, z: 0 },
    }));
    nodes.push({ id: FAR, position: { x: 3, y: 0, z: 0 } });
    const edges: { src: number; dst: number }[] = [];
    for (let i = 0; i < CLUSTER && edges.length < EDGES - 1; i++) {
        for (let j = i + 1; j < CLUSTER && edges.length < EDGES - 1; j++) {
            edges.push({ src: i, dst: j });
        }
    }
    edges.push({ src: 0, dst: FAR });
    return { nodes, edges };
}

describe("a million edges through the element", () => {
    it("loads them on the batched path and draws the millionth with no GL error", async () => {
        const element = document.createElement("graphty-element");
        element.renderer = "webgl";
        element.renderPath = "batched";
        element.directed = false;
        element.style.display = "block";
        element.style.width = "400px";
        element.style.height = "300px";
        document.body.appendChild(element);
        await element.updateComplete;
        await operationQueueOf(element.graph).waitForCompletion();

        const { nodes, edges } = graph();
        await element.session.data.addNodes(nodes);
        await element.session.data.addEdges(edges);
        await element.graph.setLayout("fixed", { dim: 2 });
        await element.session.styles.add({
            name: "plain",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "none", "edge.color": "#000000", "edge.width": 4 },
        } as never);
        await operationQueueOf(element.graph).waitForCompletion();

        assert.deepInclude(element.graph.rowCounts, { pulledEdges: EDGES, objectEdges: 0 });

        const { engine } = element.graph;
        const gl = (engine as unknown as { _gl: WebGL2RenderingContext })._gl;
        while (gl.getError() !== gl.NO_ERROR) {
            // Drain errors raised before the frame under test.
        }
        const { pixels } = await readCanvas(element.graph);
        assert.equal(gl.getError(), gl.NO_ERROR, "no GL error drawing a million edges");

        // The cluster and the far node sit at the ends; only the last edge crosses the middle column.
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const x = Math.floor(width / 2);
        const background = pixels.slice(0, 4);
        let ink = 0;
        for (let y = 0; y < height; y++) {
            const at = (y * width + x) * 4;
            if (Math.abs((pixels[at] ?? 0) - (background[0] ?? 0)) > 40) {
                ink++;
            }
        }
        assert.isAbove(ink, 0, "the millionth edge drew across the middle");
    });
});
