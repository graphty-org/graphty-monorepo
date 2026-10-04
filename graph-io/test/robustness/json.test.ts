/**
 * Robustness of the JSON importer: truncated, malformed, mislabelled and self-contradicting
 * documents in every dialect it reads. Each test states the exact outcome -- the issue codes
 * recorded and the data kept, or the fatal ImportError and its code -- for a condition the format
 * tests and the audit suite do not already pin.
 */

import { GraphBuilder, type GraphBuilderOptions, type GraphSink, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it, vi } from "vitest";

import { JSON_ISSUE, jsonImporter, type JsonImportOptions } from "../../src/formats/json/index.js";
import { type CommonImportOptions, ImportError, type ImportIssue, type ImportReport } from "../../src/types.js";

type Options = JsonImportOptions & CommonImportOptions;

interface Loaded {
    s: GraphSnapshot;
    report: ImportReport;
}

async function load(
    input: string | Uint8Array,
    options?: Options,
    builder: Partial<GraphBuilderOptions> = {},
): Promise<Loaded> {
    const b = new GraphBuilder({ directed: true, weightDtype: "f64", ...builder });
    const report = await jsonImporter.import(input, b, options);
    return { s: b.freeze(), report };
}

async function fail(input: string | Uint8Array, options?: Options): Promise<ImportError> {
    const b = new GraphBuilder({ directed: true, weightDtype: "f64" });
    let caught: unknown;
    try {
        await jsonImporter.import(input, b, options);
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

function edges(s: GraphSnapshot): string[] {
    const list = s.edgeList();
    const out: string[] = [];
    for (let e = 0; e < s.edgeCount; e++) {
        out.push(`${String(s.ids.idOf(list.src[e]))}->${String(s.ids.idOf(list.dst[e]))}`);
    }
    return out;
}

function value(s: GraphSnapshot, table: "nodes" | "edges", name: string, row: number): unknown {
    const column = s[table].require(name);
    return column.dtype === "json" ? column.values[row] : column.value(row);
}

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);
const doc = (value: unknown): string => JSON.stringify(value);
const NODE_LINK = doc({ directed: false, nodes: [{ id: "a" }, { id: "b" }], links: [{ source: "a", target: "b" }] });

// ============================================================ truncation and malformed syntax

describe("JSON robustness: truncation and malformed syntax", () => {
    const syntaxCases: readonly (readonly [string, string])[] = [
        ["json-trunc-mid-string", '{"nodes":[{"id":"a'],
        ["json-trunc-after-comma", '{"nodes":[{"id":"a"},'],
        ["json-trunc-before-colon", '{"nodes"'],
        ["json-trunc-in-number", '{"nodes":[{"id":12'],
        ["json-trunc-in-literal", '{"nodes":[{"id":tr'],
        ["json-trunc-mid-escape", '{"nodes":[{"id":"a\\u00'],
        ["json-missing-closing-bracket", '{"nodes":[{"id":"a"}],"links":[]'],
        ["json-extra-closing", '{"nodes":[],"links":[]}}'],
        ["json-trailing-garbage", '{"nodes":[],"links":[]} xyz'],
        ["json-concatenated-documents", '{"nodes":[],"links":[]}{"nodes":[]}'],
        ["json-html-error-page", "<!DOCTYPE html><html>502 Bad Gateway</html>"],
        ["json-jsonp", 'callback({"nodes":[],"links":[]})'],
        ["json-js-wrapper", 'var graph = {"nodes":[],"links":[]};'],
        ["json-trailing-comma", '{"nodes":[{"id":"a"},],"links":[]}'],
        ["json-comments-line", '{"nodes":[{"id":"a"}], // nodes\n"links":[]}'],
        ["json-comments-block", '{"nodes":[{"id":"a"}], /* nodes */ "links":[]}'],
        ["json5-single-quotes", "{'nodes':[]}"],
        ["json5-unquoted-keys", "{nodes:[],links:[]}"],
        ["json-hex-number", '{"nodes":[{"id":0x10}]}'],
        ["json-leading-zero", '{"nodes":[{"id":012}]}'],
        ["json-plus-sign", '{"nodes":[{"id":+1}]}'],
        ["json-spaced-infinity", '{"nodes":[{"id":"a","w":- Infinity}]}'],
        ["json-no-break-space", `{"nodes":${String.fromCharCode(0xa0)}[]}`],
    ];

    it.each(syntaxCases)("%s is a fatal E_SYNTAX that carries a line", async (_name, text) => {
        const error = await fail(text);
        const syntax = issue(error.report, JSON_ISSUE.SYNTAX);
        expect(syntax.severity).toBe("error");
        expect(syntax.line).toBeGreaterThanOrEqual(1);
        expect(error.report.counts.nodes).toBe(0);
    });

    it("json-trunc-in-number-or-literal: a cut number is never read as the id 12", async () => {
        const error = await fail('{"nodes":[{"id":12');
        expect(codes(error.report)).toEqual([JSON_ISSUE.SYNTAX]);
    });

    it("E_SYNTAX names the line of the error in a multi-line document", async () => {
        const error = await fail('{\n  "nodes": [\n    {"id": "a"},\n  ]\n}');
        expect(issue(error.report, JSON_ISSUE.SYNTAX).line).toBe(4);
    });

    it("json-whitespace-or-bom-only: whitespace and a lone BOM are E_EMPTY_INPUT", async () => {
        for (const input of [" \n\t ", String.fromCharCode(0xfeff), new Uint8Array([0xef, 0xbb, 0xbf])]) {
            const error = await fail(input);
            expect(codes(error.report)).toEqual([JSON_ISSUE.EMPTY_INPUT]);
        }
    });

    it("json-ndjson-jsonlines: JSON Lines is E_SYNTAX naming JSON Lines, never the first line alone", async () => {
        const text = '{"type":"node","id":"1"}\n{"type":"node","id":"2"}\n{"type":"relationship","start":"1","end":"2"}\n';
        const error = await fail(text);
        expect(issue(error.report, JSON_ISSUE.SYNTAX).message).toMatch(/JSON Lines/);
    });

    it("json-html-error-page: an HTML page saved as .json sniffs 0", () => {
        expect(jsonImporter.sniff?.(bytes("<!DOCTYPE html><html>502 Bad Gateway</html>"))).toBe(0);
    });

    it("json-gzip-bytes: a gzip stream is a fatal decode error naming binary or compressed input", async () => {
        const gzip = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xab, 0x56, 0xca]);
        const error = await fail(gzip);
        const decode = issue(error.report, JSON_ISSUE.INVALID_UTF8);
        expect(decode.message).toMatch(/binary or compressed/);
        expect(decode.message).not.toMatch(/after valid non-ASCII/);
    });

    // A lone UTF-8 lead byte at the end is also a legal windows-1252 character (0xC3 is A-tilde), so
    // the decoder cannot call it a truncated sequence without breaking windows-1252 files that end in
    // one; the JSON grammar then rejects the cut document. Fatal either way, never a partial graph.
    it("json-trunc-mid-multibyte: a cut UTF-8 sequence at EOF is fatal (windows-1252 fallback, then E_SYNTAX)", async () => {
        const head = bytes('{"nodes":[{"id":"caf');
        const error = await fail(new Uint8Array([...head, 0xc3]));
        expect(codes(error.report)).toEqual([JSON_ISSUE.ENCODING_FALLBACK, JSON_ISSUE.SYNTAX]);
    });

    it("json-utf16-without-bom: UTF-16LE and UTF-16BE without a BOM are detected from the NUL pattern", async () => {
        const text = '{"nodes":[{"id":"a"},{"id":"b"}],"links":[{"source":"a","target":"b"}]}';
        const le = new Uint8Array(text.length * 2);
        const be = new Uint8Array(text.length * 2);
        for (let i = 0; i < text.length; i++) {
            le[2 * i] = text.charCodeAt(i);
            be[2 * i + 1] = text.charCodeAt(i);
        }
        for (const input of [le, be]) {
            const { s, report } = await load(input);
            expect(ids(s)).toEqual(["a", "b"]);
            expect(s.edgeCount).toBe(1);
            expect(codes(report)).toEqual([]);
        }
    });

    it("json-latin1-undeclared: a windows-1252 byte in an id is read with W_ENCODING_FALLBACK", async () => {
        const input = new Uint8Array([...bytes('{"nodes":[{"id":"caf'), 0xe9, ...bytes('"}],"links":[]}')]);
        const { s, report } = await load(input);
        expect(codes(report)).toEqual([JSON_ISSUE.ENCODING_FALLBACK]);
        expect(ids(s)).toEqual([`caf${String.fromCharCode(0xe9)}`]);
    });

    it("json-line-endings: CR-only and CRLF between tokens are whitespace", async () => {
        for (const eol of ["\r", "\r\n"]) {
            const text = `{${eol}"nodes":[{"id":"a"},${eol}{"id":"b"}],${eol}"links":[{"source":"a","target":"b"}]${eol}}`;
            const { s, report } = await load(text);
            expect(ids(s)).toEqual(["a", "b"]);
            expect(codes(report)).toEqual([]);
        }
    });

    it("json-sniff-utf16: sniff() reads a UTF-16 head with a BOM", () => {
        const text = '{"nodes":[],"links":[]}';
        const le = new Uint8Array(2 + text.length * 2);
        le[0] = 0xff;
        le[1] = 0xfe;
        for (let i = 0; i < text.length; i++) {
            le[2 + 2 * i] = text.charCodeAt(i);
        }
        expect(jsonImporter.sniff?.(le)).toBe(0.9);
    });
});

