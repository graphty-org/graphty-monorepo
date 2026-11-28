/**
 * @file A node's underlay and overlay are its outline grown by their padding along every side, beside a corner too
 * sharp to mitre in full as well. The corner's mitre was pulled in along its bisector to three times the padding, which
 * drew both sides meeting there in toward the node: a vee's underlay came within 0.49 of its outline where 0.6 was
 * promised (style matrix tw-276, and tw-305 for its overlay).
 */
import { InstancedMesh, type Mesh, NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, test } from "vitest";

import { MeshCache } from "../../src/meshes/MeshCache";
import { NodeMesh } from "../../src/meshes/NodeMesh";
import type { Point2 } from "../../src/meshes/shapeOutlines";

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
 * @param mesh - A flat mesh or plate, drawn from its middle.
 * @returns The distinct points of its face, other than its middle, in turn round the middle.
 */
function outlineOf(mesh: Mesh): Point2[] {
    const positions = mesh.getVerticesData("position") ?? [];
    const points: Point2[] = [];
    for (let i = 0; i < positions.length; i += 3) {
        const [x, y] = [positions[i], positions[i + 1]];
        if (Math.hypot(x, y) > 1e-6 && !points.some(([px, py]) => Math.hypot(px - x, py - y) < 1e-6)) {
            points.push([x, y]);
        }
    }
    return points.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
}

/**
 * @param p - A point.
 * @param polygon - A closed polygon.
 * @returns How far the point is from the polygon's nearest side.
 */
function distanceTo(p: Point2, polygon: readonly Point2[]): number {
    return Math.min(
        ...polygon.map(([ax, ay], i) => {
            const [bx, by] = polygon[(i + 1) % polygon.length];
            const [ex, ey] = [bx - ax, by - ay];
            const t = Math.max(0, Math.min(1, ((p[0] - ax) * ex + (p[1] - ay) * ey) / (ex * ex + ey * ey)));
            return Math.hypot(p[0] - ax - t * ex, p[1] - ay - t * ey);
        }),
    );
}

for (const kind of ["underlay", "overlay"] as const) {
    test(`a vee's ${kind} keeps its padding from the vee all along the sides that meet at its sharp corners`, () => {
        const shape = { type: "vee" as const, size: 1 };
        const options = { styleId: `vee-${kind}`, is2D: true, size: 1 };
        const fill = NodeMesh.create(cache, options, { shape }, scene);
        const plate = NodeMesh.createHalo(
            cache,
            options,
            { shape },
            { color: "#ff0000", opacity: 1, padding: 0.4 },
            kind,
            fill,
            scene,
        );
        assert.exists(plate);
        const pad = 0.4 * NodeMesh.extentPerSize(shape);
        const vee = outlineOf(fill instanceof InstancedMesh ? fill.sourceMesh : (fill as Mesh));
        const grown = outlineOf(plate.sourceMesh);
        // every point along the plate's edge lies at least the padding from the vee
        const nearest = Math.min(
            ...grown.flatMap((a, i) => {
                const b = grown[(i + 1) % grown.length];
                return Array.from({ length: 50 }, (_, k): number =>
                    distanceTo([a[0] + ((b[0] - a[0]) * k) / 50, a[1] + ((b[1] - a[1]) * k) / 50], vee),
                );
            }),
        );
        assert.approximately(nearest, pad, 1e-3, `the ${kind}'s nearest approach to the vee`);
    });
}
