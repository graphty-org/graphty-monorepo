/**
 * @file Node shaders hide what is behind them (issue #3320): a node drawn by a shader's batch (a
 * `paint` surface on a round node, or a square in place of the node) writes depth, so a nearer
 * node hides a farther one wherever they overlap, and an edge in front of a shaded node is drawn
 * over it. Every built-in node surface preset is checked, plus a shader a page defines itself,
 * because both are drawn by the same batch.
 *
 * Each case draws one 3D scene from a fixed camera and reads the real canvas at chosen points:
 * where a near node covers a far one, where an edge passes in front of the far node, and, for a
 * round node (an impostor sphere), where an edge passes through the near node in front of its
 * center but behind its surface, and where two nodes intersect so the one with the farther
 * center is nearer at that point. It then removes everything that should be hidden there and
 * reads the same points again: what covers them must look the same either way. A translucent
 * shader is checked the other way round: the far node must show through the near one.
 */

import "../../../src/graphty-element";

import { Vector3 } from "@babylonjs/core";
import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { clearRegisteredShadersForTesting } from "../../../src/catalog/shaderRegistry";
import type { LayerSpec } from "../../../src/catalog/types";
import { operationQueueOf } from "../../../src/Graph";
import { EdgeShaderDrawing } from "../../../src/meshes/EdgeShaderDrawing";
import { NodeShaderDrawing } from "../../../src/meshes/NodeShaderDrawing";
import { SHADER_PRESETS } from "../../../src/shaders/presets";
import { defineShader } from "../../../src/simple/defineShader";
import { drawnFrames } from "../../helpers/drawn-frames";

const WIDTH = 400;
const HEIGHT = 300;
/** The camera's fixed distance; it sits on the -z side of the graph. */
const CAMERA_DISTANCE = 30;
const SIZE = 4;

/**
 * The near node, the far node it partly covers, two nodes off screen an edge runs between in
 * front of the far node, two more for an edge through the near node (radius 2, center z -4)
 * at z -4.8, and two intersecting nodes.
 */
const NODES = [
    { id: "near", x: 2.2, y: 0, z: -4 },
    { id: "far", x: 0, y: 0, z: 4 },
    { id: "top", x: -1, y: 14, z: -2 },
    { id: "bottom", x: -1, y: -14, z: -2 },
    { id: "left", x: -14, y: 1, z: -4.8 },
    { id: "right", x: 14, y: 1, z: -4.8 },
    { id: "front", x: -7, y: -7, z: -4 },
    { id: "back", x: -5.4, y: -7, z: -3.6 },
];
const EDGES = [
    { source: "top", target: "bottom" },
    { source: "left", target: "right" },
];
/** What is removed for the second reading: everything that should be hidden at the points. */
const HIDDEN = ["far", "left", "right", "front"];

/** A point on the near node where it covers the far one, and a point on the edge in front of the far node. */
const OVERLAP = new Vector3(1, 0, -4);
const ON_EDGE = new Vector3(-1, 0.8, -2);
/** On the edge through the near node: its sphere's surface there is at z -5.7, in front of the edge. */
const THROUGH = new Vector3(2.6, 1, -4.8);
/**
 * The center of the node "back": its sphere's surface there is at z -5.6, nearer than the node
 * "front" (z -5.2 there), though the center of "front" is the nearer one.
 */
const INTERSECT = new Vector3(-5.4, -7, -3.6);

/** Presets that draw a translucent body: the far node shows through them. */
const TRANSLUCENT = new Set(["glass", "frosted-glass"]);
/** Presets translucent in places (the hologram's dim bands), so what is inside them shows. */
const SEE_INSIDE = new Set([...TRANSLUCENT, "hologram"]);

/** The node presets drawn by a batch: every `paint` surface (the nodes are round) and every `replace`. */
const BATCH_PRESETS = SHADER_PRESETS.filter(
    (descriptor) => descriptor.target === "node" && (descriptor.place === "paint" || descriptor.place === "replace"),
).map((descriptor) => descriptor.id);

