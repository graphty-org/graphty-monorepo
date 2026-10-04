/**
 * Robustness of the CSV importer against damaged, truncated, mislabelled and ambiguous input:
 * every condition here either imports with the specific issue codes recorded and the recoverable
 * data kept, or rejects with an ImportError carrying the specific code. Conditions already pinned
 * by test/formats/csv, test/audit or test/common are not repeated.
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { csvImporter } from "../../src/formats/csv/index.js";
import { importGraph } from "../../src/registry.js";
import { ImportError, type ImportReport } from "../../src/types.js";
import { byteChunks, textChunksOf } from "../helpers/corpus.js";

type Input = Parameters<typeof csvImporter.import>[0];
type Options = Parameters<typeof csvImporter.import>[2];

const BOM = String.fromCharCode(0xfeff);
const NBSP = String.fromCharCode(0xa0);
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const E_ACUTE = String.fromCharCode(0xe9);
const encoder = new TextEncoder();

async function load(input: Input, options?: Options): Promise<{ snapshot: GraphSnapshot; report: ImportReport }> {
    const builder = new GraphBuilder({ directed: true, weightDtype: "f64" });
    const report = await csvImporter.import(input, builder, options);
    return { snapshot: builder.freeze(), report };
}

async function failure(input: Input, options?: Options): Promise<ImportError> {
    const builder = new GraphBuilder({ directed: true, weightDtype: "f64" });
    try {
        await csvImporter.import(input, builder, options);
    } catch (err) {
        if (err instanceof ImportError) {
            return err;
        }
        throw err;
    }
    throw new Error("expected an ImportError");
}

function codes(report: ImportReport): string[] {
    return report.issues.map((i) => i.code);
}

function edgesOf(s: GraphSnapshot): string[] {
    const list = s.edgeList();
    const out: string[] = [];
    for (let e = 0; e < s.edgeCount; e++) {
        out.push(`${String(s.ids.idOf(list.src[e]))}->${String(s.ids.idOf(list.dst[e]))}`);
    }
    return out;
}

function weightsOf(s: GraphSnapshot): (number | undefined)[] {
    const shadow = s.edges.byRole("weight");
    const list = s.edgeList();
    return Array.from({ length: s.edgeCount }, (_, e) => {
        if (shadow !== null) {
            return shadow.isSet(e) ? (shadow.value(e) as number) : undefined;
        }
        return list.weights === null ? undefined : list.weights[e];
    });
}

function column(s: GraphSnapshot, table: "nodes" | "edges", name: string): unknown[] {
    const c = s[table].get(name);
    if (c === null) {
        throw new Error(`no ${table} column ${name}`);
    }
    return Array.from({ length: c.length }, (_, r) => (c.isSet(r) ? c.value(r) : undefined));
}

function sniff(head: Uint8Array): number {
    if (csvImporter.sniff === undefined) {
        throw new Error("no sniff");
    }
    return csvImporter.sniff(head);
}

function bytes(...parts: (string | readonly number[] | Uint8Array)[]): Uint8Array {
    const arrays = parts.map((p) => (typeof p === "string" ? encoder.encode(p) : Uint8Array.from(p)));
    const out = new Uint8Array(arrays.reduce((n, a) => n + a.byteLength, 0));
    let at = 0;
    for (const a of arrays) {
        out.set(a, at);
        at += a.byteLength;
    }
    return out;
}

function utf16le(text: string): Uint8Array {
    const out = new Uint8Array(text.length * 2);
    for (let i = 0; i < text.length; i++) {
        out[2 * i] = text.charCodeAt(i) & 0xff;
        out[2 * i + 1] = text.charCodeAt(i) >> 8;
    }
    return out;
}

describe("csv robustness: truncation", () => {
    it("whitespace-only-file: spaces and a tab are an empty input, not a header-less row", async () => {
        const err = await failure("   \n\t\n  ");
        expect(codes(err.report)).toEqual(["E_EMPTY_INPUT"]);
    });

    it("only-comment-lines: a SNAP header with no records is an empty input (a truncated download fails loudly)", async () => {
        const err = await failure("# Directed graph\n# Nodes: 3\n");
        expect(codes(err.report)).toEqual(["E_EMPTY_INPUT"]);
    });

    it("header-only-bom-crlf: the empty graph with a no-rows warning, the BOM stripped from the header", async () => {
        const { snapshot, report } = await load(bytes([0xef, 0xbb, 0xbf], "source,target\r\n"));
        expect(snapshot.nodeCount).toBe(0);
        expect(snapshot.edgeCount).toBe(0);
        expect(codes(report)).toEqual(["W_CSV_NO_DATA_ROWS"]);
    });

    it("truncated-mid-header-after-delimiter: fails naming the missing target column", async () => {
        const err = await failure("source,");
        expect(codes(err.report)).toEqual(["E_CSV_NO_ENDPOINT_COLUMNS"]);
        expect(err.report.issues[0].message).toContain("no target column");
    });

    it("truncated-mid-header-quoted: an unclosed quote on line 1", async () => {
        const err = await failure('source,"tar');
        expect(codes(err.report)).toEqual(["E_CSV_UNCLOSED_QUOTE"]);
        expect(err.report.issues[0].line).toBe(1);
    });

    it("truncated-mid-escape: a doubled quote is a literal and leaves the field open", async () => {
        const err = await failure('source,target,l\na,b,"x""');
        expect(codes(err.report)).toEqual(["E_CSV_UNCLOSED_QUOTE"]);
        expect(err.report.issues[0].line).toBe(2);
    });

    it("truncated-after-closing-quote: the last record completes normally", async () => {
        const { snapshot, report } = await load('source,target,l\na,b,"x"');
        expect(report.issues).toEqual([]);
        expect(edgesOf(snapshot)).toEqual(["a->b"]);
        expect(column(snapshot, "edges", "l")).toEqual(["x"]);
    });

    it("truncated-mid-row: the cut last row is a field-count error, earlier rows kept", async () => {
        const { snapshot, report } = await load("source,target,weight\na,b,1\nc,d");
        expect(codes(report)).toEqual(["E_CSV_FIELD_COUNT"]);
        expect(report.issues[0].line).toBe(3);
        expect(edgesOf(snapshot)).toEqual(["a->b"]);
        expect(weightsOf(snapshot)).toEqual([1]);
    });

    it("truncated-mid-crlf: a file cut between CR and LF completes its last record", async () => {
        const { snapshot, report } = await load("source,target\na,b\r");
        expect(report.issues).toEqual([]);
        expect(edgesOf(snapshot)).toEqual(["a->b"]);
    });

    it("huge-unquoted-line: a 5 MB unquoted id imports whole", async () => {
        const id = "x".repeat(5_000_000);
        const { snapshot, report } = await load(`source,target\n${id},b\n`);
        expect(report.issues).toEqual([]);
        expect(snapshot.edgeCount).toBe(1);
        expect(String(snapshot.ids.idOf(0)).length).toBe(5_000_000);
    });
});

describe("csv robustness: encoding", () => {
    it("truncated-mid-multibyte-ascii-prefix: a UTF-8 sequence cut at the end is E_INVALID_UTF8, not windows-1252", async () => {
        const cut = bytes("source,target\na,", [0xe2, 0x82]);
        for (const input of [cut, byteChunks(cut, 1)]) {
            const err = await failure(input);
            expect(codes(err.report)).toEqual(["E_INVALID_UTF8"]);
            expect(err.report.issues[0].message).toContain("truncated");
        }
    });

    it("gzip-or-zip-bytes: compressed data is refused with a message that names it", async () => {
        const gzip = bytes([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xcb, 0x48, 0xcd]);
        const zip = bytes("PK", [0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00], "data.csv");
        for (const [input, kind] of [
            [gzip, "gzip"],
            [zip, "zip"],
        ] as const) {
            const err = await failure(input);
            expect(codes(err.report)).toEqual(["E_FOREIGN_FORMAT"]);
            expect(err.report.issues[0].message).toContain(kind);
        }
    });

    it("ascii-with-nul-bytes: NUL bytes in undeclared input are binary, not ids", async () => {
        const err = await failure(bytes("s,t\n", [0, 0, 0], ",", [0], "\n"));
        expect(codes(err.report)).toEqual(["E_INVALID_UTF8"]);
    });

    it("utf16le-without-bom: the NUL pattern of BOM-less UTF-16 fails and names the encoding option", async () => {
        const err = await failure(utf16le("source,target\na,b\n"));
        expect(codes(err.report)).toEqual(["E_INVALID_ENCODING"]);
        expect(err.report.issues[0].message).toContain("encoding");
        // with the encoding option the same bytes read correctly
        const { snapshot } = await load(utf16le("source,target\na,b\n"), { encoding: "utf-16le" });
        expect(edgesOf(snapshot)).toEqual(["a->b"]);
    });

    it("latin1-after-utf8: the error names the offset of the bad byte, not of the chunk", async () => {
        const head = bytes(`source,target\n`, encoder.encode(E_ACUTE), ",b\nc");
        const input = bytes(head, [0xe9], ",d\n");
        const err = await failure(input);
        expect(codes(err.report)).toEqual(["E_INVALID_UTF8"]);
        expect(err.report.issues[0].message).toContain(`byte ${head.byteLength}`);
    });

    it("bom-mid-file: a BOM inside the text (two files concatenated) is reported, the cell kept", async () => {
        const { snapshot, report } = await load(`source,target\n${BOM}a,b\na,c\n`);
        // U+FEFF is whitespace to String.prototype.trim, so the id is also reported as padded
        expect(codes(report)).toEqual(["W_CONTROL_CHARACTER", "W_CSV_PADDED_ID"]);
        expect(report.issues[1].line).toBe(2);
        expect(edgesOf(snapshot)).toEqual([`${BOM}a->b`, "a->c"]);
    });

    it("double-bom: the second BOM does not vanish silently from the header", async () => {
        const { snapshot, report } = await load(`${BOM}${BOM}source,target\na,b`);
        expect(edgesOf(snapshot)).toEqual(["a->b"]);
        expect(codes(report)).toEqual(["W_CONTROL_CHARACTER"]);
    });
});

describe("csv robustness: wrong format", () => {
    it("html-error-page-explicit-csv: an HTML page is refused, never read as a space-delimited edge", async () => {
        const err = await failure("<!DOCTYPE html><html><body>404</body></html>");
        expect(codes(err.report)).toEqual(["E_FOREIGN_FORMAT"]);
    });

    it("json-under-csv, gml-under-csv, pajek-under-csv, dot-under-csv: refused as another format", async () => {
        for (const text of [
            '{"nodes":[]}',
            '{\n  "nodes": []\n}\n',
            "[\n  1, 2\n]",
            "graph [ node [ id 1 ] ]",
            'Creator "networkx"\ngraph [\n]',
            "*Vertices 2\n1 a\n2 b\n*Arcs\n1 2",
            "digraph { a -> b }",
            "strict graph G {\n a -- b\n}",
            '<?xml version="1.0"?>\n<graphml/>',
        ]) {
            const err = await failure(text);
            expect(codes(err.report), text).toEqual(["E_CSV_OTHER_FORMAT"]);
            expect(sniff(encoder.encode(text)), text).toBe(0);
        }
    });

    it("html-under-csv-extension-auto: never a CSV graph under auto detection", async () => {
        await expect(
            importGraph(encoder.encode("<!DOCTYPE html><html><body>404</body></html>"), { filename: "data.csv" }),
        ).rejects.toBeInstanceOf(ImportError);
    });

    it("registry-sniff-other-format-regex-false-positive: a Creator column and an IRI edge list are CSV", async () => {
        expect(sniff(encoder.encode("Creator,Source,Target\nx,a,b\n"))).toBe(0.9);
        const iri = "<http://a>,<http://b>\n<http://b>,<http://c>\n";
        expect(sniff(encoder.encode(iri))).toBe(0.3);
        const { snapshot, report } = await load(iri);
        expect(report.issues).toEqual([]);
        expect(edgesOf(snapshot)).toEqual(["<http://a>-><http://b>", "<http://b>-><http://c>"]);
        const creator = await load("Creator,Source,Target\nx,a,b\n");
        expect(edgesOf(creator.snapshot)).toEqual(["a->b"]);
    });

    it("registry-sniff-quoted-header: quoted header names sniff like unquoted ones", () => {
        expect(sniff(encoder.encode('"source","target"\na,b\n'))).toBe(0.9);
        expect(sniff(encoder.encode('"id","name"\n1,a\n'))).toBe(0.6);
    });

    it("registry-sniff-utf16-bom: the sniff decodes by the BOM", () => {
        const head = bytes([0xff, 0xfe], utf16le("source,target\na,b\n"));
        expect(sniff(head)).toBe(0.9);
    });

    it("forced-wrong-delimiter-node-list: a one-column parse whose cells all hold another delimiter warns", async () => {
        const { snapshot, report } = await load("1,2\n3,4\n", { delimiter: ";" });
        expect(snapshot.ids.toArray()).toEqual(["1,2", "3,4"]);
        expect(codes(report)).toEqual(["W_CSV_SINGLE_COLUMN"]);
        expect(report.issues[0].message).toContain('","');
    });
});

describe("csv robustness: quoting and syntax", () => {
    it("unicode-line-separators: U+2028 does not end a record (RFC 4180); the row has 3 cells", async () => {
        const { snapshot, report } = await load(`source,target\na,b${LINE_SEPARATOR}c,d\n`);
        expect(codes(report)).toEqual(["E_CSV_FIELD_COUNT"]);
        expect(snapshot.edgeCount).toBe(0);
    });

    it("backslash-escaped-quote: fails with the line and a hint that RFC 4180 doubles quotes", async () => {
        const err = await failure('source,target,l\na,b,"x\\"y"');
        expect(codes(err.report)).toEqual(["E_CSV_QUOTE"]);
        expect(err.report.issues[0].line).toBe(2);
        expect(err.report.issues[0].message).toContain("field 3");
        expect(err.report.issues[0].message).toContain("two quotes");
    });

    it("quote-inside-unquoted-field: kept literally, with one warning per import", async () => {
        const { snapshot, report } = await load('source,target\na"x,b\nc"y,d\n');
        expect(edgesOf(snapshot)).toEqual(['a"x->b', 'c"y->d']);
        expect(codes(report)).toEqual(["W_CSV_STRAY_QUOTE"]);
        expect(report.issues[0].line).toBe(2);
    });

    it("space-before-opening-quote: the cell is unquoted text (RFC 4180), reported", async () => {
        const { snapshot, report } = await load('source,target\n "a",b\n');
        expect(edgesOf(snapshot)).toEqual([' "a"->b']);
        expect(codes(report).sort()).toEqual(["W_CSV_PADDED_ID", "W_CSV_STRAY_QUOTE"]);
    });

    it("single-quote-quoting: there is no quote option; single quotes are text, so the row splits", async () => {
        // deferred: CsvImportOptions has no quote option; the rows are reported, never misread
        const { snapshot, report } = await load("source,target,l\na,b,'x,y'\n");
        expect(codes(report)).toEqual(["E_CSV_FIELD_COUNT"]);
        expect(snapshot.edgeCount).toBe(0);
    });

    it("delimiter-option-line-break-or-multichar: refused before reading", async () => {
        for (const delimiter of ["\r\n", ";;", String.fromCodePoint(0x1f600)]) {
            const builder = new GraphBuilder({ directed: true });
            await expect(csvImporter.import("a,b\n", builder, { delimiter }), delimiter).rejects.toMatchObject({
                code: "E_UNSUPPORTED",
                details: { option: "delimiter" },
            });
        }
    });
});

describe("csv robustness: delimiters and dialects", () => {
    it("excel-sep-directive: a sep= first line sets the delimiter and is not a row", async () => {
        for (const text of ["sep=;\nsource;target\na;b\n", "sep=;\r\nsource;target\r\na;b\r\n", "SEP=|\na|b\nc|d\n"]) {
            const { snapshot, report } = await load(text);
            expect(report.issues, text).toEqual([]);
            expect(edgesOf(snapshot).length, text).toBeGreaterThan(0);
            expect(edgesOf(snapshot)[0], text).toBe("a->b");
        }
    });

    it("excel-sep-directive-space: a `sep= ` line selects the whitespace dialect and is not a row", async () => {
        const { snapshot, report } = await load("sep= \na b\nc d\n");
        expect(report.issues).toEqual([]);
        expect(edgesOf(snapshot)).toEqual(["a->b", "c->d"]);
    });

    it("multiple-spaces-delimiter: runs of spaces collapse in the space dialect", async () => {
        const { snapshot, report } = await load("1  2\n3  4\n5   6");
        expect(report.issues).toEqual([]);
        expect(edgesOf(snapshot)).toEqual(["1->2", "3->4", "5->6"]);
    });

    it("json-lines-under-csv: refused as another format before a quoted field can fail the record reader", async () => {
        for (const text of ['{"id":"a","x":1}\n{"id":"b","x":2}\n', '# note\n{"id":"a","x":1}\n', '[{"id":"a"}]']) {
            const err = await failure(text);
            expect(codes(err.report), text).toEqual(["E_CSV_OTHER_FORMAT"]);
        }
    });

    it("bracketed-ids-are-csv: an id in angle brackets or braces is not a tag or a JSON object", async () => {
        for (const [text, edge] of [
            ["<alice smith>,bob\n", "<alice smith>->bob"],
            ["<a>,b\n", "<a>->b"],
            ["{a},{b}\n", "{a}->{b}"],
        ]) {
            const { snapshot, report } = await load(text);
            expect(report.issues, text).toEqual([]);
            expect(edgesOf(snapshot), text).toEqual([edge]);
            expect(sniff(encoder.encode(text)), text).toBeGreaterThan(0);
        }
    });

    it("explicit-options-skip-other-format-refusal: a caller-fixed dialect reads the first line as a table", async () => {
        const { snapshot, report } = await load("<a> <b>\n<b> <c>\n", { delimiter: " ", header: false });
        expect(report.issues).toEqual([]);
        expect(edgesOf(snapshot)).toEqual(["<a>-><b>", "<b>-><c>"]);
    });

    it("leading-whitespace-space-dialect: leading indentation is ignored in the space dialect", async () => {
        const { snapshot, report } = await load(" 1 2\n 3 4\n");
        expect(report.issues).toEqual([]);
        expect(edgesOf(snapshot)).toEqual(["1->2", "3->4"]);
    });

    it("tab-plus-space-mixed: tab and space separators mixed in one file are both read", async () => {
        const { snapshot, report } = await load("1\t2\n3 4\n");
        expect(report.issues).toEqual([]);
        expect(edgesOf(snapshot)).toEqual(["1->2", "3->4"]);
    });

    it("delimiter-changes-after-preview: a later row with another delimiter is a field-count error", async () => {
        const rows = Array.from({ length: 12 }, (_, i) => `a${i},b${i}`);
        const { snapshot, report } = await load(`${rows.join("\n")}\nc;d;e\n`);
        expect(codes(report)).toEqual(["E_CSV_FIELD_COUNT"]);
        expect(report.issues[0].line).toBe(13);
        expect(snapshot.edgeCount).toBe(12);
    });

    it("space-in-ids-beats-comma-sniff: a consistency tie goes to the earlier candidate (comma)", async () => {
        const headerless = await load("New York,Los Angeles\nSan Jose,El Paso\n");
        expect(headerless.report.issues).toEqual([]);
        expect(edgesOf(headerless.snapshot)).toEqual(["New York->Los Angeles", "San Jose->El Paso"]);
        // the unrecognised header is read as data (pinned in test/formats/csv), but split on commas
        const named = await load("Source Node,Target Node\nNew York,Los Angeles\nSan Jose,El Paso\n");
        expect(edgesOf(named.snapshot)).toEqual([
            "Source Node->Target Node",
            "New York->Los Angeles",
            "San Jose->El Paso",
        ]);
    });

    it("sniff-tie-quoted-cells-with-spaces: comma wins and the quotes are honoured", async () => {
        const { snapshot, report } = await load('a b,"c d"\ne f,"g h"\n');
        expect(report.issues).toEqual([]);
        expect(edgesOf(snapshot)).toEqual(["a b->c d", "e f->g h"]);
    });

    it("hash-in-first-id: a first record that starts with # is skipped as a comment but reported", async () => {
        const { snapshot, report } = await load("#1,2\n3,4\n");
        expect(edgesOf(snapshot)).toEqual(["3->4"]);
        expect(codes(report)).toEqual(["W_CSV_COMMENT_LIKE_RECORD"]);
        expect(report.issues[0].element).toBe("#1,2");
    });

    it("many-leading-comments-streamed: more leading comments than the preview holds, in small chunks", async () => {
        const comments = Array.from({ length: 12 }, (_, i) => `# comment ${i}`).join("\n");
        const text = `${comments}\n1\t2\n3\t4\n`;
        for (const input of [text, textChunksOf(text, 8), byteChunks(encoder.encode(text), 8)]) {
            const { snapshot, report } = await load(input);
            expect(report.issues).toEqual([]);
            expect(edgesOf(snapshot)).toEqual(["1->2", "3->4"]);
        }
    });

    it("blank-line-before-snap-comments: a leading blank line does not hide the comments from the sniff", async () => {
        const { snapshot, report } = await load("\n# Directed graph\n# FromNodeId\tToNodeId\n1\t2\n3\t4\n", {
            defaultDirected: false,
        });
        // the comment overrides the explicit option, which is reported
        expect(codes(report)).toEqual(["W_CSV_COMMENT_DIRECTION"]);
        expect(report.issues[0].line).toBe(2);
        expect(edgesOf(snapshot)).toEqual(["1->2", "3->4"]);
        expect(snapshot.directed).toBe(true);
    });
});

describe("csv robustness: header and column roles", () => {
    it("delimiter-only-line: an Excel empty row (',' or ',,') is a blank row", async () => {
        const { snapshot, report } = await load("source,target\na,b\n,\n,,\n , \nc,d\n");
        expect(report.issues).toEqual([]);
        expect(edgesOf(snapshot)).toEqual(["a->b", "c->d"]);
    });

    it("all-empty-header: a delimiter-only first line is a blank row, so the next row is the first", async () => {
        for (const text of [",\na,b\n", " , \na,b\n"]) {
            const { snapshot, report } = await load(text);
            expect(report.issues, text).toEqual([]);
            expect(edgesOf(snapshot), text).toEqual(["a->b"]);
        }
    });

    it("trailing-delimiter-on-data-only: one extra empty last cell per row is dropped and reported once", async () => {
        const { snapshot, report } = await load("source,target\na,b,\nc,d,\n");
        expect(codes(report)).toEqual(["W_CSV_TRAILING_DELIMITER"]);
        expect(report.issues[0].line).toBe(2);
        expect(edgesOf(snapshot)).toEqual(["a->b", "c->d"]);
        // a non-empty extra cell is still a field-count error
        const extra = await load("source,target\na,b,x\n");
        expect(codes(extra.report)).toEqual(["E_CSV_FIELD_COUNT"]);
    });

    it("header-trailing-delimiter: an empty last header column is reported once and the rows imported", async () => {
        const { snapshot, report } = await load("source,target,\na,b\nc,d\ne,f,x\n");
        expect(codes(report)).toEqual(["W_CSV_TRAILING_HEADER_DELIMITER"]);
        expect(report.issues[0].line).toBe(1);
        expect(edgesOf(snapshot)).toEqual(["a->b", "c->d", "e->f"]);
        expect(column(snapshot, "edges", "column3")).toEqual([undefined, undefined, "x"]);
    });

    it("ambiguous-endpoint-headers: the column not chosen is named in a warning", async () => {
        const cases: [string, string, string][] = [
            ["Source,source,Target\na,b,c\n", "b->c", "Source"],
            ["from,to,source\na,b,c\n", "c->b", "from"],
        ];
        for (const [text, edge, demoted] of cases) {
            const { snapshot, report } = await load(text);
            expect(edgesOf(snapshot), text).toEqual([edge]);
            expect(codes(report), text).toEqual(["W_CSV_AMBIGUOUS_COLUMN"]);
            expect(report.issues[0].element, text).toBe(demoted);
        }
        const weight = await load("source,target,Weight,weight\na,b,1,2\n");
        expect(weightsOf(weight.snapshot)).toEqual([2]);
        expect(codes(weight.report)).toEqual(["W_CSV_AMBIGUOUS_COLUMN"]);
        expect(weight.report.issues[0].element).toBe("Weight");
    });

    it("quoted-line-break-in-header: a header with a source and no target fails naming the target", async () => {
        const err = await failure('source,"tar\nget"\na,b\n');
        expect(codes(err.report)).toEqual(["E_CSV_NO_ENDPOINT_COLUMNS"]);
        expect(err.report.issues[0].message).toContain("no target column");
        expect(err.report.issues[0].message).toContain('"tar\\nget"');
    });

    it("half-endpoint-header-becomes-node-table: one endpoint column is a broken edge table", async () => {
        const err = await failure("id,source,dest_node\n1,a,b\n2,c,d\n");
        expect(codes(err.report)).toEqual(["E_CSV_NO_ENDPOINT_COLUMNS"]);
        expect(err.report.issues[0].message).toContain("no target column");
    });

    it("source-equals-target-column: two options naming one column are refused before reading", async () => {
        const builder = new GraphBuilder({ directed: true });
        await expect(
            csvImporter.import("source,target\na,b\n", builder, { sourceColumn: 0, targetColumn: "source" }),
        ).rejects.toMatchObject({ code: "E_UNSUPPORTED", details: { option: "targetColumn" } });
    });

    it("explicit-column-name-does-not-force-header: a named column makes the first row a header", async () => {
        const { snapshot, report } = await load("u,v\nalice,bob\n", { sourceColumn: "u", targetColumn: "v" });
        expect(report.issues).toEqual([]);
        expect(edgesOf(snapshot)).toEqual(["alice->bob"]);
    });

    it("headerless-first-row-hits-marker: a marker word that reappears in the next row is data", async () => {
        const { snapshot, report } = await load("key,lock\nlock,door\ndoor,room\n");
        expect(report.issues).toEqual([]);
        expect(edgesOf(snapshot)).toEqual(["key->lock", "lock->door", "door->room"]);
    });

    it("marker-header-value-reappears: a marker header whose names reappear unchained is still the header", async () => {
        const nodes = await load("id,label\n1,id\n2,x\n", { table: "nodes" });
        expect(nodes.report.issues).toEqual([]);
        expect(nodes.snapshot.ids.toArray()).toEqual([1, 2]);
        // a header with one endpoint column is a broken edge table, never an edge name->target
        const err = await failure("name,target\nalice,name\n");
        expect(codes(err.report)).toEqual(["E_CSV_NO_ENDPOINT_COLUMNS"]);
    });

    it("headerless-third-column-not-numeric: a text third column is an attribute, not the weight", async () => {
        const { snapshot, report } = await load("a b knows\nc d likes\n");
        expect(codes(report)).toEqual(["W_CSV_WEIGHT_AS_ATTRIBUTE"]);
        expect(report.issues[0].element).toBe("column3");
        expect(edgesOf(snapshot)).toEqual(["a->b", "c->d"]);
        expect(weightsOf(snapshot)).toEqual([undefined, undefined]);
        expect(column(snapshot, "edges", "column3")).toEqual(["knows", "likes"]);
        // later numeric cells stay attribute values; the demotion is what the warning reports
        const later = await load("a,b,x\nc,d,y\ne,f,2\ng,h,3\n");
        expect(codes(later.report)).toEqual(["W_CSV_WEIGHT_AS_ATTRIBUTE"]);
        expect(weightsOf(later.snapshot)).toEqual([undefined, undefined, undefined, undefined]);
    });

    it("lowercase-type-column-ignored: direction words in a plain type column are reported once", async () => {
        const { snapshot, report } = await load("source,target,type\na,b,Undirected\nb,c,Undirected\n");
        expect(snapshot.directed).toBe(true);
        expect(column(snapshot, "edges", "type")).toEqual(["Undirected", "Undirected"]);
        expect(codes(report)).toEqual(["W_CSV_TYPE_COLUMN_IGNORED"]);
        // a type column of other words is an ordinary attribute
        const plain = await load("source,target,type\na,b,friend\n");
        expect(plain.report.issues).toEqual([]);
    });
});

describe("csv robustness: values and ids", () => {
    it("quoted-empty-endpoint: the empty string is a legal id", async () => {
        const { snapshot, report } = await load('"",b\nc,d\n');
        expect(report.issues).toEqual([]);
        expect(edgesOf(snapshot)).toEqual(["->b", "c->d"]);
    });

    it("padded-ids: unquoted ids with surrounding whitespace are kept as written and reported once", async () => {
        const { snapshot, report } = await load(`source,target\n a , b \na,b\n${NBSP}a,b\n`);
        expect(snapshot.ids.toArray()).toEqual([" a ", " b ", "a", "b", `${NBSP}a`]);
        expect(codes(report)).toEqual(["W_CSV_PADDED_ID"]);
        expect(report.issues[0].line).toBe(2);
        // a quoted padded id is deliberate
        const quoted = await load('source,target\n" a",b\n');
        expect(quoted.report.issues).toEqual([]);
    });

    it("edge-id-near-duplicates: edge ids are distinct texts", async () => {
        const { snapshot, report } = await load('Source,Target,Id\na,b,1\nc,d,01\ne,f," 1"\n');
        expect(report.issues).toEqual([]);
        expect(column(snapshot, "edges", "Id")).toEqual(["1", "01", " 1"]);
    });

    it("duplicate-edge-id-after-failed-row: an id of a skipped row is still free", async () => {
        const { snapshot, report } = await load("Source,Target,Id,Weight\na,b,1,x\nc,d,1,2\n");
        expect(codes(report)).toEqual(["E_INVALID_WEIGHT"]);
        expect(edgesOf(snapshot)).toEqual(["c->d"]);
        expect(column(snapshot, "edges", "Id")).toEqual(["1"]);
    });

    it("weight-column-missing-wrong-line: the missing weight column is reported on the header line", async () => {
        const { report } = await load("source,target\na,b\nc,d\n", { weightFrom: "cost" });
        expect(codes(report)).toEqual(["W_CSV_COLUMN_MISSING"]);
        expect(report.issues[0].line).toBe(1);
    });

    it("control-character-in-id: a NUL in a cell is kept and reported once; a form feed is text", async () => {
        const { snapshot, report } = await load("source,target\na\fb,c\n");
        expect(report.issues).toEqual([]);
        expect(edgesOf(snapshot)).toEqual(["a\fb->c"]);
        // declared or already decoded text skips the decoder's binary check; the shared text check reports
        for (const [input, options] of [
            [encoder.encode("s,t\na\0,b\n"), { encoding: "utf-8" }],
            ["s,t\na\0,b\n", {}],
        ] as const) {
            const nul = await load(input, options);
            expect(codes(nul.report)).toEqual(["W_CONTROL_CHARACTER"]);
        }
    });
});

describe("csv robustness: comment headers and direction", () => {
    it("comment-direction-loose-prefix: only whole KONECT tokens and the SNAP lines declare direction", async () => {
        for (const text of ["% symbols: none\n1 2\n", "# bipartite-ish note\n1 2\n", "# asymmetric data\n1 2\n"]) {
            const { snapshot, report } = await load(text, { defaultDirected: true });
            expect(report.issues, text).toEqual([]);
            expect(snapshot.directed, text).toBe(true);
        }
        const sym = await load("% sym unweighted\n1 2\n");
        expect(sym.snapshot.directed).toBe(false);
    });

    it("comment-direction-overrides-explicit-option: the file wins and the disagreement is reported", async () => {
        const { snapshot, report } = await load("% asym\n1 2\n", { defaultDirected: false });
        expect(snapshot.directed).toBe(true);
        expect(codes(report)).toEqual(["W_CSV_COMMENT_DIRECTION"]);
        const agree = await load("% asym\n1 2\n", { defaultDirected: true });
        expect(agree.report.issues).toEqual([]);
    });

    it("conflicting-comment-directions: the first wins and a warning names both lines", async () => {
        const { snapshot, report } = await load("# Undirected graph\n% asym\n1 2\n");
        expect(snapshot.directed).toBe(false);
        expect(codes(report)).toEqual(["W_CSV_COMMENT_DIRECTION"]);
        expect(report.issues[0].message).toContain("# Undirected graph");
        expect(report.issues[0].message).toContain("% asym");
    });

    it("leading-comment-in-paired-node-table: the node table's direction comment applies", async () => {
        const { snapshot, report } = await load("source,target\n1,2\n", { nodes: "# Undirected graph\nid\n1\n" });
        expect(report.issues).toEqual([]);
        expect(snapshot.directed).toBe(false);
    });
});

describe("csv robustness: node tables and options", () => {
    it("nodes-option-plus-node-table-input: with a paired node table the input must be an edge table", async () => {
        const err = await failure("id,x\n1,2\n", { nodes: "id,label\n1,a\n" });
        expect(codes(err.report)).toEqual(["E_CSV_NO_ENDPOINT_COLUMNS"]);
    });

    it("row-number-ids-ignored-headerless: rowNumberIds on a headerless node table is reported", async () => {
        const { snapshot, report } = await load("a\nb\n", { table: "nodes", rowNumberIds: true, header: false });
        expect(snapshot.ids.toArray()).toEqual(["a", "b"]);
        expect(codes(report)).toEqual(["W_OPTION_IGNORED"]);
        expect(report.issues[0].element).toBe("rowNumberIds");
    });

    it("nodes-table-missing-endpoint: a builder that cannot refuse new nodes reports the option", async () => {
        const { snapshot, report } = await load("source,target\na,z\n", { nodes: "id\na\n", addMissingNodes: false });
        expect(codes(report)).toEqual(["W_SINK_OPTION"]);
        expect(snapshot.ids.toArray()).toEqual(["a", "z"]);
    });
});

describe("csv robustness: adjacency tables", () => {
    const adjacency = { table: "adjacency" } as const;

    it("adjacency-colon-in-node-cell: a node cell is an id verbatim, a neighbour cell id:weight (the documented grammar)", async () => {
        // the exporter writes a neighbour whose id holds a colon as `a:1:`; a node cell is never split
        const { snapshot, report } = await load("a:1 b\nc a:1\n", adjacency);
        expect(report.issues).toEqual([]);
        expect(edgesOf(snapshot)).toEqual(["a:1->b", "c->a"]);
        expect(weightsOf(snapshot)).toEqual([undefined, 1]);
    });

    it("adjacency-quoted-neighbour-split: quoting does not protect the colon (the trailing colon does)", async () => {
        const { snapshot } = await load('a "b:2"\n', adjacency);
        expect(edgesOf(snapshot)).toEqual(["a->b"]);
        expect(weightsOf(snapshot)).toEqual([2]);
        const kept = await load('a "b:2:"\n', adjacency);
        expect(edgesOf(kept.snapshot)).toEqual(["a->b:2"]);
    });

    it("adjacency-colon-ids: the last colon splits when a number follows it", async () => {
        const { snapshot, report } = await load("a ::1 b:NaN\n", adjacency);
        expect(report.issues).toEqual([]);
        expect(edgesOf(snapshot)).toEqual(["a->:", "a->b:NaN"]);
        expect(weightsOf(snapshot)).toEqual([1, undefined]);
    });

    // known failure: a weight that overflows to Infinity (`c:1e400`) is kept with no warning; the
    // intended behavior reports it. Remove `.fails` when the shared weight parser reports overflow.
    it.fails("adjacency-weight-overflow: a weight beyond the f64 range is reported", async () => {
        const { report } = await load("a c:1e400\n", adjacency);
        expect(report.issues.length).toBeGreaterThan(0);
    });
});
