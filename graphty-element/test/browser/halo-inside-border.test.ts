/**
 * @file A node's halo reaches `node.haloScale` past the node's outline wherever its border sits (issue #10435). An
 * inside or centered border draws the node's fill in from its outline, and the halo, grown from that fill, used to
 * end in a thin band just past the border instead.
 *
 * Measured on mesh geometry: the halo's world half-height on a node with an inside border, against the same node's
 * halo with no border at all, whose outline is its fill.
 */

import type { AbstractMesh } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { nodeInternals } from "../../src/Node";

/** The look every node is drawn in: the sweep's wide cylinder with a halo. */
const LOOK = {
    "node.shape": "cylinder",
    "node.width": 1.6,
    "node.height": 1,
    "node.haloColor": "#FFBE00",
    "node.haloOpacity": 1,
    "node.haloScale": 1.45,
};

describe("a halo round a node with an inside border", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "480px";
        container.style.height = "360px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes([
            { id: "plain", x: -3, y: 0, z: 0 },
            { id: "inside", x: 0, y: 0, z: 0 },
            { id: "center", x: 3, y: 0, z: 0 },
        ]);
        await graph.setLayout("fixed");
        await operationQueueOf(graph).waitForCompletion();
        const { styles } = graph.getSession();
        await styles.add({ name: "look", target: "node", selector: { match: "everything" }, set: LOOK });
        for (const position of ["inside", "center"]) {
            await styles.add({
                name: position,
                target: "node",
                selector: { match: "ids", nodes: [position] },
                set: { "node.borderWidth": 0.3, "node.borderPosition": position, "node.borderColor": "#78C800" },
            });
        }
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * How far a node's halo reaches up and across from its center, in world units.
     * @param id - The node.
     * @returns The half-height and half-width.
     */
    function haloHalf(id: string): { x: number; y: number } {
        const node = graph.getNode(id);
        assert.isDefined(node);
        const { halo } = nodeInternals.drawn(node);
        assert.isNotNull(halo, `${id}'s halo is built`);
        assert.isTrue(halo.isEnabled(), `${id}'s halo is drawn`);
        const m: AbstractMesh = halo;
        m.computeWorldMatrix(true);
        const box = m.getBoundingInfo().boundingBox;
        return {
            x: (box.maximumWorld.x - box.minimumWorld.x) / 2,
            y: (box.maximumWorld.y - box.minimumWorld.y) / 2,
        };
    }

    for (const position of ["inside", "center"]) {
        it(`with its border ${position} reaches as far as with no border`, () => {
            const plain = haloHalf("plain");
            const bordered = haloHalf(position);
            // the border is drawn within the outline (inside) or half past it (center): an inside border's halo ends
            // where a plain node's does, a centered one's no nearer
            const past = position === "inside" ? 0 : 0.3 * 1.5 * 0.5;
            assert.approximately(bordered.y, plain.y + past, 0.01, "half-height");
            assert.approximately(bordered.x, plain.x + past, 0.01, "half-width");
        });
    }
});
