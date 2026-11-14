/**
 * @file Load one accepted model's files into a Babylon.js asset container, under the request
 * guard (design/rendering/node-models.md, sections 3.3 and 3.4).
 *
 * Every file of the set becomes a `blob:` URL for the length of the load and is revoked after it.
 * The main file is named under a root of the load's own (requestGuard.ts), so its references resolve to names the guard
 * maps to those `blob:` URLs, and anything else Babylon asks for throws. The model chunk, which
 * carries the loaders and their shaders, is imported here on first use and never before.
 */

import type { AssetContainer } from "@babylonjs/core/assetContainer.js";
import type { Scene } from "@babylonjs/core/scene.js";

import type { BuiltInModelFormat } from "../catalog/detectModel";
import type { CodedFact } from "../session/shared";
import type { ModelExtension, OwnFormat } from "./chunk";
import { guardRequests, REFUSED } from "./requestGuard";

/** The model chunk, as its one dynamic import resolves. */
export type ModelChunk = typeof import("./chunk");

let chunk: Promise<ModelChunk> | undefined;

/**
 * The model chunk, imported once.
 * @returns The chunk's module.
 */
export function loadChunk(): Promise<ModelChunk> {
    chunk ??= import("./chunk");
    return chunk;
}

/** Why a model could not be drawn, as the coded fact a reader is told. */
export class ModelLoadFailure extends Error {
    /**
     * Carry a coded fact.
     * @param fact - What went wrong.
     */
    constructor(readonly fact: CodedFact) {
        super(fact.code);
    }
}

/** Which reader draws each built-in format: one of Babylon's loaders, or the element's own. */
const READERS: Readonly<Record<BuiltInModelFormat, ModelExtension | OwnFormat>> = {
    glb: ".glb",
    gltf: ".gltf",
    obj: ".obj",
    stl: "stl",
    ply: "ply",
    splat: "splat",
    spz: "spz",
    sog: "sog",
    babylon: "babylon",
};

/**
 * Whether every built-in format has a reader, so intake never accepts what cannot be drawn.
 * @param format - A format.
 * @returns True when it has one.
 */
export function hasReader(format: string): format is BuiltInModelFormat {
    return Object.hasOwn(READERS, format);
}

/** A glTF's decoder extensions, and the module that registers each. */
const DECODER_EXTENSIONS: readonly (readonly [string, "draco" | "meshopt" | "ktx2"])[] = [
    ["KHR_draco_mesh_compression", "draco"],
    ["EXT_meshopt_compression", "meshopt"],
    ["KHR_meshopt_compression", "meshopt"],
    ["KHR_texture_basisu", "ktx2"],
];

/**
 * A URL as a problem may show it: without its query or fragment, at most 256 characters.
 * @param url - The URL.
 * @returns What to show.
 */
