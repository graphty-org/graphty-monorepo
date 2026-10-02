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
 * The first characters of an input, for detection. Bytes are decoded leniently as UTF-8, which
 * keeps every ASCII signature (an XML prolog, a zip's first entry name) a sniffer looks for.
 * @param input - The input.
 * @returns At most {@link DETECTION_SAMPLE} characters.
 */
export function sampleOf(input: SourceInput): string {
    return typeof input === "string"
        ? input.slice(0, DETECTION_SAMPLE)
        : new TextDecoder().decode(input.subarray(0, DETECTION_SAMPLE));
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
 * Read a URL's bytes, once.
 * @param url - The URL.
 * @returns The bytes.
 * @throws A `GraphtyError` with `E_FETCH_FAILED` when it cannot be read.
 */
export async function fetchBytes(url: string): Promise<Uint8Array> {
    let response: Response;
    try {
        response = await fetch(url);
    } catch (error) {
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

    return new Uint8Array(await response.arrayBuffer());
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
        return new Uint8Array(await (file as FileLike).arrayBuffer());
    }

    return typeof url === "string" ? fetchBytes(url) : null;
}
