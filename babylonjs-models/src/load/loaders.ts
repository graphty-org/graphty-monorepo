/**
 * @file Babylon.js's loaders, registered for babylonjs-models, and the load of one model's files
 * into an asset container.
 *
 * What it registers, and only this:
 * - the glTF 2.0 loader (`.gltf`, `.glb`) with the extensions that change how a model looks, moves
 *   or is stored. The decoder extensions (Draco, meshopt, KTX2) are in src/decoders/, each its own
 *   module, imported only for a model that uses it; none fetches anything from a CDN. The
 *   extensions Babylon.js ships that are not registered, each for a reason
 *   (test/gltf-extensions.test.ts lists them, so a new one is a decision): Gaussian splatting
 *   (splats are refused); the transmission family (drawn without: src/files/gltfChecks.ts);
 *   `EXT_lights_area` (Babylon fetches its lookup table from assets.babylonjs.com and keeps it on
 *   the scene); `EXT_lights_image_based` (it replaces the scene's environment, which is the
 *   page's); `KHR_interactivity`, `KHR_node_hoverability` and `KHR_node_selectability` (a file's
 *   own behavior graph and pointer handling: what input does is the page's); `MSFT_audio_emitter`
 *   (sound the page did not ask for); `MSFT_lod` (it goes on loading finer levels after the load
 *   has settled). A glTF that requires one of them is refused; one that only uses it draws
 *   without it;
 * - the OBJ loader (with its MTL reader), with a fix that keeps an OBJ's vertex colors;
 * - the TGA and DDS texture loaders, which Babylon would otherwise import lazily;
 * - the FBX loader (`.fbx`, binary and ASCII) and the OpenUSD loader (`.usd`, `.usda`, `.usdc`,
 *   `.usdz`), each registered by name and imported the first time a model of its format loads. The USD loader
 *   runs OpenUSD in a worker whose files this package ships (src/decoders/usd.ts);
 *   ./loadModel.ts hands it the model's files itself. Every USD load shares one loader, one load
 *   at a time, so loads that follow one another start OpenUSD once ({@link usdTurn}).
 *
 * STL, PLY and `.babylon` are read by this package's
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
// Animations of any property a JSON pointer names, subsurface scattering, IES light profiles (a
// light's own file, a part of the model, or a buffer view) and Minecraft exports' materials.
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_animation_pointer.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_scatter.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/EXT_lights_ies.js";
import "@babylonjs/loaders/glTF/2.0/Extensions/MSFT_minecraftMesh.js";
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
import {
    LoadAssetContainerAsync,
    type PluginOptions,
    RegisterSceneLoaderPlugin,
} from "@babylonjs/core/Loading/sceneLoader.js";
import { SceneLoaderFlags } from "@babylonjs/core/Loading/sceneLoaderFlags.js";
import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture.js";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import { Tools } from "@babylonjs/core/Misc/tools.js";
import type { Scene } from "@babylonjs/core/scene.js";
import { FBXFileLoaderMetadata } from "@babylonjs/loaders/FBX/fbxFileLoader.metadata.js";
import { GLTFValidation } from "@babylonjs/loaders/glTF/glTFValidation.js";
import { SolidParser } from "@babylonjs/loaders/OBJ/solidParser.js";
import { USDFileLoaderMetadata } from "@babylonjs/loaders/USD/usdFileLoader.metadata.js";
import type { USDFileLoader } from "@babylonjs/loaders/USD/usdFileLoader.pure.js";

import { babylonTextureNames, embeddedPictureName, readBabylon } from "../files/readers/babylon.js";
import { type Geometry, ModelReadError } from "../files/readers/geometry.js";
import { readPly } from "../files/readers/ply.js";
import { readStl } from "../files/readers/stl.js";
import { buildContainer, type Part, type PartMaterial } from "../readers/container.js";

/** The file extensions Babylon's own loaders read. */
export type ModelExtension = ".glb" | ".gltf" | ".obj" | ".fbx" | ".usd" | ".usdz";

