/**
 * @file An arrowhead touches the node it points at when the node's outline is neither its box nor a
 * circle (a star, a diamond), on both render paths, in 2D and 3D (issue #9872).
 *
 * The graph is loaded into an element already drawn, so on `"batched"` most rows have no Node object
 * (asserted). The shape is set from the start or by a layer added after the load. With the layer, the
 * `"batched"` path had kept each arrowed edge's ends measured against the sphere the rows were first
 * painted as, so the arrowhead stopped short of the star. The check walks the canvas from each arrowed edge's target center toward its source:
 * past the node's blue ink, the edge's magenta ink must start within {@link GAP} pixels.
 *
 * How to run, from graphty-element:
 *   npx vitest run --project=render-parity test/render-parity/outlined-node-arrowheads.test.ts
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { blue, magenta } from "../helpers/drawn-invariants";
import { type CanvasFrame, readCanvas } from "../helpers/whole-canvas";

const N = 8;
const IDS = Array.from({ length: N }, (_, i) => String(i));
/** Arrowed edges, in disjoint parts, and a plain one. */
const EDGES = [
    { source: "0", target: "1", directed: false },
    { source: "2", target: "3" },
    { source: "6", target: "4" },
];
const ARROWED = EDGES.filter((edge) => edge.directed !== false);
/** Pixels of antialiasing allowed between the node's ink and the arrowhead's. */
const GAP = 2;

afterEach(() => {
    document.body.replaceChildren();
});

/**
 * Draw the graph with every node in one shape.
 * @param path - The render path.
 * @param view - 2D or 3D.
 * @param shape - The node shape.
 * @param after - Whether the shape arrives in a layer added after the graph is drawn.
 * @returns The element, settled.
 */
async function draw(path: "objects" | "batched", view: "2d" | "3d", shape: string, after: boolean): Promise<Graphty> {
    const element: Graphty = document.createElement("graphty-element");
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "400px";
    document.body.replaceChildren(element);
    await element.updateComplete;
    await element.setViewMode(view);
    await element.session.styles.add({
        name: "Node ink",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#2040ff", "node.size": 0.6, ...(after ? {} : { "node.shape": shape }) },
    });
    await element.session.styles.add({
        name: "Edge ink",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#ff00ff", "edge.width": 4 },
    });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();

    const a = (i: number): number => (2 * Math.PI * i) / N;
    await element.session.data.addNodes(
        IDS.map((id, i) => ({ id, position: { x: 4 * Math.cos(a(i)), y: 4 * Math.sin(a(i)), z: 0 } })),
    );
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    if (path === "batched") {
        assert.isBelow(dataManagerInternals.nodesBuilt(element.graph.getDataManager()), N, "some rows have no Node");
    }

    if (after) {
        await element.session.styles.add({
            name: "Shape",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": shape },
        });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
    }

    return element;
}

/**
 * The pixels between a node's ink and the arrowhead's, walking from the node's center toward the other end.
 * @param frame - The canvas, rows bottom up as WebGL reads them.
 * @param from - The target's center, in CSS pixels (one canvas pixel each).
 * @param to - The source's center.
 * @returns The gap in pixels, or null when no arrowhead ink lies on the way.
 */
function gapToArrow(frame: CanvasFrame, from: { x: number; y: number }, to: { x: number; y: number }): number | null {
    const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y));
    let leftNode = false;
    let gap = 0;
    for (let s = 0; s <= steps; s++) {
        const x = Math.round(from.x + ((to.x - from.x) * s) / steps);
        const y = frame.height - 1 - Math.round(from.y + ((to.y - from.y) * s) / steps);
        const at = (y * frame.width + x) * 4;
        const p = [...frame.pixels.subarray(at, at + 3)];
        if (magenta(p)) {
            return gap;
        }

        if (blue(p)) {
            if (leftNode) {
                return null;
            }

            continue;
        }

        leftNode = true;
        gap++;
    }

    return null;
}

describe.each(["3d", "2d"] as const)("arrowheads at outlined nodes, %s", (view) => {
    it.for(
        (["objects", "batched"] as const).flatMap((path) => [
            [path, false],
            [path, true],
        ]) as ["objects" | "batched", boolean][],
    )("%s, shape in a layer added after the load: %s", async ([path, after]) => {
        for (const shape of ["star", "diamond"]) {
            const element = await draw(path, view, shape, after);
            const frame = await readCanvas(element.graph);
            for (const { source, target } of ARROWED) {
                const head = element.nodeScreenPosition(target);
                const tail = element.nodeScreenPosition(source);
                assert.isDefined(head);
                assert.isDefined(tail);
                const gap = gapToArrow(frame, head, tail);
                assert.isNotNull(
                    gap,
                    `${shape} ${source}->${target} on ${path} in ${view} (after: ${String(after)}): an arrowhead`,
                );
                assert.isAtMost(
                    gap ?? Infinity,
                    GAP,
                    `${shape} ${source}->${target} on ${path} in ${view} (after: ${String(after)}): pixels between the node and its arrowhead`,
                );
            }
        }
    });
});
