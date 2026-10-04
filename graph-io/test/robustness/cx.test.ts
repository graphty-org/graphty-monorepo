/**
 * Robustness of the CX version 1 importer: wrong formats, encodings, truncation, malformed syntax
 * and values, and the semantic traps of the format (subnetwork membership, scopes, prototype
 * names). Each test pins the exact outcome: the issue codes recorded and the data kept, or the
 * ImportError and its code. Conditions already pinned by test/formats/cx and test/audit are not
 * repeated here.
 */

import { GraphBuilder, type GraphBuilderOptions, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { CX_ISSUE, cxImporter, type CxImportOptions } from "../../src/formats/cx/index.js";
import { importGraph, sniff } from "../../src/registry.js";
import { type CommonImportOptions, ImportError, type ImportInput, type ImportReport } from "../../src/types.js";

type Options = CxImportOptions & CommonImportOptions;

interface Imported {
    snapshot: GraphSnapshot;
    report: ImportReport;
}

const VERIFY = { numberVerification: [{ longNumber: 281474976710655 }] };

/** A CX document from its fragments, with numberVerification first and a status last. */
function cx(fragments: readonly Record<string, unknown>[]): string {
    return JSON.stringify([VERIFY, ...fragments, { status: [{ error: "", success: true }] }]);
}

async function load(
    input: ImportInput,
    options?: Options,
    builder: Partial<GraphBuilderOptions> = {},
): Promise<Imported> {
    const sink = new GraphBuilder({ directed: true, weightDtype: "f64", ...builder });
    const report = await cxImporter.import(input, sink, options);
    return { snapshot: sink.freeze(), report };
}

async function failure(input: ImportInput, options?: Options): Promise<ImportError> {
    try {
        await load(input, options);
    } catch (err) {
        if (err instanceof ImportError) {
            return err;
        }
        throw err;
    }
    throw new Error("expected an ImportError");
}

const codes = (report: ImportReport): string[] => [...new Set(report.issues.map((i) => i.code))];

const issuesOf = (report: ImportReport, code: string): ImportReport["issues"] =>
    report.issues.filter((i) => i.code === code);

const value = (s: GraphSnapshot, column: string, id: number | string): unknown => {
    const c = s.nodes.get(column);
    const i = s.ids.indexOf(id);
    return c === null || i < 0 || !c.isSet(i) ? undefined : c.value(i);
};

const edgeValue = (s: GraphSnapshot, column: string, e: number): unknown => {
    const c = s.edges.get(column);
    return c === null || !c.isSet(e) ? undefined : c.value(e);
};

const point = (s: GraphSnapshot, id: number): number[] | undefined => {
    const p = value(s, "position", id) as ArrayLike<number> | undefined;
    return p === undefined ? undefined : Array.from(p);
};

const bytes = (...parts: (string | readonly number[])[]): Uint8Array => {
    const out: number[] = [];
    for (const part of parts) {
        if (typeof part === "string") {
            out.push(...new TextEncoder().encode(part));
        } else {
            out.push(...part);
        }
    }
    return new Uint8Array(out);
};

const utf16 = (text: string, order: "be" | "le", bom: boolean): Uint8Array => {
    const mark = order === "be" ? [0xfe, 0xff] : [0xff, 0xfe];
    const out: number[] = bom ? mark : [];
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        out.push(...(order === "be" ? [c >> 8, c & 0xff] : [c & 0xff, c >> 8]));
    }
    return new Uint8Array(out);
};

async function* chunks(text: string, cuts: readonly number[]): AsyncGenerator<string> {
    let from = 0;
    for (const cut of [...cuts, text.length]) {
        yield text.slice(from, cut);
        from = cut;
        await Promise.resolve();
    }
}

const TWO_NODES = { nodes: [{ "@id": 1, n: "a" }, { "@id": 2, n: "b" }] };