// The FBX and USD loaders, by name and extensions: each one's code is imported when a model of
// its format first loads, as each decoder is (Babylon's own loaders/dynamic.js registers them the
// same way), so a page that draws only glTF never downloads them. The USD loader's worker and
// WebAssembly are fetched from this package's own files (src/decoders/usd.ts).
RegisterSceneLoaderPlugin({
    ...FBXFileLoaderMetadata,
    createPlugin: async (options) => {
        const { FBXFileLoader } = await import("@babylonjs/loaders/FBX/fbxFileLoader.pure.js");
        return new FBXFileLoader(options[FBXFileLoaderMetadata.name]);
    },
});
RegisterSceneLoaderPlugin({
    ...USDFileLoaderMetadata,
    createPlugin: async (options) => {
        const { USDFileLoader, _RegisterUSDLoaderDependencies } =
            await import("@babylonjs/loaders/USD/usdFileLoader.pure.js");
        _RegisterUSDLoaderDependencies();
        const given = (options[USDFileLoaderMetadata.name] ?? {}) as UsdLoadOptions &
            ConstructorParameters<typeof USDFileLoader>[0];
        usdShared ??= keepWorker(new USDFileLoader());
        const shared = usdShared;
        // This load's options, as Babylon's constructor completes them.
        const own = (new USDFileLoader(given) as unknown as UsdLoaderInternals)._options;
        type Loader = USDFileLoader;
        return Object.assign(Object.create(shared) as Loader, {
            loadAssetContainerAsync: (...args: Parameters<Loader["loadAssetContainerAsync"]>) =>
                usdTurn(shared, own, given.signal, args[0], () => shared.loadAssetContainerAsync(...args)),
            importMeshAsync: (...args: Parameters<Loader["importMeshAsync"]>) =>
                usdTurn(shared, own, given.signal, args[1], () => shared.importMeshAsync(...args)),
            loadAsync: (...args: Parameters<Loader["loadAsync"]>) =>
                usdTurn(shared, own, given.signal, args[0], () => shared.loadAsync(...args)),
        });
    },
});

/** The USD loader's options, and the signal that stops a load ({@link usdTurn}). */
interface UsdLoadOptions {
    readonly signal?: AbortSignal;
}

/** What babylonjs-models reaches inside Babylon's USD loader (9.37): its options and its worker. */
interface UsdLoaderInternals {
    _options: object;
    readonly _pending: ReadonlyMap<number, unknown>;
    _terminateWorker: () => void;
}

/** The USD loader every USD load shares. */
let usdShared: USDFileLoader | undefined;
/** Settles when the last USD load queued has finished. */
let usdQueue: Promise<unknown> = Promise.resolve();
/** USD loads waiting for their turn. */
let usdWaiting = 0;
/** Ends the shared loader's worker, whatever is waiting (set by {@link keepWorker}). */
let endWorker: (() => void) | undefined;
/** The scenes a USD model was loaded into that are not disposed yet: the worker is kept for them. */
const usdScenes = new Set<Scene>();

/**
 * Keep the worker for a scene until it is disposed; then end it, unless another scene still holds
 * it or a USD load is waiting or running.
 * @param scene - The scene a USD model loads into.
 */
function holdForScene(scene: Scene): void {
    if (usdScenes.has(scene)) {
        return;
    }
    usdScenes.add(scene);
    scene.onDisposeObservable.addOnce(() => {
        usdScenes.delete(scene);
        const pending = (usdShared as unknown as UsdLoaderInternals | undefined)?._pending.size ?? 0;
        if (usdScenes.size === 0 && usdWaiting === 0 && pending === 0) {
            endWorker?.();
        }
    });
}

/**
 * Keep a USD loader's worker for the next load. Babylon's loader ends its worker (OpenUSD, about
 * 10 MB of WebAssembly, downloaded and compiled again by the next worker) as soon as no load is in
 * it; here it is kept while another USD load waits or a scene a USD model was loaded into is not
 * disposed, and ended when neither holds, so a graph's models, loaded together or one after another,
 * start OpenUSD once, and a page whose scenes are gone holds none of its memory. A worker that
 * failed is ended as before.
 * @param loader - The shared loader.
 * @returns The loader.
 */
function keepWorker(loader: USDFileLoader): USDFileLoader {
    const internals = loader as unknown as UsdLoaderInternals;
    const terminate = internals._terminateWorker.bind(loader);
    endWorker = terminate;
    internals._terminateWorker = () => {
        if (internals._pending.size > 0 || (usdWaiting === 0 && usdScenes.size === 0)) {
            terminate();
        }
    };
    return loader;
}

/**
 * Run one USD load in its turn on the shared loader, with its own options. OpenUSD reads one stage
 * at a time in its worker, so a turn costs nothing. A load stopped by its signal while it waits
 * never starts; one stopped while it runs ends the worker, which is all that stops OpenUSD.
 * @param shared - The shared loader.
 * @param options - This load's options.
 * @param signal - Stops the load.
 * @param scene - The scene it loads into: the worker is kept until it is disposed.
 * @param load - The load.
 * @returns What the load returns.
 */
