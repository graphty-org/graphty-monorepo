/**
 * @file Nodes are not drawn inside each other, and labels move off the nodes and edges they cover.
 *
 * Two opt-in settings, both off by default:
 *
 * - `ngraph`'s `nodeGap` keeps every two nodes at least their drawn radii plus the gap apart, read
 *   from each node's drawn size -- including a size a style gives the nodes after the layout
 *   came to rest. Off, nodes styled large overlap where the force layout puts them close.
 * - `layoutBehavior.labels.avoidNodesAndEdges` moves a label from the place its style puts it to
 *   a place around its node that covers no other node or edge. Off, a label above its node is
 *   drawn over the node above that.
 *
 * Every measurement is taken independently of the code under test: node centres and radii from the
 * meshes, label rectangles from each label's world bounding box projected through the scene.
 */

import "../../src/graphty-element";

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { nextFrame } from "../helpers/real-input";

const WIDTH = 640;
const HEIGHT = 480;

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    graph?.dispose();
    container?.remove();
    graph = undefined;
});

async function mount(): Promise<Graph> {
    container = document.createElement("div");
    container.style.width = `${String(WIDTH)}px`;
    container.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(container);
    const g = new Graph(container);
    graph = g;
    await g.init();
    return g;
}

/** A ring of twelve with a hub: a force layout pulls the leaves close around it. */
function star(): { nodes: { id: string }[]; edges: { src: string; dst: string }[] } {
    const nodes = [{ id: "hub" }, ...Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}` }))];
    const edges = nodes.slice(1).map((n) => ({ src: "hub", dst: n.id }));
    return { nodes, edges };
}

async function settle(g: Graph): Promise<void> {
    await operationQueueOf(g).waitForCompletion();
    for (let frame = 0; frame < 4000 && !g.getLayoutManager().isSettled; frame++) {
        g.getLayoutManager().step();
    }

    g.scene.render();
}

/**
 * Every pair of nodes whose drawn spheres overlap: centres where the layout put them, radii from
 * each mesh's own bounding box and scaling.
 * @param g - The graph.
 * @param front - Compare only x and y: as seen from the front, along the depth axis.
 * @returns The overlapping pairs, as "a-b".
 */
function overlappingPairs(g: Graph, front = false): string[] {
    const engine = g.getLayoutManager().layoutEngine;
    assert.isDefined(engine);
    const nodes = [...g.getDataManager().nodes.values()].map((node) => {
        const { x, y, z } = engine.getNodePosition(node);
        const { extendSize } = node.mesh.getBoundingInfo().boundingBox;
        const { scaling } = node.mesh;
        const r =
            Math.max(extendSize.x, extendSize.y, extendSize.z) *
            Math.max(Math.abs(scaling.x), Math.abs(scaling.y), Math.abs(scaling.z));
        return { id: String(node.id), at: new Vector3(x, y, front ? 0 : (z ?? 0)), r };
    });
    const pairs: string[] = [];
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            if (Vector3.Distance(nodes[i].at, nodes[j].at) < (nodes[i].r + nodes[j].r) * 0.999) {
                pairs.push(`${nodes[i].id}-${nodes[j].id}`);
            }
        }
    }

    return pairs;
}

async function sizeEveryNode(g: Graph, size: number): Promise<void> {
    await g.getSession().styles.add({
        name: "big",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": size },
    });
    await operationQueueOf(g).waitForCompletion();
    // The style is painted on a frame: draw until every node has its new size.
    const nodes = [...g.getDataManager().nodes.values()];
    for (let frame = 0; frame < 100 && !nodes.every((node) => node.size === size); frame++) {
        g.scene.render();
        await nextFrame();
    }

    assert.isTrue(
        nodes.every((node) => node.size === size),
        "every node was painted at its new size",
    );
}

describe("ngraph's nodeGap keeps drawn nodes apart", () => {
    it("lets large nodes overlap when nodeGap is unset, which is the default", async () => {
        const g = await mount();
        const { nodes, edges } = star();
        await g.addNodes(nodes);
        await g.addEdges(edges);
        await sizeEveryNode(g, 12);
        await g.setLayout("ngraph", { seed: 7, dim: 2 });
        await settle(g);

        assert.isAbove(overlappingPairs(g).length, 0, "the setup must reproduce the overlap");
    });

    it("draws no node inside another with nodeGap set", async () => {
        const g = await mount();
        const { nodes, edges } = star();
        await g.addNodes(nodes);
        await g.addEdges(edges);
        await sizeEveryNode(g, 12);
        await g.setLayout("ngraph", { seed: 7, dim: 2, nodeGap: 1 });
        await settle(g);

        assert.deepEqual(overlappingPairs(g), []);
    });

    it("keeps them apart in 3D too", async () => {
        const g = await mount();
        const { nodes, edges } = star();
        await g.addNodes(nodes);
        await g.addEdges(edges);
        await sizeEveryNode(g, 12);
        await g.setLayout("ngraph", { seed: 7, dim: 3, nodeGap: 1 });
        await settle(g);

        assert.deepEqual(overlappingPairs(g), []);
    });

    it("keeps them apart as seen from the front with nodeGapFront, which depth alone does not", async () => {
        const g = await mount();
        const { nodes, edges } = star();
        await g.addNodes(nodes);
        await g.addEdges(edges);
        await sizeEveryNode(g, 12);
        await g.setLayout("ngraph", { seed: 7, dim: 3, nodeGap: 1, nodeGapFront: true });
        await settle(g);

        assert.deepEqual(overlappingPairs(g, true), []);
    });

    it("moves nodes apart again when a style makes them larger after the layout came to rest", async () => {
        const g = await mount();
        const { nodes, edges } = star();
        await g.addNodes(nodes);
        await g.addEdges(edges);
        await g.setLayout("ngraph", { seed: 7, dim: 2, nodeGap: 1 });
        await settle(g);
        assert.isTrue(g.getLayoutManager().isSettled);

        await sizeEveryNode(g, 12);
        assert.isFalse(g.getLayoutManager().isSettled, "a node that grew wakes the layout");
        await settle(g);

        assert.deepEqual(overlappingPairs(g), []);
    });
});

interface Rect {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

/**
 * Where a node's label's words are on screen, from the label's world bounding box.
 * @param g - The graph.
 * @param id - The node.
 * @returns The rectangle, or null when the label is not drawn.
 */
function wordsOf(g: Graph, id: string): Rect | null {
    const camera = g.scene.activeCamera;
    assert.isNotNull(camera);
    const viewport = camera.viewport.toGlobal(g.engine.getRenderWidth(), g.engine.getRenderHeight());
    const label = g.getNode(id)?.label;
    const mesh = label?.labelMesh;
    assert.isOk(label);
    assert.isOk(mesh);
    if (!mesh.isEnabled() || !mesh.isVisible) {
        return null;
    }

    mesh.computeWorldMatrix(true);
    const xs: number[] = [];
    const ys: number[] = [];
    for (const corner of mesh.getBoundingInfo().boundingBox.vectorsWorld) {
        const p = Vector3.Project(corner, Matrix.Identity(), g.scene.getTransformMatrix(), viewport);
        xs.push(p.x);
        ys.push(p.y);
    }

    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const w = Math.max(...xs) - left;
    const h = Math.max(...ys) - top;
    const text = label.textBounds;
    return {
        left: left + text.left * w,
        right: left + text.right * w,
        top: top + text.top * h,
        bottom: top + text.bottom * h,
    };
}

/**
 * A node on screen: its centre and radius, from its mesh.
 * @param g - The graph.
 * @param id - The node.
 * @returns The circle.
 */
function circleOf(g: Graph, id: string): { x: number; y: number; r: number } {
    const camera = g.scene.activeCamera;
    assert.isNotNull(camera);
    const viewport = camera.viewport.toGlobal(g.engine.getRenderWidth(), g.engine.getRenderHeight());
    const mesh = g.getNode(id)?.mesh;
    assert.isOk(mesh);
    mesh.computeWorldMatrix(true);
    const centre = mesh.getAbsolutePosition();
    const radius = Math.max(...mesh.getBoundingInfo().boundingBox.extendSizeWorld.asArray());
    const right = camera
        .getDirection(new Vector3(1, 0, 0))
        .scale(radius)
        .addInPlace(centre);
    const c = Vector3.Project(centre, Matrix.Identity(), g.scene.getTransformMatrix(), viewport);
    const k = Vector3.Project(right, Matrix.Identity(), g.scene.getTransformMatrix(), viewport);
    return { x: c.x, y: c.y, r: Math.hypot(k.x - c.x, k.y - c.y) };
}

function meetsCircle(rect: Rect, c: { x: number; y: number; r: number }): boolean {
    const dx = c.x - Math.max(rect.left, Math.min(c.x, rect.right));
    const dy = c.y - Math.max(rect.top, Math.min(c.y, rect.bottom));
    return dx * dx + dy * dy < c.r * c.r;
}

/** Whether a segment between two node centres crosses a rectangle, sampled finely. */
function meetsSegment(rect: Rect, a: { x: number; y: number }, b: { x: number; y: number }): boolean {
    for (let t = 0; t <= 1; t += 0.001) {
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        if (x > rect.left && x < rect.right && y > rect.top && y < rect.bottom) {
            return true;
        }
    }

    return false;
}

/**
 * "a" with "above" right over it, where a label drawn above "a" lands, and a tie from "a" to
 * "below". Only "a" is labelled. Its own place covers "above"; to its right is clear.
 */
const STACKED = [
    { id: "a", position: { x: 0, y: 0, z: 0 } },
    { id: "above", position: { x: 0, y: 1.6, z: 0 } },
    { id: "below", position: { x: 0, y: -4, z: 0 } },
];
const VIEW = { position: { x: 0, y: 0, z: -14 }, target: { x: 0, y: 0, z: 0 } };

async function drawStacked(behavior: { declutter?: boolean; avoidNodesAndEdges?: boolean }): Promise<Graph> {
    const g = await mount();
    g.setLayoutBehavior({ labels: behavior });
    await g.addNodes(STACKED);
    await g.addEdges([
        { src: "a", dst: "below" },
        { src: "a", dst: "above" },
    ]);
    await g.setLayout("fixed", { dim: 3 });
    await operationQueueOf(g).waitForCompletion();
    await g.getSession().styles.add({
        name: "label a",
        target: "node",
        selector: { match: "ids", nodes: ["a"] },
        set: { "node.label": "a label" },
    });
    await operationQueueOf(g).waitForCompletion();
    for (let frame = 0; frame < 8; frame++) {
        g.scene.render();
        await nextFrame();
    }

    await g.setCameraState(VIEW);
    g.scene.render();
    g.scene.render();
    return g;
}

describe("labels.avoidNodesAndEdges moves a label off the nodes and edges it covers", () => {
    it("leaves a label over the node above it when the setting is off, which is the default", async () => {
        const g = await drawStacked({});

        assert.isFalse(g.styles.config.behavior.labels.avoidNodesAndEdges);
        const words = wordsOf(g, "a");
        assert.isNotNull(words);
        assert.isTrue(meetsCircle(words, circleOf(g, "above")), "the setup must reproduce the cover");
    });

    for (const declutter of [false, true]) {
        it(`moves it clear of every node and edge (declutter ${declutter ? "on" : "off"})`, async () => {
            const g = await drawStacked({ declutter, avoidNodesAndEdges: true });

            const words = wordsOf(g, "a");
            assert.isNotNull(words, "a label with a clear place is drawn, not hidden");
            const a = circleOf(g, "a");
            const above = circleOf(g, "above");
            const below = circleOf(g, "below");
            assert.isFalse(meetsCircle(words, above), "covers the node above");
            assert.isFalse(meetsCircle(words, a), "covers its own node");
            assert.isFalse(meetsSegment(words, a, below), "covers the tie below");
            assert.isFalse(meetsSegment(words, a, above), "covers the tie above");
        });
    }

    it("puts the label back where its style put it when the setting is turned off", async () => {
        const g = await drawStacked({});
        const home = wordsOf(g, "a");

        g.setLayoutBehavior({ labels: { avoidNodesAndEdges: true } });
        g.scene.render();
        g.scene.render();
        assert.notDeepEqual(wordsOf(g, "a"), home, "moved");

        g.setLayoutBehavior({ labels: { avoidNodesAndEdges: false } });
        g.scene.render();
        g.scene.render();
        const back = wordsOf(g, "a");
        assert.isNotNull(back);
        assert.isNotNull(home);
        assert.closeTo(back.left, home.left, 0.5);
        assert.closeTo(back.top, home.top, 0.5);
    });
});
