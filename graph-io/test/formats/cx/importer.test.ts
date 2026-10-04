import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GraphBuilder, type GraphBuilderOptions, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { CX_ISSUE, cxImporter, type CxImportOptions } from "../../../src/formats/cx/index.js";
import { importAllGraphs, importGraph, listGraphs } from "../../../src/registry.js";
import { type CommonImportOptions, ImportError, type ImportInput, type ImportReport } from "../../../src/types.js";
import { inputShapes } from "../../helpers/corpus.js";

type Options = CxImportOptions & CommonImportOptions;

interface Imported {
    snapshot: GraphSnapshot;
    report: ImportReport;
}

const VERIFY = { numberVerification: [{ longNumber: 281474976710655 }] };

/** A CX document from its fragments, with numberVerification first and a status last. */
function cx(fragments: readonly Record<string, unknown>[], status: unknown = [{ error: "", success: true }]): string {
    const members: unknown[] = [VERIFY, ...fragments];
    if (status !== null) {
        members.push({ status });
    }
    return JSON.stringify(members);
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

const value = (s: GraphSnapshot, column: string, id: number | string): unknown => {
    const c = s.nodes.get(column);
    const i = s.ids.indexOf(id);
    return c === null || i < 0 || !c.isSet(i) ? undefined : c.value(i);
};

const edgeValue = (s: GraphSnapshot, column: string, e: number): unknown => {
    const c = s.edges.get(column);
    return c === null || !c.isSet(e) ? undefined : c.value(e);
};

const point = (s: GraphSnapshot, column: string, id: number): number[] =>
    Array.from(value(s, column, id) as ArrayLike<number>);

const SIMPLE = cx([
    {
        metaData: [
            { name: "nodes", version: "1.0", elementCount: 3 },
            { name: "edges", version: "1.0", elementCount: 2 },
        ],
    },
    { nodes: [{ "@id": 1, n: "AKT1", r: "HGNC:391" }, { "@id": 2, n: "MTOR" }, { "@id": 3 }] },
    {
        edges: [
            { "@id": 10, s: 1, t: 2, i: "activates" },
            { "@id": 11, s: 2, t: 3 },
        ],
    },
    {
        nodeAttributes: [
            { po: 1, n: "score", v: "1.5", d: "double" },
            { po: 2, n: "score", v: 2, d: "double" },
            { po: 1, n: "aliases", v: ["a", "b"], d: "list_of_string" },
            { po: 3, n: "flag", v: "TRUE", d: "boolean" },
            { po: 1, n: "count", v: "7", d: "integer" },
            { po: 2, n: "note", v: "plain" },
        ],
    },
    {
        edgeAttributes: [
            { po: 10, n: "weight", v: "0.5", d: "double" },
            { po: 11, n: "evidence", v: [], d: "list_of_string" },
        ],
    },
    {
        networkAttributes: [
            { n: "name", v: "Simple" },
            { n: "description", v: "a test" },
            { n: "version", v: "2" },
            { n: "@context", v: '{"HGNC": "http://identifiers.org/hgnc/"}' },
        ],
    },
    {
        cartesianLayout: [
            { node: 1, x: 10, y: 20 },
            { node: 2, x: -5.5, y: 0, z: 32775 },
        ],
    },
    { metaData: [{ name: "nodes", elementCount: 3 }] },
]);

describe("cxImporter: the mapping (design section 1.2)", () => {
    it("reads nodes, edges, typed attributes, the label, network attributes and the layout", async () => {
        const { snapshot: s, report } = await load(SIMPLE);
        expect(codes(report)).toEqual([]);
        expect(s.directed).toBe(true);
        expect(s.ids.toArray()).toEqual([1, 2, 3]);
        expect(s.nodes.byRole("label")?.meta.name).toBe("name");
        expect(value(s, "name", 1)).toBe("AKT1");
        expect(value(s, "represents", 1)).toBe("HGNC:391");
        expect(value(s, "score", 1)).toBe(1.5);
        expect(value(s, "score", 2)).toBe(2);
        expect(s.nodes.get("score")?.meta.origin).toMatchObject({ format: "cx", type: "double" });
        expect(value(s, "aliases", 1)).toEqual(["a", "b"]);
        expect(value(s, "flag", 3)).toBe(true);
        expect(value(s, "count", 1)).toBe(7);
        expect(s.nodes.get("count")?.dtype).toBe("i32");
        expect(value(s, "note", 2)).toBe("plain");
        expect(edgeValue(s, "interaction", 0)).toBe("activates");
        expect(s.edges.byRole("id")?.value(1)).toBe(11);
        expect(s.edges.byRole("weight")?.value(0)).toBe(0.5);
        expect(edgeValue(s, "evidence", 1)).toEqual([]);
        expect(s.meta.name).toBe("Simple");
        expect(s.meta.description).toBe("a test");
        expect(s.meta.sourceFormat).toBe("cx");
        expect(s.graph.get("version")?.value(0)).toBe("2");
        expect(s.graph.get("@context")?.value(0)).toBe('{"HGNC": "http://identifiers.org/hgnc/"}');
        expect(point(s, "position", 1)).toEqual([10, -20, 0]);
        expect(Object.is(point(s, "position", 2)[1], 0)).toBe(true);
        expect(value(s, "z", 2)).toBe(32775);
        expect(s.nodes.byRole("position")?.isSet(2)).toBe(false);
    });

    it("reads every input shape the same way", async () => {
        const expected = (await load(SIMPLE)).snapshot;
        for (const shape of inputShapes(new TextEncoder().encode(SIMPLE))) {
            const { snapshot } = await load(shape.make());
            expect(snapshot.nodes.names(), shape.name).toEqual(expected.nodes.names());
            expect(snapshot.edgeCount, shape.name).toBe(2);
        }
    });

    it("sniffs CX by its first aspect, and never CX2 or Cytoscape.js elements", () => {
        const sniff = (text: string): number => cxImporter.sniff?.(new TextEncoder().encode(text)) ?? -1;
        expect(sniff('[{"numberVerification":[{"longNumber":281474976710655}]}')).toBe(0.95);
        expect(sniff(' [ { "metaData" : [')).toBe(0.95);
        expect(sniff('[{"nodes":[{"@id":1}]}')).toBe(0.7);
        expect(sniff('[{"CXVersion":"2.0"}')).toBe(0);
        expect(sniff('[{"data":{"id":"a"}}]')).toBe(0);
        expect(sniff('{"nodes":[]}')).toBe(0);
    });
});

describe("cxImporter: values (research-cx.md 3.3, 4.2)", () => {
    it("applies Cytoscape's value rule: empty and null are unset, NaN is NaN in a double", async () => {
        const { snapshot: s, report } = await load(
            cx([
                { nodes: [1, 2, 3, 4, 5, 6].map((id) => ({ "@id": id })) },
                {
                    nodeAttributes: [
                        { po: 1, n: "d", v: "", d: "double" },
                        { po: 2, n: "d", v: "Null", d: "double" },
                        { po: 3, n: "d", v: "NaN", d: "double" },
                        { po: 4, n: "d", v: "-Infinity", d: "double" },
                        { po: 5, n: "d", v: "1.4599107187941883E-4", d: "double" },
                        { po: 6, n: "d", v: null, d: "double" },
                        { po: 1, n: "i", v: "NaN", d: "integer" },
                        { po: 2, n: "l", v: ["8.0", "null", "", "NaN"], d: "list_of_double" },
                        { po: 3, n: "b", v: "False", d: "boolean" },
                        { po: 4, n: "f", v: "2.5", d: "float" },
                        { po: 5, n: "lf", v: ["1"], d: "list_of_float" },
                    ],
                },
            ]),
        );
        expect(codes(report)).toEqual([]);
        expect(value(s, "d", 1)).toBeUndefined();
        expect(value(s, "d", 2)).toBeUndefined();
        expect(value(s, "d", 3)).toBeNaN();
        expect(value(s, "d", 4)).toBe(-Infinity);
        expect(value(s, "d", 5)).toBe(1.4599107187941883e-4);
        expect(value(s, "d", 6)).toBeUndefined();
        expect(value(s, "i", 1)).toBeUndefined();
        expect((value(s, "l", 2) as number[]).map(String)).toEqual(["8", "NaN", "NaN", "NaN"]);
        expect(value(s, "b", 3)).toBe(false);
        expect(value(s, "f", 4)).toBe(2.5);
        expect(s.nodes.get("lf")?.meta).toMatchObject({ dtype: "list", itemDtype: "f64" });
    });

    it("reports a value that does not parse as E_BAD_VALUE: Java-only forms, out-of-range integers, shapes", async () => {
        const bad: [string, unknown, string][] = [
            ["a", "1.0d", "double"],
            ["b", "0x1p3", "double"],
            ["c", "+5", "double"],
            ["d", " 3 ", "double"],
            ["e", "2147483648", "integer"],
            ["f", "yes", "boolean"],
            ["g", "1", "boolean"],
            ["h", ["x"], "string"],
            ["i", "x", "list_of_string"],
            ["j", ["1", "x"], "list_of_integer"],
            ["k", 1.5, "integer"],
            ["m", { x: 1 }, "string"],
        ];
        const { snapshot, report } = await load(
            cx([{ nodes: [{ "@id": 1 }] }, { nodeAttributes: bad.map(([n, v, d]) => ({ po: 1, n, v, d })) }]),
        );
        expect(report.issues.filter((i) => i.code === CX_ISSUE.BAD_VALUE)).toHaveLength(bad.length);
        for (const [n] of bad) {
            expect(value(snapshot, n, 1), n).toBeUndefined();
        }
    });

    it("widens one name with several data types and keeps an unknown type as text", async () => {
        const { snapshot: s, report } = await load(
            cx([
                { nodes: [1, 2, 3].map((id) => ({ "@id": id })) },
                {
                    nodeAttributes: [
                        { po: 1, n: "x", v: "1", d: "integer" },
                        { po: 2, n: "x", v: "2.5", d: "double" },
                        { po: 1, n: "y", v: "true", d: "boolean" },
                        { po: 2, n: "y", v: "word" },
                        { po: 1, n: "z", v: "a", d: "list_of_string" },
                        { po: 2, n: "z", v: ["b"], d: "list_of_string" },
                        { po: 3, n: "z", v: "c" },
                        { po: 1, n: "when", v: "2020-01-01", d: "date" },
                    ],
                },
            ]),
        );
        expect(s.nodes.get("x")?.dtype).toBe("f64");
        expect(value(s, "x", 1)).toBe(1);
        expect(value(s, "x", 2)).toBe(2.5);
        expect(s.nodes.get("y")?.dtype).toBe("string");
        expect(value(s, "y", 1)).toBe("true");
        expect(s.nodes.get("z")?.dtype).toBe("json");
        expect(value(s, "z", 2)).toEqual(["b"]);
        expect(value(s, "when", 1)).toBe("2020-01-01");
        expect(codes(report).sort()).toEqual([CX_ISSUE.UNKNOWN_ATTR_TYPE, CX_ISSUE.WIDENED].sort());
        expect(report.issues.filter((i) => i.code === CX_ISSUE.WIDENED)).toHaveLength(3);
    });

    it('keeps longs beyond 2^53 as the nearest double, or as text under long: "string"', async () => {
        const doc = `[{"nodes":[{"@id":1}]},{"nodeAttributes":[{"po":1,"n":"a","v":"12345678901234567891","d":"long"},{"po":1,"n":"b","v":12345678901234567891,"d":"long"}]}]`;
        const asDouble = await load(doc);
        expect(value(asDouble.snapshot, "a", 1)).toBe(Number("12345678901234567891"));
        expect(codes(asDouble.report)).toEqual([CX_ISSUE.PRECISION]);
        const asText = await load(doc, { long: "string" });
        expect(value(asText.snapshot, "a", 1)).toBe("12345678901234567891");
        expect(value(asText.snapshot, "b", 1)).toBe("12345678901234567891");
    });

    it("types empty columns from cyTableColumn and widens a column that disagrees with it", async () => {
        const { snapshot: s, report } = await load(
            cx([
                {
                    cyTableColumn: [
                        { applies_to: "node_table", n: "empty", d: "integer" },
                        { applies_to: "node_table", n: "level", d: "integer" },
                        { applies_to: "edge_table", n: "ratio", d: "double" },
                    ],
                },
                { nodes: [{ "@id": 1 }] },
                { nodeAttributes: [{ po: 1, n: "level", v: "1.5", d: "double" }] },
            ]),
        );
        expect(s.nodes.get("empty")?.dtype).toBe("i32");
        expect(s.nodes.get("level")?.dtype).toBe("f64");
        expect(codes(report)).toEqual([CX_ISSUE.WIDENED]);
    });

    it("lets the later of two values win, warning when they differ; an attribute name beats a different n", async () => {
        const { snapshot: s, report } = await load(
            cx([
                {
                    nodes: [
                        { "@id": 1, n: "from n" },
                        { "@id": 2, n: "same" },
                    ],
                },
                { edges: [{ "@id": 5, s: 1, t: 2, i: "binds" }] },
                {
                    nodeAttributes: [
                        { po: 1, n: "name", v: "from attribute" },
                        { po: 2, n: "name", v: "same" },
                        { po: 1, n: "k", v: "a" },
                        { po: 1, n: "k", v: "b" },
                        { po: 2, n: "k", v: "c" },
                        { po: 2, n: "k", v: "c" },
                    ],
                },
                { edgeAttributes: [{ po: 5, n: "interaction", v: "inhibits" }] },
            ]),
        );
        expect(value(s, "name", 1)).toBe("from attribute");
        expect(value(s, "k", 1)).toBe("b");
        expect(edgeValue(s, "interaction", 0)).toBe("inhibits");
        expect(report.issues.filter((i) => i.code === CX_ISSUE.DUPLICATE_ATTRIBUTE)).toHaveLength(3);
    });

    it("counts attributes, layout entries and provenance links that name nothing", async () => {
        const { report } = await load(
            cx([
                { nodes: [{ "@id": 1 }] },
                { edges: [] },
                {
                    nodeAttributes: [
                        { po: 99, n: "a", v: "x" },
                        { po: 1, n: "a", v: "y", s: 404 },
                        { po: 1, v: "no name" },
                    ],
                },
                {
                    cartesianLayout: [
                        { node: 98, x: 1, y: 1 },
                        { node: 1, x: "1", y: 2 },
                    ],
                },
            ]),
        );
        expect(codes(report)).toEqual([CX_ISSUE.MISSING_ID, CX_ISSUE.BAD_VALUE, CX_ISSUE.DANGLING_REFERENCE]);
        expect(report.issues.filter((i) => i.code === CX_ISSUE.DANGLING_REFERENCE).map((i) => i.element)).toEqual([
            "node attribute target",
            "attribute subnetwork reference",
            "layout entry",
        ]);
    });
});

describe("cxImporter: ids, nodes and edges (research-cx.md 4.2)", () => {
    it("applies the CX id rule and merges a duplicate node", async () => {
        const doc =
            '[{"nodes":[{"@id":"12"},{"@id":1e3},{"@id":9007199254740993},{"@id":0},{"@id":-3},{"@id":1.5},{"@id":"x"},{"n":"no id"},{"@id":12,"n":"twelve"}]}]';
        const { snapshot, report } = await load(doc);
        expect(snapshot.ids.toArray()).toEqual([12, 1000, "9007199254740993", 0, -3]);
        expect(value(snapshot, "name", 12)).toBe("twelve");
        expect(codes(report)).toEqual([
            CX_ISSUE.ID_TEXT_TYPE,
            CX_ISSUE.PRECISION,
            CX_ISSUE.INVALID_ID,
            CX_ISSUE.MISSING_ID,
            CX_ISSUE.DUPLICATE_NODE,
        ]);
        expect(snapshot.meta.idType).toBe("mixed");
    });

    it("reports edges without an id or endpoint, duplicate edge ids and dangling endpoints; forward references resolve", async () => {
        const { snapshot, report } = await load(
            cx([
                {
                    edges: [
                        { "@id": 1, s: 1, t: 2 },
                        { s: 1, t: 2 },
                        { "@id": 2, s: 1 },
                    ],
                },
                { nodes: [{ "@id": 1 }, { "@id": 2 }] },
                {
                    edges: [
                        { "@id": 1, s: 2, t: 1 },
                        { "@id": 3, s: 1, t: 404 },
                        { "@id": 4, s: 2, t: 2 },
                    ],
                },
            ]),
        );
        expect(snapshot.edgeCount).toBe(2);
        expect(snapshot.selfLoopCount).toBe(1);
        expect(codes(report).sort()).toEqual(
            [CX_ISSUE.MISSING_ID, CX_ISSUE.MISSING_ENDPOINT, CX_ISSUE.DUPLICATE_EDGE_ID, CX_ISSUE.UNKNOWN_NODE].sort(),
        );
    });

    it("enforces addMissingNodes false through the registry and a caller's sink; true creates the node", async () => {
        const doc = cx([{ nodes: [{ "@id": 1 }] }, { edges: [{ "@id": 1, s: 1, t: 2 }] }]);
        const registry = await importGraph(doc, { format: "cx" });
        expect(registry.snapshot.edgeCount).toBe(0);
        expect(codes(registry.report)).toEqual([CX_ISSUE.UNKNOWN_NODE]);
        const caller = await load(doc, undefined, { addMissingNodes: true });
        expect(caller.snapshot.edgeCount).toBe(0);
        expect(codes(caller.report)).toEqual([CX_ISSUE.UNKNOWN_NODE]);
        const created = await load(doc, { addMissingNodes: true });
        expect(created.snapshot.ids.toArray()).toEqual([1, 2]);
        expect(created.report.counts.nodes).toBe(2);
    });

    it("ignores defaultDirected and an invalid weight skips its edge", async () => {
        const { snapshot, report } = await load(
            cx([
                { nodes: [{ "@id": 1 }, { "@id": 2 }] },
                {
                    edges: [
                        { "@id": 1, s: 1, t: 2 },
                        { "@id": 2, s: 2, t: 1 },
                    ],
                },
                {
                    edgeAttributes: [
                        { po: 1, n: "weight", v: "heavy", d: "double" },
                        { po: 2, n: "weight", v: "" },
                    ],
                },
            ]),
            { defaultDirected: false },
        );
        expect(snapshot.directed).toBe(true);
        expect(snapshot.edgeCount).toBe(1);
        expect(codes(report)).toEqual([CX_ISSUE.OPTION_IGNORED, CX_ISSUE.INVALID_WEIGHT]);
    });
});

describe("cxImporter: the stream (research-cx.md 4.1)", () => {
    it("fails on empty input, invalid JSON, a top-level object and CX2 content", async () => {
        expect(codes((await failure("")).report)).toEqual([CX_ISSUE.EMPTY_INPUT]);
        expect(codes((await failure('[{"nodes":[{"@id":1}]')).report)).toEqual([CX_ISSUE.SYNTAX]);
        // a bare NaN (Python's json writes it) is read as the number since the robustness pass: the
        // node's id is then E_INVALID_ID and the import goes on
        const nan = await load('[{"nodes":[{"@id":NaN}]}]');
        expect(codes(nan.report)).toEqual([CX_ISSUE.JSON_NONSTANDARD_NUMBER, CX_ISSUE.INVALID_ID]);
        expect(codes((await failure('{"nodes":[]}')).report)).toEqual([CX_ISSUE.NOT_CX]);
        const cx2 = await failure('[{"CXVersion":"2.0","hasFragments":false},{"status":[{"success":true}]}]');
        expect(codes(cx2.report)).toEqual([CX_ISSUE.NOT_CX]);
        expect(cx2.message).toMatch(/cx2 importer/);
    });

    it("reads an empty array and a document without numberVerification or status as legal", async () => {
        expect((await load("[]")).snapshot.nodeCount).toBe(0);
        const plain = await load('[{"nodes":[{"@id":1}]}]');
        expect(codes(plain.report)).toEqual([]);
    });

    it("checks numberVerification, the status, the order and the counts", async () => {
        const wrong = await load(
            '[{"numberVerification":[{"longNumber":75}]},{"numberVerification":[{"longNumber":281474976710655}]}]',
        );
        expect(wrong.report.issues.filter((i) => i.code === CX_ISSUE.NUMBER_VERIFICATION)).toHaveLength(2);
        expect(codes((await load('[{"numberVerification":[{"longNumber":9223372036854775807}]}]')).report)).toEqual([]);
        const failed = await failure(cx([{ nodes: [{ "@id": 1 }] }], [{ error: "aborted", success: false }]));
        expect(codes(failed.report)).toEqual([CX_ISSUE.STATUS_FAILED]);
        expect(codes((await load(cx([], [{ error: "careful", success: true }]))).report)).toEqual([
            CX_ISSUE.STATUS_WARNING,
        ]);
        const order = await load(
            JSON.stringify([
                { metaData: [{ name: "nodes", elementCount: 2 }] },
                { nodes: [{ "@id": 1 }] },
                { metaData: [] },
                { edges: [] },
                { status: [{ success: true }] },
                { cyHiddenAttributes: [] },
            ]),
        );
        expect(codes(order.report)).toEqual([CX_ISSUE.ASPECT_ORDER, CX_ISSUE.COUNT_MISMATCH]);
    });

    it("skips malformed fragments and reads a single-object aspect as one element", async () => {
        const { snapshot, report } = await load(
            JSON.stringify([
                { nodes: [{ "@id": 1 }], edges: [] },
                { x: 1 },
                5,
                { nodes: [7, { "@id": 2 }] },
                { nodes: { "@id": 3 } },
                { ndexStatus: { published: true } },
            ]),
        );
        expect(snapshot.ids.toArray()).toEqual([1, 2, 3]);
        // the first member's array-valued second key (edges: []) is read as its own fragment since
        // the robustness pass (W_MULTI_ASPECT_FRAGMENT), no longer skipped as a bad block
        expect(report.issues.filter((i) => i.code === CX_ISSUE.BAD_ASPECT_BLOCK)).toHaveLength(3);
        expect(codes(report)).toContain(CX_ISSUE.MULTI_ASPECT_FRAGMENT);
        expect((snapshot.meta.extra.cx as Record<string, unknown>).ndexStatus).toEqual([{ published: true }]);
    });

    it("reads old Cytoscape aspect names under their cy names", async () => {
        const { snapshot, report } = await load(
            JSON.stringify([
                { nodes: [{ "@id": 1 }, { "@id": 2 }] },
                { subNetworks: [{ "@id": 9, nodes: "all", edges: "all" }] },
                { networkRelations: [{ c: 9, name: "Old" }] },
                { hiddenAttributes: [{ n: "layoutAlgorithm", v: "grid" }] },
                { visualProperties: [{ properties_of: "nodes", applies_to: 1, properties: { NODE_SIZE: "40.0" } }] },
            ]),
        );
        expect(snapshot.meta.name).toBe("Old");
        expect(value(snapshot, "NODE_SIZE", 1)).toBe("40.0");
        expect(codes(report)).toEqual([CX_ISSUE.OLD_ASPECT_NAME]);
        expect(report.issues.filter((i) => i.code === CX_ISSUE.OLD_ASPECT_NAME)).toHaveLength(4);
        expect(Object.keys(snapshot.meta.extra.cx as object)).toContain("cyHiddenAttributes");
    });

    it("stops on an aborted signal", async () => {
        const controller = new AbortController();
        controller.abort(new Error("stop"));
        await expect(load(SIMPLE, { signal: controller.signal })).rejects.toThrow("stop");
    });
});

const COLLECTION = cx([
    {
        nodes: [
            { "@id": 1, n: "a" },
            { "@id": 2, n: "b" },
            { "@id": 3, n: "c" },
        ],
    },
    {
        edges: [
            { "@id": 10, s: 1, t: 2 },
            { "@id": 11, s: 2, t: 3 },
        ],
    },
    {
        cySubNetworks: [
            { "@id": 100, nodes: [1, 2], edges: [10] },
            { "@id": 200, nodes: [2, 3, 77], edges: [11, 10] },
            { "@id": 300, nodes: "all", edges: "all" },
        ],
    },
    {
        cyNetworkRelations: [
            { c: 200, r: "subnetwork", name: "Second" },
            { c: 100, name: "First" },
            { p: 100, c: 1000, r: "view" },
            { p: 200, c: 2000, r: "view" },
        ],
    },
    { cyViews: [{ "@id": 3000, s: 300 }] },
    {
        nodeAttributes: [
            { po: 2, n: "score", v: "1.0", d: "double" },
            { po: 2, n: "score", v: "2.0", d: "double", s: 200 },
            { po: 2, n: "local", v: "only first", s: 100 },
        ],
    },
    {
        networkAttributes: [
            { n: "name", v: "Collection" },
            { n: "name", v: "Third", s: 300 },
            { n: "kind", v: "x", s: 200 },
        ],
    },
    {
        cartesianLayout: [
            { node: 1, x: 1, y: 1, view: 1000 },
            { node: 2, x: 2, y: 2, view: 1000 },
            { node: 2, x: 20, y: 20, view: 2000 },
            { node: 3, x: 30, y: 30, view: 3000 },
            { node: 3, x: 0, y: 0, view: 4040 },
        ],
    },
]);

describe("cxImporter: collections (design section 1.2)", () => {
    it("lists the subnetworks in relation order with their names and counts", async () => {
        expect(await cxImporter.listGraphs?.(COLLECTION)).toEqual([
            { index: 0, name: "Second", nodes: 3, edges: 2 },
            { index: 1, name: "First", nodes: 2, edges: 1 },
            { index: 2, name: "Third", nodes: 3, edges: 2 },
        ]);
        expect((await listGraphs(COLLECTION, { format: "cx" }))?.map((g) => g.name)).toEqual([
            "Second",
            "First",
            "Third",
        ]);
    });

    it("reads one subnetwork with its scoped values, view and edges; import() reads the first", async () => {
        const first = await load(COLLECTION);
        expect(first.snapshot.meta.name).toBe("Second");
        expect(first.snapshot.ids.toArray()).toEqual([2, 3]);
        expect(value(first.snapshot, "score", 2)).toBe(2);
        expect(value(first.snapshot, "local", 2)).toBeUndefined();
        expect(first.snapshot.graph.get("kind")?.value(0)).toBe("x");
        expect(point(first.snapshot, "position", 2)).toEqual([20, -20, 0]);
        // edge 10 is listed in subnetwork 200 but its source is not: E_UNKNOWN_NODE
        expect(first.snapshot.edgeCount).toBe(1);
        expect(codes(first.report).sort()).toEqual(
            [CX_ISSUE.MULTIPLE_GRAPHS, CX_ISSUE.DANGLING_REFERENCE, CX_ISSUE.UNKNOWN_NODE].sort(),
        );
        const byName = await load(COLLECTION, { graphName: "First" });
        expect(byName.snapshot.ids.toArray()).toEqual([1, 2]);
        expect(value(byName.snapshot, "score", 2)).toBe(1);
        expect(value(byName.snapshot, "local", 2)).toBe("only first");
        expect(point(byName.snapshot, "position", 1)).toEqual([1, -1, 0]);
        const third = await load(COLLECTION, { graphIndex: 2 });
        expect(third.snapshot.nodeCount).toBe(3);
        expect(third.snapshot.meta.name).toBe("Third");
        expect(point(third.snapshot, "position", 3)).toEqual([30, -30, 0]);
        expect(codes((await failure(COLLECTION, { graphName: "Nope" })).report)).toEqual([CX_ISSUE.GRAPH_NOT_FOUND]);
    });

    it('reads every aspect that names a node or an edge under ids: "string" as under the default', async () => {
        // layouts, groups, attributes, visual properties and links name elements by their CX id;
        // each must find the element the ids option renamed
        const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "conformance", "fixtures", "cx");
        const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as {
            fixtures: { file: string; expected: { outcome: string } }[];
        };
        const setCells = (s: GraphSnapshot): Record<string, number> => {
            const out: Record<string, number> = {};
            for (const [table, columns, count] of [
                ["node", s.nodes, s.nodeCount],
                ["edge", s.edges, s.edgeCount],
            ] as const) {
                for (const column of columns) {
                    let n = 0;
                    for (let row = 0; row < count; row++) {
                        n += column.isSet(row) ? 1 : 0;
                    }
                    out[`${table}:${column.meta.name}`] = n;
                }
            }
            return out;
        };
        let compared = 0;
        for (const { file, expected } of manifest.fixtures) {
            if (expected.outcome !== "pass") {
                continue;
            }
            const bytes = new Uint8Array(readFileSync(join(dir, file)));
            const plain = await load(bytes);
            const text = await load(bytes, { ids: "string" });
            expect(setCells(text.snapshot), file).toEqual(setCells(plain.snapshot));
            compared++;
        }
        expect(compared).toBeGreaterThan(10);
    });

    it("keeps a subnetwork's members under every ids option", async () => {
        // membership lists hold the ids as written; a coerced id must still find its subnetwork
        for (const ids of ["string", "number", "keep"] as const) {
            const byName = await load(COLLECTION, { graphName: "First", ids });
            expect(byName.snapshot.nodeCount, ids).toBe(2);
            expect(byName.snapshot.edgeCount, ids).toBe(1);
        }
    });

    it("reads every subnetwork with importAll()", async () => {
        const all = await importAllGraphs(COLLECTION, { format: "cx" });
        expect(all.map((r) => r.snapshot.nodeCount)).toEqual([2, 2, 3]);
        expect(all.map((r) => r.snapshot.meta.name)).toEqual(["Second", "First", "Third"]);
    });

    it("writes the other views of one subnetwork to position@n columns and counts unknown views", async () => {
        const { snapshot, report } = await load(
            cx([
                { nodes: [{ "@id": 1 }] },
                { cySubNetworks: [{ "@id": 5, nodes: "all", edges: "all" }] },
                {
                    cyViews: [
                        { "@id": 50, s: 5 },
                        { "@id": 51, s: 5 },
                    ],
                },
                {
                    cartesianLayout: [
                        { node: 1, x: 1, y: 2, view: 50 },
                        { node: 1, x: 3, y: 4, view: 51 },
                        { node: 1, x: 0, y: 0, view: 52 },
                        { node: 1, x: 9, y: 9, view: 51 },
                    ],
                },
            ]),
        );
        expect(point(snapshot, "position", 1)).toEqual([1, -2, 0]);
        expect(point(snapshot, "position@2", 1)).toEqual([9, -9, 0]);
        expect(snapshot.nodes.get("position@2")?.meta.origin?.id).toBe("51");
        expect(codes(report)).toEqual([CX_ISSUE.DUPLICATE_ATTRIBUTE, CX_ISSUE.DANGLING_REFERENCE]);
        const zIn = await load(cx([{ nodes: [{ "@id": 1 }] }, { cartesianLayout: [{ node: 1, x: 1, y: 2, z: 5 }] }]), {
            zAs: "position",
        });
        expect(point(zIn.snapshot, "position", 1)).toEqual([1, -2, 5]);
    });
});

