/**
 * @file A node's further texts written with no point of their own (a record's fields) stack one
 * line apart, top to bottom, rather than all at the node's center; a text with a point keeps it.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

/** Where one drawn text's plane lies on the canvas's vertical axis, in world units. */
interface Span {
    readonly top: number;
    readonly bottom: number;
}

describe("record fields with no point", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
        await graph.setLayout("fixed", { dim: 2 });
        await graph.getSession().styles.add({
            name: "Record",
            target: "node",
            selector: { match: "everything" },
            set: {
                "node.shape": "rectangle",
                "node.size": 4,
                "node.shapeTexts": JSON.stringify([["one"], ["two"], ["three"], [0.5, 0.5, "placed"]]),
            },
        });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * The vertical extent of each drawn text.
     * @returns One span per text, in the order written.
     */
    function spans(): Span[] {
        const node = graph.getNode("a");
        assert.isDefined(node);
        return node.shapeTextLabels.map((label) => {
            const mesh = label.labelMesh;
            assert.isNotNull(mesh);
            mesh.computeWorldMatrix(true);
            const box = mesh.getBoundingInfo().boundingBox;
            return { top: box.maximumWorld.y, bottom: box.minimumWorld.y };
        });
    }

    it("stacks them a line apart, downwards, with no two overlapping, and keeps a given point", () => {
        const drawn = spans();
        assert.lengthOf(drawn, 4);
        const [one, two, three, placed] = drawn;
        assert.isAbove(one.bottom, two.bottom, "the second field is below the first");
        assert.isAbove(two.bottom, three.bottom, "the third is below the second");
        assert.isAtLeast(one.bottom, two.top - 1e-6, "the first and second do not overlap");
        assert.isAtLeast(two.bottom, three.top - 1e-6, "the second and third do not overlap");
        assert.isAbove(placed.bottom, one.bottom, "a text with a point keeps it (up and right of the center)");
    });
});
