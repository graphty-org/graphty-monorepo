/**
 * @file `session.assets`: the session's library of 3D model files.
 *
 * Adding a model reads its bytes, unpacks a `.zip`, picks the main file, detects its format from
 * its bytes, checks every reference against the file set and the structure against the limits,
 * digests the set and summarizes it -- all before anything draws it, and all free of Babylon.js
 * and the DOM (design/rendering/node-models.md sections 2.4 and 3).
 *
 * Assets are not commands: adding or removing one is not journaled, undone or recorded in a
 * recipe, which keeps megabytes out of the history. Limits and allowed hosts are set only by the
 * page's code and are never saved.
 */

import type { ModelFormat } from "../../catalog/detectModel";
import { GraphtyError } from "../../errors";
import { isPrivateHost, type NetworkApiInternal } from "../network";
import type { CodedFact } from "../shared";
import type { ModelChange } from "../types";
import { type AssetId, isAssetId, SAMPLE_PREFIX } from "./assetId";
import { digestFileSet, sha256Fallback } from "./digest";
import type { RedirectGate } from "./intake";
import { baseName, cut, normalizePath, Refusal, roleOfName } from "./references";

/**
 * The intake checks, loaded on the first add, so a page that never adds a model never
 * downloads them.
 * @returns The intake module.
 */
const loadIntake = (): Promise<typeof import("./intake")> => import("./intake");

/**
 * Where the sample models' files are, loaded when a layer first names a sample.
 * @returns The sample module.
 */
const loadSamples = (): Promise<typeof import("./samples")> => import("./samples");

export type { BuiltInModelFormat, ModelFormat } from "../../catalog/detectModel";
export { type AssetId, isAssetId, SAMPLE_PREFIX } from "./assetId";

/** A File, or anything shaped like one: a name and its bytes. No DOM type is named. */
export interface NamedBlob {
    readonly name: string;
    /** A file from a folder pick or drop carries its path inside the folder here. */
    readonly webkitRelativePath?: string;
    readonly size: number;
    arrayBuffer(): Promise<ArrayBuffer>;
}

/** What `assets.add` takes. */
export type AssetSource =
    /** A URL, fetched with no credentials. */
    | string
    /** A File. */
    | NamedBlob
    /** Several files: an array of Files, or a FileList (structurally). */
    | Iterable<NamedBlob>
    | ArrayLike<NamedBlob>
    /** The bytes of one file. */
    | ArrayBuffer
    | Uint8Array
    /** Files by path, and optionally which one is the model. */
    | {
          readonly files: ReadonlyMap<
              string,
              NamedBlob | { readonly size: number; arrayBuffer(): Promise<ArrayBuffer> } | Uint8Array
          >;
          readonly main?: string;
      };

/** Options for `assets.add`. */
export interface AddAssetOptions {
    /** A friendly id, such as `"asset:rack"`. Default: `"asset:"` + the digest of the file set. */
    readonly name?: AssetId;
    /** The main file of a set, when the element cannot tell (`E_MODEL_AMBIGUOUS`). */
    readonly main?: string;
    /** Force a format when the bytes are ambiguous. Default: detected. */
    readonly format?: ModelFormat;
    /**
     * Parts to draw without: pictures and `.mtl` files the model names, by their path in the set.
     * A picture is drawn as plain white, so the material's own color still applies; an OBJ
     * without its `.mtl` draws with the default material. The record lists them in `skipped`.
     * Default: none.
     */
    readonly skipped?: readonly string[];
    readonly signal?: AbortSignal;
}

/**
 * What `assets.supply` hands a model that is missing a part (design 12.4). `name` is the part's
 * `params.name` in the record's `E_MODEL_MISSING_FILE` or `E_MODEL_PART_AMBIGUOUS`.
 */
export type PartAnswer =
    /** Fetch this URL as the part. Another host is asked through `session.network` (`by: "supplied"`). */
    | { readonly name: string; readonly url: string }
    /** This file is the part. With no name, it is matched to a missing part by its path, then by its base name. */
    | { readonly name?: string; readonly file: NamedBlob | Uint8Array }
    /** Use a file the set already holds for an ambiguous reference (`E_MODEL_PART_AMBIGUOUS`). */
    | { readonly name: string; readonly use: string }
    /** Draw without this part. Pictures and `.mtl` files only; never a `.bin` or other geometry. */
    | { readonly name: string; readonly skip: true }
    /** Which file of the set is the model (`E_MODEL_AMBIGUOUS`). */
    | { readonly main: string };

/** What `assets.offer` did with the files it was given. */
export interface AssetOffer {
    /** Each file a waiting model took: the model's id when offered, the part's name, the file's name. */
    readonly supplied: readonly { readonly ref: AssetId; readonly name: string; readonly fileName: string }[];
    /** The files no waiting model took, or that more than one could take, in the order given. */
    readonly rest: readonly NamedBlob[];
}

/** Where an asset stands. */
export type AssetState = "pending" | "accepted" | "rejected";

/** One asset of the session. */
export interface AssetRecord {
    /**
     * The id a style layer names. A URL's record carries a provisional id derived from the URL
     * while it is pending or rejected, and the digest id once accepted.
     */
    readonly id: AssetId;
    /** What the asset is: a 3D model, or a picture a layer draws as a texture (`node.texture`). */
    readonly kind: "model" | "image";
    /** SHA-256 of the file set as given, as hex (empty while pending). */
    readonly digest: string;
    /** The bytes of the file set as given. */
    readonly byteLength: number;
    /** The main file's format; empty when it was never detected. */
    readonly format: ModelFormat;
    /**
     * The main file's path inside the set, cut to 256 characters; also on a model waiting for
     * parts, once its main file is known.
     */
    readonly path?: string;
    /** `pending` while a URL downloads; `accepted` once checked; `rejected` with its `E_MODEL_*` in `problems`. */
    readonly state: AssetState;
    /** Why it was rejected (`E_MODEL_*`), and what is worth knowing about it (`W_MODEL_*`). */
    readonly problems: readonly CodedFact[];
    /** The URL it was fetched from, as the layer or the caller named it; absent for files and bytes. */
    readonly url?: string;
    /** The parts it is drawn without (`supply`'s `skip`, `add`'s `skipped`), by their path in the set. */
    readonly skipped?: readonly string[];
}

/** What a model holds, read from its files without drawing it. */
export interface ModelSummary {
    readonly format: ModelFormat;
    /** Counted per use: a mesh used by three scene nodes counts three times. */
    readonly triangles: number;
    readonly meshes: number;
    /** Material names, each cut to 256 characters ("" for an unnamed one). */
    readonly materials: readonly string[];
    readonly textures: number;
    /** Decoded, as width x height x 4 x 4/3 (RGBA with mipmaps). */
    readonly textureBytes: number;
    /** As authored, from the vertex positions, before any node transform. */
    readonly bounds?: {
        readonly min: readonly [number, number, number];
        readonly max: readonly [number, number, number];
    };
    /** The axis that points up in the file: fixed for glTF, assumed for the others. */
    readonly upAxis: "y" | "z" | "unknown";
    readonly animations: readonly { readonly name: string; readonly seconds: number }[];
    readonly skinned: boolean;
    readonly morphTargets: number;
    readonly transparent: boolean;
    /** glTF only. */
    readonly extensionsRequired: readonly string[];
}