describe("cxImporter: groups, visual properties and provenance (research-cx.md 3.4, 3.5)", () => {
    it("reads cyGroups: parents, nested groups, added group nodes, unknown members and cycles", async () => {
        const { snapshot: s, report } = await load(
            cx([
                { nodes: [{ "@id": 1 }, { "@id": 2 }, { "@id": 3 }, { "@id": 10, n: "Group" }, { "@id": 20 }] },
                {
                    cyGroups: [
                        {
                            "@id": 10,
                            n: "Group One",
                            nodes: [1, 2, 20],
                            internal_edges: [],
                            external_edges: [],
                            collapsed: true,
                        },
                        { "@id": 20, n: "Inner", nodes: [3, 2, 99, 10], collapsed: false },
                        { "@id": 30, n: "Added", nodes: [1] },
                    ],
                },
            ]),
        );
        const parents = s.nodes.byRole("parents");
        expect(parents?.meta.name).toBe("parents");
        const ids = (row: number): unknown[] =>
            Array.from(parents?.value(row) as ArrayLike<number>).map((r) => s.ids.idOf(r));
        expect(ids(s.ids.indexOf(1))).toEqual([10, 30]);
        expect(ids(s.ids.indexOf(2))).toEqual([10, 20]);
        expect(ids(s.ids.indexOf(20))).toEqual([10]);
        expect(value(s, "name", 10)).toBe("Group");
        expect(value(s, "name", 30)).toBe("Added");
        expect(value(s, "collapsed", 10)).toBe(true);
        expect(value(s, "collapsed", 20)).toBe(false);
        expect(codes(report)).toEqual([CX_ISSUE.UNKNOWN_PARENT, CX_ISSUE.PARENT_CYCLE, CX_ISSUE.GROUP_NODE_ADDED]);
        expect((s.meta.extra.cx as { groups: unknown[] }).groups).toHaveLength(3);
        const single = await load(
            cx([{ nodes: [{ "@id": 1 }, { "@id": 2 }] }, { cyGroups: [{ "@id": 2, nodes: [1] }] }]),
        );
        expect(single.snapshot.nodes.byRole("parent")?.value(0)).toBe(1);
    });

    it("turns per-element visual properties into columns and reports style rules", async () => {
        const { snapshot: s, report } = await load(
            cx([
                { nodes: [{ "@id": 1 }] },
                { edges: [{ "@id": 2, s: 1, t: 1 }] },
                { nodeAttributes: [{ po: 1, n: "NODE_SIZE", v: "attribute" }] },
                {
                    cyVisualProperties: [
                        { properties_of: "network", properties: { NETWORK_BACKGROUND_PAINT: "#FFFFFF" } },
                        {
                            properties_of: "nodes:default",
                            properties: { NODE_SHAPE: "ELLIPSE" },
                            mappings: {
                                NODE_FILL_COLOR: { type: "DISCRETE", definition: "COL=x,T=string,K=0=a,V=0=#FF0000" },
                            },
                        },
                        { properties_of: "edges:default", dependencies: { arrowColorMatchesEdge: "false" } },
                        {
                            properties_of: "nodes",
                            applies_to: 1,
                            properties: { NODE_SIZE: "40.0", NODE_FILL_COLOR: "#00FF00" },
                        },
                        { properties_of: "edges", applies_to: 2, properties: { EDGE_WIDTH: "2.0" } },
                        { properties_of: "nodes", applies_to: 9, properties: { NODE_SIZE: "1.0" } },
                    ],
                },
            ]),
        );
        expect(value(s, "NODE_SIZE", 1)).toBe("attribute");
        expect(value(s, "NODE_SIZE#2", 1)).toBe("40.0");
        expect(value(s, "NODE_FILL_COLOR", 1)).toBe("#00FF00");
        expect(s.nodes.get("NODE_FILL_COLOR")?.meta.origin?.namespace).toBe("cx.bypass");
        expect(edgeValue(s, "EDGE_WIDTH", 0)).toBe("2.0");
        expect(s.graph.get("NETWORK_BACKGROUND_PAINT")?.value(0)).toBe("#FFFFFF");
        expect(codes(report)).toEqual([
            CX_ISSUE.COLUMN_RENAMED,
            CX_ISSUE.STYLES_NOT_IMPORTED,
            CX_ISSUE.DANGLING_REFERENCE,
        ]);
        expect(report.issues.find((i) => i.code === CX_ISSUE.STYLES_NOT_IMPORTED)?.message).toMatch(
            /1 default\(s\), 1 mapping\(s\), 1 dependenc\(ies\)\); they are kept/,
        );
        expect((s.meta.extra.cx as Record<string, unknown[]>).cyVisualProperties).toHaveLength(6);
    });

    it("reads the per-element visual values of the graph's own view only, and counts table styles", async () => {
        const { snapshot: s, report } = await load(
            cx([
                { nodes: [{ "@id": 1 }] },
                { cySubNetworks: [{ "@id": 50, nodes: "all", edges: "all" }] },
                {
                    cyViews: [
                        { "@id": 60, s: 50 },
                        { "@id": 61, s: 50 },
                    ],
                },
                {
                    cyVisualProperties: [
                        { properties_of: "nodes", applies_to: 1, view: 60, properties: { NODE_SIZE: "10.0" } },
                        { properties_of: "nodes", applies_to: 1, view: 61, properties: { NODE_SIZE: "99.0" } },
                        {
                            properties_of: "network",
                            applies_to: 61,
                            view: 61,
                            properties: { NETWORK_SCALE_FACTOR: "2" },
                        },
                    ],
                },
                { tableVisualProperties: [{ applies_to: "node_table", n: "x" }] },
            ]),
        );
        expect(value(s, "NODE_SIZE", 1)).toBe("10.0");
        expect(s.graph.get("NETWORK_SCALE_FACTOR")).toBeNull();
        expect(codes(report)).toEqual([CX_ISSUE.STYLES_NOT_IMPORTED]);
        expect(report.issues[0].message).toMatch(/1 table style element/);
        const tableOnly = await load(cx([{ nodes: [{ "@id": 1 }] }, { tableVisualProperties: [{ n: "x" }] }]));
        expect(codes(tableOnly.report)).toEqual([CX_ISSUE.STYLES_NOT_IMPORTED]);
    });

    it("reports an attribute element without v, nodes and edges in no subnetwork, and a too-deep element", async () => {
        // built as text: JSON.stringify itself overflows the stack on such a value
        const deep = `${"[".repeat(5000)}${"]".repeat(5000)}`;
        const text = cx([
            { nodes: [{ "@id": 1 }, { "@id": 2 }, { "@id": 3 }] },
            {
                edges: [
                    { "@id": 7, s: 1, t: 2 },
                    { "@id": 8, s: 2, t: 3 },
                ],
            },
            { cySubNetworks: [{ "@id": 50, nodes: [1, 2], edges: [7] }] },
            {
                nodeAttributes: [
                    { po: 1, n: "a" },
                    { po: 2, n: "a", v: "x" },
                    { po: 2, n: "b", v: "DEEP" },
                ],
            },
            { provenanceHistory: [{ entity: "DEEP" }] },
        ])
            .split('"DEEP"')
            .join(deep);
        const { snapshot: s, report } = await load(text);
        expect(s.nodeCount).toBe(2);
        expect(s.edgeCount).toBe(1);
        expect(value(s, "a", 2)).toBe("x");
        expect(codes(report)).toEqual([CX_ISSUE.BAD_ASPECT_BLOCK, CX_ISSUE.ROOT_ONLY, CX_ISSUE.BAD_VALUE]);
        expect(report.issues.find((i) => i.code === CX_ISSUE.ROOT_ONLY)?.message).toMatch(
            /1 node\(s\) and 1 edge\(s\)/,
        );
        expect(report.issues.find((i) => i.code === CX_ISSUE.BAD_VALUE)?.message).toMatch(/has no v/);
        expect(report.issues.filter((i) => i.code === CX_ISSUE.BAD_ASPECT_BLOCK)).toHaveLength(2);
    });

    it("reads citations and supports as extension tables and the links, function terms and reified edges as columns", async () => {
        const { snapshot: s, report } = await load(
            cx([
                { nodes: [{ "@id": 1 }, { "@id": 2 }, { "@id": 3 }] },
                { edges: [{ "@id": 7, s: 1, t: 2 }] },
                { citations: [{ "@id": 50, "dc:identifier": "pmid:1", "dc:type": "URI", attributes: [] }] },
                { supports: [{ "@id": 60, citation: 50, text: "evidence" }] },
                {
                    nodeCitations: [
                        { po: [1, 2], citations: [50] },
                        { po: [404], citations: [50] },
                    ],
                },
                { edgeCitations: [{ po: [7], citations: [50] }] },
                { edgeSupports: [{ po: [7], supports: [60] }] },
                { nodeSupports: [{ po: [1], supports: [60] }] },
                { functionTerms: [{ po: 3, f: "bel:complexAbundance", args: ["a", { f: "p", args: ["b"] }] }] },
                {
                    reifiedEdges: [
                        { node: 3, edge: 7 },
                        { node: 3, edge: 404 },
                    ],
                },
            ]),
        );
        const citations = s.extensions.get("cx:citations");
        expect(citations?.rowCount).toBe(1);
        expect(citations?.get("id")?.value(0)).toBe(50);
        expect(citations?.get("dc:identifier")?.value(0)).toBe("pmid:1");
        expect(s.extensions.get("cx:supports")?.get("text")?.value(0)).toBe("evidence");
        expect(value(s, "citations", 2)).toEqual([50]);
        expect(value(s, "supports", 1)).toEqual([60]);
        expect(edgeValue(s, "citations", 0)).toEqual([50]);
        expect(edgeValue(s, "supports", 0)).toEqual([60]);
        expect(value(s, "functionTerm", 3)).toEqual({
            f: "bel:complexAbundance",
            args: ["a", { f: "p", args: ["b"] }],
        });
        expect(value(s, "reifiedEdge", 3)).toBe(0);
        expect(codes(report)).toEqual([CX_ISSUE.DANGLING_REFERENCE]);
    });

    it("keeps unknown and NDEx aspects verbatim", async () => {
        const { snapshot, report } = await load(
            cx([
                { nodes: [{ "@id": 1 }] },
                { "@context": [{ HGNC: "http://identifiers.org/hgnc/" }] },
                { provenanceHistory: [{ entity: { uri: "x" } }] },
                { "CX Element ID": [{ "61": 158 }] },
                { myAppAspect: [{ anything: [1, 2] }] },
            ]),
        );
        expect(codes(report)).toEqual([]);
        const extra = snapshot.meta.extra.cx as Record<string, unknown>;
        expect(extra["@context"]).toEqual([{ HGNC: "http://identifiers.org/hgnc/" }]);
        expect(extra.myAppAspect).toEqual([{ anything: [1, 2] }]);
        expect(extra["CX Element ID"]).toEqual([{ "61": 158 }]);
    });
});