describe("cx robustness: the wrong format", () => {
    it("fails on whitespace only with E_EMPTY_INPUT", async () => {
        expect(codes((await failure(" \t\n\r\n  ")).report)).toEqual([CX_ISSUE.EMPTY_INPUT]);
    });

    it("fails on an HTML error page with E_SYNTAX naming HTML", async () => {
        const error = await failure("<!DOCTYPE html>\n<html><head><title>502 Bad Gateway</title></head></html>");
        expect(codes(error.report)).toEqual([CX_ISSUE.SYNTAX]);
        expect(error.message).toMatch(/HTML or XML/);
    });

    it("fails on gzip bytes with E_INVALID_UTF8 naming gzip, not a misleading UTF-8 message", async () => {
        const gz = bytes([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x8b, 0xae, 0x05, 0x00]);
        const error = await failure(gz);
        expect(codes(error.report)).toEqual([CX_ISSUE.INVALID_UTF8]);
        expect(error.message).toMatch(/gzip/);
        expect(error.message).not.toMatch(/after valid non-ASCII/);
    });

    it("fails on a ZIP archive naming it, whether its bytes decode or not", async () => {
        const ascii = await failure("PK\u0003\u0004\u0014\u0000\u0008\u0000session.cys");
        expect(codes(ascii.report)).toEqual([CX_ISSUE.SYNTAX]);
        expect(ascii.message).toMatch(/ZIP archive/);
        const binary = await failure(bytes("PK", [0x03, 0x04, 0x14, 0x00, 0x08, 0x00, 0xc3, 0x28, 0x91]));
        expect(codes(binary.report)).toEqual([CX_ISSUE.INVALID_UTF8]);
        expect(binary.message).toMatch(/ZIP archive/);
    });

    it("fails on a scalar document (42, a string, null) with E_CX_NOT_CX", async () => {
        for (const text of ["42", '"hello"', "null"]) {
            expect(codes((await failure(text)).report), text).toEqual([CX_ISSUE.NOT_CX]);
        }
    });

    it("fails on a Cytoscape.js elements array with E_CX_NOT_CX, not an empty graph", async () => {
        const error = await failure(
            JSON.stringify([
                { data: { id: "a" } },
                { data: { id: "b" } },
                { data: { id: "e", source: "a", target: "b" } },
            ]),
        );
        expect(codes(error.report)).toEqual([CX_ISSUE.NOT_CX]);
        expect(error.message).toMatch(/Cytoscape\.js/);
    });

    it("fails on an array of arrays: E_BAD_ASPECT_BLOCK per member, then E_CX_NOT_CX", async () => {
        const error = await failure("[[1,2],[3]]");
        expect(issuesOf(error.report, CX_ISSUE.BAD_ASPECT_BLOCK)).toHaveLength(2);
        expect(error.report.issues.at(-1)?.code).toBe(CX_ISSUE.NOT_CX);
    });

    it("refuses a top-level object at its first character, without reading or parsing the rest", async () => {
        // invalid JSON after the brace: it is never parsed, so the failure is E_CX_NOT_CX, not E_SYNTAX
        expect(codes((await failure('{"elements": [1, 2')).report)).toEqual([CX_ISSUE.NOT_CX]);
        const deep = `{"a":${"[".repeat(100000)}${"]".repeat(100000)}}`;
        expect(codes((await failure(deep)).report)).toEqual([CX_ISSUE.NOT_CX]);
    });

    it("reads newline-delimited fragments as an object document (E_CX_NOT_CX) and two arrays as E_SYNTAX", async () => {
        // one fragment per line starts with "{": refused as a top-level object at once
        expect(codes((await failure('{"nodes":[{"@id":1}]}\n{"edges":[]}')).report)).toEqual([CX_ISSUE.NOT_CX]);
        const twice = await failure('[{"nodes":[{"@id":1}]}][{"edges":[]}]');
        expect(codes(twice.report)).toEqual([CX_ISSUE.SYNTAX]);
        expect(twice.message).toMatch(/after the closing bracket/);
    });

    it("sniffs a UTF-16 CX file with a BOM and one with more than 1 KB of leading whitespace", () => {
        const doc = cx([TWO_NODES]);
        for (const head of [utf16(doc, "le", true), utf16(doc, "be", true), bytes(" ".repeat(2000), doc)]) {
            expect(cxImporter.sniff?.(head)).toBe(0.95);
            expect(sniff({ head })?.format).toBe("cx");
        }
    });
});

describe("cx robustness: encodings", () => {
    it("names UTF-16 without a byte order mark (big- and little-endian) in an E_SYNTAX", async () => {
        for (const order of ["be", "le"] as const) {
            const error = await failure(utf16(cx([TWO_NODES]), order, false));
            expect(codes(error.report), order).toEqual([CX_ISSUE.SYNTAX]);
            expect(error.message, order).toMatch(/UTF-16/);
        }
    });

    it("decodes UTF-16 by its byte order mark and imports normally", async () => {
        for (const order of ["be", "le"] as const) {
            const { snapshot, report } = await load(utf16(cx([TWO_NODES]), order, true));
            expect(codes(report), order).toEqual([]);
            expect(snapshot.ids.toArray()).toEqual([1, 2]);
            expect(value(snapshot, "name", 2)).toBe("b");
        }
    });

    it("records E_BAD_VALUE for an escaped lone surrogate in a node name and keeps importing", async () => {
        const { snapshot, report } = await load('[{"nodes":[\n{"@id":1,"n":"a\\ud800"},\n{"@id":2,"n":"b"}]}]');
        expect(codes(report)).toEqual([CX_ISSUE.BAD_VALUE]);
        expect(report.issues[0].line).toBe(2);
        expect(snapshot.ids.toArray()).toEqual([1, 2]);
        expect(value(snapshot, "name", 1)).toBe(`a${String.fromCharCode(0xfffd)}`);
    });

    it("records E_BAD_VALUE for lone surrogates in a citation, an unknown aspect and a visual property", async () => {
        const text = cx([
            TWO_NODES,
            { citations: [{ "@id": 50, "dc:title": "LONE" }] },
            { myAspect: [{ a: "LONE" }] },
            { cyVisualProperties: [{ properties_of: "nodes", applies_to: 1, properties: { NODE_LABEL: "LONE" } }] },
        ]).replace(/LONE/g, "x\\udc00");
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([CX_ISSUE.BAD_VALUE]);
        expect(issuesOf(report, CX_ISSUE.BAD_VALUE)).toHaveLength(3);
        const repaired = `x${String.fromCharCode(0xfffd)}`;
        expect(snapshot.extensions.get("cx:citations")?.get("dc:title")?.value(0)).toBe(repaired);
        expect((snapshot.meta.extra.cx as Record<string, unknown>).myAspect).toEqual([{ a: repaired }]);
        expect(value(snapshot, "NODE_LABEL", 1)).toBe(repaired);
    });

    it("repairs a lone surrogate in an element's own key, in what is kept and in what is reported", async () => {
        const kept = await load(cx([TWO_NODES, { myAspect: [{ LONE: 1 }] }]).replace("LONE", "\\ud800k"));
        expect(codes(kept.report)).toEqual([CX_ISSUE.BAD_VALUE]);
        expect((kept.snapshot.meta.extra.cx as Record<string, unknown>).myAspect).toEqual([{ [`${String.fromCharCode(0xfffd)}k`]: 1 }]);
        const node = await load('[{"nodes":[{"@id":1,"\\udc00":1}]}]');
        expect(codes(node.report)).toEqual([CX_ISSUE.BAD_VALUE, CX_ISSUE.UNKNOWN_ELEMENT]);
        const unknown = issuesOf(node.report, CX_ISSUE.UNKNOWN_ELEMENT)[0];
        expect(unknown.message).not.toMatch(/[\ud800-\udfff]/);
        expect(unknown.message).toContain(String.fromCharCode(0xfffd));
    });

    it("warns W_DUPLICATE_ATTRIBUTE when two keys become one once their lone surrogates are repaired", async () => {
        const text = cx([TWO_NODES, { myAspect: [{ a: { ONE: 1, TWO: 2 } }] }]);
        const { snapshot, report } = await load(text.replace("ONE", "\\ud800").replace("TWO", "\\ud801"));
        expect(codes(report)).toEqual([CX_ISSUE.DUPLICATE_ATTRIBUTE, CX_ISSUE.BAD_VALUE]);
        expect(issuesOf(report, CX_ISSUE.BAD_VALUE)[0].message).toMatch(/^2 string/);
        expect((snapshot.meta.extra.cx as Record<string, unknown>).myAspect).toEqual([{ a: { [String.fromCharCode(0xfffd)]: 2 } }]);
    });

    it("fails a file cut inside a UTF-8 character with E_INVALID_UTF8, without a windows-1252 fallback", async () => {
        const error = await failure(bytes('[{"nodes":[{"@id":1,"n":"', [0xe2, 0x82]));
        expect(codes(error.report)).toEqual([CX_ISSUE.INVALID_UTF8]);
        expect(error.message).toMatch(/ends inside a UTF-8 character/);
    });
});

