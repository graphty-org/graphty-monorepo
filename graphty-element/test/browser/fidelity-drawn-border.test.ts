/**
 * @file The style fidelity reader's border width (`test/fidelity/drawn-scene.ts` `readNode`) is how far the ring
 * graphty-element drew reaches past the fill, square to each side, not the width the style asked for (issue #5364):
 * a ring drawn wider than asked reads wider, so a widened ring fails the border width check.
 */

import "../../src/graphty-element";

import { type AbstractMesh, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { Node } from "../../src/Node";
import { Projector, readNode } from "../fidelity/drawn-scene";

let element: Graphty | null = null;

afterEach(() => {
    element?.remove();
    element = null;
});

/**
 * One node of the given shape with a border, drawn in 2D.
 * @param shape - its shape
 * @param set - further style channels
 * @returns the node
 */
async function bordered(shape: string, set: Record<string, unknown> = {}): Promise<Node> {
    element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "480px";
    element.style.height = "360px";
    document.body.appendChild(element);
    await element.updateComplete;
    await element.setViewMode("2d");
    await element.session.styles.add({
        name: "bordered",
        target: "node",
        selector: { match: "ids", nodes: ["n"] },
        set: { "node.shape": shape, "node.size": 6, "node.borderWidth": 0.5, "node.borderColor": "#0000ff", ...set },
    });
    await element.session.data.addNodes([{ id: "n", position: { x: 0, y: 0, z: 0 } }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    const node = element.graph.getDataManager().nodes.get("n");
    assert.isDefined(node);
    return node;
}

/**
 * The border width the node's style asks for, in render pixels.
 * @param node - the node
 * @param p - the projector
 * @returns the width
 */
function askedPx(node: Node, p: Projector): number {
    const at = node.mesh.getAbsolutePosition();
    return p.pxPerWorld(at) * node.borderReach;
}

describe("the fidelity reader's border width is the ring as drawn", () => {
    for (const shape of ["ellipse", "rectangle", "triangle", "star", "box"]) {
        it(`reads a ${shape}'s ring its asked width, and wider once the ring is drawn wider`, async () => {
            const node = await bordered(shape);
            const p = new Projector(node.mesh.getScene());
            const asked = askedPx(node, p);
            assert.isAbove(asked, 1, "the ring is wide enough to measure");
            assert.approximately(readNode(node, p, []).border?.widthPx ?? 0, asked, asked * 0.05);

            // a fault in the renderer, never in the style: the ring drawn twice as large round the node
            const ring = (node as unknown as { border: AbstractMesh | null }).border;
            assert.isNotNull(ring);
            ring.scaling = ring.scaling.multiply(new Vector3(2, 2, 1));
            assert.approximately(
                readNode(node, p, []).border?.widthPx ?? 0,
                2 * asked,
                asked * 0.1,
                "a widened ring reads wider",
            );
        });
    }

    it("reads a ring centered on a fill inset by another width as its whole band", async () => {
        // a border in screen pixels, centered on the node's size (vis-network's): the fill is inset by half the style's
        // width, the ring drawn over it at its screen width
        const node = await bordered("ellipse", { "node.borderScreenWidth": 12, "node.borderPosition": "center" });
        const p = new Projector(node.mesh.getScene());
        assert.approximately(readNode(node, p, []).border?.widthPx ?? 0, 12, 0.6);
    });
});
