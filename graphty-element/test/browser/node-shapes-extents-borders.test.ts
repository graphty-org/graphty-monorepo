/**
 * @file Flat node shapes, node borders, node width and height, and one extent for every shape,
 * drawn by the real renderer and read back from the scene and the frame (issues #2318, #2316,
 * #2317 and #2495).
 */

import "../../src/graphty-element";

import { type AbstractMesh, type InstancedMesh, Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import type { LayerSpec } from "../../src/catalog/types";
import { FLAT_NODE_SHAPES, NodeShapes } from "../../src/config/NodeStyle";
import type { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import { NODE_EXTENT_PER_SIZE } from "../../src/meshes/NodeMesh";
import { flatShapeOutline, type Point2 } from "../../src/meshes/shapeOutlines";

const WIDTH = 480;
const HEIGHT = 360;

/** The fill colour every probed node is painted, and the border colour, as bytes. */
const FILL = [255, 0, 0] as const;
const BORDER = [0, 0, 255] as const;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** A node at a fixed place: a record, so the element takes it as node data. */
type Placed = Record<string, unknown> & { id: string; position: { x: number; y: number; z: number } };

/**
 * A mounted element holding nodes at fixed places, painted by the given layers, and drawn.
 * @param viewMode - The view mode.
 * @param nodes - The nodes.
 * @param edges - The edges.
 * @param layers - The style layers.
 * @returns The element.
 */
async function mounted(
    viewMode: "2d" | "3d",
    nodes: Placed[],
    edges: { src: string; dst: string }[],
    layers: LayerSpec[],
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
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

    for (const layer of layers) {
        await element.session.styles.add(layer);
    }

    await element.session.data.addNodes(nodes);
    await element.session.data.addEdges(edges);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();

    return element;
}

/**
 * A layer that paints the nodes whose id is listed.
 * @param ids - The node ids.
 * @param set - What it paints.
 * @returns The layer.
 */
function layerFor(ids: readonly string[], set: LayerSpec["set"]): LayerSpec {
    return {
        name: `nodes ${ids.join(",")}`,
        target: "node",
        selector: { match: "ids", nodes: [...ids] },
        set,
    };
}

/**
 * The drawn mesh of one node.
 * @param element - The element.
 * @param id - The node.
 * @returns Its mesh.
 */
function meshOf(element: Graphty, id: string): AbstractMesh {
    const node = element.graph.getDataManager().nodes.get(id);
    assert.isDefined(node, `node ${id} exists`);

    return node.mesh;
}

/**
 * A node mesh's full size along each axis, from its source geometry.
 * @param mesh - The node's mesh.
 * @returns Its size along x, y and z.
 */
function sizeOf(mesh: AbstractMesh): { x: number; y: number; z: number } {
    const source = (mesh as InstancedMesh).sourceMesh ?? mesh;
    const { extendSize } = source.getBoundingInfo().boundingBox;

    return { x: extendSize.x * 2, y: extendSize.y * 2, z: extendSize.z * 2 };
}

/**
 * The edge between two nodes.
 * @param element - The element.
 * @param src - Its source.
 * @param dst - Its target.
 * @returns The edge.
 */
function edgeOf(element: Graphty, src: string, dst: string): Edge {
    const edge = [...element.graph.getDataManager().edges.values()].find(
        (candidate) => candidate.srcNode.id === src && candidate.dstNode.id === dst,
    );
    assert.isDefined(edge, `edge ${src} -> ${dst} exists`);

    return edge;
}

/**
 * Where a ray from the origin along +x leaves an outline.
 * @param outline - The outline.
 * @returns The x it crosses at.
 */
function rightmostCrossing(outline: readonly Point2[]): number {
    let crossing = 0;

    outline.forEach(([x0, y0], i) => {
        const [x1, y1] = outline[(i + 1) % outline.length];

        if (y0 === y1 || Math.min(y0, y1) > 0 || Math.max(y0, y1) < 0) {
            return;
        }

        crossing = Math.max(crossing, x0 + ((0 - y0) / (y1 - y0)) * (x1 - x0));
    });

    return crossing;
}

/**
 * How wide an outline is at its widest, across or up.
 * @param outline - The outline.
 * @returns The larger of its width and height.
 */
function outlineWidth(outline: readonly Point2[]): number {
    const xs = outline.map(([x]) => x);
    const ys = outline.map(([, y]) => y);

    return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

/** The frame as RGBA bytes, its size, and how many device pixels a CSS pixel is. */
interface Frame {
    data: Uint8Array;
    width: number;
    height: number;
}

/**
 * Render and read the frame.
 * @param element - The element.
 * @returns The frame.
 */
async function frameOf(element: Graphty): Promise<Frame> {
    await element.waitForStableFrame();
    element.graph.scene.render();
    const { engine } = element.graph;
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const data = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;

    return { data, width, height };
}

/**
 * Whether a pixel is near a colour.
 * @param frame - The frame.
 * @param index - The pixel.
 * @param color - The colour.
 * @returns True when every channel is within a few levels.
 */
function isColor(frame: Frame, index: number, color: readonly [number, number, number]): boolean {
    const at = index * 4;

    return color.every((value, channel) => Math.abs(frame.data[at + channel] - value) < 24);
}

/**
 * Whether a pixel is touched by red at all, an edge pixel blended with the background included.
 * @param frame - The frame.
 * @param index - The pixel.
 * @returns True when red leads both other channels.
 */
function isTouchedByRed(frame: Frame, index: number): boolean {
    const [r, g, b] = frame.data.subarray(index * 4, index * 4 + 3);

    return r - g > 32 && r - b > 32;
}

/**
 * How many pixels of the frame are near a colour, and the box they fill.
 * @param frame - The frame.
 * @param color - The colour, or a test of one pixel.
 * @returns The count and the box, in device pixels.
 */
function pixelsOf(
    frame: Frame,
    color: readonly [number, number, number] | ((frame: Frame, index: number) => boolean),
): { count: number; width: number; height: number } {
    const matches = typeof color === "function" ? color : (f: Frame, i: number): boolean => isColor(f, i, color);

    let count = 0;
    let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];

    for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
            if (matches(frame, y * frame.width + x)) {
                count++;
                [minX, minY, maxX, maxY] = [Math.min(minX, x), Math.min(minY, y), Math.max(maxX, x), Math.max(maxY, y)];
            }
        }
    }

    return count === 0 ? { count, width: 0, height: 0 } : { count, width: maxX - minX + 1, height: maxY - minY + 1 };
}

