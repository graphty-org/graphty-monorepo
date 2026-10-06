/**
 * Robustness of the OBO flat-file importer: hostile, damaged, truncated and mislabelled input.
 * Every test pins one condition: the import either recovers with the named issue codes and the
 * recoverable data kept, or rejects with ImportError carrying the named code. Conditions already
 * pinned by test/formats/obo/importer.test.ts or the audit suite are not repeated here.
 */

import { gzipSync } from "node:zlib";

import { GraphBuilder, GraphFormatError, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { DUPLICATE_EDGE_CODE, EDGES_MERGED_CODE, SELF_LOOP_CODE } from "../../src/common/codes.js";
import { OBO_ISSUE, oboImporter, type OboImportOptions } from "../../src/formats/obo/importer.js";
import { importGraph } from "../../src/registry.js";
import { type CommonImportOptions, ImportError, type ImportInput, type ImportReport } from "../../src/types.js";

type Options = OboImportOptions & CommonImportOptions;

async function load(
    input: ImportInput,
    options?: Options,
    builder?: GraphBuilder,
): Promise<{ snapshot: GraphSnapshot; report: ImportReport }> {
    const sink = builder ?? new GraphBuilder({ directed: true });
    const report = await oboImporter.import(input, sink, options);
    return { snapshot: sink.freeze(), report };
}

async function fails(input: ImportInput, options?: Options): Promise<ImportError> {
    try {
        await load(input, options);
    } catch (err) {
        expect(err).toBeInstanceOf(ImportError);
        return err as ImportError;
    }
    throw new Error("expected the import to throw ImportError");
}

function codes(report: ImportReport): string[] {
    return report.issues.map((i) => i.code);
}

function issue(report: ImportReport, code: string): ImportReport["issues"][number] {
    const found = report.issues.find((i) => i.code === code);
    if (found === undefined) {
        throw new Error(`no ${code} in ${codes(report).join(", ")}`);
    }
    return found;
}

function ids(snapshot: GraphSnapshot): unknown[] {
    return Array.from({ length: snapshot.nodeCount }, (_, i) => snapshot.ids.idOf(i));
}

function cell(snapshot: GraphSnapshot, column: string, id: string): unknown {
    const col = snapshot.nodes.get(column);
    const index = snapshot.ids.indexOf(id);
    if (col === null || index < 0 || !col.isSet(index)) {
        return undefined;
    }
    const value = col.value(index);
    return ArrayBuffer.isView(value) ? Array.from(value as unknown as ArrayLike<unknown>) : value;
}

function edges(snapshot: GraphSnapshot): string[] {
    const list = snapshot.edgeList();
    const relation = snapshot.edges.get("relation");
    return Array.from({ length: snapshot.edgeCount }, (_, e) => {
        const r = relation?.isSet(e) === true ? String(relation.value(e)) : "?";
        return `${String(snapshot.ids.idOf(list.src[e]))} ${r} ${String(snapshot.ids.idOf(list.dst[e]))}`;
    });
}

/** The own entries of an object, sorted (so `__proto__` keys can be compared). */
function entries(value: unknown): [string, unknown][] {
    expect(typeof value).toBe("object");
    return Object.entries(value as object).sort(([a], [b]) => Number(a > b) - Number(a < b));
}

function oboExtra(snapshot: GraphSnapshot): Record<string, unknown> {
    return snapshot.meta.extra.obo as Record<string, unknown>;
}

async function* chunksOf(bytes: Uint8Array, size: number): AsyncIterable<Uint8Array> {
    for (let i = 0; i < bytes.length; i += size) {
        yield bytes.subarray(i, i + size);
        await Promise.resolve();
    }
}

const HEAD = "format-version: 1.4\nontology: test\n\n";
const enc = new TextEncoder();

describe("robustness: names that are Object.prototype members", () => {
    it("keeps unknown Term tags named constructor, __proto__, toString, hasOwnProperty (proto-tag-in-term)", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nconstructor: y\n__proto__: x\ntoString: x\nhasOwnProperty: x\n`;
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual(Array(4).fill(OBO_ISSUE.UNKNOWN_ELEMENT));
        expect(report.issues.map((i) => i.element).sort()).toEqual(
            ["__proto__", "constructor", "hasOwnProperty", "toString"].sort(),
        );
        expect(entries(cell(snapshot, "obo.unrecognized", "X:1"))).toEqual([
            ["__proto__", ["x"]],
            ["constructor", ["y"]],
            ["hasOwnProperty", ["x"]],
            ["toString", ["x"]],
        ]);
        expect(Object.getPrototypeOf({})).toBe(Object.prototype);
        expect(typeof {}.toString).toBe("function");
    });

    it("keeps a header tag named toString or __proto__ like any unknown header tag (proto-tag-in-header)", async () => {
        const text = "toString: x\n__proto__: y\nformat-version: 1.4\n\n[Term]\nid: X:1\n";
        const { snapshot, report } = await load(text);
        expect(report.issues).toEqual([]);
        const { header } = oboExtra(snapshot);
        expect(entries(header)).toEqual([
            ["__proto__", ["y"]],
            ["format-version", ["1.4"]],
            ["toString", ["x"]],
        ]);
    });

    it("keeps a Typedef tag named hasOwnProperty in the typedef record (proto-tag-in-typedef)", async () => {
        const text = `${HEAD}[Typedef]\nid: r\nhasOwnProperty: x\n`;
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([OBO_ISSUE.UNKNOWN_ELEMENT]);
        const typedefs = oboExtra(snapshot).typedefs as Record<string, unknown>;
        expect(entries(typedefs.r)).toEqual([
            ["hasOwnProperty", ["x"]],
            ["id", ["r"]],
        ]);
        const asNodes = await load(text, { typedefs: "nodes" });
        expect(entries(cell(asNodes.snapshot, "obo.unrecognized", "r"))).toEqual([["hasOwnProperty", ["x"]]]);
    });

    it("keeps a __proto__ clause of an unknown frame type (proto-tag-in-unknown-frame)", async () => {
        const { snapshot, report } = await load(`${HEAD}[Foo]\n__proto__: x\n`);
        expect(codes(report)).toEqual([OBO_ISSUE.UNKNOWN_ELEMENT]);
        expect(issue(report, OBO_ISSUE.UNKNOWN_ELEMENT).element).toBe("[Foo]");
        const frames = oboExtra(snapshot).unknownFrames as { type: string; clauses: unknown }[];
        expect(frames).toHaveLength(1);
        expect(frames[0].type).toBe("Foo");
        expect(entries(frames[0].clauses)).toEqual([["__proto__", ["x"]]]);
    });

    it("keeps a Typedef id, an xref id and a qualifier named after a prototype member (proto-qualifier-and-id)", async () => {
        const typedef = await load(`${HEAD}[Typedef]\nid: __proto__\nname: p\n`);
        expect(typedef.report.issues).toEqual([]);
        const { typedefs } = oboExtra(typedef.snapshot);
        expect(entries(typedefs).map(([k]) => k)).toEqual(["__proto__"]);
        expect(entries(entries(typedefs)[0][1])).toEqual([
            ["id", ["__proto__"]],
            ["name", ["p"]],
        ]);

        const xrefs = await load(
            `${HEAD}[Term]\nid: X:1\nxref: __proto__ "d1"\nxref: constructor "d2"\nxref: A:1 "d3"\n`,
        );
        expect(xrefs.report.issues).toEqual([]);
        expect(cell(xrefs.snapshot, "xref", "X:1")).toEqual(["__proto__", "constructor", "A:1"]);
        expect(entries(cell(xrefs.snapshot, "xref.descriptions", "X:1"))).toEqual([
            ["A:1", "d3"],
            ["__proto__", "d1"],
            ["constructor", "d2"],
        ]);

        const qualified = await load(`${HEAD}[Term]\nid: X:1\nis_a: X:2 {a="1"} {__proto__="x"}\n\n[Term]\nid: X:2\n`);
        expect(qualified.report.issues).toEqual([]);
        expect(edges(qualified.snapshot)).toEqual(["X:1 is_a X:2"]);
        expect(entries(qualified.snapshot.edges.get("qualifiers")?.value(0))).toEqual([
            ["__proto__", "x"],
            ["a", "1"],
        ]);
    });
});

describe("robustness: input that is not OBO", () => {
    it("rejects a JSON document forced as OBO (wrong-format-json)", async () => {
        const err = await fails('{"graphs":[{"nodes":[{"id":"a"}]}]}');
        expect(codes(err.report)).toEqual([OBO_ISSUE.NOT_OBO]);
        expect(err.report.issues[0].line).toBe(1);
        const forced = importGraph('{"graphs":[{"nodes":[{"id":"a"}]}]}', { format: "obo" });
        await expect(forced).rejects.toBeInstanceOf(ImportError);
    });

    it("rejects an HTML error page as a foreign file (wrong-format-html)", async () => {
        const err = await fails(
            "<!DOCTYPE html>\n<html><head><title>404 Not Found</title></head>\n<body>Not Found</body></html>\n",
        );
        expect(codes(err.report)).toEqual([OBO_ISSUE.FOREIGN_FORMAT]);
    });

    it.each([
        ["a JSON array", '[\n {"id": 1, "label": "a"},\n {"id": 2}\n]'],
        ["a lone bracket", "["],
        ["a one-line JSON array", '[{"id": 1}]'],
    ])(
        "rejects %s: a damaged header with no frame name is no proof of OBO (wrong-format-json-array)",
        async (_name, text) => {
            const err = await fails(text);
            expect(codes(err.report)).toEqual([OBO_ISSUE.NOT_OBO]);
            expect(err.report.issues[0].line).toBe(1);
        },
    );

    it.each([
        ["GML", "graph [\n node [ id 1 ]\n]\n"],
        ["DOT", "digraph { a -> b }\n"],
        ["CSV", "source,target\n1,2\n"],
    ])("rejects a %s file (wrong-format-gml-dot-csv)", async (_name, text) => {
        const err = await fails(text);
        expect(codes(err.report)).toEqual([OBO_ISSUE.NOT_OBO]);
    });

    it("rejects gzip- and zip-compressed input at once (wrong-format-gzip-zip)", async () => {
        const gz = gzipSync(enc.encode(`${HEAD}[Term]\nid: X:1\nname: a term with some text\n`));
        const gzErr = await fails(gz);
        expect(codes(gzErr.report)).toEqual([OBO_ISSUE.FOREIGN_FORMAT]);
        const zip = new Uint8Array([
            0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0xb7, 0x9c, 0xd1, 0xe9,
        ]);
        const zipErr = await fails(zip);
        expect(codes(zipErr.report)).toEqual([OBO_ISSUE.FOREIGN_FORMAT]);
    });

    it("rejects UTF-16 without a BOM (wrong-format-utf16be-nobom)", async () => {
        const text = `${HEAD}[Term]\nid: X:1\n`;
        const be = new Uint8Array(text.length * 2);
        const le = new Uint8Array(text.length * 2);
        for (let i = 0; i < text.length; i++) {
            be[2 * i + 1] = text.charCodeAt(i);
            le[2 * i] = text.charCodeAt(i);
        }
        expect(codes((await fails(be)).report)).toEqual([OBO_ISSUE.INVALID_ENCODING]);
        expect(codes((await fails(le)).report)).toEqual([OBO_ISSUE.INVALID_ENCODING]);
    });

    it("reads a file of only comments as an empty graph, warning that nothing was read (comment-only)", async () => {
        const { snapshot, report } = await load("! written by a failed export\n! nothing here\n");
        expect(snapshot.nodeCount).toBe(0);
        expect(codes(report)).toEqual([OBO_ISSUE.FORMAT_VERSION]);
        expect(report.issues[0].message).toMatch(/no frames/);
    });
});

describe("robustness: the header", () => {
    it("warns once that format-version is missing (missing-format-version)", async () => {
        const { snapshot, report } = await load("[Term]\nid: X:1\n");
        expect(ids(snapshot)).toEqual(["X:1"]);
        expect(codes(report)).toEqual([OBO_ISSUE.FORMAT_VERSION]);
        expect(report.issues[0].message).toMatch(/format-version/);
    });

    it.each(["9.9", "banana"])("warns that format-version %s is read as 1.4 (unknown-format-version)", async (v) => {
        const { snapshot, report } = await load(`format-version: ${v}\n\n[Term]\nid: X:1\n`);
        expect(ids(snapshot)).toEqual(["X:1"]);
        expect(codes(report)).toEqual([OBO_ISSUE.FORMAT_VERSION]);
        expect(report.issues[0].message).toContain(v);
        expect(snapshot.meta.sourceVersion).toBe(v);
    });

    it("keeps the first of a repeated single-valued header tag, warning (repeated-header-tag)", async () => {
        const text =
            "format-version: 1.2\nformat-version: 1.4\nontology: a\nontology: b\nremark: r1\nremark: r2\n\n[Term]\nid: X:1\n";
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([OBO_ISSUE.DUPLICATE_ATTRIBUTE, OBO_ISSUE.DUPLICATE_ATTRIBUTE]);
        expect(report.issues.map((i) => i.element)).toEqual(["format-version", "ontology"]);
        expect(snapshot.meta.sourceVersion).toBe("1.2");
        expect(snapshot.meta.name).toBe("a");
        const header = oboExtra(snapshot).header as Record<string, string[]>;
        expect(header["format-version"]).toEqual(["1.2", "1.4"]);
        expect(header.ontology).toEqual(["a", "b"]);
        expect(header.remark).toEqual(["r1", "r2"]);
    });

    it("reads an impossible header date as no date, with a warning (header-date-impossible)", async () => {
        for (const date of ["31:02:2012 10:00", "31:04:2012 10:00"]) {
            const { snapshot, report } = await load(`format-version: 1.2\ndate: ${date}\n\n[Term]\nid: X:1\n`);
            expect(snapshot.meta.created).toBeNull();
            expect(codes(report)).toEqual([OBO_ISSUE.SYNTAX]);
            expect(report.issues[0].element).toBe("date");
            expect((oboExtra(snapshot).header as Record<string, string[]>).date).toEqual([date]);
        }
        const leap = await load("format-version: 1.2\ndate: 29:02:2012 10:00\n\n[Term]\nid: X:1\n");
        expect(leap.snapshot.meta.created).toBe("2012-02-29T10:00");
        expect(leap.report.issues).toEqual([]);
    });

    it("reports a subsetdef or synonymtypedef that declares nothing at its own line (malformed-subsetdef-synonymtypedef)", async () => {
        const text = 'format-version: 1.4\nsubsetdef: "q"\nsubsetdef:\nsynonymtypedef:\n\n[Term]\nid: X:1\nsubset: q\n';
        const { snapshot, report } = await load(text);
        expect(cell(snapshot, "subset", "X:1")).toEqual(["q"]);
        const syntax = report.issues.filter((i) => i.code === OBO_ISSUE.SYNTAX);
        expect(syntax.map((i) => [i.element, i.line])).toEqual([
            ["subsetdef", 2],
            ["synonymtypedef", 4],
        ]);
        expect(syntax[0].message).toMatch(/2 time/);
        expect(codes(report)).toContain(OBO_ISSUE.UNDECLARED);
        expect((oboExtra(snapshot).header as Record<string, string[]>).subsetdef).toEqual(['"q"', ""]);
    });
});

describe("robustness: frame headers", () => {
    it("keeps earlier frames when the file is cut inside a frame header (truncated-mid-frame-header)", async () => {
        const cut = await load(`${HEAD}[Term]\nid: X:1\n\n[Te`);
        expect(ids(cut.snapshot)).toEqual(["X:1"]);
        expect(issue(cut.report, OBO_ISSUE.SYNTAX).line).toBe(7);
        expect(cut.report.errorCount).toBe(0);

        const empty = await load(`${HEAD}[Term]\nid: X:1\n\n[Term`);
        expect(ids(empty.snapshot)).toEqual(["X:1"]);
        expect(codes(empty.report).sort()).toEqual([OBO_ISSUE.MISSING_ID, OBO_ISSUE.SYNTAX].sort());
        expect(empty.report.counts.skippedNodes).toBe(1);
    });

    it("starts a new frame at a header missing its ] (unclosed-frame-header-mid-file)", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:1\n\n[Term\nid: X:2\nname: two\n`);
        expect(ids(snapshot)).toEqual(["X:1", "X:2"]);
        expect(cell(snapshot, "name", "X:1")).toBeUndefined();
        expect(cell(snapshot, "name", "X:2")).toBe("two");
        expect(codes(report)).toEqual([OBO_ISSUE.SYNTAX]);
        expect(report.issues[0].line).toBe(7);
    });

    it.each(["[Term] extra words", "[Term]x"])("starts a frame at %j (frame-header-trailing-text)", async (header) => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:1\n\n${header}\nid: X:2\nname: two\n`);
        expect(ids(snapshot)).toEqual(["X:1", "X:2"]);
        expect(cell(snapshot, "name", "X:2")).toBe("two");
        expect(codes(report)).toEqual([OBO_ISSUE.SYNTAX]);
    });

    it("never lets a continuation swallow a frame header (continuation-into-frame-header)", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:1\nname: a \\\n[Term]\nid: X:2\n`);
        expect(ids(snapshot)).toEqual(["X:1", "X:2"]);
        expect(cell(snapshot, "name", "X:1")).toBe("a");
        expect(codes(report)).toEqual([OBO_ISSUE.SYNTAX]);
        expect(report.issues[0].line).toBe(6);
    });

    it("does not continue a line whose backslash is inside a trailing comment (continuation-inside-comment)", async () => {
        const text = `${HEAD}[Term]\nid: X:1\ncomment: see ! C:\\temp\\\nis_a: X:2\n\n[Term]\nid: X:2\n`;
        const { snapshot, report } = await load(text);
        expect(report.issues).toEqual([]);
        expect(cell(snapshot, "comment", "X:1")).toBe("see");
        expect(edges(snapshot)).toEqual(["X:1 is_a X:2"]);
    });

    it("does not continue a full-line comment ending in a backslash (continuation-on-comment-line)", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:1\n! note \\\n[Term]\nid: X:2\n`);
        expect(report.issues).toEqual([]);
        expect(ids(snapshot)).toEqual(["X:1", "X:2"]);
    });

    it("reports a frame of an empty or lowercase name as an unknown frame (unknown-frame-type)", async () => {
        const { snapshot, report } = await load(`${HEAD}[term]\nid: X:1\n\n[]\nid: X:2\n\n[ Term ]\nid: X:3\n`);
        expect(ids(snapshot)).toEqual(["X:3"]);
        expect(report.issues.map((i) => [i.code, i.element])).toEqual([
            [OBO_ISSUE.UNKNOWN_ELEMENT, "[term]"],
            [OBO_ISSUE.UNKNOWN_ELEMENT, "[]"],
        ]);
    });
});

describe("robustness: truncated clauses", () => {
    it("reports a frame cut right after its id tag (truncated-after-id-tag)", async () => {
        const bare = await load(`${HEAD}[Term]\nid: X:1\n\n[Term]\nid`);
        expect(ids(bare.snapshot)).toEqual(["X:1"]);
        expect(codes(bare.report).sort()).toEqual([OBO_ISSUE.MISSING_ID, OBO_ISSUE.SYNTAX].sort());
        expect(bare.report.counts.skippedNodes).toBe(1);

        const empty = await load(`${HEAD}[Term]\nid: X:1\n\n[Term]\nid: `);
        expect(ids(empty.snapshot)).toEqual(["X:1"]);
        expect(codes(empty.report)).toEqual([OBO_ISSUE.MISSING_ID]);
        expect(empty.report.counts.skippedNodes).toBe(1);
    });

    it("keeps a frame cut mid tag name (truncated-mid-tag-name)", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:1\n\n[Term]\nid: X:2\nna`);
        expect(ids(snapshot)).toEqual(["X:1", "X:2"]);
        expect(codes(report)).toEqual([OBO_ISSUE.SYNTAX]);
        expect(report.issues[0].line).toBe(9);
    });

    it("warns about an xref list cut before its ] (truncated-mid-xref-list)", async () => {
        const def = await load(`${HEAD}[Term]\nid: X:1\ndef: "d" [A:1, B:`);
        expect(cell(def.snapshot, "def", "X:1")).toBe("d");
        expect(cell(def.snapshot, "def.xrefs", "X:1")).toEqual(["A:1", "B:"]);
        expect(codes(def.report)).toEqual([OBO_ISSUE.SYNTAX]);
        expect(def.report.issues[0].element).toBe("def");

        const syn = await load(`${HEAD}[Term]\nid: X:1\nsynonym: "s" EXACT [A:1, B`);
        expect(cell(syn.snapshot, "synonym", "X:1")).toEqual([
            { text: "s", scope: "EXACT", type: null, xrefs: ["A:1", "B"] },
        ]);
        expect(codes(syn.report)).toEqual([OBO_ISSUE.SYNTAX]);
    });

    it("keeps an is_a edge whose qualifier block was cut off (truncated-mid-qualifier-block)", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:2\n\n[Term]\nid: X:1\nis_a: X:2 {source="PM`);
        expect(edges(snapshot)).toEqual(["X:1 is_a X:2"]);
        expect(codes(report)).toEqual([OBO_ISSUE.SYNTAX]);
        expect(report.errorCount).toBe(0);
    });

    it("reads a last line that ends on a backslash (truncated-after-continuation)", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:1\nname: a \\`);
        expect(cell(snapshot, "name", "X:1")).toBe("a");
        expect(codes(report)).toEqual([OBO_ISSUE.DEPRECATED_SYNTAX]);
    });

    it("warns about an unterminated property_value and a list where the datatype goes (property-value-unterminated-or-list)", async () => {
        const quote = await load(`${HEAD}[Term]\nid: X:1\nproperty_value: rel "abc`);
        expect(cell(quote.snapshot, "property_value", "X:1")).toEqual([
            { relation: "rel", value: "abc", datatype: null },
        ]);
        expect(codes(quote.report)).toEqual([OBO_ISSUE.SYNTAX]);

        const list = await load(`${HEAD}[Term]\nid: X:1\nproperty_value: rel "v" [x]\n`);
        expect(cell(list.snapshot, "property_value", "X:1")).toEqual([{ relation: "rel", value: "v", datatype: null }]);
        expect(codes(list.report)).toEqual([OBO_ISSUE.SYNTAX]);
    });

    it("warns about an xref description whose quote never closes (xref-unterminated-description)", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:1\nxref: A:1 "desc`);
        expect(cell(snapshot, "xref", "X:1")).toEqual(["A:1"]);
        expect(entries(cell(snapshot, "xref.descriptions", "X:1"))).toEqual([["A:1", "desc"]]);
        expect(codes(report)).toEqual([OBO_ISSUE.SYNTAX]);
        expect(report.issues[0].element).toBe("xref");
    });
});