// ============================================================ the document shape

describe("JSON robustness: document shape", () => {
    it.each(['"hello"', "42", "true", "null"])("json-top-level-scalar %s is E_JSON_DIALECT", async (text) => {
        const error = await fail(text);
        expect(codes(error.report)).toEqual([JSON_ISSUE.DIALECT]);
    });

    it("json-empty-object: {} is E_JSON_DIALECT", async () => {
        expect(codes((await fail("{}")).report)).toEqual([JSON_ISSUE.DIALECT]);
    });

    it("json-empty-array: [] is an empty Cytoscape graph without an issue", async () => {
        const { s, report } = await load("[]");
        expect(s.nodeCount).toBe(0);
        expect(codes(report)).toEqual([]);
        expect((s.meta.extra.json as { dialect?: string }).dialect).toBe("cytoscape");
    });

    it.each([
        ["GeoJSON", doc({ type: "FeatureCollection", features: [] })],
        ["package.json", doc({ name: "x", version: "1.0.0", dependencies: {} })],
    ])("json-arbitrary-json: %s is E_JSON_DIALECT naming the expected keys", async (_name, text) => {
        const error = await fail(text);
        const dialect = issue(error.report, JSON_ISSUE.DIALECT);
        expect(dialect.message).toMatch(/nodes/);
        expect(dialect.message).toMatch(/elements/);
    });

    it("json-arbitrary-json: a plain array is E_JSON_DIALECT", async () => {
        expect(codes((await fail("[1,2,3]")).report)).toEqual([JSON_ISSUE.DIALECT]);
    });

    it("json-duplicate-top-level-key: a repeated nodes key is reported and the dropped section named", async () => {
        const { s, report } = await load('{"nodes":[{"id":"a"}],"nodes":[{"id":"b"}],"links":[]}');
        expect(ids(s)).toEqual(["b"]);
        const dup = issue(report, JSON_ISSUE.DUPLICATE_ATTRIBUTE);
        expect(dup.severity).toBe("warning");
        expect(dup.element).toBe("nodes");
        expect(dup.line).toBe(1);
    });

    it("json-duplicate-key-in-record: a repeated id key in one node is reported", async () => {
        const { s, report } = await load('{"nodes":[{"id":"a","id":"b"}],"links":[]}');
        expect(ids(s)).toEqual(["b"]);
        expect(issue(report, JSON_ISSUE.DUPLICATE_ATTRIBUTE).element).toBe("id");
    });

    it("json-jgf-graphs-empty-or-bad: an empty graphs array, a non-object graph and a missing index", async () => {
        expect(codes((await fail('{"graphs":[]}')).report)).toContain(JSON_ISSUE.SHAPE);
        expect(codes((await fail('{"graphs":[1]}', { dialect: "jgf" })).report)).toContain(JSON_ISSUE.SHAPE);
        const missing = await fail(doc({ graphs: [{ nodes: { a: {} } }] }), { graphIndex: 5 });
        expect(codes(missing.report)).toContain(JSON_ISSUE.GRAPH_NOT_FOUND);
    });

    it("json-jgf-graph-and-graphs-both: graphs is reported as not read", async () => {
        const { s, report } = await load(doc({ graph: { nodes: { a: {} } }, graphs: [{ nodes: { b: {} } }] }));
        expect(ids(s)).toEqual(["a"]);
        expect(issue(report, JSON_ISSUE.UNREAD_KEY).element).toBe("graphs");
    });

    it("json-unread-top-level-keys: vis options and groups are W_JSON_UNREAD_KEY", async () => {
        const text = doc({ nodes: [{ id: 1 }, { id: 2 }], edges: [{ from: 1, to: 2 }], options: { a: 1 }, groups: {} });
        const { s, report } = await load(text);
        expect(s.edgeCount).toBe(1);
        const unread = report.issues.filter((i) => i.code === JSON_ISSUE.UNREAD_KEY).map((i) => i.element);
        expect(unread).toEqual(["options", "groups"]);
    });

    it("json-unread-top-level-keys: an unknown graphology top-level key is W_JSON_UNREAD_KEY", async () => {
        const text = doc({ options: { type: "directed" }, nodes: [{ key: "a" }], edges: [], foo: 1 });
        const { report } = await load(text);
        expect(issue(report, JSON_ISSUE.UNREAD_KEY).element).toBe("foo");
    });

    it("json-unread-top-level-keys: JGF graph keys outside the schema and a non-string label are reported", async () => {
        const { s, report } = await load(doc({ graph: { label: 5, foo: 1, nodes: { a: {} } } }));
        expect(ids(s)).toEqual(["a"]);
        expect(issue(report, JSON_ISSUE.UNREAD_KEY).element).toBe("graph.foo");
        expect(issue(report, JSON_ISSUE.BAD_VALUE).element).toBe("graph.label");
    });

    it("json-importall-one-bad-graph: a non-object graph is reported in its own report", async () => {
        const sinks: GraphBuilder[] = [];
        const reports = await jsonImporter.importAll?.(
            doc({ graphs: [{ nodes: { a: {}, b: {} }, edges: [{ source: "a", target: "b" }] }, 1] }),
            (i) => {
                sinks[i] = new GraphBuilder({ directed: true });
                return sinks[i];
            },
        );
        expect(reports).toHaveLength(2);
        expect(reports?.[0].counts.nodes).toBe(2);
        expect(reports?.[0].issues).toEqual([]);
        expect(reports?.[1].issues.map((i) => i.code)).toEqual([JSON_ISSUE.SHAPE]);
        expect(sinks[1].freeze().nodeCount).toBe(0);
    });

    it("json-nodespath-through-array: a numeric path segment indexes an array", async () => {
        const text = doc({ graphs: [{ nodes: [{ id: "a" }, { id: "b" }], links: [{ source: "a", target: "b" }] }] });
        const { s, report } = await load(text, { nodesPath: "graphs.0.nodes" });
        expect(ids(s)).toEqual(["a", "b"]);
        expect(edges(s)).toEqual(["a->b"]);
        expect(codes(report)).toEqual([]);
    });

    it("json-dialect-misdetect-vis-from-to-links: from / to links stay node-link", async () => {
        const text = doc({
            directed: true,
            graph: { name: "g" },
            nodes: [{ id: "a" }, { id: "b" }],
            links: [{ from: "a", to: "b" }],
        });
        const { s, report } = await load(text);
        expect((s.meta.extra.json as { dialect?: string }).dialect).toBe("node-link");
        expect(edges(s)).toEqual(["a->b"]);
        expect(s.graph.require("name").value(0)).toBe("g");
        expect(codes(report)).toEqual([]);
    });

    it("json-dialect-misdetect-graphology-attributes-key: an attributes dict on a NetworkX link stays node-link", async () => {
        const text = doc({
            directed: false,
            multigraph: false,
            graph: {},
            nodes: [{ id: "a" }, { id: "b" }],
            links: [{ source: "a", target: "b", attributes: { x: 1 }, undirected: true }],
        });
        const { s } = await load(text);
        expect((s.meta.extra.json as { dialect?: string }).dialect).toBe("node-link");
        expect(edges(s)).toEqual(["a->b"]);
    });

    it("json-dialect-misdetect-graphology-attributes-key: a node key attribute without an id stays node-link", async () => {
        const text = doc({ directed: false, nodes: [{ key: "k1" }, { id: "b" }], links: [{ source: "b", target: "b" }] });
        const { s, report } = await load(text);
        expect((s.meta.extra.json as { dialect?: string }).dialect).toBe("node-link");
        expect(codes(report)).toEqual([JSON_ISSUE.MISSING_ID]);
        expect(ids(s)).toEqual(["b"]);
        expect(s.edgeCount).toBe(1);
    });
});

