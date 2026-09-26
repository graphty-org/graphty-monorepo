import { MeshBuilder, NullEngine, RawTexture, Scene, StandardMaterial } from "@babylonjs/core";
import { assert, beforeEach, describe, it } from "vitest";

import { MeshCache } from "../../src/meshes/MeshCache";

describe("MeshCache", () => {
    let scene: Scene;
    let cache: MeshCache;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
        cache = new MeshCache();
    });

    /**
     * Take one instance of a named source mesh.
     * @param name - The cache key.
     * @returns The instance.
     */
    const take = (name: string): ReturnType<MeshCache["get"]> =>
        cache.get(name, () => MeshBuilder.CreateSphere(name, {}, scene));

    it("disposes a source mesh once nothing is drawn from it, and keeps one that is", () => {
        const gone = take("gone");
        const kept = take("kept");
        const source = gone.sourceMesh;

        gone.dispose();
        cache.prune();

        assert.strictEqual(cache.size(), 1);
        assert.isTrue(source.isDisposed(), "the unused source mesh is freed");
        assert.isFalse(kept.sourceMesh.isDisposed());
    });

    it("builds a pruned mesh again when it is asked for", () => {
        take("again").dispose();
        cache.prune();

        const rebuilt = take("again");

        assert.isFalse(rebuilt.sourceMesh.isDisposed());
        assert.strictEqual(cache.size(), 1);
    });

    it("disposes a pruned mesh's material but leaves its textures, which are shared", () => {
        const shared = RawTexture.CreateRGBATexture(new Uint8Array(4), 1, 1, scene);
        const instance = cache.get("textured", () => {
            const mesh = MeshBuilder.CreateSphere("textured", {}, scene);
            const material = new StandardMaterial("textured-material", scene);
            material.diffuseTexture = shared;
            mesh.material = material;

            return mesh;
        });

        instance.dispose();
        cache.prune();

        assert.notInclude(scene.materials.map((m) => m.name), "textured-material");
        assert.include(scene.textures, shared, "a texture other materials may hold survives");
    });
});
