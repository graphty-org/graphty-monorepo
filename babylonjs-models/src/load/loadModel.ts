/**
 * @file Load a model's files into a Babylon.js asset container, under the request guard: the
 * simple path ({@link loadModel}: a URL, files or bytes in, a container out) and the step it ends
 * with ({@link loadModelFiles}: a checked file set in).
 *
 * Every file of the set becomes a `blob:` URL for the length of the load and is revoked after it.
 * The main file is named under a root of the load's own (./requestGuard.ts), so its references
 * resolve to names the guard maps to those `blob:` URLs, and anything else Babylon asks for
 * throws. A decoder (Draco, meshopt, KTX2) is imported only for a glTF that uses it.
 */

import type { AssetContainer } from "@babylonjs/core/assetContainer.js";
import type { Scene } from "@babylonjs/core/scene.js";

import { allowed } from "../decoders/config.js";
import type { BuiltInModelFormat, ModelFormat } from "../files/detect.js";
import { IGNORED_EXTENSIONS, readGlb } from "../files/gltfChecks.js";
import { checkModelFiles, fetchModelSet, readModelFiles } from "../files/intake.js";
import { DEFAULT_MODEL_LIMITS } from "../files/limits.js";
import { ModelReadError } from "../files/readers/geometry.js";
import { isGltf1, readGlb1, upgradeGltf1 } from "../files/readers/gltf1.js";
import { ModelError } from "../files/references.js";
import { withSkips } from "../files/textFormats.js";
import type {
    ModelFact,
    ModelFileOptions,
    ModelLimits,
    ModelProgressListener,
    ModelSource,
    ModelSummary,
} from "../files/types.js";
import { loadBabylonModel, type LoaderOptions, loadOwnModel, type ModelExtension, type OwnFormat } from "./loaders.js";
import { guardRequests, REFUSED } from "./requestGuard.js";

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
 * Whether a format has a reader here.
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
 * @param files - The file set.
 * @param main - The main file.
 * @param format - `glb` or `gltf`.
 * @returns The set to load, the loader, and the extensions the file uses and requires.
 */
function prepareGltf(files: ReadonlyMap<string, Uint8Array>, main: string, format: "glb" | "gltf"): GltfPrepared {
    const bytes = files.get(main) as Uint8Array;
    const glbVersion = format === "glb" ? new DataView(bytes.buffer, bytes.byteOffset, 8).getUint32(4, true) : 0;
    let json: Record<string, unknown>;
    let body: Uint8Array | undefined;
    try {
        if (glbVersion === 1) {
            const glb1 = readGlb1(bytes);
            json = JSON.parse(glb1.text) as Record<string, unknown>;
            ({ body } = glb1);
        } else {
            const glb = format === "glb" ? readGlb(bytes) : undefined;
            json = JSON.parse(glb?.text ?? new TextDecoder().decode(bytes)) as Record<string, unknown>;
            body = glb?.bin;
        }
    } catch {
        throw new ModelError("E_MODEL_PARSE", { format });
    }

    const strings = (list: unknown): string[] =>
        Array.isArray(list) ? list.filter((e): e is string => typeof e === "string") : [];
    const used = strings(json.extensionsUsed);
    const required = strings(json.extensionsRequired);
    if (!isGltf1(json)) {
        // An extension drawn without (the transmission family) is taken out of the file's lists, so
        // the loader draws those parts opaque rather than refusing the file or building the
        // scene-wide render target transmission needs.
        const stripped = [...used, ...required].some((name) => IGNORED_EXTENSIONS.has(name));
        if (stripped) {
            json.extensionsRequired = required.filter((name) => !IGNORED_EXTENSIONS.has(name));
            json.extensionsUsed = used.filter((name) => !IGNORED_EXTENSIONS.has(name));
        }

        const plain = withoutClimbs(json, files, main, body, stripped);
        return {
            files: plain.files,
            extension: plain.extension ?? (READERS[format] as ModelExtension),
            used,
            required,
        };
    }

    const slash = main.lastIndexOf("/");
    const bodyName = `${main.slice(slash + 1)}.body.bin`;
    const upgraded = new Map(files);
    upgraded.set(main, new TextEncoder().encode(JSON.stringify(upgradeGltf1(json, bodyName))));
    if (body !== undefined) {
        upgraded.set(main.slice(0, slash + 1) + bodyName, body);
    }

    return { files: upgraded, extension: ".gltf", used: [], required: [] };
}

/**
 * A glTF 2.0 whose `uri`s climb above its folder (`../textures/wood.png`), which Babylon's glTF
 * loader refuses to resolve, with each `..` percent-encoded: the loader then asks the request
 * guard for it, which decodes it to the key the intake held the file under (design 3.3). A GLB
 * is served as a `.gltf` beside its binary chunk, the way an upgraded glTF 1.0 is.
 * @param json - The glTF's JSON.
 * @param files - The file set.
 * @param main - The main file.
 * @param body - A GLB's binary chunk.
 * @param changedJson - Whether the JSON was changed already, so it is written out even with no climb.
 * @returns The set to load, and the loader when it changed.
 */