describe("robustness: malformed clause values", () => {
    it("warns about text after a def's xref list (def-trailing-tokens)", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:1\ndef: "d" [A:1] extra words\n`);
        expect(cell(snapshot, "def", "X:1")).toBe("d");
        expect(cell(snapshot, "def.xrefs", "X:1")).toEqual(["A:1"]);
        expect(codes(report)).toEqual([OBO_ISSUE.SYNTAX]);
        expect(report.issues[0].element).toBe("def");
    });

    it("warns about a second quoted string and a second xref list in a synonym (synonym-extra-nonword-tokens)", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:1\nsynonym: "s" "t" EXACT [A:1] [B:2]\n`);
        expect(cell(snapshot, "synonym", "X:1")).toEqual([{ text: "s", scope: "EXACT", type: null, xrefs: ["A:1"] }]);
        expect(codes(report)).toEqual([OBO_ISSUE.SYNTAX]);
        expect(report.issues[0].element).toBe("synonym");
    });

    it("warns when an unterminated quote keeps a comment in a text value (text-tag-quote-hides-comment)", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:1\ncomment: say "hi ! hidden\n`);
        expect(cell(snapshot, "comment", "X:1")).toBe('say "hi ! hidden');
        expect(codes(report)).toEqual([OBO_ISSUE.SYNTAX]);
        expect(report.issues[0].element).toBe("comment");
    });

    it("keeps the qualifier block of an id clause (id-with-qualifier-block)", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:1 {source="a"}\n`);
        expect(report.issues).toEqual([]);
        expect(ids(snapshot)).toEqual(["X:1"]);
        expect(cell(snapshot, "obo.qualifiers", "X:1")).toEqual({
            id: [{ value: "X:1", qualifiers: { source: "a" } }],
        });
    });

    it("refuses an id holding unescaped whitespace in the frame and in a reference alike (id-with-whitespace)", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X 1\n\n[Term]\nid: X:2\nis_a: X 1\n`);
        expect(ids(snapshot)).toEqual(["X:2"]);
        expect(snapshot.edgeCount).toBe(0);
        expect(codes(report)).toEqual([OBO_ISSUE.BAD_VALUE, OBO_ISSUE.BAD_VALUE]);
        expect(report.issues.map((i) => i.line)).toEqual([5, 9]);
        expect(report.counts.skippedNodes).toBe(1);
        const escaped = await load(`${HEAD}[Term]\nid: X\\ 1\n\n[Term]\nid: X:2\nis_a: X\\ 1\n`);
        expect(escaped.report.issues).toEqual([]);
        expect(edges(escaped.snapshot)).toEqual(["X:2 is_a X 1"]);
    });

    it("refuses an id holding NUL and warns about a control character in a name (nul-and-control-chars)", async () => {
        const nul = String.fromCharCode(0);
        const soh = String.fromCharCode(1);
        const text = `${HEAD}[Term]\nid: X:${nul}1\n\n[Term]\nid: X:2\nname: a${soh}b\n`;
        const { snapshot, report } = await load(text);
        expect(ids(snapshot)).toEqual(["X:2"]);
        expect(cell(snapshot, "name", "X:2")).toBe(`a${soh}b`);
        expect(codes(report)).toEqual([OBO_ISSUE.CONTROL_CHARACTER, OBO_ISSUE.BAD_VALUE]);
        expect(report.counts.skippedNodes).toBe(1);
    });

    it("keeps a form feed inside a quoted value as text (form-feed-inside-quote)", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:1\ndef: "a\fb" []\n\f[Term]\nid: X:2\n`);
        expect(report.issues).toEqual([]);
        expect(cell(snapshot, "def", "X:1")).toBe("a\fb");
        expect(ids(snapshot)).toEqual(["X:1", "X:2"]);
    });

    it("reports a clause with nothing before the colon as a syntax warning (empty-tag-name)", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:1\n: value\n`);
        expect(codes(report)).toEqual([OBO_ISSUE.SYNTAX]);
        expect(report.issues[0].line).toBe(6);
        expect(cell(snapshot, "obo.unrecognized", "X:1")).toBeUndefined();
    });

    it("keeps Typedef-only tags on a Term in obo.unrecognized (typedef-tag-on-term)", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nis_transitive: true\ninstance_of: X:2\n`;
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([OBO_ISSUE.UNKNOWN_ELEMENT, OBO_ISSUE.UNKNOWN_ELEMENT]);
        expect(cell(snapshot, "obo.unrecognized", "X:1")).toEqual({ is_transitive: ["true"], instance_of: ["X:2"] });
        expect(snapshot.edgeCount).toBe(0);
    });

    it("does not count a Typedef without an id as a skipped node (typedef-missing-id-counted-as-node)", async () => {
        const meta = await load(`${HEAD}[Typedef]\nname: r\n\n[Term]\nid: X:1\n`);
        expect(codes(meta.report)).toEqual([OBO_ISSUE.MISSING_ID]);
        expect(meta.report.issues[0].message).toContain("[Typedef]");
        expect(meta.report.counts.skippedNodes).toBe(0);
        const nodes = await load(`${HEAD}[Typedef]\nname: r\n\n[Term]\nid: X:1\n`, { typedefs: "nodes" });
        expect(nodes.report.counts.skippedNodes).toBe(1);
    });

    it("refuses CURIE ids under ids number and merges 01 with 1 (ids-number-curie)", async () => {
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: GO:0008150\n\n[Term]\nid: 01\n\n[Term]\nid: 1\n`, {
            ids: "number",
        });
        expect(ids(snapshot)).toEqual([1]);
        expect(codes(report)).toEqual(["E_INVALID_ID", OBO_ISSUE.ID_MERGED]);
        expect(report.issues[0].element).toBe("GO:0008150");
        expect(report.counts.skippedNodes).toBe(1);
    });
});

