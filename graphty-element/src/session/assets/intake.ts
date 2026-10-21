/**
 * @file Turning what a caller hands `session.assets.add` into a checked file set.
 *
 * read bytes (limits first) -> unpack a .zip -> pick the main file and detect its format by
 * bytes -> check references and structure -> summary. Nothing here decodes geometry or images,
 * and nothing reaches Babylon.js or the DOM (design/rendering/node-models.md section 3).
 */

import { BUILT_IN_MODEL_FORMATS, detectModelFormat, isZip, type ModelFormat } from "../../catalog/detectModel";
import type { CodedFact } from "../shared";
import type { AddAssetOptions, AssetSource, ModelLimits, ModelSummary, NamedBlob } from "./AssetsApi";
import { checkGltf, parseGltfJson, readGlb } from "./gltfChecks";
import { cut, normalizePath, refuse } from "./references";
import { scanObj, scanPly, scanStl } from "./textFormats";
import { unzipModel } from "./unzip";

/** Something with bytes to read: a Blob, a File, or anything shaped like one. */
interface BlobLike {
    readonly size: number;
    arrayBuffer(): Promise<ArrayBuffer>;
}

/** The key a bare byte array is stored under. */
export const BYTES_KEY = "model";

/**
 * Whether a value is shaped like a Blob.
 * @param value - The value.
 * @returns True when it has `size` and `arrayBuffer()`.
 */
function isBlobLike(value: unknown): value is BlobLike {
    return (
        typeof value === "object" &&
        value !== null &&
        typeof (value as BlobLike).arrayBuffer === "function" &&
        typeof (value as BlobLike).size === "number"
    );
}

/**
 * Drop the folder every path shares, so the same model gets the same paths (and id) whichever
 * folder it was dropped from.
 * @param files - Path to bytes.
 * @returns The same files with the common leading folder removed.
 */
export function stripCommonFolder(files: Map<string, Uint8Array>): Map<string, Uint8Array> {
    let current = files;
    for (;;) {
        const paths = [...current.keys()];
        const first = paths[0]?.split("/")[0];
        if (first === undefined || !paths.every((p) => p.startsWith(`${first}/`))) {
            return current;
        }

        current = new Map(paths.map((p) => [p.slice(first.length + 1), current.get(p) as Uint8Array]));
    }
}

/**
 * Read every shape of {@link AssetSource} except a URL into path to bytes, checking the byte
 * limit before reading anything.
 * @param source - The source.
 * @param limits - The limits in force.
 * @returns The file set as given, and the main file the source named.
 */
export async function readSource(
    source: Exclude<AssetSource, string>,
    limits: ModelLimits,
): Promise<{ given: Map<string, Uint8Array>; main?: string }> {
    let entries: [string, BlobLike | Uint8Array][];
    let main: string | undefined;
    if (source instanceof Uint8Array) {
        entries = [[BYTES_KEY, source]];
    } else if (source instanceof ArrayBuffer) {
        entries = [[BYTES_KEY, new Uint8Array(source)]];
    } else if ("files" in source && source.files instanceof Map) {
        entries = [...source.files.entries()];
        ({ main } = source);
    } else if (isBlobLike(source) && typeof source.name === "string") {
        const blob = source;
        entries = [[blob.webkitRelativePath || blob.name, blob]];
    } else {
        const many = source as Iterable<NamedBlob> | ArrayLike<NamedBlob>;
        const blobs = Symbol.iterator in many ? [...many] : Array.from(many);
        entries = blobs.map((blob) => [blob.webkitRelativePath || blob.name, blob]);
    }

    if (entries.length === 0) {
        refuse("E_MODEL_FORMAT_UNKNOWN", { fileName: null });
    }

    const total = entries.reduce(
        (sum, [, value]) => sum + (value instanceof Uint8Array ? value.length : value.size),
        0,
    );
    if (total > limits.maxBytes) {
        refuse("E_MODEL_TOO_LARGE", { what: "bytes", found: total, limit: limits.maxBytes });
    }

    const given = new Map<string, Uint8Array>();
    const lower = new Map<string, string>();
    for (const [name, value] of entries) {
        const path = normalizePath(name);
        if (path === undefined || path === "") {
            refuse("E_MODEL_STRUCTURE", { rule: "path", name: cut(name) });
        }

        const other = lower.get(path.toLowerCase());
        if (other !== undefined) {
            refuse("E_MODEL_AMBIGUOUS", { candidates: [cut(other), cut(path)] });
        }

        lower.set(path.toLowerCase(), path);
        // A copy, so the caller changing its array later cannot change what the digest covers.
        given.set(path, value instanceof Uint8Array ? value.slice() : new Uint8Array(await value.arrayBuffer()));
    }

    const stripped = stripCommonFolder(given);
    if (main !== undefined && stripped !== given) {
        const prefix = [...given.keys()][0].slice(0, [...given.keys()][0].length - [...stripped.keys()][0].length);
        main = main.startsWith(prefix) ? main.slice(prefix.length) : main;
    }

    return { given: stripped, ...(main === undefined ? {} : { main }) };
}