describe.each(["2d", "3d"] as const)("flat node shapes in %s (#2318)", (viewMode) => {
    it("draws every flat shape, facing the camera, and ends an edge at its outline", async () => {
        const nodes: Placed[] = FLAT_NODE_SHAPES.flatMap((shape, i) => [
            { id: shape, position: { x: 0, y: i * 3, z: 0 } },
            { id: `${shape}-target`, position: { x: 6, y: i * 3, z: 0 } },
        ]);
        const edges = FLAT_NODE_SHAPES.map((shape) => ({ src: shape, dst: `${shape}-target` }));
        const layers = FLAT_NODE_SHAPES.map((shape) =>
            layerFor([shape], { "node.shape": shape, "node.color": "#ff0000" }),
        );
        const element = await mounted(viewMode, nodes, edges, layers);

        for (const shape of FLAT_NODE_SHAPES) {
            const { x, y, z } = sizeOf(meshOf(element, shape));
            // a rounded polygon keeps inside its sharp twin's box, as Cytoscape.js draws it, so it is
            // as wide as its own outline: test/meshes/node-shape-geometry.test.ts holds it to that box
            const outline = flatShapeOutline(shape, NODE_EXTENT_PER_SIZE, NODE_EXTENT_PER_SIZE);
            const wide = /^round-(?!rectangle)/.test(shape) ? outlineWidth(outline) : NODE_EXTENT_PER_SIZE;
            assert.approximately(Math.max(x, y), wide, 1e-6, `${shape} is one node wide`);

            assert.isBelow(z, 0.1, `${shape} is drawn flat in ${viewMode}`);

            const { srcPoint } = edgeOf(element, shape, `${shape}-target`).getInterceptPoints();
            assert.isNotNull(srcPoint, `the edge from ${shape} found its outline`);

            const expected = rightmostCrossing(flatShapeOutline(shape, NODE_EXTENT_PER_SIZE, NODE_EXTENT_PER_SIZE));
            assert.approximately(srcPoint.x, expected, 0.02, `the edge leaves ${shape} at its outline`);
        }

        // The front faces are the ones turned to the camera: a culled face would draw nothing. A
        // 3D view lights them, so any red pixel counts.
        const red = pixelsOf(await frameOf(element), isTouchedByRed);
        assert.isAbove(red.count, 200, "the flat shapes are drawn");
    });
});