describe("robustness: the graph the frames make", () => {
    it("names a target that is a Typedef in the dangling warning (target-is-typedef-under-metadata)", async () => {
        const text = `${HEAD}[Term]\nid: X:1\nrelationship: part_of part_of\n\n[Typedef]\nid: part_of\n`;
        const { snapshot, report } = await load(text);
        expect(edges(snapshot)).toEqual(["X:1 part_of part_of"]);
        expect(codes(report)).toEqual([OBO_ISSUE.DANGLING_REFERENCE]);
        expect(report.issues[0].message).toContain("a Typedef");
    });

    it.each([
        ["the builder", (policy: "first" | "last" | "sum") => ({ duplicateEdges: policy })],
        ["a per-freeze override", (policy: "first" | "last" | "sum") => ({ freeze: { duplicateEdges: policy } })],
    ])(
        "warns when a duplicateEdges policy on %s merges edges of different relations (duplicate-edges-policy-merges-relations)",
        async (_where, given) => {
            const text = `${HEAD}[Term]\nid: X:1\nis_a: X:2\nrelationship: part_of X:2\n\n[Term]\nid: X:2\n\n[Typedef]\nid: part_of\n`;
            for (const policy of ["first", "last", "sum"] as const) {
                const { snapshot, report, freeze } = await importGraph(text, { format: "obo", ...given(policy) });
                expect(snapshot.edgeCount).toBe(1);
                expect(freeze.mergedEdges).toBe(1);
                expect(codes(report)).toEqual([EDGES_MERGED_CODE]);
                expect(report.issues[0].message).toMatch(/^1 parallel edge/);
            }
        },
    );

    it("rejects with ImportError, not a raw GraphFormatError, under duplicateEdges or selfLoops error (duplicate-edges-error-raw-throw)", async () => {
        const dup = importGraph(`${HEAD}[Term]\nid: X:1\nis_a: X:2\nis_a: X:2 {a="1"}\n\n[Term]\nid: X:2\n`, {
            format: "obo",
            duplicateEdges: "error",
        });
        const dupErr = (await dup.then(
            () => null,
            (err: unknown) => err,
        )) as ImportError;
        expect(dupErr).toBeInstanceOf(ImportError);
        expect(codes(dupErr.report)).toEqual([DUPLICATE_EDGE_CODE]);

        const loop = importGraph(`${HEAD}[Term]\nid: X:1\nis_a: X:1\n`, { format: "obo", selfLoops: "error" });
        const loopErr = (await loop.then(
            () => null,
            (err: unknown) => err,
        )) as ImportError;
        expect(loopErr).toBeInstanceOf(ImportError);
        expect(codes(loopErr.report)).toEqual([SELF_LOOP_CODE]);
    });
});

