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
 *   stored. The decoder extensions (Draco, meshopt, KTX2) are in src/models/decoders/, each its
 *   own chunk, loaded only for a model that uses it; none fetches anything from a CDN;
 * - the OBJ loader (with its MTL reader), with vertex colors read;
 * - the TGA, DDS and KTX texture loaders, which Babylon would otherwise import lazily.
 *
 * STL, PLY, Gaussian splats (`.splat`, `.spz`, `.sog`) and `.babylon` are read by
 * graphty-element's own readers (src/models/readers/), which build the container themselves
 * ({@link loadOwnModel}).
 *
 * Babylon.js lazily imports several modules the first time they are needed: the PBR material and
 * its loading adapter, the PBR shaders, the RGBD decode shader, the `.env` texture loader and the
 * glTF animation code. A bundler turns each into a separate file fetched at draw time, and Safari
 * has failed such a fetch before (see src/meshes/bundledStandardShaders.ts). They are imported
 * statically here, so they arrive with this chunk and the lazy `import()` finds them loaded.
 *
 * Every Babylon.js default that would reach its CDN is off: the loading screen (its logo is on
 * cdn.babylonjs.com) is never shown, the glTF validator (a script on cdn.babylonjs.com) is pointed
 * at a local script that fails, and while a model loads any script request to a babylonjs.com host
 * is refused. A model's own file and texture requests are held to its files by the request guard
 * (src/models/requestGuard.ts); other requests on the page, a babylonjs.com texture included, pass
 * untouched (issue #7437). PBR materials reflect a small bundled neutral environment
 * ({@link neutralEnvironment}), never `createDefaultEnvironment()`, which fetches from
 * assets.babylonjs.com.
 */

// The loader plugins, each from its own module. Importing a plugin's module registers it.
import "@babylonjs/loaders/glTF/2.0/glTFLoader.js";
import "@babylonjs/loaders/OBJ/objFileLoader.js";
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
import "@babylonjs/loaders/glTF/2.0/Extensions/EXT_texture_avif.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_anisotropy.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_iridescence.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_variants.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_diffuse_roughness.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_coat.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_fuzz.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_lights_punctual.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_node_visibility.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_xmp_json_ld.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/MSFT_sRGBFactors.js";
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
// The picture loaders an OBJ's MTL may name, which the registry would otherwise import lazily.
import "@babylonjs/core/Materials/Textures/Loaders/tgaTextureLoader.js";
import "@babylonjs/core/Materials/Textures/Loaders/ddsTextureLoader.js";

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
import { SolidParser } from "@babylonjs/loaders/OBJ/solidParser.js";

import { pinShadersLoaded } from "../meshes/pinShadersLoaded";
import { NEUTRAL_ENVIRONMENT_URL } from "./environment";
import { readBabylon } from "./readers/babylon";
import { buildContainer, type Part, type PartMaterial } from "./readers/container";
import { type Geometry, ModelReadError } from "./readers/geometry";
import { readPly } from "./readers/ply";
import { readSplat } from "./readers/splat";
import { readStl } from "./readers/stl";

/** The file extensions Babylon's own loaders read in this chunk. */
export type ModelExtension = ".glb" | ".gltf" | ".obj";

// The default loading screen draws Babylon's logo from cdn.babylonjs.com.
SceneLoaderFlags.ShowLoadingScreen = false;
// The glTF validator is a script on cdn.babylonjs.com. Loads never ask for validation; should
// anything ask, the script it gets is a local one that fails.
GLTFValidation.Configuration = {
    url: "data:text/javascript,throw new Error('graphty-element does not bundle the glTF validator')",
};

/**
 * Babylon 8.56's OBJ parser drops vertex colors in two places: faces written `v/vt/vn` never look
 * their colors up (`_setDataForCurrentFaceWithPattern3`), and an object after an `o` or `g` line
 * loses them in `_unwrapData`, which copies them only when the array it fills is already
 * non-empty. Each face corner gets its color here, and the colors are put where `_unwrapData`
 * should have put them. Delete when Babylon fixes `SolidParser`.
 */
interface ObjParser {
    _wrappedColorsForBabylon: { r: number; g: number; b: number; a: number }[];
    _unwrappedColorsForBabylon: number[];
    _unwrapData: (this: ObjParser) => void;
    _setData: (this: ObjParser, data: { indicePositionFromObj: number; positionColorsFromOBJ?: unknown }) => void;
    _getColor: (this: ObjParser, index: number) => unknown;
}
const parser = SolidParser.prototype as unknown as ObjParser;
const { _unwrapData: unwrapData, _setData: setData } = parser;
parser._unwrapData = function (this: ObjParser): void {
    const colors = this._wrappedColorsForBabylon.flatMap((c) => [c.r, c.g, c.b, c.a]);
    unwrapData.call(this);
    if (colors.length > 0 && this._unwrappedColorsForBabylon.length === 0) {
        this._unwrappedColorsForBabylon.push(...colors);
    }
};
parser._setData = function (this: ObjParser, data): void {
    data.positionColorsFromOBJ ??= this._getColor(data.indicePositionFromObj);
    setData.call(this, data);
};

/** Loads running now. Babylon's CDN scripts are refused while there is at least one. */
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
 * Wrap Babylon's script URL hook so that, while a model loads, a babylonjs.com script (a decoder or
 * the validator, which this chunk does not bundle) throws instead of being requested. Outside a
 * load the previous hook runs unchanged.
 *
 * `Tools.PreprocessUrl`, the hook for files and images, is not wrapped: it is page-wide, so a
 * refusal there also refused a page's own babylonjs.com textures requested during a load (issue
 * #7437). A model's own requests are held to its files by the request guard instead.
 * @param previous - The hook installed before this one.
 * @returns The wrapped hook.
 */
