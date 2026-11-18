/**
 * @file An edge meets a closed convex node (box, cylinder, cone, polyhedra) from the shape's face planes rather than
 * a search of its triangles, and a flat shape from its outline, convex or not (issue #412): on every node shape, turned
 * and scaled, `convexRayHit` either declines (a shape that is neither) or lands where Babylon's ray search does.
 */

import { type AbstractMesh, NullEngine, Ray, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { NodeShapes } from "../src/config/NodeStyle";
import { convexRayHit } from "../src/meshes/convexHit";
import { NodeMesh } from "../src/meshes/NodeMesh";

/** Shapes the face planes must answer for: the ones that are closed convex solids. */
const CONVEX = [
    "box",
    "cylinder",
    "cone",
    "tetrahedron",
    "octahedron",
    "dodecahedron",
    "icosahedron",
    "triangular-prism",
    "hexagonal-prism",
    "square-pyramid",
];

/** Flat shapes that are not convex, met from their outline: every flat shape is answered, one way or the other. */
const FLAT_OUTLINES = ["star", "vee", "cross", "man", "woman", "ellipse", "diamond", "round-rectangle"];

/** Rays from around a node at the origin, aimed through it and past it, and two from inside. */
const FROM = [
    new Vector3(7, 0, 0),
    new Vector3(5, 3, 4),
    new Vector3(-2, 6, -1),
    new Vector3(0.3, -4, 5),
    new Vector3(0.05, 0.02, 0.01),
    new Vector3(-0.1, 0.1, 0),
];

describe("convexRayHit", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        scene.getEngine().dispose();
    });

    /**
     * A node mesh of a shape, turned and moved.
     * @param shape - The shape.
     * @returns The mesh.
     */
    function shaped(shape: string): AbstractMesh {
        const mesh = NodeMesh.createMeshWithoutCache(
            { styleId: shape, is2D: false, size: 1.5 },
            { shape: { type: shape } } as never,
            scene,
        );
        mesh.position.set(0.2, -0.1, 0.3);
        mesh.rotation.set(0.4, 1.1, -0.3);
        mesh.scaling.set(1, 1.3, 0.8);
        mesh.computeWorldMatrix(true);
        return mesh;
    }

    it.each(NodeShapes.options)("%s: declines or lands where the ray search does", (shape) => {
        const mesh = shaped(shape);
        let answered = 0;
        for (const from of FROM) {
            for (const to of [mesh.position, new Vector3(-3, 1, 2)]) {
                const ray = new Ray(from.clone(), to.subtract(from));
                const planes = convexRayHit(mesh, ray);
                if (planes === undefined) {
                    continue;
                }
                answered++;
                const searched = ray.intersectsMeshes([mesh])[0]?.pickedPoint ?? null;
                if (planes === null || searched === null) {
                    assert.strictEqual(planes, searched, `${shape} from ${from.toString()}`);
                } else {
                    assert.isBelow(Vector3.Distance(planes, searched), 1e-4, `${shape} from ${from.toString()}`);
                }
            }
        }
        if (CONVEX.includes(shape) || FLAT_OUTLINES.includes(shape)) {
            assert.strictEqual(answered, FROM.length * 2, `${shape} is answered from its planes`);
        }
    });

    it.each(FLAT_OUTLINES)("%s: across the view, meets its outline where the ray search does", (shape) => {
        const mesh = NodeMesh.createMeshWithoutCache(
            { styleId: shape, is2D: true, size: 1.5 },
            { shape: { type: shape } } as never,
            scene,
        );
        mesh.computeWorldMatrix(true);
        for (let step = 0; step < 24; step++) {
            const angle = (step / 24) * 2 * Math.PI + 0.1;
            const from = new Vector3(5 * Math.cos(angle), 5 * Math.sin(angle), 0);
            const ray = new Ray(from, from.scale(-1));
            const outline = convexRayHit(mesh, ray);
            const searched = ray.intersectsMeshes([mesh])[0]?.pickedPoint ?? null;
            if (!(outline instanceof Vector3) || searched === null) {
                assert.fail(`${shape} at ${String(step)}: ${String(outline)}, ${String(searched)}`);
            }
            assert.isBelow(Vector3.Distance(outline, searched), 1e-4, `${shape} at ${String(step)}`);
        }
    });
});
