/**
 * @file The selection highlight follows the shape of the node it rings (issue #2643).
 *
 * The highlight used to be one shared sphere scaled by the node's largest half-extent. Around a
 * sphere that reads as a halo; around a box its corners poke out through it, so the reader sees
 * a round blob behind a square node. These tests read the drawn highlight from the scene and
 * check that it reaches past the node in every direction the node itself reaches -- its corners
 * included -- rather than reading pixels.
 *
 * The click tests drive the browser's own mouse (test/helpers/real-input.ts).
 */

import "../../../src/graphty-element";

import { type AbstractMesh, Vector3, VertexBuffer } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { NodeShapes } from "../../../src/config/NodeStyle";
import { operationQueueOf } from "../../../src/Graph";
import { drawnFrames } from "../../helpers/drawn-frames";
import { click, type Point } from "../../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

/** A box and a sphere, side by side. */
const NODES = [
    { id: "box", kind: "box", position: { x: -2, y: 0, z: 0 } },
    { id: "ball", kind: "ball", position: { x: 2, y: 0, z: 0 } },
];

/** The configured default: how many times the node's own size the highlight is drawn. */
const DEFAULT_SCALE = 1.45;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element with the given nodes, one style layer per shape named by a node's `kind`.
 * @param viewMode - The view mode.
 * @param nodes - The nodes to draw.
 * @returns The element.
 */
async function mounted(viewMode: "2d" | "3d", nodes: object[] = NODES): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(nodes as Parameters<typeof element.session.data.addNodes>[0]);
    const shapes = new Set<string>(NodeShapes.options);
    for (const kind of new Set(nodes.map((node) => (node as { kind: string }).kind))) {
        if (shapes.has(kind)) {
            await element.session.styles.add({
                name: `${kind} nodes`,
                target: "node",
                selector: { match: "expression", where: `data.kind == \`"${kind}"\`` },
                set: { "node.shape": kind },
            });
        }
    }
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Wait until the element has applied the input just given and drawn it.
 * @param element - The element.
 */
async function applied(element: Graphty): Promise<void> {
    await drawnFrames(element.graph.getScene(), 2);
    await element.waitForStableFrame();
}

/**
 * Where a node is drawn on screen.
 * @param element - The element.
 * @param id - The node.
 * @returns Its centre in CSS pixels from the element's top-left corner.
 */
function at(element: Graphty, id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} is drawn`);
    return { x: position.x, y: position.y };
}

/**
 * The selection highlight on screen. The cached source mesh sits in the scene too, hidden, so
 * visibility is what tells the drawn instance from it.
 * @param element - The element.
 * @returns The one drawn highlight.
 */
function drawnHalo(element: Graphty): AbstractMesh {
    const halos = element.graph
        .getScene()
        .meshes.filter((mesh) => mesh.name.startsWith("graphty-selection-halo") && mesh.isVisible && mesh.isEnabled());
    assert.lengthOf(halos, 1, "one selected node draws one highlight");
    return halos[0];
}

/**
 * A mesh's vertices in world space.
 * @param mesh - The mesh (an instance reads its source's geometry).
 * @returns The points.
 */
function worldVertices(mesh: AbstractMesh): Vector3[] {
    const data = mesh.getVerticesData(VertexBuffer.PositionKind);
    assert.isNotNull(data, `${mesh.name} has geometry`);
    const world = mesh.computeWorldMatrix(true);
    const points: Vector3[] = [];
    for (let i = 0; i < data.length; i += 3) {
        points.push(Vector3.TransformCoordinates(new Vector3(data[i], data[i + 1], data[i + 2]), world));
    }

    return points;
}

/**
 * How far a set of points reaches from a centre along a direction: its support function.
 * @param points - The points.
 * @param center - Where to measure from.
 * @param direction - A unit direction.
 * @returns The largest projection.
 */
function reach(points: Vector3[], center: Vector3, direction: Vector3): number {
    let best = -Infinity;
    for (const point of points) {
        best = Math.max(best, Vector3.Dot(point.subtract(center), direction));
    }

    return best;
}

/**
 * Assert the highlight reaches past the node in every direction the node reaches: along each
 * axis and out through every one of the node's own vertices (a box's corners).
 * @param element - The element.
 * @param id - The selected node.
 */
function assertHaloSurrounds(element: Graphty, id: string): void {
    const node = element.graph.getNode(id);
    assert.isDefined(node, `node ${id} exists`);
    const nodePoints = worldVertices(node.mesh);
    const haloPoints = worldVertices(drawnHalo(element));
    const center = node.mesh.getAbsolutePosition();
    const directions = [
        new Vector3(1, 0, 0),
        new Vector3(-1, 0, 0),
        new Vector3(0, 1, 0),
        new Vector3(0, -1, 0),
        new Vector3(0, 0, 1),
        new Vector3(0, 0, -1),
        ...nodePoints.map((point) => point.subtract(center)).filter((offset) => offset.length() > 1e-6),
    ].map((direction) => direction.normalize());

    for (const direction of directions) {
        const nodeReach = reach(nodePoints, center, direction);
        const haloReach = reach(haloPoints, center, direction);
        assert.isAbove(
            haloReach,
            nodeReach,
            `the highlight around ${id} reaches past the node toward (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})`,
        );
    }
}

describe.each(["2d", "3d"] as const)("the selection highlight in %s", (viewMode) => {
    it("follows a box node selected by a click, corners included", async () => {
        const element = await mounted(viewMode);

        await click(element, at(element, "box"));
        await applied(element);

        assert.strictEqual(element.getSelectedNode()?.id, "box", "the click selected the box");
        assertHaloSurrounds(element, "box");
    });

    it("is still a sphere at the configured scale around a sphere node", async () => {
        const element = await mounted(viewMode);

        await click(element, at(element, "ball"));
        await applied(element);

        assert.strictEqual(element.getSelectedNode()?.id, "ball", "the click selected the sphere");
        assertHaloSurrounds(element, "ball");
        const node = element.graph.getNode("ball");
        assert.isDefined(node);
        const nodeExtent = node.mesh.getBoundingInfo().boundingBox.extendSizeWorld;
        const haloExtent = drawnHalo(element).getBoundingInfo().boundingBox.extendSizeWorld;
        for (const axis of ["x", "y", "z"] as const) {
            assert.closeTo(haloExtent[axis] / nodeExtent[axis], DEFAULT_SCALE, 1e-3, `round on ${axis}`);
        }
    });
});

describe("the selection highlight", () => {
    it("is rebuilt in the new shape when a selected node changes shape", async () => {
        const element = await mounted("3d");

        await click(element, at(element, "ball"));
        await applied(element);
        await element.session.styles.add({
            name: "everything a box",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": "box" },
        });
        await applied(element);

        assertHaloSurrounds(element, "ball");
    });

    it("surrounds a node of every built-in shape", async () => {
        const nodes = NodeShapes.options.map((shape, i) => ({
            id: shape,
            kind: shape,
            position: { x: (i % 6) * 3, y: Math.floor(i / 6) * 3, z: 0 },
        }));
        const element = await mounted("3d", nodes);

        for (const shape of NodeShapes.options) {
            assert.isTrue(element.selectNode(shape), `${shape} is selectable`);
            await applied(element);
            assertHaloSurrounds(element, shape);
        }
    });
});
