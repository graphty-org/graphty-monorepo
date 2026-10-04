/**
 * Robustness of the GML importer against wrong, truncated, mis-encoded and malformed input: every
 * case asserts the precise outcome (the issue codes and the data kept, or the ImportError and its
 * code). Cases already pinned elsewhere (test/formats/gml, test/audit) are not repeated.
 */

import { describe, expect, it } from "vitest";

import { importAllGraphs, importGraph, type ImportGraphOptions, type ImportGraphResult, sniff } from "../../src/index.js";
import {
    chunks,
    codes,
    column,
    concat,
    edgePairs,
    fatalCode,
    GZIP_BYTES,
    HTML_404,
    ids,
    issue,
    latin1,
    rejects,
    utf8,
    utf16le,
    ZIP_BYTES,
} from "./helpers.js";

async function gml(input: Parameters<typeof importGraph>[0], options: ImportGraphOptions = {}): Promise<ImportGraphResult> {
    return importGraph(input, { format: "gml", ...options });
}

const E_ACUTE = String.fromCharCode(0xe9);
const NBSP = String.fromCharCode(0xa0);

describe("GML robustness: wrong format and empty input", () => {
    it("refuses whitespace only and comments only with E_NO_GRAPH, like the empty file", async () => {
        for (const text of [" \t\n \n", "# a comment\n# another\n"]) {
            const err = await rejects(gml(text));
            expect(fatalCode(err)).toBe("E_NO_GRAPH");
            expect(codes(err.report)).toEqual(["E_NO_GRAPH"]);
        }
    });

    it("refuses an HTML error page at its first token, and sniffing does not rank it as GML", async () => {
        const err = await rejects(gml(HTML_404));
        expect(fatalCode(err)).toBe("E_SYNTAX");
        expect(err.message).toBe('cannot tokenize "<!DOCTYPE" at line 1');
        expect(issue(err.report, "E_SYNTAX").line).toBe(1);
        expect(sniff({ head: utf8(HTML_404) })?.format).not.toBe("gml");
    });

    it("refuses JSON under a .gml name at the { token", async () => {
        const err = await rejects(gml('{"nodes":[]}', { filename: "graph.gml" }));
        expect(fatalCode(err)).toBe("E_SYNTAX");
        expect(err.message).toBe('cannot tokenize "{" at line 1');
    });

    it("refuses gzip and zip bytes with E_INVALID_UTF8 naming the container", async () => {
        const gz = await rejects(gml(GZIP_BYTES));
        expect(fatalCode(gz)).toBe("E_INVALID_UTF8");
        expect(gz.message).toBe("invalid UTF-8 near byte 1: the input looks like gzip data; decompress it first");
        expect(gz.details.byteOffset).toBe(1);
        const zip = await rejects(gml(ZIP_BYTES));
        expect(fatalCode(zip)).toBe("E_INVALID_UTF8");
        expect(zip.message).toContain("the input looks like zip data; decompress it first");
    });

    it("refuses 'graph' then end of input as a key without a value at line 1", async () => {
        const err = await rejects(gml("graph"));
        expect(fatalCode(err)).toBe("E_SYNTAX");
        expect(err.message).toBe('key "graph" at line 1 has no value');
    });

    it("refuses 'graph 5' naming the graph key that is not a block (the code stays E_NO_GRAPH)", async () => {
        const err = await rejects(gml("graph 5"));
        expect(fatalCode(err)).toBe("E_NO_GRAPH");
        expect(err.message).toBe("the graph key at line 1 holds 5, not a [ ... ] block; the input contains no graph block");
        expect(issue(err.report, "E_NO_GRAPH").line).toBe(1);
    });
});

