/**
 * @file Names on a dense drawing: Les Miserables labelled with every character's name at size 96,
 * in 3D, framed whole and then framed on one selected node, the way a reader puts names on and
 * looks for one of them.
 *
 * With `labels.declutter` on, no two drawn labels' words meet. With `labels.avoidNodesAndEdges`
 * on as well, no drawn label's words cover a node other than its own either, so a name is never
 * drawn across another node in front of it or behind it. And a node labelled by two layers draws
 * one label, with the upper layer's words.
 *
 * Measured independently of the element's own placement: each label plane's four corners after a
 * frame, projected through the scene's transform, times the share of the plane the words take;
 * each node as its drawn radius projected at its centre.
 */

import "../../src/graphty-element";

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { Node } from "../../src/Node";
import { lesMiserables } from "../helpers/les-miserables";
import { nextFrame } from "../helpers/real-input";

/** The Les Miserables network, read once: the snapshot is frozen, so every test can share it. */
const LES_MISERABLES = await lesMiserables();

interface Rect {
    id: string;
    left: number;
    right: number;
    top: number;
    bottom: number;
}

interface Circle {
    id: string;
    x: number;
    y: number;
    r: number;
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
 * @param frames - How many.
 */
async function draw(graph: Graph, frames = 5): Promise<void> {
    for (let at = 0; at < frames; at++) {
        graph.scene.render();
        await nextFrame();
    }
}

/**
 * A graph in a 900 x 860 box, as the app's drawing is at 1440 x 900.
 * @param labels - The label behavior.
 * @returns The graph.
 */
async function mount(labels: { declutter: boolean; avoidNodesAndEdges?: boolean }): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "900px";
    container.style.height = "860px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    await graph.init();
    graph.setLayoutBehavior({ labels });
    return graph;
}

/**
 * Wait for the camera to finish a framing it was asked for.
 * @param graph - The graph.
 * @param frame - Asks for the framing.
 */
async function framed(graph: Graph, frame: () => void): Promise<void> {
    await new Promise<void>((done) => {
        const off = graph.on("zoom-to-fit-complete", () => {
            off();
            done();
        });
        frame();
    });
    await draw(graph);
}

/**
 * Les Miserables in 3D, every character named at size 96.
 * @param labels - The label behavior.
 * @returns The graph.
 */
async function lesMis(labels: { declutter: boolean; avoidNodesAndEdges?: boolean }): Promise<Graph> {
    const graph = await mount(labels);
    const sample = LES_MISERABLES;
    const ids = sample.ids ?? [];
    await graph.addNodes(ids.map((id) => ({ id, name: id })));
    await graph.addEdges([...sample.src].map((src, e) => ({ src: ids[src], dst: ids[sample.dst[e]] })));
    await graph.setLayout("ngraph", { dim: 3 });
    await graph.getSession().styles.add({
        name: "names",
        target: "node",
        selector: { match: "everything" },
        set: { "node.labelStyle": { sizePx: 96 } },
        encode: { "node.label": { by: "data.name", scale: "passthrough" } },
    });
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForSettled();
    await draw(graph);
    await framed(graph, () => {
        graph.zoomToFit();
    });
    // waitForSettled waits for the queue and the styles, not the layout: the names are measured on
    // the finished picture, once the layout has converged and the declutter has run on it.
    await graph.waitForStableFrame();
    return graph;
}

/**
 * Project a world point to the screen.
 * @param graph - The graph.
 * @param point - The point.
 * @returns Its pixel position; z outside 0 to 1 is behind the camera or past its far plane.
 */
function project(graph: Graph, point: Vector3): Vector3 {
    const camera = graph.scene.activeCamera;
    assert.isNotNull(camera);
    const viewport = camera.viewport.toGlobal(graph.engine.getRenderWidth(), graph.engine.getRenderHeight());
    return Vector3.Project(point, Matrix.Identity(), graph.scene.getTransformMatrix(), viewport);
}

