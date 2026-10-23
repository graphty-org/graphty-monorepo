/**
 * @file A node's label is drawn clear of the ring around its node.
 *
 * A label sits a fixed gap above its node's own surface, and a halo (the selection ring, or one a
 * layer paints) is drawn larger than the node, so the ring used to run through the bottom of the
 * label's words. The label now keeps its gap from the ring while the node has one, and goes back
 * when the ring goes.
 *
 * Measured independently of the element's placement: the label plane's four corners after a
 * frame, projected through the scene's transform, times the share of the plane the words take;
 * the ring as its sphere's world radius projected at its centre.
 */

import "../../src/graphty-element";

import { type AbstractMesh, Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { Node } from "../../src/Node";
import { nextFrame } from "../helpers/real-input";

interface Rect {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Draw a few frames.
 * @param graph - The graph.
 */
async function draw(graph: Graph): Promise<void> {
    for (let at = 0; at < 5; at++) {
        graph.scene.render();
        await nextFrame();
    }
}

/**
 * Three labelled nodes in a row, framed whole.
 * @returns The graph.
 */
async function labelled(
    nodes = [
        { id: "Cosette", position: { x: 0, y: 0, z: 0 } },
        { id: "left", position: { x: -6, y: 0, z: 0 } },
        { id: "right", position: { x: 6, y: 0, z: 0 } },
    ],
    avoidNodesAndEdges = false,
): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "640px";
    container.style.height = "480px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    await graph.init();
    if (avoidNodesAndEdges) {
        graph.setLayoutBehavior({ labels: { declutter: true, avoidNodesAndEdges: true } });
    }

    await graph.addNodes(nodes);
    await graph.setLayout("fixed", { dim: 3 });
    await graph.getSession().styles.add({
        name: "labels",
        target: "node",
        selector: { match: "everything" },
        set: { "node.labelStyle": { enabled: true } },
    });
    await operationQueueOf(graph).waitForCompletion();
    await draw(graph);
    return graph;
}

/**
 * Project a world point to the screen.
 * @param graph - The graph.
 * @param point - The point.
 * @returns Its pixel position.
 */
function project(graph: Graph, point: Vector3): Vector3 {
    const camera = graph.scene.activeCamera;
    assert.isNotNull(camera);
    const viewport = camera.viewport.toGlobal(graph.engine.getRenderWidth(), graph.engine.getRenderHeight());
    return Vector3.Project(point, Matrix.Identity(), graph.scene.getTransformMatrix(), viewport);
}

/**
 * Where a node's label's words are drawn on screen.
 * @param graph - The graph.
 * @param node - The node.
 * @returns The words' rectangle.
 */
function words(graph: Graph, node: Node): Rect {
    const { label } = node;
    const mesh = label?.labelMesh;
    assert.isOk(label);
    assert.isOk(mesh);
    mesh.computeWorldMatrix(true);
    const { minimum, maximum } = mesh.getBoundingInfo().boundingBox;
    const corners = [
        [minimum.x, minimum.y],
        [maximum.x, minimum.y],
        [minimum.x, maximum.y],
        [maximum.x, maximum.y],
    ].map(([x, y]) => project(graph, Vector3.TransformCoordinates(new Vector3(x, y, 0), mesh.getWorldMatrix())));
    const xs = corners.map((p) => p.x);
    const ys = corners.map((p) => p.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const width = Math.max(...xs) - left;
    const height = Math.max(...ys) - top;
    const text = label.textBounds;
    return {
        left: left + text.left * width,
        right: left + text.right * width,
        top: top + text.top * height,
        bottom: top + text.bottom * height,
    };
}

/**
 * The ring around a node on screen, as a circle.
 * @param graph - The graph.
 * @param node - The node.
 * @returns Its centre and radius in pixels.
 */
function ring(graph: Graph, node: Node): { x: number; y: number; r: number } {
    const { halo } = node as unknown as { halo: AbstractMesh | null };
    assert.isOk(halo, "the node draws a ring");
    assert.isTrue(halo.isEnabled(), "the ring is on");
    halo.computeWorldMatrix(true);
    // The ring is a sphere: its box's half-extent is its radius (the bounding SPHERE of that box
    // is the box's half-diagonal, larger by a third again).
    const box = halo.getBoundingInfo().boundingBox;
    const radius = Math.max(box.extendSizeWorld.x, box.extendSizeWorld.y, box.extendSizeWorld.z);
    const camera = graph.scene.activeCamera;
    assert.isNotNull(camera);
    const right = camera.getDirection(Vector3.Right());
    const centre = project(graph, box.centerWorld);
    const edge = project(graph, box.centerWorld.add(right.scale(radius)));
    return { x: centre.x, y: centre.y, r: Math.hypot(edge.x - centre.x, edge.y - centre.y) };
}

/**
 * Whether a rectangle and a circle overlap.
 * @param rect - The rectangle.
 * @param circle - The circle.
 * @returns True when they share a point.
 */
function meets(rect: Rect, circle: { x: number; y: number; r: number }): boolean {
    const dx = circle.x - Math.max(rect.left, Math.min(circle.x, rect.right));
    const dy = circle.y - Math.max(rect.top, Math.min(circle.y, rect.bottom));
    return dx * dx + dy * dy < circle.r * circle.r;
}

describe("a label and the ring around its node", () => {
    it("are apart when the node is selected", async () => {
        const graph = await labelled();
        const node = graph.getNode("Cosette");
        assert.isOk(node);

        assert.isTrue(graph.selectNode("Cosette"));
        await operationQueueOf(graph).waitForCompletion();
        await draw(graph);

        const label = words(graph, node);
        const circle = ring(graph, node);
        assert.isFalse(
            meets(label, circle),
            `the words (bottom ${label.bottom.toFixed(1)}) reach into the ring (top ${(circle.y - circle.r).toFixed(1)})`,
        );
    });

    it("are apart when the label was moved beside its node to clear the node above it", async () => {
        // The label's own place, above, covers the node above, so the overlap pass moves it to a
        // side of its node -- and measured that side from the node, not from the ring around it.
        const graph = await labelled(
            [
                { id: "Cosette", position: { x: 0, y: 0, z: 0 } },
                { id: "above", position: { x: 0, y: 1.6, z: 0 } },
            ],
            true,
        );
        const node = graph.getNode("Cosette");
        assert.isOk(node);

        assert.isTrue(graph.selectNode("Cosette"));
        await operationQueueOf(graph).waitForCompletion();
        await draw(graph);

        const label = words(graph, node);
        const circle = ring(graph, node);
        assert.isAbove(label.bottom, circle.y - circle.r, "the setup must put the label beside the node");
        assert.isFalse(
            meets(label, circle),
            `the words (${label.left.toFixed(1)}..${label.right.toFixed(1)}, ${label.top.toFixed(1)}..${label.bottom.toFixed(1)}) reach into the ring (centre ${circle.x.toFixed(1)}, ${circle.y.toFixed(1)}, radius ${circle.r.toFixed(1)})`,
        );
    });

    it("are apart when a layer paints the ring, and the label goes back when it is gone", async () => {
        const graph = await labelled();
        const node = graph.getNode("Cosette");
        assert.isOk(node);
        const before = words(graph, node);

        const added = await graph.getSession().styles.add({
            name: "ring",
            target: "node",
            selector: { match: "ids", nodes: ["Cosette"] },
            set: { "node.haloColor": "#FFD700", "node.haloScale": 1.45, "node.haloOpacity": 1 },
        });
        await operationQueueOf(graph).waitForCompletion();
        await draw(graph);
        assert.isFalse(meets(words(graph, node), ring(graph, node)));

        await graph.getSession().styles.remove(added.id);
        await operationQueueOf(graph).waitForCompletion();
        await draw(graph);
        const after = words(graph, node);
        assert.approximately(after.bottom, before.bottom, 0.5, "with no ring the label is where it was");
    });
});
