/**
 * @file A curve batch on `renderPath: "batched"` runs the vertex stage once for each of the join template's vertices a
 * piece, as the object path's curve batch does, not once for each of its 30 corners (issue #9486).
 *
 * A curve batch drew unindexed, 30 vertices a piece, and each of them worked out six points of its curve from the row
 * table: a still frame of 100,000 curved edges took about 40% more GPU time than the objects path, whose batch draws
 * the template's 14 vertices a piece, indexed. The batch now draws the template indexed: an instance a curve, whose
 * template is a copy of the join template for each piece it may draw (#10046).
 */

import "../../src/graphty-element";

import type { Mesh } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { JOIN_TEMPLATE_VERTICES } from "../../src/meshes/edgeJoinShader";
import { CURVE_STRIDE } from "../../src/meshes/pulledCurve";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const RENDERERS = ADAPTER === "" ? (["webgl"] as const) : (["webgl", "webgpu"] as const);

/** A ring of nodes, each joined to the next and to the one three on. */
const NODES = Array.from({ length: 24 }, (_, id) => ({
    id,
    position: { x: Math.cos(id / 3.82) * 6, y: Math.sin(id / 3.82) * 6, z: 0 },
}));
const EDGES = NODES.flatMap((node) => [
    { src: node.id, dst: (node.id + 1) % NODES.length },
    { src: node.id, dst: (node.id + 3) % NODES.length },
]);

afterEach(() => {
    document.body.replaceChildren();
});

/**
 * Mount a batched element with every edge curved.
 * @param renderer - The renderer.
 * @returns The element, settled.
 */
async function curved(renderer: "webgl" | "webgpu"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = renderer;
    element.renderPath = "batched";
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.session.styles.add({
        name: "curves",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "none", "edge.curvature": true, "edge.fanned": false },
    } as never);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Render one frame and count the vertices the curve batch's draws ask the vertex stage for: an unindexed draw's
 * vertices, or an indexed draw's distinct vertices, times its instances.
 * @param element - The element.
 * @param batch - The curve batch's mesh.
 * @returns The vertices, and the draws counted.
 */
function vertexWork(element: Graphty, batch: Mesh): { vertices: number; draws: number } {
    const { scene } = element.graph;
    const engine = scene.getEngine();
    const indices = batch.getIndices() ?? [];
    let drawing = false;
    let vertices = 0;
    let draws = 0;
    const onDraw = batch.onBeforeDrawObservable;
    const observer = onDraw.add(() => {
        drawing = true;
    });
    const arrays = engine.drawArraysType.bind(engine);
    const elements = engine.drawElementsType.bind(engine);
    engine.drawArraysType = (fill, start, count, instances) => {
        if (drawing) {
            vertices += count * Math.max(1, instances ?? 0);
            draws++;
            drawing = false;
        }
        arrays(fill, start, count, instances);
    };
    engine.drawElementsType = (fill, start, count, instances) => {
        if (drawing) {
            const distinct = new Set(Array.from({ length: count }, (_, i) => indices[start + i])).size;
            vertices += distinct * Math.max(1, instances ?? 0);
            draws++;
            drawing = false;
        }
        elements(fill, start, count, instances);
    };
    try {
        scene.render();
    } finally {
        engine.drawArraysType = arrays;
        engine.drawElementsType = elements;
        onDraw.remove(observer);
    }

    return { vertices, draws };
}

describe.each(RENDERERS)("a curve batch's vertex work on %s", (renderer) => {
    it("runs the join template's vertices once a piece, not its corners", async () => {
        const element = await curved(renderer);
        assert.deepInclude(element.graph.rowCounts, { pulledEdges: EDGES.length, objectEdges: 0 });
        const batches = element.graph.scene.meshes.filter((mesh) => mesh.name.endsWith("|curve"));
        assert.lengthOf(batches, 1, "the curves are drawn from one curve batch");
        const [batch] = batches as [Mesh];

        let pieces = 0;
        for (const edge of element.graph.getDataManager().edges.values()) {
            const curve = edge.drawnCurve;
            assert.isNotNull(curve, "every edge is drawn as a curve");
            pieces += (curve ?? []).length - 1;
        }

        assert.isAbove(pieces, EDGES.length, "each curve is drawn in several pieces");
        const { vertices, draws } = vertexWork(element, batch);
        assert.strictEqual(draws, 1, "the batch draws once a frame");
        // one instance a curve, its template a copy of the join template a piece it may draw (#10046), as the object
        // path's batch draws a curve from one slot
        assert.strictEqual(
            vertices,
            EDGES.length * CURVE_STRIDE * JOIN_TEMPLATE_VERTICES,
            `${String(EDGES.length)} curves`,
        );
    });
});
