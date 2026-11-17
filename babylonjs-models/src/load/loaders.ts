/**
 * @file Babylon.js's loaders, registered for babylonjs-models, and the load of one model's files
 * into an asset container.
 *
 * What it registers, and only this:
 * - the glTF 2.0 loader (`.gltf`, `.glb`) with the extensions that change how a model looks or is
 *   stored. The decoder extensions (Draco, meshopt, KTX2) are in src/decoders/, each its own
 *   module, imported only for a model that uses it; none fetches anything from a CDN;
 * - the OBJ loader (with its MTL reader), with a fix that keeps an OBJ's vertex colors;
 * - the TGA and DDS texture loaders, which Babylon would otherwise import lazily.
 *
 * STL, PLY, Gaussian splats (`.splat`, `.spz`, `.sog`) and `.babylon` are read by this package's
 * own readers (src/files/readers/), which build the container themselves ({@link loadOwnModel}).
 *
 * Babylon.js lazily imports several modules the first time they are needed: the PBR material and
 * its loading adapter, the PBR shaders and the glTF animation code. A bundler turns each into a
 * separate file fetched at draw time. They are imported statically here, so they arrive with this
 * module and the lazy `import()` finds them loaded.
 *
 * Every Babylon.js default that would reach its CDN is off while a model loads: the loading
 * screen (its logo is on cdn.babylonjs.com) is not shown, the glTF validator (a script on
 * cdn.babylonjs.com) is pointed at a local script that fails, and any script request to a
 * babylonjs.com host is refused. A model's own file and texture requests are held to its files by
 * the request guard (./requestGuard.ts); other requests on the page, a babylonjs.com texture
 * included, pass untouched.
 */

// The loader plugins, each from its own module. Importing a plugin's module registers it.
import "@babylonjs/loaders/glTF/2.0/glTFLoader.js";
import "@babylonjs/loaders/OBJ/objFileLoader.js";
// The glTF extensions a model may use for its look or its storage. Importing one registers it.
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_texture_transform.js";
// A material's glTF `extras` on its metadata: how a material says it lost its color picture.
import "@babylonjs/loaders/glTF/2.0/Extensions/ExtrasAsMetadata.js";
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
// Read as thin instances of the mesh they copy.
import "@babylonjs/loaders/glTF/2.0/Extensions/EXT_mesh_gpu_instancing.js";
// What the glTF loader would otherwise import lazily.
import "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import "@babylonjs/loaders/glTF/2.0/pbrMaterialLoadingAdapter.js";
import "@babylonjs/core/Animations/animationGroup.js";
import "@babylonjs/loaders/glTF/2.0/glTFLoaderAnimation.js";
// The shaders PBRMaterial would otherwise import lazily, in both languages.
import "@babylonjs/core/Shaders/pbr.vertex.js";
import "@babylonjs/core/Shaders/pbr.fragment.js";
import "@babylonjs/core/ShadersWGSL/pbr.vertex.js";
import "@babylonjs/core/ShadersWGSL/pbr.fragment.js";
// The picture loaders an OBJ's MTL may name, which the registry would otherwise import lazily.
import "@babylonjs/core/Materials/Textures/Loaders/tgaTextureLoader.js";
import "@babylonjs/core/Materials/Textures/Loaders/ddsTextureLoader.js";

import type { AssetContainer } from "@babylonjs/core/assetContainer.js";
import { LoadAssetContainerAsync, type PluginOptions } from "@babylonjs/core/Loading/sceneLoader.js";
import { SceneLoaderFlags } from "@babylonjs/core/Loading/sceneLoaderFlags.js";
import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture.js";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import { Tools } from "@babylonjs/core/Misc/tools.js";
import type { Scene } from "@babylonjs/core/scene.js";
import { GLTFValidation } from "@babylonjs/loaders/glTF/glTFValidation.js";
import { SolidParser } from "@babylonjs/loaders/OBJ/solidParser.js";

import { readBabylon } from "../files/readers/babylon.js";
import { type Geometry, ModelReadError } from "../files/readers/geometry.js";
import { readPly } from "../files/readers/ply.js";
import { readStl } from "../files/readers/stl.js";
import { buildContainer, type Part, type PartMaterial } from "../readers/container.js";
import { readSplat } from "../readers/splat.js";

/** The file extensions Babylon's own loaders read. */
export type ModelExtension = ".glb" | ".gltf" | ".obj";

// The glTF validator is a script on cdn.babylonjs.com. Loads never ask for validation; should
// anything ask, the script it gets is a local one that fails.
GLTFValidation.Configuration = {
    url: "data:text/javascript,throw new Error('babylonjs-models does not bundle the glTF validator')",
};

/**
 * Babylon 8.56's OBJ parser drops vertex colors in two places: faces written `v/vt/vn` never look
 * their colors up (`_setDataForCurrentFaceWithPattern3`), and an object after an `o` or `g` line
 * loses them in `_unwrapData`, which copies them only when the array it fills is already
 * non-empty. Each face corner gets its color here, and the colors are put where `_unwrapData`
 * should have put them. It also gives a vertex the file wrote no color for a shared gray
 * (`_grayColor`), so an object with no colors at all would draw gray and state a color it never
 * had; such an object keeps no colors. Delete when Babylon fixes `SolidParser`.
 */