describe("planar nodes in 3D (#2318)", () => {
    it("draws any shape thin when a layer asks for it", async () => {
        const element = await mounted(
            "3d",
            [
                { id: "a", position: { x: 0, y: 0, z: 0 } },
                { id: "b", position: { x: 4, y: 0, z: 0 } },
            ],
            [],
            [layerFor(["a"], { "node.shape": "box", "node.planar": true }), layerFor(["b"], { "node.shape": "box" })],
        );

        assert.isBelow(sizeOf(meshOf(element, "a")).z, 0.1);
        assert.approximately(sizeOf(meshOf(element, "b")).z, 1, 1e-6, "a box of size 1 keeps its own depth");
    });
});

describe("node borders (#2316)", () => {
    /**
     * One big ellipse node, alone, with or without a border.
     * @param border - The border channels, or none.
     * @returns The element.
     */
    async function ellipse(border: LayerSpec["set"]): Promise<Graphty> {
        return mounted(
            "2d",
            [
                { id: "n", position: { x: 0, y: 0, z: 0 } },
                // Two far points fix the zoom, so the node is drawn at one size with and without.
                { id: "left", position: { x: -30, y: 0, z: 0 } },
                { id: "right", position: { x: 30, y: 0, z: 0 } },
            ],
            [],
            [layerFor(["n"], { "node.shape": "ellipse", "node.size": 10, "node.color": "#ff0000", ...border })],
        );
    }

    it("draws a 2-unit dashed border at its width, outside the fill", async () => {
        const plain = pixelsOf(await frameOf(await ellipse({})), FILL);
        const element = await ellipse({
            "node.borderWidth": 2,
            "node.borderStyle": "dashed",
            "node.borderColor": "#0000ff",
        });
        const frame = await frameOf(element);
        const fill = pixelsOf(frame, FILL);
        const border = pixelsOf(frame, BORDER);

        assert.isAbove(border.count, 100, "the border is drawn");
        assert.approximately(fill.count, plain.count, plain.count * 0.01, "the border covers none of the fill");

        // In the scene: a ring reaching 2 units (in node-size units) past a node 10 across.
        const node = element.graph.getDataManager().nodes.get("n");
        assert.isDefined(node);
        assert.approximately(node.borderReach, 2 * NODE_EXTENT_PER_SIZE, 1e-9);
        assert.isAtMost(border.width, (fill.width * 14) / 10 + 2, "the border is no wider than asked");
        assert.isAtLeast(border.width, fill.width + 2, "the border lies outside the fill");
    });

    it("draws nothing when no width is set, and ends an edge at the border's outer edge", async () => {
        const none = pixelsOf(await frameOf(await ellipse({ "node.borderColor": "#0000ff" })), BORDER);
        assert.strictEqual(none.count, 0, "a colour alone draws no border");

        const element = await mounted(
            "2d",
            [
                { id: "a", position: { x: 0, y: 0, z: 0 } },
                { id: "b", position: { x: 6, y: 0, z: 0 } },
            ],
            [{ src: "a", dst: "b" }],
            [layerFor(["a"], { "node.shape": "rectangle", "node.borderWidth": 0.5 })],
        );
        const { srcPoint } = edgeOf(element, "a", "b").getInterceptPoints();

        assert.isNotNull(srcPoint);
        assert.approximately(srcPoint.x, NODE_EXTENT_PER_SIZE / 2 + 0.5 * NODE_EXTENT_PER_SIZE, 0.02);
    });
});