describe("GML robustness: truncation", () => {
    it("refuses input cut inside or straight after a key", async () => {
        for (const text of ["graph [ node [ id 1 lab", "graph [ node [ id 1 label"]) {
            const err = await rejects(gml(text));
            expect(fatalCode(err)).toBe("E_SYNTAX");
            expect(err.message).toMatch(/^key "lab(el)?" at line 1 has no value$/);
        }
    });

    it("refuses input cut inside a character reference as an unclosed string, never decoding the partial reference", async () => {
        const err = await rejects(gml('graph [ node [ id 1 label "a&#23'));
        expect(fatalCode(err)).toBe("E_SYNTAX");
        expect(err.message).toBe("unclosed string at line 1");
        expect(err.report.counts.nodes).toBe(0);
    });

    // Corrected expectation: a lone trailing lead byte is also what windows-1252 text ending in an
    // accented capital looks like (JOSE with an acute E at the end of a CSV), so at the very end of
    // the input it stays the windows-1252 fallback; the warning now says the file may be truncated,
    // and the GML grammar then refuses the cut string.
    it("reports a UTF-8 sequence cut by the end of input as a possible truncation, then the unclosed string", async () => {
        const err = await rejects(gml(concat(utf8('graph [ node [ id 1 label "ab'), Uint8Array.from([0xc3]))));
        expect(fatalCode(err)).toBe("E_SYNTAX");
        expect(codes(err.report)).toEqual(["W_ENCODING_FALLBACK", "E_SYNTAX"]);
        expect(issue(err.report, "W_ENCODING_FALLBACK").message).toContain(
            "near byte 29: it ends inside a multi-byte UTF-8 sequence, so it may be truncated",
        );
    });

    it("refuses a stream whose byte chunk ends inside a UTF-8 sequence before a text chunk with E_INVALID_UTF8", async () => {
        const input = chunks(utf8('graph [ node [ id 1 label "caf'), Uint8Array.from([0xc3]), 'x" ] ]');
        const err = await rejects(gml(input));
        expect(fatalCode(err)).toBe("E_INVALID_UTF8");
        expect(err.message).toBe(
            "invalid UTF-8 near byte 30: a byte chunk ends inside a multi-byte sequence and a text chunk follows",
        );
        expect(err.details.byteOffset).toBe(30);
    });
});

describe("GML robustness: encodings", () => {
    it("decodes a UTF-16LE file by its byte order mark with no issue", async () => {
        const { snapshot, report } = await gml(utf16le('graph [ node [ id 1 label "x" ] ]', true));
        expect(codes(report)).toEqual([]);
        expect(ids(snapshot)).toEqual([1]);
        expect(column(snapshot, "nodes", "label")).toEqual(["x"]);
    });

    it("reads an undeclared Latin-1 byte as windows-1252 with W_ENCODING_FALLBACK", async () => {
        const { snapshot, report } = await gml(latin1(`graph [ node [ id 1 label "caf${E_ACUTE}" ] ]`));
        expect(codes(report)).toEqual(["W_ENCODING_FALLBACK"]);
        expect(issue(report, "W_ENCODING_FALLBACK").message).toContain("near byte 30");
        expect(column(snapshot, "nodes", "label")).toEqual([`caf${E_ACUTE}`]);
    });

    it("refuses UTF-16LE without a byte order mark with E_INVALID_ENCODING naming UTF-16", async () => {
        const err = await rejects(gml(utf16le("graph [ node [ id 1 ] ]", false)));
        expect(fatalCode(err)).toBe("E_INVALID_ENCODING");
        expect(err.message).toContain('UTF-16LE text without a byte order mark');
        expect(err.message).toContain('pass the encoding option "utf-16le"');
    });

    it("gives the byte offset of the invalid byte, not of the decode slice", async () => {
        const head = utf8(`graph [ node [ id 1 label "caf${E_ACUTE}" ] node [ id 2 label "`);
        expect(head.byteLength).toBe(55);
        const err = await rejects(gml(concat(head, Uint8Array.from([0xe9]), utf8('" ] ]'))));
        expect(fatalCode(err)).toBe("E_INVALID_UTF8");
        expect(err.message).toBe("invalid UTF-8 near byte 55 after valid non-ASCII UTF-8 text; pass the encoding option");
        expect(err.details.byteOffset).toBe(55);
    });

    it("says a NUL byte stopped the windows-1252 fallback (binary or UTF-16), not earlier UTF-8 text", async () => {
        const bytes = concat(
            utf8('graph [ node [ id 1 label "a'),
            Uint8Array.from([0]),
            utf8('" ] node [ id 2 label "'),
            Uint8Array.from([0xe9]),
            utf8('" ] ]'),
        );
        const err = await rejects(gml(bytes));
        expect(fatalCode(err)).toBe("E_INVALID_UTF8");
        expect(err.message).toBe(
            "invalid UTF-8 near byte 52: the input holds a NUL byte, so it is binary data or UTF-16 text, not windows-1252; pass the encoding option",
        );
    });
});