const cleanups: (() => void)[] = [];

beforeAll(() => {
    defineShader({
        id: "depth/own-paint",
        glsl: "vec4 shade(NodeInput n) { return vec4(n.color.rgb * (0.5 + 0.5 * n.uv.x), 1.0); }",
    });
    defineShader({
        id: "depth/own-replace",
        place: "replace",
        glsl: "vec4 shade(NodeInput n) { return vec4(n.color.rgb * (0.5 + 0.5 * n.uv.y), 1.0); }",
    });
});

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

afterAll(() => {
    clearRegisteredShadersForTesting();
});

/**
 * A mounted element drawing the scene in 3D from a fixed camera, every node with one shader.
 * @param shader - The node shader.
 * @param edgeShader - An edge shader, or undefined for plain edges.
 * @returns The element.
 */
async function mounted(shader: string, edgeShader: string | undefined): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    element.renderOnDemand = true;
    element.startingCameraDistance = CAMERA_DISTANCE;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    element.shaderSettings = { ...element.shaderSettings, quality: "high", motion: "off", guard: false };
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES.map(({ id, x, y, z }) => ({ id, position: { x, y, z } })));
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 3 });
    const layers: LayerSpec[] = [
        {
            name: "Nodes",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": SIZE, "node.color": "#d04020", "node.shaders": [{ shader }] },
        },
        {
            name: "Far",
            target: "node",
            selector: { match: "ids", nodes: ["far", "back"] },
            set: { "node.color": "#2050e0" },
        },
        {
            name: "Edges",
            target: "edge",
            selector: { match: "everything" },
            set: {
                "edge.color": "#20e040",
                "edge.width": 6,
                ...(edgeShader === undefined ? {} : { "edge.shaders": [{ shader: edgeShader }] }),
            },
        },
    ];
    for (const layer of layers) {
        await element.session.styles.add(layer);
    }

    await operationQueueOf(element.graph).waitForCompletion();
    await drawnFrames(element.graph.getScene(), 1);
    const camera = element.graph.getScene().activeCamera;
    assert.isNotNull(camera);
    assert.isBelow(camera.globalPosition.z, -1, "the camera looks at the graph from the -z side");
    return element;
}

/**
 * Wait until every node on screen is drawn by its shader's compiled batch, and every edge by its
 * edge shader's. An edge shader resolves and compiles on its own schedule, and until then its edge
 * keeps its plain line, so waiting on the nodes alone can read an edge that is not shaded yet.
 * @param element - The element.
 * @param count - How many nodes the batches should hold.
 * @param edges - How many edges the edge shader batches should hold (0 for plain edges).
 */
async function untilDrawn(element: Graphty, count: number, edges: number): Promise<void> {
    const scene = element.graph.getScene();
    const ready = (): boolean => {
        const drawing = NodeShaderDrawing.peek(scene);
        const batches = scene.meshes.filter(
            (mesh) => /^graphtyNode(impostor|replace)/.test(mesh.name) && !mesh.isDisposed(),
        );
        const held = [...(drawing?.stats().slots.values() ?? [])].reduce((sum, n) => sum + n, 0);
        const edgeSlots = EdgeShaderDrawing.peek(scene)?.stats().slots.values() ?? [];
        const edgesHeld = [...edgeSlots].reduce((sum, n) => sum + n, 0);
        return (
            held === count &&
            edgesHeld === edges &&
            batches.length > 0 &&
            batches.every((mesh) => mesh.material?.isReady(mesh) === true)
        );
    };
    for (let i = 0; i < 600 && !ready(); i++) {
        await drawnFrames(scene, 1);
    }

    assert.isTrue(ready(), `the shaders draw all ${String(count)} nodes and ${String(edges)} edges`);
}

/**
 * Read the canvas at world points, after the next frames.
 * @param element - The element.
 * @param points - The points.
 * @returns r, g, b per point.
 */