describe("robustness: the caller's sink", () => {
    // the expectation said name#obo; the rename rule of design 5.6 is <name>#<origin id>, and the
    // origin id of an OBO vocabulary column is the tag, so the renamed column is name#name
    it("renames a vocabulary column the sink already holds and drops a role it already gives (sink-column-collisions)", async () => {
        const b = new GraphBuilder({ directed: true });
        b.declareNodeColumn({ name: "name", dtype: "f64", nullable: true });
        b.declareEdgeColumn({ name: "kind", dtype: "string", nullable: true, role: "kind" });
        const text = `${HEAD}[Term]\nid: X:1\nname: one\nis_a: X:2\n\n[Term]\nid: X:2\n`;
        const { snapshot, report } = await load(text, undefined, b);
        expect(codes(report)).toEqual([OBO_ISSUE.COLUMN_RENAMED, OBO_ISSUE.ROLE_TAKEN]);
        expect(cell(snapshot, "name#name", "X:1")).toBe("one");
        expect(snapshot.edges.get("relation")?.meta.role ?? null).toBeNull();
        expect(snapshot.edges.get("relation")?.value(0)).toBe("is_a");
    });

    it("records each node and edge the sink refuses and carries on (sink-refuses-node-or-edge)", async () => {
        // a sink that refuses one id (a fixed id space, a typed id map) and every edge touching it
        const b = new GraphBuilder({ directed: true });
        const refused = new Set(["X:2", "X:9"]);
        const sink = new Proxy(b, {
            get(target, key, receiver): unknown {
                if (key === "addNode") {
                    return (id: string): number => {
                        if (refused.has(id)) {
                            throw new GraphFormatError("E_INVALID_ID", `id ${id} is refused`);
                        }
                        return target.addNode(id);
                    };
                }
                if (key === "addEdge") {
                    return (u: string, v: string, ...rest: unknown[]): number => {
                        if (refused.has(u) || refused.has(v)) {
                            throw new GraphFormatError("E_UNKNOWN_NODE", `edge ${u} -> ${v} names a refused node`);
                        }
                        return (target.addEdge as (...a: unknown[]) => number)(u, v, ...rest);
                    };
                }
                const value: unknown = Reflect.get(target, key, receiver);
                return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
            },
        });
        const text = `${HEAD}[Term]\nid: X:1\nis_a: X:2\nis_a: X:9\nis_a: X:3\n\n[Term]\nid: X:2\n\n[Term]\nid: X:3\n`;
        const report = await oboImporter.import(text, sink);
        const snapshot = b.freeze();
        expect(ids(snapshot)).toEqual(["X:1", "X:3"]);
        expect(edges(snapshot)).toEqual(["X:1 is_a X:3"]);
        expect(report.counts).toMatchObject({ nodes: 2, edges: 1, skippedNodes: 2, skippedEdges: 2 });
        expect(report.issues.map((i) => [i.code, i.element])).toEqual([
            [OBO_ISSUE.DANGLING_REFERENCE, "X:9"],
            ["E_INVALID_ID", "X:2"],
            ["E_INVALID_ID", "X:9"],
            ["E_UNKNOWN_NODE", "X:1"],
            ["E_UNKNOWN_NODE", "X:1"],
        ]);
        expect(report.issues.filter((i) => i.code === "E_UNKNOWN_NODE").map((i) => i.line)).toEqual([6, 7]);
    });
});

