/**
 * @file A mesh drawn in many materials (a MultiMaterial over its sub-meshes, as USD GeomSubsets,
 * FBX and glTF 1.0 load) is sliced by material, and each slice keeps only the vertices it draws:
 * the template holds each vertex once, however many slices the mesh is cut into.
 */

import { AssetContainer } from "@babylonjs/core/assetContainer.js";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { MultiMaterial } from "@babylonjs/core/Materials/multiMaterial.js";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder.js";
import { SubMesh } from "@babylonjs/core/Meshes/subMesh.js";
import { Scene } from "@babylonjs/core/scene.js";
import { afterEach, assert, describe, it } from "vitest";

import { prepareTemplate } from "../../../src/models/prepareTemplate";

const engines: NullEngine[] = [];

afterEach(() => {
    for (const engine of engines.splice(0)) {
        engine.scenes.slice().forEach((scene) => {
            scene.dispose();
        });
        engine.dispose();
    }
});

describe("sliced mesh vertices", () => {
    it("keeps each vertex of a mesh sliced into 100 materials once, not once a slice", async () => {
        const engine = new NullEngine();
        engines.push(engine);
        const scene = new Scene(engine);
        const container = new AssetContainer(scene);
        const mesh = CreateGround("ground", { width: 1, height: 1, subdivisions: 40 }, scene);
        const multi = new MultiMaterial("multi", scene);
        const slices = 100;
        for (let i = 0; i < slices; i++) {
            const material = new PBRMaterial(`m${String(i)}`, scene);
            multi.subMaterials.push(material);
            container.materials.push(material);
        }
        mesh.material = multi;
        const indices = mesh.getTotalIndices();
        const per = Math.floor(indices / 3 / slices) * 3;
        mesh.subMeshes = [];
        for (let i = 0; i < slices; i++) {
            const start = i * per;
            new SubMesh(i, 0, mesh.getTotalVertices(), start, i === slices - 1 ? indices - start : per, mesh);
        }
        container.meshes.push(mesh);
        container.multiMaterials.push(multi);
        const source = mesh.getTotalVertices();

        const template = await prepareTemplate(
            scene,
            container,
            "slices",
            { up: "y", turn: 0, center: "bounds", fit: "contain", replace: false, animated: false },
            () => null,
        );
        const drawn = template.groups.reduce((sum, group) => sum + group.getTotalVertices(), 0);
        assert.equal(template.groups.length, slices, "one group a material");
        assert.equal(template.triangles, indices / 3, "every triangle drawn");
        // A vertex on the edge between two slices is in both, so each 32-triangle slice of the
        // ground's rows holds about two rows of its vertices: about twice the source's count, where
        // a slice holding every vertex drew 100 times it.
        assert.isAtMost(drawn, 3 * source, `${String(drawn)} vertices drawn of ${String(source)}`);
        template.dispose();
    });
});