// ============================================================ ids and endpoints

describe("JSON robustness: ids and endpoints", () => {
    it("json-empty-string-id: the empty string is an id", async () => {
        const { s, report } = await load(doc({ nodes: [{ id: "" }, { id: "b" }], links: [{ source: "", target: "b" }] }));
        expect(ids(s)).toEqual(["", "b"]);
        expect(edges(s)).toEqual(["->b"]);
        expect(codes(report)).toEqual([]);
    });

    it.each([
        ["1 and 1.0", '{"nodes":[{"id":1},{"id":1.0}],"links":[]}'],
        ["1e2 and 100", '{"nodes":[{"id":1e2},{"id":100}],"links":[]}'],
        ["0 and -0", '{"nodes":[{"id":0},{"id":-0}],"links":[]}'],
    ])("json-numeric-id-aliases: %s merge with W_DUPLICATE_NODE", async (_name, text) => {
        const { s, report } = await load(text);
        expect(s.nodeCount).toBe(1);
        expect(report.counts.nodes).toBe(1);
        expect(codes(report)).toEqual([JSON_ISSUE.DUPLICATE_NODE]);
    });

    it.each([
        ["node-link", doc({ nodes: [{ id: "a" }], links: [{ source: "a", target: "z" }] })],
        ["vis", doc({ nodes: [{ id: "a" }], edges: [{ from: "a", to: "z" }] })],
        ["jgf", doc({ graph: { nodes: { a: {} }, edges: [{ source: "a", target: "z" }] } })],
        ["graphology", doc({ options: { type: "directed" }, nodes: [{ key: "a" }], edges: [{ source: "a", target: "z" }] })],
        ["cytoscape", doc({ elements: { nodes: [{ data: { id: "a" } }], edges: [{ data: { source: "a", target: "z" } }] } })],
    ])("json-dangling-endpoint (%s): the placeholder is counted and W_DANGLING_REFERENCE recorded", async (_n, text) => {
        const { s, report } = await load(text);
        expect(ids(s)).toEqual(["a", "z"]);
        expect(report.counts.nodes).toBe(2);
        const dangling = issue(report, JSON_ISSUE.DANGLING_REFERENCE);
        expect(dangling.severity).toBe("warning");
        expect(dangling.message).toMatch(/"z"/);
    });

    it("json-dangling-endpoint: E_UNKNOWN_NODE when the sink refuses, without a dangling warning", async () => {
        const text = doc({ nodes: [{ id: "a" }], links: [{ source: "a", target: "z" }] });
        const { s, report } = await load(text, undefined, { addMissingNodes: false });
        expect(s.edgeCount).toBe(0);
        expect(codes(report)).toEqual(["E_UNKNOWN_NODE"]);
    });

    it("json-id-type-mismatch-endpoints: string endpoints next to numeric ids name the near match", async () => {
        const { s, report } = await load('{"nodes":[{"id":1},{"id":2}],"links":[{"source":"1","target":"2"}]}');
        expect(ids(s)).toEqual([1, 2, "1", "2"]);
        expect(issue(report, JSON_ISSUE.DANGLING_REFERENCE).message).toMatch(/another JSON type/);
    });

    it("json-index-link-heuristic-flip: one fractional endpoint is E_BAD_INDEX, the others stay positions", async () => {
        const text = doc({
            nodes: [{ name: "a" }, { name: "b" }, { name: "c" }],
            links: [
                { source: 0, target: 1 },
                { source: 1, target: 2 },
                { source: 1.5, target: 0 },
            ],
        });
        const { s, report } = await load(text);
        expect(ids(s)).toEqual(["a", "b", "c"]);
        expect(edges(s)).toEqual(["a->b", "b->c"]);
        expect(codes(report)).toEqual([JSON_ISSUE.BAD_INDEX]);
        expect(report.counts.skippedEdges).toBe(1);
    });

    it.each([
        ["a string", '"a"'],
        ["a big integer", "12345678901234567890"],
    ])("json-index-link-heuristic-flip: %s endpoint never makes phantom nodes silently", async (_name, odd) => {
        const text = `{"nodes":[{"name":"a"},{"name":"b"}],"links":[{"source":0,"target":1},{"source":${odd},"target":1}]}`;
        const { report } = await load(text);
        expect(codes(report)).toContain(JSON_ISSUE.DANGLING_REFERENCE);
    });

    it("json-index-link-ambiguous-numeric-text-ids: positions over numeric-looking ids are reported", async () => {
        const text = doc({ nodes: [{ id: "1" }, { id: "2" }, { id: "3" }], links: [{ source: 1, target: 2 }] });
        const { s, report } = await load(text);
        expect(edges(s)).toEqual(["2->3"]);
        const warning = issue(report, JSON_ISSUE.INDEX_LINKS);
        expect(warning.severity).toBe("warning");
        expect(warning.message).toMatch(/indexLinks/);
    });

    it.each([{ ids: "string" as const }, {}])(
        "json-null-endpoint (%o): a null endpoint is E_MISSING_ENDPOINT",
        async (options) => {
            const text = doc({ nodes: [{ id: "a" }], links: [{ source: null, target: "a" }] });
            const { s, report } = await load(text, options);
            expect(ids(s)).toEqual(["a"]);
            expect(s.edgeCount).toBe(0);
            expect(codes(report)).toEqual([JSON_ISSUE.MISSING_ENDPOINT]);
            expect(report.counts.skippedEdges).toBe(1);
        },
    );

    it("json-null-endpoint: also in vis, JGF, graphology and Cytoscape", async () => {
        const texts = [
            doc({ nodes: [{ id: "a" }], edges: [{ from: "a", to: null }] }),
            doc({ graph: { nodes: { a: {} }, edges: [{ source: "a", target: null }] } }),
            doc({ options: { type: "directed" }, nodes: [{ key: "a" }], edges: [{ source: null, target: "a" }] }),
            doc({ elements: { nodes: [{ data: { id: "a" } }], edges: [{ data: { source: "a", target: null } }] } }),
        ];
        for (const text of texts) {
            const { report } = await load(text);
            expect(codes(report)).toEqual([JSON_ISSUE.MISSING_ENDPOINT]);
        }
    });

    it("json-edge-id-wrong-type-silent: non-scalar edge ids are E_COLUMN_TYPE per edge", async () => {
        const text = doc({
            nodes: [{ id: "a" }, { id: "b" }],
            edges: [
                { id: true, from: "a", to: "b" },
                { id: { x: 1 }, from: "b", to: "a" },
            ],
        });
        const { report } = await load(text);
        expect(codes(report)).toEqual(["E_COLUMN_TYPE", "E_COLUMN_TYPE"]);
    });

    it("json-sentinel-string-collision: a string equal to the internal sentinel is kept as written", async () => {
        const sentinel = `${String.fromCharCode(0)}graph-io:NaN`;
        const text = `{"nodes":[{"id":${doc(sentinel)},"label":${doc(sentinel)},"w":NaN}],"links":[]}`;
        const { s, report } = await load(text);
        expect(ids(s)).toEqual([sentinel]);
        expect(value(s, "nodes", "label", 0)).toBe(sentinel);
        expect(Number.isNaN(value(s, "nodes", "w", 0))).toBe(true);
        expect(codes(report)).toEqual([JSON_ISSUE.NONSTANDARD_NUMBER]);
    });

    it("json-big-integer-fraction-or-exponent: lossy literals with a fraction or an exponent are named", async () => {
        const { report } = await load('{"nodes":[{"id":9007199254740993.0},{"id":9.007199254740995e15}],"links":[]}');
        const big = issue(report, JSON_ISSUE.PRECISION);
        expect(big.message).toMatch(/9007199254740993\.0/);
        expect(big.message).toMatch(/9\.007199254740995e15/);
    });

    // A NodeId is a string or a number, and a number cannot hold 9007199254740993, so the exact digits
    // can only be kept as the string -- which equals the string id. The two warnings together name
    // the cause: the literal kept as text, then the merge.
    it("json-big-integer-vs-string-id: the merge is reported next to the big-integer warning", async () => {
        const { s, report } = await load('{"nodes":[{"id":9007199254740993},{"id":"9007199254740993"}],"links":[]}');
        expect(ids(s)).toEqual(["9007199254740993"]);
        expect(codes(report)).toEqual([JSON_ISSUE.BIG_INTEGER, JSON_ISSUE.DUPLICATE_NODE]);
    });
});

