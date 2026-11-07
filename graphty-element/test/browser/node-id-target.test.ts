/**
 * @file The node ID target hover reads on the `"batched"` path (design/rendering/row-renderer.md 4.4).
 *
 * The target names the row the row scan names at every pixel, except where two rows of the same
 * depth overlap (the scan keeps the lower row, the target the one drawn last) and where a pixel
 * center lies within an eighth of a pixel of a triangle's edge (the rasterizer's rule and the ray
 * test may each keep the other side). Each such pixel is listed. A pointer move over a still graph walks no node, and a target older than
 * the picture is redrawn by the read that finds it.
 */

import "../../src/graphty-element";

import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { ID_NONE, ID_OBJECT, type NodeIdTarget } from "../../src/render/NodeIdTarget";
import { pickWork, rowScanOf } from "../../src/render/PickService";
import { hover, nextFrame } from "../helpers/real-input";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const NODES = 30;
const POINTS = 400;
const WIDTH = 500;
const HEIGHT = 400;
/** Steps of an eighth of a pixel: a pixel center that close to an edge may be settled either way. */
const EDGE_STEPS = [
    [-0.125, 0],
    [0.125, 0],
    [0, -0.125],
    [0, 0.125],
] as const;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A seeded random number generator (mulberry32).
 * @param seed - The seed.
 * @returns Numbers in 0..1.
 */
