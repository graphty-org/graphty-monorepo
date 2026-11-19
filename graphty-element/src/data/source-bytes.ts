/**
 * @file Reading a source -- inline data, a file or a URL -- as graph-io's input.
 *
 * A file is bytes, and the importer is what knows how to decode them: graph-io reads a byte-order
 * mark and an XML or DOT encoding declaration, and a zip (a Cytoscape session) is not text at
 * all. So a file and a URL are read as bytes and handed on undecoded. Inline text a caller already
 * holds as a string stays a string: encoding it again would only lose an encoding declaration
 * that no longer describes it.
 *
 * Node-safe: `./catalog` reaches this module through `listGraphs`.
 */

import { headBytes, sha256Hex } from "@graphty/graph-io";

import { GraphtyError } from "../errors";

/** Inline data as a caller may hand it: text, or the file's bytes. */
export type SourceData = string | Uint8Array | ArrayBuffer;

/** What an importer is handed: the caller's text, or bytes. */
export type SourceInput = string | Uint8Array;

/** How many leading characters detection looks at. */
export const DETECTION_SAMPLE = 2048;

/**
 * Whether a value is inline data a source can read.
 * @param value - The `data` option.
 * @returns True for a string, a typed array view or an ArrayBuffer.
 */
export function isSourceData(value: unknown): value is SourceData {
    return typeof value === "string" || ArrayBuffer.isView(value) || value instanceof ArrayBuffer;
}

/**
 * Inline data as an importer's input.
 * @param data - Text, a typed array view or an ArrayBuffer.
 * @returns The text, or the bytes as a `Uint8Array` over the same memory.
 */
export function toSourceInput(data: SourceData | ArrayBufferView): SourceInput {
    if (typeof data === "string" || data instanceof Uint8Array) {
        return data;
    }

    return ArrayBuffer.isView(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data);
}

/**
 * The first characters of an input, for detection. Bytes are decoded leniently, through graph-io's
 * `headBytes`, which transcodes a UTF-16 head with a byte-order mark (graph-io reads such a file,
 * so detection must too); anything else is read as UTF-8, which keeps every ASCII signature (an
 * XML prolog, a zip's first entry name) a sniffer looks for. A mark itself is dropped.
 * @param input - The input.
 * @returns At most {@link DETECTION_SAMPLE} characters.
 */
export function sampleOf(input: SourceInput): string {
    const text = typeof input === "string" ? input : new TextDecoder().decode(headBytes(input));
    return text.slice(0, DETECTION_SAMPLE);
}

/**
 * The last part of a URL's path, which is what its extension and its name are read from.
 * @param url - The URL.
 * @returns The part, or "" when the path ends in a slash.
 */
