/**
 * The cubes this package's own readers draw (STL, PLY) are wound so Babylon.js draws their
 * outsides: the normal Babylon derives from each triangle's winding, the side back-face culling
 * keeps, points away from the cube's center, as on Babylon's own box (issue #8654).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { VertexBuffer } from "@babylonjs/core/Meshes/buffer.js";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import { Scene } from "@babylonjs/core/scene.js";
import { afterEach, assert, describe, it } from "vitest";

import { loadModel } from "../src/index.js";

const VARIANTS = join(dirname(fileURLToPath(import.meta.url)), "fixtures/variants");

let scene: Scene | undefined;

afterEach(() => {
    scene?.getEngine().dispose();
    scene = undefined;
});

/**
 * How many of a mesh's triangles face away from its center, by the winding Babylon culls with.
 * @param mesh - A closed mesh around its center.
 * @returns The triangles facing outward, and how many there are.
 */
function outwardFaces(mesh: Mesh): { outward: number; total: number } {
    const positions = Array.from(mesh.getVerticesData(VertexBuffer.PositionKind) ?? []);
    const indices = Array.from(mesh.getIndices() ?? []);
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    const center = Vector3.Zero();
    for (let i = 0; i < positions.length; i += 3) {
        center.addInPlace(Vector3.FromArray(positions, i));
    }
    center.scaleInPlace(3 / positions.length);

    let outward = 0;
    for (let t = 0; t < indices.length; t += 3) {
        // The cube's faces are flat, so each corner's computed normal is its face's.
        const corner = indices[t];
        const out = Vector3.FromArray(positions, corner * 3).subtract(center);
        outward += Vector3.Dot(Vector3.FromArray(normals, corner * 3), out) > 0 ? 1 : 0;
    }

    return { outward, total: indices.length / 3 };
}

describe("face winding", () => {
    it("Babylon's own box faces outward by this measure", () => {
        scene = new Scene(new NullEngine());
        assert.deepStrictEqual(outwardFaces(CreateBox("box", {}, scene)), { outward: 12, total: 12 });
    });

    it.each(["ply-ascii", "ply-le", "ply-be", "ply-quads", "stl-ascii", "stl-binary"])(
        "the %s cube faces outward",
        async (id) => {
            scene = new Scene(new NullEngine());
            const name = id.startsWith("ply") ? "cube.ply" : "cube.stl";
            const bytes = new Uint8Array(readFileSync(join(VARIANTS, id, name)));
            const { container } = await loadModel(scene, new File([bytes], name));
            const meshes = (container.meshes as Mesh[]).filter((mesh) => (mesh.getIndices()?.length ?? 0) > 0);
            assert.lengthOf(meshes, 1);
            assert.isAbove(meshes[0].computeWorldMatrix(true).determinant(), 0);
            assert.deepStrictEqual(outwardFaces(meshes[0]), { outward: 12, total: 12 });
        },
    );
});
