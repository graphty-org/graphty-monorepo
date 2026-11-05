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

/** A file of a source before it is read: its name and its bytes or blob. */
type SourceEntry = [string, BlobLike | Uint8Array];

/**
 * The files a source holds, unread, and the main file it named.
 * @param source - The source.
 * @returns The entries and the main file, if any.
 */
function entriesOfSource(source: Exclude<AssetSource, string>): { entries: SourceEntry[]; main?: string } {
    if (source instanceof Uint8Array) {
        return { entries: [[BYTES_KEY, source]] };
    }

    if (source instanceof ArrayBuffer) {
        return { entries: [[BYTES_KEY, new Uint8Array(source)]] };
    }

    if ("files" in source && source.files instanceof Map) {
        return { entries: [...source.files.entries()], main: source.main };
    }

    if (isBlobLike(source) && typeof source.name === "string") {
        return { entries: [[source.webkitRelativePath || source.name, source]] };
    }

    const many = source as Iterable<NamedBlob> | ArrayLike<NamedBlob>;
    const blobs = Symbol.iterator in many ? [...many] : Array.from(many);
    return { entries: blobs.map((blob) => [blob.webkitRelativePath || blob.name, blob]) };
}

/**
 * Read entries into path to bytes, refusing a bad path and two paths that differ only by case.
 * @param entries - The entries.
 * @returns Normalized path to a copy of the bytes.
 */
async function readEntries(entries: readonly SourceEntry[]): Promise<Map<string, Uint8Array>> {
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

    return given;
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
    const read = entriesOfSource(source);
    const { entries } = read;
    let { main } = read;
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

    const given = await readEntries(entries);
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

/** What the fetch this module calls answers. */
type FetchResponse = Awaited<ReturnType<FetchLike>>;

/** What a fetch carries into the redirect it follows. */
interface FetchContext {
    readonly limits: ModelLimits;
    readonly signal: AbortSignal | undefined;
    readonly gate: RedirectGate | undefined;
    readonly hops: number;
    readonly shown: string;
}

/**
 * Whether the browser says it is offline.
 * @returns True only when `navigator.onLine` is false.
 */
function isOffline(): boolean {
    return (globalThis as { navigator?: { onLine?: boolean } }).navigator?.onLine === false;
}

/**
 * Refuse an address a model is never fetched from: not a web address, or one with credentials.
 * @param url - The URL.
 */
function checkFetchable(url: URL): void {
    if (url.protocol !== "https:" && url.protocol !== "http:") {
        refuse("E_MODEL_URL_BLOCKED", { hosts: [cut(url.host)], scheme: url.protocol });
    }

    if (url.username !== "" || url.password !== "") {
        refuse("E_MODEL_URL_BLOCKED", { hosts: [cut(url.host)], credentials: true });
    }
}

/**
 * Send the request: no credentials, no referrer, redirects followed.
 * @param url - The URL.
 * @param abort - The signal that ends the request.
 * @param signal - The caller's signal.
 * @param shown - The URL as a fact shows it.
 * @returns The answer.
 */
async function send(
    url: URL,
    abort: AbortSignal,
    signal: AbortSignal | undefined,
    shown: string,
): Promise<FetchResponse> {
    const fetchFn = (globalThis as unknown as { fetch: FetchLike }).fetch;
    try {
        return await fetchFn(url.href, {
            mode: "cors",
            credentials: "omit",
            referrerPolicy: "no-referrer",
            redirect: "follow",
            signal: abort,
        });
    } catch {
        signal?.throwIfAborted();
        return refuse("E_MODEL_FETCH", { url: shown, status: null, offline: isOffline() });
    }
}

/**
 * Parse an address.
 * @param text - The address.
 * @returns The URL, or undefined when it does not parse.
 */
function parseUrl(text: string): URL | undefined {
    try {
        return new URL(text);
    } catch {
        return undefined;
    }
}

/**
 * Handle an answer from another address than the one asked for (design 2.6): never a private one
 * from a public one, and another host only as `gate` says.
 * @param response - The answer.
 * @param url - The address asked for.
 * @param context - The fetch's limits, signal, gate, hops and shown URL.
 * @returns The file set fetched from the address the reader allowed, or undefined to read this answer.
 */
async function followRedirect(
    response: FetchResponse,
    url: URL,
    context: FetchContext,
): Promise<Map<string, Uint8Array> | undefined> {
    if (response.redirected !== true || typeof response.url !== "string" || response.url === url.href) {
        return undefined;
    }

    // ponytail: the redirected request has already been sent; redirect "manual" would stop it
    // but breaks every host that hands its files to a CDN.
    const to = parseUrl(response.url);
    const refusal = to === undefined ? undefined : redirectRefusal(url, to);
    const asking = to === undefined || to.host === url.host ? undefined : context.gate?.(url, to);
    if (to !== undefined && refusal === undefined && asking === undefined) {
        return undefined;
    }

    await response.body?.cancel?.().catch(() => undefined);
    const why = refusal ?? (await asking);
    if (why !== undefined) {
        refuse(why.code, why.params);
    }

    if (to === undefined || context.hops >= MAX_REDIRECT_HOPS) {
        refuse("E_MODEL_FETCH", { url: context.shown, status: "redirect", offline: false });
    }

    // The reader allowed the host it was sent to: fetch that address.
    return await fetchModel(to, context.limits, context.signal, context.gate, context.hops + 1);
}

/**
 * Read a stream until it ends or passes the byte cap, cancelling it then.
 * @param reader - The stream's reader.
 * @param maxBytes - The byte cap.
 * @returns The chunks kept, and the bytes counted (past the cap when it was passed).
 */
async function readChunks(
    reader: ReturnType<NonNullable<FetchResponse["body"]>["getReader"]>,
    maxBytes: number,
): Promise<{ chunks: Uint8Array[]; total: number }> {
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }

        total += value?.length ?? 0;
        if (total > maxBytes) {
            await reader.cancel();
            break;
        }

        if (value !== undefined) {
            chunks.push(value);
        }
    }

    return { chunks, total };
}

