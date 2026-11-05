/**
 * @file The model chunk: everything graphty-element needs to turn a model file's bytes into a
 * Babylon.js asset container, loaded only when a graph first draws a model.
 *
 * Nothing outside src/models/ imports this module statically. It is reached through one dynamic
 * `import()`, so the main entry's size does not change and a page that never draws a model never
 * downloads it (design/rendering/node-models.md, section 3.4).
 *
 * What it registers, and only this:
 * - the glTF 2.0 loader (`.gltf`, `.glb`) with the extensions that change how a model looks or is
 *   stored, but no decoder extension: Draco, meshopt and KTX2 (`KHR_draco_mesh_compression`,
 *   `EXT_meshopt_compression`, `KHR_texture_basisu`) are not bundled, so a file that requires
 *   one is refused by the loader instead of fetching a decoder;
 * - the OBJ loader (with its MTL reader) and the STL loader.
 *
 * PLY is not among them: @babylonjs/loaders 8.56.2 reads `.ply` only as a Gaussian splat (its
 * SPLAT loader), not as a mesh, so a PLY mesh needs a reader of its own.
 *
 * Babylon.js lazily imports several modules the first time they are needed: the PBR material and
 * its loading adapter, the PBR shaders, the RGBD decode shader, the `.env` texture loader and the
 * glTF animation code. A bundler turns each into a separate file fetched at draw time, and Safari
 * has failed such a fetch before (see src/meshes/bundledStandardShaders.ts). They are imported
 * statically here, so they arrive with this chunk and the lazy `import()` finds them loaded.
 *
 * Every Babylon.js default that would reach its CDN is off: the loading screen (its logo is on
 * cdn.babylonjs.com) is never shown, the glTF validator (a script on cdn.babylonjs.com) is pointed
 * at a local script that fails, and while a model loads any script or file request to a
 * babylonjs.com host is refused. PBR materials reflect a small bundled neutral environment
 * ({@link neutralEnvironment}), never `createDefaultEnvironment()`, which fetches from
 * assets.babylonjs.com.
 */

// The loader plugins, each from its own module. Importing a plugin's module registers it.
import "@babylonjs/loaders/glTF/2.0/glTFLoader.js";
import "@babylonjs/loaders/OBJ/objFileLoader.js";
// The STL loader registers itself through the named import below, which also sets its axes.
// The glTF extensions a model may use for its look or its storage. Importing one registers it.
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_texture_transform.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_mesh_quantization.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_unlit.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_pbrSpecularGlossiness.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_emissive_strength.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_clearcoat.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_ior.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_specular.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_sheen.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/EXT_texture_webp.js";
// What the glTF loader would otherwise import lazily (and PBRMaterial, imported by name below).
import "@babylonjs/loaders/glTF/2.0/pbrMaterialLoadingAdapter.js";
import "@babylonjs/core/Animations/animationGroup.js";
import "@babylonjs/loaders/glTF/2.0/glTFLoaderAnimation.js";
// The shaders PBRMaterial and the .env upload (an RGBD decode post-process) would otherwise
// import lazily, in both languages.
import "@babylonjs/core/Shaders/pbr.vertex.js";
import "@babylonjs/core/Shaders/pbr.fragment.js";
import "@babylonjs/core/ShadersWGSL/pbr.vertex.js";
import "@babylonjs/core/ShadersWGSL/pbr.fragment.js";
import "@babylonjs/core/Shaders/rgbdDecode.fragment.js";
import "@babylonjs/core/ShadersWGSL/rgbdDecode.fragment.js";
import "@babylonjs/core/Shaders/postprocess.vertex.js";
import "@babylonjs/core/ShadersWGSL/postprocess.vertex.js";
// The .env texture loader, which the texture loader registry would otherwise import lazily.
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader.js";

import type { AssetContainer } from "@babylonjs/core/assetContainer.js";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader.js";
import { SceneLoaderFlags } from "@babylonjs/core/Loading/sceneLoaderFlags.js";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture.js";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture.js";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import { Tools } from "@babylonjs/core/Misc/tools.js";
import type { Scene } from "@babylonjs/core/scene.js";
import { GLTFLoaderAnimationStartMode } from "@babylonjs/loaders/glTF/glTFFileLoader.js";
import { GLTFValidation } from "@babylonjs/loaders/glTF/glTFValidation.js";
import { STLFileLoader } from "@babylonjs/loaders/STL/stlFileLoader.js";

import { pinShadersLoaded } from "../meshes/pinShadersLoaded";
import { NEUTRAL_ENVIRONMENT_URL } from "./environment";

/** The file extensions this chunk loads, each naming the loader plugin that reads it. */
export type ModelExtension = ".glb" | ".gltf" | ".obj" | ".stl";

// The default loading screen draws Babylon's logo from cdn.babylonjs.com.
SceneLoaderFlags.ShowLoadingScreen = false;
// An STL's own axes, unswapped: `node.modelSourceUp` says which one is up (STL is taken as Z up).
STLFileLoader.DO_NOT_ALTER_FILE_COORDINATES = true;
// The glTF validator is a script on cdn.babylonjs.com. Loads never ask for validation; should
// anything ask, the script it gets is a local one that fails.
GLTFValidation.Configuration = {
    url: "data:text/javascript,throw new Error('graphty-element does not bundle the glTF validator')",
};

/** Loads running now. Babylon's CDN is refused while there is at least one. */
let activeLoads = 0;

