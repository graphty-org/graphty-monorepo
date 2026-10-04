/**
 * Robustness of the DOT importer against wrong, truncated, mis-encoded and malformed input: every
 * case asserts the precise outcome (the issue codes and the data kept, or the ImportError and its
 * code). Cases already pinned elsewhere (test/formats/dot, test/audit) are not repeated.
 */

import { describe, expect, it } from "vitest";

import { importAllGraphs, importGraph, type ImportGraphOptions, type ImportGraphResult } from "../../src/index.js";
import {
    chunks,
    codes,
    column,
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
} from "./helpers.js";

async function dot(input: Parameters<typeof importGraph>[0], options: ImportGraphOptions = {}): Promise<ImportGraphResult> {
    return importGraph(input, { format: "dot", ...options });
}

const E_ACUTE = String.fromCharCode(0xe9);
const BOM = String.fromCharCode(0xfeff);

describe("DOT robustness: wrong format and empty input", () => {
    it("refuses a file of only whitespace and comments with E_EMPTY_INPUT", async () => {
        const err = await rejects(dot("  // a line comment\n/* a block\n comment */\n"));
        expect(fatalCode(err)).toBe("E_EMPTY_INPUT");
        expect(err.message).toBe("the input holds no graph (empty or only comments)");
    });

    it("refuses an HTML error page, read as an HTML string where the header belongs", async () => {
        const err = await rejects(dot(HTML_404));
        expect(fatalCode(err)).toBe("E_SYNTAX");
        expect(err.message).toBe('expected "graph" or "digraph", found "<!DOCTYPE html>"');
        expect(issue(err.report, "E_SYNTAX").line).toBe(1);
    });

    it("refuses a GML file at the [ after graph", async () => {
        const err = await rejects(dot("graph [ node [ id 1 ] ]", { filename: "graph.dot" }));
        expect(fatalCode(err)).toBe("E_SYNTAX");
        expect(err.message).toBe('expected "{" after the graph header, found "["');
    });

    it("refuses gzip bytes with E_INVALID_UTF8 naming gzip", async () => {
        const err = await rejects(dot(GZIP_BYTES));
        expect(fatalCode(err)).toBe("E_INVALID_UTF8");
        expect(err.message).toBe("invalid UTF-8 near byte 1: the input looks like gzip data; decompress it first");
    });
});

describe("DOT robustness: truncation", () => {
    it("refuses a header without its body", async () => {
        for (const text of ["digraph", "digraph G"]) {
            const err = await rejects(dot(text));
            expect(fatalCode(err)).toBe("E_SYNTAX");
            expect(err.message).toBe('expected "{" after the graph header, found end of input');
        }
    });

    it("refuses an edge chain cut after its operator, with the line and the counts so far", async () => {
        const eof = await rejects(dot("digraph G {\n a ->"));
        expect(fatalCode(eof)).toBe("E_SYNTAX");
        expect(eof.message).toBe("expected an identifier, found end of input");
        expect(issue(eof.report, "E_SYNTAX").line).toBe(2);
        expect(eof.report.counts.nodes).toBe(1);
        const brace = await rejects(dot("digraph G { a -> b -> }"));
        expect(fatalCode(brace)).toBe("E_SYNTAX");
        expect(brace.message).toBe('expected an identifier, found "}"');
        expect(brace.report.counts.nodes).toBe(2);
    });

    it("refuses an attribute list cut after = or after the value", async () => {
        for (const text of ["digraph G { a [color=", "digraph G { a [color=red"]) {
            const err = await rejects(dot(text));
            expect(fatalCode(err)).toBe("E_SYNTAX");
            expect(err.message).toBe("expected an identifier, found end of input");
        }
    });

    it("refuses a quoted string cut right after a backslash, never reading past the end", async () => {
        const err = await rejects(dot('digraph G {\n a [label="ab\\'));
        expect(fatalCode(err)).toBe("E_SYNTAX");
        expect(err.message).toBe("unterminated quoted string (missing closing quote)");
        expect(issue(err.report, "E_SYNTAX").line).toBe(2);
    });

    it("refuses an HTML string cut before its closing >", async () => {
        const err = await rejects(dot("digraph G { a [label=<<b>x"));
        expect(fatalCode(err)).toBe("E_SYNTAX");
        expect(err.message).toBe("unterminated HTML string (missing closing '>')");
    });
});