/**
 * Whether a screen point is in front of the camera and inside the canvas, give or take a margin.
 * @param graph - The graph.
 * @param left - Left edge.
 * @param right - Right edge.
 * @param top - Top edge.
 * @param bottom - Bottom edge.
 * @returns True when any of it is on screen.
 */
function onScreen(graph: Graph, left: number, right: number, top: number, bottom: number): boolean {
    return right >= 0 && left <= graph.engine.getRenderWidth() && bottom >= 0 && top <= graph.engine.getRenderHeight();
}

/**
 * Where every drawn label's words are on screen.
 * @param graph - The graph.
 * @returns The words' rectangles of the labels drawn and on screen.
 */
function drawnWords(graph: Graph): Rect[] {
    const rects: Rect[] = [];
    for (const node of graph.getDataManager().nodes.values()) {
        const { label } = node;
        const mesh = label?.labelMesh;
        if (!label || !mesh?.isEnabled() || !mesh.isVisible) {
            continue;
        }

        mesh.computeWorldMatrix(true);
        const { minimum, maximum } = mesh.getBoundingInfo().boundingBox;
        const corners = [
            [minimum.x, minimum.y],
            [maximum.x, minimum.y],
            [minimum.x, maximum.y],
            [maximum.x, maximum.y],
        ].map(([x, y]) => project(graph, Vector3.TransformCoordinates(new Vector3(x, y, 0), mesh.getWorldMatrix())));
        if (corners.some((p) => p.z < 0 || p.z > 1)) {
            continue;
        }

        const xs = corners.map((p) => p.x);
        const ys = corners.map((p) => p.y);
        const left = Math.min(...xs);
        const top = Math.min(...ys);
        const width = Math.max(...xs) - left;
        const height = Math.max(...ys) - top;
        if (!onScreen(graph, left, left + width, top, top + height)) {
            continue;
        }

        const text = label.textBounds;
        rects.push({
            id: String(node.id),
            left: left + text.left * width,
            right: left + text.right * width,
            top: top + text.top * height,
            bottom: top + text.bottom * height,
        });
    }

    return rects;
}

/**
 * Every drawn node on screen, as a circle.
 * @param graph - The graph.
 * @returns The circles.
 */
function drawnNodes(graph: Graph): Circle[] {
    const camera = graph.scene.activeCamera;
    assert.isNotNull(camera);
    const right = camera.getDirection(Vector3.Right());
    const circles: Circle[] = [];
    for (const node of graph.getDataManager().nodes.values()) {
        const { mesh } = node;
        if (!mesh.isEnabled()) {
            continue;
        }

        const centre = mesh.computeWorldMatrix(true).getTranslation();
        const c = project(graph, centre);
        if (c.z < 0 || c.z > 1) {
            continue;
        }

        const k = project(graph, centre.add(right.scale(node.drawnRadius)));
        const r = Math.hypot(k.x - c.x, k.y - c.y);
        if (onScreen(graph, c.x - r, c.x + r, c.y - r, c.y + r)) {
            circles.push({ id: String(node.id), x: c.x, y: c.y, r });
        }
    }

    return circles;
}

/**
 * The pairs of drawn labels whose words meet.
 * @param rects - The words.
 * @returns One "a x b" per pair.
 */
function meetingLabels(rects: Rect[]): string[] {
    const pairs: string[] = [];
    for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i];
            const b = rects[j];
            // A pixel of slack: two labels set edge to edge are apart.
            if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) {
                pairs.push(`${a.id} x ${b.id}`);
            }
        }
    }

    return pairs;
}

/**
 * The drawn labels whose words cover a node other than their own.
 * @param rects - The words.
 * @param circles - The nodes.
 * @returns One "label over node" per pair.
 */
