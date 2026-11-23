/**
 * @file In 3D, a label inside a group lies on the group's box, not one bounding radius in front of it.
 *
 * A group is drawn as a flat box behind its members. Its inside label used to hang from a pivot turned
 * like the camera, half the box's diagonal toward the eye, so in perspective it floated far off the box,
 * above it on screen (issue #2320). It now lies on the box's front face. Checked through the scene:
 * where the label's plane is against the group's box, never pixels.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

describe("a group's inside label in 3D", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("lies on the group's box, inside its top", async () => {
        const session = graph.getSession();
        await session.data.addNodes([
            { id: "team" },
            { id: "a", parent: "team", position: { x: -10, y: -4, z: 0 } },
            { id: "b", parent: "team", position: { x: 10, y: -4, z: 0 } },
            { id: "c", parent: "team", position: { x: 0, y: 6, z: 0 } },
        ]);
        await graph.setLayout("fixed");
        await session.styles.add({
            name: "group label",
            target: "node",
            selector: { match: "has", path: "graphty.members" },
            set: { "node.label": "TEAM", "node.labelLocation": "inside-top" },
        });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();

        const box = graph.getLayoutManager().groupBox("team");
        assert.exists(box, "team is drawn as a group");
        const plane = graph.getNode("team")?.label?.labelMesh;
        assert.exists(plane, "the group draws a label");
        plane.computeWorldMatrix(true);
        const at = plane.getAbsolutePosition();
        const { center, half } = box;

        // on the box: no nearer the camera (-z) than its members' own front, nor behind its back
        assert.isAbove(at.z, center.z - half.z, "the label is no further toward the eye than the group's box");
        assert.isAtMost(at.z, center.z + half.z + Math.min(half.x, half.y), "the label is not behind the group");
        // inside its top half, across its width
        assert.isAbove(at.y, center.y, "the label is in the box's top half");
        assert.isBelow(Math.abs(at.x - center.x), half.x, "the label is across the box's width");
    });
});
