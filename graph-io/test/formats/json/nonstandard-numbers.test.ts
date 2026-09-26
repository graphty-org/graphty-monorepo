import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { JSON_ISSUE, jsonExporter, jsonImporter, type JsonImportOptions } from "../../../src/formats/json/index.js";
import { type CommonImportOptions, ImportError, type ImportReport } from "../../../src/types.js";

type Options = JsonImportOptions & CommonImportOptions;

async function load(text: string, options?: Options): Promise<{ s: GraphSnapshot; report: ImportReport }> {
    const b = new GraphBuilder({ directed: false, weightDtype: "f64" });
    const report = await jsonImporter.import(text, b, options);
    return { s: b.freeze(), report };
}

function codes(report: ImportReport): string[] {
    return report.issues.map((i) => i.code);
}

function ids(s: GraphSnapshot): unknown[] {
    return Array.from({ length: s.nodeCount }, (_, i) => s.ids.idOf(i));
}

function edges(s: GraphSnapshot): string[] {
    const list = s.edgeList();
    return Array.from(
        { length: s.edgeCount },
        (_, e) => `${JSON.stringify(s.ids.idOf(list.src[e]))}-${JSON.stringify(s.ids.idOf(list.dst[e]))}`,
    );
}

describe("JSON import of the NaN / Infinity tokens Python writes (issue 66)", () => {
    const doc =
        '{"directed":false,"multigraph":false,"graph":{},"nodes":[{"id":1,"x":NaN},{"id":2,"x":Infinity},{"id":3,"x":-Infinity}],"links":[{"source":1,"target":2}]}';

    it("reads NaN, Infinity and -Infinity as numbers", async () => {
        const { s, report } = await load(doc);
        expect(s.nodeCount).toBe(3);
        expect(s.edgeCount).toBe(1);
        const x = s.nodes.require("x");
        expect(x.value(0)).toBeNaN();
        expect(x.value(1)).toBe(Infinity);
        expect(x.value(2)).toBe(-Infinity);
        expect(codes(report).filter((c) => c === JSON_ISSUE.NONSTANDARD_NUMBER)).toHaveLength(1);
        expect(report.issues.find((i) => i.code === JSON_ISSUE.NONSTANDARD_NUMBER)?.message).toMatch(/NaN.*Infinity/);
    });

    it("leaves the words inside strings alone and warns nothing for a strict document", async () => {
        const { s, report } = await load(
            '{"nodes":[{"id":"NaN","label":"NaN","note":"a NaN b \\" Infinity"},{"id":"x","label":"-Infinity"}],"links":[]}',
        );
        expect(ids(s)).toEqual(["NaN", "x"]);
        expect(s.nodes.require("label").value(0)).toBe("NaN");
        expect(s.nodes.require("label").value(1)).toBe("-Infinity");
        expect(s.nodes.require("note").value(0)).toBe('a NaN b " Infinity');
        expect(codes(report)).not.toContain(JSON_ISSUE.NONSTANDARD_NUMBER);
    });

    it("reads the tokens inside arrays and nested objects", async () => {
        const { s } = await load('{"nodes":[{"id":1,"v":[NaN, 1, -Infinity],"d":{"k":Infinity}}],"links":[]}');
        expect(s.nodeCount).toBe(1);
    });

    it("still fails on invalid JSON, with the original parser message", async () => {
        for (const text of [
            '{"nodes":[{"id":1,"x":NaNa}]}',
            '{NaN: 1, "nodes": []}', '{"nodes":[{"id":1}]',
            // a leading zero is invalid JSON however many digits follow
            '{"nodes":[{"id":01234567890123456789}]}',
        ]) {
            const b = new GraphBuilder({ directed: false });
            const err = await jsonImporter.import(text, b).catch((e: unknown) => e);
            expect(err).toBeInstanceOf(ImportError);
            expect((err as ImportError).report.issues.map((i) => i.code)).toContain(JSON_ISSUE.SYNTAX);
        }
    });
});

describe("JSON import of integer ids beyond 2^53 (issue 67)", () => {
    const doc =
        '{"directed":false,"multigraph":false,"graph":{},"nodes":[{"id":9007199254740993},{"id":9007199254740992},{"id":7}],"links":[{"source":9007199254740993,"target":9007199254740992},{"source":7,"target":-9007199254740993}]}';

    it("keeps the exact digits as string ids, so distinct ids never merge", async () => {
        const { s, report } = await load(doc);
        expect(ids(s)).toEqual(["9007199254740993", "9007199254740992", 7, "-9007199254740993"]);
        expect(edges(s)).toEqual(['"9007199254740993"-"9007199254740992"', '7-"-9007199254740993"']);
        expect(codes(report)).not.toContain(JSON_ISSUE.DUPLICATE_NODE);
        const warnings = report.issues.filter((i) => i.code === JSON_ISSUE.BIG_INTEGER);
        expect(warnings).toHaveLength(1);
        expect(warnings[0].message).toContain("9007199254740993");
        expect(warnings[0].message).toContain("9007199254740992");
    });

    it("keeps safe integers numbers, and big attribute values text", async () => {
        const { s } = await load(
            '{"nodes":[{"id":9007199254740991,"big":18446744073709551617,"f":1.5e300,"g":12345678901234567.5}],"links":[]}',
        );
        expect(ids(s)).toEqual([9007199254740991]);
        expect(s.nodes.require("big").value(0)).toBe("18446744073709551617");
        expect(s.nodes.require("f").value(0)).toBe(1.5e300);
        expect(s.nodes.require("g").value(0)).toBe(Number("12345678901234567.5"));
    });

    it("leaves digit strings inside JSON strings untouched and warns nothing", async () => {
        const { s, report } = await load(
            '{"nodes":[{"id":"9007199254740993","n":"x 90071992547409930 y"}],"links":[]}',
        );
        expect(ids(s)).toEqual(["9007199254740993"]);
        expect(s.nodes.require("n").value(0)).toBe("x 90071992547409930 y");
        expect(codes(report)).not.toContain(JSON_ISSUE.BIG_INTEGER);
    });
});

describe("JSON export of integral numbers beyond 2^53", () => {
    it("writes them in exponent form so they re-import as the same numbers, not as digit text", async () => {
        const b = new GraphBuilder({ directed: false });
        b.addNode(1e20);
        b.addNode("a");
        b.addEdge(1e20, "a", 2 ** 60); // an f32 weight: the shortest f32 text
        b.setNodeValue("v", 0, -9007199254740992);
        b.setNodeValue("v", 1, 123456789012345680000);
        const text = await jsonExporter.exportToString(b.freeze());
        expect(text).toContain('"id":1e+20');
        expect(text).toContain('"v":-9.007199254740992e+15');
        expect(text).toContain('"v":1.2345678901234568e+20');
        expect(text).toContain('"weight":1.1529215e+18');
        const { s, report } = await load(text);
        expect(ids(s)).toEqual([1e20, "a"]);
        expect(s.nodes.require("v").value(0)).toBe(-9007199254740992);
        expect(s.nodes.require("v").value(1)).toBe(123456789012345680000);
        expect(codes(report)).not.toContain(JSON_ISSUE.BIG_INTEGER);
    });
});
