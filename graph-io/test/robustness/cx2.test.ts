/**
 * Robustness of the CX2 importer: truncation, malformed descriptors, blocks and values, and the
 * prototype-name, precision and id-restoring traps. Each test pins the exact outcome: the issue
 * codes recorded and the data kept, or the ImportError and its code. Conditions already pinned by
 * test/formats/cx2 and test/audit are not repeated here.
 */

import { GraphBuilder, type GraphBuilderOptions, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { CX2_ISSUE, cx2Importer, type Cx2ImportOptions } from "../../src/formats/cx2/index.js";
import { type CommonImportOptions, ImportError, type ImportInput, type ImportReport } from "../../src/types.js";

type Options = Cx2ImportOptions & CommonImportOptions;

interface Imported {
    snapshot: GraphSnapshot;
    report: ImportReport;
}

const DESCRIPTOR = { CXVersion: "2.0", hasFragments: false };
const STATUS = { status: [{ error: "", success: true }] };

/** A CX2 document from its aspect blocks (the descriptor and the status are added). */
function cx2(blocks: readonly Record<string, unknown>[]): string {
    return JSON.stringify([DESCRIPTOR, ...blocks, STATUS]);
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

const issuesOf = (report: ImportReport, code: string): ImportReport["issues"] =>
    report.issues.filter((i) => i.code === code);

const value = (s: GraphSnapshot, column: string, id: number | string): unknown => {
    const c = s.nodes.get(column);
    const i = s.ids.indexOf(id);
    return c === null || i < 0 || !c.isSet(i) ? undefined : c.value(i);
};

const point = (s: GraphSnapshot, id: number): number[] | undefined => {
    const p = value(s, "position", id) as ArrayLike<number> | undefined;
    return p === undefined ? undefined : Array.from(p);
};

const NODES = { nodes: [{ id: 0 }, { id: 1 }] };

describe("cx2 robustness: the stream", () => {
    it("fails on whitespace only with E_EMPTY_INPUT", async () => {
        expect(codes((await failure("  \n\t \r\n")).report)).toEqual([CX2_ISSUE.EMPTY_INPUT]);
    });

    it("fails a file cut right after the descriptor, inside the declarations or inside the status: E_SYNTAX", async () => {
        for (const text of [
            '[{"CXVersion":"2.0"},',
            '[{"CXVersion":"2.0"},{"attributeDeclarations":[{"nodes":{"a":{"d":"str',
            '[{"CXVersion":"2.0"},{"nodes":[{"id":0}]},{"status":[{"succ',
        ]) {
            expect(codes((await failure(text)).report), text).toEqual([CX2_ISSUE.SYNTAX]);
        }
    });

    it("reports a second descriptor with E_BAD_ASPECT_BLOCK and reads on", async () => {
        const { snapshot, report } = await load(JSON.stringify([DESCRIPTOR, DESCRIPTOR, NODES, STATUS]));
        expect(codes(report)).toEqual([CX2_ISSUE.BAD_ASPECT_BLOCK]);
        expect(snapshot.nodeCount).toBe(2);
    });

    it("reads a status written as one object, with W_CX2_SINGLE_OBJECT_ASPECT", async () => {
        const { snapshot, report } = await load(JSON.stringify([DESCRIPTOR, NODES, { status: { success: true } }]));
        expect(codes(report)).toEqual([CX2_ISSUE.SINGLE_OBJECT_ASPECT]);
        expect(snapshot.nodeCount).toBe(2);
    });

    it("reads a 2.x version with a patch level, a suffix or a leading space, with W_CX2_MINOR_VERSION", async () => {
        for (const version of ["2.0.1", "2.1-beta", " 2.0"]) {
            const { snapshot, report } = await load(JSON.stringify([{ CXVersion: version }, NODES, STATUS]));
            expect(codes(report), version).toEqual([CX2_ISSUE.MINOR_VERSION]);
            expect(snapshot.nodeCount).toBe(2);
        }
        expect(codes((await failure(JSON.stringify([{ CXVersion: "20" }, NODES, STATUS]))).report)).toEqual([
            CX2_ISSUE.VERSION,
        ]);
    });

    it("reads every array-valued key of a multi-aspect member, with W_MULTI_ASPECT_FRAGMENT", async () => {
        const { snapshot, report } = await load(
            JSON.stringify([DESCRIPTOR, { nodes: [{ id: 0 }], edges: [{ id: 5, s: 0, t: 0 }] }, STATUS]),
        );
        expect(codes(report)).toEqual([CX2_ISSUE.MULTI_ASPECT_FRAGMENT]);
        expect(snapshot.nodeCount).toBe(1);
        expect(snapshot.edgeCount).toBe(1);
    });

    it("skips a non-array extra key nested far too deep with E_BAD_ASPECT_BLOCK, without a stack overflow", async () => {
        const deep = `${"[".repeat(100000)}${"]".repeat(100000)}`;
        const text = `[${JSON.stringify(DESCRIPTOR)},{"nodes":[{"id":0}],"x":{"y":${deep}}},${JSON.stringify(STATUS)}]`;
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([CX2_ISSUE.BAD_ASPECT_BLOCK]);
        expect(snapshot.nodeCount).toBe(1);
    });
});

describe("cx2 robustness: values", () => {
    it("reads a bare NaN as a double with W_JSON_NONSTANDARD_NUMBER; an integer gets E_BAD_VALUE", async () => {
        const text = cx2([
            { attributeDeclarations: [{ nodes: { x: { d: "double" }, k: { d: "integer" } } }] },
            {
                nodes: [
                    { id: 0, v: { x: "@NaN", k: "@NaN" } },
                    { id: 1, v: { x: 2 } },
                ],
            },
        ]).replace(/"@NaN"/g, "NaN");
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([CX2_ISSUE.JSON_NONSTANDARD_NUMBER, CX2_ISSUE.BAD_VALUE]);
        expect(value(snapshot, "x", 0)).toBeNaN();
        expect(value(snapshot, "k", 0)).toBeUndefined();
        expect(value(snapshot, "x", 1)).toBe(2);
    });

    it("gives the line of an invalid node id", async () => {
        const text = [
            `[${JSON.stringify(DESCRIPTOR)},`,
            '{"nodes":[{"id":0},',
            '{"id":"x"}]},',
            `${JSON.stringify(STATUS)}]`,
        ].join("\n");
        const { report } = await load(text);
        expect(issuesOf(report, CX2_ISSUE.INVALID_ID).map((i) => i.line)).toEqual([3]);
    });

    it("reports an edge whose v is not an object with E_BAD_VALUE and keeps the edge", async () => {
        const { snapshot, report } = await load(
            cx2([
                NODES,
                {
                    edges: [
                        { id: 5, s: 0, t: 1, v: [1] },
                        { id: 6, s: 1, t: 0, v: "x" },
                    ],
                },
            ]),
        );
        expect(codes(report)).toEqual([CX2_ISSUE.BAD_VALUE]);
        expect(issuesOf(report, CX2_ISSUE.BAD_VALUE)).toHaveLength(2);
        expect(snapshot.edgeCount).toBe(2);
    });

    it("reports empty attribute and visual property names with E_BAD_VALUE instead of throwing", async () => {
        const { snapshot, report } = await load(
            cx2([
                { attributeDeclarations: [{ nodes: { "": { d: "string" } } }] },
                { nodes: [{ id: 0, v: { "": "x", a: "b" } }, { id: 1 }] },
                { nodeBypasses: [{ id: 0, v: { "": "x", NODE_SIZE: 3 } }] },
            ]),
        );
        expect(codes(report)).toEqual([CX2_ISSUE.BAD_VALUE, CX2_ISSUE.UNDECLARED_ATTRIBUTE]);
        expect(issuesOf(report, CX2_ISSUE.BAD_VALUE)).toHaveLength(3);
        expect(value(snapshot, "a", 0)).toBe("b");
        expect(value(snapshot, "NODE_SIZE", 0)).toBe(3);
    });

    it("records E_BAD_VALUE for a lone surrogate in an opaque aspect and in a node value, and reads on", async () => {
        const text = cx2([
            { attributeDeclarations: [{ nodes: { label: { d: "string" } } }] },
            { nodes: [{ id: 0, v: { label: "LONE" } }, { id: 1 }] },
            { foo: [{ a: "LONE" }] },
        ]).replace(/LONE/g, "x\\ud800");
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([CX2_ISSUE.BAD_VALUE]);
        expect(issuesOf(report, CX2_ISSUE.BAD_VALUE)).toHaveLength(2);
        const repaired = `x${String.fromCharCode(0xfffd)}`;
        expect(value(snapshot, "label", 0)).toBe(repaired);
        const { opaque } = snapshot.meta.extra.cx2 as { opaque: Record<string, unknown> };
        expect(opaque.foo).toEqual([{ a: repaired }]);
    });

    it("repairs a lone surrogate in an opaque element's own key, and warns when two keys become one", async () => {
        const text = cx2([{ foo: [{ KEY: 1 }] }, { nodes: [{ id: 0, v: { ONE: 1, TWO: 2 } }] }]);
        const kept = await load(text.replace("KEY", "\\ud800k").replace("ONE", "\\ud800").replace("TWO", "\\ud801"));
        expect(codes(kept.report)).toEqual([
            CX2_ISSUE.BAD_VALUE,
            CX2_ISSUE.DUPLICATE_ATTRIBUTE,
            CX2_ISSUE.UNDECLARED_ATTRIBUTE,
        ]);
        const { opaque } = kept.snapshot.meta.extra.cx2 as { opaque: Record<string, unknown> };
        expect(opaque.foo).toEqual([{ [`${String.fromCharCode(0xfffd)}k`]: 1 }]);
        expect(value(kept.snapshot, String.fromCharCode(0xfffd), 0)).toBe(2);
    });

    it("reads the array-valued keys of a block whatever their order, naming the others", async () => {
        const { snapshot, report } = await load(
            `[${JSON.stringify(DESCRIPTOR)},{"networkAttributes":{"name":"a"},"nodes":[{"id":1}]},${JSON.stringify(STATUS)}]`,
        );
        expect(codes(report)).toEqual([CX2_ISSUE.MULTI_ASPECT_FRAGMENT, CX2_ISSUE.BAD_ASPECT_BLOCK]);
        expect(snapshot.ids.toArray()).toEqual([1]);
    });

    it("reports a declaration table CX2 does not define and keeps it, also one named __proto__", async () => {
        const text = cx2([
            { attributeDeclarations: [{ nodez: { q: { d: "string" } }, PROTO: { x: 1 } }] },
            NODES,
        ]).replace('"PROTO"', '"__proto__"');
        const { snapshot, report } = await load(text);
        expect(issuesOf(report, CX2_ISSUE.UNKNOWN_ELEMENT).map((i) => i.element)).toEqual(["nodez", "__proto__"]);
        const { declarations } = snapshot.meta.extra.cx2 as { declarations: Record<string, unknown> };
        expect(declarations.nodez).toEqual({ q: { d: "string" } });
    });

    it("reports an alias that is not a string with E_BAD_VALUE and reads the full name", async () => {
        const { snapshot, report } = await load(
            cx2([
                { attributeDeclarations: [{ nodes: { label: { d: "string", a: 5 } } }] },
                { nodes: [{ id: 0, v: { label: "x" } }] },
            ]),
        );
        expect(codes(report)).toEqual([CX2_ISSUE.BAD_VALUE]);
        expect(value(snapshot, "label", 0)).toBe("x");
    });

    it("never takes an alias named like an Object.prototype member as given: the full name is read", async () => {
        for (const alias of ["toString", "constructor", "valueOf"]) {
            const { snapshot, report } = await load(
                cx2([
                    { attributeDeclarations: [{ nodes: { label: { d: "string", a: alias } } }] },
                    { nodes: [{ id: 0, v: { label: "x" } }] },
                ]),
            );
            expect(codes(report), alias).toEqual([CX2_ISSUE.ALIAS_BYPASSED]);
            expect(value(snapshot, "label", 0), alias).toBe("x");
        }
    });

    it("reads a declared type named like an Object.prototype member as unknown, inferring the column", async () => {
        const types = ["constructor", "toString", "__proto__", "list_of_constructor"];
        const { snapshot, report } = await load(
            cx2([
                { attributeDeclarations: [{ nodes: Object.fromEntries(types.map((d, i) => [`a${i}`, { d }])) }] },
                { nodes: [{ id: 0, v: Object.fromEntries(types.map((_d, i) => [`a${i}`, 7])) }] },
            ]),
        );
        expect(codes(report)).toEqual([CX2_ISSUE.UNKNOWN_ATTR_TYPE]);
        expect(issuesOf(report, CX2_ISSUE.UNKNOWN_ATTR_TYPE)).toHaveLength(4);
        for (let i = 0; i < types.length; i++) {
            expect(value(snapshot, `a${i}`, 0)).toBe(7);
        }
    });

    it("reads a nested list type as unknown with a json column", async () => {
        const { snapshot, report } = await load(
            cx2([
                { attributeDeclarations: [{ nodes: { syn: { d: "list_of_list_of_string" } } }] },
                { nodes: [{ id: 0, v: { syn: [["a"], ["b"]] } }] },
            ]),
        );
        expect(codes(report)).toEqual([CX2_ISSUE.UNKNOWN_ATTR_TYPE]);
        expect(snapshot.nodes.get("syn")?.dtype).toBe("json");
        expect(value(snapshot, "syn", 0)).toEqual([["a"], ["b"]]);
    });

    it("warns W_PRECISION for a declared or an undeclared double beyond 2^53, and an opaque one", async () => {
        const text = cx2([
            { attributeDeclarations: [{ nodes: { d1: { d: "double" } } }] },
            {
                nodes: [
                    { id: 0, v: { d1: "@BIG" } },
                    { id: 1, v: { u: "@BIG" } },
                ],
            },
        ]).replace(/"@BIG"/g, "12345678901234567891");
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([CX2_ISSUE.PRECISION, CX2_ISSUE.UNDECLARED_ATTRIBUTE]);
        expect(value(snapshot, "d1", 0)).toBe(Number("12345678901234567891"));
        expect(value(snapshot, "u", 1)).toBe(Number("12345678901234567891"));
        const opaque = await load(cx2([NODES, { foo: [{ n: "@BIG" }] }]).replace('"@BIG"', "12345678901234567891"));
        expect(codes(opaque.report)).toEqual([CX2_ISSUE.PRECISION]);
    });

    it('keeps the exact digits of a long default beyond 2^53 under long: "string"', async () => {
        const text = cx2([{ attributeDeclarations: [{ nodes: { big: { d: "long", v: "@BIG" } } }] }, NODES]).replace(
            '"@BIG"',
            "12345678901234567891",
        );
        const { snapshot, report } = await load(text, { long: "string" });
        expect(codes(report)).toEqual([]);
        expect(snapshot.nodes.get("big")?.meta.default).toBe("12345678901234567891");
    });

    it("warns W_ID_TEXT_TYPE for a non-integer id literal in a single-object nodes aspect", async () => {
        const { snapshot, report } = await load(
            `[${JSON.stringify(DESCRIPTOR)},{"nodes":{"id":1.0}},${JSON.stringify(STATUS)}]`,
        );
        expect(codes(report)).toEqual([CX2_ISSUE.SINGLE_OBJECT_ASPECT, CX2_ISSUE.ID_TEXT_TYPE]);
        expect(snapshot.ids.toArray()).toEqual([1]);
    });
});

describe("cx2 robustness: coordinates, bypasses and restored ids", () => {
    it("refuses coordinates beyond the f32 position column with E_BAD_VALUE", async () => {
        const text = cx2([
            {
                nodes: [
                    { id: 0, x: 1e39, y: 0 },
                    { id: 1, x: 0, y: "@1e400" },
                ],
            },
        ]).replace('"@1e400"', "1e400");
        const { snapshot, report } = await load(text);
        expect(codes(report)).toEqual([CX2_ISSUE.BAD_VALUE]);
        expect(issuesOf(report, CX2_ISSUE.BAD_VALUE)).toHaveLength(2);
        expect(point(snapshot, 0)).toBeUndefined();
        expect(point(snapshot, 1)).toBeUndefined();
    });

    it("warns about two bypasses setting one property of one node; the later wins", async () => {
        const { snapshot, report } = await load(
            cx2([
                NODES,
                {
                    nodeBypasses: [
                        { id: 0, v: { NODE_SIZE: 10 } },
                        { id: 0, v: { NODE_SIZE: 20 } },
                        { id: 1, v: { NODE_SIZE: 5 } },
                    ],
                },
            ]),
        );
        expect(codes(report)).toEqual([CX2_ISSUE.DUPLICATE_ATTRIBUTE]);
        expect(value(snapshot, "NODE_SIZE", 0)).toBe(20);
        expect(value(snapshot, "NODE_SIZE", 1)).toBe(5);
    });

    it("reads the first view of a legacy layout naming several, and the later of two entries for one node", async () => {
        const { snapshot, report } = await load(
            cx2([
                NODES,
                {
                    cartesianLayout: [
                        { node: 0, x: 1, y: 1, view: 5 },
                        { node: 0, x: 9, y: 9, view: 6 },
                        { node: 1, x: 2, y: 2, view: 5 },
                        { node: 1, x: 3, y: 3, view: 5 },
                    ],
                },
            ]),
        );
        expect(codes(report)).toEqual([CX2_ISSUE.DUPLICATE_ATTRIBUTE]);
        expect(issuesOf(report, CX2_ISSUE.DUPLICATE_ATTRIBUTE)).toHaveLength(2);
        expect(point(snapshot, 0)).toEqual([1, -1, 0]);
        expect(point(snapshot, 1)).toEqual([3, -3, 0]);
        const { opaque } = snapshot.meta.extra.cx2 as { opaque: Record<string, unknown[]> };
        expect(opaque.cartesianLayout).toHaveLength(4);
    });

    it("keeps the CX id of a second node whose original id is already restored, with W_DUPLICATE_NODE", async () => {
        const { snapshot, report } = await load(
            cx2([
                {
                    nodes: [
                        { id: 1, v: { "graphty:originalId": "a" } },
                        { id: 2, v: { "graphty:originalId": "a" } },
                    ],
                },
                { edges: [{ id: 5, s: 1, t: 2 }] },
            ]),
            { restoreMangledIds: true },
        );
        expect(codes(report)).toEqual([CX2_ISSUE.DUPLICATE_NODE]);
        expect(snapshot.ids.toArray()).toEqual(["a", 2]);
        expect(snapshot.edgeCount).toBe(1);
        expect(snapshot.edgeList().src[0]).not.toBe(snapshot.edgeList().dst[0]);
    });

    it("reports an original id that is not a string with E_BAD_VALUE; the node keeps its CX id", async () => {
        const { snapshot, report } = await load(cx2([{ nodes: [{ id: 1, v: { "graphty:originalId": 7 } }] }]), {
            restoreMangledIds: true,
        });
        expect(codes(report)).toEqual([CX2_ISSUE.BAD_VALUE]);
        expect(snapshot.ids.toArray()).toEqual([1]);
    });
});