/** The limits that protect the tab. Only the page's code sets them; a document never does. */
export interface ModelLimits {
    /** Per model file or unzipped set. Default 32 MB. */
    readonly maxBytes: number;
    /** Per OBJ, ASCII STL or ASCII PLY file, which parse on the main thread. Default 8 MB. */
    readonly maxTextBytes: number;
    /** Per model, counted per use. Default 1,000,000. */
    readonly maxTriangles: number;
    /** Decoded texture bytes per model. Default 64 MB. */
    readonly maxTextureBytes: number;
    /** What every glTF accessor decodes to, together. Default 256 MB. */
    readonly maxDecodedBytes: number;
    /** Pixels per texture side; larger textures are drawn smaller. Default 2048. */
    readonly maxTextureSize: number;
    /** Decoded texture bytes of all models in a scene. Default 256 MB. */
    readonly sceneTextureBytes: number;
    /** Stored asset bytes in the session. Default 256 MB. */
    readonly sessionBytes: number;
    /** Triangles across the scene before `W_MODEL_BUDGET`. Default 2,000,000. */
    readonly sceneTriangleBudget: number;
    /** Default 30,000. */
    readonly fetchTimeoutMs: number;
}

const MB = 1024 * 1024;

/** The limits a session starts with. */
export const DEFAULT_MODEL_LIMITS: ModelLimits = Object.freeze({
    maxBytes: 32 * MB,
    maxTextBytes: 8 * MB,
    maxTriangles: 1_000_000,
    maxTextureBytes: 64 * MB,
    maxDecodedBytes: 256 * MB,
    maxTextureSize: 2048,
    sceneTextureBytes: 256 * MB,
    sessionBytes: 256 * MB,
    sceneTriangleBudget: 2_000_000,
    fetchTimeoutMs: 30_000,
});

/** `session.assets`. */
export interface AssetsApi {
    /**
     * Add one model: a URL, a File, several files (a .gltf with its .bin and images, an .obj with
     * its .mtl), a folder, a .zip, or bytes. Resolves once the files are checked, with state
     * `"accepted"` or `"rejected"`; a rejected record's `problems` say why.
     * @param source - The model.
     * @param options - A friendly name, the main file, a forced format, a signal.
     * @returns The settled record.
     * @example
     * ```ts
     * const asset = await graph.session.assets.add(input.files);
     * if (asset.state === "accepted") {
     *     await graph.session.styles.add({ name: "Model", target: "node", selector: { match: "everything" }, set: { "node.model": asset.id } });
     * }
     * ```
     */
    add(source: AssetSource, options?: AddAssetOptions): Promise<AssetRecord>;
    /**
     * Resolve when the asset a layer names (an id or a URL) has settled; fetches a URL the first
     * time it is asked for. An id the session does not hold resolves rejected with
     * `E_MODEL_UNKNOWN_ASSET`.
     * @param ref - An asset id or a URL.
     * @param options - A signal that stops waiting.
     * @param options.signal - Stops waiting; the fetch goes on for other callers.
     * @returns The settled record.
     */
    ready(ref: string, options?: { readonly signal?: AbortSignal }): Promise<AssetRecord>;
    /**
     * The record of an asset.
     * @param id - The id.
     * @returns The record, or undefined.
     */
    get(id: AssetId): AssetRecord | undefined;
    /**
     * The record whatever a layer names resolves to: an asset id, the id a model had while it
     * waited for parts (the record then carries its accepted id), a URL, or a sample's id. A model
     * waiting for parts is found too, with its main file in `path` once that is known.
     * @param ref - What a layer names.
     * @returns The record, or undefined when the session holds nothing by that name.
     * @example
     * ```ts
     * const record = graph.session.assets.find(layer.set["node.model"]);
     * const name = record?.path ?? "model";
     * ```
     */
    find(ref: string): AssetRecord | undefined;
    /**
     * Every asset of the session, in the order added.
     * @returns The records.
     */
    list(): readonly AssetRecord[];
    /**
     * What an accepted model holds, read from its files without drawing it.
     * @param id - The id.
     * @returns The summary.
     * @throws A `GraphtyError` coded `E_MODEL_UNKNOWN_ASSET` for an id with no accepted model.
     */
    inspect(id: AssetId): ModelSummary;
    /**
     * Remove an asset, or let go of a model held for `supply`. Nothing happens for an unknown ref.
     * @param id - The id, or the URL a layer named.
     */
    remove(id: string): void;
    /**
     * The stored files exactly as given, by path (copies).
     * @param id - The id.
     * @returns Path to bytes.
     * @throws A `GraphtyError` coded `E_MODEL_UNKNOWN_ASSET` for an id with no accepted model.
     */
    files(id: AssetId): ReadonlyMap<string, Uint8Array>;
    /**
     * Lower or raise the limits for models added from now on. Code only; a document never calls it.
     * @param limits - The limits to change.
     * @throws A `GraphtyError` coded `E_OPTION_RANGE` for a value that is not a positive number.
     */
    setLimits(limits: Partial<ModelLimits>): void;
    /**
     * Let layers that did not come from code fetch models from these hosts. Code only.
     * @param hosts - Host names, such as `"models.example.com"`.
     * @throws A `GraphtyError` coded `E_OPTION_RANGE` for something that is not a host name.
     */
    allowHosts(hosts: readonly string[]): void;
    /**
     * Where each model a style layer has named stands: the latest `model:changed` of each, by
     * `ref`, in the order first named. A page that mounts after a model settled reads its state
     * (and its warnings, such as `W_MODEL_COLOR_IGNORED`) here instead of waiting for an event.
     * @returns The changes.
     * @example
     * ```ts
     * const rack = graph.session.assets.states().find((m) => m.ref === "asset:rack");
     * if (rack?.state === "drawn") console.log("drawn");
     * ```
     */
    states(): readonly ModelChange[];
    /**
     * Answer what a rejected model is missing, then check it again: a part by URL or by file, a
     * file the set holds for an ambiguous reference, a picture or `.mtl` to draw without, or the
     * main file of a set holding several models. A model missing parts is held by the session
     * until it is accepted or removed. Calls for one model run one at a time, in order. Once it is
     * accepted, every layer that names it draws it with no new call.
     * @param ref - What a layer named (a URL or an asset id), or the record's id.
     * @param answer - The part.
     * @param options - A signal that stops waiting.
     * @param options.signal - Stops waiting.
     * @returns The new record: accepted (with its digest id), or rejected with what is still
     *     missing. A file or name that matches no missing part adds `W_MODEL_PART_UNUSED`.
     * @throws A `GraphtyError` coded `E_MODEL_UNKNOWN_ASSET` for a ref the session does not hold,
     *     `E_BAD_COMMAND` for a model that is not missing a part, `E_MODEL_PART_REQUIRED` for a
     *     skip of a part the model cannot be drawn without.
     * @example
     * ```ts
     * const car = await graph.session.assets.add(policeGlb);
     * if (car.state === "rejected") {
     *     await graph.session.assets.supply(car.id, { file: colormapPng });
     * }
     * ```
     */
    supply(ref: string, answer: PartAnswer, options?: { readonly signal?: AbortSignal }): Promise<AssetRecord>;
    /**
     * Hand files to the session first, before treating them as new assets: every file that exactly
     * one waiting model is missing (by its folder path, then by its base name, in any case) is
     * supplied to that model. A file two models could take is never guessed; it stays in `rest`.
     * @param files - The files: an array of Files, or a FileList.
     * @param options - A signal that stops waiting.
     * @param options.signal - Stops waiting.
     * @returns What was supplied, once each supply has settled, and the files left over.
     * @example
     * ```ts
     * const { rest } = await graph.session.assets.offer(event.dataTransfer.files);
     * for (const file of rest) await graph.session.assets.add(file);
     * ```
     */
    offer(
        files: Iterable<NamedBlob> | ArrayLike<NamedBlob>,
        options?: { readonly signal?: AbortSignal },
    ): Promise<AssetOffer>;
    /**
     * The models held for `supply`: rejected only for missing parts, waiting for them.
     * @returns Their records, in the order added.
     */
    waiting(): readonly AssetRecord[];
}

/** A model missing parts, held for `supply` (design 12.4). */
interface Held {
    given: Map<string, Uint8Array>;
    main?: string;
    skipped: string[];
    /** The caller's name and format. */
    readonly options: AddAssetOptions;
    /** The main file's URL as named, for a model fetched by URL. */
    readonly url?: string;
}

