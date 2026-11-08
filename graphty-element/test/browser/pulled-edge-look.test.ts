/**
 * @file On the `"batched"` path a pulled edge's color, width and opacity are its piece's, not its
 * batch's: a thousand edges of a thousand looks draw from a handful of draws, and draw the picture
 * the `"objects"` path draws with a batch per look. A changed look rewrites the piece. Stage 19 of
 * design/rendering/row-renderer.md; the bar is its section 7.
 */

import "../../src/graphty-element";

import { SceneInstrumentation } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { edgeBetween } from "../helpers/testSetup";
import { type CanvasFrame as Frame, pixelsOverBar as overBar, readCanvas } from "../helpers/whole-canvas";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const RENDERERS = ADAPTER === "" ? (["webgl"] as const) : (["webgl", "webgpu"] as const);

afterEach(() => {
    document.body.replaceChildren();
});

/** Edges, each a look of its own. */
const EDGE_COUNT = 1000;

/** Nodes on a ring and a tilted ring inside it, so the edges cross at depth. */
const NODES = Array.from({ length: 48 }, (_, id) => {
    const angle = (id / 24) * Math.PI * 2;
    const r = id < 24 ? 3 : 1.6;
    return { id, position: { x: Math.cos(angle) * r, y: Math.sin(angle) * r, z: id < 24 ? 0 : Math.sin(angle) } };
});

/**
 * The first edges between distinct node pairs, each with a color, width and opacity of its own.
 */
const EDGES = (() => {
    const edges: { src: number; dst: number; color: string; width: number; opacity: number }[] = [];
    for (let a = 0; a < NODES.length && edges.length < EDGE_COUNT; a++) {
        for (let b = a + 1; b < NODES.length && edges.length < EDGE_COUNT; b++) {
            const i = edges.length;
            const color = `#${((i * 2654435761) >>> 8).toString(16).padStart(6, "0").slice(-6)}`;
            edges.push({ src: a, dst: b, color, width: 0.5 + (i % 4) * 0.5, opacity: i % 5 === 0 ? 0.5 : 1 });
        }
    }

    return edges;
})();

/**
 * Wait for queued work and a stable frame.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * Mount an element on a render path, its edges painted from their data.
 * @param renderer - The renderer.
 * @param path - The render path.
 * @returns The element.
 */
async function loaded(renderer: "webgl" | "webgpu", path: RenderPath): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = renderer;
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("3d");
    await element.session.styles.add({
        name: "looks",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "none" },
        encode: {
            "edge.color": { by: "data.color", scale: "passthrough" },
            "edge.width": { by: "data.width", scale: "passthrough" },
            "edge.opacity": { by: "data.opacity", scale: "passthrough" },
        },
    } as never);
    await settled(element);
    return element;
}

/**
 * Render one frame and count its draws.
 * @param element - The element.
 * @returns The draws.
 */
function draws(element: Graphty): number {
    const scene = element.graph.getScene();
    const instrumentation = new SceneInstrumentation(scene);
    instrumentation.drawCallsCounter.fetchNewFrame();
    scene.render();
    const count = instrumentation.drawCallsCounter.current;
    instrumentation.dispose();
    return count;
}

describe.each(RENDERERS)("a pulled edge's own look on %s", (renderer) => {
    it("draw a thousand looks in a handful of draws, as the objects path draws them", async () => {
        const objects = await loaded(renderer, "objects");
        const objectsDraws = draws(objects);
        const objectsRest: Frame = await readCanvas(objects.graph);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        assert.deepInclude(batched.graph.rowCounts, { pulledEdges: EDGE_COUNT, objectEdges: 0 });
        const batchedDraws = draws(batched);
        assert.isAtLeast(objectsDraws, EDGE_COUNT, "the objects path draws a batch per look");
        assert.isAtMost(batchedDraws, 8, "the batched path draws a handful");
        assert.equal(overBar(objectsRest, await readCanvas(batched.graph)), 0, "the same picture");
    });

    it("rewrite a piece's look when its edge's look changes", async () => {
        const restyle = async (element: Graphty): Promise<Frame> => {
            await element.session.styles.add({
                name: "one",
                target: "edge",
                selector: { match: "ids", edges: [edgeBetween(element.graph, 0, 1)?.id] },
                set: { "edge.color": "#ff0000", "edge.width": 6, "edge.opacity": 1 },
            } as never);
            await settled(element);
            return readCanvas(element.graph);
        };

        const objects = await loaded(renderer, "objects");
        const objectsRestyled = await restyle(objects);
        objects.remove();

        const batched = await loaded(renderer, "batched");
        const before = draws(batched);
        const batchedRestyled = await restyle(batched);
        assert.equal(draws(batched), before, "no batch more");
        assert.equal(overBar(objectsRestyled, batchedRestyled), 0, "the restyled picture");
    });
});