function withoutClimbs(
    json: Record<string, unknown>,
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
    body: Uint8Array | undefined,
    changedJson: boolean,
): { files: ReadonlyMap<string, Uint8Array>; extension?: ModelExtension } {
    const entries = ["buffers", "images"].flatMap((key) => {
        const list = json[key];
        return Array.isArray(list)
            ? list.filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
            : [];
    });
    const climbing = entries.filter((e) => typeof e.uri === "string" && !/^data:/i.test(e.uri) && e.uri.includes(".."));
    if (climbing.length === 0 && !changedJson) {
        return { files };
    }

    for (const entry of climbing) {
        entry.uri = String(entry.uri).replaceAll("..", "%2E%2E");
    }

    const slash = main.lastIndexOf("/");
    const changed = new Map(files);
    if (body !== undefined) {
        const bodyName = `${main.slice(slash + 1)}.body.bin`;
        const [first] = Array.isArray(json.buffers) ? (json.buffers as Record<string, unknown>[]) : [];
        if (typeof first === "object" && first.uri === undefined) {
            first.uri = encodeURIComponent(bodyName);
        }

        changed.set(main.slice(0, slash + 1) + bodyName, body);
    }

    changed.set(main, new TextEncoder().encode(JSON.stringify(json)));
    return { files: changed, ...(body === undefined ? {} : { extension: ".gltf" }) };
}

/** The Draco module, when a load uses it. */
type DracoModule = typeof import("../decoders/draco.js");

/** A decoder that cannot be used: turned off by `configureDecoders`, left out of a build, or failed to load. */
type DecoderMissing = "missing" | "load";

/** Each decoder module, imported on first use. */
const DECODERS = {
    draco: () => import("../decoders/draco.js"),
    meshopt: () => import("../decoders/meshopt.js"),
    ktx2: () => import("../decoders/ktx2.js"),
} as const;

/**
 * Import one decoder module, unless it is turned off.
 * @param kind - The decoder.
 * @returns The module, or why there is none.
 */
async function importDecoder(kind: keyof typeof DECODERS): Promise<{ readonly available: boolean } | DecoderMissing> {
    if (!allowed(kind)) {
        return "missing";
    }

    try {
        const found = await DECODERS[kind]();
        return found.available ? found : "missing";
    } catch {
        return "load";
    }
}

/**
 * Import a decoder a glTF cannot be drawn without.
 * @param kind - The decoder.
 * @param extension - The glTF extension it decodes, named when it is turned off or left out.
 * @returns The module.
 * @throws {ModelError} `E_MODEL_DECODER_UNAVAILABLE` when it is off, left out or failed to load.
 */
async function requireDecoder(
    kind: keyof typeof DECODERS,
    extension: string,
): Promise<{ readonly available: boolean }> {
    const found = await importDecoder(kind);
    if (typeof found === "string") {
        throw new ModelError("E_MODEL_DECODER_UNAVAILABLE", {
            ...(found === "missing" ? { extension } : {}),
            reason: found,
        });
    }

    return found;
}

/**
 * Load the decoder modules a glTF's extensions need.
 * @param used - The extensions it uses.
 * @param required - The extensions it requires. When the KTX2 decoder is off, left out or does not
 *     load, a glTF that only uses `KHR_texture_basisu` draws its fallback images instead.
 * @returns The Draco module when the glTF uses Draco, so the load can be counted.
 */
async function loadDecoders(used: readonly string[], required: readonly string[]): Promise<DracoModule | undefined> {
    const needed = new Set(DECODER_EXTENSIONS.filter(([name]) => used.includes(name)).map(([, kind]) => kind));
    const draco = needed.has("draco")
        ? ((await requireDecoder("draco", "KHR_draco_mesh_compression")) as DracoModule)
        : undefined;
    if (needed.has("meshopt")) {
        await requireDecoder("meshopt", "EXT_meshopt_compression");
    }

    if (needed.has("ktx2")) {
        const found = await importDecoder("ktx2");
        if (typeof found === "string" && required.includes("KHR_texture_basisu")) {
            throw new ModelError("E_MODEL_DECODER_UNAVAILABLE", { extension: "KHR_texture_basisu", reason: found });
        }
    }

    return draco;
}

/**
 * The coded fact a failed load is reported as.
 * @param error - What the load threw.
 * @param format - The model's format.
 * @returns The fact.
 */