export function urlTail(url: string): string {
    const path = url.split(/[?#]/)[0] ?? "";
    return path.split("/").pop() ?? "";
}

/**
 * A read of a file or a URL, with a failure (a file the browser cannot read, a body cut off
 * mid-download) coded as `E_FETCH_FAILED`.
 * @param read - The read.
 * @param where - The file's name or the URL, for the error's details.
 * @param where.file - The file's name, when it is a file.
 * @param where.url - The URL, when it is a URL.
 * @returns What the read resolved to.
 * @throws A `GraphtyError` with `E_FETCH_FAILED` when the read fails.
 */
export async function readOrRefuse<T>(read: Promise<T>, where: { file?: string; url?: string }): Promise<T> {
    try {
        return await read;
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw GraphtyError.wrap(error, {
            code: "E_FETCH_FAILED",
            source: "data",
            recoverable: true,
            message: `Failed to read ${where.url ?? where.file ?? "the source"}: ${reason}`,
            details: where,
        });
    }
}

/** The validators each fetched body's response carried, by the bytes {@link fetchBytes} returned. */
const VALIDATORS = new WeakMap<Uint8Array, { readonly etag?: string; readonly lastModified?: string }>();

/**
 * The `ETag` and `Last-Modified` the response that gave these bytes carried.
 * @param bytes - Bytes {@link fetchBytes} returned.
 * @returns The validators it had, or undefined for bytes it did not fetch.
 */
export function validatorsOf(
    bytes: Uint8Array,
): { readonly etag?: string; readonly lastModified?: string } | undefined {
    return VALIDATORS.get(bytes);
}

/** What a reader fetched for a URL: the body's digest, its size and its response's validators. */
export interface FetchedFacts {
    readonly sha256: Promise<string>;
    readonly size: number;
    readonly etag?: string;
    readonly lastModified?: string;
}

/** What a reader fetched for each URL, until the load's facts take it. */
const FETCHED = new Map<string, FetchedFacts>();

/**
 * Keep what a reader fetched for a URL, so the load that read it can record its digest, size and
 * validators. ponytail: one entry per URL, the latest fetch winning; two loads of one URL at once
 * share it. Key it by load if that matters.
 * @param url - The URL.
 * @param bytes - The body.
 * @param response - The response, for its validators.
 */
export function keepFetched(url: string, bytes: Uint8Array, response: Response): void {
    const etag = response.headers.get("ETag");
    const lastModified = response.headers.get("Last-Modified");
    const sha256 = sha256Hex(bytes);
    // Settled here too, so a digest no load takes never rejects unhandled.
    sha256.catch(() => undefined);
    FETCHED.set(url, {
        sha256,
        size: bytes.byteLength,
        ...(etag === null ? {} : { etag }),
        ...(lastModified === null ? {} : { lastModified }),
    });
}

/**
 * What a reader fetched for a URL, removed once taken.
 * @param url - The URL.
 * @returns The body's digest, size and validators, or undefined.
 */
export function takeFetched(url: string): FetchedFacts | undefined {
    const read = FETCHED.get(url);
    FETCHED.delete(url);
    return read;
}

/**
 * A refusal of a body over a size limit.
 * @param limit - The limit, in bytes.
 * @param count - The size found, or read so far.
 * @returns The error.
 */
function tooLarge(limit: number, count: number): GraphtyError {
    return new GraphtyError({
        code: "E_TOO_LARGE",
        message: `The body is over the limit of ${String(limit)} bytes.`,
        source: "data",
        details: { limit, count, of: "bytes" },
    });
}

/**
 * A response's body, read no further than a size limit: refused by its `Content-Length`, else
 * as soon as the bytes read pass the limit.
 * @param response - The response.
 * @param limit - The limit, in bytes.
 * @returns The body.
 * @throws A `GraphtyError` with `E_TOO_LARGE` over the limit.
 */
async function boundedBody(response: Response, limit: number): Promise<ArrayBuffer> {
    const declared = Number(response.headers.get("Content-Length") ?? Number.NaN);
    if (declared > limit) {
        throw tooLarge(limit, declared);
    }

    if (response.body === null) {
        return response.arrayBuffer();
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (let read = await reader.read(); !read.done; read = await reader.read()) {
        size += read.value.byteLength;
        if (size > limit) {
            await reader.cancel();
            throw tooLarge(limit, size);
        }

        chunks.push(read.value);
    }

    const body = new Uint8Array(size);
    let at = 0;
    for (const chunk of chunks) {
        body.set(chunk, at);
        at += chunk.byteLength;
    }

    return body.buffer;
}

/**
 * Read a URL's bytes, once.
 * @param url - The URL.
 * @param signal - Cancels the fetch; an abort rejects with the signal's reason, uncoded.
 * @param limit - The most bytes to read; unbounded when absent.
 * @returns The bytes.
 * @throws A `GraphtyError` with `E_FETCH_FAILED` when it cannot be read, and `E_TOO_LARGE` when
 *     its body is over the limit.
 */
export async function fetchBytes(url: string, signal?: AbortSignal, limit?: number): Promise<Uint8Array> {
    let response: Response;
    try {
        response = await fetch(url, signal === undefined ? undefined : { signal });
    } catch (error) {
        if (signal?.aborted === true) {
            throw error;
        }

        throw new GraphtyError({
            code: "E_FETCH_FAILED",
            message: `Could not fetch "${url}".`,
            source: "data",
            cause: error,
        });
    }

    if (!response.ok) {
        throw new GraphtyError({
            code: "E_FETCH_FAILED",
            message: `Could not fetch "${url}": ${String(response.status)} ${response.statusText}`,
            source: "data",
            details: { url, status: response.status },
        });
    }

    const body = limit === undefined ? response.arrayBuffer() : boundedBody(response, limit);
    const bytes = new Uint8Array(await readOrRefuse(body, { url }));
    const etag = response.headers.get("ETag");
    const lastModified = response.headers.get("Last-Modified");
    VALIDATORS.set(bytes, {
        ...(etag === null ? {} : { etag }),
        ...(lastModified === null ? {} : { lastModified }),
    });
    return bytes;
}

/**
 * Read a URL as JSON, once.
 * @param url - The URL.
 * @returns The parsed value.
 * @throws A `GraphtyError`: `E_FETCH_FAILED` when it cannot be read, `E_PARSE_FAILED` when it is
 *     not JSON.
 */
export async function fetchJson(url: string): Promise<unknown> {
    const text = new TextDecoder().decode(await fetchBytes(url));
    try {
        return JSON.parse(text) as unknown;
    } catch (error) {
        throw new GraphtyError({
            code: "E_PARSE_FAILED",
            message: `"${url}" is not JSON.`,
            source: "data",
            details: { url, format: "json" },
            cause: error,
        });
    }
}

/** A file read structurally: a browser `File`, or anything with a name and its bytes. */
interface FileLike {
    readonly name?: unknown;
    arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * Read a source's configuration as an importer's input: inline `data`, else a `file`, else a `url`.
 * @param config - The source's options.
 * @returns The input, or null when the configuration names none of the three.
 * @throws A `GraphtyError` with `E_FETCH_FAILED` when the URL cannot be read.
 */
export async function readSource(config: Readonly<Record<string, unknown>>): Promise<SourceInput | null> {
    const { data, file, url } = config;
    if (isSourceData(data)) {
        return toSourceInput(data);
    }

    if (typeof file === "object" && file !== null && typeof (file as FileLike).arrayBuffer === "function") {
        const { name } = file as FileLike;
        return new Uint8Array(
            await readOrRefuse((file as FileLike).arrayBuffer(), typeof name === "string" ? { file: name } : {}),
        );
    }

    return typeof url === "string" ? fetchBytes(url) : null;
}
