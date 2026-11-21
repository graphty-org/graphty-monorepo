/**
 * Every dataset is hosted on graphty.app as graph-format wire bytes and fetched at runtime; no
 * package bundles the data.
 */

import { fromBytes, type GraphSnapshot } from "@graphty/graph-format";

import { HOSTED_DATASET_SHA256 } from "./hosted-names.js";
import { PACKED } from "./packed.js";
import { withPositions } from "./positions.js";

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
     * Check a dataset `DATASETS` lists against its published SHA-256; true by default. Pass false
     * for a mirror that serves different content under a known name.
     */
    verify?: boolean | undefined;
    /**
     * The most bytes the download may hold, as read and as unzipped; more rejects with
     * `E_DATASET_TOO_LARGE`. {@link DEFAULT_DATASET_MAX_BYTES} by default.
     */
    maxBytes?: number | undefined;
}

/**
 * The code of a {@link DatasetError}, with the `details` it carries:
 * - `E_DATASET_NAME`: the name is not lowercase letters, digits and dashes (`name`)
 * - `E_DATASET_HTTP`: the server answered with an error status or no body (`url`, `status`)
 * - `E_DATASET_CHECKSUM`: the file's SHA-256 is not the published one (`url`, `expected`,
 *   `actual`); `actual` is null when SHA-256 is unavailable (not a secure context)
 * - `E_DATASET_TOO_LARGE`: the download, read or unzipped, passed `maxBytes` (`url`, `maxBytes`)
 */
export type DatasetErrorCode = "E_DATASET_NAME" | "E_DATASET_HTTP" | "E_DATASET_CHECKSUM" | "E_DATASET_TOO_LARGE";

/**
 * What {@link fetchDataset} rejects with, other than an abort or a failure of `fetch` itself.
 * Branch on `code`; `details` holds the facts named per code in {@link DatasetErrorCode}. The
 * message is the code and its details, for logs.
 */
export class DatasetError extends Error {
    /** The stable code to branch on. */
    readonly code: DatasetErrorCode;
    /** The facts named per code in {@link DatasetErrorCode}, frozen. */
    readonly details: Readonly<Record<string, unknown>>;

    /**
     * Create a DatasetError.
     * @param code - the stable code
     * @param details - the facts named per code
     */
    constructor(code: DatasetErrorCode, details: Readonly<Record<string, unknown>>) {
        super(`${code} ${JSON.stringify(details)}`);
        this.name = "DatasetError";
        this.code = code;
        this.details = Object.freeze({ ...details });
    }
}

/**
 * Download a dataset and decode it. A dataset with node positions (openflights' airports, WikiPathways WP615's
 * drawing) also gets a role-`position` column whose `meta.coordinates` says what they are: geographic longitude and
 * latitude, or a drawing with y growing upward. Its plain columns stay as they are.
 * A dataset `DATASETS` lists is checked against its published SHA-256 unless `verify` is false. The
 * check is of the .gsnp.gz file, so it is skipped when the server sent it with
 * `Content-Encoding: gzip` and the bytes arrive already unzipped; the size cap still applies.
 * @param name - the dataset name: lowercase letters, digits and dashes
 * @param options - the base URL, fetch implementation, abort signal, checksum switch and size cap
 * @returns the graph as a frozen graph-format snapshot
 * @throws DatasetError with a {@link DatasetErrorCode}
 */
export async function fetchDataset(name: string, options: FetchDatasetOptions = {}): Promise<GraphSnapshot> {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
        throw new DatasetError("E_DATASET_NAME", { name });
    }
    const base = options.baseUrl ?? DEFAULT_DATASET_BASE_URL;
    const url = new URL(`${name}.gsnp.gz`, base.endsWith("/") ? base : `${base}/`);
    const response = await (options.fetch ?? fetch)(url, { signal: options.signal ?? null });
    if (!response.ok || response.body === null) {
        throw new DatasetError("E_DATASET_HTTP", { url: url.href, status: response.status });
    }
    const maxBytes = options.maxBytes ?? DEFAULT_DATASET_MAX_BYTES;
    let bytes = await readCapped(response.body, maxBytes, url);
    // A server or CDN that sends the file with `Content-Encoding: gzip` makes the browser unzip it
    // already: bytes that do not start with the gzip magic (1f 8b) are the wire bytes themselves.
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
        if (options.verify !== false) {
            await verifySha256(name, bytes, url);
        }
        bytes = await readCapped(
            new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
            maxBytes,
            url,
        );
    }
    return withPositions(name, fromBytes(bytes));
}

/**
 * Reject a known dataset's file whose SHA-256 is not the published one.
 * @param name - the dataset name
 * @param bytes - the downloaded .gsnp.gz file
 * @param url - the file's address, for the error
 */
async function verifySha256(name: string, bytes: Uint8Array<ArrayBuffer>, url: URL): Promise<void> {
    // own keys only, so a name such as "constructor" is not found on Object.prototype
    const has = (table: object): boolean => Object.prototype.hasOwnProperty.call(table, name);
    const packed = has(PACKED) ? PACKED[name].sha256 : undefined;
    const expected = packed ?? (has(HOSTED_DATASET_SHA256) ? HOSTED_DATASET_SHA256[name] : undefined);
    if (expected === undefined) {
        return;
    }
    // undefined outside a secure context (a page on plain http), though the types say otherwise
    const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
    const actual =
        subtle === undefined
            ? null
            : Array.from(new Uint8Array(await subtle.digest("SHA-256", bytes)), (b) =>
                  b.toString(16).padStart(2, "0"),
              ).join("");
    if (actual !== expected) {
        throw new DatasetError("E_DATASET_CHECKSUM", { url: url.href, expected, actual });
    }
}

/**
 * Read a stream to its end, refusing more than a cap, so a gzip bomb stops at the cap.
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
            throw new DatasetError("E_DATASET_TOO_LARGE", { url: url.href, maxBytes });
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