function refuseBabylonScripts(previous: (url: string) => string): (url: string) => string {
    return (url: string): string => {
        if (activeLoads > 0 && isBabylonHost(url)) {
            throw new Error(`graphty-element: a model load asked for ${url}; nothing is fetched from Babylon's CDN`);
        }

        return previous(url);
    };
}

Tools.ScriptPreprocessUrl = refuseBabylonScripts(Tools.ScriptPreprocessUrl);

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
 * files must already be URLs the caller made: no request guard holds them, so a file a reader
 * supplied goes through src/models/loadModel.ts instead. Otherwise as {@link loadModelFiles}.
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
 * `blob:` URLs. The promise resolves once every texture has loaded or failed, and the file's
 * cameras and lights are removed from the container. glTF animations do not start.
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
                obj: { importVertexColors: true },
            },
        });
        return await settle(scene, container);
    } finally {
        activeLoads--;
    }
}

/**
 * Finish a load: wait for its textures, refuse a scene disposed meanwhile, drop cameras and lights.
 * @param scene - The scene.
 * @param container - The loaded container.
 * @returns The container.
 */
async function settle(scene: Scene, container: AssetContainer): Promise<AssetContainer> {
    await texturesSettled(container.textures);
    // Babylon stops a load for a disposed scene only when the file's bytes arrive; a graph
    // disposed after that gets no template made in its dead scene (issue #6683).
    if (scene.isDisposed) {
        container.dispose();
        throw new Error("graphty-element: the scene was disposed while the model loaded");
    }

    for (const item of [...container.cameras, ...container.lights]) {
        item.dispose();
    }
    container.cameras.length = 0;
    container.lights.length = 0;
    return container;
}

/** The formats graphty-element's own readers draw. */
export type OwnFormat = "stl" | "ply" | "splat" | "spz" | "sog" | "babylon";

/**
 * The parts and materials one of the element's own readers makes of a file.
 * @param scene - The scene.
 * @param files - The file set.
 * @param main - The main file's path.
 * @param format - Its format.
 * @param rootUrl - The guarded root the main file's folder is named under.
 * @returns The parts and their materials.
 * @throws {ModelReadError} For a damaged file.
 */
async function readOwn(
    scene: Scene,
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
    format: OwnFormat,
    rootUrl: string,
): Promise<{ parts: Part[]; materials: PartMaterial[] }> {
    const bytes = files.get(main) as Uint8Array;
    const one = (geometry: Geometry, material: PartMaterial = {}): { parts: Part[]; materials: PartMaterial[] } => ({
        parts: [{ name: main, geometry }],
        materials: [material],
    });
    switch (format) {
        case "stl":
            return one(readStl(bytes));
        case "ply": {
            const read = readPly(bytes);
            const texture = read.textureFile === undefined ? undefined : rootUrl + read.textureFile;
            return one(read.geometry, texture === undefined ? {} : { texture });
        }
        case "babylon": {
            let json: unknown;
            try {
                json = JSON.parse(new TextDecoder().decode(bytes));
            } catch {
                throw new ModelReadError("json");
            }

            const babylon = readBabylon(json as Record<string, unknown>);
            return {
                parts: babylon.meshes,
                materials: babylon.materials.map((m) =>
                    m.texture === undefined ? m : { ...m, texture: rootUrl + m.texture },
                ),
            };
        }
        default: {
            return one((await readSplat(scene, files, main, format)).geometry);
        }
    }
}

/**
 * Load a model one of graphty-element's own readers draws (STL, PLY, splats, `.babylon`) into a
 * container that is not in the scene. Its pictures are named under `rootUrl`, which the caller's
 * request guard resolves to the set's own files.
 * @param scene - The scene.
 * @param files - The file set, by path.
 * @param main - The main file's path.
 * @param format - Its format.
 * @param rootUrl - The guarded root the main file's folder is named under.
 * @returns The container.
 * @throws {ModelReadError} For a damaged file.
 */
export async function loadOwnModel(
    scene: Scene,
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
    format: OwnFormat,
    rootUrl: string,
): Promise<AssetContainer> {
    activeLoads++;
    try {
        const read = await readOwn(scene, files, main, format, rootUrl);
        return await settle(scene, buildContainer(scene, read.parts, read.materials));
    } finally {
        activeLoads--;
    }
}

export { readGlb } from "../session/assets/gltfChecks";
export { prepareTemplate } from "./prepareTemplate";
export { ModelReadError } from "./readers/geometry";
export { isGltf1, readGlb1, upgradeGltf1 } from "./readers/gltf1";