describe("robustness: encodings", () => {
    it("falls back to windows-1252 for an ASCII file cut inside a UTF-8 sequence (truncated-mid-multibyte)", async () => {
        const bytes = new Uint8Array([...enc.encode(`${HEAD}[Term]\nid: X:1\nname: caf`), 0xc3]);
        const { snapshot, report } = await load(bytes);
        expect(cell(snapshot, "name", "X:1")).toBe(`caf${String.fromCharCode(0xc3)}`);
        expect(codes(report)).toEqual([OBO_ISSUE.ENCODING_FALLBACK]);
        const after = new Uint8Array([
            ...enc.encode(`${HEAD}[Term]\nid: X:1\nname: caf${String.fromCharCode(0xe9)}\nname: x`),
            0xc3,
        ]);
        expect(codes((await fails(after)).report)).toEqual([OBO_ISSUE.INVALID_UTF8]);
    });

    it("rejects a Latin-1 byte after valid multibyte UTF-8 (invalid-utf8-mid-file)", async () => {
        const greek = String.fromCharCode(0x3b1, 0x3b2);
        const bytes = new Uint8Array([
            ...enc.encode(`${HEAD}[Term]\nid: X:1\nname: ${greek}\ncomment: caf`),
            0xe9,
            0x0a,
        ]);
        const err = await fails(bytes);
        expect(codes(err.report)).toEqual([OBO_ISSUE.INVALID_UTF8]);
    });

    it("honours the encoding option (encoding-option)", async () => {
        const latin = new Uint8Array([...enc.encode(`${HEAD}[Term]\nid: X:1\nname: caf`), 0xe9, 0x0a]);
        const w = await load(latin, { encoding: "windows-1252" });
        expect(w.report.issues).toEqual([]);
        expect(cell(w.snapshot, "name", "X:1")).toBe(`caf${String.fromCharCode(0xe9)}`);

        const odd = enc.encode(`${HEAD}[Term]\nid: X:1\n`);
        expect(odd.length % 2).toBe(1);
        expect(codes((await fails(odd, { encoding: "utf-16le" })).report)).toEqual([OBO_ISSUE.INVALID_ENCODING]);

        // the expectation said W_UNKNOWN_ENCODING; that code is for an encoding a FILE declares (an
        // XML prolog), while an encoding OPTION the platform cannot decode is the caller's error,
        // refused like every other option value outside its set (E_UNSUPPORTED, before any byte is read)
        await expect(load(enc.encode(`${HEAD}[Term]\nid: X:1\n`), { encoding: "klingon" })).rejects.toMatchObject({
            code: "E_UNSUPPORTED",
            details: { option: "encoding", found: "klingon" },
        });
    });

    it("reads one byte per chunk exactly as the whole input (streaming-split-escape-continuation-multibyte)", async () => {
        const e = String.fromCharCode(0xe9);
        const text = `\uFEFF${HEAD}[Term]\r\nid: X:1\r\nname: caf${e} \\\r\n more\r\ncomment: a \\" quote\r\n`;
        const bytes = enc.encode(text);
        const whole = await load(bytes);
        const split = await load(chunksOf(bytes, 1));
        expect(cell(whole.snapshot, "name", "X:1")).toBe(`caf${e}  more`);
        expect(cell(whole.snapshot, "comment", "X:1")).toBe('a " quote');
        expect(cell(split.snapshot, "name", "X:1")).toBe(cell(whole.snapshot, "name", "X:1"));
        expect(cell(split.snapshot, "comment", "X:1")).toBe(cell(whole.snapshot, "comment", "X:1"));
        expect(codes(split.report)).toEqual(codes(whole.report));
        expect(codes(whole.report)).toEqual([OBO_ISSUE.DEPRECATED_SYNTAX]);
    });
});