describe("cx robustness: malformed syntax and truncation", () => {
    it("fails on a raw control character inside a string with E_SYNTAX at its line", async () => {
        const error = await failure('[{"nodes":[\n{"@id":1,"n":"a\tb"}]}]');
        expect(codes(error.report)).toEqual([CX_ISSUE.SYNTAX]);
        expect(error.report.issues[0].line).toBe(2);
    });

    it("fails on an invalid escape with E_SYNTAX", async () => {
        expect(codes((await failure('[{"nodes":[{"@id":1,"n":"a\\x"}]}]')).report)).toEqual([CX_ISSUE.SYNTAX]);
    });

    it("fails a file cut after a backslash or inside a \\u escape: E_SYNTAX, ends inside a string", async () => {
        for (const text of ['[{"nodes":[{"@id":1,"n":"a\\', '[{"nodes":[{"@id":1,"n":"a\\u00']) {
            const error = await failure(text);
            expect(codes(error.report), text).toEqual([CX_ISSUE.SYNTAX]);
            expect(error.message, text).toMatch(/ends inside a string/);
        }
    });

    it("fails a file cut inside a number or a literal: E_SYNTAX, ends inside a value", async () => {
        for (const text of ['[{"nodes":[{"@id":12', '[{"status":[{"success":tr']) {
            const error = await failure(text);
            expect(codes(error.report), text).toEqual([CX_ISSUE.SYNTAX]);
            expect(error.message, text).toMatch(/ends inside a value/);
        }
    });

    it("fails a file cut inside or after the aspect key with E_SYNTAX", async () => {
        for (const text of ['[{"nod', '[{"nodes"', '[{"nodes":']) {
            expect(codes((await failure(text)).report), text).toEqual([CX_ISSUE.SYNTAX]);
        }
    });

    it("fails on a trailing comma in a block or after the last fragment with E_SYNTAX at its line", async () => {
        for (const text of ['[{"nodes":[{"@id":1},\n]}]', '[{"nodes":[{"@id":1}]},\n]']) {
            const error = await failure(text);
            expect(codes(error.report), text).toEqual([CX_ISSUE.SYNTAX]);
            expect(error.report.issues[0].line, text).toBe(2);
        }
    });

    it("fails on comments and on single quotes with E_SYNTAX", async () => {
        for (const text of [
            '[{"nodes":[{"@id":1}]},\n// note\n{"edges":[]}]',
            '[{"nodes":[{"@id":1}]},\n/* note */\n{"edges":[]}]',
            "[{'nodes':[{'@id':1}]}]",
        ]) {
            expect(codes((await failure(text)).report), text).toEqual([CX_ISSUE.SYNTAX]);
        }
    });

    it("fails on NUL padding after the document with E_SYNTAX", async () => {
        const error = await failure(bytes(cx([TWO_NODES]), [0, 0, 0, 0]));
        expect(codes(error.report)).toEqual([CX_ISSUE.SYNTAX]);
        expect(error.message).toMatch(/after the closing bracket/);
    });

    it("gives the line of an error in a file with CR-only line endings", async () => {
        const error = await failure(["[", '{"nodes":[', '{"@id":1},', '{"@id":x}', "]}", "]"].join("\r"));
        expect(codes(error.report)).toEqual([CX_ISSUE.SYNTAX]);
        expect(error.report.issues[0].line).toBe(4);
    });

    it("reads every array-valued key of a multi-aspect fragment, with W_MULTI_ASPECT_FRAGMENT", async () => {
        const { snapshot, report } = await load('[{"nodes":[{"@id":1}],"edges":[{"@id":3,"s":1,"t":1}]}]');
        expect(codes(report)).toEqual([CX_ISSUE.MULTI_ASPECT_FRAGMENT]);
        expect(snapshot.nodeCount).toBe(1);
        expect(snapshot.edgeCount).toBe(1);
        const twice = await load('[{"nodes":[{"@id":1}],"nodes":[{"@id":2}]}]');
        expect(codes(twice.report)).toEqual([CX_ISSUE.MULTI_ASPECT_FRAGMENT]);
        expect(twice.snapshot.ids.toArray()).toEqual([1, 2]);
    });

    it("reads the array-valued keys of a fragment whatever their order, naming the others", async () => {
        for (const first of ['"x":1', '"networkAttributes":{"n":"name","v":"a"}']) {
            const { snapshot, report } = await load(`[{${first},"nodes":[{"@id":1}]}]`);
            expect(codes(report)).toEqual([CX_ISSUE.MULTI_ASPECT_FRAGMENT, CX_ISSUE.BAD_ASPECT_BLOCK]);
            expect(snapshot.ids.toArray()).toEqual([1]);
        }
    });

    it("reports a CX aspect written as one object with W_SINGLE_OBJECT_ASPECT and reads it", async () => {
        const { snapshot, report } = await load('[{"nodes":{"@id":1}}]');
        expect(codes(report)).toEqual([CX_ISSUE.SINGLE_OBJECT_ASPECT]);
        expect(snapshot.ids.toArray()).toEqual([1]);
    });

    it("reads a stream split inside an escaped aspect key, after a backslash and inside a big id the same way", async () => {
        const text = '[{"\\u006eodes":[{"@id":12345678901234567891,"n":"a\\"b"}]},{"edges":[]}]';
        const whole = await load(text);
        expect(whole.snapshot.ids.toArray()).toEqual(["12345678901234567891"]);
        expect(value(whole.snapshot, "name", "12345678901234567891")).toBe('a"b');
        expect(codes(whole.report)).toEqual([CX_ISSUE.PRECISION]);
        for (let cut = 1; cut < text.length; cut++) {
            const split = await load(chunks(text, [cut]));
            expect(split.snapshot.ids.toArray(), `cut at ${cut}`).toEqual(["12345678901234567891"]);
            expect(codes(split.report), `cut at ${cut}`).toEqual([CX_ISSUE.PRECISION]);
        }
    });
});

