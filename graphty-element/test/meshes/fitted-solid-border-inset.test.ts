/**
 * @file A border inside (or centered on) a solid fitted to a width and a height of its own (a wide capsule, cone or
 * tetrahedron) ends on the plain fitted solid's outline (or half its width past it) on every side. Fitting the fill
 * to the extents less twice the inset drew its slanted sides in by less than the inset, so the ring built out from
 * that fill ended past the node's outline (issue #10500).
 */
import { type AbstractMesh, InstancedMesh, type Mesh, NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import type { NodeStyleConfig } from "../../src/config/NodeStyle";
import { MeshCache } from "../../src/meshes/MeshCache";
import { NODE_EXTENT_PER_SIZE, NodeMesh } from "../../src/meshes/NodeMesh";
import { projectedVertices } from "../../src/meshes/NodeShapeGeometry";
import { convexHull, mitredEdges, type Point2 } from "../../src/meshes/shapeOutlines";

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
 * @returns Its outline seen along z: the hull of its vertices, with no point twice.
 */
function hullOf(mesh: AbstractMesh): Point2[] {
    const source = mesh instanceof InstancedMesh ? mesh.sourceMesh : (mesh as Mesh);
    const hull = convexHull(projectedVertices(source));
    // a cone's tip is several vertices a hair apart: one point, so its expected edge has a tip to mitre
    return hull.filter(
        ([x, y], i) => Math.hypot(x - hull[(i + 1) % hull.length][0], y - hull[(i + 1) % hull.length][1]) > 1e-4,
    );
}

/**
 * @param hull - An outline.
 * @param angle - A direction, in radians.
 * @returns How far the outline reaches along the direction.
 */
function reach(hull: readonly Point2[], angle: number): number {
    const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
    return Math.max(...hull.map(([x, y]) => x * dx + y * dy));
}

const WIDTH = 0.1;
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
 * @param position - Where its border sits.
 * @returns The plain fitted solid's outline, and the fill's and the ring's when it has the border.
 */
function drawn(
    type: NonNullable<NodeStyleConfig["shape"]>["type"],
    position: "inside" | "center",
): { plain: Point2[]; fill: Point2[]; ring: Point2[]; depths: [number, number] } {
    const shape = { type, size: 1, width: 2, height: 1 };
    const border = { width: WIDTH, position, color: "#0000ff" };
    const plain = NodeMesh.create(cache, { styleId: `${String(type)}-plain`, is2D: true, size: 1 }, { shape }, scene);
    const options = { styleId: `${String(type)}-${position}`, is2D: true, size: 1 };
    const fill = NodeMesh.create(cache, options, { shape, border }, scene);
    const ring = NodeMesh.createBorder(cache, options, { shape, border }, fill, scene);
    assert.exists(ring);

    return { plain: hullOf(plain), fill: hullOf(fill), ring: hullOf(ring), depths: [depthOf(plain), depthOf(fill)] };
}

/**
 * @param mesh - A node's mesh.
 * @returns How deep it is drawn along z, the side a 3D camera sees at an angle.
 */
function depthOf(mesh: AbstractMesh): number {
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    return box.maximumWorld.z - box.minimumWorld.z;
}

describe("a border on a wide fitted solid keeps to the plain solid's outline (#10500)", () => {
    for (const type of ["capsule", "tetrahedron", "cone"] as const) {
        test(`an inside border on a wide ${type} ends on its outline, and a centered one half its width past it`, () => {
            const width = WIDTH * NODE_EXTENT_PER_SIZE;
            for (const [position, past] of [
                ["inside", 0],
                ["center", width / 2],
            ] as const) {
                const { plain, fill, ring, depths } = drawn(type, position);
                const edge = past > 0 ? mitredEdges(plain, [past])[0] : plain;
                const off = DIRECTIONS.map((a) => reach(ring, a) - reach(edge, a));
                // never past it; short of it only at a tip too sharp to mitre in full (a wide tetrahedron's ends), which
                // every ring cuts square three widths out
                assert.isBelow(Math.max(...off), 0.01, `${position}: ring's outer edge past it by ${String(off)}`);
                assert.isAbove(Math.min(...off), -0.2, `${position}: ring's outer edge short of it by ${String(off)}`);
                assert.isBelow(median(off.map(Math.abs)), 0.01, `${position}: ring's outer edge off by ${String(off)}`);
                // the fill is drawn in by the inset across and up the view, and in depth, seen from the side in 3D
                const inset = position === "inside" ? width : width / 2;
                assert.approximately(depths[0] - depths[1], 2 * inset, 0.01, `${position} fill in depth`);
                for (const a of [0, Math.PI / 2]) {
                    const across = (hull: Point2[]): number => reach(hull, a) + reach(hull, a + Math.PI);
                    assert.approximately(
                        across(plain) - across(fill),
                        2 * inset,
                        0.01,
                        `${position} fill at ${String(a)}`,
                    );
                }
            }
        });
    }
});
