/**
 * Robustness of the Neo4j importer: neo4j-admin CSV that is truncated, mislabelled, exported by
 * another tool, or holds values outside its declared types. Each test states the exact outcome --
 * the issue codes recorded and the data kept, or the fatal ImportError and its code -- for a
 * condition the format tests and the audit suite do not already pin.
 */

import { GraphBuilder, GraphFormatError, type GraphBuilderOptions, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { NEO4J_ISSUE, neo4jImporter, type Neo4jImportOptions } from "../../src/formats/neo4j/index.js";
import { type CommonImportOptions, ImportError, type ImportInput, type ImportIssue, type ImportReport } from "../../src/types.js";

type Options = Neo4jImportOptions & CommonImportOptions;

interface Loaded {
    s: GraphSnapshot;
    report: ImportReport;
}

async function load(input: ImportInput, options?: Options, builder: Partial<GraphBuilderOptions> = {}): Promise<Loaded> {
    const b = new GraphBuilder({ directed: true, weightDtype: "f64", ...builder });
    const report = await neo4jImporter.import(input, b, options);
    return { s: b.freeze(), report };
}

async function fail(input: ImportInput, options?: Options): Promise<ImportError> {
    const b = new GraphBuilder({ directed: true, weightDtype: "f64" });
    let caught: unknown;
    try {
        await neo4jImporter.import(input, b, options);
    } catch (err) {
        caught = err;
    }
    expect(caught).toBeInstanceOf(ImportError);
    return caught as ImportError;
}

function codes(report: ImportReport): string[] {
    return report.issues.map((i) => i.code);
}

function issue(report: ImportReport, code: string): ImportIssue {
    const found = report.issues.find((i) => i.code === code);
    expect(found, `${code} in ${JSON.stringify(codes(report))}`).toBeDefined();
    return found as ImportIssue;
}

function ids(s: GraphSnapshot): (string | number)[] {
    return s.ids.toArray();
}

function value(s: GraphSnapshot, table: "nodes" | "edges", name: string, row: number): unknown {
    const column = s[table].require(name);
    return column.dtype === "json" ? column.values[row] : column.value(row);
}

const BOM = String.fromCharCode(0xfeff);

// ============================================================ wrong format and headers

describe("Neo4j robustness: headers and wrong formats", () => {
    it("neo4j-whitespace-only: a whitespace-only input has no header row", async () => {
        const error = await fail(" \n\n");
        const header = issue(error.report, NEO4J_ISSUE.HEADER);
        expect(header.message).toMatch(/no header row/);
        expect(codes(error.report)).toEqual([NEO4J_ISSUE.HEADER]);
    });

    it("neo4j-data-cell-looks-like-header: a quoted data cell never starts a new section", async () => {
        const { s, report } = await load(':ID,note,:LABEL\n1,"ref:id",P\n2,x,P\n');
        expect(ids(s)).toEqual([1, 2]);
        expect(value(s, "nodes", "note", 0)).toBe("ref:id");
        expect(codes(report)).toEqual([]);
    });

    // DEFERRED: an unquoted data cell shaped like a header cell ("Note: ID") still starts a section.
    // Without a quote, a blank line or a file boundary nothing tells it from a real mid-file header
    // in graphty's one-file convention; it.fails keeps the defect visible until a rule is chosen.
    it.fails("neo4j-data-cell-looks-like-header: an unquoted header-shaped data cell is read as data", async () => {
        const { s, report } = await load(":ID,note,:LABEL\n1,Note: ID,P\n2,x,P\n");
        expect(ids(s)).toEqual([1, 2]);
        expect(codes(report)).toEqual([]);
    });

    it("neo4j-apoc-export-csv: an apoc.export.csv file is E_NEO4J_HEADER naming the APOC layout", async () => {
        const error = await fail('"_id","_labels","name","_start","_end","_type"\n"0",":Person","Ann",,,\n');
        expect(issue(error.report, NEO4J_ISSUE.HEADER).message).toMatch(/apoc\.export\.csv/);
    });

    it("neo4j-browser-export-csv: a Browser export is E_NEO4J_HEADER naming the columns it needs", async () => {
        const error = await fail('n,r,m\n"{""name"":""a""}","{}","{""name"":""b""}"\n');
        expect(issue(error.report, NEO4J_ISSUE.HEADER).message).toMatch(/:ID column/);
    });

    it("neo4j-split-header-file: a header-only input applies to the headerless input after it", async () => {
        const { s, report } = await load(":ID,name:string\n", { nodes: ["1,a\n2,b\n", "3,c\n"] });
        expect(ids(s)).toEqual([1, 2, 3]);
        expect(value(s, "nodes", "name", 2)).toBe("c");
        expect(codes(report)).toEqual([]);
    });

    it("neo4j-split-header-file: a relationship header file applies to its data file", async () => {
        const { s, report } = await load(":ID\n1\n2\n", {
            relationships: [":START_ID,:END_ID,:TYPE\n", "1,2,R\n"],
        });
        expect(s.edgeCount).toBe(1);
        expect(codes(report)).toEqual([]);
    });

    it("neo4j-semicolon-delimiter: a semicolon header without the option names the delimiter option", async () => {
        const error = await fail(":ID;name\n1;a\n");
        expect(issue(error.report, NEO4J_ISSUE.HEADER).message).toMatch(/delimiter option/);
    });

    it("neo4j-semicolon-delimiter: with the delimiter option the file imports", async () => {
        const { s } = await load(":ID;name\n1;a\n", { delimiter: ";", arrayDelimiter: "|" });
        expect(value(s, "nodes", "name", 0)).toBe("a");
    });

    it("neo4j-comment-line: a // comment line is E_NEO4J_HEADER", async () => {
        const error = await fail("// exported nodes\n:ID,name\n1,a\n");
        expect(codes(error.report)).toEqual([NEO4J_ISSUE.HEADER]);
    });

    // the record reader meets the JSON quoting before any header is parsed: fatal all the same
    it("neo4j-json-in-csv: a JSON document sniffs 0 and is a fatal CSV quote error", async () => {
        const text = '{"nodes":[{"id":"a"}],"links":[]}';
        expect(neo4jImporter.sniff?.(new TextEncoder().encode(text))).toBe(0);
        expect(codes((await fail(text)).report)).toEqual([NEO4J_ISSUE.CSV_QUOTE]);
    });

    it("neo4j-midfile-bom: a BOM before a later section's header is stripped", async () => {
        const { s, report } = await load(`:ID,name\n1,a\n${BOM}:ID,name\n2,b\n`);
        expect(ids(s)).toEqual([1, 2]);
        expect([...s.nodes].map((c) => c.meta.name)).toEqual(["name"]);
        expect(codes(report)).toEqual([]);
    });

    it("neo4j-empty-main-input-with-option-files: an empty main input is fine when files come through options", async () => {
        const { s, report } = await load("", { nodes: [":ID\n1\n2\n"], relationships: [":START_ID,:END_ID\n1,2\n"] });
        expect(ids(s)).toEqual([1, 2]);
        expect(s.edgeCount).toBe(1);
        expect(codes(report)).toEqual([]);
    });

    it("neo4j-section-kind-vs-option: a file whose header contradicts its option is reported", async () => {
        const { s, report } = await load(":ID\n1\n2\n", {
            nodes: [":START_ID,:END_ID\n1,2\n"],
            relationships: [":ID\n3\n"],
        });
        expect(ids(s)).toEqual([1, 2, 3]);
        expect(s.edgeCount).toBe(1);
        expect(codes(report)).toEqual([NEO4J_ISSUE.SECTION_KIND, NEO4J_ISSUE.SECTION_KIND]);
    });

    it("neo4j-array-delimiter-comma-default-delimiter: a comma array delimiter needs an explicit delimiter", async () => {
        const b = new GraphBuilder({ directed: true });
        const caught: unknown = await neo4jImporter
            .import(":ID,:LABEL\n1,A\n", b, { arrayDelimiter: "," })
            .catch((err: unknown) => err);
        expect(caught).toBeInstanceOf(GraphFormatError);
        expect((caught as GraphFormatError).code).toBe("E_UNSUPPORTED");
        expect((caught as GraphFormatError).message).toMatch(/delimiter/);
        const tsv = await load(":ID\t:LABEL\n1\tA,B\n", { arrayDelimiter: ",", delimiter: "\t" });
        expect(value(tsv.s, "nodes", "labels", 0)).toEqual(["A", "B"]);
    });
});

// ============================================================ rows

describe("Neo4j robustness: rows and counts", () => {
    it("neo4j-trunc-mid-row: a row cut after a delimiter reads the last property as unset", async () => {
        const { s, report } = await load(":ID,name\n1,a\n2,");
        expect(ids(s)).toEqual([1, 2]);
        expect(s.nodes.require("name").value(1)).toBeUndefined();
        expect(codes(report)).toEqual([]);
    });

    it("neo4j-bare-quote-in-field: a quote inside an unquoted field is kept literally", async () => {
        const { s, report } = await load(':ID,name\n1,a"b\n');
        expect(value(s, "nodes", "name", 0)).toBe('a"b');
        expect(codes(report)).toEqual([]);
    });

    it("neo4j-duplicate-node-counts: a repeated id counts one node", async () => {
        const { s, report } = await load(":ID,n\n1,a\n1,b\n");
        expect(s.nodeCount).toBe(1);
        expect(report.counts.nodes).toBe(1);
        expect(codes(report)).toEqual([NEO4J_ISSUE.DUPLICATE_NODE]);
        expect(value(s, "nodes", "n", 0)).toBe("b");
    });

    it("neo4j-dangling-endpoint-counts: a created endpoint is counted and reported", async () => {
        const { s, report } = await load(":ID\n1\n:START_ID,:END_ID,:TYPE\n1,9,R\n");
        expect(ids(s)).toEqual([1, 9]);
        expect(report.counts.nodes).toBe(2);
        const dangling = issue(report, NEO4J_ISSUE.DANGLING_REFERENCE);
        expect(dangling.severity).toBe("warning");
        expect(dangling.message).toMatch(/9/);
    });

    it("neo4j-rel-before-nodes: endpoints a later node row declares are neither double counted nor dangling", async () => {
        const { s, report } = await load(":START_ID,:END_ID\n1,2\n:ID,name\n1,a\n2,b\n");
        expect(s.nodeCount).toBe(2);
        expect(report.counts.nodes).toBe(2);
        expect(codes(report)).toEqual([]);
    });

    it("neo4j-endpoint-undeclared-space: an endpoint of an id space with no node section is reported", async () => {
        const { s, report } = await load(":ID(P)\n1\n:START_ID(P),:END_ID(Z)\n1,1\n");
        expect(ids(s)).toEqual(["P:1", "Z:1"]);
        expect(issue(report, NEO4J_ISSUE.DANGLING_REFERENCE).message).toMatch(/Z:1/);
    });

    it("neo4j-empty-type-cell: an empty :TYPE is W_NEO4J_MISSING_TYPE and the relationship kept", async () => {
        const { s, report } = await load(":ID\n1\n2\n:START_ID,:END_ID,:TYPE\n1,2,\n2,1,R\n");
        expect(s.edgeCount).toBe(2);
        const missing = issue(report, NEO4J_ISSUE.MISSING_TYPE);
        expect(missing.severity).toBe("warning");
        expect(missing.line).toBe(5);
        expect(codes(report)).toEqual([NEO4J_ISSUE.MISSING_TYPE]);
    });

    // neo4j-admin keeps " 1 " as written with --trim-strings false (its default), so two nodes
    it("neo4j-id-whitespace: an id with surrounding spaces is its own node, as neo4j-admin reads it", async () => {
        const { s, report } = await load(":ID\n 1 \n1\n");
        expect(ids(s)).toEqual([" 1 ", 1]);
        expect(codes(report)).toEqual([]);
    });

    // the node or relationship is already in the sink when a value write fails, so it is kept and
    // counted; the refused value alone is recorded on the row's line and the other values are written
    it("neo4j-unguarded-sink-writes: a refused value write is recorded on its line and the import goes on", async () => {
        const builder = new GraphBuilder({ directed: true });
        const refuse = new GraphFormatError("E_COLUMN_TYPE", "refused by the sink", {});
        const sink = new Proxy(builder, {
            get(target, key, receiver): unknown {
                const member: unknown = Reflect.get(target, key, receiver);
                if (typeof member !== "function") {
                    return member;
                }
                return (...args: unknown[]): unknown => {
                    if ((key === "setNodeValue" || key === "setEdgeValue") && args[2] === "bad") {
                        throw refuse;
                    }
                    return (member as (...a: unknown[]) => unknown).apply(target, args);
                };
            },
        });
        const text = ":ID,name,k\n1,a,x\n2,bad,y\n3,c,z\n:START_ID,:END_ID,name\n1,3,bad\n3,1,ok\n";
        const report = await neo4jImporter.import(text, sink);
        expect(codes(report)).toEqual(["E_COLUMN_TYPE", "E_COLUMN_TYPE"]);
        expect(report.issues.map((i) => i.line)).toEqual([3, 6]);
        expect(report.counts).toMatchObject({ nodes: 3, edges: 2, skippedNodes: 0, skippedEdges: 0 });
        const s = builder.freeze();
        expect(s.nodes.require("name").isSet(1)).toBe(false);
        expect(s.nodes.require("k").value(1)).toBe("y");
    });
});

// ============================================================ typed values

describe("Neo4j robustness: typed values", () => {
    it("neo4j-byte-short-range: values outside byte and short are E_COLUMN_TYPE and the row skipped", async () => {
        const { s, report } = await load(":ID,c:byte,s:short\n1,127,32767\n2,300,1\n3,1,70000\n4,-128,-32768\n");
        expect(ids(s)).toEqual([1, 4]);
        expect(codes(report)).toEqual(["E_COLUMN_TYPE", "E_COLUMN_TYPE"]);
        expect(report.counts.skippedNodes).toBe(2);
    });

    it("neo4j-char-multichar: a char value of more than one character is E_COLUMN_TYPE", async () => {
        const { s, report } = await load(":ID,c:char\n1,a\n2,abc\n");
        expect(ids(s)).toEqual([1]);
        expect(codes(report)).toEqual(["E_COLUMN_TYPE"]);
    });

    it("neo4j-double-overflow: a double or float literal beyond its range is W_PRECISION and kept", async () => {
        const { s, report } = await load(":ID,d:double,f:float\n1,1e400,1\n2,1,1e39\n3,2.5,2.5\n");
        expect(ids(s)).toEqual([1, 2, 3]);
        expect(value(s, "nodes", "d", 0)).toBe(Infinity);
        const precision = report.issues.filter((i) => i.code === NEO4J_ISSUE.PRECISION);
        expect(precision.map((i) => i.line)).toEqual([2, 3]);
        expect(codes(report)).toEqual([NEO4J_ISSUE.PRECISION, NEO4J_ISSUE.PRECISION]);
    });

    it("neo4j-datetime-named-zone: a Cypher zone name is parsed and the source text kept", async () => {
        const { s, report } = await load(
            ":ID,d:datetime\n1,2020-01-01T00:00:00[Europe/Berlin]\n2,2020-07-01T12:00:00+02:00[Europe/Berlin]\n3,2020-01-01T00:00:00[UTC]\n",
        );
        expect(codes(report)).toEqual([]);
        expect(value(s, "nodes", "d", 0)).toBe(Date.UTC(2019, 11, 31, 23));
        expect(value(s, "nodes", "d", 1)).toBe(Date.UTC(2020, 6, 1, 10));
        expect(value(s, "nodes", "d", 2)).toBe(Date.UTC(2020, 0, 1));
        expect(value(s, "nodes", "d.text", 0)).toBe("2020-01-01T00:00:00[Europe/Berlin]");
    });

    it("neo4j-datetime-named-zone: an unknown zone name is E_COLUMN_TYPE", async () => {
        const { s, report } = await load(":ID,d:datetime\n1,2020-01-01T00:00:00[Mars/Olympus]\n2,\n");
        expect(ids(s)).toEqual([2]);
        expect(codes(report)).toEqual(["E_COLUMN_TYPE"]);
    });

    it("neo4j-duration-invalid: a duration outside ISO 8601 / Cypher is E_COLUMN_TYPE", async () => {
        const { s, report } = await load(
            ":ID,d:duration\n1,P14DT16H12M\n2,forever\n3,PT0.75M\n4,P2012-02-02T14:37:21.545\n5,P\n",
        );
        expect(ids(s)).toEqual([1, 3, 4]);
        expect(codes(report)).toEqual(["E_COLUMN_TYPE", "E_COLUMN_TYPE"]);
        expect(value(s, "nodes", "d", 0)).toBe("P14DT16H12M");
    });

    it("neo4j-array-bad-item: a list item of the wrong type is E_COLUMN_TYPE and the row skipped", async () => {
        const { s, report } = await load(":ID,n:int[]\n1,1;2\n2,1;x\n");
        expect(ids(s)).toEqual([1]);
        expect(value(s, "nodes", "n", 0)).toEqual([1, 2]);
        expect(codes(report)).toEqual(["E_COLUMN_TYPE"]);
        expect(report.issues[0].line).toBe(3);
    });
});