function failureOf(error: unknown, format: string): ModelFact {
    if (error instanceof ModelError) {
        return error.fact;
    }

    if (error instanceof ModelReadError) {
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

/** Options for {@link loadModelFiles}. */
export interface LoadModelFilesOptions extends LoaderOptions {
    /**
     * Parts to load without, by their path in the set: a picture is a 1 x 1 white PNG, and an
     * OBJ's MTL lines naming it are dropped. Default: none.
     */
    readonly skipped?: readonly string[];
}

/**
 * Load a checked model's files into a container that is not in the scene yet. Every file the
 * model names must be in `files`: nothing is fetched, and a reference to anything else is refused.
 * @param scene - The scene the container belongs to.
 * @param files - The file set, by path.
 * @param main - The main file's path in `files`.
 * @param format - Its format, as `detectModelFormat` or a check names it.
 * @param options - Parts to load without, Babylon's plugin options, and whether to keep the file's
 *     cameras and lights.
 * @returns The container. Add it to the scene with `container.addAllToScene()`.
 * @throws {ModelError} With `E_MODEL_FORMAT_UNSUPPORTED`, `E_MODEL_EXTERNAL_URL`, `E_MODEL_STRUCTURE`,
 *     `E_MODEL_DECODER_UNAVAILABLE` or `E_MODEL_PARSE`.
 */
export async function loadModelFiles(
    scene: Scene,
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
    format: ModelFormat,
    options: LoadModelFilesOptions = {},
): Promise<AssetContainer> {
    if (!hasReader(format)) {
        throw new ModelError("E_MODEL_FORMAT_UNSUPPORTED", { format, fileName: main });
    }

    const skipped = options.skipped ?? [];
    if (skipped.length > 0) {
        files = withSkips(files, skipped, format === "obj");
    }

    let reader = READERS[format];
    let draco: DracoModule | undefined;
    if (format === "glb" || format === "gltf") {
        const prepared = prepareGltf(files, main, format);
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
            ? await loadBabylonModel(scene, folder, main.slice(slash + 1), reader as ModelExtension, options)
            : await loadOwnModel(scene, files, main, reader as OwnFormat, folder);
    } catch (error) {
        const fact = failureOf(error, format);
        // Only a decoder that failed to load is dropped: a damaged file ("decode") or a KTX2
        // failure leaves the Draco decoder working.
        decoderFailed =
            fact.code === "E_MODEL_DECODER_UNAVAILABLE" &&
            fact.params.reason === "load" &&
            fact.params.extension === undefined;
        throw new ModelError(fact.code, { ...fact.params });
    } finally {
        draco?.dracoLoadEnded(decoderFailed);
        release();
        for (const url of urls.values()) {
            URL.revokeObjectURL(url);
        }
    }
}

/** Options for {@link loadModel}. */
export interface LoadModelOptions extends LoadModelFilesOptions, Pick<ModelFileOptions, "main" | "format"> {
    /** The limits the files are checked against. Default: `DEFAULT_MODEL_LIMITS`. */
    readonly limits?: Partial<ModelLimits>;
    /** Stops a download. */
    readonly signal?: AbortSignal;
    /** Hears how far the files have been downloaded, read or unpacked. */
    readonly onProgress?: ModelProgressListener;
}

/** What {@link loadModel} loaded. */
export interface LoadedModel {
    /** The model, not yet in the scene: `container.addAllToScene()` adds it. */
    readonly container: AssetContainer;
    /** What the model holds, read from its files. */
    readonly summary: ModelSummary;
    /** What is worth knowing about it (`W_MODEL_*`). */
    readonly warnings: readonly ModelFact[];
    /** The files it was read from, by path (a zip's entries, or the URL's file and the files it names). */
    readonly files: ReadonlyMap<string, Uint8Array>;
    /** The main file's path in `files`. */
    readonly main: string;
    /** Its format. */
    readonly format: ModelFormat;
}

/**
 * Load a model into a container that is not in the scene yet: from a URL (with the files it names
 * beside it, fetched with no credentials), a File, several Files (a folder, or a model with its
 * parts), a `.zip`, or bytes. The files are checked against `limits` first, so a broken or
 * oversized model is refused before Babylon reads it.
 * @param scene - The scene the container belongs to.
 * @param source - The model.
 * @param options - Which file is the model, its format, parts to load without, limits, a signal,
 *     Babylon's plugin options and whether to keep the file's cameras and lights.
 * @returns The container, and what the checks found.
 * @throws {ModelError} With the `E_MODEL_*` code of the first problem; `facts` holds every one.
 */
export async function loadModel(
    scene: Scene,
    source: ModelSource,
    options: LoadModelOptions = {},
): Promise<LoadedModel> {
    const limits: ModelLimits = { ...DEFAULT_MODEL_LIMITS, ...options.limits };
    let url: URL | undefined;
    if (typeof source === "string") {
        url = new URL(source, (globalThis as { location?: { href: string } }).location?.href);
    }

    const read =
        url === undefined
            ? await readModelFiles(source as Exclude<ModelSource, string>, limits, options.onProgress)
            : await fetchModelSet(url, limits, options.signal, undefined, options.onProgress);
    const main = options.main ?? read.main;
    const checked = await checkModelFiles(
        read.given,
        {
            ...(main === undefined ? {} : { main }),
            ...(options.format === undefined ? {} : { format: options.format }),
            ...(options.skipped === undefined ? {} : { skipped: options.skipped }),
        },
        limits,
        url?.href,
    );
    if (checked.kind === "image") {
        throw new ModelError("E_MODEL_FORMAT_UNSUPPORTED", {
            format: checked.format,
            fileName: checked.main,
            assetKind: "image",
        });
    }

    const container = await loadModelFiles(scene, checked.files, checked.main, checked.format, options);
    return {
        container,
        summary: checked.summary,
        warnings: checked.warnings,
        files: checked.files,
        main: checked.main,
        format: checked.format,
    };
}