describe("GML robustness: lexical errors", () => {
    it("refuses a C-style escaped quote at the line it is on", async () => {
        const err = await rejects(gml('graph [\nnode [ id 1 label "a\\"b" ]\nnode [ id 2 ]\n]'));
        expect(fatalCode(err)).toBe("E_SYNTAX");
        expect(err.message).toBe("unclosed string at line 2");
        expect(issue(err.report, "E_SYNTAX").line).toBe(2);
    });

    it("refuses a single-quoted string at its line", async () => {
        const err = await rejects(gml("graph [\nnode [ id 1 label 'a' ]\n]"));
        expect(fatalCode(err)).toBe("E_SYNTAX");
        expect(err.message).toBe("cannot tokenize \"'a'\" at line 2");
    });

    it("refuses a key with a non-ASCII letter, naming the character in an ASCII message", async () => {
        const err = await rejects(gml(`graph [\nnode [ id 1 caf${E_ACUTE} 2 ]\n]`));
        expect(fatalCode(err)).toBe("E_SYNTAX");
        expect(err.message).toBe(
            'cannot tokenize "caf\\u00E9" at line 2 (it holds U+00E9, which GML allows only inside a string)',
        );
    });

    it("names a no-break space pasted between tokens instead of showing it as a space", async () => {
        const err = await rejects(gml(`graph${NBSP}[ node [ id 1 ] ]`));
        expect(fatalCode(err)).toBe("E_SYNTAX");
        expect(err.message).toBe(
            'cannot tokenize "graph\\u00A0" at line 1 (it holds U+00A0, which GML allows only inside a string)',
        );
    });
});

describe("GML robustness: values", () => {
    it("merges node [ id 1 ] and node [ id \"1\" ] into one node under the canonical id rule", async () => {
        const { snapshot, report } = await gml('graph [ node [ id 1 ] node [ id "1" ] ]');
        expect(ids(snapshot)).toEqual([1]);
        expect(codes(report)).toEqual(["W_GML_STRING_ID", "W_DUPLICATE_NODE"]);
    });

    it("warns that a real literal overflowed f64 and stores the infinity", async () => {
        const { snapshot, report } = await gml("graph [ node [ id 1 w 1e999 ] node [ id 2 w 2.5 ] ]");
        expect(codes(report)).toEqual(["W_PRECISION"]);
        expect(issue(report, "W_PRECISION").message).toContain("1e999, beyond the f64 range");
        expect(column(snapshot, "nodes", "w")).toEqual([Infinity, 2.5]);
    });

    // Corrected expectation: an infinite weight is a value graph-format holds and every other
    // reader of the shared weight grammar keeps (GraphML, GEXF, CSV, JSON), and the GML exporter
    // writes it as +INF, so refusing it would break the GML round trip; only NaN is invalid.
    it("keeps an INF edge weight as Infinity, as the shared weight grammar does", async () => {
        const { snapshot, report } = await gml(
            "graph [ node [ id 1 ] node [ id 2 ] edge [ source 1 target 2 value INF ] edge [ source 2 target 1 value -INF ] ]",
        );
        expect(codes(report)).toEqual([]);
        expect(Array.from(snapshot.edgeList().weights ?? [])).toEqual([Infinity, -Infinity]);
    });

    it("warns that a key mixing numbers and strings became a string column with the numbers as written", async () => {
        const { snapshot, report } = await gml('graph [ node [ id 1 w 1 ] node [ id 2 w "x" ] node [ id 3 w 1.50 ] ]');
        expect(codes(report)).toEqual(["W_WIDENED"]);
        expect(snapshot.nodes.require("w").dtype).toBe("string");
        expect(column(snapshot, "nodes", "w")).toEqual(["1", "x", "1.50"]);
    });

    it("keeps a label whose text is [] or () as text, never as NetworkX's empty list", async () => {
        const { snapshot, report } = await gml('graph [ node [ id 1 label "[]" ] node [ id 2 label "x" ] node [ id 3 label "()" ] ]');
        expect(codes(report)).toEqual([]);
        expect(snapshot.nodes.require("label").dtype).toBe("string");
        expect(snapshot.nodes.require("label").meta.role).toBe("label");
        expect(column(snapshot, "nodes", "label")).toEqual(["[]", "x", "()"]);
    });

    it("renames a top-level key that shares its graph column name with a key of the graph block, with W_COLUMN_RENAMED", async () => {
        const { snapshot, report } = await gml('name "top" graph [ name "in" node [ id 1 ] ]');
        expect(codes(report)).toEqual(["W_COLUMN_RENAMED"]);
        expect(issue(report, "W_COLUMN_RENAMED").message).toContain('stored as "name#name"');
        expect(column(snapshot, "graph", "name")).toEqual(["in"]);
        expect(column(snapshot, "graph", "name#name")).toEqual(["top"]);
    });
});

