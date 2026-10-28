/**
 * @file A group a file stores no position for follows its members.
 *
 * A Graphviz cluster, a GraphML nested graph (yEd's groups) and a Cytoscape.js compound node all
 * reach the element as a node that holds others. With no stored position such a node is not laid
 * out as a node of its own: the force layout holds it, it pushes nothing, and the element puts it
 * on its members' padded box. Counted, not timed: a fixed number of layout steps, and the group's
 * row checked between every one of them.
 */

import { Ray, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { RenderManager } from "../../src/managers/RenderManager";
import type { UpdateManager } from "../../src/managers/UpdateManager";

const DOT = `digraph {
  a -> b;
  subgraph clusterC { label="c"; m1; m2; m1 -> m2; }
  b -> m1;
}`;

const GRAPHML = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph id="G" edgedefault="directed">
    <node id="a"/>
    <node id="g">
      <graph id="g:" edgedefault="directed">
        <node id="g::m1"/>
        <node id="g::m2"/>
      </graph>
    </node>
    <edge source="a" target="g::m1"/>
    <edge source="g::m1" target="g::m2"/>
  </graph>
</graphml>`;

const CYTOSCAPE = JSON.stringify({
    elements: [
        { data: { id: "outer" } },
        { data: { id: "inner", parent: "outer" } },
        { data: { id: "m1", parent: "inner" } },
        { data: { id: "m2", parent: "inner" } },
        { data: { id: "m3", parent: "outer" } },
        { data: { id: "free" } },
        { data: { id: "e1", source: "m1", target: "m2" } },
        { data: { id: "e2", source: "m2", target: "m3" } },
        { data: { id: "e3", source: "m3", target: "free" } },
    ],
});

/** How many layout steps each case takes, checking the groups between every one. */
const STEPS = 60;

describe("a group with no stored position follows its members", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Where a node's row is.
     * @param id - The node.
     * @returns Its coordinates.
     */
    function at(id: string): { x: number; y: number; z: number } {
        const node = graph.getDataManager().nodes.get(id);
        assert.isDefined(node, id);
        const out = { x: Number.NaN, y: Number.NaN, z: Number.NaN };
        assert.isTrue(graph.getDataManager().positions.isPlaced(node.index), `${id} is placed`);
        graph.getDataManager().positions.read(node.index, out);
        return out;
    }

    /**
     * Load a file, then step the force layout a counted number of times: the layout never moves a
     * group (its row is where the element last put it after every step), and once the element
     * places it, the group sits at the centre of its members' box and its box holds every member.
     * @param type - The data source.
     * @param data - The file.
     * @param groups - Each group and the nodes inside it, an inner group's included.
     */
    async function follows(type: string, data: string, groups: Record<string, readonly string[]>): Promise<void> {
        await graph.addDataFromSource(type, { data });
        await operationQueueOf(graph).waitForCompletion();
        const layout = graph.getLayoutManager();
        assert.strictEqual(layout.layoutType, "ngraph");
        layout.running = true;
        layout.placeGroups();

        for (let step = 0; step < STEPS; step++) {
            const before = new Map(Object.keys(groups).map((id) => [id, at(id)]));
            layout.step();
            for (const [id, was] of before) {
                assert.deepEqual(at(id), was, `step ${step}: the layout moved group ${id}`);
            }

            layout.placeGroups();
        }

        for (const [id, inside] of Object.entries(groups)) {
            const box = layout.groupBox(id);
            assert.isDefined(box, `${id} is a following group`);
            // The row is stored at f32, the box computed at f64.
            const centre = at(id);
            for (const axis of ["x", "y", "z"] as const) {
                assert.closeTo(centre[axis], box.center[axis], 1e-4, `${id} sits at its box's centre`);
            }

            for (const member of inside) {
                const p = at(member);
                for (const axis of ["x", "y", "z"] as const) {
                    assert.isAtMost(Math.abs(p[axis] - box.center[axis]), box.half[axis], `${member} is inside ${id}`);
                }
            }
        }
    }

    it("puts a Graphviz cluster on its members' box", async () => {
        await follows("dot", DOT, { clusterC: ["m1", "m2"] });
        assert.isUndefined(graph.getLayoutManager().groupBox("a"), "an ordinary node is laid out");
    });

    it("puts a GraphML nested graph (a yEd group) on its members' box", async () => {
        await follows("graphml", GRAPHML, { g: ["g::m1", "g::m2"] });
    });

    it("puts Cytoscape.js compound nodes on their members' box, an inner one inside the outer", async () => {
        await follows("json", CYTOSCAPE, { inner: ["m1", "m2"], outer: ["m1", "m2", "m3"] });
        assert.strictEqual(graph.getDataManager().nodes.size, 6, "every node the file declares is in the graph");
    });

    it("puts a Cytoscape.js compound the file saved a position for on its members' box", async () => {
        // cy.json() saves a position for a compound node too; Cytoscape.js draws the compound around its children
        const saved = JSON.stringify({
            elements: {
                nodes: [
                    { data: { id: "group" }, position: { x: 500, y: 500 } },
                    { data: { id: "m1", parent: "group" }, position: { x: 0, y: 0 } },
                    { data: { id: "m2", parent: "group" }, position: { x: 100, y: 0 } },
                    { data: { id: "free" }, position: { x: 300, y: 300 } },
                ],
                edges: [{ data: { id: "e1", source: "m1", target: "m2" } }],
            },
        });
        await graph.addDataFromSource("json", { data: saved });
        await operationQueueOf(graph).waitForCompletion();
        const layout = graph.getLayoutManager();
        layout.placeGroups();
        const box = layout.groupBox("group");
        assert.isDefined(box, "the compound follows its members");
        const m1 = at("m1");
        const m2 = at("m2");
        assert.closeTo(box?.center.x ?? Number.NaN, (m1.x + m2.x) / 2, 1e-4, "centred between its members");
        assert.closeTo(at("group").x, (m1.x + m2.x) / 2, 1e-4, "drawn there, not at its saved position");
        assert.isUndefined(layout.groupBox("free"), "an ordinary node keeps its saved position");
    });

    it("draws a group around a group it holds alone, its margin wide on every side, not over it", async () => {
        const nested = JSON.stringify({
            elements: [
                { data: { id: "outer" } },
                { data: { id: "inner", parent: "outer" } },
                { data: { id: "m1", parent: "inner" } },
                { data: { id: "m2", parent: "inner" } },
                { data: { id: "e1", source: "m1", target: "m2" } },
            ],
        });
        await follows("json", nested, { inner: ["m1", "m2"], outer: ["m1", "m2"] });
        const layout = graph.getLayoutManager();
        const inner = layout.groupBox("inner");
        const outer = layout.groupBox("outer");
        assert.isDefined(inner);
        assert.isDefined(outer);
        const margin = (outer?.half.x ?? 0) - (inner?.half.x ?? 0);
        assert.isAbove(margin, 0, "the outer group reaches past the inner one");
        assert.closeTo((outer?.half.y ?? 0) - (inner?.half.y ?? 0), margin, 1e-9, "by the same margin on every side");
    });

    it("draws a group as a thin, faint region behind its members, which hides none of them", async () => {
        await follows("dot", DOT, { clusterC: ["m1", "m2"] });
        const { nodes } = graph.getDataManager();
        for (const node of nodes.values()) {
            node.update();
        }

        const group = nodes.get("clusterC");
        assert.isDefined(group);
        const { mesh } = group;
        mesh.computeWorldMatrix(true);
        const box = mesh.getBoundingInfo().boundingBox;
        const across = Math.min(box.maximumWorld.x - box.minimumWorld.x, box.maximumWorld.y - box.minimumWorld.y);
        assert.isBelow(box.maximumWorld.z - box.minimumWorld.z, across * 0.05, "the region is thin");
        assert.strictEqual(group.shapeType, "round-rectangle", "an unstyled group is a flat region, not a solid");
        assert.isBelow(mesh.visibility, 1, "an unstyled group is drawn faint");

        // Both views look along +z: a ray from in front of each member, down the view axis.
        const scene = graph.getScene();
        let hidden = 0;
        for (const id of ["m1", "m2"]) {
            const member = nodes.get(id);
            assert.isDefined(member);
            member.mesh.computeWorldMatrix(true);
            const target = member.mesh.getAbsolutePosition();
            const ray = new Ray(target.subtract(new Vector3(0, 0, 1000)), new Vector3(0, 0, 1), 2000);
            const hit = scene.pickWithRay(ray, (m) => m === member.mesh || m === mesh);
            if (hit?.pickedMesh !== member.mesh) {
                hidden++;
            }
        }

        assert.strictEqual(hidden, 0, "the ray to every member's centre meets the member before its group");
    });

    it("draws a group the same size in 2D wherever the orthographic camera sits along the view axis", async () => {
        // An orthographic view has no perspective: a group grown for the camera's distance was drawn larger while the
        // camera was near (before the view was framed) than after, so its size depended on which frame drew it last
        // (issue #3107)
        await graph.setViewMode("2d");
        await follows("dot", DOT, { clusterC: ["m1", "m2"] });
        const group = graph.getDataManager().nodes.get("clusterC");
        assert.isDefined(group);
        const camera = graph.getScene().activeCamera;
        assert.isNotNull(camera);
        const width = (z: number): number => {
            camera.position.z = z;
            group.update();
            return group.drawnHalfExtents.x;
        };
        const near = width(-10);
        const far = width(-1000);
        assert.isAbove(near, 0);
        assert.closeTo(near, far, 1e-9, "the drawn width does not follow the camera's distance");
    });

    it("ends an uncapped edge to a group at the group's outline, not under it at its middle", async () => {
        // Cytoscape.js ends an edge to a compound node on the compound's box; the region is drawn behind the
        // edge, so a line from its middle would show across it
        const saved = JSON.stringify({
            elements: {
                nodes: [
                    { data: { id: "group" } },
                    { data: { id: "m1", parent: "group" }, position: { x: 0, y: 0 } },
                    { data: { id: "m2", parent: "group" }, position: { x: 100, y: 40 } },
                    { data: { id: "free" }, position: { x: 300, y: 20 } },
                ],
                edges: [{ data: { id: "e", source: "group", target: "free" } }],
            },
            style: [{ selector: "edge", style: { "target-arrow-shape": "none", "curve-style": "straight" } }],
        });
        await graph.addDataFromSource("json", { data: saved });
        await operationQueueOf(graph).waitForCompletion();
        const layout = graph.getLayoutManager();
        layout.placeGroups();
        const { nodes, edges } = graph.getDataManager();
        for (const node of nodes.values()) {
            node.update();
        }
        const group = nodes.get("group");
        assert.isDefined(group);
        assert.isTrue(group.isDrawnAsGroup, "the compound is drawn as a region");
        const edge = [...edges.values()][0];
        assert.isDefined(edge);
        edge.invalidatePositionCache();
        edge.update();
        const line = edge.drawnLine;
        assert.isNotNull(line);
        const from = at("group");
        const to = at("free");
        const between = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
        // the shorter half of the region across the view: the line leaves it no nearer its middle than that
        const half = Math.min(group.drawnHalfExtents.x, group.drawnHalfExtents.y);
        assert.isAbove(half, 0);
        // the line runs from the region's right side to the free node: a group's half width shorter
        assert.isBelow(
            line?.length ?? Number.POSITIVE_INFINITY,
            between - 0.9 * half,
            "the line starts at the outline",
        );
        assert.isAbove(line?.length ?? 0, between - 1.6 * half, "and not far inside the gap");
    });

    // A repaint reaches the meshes after the frame that last placed the groups when the layout has
    // stopped and nothing is framing: the frames that apply it place no group. A member it grew left
    // its group's box short of it, and a group it rebuilt was drawn unstretched -- the cytoscape.js
    // groups specimen drew a third of its groups without their padding, depending on which frame
    // the paint landed on (issue #3478).
    it("draws a group over its members' new box when a repaint lands after the layout has stopped", async () => {
        const saved = JSON.stringify({
            elements: {
                nodes: [
                    { data: { id: "group" } },
                    { data: { id: "m1", parent: "group" }, position: { x: 0, y: 0 } },
                    { data: { id: "m2", parent: "group" }, position: { x: 100, y: 0 } },
                ],
                edges: [],
            },
            style: [{ selector: ":parent", style: { "border-width": 2, "border-color": "#505050" } }],
        });
        await graph.getSession().data.import({ type: "json", config: { data: saved } }, { styles: "file" });
        await operationQueueOf(graph).waitForCompletion();
        // Every frame below is drawn by hand, so the live loop cannot draw one in between.
        const release = (graph as unknown as { renderManager: RenderManager }).renderManager.holdFrames();
        try {
            await graph.setLayout("fixed");
            const updates = (graph as unknown as { updateManager: UpdateManager }).updateManager;
            const layout = graph.getLayoutManager();
            layout.running = false;
            updates.stepFrames(5);
            const group = graph.getDataManager().nodes.get("group");
            assert.isDefined(group);
            assert.isTrue(group.isDrawnAsGroup);

            await graph.getSession().styles.add({
                name: "Bigger",
                target: "node",
                selector: { match: "everything" },
                set: { "node.size": 30 },
            });
            await graph.getSession().styles.settled();
            const painter = graph.getStylePainter();
            for (let frame = 0; frame < 10 && painter.hasPending; frame++) {
                updates.update(16);
            }
            assert.isFalse(painter.hasPending, "the repaint was drawn");
            const drawn = group.drawnHalfExtents.x;

            // Where the group belongs, placed and drawn now from the members as they are drawn.
            layout.placeGroups();
            group.update();
            assert.closeTo(drawn, group.drawnHalfExtents.x, 1e-6, "the group was drawn over its members' box");

            // A later repaint prunes the mesh cache: the group's outline must keep its material.
            await graph.getSession().styles.add({
                name: "Red members",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "#ff0000" },
            });
            await graph.getSession().styles.settled();
            for (let frame = 0; frame < 10 && painter.hasPending; frame++) {
                updates.update(16);
            }
            const outline = group.mesh.getChildMeshes(true).find((m) => m.name === "node-border" && m.isEnabled());
            assert.isDefined(
                outline,
                `the group is drawn with an outline: ${group.mesh
                    .getChildMeshes(true)
                    .map((m) => m.name)
                    .join(", ")}`,
            );
            assert.isOk(outline.material, "the outline is drawn with its material, not stripped by the cache");
        } finally {
            release();
        }
    });

    it("lays a group out like any node when behavior.layout.groupsFollowMembers is false", async () => {
        graph.setLayoutBehavior({ layout: { groupsFollowMembers: false } });
        await graph.addDataFromSource("dot", { data: DOT });
        await operationQueueOf(graph).waitForCompletion();
        graph.getLayoutManager().placeGroups();
        assert.isUndefined(graph.getLayoutManager().groupBox("clusterC"));
    });
});