// ============================================================ node-link semantics

describe("JSON robustness: node-link semantics", () => {
    it("json-multigraph-false-with-parallels: a declared simple graph with parallel links is reported", async () => {
        const text = doc({
            directed: true,
            multigraph: false,
            nodes: [{ id: "a" }, { id: "b" }],
            links: [
                { source: "a", target: "b" },
                { source: "a", target: "b" },
            ],
        });
        const { s, report } = await load(text);
        expect(s.edgeCount).toBe(2);
        expect(codes(report)).toEqual([JSON_ISSUE.INCONSISTENT]);
    });

    it("json-multigraph-repeated-key: a repeated (u, v, key) is E_DUPLICATE_EDGE_ID and read once", async () => {
        const text = doc({
            directed: true,
            multigraph: true,
            nodes: [{ id: "a" }],
            links: [
                { source: "a", target: "a", key: 0 },
                { source: "a", target: "a", key: 0 },
                { source: "a", target: "a", key: 1 },
            ],
        });
        const { s, report } = await load(text);
        expect(s.edgeCount).toBe(2);
        expect(codes(report)).toEqual([JSON_ISSUE.DUPLICATE_EDGE_ID]);
        expect(report.counts.skippedEdges).toBe(1);
    });

    // design section 3.7: Infinity is a legal weight; the bare token is announced by the
    // nonstandard-number warning, and a finite literal that overflows by the precision warning
    it("json-weight-non-finite: the Infinity token is a legal weight with W_JSON_NONSTANDARD_NUMBER", async () => {
        const text = '{"nodes":[{"id":"a"},{"id":"b"}],"links":[{"source":"a","target":"b","weight":Infinity}]}';
        const { s, report } = await load(text);
        expect(s.edgeList().weights?.[0]).toBe(Infinity);
        expect(codes(report)).toEqual([JSON_ISSUE.NONSTANDARD_NUMBER]);
    });

    it("json-weight-non-finite: a literal that overflows to Infinity is W_PRECISION naming it", async () => {
        const text = '{"nodes":[{"id":"a"},{"id":"b"}],"links":[{"source":"a","target":"b","weight":1e400}]}';
        const { s, report } = await load(text);
        expect(s.edgeList().weights?.[0]).toBe(Infinity);
        expect(issue(report, JSON_ISSUE.PRECISION).message).toMatch(/1e400/);
    });

    it("json-attr-write-error-midrecord: node-link keeps every key after a refused one", async () => {
        const b = new GraphBuilder({ directed: true });
        b.declareNodeColumn({ name: "b", dtype: "bool", nullable: true });
        const report = await jsonImporter.import(doc({ nodes: [{ id: "n", a: 1, b: "x", c: 2 }], links: [] }), b);
        const s = b.freeze();
        expect(codes(report)).toEqual(["E_COLUMN_TYPE"]);
        expect(value(s, "nodes", "a", 0)).toBe(1);
        expect(value(s, "nodes", "c", 0)).toBe(2);
    });

    it("json-attr-write-error-midrecord: Cytoscape keeps the later data keys, the position and the classes", async () => {
        const b = new GraphBuilder({ directed: true });
        b.declareNodeColumn({ name: "b", dtype: "bool", nullable: true });
        const text = doc({
            elements: { nodes: [{ data: { id: "n", b: "x", c: 2 }, position: { x: 1, y: 2 }, classes: "k" }] },
        });
        const report = await jsonImporter.import(text, b);
        const s = b.freeze();
        expect(codes(report)).toEqual(["E_COLUMN_TYPE"]);
        expect(value(s, "nodes", "c", 0)).toBe(2);
        expect([...(value(s, "nodes", "position", 0) as ArrayLike<number>)]).toEqual([1, 2, 0]);
        expect(value(s, "nodes", "classes", 0)).toEqual(["k"]);
    });

    it("json-attr-write-error-midrecord: JGF and graphology keep the later metadata / attribute keys", async () => {
        for (const text of [
            doc({ graph: { nodes: { n: { metadata: { b: "x", c: 2 } } } } }),
            doc({ options: { type: "directed" }, nodes: [{ key: "n", attributes: { b: "x", c: 2 } }], edges: [] }),
        ]) {
            const b = new GraphBuilder({ directed: true });
            b.declareNodeColumn({ name: "b", dtype: "bool", nullable: true });
            const report = await jsonImporter.import(text, b);
            expect(codes(report)).toEqual(["E_COLUMN_TYPE"]);
            expect(value(b.freeze(), "nodes", "c", 0)).toBe(2);
        }
    });

    it("json-edge-attr-error-after-push: a refused edge attribute keeps the edge, counted once", async () => {
        const b = new GraphBuilder({ directed: true });
        b.declareEdgeColumn({ name: "w", dtype: "bool", nullable: true });
        const text = doc({ nodes: [{ id: "a" }], links: [{ source: "a", target: "a", w: "x", z: 1 }] });
        const report = await jsonImporter.import(text, b);
        const s = b.freeze();
        expect(codes(report)).toEqual(["E_COLUMN_TYPE"]);
        expect(report.counts.edges).toBe(1);
        expect(report.counts.skippedEdges).toBe(0);
        expect(value(s, "edges", "z", 0)).toBe(1);
    });

    it("json-attr-empty-or-suffix-key: an empty key and a key x#data next to x are separate columns", async () => {
        const { s, report } = await load(doc({ nodes: [{ id: "a", "": 1, x: 2, "x#data": 3 }], links: [] }));
        expect(value(s, "nodes", "", 0)).toBe(1);
        expect(value(s, "nodes", "x", 0)).toBe(2);
        expect(value(s, "nodes", "x#data", 0)).toBe(3);
        expect(codes(report)).toEqual([]);
    });

    it("json-null-attribute-dropped: a key that is null on every node is reported", async () => {
        const { s, report } = await load(
            doc({ nodes: [{ id: "a", color: null }, { id: "b", color: null, size: 1 }], links: [] }),
        );
        expect(s.nodes.has("color")).toBe(false);
        const dropped = issue(report, JSON_ISSUE.EMPTY_COLUMN_DROPPED);
        expect(dropped.severity).toBe("warning");
        expect(dropped.message).toMatch(/color/);
        expect(dropped.message).not.toMatch(/size/);
    });
});

