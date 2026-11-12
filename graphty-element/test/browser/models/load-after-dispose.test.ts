/**
 * @file A graph disposed while a model loads: the load stops, and nothing Babylon started for it
 * throws later.
 *
 * Babylon's loader checks for a disposed scene only when the file's bytes arrive. A glTF parsed
 * before the dispose goes on to make its PBR materials in the disposed scene, and the first PBR
 * material of a scene makes the scene's BRDF lookup texture. That texture's RGBD decode imports
 * and compiles a shader, then runs a post-process; on a disposed engine the effect reports ready
 * with no program, and the decode threw "Cannot read properties of null (reading 'program')" as an
 * unhandled rejection, in whatever test or page code ran at that moment (issue #6683). The decode
 * is stopped by patches/@babylonjs__core@8.56.2.patch; test/setup.ts fails a test on an unhandled
 * rejection.
 */

import { Engine } from "@babylonjs/core/Engines/engine.js";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader.js";
import type { Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import { GetEnvironmentBRDFTexture } from "@babylonjs/core/Misc/brdfTextureTools.js";
import { Scene } from "@babylonjs/core/scene.js";
import type { GLTFFileLoader } from "@babylonjs/loaders/glTF/glTFFileLoader.js";
import { afterEach, assert, describe, it } from "vitest";

import { sphereGlb } from "../../fixtures/models/fixtures";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0).reverse()) {
        cleanup();
    }
});

/**
 * A WebGL engine and scene on a canvas in the page.
 * @returns The engine and the scene.
 */
function makeScene(): { engine: Engine; scene: Scene } {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const engine = new Engine(canvas, false);
    const scene = new Scene(engine);
    cleanups.push(() => {
        engine.dispose();
        canvas.remove();
    });
    return { engine, scene };
}

describe("a graph disposed while a model loads", () => {
    it("rejects the load once the glTF was parsed before the dispose", async () => {
        const { loadModelContainer } = await import("../../../src/models/chunk");
        const { engine, scene } = makeScene();

        // Dispose the scene and its engine the moment the glTF is parsed: after Babylon's own
        // disposed-scene check, before the loader makes any material.
        const activated = SceneLoader.OnPluginActivatedObservable.addOnce((plugin) => {
            (plugin as GLTFFileLoader).onParsedObservable.addOnce(() => {
                scene.dispose();
                engine.dispose();
            });
        });
        cleanups.push(() => SceneLoader.OnPluginActivatedObservable.remove(activated));

        const outcome = await loadModelContainer(scene, sphereGlb(8, 4), ".glb").then(
            () => "loaded",
            () => "rejected",
        );

        assert.isTrue(scene.isDisposed);
        assert.strictEqual(outcome, "rejected");
    });

    it("does not decode the BRDF texture on an engine disposed while its decode shader loads", async () => {
        const { engine, scene } = makeScene();
        // Babylon makes it as a Texture and types it as a BaseTexture.
        const brdf = GetEnvironmentBRDFTexture(scene) as Texture;
        // Babylon's own onLoad observer, added first, has started the decode and waits on the
        // shader's import; the engine goes before that import resolves.
        const loaded = new Promise<void>((resolve) => {
            brdf.onLoadObservable.addOnce(() => {
                engine.dispose();
                resolve();
            });
        });
        await loaded;
        // The same import, resolved after the decode's: by now the decode has run or stopped.
        await import("@babylonjs/core/Shaders/rgbdDecode.fragment.js");

        assert.isTrue(engine.isDisposed);
    });
});