/** What the session keeps per asset. */
interface Entry {
    record: AssetRecord;
    settled: Promise<AssetRecord>;
    given?: ReadonlyMap<string, Uint8Array>;
    summary?: ModelSummary;
    held?: Held;
    /** Parts came by `supply`: no single URL brings it back. */
    assembled?: boolean;
    /** The `supply` calls for it, one at a time. */
    chain?: Promise<unknown>;
}

/** The codes a held model can be supplied for. */
const PART_CODES = new Set(["E_MODEL_MISSING_FILE", "E_MODEL_PART_AMBIGUOUS", "E_MODEL_AMBIGUOUS"]);

/** The assets API plus what the drawing side reads and the public interface does not offer. */
export interface AssetsApiInternal extends AssetsApi {
    /**
     * Whether a layer that did not come from code may fetch from a host.
     * @param host - The host name.
     * @returns True when the page allowed it.
     */
    hostAllowed(host: string): boolean;
    /** The limits in force. */
    limits(): ModelLimits;
    /**
     * Keep a model's latest change for {@link AssetsApi.states}.
     * @param change - The change.
     */
    noteState(change: ModelChange): void;
    /**
     * The accepted record a URL a layer named resolved to, without fetching anything.
     * @param ref - The URL as the layer named it.
     * @returns The record, or undefined when the URL has not loaded.
     */
    urlRecord(ref: string): AssetRecord | undefined;
    /**
     * Resolve a URL to an asset the session holds, so naming the URL fetches nothing: a project
     * file's embedded copy of a model a layer names by URL. It replaces what the URL resolved to.
     * @param ref - The URL as the layer named it.
     * @param id - The held asset.
     */
    bindUrl(ref: string, id: AssetId): void;
    /**
     * Note the digest a project file recorded for an asset it keeps by URL, so the file loaded
     * from that URL later is reported (`W_MODEL_CHANGED`) when it is not the one saved.
     * @param ref - The URL.
     * @param digest - The recorded SHA-256.
     */
    expectDigest(ref: string, digest: string): void;
    /**
     * The digest a project file recorded for a URL, if any.
     * @param ref - The URL.
     * @returns The digest, or undefined.
     */
    expectedDigest(ref: string): string | undefined;
    /**
     * Whether an accepted asset's parts came from more than one place (`supply`), so no single URL
     * brings it back.
     * @param id - The id.
     * @returns True for such an asset.
     */
    assembled(id: AssetId): boolean;
    /**
     * Call back after every `supply`, with every name the model is known by (its ids and URLs), so
     * the layers naming it draw again.
     * @param listener - The callback.
     * @returns Stops calling it.
     */
    watchSupplied(listener: (names: readonly string[]) => void): () => void;
}

/**
 * A URL as a fact shows it: origin and path.
 * @param url - The URL.
 * @returns The text.
 */
function shownUrlOf(url: URL): string {
    return `${url.origin}${url.pathname}`.slice(0, 256);
}

/**
 * The bytes of a file set.
 * @param files - The set.
 * @returns The total.
 */
function byteLengthOf(files: ReadonlyMap<string, Uint8Array>): number {
    return [...files.values()].reduce((sum, bytes) => sum + bytes.length, 0);
}

/**
 * An object without its undefined members, for types whose optional members may not hold undefined.
 * @param value - The object.
 * @returns A copy with only its defined members.
 */
function withoutUndefined<T extends object>(value: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
    return Object.fromEntries(Object.entries(value).filter(([, each]) => each !== undefined)) as {
        [K in keyof T]?: Exclude<T[K], undefined>;
    };
}

/**
 * What the session holds of a model missing parts, for `supply` (design 12.4).
 * @param files - The set.
 * @param options - The caller's options; only the name and format are kept.
 * @param skipped - The parts it is drawn without.
 * @param main - The main file named, if any.
 * @param url - The main file's URL as named, if any.
 * @returns The hold.
 */
function holdOf(
    files: ReadonlyMap<string, Uint8Array>,
    options: AddAssetOptions,
    skipped: string[],
    main?: string,
    url?: string,
): Held {
    return {
        given: new Map(files),
        skipped,
        options: withoutUndefined({ name: options.name, format: options.format }),
        ...withoutUndefined({ main, url }),
    };
}

/**
 * Hex of the first bytes of a SHA-256, synchronously, for provisional ids.
 * @param text - What to hash.
 * @returns 64 hex characters.
 */
function syncHex(text: string): string {
    return [...sha256Fallback(new TextEncoder().encode(text))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * A frozen record.
 * @param fields - Its fields.
 * @returns The record.
 */
function record(fields: Omit<AssetRecord, "kind"> & { readonly kind?: AssetRecord["kind"] }): AssetRecord {
    return Object.freeze({ kind: "model", ...fields, problems: Object.freeze([...fields.problems]) });
}

/**
 * Await a promise unless the signal aborts first.
 * @param promise - The promise.
 * @param signal - The signal.
 * @returns What the promise resolves to.
 */
function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal === undefined) {
        return promise;
    }

    signal.throwIfAborted();
    return new Promise<T>((resolve, reject) => {
        const onAbort = (): void => {
            reject(signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason)));
        };
        signal.addEventListener("abort", onAbort, { once: true });
        promise.then(
            (value) => {
                signal.removeEventListener("abort", onAbort);
                resolve(value);
            },
            (error: unknown) => {
                signal.removeEventListener("abort", onAbort);
                reject(error instanceof Error ? error : new Error(String(error)));
            },
        );
    });
}

/**
 * Whether two files hold the same bytes.
 * @param a - One.
 * @param b - The other.
 * @returns True when they are equal.
 */
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
    return a.length === b.length && a.every((byte, at) => byte === b[at]);
}

/**
 * Thrown by `supply` (and `add`'s `skipped`) for a call it cannot take.
 * @param code - Why.
 * @param details - What names the problem.
 * @returns The error.
 */
function supplyError(code: "E_BAD_COMMAND" | "E_MODEL_PART_REQUIRED", details: Record<string, string>): GraphtyError {
    return new GraphtyError({
        code,
        source: "data",
        message:
            code === "E_BAD_COMMAND"
                ? "This model is not missing a part."
                : "A model cannot be drawn without its geometry.",
        details,
    });
}

/**
 * The missing or ambiguous part a name means: as written, then with its path normalized, in any case.
 * @param parts - The record's part facts.
 * @param name - The name.
 * @returns The fact, or undefined.
 */
function partNamed(parts: readonly CodedFact[], name: string): CodedFact | undefined {
    const normalized = (normalizePath(name) ?? name).toLowerCase();
    return (
        parts.find((fact) => fact.params.name === name) ??
        parts.find((fact) => String(fact.params.name).toLowerCase() === normalized)
    );
}

/**
 * How a file with no name is matched to a part name (lower-cased), in order: by its folder path,
 * then by its base name, in any case.
 * @param file - The file.
 * @returns The tests, best first.
 */
function fileSteps(file: NamedBlob): ((name: string) => boolean)[] {
    const path = (normalizePath(file.webkitRelativePath ?? "") ?? "").toLowerCase();
    const base = (path === "" ? file.name : baseName(path)).toLowerCase();
    return [(name) => path !== "" && (path === name || path.endsWith(`/${name}`)), (name) => baseName(name) === base];
}

/**
 * The missing part a file with no name means: by its folder path, then by its base name, in any
 * case; only when exactly one part matches.
 * @param parts - The missing parts.
 * @param file - The file.
 * @returns The fact, or undefined.
 */
function partForFile(parts: readonly CodedFact[], file: NamedBlob): CodedFact | undefined {
    for (const step of fileSteps(file)) {
        const found = parts.filter((fact) => step(String(fact.params.name).toLowerCase()));
        if (found.length > 0) {
            return found.length === 1 ? found[0] : undefined;
        }
    }

    return undefined;
}

