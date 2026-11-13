/**
 * Every dataset is hosted on graphty.app as graph-format wire bytes and fetched at runtime; no
 * package bundles the data.
 */

import { fromBytes, type GraphSnapshot } from "@graphty/graph-format";

import { HOSTED_DATASETS } from "./hosted.js";
import { PACKED } from "./packed.js";

/**
 * Where the datasets live: `<base><name>.gsnp.gz`, a gzipped graph-format wire container.
 * The `v1` segment is the hosting layout's version, independent of the package version.
 */
export const DEFAULT_DATASET_BASE_URL = "https://graphty.app/data/graph-samples/v1/";

/** The default of {@link FetchDatasetOptions.maxBytes}: 256 MiB. */
export const DEFAULT_DATASET_MAX_BYTES = 256 * 1024 * 1024;

/** Options of {@link fetchDataset}. */
export interface FetchDatasetOptions {
    /** Serve the files from elsewhere (self-hosting, a mirror, a test server). */
    baseUrl?: string | undefined;
    /** The fetch implementation; the global `fetch` by default. */
    fetch?: typeof fetch | undefined;
    /** Cancels the download. */
    signal?: AbortSignal | undefined;
    /**
     * Check a known dataset's download against the SHA-256 in its metadata (`DATASETS`), true by
     * default. Pass false for a mirror that serves different content under a known name.
     */
    verify?: boolean | undefined;
    /**
     * The most bytes the download may hold, read and unzipped; a larger one rejects with
     * `E_DATASET_TOO_LARGE`. {@link DEFAULT_DATASET_MAX_BYTES} by default.
     */
    maxBytes?: number | undefined;
}

/**
 * The code of a {@link DatasetError}:
 * - `E_DATASET_NAME`: the name is not lowercase letters, digits and dashes (`details.name`)
 * - `E_DATASET_HTTP`: the server answered with an error status or no body (`details.url`, `details.status`)
 * - `E_DATASET_CHECKSUM`: the downloaded file's SHA-256 is not the published one (`details.url`,
 *   `details.expected`, `details.actual`), or SHA-256 is unavailable (not a secure context) and
 *   `details.actual` is null
 * - `E_DATASET_TOO_LARGE`: the download passed `maxBytes` (`details.url`, `details.maxBytes`)
 */
export type DatasetErrorCode = "E_DATASET_NAME" | "E_DATASET_HTTP" | "E_DATASET_CHECKSUM" | "E_DATASET_TOO_LARGE";

/** What {@link fetchDataset} rejects with, other than an abort or a network failure of `fetch` itself. */
export class DatasetError extends Error {
    /** The stable code to branch on. */
    readonly code: DatasetErrorCode;
    /** The context named per code in {@link DatasetErrorCode}. */
    readonly details: Readonly<Record<string, unknown>>;

    /**
     * Create a DatasetError.
     * @param code - the stable code
     * @param message - a plain-ASCII message
     * @param details - the context named per code
     */
    constructor(code: DatasetErrorCode, message: string, details: Readonly<Record<string, unknown>>) {
        super(message);
        this.name = "DatasetError";
        this.code = code;
        this.details = Object.freeze({ ...details });
    }
}

/**
 * Download a dataset and decode it. A dataset `DATASETS` lists is checked against its published
 * SHA-256 unless `verify` is false; the check runs on the gzip file, so it is skipped when the server
 * sent the file with `Content-Encoding: gzip` and the bytes arrive already unzipped.
 * @param name - the dataset name: lowercase letters, digits and dashes
 * @param options - the base URL, fetch implementation, abort signal, checksum switch and size cap
 * @returns the graph as a frozen graph-format snapshot
 * @throws DatasetError with a {@link DatasetErrorCode}
 */
export async function fetchDataset(name: string, options: FetchDatasetOptions = {}): Promise<GraphSnapshot> {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
        throw new DatasetError("E_DATASET_NAME", `not a dataset name: ${JSON.stringify(name)}`, { name });
    }
    const base = options.baseUrl ?? DEFAULT_DATASET_BASE_URL;
    const url = new URL(`${name}.gsnp.gz`, base.endsWith("/") ? base : `${base}/`);
    const response = await (options.fetch ?? fetch)(url, { signal: options.signal ?? null });
    if (!response.ok || response.body === null) {
        throw new DatasetError("E_DATASET_HTTP", `fetching ${url.href} failed: HTTP ${response.status}`, {
            url: url.href,
            status: response.status,
        });
    }
    const maxBytes = options.maxBytes ?? DEFAULT_DATASET_MAX_BYTES;
    const bytes = await readCapped(response.body, maxBytes, url);
    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
        // A server or CDN that sends the file with `Content-Encoding: gzip` makes the browser unzip
        // it already; a graph-format container starts with "GSNP", so the two cannot be confused.
        // ponytail: the published checksum is of the gzip file, so unzipped bytes go unchecked; publish
        // a checksum of the wire bytes too if a mirror that unzips must be verified.
        return fromBytes(bytes);
    }
    const expected = options.verify === false ? undefined : publishedSha256(name);
    if (expected !== undefined) {
        await verifySha256(bytes, expected, url);
    }
    const unzipped = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return fromBytes(await readCapped(unzipped, maxBytes, url));
}

/**
 * The published SHA-256 of a dataset's .gsnp.gz file.
 * @param name - the dataset name
 * @returns the lowercase hex digest, or undefined for a name graphty.app does not publish
 */
function publishedSha256(name: string): string | undefined {
    return Object.prototype.hasOwnProperty.call(PACKED, name)
        ? PACKED[name].sha256
        : HOSTED_DATASETS.find((meta) => meta.name === name)?.sha256;
}

/**
 * Reject bytes whose SHA-256 is not the expected one.
 * @param bytes - the downloaded file
 * @param expected - the published lowercase hex digest
 * @param url - the file's address, for the error
 */
async function verifySha256(bytes: Uint8Array<ArrayBuffer>, expected: string, url: URL): Promise<void> {
    // undefined outside a secure context (a page on plain http), though the types say otherwise
    const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
    if (subtle === undefined) {
        throw new DatasetError(
            "E_DATASET_CHECKSUM",
            `cannot check ${url.href}: SHA-256 is unavailable outside a secure context; pass verify: false to skip the check`,
            { url: url.href, expected, actual: null },
        );
    }
    const digest = new Uint8Array(await subtle.digest("SHA-256", bytes));
    const actual = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (actual !== expected) {
        throw new DatasetError(
            "E_DATASET_CHECKSUM",
            `${url.href} does not match its published SHA-256 (expected ${expected}, got ${actual})`,
            { url: url.href, expected, actual },
        );
    }
}

/**
 * Read a stream to its end, refusing more than a cap.
 * @param stream - the bytes
 * @param maxBytes - the most bytes allowed
 * @param url - the file's address, for the error
 * @returns every byte, in one array
 */
async function readCapped(
    stream: ReadableStream<Uint8Array>,
    maxBytes: number,
    url: URL,
): Promise<Uint8Array<ArrayBuffer>> {
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = stream.getReader();
    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        total += value.length;
        if (total > maxBytes) {
            await reader.cancel();
            throw new DatasetError("E_DATASET_TOO_LARGE", `${url.href} holds more than ${maxBytes} bytes`, {
                url: url.href,
                maxBytes,
            });
        }
        chunks.push(value);
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
    }
    return out;
}
