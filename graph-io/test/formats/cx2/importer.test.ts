import { GraphBuilder, type GraphBuilderOptions, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { CX2_ISSUE, cx2Importer, type Cx2ImportOptions } from "../../../src/formats/cx2/index.js";
import { importGraph } from "../../../src/registry.js";
import { type CommonImportOptions, ImportError, type ImportInput, type ImportReport } from "../../../src/types.js";
import { inputShapes } from "../../helpers/corpus.js";

type Options = Cx2ImportOptions & CommonImportOptions;

interface Imported {
    snapshot: GraphSnapshot;
    report: ImportReport;
}

/** A CX2 document from its aspect blocks (the descriptor and the status are added). */
function cx2(blocks: readonly Record<string, unknown>[], status: unknown = [{ error: "", success: true }]): string {
    const members: unknown[] = [{ CXVersion: "2.0", hasFragments: false }, ...blocks];
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
    const report = await cx2Importer.import(input, sink, options);
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
    return c === null || !c.isSet(i) ? undefined : c.value(i);
};

const edgeValue = (s: GraphSnapshot, column: string, e: number): unknown => {
    const c = s.edges.get(column);
    return c === null || !c.isSet(e) ? undefined : c.value(e);
};

const RICH = cx2([
    {
        metaData: [
            { name: "nodes", elementCount: 3 },
            { name: "edges", elementCount: 2 },
        ],
    },
    {
        attributeDeclarations: [
            {
                networkAttributes: { name: { d: "string" }, description: { d: "string" }, version: { d: "string" } },
                nodes: {
                    name: { d: "string", a: "n" },
                    score: { d: "double", v: 0 },
                    rank: { d: "integer" },
                    big: { d: "long" },
                    flag: { d: "boolean", v: false },
                    alias: { d: "list_of_string" },
                    hits: { d: "list_of_integer" },
                },
                edges: { interaction: { d: "string", a: "i", v: "binds" }, weight: { d: "double" } },
            },
        ],
    },
    { networkAttributes: [{ name: "Net", description: "a test", version: "1.0" }] },
    {
        nodes: [
            { id: 0, x: 10, y: 20, z: 32768, v: { n: "A", score: 1.5, rank: 3, alias: ["a1", "a2"], hits: [] } },
            { id: 1, x: -5.5, y: 0, v: { n: "B", big: 12, flag: true } },
            { id: 7, x: 0, y: -3, v: { n: "C" } },
        ],
    },
    {
        edges: [
            { id: 100, s: 0, t: 1, v: { i: "inhibits", weight: 2.5 } },
            { id: 101, s: 1, t: 7 },
        ],
    },
    { nodeBypasses: [{ id: 0, v: { NODE_FILL_COLOR: "#FF0000", NODE_SIZE: 40 } }] },
    { edgeBypasses: [{ id: 101, v: { EDGE_WIDTH: 3 } }] },
    {
        visualProperties: [
            { default: { node: { NODE_SHAPE: "ellipse" }, edge: {}, network: {} }, nodeMapping: {}, edgeMapping: {} },
        ],
    },
    { cyHiddenAttributes: [{ n: "NDEx UUID", v: "x" }] },
]);

describe("cx2Importer: the mapping (design section 1.3)", () => {
    it("reads nodes, edges, typed declared columns, the label and network attributes", async () => {
        const { snapshot: s, report } = await load(RICH);
        expect(s.directed).toBe(true);
        expect(s.ids.toArray()).toEqual([0, 1, 7]);
        expect(s.edgeCount).toBe(2);
        expect(s.nodes.byRole("label")?.meta.name).toBe("name");
        expect(value(s, "name", 1)).toBe("B");
        expect(s.nodes.get("name")?.meta.origin).toMatchObject({ format: "cx2", id: "n", type: "string" });
        expect(s.nodes.get("score")?.dtype).toBe("f64");
        expect(s.nodes.get("rank")?.dtype).toBe("i32");
        expect(s.nodes.get("big")?.dtype).toBe("f64");
        expect(s.nodes.get("flag")?.dtype).toBe("bool");
        expect(s.nodes.get("alias")?.meta).toMatchObject({ dtype: "list", itemDtype: "string" });
        expect(value(s, "alias", 0)).toEqual(["a1", "a2"]);
        expect(value(s, "hits", 0)).toEqual([]);
        expect(value(s, "rank", 0)).toBe(3);
        expect(value(s, "big", 1)).toBe(12);
        // a declared default (falsy included) answers for an unset row
        expect(s.nodes.get("score")?.meta.default).toBe(0);
        expect(s.nodes.get("flag")?.meta.default).toBe(false);
        expect(s.nodes.get("score")?.value(s.ids.indexOf(1))).toBe(0);
        expect(edgeValue(s, "interaction", 0)).toBe("inhibits");
        expect(s.edges.get("interaction")?.value(1)).toBe("binds");
        expect(s.edges.byRole("id")?.value(0)).toBe(100);
        expect(s.meta.name).toBe("Net");
        expect(s.meta.description).toBe("a test");
        expect(s.graph.get("version")?.value(0)).toBe("1.0");
        expect(s.meta.sourceFormat).toBe("cx2");
        expect(s.meta.sourceVersion).toBe("2.0");
        expect(codes(report)).toEqual([CX2_ISSUE.STYLES_NOT_IMPORTED]);
    });

    it("stores positions y-up (y negated, never -0) and z in its own column", async () => {
        const { snapshot: s } = await load(RICH);
        const position = s.nodes.byRole("position");
        expect(position?.meta).toMatchObject({ dtype: "f32", components: 3, extra: { sourceDims: 2, units: "file" } });
        expect(Array.from(position?.value(s.ids.indexOf(0)) as ArrayLike<number>)).toEqual([10, -20, 0]);
        expect(Object.is((position?.value(s.ids.indexOf(1)) as ArrayLike<number>)[1], 0)).toBe(true);
        expect(Array.from(position?.value(s.ids.indexOf(7)) as ArrayLike<number>)).toEqual([0, 3, 0]);
        expect(value(s, "z", 0)).toBe(32768);
        expect(value(s, "z", 1)).toBeUndefined();
        expect(s.nodes.get("z")?.meta.origin?.namespace).toBe("cytoscape");
        const zIn = await load(RICH, { zAs: "position" });
        expect(Array.from(zIn.snapshot.nodes.byRole("position")?.value(0) as ArrayLike<number>)).toEqual([
            10, -20, 32768,
        ]);
        expect(zIn.snapshot.nodes.get("z")).toBeNull();
        expect(zIn.snapshot.nodes.byRole("position")?.meta.extra.sourceDims).toBe(3);
        await expect(load(RICH, { zAs: "depth" as "column" })).rejects.toThrow(/zAs/);
    });

    it("reads the weight attribute as the edge weight, and keeps it a column when weightFrom is null", async () => {
        const { snapshot: s } = await load(RICH);
        expect(s.edges.byRole("weight")?.value(0)).toBe(2.5);
        const plain = await load(RICH, { weightFrom: null });
        expect(plain.snapshot.flags.weighted).toBe(false);
        expect(edgeValue(plain.snapshot, "weight", 0)).toBe(2.5);
        const bad = await load(
            cx2([{ nodes: [{ id: 1 }] }, { edges: [{ id: 1, s: 1, t: 1, v: { weight: "heavy" } }] }]),
        );
        expect(codes(bad.report)).toContain("E_INVALID_WEIGHT");
        expect(bad.snapshot.edgeCount).toBe(0);
    });

    it("keeps per-element visual values as one column per property and style rules as a loss", async () => {
        const { snapshot: s, report } = await load(RICH);
        expect(value(s, "NODE_FILL_COLOR", 0)).toBe("#FF0000");
        expect(s.nodes.get("NODE_SIZE")?.dtype).toBe("f64");
        expect(s.nodes.get("NODE_FILL_COLOR")?.meta.origin?.namespace).toBe("cx2.bypass");
        expect(edgeValue(s, "EDGE_WIDTH", 1)).toBe(3);
        const { opaque } = s.meta.extra.cx2 as { opaque: Record<string, unknown[]> };
        expect(Object.keys(opaque)).toEqual(["visualProperties", "cyHiddenAttributes"]);
        const styles = report.issues.find((i) => i.code === CX2_ISSUE.STYLES_NOT_IMPORTED);
        expect(styles?.message).toMatch(/1 default\(s\), 0 node mapping\(s\), 0 edge mapping\(s\).*#706/);
    });

    it("reads every input shape the same way", async () => {
        const bytes = new TextEncoder().encode(RICH);
        const expected = (await load(RICH)).snapshot;
        for (const shape of inputShapes(bytes)) {
            const { snapshot } = await load(shape.make());
            expect(snapshot.ids.toArray(), shape.name).toEqual(expected.ids.toArray());
            expect(snapshot.nodes.names(), shape.name).toEqual(expected.nodes.names());
        }
    });
});

describe("cx2Importer: the descriptor and the stream (research-cx2.md 4.1)", () => {
    it("fails on empty input, invalid JSON, a non-array, an empty array and a missing descriptor", async () => {
        expect(codes((await failure("")).report)).toEqual([CX2_ISSUE.EMPTY_INPUT]);
        expect(codes((await failure('{"invalid": json}')).report)).toEqual([CX2_ISSUE.SYNTAX]);
        expect(codes((await failure('{"invalid": "structure"}')).report)).toEqual([CX2_ISSUE.NO_DESCRIPTOR]);
        expect(codes((await failure("[]")).report)).toEqual([CX2_ISSUE.NO_DESCRIPTOR]);
        expect(codes((await failure('[{"nodes":[]}]')).report)).toEqual([CX2_ISSUE.NO_DESCRIPTOR]);
        expect((await failure('[{"numberVerification":[{"longNumber":281474976710655}]}]')).message).toMatch(
            /CX version 1/,
        );
        expect(codes((await failure('[{"metaData": 1}]')).report)).toEqual([CX2_ISSUE.NO_DESCRIPTOR]);
        const truncated = await failure('[{"CXVersion":"2.0"},{"nodes":[{"id":0,"v":{"n":"no');
        expect(codes(truncated.report)).toEqual([CX2_ISSUE.SYNTAX]);
    });

    it("reads 2.x with a warning and refuses other majors, naming CX1", async () => {
        const read = async (version: unknown): Promise<string[]> =>
            codes((await load(JSON.stringify([{ CXVersion: version }, { status: [{ success: true }] }]))).report);
        expect(await read("2.0")).toEqual([]);
        expect(await read("2.1")).toEqual([CX2_ISSUE.MINOR_VERSION]);
        expect(await read(2)).toEqual([CX2_ISSUE.MINOR_VERSION]);
        const one = await failure(JSON.stringify([{ CXVersion: "1.0" }]));
        expect(codes(one.report)).toEqual([CX2_ISSUE.VERSION]);
        expect(one.message).toMatch(/cx importer/);
        expect(codes((await failure(JSON.stringify([{ CXVersion: "3.0" }]))).report)).toEqual([CX2_ISSUE.VERSION]);
        expect(codes((await failure(JSON.stringify([{ CXVersion: null }]))).report)).toEqual([CX2_ISSUE.VERSION]);
    });

    it("accepts any descriptor key order and reports unknown keys and a non-boolean hasFragments", async () => {
        const { report } = await load(
            JSON.stringify([{ hasFragments: "false", extra: 1, CXVersion: "2.0" }, { status: [{ success: true }] }]),
        );
        expect(codes(report)).toEqual([CX2_ISSUE.BAD_VALUE, CX2_ISSUE.UNKNOWN_ELEMENT]);
        expect(cx2Importer.sniff?.(new TextEncoder().encode('[{"hasFragments":false,"CXVersion":"2.0"}'))).toBe(0.97);
        expect(cx2Importer.sniff?.(new TextEncoder().encode('[ {\n "CXVersion": "2.0"'))).toBe(0.97);
        expect(cx2Importer.sniff?.(new TextEncoder().encode('[{"numberVerification":[]}'))).toBe(0);
        expect(cx2Importer.sniff?.(new TextEncoder().encode("[]"))).toBe(0);
    });

    it("checks the status: missing, malformed, failed, warning, not last", async () => {
        expect(codes((await load(cx2([{ nodes: [{ id: 1 }] }], null))).report)).toEqual([CX2_ISSUE.NO_STATUS]);
        const malformed = await load(cx2([], [{ success: "yes" }]));
        expect(codes(malformed.report)).toEqual([CX2_ISSUE.NO_STATUS]);
        expect(malformed.report.issues[0].message).toMatch(/malformed/);
        const failed = await failure(cx2([{ nodes: [{ id: 1 }] }], [{ success: false, error: "out of memory" }]));
        expect(codes(failed.report)).toEqual([CX2_ISSUE.STATUS_FAILED]);
        expect(failed.message).toMatch(/out of memory/);
        expect(codes((await load(cx2([], [{ success: true, error: "partial" }]))).report)).toEqual([
            CX2_ISSUE.STATUS_WARNING,
        ]);
        // exactly one element in exactly one block: two well-formed elements, or two blocks, are malformed too
        const twice = await load(cx2([{ nodes: [{ id: 1 }] }], [{ success: true }, { success: true }]));
        expect(codes(twice.report)).toEqual([CX2_ISSUE.ASPECT_ORDER, CX2_ISSUE.NO_STATUS]);
        expect(twice.report.issues[1].message).toMatch(/2 elements/);
        expect(twice.snapshot.nodeCount).toBe(1);
        const early = JSON.stringify([{ CXVersion: "2.0" }, { status: [{ success: true }] }, { nodes: [{ id: 1 }] }]);
        const { report, snapshot } = await load(early);
        expect(codes(report)).toEqual([CX2_ISSUE.ASPECT_ORDER]);
        expect(snapshot.nodeCount).toBe(1);
    });

    it("warns about aspects after the post-metadata, a third metaData and count mismatches", async () => {
        const { report } = await load(
            cx2([
                { metaData: [{ name: "nodes", elementCount: 5 }] },
                { nodes: [{ id: 1 }] },
                {
                    metaData: [
                        { name: "nodes", elementCount: 1 },
                        { name: "edges", elementCount: 1 },
                    ],
                },
                { edges: [] },
                { metaData: [] },
            ]),
        );
        expect(codes(report)).toEqual([CX2_ISSUE.ASPECT_ORDER, CX2_ISSUE.COUNT_MISMATCH]);
        expect(report.issues.filter((i) => i.code === CX2_ISSUE.ASPECT_ORDER)).toHaveLength(2);
    });

    it("joins fragments, warning when the descriptor does not declare them", async () => {
        const blocks = [{ nodes: [{ id: 1 }] }, { edges: [{ id: 1, s: 1, t: 2 }] }, { nodes: [{ id: 2 }] }];
        const undeclared = await load(cx2(blocks));
        expect(undeclared.snapshot.nodeCount).toBe(2);
        expect(undeclared.snapshot.edgeCount).toBe(1);
        expect(codes(undeclared.report)).toEqual([CX2_ISSUE.UNDECLARED_FRAGMENTS]);
        const declared = await load(
            JSON.stringify([{ CXVersion: "2.0", hasFragments: true }, ...blocks, { status: [{ success: true }] }]),
        );
        expect(codes(declared.report)).toEqual([]);
    });

    it("skips malformed blocks and elements", async () => {
        const { snapshot, report } = await load(
            cx2([
                { nodes: [{ id: 1 }], extra: [] },
                { a: 1 },
                { nodes: [2, { id: 3 }] },
                { edges: [null, { id: 1, s: 1, t: 3 }] },
            ]),
        );
        expect(snapshot.nodeCount).toBe(2);
        expect(snapshot.edgeCount).toBe(1);
        expect(report.issues.filter((i) => i.code === CX2_ISSUE.BAD_ASPECT_BLOCK)).toHaveLength(4);
        expect(report.counts.skippedNodes).toBe(1);
        expect(report.counts.skippedEdges).toBe(1);
    });

    it("keeps opaque aspects verbatim, including one written as a single object", async () => {
        const { snapshot, report } = await load(
            cx2([{ ndexStatus: { published: true } }, { cyTableColumn: [{ applies_to: "node_table", n: "x" }] }]),
        );
        expect(codes(report)).toEqual([]);
        expect((snapshot.meta.extra.cx2 as { opaque: unknown }).opaque).toEqual({
            ndexStatus: [{ published: true }],
            cyTableColumn: [{ applies_to: "node_table", n: "x" }],
        });
    });

    it("reads a byte order mark, UTF-16 and falls back from invalid UTF-8", async () => {
        const doc = cx2([{ nodes: [{ id: 1, v: { name: "café" } }] }]);
        const utf8 = new TextEncoder().encode(doc);
        const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8]);
        expect(value((await load(bom)).snapshot, "name", 1)).toBe("café");
        const utf16 = new Uint8Array(2 + doc.length * 2);
        utf16[0] = 0xff;
        utf16[1] = 0xfe;
        for (let i = 0; i < doc.length; i++) {
            utf16[2 + 2 * i] = doc.charCodeAt(i) & 0xff;
            utf16[3 + 2 * i] = doc.charCodeAt(i) >> 8;
        }
        expect(value((await load(utf16)).snapshot, "name", 1)).toBe("café");
        const latin1 = Uint8Array.from(doc, (c) => c.charCodeAt(0));
        const fallback = await load(latin1);
        expect(codes(fallback.report)).toContain(CX2_ISSUE.ENCODING_FALLBACK);
    });

    it("stops on an aborted signal", async () => {
        const controller = new AbortController();
        controller.abort(new Error("stop"));
        await expect(load(RICH, { signal: controller.signal })).rejects.toThrow("stop");
    });
});