// ============================================================ Cytoscape

describe("JSON robustness: Cytoscape", () => {
    it("json-cy-flat-nonobject-elements: each non-object element is E_BAD_ELEMENT and counted", async () => {
        for (const text of ['{"elements":[null,{"data":{"id":"a"}},"x",42]}', '[null,{"data":{"id":"a"}},"x",42]']) {
            const { s, report } = await load(text);
            expect(ids(s)).toEqual(["a"]);
            expect(codes(report)).toEqual([JSON_ISSUE.BAD_ELEMENT, JSON_ISSUE.BAD_ELEMENT, JSON_ISSUE.BAD_ELEMENT]);
            expect(report.counts.skippedNodes).toBe(3);
        }
    });

    // Cytoscape.js infers the group the same way: an element is an edge only when its data has both
    // source and target, so a node with a source attribute is legal and stays a node.
    it("json-cy-edge-missing-target-flat: data with a source but no target is a node, as Cytoscape.js infers", async () => {
        const { s, report } = await load(doc({ elements: [{ data: { id: "a" } }, { data: { id: "e", source: "a" } }] }));
        expect(ids(s)).toEqual(["a", "e"]);
        expect(value(s, "nodes", "source", 1)).toBe("a");
        expect(codes(report)).toEqual([]);
    });

    it("json-cy-bad-group: a singular group is E_BAD_VALUE and the element is classed by its endpoints", async () => {
        const text = doc({
            elements: [
                { group: "node", data: { id: "a" } },
                { group: "edge", data: { id: "e", source: "a", target: "a" } },
            ],
        });
        const { s, report } = await load(text);
        expect(ids(s)).toEqual(["a"]);
        expect(s.edgeCount).toBe(1);
        expect(codes(report)).toEqual([JSON_ISSUE.BAD_VALUE, JSON_ISSUE.BAD_VALUE]);
    });

    it("json-cy-position-z: a z coordinate is kept in the third component", async () => {
        const { s, report } = await load(
            doc({ elements: { nodes: [{ data: { id: "a" }, position: { x: 1, y: 2, z: 3 } }, { data: { id: "b" }, position: { x: 4, y: 5 } }] } }),
        );
        expect([...(value(s, "nodes", "position", 0) as ArrayLike<number>)]).toEqual([1, 2, 3]);
        expect([...(value(s, "nodes", "position", 1) as ArrayLike<number>)]).toEqual([4, 5, 0]);
        expect(codes(report)).toEqual([]);
    });

    it("json-cy-parent-cycle: a self parent and a two-node cycle are E_PARENT_CYCLE, that link dropped", async () => {
        const text = doc({
            elements: {
                nodes: [
                    { data: { id: "a", parent: "b" } },
                    { data: { id: "b", parent: "a" } },
                    { data: { id: "c", parent: "c" } },
                ],
            },
        });
        const { s, report } = await load(text);
        expect(codes(report)).toEqual([JSON_ISSUE.PARENT_CYCLE, JSON_ISSUE.PARENT_CYCLE]);
        expect(value(s, "nodes", "parent", 0)).toBe(1);
        expect(s.nodes.require("parent").isSet(1)).toBe(false);
        expect(s.nodes.require("parent").isSet(2)).toBe(false);
    });

    it("json-cy-group-conflicts-section: an edge-shaped record in elements.nodes is reported", async () => {
        const text = doc({ elements: { nodes: [{ data: { id: "a" } }, { data: { id: "e", source: "a", target: "a" } }] } });
        const { s, report } = await load(text);
        expect(ids(s)).toEqual(["a", "e"]);
        expect(codes(report)).toEqual([JSON_ISSUE.INCONSISTENT]);
    });

    it("json-cy-group-conflicts-section: group nodes with endpoints, and group edges without them", async () => {
        const text = doc({
            elements: [
                { group: "nodes", data: { id: "a", source: "a", target: "a" } },
                { group: "edges", data: { id: "e" } },
            ],
        });
        const { s, report } = await load(text);
        expect(ids(s)).toEqual(["a"]);
        expect(s.edgeCount).toBe(0);
        expect(codes(report)).toEqual([JSON_ISSUE.INCONSISTENT, JSON_ISSUE.MISSING_ENDPOINT]);
    });

    it("json-cy-position-nonfinite-or-f32-overflow: a NaN or out-of-f32 coordinate is E_BAD_VALUE", async () => {
        const text = '{"elements":{"nodes":[{"data":{"id":"a"},"position":{"x":1e39,"y":1}},{"data":{"id":"b"},"position":{"x":1,"y":NaN}}]}}';
        const { s, report } = await load(text);
        expect(codes(report)).toEqual([JSON_ISSUE.NONSTANDARD_NUMBER, JSON_ISSUE.BAD_VALUE, JSON_ISSUE.BAD_VALUE]);
        expect(s.nodes.require("position").isSet(0)).toBe(false);
        expect(s.nodes.require("position").isSet(1)).toBe(false);
    });
});