function shown(url: string): string {
    // An index search, not a `[?#].*$` regex: that one backtracks polynomially on many `?`s.
    const cut = url.search(/[?#]/);
    return (cut === -1 ? url : url.slice(0, cut)).slice(0, 256);
}

/** A glTF ready for Babylon's glTF 2.0 loader. */
interface GltfPrepared {
    readonly files: ReadonlyMap<string, Uint8Array>;
    readonly extension: ModelExtension;
    readonly used: readonly string[];
    readonly required: readonly string[];
}

/**
 * Read a glTF's JSON, upgrading glTF 1.0 to 2.0: the upgraded JSON replaces the main file, which
 * is then read as a `.gltf`, and a GLB version 1's body is served beside it.
 * @param module - The model chunk.
 * @param files - The file set.
 * @param main - The main file.
 * @param format - `glb` or `gltf`.
 * @returns The set to load, the loader, and the extensions the file uses and requires.
 */
function prepareGltf(
    module: ModelChunk,
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
    format: "glb" | "gltf",
): GltfPrepared {
    const bytes = files.get(main) as Uint8Array;
    const glbVersion = format === "glb" ? new DataView(bytes.buffer, bytes.byteOffset, 8).getUint32(4, true) : 0;
    let json: Record<string, unknown>;
    let body: Uint8Array | undefined;
    try {
        if (glbVersion === 1) {
            const glb1 = module.readGlb1(bytes);
            json = JSON.parse(glb1.text) as Record<string, unknown>;
            ({ body } = glb1);
        } else {
            const text = format === "glb" ? module.readGlb(bytes).text : new TextDecoder().decode(bytes);
            json = JSON.parse(text) as Record<string, unknown>;
        }
    } catch {
        throw new ModelLoadFailure({ code: "E_MODEL_PARSE", params: { format } });
    }

    const strings = (list: unknown): string[] =>
        Array.isArray(list) ? list.filter((e): e is string => typeof e === "string") : [];
    const used = strings(json.extensionsUsed);
    const required = strings(json.extensionsRequired);
    if (!module.isGltf1(json)) {
        return { files, extension: READERS[format] as ModelExtension, used, required };
    }

    const slash = main.lastIndexOf("/");
    const bodyName = `${main.slice(slash + 1)}.body.bin`;
    const upgraded = new Map(files);
    upgraded.set(main, new TextEncoder().encode(JSON.stringify(module.upgradeGltf1(json, bodyName))));
    if (body !== undefined) {
        upgraded.set(main.slice(0, slash + 1) + bodyName, body);
    }

    return { files: upgraded, extension: ".gltf", used: [], required: [] };
}

/** The Draco module, when a load uses it. */
type DracoModule = typeof import("./decoders/draco");

/**
 * Load the decoder modules a glTF's extensions need.
 * @param used - The extensions it uses.
 * @param required - The extensions it requires. Without the KTX2 peer, a glTF that only uses
 *     `KHR_texture_basisu` draws its fallback images instead.
 * @returns The Draco module when the glTF uses Draco, so the load can be counted.
 */
async function loadDecoders(used: readonly string[], required: readonly string[]): Promise<DracoModule | undefined> {
    const needed = new Set(DECODER_EXTENSIONS.filter(([name]) => used.includes(name)).map(([, kind]) => kind));
    let draco: DracoModule | undefined;
    try {
        if (needed.has("draco")) {
            draco = await import("./decoders/draco");
        }

        if (needed.has("meshopt")) {
            await import("./decoders/meshopt");
        }
    } catch {
        throw new ModelLoadFailure({ code: "E_MODEL_DECODER_UNAVAILABLE", params: { reason: "load" } });
    }

    if (needed.has("ktx2")) {
        let ktx2: typeof import("./decoders/ktx2");
        try {
            ktx2 = await import("./decoders/ktx2");
        } catch {
            throw new ModelLoadFailure({
                code: "E_MODEL_DECODER_UNAVAILABLE",
                params: { extension: "KHR_texture_basisu", reason: "load" },
            });
        }

        await ktx2.loadKtx2().catch(() => {
            if (!required.includes("KHR_texture_basisu")) {
                return;
            }

            throw new ModelLoadFailure({
                code: "E_MODEL_DECODER_UNAVAILABLE",
                params: { extension: "KHR_texture_basisu", package: ktx2.KTX2_PACKAGE, reason: "missing" },
            });
        });
    }

    return draco;
}

/**
 * The coded fact a failed load is reported as.
 * @param error - What the load threw.
 * @param module - The model chunk.
 * @param format - The model's format.
 * @returns The fact.
 */
function failureOf(error: unknown, module: ModelChunk, format: string): CodedFact {
    if (error instanceof ModelLoadFailure) {
        return error.fact;
    }

    if (error instanceof module.ModelReadError) {
        return { code: "E_MODEL_STRUCTURE", params: { rule: error.rule } };
    }

    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
    const text = error instanceof Error ? `${error.message} ${cause}` : String(error);
    const at = text.indexOf(REFUSED);
    if (at >= 0) {
        const url = text.slice(at + REFUSED.length).split(/\s/)[0] ?? "";
        return { code: "E_MODEL_EXTERNAL_URL", params: { url: shown(url) } };
    }

    if (text.includes("nothing is fetched from Babylon's CDN")) {
        return { code: "E_MODEL_DECODER_UNAVAILABLE", params: { reason: "load" } };
    }

    const decoder = DECODER_EXTENSIONS.find(([name]) => text.includes(name));
    if (decoder !== undefined) {
        return { code: "E_MODEL_DECODER_UNAVAILABLE", params: { extension: decoder[0], reason: "decode" } };
    }

    return { code: "E_MODEL_PARSE", params: { format } };
}

/**
 * Load a model's files into a container that is not in the scene yet.
 * @param scene - The scene.
 * @param files - The file set, by path relative to the main file's folder.
 * @param main - The main file's path.
 * @param format - Its detected format.
 * @param skipped - Parts drawn without: a picture is a 1 x 1 white PNG, and an OBJ's MTL lines naming it are dropped.
 * @returns The container.
 * @throws {ModelLoadFailure} With `E_MODEL_FORMAT_UNSUPPORTED`, `E_MODEL_EXTERNAL_URL`, `E_MODEL_STRUCTURE`,
 *     `E_MODEL_DECODER_UNAVAILABLE` or `E_MODEL_PARSE`.
 */
export async function loadModel(
    scene: Scene,
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
    format: string,
    skipped: readonly string[] = [],
): Promise<AssetContainer> {
    if (!hasReader(format)) {
        throw new ModelLoadFailure({ code: "E_MODEL_FORMAT_UNSUPPORTED", params: { format, fileName: main } });
    }

    let module: ModelChunk;
    try {
        module = await loadChunk();
    } catch {
        throw new ModelLoadFailure({ code: "E_MODEL_PARSE", params: { format } });
    }

    if (skipped.length > 0) {
        files = (await import("../session/assets/textFormats")).withSkips(files, skipped, format === "obj");
    }

    let reader = READERS[format];
    let draco: DracoModule | undefined;
    if (format === "glb" || format === "gltf") {
        const prepared = prepareGltf(module, files, main, format);
        ({ files } = prepared);
        reader = prepared.extension;
        draco = await loadDecoders(prepared.used, prepared.required);
    }

    const urls = new Map<string, string>();
    for (const [path, bytes] of files) {
        urls.set(path, URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>])));
    }

    const { root, release } = guardRequests(urls);
    let decoderFailed = false;
    draco?.dracoLoadStarted();
    try {
        const slash = main.lastIndexOf("/");
        const folder = root + main.slice(0, slash + 1);
        return reader.startsWith(".")
            ? await module.loadModelFiles(scene, folder, main.slice(slash + 1), reader as ModelExtension)
            : await module.loadOwnModel(scene, files, main, reader as OwnFormat, folder);
    } catch (error) {
        const fact = failureOf(error, module, format);
        // Only a decoder that failed to load is dropped: a damaged file ("decode") or a KTX2
        // failure leaves the Draco decoder working.
        decoderFailed =
            fact.code === "E_MODEL_DECODER_UNAVAILABLE" &&
            fact.params.reason === "load" &&
            fact.params.extension === undefined;
        throw new ModelLoadFailure(fact);
    } finally {
        draco?.dracoLoadEnded(decoderFailed);
        release();
        for (const url of urls.values()) {
            URL.revokeObjectURL(url);
        }
    }
}