describe("DOT robustness: syntax errors", () => {
    it("refuses a stray } after the graph, naming it", async () => {
        const err = await rejects(dot("digraph G { a -> b; }\n}"));
        expect(fatalCode(err)).toBe("E_SYNTAX");
        expect(err.message).toBe('unexpected "}" after the end of the graph: no "{" is open');
        expect(issue(err.report, "E_SYNTAX").line).toBe(2);
    });

    // Corrected expectation: Graphviz refuses a file whose content after the first graph is not a
    // graph (the oracle of test/conformance multi-graph-then-garbage.gv), so import() does too
    // rather than keeping the first graph.
    it("refuses content after a complete graph that is not a graph, as Graphviz does", async () => {
        const html = await rejects(dot("digraph { a -> b }\n<html>"));
        expect(fatalCode(html)).toBe("E_SYNTAX");
        expect(html.message).toBe('expected "graph" or "digraph", found "<html>"');
        expect(issue(html.report, "E_SYNTAX").line).toBe(2);
        const cut = await rejects(dot("digraph { a -> b }\ndigraph { c ->"));
        expect(fatalCode(cut)).toBe("E_SYNTAX");
        expect(cut.message).toBe('missing "}" at the end of a graph');
    });

    it("refuses keywords used as bare ids; quoted they are plain ids", async () => {
        const err = await rejects(dot("digraph { node -> edge }"));
        expect(fatalCode(err)).toBe("E_SYNTAX");
        expect(err.message).toBe('expected "[" after "node", found "->"');
        const quoted = await dot('digraph { "node" -> "edge" }');
        expect(codes(quoted.report)).toEqual([]);
        expect(edgePairs(quoted.snapshot)).toEqual(["node-edge"]);
    });

    it("refuses a graph keyword inside a graph", async () => {
        const err = await rejects(dot("digraph { digraph x { a } }"));
        expect(fatalCode(err)).toBe("E_SYNTAX");
        expect(err.message).toBe('unexpected keyword "digraph" inside a graph');
    });

    it("refuses + concatenation with anything but a double-quoted string", async () => {
        const cases: [string, string][] = [
            ['digraph { a [label="x" + y] }', 'expected a quoted string after "+", found "y"'],
            ['digraph { a [label="x" + ] }', 'expected a quoted string after "+", found "]"'],
            ['digraph { a [label=<x> + "y"] }', 'expected an identifier, found "+"'],
        ];
        for (const [text, message] of cases) {
            const err = await rejects(dot(text));
            expect(fatalCode(err)).toBe("E_SYNTAX");
            expect(err.message).toBe(message);
        }
    });

    it("refuses # in the middle of a line and a single-quoted id", async () => {
        const hash = await rejects(dot("digraph { a # b\n}"));
        expect(fatalCode(hash)).toBe("E_SYNTAX");
        expect(hash.message).toBe('unexpected character "#"');
        const single = await rejects(dot("digraph { 'a' -> b }"));
        expect(fatalCode(single)).toBe("E_SYNTAX");
        expect(single.message).toBe("unexpected character \"'\"");
    });
});