describe("cx2Importer: review fixes", () => {
    it("skips an element nested deeper than a graph keeps, with an ImportIssue, and reads the rest", async () => {
        // built as text: JSON.stringify itself overflows the stack on such a value
        const deep = `${"[".repeat(5000)}${"]".repeat(5000)}`;
        const { snapshot, report } = await load(
            `[{"CXVersion":"2.0"},{"nodes":[{"id":1,"v":{"a":${deep}}},{"id":2}]},{"provenance":[{"x":${deep}}]},{"status":[{"success":true}]}]`,
        );
        expect(snapshot.nodeCount).toBe(1);
        expect(codes(report)).toEqual([CX2_ISSUE.BAD_ASPECT_BLOCK]);
        expect(report.issues.map((i) => i.message).join("\n")).toMatch(/nested 5002 levels deep/);
        const first = await failure(`[{"x":{"y":${deep}}},{"status":[{"success":true}]}]`);
        expect(codes(first.report)).toEqual([CX2_ISSUE.BAD_ASPECT_BLOCK, CX2_ISSUE.NO_DESCRIPTOR]);
    });

    it("warns about a partial layout when a duplicate node carries the coordinates twice", async () => {
        const { report } = await load(cx2([{ nodes: [{ id: 1, x: 1, y: 1 }, { id: 1, x: 2, y: 2 }, { id: 2 }] }]));
        expect(codes(report)).toEqual([CX2_ISSUE.DUPLICATE_NODE, CX2_ISSUE.PARTIAL_LAYOUT]);
        expect(report.issues[1].message).toMatch(/1 of 2 node/);
    });

    it("warns about z without x and y, keeping it in the z column", async () => {
        const { snapshot, report } = await load(cx2([{ nodes: [{ id: 1, z: 3 }] }]));
        expect(value(snapshot, "z", 1)).toBe(3);
        expect(snapshot.nodes.byRole("position")).toBeNull();
        expect(codes(report)).toEqual([CX2_ISSUE.PARTIAL_LAYOUT]);
        expect(report.issues[0].message).toMatch(/z without x and y/);
    });

    it("keeps the default of a declaration whose type CX2 does not define", async () => {
        const typed = await load(
            cx2([
                { attributeDeclarations: [{ nodes: { when: { d: "date", v: "2020" }, n: { d: "date", v: 1 } } }] },
                { nodes: [{ id: 1, v: { when: "2021", n: "x" } }, { id: 2 }] },
            ]),
        );
        const when = typed.snapshot.nodes.get("when");
        expect(when?.meta.dtype).toBe("string");
        expect(when?.meta.default).toBe("2020");
        expect(when?.value(typed.snapshot.ids.indexOf(2))).toBe("2020");
        // a default that does not fit the inferred type is reported, not kept
        expect(typed.snapshot.nodes.get("n")?.meta.default).toBeUndefined();
        expect(codes(typed.report)).toEqual([CX2_ISSUE.UNKNOWN_ATTR_TYPE, CX2_ISSUE.BAD_DEFAULT]);
        // no value types the column: it stays json and keeps the default as written
        const untyped = await load(
            cx2([
                { attributeDeclarations: [{ nodes: { when: { d: "date", v: { y: 2020 } } } }] },
                { nodes: [{ id: 1 }] },
            ]),
        );
        expect(untyped.snapshot.nodes.get("when")?.meta.default).toEqual({ y: 2020 });
    });

    it("tells a big edge id (stored as the nearest double) from a big node id (kept as digits)", async () => {
        const text = `[{"CXVersion":"2.0"},{"nodes":[{"id":9007199254740993}]},{"edges":[{"id":9007199254740995,"s":9007199254740993,"t":9007199254740993}]},{"status":[{"success":true}]}]`;
        const { snapshot, report } = await load(text);
        expect(snapshot.ids.indexOf("9007199254740993")).toBe(0);
        const precision = report.issues.filter((i) => i.code === CX2_ISSUE.PRECISION).map((i) => i.message);
        expect(precision).toHaveLength(2);
        expect(precision[0]).toMatch(/kept as its digits/);
        expect(precision[1]).toMatch(/edge 9007199254740995: the edge id .* nearest double/);
    });

    it("checks only the element's own id keys for a non-integer literal, not keys inside v", async () => {
        const text = `[{"CXVersion":"2.0"},{"nodes":[{"v":{"x":1.5},"id":1},{"id":2}]},{"edges":[{"v":{"s":2.5},"id":3,"s":1,"t":2}]},{"status":[{"success":true}]}]`;
        const { report } = await load(text);
        expect(codes(report)).not.toContain(CX2_ISSUE.ID_TEXT_TYPE);
    });
});

