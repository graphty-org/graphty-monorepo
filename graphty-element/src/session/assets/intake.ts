/**
 * @file Turning what a caller hands `session.assets.add` into a checked file set.
 *
 * read bytes (limits first) -> unpack a .zip -> pick the main file and detect its format by
 * bytes -> check references and structure -> summary. Nothing here decodes geometry or images,
 * and nothing reaches Babylon.js or the DOM (design/rendering/node-models.md section 3).
 */

import {
    BUILT_IN_MODEL_FORMATS,
    detectModelFormat,
    imageFormatOf,
    isZip,
    type ModelFormat,
} from "../../catalog/detectModel";
import { isPrivateHost } from "../network";
import type { CodedFact } from "../shared";
import type { AddAssetOptions, AssetSource, ModelLimits, ModelSummary, NamedBlob } from "./AssetsApi";
import { checkGltf, findGltfParts, parseGltfJson, readGlb } from "./gltfChecks";
import {
    baseName,
    cut,
    type Findings,
    imageSize,
    normalizePath,
    Refusal,
    refuse,
    refuseAll,
    roleOfName,
} from "./references";
import { findObjParts, scanObj, scanPly, scanStl, withSkips } from "./textFormats";
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
 * A set that is one `.zip` as its entries (design 3.1), so a model's id covers the files it holds
 * however they arrived: a zip, a folder or parts supplied one by one.
 * @param given - The set as given.
 * @param limits - The limits in force.
 * @returns The zip's entries without their common folder, or the set unchanged.
 * @throws Refusal `E_MODEL_ZIP` or `E_MODEL_TOO_LARGE` for a zip that cannot be read safely.
 */
export async function unpackZip(
    given: ReadonlyMap<string, Uint8Array>,
    limits: ModelLimits,
): Promise<ReadonlyMap<string, Uint8Array>> {
    if (given.size !== 1) {
        return given;
    }

    const [[name, only]] = given;
    if (!isZip(only) || detectModelFormat({ filename: name, head: only })?.format !== "zip") {
        return given;
    }

    return stripCommonFolder(await unzipModel(only, limits.maxBytes));
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
    /** True when the answer came from another address than the one asked for. */
    redirected?: boolean;
    /** The address that answered. */
    url?: string;
    headers: { get(name: string): string | null };
    body: {
        getReader(): { read(): Promise<{ done: boolean; value?: Uint8Array }>; cancel(): Promise<void> };
        cancel?(): Promise<void>;
    } | null;
    arrayBuffer(): Promise<ArrayBuffer>;
}>;

/**
 * What a fetch asks when an answer was redirected to another host: undefined to read the answer
 * as it is, else a question whose answer is why not, or undefined to fetch the address it was
 * sent to once the reader allowed it.
 */
export type RedirectGate = (from: URL, to: URL) => Promise<CodedFact | undefined> | undefined;

/** The most redirects to another host one fetch follows, each asked about again. */
const MAX_REDIRECT_HOPS = 4;

/**
 * Why an answer redirected from one address to another is not read, whoever asked: an address
 * that is not a web address, or a private, loopback or link-local one reached from one that is not.
 * @param from - The address asked for.
 * @param to - The address that answered.
 * @returns The refusal, or undefined.
 */
function redirectRefusal(from: URL, to: URL): CodedFact | undefined {
    if (to.protocol !== "https:" && to.protocol !== "http:") {
        return {
            code: "E_MODEL_URL_BLOCKED",
            params: { hosts: [cut(to.host)], scheme: to.protocol, redirected: true },
        };
    }

    if (isPrivateHost(to.hostname) && !isPrivateHost(from.hostname)) {
        return { code: "E_MODEL_URL_BLOCKED", params: { hosts: [cut(to.host)], redirected: true } };
    }

    return undefined;
}

/**
 * Fetch a model with no credentials, no referrer, a time limit and a byte cap enforced while the
 * body streams.
 * @param url - The URL.
 * @param limits - The limits in force.
 * @param signal - The caller's signal.
 * @param gate - What to ask when the answer comes from another host; none reads it.
 * @param hops - Redirects to another host followed so far.
 * @returns The file set: the one fetched file, named after the URL's last path segment.
 */
