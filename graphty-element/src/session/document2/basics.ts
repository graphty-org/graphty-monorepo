/**
 * @file The two pieces of the save-file code that every session uses, version 2 or not: a project's
 * fresh id and the version 1 column encoding. Kept apart from the rest of document2/, which
 * projectFile.ts loads on demand, so the main entry carries only these.
 */

/**
 * A fresh id: 128 random bits in hex (`randomUUID` exists only in secure contexts).
 * @returns The id.
 */
export function newDocumentId(): string {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Bytes per value, and the reader, of each version 1 dtype; projectFile.ts's columns share it. */
export const DTYPES: Readonly<Record<string, readonly [number, (view: DataView, at: number) => number]>> = {
    f64: [8, (view, at) => view.getFloat64(at, true)],
    f32: [4, (view, at) => view.getFloat32(at, true)],
    i32: [4, (view, at) => view.getInt32(at, true)],
    u8: [1, (view, at) => view.getUint8(at)],
};
