/**
 * Robustness of the Pajek importer against wrong, truncated, mis-encoded and malformed input: every
 * case asserts the precise outcome (the issue codes and the data kept, or the ImportError and its
 * code). Cases already pinned elsewhere (test/formats/pajek, test/audit) are not repeated.
 */

import { GraphBuilder, GraphFormatError, type NodeId } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { pajekImporter } from "../../src/formats/pajek/index.js";
import { importAllGraphs, importGraph, type ImportGraphOptions, type ImportGraphResult } from "../../src/index.js";
import {
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
    utf16le,
} from "./text-helpers.js";

async function pajek(
    input: Parameters<typeof importGraph>[0],
    options: ImportGraphOptions = {},
): Promise<ImportGraphResult> {
    return importGraph(input, { format: "pajek", ...options });
}

const E_ACUTE = String.fromCharCode(0xe9);

describe("Pajek robustness: wrong format", () => {
    it("refuses an HTML page as a foreign file and a GML file: data outside a section, then no *Vertices", async () => {
        const html = await rejects(pajek(HTML_404));
        expect(fatalCode(html)).toBe("E_FOREIGN_FORMAT");
        for (const text of ["graph [ node [ id 1 ] ]"]) {
            const err = await rejects(pajek(text));
            expect(fatalCode(err)).toBe("E_PAJEK_NO_VERTICES");
            expect(codes(err.report)).toEqual(["E_PAJEK_OUTSIDE_SECTION", "E_PAJEK_NO_VERTICES"]);
            expect(issue(err.report, "E_PAJEK_OUTSIDE_SECTION").line).toBe(1);
        }
    });

    it("refuses gzip bytes with E_FOREIGN_FORMAT naming gzip", async () => {
        const err = await rejects(pajek(GZIP_BYTES));
        expect(fatalCode(err)).toBe("E_FOREIGN_FORMAT");
        expect(err.message).toContain("gzip-compressed data");
    });
});

describe("Pajek robustness: truncation", () => {
    it("names the unrecognised header when a file cut inside *Vertices has no network", async () => {
        const err = await rejects(pajek("*Vert"));
        expect(fatalCode(err)).toBe("E_PAJEK_NO_VERTICES");
        expect(err.message).toBe(
            "not a Pajek network: no *Vertices section found (the file has the unrecognised section *Vert)",
        );
        expect(codes(err.report)).toEqual(["W_PAJEK_UNSUPPORTED_SECTION", "E_PAJEK_NO_VERTICES"]);
    });

    it("keeps the vertices of a file cut inside a section keyword", async () => {
        const { snapshot, report } = await pajek('*Vertices 2\n1 "a"\n2 "b"\n*Ar');
        expect(codes(report)).toEqual(["W_PAJEK_UNSUPPORTED_SECTION", "W_PAJEK_NO_LINES"]);
        expect(issue(report, "W_PAJEK_UNSUPPORTED_SECTION").line).toBe(4);
        expect(column(snapshot, "nodes", "label")).toEqual(["a", "b"]);
    });

    it("reports an interval cut before its ] as E_PAJEK_INTERVAL and keeps the vertex", async () => {
        const { snapshot, report } = await pajek('*Vertices 1\n1 "a" [1-\n*Edges\n');
        expect(codes(report)).toEqual(["E_PAJEK_INTERVAL"]);
        expect(issue(report, "E_PAJEK_INTERVAL").message).toBe('time interval [1- is not closed by "]"');
        expect(issue(report, "E_PAJEK_INTERVAL").line).toBe(2);
        expect(ids(snapshot)).toEqual([1]);
    });
});

