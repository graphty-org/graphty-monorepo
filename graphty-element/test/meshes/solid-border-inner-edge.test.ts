/**
 * @file An inside border on a solid that keeps its own proportions starts where its fill ends: the ring's inner edge
 * and the fill's outline are one outline, the plain solid's drawn in by the border's width side by side, so the ring
 * is the border's width wide everywhere and no background shows between it and the fill. Drawing the ring in from
 * the outline only as far as the first of its sides closes up left a sphere seen in 3D a hairline ring at its
 * outline round a fill drawn in to a dot; and a cone's, a tetrahedron's or a capsule's fill shrunk on each axis in
 * 2D came in by less than the ring on its slanted or round sides, under the ring (issue #10438).
 */
import {
    type AbstractMesh,
    FreeCamera,
    InstancedMesh,
    type Mesh,
    NullEngine,
    Scene,
    TransformNode,
    Vector3,
    VertexBuffer,
} from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import type { NodeStyleConfig } from "../../src/config/NodeStyle";
import { MeshCache } from "../../src/meshes/MeshCache";
import { NODE_EXTENT_PER_SIZE, NodeMesh } from "../../src/meshes/NodeMesh";
import { convexHull, type Point2 } from "../../src/meshes/shapeOutlines";

let scene: Scene;
let cache: MeshCache;

beforeEach(() => {
    scene = new Scene(new NullEngine());
    cache = new MeshCache();
});

afterEach(() => {
    scene.getEngine().dispose();
});

/**
 * @param mesh - A node's mesh or ring.
 * @returns Its vertices seen along z.
 */
function pointsOf(mesh: AbstractMesh): Point2[] {
    const source = mesh instanceof InstancedMesh ? mesh.sourceMesh : (mesh as Mesh);
    const positions = source.getVerticesData(VertexBuffer.PositionKind) ?? [];
    return Array.from({ length: positions.length / 3 }, (_, i): Point2 => [positions[3 * i], positions[3 * i + 1]]);
}

/**
 * @param points - Some points.
 * @param angle - A direction, in radians.
 * @returns How far they reach along the direction.
 */
function reach(points: readonly Point2[], angle: number): number {
    const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
    return Math.max(...points.map(([x, y]) => x * dx + y * dy));
}

/**
 * @param p - A point.
 * @param outline - A convex outline.
 * @returns How far the point is from the outline's edge.
 */
function toEdge(p: Point2, outline: readonly Point2[]): number {
    return Math.min(
        ...outline.map((a, i) => {
            const b = outline[(i + 1) % outline.length];
            const [ex, ey] = [b[0] - a[0], b[1] - a[1]];
            const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / (ex * ex + ey * ey || 1)));
            return Math.hypot(p[0] - a[0] - t * ex, p[1] - a[1] - t * ey);
        }),
    );
}

/**
 * @param outline - A convex outline, counter-clockwise or clockwise.
 * @returns The direction each of its sides faces out, in radians, leaving out sides a hair long.
 */
function sideNormals(outline: readonly Point2[]): number[] {
    const turn = outline.reduce((sum, [x, y], i) => {
        const [nx, ny] = outline[(i + 1) % outline.length];
        return sum + x * ny - nx * y;
    }, 0);
    return outline.flatMap(([x, y], i) => {
        const [nx, ny] = outline[(i + 1) % outline.length];
        if (Math.hypot(nx - x, ny - y) < 1e-3) {
            return [];
        }
        return [Math.atan2(turn > 0 ? -(nx - x) : nx - x, turn > 0 ? ny - y : -(ny - y))];
    });
}

const DIRECTIONS = Array.from({ length: 72 }, (_, i) => (i * Math.PI) / 36);

/**
 * @param values - Some numbers.
 * @returns Their median.
 */
function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

/**
 * @param type - The solid.
 * @param width - The border's width, in size units.
 * @param is2D - Whether it is drawn in 2D.
 * @returns The plain solid's outline, the fill's vertices and the ring's outer and inner edges.
 */
function drawn(
    type: NonNullable<NodeStyleConfig["shape"]>["type"],
    width: number,
    is2D: boolean,
): { plain: Point2[]; fill: Point2[]; outer: Point2[]; inner: Point2[] } {
    const shape = { type, size: 1 };
    const border = { width, position: "inside" as const, color: "#0000ff" };
    const view = is2D ? "2d" : "3d";
    const plainMesh = NodeMesh.create(cache, { styleId: `${String(type)}-plain-${view}`, is2D, size: 1 }, { shape }, scene);
    const options = { styleId: `${String(type)}-inside-${String(width)}-${view}`, is2D, size: 1 };
    const fill = NodeMesh.create(cache, options, { shape, border }, scene);
    const ring = NodeMesh.createBorder(cache, options, { shape, border }, fill, scene);
    assert.exists(ring);
    const ringPoints = pointsOf(ring);
    const outer = convexHull(ringPoints);
    // the ring's inner edge: its points off its outer edge
    const inner = ringPoints.filter((p) => toEdge(p, outer) > 1e-4);
    assert.isNotEmpty(inner, "the ring has an inner edge");

    return { plain: convexHull(pointsOf(plainMesh)), fill: pointsOf(fill), outer, inner };
}

