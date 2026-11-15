/**
 * @file The model chunk: what graphty-element adds to babylonjs-models to draw a model, loaded only
 * when a graph first draws one.
 *
 * Nothing outside src/models/ imports this module statically. It is reached through one dynamic
 * `import()` (./loadModel.ts), beside babylonjs-models itself, so the main entry's size does not
 * change and a page that never draws a model never downloads it (design/rendering/node-models.md,
 * section 3.4).
 *
 * It holds the template builder (./prepareTemplate.ts), the options every model is loaded with,
 * the PBR shader pin and the small bundled neutral environment PBR materials reflect, which is
 * read from bytes inside the chunk and never `createDefaultEnvironment()`'s download from
 * assets.babylonjs.com.
 *
 * Babylon.js lazily imports the `.env` texture loader and the RGBD decode shader the environment
 * uploads through. A bundler turns each into a separate file fetched at draw time, and Safari has
 * failed such a fetch before (see src/meshes/bundledStandardShaders.ts). They are imported
 * statically here, so they arrive with this chunk and the lazy `import()` finds them loaded.
 */

import "@babylonjs/core/Shaders/rgbdDecode.fragment.js";
import "@babylonjs/core/ShadersWGSL/rgbdDecode.fragment.js";
import "@babylonjs/core/Shaders/postprocess.vertex.js";
import "@babylonjs/core/ShadersWGSL/postprocess.vertex.js";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader.js";

import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture.js";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture.js";
import type { Scene } from "@babylonjs/core/scene.js";
import { GLTFLoaderAnimationStartMode } from "@babylonjs/loaders/glTF/glTFFileLoader.js";
import type { LoadModelFilesOptions } from "babylonjs-models";

import { pinShadersLoaded } from "../meshes/pinShadersLoaded";
import { NEUTRAL_ENVIRONMENT_URL } from "./environment";

/**
 * How graphty-element loads every model: glTF animations do not start, bounds cover every mesh,
 * an OBJ's vertex colors are read, and the file's cameras and lights are dropped.
 */
export const LOAD_OPTIONS: LoadModelFilesOptions = Object.freeze({
    keepCamerasAndLights: false,
    pluginOptions: {
        gltf: { animationStartMode: GLTFLoaderAnimationStartMode.NONE, alwaysComputeBoundingBox: true },
        obj: { importVertexColors: true },
    },
});

/**
 * Make every PBRMaterial created in `scene` use the PBR shaders babylonjs-models bundles, as
 * src/meshes/bundledStandardShaders.ts does for StandardMaterial.
 * @param scene - The scene whose materials are pinned.
 */
export function pinPbrShaders(scene: Scene): void {
    pinShadersLoaded(PBRMaterial, scene);
}

/** The bundled neutral environment, one per scene. */
const environments = new WeakMap<Scene, BaseTexture>();

/**
 * The small neutral environment bundled with this chunk: a uniform dark gray in every direction,
 * prefiltered, for PBR materials to reflect when the scene has no `environmentTexture` of its
 * own. It is read from bytes inside the chunk, so it makes no request.
 * @param scene - The scene the texture belongs to.
 * @returns The scene's copy of the neutral environment, created on first use.
 */
export function neutralEnvironment(scene: Scene): BaseTexture {
    let texture = environments.get(scene);
    if (texture?.getScene() !== scene) {
        texture = CubeTexture.CreateFromPrefilteredData(NEUTRAL_ENVIRONMENT_URL, scene, ".env");
        texture.name = "graphty-neutral-environment";
        environments.set(scene, texture);
    }

    return texture;
}

export { prepareTemplate } from "./prepareTemplate";