function seeded(seed: number): () => number {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * A batched graph of overlapping nodes in a view, drawn.
 * @param viewMode - The view.
 * @param shape - The node shape.
 * @returns The element.
 */
async function batchedGraph(
    viewMode: "2d" | "3d",
    shape: string,
    renderer: "webgl" | "webgpu" = "webgl",
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = renderer;
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();
    element.graph.setRenderPath("batched");
    const random = seeded(viewMode === "2d" ? 5 : 9);
    const nodes = Array.from({ length: NODES }, (_, i) => ({
        id: `n${String(i)}`,
        position: {
            x: (random() - 0.5) * 12,
            y: (random() - 0.5) * 12,
            z: viewMode === "2d" ? 0 : (random() - 0.5) * 12,
        },
    }));
    // Two nodes in one place: a same-depth overlap in either view.
    nodes[NODES - 1].position = { ...nodes[NODES - 2].position };
    await element.session.styles.add({
        name: "look",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shape": shape },
    });
    await element.session.data.addNodes(nodes);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    assert.strictEqual(element.graph.rowCounts.batchedNodes, NODES, "every row is batched");
    return element;
}

/**
 * The graph's target, once it can answer.
 * @param element - The element.
 * @returns The target.
 */
async function readyTarget(element: Graphty): Promise<NodeIdTarget> {
    const target = element.graph.getNodeIdTarget();
    if (target === null) {
        assert.fail("the batched path keeps a target");
    }

    // The materials compile on their own; until then a read answers null.
    while (target.read(0, 0) === null) {
        await nextFrame();
    }

    return target;
}

/**
 * Seeded pixel centers: most on a vertex of a node, pulled toward its center or not, the rest
 * anywhere.
 * @param element - The element.
 * @param seed - The seed.
 * @returns The points, in CSS pixels.
 */
function pixelCenters(element: Graphty, seed: number): { x: number; y: number }[] {
    const random = seeded(seed);
    const { graph } = element;
    const nodes = [...graph.getNodes()];
    const scaling = graph.scene.getEngine().getHardwareScalingLevel();
    const center = (value: number): number => (Math.floor(value) + 0.5) * scaling;
    return Array.from({ length: POINTS }, () => {
        const node = nodes[Math.floor(random() * nodes.length)];
        const kind = random();
        if (kind < 0.2) {
            return { x: center((random() * WIDTH) / scaling), y: center((random() * HEIGHT) / scaling) };
        }

        const vertices = node.drawnSourceMesh.getVerticesData("position") ?? [];
        const vertex = Math.floor((random() * vertices.length) / 3) * 3;
        const local = new Vector3(vertices[vertex] ?? 0, vertices[vertex + 1] ?? 0, vertices[vertex + 2] ?? 0);
        const at = Vector3.TransformCoordinates(local.scale(kind < 0.6 ? 0.98 : 0.5), node.drawnWorldMatrix(true));
        const screen = graph.worldToScreen(at);
        return { x: center(screen.x), y: center(screen.y) };
    });
}

describe("the node ID target", () => {
    for (const viewMode of ["3d", "2d"] as const) {
        for (const shape of ["sphere", "box", "icosphere"]) {
            it(`names the row the scan names, ${shape} in ${viewMode}`, async () => {
                const element = await batchedGraph(viewMode, shape);
                const target = await readyTarget(element);
                const { scene } = element.graph;
                const scan = rowScanOf(scene);
                assert.isDefined(scan);
                let hits = 0;
                const sameDepth: string[] = [];
                const edges: string[] = [];
                const differ: string[] = [];
                // A pixel center within an eighth of a pixel of a triangle's edge: the rasterizer's
                // rule and the ray test may each keep the other side.
                const onEdge = (x: number, y: number, read: number): boolean =>
                    EDGE_STEPS.some(([dx, dy]) => (scan?.shapeRayHit(x + dx, y + dy)?.row ?? ID_NONE) === read);
                for (const { x, y } of pixelCenters(element, 17)) {
                    const read = target.read(x, y);
                    if (typeof read !== "number") {
                        assert.fail("WebGL answers at once");
                    }

                    const hit = scan?.shapeRayHit(x, y) ?? null;
                    const expected = hit?.row ?? ID_NONE;
                    hits += hit === null ? 0 : 1;
                    if (read === expected) {
                        continue;
                    }

                    const ray = scene.createPickingRay(x, y, null, null);
                    const other = read >= 0 ? scan?.rowRayHitOn(read, ray) : null;
                    const otherDistance = other ? Vector3.Distance(ray.origin, other) : Number.NaN;
                    const where = `${String(x)},${String(y)}: target ${String(read)}, scan ${String(expected)}`;
                    if (hit !== null && Math.abs(otherDistance - hit.distance) <= 1e-4 * hit.distance) {
                        sameDepth.push(where);
                    } else if (onEdge(x, y, read)) {
                        edges.push(where);
                    } else {
                        differ.push(where);
                    }
                }

                if (sameDepth.length > 0) {
                    console.info(`same-depth overlaps, ${shape} in ${viewMode}:`, sameDepth);
                }

                if (edges.length > 0) {
                    console.info(`pixel centers on a triangle edge, ${shape} in ${viewMode}:`, edges);
                }

                assert.isAtMost(edges.length, POINTS / 50, "few pixel centers lie on an edge");
                assert.deepEqual(
                    differ.slice(0, 5),
                    [],
                    `${String(differ.length)} differ: ${differ.slice(0, 5).join("; ")}`,
                );
                assert.isAbove(hits, POINTS / 2, "enough points hit a node");
            });
        }
    }

    it.skipIf(ADAPTER === "")("reads the pixel under the point on WebGPU, not its mirror", async () => {
        const element = await batchedGraph("2d", "sphere", "webgpu");
        assert.isTrue(element.graph.engine.isWebGPU);
        const target = await readyTarget(element);
        const scan = rowScanOf(element.graph.scene);
        assert.isDefined(scan);
        const missed: string[] = [];
        for (const { x, y } of pixelCenters(element, 17)) {
            if (scan?.shapeRayHit(x, y) !== null && (await target.read(x, y)) === ID_NONE) {
                missed.push(`${String(x)},${String(y)}`);
            }
        }

        assert.deepEqual(missed.slice(0, 5), [], `${String(missed.length)} points over a node read nothing`);
    });

    it("hovers with a real pointer and walks no node on a move", async () => {
        const element = await batchedGraph("2d", "sphere");
        const target = await readyTarget(element);
        const { graph } = element;
        const scaling = graph.scene.getEngine().getHardwareScalingLevel();
        const at = (id: string): { x: number; y: number } => {
            const node = graph.getNode(id);
            assert.isDefined(node);
            const screen = graph.worldToScreen(node?.drawnWorldPosition ?? Vector3.Zero());
            return { x: screen.x * scaling, y: screen.y * scaling };
        };

        await hover(element, at("n0"));
        await element.waitForStableFrame();
        const before = { ...pickWork };
        const { draws } = target.counts;
        const { reads } = target.counts;
        const ids = ["n1", "n2", "n3", "n4", "n5"];
        for (const id of ids) {
            await hover(element, at(id));
            assert.strictEqual(element.session.selection.hovered, id, "pointing at a node hovers it");
            await element.waitForStableFrame();
        }

        assert.deepEqual(pickWork, before, "no move picked a mesh or walked the rows");
        assert.strictEqual(target.counts.reads - reads, ids.length, "each move read one pixel");
        assert.isAtMost(target.counts.draws - draws, ids.length, "at most one drawing a move");
    });

    it("names a row smaller than a pixel wherever the scan does", async () => {
        const element = await batchedGraph("2d", "box");
        const target = await readyTarget(element);
        const { graph } = element;
        const node = graph.getNode("n0");
        assert.isDefined(node);
        const scaling = graph.scene.getEngine().getHardwareScalingLevel();
        // A pixel corner, empty in this layout: a row centered there covers no pixel center
        // unless it is more than 0.7 px across.
        const corner = { x: 20 * scaling, y: 20 * scaling };
        const ray = graph.scene.createPickingRay(corner.x, corner.y, null, null);
        const there = ray.origin.add(ray.direction.scale(-ray.origin.z / ray.direction.z));
        await element.session.styles.add({
            name: "tiny",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 0.02 },
        });
        await graph.getSession().positions.set([{ id: "n0", x: there.x, y: there.y, z: 0 }]);
        await operationQueueOf(graph).waitForCompletion();
        await element.waitForStableFrame();
        const radius = graph.nodeScreenPosition("n0")?.radius ?? 0;
        assert.isBelow(radius, 0.5, "the row is smaller than a pixel");
        assert.isAbove(radius, 0.1, "and large enough for the point below");

        const point = { x: corner.x + 0.05 * scaling, y: corner.y + 0.05 * scaling };
        assert.strictEqual(
            rowScanOf(graph.scene)?.shapeRayHit(point.x, point.y)?.row,
            node?.index,
            "the scan names it",
        );
        assert.strictEqual(target.read(point.x, point.y), node?.index, "the target names it");
    });

    it("holds no node glow when a read redraws it outside a frame (#6121)", async () => {
        const element = await batchedGraph("2d", "sphere");
        const target = await readyTarget(element);
        const { graph } = element;
        // A glowing node is drawn by its own mesh, ringed by the glow layer of the main pass.
        await element.session.styles.add({
            name: "glow",
            target: "node",
            selector: { match: "ids", nodes: ["n0"] },
            set: { "node.glow": "#999999" },
        });
        await operationQueueOf(graph).waitForCompletion();
        await element.waitForStableFrame();
        // Two frames with no read leave the target stale, so the next read draws it itself.
        graph.scene.render();
        graph.scene.render();
        const { draws } = target.counts;
        const node = graph.getNode("n0");
        assert.isDefined(node);
        const scaling = graph.scene.getEngine().getHardwareScalingLevel();
        const center = graph.worldToScreen(node?.drawnWorldPosition ?? Vector3.Zero());
        const radius = Math.max(4, graph.nodeScreenPosition("n0")?.radius ?? 0);
        // The node and its halo, a pixel apart: every pixel names a row, the object or nothing.
        const strays: string[] = [];
        for (let dy = -2 * radius; dy <= 2 * radius; dy++) {
            for (let dx = -2 * radius; dx <= 2 * radius; dx++) {
                const x = (Math.floor(center.x + dx) + 0.5) * scaling;
                const y = (Math.floor(center.y + dy) + 0.5) * scaling;
                const read = target.read(x, y);
                if (typeof read !== "number") {
                    assert.fail("WebGL answers at once");
                }

                if (read >= NODES || read < ID_OBJECT) {
                    strays.push(`${String(x)},${String(y)}: ${String(read)}`);
                }
            }
        }

        assert.strictEqual(target.counts.draws - draws, 1, "the read drew the stale target");
        assert.deepEqual(strays.slice(0, 5), [], `${String(strays.length)} pixels name no row`);
    });

    it("redraws a target older than the picture before it answers", async () => {
        const element = await batchedGraph("2d", "box");
        const target = await readyTarget(element);
        const { graph } = element;
        const node = graph.getNode("n0");
        assert.isDefined(node);
        const scaling = graph.scene.getEngine().getHardwareScalingLevel();
        // A corner of the canvas, empty in this layout, and the place on the z = 0 plane under it.
        const point = { x: 20.5 * scaling, y: 20.5 * scaling };
        const ray = graph.scene.createPickingRay(point.x, point.y, null, null);
        const there = ray.origin.add(ray.direction.scale(-ray.origin.z / ray.direction.z));
        assert.strictEqual(target.read(point.x, point.y), ID_NONE, "nothing is there yet");

        await graph.getSession().positions.set([{ id: "n0", x: there.x, y: there.y, z: 0 }]);
        await operationQueueOf(graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.strictEqual(target.read(point.x, point.y), node?.index, "the moved row is read where it went");

        // The frame after a read redraws the target; the one after that does not, so a read then
        // finds it older than the picture and draws it itself, once.
        graph.scene.render();
        graph.scene.render();
        const { draws } = target.counts;
        assert.strictEqual(target.read(point.x, point.y), node?.index, "the redrawn target still names it");
        assert.strictEqual(target.counts.draws - draws, 1, "the stale target was drawn once");
        assert.strictEqual(target.read(point.x, point.y), node?.index, "a second read reads the same drawing");
        assert.strictEqual(target.counts.draws - draws, 1, "and draws nothing");
    });
});