describe("cx2Importer: nodes and edges (research-cx2.md 4.2)", () => {
    it("applies the CX id rule: strings and non-integer literals of integers, big ids, bad ids", async () => {
        const doc = `[{"CXVersion":"2.0"},{"nodes":[{"id":"5"},{"id":6.0},{"id":9007199254740993},{"id":0},{"id":-4},{"id":1.5},{"id":"a"},{"id":true},{}]},{"status":[{"success":true}]}]`;
        const { snapshot, report } = await load(doc);
        expect(snapshot.ids.toArray()).toEqual([5, 6, "9007199254740993", 0, -4]);
        expect(snapshot.meta.idType).toBe("mixed");
        expect(codes(report)).toEqual([
            CX2_ISSUE.ID_TEXT_TYPE,
            CX2_ISSUE.PRECISION,
            CX2_ISSUE.INVALID_ID,
            CX2_ISSUE.MISSING_ID,
        ]);
        expect(report.counts.skippedNodes).toBe(4);
    });

    it('merges a duplicate node (1 and "1" are one node) and reports unknown keys once', async () => {
        const { snapshot, report } = await load(
            cx2([
                {
                    nodes: [
                        { id: 1, label: "x", v: { a: 1 } },
                        { id: "1", label: "y", v: { b: 2 } },
                    ],
                },
            ]),
        );
        expect(snapshot.nodeCount).toBe(1);
        expect(value(snapshot, "a", 1)).toBe(1);
        expect(value(snapshot, "b", 1)).toBe(2);
        expect(report.issues.filter((i) => i.code === CX2_ISSUE.UNKNOWN_ELEMENT)).toHaveLength(1);
        expect(codes(report)).toContain(CX2_ISSUE.DUPLICATE_NODE);
    });

    it("reports edges without an id or an endpoint, duplicate edge ids and dangling endpoints", async () => {
        const { snapshot, report } = await load(
            cx2([
                {
                    edges: [
                        { id: 1, s: 1, t: 2 },
                        { s: 1, t: 2 },
                        { id: 2, s: 1 },
                        { id: 1, s: 2, t: 1 },
                        { id: 3, s: 1, t: 99 },
                        { id: 4, s: 2, t: 2, w: 1 },
                        { id: 5, s: 1, t: 2 },
                    ],
                },
                { nodes: [{ id: 1 }, { id: 2 }] },
            ]),
        );
        expect(snapshot.edgeCount).toBe(3);
        expect(snapshot.selfLoopCount).toBe(1);
        expect(snapshot.flags.multigraph).toBe(true);
        expect(codes(report).sort()).toEqual(
            [
                CX2_ISSUE.UNKNOWN_ELEMENT,
                CX2_ISSUE.MISSING_ID,
                CX2_ISSUE.MISSING_ENDPOINT,
                CX2_ISSUE.DUPLICATE_EDGE_ID,
                CX2_ISSUE.UNKNOWN_NODE,
            ].sort(),
        );
    });

    it("enforces addMissingNodes false itself, through the registry and through a caller's sink", async () => {
        const doc = cx2([{ nodes: [{ id: 1 }] }, { edges: [{ id: 1, s: 1, t: 2 }] }]);
        const registry = await importGraph(doc, { format: "cx2" });
        expect(registry.snapshot.edgeCount).toBe(0);
        expect(codes(registry.report)).toEqual([CX2_ISSUE.UNKNOWN_NODE]);
        const caller = await load(doc, undefined, { addMissingNodes: true });
        expect(caller.snapshot.edgeCount).toBe(0);
        expect(codes(caller.report)).toEqual([CX2_ISSUE.UNKNOWN_NODE]);
        const created = await load(doc, { addMissingNodes: true });
        expect(created.snapshot.ids.toArray()).toEqual([1, 2]);
        expect(created.snapshot.edgeCount).toBe(1);
        expect(created.report.counts.nodes).toBe(2);
    });

    it("reads coordinates: partial layouts, half coordinates, non-numbers, the legacy cartesianLayout", async () => {
        const partial = await load(
            cx2([{ nodes: [{ id: 1, x: 1, y: 2 }, { id: 2 }, { id: 3, x: 4 }, { id: 4, x: "1", y: 2 }] }]),
        );
        expect(codes(partial.report)).toEqual([CX2_ISSUE.PARTIAL_LAYOUT, CX2_ISSUE.BAD_VALUE]);
        expect(partial.report.issues.filter((i) => i.code === CX2_ISSUE.PARTIAL_LAYOUT)).toHaveLength(2);
        expect(partial.snapshot.nodes.byRole("position")?.isSet(1)).toBe(false);
        const legacy = await load(
            cx2([
                { nodes: [{ id: 1 }, { id: 2 }] },
                { cartesianLayout: [{ node: 1, x: 5, y: 6, z: 2 }, { node: 9, x: 1, y: 1 }, { x: 1 }] },
            ]),
        );
        expect(Array.from(legacy.snapshot.nodes.byRole("position")?.value(0) as ArrayLike<number>)).toEqual([5, -6, 0]);
        expect(value(legacy.snapshot, "z", 1)).toBe(2);
        expect(codes(legacy.report)).toEqual([
            CX2_ISSUE.BAD_VALUE,
            CX2_ISSUE.PARTIAL_LAYOUT,
            CX2_ISSUE.DANGLING_REFERENCE,
        ]);
        const kept = await load(
            cx2([{ nodes: [{ id: 1, x: 0, y: 0 }] }, { cartesianLayout: [{ node: 1, x: 5, y: 6 }] }]),
        );
        expect(codes(kept.report)).toEqual([CX2_ISSUE.LEGACY_LAYOUT]);
        expect(Array.from(kept.snapshot.nodes.byRole("position")?.value(0) as ArrayLike<number>)).toEqual([0, 0, 0]);
        expect((kept.snapshot.meta.extra.cx2 as { opaque: object }).opaque).toHaveProperty("cartesianLayout");
    });

    it("ignores defaultDirected, applies the ids option and restores mangled ids", async () => {
        const doc = cx2([
            { attributeDeclarations: [{ nodes: { "graphty:originalId": { d: "string" } } }] },
            { nodes: [{ id: 0, v: { "graphty:originalId": "alpha" } }, { id: 1 }] },
            { edges: [{ id: 0, s: 0, t: 1 }] },
        ]);
        const restored = await load(doc, { defaultDirected: false });
        expect(restored.snapshot.ids.toArray()).toEqual(["alpha", 1]);
        expect(restored.snapshot.nodes.get("graphty:originalId")).toBeNull();
        expect(restored.snapshot.directed).toBe(true);
        expect(codes(restored.report)).toEqual([CX2_ISSUE.OPTION_IGNORED]);
        const kept = await load(doc, { restoreMangledIds: false, ids: "string" });
        expect(kept.snapshot.ids.toArray()).toEqual(["0", "1"]);
        expect(value(kept.snapshot, "graphty:originalId", "0")).toBe("alpha");
    });
});