async function pixelsAt(element: Graphty, points: readonly Vector3[]): Promise<[number, number, number][]> {
    const { engine } = element.graph;
    const scene = element.graph.getScene();
    await drawnFrames(scene, 2);
    const scale = engine.getRenderWidth() / WIDTH;
    const read: [number, number, number][] = [];
    for (const point of points) {
        const at = element.worldToScreen(point);
        const x = Math.round(at.x * scale);
        const y = Math.round(engine.getRenderHeight() - at.y * scale);
        const pixel = (await engine.readPixels(x, y, 1, 1)) as unknown as Uint8Array;
        read.push([pixel[0], pixel[1], pixel[2]]);
    }

    return read;
}

/**
 * The summed channel difference of two pixels.
 * @param a - One.
 * @param b - The other.
 * @returns The difference, 0 to 765.
 */
function difference(a: readonly number[], b: readonly number[]): number {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

/**
 * Draw the scene, read the points, remove what should be hidden there and read them again.
 * @param shader - The node shader.
 * @param edgeShader - An edge shader, or undefined for plain edges.
 */
async function assertCovers(shader: string, edgeShader: string | undefined): Promise<void> {
    const place = SHADER_PRESETS.find((descriptor) => descriptor.id === shader)?.place;
    const sphere = place !== "replace" && shader !== "depth/own-replace";
    const points = [OVERLAP, ON_EDGE, THROUGH, INTERSECT];
    const element = await mounted(shader, edgeShader);
    const shadedEdges = edgeShader === undefined ? 0 : EDGES.length;
    await untilDrawn(element, NODES.length, shadedEdges);
    const [overlap, edge, through, intersect] = await pixelsAt(element, points);

    await element.session.data.removeNodes(HIDDEN);
    await operationQueueOf(element.graph).waitForCompletion();
    // Removing "left" and "right" removes the edge between them.
    await untilDrawn(element, NODES.length - HIDDEN.length, edgeShader === undefined ? 0 : EDGES.length - 1);
    const [nearAlone, edgeAlone, throughAlone, intersectAlone] = await pixelsAt(element, points);

    if (TRANSLUCENT.has(shader)) {
        assert.isAbove(
            difference(overlap, nearAlone),
            24,
            `the far node shows through the near one: ${overlap.join(",")} with it, ${nearAlone.join(",")} without`,
        );
    } else {
        assert.isAtMost(
            difference(overlap, nearAlone),
            24,
            `the near node hides the far one: ${overlap.join(",")} with it behind, ${nearAlone.join(",")} without`,
        );
    }

    assert.isAtMost(
        difference(edge, edgeAlone),
        24,
        `the edge is drawn over the far node: ${edge.join(",")} with it behind, ${edgeAlone.join(",")} without`,
    );
    if (!sphere || SEE_INSIDE.has(shader)) {
        // A card is flat, at the node's center; a translucent sphere shows what is inside it.
        return;
    }

    assert.isAtMost(
        difference(through, throughAlone),
        24,
        `the sphere hides the edge inside it: ${through.join(",")} with it, ${throughAlone.join(",")} without`,
    );
    assert.isAtMost(
        difference(intersect, intersectAlone),
        24,
        `the nearer surface wins where spheres intersect: ${intersect.join(",")}, ${intersectAlone.join(",")} alone`,
    );
}

describe("a shaded node hides what is behind it", () => {
    it.each(BATCH_PRESETS.map((id) => [id] as const))("%s", async (id) => {
        await assertCovers(id, undefined);
    });

    it.each([["depth/own-paint"], ["depth/own-replace"]] as const)("a page's own shader, %s", async (id) => {
        await assertCovers(id, undefined);
    });

    it.each([["pearl"], ["depth/own-paint"]] as const)("%s under an edge drawn by an edge shader", async (id) => {
        await assertCovers(id, "fiber-optic");
    });
});
