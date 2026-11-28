/**
 * @file A node's halo stands `node.haloScale` past its fill plus the width of its border, under
 * `node.sizeSpace` "screen" as under "scene" (issue #10496). The border is drawn in the mesh's own
 * units and scaled with it; the halo counted that width divided by the node's view scale, so a node
 * shrunk to its size on screen got a halo too wide by the border over that scale, wide enough to
 * cover its label.
 *
 * Measured on mesh geometry: the halo's, the fill's and the border's world bounding boxes.
 */

import type { AbstractMesh } from "@babylonjs/core";
import { afterAll, assert, beforeAll, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { nodeInternals } from "../../src/Node";

const HALO_SCALE = 1.45;

let container: HTMLElement;
let graph: Graph;

beforeAll(async () => {
    container = document.createElement("div");
    container.style.width = "480px";
    container.style.height = "360px";
    document.body.appendChild(container);
    graph = new Graph(container);
    await graph.init();
    await graph.addNodes([{ id: "a", label: "a" }]);
    await graph.setLayout("fixed");
    await operationQueueOf(graph).waitForCompletion();
});

afterAll(() => {
    graph.dispose();
    container.remove();
});

const halfWidth = (mesh: AbstractMesh): number => {
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    return (box.maximumWorld.x - box.minimumWorld.x) / 2;
};

it("a halo round a node drawn at its screen size reaches past its border by haloScale, not by the border over the view scale", async () => {
    const { styles } = graph.getSession();
    await styles.add({
        name: "screen",
        target: "node",
        selector: { match: "ids", nodes: ["a"] },
        set: {
            "node.shape": "box",
            "node.sizeSpace": "screen",
            "node.borderWidth": 0.3,
            "node.borderColor": "#202020",
        },
    });
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    await styles.add({
        name: "ring",
        target: "node",
        selector: { match: "ids", nodes: ["a"] },
        set: { "node.haloColor": "#FFBE00", "node.haloOpacity": 1, "node.haloScale": HALO_SCALE },
    });
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();

    const node = graph.getNode("a");
    assert.isDefined(node);
    assert.isBelow(node.drawnScale, 0.95, "screen sizing changed the node's drawn scale");
    const { halo, border } = nodeInternals.drawn(node);
    assert.isNotNull(halo, "the halo is built");
    assert.isNotNull(border, "the border is built");
    const fill = halfWidth(node.mesh);
    const ring = halfWidth(border) - fill;
    assert.isAbove(ring, 0, "the border reaches past the fill");
    // the band past the fill: haloScale's share of the fill, and the border's drawn width
    assert.approximately(halfWidth(halo), HALO_SCALE * fill + ring, 0.01 * fill);
});
