/**
 * @file Unpacking a model kit's `.zip` safely.
 *
 * fflate's streaming `Unzip` reads each entry's local header and inflates it chunk by chunk, so
 * the bytes counted are the bytes actually produced, not the sizes the header declares (a zip
 * bomb lies there). Caps: 1,024 entries, names of 512 characters, an output-to-input ratio of 100
 * per entry, the unzipped total under the byte limit, no zip inside the zip, no two names that
 * differ only in case, no name that leaves the archive with `..`. `__MACOSX/` and directories are
 * skipped.
 */

import { isZip } from "../../catalog/detectModel";
import { normalizePath, Refusal, refuse } from "./references";

/** The caps of a zip, all in one place. */
export const ZIP_CAPS = Object.freeze({ entries: 1024, nameLength: 512, ratio: 100 });

/**
 * Unpack a zip into path to bytes.
 * @param zip - The archive.
 * @param maxUnzipped - The most bytes all entries may produce together.
 * @returns The entries, by normalized path.
 * @throws Refusal `E_MODEL_ZIP { reason }` or `E_MODEL_TOO_LARGE { what: "unzipped" }`.
 */
export async function unzipModel(zip: Uint8Array, maxUnzipped: number): Promise<Map<string, Uint8Array>> {
    // Loaded on the first zip, so a page that never adds one never downloads the inflater.
    const { Unzip, UnzipInflate, UnzipPassThrough } = await import("fflate");
    const out = new Map<string, Uint8Array>();
    const lowerNames = new Set<string>();
    let entries = 0;
    let total = 0;
    // A refusal raised inside a callback is kept here and rethrown after push returns, so fflate
    // never sees an exception thrown through its own stack.
    let failure: unknown;
    const fail = (error: unknown): void => {
        failure ??= error;
    };

    const unzip = new Unzip((file) => {
        if (failure !== undefined) {
            return;
        }

        try {
            const { name } = file;
            if (name.endsWith("/") || name.startsWith("__MACOSX/")) {
                return;
            }

            entries++;
            if (entries > ZIP_CAPS.entries) {
                refuse("E_MODEL_ZIP", { reason: "entries", limit: ZIP_CAPS.entries });
            }

            if (name.length > ZIP_CAPS.nameLength) {
                refuse("E_MODEL_ZIP", { reason: "name", limit: ZIP_CAPS.nameLength });
            }

            const path = normalizePath(name);
            if (path === undefined || path === "" || name.startsWith("/")) {
                refuse("E_MODEL_ZIP", { reason: "path" });
            }

            if (lowerNames.has(path.toLowerCase())) {
                refuse("E_MODEL_ZIP", { reason: "duplicate", name: path.slice(0, 256) });
            }

            lowerNames.add(path.toLowerCase());
            if (/\.zip$/i.test(path)) {
                refuse("E_MODEL_ZIP", { reason: "nested" });
            }

            // The ratio is judged against the compressed size the header declares, or the whole
            // archive when it declares none: fflate gives a negative size for an entry written with
            // a data descriptor (Finder, Java's ZipOutputStream). The unzipped total bounds a header
            // that lies.
            const declared = file.size ?? -1;
            const compressed = Math.max(declared >= 0 ? declared : zip.length, 1);
            const chunks: Uint8Array[] = [];
            let produced = 0;
            file.ondata = (error, chunk, final) => {
                if (failure !== undefined) {
                    return;
                }

                try {
                    if (error) {
                        refuse("E_MODEL_ZIP", { reason: "corrupt" });
                    }

                    if (produced === 0 && isZip(chunk)) {
                        refuse("E_MODEL_ZIP", { reason: "nested" });
                    }

                    produced += chunk.length;
                    total += chunk.length;
                    if (produced > ZIP_CAPS.ratio * compressed && produced > 1024) {
                        refuse("E_MODEL_ZIP", { reason: "ratio", limit: ZIP_CAPS.ratio });
                    }

                    if (total > maxUnzipped) {
                        refuse("E_MODEL_TOO_LARGE", { what: "unzipped", found: total, limit: maxUnzipped });
                    }

                    chunks.push(chunk);
                    if (final) {
                        out.set(path, concat(chunks, produced));
                    }
                } catch (refusal) {
                    fail(refusal);
                    file.terminate();
                }
            };
            file.start();
        } catch (refusal) {
            fail(refusal);
        }
    });
    unzip.register(UnzipInflate);
    unzip.register(UnzipPassThrough);

    // Feed it in slices, so a bomb is stopped after one slice of output rather than after the
    // whole entry is inflated into memory.
    const SLICE = 64 * 1024;
    try {
        for (let at = 0; at < zip.length && failure === undefined; at += SLICE) {
            const end = Math.min(at + SLICE, zip.length);
            unzip.push(zip.subarray(at, end), end === zip.length);
        }
    } catch (error) {
        fail(error);
    }

    if (failure !== undefined) {
        if (!(failure instanceof Refusal)) {
            const message = failure instanceof Error ? failure.message : "";
            refuse("E_MODEL_ZIP", { reason: /encrypt/i.test(message) ? "encrypted" : "corrupt" });
        }

        throw failure;
    }

    if (out.size === 0) {
        refuse("E_MODEL_ZIP", { reason: entries === 0 ? "empty" : "corrupt" });
    }

    return out;
}

/**
 * Join chunks into one array.
 * @param chunks - The chunks.
 * @param length - Their total length.
 * @returns One array.
 */
function concat(chunks: readonly Uint8Array[], length: number): Uint8Array {
    if (chunks.length === 1) {
        return chunks[0];
    }

    const out = new Uint8Array(length);
    let at = 0;
    for (const chunk of chunks) {
        out.set(chunk, at);
        at += chunk.length;
    }

    return out;
}
