/**
 * @file A node's outline ring starts where the node's drawn border and outer border end, on every ray, with no
 * background between them and no ring over them. The ring was built by growing the fill's outline by the rings'
 * width, which is not the shape the rings are drawn as: a sharp corner's rings are cut square at three times their
 * width (`mitredEdges`), so on a wide tetrahedron's point the ring stood well past the outer border's cut, and an
 * inside border that closes a star's points up drew the fill in past where growing it back finds the star again.
 */
import {
    type AbstractMesh,
    Camera,
    FreeCamera,
    type InstancedMesh,
    Mesh,
    NullEngine,
    Scene,
    Vector3,
    VertexBuffer,
} from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import type { NodeStyleConfig } from "../../src/config";
import { MeshCache } from "../../src/meshes/MeshCache";
import { NodeEffects } from "../../src/meshes/NodeEffects";
import { NodeMesh } from "../../src/meshes/NodeMesh";
import { isFlatShape, type Point2 } from "../../src/meshes/shapeOutlines";

let scene: Scene;

beforeEach(() => {
    scene = new Scene(new NullEngine());
    const camera = new FreeCamera("camera", new Vector3(0, 0, -10), scene);
    camera.setTarget(Vector3.Zero());
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    scene.activeCamera = camera;
});

afterEach(() => {
    scene.getEngine().dispose();
});

/**
 * The world (x, y) of a mesh's vertices, seen along z, from a node's middle.
 * @param mesh - The mesh or instance.
 * @param middle - The node's middle.
 * @returns Its vertices and triangles.
 */
function seen(mesh: AbstractMesh, middle: Vector3): { points: Point2[]; indices: number[] } {
    const source = (mesh as InstancedMesh).sourceMesh ?? mesh;
    const positions = source.getVerticesData(VertexBuffer.PositionKind) ?? [];
    const world = mesh.computeWorldMatrix(true);
    const points: Point2[] = [];
    for (let i = 0; i + 2 < positions.length; i += 3) {
        const p = Vector3.TransformCoordinates(new Vector3(positions[i], positions[i + 1], positions[i + 2]), world);
        points.push([p.x - middle.x, p.y - middle.y]);
    }
    return { points, indices: Array.from(source.getIndices() ?? []) };
}

/**
 * How far along a ray from the origin the furthest of some segments is crossed.
 * @param segments - The segments.
 * @param a - The ray's angle.
 * @returns The distance, or 0 when the ray crosses none.
 */
function exitAlong(segments: readonly [Point2, Point2][], a: number): number {
    const [dx, dy] = [Math.cos(a), Math.sin(a)];
    let far = 0;
    for (const [[px, py], [qx, qy]] of segments) {
        const [ex, ey] = [qx - px, qy - py];
        const den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-12) {
            continue;
        }
        const t = (px * ey - py * ex) / den;
        const u = (px * dy - py * dx) / den;
        if (t >= 0 && u >= -1e-9 && u <= 1 + 1e-9) {
            far = Math.max(far, t);
        }
    }
    return far;
}

/**
 * Build a node with its border, outer border and outline, as Node does, and read along rays from its middle how far
 * the ring's inner edge lies past the furthest thing the node draws.
 * @param shape - The node's shape.
 * @param border - Its border.
 * @param is2D - Whether the view is 2D.
 * @returns The gap on each ray, in world units: positive is background between the node and its ring.
 */
function gaps(
    shape: NonNullable<NodeStyleConfig["shape"]>,
    border: NodeStyleConfig["border"],
    is2D: boolean,
): number[] {
    const cache = new MeshCache();
    const outerBorder = { width: 0.2, offset: 0.2, color: "#00aa00" };
    const options = { styleId: `ring-on-rings-${shape.type}`, is2D, size: 1 };
    const node = NodeMesh.create(cache, options, { shape, border }, scene);
    const rings = [
        NodeMesh.createBorder(cache, options, { shape, border }, node, scene),
        NodeMesh.createOuterBorder(cache, options, { shape, border, outerBorder }, node, scene),
    ];
    // the reach Node hands the ring: its border's ring, then the outer border's offset and width past it
    const perSize = NodeMesh.extentPerSize(shape);
    const extents = NodeMesh.extentsOf(shape, 1);
    const { ring } = NodeMesh.borderFit(shape, border, extents);
    const reach = ring + (outerBorder.offset + outerBorder.width) * perSize;
    NodeEffects.applyOutlineEffect(
        node,
        { outline: { color: "#ff00ff" } },
        () => reach,
        isFlatShape(shape.type ?? ""),
        () => rings,
    );

    const ringMesh = node.getChildMeshes(true).find((m) => m.name.startsWith("graphty-node-outline-"));
    assert.instanceOf(ringMesh, Mesh);
    // the band's inner and outer edge points alternate
    const middle = node.getAbsolutePosition();
    const band = seen(ringMesh, middle).points;
    const inner = band.filter((_, i) => i % 2 === 0);
    const ringSides = inner.slice(0, -1).map((p, i): [Point2, Point2] => [p, inner[i + 1]]);
    const drawnSides: [Point2, Point2][] = [];
    for (const mesh of [node, ...rings]) {
        assert.isNotNull(mesh);
        const { points, indices } = seen(mesh, middle);
        for (let t = 0; t + 2 < indices.length; t += 3) {
            const [a, b, c] = [points[indices[t]], points[indices[t + 1]], points[indices[t + 2]]];
            drawnSides.push([a, b], [b, c], [c, a]);
        }
    }
    return Array.from({ length: 180 }, (_, k) => {
        const a = (2 * Math.PI * k) / 180;
        return exitAlong(ringSides, a) - exitAlong(drawnSides, a);
    });
}

describe("a node's outline ring starts at its drawn rings' outer edge", () => {
    test("on a wide tetrahedron's sharp point, cut square by its border and outer border", () => {
        const g = gaps({ type: "tetrahedron", size: 1, width: 1.6, height: 1 }, { width: 0.3, color: "#0000ff" }, true);
        assert.isBelow(Math.max(...g), 1e-3, `ring past the node's rings by ${String(Math.max(...g))}`);
        assert.isAbove(Math.min(...g), -1e-3, `ring over the node's rings by ${String(-Math.min(...g))}`);
    });

    test("on a star whose inside border closes its points up", () => {
        const g = gaps(
            { type: "star", size: 1, width: 1.6, height: 1 },
            { width: 0.3, position: "inside", color: "#0000ff" },
            false,
        );
        assert.isBelow(Math.max(...g), 1e-3, `ring past the node's rings by ${String(Math.max(...g))}`);
        assert.isAbove(Math.min(...g), -1e-3, `ring over the node's rings by ${String(-Math.min(...g))}`);
    });
});