/** Linear work grows 4x from n to 4n and quadratic 16x; the limit sits between, far from both. */
const GROWTH_LIMIT = 9;

/**
 * How much slower a run at 4n is than one at n, each the best of three, so a ratio (not a
 * wall-clock limit) pins the complexity and the machine's load cancels out.
 * @param run - the work at a size
 * @param n - the smaller size
 * @returns time(4n) / time(n)
 */
async function growth(run: (n: number) => Promise<unknown>, n: number): Promise<number> {
    const best = async (k: number): Promise<number> => {
        let min = Infinity;
        for (let i = 0; i < 3; i++) {
            const started = performance.now();
            await run(k);
            min = Math.min(min, performance.now() - started);
        }
        return min;
    };
    await run(n);
    return (await best(4 * n)) / (await best(n));
}

describe("robustness: size and time", () => {
    it("joins a value continued over 200k lines in linear time (continuation-quadratic)", async () => {
        const doc = (n: number): string => `${HEAD}[Term]\nid: X:1\nname: ${"ab \\\n".repeat(n)}end\n`;
        const n = 200_000;
        const { snapshot, report } = await load(doc(n));
        expect(cell(snapshot, "name", "X:1")).toBe(`${"ab ".repeat(n)}end`);
        expect(codes(report)).toEqual([OBO_ISSUE.DEPRECATED_SYNTAX]);
        expect(await growth((k) => load(doc(k)), n / 4)).toBeLessThan(GROWTH_LIMIT);
    });

    it("splits 100k trailing qualifier blocks in linear time (many-qualifier-blocks-quadratic)", async () => {
        const doc = (n: number): string => `${HEAD}[Term]\nid: X:1\nname: n ${'{a="b"}'.repeat(n)}\n`;
        const n = 100_000;
        const { snapshot, report } = await load(doc(n));
        expect(report.issues).toEqual([]);
        expect(cell(snapshot, "name", "X:1")).toBe("n");
        const q = cell(snapshot, "obo.qualifiers", "X:1") as { name: { qualifiers: { a: string[] } }[] };
        expect(q.name[0].qualifiers.a).toHaveLength(n);
        expect(await growth((k) => load(doc(k)), n / 4)).toBeLessThan(GROWTH_LIMIT);
    });

    it("reads a million-backslash run once per line (long-backslash-run)", async () => {
        const even = await load(`${HEAD}[Term]\nid: X:1\nname: ${"\\".repeat(1_000_000)}\n`);
        expect(even.report.issues).toEqual([]);
        expect(cell(even.snapshot, "name", "X:1")).toBe("\\".repeat(500_000));
        const odd = await load(`${HEAD}[Term]\nid: X:1\nname: ${"\\".repeat(1_000_001)}\n more\n`);
        expect(codes(odd.report)).toEqual([OBO_ISSUE.DEPRECATED_SYNTAX]);
        expect(cell(odd.snapshot, "name", "X:1")).toBe(`${"\\".repeat(500_000)} more`);
    });

    it("tallies the duplicate warning of one id in 50k frames (same-id-many-frames)", async () => {
        const { snapshot, report } = await load(`${HEAD}${"[Term]\nid: X:1\n\n".repeat(50_000)}`);
        expect(ids(snapshot)).toEqual(["X:1"]);
        expect(codes(report)).toEqual([OBO_ISSUE.DUPLICATE_NODE]);
        expect(report.issues[0].message).toContain("49999 times");
    });

    it("keeps 50k distinct unknown tags but caps their warnings (many-unknown-tags)", async () => {
        const n = 50_000;
        const tags = Array.from({ length: n }, (_, i) => `t${i}: v\n`).join("");
        const { snapshot, report } = await load(`${HEAD}[Term]\nid: X:1\n${tags}`);
        expect(Object.keys(cell(snapshot, "obo.unrecognized", "X:1") as object)).toHaveLength(n);
        expect(report.issues.every((i) => i.code === OBO_ISSUE.UNKNOWN_ELEMENT)).toBe(true);
        expect(report.issues.length).toBeLessThanOrEqual(101);
        expect(report.issues[report.issues.length - 1].message).toContain(`${n - 100} more`);
    });
});
