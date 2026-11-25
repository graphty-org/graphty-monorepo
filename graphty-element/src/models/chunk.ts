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
 *
 * It also carries two fixes to Babylon.js itself, so an npm consumer gets them with no patch of
 * their own: the hemispheric light's direction for clear coat and sheen (see
 * {@link fixHemisphericCoating}) and the BRDF lookup texture made while the scene is alive (see
 * {@link prepareScene}).
 */

import "@babylonjs/core/Shaders/rgbdDecode.fragment.js";
import "@babylonjs/core/ShadersWGSL/rgbdDecode.fragment.js";
import "@babylonjs/core/Shaders/postprocess.vertex.js";
import "@babylonjs/core/ShadersWGSL/postprocess.vertex.js";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader.js";
import "@babylonjs/core/Shaders/ShadersInclude/pbrDirectLightingSetupFunctions.js";
import "@babylonjs/core/ShadersWGSL/ShadersInclude/pbrDirectLightingSetupFunctions.js";

import { ShaderStore } from "@babylonjs/core/Engines/shaderStore.js";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture.js";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture.js";
import { GetEnvironmentBRDFTexture } from "@babylonjs/core/Misc/brdfTextureTools.js";
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
 * Make every PBRMaterial use the PBR shaders babylonjs-models bundles (both languages, imported
 * with its loaders), as src/meshes/bundledStandardShaders.ts does for StandardMaterial.
 */
export function pinPbrShaders(): void {
    pinShadersLoaded(PBRMaterial);
}

/** The PBR include that sets each light's direction, by name in Babylon's ShaderStore. */
const LIGHTING_SETUP = "pbrDirectLightingSetupFunctions";

/** The hemispheric light's guard on L, H and VdotH in that include, in both languages. */
const HEMISPHERIC_GUARD = /(computeHemisphericPreLightingInfo[^#]*)#ifdef SPECULARTERM\n/;

/**
 * Make a hemispheric light set L, H and VdotH for clear coat and sheen too. Babylon.js 9.37.0
 * sets them only under SPECULARTERM (some light has a specular color), yet clear coat and sheen
 * read them whatever the specular: under graphty-element's lights, whose specular is black, a
 * clear-coated part (the ToyCar's body, the StainedGlassLamp's glass) read garbage and drew pure
 * white. Rewrites the include in both shader languages before any model's material compiles; a
 * Babylon.js that fixed it no longer matches and is left alone.
 */
export function fixHemisphericCoating(): void {
    for (const store of [ShaderStore.IncludesShadersStore, ShaderStore.IncludesShadersStoreWGSL]) {
        store[LIGHTING_SETUP] = store[LIGHTING_SETUP].replace(
            HEMISPHERIC_GUARD,
            "$1#if defined(SPECULARTERM) || defined(CLEARCOAT) || defined(SHEEN)\n",
        );
    }
}

fixHemisphericCoating();

/**
 * Make the scene's BRDF lookup texture now, while the scene is alive, before a model's first PBR
 * material would make it.
 *
 * Babylon.js's glTF loader checks for a disposed scene only when the file's bytes arrive, so a
 * graph disposed after a file was parsed still gets its PBR materials, and the first PBR material
 * of a scene makes the scene's BRDF lookup texture. Made in a disposed scene, that texture is never
 * disposed, and its RGBD decode then ran on the disposed engine and threw "Cannot read properties
 * of null (reading 'program')" as an unhandled rejection (issue #6683). Made here, it belongs to
 * the live scene: disposing the scene disposes it, which stops its decode, and every later
 * material, in the disposed scene too, reuses it rather than making another.
 * @param scene - The scene a model is about to load into.
 */
export function prepareScene(scene: Scene): void {
    if (!scene.isDisposed) {
        GetEnvironmentBRDFTexture(scene);
    }
}

/** The bundled neutral environment, one per scene. */
const environments = new WeakMap<Scene, BaseTexture>();

/**
 * The small neutral environment bundled with this chunk: a dim uniform gray to light diffuse color,
 * and a soft gray gradient, bright above and dark below, to reflect (the scene's lights reflect
 * nothing, so a metal shows only this), prefiltered, for PBR materials to reflect when the scene has no `environmentTexture` of its
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

export { markModelNode } from "./NodeOutlineLayers";
export { prepareTemplate } from "./prepareTemplate";
