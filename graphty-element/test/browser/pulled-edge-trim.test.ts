/**
 * @file Under `renderPath: "batched"` a plain line pulled from the row table (`PulledLineBatch`) stops at each
 * node's drawn outline, as the `"objects"` path's line does, so a translucent node shows no line inside its body
 * (issue #8281). The pulled shader trims the line over `EDGE_TRIM_GLSL` (design/rendering/row-renderer.md,
 * section 4.3), reading the two rows' extents, with no per-edge work on the CPU; the animated program too.
 */

import "../../src/graphty-element";

import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { type CanvasFrame, pixelsOverBar as overBar, readCanvas } from "../helpers/whole-canvas";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const RENDERERS = ADAPTER === "" ? (["webgl"] as const) : (["webgl", "webgpu"] as const);

/** Shapes the objects path trims a line at. */
const SHAPES = ["sphere", "box", "ellipse", "triangle", "diamond"] as const;

afterEach(() => {
    document.body.replaceChildren();
});

type View = "2d" | "3d";

/**
 * Mount two translucent nodes joined by one plain edge.
 * @param renderer - The renderer.
 * @param path - The render path.
 * @param view - The view mode.
 * @param shape - The nodes' shape.
 * @param edged - Whether the edge is there.
 * @param edgeLook - More of the edge's style.
 * @returns The element.
 */
async function loaded(
    renderer: "webgl" | "webgpu",
    path: RenderPath,
    view: View,
    shape: string,
    edged: boolean,
    edgeLook: Record<string, unknown> = {},
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = renderer;
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -2, y: 0.3, z: 0 } },
        { id: "b", position: { x: 2, y: -0.3, z: 0 } },
    ]);
    if (edged) {
        await element.session.data.addEdges([{ src: "a", dst: "b" }]);
    }
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(view);
    await element.session.styles.add({
        name: "translucent",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shape": shape, "node.opacity": 0.35, "node.size": 2 },
    } as never);
    await element.session.styles.add({
        name: "plain",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "none", "edge.width": 0.15, "edge.color": "#000000", ...edgeLook },
    } as never);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * How wide a third of a node's size is on screen: well inside every shape's body.
 * @param element - The element.
 * @returns The radius, in CSS pixels.
 */
function bodyRadius(element: Graphty): number {
    const node = element.graph.getNode("a");
    assert.isDefined(node);
    const centre = node.drawnWorldPosition;
    return Math.abs(element.worldToScreen(centre.add(new Vector3(0.33, 0, 0))).x - element.worldToScreen(centre).x);
}

/**
 * Pixels of two frames that differ by more than a level, inside a disc around each node's drawn centre.
 * @param element - The element both frames were read from.
 * @param a - One frame.
 * @param b - The other.
 * @param radius - The disc's radius, in CSS pixels.
 * @returns The count.
 */
function overBarInBodies(element: Graphty, a: CanvasFrame, b: CanvasFrame, radius: number): number {
    const { engine } = element.graph;
    const [w, h] = [engine.getRenderWidth(), engine.getRenderHeight()];
    const scale = w / element.clientWidth;
    let over = 0;
    for (const id of ["a", "b"]) {
        const at = element.nodeScreenPosition(id);
        assert.isDefined(at, `node ${id} is drawn`);
        const [cx, cy, r] = [at.x * scale, h - at.y * scale, radius * scale];
        for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(h, cy + r); y++) {
            for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(w, cx + r); x++) {
                if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) {
                    continue;
                }
                const i = (y * w + x) * 4;
                for (let c = 0; c < 4; c++) {
                    if (Math.abs((a.pixels[i + c] ?? 0) - (b.pixels[i + c] ?? 0)) > 1) {
                        over++;
                        break;
                    }
                }
            }
        }
    }

    return over;
}

describe.each(RENDERERS)("pulled plain lines stop at the node outline on %s", (renderer) => {
    describe.each(["2d", "3d"] as const)("in %s", (view) => {
        it.each(SHAPES)("show no line inside a translucent %s and draw the objects picture", async (shape) => {
            const bare = await loaded(renderer, "batched", view, shape, false);
            const bareFrame = await readCanvas(bare.graph);
            bare.remove();

            const objectsBare = await loaded(renderer, "objects", view, shape, false);
            const objectsBareFrame = await readCanvas(objectsBare.graph);
            objectsBare.remove();

            const objects = await loaded(renderer, "objects", view, shape, true);
            const objectsFrame = await readCanvas(objects.graph);
            objects.remove();

            const batched = await loaded(renderer, "batched", view, shape, true);
            assert.deepInclude(batched.graph.rowCounts, { pulledEdges: 1 });
            const batchedFrame = await readCanvas(batched.graph);
            const radius = bodyRadius(batched);
            assert.equal(
                overBarInBodies(batched, objectsBareFrame, objectsFrame, radius),
                0,
                "objects line pixels inside a body",
            );
            assert.equal(overBarInBodies(batched, bareFrame, batchedFrame, radius), 0, "line pixels inside a body");
            assert.equal(overBar(objectsFrame, batchedFrame), 0, "against the objects path");
        });
    });

    it("stop an animated line at a translucent outline too", async () => {
        const moving = { "edge.animationSpeed": 1 };
        const frames = [];
        for (const edged of [false, true]) {
            const element = await loaded(renderer, "batched", "3d", "sphere", edged, moving);
            if (edged) {
                assert.deepInclude(element.graph.rowCounts, { pulledEdges: 1 });
            }
            frames.push({ element, frame: await readCanvas(element.graph) });
        }
        const [bare, batched] = frames;
        assert.equal(
            overBarInBodies(batched.element, bare.frame, batched.frame, bodyRadius(batched.element)),
            0,
            "line pixels inside a body",
        );
    });
});