async function usdTurn<T>(
    shared: USDFileLoader,
    options: object,
    signal: AbortSignal | undefined,
    scene: Scene,
    load: () => Promise<T>,
): Promise<T> {
    signal?.throwIfAborted();
    const before = usdQueue;
    let done = (): void => undefined;
    usdQueue = Promise.all([
        before,
        new Promise<void>((resolve) => {
            done = resolve;
        }),
    ]);
    usdWaiting++;
    let waiting = true;
    let stop = (): void => undefined;
    try {
        await new Promise<void>((resolve, reject) => {
            stop = () => {
                reject(new Error("stopped"));
            };
            signal?.addEventListener("abort", stop, { once: true });
            void before.then(() => {
                resolve();
            });
        });
        signal?.removeEventListener("abort", stop);
        usdWaiting--;
        waiting = false;
        signal?.throwIfAborted();
        holdForScene(scene);
        // Read when the load starts, before its first await: the files, the root and the worker's URLs.
        (shared as unknown as UsdLoaderInternals)._options = options;
        // Ending the worker and the loader's requests rejects the load; the race also answers a
        // stop that comes before the loader has a worker to end.
        return await Promise.race([
            load(),
            new Promise<never>((_resolve, reject) => {
                stop = () => {
                    endWorker?.();
                    shared.dispose();
                    reject(new Error("stopped"));
                };
                signal?.addEventListener("abort", stop, { once: true });
            }),
        ]);
    } catch (error) {
        signal?.throwIfAborted();
        throw error;
    } finally {
        // Stopped while it waited: a worker kept for it is ended unless another load or a scene needs it.
        if (
            waiting &&
            --usdWaiting === 0 &&
            usdScenes.size === 0 &&
            (shared as unknown as UsdLoaderInternals)._pending.size === 0
        ) {
            endWorker?.();
        }
        signal?.removeEventListener("abort", stop);
        done();
    }
}

// The glTF validator is a script on cdn.babylonjs.com. Loads never ask for validation; should
// anything ask, the script it gets is a local one that fails.
GLTFValidation.Configuration = {
    url: "data:text/javascript,throw new Error('babylonjs-models does not bundle the glTF validator')",
};

/**
 * Babylon's OBJ parser (still in 9.37) never looks up vertex colors for faces written `v/vt/vn`
 * (`_setDataForCurrentFaceWithPattern3`): each face corner gets its color here. It also gives a
 * vertex the file wrote no color for a shared gray (`_grayColor`), so an object with no colors at
 * all would draw gray and state a color it never had; such an object keeps no colors. Delete when
 * Babylon fixes `SolidParser`. (The colors an object after an `o` or `g` line lost in
 * `_unwrapData`, also worked around here before, are kept by Babylon itself since 9.2.2.)
 */
interface ObjParser {
    _grayColor: unknown;
    _wrappedColorsForBabylon: unknown[];
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

    unwrapData.call(this);
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
        const { gltf, fbx, ...others } = options.pluginOptions ?? {};
        const container = await LoadAssetContainerAsync(fileName, scene, {
            rootUrl,
            pluginExtension: extension,
            // An FBX file's curves are drawn as lines: a file of NURBS curves has nothing else.
            pluginOptions: { ...others, gltf: { validate: false, ...gltf }, fbx: { curves: "lines", ...fbx } },
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
export type OwnFormat = "stl" | "ply" | "babylon";

/**
 * The parts and materials one of this package's own readers makes of a file.
 * @param files - The file set.
 * @param main - The main file's path.
 * @param format - Its format.
 * @param rootUrl - The guarded root the main file's folder is named under.
 * @param hidden - Embedded pictures to leave out, by their summary names.
 * @returns The parts and their materials.
 * @throws {ModelReadError} For a damaged file.
 */
function readOwn(
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
    format: OwnFormat,
    rootUrl: string,
    hidden: ReadonlySet<string>,
): { parts: Part[]; materials: PartMaterial[] } {
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
        default: {
            let json: unknown;
            try {
                json = JSON.parse(new TextDecoder().decode(bytes));
            } catch {
                throw new ModelReadError("json");
            }

            const babylon = readBabylon(json as Record<string, unknown>);
            const names = babylonTextureNames(json as Record<string, unknown>);
            return {
                parts: babylon.meshes,
                materials: babylon.materials.map((m) => {
                    if (m.texture === undefined) {
                        return m;
                    }
                    // An embedded picture is its own URL; one left out is dropped here, as nothing
                    // under the load's root names it to take off afterwards.
                    const embedded = embeddedPictureName(m.texture, names);
                    if (embedded !== undefined && hidden.has(embedded)) {
                        return { ...m, texture: undefined, withoutPicture: true };
                    }
                    return { ...m, texture: embedded === undefined ? rootUrl + m.texture : m.texture };
                }),
            };
        }
    }
}

/**
 * Load a model one of this package's own readers draws (STL, PLY, `.babylon`) into a
 * container that is not in the scene. Its pictures are named under `rootUrl`, which the caller's
 * request guard resolves to the set's own files.
 * @param scene - The scene.
 * @param files - The file set, by path.
 * @param main - The main file's path.
 * @param format - Its format.
 * @param rootUrl - The guarded root the main file's folder is named under.
 * @param hidden - Embedded pictures to leave out, by their summary names (`image<index>`); a
 *   picture in a file of its own is taken off once loaded (`markWithoutPictures`).
 * @returns The container.
 * @throws {ModelReadError} For a damaged file.
 */
export async function loadOwnModel(
    scene: Scene,
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
    format: OwnFormat,
    rootUrl: string,
    hidden: ReadonlySet<string> = new Set(),
): Promise<AssetContainer> {
    const end = startLoad();
    try {
        const read = readOwn(files, main, format, rootUrl, hidden);
        return await settle(scene, buildContainer(scene, read.parts, read.materials), false);
    } finally {
        end();
    }
}