describe("cx robustness: values", () => {
    it("reads bare NaN and Infinity tokens (Python's json) as numbers with W_JSON_NONSTANDARD_NUMBER", async () => {
        const text = cx([
            TWO_NODES,
            {
                nodeAttributes: [
                    { po: 1, n: "x", v: "@NaN", d: "double" },
                    { po: 1, n: "y", v: "@Infinity", d: "double" },
                    { po: 2, n: "y", v: "@-Infinity", d: "double" },
                ],
            },
        ]).replace(/"@(NaN|Infinity|-Infinity)"/g, "$1");
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([CX_ISSUE.JSON_NONSTANDARD_NUMBER]);
        expect(value(snapshot, "x", 1)).toBeNaN();
        expect(value(snapshot, "y", 1)).toBe(Infinity);
        expect(value(snapshot, "y", 2)).toBe(-Infinity);
    });

    it("reads a bare NaN id as E_INVALID_ID for that node and goes on", async () => {
        const { snapshot, report } = await load('[{"nodes":[{"@id":NaN},{"@id":2}]}]');
        expect(codes(report)).toEqual([CX_ISSUE.JSON_NONSTANDARD_NUMBER, CX_ISSUE.INVALID_ID]);
        expect(snapshot.ids.toArray()).toEqual([2]);
        expect(report.counts.skippedNodes).toBe(1);
    });

    it("merges -0 and 0 into one node with W_DUPLICATE_NODE", async () => {
        const { snapshot, report } = await load('[{"nodes":[{"@id":-0,"n":"a"},{"@id":0,"n":"b"}]}]');
        expect(codes(report)).toEqual([CX_ISSUE.DUPLICATE_NODE]);
        expect(snapshot.ids.toArray()).toEqual([0]);
        expect(Object.is(snapshot.ids.toArray()[0], 0)).toBe(true);
        expect(value(snapshot, "name", 0)).toBe("b");
    });

    it("gives the line of an invalid id and of an invalid endpoint", async () => {
        const text = [
            "[",
            '{"nodes":[',
            '{"@id":1},',
            '{"@id":"x"}',
            "]},",
            '{"edges":[',
            '{"@id":5,"s":1,"t":1.5}',
            "]}",
            "]",
        ].join("\n");
        const { report } = await load(text);
        expect(issuesOf(report, CX_ISSUE.INVALID_ID).map((i) => i.line)).toEqual([4, 7]);
    });

    it("reports node and edge keys CX does not define with W_UNKNOWN_ELEMENT, once per key", async () => {
        const { snapshot, report } = await load(
            cx([
                {
                    nodes: [
                        { "@id": 1, x: 5, zz: 1 },
                        { "@id": 2, zz: 3 },
                    ],
                },
                { edges: [{ "@id": 3, s: 1, t: 2, w: 3 }] },
            ]),
        );
        expect(codes(report)).toEqual([CX_ISSUE.UNKNOWN_ELEMENT]);
        expect(issuesOf(report, CX_ISSUE.UNKNOWN_ELEMENT).map((i) => i.element)).toEqual(["x", "zz", "w"]);
        expect(snapshot.nodeCount).toBe(2);
        expect(snapshot.edgeCount).toBe(1);
    });

    it("keeps an element whose core fields have the wrong type, with E_BAD_VALUE per field", async () => {
        const { snapshot, report } = await load(
            cx([{ nodes: [{ "@id": 1, n: { a: 1 }, r: ["x"] }, { "@id": 2 }] }, { edges: [{ "@id": 3, s: 1, t: 2, i: 5 }] }]),
        );
        expect(codes(report)).toEqual([CX_ISSUE.BAD_VALUE]);
        expect(issuesOf(report, CX_ISSUE.BAD_VALUE)).toHaveLength(3);
        expect(snapshot.nodeCount).toBe(2);
        expect(snapshot.edgeCount).toBe(1);
    });

    it("warns about a key one element holds twice; the later value is read", async () => {
        const { snapshot, report } = await load('[{"nodes":[{"@id":1,"@id":2}]}]');
        expect(codes(report)).toEqual([CX_ISSUE.DUPLICATE_ATTRIBUTE]);
        expect(report.issues[0].element).toBe("@id");
        expect(snapshot.ids.toArray()).toEqual([2]);
    });

    it("finds a repeated key and a non-integer id literal however much whitespace precedes the colon", async () => {
        const pad = " ".repeat(80);
        const dup = await load(`[{"nodes":[{"@id":1,"n":"a","n"${pad}:"b"}]}]`);
        expect(codes(dup.report)).toEqual([CX_ISSUE.DUPLICATE_ATTRIBUTE]);
        expect(value(dup.snapshot, "name", 1)).toBe("b");
        const inexact = await load(`[{"nodes":[{"@id"${pad}:${pad}1.${"0".repeat(80)}}]}]`);
        expect(codes(inexact.report)).toEqual([CX_ISSUE.ID_TEXT_TYPE]);
        expect(inexact.snapshot.ids.toArray()).toEqual([1]);
    });

    it("stores a double beyond its range as Infinity with W_PRECISION; reads integer 007 as 7 silently", async () => {
        const { snapshot, report } = await load(
            cx([
                TWO_NODES,
                {
                    nodeAttributes: [
                        { po: 1, n: "big", v: "1e400", d: "double" },
                        { po: 1, n: "count", v: "007", d: "integer" },
                    ],
                },
            ]),
        );
        expect(codes(report)).toEqual([CX_ISSUE.PRECISION]);
        expect(value(snapshot, "big", 1)).toBe(Infinity);
        expect(value(snapshot, "count", 1)).toBe(7);
    });

    it("applies an attribute element whose po is a list of nodes to every listed node", async () => {
        const { snapshot, report } = await load(
            cx([TWO_NODES, { nodeAttributes: [{ po: [1, 2], n: "shared", v: "x" }] }]),
        );
        expect(codes(report)).toEqual([]);
        expect(value(snapshot, "shared", 1)).toBe("x");
        expect(value(snapshot, "shared", 2)).toBe("x");
    });

    it("reports an attribute name that is empty or not a string as E_BAD_VALUE, a missing one as E_MISSING_ID", async () => {
        const { snapshot, report } = await load(
            cx([
                TWO_NODES,
                { edges: [{ "@id": 3, s: 1, t: 2 }] },
                {
                    nodeAttributes: [
                        { po: 1, n: "", v: "x" },
                        { po: 1, n: 5, v: "x" },
                        { po: 1, n: { a: 1 }, v: "x" },
                        { po: 1, v: "x" },
                        { po: 1, n: "ok", v: "y" },
                    ],
                },
                { edgeAttributes: [{ po: 3, n: "", v: "x" }] },
                { networkAttributes: [{ n: "", v: "x" }] },
            ]),
        );
        expect(issuesOf(report, CX_ISSUE.BAD_VALUE)).toHaveLength(5);
        expect(issuesOf(report, CX_ISSUE.MISSING_ID)).toHaveLength(1);
        expect(value(snapshot, "ok", 1)).toBe("y");
    });

    it("reads a data type named like an Object.prototype member as an unknown type, kept as text", async () => {
        const types = ["constructor", "toString", "hasOwnProperty", "list_of___proto__"];
        const { snapshot, report } = await load(
            cx([TWO_NODES, { nodeAttributes: types.map((d, i) => ({ po: 1, n: `a${i}`, v: "7", d })) }]),
        );
        expect(codes(report)).toEqual([CX_ISSUE.UNKNOWN_ATTR_TYPE]);
        expect(issuesOf(report, CX_ISSUE.UNKNOWN_ATTR_TYPE)).toHaveLength(4);
        for (let i = 0; i < types.length; i++) {
            expect(value(snapshot, `a${i}`, 1)).toBe("7");
        }
    });

    it("refuses a list for the name, represents or interaction attribute with E_BAD_VALUE", async () => {
        const { snapshot, report } = await load(
            cx([
                TWO_NODES,
                { edges: [{ "@id": 3, s: 1, t: 2, i: "binds" }] },
                { nodeAttributes: [{ po: 1, n: "name", v: ["x", "y"], d: "list_of_string" }] },
                { edgeAttributes: [{ po: 3, n: "interaction", v: ["p"], d: "list_of_string" }] },
            ]),
        );
        expect(codes(report)).toEqual([CX_ISSUE.BAD_VALUE]);
        expect(issuesOf(report, CX_ISSUE.BAD_VALUE)).toHaveLength(2);
        expect(value(snapshot, "name", 1)).toBe("a");
        expect(edgeValue(snapshot, "interaction", 0)).toBe("binds");
    });

    it("warns W_ID_TEXT_TYPE for a non-integer id literal in a single-object aspect", async () => {
        const node = await load('[{"nodes":{"@id":1.0}}]');
        expect(codes(node.report)).toEqual([CX_ISSUE.SINGLE_OBJECT_ASPECT, CX_ISSUE.ID_TEXT_TYPE]);
        expect(node.snapshot.ids.toArray()).toEqual([1]);
        const edge = await load('[{"nodes":[{"@id":1},{"@id":2}]},{"edges":{"@id":3,"s":1e0,"t":2}}]');
        expect(codes(edge.report)).toEqual([CX_ISSUE.SINGLE_OBJECT_ASPECT, CX_ISSUE.ID_TEXT_TYPE]);
        expect(edge.snapshot.edgeCount).toBe(1);
    });

    it("reports a malformed status (not an object, a string success) with E_BAD_VALUE and reads on", async () => {
        for (const status of [[5], [{ success: "false", error: "x" }]]) {
            const { snapshot, report } = await load(
                JSON.stringify([VERIFY, { nodes: [{ "@id": 1 }] }, { status }]),
            );
            expect(codes(report), JSON.stringify(status)).toEqual([CX_ISSUE.BAD_VALUE]);
            expect(snapshot.nodeCount).toBe(1);
        }
    });

    it("warns about metaData counts that are not counts; compares a 17-digit count", async () => {
        const { report } = await load(
            JSON.stringify([
                {
                    metaData: [
                        { name: "nodes", elementCount: "5" },
                        { name: "edges", elementCount: 2.5 },
                        { name: 5, elementCount: 1 },
                    ],
                },
                { nodes: [{ "@id": 1 }] },
            ]).replace("]},{", ',{"name":"cyGroups","elementCount":12345678901234567}]},{'),
        );
        // the 17-digit count is also kept in meta.extra.cx.metaData as the nearest double: W_PRECISION
        expect(codes(report)).toEqual([CX_ISSUE.COUNT_MISMATCH, CX_ISSUE.PRECISION]);
        const messages = issuesOf(report, CX_ISSUE.COUNT_MISMATCH).map((i) => i.message);
        expect(messages.filter((m) => /not checked/.test(m))).toHaveLength(3);
        expect(messages.filter((m) => /declares 12345678901234568 "cyGroups"/.test(m))).toHaveLength(1);
    });

    it("counts an aspect declared in metaData under its old name as the aspect it is read as", async () => {
        const { report } = await load(
            JSON.stringify([
                { metaData: [{ name: "subNetworks", elementCount: 1 }] },
                { nodes: [{ "@id": 1 }] },
                { subNetworks: [{ "@id": 9, nodes: "all", edges: "all" }] },
            ]),
        );
        expect(codes(report)).toEqual([CX_ISSUE.OLD_ASPECT_NAME]);
    });
});