// ============================================================ graphology, JGF, adjacency, tree

describe("JSON robustness: graphology and JGF", () => {
    it("json-graphology-edge-attrs-nonobject: a non-object edge attributes value is E_BAD_VALUE", async () => {
        const text = doc({
            options: { type: "directed" },
            nodes: [{ key: "a" }],
            edges: [{ source: "a", target: "a", attributes: "oops" }],
        });
        const { s, report } = await load(text);
        expect(s.edgeCount).toBe(1);
        expect(codes(report)).toEqual([JSON_ISSUE.BAD_VALUE]);
    });

    it("json-graphology-declared-options-violated: self-loops, parallels and flags against options", async () => {
        const loops = doc({
            options: { type: "undirected", multi: false, allowSelfLoops: false },
            nodes: [{ key: "a" }, { key: "b" }],
            edges: [
                { source: "a", target: "a" },
                { source: "a", target: "b" },
                { source: "b", target: "a" },
            ],
        });
        const { s, report } = await load(loops);
        expect(s.edgeCount).toBe(3);
        const messages = report.issues.filter((i) => i.code === JSON_ISSUE.INCONSISTENT).map((i) => i.message);
        expect(messages).toHaveLength(2);
        expect(messages.join(" ")).toMatch(/self-loop/);
        expect(messages.join(" ")).toMatch(/parallel/);
        const flag = doc({
            options: { type: "directed" },
            nodes: [{ key: "a" }],
            edges: [{ source: "a", target: "a", undirected: true }],
        });
        expect(codes((await load(flag)).report)).toEqual([JSON_ISSUE.INCONSISTENT]);
    });

    it.each(["clique", "star"] as const)(
        "json-jgf-hyperedge-duplicate-members (%s): a repeated member is reported and deduplicated",
        async (policy) => {
            const text = doc({ graph: { nodes: { a: {}, b: {} }, hyperedges: [{ nodes: ["a", "a", "b"] }] } });
            const { s, report } = await load(text, { hyperedges: policy });
            expect(edges(s)).toEqual(["a->b"]);
            expect(codes(report)).toEqual([JSON_ISSUE.HYPEREDGE_SHAPE]);
        },
    );

    it("json-jgf-key-vs-inner-id: an inner id that disagrees with the key is reported", async () => {
        const { s, report } = await load(doc({ graph: { nodes: { a: { id: "b" } } } }));
        expect(ids(s)).toEqual(["a"]);
        expect(value(s, "nodes", "id#element", 0)).toBe("b");
        expect(codes(report)).toEqual([JSON_ISSUE.INCONSISTENT]);
    });

    it("json-jgf-key-vs-inner-id: an inner id equal to the key is no issue", async () => {
        expect(codes((await load(doc({ graph: { nodes: { a: { id: "a" } } } }))).report)).toEqual([]);
    });

    it("json-jgf-hyperedge-clique-explosion: an expansion beyond the cap is E_TOO_LARGE and skipped", async () => {
        const members = Array.from({ length: 2000 }, (_, i) => `n${i}`);
        const nodes = Object.fromEntries(members.map((m) => [m, {}]));
        const text = doc({ graph: { nodes, hyperedges: [{ nodes: members }, { nodes: ["n0", "n1"] }] } });
        const { s, report } = await load(text, { hyperedges: "clique" });
        expect(s.edgeCount).toBe(1);
        expect(codes(report)).toEqual([JSON_ISSUE.TOO_LARGE]);
        expect(report.counts.skippedEdges).toBe(1);
    });

    it("json-jgf-hyperedge-partial-expansion: each refused expansion is reported and counted", async () => {
        const text = doc({ graph: { nodes: { a: {}, b: {} }, hyperedges: [{ nodes: ["a", "b", "c"] }] } });
        const { s, report } = await load(text, { hyperedges: "clique" }, { addMissingNodes: false });
        expect(edges(s)).toEqual(["a->b"]);
        expect(report.counts.edges).toBe(1);
        expect(report.counts.skippedEdges).toBe(2);
        expect(codes(report)).toEqual(["E_UNKNOWN_NODE", "E_UNKNOWN_NODE"]);
    });
});

