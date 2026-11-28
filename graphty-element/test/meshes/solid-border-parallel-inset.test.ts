/**
 * @file A border inside (or centered on) a solid that keeps its own proportions ends on the plain solid's outline
 * (or half its width past it) on every side, whatever the outline's shape. Scaling the whole solid down by its
 * largest extent drew a cone's, a capsule's or a cylinder's short axis and slanted sides in by less than the inset,
 * so the ring built out from that fill ended past the node's outline (issue #10438).
 */
import { type AbstractMesh, InstancedMesh, type Mesh, NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import type { NodeStyleConfig } from "../../src/config/NodeStyle";
import { MeshCache } from "../../src/meshes/MeshCache";
import { NODE_EXTENT_PER_SIZE, NodeMesh } from "../../src/meshes/NodeMesh";
import { projectedVertices } from "../../src/meshes/NodeShapeGeometry";
import { convexHull, offsetOutline, type Point2 } from "../../src/meshes/shapeOutlines";

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
 * @returns Its outline seen along z: the hull of its vertices.
 */
function hullOf(mesh: AbstractMesh): Point2[] {
    const source = mesh instanceof InstancedMesh ? mesh.sourceMesh : (mesh as Mesh);
    return convexHull(projectedVertices(source));
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
 * @param type - The solid.
 * @param position - Where its border sits.
 * @returns The plain solid's outline, and the fill's and the ring's when it has the border.
 */
function drawn(
    type: NonNullable<NodeStyleConfig["shape"]>["type"],
    position: "inside" | "center",
): { plain: Point2[]; fill: Point2[]; ring: Point2[] } {
    const shape = { type, size: 1 };
    const border = { width: WIDTH, position, color: "#0000ff" };
    const plain = NodeMesh.create(cache, { styleId: `${String(type)}-plain`, is2D: true, size: 1 }, { shape }, scene);
    const options = { styleId: `${String(type)}-${position}`, is2D: true, size: 1 };
    const fill = NodeMesh.create(cache, options, { shape, border }, scene);
    const ring = NodeMesh.createBorder(cache, options, { shape, border }, fill, scene);
    assert.exists(ring);

    return { plain: hullOf(plain), fill: hullOf(fill), ring: hullOf(ring) };
}

const SOLIDS = [
    "cone",
    "capsule",
    "cylinder",
    "triangular_dipyramid",
    "triangular_prism",
    "torus",
    "sphere",
    "box",
] as const;

describe("a border on a solid keeps to the plain solid's outline (#10438)", () => {
    for (const type of SOLIDS) {
        test(`an inside border on a ${type} ends on its outline, and a centered one half its width past it`, () => {
            const width = WIDTH * NODE_EXTENT_PER_SIZE;
            for (const [position, past] of [
                ["inside", 0],
                ["center", width / 2],
            ] as const) {
                const { plain, fill, ring } = drawn(type, position);
                // the plain outline itself, or offset half the border's width out as every ring's edge is offset
                const edge = past > 0 ? offsetOutline(plain, past) : plain;
                const off = DIRECTIONS.map((a) => reach(ring, a) - reach(edge, a));
                assert.isBelow(
                    Math.max(...off.map(Math.abs)),
                    0.01,
                    `${position}: ring's outer edge off by ${String(off)}`,
                );
                // the fill is drawn in by the inset across and up the view, the short side as well as the long
                const inset = position === "inside" ? width : width / 2;
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