describe("a border in screen pixels", () => {
    /**
     * How wide a node's border is drawn on screen, in CSS pixels: its reach past the outline,
     * through the camera.
     * @param element - The element.
     * @returns The width.
     */
    function screenReach(element: Graphty): number {
        const node = element.graph.getDataManager().nodes.get("n");
        assert.isDefined(node);
        const scene = element.graph.getScene();
        const camera = scene.activeCamera;
        assert.isNotNull(camera);
        const engine = scene.getEngine();
        const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
        const at = node.mesh.getAbsolutePosition();
        const project = (p: Vector3): Vector3 =>
            Vector3.Project(p, Matrix.Identity(), scene.getTransformMatrix(), viewport);
        const a = project(at);
        const b = project(at.add(new Vector3(node.borderReach, 0, 0)));
        return Math.hypot(b.x - a.x, b.y - a.y) * engine.getHardwareScalingLevel();
    }

    it("draws the same width on screen at every zoom, rebuilding its ring when a zoom moves it", async () => {
        const element = await mounted(
            "2d",
            [
                { id: "n", position: { x: 0, y: 0, z: 0 } },
                { id: "left", position: { x: -30, y: 0, z: 0 } },
                { id: "right", position: { x: 30, y: 0, z: 0 } },
            ],
            [],
            [layerFor(["n"], { "node.shape": "ellipse", "node.size": 10, "node.borderScreenWidth": 3 })],
        );
        // within a 1/16 doubling step: 4.4%
        assert.approximately(screenReach(element), 3, 0.15);

        const before = element.graph.getDataManager().nodes.get("n")?.borderReach ?? 0;
        // Zoom in, as a reader's zoom control does.
        await element.graph.zoomStep("in");
        await element.graph.zoomStep("in");

        // The update loop rebuilds the ring on the next frame it sees the camera moved: thinner in
        // the scene, as wide on screen.
        await vi.waitFor(() => {
            const reach = element.graph.getDataManager().nodes.get("n")?.borderReach ?? 0;
            assert.isBelow(reach, before * 0.8, "thinner in the scene");
            assert.approximately(screenReach(element), 3, 0.15);
        });
    });

    it("frames the graph the same at every zoom, so one load always draws one picture", async () => {
        const nodes: Placed[] = [
            { id: "n", position: { x: 0, y: 0, z: 0 } },
            { id: "left", position: { x: -30, y: 0, z: 0 } },
            { id: "right", position: { x: 30, y: 0, z: 0 } },
        ];
        const plain = await mounted("2d", nodes, [], [layerFor(["n"], { "node.shape": "ellipse", "node.size": 10 })]);
        const element = await mounted(
            "2d",
            nodes,
            [],
            [layerFor(["n"], { "node.shape": "ellipse", "node.size": 10, "node.borderScreenWidth": 3 })],
        );
        const half = (el: Graphty): number => el.graph.getDataManager().nodes.get("n")?.framingHalf("x") ?? NaN;
        const unbordered = half(plain);
        const before = element.graph.getDataManager().nodes.get("n")?.borderReach ?? 0;
        assert.isAbove(before, 0, "the border is drawn");
        assert.approximately(half(element), unbordered, 1e-9);

        await element.graph.zoomStep("in");
        await element.graph.zoomStep("in");
        await vi.waitFor(() => {
            const reach = element.graph.getDataManager().nodes.get("n")?.borderReach ?? 0;
            assert.isBelow(reach, before * 0.8, "the ring was rebuilt for the new zoom");
        });
        assert.approximately(half(element), unbordered, 1e-9, "the framed extent did not move with the zoom");
    });
});

