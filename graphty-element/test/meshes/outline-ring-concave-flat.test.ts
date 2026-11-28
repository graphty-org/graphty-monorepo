/**
 * @file A node's outline ring round a flat shape with a notch (a vee, a star) follows the notch in, as the
 * shape's own border does. Built round the convex hull of the shape's vertices, the ring bridged the notch,
 * and background showed between the node and its outline there.
 */
import { FreeCamera, Mesh, NullEngine, Scene, Vector3, VertexBuffer } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { MeshCache } from "../../src/meshes/MeshCache";
import { NodeEffects } from "../../src/meshes/NodeEffects";
import { NodeMesh } from "../../src/meshes/NodeMesh";
import { convexHull, type Point2 } from "../../src/meshes/shapeOutlines";

let scene: Scene;

beforeEach(() => {
    scene = new Scene(new NullEngine());
    const camera = new FreeCamera("camera", new Vector3(0, 0, -10), scene);
    camera.setTarget(Vector3.Zero());
    scene.activeCamera = camera;
});

afterEach(() => {
    scene.getEngine().dispose();
});

/**
 * @param points - A closed outline.
 * @returns Its area.
 */
function area(points: readonly Point2[]): number {
    return Math.abs(
        points.reduce((sum, [x, y], i) => {
            const [nx, ny] = points[(i + 1) % points.length];
            return sum + x * ny - nx * y;
        }, 0) / 2,
    );
}

describe("a flat shape's outline ring follows a notch in its outline", () => {
    for (const type of ["vee", "star"] as const) {
        test(`a ${type}'s ring's inner edge goes into its notches`, () => {
            const node = NodeMesh.create(
                new MeshCache(),
                { styleId: `outline-${type}`, is2D: false, size: 1 },
                { shape: { type, size: 1 } },
                scene,
            );
            NodeEffects.applyOutlineEffect(node, { outline: { color: "#ff00ff" } }, () => 0, true);
            const ring = node.getChildMeshes(true).find((m) => m.name.startsWith("graphty-node-outline-"));
            assert.instanceOf(ring, Mesh);
            const positions = ring.getVerticesData(VertexBuffer.PositionKind) ?? [];
            // the band's inner and outer edge points alternate, the first repeated to close it
            const inner: Point2[] = [];
            for (let i = 0; i + 5 < positions.length - 6; i += 6) {
                inner.push([positions[i], positions[i + 1]]);
            }
            assert.isAtLeast(inner.length, 3);
            // the notch takes area out of the inner edge's hull: bridging it left the two the same
            assert.isBelow(area(inner) / area(convexHull(inner)), 0.95, `${type}: inner edge bridges its notches`);
        });
    }
});