describe("cx2Importer: attributes and declarations (research-cx2.md 4.3)", () => {
    it("infers undeclared attributes and columns of an unknown type, with one warning per column", async () => {
        const { snapshot, report } = await load(
            cx2([
                { attributeDeclarations: [{ nodes: { when: { d: "date" }, untyped: {} } }] },
                {
                    nodes: [
                        { id: 1, v: { n: "a", k: 1, when: "2020", untyped: "x" } },
                        { id: 2, v: { n: "b", k: 2.5 } },
                    ],
                },
                { networkAttributes: [{ name: "N", extra: [1, 2] }] },
            ]),
        );
        expect(value(snapshot, "n", 2)).toBe("b");
        expect(snapshot.nodes.get("k")?.dtype).toBe("f64");
        expect(value(snapshot, "when", 1)).toBe("2020");
        expect(value(snapshot, "untyped", 1)).toBe("x");
        expect(snapshot.graph.get("extra")?.value(0)).toEqual([1, 2]);
        expect(report.issues.filter((i) => i.code === CX2_ISSUE.UNDECLARED_ATTRIBUTE).map((i) => i.element)).toEqual([
            "n",
            "k",
            "name",
            "extra",
        ]);
        expect(report.issues.filter((i) => i.code === CX2_ISSUE.UNKNOWN_ATTR_TYPE)).toHaveLength(2);
    });

    it("reads the Python type spellings ndex2 writes without an issue", async () => {
        const { snapshot, report } = await load(
            cx2([
                {
                    attributeDeclarations: [
                        { nodes: { a: { d: "str" }, b: { d: "int" }, c: { d: "bool" }, e: { d: "float" } } },
                    ],
                },
                { nodes: [{ id: 1, v: { a: "x", b: 1, c: true, e: 2.5 } }] },
            ]),
        );
        expect(codes(report)).toEqual([]);
        expect(["a", "b", "c", "e"].map((n) => snapshot.nodes.get(n)?.dtype)).toEqual(["string", "i32", "bool", "f64"]);
        expect(snapshot.nodes.get("b")?.meta.origin?.type).toBe("integer");
    });

    it("reports a value of the wrong type as E_BAD_VALUE and leaves the cell unset", async () => {
        const nodes = {
            nodes: {
                d: { d: "double" },
                i: { d: "integer" },
                b: { d: "boolean" },
                l: { d: "list_of_double" },
                s: { d: "string", v: "dflt" },
            },
        };
        const bad = [
            { d: "3.5" },
            { i: 3.7 },
            { i: 2147483648 },
            { b: "true" },
            { l: 1.5 },
            { l: [1, "2"] },
            { l: [1, null] },
            { d: "NaN" },
            { s: 5 },
        ];
        const doc = cx2([
            { attributeDeclarations: [nodes] },
            { nodes: [...bad.map((v, k) => ({ id: k, v })), { id: 50, v: { i: 3.0, s: null, d: "NEG" } }] },
        ]).replace('"NEG"', "-0");
        const { snapshot, report } = await load(doc);
        expect(report.issues.filter((i) => i.code === CX2_ISSUE.BAD_VALUE)).toHaveLength(bad.length);
        for (let k = 0; k < bad.length; k++) {
            const [name] = Object.keys(bad[k]);
            expect(snapshot.nodes.get(name)?.isSet(snapshot.ids.indexOf(k)), name).toBe(false);
        }
        expect(value(snapshot, "i", 50)).toBe(3);
        expect(Object.is(value(snapshot, "d", 50), -0)).toBe(true);
        // null leaves the row unset, so the declared default answers
        expect(snapshot.nodes.get("s")?.value(snapshot.ids.indexOf(50))).toBe("dflt");
    });

    it('keeps longs beyond 2^53 as the nearest double, or as text under long: "string"', async () => {
        const doc = `[{"CXVersion":"2.0"},{"attributeDeclarations":[{"nodes":{"big":{"d":"long"},"bigs":{"d":"list_of_long"}}}]},{"nodes":[{"id":1,"v":{"big":12345678901234567891,"bigs":[1,12345678901234567891]}}]},{"status":[{"success":true}]}]`;
        const asDouble = await load(doc);
        expect(value(asDouble.snapshot, "big", 1)).toBe(Number("12345678901234567891"));
        expect(codes(asDouble.report)).toEqual([CX2_ISSUE.PRECISION]);
        const asText = await load(doc, { long: "string" });
        expect(value(asText.snapshot, "big", 1)).toBe("12345678901234567891");
        expect(value(asText.snapshot, "bigs", 1)).toEqual(["1", "12345678901234567891"]);
        expect(codes(asText.report)).toEqual([]);
    });

    it("handles aliases: equal to the name, bypassed, both given, conflicting, on network attributes", async () => {
        const { snapshot, report } = await load(
            cx2([
                {
                    attributeDeclarations: [
                        {
                            networkAttributes: { title: { d: "string", a: "t", v: "x" } },
                            nodes: {
                                n: { d: "string", a: "n" },
                                full: { d: "string", a: "f" },
                                other: { d: "string", a: "n" },
                                clash: { d: "string", a: "full" },
                            },
                        },
                    ],
                },
                { networkAttributes: [{ title: "T" }] },
                {
                    nodes: [
                        { id: 1, v: { n: "one", full: "bypassed" } },
                        { id: 2, v: { f: "alias", full: "full" } },
                    ],
                },
            ]),
        );
        expect(value(snapshot, "n", 1)).toBe("one");
        expect(value(snapshot, "full", 1)).toBe("bypassed");
        expect(value(snapshot, "full", 2)).toBe("alias");
        expect(snapshot.graph.get("title")?.value(0)).toBe("T");
        expect(codes(report)).toEqual([
            CX2_ISSUE.NETWORK_DECLARATION,
            CX2_ISSUE.ALIAS_CONFLICT,
            CX2_ISSUE.ALIAS_BYPASSED,
            CX2_ISSUE.DUPLICATE_ATTRIBUTE,
        ]);
        expect(report.issues.filter((i) => i.code === CX2_ISSUE.ALIAS_CONFLICT)).toHaveLength(2);
    });

    it("reads declarations after the elements, merges fragments and reports conflicting redeclarations", async () => {
        const { snapshot, report } = await load(
            JSON.stringify([
                { CXVersion: "2.0", hasFragments: true },
                { nodes: [{ id: 1, v: { n: "late", s: 2 } }] },
                { attributeDeclarations: [{ nodes: { name: { d: "string", a: "n" } } }] },
                { attributeDeclarations: [{ nodes: { s: { d: "double" }, name: { d: "integer" } } }] },
                { status: [{ success: true }] },
            ]),
        );
        expect(value(snapshot, "name", 1)).toBe("late");
        expect(snapshot.nodes.get("s")?.dtype).toBe("f64");
        expect(codes(report)).toEqual([CX2_ISSUE.ASPECT_ORDER, CX2_ISSUE.DECLARATION_CONFLICT]);
    });

    it("coerces a numeric-string default, drops a bad one and declares columns no element fills", async () => {
        const { snapshot, report } = await load(
            cx2([
                {
                    attributeDeclarations: [
                        {
                            nodes: {
                                level: { d: "double", v: "0.0" },
                                tag: { d: "string", v: 3 },
                                empty: { d: "list_of_string", v: [] },
                            },
                        },
                    ],
                },
                { nodes: [{ id: 1 }] },
            ]),
        );
        expect(snapshot.nodes.get("level")?.meta.default).toBe(0);
        expect(snapshot.nodes.get("tag")?.meta.default).toBeUndefined();
        expect(snapshot.nodes.get("empty")?.meta.default).toEqual([]);
        expect(report.issues.filter((i) => i.code === CX2_ISSUE.BAD_DEFAULT)).toHaveLength(2);
    });

    it("reads the reserved key id in v and attributes named like the coordinates", async () => {
        const { snapshot, report } = await load(
            cx2([{ nodes: [{ id: 1, x: 1, y: 2, v: { id: "inner", x: "attr", z: 9 } }] }, { edges: [] }]),
        );
        expect(value(snapshot, "id", 1)).toBe("inner");
        expect(value(snapshot, "x", 1)).toBe("attr");
        expect(value(snapshot, "z", 1)).toBe(9);
        expect(codes(report)).toContain(CX2_ISSUE.RESERVED_KEY);
    });

    it("renames a bypass column whose name an attribute holds, and reports dangling bypasses", async () => {
        const { snapshot, report } = await load(
            cx2([
                { attributeDeclarations: [{ nodes: { NODE_SIZE: { d: "string" } } }] },
                { nodes: [{ id: 1, v: { NODE_SIZE: "big" } }] },
                {
                    nodeBypasses: [
                        { id: 1, v: { NODE_SIZE: 12, NODE_LABEL_FONT_FACE: { FONT_FAMILY: "serif" } } },
                        { id: 9, v: {} },
                        3,
                    ],
                },
                { edgeBypasses: [{ id: 5, v: { EDGE_WIDTH: 1 } }] },
            ]),
        );
        expect(value(snapshot, "NODE_SIZE", 1)).toBe("big");
        expect(snapshot.nodes.names()).toContain("NODE_SIZE#2");
        expect(value(snapshot, "NODE_LABEL_FONT_FACE", 1)).toEqual({ FONT_FAMILY: "serif" });
        expect(codes(report)).toEqual([
            CX2_ISSUE.BAD_ASPECT_BLOCK,
            CX2_ISSUE.COLUMN_RENAMED,
            CX2_ISSUE.DANGLING_REFERENCE,
        ]);
        expect(report.issues.filter((i) => i.code === CX2_ISSUE.DANGLING_REFERENCE)).toHaveLength(2);
    });

    it("never lets a bypass overwrite an attribute of its name, even of the same type", async () => {
        const { snapshot, report } = await load(
            cx2([
                { attributeDeclarations: [{ nodes: { NODE_LABEL: { d: "string" } } }] },
                { nodes: [{ id: 1, v: { NODE_LABEL: "attribute" } }] },
                { nodeBypasses: [{ id: 1, v: { NODE_LABEL: "bypass" } }] },
            ]),
        );
        expect(value(snapshot, "NODE_LABEL", 1)).toBe("attribute");
        expect(value(snapshot, "NODE_LABEL#2", 1)).toBe("bypass");
        expect(codes(report)).toEqual([CX2_ISSUE.COLUMN_RENAMED]);
    });

    it("reads the first networkAttributes element and reports the others", async () => {
        const { snapshot, report } = await load(cx2([{ networkAttributes: [{ name: "first" }, { name: "second" }] }]));
        expect(snapshot.meta.name).toBe("first");
        expect(codes(report)).toContain(CX2_ISSUE.EXTRA_ELEMENTS);
    });

    it("keeps visualEditorProperties in both forms and warns about extra style elements", async () => {
        const { snapshot, report } = await load(
            cx2([{ visualEditorProperties: [{ properties: { nodeSizeLocked: true } }, { nodeSizeLocked: false }] }]),
        );
        expect(
            (snapshot.meta.extra.cx2 as { opaque: Record<string, unknown[]> }).opaque.visualEditorProperties,
        ).toHaveLength(2);
        expect(codes(report)).toEqual([CX2_ISSUE.STYLES_NOT_IMPORTED, CX2_ISSUE.EXTRA_ELEMENTS]);
    });
});