describe("Pajek robustness: counts", () => {
    it("turns a sink that cannot hold the declared vertices (E_TOO_LARGE) into E_PAJEK_VERTICES_COUNT at the header", async () => {
        // a sink with room for two nodes, as the builder refuses ids past its id map limit
        class SmallSink extends GraphBuilder {
            override addNode(id: NodeId): number {
                if (this.nodeCount === 2) {
                    throw new GraphFormatError("E_TOO_LARGE", "no room", {});
                }
                return super.addNode(id);
            }
        }
        const err = await rejects(pajekImporter.import("*Vertices 3\n*Edges\n", new SmallSink({ directed: true })));
        expect(fatalCode(err)).toBe("E_PAJEK_VERTICES_COUNT");
        expect(err.message).toBe("line 1: *Vertices 3: the sink cannot hold that many (no room)");
        expect(issue(err.report, "E_PAJEK_VERTICES_COUNT").line).toBe(1);
    });

    it("reports vertices without a line even when other lines were out of range", async () => {
        const { snapshot, report } = await pajek('*Vertices 3\n1 "a"\n5 "e"\n6 "f"\n*Edges\n');
        expect(codes(report)).toEqual(["E_PAJEK_VERTEX_RANGE", "E_PAJEK_VERTEX_RANGE", "W_PAJEK_VERTEX_COUNT"]);
        expect(issue(report, "W_PAJEK_VERTEX_COUNT").message).toBe(
            "*Vertices declares 3 vertices but 1 vertex line(s) were read; the others have no label",
        );
        expect(column(snapshot, "nodes", "label")).toEqual(["a", undefined, undefined]);
    });

    it("warns that a zero-based file is zero-based and refuses the vertex beyond its range", async () => {
        const { snapshot, report } = await pajek('*Vertices 2\n0 "a"\n2 "b"\n*Edges\n');
        expect(codes(report)).toEqual(["W_PAJEK_ZERO_BASED", "E_PAJEK_VERTEX_RANGE", "W_PAJEK_VERTEX_COUNT"]);
        expect(issue(report, "E_PAJEK_VERTEX_RANGE").message).toBe("vertex 2 is outside 0..1");
        expect(ids(snapshot)).toEqual([0, 1]);
        expect(column(snapshot, "nodes", "label")).toEqual(["a", undefined]);
    });
});

describe("Pajek robustness: lines", () => {
    it("refuses a decimal comma, naming the token, and skips the line", async () => {
        const { snapshot, report } = await pajek("*Vertices 2\n*Edges\n1 2 1,5\n");
        expect(codes(report)).toEqual(["E_PAJEK_LINE"]);
        expect(issue(report, "E_PAJEK_LINE").message).toBe('parameter "1,5" has no value');
        expect(snapshot.edgeCount).toBe(0);
    });

    it("refuses a coordinate beyond the number range instead of making a column named after it", async () => {
        for (const coordinate of ["1e999", "NaN"]) {
            const { snapshot, report } = await pajek(`*Vertices 1\n1 "a" ${coordinate} 0.5\n*Edges\n`);
            expect(codes(report)).toEqual(["E_PAJEK_VERTEX_LINE"]);
            expect(issue(report, "E_PAJEK_VERTEX_LINE").message).toBe(
                `vertex 1: coordinate "${coordinate}" is not a finite number`,
            );
            expect(snapshot.nodes.names()).toEqual([]);
        }
    });

    it("reads a % in the middle of a line as data (Pajek comments are whole lines), so a %-label is kept", async () => {
        const { snapshot, report } = await pajek("*Vertices 2\n1 a\n2 %b\n*Edges\n1 2\n");
        expect(codes(report)).toEqual([]);
        expect(column(snapshot, "nodes", "label")).toEqual(["a", "%b"]);
    });

    it("refuses a trailing % note that does not fit the line's columns, naming the token", async () => {
        const { snapshot, report } = await pajek("*Vertices 2\n*Edges\n1 2 % trailing note\n");
        expect(codes(report)).toEqual(["E_PAJEK_LINE"]);
        expect(issue(report, "E_PAJEK_LINE").message).toBe('parameter "note" has no value');
        expect(snapshot.edgeCount).toBe(0);
    });

    it("removes a byte order mark that starts a later line (concatenated files) with W_CONTROL_CHARACTER", async () => {
        const { snapshot, report } = await pajek(`*Vertices 2\n1 a\n${String.fromCharCode(0xfeff)}2 b\n*Edges\n1 2\n`);
        expect(codes(report)).toEqual(["W_CONTROL_CHARACTER"]);
        expect(issue(report, "W_CONTROL_CHARACTER").element).toBe("U+FEFF");
        expect(column(snapshot, "nodes", "label")).toEqual(["a", "b"]);
        expect(edgePairs(snapshot)).toEqual(["1-2"]);
    });

    it("warns about a CSV-style doubled quote and a quote inside a bare token", async () => {
        const doubled = await pajek('*Vertices 1\n1 "a""b"\n*Edges\n');
        expect(codes(doubled.report)).toEqual(["W_PAJEK_QUOTE_IN_TOKEN"]);
        expect(column(doubled.snapshot, "nodes", "label")).toEqual(["ab"]);
        const inside = await pajek('*Vertices 1\n1 ab"c d"e\n*Edges\n');
        expect(codes(inside.report)).toEqual(["W_PAJEK_QUOTE_IN_TOKEN"]);
        expect(column(inside.snapshot, "nodes", "label")).toEqual(["abc de"]);
    });

    it("refuses a single-quoted label as a dangling parameter", async () => {
        const { report } = await pajek("*Vertices 1\n1 'a b'\n*Edges\n");
        expect(codes(report)).toEqual(["E_PAJEK_VERTEX_LINE"]);
        expect(issue(report, "E_PAJEK_VERTEX_LINE").message).toBe('parameter "b\'" has no value');
    });

    it("reads an unquoted multi-word label as the label and a parameter, as the grammar does", async () => {
        const { snapshot, report } = await pajek("*Vertices 1\n1 a b c\n*Edges\n");
        expect(codes(report)).toEqual([]);
        expect(column(snapshot, "nodes", "label")).toEqual(["a"]);
        expect(column(snapshot, "nodes", "b")).toEqual(["c"]);
    });

    it("reports a parameter given twice on one line; the later value stands", async () => {
        const { snapshot, report } = await pajek("*Vertices 2\n*Edges\n1 2 1 w 2 w 3\n");
        expect(codes(report)).toEqual(["W_DUPLICATE_ATTRIBUTE"]);
        expect(issue(report, "W_DUPLICATE_ATTRIBUTE").element).toBe("w");
        expect(column(snapshot, "edges", "w")).toEqual([3]);
    });

    it("warns when a bare non-integer number before two coordinates is read as the label", async () => {
        const { snapshot, report } = await pajek("*Vertices 2\n1 0.1 0.2 0.3\n2 0.4 0.5 0.6\n*Edges\n");
        expect(codes(report)).toEqual(["W_PAJEK_NUMERIC_LABEL"]);
        expect(issue(report, "W_PAJEK_NUMERIC_LABEL").message).toContain("may be meant as x y z");
        expect(column(snapshot, "nodes", "label")).toEqual(["0.1", "0.4"]);
    });
});

