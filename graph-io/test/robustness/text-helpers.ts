/**
 * Helpers of the parser robustness suite (test/robustness/<format>.test.ts): input builders for
 * bytes in a given encoding and for chunked streams, and readers of a snapshot and a report.
 */

import { type GraphSnapshot } from "@graphty/graph-format";
import { expect } from "vitest";

import { ImportError, type ImportReport } from "../../src/index.js";

/**
 * Await an import that must fail, and return its ImportError.
 * @param promise - the import
 * @returns the error, checked to be an ImportError with a report
 */
export async function rejects(promise: Promise<unknown>): Promise<ImportError> {
    let caught: unknown = null;
    try {
        await promise;
    } catch (err) {
        caught = err;
    }
    expect(caught).toBeInstanceOf(ImportError);
    const err = caught as ImportError;
    expect(err.report).toBeDefined();
    return err;
}

/**
 * The fatal code of an ImportError (the code of the issue that aborted the import).
 * @param err - the error
 * @returns the code
 */
export function fatalCode(err: ImportError): unknown {
    return err.details.code;
}

/**
 * The issue codes of a report, in order.
 * @param report - the report
 * @returns the codes
 */
export function codes(report: ImportReport): string[] {
    return report.issues.map((issue) => issue.code);
}

/**
 * The issue of a report with a code (the first).
 * @param report - the report
 * @param code - the code
 * @returns the issue
 */
export function issue(report: ImportReport, code: string): ImportReport["issues"][number] {
    const found = report.issues.find((i) => i.code === code);
    expect(found, `issue ${code} in ${codes(report).join(", ")}`).toBeDefined();
    return found as ImportReport["issues"][number];
}

/**
 * The node ids in index order.
 * @param s - the snapshot
 * @returns the ids
 */
export function ids(s: GraphSnapshot): unknown[] {
    return Array.from({ length: s.nodeCount }, (_, i) => s.ids.idOf(i));
}

/**
 * The edges as `source-target` id pairs, in edge order.
 * @param s - the snapshot
 * @returns the pairs
 */
export function edgePairs(s: GraphSnapshot): string[] {
    const list = s.edgeList();
    return Array.from(
        { length: list.src.length },
        (_, e) => `${String(s.ids.idOf(list.src[e]))}-${String(s.ids.idOf(list.dst[e]))}`,
    );
}

/**
 * A column's values by row, undefined where unset; vector cells (positions) as plain arrays.
 * @param s - the snapshot
 * @param table - nodes, edges or graph
 * @param name - the column name
 * @returns the values
 */
export function column(s: GraphSnapshot, table: "nodes" | "edges" | "graph", name: string): unknown[] {
    const c = s[table].require(name);
    return Array.from({ length: c.length }, (_, r) => {
        if (!c.isSet(r)) {
            return undefined;
        }
        const value: unknown = c.value(r);
        return ArrayBuffer.isView(value) ? Array.from(value as unknown as ArrayLike<number>) : value;
    });
}

/**
 * UTF-8 bytes of a text.
 * @param text - the text
 * @returns the bytes
 */
export function utf8(text: string): Uint8Array {
    return new TextEncoder().encode(text);
}

/**
 * One byte per character (Latin-1 / windows-1252 bytes of a text whose characters are below 256).
 * @param text - the text
 * @returns the bytes
 */
export function latin1(text: string): Uint8Array {
    return Uint8Array.from(text, (c) => c.charCodeAt(0));
}

/**
 * UTF-16LE bytes of a text, with or without the FF FE byte order mark.
 * @param text - the text (BMP characters)
 * @param bom - whether to write the byte order mark
 * @returns the bytes
 */
export function utf16le(text: string, bom: boolean): Uint8Array {
    const out: number[] = bom ? [0xff, 0xfe] : [];
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        out.push(code & 0xff, code >> 8);
    }
    return Uint8Array.from(out);
}

/**
 * Join byte arrays.
 * @param parts - the parts
 * @returns one array
 */
export function concat(...parts: Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((sum, p) => sum + p.byteLength, 0));
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.byteLength;
    }
    return out;
}

/**
 * An async iterable over the given chunks, as a caller's stream would yield them.
 * @param parts - text or byte chunks
 * @yields each chunk in order
 */
export async function* chunks(...parts: (string | Uint8Array)[]): AsyncGenerator<string | Uint8Array> {
    for (const part of parts) {
        await Promise.resolve();
        yield part;
    }
}

/** The first bytes of a gzip member (the magic 1f 8b, deflate, then compressed data). */
export const GZIP_BYTES = Uint8Array.from([
    0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xcb, 0x48, 0xcd, 0xc9, 0xc9, 0x07, 0x00,
]);

/** The first bytes of a zip local file header (PK 03 04) and its binary fields. */
export const ZIP_BYTES = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x9c, 0x88]);

/** An HTML error page, as a server returns for a missing file. */
export const HTML_404 = "<!DOCTYPE html><html><head><title>404 Not Found</title></head><body>Not Found</body></html>";
