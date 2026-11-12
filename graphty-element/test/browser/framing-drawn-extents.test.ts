/**
 * @file Framing keeps every node whole on screen, out to the box it is drawn in, whatever its shape
 * (issues #3087 and #2668). Zoom-to-fit measured each node as its centre plus or minus half its style
 * size: a default sphere is drawn larger than that, and a tetrahedron's point reaches far past it, so
 * the node at the edge of the frame was cut off.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { LayerSpec } from "../../src/catalog/types";
import { FLAT_NODE_SHAPES, NodeShapes } from "../../src/config/NodeStyle";
import { operationQueueOf } from "../../src/Graph";

const WIDTH = 480;
const HEIGHT = 360;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** Four nodes on a diamond, the shape of the story the issue was found in. */
const DIAMOND = [
    { id: "top", position: { x: 0, y: 6, z: 0 } },
    { id: "bottom", position: { x: 0, y: -6, z: 0 } },
    { id: "left", position: { x: -6, y: 0, z: 0 } },
    { id: "right", position: { x: 6, y: 0, z: 0 } },
];

/**
 * A mounted element holding nodes at fixed places, painted by one layer on every node, and framed.
 * @param viewMode - The view mode.
 * @param nodes - The nodes.
 * @param layers - The style layers.
 * @returns The element.
 */
async function mounted(viewMode: "2d" | "3d", nodes: Record<string, unknown>[], layers: LayerSpec[]): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();

    for (const layer of layers) {
        await element.session.styles.add(layer);
    }

    await element.session.data.addNodes(nodes);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();

    return element;
}

/**
 * The nodes whose drawn box reaches past the edge of the view, with how far.
 * @param element - The element.
 * @param ids - The nodes to check.
 * @returns One line per node cut off.
 */
function cutOff(element: Graphty, ids: readonly string[]): string[] {
    return ids.flatMap((id) => {
        const at = element.graph.nodeScreenPosition(id);
        assert.isDefined(at, `node ${id} is drawn`);
        const { left, top, right, bottom } = at.bounds;
        // half a pixel for rounding
        const inside = left >= -0.5 && top >= -0.5 && right <= WIDTH + 0.5 && bottom <= HEIGHT + 0.5;
        return inside
            ? []
            : [`${id}: ${[left, top, right, bottom].map((v) => v.toFixed(1)).join(", ")} in ${WIDTH} x ${HEIGHT}`];
    });
}

const SOLID = NodeShapes.options.filter((shape) => !FLAT_NODE_SHAPES.includes(shape) && shape !== "none");

describe("zoom-to-fit frames every node out to the box it is drawn in", () => {
    it.each(SOLID)("3D: a %s at every edge of the frame is whole on screen", async (shape) => {
        const element = await mounted("3d", DIAMOND, [
            {
                name: "every node",
                target: "node",
                selector: { match: "everything" },
                set: { "node.shape": shape, "node.size": 3 },
            },
        ]);

        assert.deepEqual(
            cutOff(
                element,
                DIAMOND.map((node) => node.id),
            ),
            [],
        );
    });

    it.each(["triangle", "rectangle", "star"] as const)(
        "2D: a %s at every edge of the frame is whole on screen",
        async (shape) => {
            const element = await mounted("2d", DIAMOND, [
                {
                    name: "every node",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.shape": shape, "node.size": 3 },
                },
            ]);

            assert.deepEqual(
                cutOff(
                    element,
                    DIAMOND.map((node) => node.id),
                ),
                [],
            );
        },
    );
});
