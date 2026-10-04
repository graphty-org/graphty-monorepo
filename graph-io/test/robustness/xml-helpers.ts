/**
 * Shared helpers of the robustness suite: import through the registry, collect the ImportError of
 * a rejected import, and build GraphML / GEXF documents around a few elements.
 */

import { type GraphSnapshot } from "@graphty/graph-format";
import { expect } from "vitest";

import { importGraph, type ImportGraphOptions, type ImportGraphResult } from "../../src/registry.js";
import { ImportError, type ImportInput, type ImportIssue, type ImportReport } from "../../src/types.js";

/** The two XML formats the shared tokenizer serves. */
export type XmlFormat = "graphml" | "gexf";

export const GRAPHML_NS = "http://graphml.graphdrawing.org/xmlns";
export const GEXF_NS = "http://gexf.net/1.3";

/**
 * Import a document.
 * @param format - the format
 * @param input - the document
 * @param options - import options
 * @returns the snapshot and report
 */
export async function load(
    format: XmlFormat,
    input: ImportInput,
    options: Omit<ImportGraphOptions, "format"> = {},
): Promise<ImportGraphResult> {
    return importGraph(input, { ...options, format });
}

/**
 * Import a document that must be rejected and return the ImportError.
 * @param format - the format
 * @param input - the document
 * @param options - import options
 * @returns the error
 */
export async function rejection(
    format: XmlFormat,
    input: ImportInput,
    options: Omit<ImportGraphOptions, "format"> = {},
): Promise<ImportError> {
    try {
        await importGraph(input, { ...options, format });
    } catch (err) {
        if (err instanceof ImportError) {
            return err;
        }
        throw err;
    }
    throw new Error("the import was expected to be rejected");
}

/**
 * The fatal issue of a rejected import: the last error of its report, with its code.
 * @param err - the ImportError
 * @param code - the expected code
 * @returns the issue
 */
export function fatal(err: ImportError, code: string): ImportIssue {
    const issue = err.report.issues[err.report.issues.length - 1];
    expect(issue.code, issue.message).toBe(code);
    expect(issue.severity).toBe("error");
    return issue;
}

/**
 * The codes of a report's issues, in order.
 * @param report - the report
 * @returns the codes
 */
export function codes(report: ImportReport): string[] {
    return report.issues.map((issue) => issue.code);
}

/**
 * The issues of one code.
 * @param report - the report
 * @param code - the code
 * @returns the issues
 */
export function issuesOf(report: ImportReport, code: string): ImportIssue[] {
    return report.issues.filter((issue) => issue.code === code);
}

/**
 * A GraphML document.
 * @param body - the children of `<graph>`
 * @param keys - `<key>` elements before the graph
 * @param graphAttrs - extra `<graph>` attributes
 * @returns the document
 */
export function graphml(body: string, keys = "", graphAttrs = ""): string {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<graphml xmlns="${GRAPHML_NS}">${keys}<graph edgedefault="directed"${graphAttrs}>${body}</graph></graphml>`;
}

/**
 * A GEXF 1.3 document.
 * @param nodes - the children of `<nodes>`
 * @param edges - the children of `<edges>`, or null for no edges section
 * @param head - elements before `<nodes>` (attribute declarations)
 * @param graphAttrs - extra `<graph>` attributes
 * @returns the document
 */
export function gexf(nodes: string, edges: string | null = null, head = "", graphAttrs = ""): string {
    const edgeSection = edges === null ? "" : `<edges>${edges}</edges>`;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<gexf xmlns="${GEXF_NS}" xmlns:viz="${GEXF_NS}/viz" version="1.3"><graph defaultedgetype="directed"${graphAttrs}>${head}<nodes>${nodes}</nodes>${edgeSection}</graph></gexf>`;
}

/**
 * A document of either format holding the given nodes (as `<node id>` elements).
 * @param format - the format
 * @param nodes - the node elements
 * @returns the document
 */
export function nodesDoc(format: XmlFormat, nodes: string): string {
    return format === "graphml" ? graphml(nodes) : gexf(nodes);
}

/**
 * Encode text as bytes: UTF-8, or Latin-1 / UTF-16 for the encoding tests.
 * @param text - the text (ASCII in source; non-ASCII built with String.fromCharCode)
 * @param encoding - the encoding
 * @returns the bytes
 */
export function bytesOf(text: string, encoding: "utf-8" | "latin1" | "utf-16le" | "utf-16be" = "utf-8"): Uint8Array {
    if (encoding === "utf-8") {
        return new TextEncoder().encode(text);
    }
    if (encoding === "latin1") {
        return Uint8Array.from(text, (ch) => ch.charCodeAt(0));
    }
    const out = new Uint8Array(text.length * 2);
    for (let i = 0; i < text.length; i++) {
        const unit = text.charCodeAt(i);
        const hi = unit >> 8;
        const lo = unit & 0xff;
        out[2 * i] = encoding === "utf-16le" ? lo : hi;
        out[2 * i + 1] = encoding === "utf-16le" ? hi : lo;
    }
    return out;
}

/**
 * Join byte arrays.
 * @param parts - the parts
 * @returns one array
 */
export function concat(...parts: (Uint8Array | readonly number[])[]): Uint8Array {
    const arrays = parts.map((p) => (p instanceof Uint8Array ? p : Uint8Array.from(p)));
    const out = new Uint8Array(arrays.reduce((n, a) => n + a.byteLength, 0));
    let at = 0;
    for (const a of arrays) {
        out.set(a, at);
        at += a.byteLength;
    }
    return out;
}

/**
 * An async iterable of text chunks.
 * @param chunks - the chunks
 * @returns the iterable
 */
export function textStream(chunks: readonly string[]): AsyncIterable<string> {
    return {
        async *[Symbol.asyncIterator](): AsyncGenerator<string> {
            for (const chunk of chunks) {
                await Promise.resolve();
                yield chunk;
            }
        },
    };
}

/**
 * The node ids of a snapshot, in index order.
 * @param result - an import result (or anything holding its snapshot)
 * @returns the ids
 */
export function ids(result: { readonly snapshot: GraphSnapshot }): unknown[] {
    const out: unknown[] = [];
    for (let i = 0; i < result.snapshot.nodeCount; i++) {
        out.push(result.snapshot.ids.idOf(i));
    }
    return out;
}