export async function fetchModel(
    url: URL,
    limits: ModelLimits,
    signal?: AbortSignal,
    gate?: RedirectGate,
    hops = 0,
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

        // An answer from another address is read only once that address may be reached (design
        // 2.6): never a private one from a public one, and another host only as `gate` says.
        // ponytail: the redirected request has already been sent; redirect "manual" would stop it
        // but breaks every host that hands its files to a CDN.
        if (response.redirected === true && typeof response.url === "string" && response.url !== url.href) {
            let to: URL | undefined;
            try {
                to = new URL(response.url);
            } catch {
                to = undefined;
            }

            const refusal = to === undefined ? undefined : redirectRefusal(url, to);
            const asking = to === undefined || to.host === url.host ? undefined : gate?.(url, to);
            if (to === undefined || refusal !== undefined || asking !== undefined) {
                await response.body?.cancel?.().catch(() => undefined);
                const why = refusal ?? (await asking);
                if (why !== undefined) {
                    refuse(why.code, why.params);
                }

                if (to === undefined || hops >= MAX_REDIRECT_HOPS) {
                    refuse("E_MODEL_FETCH", { url: shown, status: "redirect", offline: false });
                }

                // The reader allowed the host it was sent to: fetch that address.
                return await fetchModel(to, limits, signal, gate, hops + 1);
            }
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

/** The most files a model fetched by URL may load beside its main file. */
export const MAX_COMPANION_FILES = 64;

/** The most requests the automatic tries make for one part beyond its first (design 12.2). */
export const MAX_EXTRA_REQUESTS = 16;

/** The most addresses `E_MODEL_MISSING_FILE.tried` lists. */
const MAX_TRIED_SHOWN = 4;

/**
 * Whether a file is a web page (design 12.6): after a byte order mark and whitespace, within its
 * first 1,024 bytes, it opens with `<!doctype html`, `<html`, `<head` or `<body`, and its bytes
 * match no model or picture format. The type header decides nothing.
 * @param bytes - The file.
 * @returns True for an HTML page.
 */
export function isWebPage(bytes: Uint8Array): boolean {
    if (isZip(bytes) || imageFormatOf(bytes) !== undefined) {
        return false;
    }

    let at = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
    while (at < 1024 && at < bytes.length && [0x20, 0x09, 0x0a, 0x0d, 0x0c].includes(bytes[at])) {
        at++;
    }

    if (at >= 1024) {
        return false;
    }

    const head = String.fromCharCode(...bytes.subarray(at, at + 14)).toLowerCase();
    return /^(?:<!doctype html|<html|<head|<body)/.test(head);
}

/**
 * Whether an address is a page about a file rather than the file, known by its address alone: a
 * GitHub or GitLab `blob` page, a Sketchfab model page or a Poly Pizza model page. Such hosts
 * answer a page with no cross-origin header, so a browser fetch of one fails before its bytes
 * could tell (design 12.6).
 * @param url - The address.
 * @returns True for such a page.
 */
export function isKnownWebPage(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return (
        (host === "github.com" && /^\/[^/]+\/[^/]+\/blob\//.test(url.pathname)) ||
        url.pathname.includes("/-/blob/") ||
        ((host === "sketchfab.com" || host === "www.sketchfab.com") && url.pathname.startsWith("/3d-models/")) ||
        ((host === "poly.pizza" || host === "www.poly.pizza") && url.pathname.startsWith("/m/"))
    );
}

/**
 * The params of `E_MODEL_WEB_PAGE`, with `suggested` when the file behind the page is known by
 * the page's address alone: a GitHub or GitLab `blob` page's raw file. Nothing is fetched.
 * @param url - The address that answered with a page.
 * @param part - The part's name, for a part.
 * @returns The params.
 */
export function webPageParams(url: URL, part?: string): Record<string, string> {
    let suggested: string | undefined;
    const github = /^\/([^/]+)\/([^/]+)\/blob\/(.+)$/.exec(url.pathname);
    const gitlab = url.pathname.indexOf("/-/blob/");
    if (url.hostname === "github.com" && github !== null) {
        suggested = `https://raw.githubusercontent.com/${github[1]}/${github[2]}/${github[3]}`;
    } else if (gitlab > 0) {
        suggested = `${url.origin}${url.pathname.slice(0, gitlab)}/-/raw/${url.pathname.slice(gitlab + 8)}`;
    }

    return {
        url: shownUrl(url),
        host: cut(url.host),
        ...(part === undefined ? {} : { part: cut(part) }),
        ...(suggested === undefined ? {} : { suggested: cut(suggested) }),
    };
}

/**
 * The paths the automatic tries ask for, in order (design 12.2): beside the main file, then for
 * a picture its base name beside the main file and in `textures/` and `Textures/` below it.
 * @param name - The missing part's path in the set.
 * @param role - The part's role.
 * @returns The paths, each once.
 */
function triesFor(name: string, role: unknown): string[] {
    const base = baseName(name);
    const paths = role === "texture" ? [name, base, `textures/${base}`, `Textures/${base}`] : [name];
    return [...new Set(paths)];
}

/**
 * Fetch a model by URL with the files it references: a .gltf's .bin and images, an .obj's .mtl
 * and the images the .mtl names. Each is tried at the addresses of design 12.2, all on the main
 * file's origin and in its folder or below; the set's total, misses included, is held to
 * `maxBytes`, at most {@link MAX_COMPANION_FILES} files are added and at most
 * {@link MAX_EXTRA_REQUESTS} requests beyond the first are made for one part. A reference outside
 * that tree, or to another host, stays refused by the checks (`E_MODEL_EXTERNAL_URL`). Every part
 * still missing after its tries is reported at once, with the addresses tried.
 * @param url - The main file's URL.
 * @param limits - The limits in force.
 * @param signal - The caller's signal.
 * @param gate - What to ask when an answer comes from another host.
 * @returns The file set and its main file (none for a zip, whose main file is inside it).
 */
export async function fetchModelSet(
    url: URL,
    limits: ModelLimits,
    signal?: AbortSignal,
    gate?: RedirectGate,
): Promise<{ given: Map<string, Uint8Array>; main?: string }> {
    if (isKnownWebPage(url)) {
        refuse("E_MODEL_WEB_PAGE", webPageParams(url));
    }

    const given = await fetchModel(url, limits, signal, gate);
    const [[main, first]] = given;
    if (isWebPage(first)) {
        refuse("E_MODEL_WEB_PAGE", webPageParams(url));
    }

    // A zip is unpacked by the checks as a dropped one is, and never triggers the tries.
    if (isZip(first)) {
        return { given };
    }

    if (imageFormatOf(first) !== undefined) {
        return { given, main };
    }

    let total = first.length;
    const tried = new Map<string, string[]>();
    for (;;) {
        let facts: readonly CodedFact[];
        try {
            await checkFileSet(given, { main }, limits);
            return { given, main };
        } catch (error) {
            if (!(error instanceof Refusal)) {
                throw error;
            }

            ({ facts } = error);
        }

        const parts = facts.every((f) => f.code === "E_MODEL_MISSING_FILE" || f.code === "E_MODEL_PART_AMBIGUOUS");
        const fresh = facts.filter((f) => f.code === "E_MODEL_MISSING_FILE" && !tried.has(String(f.params.name)));
        if (!parts || fresh.length === 0) {
            const [first, ...more] = facts.map((f) => {
                const shown = f.code === "E_MODEL_MISSING_FILE" ? tried.get(String(f.params.name)) : undefined;
                return shown === undefined ? f : { code: f.code, params: { ...f.params, tried: shown } };
            });
            const refusal = new Refusal(first.code, { ...first.params }, more);
            // Only parts are missing: the session holds what was fetched, for supply (design 12.4).
            if (parts) {
                refusal.held = { given, main };
            }

            throw refusal;
        }

        for (const fact of fresh) {
            const name = String(fact.params.name);
            const shown: string[] = [];
            tried.set(name, shown);
            let requests = 0;
            for (const path of triesFor(name, fact.params.role)) {
                if (given.size > MAX_COMPANION_FILES) {
                    refuse("E_MODEL_TOO_LARGE", { what: "count", found: given.size, limit: MAX_COMPANION_FILES });
                }

                // The path is normalized with no ".." left: the URL it resolves to is on the same
                // origin and inside the main file's folder.
                const address = new URL(path.split("/").map(encodeURIComponent).join("/"), url);
                if (shown.length < MAX_TRIED_SHOWN) {
                    shown.push(shownUrl(address));
                }

                // Beside the address as written, the same one with the main URL's query once, when
                // a signed URL's companion is refused without it.
                const signed = new URL(address);
                signed.search = url.search;
                const attempts = url.search === "" ? [address] : [address, signed];
                let bytes: Uint8Array | undefined;
                for (const attempt of attempts) {
                    if (requests > MAX_EXTRA_REQUESTS) {
                        break;
                    }

                    requests++;
                    try {
                        [bytes] = (
                            await fetchModel(
                                attempt,
                                { ...limits, maxBytes: Math.max(0, limits.maxBytes - total) },
                                signal,
                                gate,
                            )
                        ).values();
                        break;
                    } catch (error) {
                        if (!(error instanceof Refusal) || error.fact.code !== "E_MODEL_FETCH") {
                            throw error;
                        }

                        if (error.fact.params.status !== 401 && error.fact.params.status !== 403) {
                            break;
                        }
                    }
                }

                if (bytes === undefined) {
                    continue;
                }

                total += bytes.length;
                // A host that answers every miss with its own page has not got the file.
                if (!isWebPage(bytes)) {
                    given.set(path, bytes);
                    break;
                }
            }
        }
    }
}

/**
 * Run every check on a file set: one picture is an image asset (a texture), anything else a model.
 * A picture is checked from its header: its size must be readable, and its decoded bytes are held
 * to `maxTextureBytes`; one wider or taller than `maxTextureSize` is drawn smaller.
 * @param given - The file set as given.
 * @param options - The caller's main file and format, if any.
 * @param limits - The limits in force.
 * @returns The checked asset and its kind.
 * @throws Refusal for the first problem found.
 */
export async function checkAsset(
    given: ReadonlyMap<string, Uint8Array>,
    options: Pick<AddAssetOptions, "main" | "format" | "skipped">,
    limits: ModelLimits,
): Promise<CheckedModel & { readonly kind: "model" | "image" }> {
    const [[path, bytes]] = given;
    const format = given.size === 1 ? imageFormatOf(bytes) : undefined;
    if (format === undefined) {
        const skipped = options.skipped ?? [];
        const checked = await checkFileSet(withSkips(given, skipped), options, limits);
        return {
            kind: "model",
            ...checked,
            warnings: [
                ...checked.warnings,
                ...skipped.map((name) => ({
                    code: "W_MODEL_PART_SKIPPED",
                    params: { name: cut(name), role: roleOfName(name) },
                })),
            ],
        };
    }

    const size = imageSize(bytes);
    if (size === undefined || size.width === 0 || size.height === 0) {
        refuse("E_MODEL_STRUCTURE", { rule: "image", name: cut(path) });
    }

    const textureBytes = Math.ceil((size.width * size.height * 4 * 4) / 3);
    if (textureBytes > limits.maxTextureBytes) {
        refuse("E_MODEL_TOO_LARGE", { what: "textureBytes", found: textureBytes, limit: limits.maxTextureBytes });
    }

    const largest = Math.max(size.width, size.height);
    return {
        kind: "image",
        files: given,
        main: path,
        format,
        summary: {
            format,
            triangles: 0,
            meshes: 0,
            materials: [],
            textures: 1,
            textureBytes,
            upAxis: "unknown",
            animations: [],
            skinned: false,
            morphTargets: 0,
            transparent: false,
            extensionsRequired: [],
        },
        warnings:
            largest > limits.maxTextureSize
                ? [{ code: "W_MODEL_TEXTURES_REDUCED", params: { from: largest, to: limits.maxTextureSize } }]
                : [],
    };
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

/**
 * The main file of a set that could not be checked yet (it waits for parts): the one named, else
 * the one the checks would choose.
 * @param files - The set, a zip already unpacked.
 * @param options - The caller's main file and format.
 * @returns Its path, or undefined when none can be told.
 */
export function mainPathOf(
    files: ReadonlyMap<string, Uint8Array>,
    options: Pick<AddAssetOptions, "main" | "format">,
): string | undefined {
    if (options.main !== undefined) {
        return normalizePath(options.main);
    }

    try {
        return chooseMain(files, options.format).path;
    } catch {
        return undefined;
    }
}

/** The most candidates `E_MODEL_AMBIGUOUS` lists; `more` counts the rest. */
const MAX_CANDIDATES = 64;

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
        const candidates = top.map((c) => cut(c.path)).sort();
        refuse("E_MODEL_AMBIGUOUS", {
            candidates: candidates.slice(0, MAX_CANDIDATES),
            ...(candidates.length > MAX_CANDIDATES ? { more: candidates.length - MAX_CANDIDATES } : {}),
        });
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
    // Every part the model names is looked up first, so every missing one is reported at once.
    const findings: Findings = { warnings: [], missing: [] };
    const found = (): void => {
        if (findings.missing.length > 0) {
            refuseAll(findings.missing);
        }
    };
    let checked: { summary: ModelSummary; warnings: readonly CodedFact[] };
    switch (main.format) {
        case "glb": {
            const { text, bin } = readGlb(bytes);
            const json = parseGltfJson(text);
            findGltfParts(json, main.path, files, findings);
            found();
            checked = checkGltf({
                json,
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

            const json = parseGltfJson(text);
            findGltfParts(json, main.path, files, findings);
            found();
            checked = checkGltf({ json, path: main.path, files, limits, format: "gltf" });
            break;
        }
        case "obj":
            findObjParts(main.path, files, limits, findings);
            found();
            checked = scanObj(main.path, files, limits);
            break;
        case "stl":
            checked = scanStl(bytes, limits);
            break;
        default:
            checked = scanPly(bytes, limits);
    }

    return {
        files,
        main: main.path,
        format: main.format,
        summary: checked.summary,
        warnings: [...findings.warnings, ...checked.warnings],
    };
}