describe("DOT robustness: encodings", () => {
    it("ignores charset= inside a comment and inside a quoted value, so UTF-8 text stays UTF-8", async () => {
        const accented = `caf${E_ACUTE}`;
        const comment = await dot(utf8(`digraph { // old charset=latin1 note\n "${accented}" }`));
        expect(codes(comment.report)).toEqual([]);
        expect(ids(comment.snapshot)).toEqual([accented]);
        const label = await dot(utf8(`digraph { a [label="charset=big5"]; "${accented}" }`));
        expect(codes(label.report)).toEqual([]);
        expect(ids(label.snapshot)).toEqual(["a", accented]);
        expect(column(label.snapshot, "nodes", "label")).toEqual(["charset=big5", undefined]);
    });

    it("warns about a charset this platform cannot decode and reads UTF-8", async () => {
        const { snapshot, report } = await dot(utf8('digraph { charset="klingon"; a }'));
        expect(codes(report)).toEqual(["W_UNKNOWN_ENCODING"]);
        expect(ids(snapshot)).toEqual(["a"]);
    });

    it("decodes a declared charset=latin1 with no issue", async () => {
        const { snapshot, report } = await dot(latin1(`digraph { charset=latin1; "caf${E_ACUTE}" }`));
        expect(codes(report)).toEqual([]);
        expect(ids(snapshot)).toEqual([`caf${E_ACUTE}`]);
    });

    it("reads an undeclared Latin-1 byte as windows-1252 with W_ENCODING_FALLBACK", async () => {
        const { snapshot, report } = await dot(latin1(`digraph { "caf${E_ACUTE}" }`));
        expect(codes(report)).toEqual(["W_ENCODING_FALLBACK"]);
        expect(ids(snapshot)).toEqual([`caf${E_ACUTE}`]);
    });

    it("warns that a charset declared beyond the first 1024 bytes came too late to decode by", async () => {
        const text = `digraph {\n/*${"x".repeat(1100)}*/\ncharset=latin1; "caf${E_ACUTE}" }`;
        const { snapshot, report } = await dot(latin1(text));
        expect(codes(report)).toEqual(["W_ENCODING_FALLBACK", "W_DOT_LATE_CHARSET"]);
        expect(issue(report, "W_DOT_LATE_CHARSET").line).toBe(3);
        expect(ids(snapshot)).toEqual([`caf${E_ACUTE}`]);
    });

    it("decodes a UTF-16LE file by its byte order mark", async () => {
        const { snapshot, report } = await dot(utf16le("digraph { a -> b }", true));
        expect(codes(report)).toEqual([]);
        expect(edgePairs(snapshot)).toEqual(["a-b"]);
    });

    it("refuses UTF-16LE without a byte order mark with E_INVALID_ENCODING naming UTF-16", async () => {
        const err = await rejects(dot(utf16le("digraph { a -> b }", false)));
        expect(fatalCode(err)).toBe("E_INVALID_ENCODING");
        expect(err.message).toContain('pass the encoding option "utf-16le"');
    });

    it("reads a byte order mark inside the text as whitespace with W_STRAY_BOM, never as part of an id", async () => {
        const stream = await dot(chunks("digraph { a -> b ", `${BOM}c -> d }`));
        expect(codes(stream.report)).toEqual(["W_STRAY_BOM"]);
        expect(ids(stream.snapshot)).toEqual(["a", "b", "c", "d"]);
        const inline = await dot(`digraph { a${BOM} -> b; a }`);
        expect(codes(inline.report)).toEqual(["W_STRAY_BOM"]);
        expect(ids(inline.snapshot)).toEqual(["a", "b"]);
        expect(edgePairs(inline.snapshot)).toEqual(["a-b"]);
    });
});