/**
 * The URL as it may appear in a fact: no query, no fragment, no credentials.
 * @param url - The URL.
 * @returns origin + path.
 */
export function shownUrl(url: URL): string {
    return cut(url.origin === "null" ? `${url.protocol}${url.pathname}` : `${url.origin}${url.pathname}`);
}

/** The fetch this module calls, typed without the DOM. */
type FetchLike = (
    url: string,
    init: Record<string, unknown>,
) => Promise<{
    ok: boolean;
    status: number;
    headers: { get(name: string): string | null };
    body: { getReader(): { read(): Promise<{ done: boolean; value?: Uint8Array }>; cancel(): Promise<void> } } | null;
    arrayBuffer(): Promise<ArrayBuffer>;
}>;

/**
 * Fetch a model with no credentials, no referrer, a time limit and a byte cap enforced while the
 * body streams.
 * @param url - The URL.
 * @param limits - The limits in force.
 * @param signal - The caller's signal.
 * @returns The file set: the one fetched file, named after the URL's last path segment.
 */
export async function fetchModel(
    url: URL,
    limits: ModelLimits,
    signal?: AbortSignal,
): Promise<Map<string, Uint8Array>> {
    if (url.protocol !== "https:" && url.protocol !== "http:") {
        refuse("E_MODEL_URL_BLOCKED", { hosts: [cut(url.host)], scheme: url.protocol });
    }

    if (url.username !== "" || url.password !== "") {
        refuse("E_MODEL_URL_BLOCKED", { hosts: [cut(url.host)], credentials: true });
    }

    const shown = shownUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => {
        controller.abort();
    }, limits.fetchTimeoutMs);
    const onAbort = (): void => {
        controller.abort();
    };
    signal?.addEventListener("abort", onAbort);
    const offline = (): boolean => (globalThis as { navigator?: { onLine?: boolean } }).navigator?.onLine === false;
    try {
        const fetchFn = (globalThis as unknown as { fetch: FetchLike }).fetch;
        let response: Awaited<ReturnType<FetchLike>>;
        try {
            response = await fetchFn(url.href, {
                mode: "cors",
                credentials: "omit",
                referrerPolicy: "no-referrer",
                redirect: "follow",
                signal: controller.signal,
            });
        } catch {
            signal?.throwIfAborted();
            refuse("E_MODEL_FETCH", { url: shown, status: null, offline: offline() });
        }

        if (!response.ok) {
            refuse("E_MODEL_FETCH", { url: shown, status: response.status, offline: false });
        }

        const declared = Number(response.headers.get("content-length"));
        if (Number.isFinite(declared) && declared > limits.maxBytes) {
            refuse("E_MODEL_TOO_LARGE", { what: "bytes", found: declared, limit: limits.maxBytes });
        }

        const chunks: Uint8Array[] = [];
        let total = 0;
        try {
            if (response.body === null) {
                chunks.push(new Uint8Array(await response.arrayBuffer()));
                total = chunks[0].length;
            } else {
                const reader = response.body.getReader();
                for (;;) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }

                    total += value?.length ?? 0;
                    if (total > limits.maxBytes) {
                        await reader.cancel();
                        break;
                    }

                    if (value !== undefined) {
                        chunks.push(value);
                    }
                }
            }
        } catch {
            signal?.throwIfAborted();
            refuse("E_MODEL_FETCH", { url: shown, status: null, offline: offline() });
        }

        if (total > limits.maxBytes) {
            refuse("E_MODEL_TOO_LARGE", { what: "bytes", found: total, limit: limits.maxBytes });
        }

        const bytes = new Uint8Array(total);
        let at = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, at);
            at += chunk.length;
        }

        let name = BYTES_KEY;
        try {
            name = decodeURIComponent(url.pathname.slice(url.pathname.lastIndexOf("/") + 1)) || BYTES_KEY;
        } catch {
            // A malformed escape in the path: keep the plain key.
        }

        return new Map([[normalizePath(name) || BYTES_KEY, bytes]]);
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
    }
}

/** A file set that passed every check. */
export interface CheckedModel {
    /** The files the checks read: the given set, or a zip's entries. */
    readonly files: ReadonlyMap<string, Uint8Array>;
    /** The main file's path in `files`. */
    readonly main: string;
    readonly format: ModelFormat;
    readonly summary: ModelSummary;
    readonly warnings: readonly CodedFact[];
}

/** Ranks of formats graphty-element recognizes but does not load: after every built-in one. */
const UNSUPPORTED_RANK = BUILT_IN_MODEL_FORMATS.length;