describe("cx robustness: layout, groups and structure", () => {
    it("reports a non-numeric z with E_BAD_VALUE and keeps x and y", async () => {
        const { snapshot, report } = await load(cx([TWO_NODES, { cartesianLayout: [{ node: 1, x: 1, y: 2, z: "3" }] }]));
        expect(codes(report)).toEqual([CX_ISSUE.BAD_VALUE]);
        expect(point(snapshot, 1)).toEqual([1, -2, 0]);
        expect(value(snapshot, "z", 1)).toBeUndefined();
    });

    it("reports layout elements that are not objects with E_BAD_ASPECT_BLOCK", async () => {
        const { snapshot, report } = await load(cx([TWO_NODES, { cartesianLayout: [5, null, { node: 1, x: 1, y: 1 }] }]));
        expect(codes(report)).toEqual([CX_ISSUE.BAD_ASPECT_BLOCK]);
        expect(issuesOf(report, CX_ISSUE.BAD_ASPECT_BLOCK)).toHaveLength(2);
        expect(point(snapshot, 1)).toEqual([1, -1, 0]);
    });

    it("refuses coordinates beyond the f32 position column with E_BAD_VALUE", async () => {
        const text = cx([
            TWO_NODES,
            {
                cartesianLayout: [
                    { node: 1, x: 1e39, y: 0 },
                    { node: 2, x: 0, y: "@1e400" },
                ],
            },
        ]).replace('"@1e400"', "1e400");
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([CX_ISSUE.BAD_VALUE]);
        expect(issuesOf(report, CX_ISSUE.BAD_VALUE)).toHaveLength(2);
        expect(point(snapshot, 1)).toBeUndefined();
        expect(point(snapshot, 2)).toBeUndefined();
    });

    it("warns once about two layout entries for one node; the later wins", async () => {
        const { snapshot, report } = await load(
            cx([
                TWO_NODES,
                {
                    cartesianLayout: [
                        { node: 1, x: 1, y: 1 },
                        { node: 1, x: 5, y: 5 },
                        { node: 2, x: 1, y: 1 },
                        { node: 2, x: 6, y: 6 },
                    ],
                },
            ]),
        );
        expect(codes(report)).toEqual([CX_ISSUE.DUPLICATE_ATTRIBUTE]);
        expect(issuesOf(report, CX_ISSUE.DUPLICATE_ATTRIBUTE)).toHaveLength(1);
        expect(point(snapshot, 1)).toEqual([5, -5, 0]);
    });

    it("reports cyGroups elements that are not objects, ids that are not integers, nodes and collapsed of the wrong type", async () => {
        const { snapshot, report } = await load(
            cx([
                { nodes: [{ "@id": 1 }, { "@id": 5 }] },
                {
                    cyGroups: [
                        5,
                        "x",
                        { "@id": "x", nodes: [1] },
                        { "@id": 1.5, nodes: [1] },
                        { nodes: [1] },
                        { "@id": 5, nodes: 2, collapsed: "true", internal_edges: [3], external_edges: [] },
                    ],
                },
            ]),
        );
        expect(issuesOf(report, CX_ISSUE.BAD_ASPECT_BLOCK)).toHaveLength(2);
        expect(issuesOf(report, CX_ISSUE.INVALID_ID)).toHaveLength(2);
        expect(issuesOf(report, CX_ISSUE.MISSING_ID)).toHaveLength(1);
        expect(issuesOf(report, CX_ISSUE.BAD_VALUE)).toHaveLength(2);
        expect(snapshot.nodes.get("collapsed")).toBeNull();
        const groups = (snapshot.meta.extra.cx as Record<string, unknown>).groups as Record<string, unknown>[];
        expect(groups.at(-1)).toMatchObject({ internal_edges: [3], external_edges: [] });
    });

    it("reports bad subnetwork elements and members instead of dropping them silently", async () => {
        const { snapshot, report } = await load(
            cx([
                TWO_NODES,
                { edges: [{ "@id": 3, s: 1, t: 2 }] },
                { cySubNetworks: [5, { "@id": 9, nodes: [1, "x", null, {}], edges: "ALL" }] },
            ]),
        );
        expect(issuesOf(report, CX_ISSUE.BAD_ASPECT_BLOCK)).toHaveLength(1);
        expect(issuesOf(report, CX_ISSUE.INVALID_ID)).toHaveLength(3);
        expect(issuesOf(report, CX_ISSUE.BAD_VALUE)).toHaveLength(1);
        expect(codes(report)).toContain(CX_ISSUE.ROOT_ONLY);
        expect(snapshot.ids.toArray()).toEqual([1]);
        expect(snapshot.edgeCount).toBe(0);
    });

    it("reads the first of two subnetworks with one id and reports the second", async () => {
        const { snapshot, report } = await load(
            cx([
                TWO_NODES,
                {
                    cySubNetworks: [
                        { "@id": 9, nodes: [1], edges: [] },
                        { "@id": 9, nodes: [2], edges: [] },
                    ],
                },
            ]),
        );
        expect(issuesOf(report, CX_ISSUE.BAD_ASPECT_BLOCK)).toHaveLength(1);
        expect(snapshot.ids.toArray()).toEqual([1]);
    });

    it("reports malformed cyViews and cyNetworkRelations elements", async () => {
        const { report } = await load(
            cx([TWO_NODES, { cyViews: [5, { "@id": "x" }] }, { cyNetworkRelations: [5, { c: "q" }] }]),
        );
        expect(codes(report)).toEqual([CX_ISSUE.BAD_ASPECT_BLOCK, CX_ISSUE.INVALID_ID]);
        expect(issuesOf(report, CX_ISSUE.BAD_ASPECT_BLOCK)).toHaveLength(2);
        expect(issuesOf(report, CX_ISSUE.INVALID_ID)).toHaveLength(2);
    });

    it("keeps aspects named like Object.prototype members verbatim, with no issue", async () => {
        // __proto__ is left out: graph-io keeps it as an own key, but graph-format's JSON copy of
        // meta.extra (cloneJson) assigns it and so drops it; that is graph-format's to fix
        const { snapshot, report } = await load(
            '[{"nodes":[{"@id":1}]},{"constructor":[{"a":1}]},{"toString":[{"b":2}]},{"valueOf":[{"c":3}]}]',
        );
        expect(codes(report)).toEqual([]);
        const extra = snapshot.meta.extra.cx as Record<string, unknown>;
        expect(Object.getOwnPropertyDescriptor(extra, "constructor")?.value).toEqual([{ a: 1 }]);
        expect(Object.getOwnPropertyDescriptor(extra, "toString")?.value).toEqual([{ b: 2 }]);
        expect(Object.getOwnPropertyDescriptor(extra, "valueOf")?.value).toEqual([{ c: 3 }]);
    });

    it("reports an aspect whose name the importer's own meta.extra.cx entry holds", async () => {
        const { report } = await load(
            cx([
                TWO_NODES,
                { groups: [{ a: 1 }] },
                { subnetwork: [{ b: 2 }] },
                { cyGroups: [{ "@id": 7, nodes: [1] }] },
                { cySubNetworks: [{ "@id": 9, nodes: "all", edges: "all" }] },
            ]),
        );
        expect(issuesOf(report, CX_ISSUE.UNKNOWN_ELEMENT).map((i) => i.element)).toEqual(["groups", "subnetwork"]);
    });

    it("reports a network attribute without v and two values for one in one scope", async () => {
        const { snapshot, report } = await load(
            cx([
                TWO_NODES,
                {
                    networkAttributes: [
                        { n: "foo" },
                        { n: "bar", v: "a" },
                        { n: "bar", v: "b" },
                    ],
                },
            ]),
        );
        expect(codes(report)).toEqual([CX_ISSUE.BAD_VALUE, CX_ISSUE.DUPLICATE_ATTRIBUTE]);
        expect(snapshot.graph.get("bar")?.value(0)).toBe("b");
    });

    it("reports a network name holding a list and an integer holding text with E_BAD_VALUE", async () => {
        const { snapshot, report } = await load(
            cx([
                TWO_NODES,
                {
                    networkAttributes: [
                        { n: "name", v: ["a", "b"] },
                        { n: "count", v: "zz", d: "integer" },
                    ],
                },
            ]),
        );
        expect(codes(report)).toEqual([CX_ISSUE.BAD_VALUE]);
        expect(issuesOf(report, CX_ISSUE.BAD_VALUE)).toHaveLength(2);
        expect(snapshot.meta.name ?? null).toBeNull();
    });

    it("reports a cyTableColumn type and a table CX does not define", async () => {
        const { report } = await load(
            cx([
                TWO_NODES,
                {
                    cyTableColumn: [
                        { applies_to: "node_table", n: "q", d: "date" },
                        { applies_to: "nope_table", n: "r", d: "string" },
                    ],
                },
            ]),
        );
        expect(codes(report)).toEqual([CX_ISSUE.UNKNOWN_ELEMENT, CX_ISSUE.UNKNOWN_ATTR_TYPE]);
    });
});