describe("GML robustness: character entities", () => {
    it("keeps a numeric reference beyond U+10FFFF as written with W_GML_UNKNOWN_ENTITY (no RangeError)", async () => {
        const { snapshot, report } = await gml('graph [ node [ id 1 label "&#x110000;" ] node [ id 2 label "a&#99999999;b" ] ]');
        expect(codes(report)).toEqual(["W_GML_UNKNOWN_ENTITY", "W_GML_UNKNOWN_ENTITY"]);
        expect(issue(report, "W_GML_UNKNOWN_ENTITY").line).toBe(1);
        expect(column(snapshot, "nodes", "label")).toEqual(["&#x110000;", "a&#99999999;b"]);
    });

    it("keeps an out-of-range reference in Creator, a graph key and a node id as written, never a crash", async () => {
        const creator = await gml('Creator "&#x110000;" graph [ node [ id 1 ] ]');
        expect(codes(creator.report)).toEqual(["W_GML_UNKNOWN_ENTITY"]);
        expect(creator.snapshot.meta.creator).toBe("&#x110000;");
        const name = await gml('graph [ name "&#x110000;" node [ id 1 ] ]');
        expect(codes(name.report)).toEqual(["W_GML_UNKNOWN_ENTITY"]);
        expect(column(name.snapshot, "graph", "name")).toEqual(["&#x110000;"]);
        const id = await gml('graph [ node [ id "&#x110000;" ] ]');
        expect(codes(id.report)).toEqual(["W_GML_UNKNOWN_ENTITY", "W_GML_STRING_ID"]);
        expect(ids(id.snapshot)).toEqual(["&#x110000;"]);
    });

    it("keeps a reference without its semicolon literally", async () => {
        const { snapshot, report } = await gml('graph [ node [ id 1 label "&#65" ] ]');
        expect(codes(report)).toEqual([]);
        expect(column(snapshot, "nodes", "label")).toEqual(["&#65"]);
    });
});

describe("GML robustness: graphics", () => {
    it("warns about a non-numeric coordinate; that node has no position and keeps its record, the others keep theirs", async () => {
        const { snapshot, report } = await gml('graph [ node [ id 1 graphics [ x "a" y 2 ] ] node [ id 2 graphics [ x 1 y 2 ] ] ]');
        expect(codes(report)).toEqual(["W_GML_GRAPHICS"]);
        expect(issue(report, "W_GML_GRAPHICS").message).toContain("node 1's graphics x / y / z");
        expect(column(snapshot, "nodes", "position")).toEqual([undefined, [1, 2, 0]]);
        expect(column(snapshot, "nodes", "graphics")).toEqual([{ x: "a", y: 2 }, undefined]);
    });

    it("keeps a scalar graphics value as json on its node only; every other node keeps its position", async () => {
        const { snapshot, report } = await gml("graph [ node [ id 1 graphics 5 ] node [ id 2 graphics [ x 5 y 6 ] ] ]");
        expect(codes(report)).toEqual(["W_GML_GRAPHICS"]);
        expect(issue(report, "W_GML_GRAPHICS").message).toContain("node 1's graphics is not a record");
        expect(column(snapshot, "nodes", "position")).toEqual([undefined, [5, 6, 0]]);
        expect(column(snapshot, "nodes", "graphics")).toEqual([5, undefined]);
    });

    it("positions a node with two graphics records from the first and keeps both; other nodes keep their positions", async () => {
        const { snapshot, report } = await gml(
            "graph [ node [ id 1 graphics [ x 1 y 2 ] graphics [ x 3 y 4 ] ] node [ id 2 graphics [ x 5 y 6 ] ] ]",
        );
        expect(codes(report)).toEqual(["W_GML_GRAPHICS"]);
        expect(issue(report, "W_GML_GRAPHICS").message).toContain("node 1 has 2 graphics records");
        expect(column(snapshot, "nodes", "position")).toEqual([[1, 2, 0], [5, 6, 0]]);
        expect(column(snapshot, "nodes", "graphics")).toEqual([[{}, { x: 3, y: 4 }], undefined]);
    });

    it("warns about a repeated coordinate; that node has no position and keeps its record", async () => {
        const { snapshot, report } = await gml("graph [ node [ id 1 graphics [ x 1 x 2 y 3 ] ] node [ id 2 graphics [ x 5 y 6 ] ] ]");
        expect(codes(report)).toEqual(["W_GML_GRAPHICS"]);
        expect(column(snapshot, "nodes", "position")).toEqual([undefined, [5, 6, 0]]);
        expect(column(snapshot, "nodes", "graphics")).toEqual([{ x: [1, 2], y: 3 }, undefined]);
    });
});