/**
 * Choose the main file of a set (design 3.2): ranked GLB, glTF, OBJ, STL, PLY, then formats the
 * element does not load; of files sharing a base name only the best ranked counts; two different
 * candidates of the best rank are ambiguous.
 * @param files - The set.
 * @param forced - A format the caller forced.
 * @returns The main path and its format.
 */
function chooseMain(
    files: ReadonlyMap<string, Uint8Array>,
    forced?: ModelFormat,
): { path: string; format: ModelFormat; supported: boolean } {
    const candidates: { path: string; format: ModelFormat; supported: boolean; rank: number }[] = [];
    for (const [path, bytes] of files) {
        const found = detectModelFormat({ filename: path, head: bytes });
        if (found === undefined || found.format === "zip") {
            continue;
        }

        const rank = found.supported
            ? (BUILT_IN_MODEL_FORMATS as readonly string[]).indexOf(found.format)
            : UNSUPPORTED_RANK;
        candidates.push({ path, ...found, rank: rank < 0 ? UNSUPPORTED_RANK : rank });
    }

    if (candidates.length === 0) {
        if (forced !== undefined && files.size === 1) {
            const [path] = files.keys();
            return { path, format: forced, supported: true };
        }

        refuse("E_MODEL_FORMAT_UNKNOWN", { fileName: cut([...files.keys()][0] ?? "") });
    }

    // Of files with the same base name (rack.glb, rack.obj, rack.fbx), keep the best ranked.
    const byBase = new Map<string, (typeof candidates)[number]>();
    for (const candidate of candidates) {
        const base = candidate.path.replace(/\.[^./]*$/, "").toLowerCase();
        const held = byBase.get(base);
        if (held === undefined || candidate.rank < held.rank) {
            byBase.set(base, candidate);
        }
    }

    const kept = [...byBase.values()];
    const best = Math.min(...kept.map((c) => c.rank));
    const top = kept.filter((c) => c.rank === best);
    if (top.length > 1) {
        refuse("E_MODEL_AMBIGUOUS", { candidates: top.map((c) => cut(c.path)).sort() });
    }

    return { ...top[0], ...(forced === undefined ? {} : { format: forced, supported: true }) };
}

/**
 * Run every check on a file set.
 * @param given - The file set as given.
 * @param options - The caller's main file and format, if any.
 * @param limits - The limits in force.
 * @returns The checked model.
 * @throws Refusal for the first problem found.
 */
export async function checkFileSet(
    given: ReadonlyMap<string, Uint8Array>,
    options: Pick<AddAssetOptions, "main" | "format">,
    limits: ModelLimits,
): Promise<CheckedModel> {
    let files = given;
    if (given.size === 1) {
        const [only] = given.values();
        if (isZip(only) && detectModelFormat({ filename: [...given.keys()][0], head: only })?.format === "zip") {
            files = stripCommonFolder(await unzipModel(only, limits.maxBytes));
        }
    }

    let main: { path: string; format: ModelFormat; supported: boolean };
    if (options.main !== undefined) {
        const path = normalizePath(options.main);
        if (path === undefined || !files.has(path)) {
            refuse("E_MODEL_MISSING_FILE", { name: cut(options.main), referencedBy: null });
        }

        const found = detectModelFormat({ filename: path, head: files.get(path) });
        main =
            options.format === undefined
                ? { path, format: found?.format ?? "", supported: found?.supported ?? false }
                : { path, format: options.format, supported: true };
    } else {
        main = chooseMain(files, options.format);
    }

    if (!main.supported || !(BUILT_IN_MODEL_FORMATS as readonly string[]).includes(main.format)) {
        if (main.format === "") {
            refuse("E_MODEL_FORMAT_UNKNOWN", { fileName: cut(main.path) });
        }

        refuse("E_MODEL_FORMAT_UNSUPPORTED", { format: main.format, fileName: cut(main.path) });
    }

    const bytes = files.get(main.path) as Uint8Array;
    let checked: { summary: ModelSummary; warnings: readonly CodedFact[] };
    switch (main.format) {
        case "glb": {
            const { text, bin } = readGlb(bytes);
            checked = checkGltf({
                json: parseGltfJson(text),
                ...(bin === undefined ? {} : { bin }),
                path: main.path,
                files,
                limits,
                format: "glb",
            });
            break;
        }
        case "gltf": {
            let text: string;
            try {
                text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
            } catch {
                refuse("E_MODEL_STRUCTURE", { rule: "json" });
            }

            checked = checkGltf({ json: parseGltfJson(text), path: main.path, files, limits, format: "gltf" });
            break;
        }
        case "obj":
            checked = scanObj(main.path, files, limits);
            break;
        case "stl":
            checked = scanStl(bytes, limits);
            break;
        default:
            checked = scanPly(bytes, limits);
    }

    return { files, main: main.path, format: main.format, ...checked };
}