describe("JSON robustness: NetworkX adjacency and tree data", () => {
    it("json-adjacency-mirror-mismatch: two listings that disagree, and a listing without a mirror", async () => {
        const text = doc({
            directed: false,
            nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
            adjacency: [[{ id: "b", weight: 1 }, { id: "c" }], [{ id: "a", weight: 5 }], []],
        });
        const { s, report } = await load(text);
        expect(edges(s)).toEqual(["a->b", "a->c"]);
        const messages = report.issues.filter((i) => i.code === JSON_ISSUE.INCONSISTENT).map((i) => i.message);
        expect(messages).toHaveLength(2);
        expect(messages.join(" ")).toMatch(/disagree/);
        expect(messages.join(" ")).toMatch(/mirror/);
    });

    it("json-adjacency-fewer-lists-than-nodes: nodes without an adjacency list are reported", async () => {
        const text = doc({ directed: true, nodes: [{ id: "a" }, { id: "b" }, { id: "c" }], adjacency: [[{ id: "b" }]] });
        const { s, report } = await load(text);
        expect(s.nodeCount).toBe(3);
        expect(edges(s)).toEqual(["a->b"]);
        const missing = issue(report, JSON_ISSUE.MISSING_SECTION);
        expect(missing.message).toMatch(/2 node/);
    });

    // the duplicate warning names the node; the self-loop it makes is in the graph, as NetworkX's
    // tree_graph would build it from the same document
    it("json-tree-repeated-id: a child repeating an ancestor is W_DUPLICATE_NODE and its edge is kept", async () => {
        const { s, report } = await load(doc({ id: "r", children: [{ id: "r" }] }));
        expect(ids(s)).toEqual(["r"]);
        expect(edges(s)).toEqual(["r->r"]);
        expect(codes(report)).toEqual([JSON_ISSUE.DUPLICATE_NODE]);
    });

    it("json-tree-deep-chain: a 1M-node path written as nested children imports", async () => {
        const depth = 1_000_000;
        const text = '{"id":0,"children":['.repeat(1) + Array.from({ length: depth - 1 }, (_, i) => `{"id":${i + 1},"children":[`).join("") + "]}".repeat(depth);
        const { s, report } = await load(text);
        expect(s.nodeCount).toBe(depth);
        expect(s.edgeCount).toBe(depth - 1);
        expect(codes(report)).toEqual([]);
    }, 120_000);
});