describe("Pajek robustness: labels and encodings", () => {
    it("keeps a character reference beyond U+10FFFF as written with W_PAJEK_REFERENCE_RANGE", async () => {
        const { snapshot, report } = await pajek('*Vertices 1\n1 "a&#99999999;b"\n*Edges\n');
        expect(codes(report)).toEqual(["W_PAJEK_REFERENCE_RANGE"]);
        expect(column(snapshot, "nodes", "label")).toEqual(["a&#99999999;b"]);
    });

    it("refuses a reference to a lone surrogate per element: the label is unset, the vertex kept", async () => {
        const { snapshot, report } = await pajek('*Vertices 1\n1 "&#55296;"\n*Edges\n');
        expect(codes(report)).toEqual(["E_COLUMN_TYPE"]);
        expect(ids(snapshot)).toEqual([1]);
        expect(column(snapshot, "nodes", "label")).toEqual([undefined]);
    });

    it("reads CR-only line ends, tab separators and no final newline", async () => {
        const { snapshot, report } = await pajek('*Vertices 2\r1\t"a"\r2\t"b"\r*Edges\r1\t2');
        expect(codes(report)).toEqual([]);
        expect(column(snapshot, "nodes", "label")).toEqual(["a", "b"]);
        expect(edgePairs(snapshot)).toEqual(["1-2"]);
    });

    it("decodes a UTF-16LE file by its byte order mark", async () => {
        const { snapshot, report } = await pajek(utf16le('*Vertices 1\n1 "a"\n*Edges\n', true));
        expect(codes(report)).toEqual([]);
        expect(column(snapshot, "nodes", "label")).toEqual(["a"]);
    });

    it("refuses UTF-16LE without a byte order mark with E_INVALID_ENCODING naming UTF-16", async () => {
        const err = await rejects(pajek(utf16le('*Vertices 1\n1 "a"\n', false)));
        expect(fatalCode(err)).toBe("E_INVALID_ENCODING");
        expect(err.message).toContain('pass the encoding option "utf-16le"');
    });

    it("reads a raw Latin-1 label byte as windows-1252 with W_ENCODING_FALLBACK", async () => {
        const { snapshot, report } = await pajek(latin1(`*Vertices 1\n1 "caf${E_ACUTE}"\n*Edges\n`));
        expect(codes(report)).toEqual(["W_ENCODING_FALLBACK"]);
        expect(column(snapshot, "nodes", "label")).toEqual([`caf${E_ACUTE}`]);
    });

    it("warns once when a coordinate does not survive the f32 position column", async () => {
        const { snapshot, report } = await pajek('*Vertices 2\n1 "a" 0.123456789 0.2\n2 "b" 0.5 0.25\n*Edges\n');
        expect(codes(report)).toEqual(["W_PRECISION"]);
        expect(issue(report, "W_PRECISION").line).toBe(2);
        expect(column(snapshot, "nodes", "position")).toEqual([
            [Math.fround(0.123456789), Math.fround(0.2), 0],
            [0.5, 0.25, 0],
        ]);
    });
});