/**
 * Read an answer's body, holding it to the byte cap while it streams.
 * @param response - The answer.
 * @param limits - The limits in force.
 * @param signal - The caller's signal.
 * @param shown - The URL as a fact shows it.
 * @returns The bytes.
 */
async function readBody(
    response: FetchResponse,
    limits: ModelLimits,
    signal: AbortSignal | undefined,
    shown: string,
): Promise<Uint8Array> {
    let read: { chunks: Uint8Array[]; total: number };
    try {
        if (response.body === null) {
            const whole = new Uint8Array(await response.arrayBuffer());
            read = { chunks: [whole], total: whole.length };
        } else {
            read = await readChunks(response.body.getReader(), limits.maxBytes);
        }
    } catch {
        signal?.throwIfAborted();
        refuse("E_MODEL_FETCH", { url: shown, status: null, offline: isOffline() });
    }

    if (read.total > limits.maxBytes) {
        refuse("E_MODEL_TOO_LARGE", { what: "bytes", found: read.total, limit: limits.maxBytes });
    }

    const bytes = new Uint8Array(read.total);
    let at = 0;
    for (const chunk of read.chunks) {
        bytes.set(chunk, at);
        at += chunk.length;
    }

    return bytes;
}

/**
 * The name a fetched file is stored under: the URL's last path segment, decoded.
 * @param url - The URL.
 * @returns The normalized name, or {@link BYTES_KEY} when there is none.
 */