/**
 * Whether a URL is on one of Babylon.js's own hosts (cdn.babylonjs.com, assets.babylonjs.com, ...).
 * @param url - The URL Babylon is about to request.
 * @returns True for an http(s) URL whose host is babylonjs.com or a subdomain of it.
 */
function isBabylonHost(url: string): boolean {
    try {
        const { protocol, hostname } = new URL(url);
        return (protocol === "https:" || protocol === "http:") && /(^|\.)babylonjs\.com$/.test(hostname);
    } catch {
        return false;
    }
}

/**
 * Wrap one of Babylon's URL hooks so that, while a model loads, a babylonjs.com URL throws instead
 * of being requested. Outside a load the previous hook runs unchanged, so a page's own use of
 * Babylon is untouched.
 * @param previous - The hook installed before this one.
 * @returns The wrapped hook.
 */
function refuseBabylonHosts(previous: (url: string) => string): (url: string) => string {
    return (url: string): string => {
        if (activeLoads > 0 && isBabylonHost(url)) {
            throw new Error(`graphty-element: a model load asked for ${url}; nothing is fetched from Babylon's CDN`);
        }

        return previous(url);
    };
}

Tools.ScriptPreprocessUrl = refuseBabylonHosts(Tools.ScriptPreprocessUrl);
Tools.PreprocessUrl = refuseBabylonHosts(Tools.PreprocessUrl);

/**
 * Make every PBRMaterial created in `scene` use the PBR shaders bundled above, as
 * src/meshes/bundledStandardShaders.ts does for StandardMaterial.
 * @param scene - The scene whose materials are pinned.
 */
function useBundledPbrShaders(scene: Scene): void {
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

/**
 * Wait until every texture of a load has loaded or failed. (Babylon's `BaseTexture.WhenAllReady`
 * waits only for loads, so one missing image would hold it for ever.)
 * @param textures - The container's textures.
 * @returns A promise that settles when no texture is still loading.
 */
async function texturesSettled(textures: BaseTexture[]): Promise<void> {
    const pending = new Set(
        textures.filter((texture) => !texture.isReady() && !texture.loadingError && texture instanceof Texture),
    );
    if (pending.size === 0) {
        return;
    }

    await new Promise<void>((resolve) => {
        const settle = (texture: BaseTexture): void => {
            if (pending.delete(texture) && pending.size === 0) {
                Texture.OnTextureLoadErrorObservable.remove(failed);
                resolve();
            }
        };
        const failed = Texture.OnTextureLoadErrorObservable.add(settle);
        for (const texture of pending) {
            (texture as Texture).onLoadObservable.addOnce(settle);
        }
    });
}

/**
 * Load one model file into an asset container, without adding anything to the scene.
 *
 * The bytes are handed to Babylon as an in-memory file, so the load itself makes no request and
 * relative references resolve against an empty root rather than the page. References to other
 * files (an OBJ's `mtllib`, an MTL's `map_Kd`) must already be URLs the caller made, such as
 * `blob:` URLs. The promise resolves once every texture has loaded or failed, and the file's
 * cameras and lights are removed from the container. glTF animations do not start.
 * @param scene - The scene the container belongs to.
 * @param bytes - The model file's bytes.
 * @param extension - Which loader reads the bytes.
 * @returns The loaded container.
 */
export async function loadModelContainer(
    scene: Scene,
    bytes: Uint8Array,
    extension: ModelExtension,
): Promise<AssetContainer> {
    const file = new File([bytes as Uint8Array<ArrayBuffer>], `model${extension}`);
    return await loadContainer(scene, file, "", extension);
}

/**
 * Load a model's main file, named under a root URL the caller's request guard resolves
 * (src/models/requestGuard.ts), without adding anything to the scene. Its references resolve
 * against the same root, so every file it reads is one the guard maps to the caller's own
 * `blob:` URLs. Otherwise as {@link loadModelContainer}.
 * @param scene - The scene the container belongs to.
 * @param rootUrl - The folder the main file and its references are named under.
 * @param fileName - The main file's name inside that folder.
 * @param extension - Which loader reads it.
 * @returns The loaded container.
 */
export async function loadModelFiles(
    scene: Scene,
    rootUrl: string,
    fileName: string,
    extension: ModelExtension,
): Promise<AssetContainer> {
    return await loadContainer(scene, fileName, rootUrl, extension);
}

/**
 * The load both entries share.
 * @param scene - The scene.
 * @param source - A File, or a file name under `rootUrl`.
 * @param rootUrl - The root, or "" for a File.
 * @param extension - Which loader reads it.
 * @returns The container.
 */
async function loadContainer(
    scene: Scene,
    source: File | string,
    rootUrl: string,
    extension: ModelExtension,
): Promise<AssetContainer> {
    useBundledPbrShaders(scene);
    activeLoads++;
    try {
        const container = await LoadAssetContainerAsync(source, scene, {
            rootUrl,
            pluginExtension: extension,
            pluginOptions: {
                gltf: {
                    validate: false,
                    animationStartMode: GLTFLoaderAnimationStartMode.NONE,
                    alwaysComputeBoundingBox: true,
                },
            },
        });
        await texturesSettled(container.textures);
        for (const item of [...container.cameras, ...container.lights]) {
            item.dispose();
        }
        container.cameras.length = 0;
        container.lights.length = 0;
        return container;
    } finally {
        activeLoads--;
    }
}

export { prepareTemplate } from "./prepareTemplate";