interface ObjParser {
    _grayColor: unknown;
    _wrappedColorsForBabylon: { r: number; g: number; b: number; a: number }[];
    _unwrappedColorsForBabylon: number[];
    _unwrapData: (this: ObjParser) => void;
    _setData: (this: ObjParser, data: { indicePositionFromObj: number; positionColorsFromOBJ?: unknown }) => void;
    _getColor: (this: ObjParser, index: number) => unknown;
}
const parser = SolidParser.prototype as unknown as ObjParser;
const { _unwrapData: unwrapData, _setData: setData } = parser;
parser._unwrapData = function (this: ObjParser): void {
    if (this._wrappedColorsForBabylon.every((color) => color === this._grayColor)) {
        this._wrappedColorsForBabylon.length = 0;
    }

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

/** The page's own `ShowLoadingScreen`, while loads hide the screen. */
let loadingScreenShown = SceneLoaderFlags.ShowLoadingScreen;

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
 * the validator, which this package does not bundle) throws instead of being requested. Outside a
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
            throw new Error(`babylonjs-models: a model load asked for ${url}; nothing is fetched from Babylon's CDN`);
        }

        return previous(url);
    };
}

Tools.ScriptPreprocessUrl = refuseBabylonScripts(Tools.ScriptPreprocessUrl);

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

/** How Babylon's loaders read a model: see `LoadModelOptions` in ./loadModel.ts. */
export interface LoaderOptions {
    /** Options for Babylon's loader plugins, by plugin name (`gltf`, `obj`), over `{ gltf: { validate: false } }`. */
    readonly pluginOptions?: PluginOptions;
    /** Keep the cameras and lights the file holds. Default true. */
    readonly keepCamerasAndLights?: boolean;
}

/**
 * Count a load as running, and hide Babylon's loading screen (its logo is on cdn.babylonjs.com)
 * while any load runs, giving the page its own setting back after the last one.
 * @returns A function that counts the load as finished.
 */
function startLoad(): () => void {
    if (activeLoads === 0) {
        loadingScreenShown = SceneLoaderFlags.ShowLoadingScreen;
        SceneLoaderFlags.ShowLoadingScreen = false;
    }

    activeLoads++;
    return () => {
        activeLoads--;
        if (activeLoads === 0) {
            SceneLoaderFlags.ShowLoadingScreen = loadingScreenShown;
        }
    };
}

/**
 * Load a model's main file, named under a root URL the caller's request guard resolves
 * (./requestGuard.ts), without adding anything to the scene. Its references resolve against the
 * same root, so every file it reads is one the guard maps to the caller's own `blob:` URLs. The
 * promise resolves once every texture has loaded or failed.
 * @param scene - The scene the container belongs to.
 * @param rootUrl - The folder the main file and its references are named under.
 * @param fileName - The main file's name inside that folder.
 * @param extension - Which loader reads it.
 * @param options - Plugin options, and whether to keep the file's cameras and lights.
 * @returns The loaded container.
 */
export async function loadBabylonModel(
    scene: Scene,
    rootUrl: string,
    fileName: string,
    extension: ModelExtension,
    options: LoaderOptions = {},
): Promise<AssetContainer> {
    const end = startLoad();
    try {
        const { gltf, ...others } = options.pluginOptions ?? {};
        const container = await LoadAssetContainerAsync(fileName, scene, {
            rootUrl,
            pluginExtension: extension,
            pluginOptions: { ...others, gltf: { validate: false, ...gltf } },
        });
        return await settle(scene, container, options.keepCamerasAndLights ?? true);
    } finally {
        end();
    }
}

/**
 * Finish a load: wait for its textures, refuse a scene disposed meanwhile, and drop cameras and
 * lights unless they are kept.
 * @param scene - The scene.
 * @param container - The loaded container.
 * @param keepCamerasAndLights - Whether the file's cameras and lights stay.
 * @returns The container.
 */
async function settle(scene: Scene, container: AssetContainer, keepCamerasAndLights: boolean): Promise<AssetContainer> {
    await texturesSettled(container.textures);
    // Babylon stops a load for a disposed scene only when the file's bytes arrive; a scene
    // disposed after that gets no container made in it.
    if (scene.isDisposed) {
        container.dispose();
        throw new Error("babylonjs-models: the scene was disposed while the model loaded");
    }

    if (!keepCamerasAndLights) {
        for (const item of [...container.cameras, ...container.lights]) {
            item.dispose();
        }
        container.cameras.length = 0;
        container.lights.length = 0;
    }

    return container;
}

/** The formats babylonjs-models' own readers draw. */
export type OwnFormat = "stl" | "ply" | "splat" | "spz" | "sog" | "babylon";

/**
 * The parts and materials one of this package's own readers makes of a file.
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
    // A part the file gives no look has no material, as an OBJ without an .mtl.
    const one = (geometry: Geometry, material?: PartMaterial): { parts: Part[]; materials: PartMaterial[] } => ({
        parts: [{ name: main, geometry }],
        materials: material === undefined ? [] : [material],
    });
    switch (format) {
        case "stl":
            return one(readStl(bytes));
        case "ply": {
            const read = readPly(bytes);
            const texture = read.textureFile === undefined ? undefined : rootUrl + read.textureFile;
            return one(read.geometry, texture === undefined ? undefined : { texture });
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
 * Load a model one of this package's own readers draws (STL, PLY, splats, `.babylon`) into a
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
    const end = startLoad();
    try {
        const read = await readOwn(scene, files, main, format, rootUrl);
        return await settle(scene, buildContainer(scene, read.parts, read.materials), false);
    } finally {
        end();
    }
}
