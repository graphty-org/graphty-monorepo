/**
 * @file In a 3D view, each node's outer border and underlay follow the outline that node shows the camera, not the
 * outline the nearest node of the same style shows (issue #10534). Measured through the camera: every vertex of a
 * node's box and of its ring is seen from the camera along the line to the node's middle, and every side of the box's
 * outline seen that way has a side of the ring's outline parallel to it.
 */

import "../../src/graphty-element";

import { type AbstractMesh, type InstancedMesh, type Mesh, Vector3, VertexBuffer } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { convexHull, type Point2 } from "../../src/meshes/shapeOutlines";
import { nodeInternals } from "../../src/Node";
import { drag } from "../helpers/real-input";

const WIDTH = 480;
const HEIGHT = 360;

/**
 * How far a ring's side may turn from the box's, in radians: the ring is built from the box's own outline and only
 * offset and scaled, so its sides are the box's sides to the float32 precision of the vertices.
 */
const PARALLEL = 1e-4;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** Boxes of one style spread across and through the view, so each is seen from its own direction. */
const NODES = [
    { id: "c", position: { x: 0, y: 0, z: 0 } },
    { id: "a", position: { x: 0, y: 9, z: -6 } },
    { id: "b", position: { x: 9, y: -4, z: 5 } },
    { id: "d", position: { x: -8, y: -6, z: -3 } },
];

/**
 * Boxes with an outer border and an underlay, no border, in a 3D view, settled.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode("3d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.styles.add({
        name: "probe",
        target: "node",
        selector: { match: "everything" },
        set: {
            "node.shape": "box",
            "node.size": 3,
            "node.outerBorderWidth": 0.3,
            "node.outerBorderOffset": 0.2,
            "node.outerBorderColor": "#ff0000",
            "node.underlayColor": "#00ff00",
            "node.underlayOpacity": 1,
            "node.underlayPadding": 0.4,
        },
    });
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * A mesh's vertices seen from the camera along the line to a point: each vertex's direction from the camera, on the
 * plane one unit along that line.
 * @param mesh - The mesh (an instance's world matrix places its source's vertices).
 * @param eye - The camera's position.
 * @param middle - The point looked at.
 * @returns The points, in that plane.
 */
function seen(mesh: AbstractMesh, eye: Vector3, middle: Vector3): Point2[] {
    const look = middle.subtract(eye).normalize();
    const across = Vector3.Cross(look, Math.abs(look.y) < 0.9 ? Vector3.Up() : Vector3.Right()).normalize();
    const up = Vector3.Cross(across, look);
    const source: Mesh = (mesh as InstancedMesh).sourceMesh ?? (mesh as Mesh);
    const positions = source.getVerticesData(VertexBuffer.PositionKind) ?? [];
    const world = mesh.computeWorldMatrix(true);
    const at = new Vector3();
    const points: Point2[] = [];
    for (let i = 0; i < positions.length; i += 3) {
        Vector3.TransformCoordinatesFromFloatsToRef(positions[i], positions[i + 1], positions[i + 2], world, at);
        at.subtractInPlace(eye);
        const ahead = Vector3.Dot(at, look);
        points.push([Vector3.Dot(at, across) / ahead, Vector3.Dot(at, up) / ahead]);
    }
    return points;
}

/**
 * The direction of each side of a convex outline longer than a share of its size, in radians, folded to [0, pi).
 * @param hull - The outline.
 * @param share - The shortest side kept, as a share of the outline's widest reach.
 * @returns The directions.
 */
function sides(hull: Point2[], share: number): number[] {
    const reach = Math.max(...hull.map(([x, y]) => Math.hypot(x - hull[0][0], y - hull[0][1])));
    const out: number[] = [];
    for (let i = 0; i < hull.length; i++) {
        const [a, b] = [hull[i], hull[(i + 1) % hull.length]];
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) > share * reach) {
            out.push((Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI) % Math.PI);
        }
    }
    return out;
}

/**
 * How far a direction is from the nearest of some others, in radians.
 * @param angle - The direction.
 * @param others - The others.
 * @returns The least turn between them.
 */
function turnTo(angle: number, others: number[]): number {
    return Math.min(
        ...others.map((other) => {
            const d = Math.abs(angle - other) % Math.PI;
            return Math.min(d, Math.PI - d);
        }),
    );
}

/**
 * Every node's outer border and underlay have a side parallel to each side of the node's box, as the camera sees both.
 * @param element - The element.
 * @param when - Which view this is, for the messages.
 */
function assertRingsFollowOwnBox(element: Graphty, when: string): void {
    const camera = element.graph.getScene().activeCamera;
    assert.isNotNull(camera);
    const eye = camera.globalPosition;
    const directions = new Set<string>();
    for (const { id } of NODES) {
        const node = element.graph.getDataManager().nodes.get(id);
        assert.isDefined(node);
        const middle = node.mesh.getBoundingInfo().boundingSphere.centerWorld;
        const box = sides(convexHull(seen(node.mesh, eye, middle)), 0.05);
        assert.isAtLeast(box.length, 4, `${when}, node ${id}: its box shows at least four sides`);
        directions.add(box.map((angle) => angle.toFixed(2)).join(","));
        const drawn = nodeInternals.drawn(node);
        for (const [name, ring] of [
            ["outer border", drawn.outerBorder],
            ["underlay", drawn.underlay],
        ] as const) {
            assert.isNotNull(ring, `${when}, node ${id} has an ${name}`);
            const ringSides = sides(convexHull(seen(ring, eye, middle)), 0.01);
            const worst = Math.max(...box.map((angle) => turnTo(angle, ringSides)));
            assert.isAtMost(worst, PARALLEL, `${when}, node ${id}: its ${name} follows its own box's outline`);
        }
    }
    assert.isAbove(directions.size, 1, `${when}: the boxes are seen from different directions`);
}

describe("a solid's outer border and underlay in 3D follow its own outline (#10534)", () => {
    it("follows each box's outline, framed and turned", async () => {
        const element = await mounted();
        assertRingsFollowOwnBox(element, "framed");

        const canvas = element.graph.getScene().getEngine().getRenderingCanvas();
        assert.isNotNull(canvas);
        await drag(canvas, { x: 20, y: HEIGHT - 20 }, { x: 140, y: HEIGHT - 60 });
        await element.waitForStableFrame();
        assertRingsFollowOwnBox(element, "turned");
    });
});