describe("cx robustness: ids option, weights and precision", () => {
    const COLLECTION = cx([
        TWO_NODES,
        { edges: [{ "@id": 3, s: 1, t: 2 }] },
        { edgeAttributes: [{ po: 3, n: "weight", v: 2.5, d: "double" }] },
        { cartesianLayout: [{ node: 1, x: 4, y: 4 }] },
        { cySubNetworks: [{ "@id": 9, nodes: [1, 2], edges: [3] }] },
    ]);

    it('reads a collection under ids: "string" as under ids: "keep", with the weight and the layout', async () => {
        const kept = await load(COLLECTION);
        const text = await load(COLLECTION, { ids: "string" });
        expect(codes(text.report)).toEqual(codes(kept.report));
        expect(text.snapshot.ids.toArray()).toEqual(["1", "2"]);
        expect(text.snapshot.edgeCount).toBe(1);
        expect(text.snapshot.edgeList().weights?.[0]).toBe(2.5);
        expect(text.snapshot.meta.weightOrigin?.title).toBe("weight");
        expect(point(text.snapshot, "1" as unknown as number)).toEqual([4, -4, 0]);
    });

    it("prefers a subnetwork's own weight over the unscoped one, whatever their order", async () => {
        const { snapshot } = await load(
            cx([
                TWO_NODES,
                { edges: [{ "@id": 3, s: 1, t: 2 }] },
                { cySubNetworks: [{ "@id": 9, nodes: "all", edges: "all" }] },
                {
                    edgeAttributes: [
                        { po: 3, n: "weight", v: 7, d: "double", s: 9 },
                        { po: 3, n: "weight", v: 1, d: "double" },
                    ],
                },
            ]),
        );
        expect(snapshot.edgeList().weights?.[0]).toBe(7);
    });

    it("warns about two weights for one edge in one scope; the later wins", async () => {
        const { snapshot, report } = await load(
            cx([
                TWO_NODES,
                { edges: [{ "@id": 3, s: 1, t: 2 }] },
                {
                    edgeAttributes: [
                        { po: 3, n: "weight", v: 2, d: "double" },
                        { po: 3, n: "weight", v: 5, d: "double" },
                    ],
                },
            ]),
        );
        expect(codes(report)).toEqual([CX_ISSUE.DUPLICATE_ATTRIBUTE]);
        expect(snapshot.edgeList().weights?.[0]).toBe(5);
    });

    it("skips an edge whose weight is not a number with E_INVALID_WEIGHT, whatever its d declares", async () => {
        // pinned: the weight ignores d, so Cytoscape's "NaN" in a double is not a usable weight either
        for (const [v, d] of [
            ["NaN", "double"],
            ["1.0d", "double"],
            [[1, 2], "list_of_double"],
        ] as const) {
            const { snapshot, report } = await load(
                cx([TWO_NODES, { edges: [{ "@id": 3, s: 1, t: 2 }] }, { edgeAttributes: [{ po: 3, n: "weight", v, d }] }]),
            );
            expect(codes(report), JSON.stringify(v)).toEqual([CX_ISSUE.INVALID_WEIGHT]);
            expect(snapshot.edgeCount).toBe(0);
            expect(report.counts.skippedEdges).toBe(1);
        }
    });

    it("warns W_PRECISION for a big integer in a kept aspect and a citation id, never for Long.MAX_VALUE verification", async () => {
        const kept = await load(
            JSON.stringify([{ numberVerification: [{ longNumber: 0 }] }, TWO_NODES]).replace(
                '"longNumber":0',
                '"longNumber":9223372036854775807',
            ),
        );
        expect(codes(kept.report)).toEqual([]);
        const ndex = await load('[{"nodes":[{"@id":1}]},{"ndexStatus":[{"externalId":12345678901234567891}]}]');
        expect(codes(ndex.report)).toEqual([CX_ISSUE.PRECISION]);
        const citation = await load(cx([TWO_NODES, { citations: [{ "@id": "12345678901234567891", "dc:title": "t" }] }]));
        expect(codes(citation.report)).toEqual([CX_ISSUE.PRECISION]);
    });

    it("renames a citation field named id instead of failing on the table's own id column", async () => {
        const { snapshot, report } = await load(cx([TWO_NODES, { citations: [{ "@id": 1, id: "x", "dc:title": "t" }] }]));
        expect(codes(report)).toEqual([CX_ISSUE.COLUMN_RENAMED]);
        const table = snapshot.extensions.get("cx:citations");
        expect(table?.get("id")?.value(0)).toBe(1);
        expect(table?.get("id#2")?.value(0)).toBe("x");
        expect(table?.get("dc:title")?.value(0)).toBe("t");
    });

    it("detects a UTF-16 CX file with a BOM through the registry and imports it", async () => {
        const { format, snapshot } = await importGraph(utf16(cx([TWO_NODES]), "le", true));
        expect(format).toBe("cx");
        expect(snapshot.nodeCount).toBe(2);
    });
});