/** A part answer that brings bytes. */
type BytesAnswer = Extract<PartAnswer, { readonly url: string } | { readonly file: unknown }>;

/**
 * The missing part an answer that brings bytes is for.
 * @param missing - The missing parts.
 * @param answer - The answer.
 * @returns The fact, or undefined.
 */
function partFor(missing: readonly CodedFact[], answer: BytesAnswer): CodedFact | undefined {
    if ("url" in answer || answer.name !== undefined) {
        return partNamed(missing, String(answer.name));
    }

    return answer.file instanceof Uint8Array ? undefined : partForFile(missing, answer.file);
}

/**
 * What a file answer is called in `W_MODEL_PART_UNUSED`.
 * @param answer - The answer.
 * @returns Its name, or "" for unnamed bytes.
 */
function fileNameOf(answer: BytesAnswer): string {
    if ("url" in answer) {
        return answer.name;
    }

    if (answer.name !== undefined) {
        return answer.name;
    }

    return answer.file instanceof Uint8Array ? "" : answer.file.name;
}

/** A part URL's gate, answered before its supply took its turn: why not, or undefined to fetch. */
interface Decided {
    readonly refusal: CodedFact | undefined;
}

/** What one answer does to a held model: a change to check, a part it could not take, or nothing. */
type Step =
    | { readonly unused: string }
    | { readonly refused: CodedFact }
    | { readonly main?: string; readonly skip?: string; readonly part?: readonly [string, Uint8Array] };

/**
 * The step of a skip: a picture or `.mtl` the model is missing.
 * @param missing - The missing parts.
 * @param name - The part.
 * @returns The step.
 * @throws A `GraphtyError` coded `E_MODEL_PART_REQUIRED` for geometry.
 */
function skipStep(missing: readonly CodedFact[], name: string): Step {
    const part = partNamed(missing, name);
    const role = String(part?.params.role ?? roleOfName(name));
    if (role === "geometry") {
        throw supplyError("E_MODEL_PART_REQUIRED", { name: cut(name), role });
    }

    return part?.code === "E_MODEL_MISSING_FILE" ? { skip: String(part.params.name) } : { unused: name };
}

/**
 * The step of a `use`: one of an ambiguous reference's candidates, stored under the name the model uses.
 * @param missing - The missing and ambiguous parts.
 * @param answer - The answer.
 * @param answer.name - The ambiguous part.
 * @param answer.use - The file meant.
 * @param given - The held files.
 * @returns The step.
 */
function useStep(
    missing: readonly CodedFact[],
    answer: { readonly name: string; readonly use: string },
    given: ReadonlyMap<string, Uint8Array>,
): Step {
    const part = partNamed(missing, answer.name);
    const candidates = (part?.params.candidates ?? []) as readonly string[];
    const bytes = given.get(answer.use);
    if (part?.code !== "E_MODEL_PART_AMBIGUOUS" || !candidates.includes(answer.use) || bytes === undefined) {
        return { unused: answer.name };
    }

    // ponytail: the chosen file is stored again under the name the model uses; a resolution table
    // would keep the set smaller if ambiguous parts turn out to be common.
    return { part: [String(part.params.name), bytes] };
}

/**
 * Build `session.assets`.
 * @param network - The session's fetch gate, which `allowHosts` also opens.
 * @returns The API.
 */
