/**
 * @file A node's label is placed against the node's outline, wherever its border sits.
 *
 * A border centered on the outline (`node.borderPosition` "center": vis-network's and Pajek's canvas stroke) or
 * inside it ("inside") draws the node's fill in from the outline, and the label used to be placed against that fill:
 * a label under a node with a centered border 8 wide sat 4 nearer the node than one under the same node with no
 * border, and every vis-network and Pajek label was pulled in with it. The label now keeps its place against the
 * outline. Checked through the scene: where the label's plane is, never pixels.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

/** The node's size, and a border wide enough that drawing the fill in by it moves the label visibly. */
const NODE_SIZE = 2;
const BORDER = 0.8;

describe("a node's label against its outline", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;
    let layerId: string | undefined;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setViewMode("2d");
        session = graph.getSession();
        await graph.addNodes([{ id: "a" }]);
        await graph.setLayout("fixed");
        layerId = undefined;
        await operationQueueOf(graph).waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Style the node, wait until it is drawn, and measure how far its label's middle is from the node's middle.
     * @param location - Where the label is.
     * @param border - The border's width and position, or none.
     * @param border.width - Its width.
     * @param border.position - Where it sits against the outline.
     * @returns The label's middle less the node's, in world units (y up).
     */
    async function labelFromNode(
        location: string,
        border?: { width: number; position: "inside" | "center" | "outside" },
    ): Promise<{ x: number; y: number }> {
        const set = {
            "node.shape": "rectangle",
            "node.size": NODE_SIZE,
            "node.label": "HELLO",
            "node.labelLocation": location,
            "node.borderWidth": border?.width ?? 0,
            "node.borderPosition": border?.position ?? "outside",
            "node.borderColor": "#ff0000",
        } as const;
        if (layerId === undefined) {
            layerId = (
                await session.styles.add({ name: "under test", target: "node", selector: { match: "everything" }, set })
            ).id;
        } else {
            await session.styles.update(layerId, { set });
        }
        await graph.waitForStableFrame();
        const node = graph.getNode("a");
        const plane = node?.label?.labelMesh;
        assert.exists(node);
        assert.exists(plane, "the node draws a label");
        plane.computeWorldMatrix(true);
        const at = plane.getAbsolutePosition().subtract(node.mesh.getAbsolutePosition());
        return { x: at.x, y: at.y };
    }

    for (const position of ["center", "inside"] as const) {
        it(`keeps a label beside the node where it is with no border, under a border ${position}`, async () => {
            const bare = await labelFromNode("bottom");
            const bordered = await labelFromNode("bottom", { width: BORDER, position });
            assert.closeTo(bordered.y, bare.y, 1e-6);
            const right = await labelFromNode("right");
            const borderedRight = await labelFromNode("right", { width: BORDER, position });
            assert.closeTo(borderedRight.x, right.x, 1e-6);
        });

        it(`keeps a label inside the node where it is with no border, under a border ${position}`, async () => {
            const bare = await labelFromNode("inside-top");
            const bordered = await labelFromNode("inside-top", { width: BORDER, position });
            assert.closeTo(bordered.y, bare.y, 1e-6);
        });
    }

    it("leaves a label beside a node with its border outside where it was", async () => {
        const bare = await labelFromNode("bottom");
        const outside = await labelFromNode("bottom", { width: BORDER, position: "outside" });
        assert.closeTo(outside.y, bare.y, 1e-6);
    });
});