describe("GML robustness: structure kept but not read as structure", () => {
    it("keeps a nested graph or edge record as json with W_GML_NESTED_ELEMENT", async () => {
        const { snapshot, report } = await gml(
            "graph [ node [ id 1 graph [ node [ id 2 ] ] ] node [ id 3 edge [ source 1 target 3 ] ] ]",
        );
        expect(codes(report)).toEqual(["W_GML_NESTED_ELEMENT", "W_GML_NESTED_ELEMENT"]);
        expect(ids(snapshot)).toEqual([1, 3]);
        expect(snapshot.edgeCount).toBe(0);
        expect(column(snapshot, "nodes", "graph")).toEqual([{ node: { id: 2 } }, undefined]);
        expect(column(snapshot, "nodes", "edge")).toEqual([undefined, { source: 1, target: 3 }]);
    });

    it("keeps yEd's isGroup / gid as plain columns and warns that the hierarchy is not containment", async () => {
        const { snapshot, report } = await gml("graph [ node [ id 1 isGroup 1 ] node [ id 2 gid 1 ] node [ id 3 gid 1 ] ]");
        expect(codes(report)).toEqual(["W_GML_GROUPS"]);
        expect(column(snapshot, "nodes", "isGroup")).toEqual([1, undefined, undefined]);
        expect(column(snapshot, "nodes", "gid")).toEqual([undefined, 1, 1]);
        expect(snapshot.nodes.byRole("parent")).toBeNull();
    });
});

describe("GML robustness: ids under nodeIdFrom label", () => {
    it("skips an edge to a node block that was skipped instead of bringing the node back under its file id", async () => {
        const { snapshot, report } = await gml('graph [ node [ id 1 label "a" ] node [ id 2 ] edge [ source 1 target 2 ] ]', {
            nodeIdFrom: "label",
        });
        expect(codes(report)).toEqual(["E_GML_MISSING_LABEL", "E_UNKNOWN_NODE"]);
        expect(ids(snapshot)).toEqual(["a"]);
        expect(snapshot.edgeCount).toBe(0);
        expect(report.counts.skippedEdges).toBe(1);
    });

    it("reports a file id declared twice, so the edge's endpoint is not silently the later node", async () => {
        const { snapshot, report } = await gml(
            'graph [ node [ id 1 label "a" ] node [ id 1 label "b" ] node [ id 2 label "c" ] edge [ source 1 target 2 ] ]',
            { nodeIdFrom: "label" },
        );
        expect(codes(report)).toEqual(["W_DUPLICATE_NODE"]);
        expect(issue(report, "W_DUPLICATE_NODE").message).toContain('nodes "a" and "b"');
        expect(ids(snapshot)).toEqual(["a", "b", "c"]);
        expect(edgePairs(snapshot)).toEqual(["b-c"]);
    });
});

describe("GML robustness: policies and several graphs", () => {
    it("turns a self-loop under selfLoops error into an ImportError with E_SELF_LOOP in its report", async () => {
        const err = await rejects(gml("graph [ directed 1 node [ id 1 ] edge [ source 1 target 1 ] ]", { selfLoops: "error" }));
        expect(fatalCode(err)).toBe("E_SELF_LOOP");
        expect(codes(err.report)).toEqual(["E_SELF_LOOP"]);
        expect(err.report.counts.edges).toBe(1);
    });

    it("says which graph failed when a later graph of importAllGraphs exceeds the error limit", async () => {
        const text = `graph [ node [ id 1 ] ] graph [ ${"node [ ] ".repeat(150)}]`;
        const err = await rejects(importAllGraphs(text, { format: "gml" }));
        expect(err.message).toMatch(/^graph 1: error limit of 100 exceeded/);
        expect(err.details.graphIndex).toBe(1);
        expect(err.details.code).toBe("E_MISSING_ID");
        expect(err.report.truncated).toBe(true);
    });
});