// ============================================================ OBO Graphs

describe("JSON robustness: OBO Graphs", () => {
    const graph = (body: Record<string, unknown>): string => doc({ graphs: [body] });

    it("obographs-edge-unknown-keys-and-bad-meta: extra keys, a non-object meta and a numeric pred", async () => {
        const text = graph({
            nodes: [{ id: "GO:1", lbl: "x" }, { id: "GO:2", lbl: "y" }],
            edges: [
                { sub: "GO:1", pred: "is_a", obj: "GO:2", weight: 3, id: "e1", meta: "bad" },
                { sub: "GO:2", pred: 5, obj: "GO:1" },
            ],
        });
        const { s, report } = await load(text);
        expect(s.edgeCount).toBe(2);
        const unread = report.issues.filter((i) => i.code === JSON_ISSUE.UNREAD_KEY).map((i) => i.element);
        expect(unread).toEqual(["weight", "id"]);
        const bad = report.issues.filter((i) => i.code === JSON_ISSUE.BAD_VALUE).map((i) => i.message);
        expect(bad).toHaveLength(2);
        expect(bad[0]).toMatch(/meta must be an object/);
        expect(bad[1]).toMatch(/pred must be a string/);
    });

    it("obographs-meta-items-filtered: every meta item of the wrong type is E_BAD_VALUE", async () => {
        const text = graph({
            nodes: [
                {
                    id: "GO:1",
                    lbl: "x",
                    meta: {
                        synonyms: ["s"],
                        xrefs: [1, { val: "X:1" }],
                        deprecated: "true",
                        definition: { val: 5 },
                        basicPropertyValues: [{ pred: "p", val: 5 }],
                    },
                },
            ],
        });
        const { s, report } = await load(text);
        expect(value(s, "nodes", "xref", 0)).toEqual(["X:1"]);
        expect(report.issues.filter((i) => i.code === JSON_ISSUE.BAD_VALUE)).toHaveLength(5);
    });

    it("obographs-duplicate-property-node: a repeated PROPERTY node is W_DUPLICATE_NODE", async () => {
        const text = graph({
            nodes: [
                { id: "GO:1", lbl: "x" },
                { id: "RO:1", type: "PROPERTY", lbl: "p" },
                { id: "RO:1", type: "PROPERTY", lbl: "q" },
            ],
        });
        const { s, report } = await load(text);
        expect(codes(report)).toEqual([JSON_ISSUE.DUPLICATE_NODE]);
        const properties = (s.meta.extra.obographs as { properties: Record<string, { lbl: string }> }).properties;
        expect(properties["RO:1"].lbl).toBe("q");
    });

    it("obographs-curie-collision: two IRIs compacted to one CURIE are W_ID_MERGED naming oboIds", async () => {
        const text = graph({
            nodes: [
                { id: "http://purl.obolibrary.org/obo/GO_1", lbl: "x" },
                { id: "GO:1", lbl: "y" },
            ],
        });
        const { s, report } = await load(text);
        expect(ids(s)).toEqual(["GO:1"]);
        expect(issue(report, JSON_ISSUE.ID_MERGED).message).toMatch(/oboIds/);
    });
});

// ============================================================ resources

describe("JSON robustness: resources", () => {
    it("json-rewrite-exceeds-max-string: a rewrite longer than one string is E_TOO_LARGE, not a RangeError", async () => {
        vi.resetModules();
        vi.doMock("../../src/common/json-elements.js", async (original) => ({
            ...(await original<typeof import("../../src/common/json-elements.js")>()),
            rewriteNumbers: (): never => {
                throw new RangeError("Invalid string length");
            },
        }));
        try {
            const { jsonImporter: mocked } = await import("../../src/formats/json/importer.js");
            const { ImportError: MockedImportError } = await import("../../src/types.js");
            const sink: GraphSink = new GraphBuilder({ directed: true });
            const caught = await mocked.import('{"nodes":[{"id":"a","w":NaN}],"links":[]}', sink).catch((e: unknown) => e);
            expect(caught).toBeInstanceOf(MockedImportError);
            expect((caught as ImportError).report.issues.map((i) => i.code)).toEqual([JSON_ISSUE.TOO_LARGE]);
        } finally {
            vi.doUnmock("../../src/common/json-elements.js");
            vi.resetModules();
        }
    });

    it("the node-link baseline still imports without an issue", async () => {
        const { s, report } = await load(NODE_LINK);
        expect(edges(s)).toEqual(["a->b"]);
        expect(codes(report)).toEqual([]);
    });
});
