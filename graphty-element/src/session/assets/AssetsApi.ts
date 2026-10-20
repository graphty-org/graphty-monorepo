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

import type { BuiltInModelFormat, ModelFormat } from "../../catalog/detectModel";
import { GraphtyError } from "../../errors";
import type { NetworkApiInternal } from "../network";
import type { CodedFact } from "../shared";
import type { ModelChange } from "../types";
import { type AssetId, isAssetId, SAMPLE_PREFIX } from "./assetId";
import { digestFileSet, sha256Fallback } from "./digest";
import { Refusal } from "./references";

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

export type { BuiltInModelFormat, ModelFormat };

export { type AssetId, isAssetId, SAMPLE_PREFIX };

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
    readonly signal?: AbortSignal;
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
    /** What the asset is; only models today. */
    readonly kind: "model";
    /** SHA-256 of the file set as given, as hex (empty while pending). */
    readonly digest: string;
    /** The bytes of the file set as given. */
    readonly byteLength: number;
    /** The main file's format; empty when it was never detected. */
    readonly format: ModelFormat;
    /** The main file's path inside the set, cut to 256 characters. */
    readonly path?: string;
    /** `pending` while a URL downloads; `accepted` once checked; `rejected` with its `E_MODEL_*` in `problems`. */
    readonly state: AssetState;
    /** Why it was rejected (`E_MODEL_*`), and what is worth knowing about it (`W_MODEL_*`). */
    readonly problems: readonly CodedFact[];
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
     * Remove an asset. Nothing happens for an unknown id.
     * @param id - The id.
     */
    remove(id: AssetId): void;
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
}

/** What the session keeps per asset. */
interface Entry {
    record: AssetRecord;
    settled: Promise<AssetRecord>;
    given?: ReadonlyMap<string, Uint8Array>;
    summary?: ModelSummary;
}

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
function record(fields: Omit<AssetRecord, "kind">): AssetRecord {
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
    const lookup = (id: AssetId): Entry | undefined => entries.get(id) ?? samples.get(id);

    /**
     * Bytes held, counting each digest once.
     * @returns The total.
     */
    const storedBytes = (): number => {
        const seen = new Map<string, number>();
        for (const entry of entries.values()) {
            if (entry.record.state === "accepted") {
                seen.set(entry.record.digest, entry.record.byteLength);
            }
        }

        return [...seen.values()].reduce((sum, n) => sum + n, 0);
    };

    /**
     * Check a file set and settle its record.
     * @param given - The files as given.
     * @param options - The caller's options.
     * @param main - A main file the source itself named.
     * @param sample - True for one of the element's samples, which is kept apart from the session's assets.
     * @returns The settled record.
     */
    const intake = async (
        given: ReadonlyMap<string, Uint8Array>,
        options: AddAssetOptions,
        main?: string,
        sample = false,
    ): Promise<AssetRecord> => {
        const digest = await digestFileSet(given);
        options.signal?.throwIfAborted();
        const byteLength = [...given.values()].reduce((sum, bytes) => sum + bytes.length, 0);
        const id: AssetId = options.name ?? `asset:${digest}`;
        if (id.startsWith(SAMPLE_PREFIX) && !sample) {
            return record({
                id,
                digest,
                byteLength,
                format: "",
                state: "rejected",
                problems: [{ code: "E_MODEL_NAME_TAKEN", params: { id } }],
            });
        }

        const held = entries.get(id);
        if (held !== undefined && held.record.state !== "pending") {
            if (held.record.digest === digest) {
                return held.record;
            }

            return record({
                id,
                digest,
                byteLength,
                format: "",
                state: "rejected",
                problems: [{ code: "E_MODEL_NAME_TAKEN", params: { id } }],
            });
        }

        let settled: AssetRecord;
        let summary: ModelSummary | undefined;
        try {
            const checked = await (
                await loadIntake()
            ).checkFileSet(
                given,
                { ...options, ...(options.main === undefined && main !== undefined ? { main } : {}) },
                limits,
            );
            ({ summary } = checked);
            settled = record({
                id,
                digest,
                byteLength,
                format: checked.format,
                path: checked.main.slice(0, 256),
                state: "accepted",
                problems: checked.warnings,
            });
            const already = [...entries.values()].some(
                (e) => e.record.digest === digest && e.record.state === "accepted",
            );
            if (!sample && !already && storedBytes() + byteLength > limits.sessionBytes) {
                summary = undefined;
                settled = record({
                    id,
                    digest,
                    byteLength,
                    format: checked.format,
                    state: "rejected",
                    problems: [
                        {
                            code: "E_MODEL_TOO_LARGE",
                            params: {
                                what: "sessionBytes",
                                found: storedBytes() + byteLength,
                                limit: limits.sessionBytes,
                            },
                        },
                    ],
                });
            }
        } catch (error) {
            if (!(error instanceof Refusal)) {
                throw error;
            }

            settled = record({ id, digest, byteLength, format: "", state: "rejected", problems: [error.fact] });
        }

        (sample ? samples : entries).set(id, {
            record: settled,
            settled: Promise.resolve(settled),
            ...(summary === undefined ? {} : { summary, given }),
        });
        return settled;
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
    const early = (fact: CodedFact, provisional: AssetId): AssetRecord =>
        record({ id: provisional, digest: "", byteLength: 0, format: "", state: "rejected", problems: [fact] });

    /**
     * Fetch a URL once and settle its record, shared by every caller asking for it.
     * @param url - The URL.
     * @param options - The caller's options.
     * @returns The URL's entry.
     */
    const startUrl = (url: URL, options: AddAssetOptions): Entry => {
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
                const fetched = await (await loadIntake()).fetchModelSet(url, limits);
                settled = await intake(fetched.given, shared, fetched.main);
            } catch (error) {
                if (!(error instanceof Refusal)) {
                    throw error;
                }

                settled = early(error.fact, provisional);
            }

            entry.record = settled;
            return settled;
        })();
        urls.set(url.href, entry);
        return entry;
    };

    /**
     * Parse what a layer named as a URL.
     * @param ref - The string.
     * @returns The URL, or undefined.
     */
    const parseUrl = (ref: string): URL | undefined => {
        try {
            return new URL(ref, (globalThis as { location?: { href?: string } }).location?.href);
        } catch {
            return undefined;
        }
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
                const entry = known !== undefined && options.name === undefined ? known : startUrl(url, options);
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

        list() {
            return Object.freeze(
                [...entries.values(), ...[...urls.values()].filter((e) => e.record.state === "pending")].map(
                    (e) => e.record,
                ),
            );
        },

        inspect(id) {
            return lookup(id)?.summary ?? unknownAsset(id);
        },

        remove(id) {
            entries.delete(id);
            for (const [href, entry] of urls) {
                if (entry.record.id === id) {
                    urls.delete(href);
                }
            }
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
                    !(value > 0) ||
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

        bindUrl(ref, id) {
            const url = parseUrl(ref);
            const entry = entries.get(id);
            if (url !== undefined && entry?.record.state === "accepted") {
                urls.set(url.href, entry);
            }
        },
    };

    return api;
}