describe("node width and height (#2317)", () => {
    it("draws a node 4 wide and 1 tall, with edges ending at its sides", async () => {
        const element = await mounted(
            "2d",
            [
                { id: "wide", position: { x: 0, y: 0, z: 0 } },
                { id: "right", position: { x: 10, y: 0, z: 0 } },
                { id: "above", position: { x: 0, y: 6, z: 0 } },
            ],
            [
                { src: "wide", dst: "right" },
                { src: "wide", dst: "above" },
            ],
            [layerFor(["wide"], { "node.shape": "rectangle", "node.width": 4, "node.height": 1 })],
        );
        const { x, y } = sizeOf(meshOf(element, "wide"));

        assert.approximately(x, 4 * NODE_EXTENT_PER_SIZE, 1e-6);
        assert.approximately(y, NODE_EXTENT_PER_SIZE, 1e-6);

        const side = edgeOf(element, "wide", "right").getInterceptPoints().srcPoint;
        const top = edgeOf(element, "wide", "above").getInterceptPoints().srcPoint;

        assert.isNotNull(side);
        assert.isNotNull(top);
        assert.approximately(side.x, 2 * NODE_EXTENT_PER_SIZE, 0.02, "the edge leaves the long side's end");
        assert.approximately(top.y, NODE_EXTENT_PER_SIZE / 2, 0.02, "the edge leaves the short side's top");
    });
});

describe("one extent for every shape (#2495)", () => {
    /**
     * How many device pixels across a node's drawn box is on screen: its bounding box, projected.
     * @param element - The element.
     * @param mesh - The node's mesh.
     * @returns The larger of its screen width and height.
     */
    function projectedAcross(element: Graphty, mesh: AbstractMesh): number {
        const { scene, engine } = element.graph;
        const camera = scene.activeCamera;
        assert.isNotNull(camera);
        mesh.computeWorldMatrix(true);
        const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
        const points = mesh
            .getBoundingInfo()
            .boundingBox.vectorsWorld.map((corner) =>
                Vector3.Project(corner, Matrix.Identity(), scene.getTransformMatrix(), viewport),
            );
        const xs = points.map((point) => point.x);
        const ys = points.map((point) => point.y);

        return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    }

    it("draws every shape at one size the same number of pixels across under uniform", async () => {
        const element = await mounted(
            "2d",
            [
                { id: "probe", position: { x: 0, y: 0, z: 0 } },
                { id: "left", position: { x: -12, y: 0, z: 0 } },
                { id: "right", position: { x: 12, y: 0, z: 0 } },
            ],
            [],
            [layerFor(["probe"], { "node.size": 4, "node.color": "#ff0000", "node.sizeMode": "uniform" })],
        );
        const projected = new Map<string, number>();
        const rasterised = new Map<string, number>();

        // a rounded polygon keeps inside its sharp twin's box, as Cytoscape.js draws it, so it is
        // smaller across than the rest: test/meshes/node-shape-geometry.test.ts holds it to that box.
        // "none" is Pajek's bodiless vertex, which draws only its label: it has no pixels to count.
        for (const shape of NodeShapes.options.filter(
            (name) => !/^round-(?!rectangle)/.test(name) && name !== "none",
        )) {
            const layer = await element.session.styles.add(layerFor(["probe"], { "node.shape": shape }));
            await operationQueueOf(element.graph).waitForCompletion();
            const red = pixelsOf(await frameOf(element), isTouchedByRed);
            rasterised.set(shape, Math.max(red.width, red.height));
            projected.set(shape, projectedAcross(element, meshOf(element, "probe")));
            await element.session.styles.remove(layer.id);
        }

        const spread = (values: Map<string, number>): number =>
            Math.max(...values.values()) - Math.min(...values.values());

        // The drawn extent, from the geometry on screen: the same within a pixel.
        assert.isAtMost(spread(projected), 1, `projected: ${JSON.stringify(Object.fromEntries(projected))}`);

        // The pixels themselves agree within two: a pixel is filled when its centre is inside the
        // shape, so the very tip of a diamond, a star or a cone can fall between two centres on
        // each side while a flat side never does.
        assert.isAtMost(spread(rasterised), 2, `rasterised: ${JSON.stringify(Object.fromEntries(rasterised))}`);
    });
});