describe("Pajek robustness: sections and networks", () => {
    it("reads the network after an unsupported section header, which does not take the *Vertices line", async () => {
        const { snapshot, report } = await pajek('*Description\n*Vertices 2\n1 "a"\n2 "b"\n*Edges\n1 2\n');
        expect(codes(report)).toEqual(["W_PAJEK_UNSUPPORTED_SECTION"]);
        expect(column(snapshot, "nodes", "label")).toEqual(["a", "b"]);
        expect(edgePairs(snapshot)).toEqual(["1-2"]);
    });

    it("warns about a two-mode line that joins two vertices of one mode", async () => {
        const { snapshot, report } = await pajek("*Vertices 4 2\n*Edges\n1 2\n1 3\n");
        expect(codes(report)).toEqual(["W_PAJEK_TWO_MODE_LINE"]);
        expect(issue(report, "W_PAJEK_TWO_MODE_LINE").line).toBe(3);
        expect(edgePairs(snapshot)).toEqual(["1-2", "1-3"]);
    });

    it("warns about a relation number given a second name", async () => {
        const { snapshot, report } = await pajek('*Vertices 2\n*Arcs :1 "x"\n1 2\n*Arcs :1 "y"\n2 1\n');
        expect(codes(report)).toEqual(["W_PAJEK_RELATION_RENAMED"]);
        expect(issue(report, "W_PAJEK_RELATION_RENAMED").line).toBe(4);
        expect(column(snapshot, "edges", "relation")).toEqual(["x", "y"]);
    });

    it("says that import() does not read objects that come after a later network", async () => {
        const text = "*Network A\n*Vertices 2\n*Network B\n*Vertices 3\n*Partition p\n*Vertices 2\n1\n2\n";
        const { snapshot, report } = await pajek(text);
        expect(codes(report)).toEqual(["W_PAJEK_NO_LINES", "W_MULTIPLE_GRAPHS"]);
        expect(issue(report, "W_MULTIPLE_GRAPHS").message).toContain(
            "1 *Partition / *Vector object(s) after them are not read",
        );
        expect(snapshot.nodes.names()).toEqual([]);
    });

    it("refuses an interval with a bound beyond the number range, and * alone", async () => {
        const { snapshot, report } = await pajek('*Vertices 2\n1 "a" [1e999-*]\n2 "b" [*]\n*Edges\n');
        expect(codes(report)).toEqual(["E_PAJEK_INTERVAL", "E_PAJEK_INTERVAL"]);
        expect(issue(report, "E_PAJEK_INTERVAL").message).toContain("beyond the number range");
        expect(report.issues[1].message).toContain('"*" alone is not a time point');
        expect(snapshot.nodes.names()).toEqual([]);
    });
});

describe("Pajek robustness: policies and several networks", () => {
    it("turns a self-loop under selfLoops error into an ImportError with E_SELF_LOOP in its report", async () => {
        const err = await rejects(pajek("*Vertices 1\n*Arcs\n1 1\n", { selfLoops: "error" }));
        expect(fatalCode(err)).toBe("E_SELF_LOOP");
        expect(codes(err.report)).toEqual(["E_SELF_LOOP"]);
    });

    it("says which network failed when a later network of importAllGraphs exceeds the error limit", async () => {
        const text = `*Network A\n*Vertices 1\n*Network B\n*Vertices 1\n${'1 "a" x\n'.repeat(150)}`;
        const err = await rejects(importAllGraphs(text, { format: "pajek" }));
        expect(err.message).toMatch(/^graph 1: error limit of 100 exceeded/);
        expect(err.details.graphIndex).toBe(1);
        expect(err.details.code).toBe("E_PAJEK_VERTEX_LINE");
    });
});