export function createAssetsApi(network?: NetworkApiInternal): AssetsApiInternal {
    let limits: ModelLimits = DEFAULT_MODEL_LIMITS;
    const hosts = new Set<string>();
    const entries = new Map<AssetId, Entry>();
    const urls = new Map<string, Entry>();
    // The element's own samples: read from the package on first use, never part of the session's
    // assets (not listed, not counted against sessionBytes, not removable).
    const samples = new Map<AssetId, Entry>();
    const states = new Map<string, ModelChange>();
    // The digests a project file recorded for assets it keeps by URL, by href.
    const expectedDigests = new Map<string, string>();
    const lookup = (id: AssetId): Entry | undefined => entries.get(id) ?? samples.get(id);

    /**
     * Every entry once, whatever names it.
     * @returns The entries.
     */
    const allEntries = (): Set<Entry> => new Set([...entries.values(), ...urls.values()]);

    /**
     * Bytes held: accepted models counting each digest once, and every model held for `supply`.
     * @returns The total.
     */
    const storedBytes = (): number => {
        const seen = new Map<string, number>();
        let held = 0;
        for (const entry of allEntries()) {
            if (entry.record.state === "accepted") {
                seen.set(entry.record.digest, entry.record.byteLength);
            } else if (entry.held !== undefined) {
                held += [...entry.held.given.values()].reduce((sum, bytes) => sum + bytes.length, 0);
            }
        }

        return [...seen.values()].reduce((sum, n) => sum + n, held);
    };

    /**
     * Whether a record was rejected only for parts `supply` can answer.
     * @param problems - Its problems.
     * @returns True when every error is a missing, ambiguous or unchosen part.
     */
    const onlyParts = (problems: readonly CodedFact[]): boolean =>
        problems.length > 0 && problems.every((fact) => PART_CODES.has(fact.code));

    /**
     * A set as its entries: a `.zip` unpacked (its id is its entries' digest, so a zip, a folder
     * and supplied parts agree), anything else as given. A zip that cannot be read is left for the
     * checks to refuse.
     * @param given - The files as given.
     * @returns The files.
     */
    const asEntries = async (given: ReadonlyMap<string, Uint8Array>): Promise<ReadonlyMap<string, Uint8Array>> => {
        try {
            return await (await loadIntake()).unpackZip(given, limits);
        } catch (error) {
            if (!(error instanceof Refusal)) {
                throw error;
            }

            return given;
        }
    };

    /**
     * The record of an id that cannot be taken: a reserved sample name, or a name held by other files.
     * @param id - The id.
     * @param digest - The files' digest.
     * @param byteLength - Their bytes.
     * @param sample - True for one of the element's samples.
     * @returns The held record, a refusal, or undefined when the id is free.
     */
    const takenRecord = (id: AssetId, digest: string, byteLength: number, sample: boolean): AssetRecord | undefined => {
        const held = entries.get(id);
        if (held !== undefined && held.record.state !== "pending" && held.record.digest === digest) {
            return held.record;
        }

        // The same files again, after the model they made waited for parts and was finished: the
        // finished model, which the id it had while waiting still names.
        if (held?.assembled === true && held.record.state === "accepted" && id === `asset:${digest}`) {
            return held.record;
        }

        const reserved = id.startsWith(SAMPLE_PREFIX) && !sample;
        if (!reserved && (held === undefined || held.record.state === "pending")) {
            return undefined;
        }

        const problems = [{ code: "E_MODEL_NAME_TAKEN", params: { id } }];
        return record({ id, digest, byteLength, format: "", state: "rejected", problems });
    };

    /** What a set's record is made from. */
    interface Settling {
        readonly id: AssetId;
        /** The id it takes once accepted. */
        readonly acceptedId: AssetId;
        readonly digest: string;
        readonly byteLength: number;
        readonly extra: Pick<AssetRecord, "url" | "skipped">;
        readonly sample: boolean;
        /** Bytes this set already counts toward `sessionBytes` while held. */
        readonly heldBytes: number;
    }

    /**
     * Run every check on a set and make its record.
     * @param files - The set.
     * @param options - The caller's main file, format and skips.
     * @param at - What the record is made from.
     * @returns The record, and the summary of an accepted one.
     */
    const settle = async (
        files: ReadonlyMap<string, Uint8Array>,
        options: AddAssetOptions,
        at: Settling,
    ): Promise<{ settled: AssetRecord; summary?: ModelSummary }> => {
        const { id, digest, byteLength } = at;
        let checked: Awaited<ReturnType<Awaited<ReturnType<typeof loadIntake>>["checkAsset"]>>;
        try {
            checked = await (await loadIntake()).checkAsset(files, options, limits);
        } catch (error) {
            if (!(error instanceof Refusal)) {
                throw error;
            }

            const problems = error.facts;
            // A model waiting for parts is named by its main file, as an accepted one is.
            const main = onlyParts(problems) ? (await loadIntake()).mainPathOf(files, options) : undefined;
            const path = main === undefined ? {} : { path: main.slice(0, 256) };
            return {
                settled: record({
                    id,
                    digest,
                    byteLength,
                    format: "",
                    state: "rejected",
                    problems,
                    ...path,
                    ...at.extra,
                }),
            };
        }

        const already = [...entries.values()].some((e) => e.record.digest === digest && e.record.state === "accepted");
        const found = storedBytes() - at.heldBytes + byteLength;
        if (!at.sample && !already && found > limits.sessionBytes) {
            const problems = [
                { code: "E_MODEL_TOO_LARGE", params: { what: "sessionBytes", found, limit: limits.sessionBytes } },
            ];
            return { settled: record({ id, digest, byteLength, format: checked.format, state: "rejected", problems }) };
        }

        const settled = record({
            id: at.acceptedId,
            kind: checked.kind,
            digest,
            byteLength,
            format: checked.format,
            path: checked.main.slice(0, 256),
            state: "accepted",
            problems: checked.warnings,
            ...at.extra,
        });
        return { settled, summary: checked.summary };
    };

    /**
     * Check a file set and settle its record.
     * @param given - The files as given.
     * @param options - The caller's options.
     * @param main - A main file the source itself named.
     * @param sample - True for one of the element's samples, which is kept apart from the session's assets.
     * @param url - The URL it was fetched from, as named, when it was.
     * @param into - A held entry `supply` checks again: it is updated in place, keeping its id while rejected.
     * @returns The settled record.
     */
    const intake = async (
        given: ReadonlyMap<string, Uint8Array>,
        options: AddAssetOptions,
        main?: string,
        sample = false,
        url?: string,
        into?: Entry,
    ): Promise<AssetRecord> => {
        const skipped = [...(options.skipped ?? [])];
        const files = await asEntries(given);
        const digest = await digestFileSet(files);
        options.signal?.throwIfAborted();
        const byteLength = byteLengthOf(files);
        const named = options.name ?? `asset:${digest}`;
        const id: AssetId = into === undefined ? named : into.record.id;
        const taken = into === undefined ? takenRecord(id, digest, byteLength, sample) : undefined;
        if (taken !== undefined) {
            return taken;
        }

        const { settled, summary } = await settle(
            files,
            { main, ...withoutUndefined(options) },
            {
                id,
                acceptedId: named,
                digest,
                byteLength,
                extra: withoutUndefined({ url, skipped: skipped.length === 0 ? undefined : Object.freeze(skipped) }),
                sample,
                heldBytes: into?.held === undefined ? 0 : byteLengthOf(into.held.given),
            },
        );
        if (into !== undefined) {
            if (summary !== undefined) {
                into.summary = summary;
            }

            return settled;
        }

        const entry: Entry = {
            record: settled,
            settled: Promise.resolve(settled),
            ...(summary === undefined ? {} : { summary, given: files }),
        };
        if (!sample && settled.state === "rejected" && onlyParts(settled.problems)) {
            entry.held = holdOf(files, options, skipped, main, url);
        }

        (sample ? samples : entries).set(id, entry);
        return entry.held === undefined ? settled : fillFromProject(entry);
    };

    /**
     * Read one of the element's samples from the package once, shared by every caller.
     * @param id - An id under `asset:sample/`.
     * @returns Its settled record.
     */
    const readSample = (id: AssetId): Promise<AssetRecord> => {
        const held = samples.get(id);
        if (held !== undefined) {
            return held.settled;
        }

        const rejected = (fact: CodedFact): AssetRecord =>
            record({ id, digest: "", byteLength: 0, format: "", state: "rejected", problems: [fact] });
        const entry: Entry = {
            record: record({ id, digest: "", byteLength: 0, format: "", state: "pending", problems: [] }),
            settled: Promise.resolve(undefined as unknown as AssetRecord),
        };
        samples.set(id, entry);
        entry.settled = (async () => {
            const name = id.slice(SAMPLE_PREFIX.length);
            const table = (await loadSamples()).SAMPLE_MODEL_URLS;
            const url = Object.hasOwn(table, name) ? table[name] : undefined;
            if (url === undefined) {
                samples.delete(id);
                return rejected({ code: "E_MODEL_UNKNOWN_ASSET", params: { id } });
            }

            let bytes: Uint8Array;
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(String(response.status));
                }

                bytes = new Uint8Array(await response.arrayBuffer());
            } catch {
                samples.delete(id); // A later call tries again.
                return rejected({ code: "E_MODEL_FETCH", params: { url: id, status: null, offline: false } });
            }

            return intake(new Map([[`${name}.glb`, bytes]]), { name: id }, undefined, true);
        })();
        return entry.settled;
    };

    /**
     * A record for a source rejected before its bytes could be read.
     * @param fact - Why.
     * @param provisional - The provisional id.
     * @returns The record.
     */
    const early = (fact: CodedFact | readonly CodedFact[], provisional: AssetId): AssetRecord =>
        record({
            id: provisional,
            digest: "",
            byteLength: 0,
            format: "",
            state: "rejected",
            problems: Array.isArray(fact) ? fact : [fact as CodedFact],
        });

    /**
     * Fetch a URL once and settle its record, shared by every caller asking for it.
     * @param url - The URL.
     * @param options - The caller's options.
     * @param named - The URL as the caller or the layer wrote it.
     * @returns The URL's entry.
     */
    const startUrl = (url: URL, options: AddAssetOptions, named: string = url.href): Entry => {
        const provisional: AssetId = `asset:url-${syncHex(url.href)}`;
        const entry: Entry = {
            record: record({ id: provisional, digest: "", byteLength: 0, format: "", state: "pending", problems: [] }),
            settled: Promise.resolve(undefined as unknown as AssetRecord),
        };
        // The fetch is shared, so one caller's signal does not stop it for the others.
        const shared: AddAssetOptions = {
            ...(options.name === undefined ? {} : { name: options.name }),
            ...(options.main === undefined ? {} : { main: options.main }),
            ...(options.format === undefined ? {} : { format: options.format }),
        };
        entry.settled = (async () => {
            let settled: AssetRecord;
            try {
                const kind = roleOfName(url.pathname) === "texture" ? "texture" : "model";
                const fetched = await (
                    await loadIntake()
                ).fetchModelSet(url, limits, undefined, redirectGate(kind, "file"));
                settled = await intake(fetched.given, shared, fetched.main, false, named);
                const expected = expectedDigests.get(url.href);
                if (settled.state === "accepted" && expected !== undefined && expected !== settled.digest) {
                    // A project saved this URL with another file's digest: the file changed since.
                    settled = record({
                        ...settled,
                        problems: [
                            ...settled.problems,
                            {
                                code: "W_MODEL_CHANGED",
                                params: { url: shownUrlOf(url), expected, found: settled.digest },
                            },
                        ],
                    });
                    const held = entries.get(settled.id);
                    if (held !== undefined) {
                        held.record = settled;
                        held.settled = Promise.resolve(settled);
                    }
                }
            } catch (error) {
                if (!(error instanceof Refusal)) {
                    throw error;
                }

                settled = early(error.facts, provisional);
                if (error.held !== undefined) {
                    // Missing parts only: held, so the reader can supply them (design 12.4).
                    entry.held = { ...error.held, skipped: [], options: shared, url: named };
                    const main = (await loadIntake()).mainPathOf(error.held.given, { main: error.held.main });
                    settled = record({ ...settled, url: named, ...(main === undefined ? {} : { path: main }) });
                    entry.record = settled;
                    settled = await fillFromProject(entry);
                }
            }

            entry.record = settled;
            return settled;
        })();
        urls.set(url.href, entry);
        return entry;
    };

    /**
     * What a fetch does when its answer came from another host (design 2.6): the page's own code
     * and an unasked fetch go on; a fetch whose host the reader or the project allowed asks again
     * for the host it was sent to, as the same kind of request.
     * @param kind - What is fetched.
     * @param by - Who asked for it.
     * @returns The gate.
     */
    const redirectGate =
        (kind: "model" | "texture", by: "file" | "supplied"): RedirectGate =>
        (from, to) => {
            if (
                network === undefined ||
                !network.allowed(from.host) ||
                network.allowed(to.host) ||
                api.hostAllowed(to.host)
            ) {
                return undefined;
            }

            return network.ask({ url: to, kind, by, layerIds: [] }).then((allowed) =>
                allowed
                    ? undefined
                    : {
                          code: "E_MODEL_URL_BLOCKED",
                          params: { hosts: [cut(to.host)], redirected: true, denied: true },
                      },
            );
        };

    /**
     * Parse what a layer named as a URL.
     * @param ref - The string.
     * @param base - What it is relative to. Default: the page.
     * @returns The URL, or undefined.
     */
    const parseUrl = (ref: string, base?: string): URL | undefined => {
        try {
            return new URL(ref, base ?? (globalThis as { location?: { href?: string } }).location?.href);
        } catch {
            return undefined;
        }
    };

    const supplyWatchers = new Set<(names: readonly string[]) => void>();

    /**
     * The models held for `supply`, each once.
     * @returns The entries.
     */
    const waitingEntries = (): Entry[] =>
        [...allEntries()].filter((entry) => entry.held !== undefined && entry.record.state === "rejected");

    /**
     * The one waiting model and missing part a file is for: the best step that matches anything
     * decides, and it must match exactly one part not already taken.
     * @param waiting - The waiting models.
     * @param file - The file.
     * @param taken - Parts already given a file in this offer, as `id` + NUL + name.
     * @returns The model and the part's name, or undefined.
     */
    const offerTarget = (
        waiting: readonly Entry[],
        file: NamedBlob,
        taken: ReadonlySet<string>,
    ): { readonly entry: Entry; readonly name: string } | undefined => {
        for (const step of fileSteps(file)) {
            const hits = waiting.flatMap((entry) =>
                entry.record.problems
                    .filter((fact) => fact.code === "E_MODEL_MISSING_FILE")
                    .map((fact) => String(fact.params.name))
                    .filter((name) => !taken.has(`${entry.record.id}\0${name}`) && step(name.toLowerCase()))
                    .map((name) => ({ entry, name })),
            );
            if (hits.length > 0) {
                return hits.length === 1 ? hits[0] : undefined;
            }
        }

        return undefined;
    };

    /**
     * The entry a ref names: an id (or an id it had while rejected), a URL, or a URL's provisional id.
     * @param ref - The ref.
     * @returns The entry, or undefined.
     */
    const findEntry = (ref: string): Entry | undefined => {
        const byId = isAssetId(ref) ? entries.get(ref) : undefined;
        if (byId !== undefined) {
            return byId;
        }

        const url = isAssetId(ref) ? undefined : parseUrl(ref);
        return (
            (url === undefined ? undefined : urls.get(url.href)) ?? [...urls.values()].find((e) => e.record.id === ref)
        );
    };

    /**
     * Every name an entry is known by: its ids and the URLs that resolve to it.
     * @param entry - The entry.
     * @returns The names.
     */
    const namesOf = (entry: Entry): string[] => {
        const names = new Set<string>();
        for (const [key, value] of [...entries, ...urls]) {
            if (value === entry) {
                names.add(key);
            }
        }

        names.add(entry.record.id);
        if (entry.record.url !== undefined) {
            names.add(entry.record.url);
        }

        return [...names];
    };

    /**
     * Whether a supplied part's URL may be fetched (design 12.7): the main file's own origin at
     * once; a private, loopback or link-local host never; any other host once the page, the reader
     * or the project allows it (`by: "supplied"`).
     * @param held - The held model.
     * @param target - The part's URL.
     * @param part - The missing part.
     * @returns Why not, or undefined to fetch.
     */
    const refusalFor = async (held: Held, target: URL, part: CodedFact): Promise<CodedFact | undefined> => {
        const params = { hosts: [cut(target.host)], part: cut(String(part.params.name)) };
        // Refused before anyone is asked: only a web address is fetched, and never with a login.
        if (target.protocol !== "https:" && target.protocol !== "http:") {
            return { code: "E_MODEL_URL_BLOCKED", params: { ...params, scheme: target.protocol } };
        }

        if (target.username !== "" || target.password !== "") {
            return { code: "E_MODEL_URL_BLOCKED", params: { ...params, credentials: true } };
        }

        const origin = held.url === undefined ? undefined : parseUrl(held.url)?.origin;
        if (target.origin === origin) {
            return undefined;
        }

        if (isPrivateHost(target.hostname)) {
            return { code: "E_MODEL_URL_BLOCKED", params };
        }

        const allowed =
            network === undefined
                ? api.hostAllowed(target.host)
                : await network.ask({
                      url: target,
                      kind: part.params.role === "texture" ? "texture" : "model",
                      by: "supplied",
                      layerIds: [],
                  });
        return allowed ? undefined : { code: "E_MODEL_URL_BLOCKED", params: { ...params, denied: true } };
    };

    /**
     * Fetch a part supplied by URL, its query kept for the request only.
     * @param held - The held model.
     * @param part - The missing part.
     * @param address - The URL as given.
     * @param room - Bytes left under `maxBytes`.
     * @param signal - Stops the fetch.
     * @param decided - The gate's answer, when it was asked before this turn.
     * @returns The bytes, or why not.
     */
    const fetchPart = async (
        held: Held,
        part: CodedFact,
        address: string,
        room: number,
        signal?: AbortSignal,
        decided?: Decided,
    ): Promise<Uint8Array | CodedFact> => {
        const name = cut(String(part.params.name));
        const target = parseUrl(address, held.url === undefined ? undefined : parseUrl(held.url)?.href);
        if (target === undefined) {
            const url = cut(address.split(/[?#]/)[0]);
            return { code: "E_MODEL_FETCH", params: { url, status: null, offline: false, part: name } };
        }

        const intakeModule = await loadIntake();
        if (intakeModule.isKnownWebPage(target)) {
            return { code: "E_MODEL_WEB_PAGE", params: intakeModule.webPageParams(target, name) };
        }

        const refusal = decided === undefined ? await refusalFor(held, target, part) : decided.refusal;
        if (refusal !== undefined) {
            return refusal;
        }

        let bytes: Uint8Array;
        try {
            const gate = redirectGate(part.params.role === "texture" ? "texture" : "model", "supplied");
            [bytes] = (await intakeModule.fetchModel(target, { ...limits, maxBytes: room }, signal, gate)).values();
        } catch (error) {
            if (!(error instanceof Refusal)) {
                throw error;
            }

            return { code: error.fact.code, params: { ...error.fact.params, part: name } };
        }

        return intakeModule.isWebPage(bytes)
            ? { code: "E_MODEL_WEB_PAGE", params: intakeModule.webPageParams(target, name) }
            : bytes;
    };

    /**
     * Ask about a part's URL before its supply takes its turn.
     * @param entry - The held model.
     * @param answer - The part by URL.
     * @param answer.name - The part's name.
     * @param answer.url - Its URL.
     * @returns The answer for the fetch, or undefined when the turn decides it (no such part yet).
     */
    const gateFor = async (
        entry: Entry,
        answer: { readonly name: string; readonly url: string },
    ): Promise<Decided | undefined> => {
        const { held } = entry;
        if (held === undefined) {
            return undefined;
        }

        const missing = entry.record.problems.filter(
            (fact) => PART_CODES.has(fact.code) && fact.code !== "E_MODEL_AMBIGUOUS",
        );
        const part = partFor(missing, answer);
        const target = parseUrl(answer.url, held.url === undefined ? undefined : parseUrl(held.url)?.href);
        if (part === undefined || target === undefined || (await loadIntake()).isKnownWebPage(target)) {
            return undefined;
        }

        return { refusal: await refusalFor(held, target, part) };
    };

    /**
     * What one answer does to a held model.
     * @param held - The held model.
     * @param parts - Its missing, ambiguous and unchosen parts.
     * @param answer - The answer.
     * @param signal - Stops a fetch.
     * @param decided - The gate's answer for a part by URL, when it was asked before this turn.
     * @returns The step.
     */
    const stepFor = async (
        held: Held,
        parts: readonly CodedFact[],
        answer: PartAnswer,
        signal?: AbortSignal,
        decided?: Decided,
    ): Promise<Step> => {
        const missing = parts.filter((fact) => fact.code !== "E_MODEL_AMBIGUOUS");
        if ("main" in answer) {
            return { main: answer.main };
        }

        if ("skip" in answer) {
            return skipStep(missing, answer.name);
        }

        if ("use" in answer) {
            return useStep(missing, answer, held.given);
        }

        const part = partFor(missing, answer);
        if (part === undefined) {
            return { unused: fileNameOf(answer) };
        }

        const name = String(part.params.name);
        const room = limits.maxBytes - byteLengthOf(held.given);
        if ("url" in answer) {
            const fetched = await fetchPart(held, part, answer.url, room, signal, decided);
            return fetched instanceof Uint8Array ? { part: [name, fetched] } : { refused: fetched };
        }

        const size = answer.file instanceof Uint8Array ? answer.file.length : answer.file.size;
        if (size > room) {
            const params = { what: "bytes", found: limits.maxBytes - room + size, limit: limits.maxBytes, part: name };
            return { refused: { code: "E_MODEL_TOO_LARGE", params } };
        }

        const bytes =
            answer.file instanceof Uint8Array ? answer.file.slice() : new Uint8Array(await answer.file.arrayBuffer());
        return { part: [name, bytes] };
    };

    /**
     * One `supply` call, run in its model's turn.
     * @param entry - The held model.
     * @param answer - The part.
     * @param signal - Stops a fetch.
     * @param decided - The gate's answer for a part by URL, when it was asked before this turn.
     * @returns The new record.
     */
    const supplyOne = async (
        entry: Entry,
        answer: PartAnswer,
        signal?: AbortSignal,
        decided?: Decided,
    ): Promise<AssetRecord> => {
        const { held } = entry;
        const parts = entry.record.problems.filter((fact) => PART_CODES.has(fact.code));
        if (entry.record.state !== "rejected" || held === undefined || parts.length === 0) {
            throw supplyError("E_BAD_COMMAND", { id: entry.record.id });
        }

        // A part that could not be taken: the record says why, beside what is still missing.
        const refused = (fact: CodedFact): AssetRecord => {
            entry.record = record({ ...entry.record, problems: [fact, ...parts] });
            entry.settled = Promise.resolve(entry.record);
            return entry.record;
        };
        const step = await stepFor(held, parts, answer, signal, decided);
        if ("unused" in step) {
            const fact = { code: "W_MODEL_PART_UNUSED", params: { fileName: cut(step.unused) } };
            return record({ ...entry.record, problems: [...entry.record.problems, fact] });
        }

        if ("refused" in step) {
            return refused(step.refused);
        }

        const given = new Map(held.given);
        if (step.part !== undefined) {
            given.set(...step.part);
        }

        const main = step.main ?? held.main;
        const skipped = step.skip === undefined ? held.skipped : [...held.skipped, step.skip];
        const settled = await intake(given, { ...held.options, skipped }, main, false, held.url, entry);
        if (settled.state === "rejected" && !onlyParts(settled.problems)) {
            // The part itself was refused (a picture that is not one, a size over a limit): keep
            // what was held, and say why beside what is still missing, naming the part it was for.
            const [why] = settled.problems;
            const part = step.part?.[0];
            return refused(
                part === undefined || why.params.part !== undefined
                    ? why
                    : { code: why.code, params: { ...why.params, part: cut(part) } },
            );
        }

        entry.assembled = true;
        entry.record = settled;
        entry.settled = Promise.resolve(settled);
        if (settled.state === "accepted") {
            entry.given = given;
            delete entry.held;
            entries.set(settled.id, entry);
        } else {
            entry.held = { ...held, given, ...(main === undefined ? {} : { main }), skipped };
        }

        return settled;
    };

    /**
     * A picture the session already holds that a missing part names: an image asset, or a picture
     * inside an accepted model, matched by its path, then by its base name, in any case; only when
     * exactly one picture (by its bytes) fits.
     * @param name - The missing part's path.
     * @param skip - The entry asking, whose own files do not count.
     * @returns The bytes, and whether only the base name matched; or undefined.
     */
    const projectPicture = (
        name: string,
        skip: Entry,
    ): { bytes: Uint8Array; base: boolean; used: string } | undefined => {
        const pictures: [string, Uint8Array][] = [];
        for (const entry of new Set(entries.values())) {
            if (entry === skip || entry.record.state !== "accepted" || entry.given === undefined) {
                continue;
            }

            for (const [path, bytes] of entry.given) {
                if (roleOfName(path) === "texture") {
                    pictures.push([path, bytes]);
                }
            }
        }

        const wanted = name.toLowerCase();
        const steps: ((path: string) => boolean)[] = [
            (path) => path.toLowerCase() === wanted,
            (path) => baseName(path).toLowerCase() === baseName(wanted),
        ];
        for (const [index, step] of steps.entries()) {
            const hits = pictures.filter(([path]) => step(path));
            const distinct = hits.filter(([, bytes], at) => hits.findIndex(([, b]) => sameBytes(b, bytes)) === at);
            if (distinct.length > 0) {
                return distinct.length === 1
                    ? { bytes: distinct[0][1], base: index === 1, used: distinct[0][0] }
                    : undefined;
            }
        }

        return undefined;
    };

    /**
     * Supply a model that has just started waiting with the pictures the session already holds
     * (design 12.4): a kit whose models share one picture asks for it once.
     * @param entry - The held model.
     * @returns Its record afterwards.
     */
    const fillFromProject = async (entry: Entry): Promise<AssetRecord> => {
        const substituted: CodedFact[] = [];
        for (const fact of [...entry.record.problems]) {
            if (fact.code !== "E_MODEL_MISSING_FILE" || fact.params.role !== "texture") {
                continue;
            }

            const name = String(fact.params.name);
            const found = projectPicture(name, entry);
            if (found === undefined || entry.held === undefined) {
                continue;
            }

            const before = entry.record;
            const after = await supplyOne(entry, { name, file: found.bytes });
            if (
                after === before ||
                after.problems.some((p) => p.params.part === cut(name) && p.code.startsWith("E_"))
            ) {
                // The picture would not do: the model waits for the reader as before.
                entry.record = before;
                entry.settled = Promise.resolve(before);
                continue;
            }

            if (found.base) {
                substituted.push({
                    code: "W_MODEL_PART_SUBSTITUTED",
                    params: { name: cut(name), used: cut(found.used) },
                });
            }
        }

        if (substituted.length > 0) {
            entry.record = record({ ...entry.record, problems: [...entry.record.problems, ...substituted] });
            entry.settled = Promise.resolve(entry.record);
        }

        return entry.record;
    };

    const unknownAsset = (id: AssetId): never => {
        throw new GraphtyError({
            code: "E_MODEL_UNKNOWN_ASSET",
            source: "data",
            message: `No accepted model has the id ${id}.`,
            details: { id },
        });
    };

    const api: AssetsApiInternal = {
        async add(source, options = {}) {
            if (options.name !== undefined && !isAssetId(options.name)) {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    source: "data",
                    message: "An asset name is \"asset:\" and letters, digits, '.', '_', '-' or '/'.",
                    details: { name: String(options.name) },
                });
            }

            const geometry = (options.skipped ?? []).find((name) => roleOfName(name) === "geometry");
            if (geometry !== undefined) {
                throw supplyError("E_MODEL_PART_REQUIRED", { name: cut(geometry), role: "geometry" });
            }

            options.signal?.throwIfAborted();
            if (typeof source === "string") {
                const url = parseUrl(source);
                if (url === undefined) {
                    return early(
                        { code: "E_MODEL_FETCH", params: { url: source.slice(0, 256), status: null, offline: false } },
                        `asset:url-${syncHex(source)}`,
                    );
                }

                const known = urls.get(url.href);
                const entry =
                    known !== undefined && options.name === undefined ? known : startUrl(url, options, source);
                return abortable(entry.settled, options.signal);
            }

            let read: Awaited<ReturnType<typeof import("./intake").readSource>>;
            try {
                read = await (await loadIntake()).readSource(source, limits);
            } catch (error) {
                if (!(error instanceof Refusal)) {
                    throw error;
                }

                return early(error.fact, `asset:rejected-${syncHex(JSON.stringify(error.fact))}`);
            }

            options.signal?.throwIfAborted();
            return intake(read.given, options, read.main);
        },

        ready(ref, options = {}) {
            if (isAssetId(ref) && ref.startsWith(SAMPLE_PREFIX)) {
                return abortable(readSample(ref), options.signal);
            }

            if (isAssetId(ref)) {
                const entry = entries.get(ref);
                if (entry === undefined) {
                    return Promise.resolve(
                        record({
                            id: ref,
                            digest: "",
                            byteLength: 0,
                            format: "",
                            state: "rejected",
                            problems: [{ code: "E_MODEL_UNKNOWN_ASSET", params: { id: ref } }],
                        }),
                    );
                }

                return abortable(entry.settled, options.signal);
            }

            return api.add(ref, options.signal === undefined ? {} : { signal: options.signal });
        },

        get(id) {
            return lookup(id)?.record;
        },

        find(ref) {
            return (isAssetId(ref) ? lookup(ref) : undefined)?.record ?? findEntry(ref)?.record;
        },

        list() {
            const listed = new Set([
                ...entries.values(),
                ...[...urls.values()].filter((e) => e.record.state === "pending"),
            ]);
            return Object.freeze([...listed].map((e) => e.record));
        },

        inspect(id) {
            return lookup(id)?.summary ?? unknownAsset(id);
        },

        remove(id) {
            // Also a URL or a provisional id, so a model held for supply can be let go.
            const entry = findEntry(id);
            for (const map of [entries, urls]) {
                for (const [key, each] of map) {
                    if (each === entry || each.record.id === id) {
                        map.delete(key);
                    }
                }
            }
        },

        supply(ref, answer, options = {}) {
            const entry = findEntry(ref);
            if (entry === undefined) {
                return Promise.reject(
                    new GraphtyError({
                        code: "E_MODEL_UNKNOWN_ASSET",
                        source: "data",
                        message: `No model is held as ${ref}.`,
                        details: { id: ref },
                    }),
                );
            }

            const run = async (decided?: Decided): Promise<AssetRecord> => {
                // A URL still downloading settles first, so its parts are known.
                await entry.settled;
                try {
                    return await supplyOne(entry, answer, options.signal, decided);
                } finally {
                    const names = namesOf(entry);
                    for (const watcher of supplyWatchers) {
                        watcher(names);
                    }
                }
            };
            // A part by URL on another host waits for the reader's answer before it takes its turn,
            // so the files and skips handed over meanwhile are not held up behind the question.
            const gate =
                "url" in answer ? entry.settled.then(() => gateFor(entry, answer)) : Promise.resolve(undefined);
            const result = gate.then((decided) => {
                const turn = (entry.chain ?? Promise.resolve()).then(
                    () => run(decided),
                    () => run(decided),
                );
                entry.chain = turn.catch(() => undefined);
                return turn;
            });
            return abortable(result, options.signal);
        },

        async offer(files, options = {}) {
            const waiting = waitingEntries();
            const taken = new Set<string>();
            const supplied: { ref: AssetId; name: string; fileName: string }[] = [];
            const rest: NamedBlob[] = [];
            const runs: Promise<AssetRecord>[] = [];
            for (const file of Array.from(files)) {
                const target = offerTarget(waiting, file, taken);
                if (target === undefined) {
                    rest.push(file);
                    continue;
                }

                const ref = target.entry.record.id;
                taken.add(`${ref}\0${target.name}`);
                supplied.push({ ref, name: target.name, fileName: file.name });
                runs.push(api.supply(ref, { name: target.name, file }, options));
            }

            await Promise.all(runs);
            return Object.freeze({ supplied: Object.freeze(supplied), rest: Object.freeze(rest) });
        },

        waiting() {
            return Object.freeze(waitingEntries().map((entry) => entry.record));
        },

        assembled(id) {
            return lookup(id)?.assembled === true;
        },

        watchSupplied(listener) {
            supplyWatchers.add(listener);
            return () => {
                supplyWatchers.delete(listener);
            };
        },

        files(id) {
            const given = lookup(id)?.given ?? unknownAsset(id);
            return new Map([...given].map(([path, bytes]) => [path, bytes.slice()]));
        },

        setLimits(changes) {
            const next: Record<string, number> = { ...limits };
            for (const [key, value] of Object.entries(changes)) {
                if (
                    !(key in DEFAULT_MODEL_LIMITS) ||
                    typeof value !== "number" ||
                    value <= 0 ||
                    !Number.isFinite(value)
                ) {
                    throw new GraphtyError({
                        code: "E_OPTION_RANGE",
                        source: "config",
                        message: `The model limit ${key} must be a positive number.`,
                        details: { option: key, value: String(value) },
                    });
                }

                next[key] = value;
            }

            limits = Object.freeze(next as unknown as ModelLimits);
        },

        allowHosts(list) {
            for (const host of list) {
                if (typeof host !== "string" || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
                    throw new GraphtyError({
                        code: "E_OPTION_RANGE",
                        source: "config",
                        message: "A host is a host name, such as models.example.com.",
                        details: { option: "hosts", value: host },
                    });
                }

                hosts.add(host.toLowerCase());
            }

            network?.allowHosts(list);
        },

        hostAllowed(host) {
            return hosts.has(host.toLowerCase());
        },

        limits() {
            return limits;
        },

        states() {
            return Object.freeze([...states.values()]);
        },

        noteState(change) {
            states.set(change.ref, change);
        },

        urlRecord(ref) {
            const url = parseUrl(ref);
            const held = url === undefined ? undefined : urls.get(url.href);
            return held?.record.state === "accepted" ? held.record : undefined;
        },

        expectDigest(ref, digest) {
            const url = parseUrl(ref);
            if (url !== undefined) {
                expectedDigests.set(url.href, digest);
            }
        },

        expectedDigest(ref) {
            const url = parseUrl(ref);
            return url === undefined ? undefined : expectedDigests.get(url.href);
        },

        bindUrl(ref, id) {
            const url = parseUrl(ref);
            const entry = entries.get(id);
            if (url !== undefined && entry?.record.state === "accepted") {
                urls.set(url.href, entry);
            }
        },
    };
    // A model a layer named before its file was added loads once the file is accepted.
    const addFirst = api.add;
    api.add = async (source, options = {}) => {
        const added = await addFirst(source, options);
        if (added.state === "accepted") {
            const names = [added.id, ...(options.name === undefined ? [] : [options.name])];
            for (const watcher of supplyWatchers) {
                watcher(names);
            }
        }

        return added;
    };

    return api;
}