function fetchedName(url: URL): string {
    let name = BYTES_KEY;
    try {
        name = decodeURIComponent(url.pathname.slice(url.pathname.lastIndexOf("/") + 1)) || BYTES_KEY;
    } catch {
        // A malformed escape in the path: keep the plain key.
    }

    return normalizePath(name) || BYTES_KEY;
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
    checkFetchable(url);
    const shown = shownUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => {
        controller.abort();
    }, limits.fetchTimeoutMs);
    const onAbort = (): void => {
        controller.abort();
    };
    signal?.addEventListener("abort", onAbort);
    try {
        const response = await send(url, controller.signal, signal, shown);
        const redirected = await followRedirect(response, url, { limits, signal, gate, hops, shown });
        if (redirected !== undefined) {
            return redirected;
        }

        if (!response.ok) {
            refuse("E_MODEL_FETCH", { url: shown, status: response.status, offline: false });
        }

        const declared = Number(response.headers.get("content-length"));
        if (Number.isFinite(declared) && declared > limits.maxBytes) {
            refuse("E_MODEL_TOO_LARGE", { what: "bytes", found: declared, limit: limits.maxBytes });
        }

        const bytes = await readBody(response, limits, signal, shown);
        return new Map([[fetchedName(url), bytes]]);
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

    const head = String.fromCodePoint(...bytes.subarray(at, at + 14)).toLowerCase();
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

/** What fetching a model's parts shares: the main URL, the limits, and the set as it grows. */
interface PartFetch {
    readonly url: URL;
    readonly limits: ModelLimits;
    readonly signal: AbortSignal | undefined;
    readonly gate: RedirectGate | undefined;
    readonly given: Map<string, Uint8Array>;
    /** The bytes fetched so far, misses included. */
    total: number;
}

/**
 * The problems the checks find in a set.
 * @param given - The set.
 * @param main - Its main file.
 * @param limits - The limits in force.
 * @returns The facts, or undefined when the set passes.
 */
async function problemsOf(
    given: ReadonlyMap<string, Uint8Array>,
    main: string,
    limits: ModelLimits,
): Promise<readonly CodedFact[] | undefined> {
    try {
        await checkFileSet(given, { main }, limits);
        return undefined;
    } catch (error) {
        if (!(error instanceof Refusal)) {
            throw error;
        }

        return error.facts;
    }
}

/**
 * Whether a fact is about a part: one missing, or one several files match.
 * @param fact - The fact.
 * @returns True for `E_MODEL_MISSING_FILE` and `E_MODEL_PART_AMBIGUOUS`.
 */
function isPartProblem(fact: CodedFact): boolean {
    return fact.code === "E_MODEL_MISSING_FILE" || fact.code === "E_MODEL_PART_AMBIGUOUS";
}

/**
 * The refusal reported once the tries are over: every fact, a missing part's with the addresses
 * tried, and the set held when only parts are missing.
 * @param facts - The facts the checks found.
 * @param tried - The addresses tried, by part name.
 * @param parts - Whether only parts are missing.
 * @param held - The set fetched so far and its main file.
 * @param held.given - The set.
 * @param held.main - Its main file.
 * @returns The refusal.
 */
function finalRefusal(
    facts: readonly CodedFact[],
    tried: ReadonlyMap<string, string[]>,
    parts: boolean,
    held: { readonly given: Map<string, Uint8Array>; readonly main: string },
): Refusal {
    const [lead, ...more] = facts.map((f) => {
        const shown = f.code === "E_MODEL_MISSING_FILE" ? tried.get(String(f.params.name)) : undefined;
        return shown === undefined ? f : { code: f.code, params: { ...f.params, tried: shown } };
    });
    const refusal = new Refusal(lead.code, { ...lead.params }, more);
    // Only parts are missing: the session holds what was fetched, for supply (design 12.4).
    if (parts) {
        refusal.held = held;
    }

    return refusal;
}

/**
 * Fetch one address of a part.
 * @param attempt - The address.
 * @param fetching - The shared state.
 * @returns The bytes, "retry" when the host refused it (401 or 403), or "stop" for another miss.
 */
async function fetchAttempt(attempt: URL, fetching: PartFetch): Promise<Uint8Array | "retry" | "stop"> {
    const { limits } = fetching;
    try {
        const [bytes] = (
            await fetchModel(
                attempt,
                { ...limits, maxBytes: Math.max(0, limits.maxBytes - fetching.total) },
                fetching.signal,
                fetching.gate,
            )
        ).values();
        return bytes;
    } catch (error) {
        if (!(error instanceof Refusal) || error.fact.code !== "E_MODEL_FETCH") {
            throw error;
        }

        const { status } = error.fact.params;
        return status === 401 || status === 403 ? "retry" : "stop";
    }
}

/**
 * Fetch a part at one address: as written, then with the main URL's query once, when a signed
 * URL's companion is refused without it.
 * @param address - The address.
 * @param fetching - The shared state.
 * @param budget - The requests made for this part so far.
 * @param budget.requests - The count, raised by each request.
 * @returns The bytes, or undefined when none came.
 */
async function fetchAt(
    address: URL,
    fetching: PartFetch,
    budget: { requests: number },
): Promise<Uint8Array | undefined> {
    const signed = new URL(address);
    signed.search = fetching.url.search;
    const attempts = fetching.url.search === "" ? [address] : [address, signed];
    for (const attempt of attempts) {
        if (budget.requests > MAX_EXTRA_REQUESTS) {
            return undefined;
        }

        budget.requests++;
        const outcome = await fetchAttempt(attempt, fetching);
        if (outcome === "stop") {
            return undefined;
        }

        if (outcome !== "retry") {
            return outcome;
        }
    }

    return undefined;
}

/**
 * Try a missing part at every address of design 12.2, adding the first that holds it to the set.
 * @param fact - The part's `E_MODEL_MISSING_FILE`.
 * @param fetching - The shared state.
 * @param tried - The addresses tried, by part name; this part's are recorded.
 */
async function fetchPart(fact: CodedFact, fetching: PartFetch, tried: Map<string, string[]>): Promise<void> {
    const name = String(fact.params.name);
    const shown: string[] = [];
    tried.set(name, shown);
    const budget = { requests: 0 };
    for (const path of triesFor(name, fact.params.role)) {
        if (fetching.given.size > MAX_COMPANION_FILES) {
            refuse("E_MODEL_TOO_LARGE", { what: "count", found: fetching.given.size, limit: MAX_COMPANION_FILES });
        }

        // The path is normalized with no ".." left: the URL it resolves to is on the same
        // origin and inside the main file's folder.
        const address = new URL(path.split("/").map(encodeURIComponent).join("/"), fetching.url);
        if (shown.length < MAX_TRIED_SHOWN) {
            shown.push(shownUrl(address));
        }

        const bytes = await fetchAt(address, fetching, budget);
        if (bytes === undefined) {
            continue;
        }

        fetching.total += bytes.length;
        // A host that answers every miss with its own page has not got the file.
        if (!isWebPage(bytes)) {
            fetching.given.set(path, bytes);
            return;
        }
    }
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

    const fetching: PartFetch = { url, limits, signal, gate, given, total: first.length };
    const tried = new Map<string, string[]>();
    for (;;) {
        const facts = await problemsOf(given, main, limits);
        if (facts === undefined) {
            return { given, main };
        }

        const parts = facts.every(isPartProblem);
        const fresh = facts.filter((f) => f.code === "E_MODEL_MISSING_FILE" && !tried.has(String(f.params.name)));
        if (!parts || fresh.length === 0) {
            throw finalRefusal(facts, tried, parts, { given, main });
        }

        for (const fact of fresh) {
            await fetchPart(fact, fetching, tried);
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

/** A main file chosen: its path, its format, and whether the element loads that format. */
type MainFile = { path: string; format: ModelFormat; supported: boolean };

/** A file that could be the main one, with its rank (lower is better). */
type Candidate = MainFile & { rank: number };

/**
 * Order two strings by UTF-16 code units, as the default `sort` does.
 * @param a - One string.
 * @param b - The other.
 * @returns Negative, zero or positive.
 */
function byCodeUnits(a: string, b: string): number {
    return a < b ? -1 : Number(a > b);
}

/**
 * Every file of a set whose bytes or name tell a model format other than zip, ranked.
 * @param files - The set.
 * @returns The candidates.
 */
function rankedCandidates(files: ReadonlyMap<string, Uint8Array>): Candidate[] {
    const candidates: Candidate[] = [];
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

    return candidates;
}

/**
 * Of candidates with the same base name (rack.glb, rack.obj, rack.fbx), the best ranked.
 * @param candidates - The candidates.
 * @returns One per base name, the first best ranked.
 */
function bestOfEachBase(candidates: readonly Candidate[]): Candidate[] {
    const byBase = new Map<string, Candidate>();
    for (const candidate of candidates) {
        const base = candidate.path.replace(/\.[^./]*$/, "").toLowerCase();
        const held = byBase.get(base);
        if (held === undefined || candidate.rank < held.rank) {
            byBase.set(base, candidate);
        }
    }

    return [...byBase.values()];
}

/**
 * Choose the main file of a set (design 3.2): ranked GLB, glTF, OBJ, STL, PLY, then formats the
 * element does not load; of files sharing a base name only the best ranked counts; two different
 * candidates of the best rank are ambiguous.
 * @param files - The set.
 * @param forced - A format the caller forced.
 * @returns The main path and its format.
 */
function chooseMain(files: ReadonlyMap<string, Uint8Array>, forced?: ModelFormat): MainFile {
    const candidates = rankedCandidates(files);
    if (candidates.length === 0) {
        if (forced !== undefined && files.size === 1) {
            const [path] = files.keys();
            return { path, format: forced, supported: true };
        }

        refuse("E_MODEL_FORMAT_UNKNOWN", { fileName: cut([...files.keys()][0] ?? "") });
    }

    const kept = bestOfEachBase(candidates);
    const best = Math.min(...kept.map((c) => c.rank));
    const top = kept.filter((c) => c.rank === best);
    if (top.length > 1) {
        const names = top.map((c) => cut(c.path)).sort(byCodeUnits);
        refuse("E_MODEL_AMBIGUOUS", {
            candidates: names.slice(0, MAX_CANDIDATES),
            ...(names.length > MAX_CANDIDATES ? { more: names.length - MAX_CANDIDATES } : {}),
        });
    }

    return { ...top[0], ...(forced === undefined ? {} : { format: forced, supported: true }) };
}

/**
 * The main file the caller named, refused when the set does not hold it.
 * @param files - The set.
 * @param named - The caller's main file.
 * @param format - A format the caller forced.
 * @returns The main file.
 */
function namedMain(files: ReadonlyMap<string, Uint8Array>, named: string, format?: ModelFormat): MainFile {
    const path = normalizePath(named);
    if (path === undefined || !files.has(path)) {
        refuse("E_MODEL_MISSING_FILE", { name: cut(named), referencedBy: null });
    }

    if (format !== undefined) {
        return { path, format, supported: true };
    }

    const found = detectModelFormat({ filename: path, head: files.get(path) });
    return { path, format: found?.format ?? "", supported: found?.supported ?? false };
}

/**
 * Refuse every part found missing, at once.
 * @param findings - What the lookups found.
 */
function refuseMissing(findings: Findings): void {
    if (findings.missing.length > 0) {
        refuseAll(findings.missing);
    }
}

/**
 * Decode a .gltf's JSON text.
 * @param bytes - The file.
 * @returns The text.
 */
function gltfText(bytes: Uint8Array): string {
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
        return refuse("E_MODEL_STRUCTURE", { rule: "json" });
    }
}

/**
 * Run the checks of the main file's format. Every part the model names is looked up first, so
 * every missing one is reported at once.
 * @param main - The main file, of a format the element loads.
 * @param files - The set.
 * @param limits - The limits in force.
 * @param findings - Where lookups record substitutions and missing parts.
 * @returns The summary and the format's warnings.
 */
function checkByFormat(
    main: MainFile,
    files: ReadonlyMap<string, Uint8Array>,
    limits: ModelLimits,
    findings: Findings,
): { summary: ModelSummary; warnings: readonly CodedFact[] } {
    const bytes = files.get(main.path) as Uint8Array;
    switch (main.format) {
        case "glb": {
            const { text, bin } = readGlb(bytes);
            const json = parseGltfJson(text);
            findGltfParts(json, main.path, files, findings);
            refuseMissing(findings);
            return checkGltf({
                json,
                ...(bin === undefined ? {} : { bin }),
                path: main.path,
                files,
                limits,
                format: "glb",
            });
        }
        case "gltf": {
            const json = parseGltfJson(gltfText(bytes));
            findGltfParts(json, main.path, files, findings);
            refuseMissing(findings);
            return checkGltf({ json, path: main.path, files, limits, format: "gltf" });
        }
        case "obj":
            findObjParts(main.path, files, limits, findings);
            refuseMissing(findings);
            return scanObj(main.path, files, limits);
        case "stl":
            return scanStl(bytes, limits);
        default:
            return scanPly(bytes, limits);
    }
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
    const files = await unpackZip(given, limits);
    const main =
        options.main === undefined ? chooseMain(files, options.format) : namedMain(files, options.main, options.format);
    if (!main.supported || !(BUILT_IN_MODEL_FORMATS as readonly string[]).includes(main.format)) {
        if (main.format === "") {
            refuse("E_MODEL_FORMAT_UNKNOWN", { fileName: cut(main.path) });
        }

        refuse("E_MODEL_FORMAT_UNSUPPORTED", { format: main.format, fileName: cut(main.path) });
    }

    const findings: Findings = { warnings: [], missing: [] };
    const checked = checkByFormat(main, files, limits, findings);
    return {
        files,
        main: main.path,
        format: main.format,
        summary: checked.summary,
        warnings: [...findings.warnings, ...checked.warnings],
    };
}
