/**
 * @file A solid's underlay and overlay lie their padding past the plain solid's outline on every side, under an
 * inside or centered border too. Such a border draws the solid's fill in by scaling it, which moves a slanted or
 * short side in by less than the inset, so a plate grown from the drawn-in outline by the padding plus the inset
 * reached too far there (a cone's slanted sides, a cylinder's long sides) and fell short elsewhere.
 */
import { type AbstractMesh, Camera, FreeCamera, Mesh, NullEngine, Scene, Vector3, VertexBuffer } from "@babylonjs/core";
import { afterEach, assert, beforeEach, test } from "vitest";

import type { NodeStyleConfig } from "../../src/config/NodeStyle";
import { MeshCache } from "../../src/meshes/MeshCache";
import { NodeMesh } from "../../src/meshes/NodeMesh";
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
 * A mesh's vertices in its local frame, turned by a rotation and dropped onto the plane across the view.
 * @param mesh - The mesh, or an instance of one.
 * @param turn - Rotates a local point into the view, or none for a view along z.
 * @returns The points.
 */
function flattened(mesh: AbstractMesh, turn?: (p: Vector3) => Vector3): Point2[] {
    const source = mesh instanceof Mesh ? mesh : (mesh as unknown as { sourceMesh: Mesh }).sourceMesh;
    const positions = source.getVerticesData(VertexBuffer.PositionKind) ?? [];
    const points: Point2[] = [];
    for (let i = 0; i < positions.length; i += 3) {
        const p = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
        const seen = turn === undefined ? p : turn(p);
        points.push([seen.x, seen.y]);
    }

    return points;
}

/**
 * How far past `inner` the plate reaches, measured square to each side of the plate's hull, as the smallest and
 * largest over its sides.
 * @param plate - The plate's points.
 * @param inner - The plain solid's points.
 * @returns The least and the most reach.
 */
function reachRange(plate: Point2[], inner: Point2[]): { least: number; most: number } {
    const hull = convexHull(plate);
    const support = (points: Point2[], nx: number, ny: number): number =>
        Math.max(...points.map(([x, y]) => x * nx + y * ny));
    let least = Infinity;
    let most = -Infinity;
    for (let i = 0; i < hull.length; i++) {
        const [ax, ay] = hull[i];
        const [bx, by] = hull[(i + 1) % hull.length];
        const length = Math.hypot(bx - ax, by - ay);
        if (length < 1e-3) {
            continue;
        }

        const [nx, ny] = [(by - ay) / length, -(bx - ax) / length];
        const reach = Math.abs(support(hull, nx, ny) - support(inner, nx, ny));
        least = Math.min(least, reach);
        most = Math.max(most, reach);
    }

    return { least, most };
}

const PAD = 0.3;

const cases: { name: string; shape: NonNullable<NodeStyleConfig["shape"]>; is2D: boolean }[] = [
    { name: "a cone in 2D", shape: { type: "cone", size: 1 }, is2D: true },
    { name: "a wide cone in 2D", shape: { type: "cone", size: 1, width: 1.6 }, is2D: true },
    { name: "a capsule in 2D", shape: { type: "capsule", size: 1 }, is2D: true },
    { name: "a cylinder in 2D", shape: { type: "cylinder", size: 1 }, is2D: true },
    { name: "a wide box in 3D seen from above", shape: { type: "box", size: 1, width: 1.6 }, is2D: false },
];

for (const { name, shape, is2D } of cases) {
    for (const position of ["inside", "center"] as const) {
        for (const kind of ["underlay", "overlay"] as const) {
            test(`${name} with its border ${position}: its ${kind} lies its padding past the plain solid`, () => {
                const border = { width: 0.3, position };
                const style = `${name}-${position}-${kind}`;
                // the plain solid: its border outside, which never draws the fill in
                const plain = NodeMesh.create(cache, { styleId: `${style}-plain`, is2D, size: 1 }, { shape }, scene);
                const options = { styleId: style, is2D, size: 1 };
                const fill = NodeMesh.create(cache, options, { shape, border }, scene);
                const halo = NodeMesh.createHalo(
                    cache,
                    options,
                    { shape, border },
                    { color: "#ff0000", opacity: 1, padding: PAD },
                    kind,
                    fill,
                    scene,
                );
                assert.exists(halo);

                let turn: ((p: Vector3) => Vector3) | undefined;
                if (!is2D) {
                    // looking down on the node from above and in front, square on (no perspective)
                    const camera = new FreeCamera("camera", new Vector3(0, 8, -6), scene);
                    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
                    camera.setTarget(Vector3.Zero());
                    scene.activeCamera = camera;
                    halo.parent = fill;
                    scene.render();
                    const view = camera.getViewMatrix().clone();
                    view.setTranslationFromFloats(0, 0, 0);
                    turn = (p) => Vector3.TransformCoordinates(p, view);
                }

                const per = NodeMesh.extentPerSize(shape);
                // the plate is billboarded in 3D, so its own x and y are across the view
                const { least, most } = reachRange(flattened(halo), flattened(plain, turn));
                assert.approximately(least / per, PAD, 0.01);
                assert.approximately(most / per, PAD, 0.01);
            });
        }
    }
}