const CASES = [
    { type: "sphere", is2D: false },
    { type: "cone", is2D: true },
    { type: "tetrahedron", is2D: true },
    { type: "capsule", is2D: true },
] as const;

describe("an inside border on a solid starts where its fill ends (#10438)", () => {
    for (const { type, is2D } of CASES) {
        const view = is2D ? "2D" : "3D";
        test(`on a ${type} in ${view}, the ring is the border's width wide and its inner edge is the fill's outline`, () => {
            const width = 0.1 * NODE_EXTENT_PER_SIZE;
            const { plain, fill, outer, inner } = drawn(type, 0.1, is2D);
            for (const a of DIRECTIONS) {
                assert.approximately(reach(outer, a), reach(plain, a), 0.01, `ring's outer edge at ${String(a)}`);
                assert.approximately(reach(inner, a), reach(fill, a), 0.01, `ring's inner edge at ${String(a)}`);
            }
            // each side of the outline is drawn in by the border's width: no less (the fill under the ring), and no
            // more but where a side too short to keep closed up on the way
            const inBy = sideNormals(plain).map((a) => reach(plain, a) - reach(fill, a));
            assert.approximately(Math.min(...inBy), width, 0.01, `sides drawn in by ${String(inBy)}`);
            assert.approximately(median(inBy), width, 0.01, `sides drawn in by ${String(inBy)}`);
        });

        test(`on a ${type} in ${view}, a border wider than it is deep closes its fill up under the ring's inner edge`, () => {
            const { plain, fill, outer, inner } = drawn(type, 0.45, is2D);
            for (const a of DIRECTIONS) {
                assert.approximately(reach(outer, a), reach(plain, a), 0.01, `ring's outer edge at ${String(a)}`);
                assert.approximately(reach(inner, a), reach(fill, a), 0.01, `ring's inner edge at ${String(a)}`);
            }
            // never drawn in past the border's width, and never out past its outline
            const inBy = sideNormals(plain).map((a) => reach(plain, a) - reach(fill, a));
            assert.isBelow(Math.max(...inBy), 0.45 * NODE_EXTENT_PER_SIZE + 0.01, `sides drawn in by ${String(inBy)}`);
            assert.isAbove(Math.min(...inBy), 0, `sides drawn in by ${String(inBy)}`);
        });
    }
});

describe("an inside border on a sphere seen in perspective starts where its fill ends (#10438)", () => {
    // seen from off to one side, the sphere's outline is the hull of its vertices bunched at its rim, with many short
    // sides: the ring drawn in only until the first of them closed up was a hairline at the outline round a fill
    // drawn in to a dot
    for (const width of [0.1, 0.3]) {
        test(`a border ${String(width)} wide is that wide round the sphere, out to its outline`, () => {
            const camera = new FreeCamera("camera", new Vector3(1.5, 2, -3), scene);
            camera.setTarget(Vector3.Zero());
            const shape = { type: "sphere", size: 1 } as const;
            const border = { width, position: "inside" as const, color: "#0000ff" };
            const options = { styleId: `sphere-seen-${String(width)}`, is2D: false, size: 1 };
            const node = new TransformNode("node", scene);
            const fill = NodeMesh.create(cache, options, { shape, border }, scene);
            const ring = NodeMesh.createBorder(cache, options, { shape, border }, fill, scene);
            assert.exists(ring);
            fill.parent = node;
            ring.parent = node;
            scene.render();

            const radius = (points: Point2[]): number => Math.max(...points.map(([x, y]) => Math.hypot(x, y)));
            const ringPoints = pointsOf(ring);
            const outer = convexHull(ringPoints);
            const inner = ringPoints.filter((p) => toEdge(p, outer) > 1e-4);
            assert.isNotEmpty(inner, "the ring has an inner edge");
            // the ring is built round the outline as seen, a little larger than the sphere: compare in its proportions
            const plain = radius(
                pointsOf(NodeMesh.create(cache, { ...options, styleId: "sphere-plain" }, { shape }, scene)),
            );
            const expected = (plain - Math.min(width * NODE_EXTENT_PER_SIZE, plain)) / plain;
            assert.approximately(radius(inner) / radius(outer), expected, 0.02, "ring's inner edge over its outer");
            assert.approximately(radius(pointsOf(fill)) / plain, expected, 0.01, "fill over the plain sphere");
        });
    }
});