function labelsOverNodes(rects: Rect[], circles: Circle[]): string[] {
    const found: string[] = [];
    for (const rect of rects) {
        for (const circle of circles) {
            if (circle.id === rect.id) {
                continue;
            }

            const dx = circle.x - Math.max(rect.left, Math.min(circle.x, rect.right));
            const dy = circle.y - Math.max(rect.top, Math.min(circle.y, rect.bottom));
            // A pixel of slack, as for two labels.
            if (Math.hypot(dx, dy) < circle.r - 1) {
                found.push(`${rect.id} over ${circle.id}`);
            }
        }
    }

    return found;
}

/**
 * Select a node and frame it, as the reader's Frame selection does.
 * @param graph - The graph.
 * @param id - The node.
 */
async function frameOn(graph: Graph, id: string): Promise<void> {
    assert.isTrue(graph.selectNode(id));
    await operationQueueOf(graph).waitForCompletion();
    await graph.applyCameraView("fitToGraph", { scope: "selection", params: { keepAngle: true } });
    // The layout may still be converging, and a label is decluttered on the picture it settles on.
    await graph.waitForStableFrame();
    await draw(graph);
}

describe("names on a dense drawing", () => {
    it("never draws two names over each other, framed whole or on one node", async () => {
        const graph = await lesMis({ declutter: true });

        assert.deepEqual(meetingLabels(drawnWords(graph)), [], "framed whole");
        assert.isAbove(graph.nodeLabelCounts.hiddenByOverlap, 0, "at size 96 some names had to be hidden");

        await frameOn(graph, "Cosette");
        assert.deepEqual(meetingLabels(drawnWords(graph)), [], "framed on Cosette");
    });

    it("never draws a name over another node when labels also avoid nodes", async () => {
        const graph = await lesMis({ declutter: true, avoidNodesAndEdges: true });

        const whole = drawnWords(graph);
        assert.deepEqual(meetingLabels(whole), [], "framed whole: names over names");
        assert.deepEqual(labelsOverNodes(whole, drawnNodes(graph)), [], "framed whole: names over nodes");

        await frameOn(graph, "Cosette");
        const close = drawnWords(graph);
        assert.deepEqual(meetingLabels(close), [], "framed on Cosette: names over names");
        assert.deepEqual(labelsOverNodes(close, drawnNodes(graph)), [], "framed on Cosette: names over nodes");
        assert.isTrue(
            close.some((rect) => rect.id === "Cosette"),
            "the selected node's name is drawn",
        );
    });
});

describe("a node two layers label", () => {
    /**
     * The label planes hanging from a node.
     * @param graph - The graph.
     * @param node - The node.
     * @returns How many are drawn.
     */
    function planesOn(graph: Graph, node: Node): number {
        return graph.scene.meshes.filter(
            (mesh) => mesh.parent === node.mesh && mesh.name.startsWith("richTextPlane_") && mesh.isEnabled(),
        ).length;
    }

    it("draws one label, with the upper layer's words", async () => {
        const graph = await mount({ declutter: true });
        await graph.addNodes([
            { id: "v16", name: "Lucy Grant", position: { x: 0, y: 0, z: 0 } },
            { id: "v17", name: "Ivan Petrov", position: { x: 8, y: 0, z: 0 } },
        ]);
        await graph.setLayout("fixed", { dim: 3 });
        const session = graph.getSession();
        await session.styles.add({
            name: "Everything",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "name" },
        });
        await session.styles.add({
            name: "v16",
            target: "node",
            selector: { match: "ids", nodes: ["v16"] },
            encode: { "node.label": { by: "data.name", scale: "passthrough" } },
        });
        await operationQueueOf(graph).waitForCompletion();
        await draw(graph);

        const node = graph.getNode("v16");
        assert.isOk(node);
        assert.strictEqual(planesOn(graph, node), 1, "one label plane on the node");
        assert.strictEqual(graph.labelOf("v16")?.text, "Lucy Grant", "the upper layer's words");
        assert.strictEqual(graph.labelOf("v17")?.text, "name", "the lower layer still labels the rest");
    });
});
