/**
 * @file A model template that throws while being prepared frees what it made: the scene keeps no
 * mesh, material or texture of it (issue #6206).
 */

import { AssetContainer } from "@babylonjs/core/assetContainer.js";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { Scene } from "@babylonjs/core/scene.js";
import { afterEach, assert, describe, it } from "vitest";

import { prepareTemplate } from "../../src/models/prepareTemplate";

const engines: NullEngine[] = [];

afterEach(() => {
    for (const engine of engines.splice(0)) {
        engine.dispose();
    }
});

/**
 * A scene and a loaded model in a container: one box with a textured PBR material.
 * @returns The scene and the container.
 */
function loaded(): { scene: Scene; container: AssetContainer } {
    const engine = new NullEngine();
    engines.push(engine);
    const scene = new Scene(engine);
    const container = new AssetContainer(scene);
    const box = MeshBuilder.CreateBox("box", { size: 1 }, scene);
    const material = new PBRMaterial("skin", scene);
    const texture = RawTexture.CreateRGBATexture(new Uint8Array([255, 0, 0, 255]), 1, 1, scene);
    material.albedoTexture = texture;
    box.material = material;
    container.meshes.push(box);
    container.materials.push(material);
    container.textures.push(texture);
    container.removeAllFromScene();
    return { scene, container };
}

/**
 * What the scene holds.
 * @param scene - The scene.
 * @returns Its mesh, material and texture counts.
 */
function counts(scene: Scene): { meshes: number; materials: number; textures: number } {
    return { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length };
}

describe("prepareTemplate", () => {
    for (const replace of [false, true]) {
        it(`frees what it made when it throws (replace ${String(replace)})`, async () => {
            const { scene, container } = loaded();
            const before = counts(scene);
            const options = { up: "y", turn: 0, center: "bounds", fit: "contain", replace } as const;
            let thrown: unknown = null;
            try {
                await prepareTemplate(scene, container, "throws", options, () => {
                    throw new Error("no environment");
                });
            } catch (error) {
                thrown = error;
            }

            assert.instanceOf(thrown, Error);
            assert.deepEqual(counts(scene), before);
            assert.isTrue(container.meshes.every((mesh) => mesh.isDisposed()));
            assert.isTrue(container.textures.every((texture) => texture.getInternalTexture() === null));
        });
    }

    it("frees a model with no triangles", async () => {
        const { scene, container } = loaded();
        container.meshes[0].geometry?.setIndices([]);
        container.meshes[0].geometry?.setVerticesData("position", [], false);
        let thrown: unknown = null;
        try {
            await prepareTemplate(
                scene,
                container,
                "empty",
                { up: "y", turn: 0, center: "bounds", fit: "contain", replace: false },
                () => null,
            );
        } catch (error) {
            thrown = error;
        }

        assert.instanceOf(thrown, Error);
        assert.isTrue(container.meshes.every((mesh) => mesh.isDisposed()));
        assert.isTrue(container.textures.every((texture) => texture.getInternalTexture() === null));
    });
});
