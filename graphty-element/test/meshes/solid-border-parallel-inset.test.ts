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

/**
 * @param outline - An outline.
 * @returns Twice its signed area: above 0 when it runs counter-clockwise.
 */
function turnOf(outline: readonly Point2[]): number {
    return outline.reduce((sum, [x, y], i) => {
        const [nx, ny] = outline[(i + 1) % outline.length];
        return sum + x * ny - nx * y;
    }, 0);
}

/**
 * @param values - Some numbers.
 * @returns Their median.
 */
function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}
const DIRECTIONS = Array.from({ length: 72 }, (_, i) => (i * Math.PI) / 36);

/**
 * @param type - The solid.
 * @param position - Where its border sits.
 * @returns The plain solid's outline, and the fill's and the ring's when it has the border.
 */
function drawn(
    type: NonNullable<NodeStyleConfig["shape"]>["type"],
    position: "inside" | "center",
    width = WIDTH,
    is2D = true,
): { plain: Point2[]; fill: Point2[]; ring: Point2[] } {
    const shape = { type, size: 1 };
    const border = { width, position, color: "#0000ff" };
    const view = is2D ? "2d" : "3d";
    const plain = NodeMesh.create(cache, { styleId: `${String(type)}-plain-${view}`, is2D, size: 1 }, { shape }, scene);
    const options = { styleId: `${String(type)}-${position}-${String(width)}-${view}`, is2D, size: 1 };
    const fill = NodeMesh.create(cache, options, { shape, border }, scene);
    const ring = NodeMesh.createBorder(cache, options, { shape, border }, fill, scene);
    assert.exists(ring);

    return { plain: hullOf(plain), fill: hullOf(fill), ring: hullOf(ring) };
}

const SOLIDS = [
    "icosahedron",
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
                // the plain outline itself, or its edge half the border's width out, as every ring's edge is offset
                const edge = past > 0 ? mitredEdges(plain, [past])[0] : plain;
                const off = DIRECTIONS.map((a) => reach(ring, a) - reach(edge, a));
                // never past it; short of it only at a tip too sharp to mitre in full (a cone's), which every ring cuts
                // square three widths out, and a band's outer edge, offset point for point, to a point three widths
                // out: short of the square cut by up to twice its reach
                assert.isBelow(Math.max(...off), 0.01, `${position}: ring's outer edge past it by ${String(off)}`);
                const short = Math.min(-0.1, -2 * past - 0.01);
                assert.isAbove(Math.min(...off), short, `${position}: ring's outer edge short of it by ${String(off)}`);
                assert.isBelow(median(off.map(Math.abs)), 0.01, `${position}: ring's outer edge off by ${String(off)}`);
                // the fill is drawn in by the inset on each side of the outline in 2D, the short and slanted sides as
                // well as the long: at least that far on every side, and that far on most (a side too short to keep
                // closes up on the way)
                const inset = position === "inside" ? width : width / 2;
                const inBy = plain.map(([x, y], i) => {
                    const [nx, ny] = plain[(i + 1) % plain.length];
                    const a = Math.atan2(-(nx - x), ny - y) + (turnOf(plain) > 0 ? 0 : Math.PI);
                    return reach(plain, a) - reach(fill, a);
                });
                assert.isAbove(Math.min(...inBy), inset - 0.01, `${position} fill drawn in by ${String(inBy)}`);
                assert.approximately(median(inBy), inset, 0.01, `${position} fill drawn in by ${String(inBy)}`);
            }
        });
    }
});

describe("a border wider than a solid's outline is deep still ends on its outline (#10438)", () => {
    // a cone's side view is a triangle whose inradius is under half its width: a border this wide inset point for
    // point turned the outline inside out, and the ring built out from it stuck out past the node
    for (const type of ["cone", "pentagonal_pyramid", "hexagonal_prism"] as const) {
        for (const is2D of [true, false]) {
            test(`a wide inside border on a ${type} in ${is2D ? "2D" : "3D"} ends on its outline`, () => {
                for (const width of [0.1, 0.25, 0.3]) {
                    const { plain, ring } = drawn(type, "inside", width, is2D);
                    const off = DIRECTIONS.map((a) => reach(ring, a) - reach(plain, a));
                    assert.isBelow(Math.max(...off), 0.01, `width ${String(width)}: ring past it by ${String(off)}`);
                    assert.isBelow(median(off.map(Math.abs)), 0.01, `width ${String(width)}: off by ${String(off)}`);
                }
            });
        }
    }
});