describe("DOT robustness: values", () => {
    it("keeps the last of a repeated attribute (Graphviz) and reports the overwritten one", async () => {
        const { snapshot, report } = await dot("digraph { a [color=red, color=blue] }");
        expect(codes(report)).toEqual(["W_DUPLICATE_ATTRIBUTE"]);
        expect(issue(report, "W_DUPLICATE_ATTRIBUTE").message).toContain('the last value "blue" stands');
        expect(column(snapshot, "nodes", "color")).toEqual(["blue"]);
    });

    it("warns about a numeral with a second dot, which splits into two nodes as in Graphviz", async () => {
        const { snapshot, report } = await dot("digraph G { 1.2.3 }");
        expect(codes(report)).toEqual(["W_DOT_NUMERAL_AMBIGUITY"]);
        expect(issue(report, "W_DOT_NUMERAL_AMBIGUITY").element).toBe("1.2");
        expect(ids(snapshot)).toEqual(["1.2", ".3"]);
    });

    it("drops a pos beyond the f32 range of the position column with W_DOT_BAD_POS, never half a position", async () => {
        for (const pos of ["1e39,1", "1e999,1"]) {
            const { snapshot, report } = await dot(`digraph { a [pos="${pos}"]; b [pos="3,4"] }`);
            expect(codes(report)).toEqual(["W_DOT_BAD_POS"]);
            expect(issue(report, "W_DOT_BAD_POS").message).toContain("beyond the f32 range");
            expect(column(snapshot, "nodes", "pos")).toEqual([undefined, [3, 4, 0]]);
        }
    });

    it("drops a pos that is not a point with W_DOT_BAD_POS", async () => {
        const { snapshot, report } = await dot('digraph { a [pos="x,y"] }');
        expect(codes(report)).toEqual(["W_DOT_BAD_POS"]);
        expect(ids(snapshot)).toEqual(["a"]);
        expect(snapshot.nodes.names()).toEqual([]);
    });

    it("warns once when a pos coordinate does not survive the f32 position column", async () => {
        const { snapshot, report } = await dot('digraph { a [pos="123456789.123,1"]; b [pos="0.25,1"] }');
        expect(codes(report)).toEqual(["W_PRECISION"]);
        expect(issue(report, "W_PRECISION").element).toBe("a");
        expect(column(snapshot, "nodes", "pos")).toEqual([[123456792, 1, 0], [0.25, 1, 0]]);
    });

    it("warns when pos values mix two and three coordinates", async () => {
        const { snapshot, report } = await dot('digraph { a [pos="1,2"]; b [pos="1,2,3"] }');
        expect(codes(report)).toEqual(["W_DOT_POS_DIMS"]);
        expect(column(snapshot, "nodes", "pos")).toEqual([[1, 2, 0], [1, 2, 3]]);
        expect(snapshot.nodes.require("pos").meta.extra).toMatchObject({ sourceDims: 2 });
    });

    it("keeps a port whose second part is not a compass point, with W_DOT_COMPASS_POINT", async () => {
        const { snapshot, report } = await dot("digraph { a:zz:qq -> b; a:p:ne -> b }");
        expect(codes(report)).toEqual(["W_DOT_COMPASS_POINT"]);
        expect(issue(report, "W_DOT_COMPASS_POINT").element).toBe("zz:qq");
        expect(column(snapshot, "edges", "graphty.sourcePort")).toEqual(["zz:qq", "p:ne"]);
    });

    it("pushes no edge for an empty subgraph endpoint, as Graphviz does", async () => {
        const { snapshot, report } = await dot("digraph { a -> {} }");
        expect(codes(report)).toEqual([]);
        expect(ids(snapshot)).toEqual(["a"]);
        expect(snapshot.edgeCount).toBe(0);
    });

    // Deferred: keeping whether a value was an HTML string needs a place in the snapshot (column
    // metadata or a marker) that the exporter would also read; until then both read back the same.
    it("DEFERRED: an HTML label and a quoted label with the same text are stored alike", async () => {
        const { snapshot, report } = await dot('digraph { a [label=<x>]; b [label="<x>"] }');
        expect(codes(report)).toEqual([]);
        expect(column(snapshot, "nodes", "label")).toEqual(["<x>", "<x>"]);
    });
});

describe("DOT robustness: policies and several graphs", () => {
    it("turns a self-loop under selfLoops error into an ImportError with E_SELF_LOOP in its report", async () => {
        const err = await rejects(dot("digraph { a -> a }", { selfLoops: "error" }));
        expect(fatalCode(err)).toBe("E_SELF_LOOP");
        expect(codes(err.report)).toEqual(["E_SELF_LOOP"]);
    });

    it("says which graph failed when a later graph of importAllGraphs exceeds the error limit", async () => {
        const text = `digraph { a } digraph { ${"a -> b [weight=x] ".repeat(150)}}`;
        const err = await rejects(importAllGraphs(text, { format: "dot" }));
        expect(err.message).toMatch(/^graph 1: error limit of 100 exceeded/);
        expect(err.details.graphIndex).toBe(1);
        expect(err.details.code).toBe("E_INVALID_WEIGHT");
    });

    it("says which graph has the syntax error in importAllGraphs", async () => {
        const err = await rejects(importAllGraphs("digraph { a } digraph { b -> }", { format: "dot" }));
        expect(err.message).toBe('graph 1: expected an identifier, found "}"');
        expect(err.details.graphIndex).toBe(1);
        expect(fatalCode(err)).toBe("E_SYNTAX");
    });
});
