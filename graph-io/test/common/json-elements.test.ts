import { GraphFormatError } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    type AspectEvent,
    cxId,
    CxStructure,
    ExactInteger,
    flipY,
    inexactLiteral,
    JsonScanError,
    parseExact,
    plainJson,
    rewriteNumbers,
    scanAspects,
} from "../../src/common/json-elements.js";
import { ImportReportBuilder } from "../../src/common/report.js";
import { ImportError } from "../../src/types.js";

async function* chunksOf(text: string, size: number): AsyncGenerator<string> {
    for (let i = 0; i < text.length; i += size) {
        yield text.slice(i, i + size);
        await Promise.resolve();
    }
}

async function scan(text: string, size = text.length || 1): Promise<AspectEvent[]> {
    const out: AspectEvent[] = [];
    for await (const event of scanAspects(chunksOf(text, size))) {
        out.push(event);
    }
    return out;
}

async function scanError(text: string, size?: number): Promise<JsonScanError> {
    try {
        await scan(text, size);
    } catch (err) {
        if (err instanceof JsonScanError) {
            return err;
        }
        throw err;
    }
    throw new Error("expected a JsonScanError");
}

/** The events without line numbers, for comparing across chunk sizes. */
function shape(events: readonly AspectEvent[]): unknown[] {
    return events.map((e) => {
        const { line: _line, ...rest } = e;
        return rest;
    });
}

const DOC = `[
  {"CXVersion": "2.0", "hasFragments": false},
  {"metaData": [{"name": "nodes", "elementCount": 2}]},
  {"nodes": [ {"id": 1, "v": {"n": "a \\"q\\" ]}"}}, {"id": 2} ]},
  {"edges": []},
  {"ndexStatus": {"published": true}},
  {"status": [{"success": true}]}
]`;

describe("scanAspects", () => {
    it("yields the descriptor, blocks, elements and one-object members in order", async () => {
        const events = await scan(DOC);
        expect(events.map((e) => e.kind)).toEqual([
            "member",
            "block",
            "element",
            "block",
            "element",
            "element",
            "block",
            "member",
            "block",
            "element",
        ]);
        const nodes = events.filter((e) => e.kind === "element" && e.aspect === "nodes");
        expect(nodes.map((e) => (e.kind === "element" ? e.value : null))).toEqual([
            { id: 1, v: { n: 'a "q" ]}' } },
            { id: 2 },
        ]);
        expect(events[0]).toMatchObject({ kind: "member", block: 0, value: { CXVersion: "2.0", hasFragments: false } });
        expect(events[2]).toMatchObject({ kind: "element", aspect: "metaData", block: 1, line: 3 });
        expect(events[7]).toMatchObject({ kind: "member", block: 4, value: { ndexStatus: { published: true } } });
    });

    it("gives the same events whatever the chunk size", async () => {
        const whole = shape(await scan(DOC));
        for (const size of [1, 2, 3, 5, 7, 64]) {
            expect(shape(await scan(DOC, size)), `chunks of ${size}`).toEqual(whole);
        }
    });

    it("keeps an element's text across chunk boundaries and numbers lines", async () => {
        const text = '[\n{"nodes":[\n{"id":1,\n"v":{"s":"x\\\\"}}\n]}\n]';
        const events = await scan(text, 3);
        const element = events.find((e) => e.kind === "element");
        expect(element).toMatchObject({
            text: '{"id":1,\n"v":{"s":"x\\\\"}}',
            line: 3,
            value: { id: 1, v: { s: "x\\" } },
        });
    });

    it("keeps integers beyond 2^53 as ExactInteger", async () => {
        const events = await scan('[{"nodes":[{"id":9007199254740993,"x":1.5}]}]');
        const element = events.find((e) => e.kind === "element");
        expect(element?.kind === "element" && element.exact).toBe(true);
        const value = element?.kind === "element" ? (element.value as { id: unknown }) : null;
        expect(value?.id).toBeInstanceOf(ExactInteger);
        expect((value?.id as ExactInteger).digits).toBe("9007199254740993");
    });

    it("reports a document that is not an array as one root event", async () => {
        // an object is not read at all (a large Cytoscape.js document is refused at once)
        expect(await scan(' {"a": 1} ')).toEqual([{ kind: "root", value: undefined, object: true, line: 1 }]);
        expect(await scan('{"a": ')).toEqual([{ kind: "root", value: undefined, object: true, line: 1 }]);
        expect(await scan("5")).toEqual([{ kind: "root", value: 5, object: false, line: 1 }]);
    });

    it("yields nothing for an empty array and fails on empty input", async () => {
        expect(await scan("[ ]")).toEqual([]);
        const error = await scanError("  \n ");
        expect(error.empty).toBe(true);
    });

    it("reads every array-valued key of a block member as a block and names the others", async () => {
        // since the robustness pass: an array-valued second key is a block of its own (shared)
        const events = await scan('[{"nodes":[{"id":1}],"edges":[{"id":2}],"x":{"y":[1]}}]');
        expect(events.map((e) => e.kind)).toEqual(["block", "element", "block", "element", "extraKeys"]);
        expect(events[0]).toMatchObject({ kind: "block", aspect: "nodes", shared: false });
        expect(events[2]).toMatchObject({ kind: "block", aspect: "edges", shared: true, block: 0 });
        expect(events[4]).toMatchObject({ kind: "extraKeys", aspect: "nodes", keys: ["x"] });
    });

    it("reads the array-valued keys of a member whatever their order, and names the others", async () => {
        for (const text of ['[{"x":1,"nodes":[{"id":1}]}]', '[{"networkAttributes":{"n":"a"},"nodes":[{"id":1}]}]']) {
            const events = await scan(text);
            expect(events.map((e) => e.kind)).toEqual(["block", "element", "extraKeys"]);
            expect(events[0]).toMatchObject({ kind: "block", aspect: "nodes", shared: true });
            expect(events[1]).toMatchObject({ kind: "element", value: { id: 1 } });
            expect(events[2]).toMatchObject({
                kind: "extraKeys",
                aspect: "nodes",
                keys: [text.includes('"x"') ? "x" : "networkAttributes"],
            });
        }
    });

    it("parses members that are not blocks whole: scalars, empty objects, several keys", async () => {
        const events = await scan('[1, {}, {"CXVersion": "2.0", "hasFragments": true}, "x", [2]]');
        expect(events.map((e) => (e.kind === "member" ? e.value : e.kind))).toEqual([
            1,
            {},
            { CXVersion: "2.0", hasFragments: true },
            "x",
            [2],
        ]);
    });

    it("reports an element or a member nested deeper than graph-format keeps, without parsing it", async () => {
        const deep = `${"[".repeat(201)}${"]".repeat(201)}`;
        const ok = `${"[".repeat(199)}${"]".repeat(199)}`;
        const text = `[{"nodes":[{"v":${deep}},{"v":${ok}}]},{"x":{"y":${deep}}},${deep},{"z":[1]}]`;
        for (const size of [text.length, 7]) {
            const events = await scan(text, size);
            expect(events.map((e) => e.kind)).toEqual(["block", "deep", "element", "deep", "deep", "block", "element"]);
            expect(events[1]).toMatchObject({ kind: "deep", aspect: "nodes", block: 0, depth: 202 });
            expect(events[3]).toMatchObject({ kind: "deep", aspect: "x", block: 1 });
            expect(events[4]).toMatchObject({ kind: "deep", aspect: null, block: 2, depth: 201 });
        }
    });

    it("fails with the line of a syntax error", async () => {
        const cases: [string, RegExp, number][] = [
            ['[\n{"nodes":[\n{"id": x}]}]', /invalid JSON/, 3],
            ['[{"nodes":[{"id":1}', /ends inside the "nodes" block/, 1],
            ['[{"nodes":[{"id":1}]', /ends inside a member/, 1],
            ['[{"nodes":[{"id":1}]}', /before its closing bracket/, 1],
            ['[{"nodes":[{"id":"ab', /ends inside a string/, 1],
            ['[{"nodes":[{"id":1} {"id":2}]}]', /expected "," or "]" in the "nodes" block/, 1],
            ['[{"a":[]} {"b":[]}]', /expected "," or "]", found "\{"/, 1],
            ['[{"nodes":[]},]', /unexpected "\]"/, 1],
            ['[{"nodes" []}]', /expected ":"/, 1],
            ['[{"nodes":[]}]\n]', /after the closing bracket/, 2],
            ['"a" x', /after the document/, 1],
            ['[{"nodes":[] "x"}]', /expected "," or "\}"/, 1],
            ['[{"x":1 "nodes":[]}]', /expected "," or "\}"/, 1],
            ['[{"metaData":[{"name":"nodes"}}]}]', /expected "," or "\]" in the "metaData" block, found "\}"/, 1],
        ];
        for (const [text, message, line] of cases) {
            for (const size of [text.length, 2]) {
                const error = await scanError(text, size);
                expect(error.message, text).toMatch(message);
                expect(error.line, text).toBe(line);
            }
        }
    });
});

describe("rewriteNumbers / parseExact / plainJson", () => {
    it("quotes integers beyond 2^53 in value positions only", () => {
        const scanResult = rewriteNumbers(
            '{"a": 12345678901234567890, "b": "12345678901234567890", "c": [1.5e300, NaN]}',
        );
        expect(scanResult.bigIntegers).toEqual(["12345678901234567890"]);
        expect(scanResult.tokens).toEqual(new Set(["NaN"]));
        expect(rewriteNumbers("[NaN]", { nonstandard: false }).tokens.size).toBe(0);
    });

    it("parses exactly, and plainJson turns ExactInteger back into numbers", () => {
        expect(parseExact('{"a": 1}')).toEqual({ value: { a: 1 }, exact: false });
        expect(parseExact('{"a": "1234567890123456789"}')).toEqual({
            value: { a: "1234567890123456789" },
            exact: false,
        });
        const { value, exact } = parseExact('{"a": [-12345678901234567890]}');
        expect(exact).toBe(true);
        const lost: string[] = [];
        expect(plainJson(value, (d) => lost.push(d))).toEqual({ a: [Number("-12345678901234567890")] });
        expect(lost).toEqual(["-12345678901234567890"]);
        expect(JSON.stringify(new ExactInteger("9007199254740993"))).toBe("9007199254740992");
    });
});

describe("the CX id rule (design section 1.0.2)", () => {
    it("reads safe integers, exact big integers and decimal-integer strings", () => {
        expect(cxId(5)).toEqual({ id: 5, note: null });
        expect(cxId(-0)).toEqual({ id: 0, note: null });
        expect(cxId(1000, true)).toEqual({ id: 1000, note: "text" });
        expect(cxId("12")).toEqual({ id: 12, note: "text" });
        expect(cxId(new ExactInteger("9007199254740993"))).toEqual({ id: "9007199254740993", note: "precision" });
        expect(cxId("9007199254740993")).toEqual({ id: "9007199254740993", note: "precision" });
    });

    it("refuses anything else with E_INVALID_ID", () => {
        for (const raw of [1.5, "01", " 1", "-0", "a", true, null, {}, 2 ** 60]) {
            expect(() => cxId(raw), JSON.stringify(raw)).toThrow(GraphFormatError);
        }
    });

    it("tells a non-integer literal from the parsed value", () => {
        expect(inexactLiteral('{"id": 5.0, "s": 1}', "id")).toBe(true);
        expect(inexactLiteral('{"@id":1e3}', "@id")).toBe(true);
        expect(inexactLiteral('{"id": 5}', "id")).toBe(false);
        expect(inexactLiteral('{"s": 1}', "id")).toBe(false);
        // only the element's own key counts: not a key nested in v, not a value spelled like the key
        expect(inexactLiteral('{"v": {"id": 5.5}, "id": 2}', "id")).toBe(false);
        expect(inexactLiteral('{"v": {"s": 1.5}, "s": 1, "t": 2.0}', "s")).toBe(false);
        expect(inexactLiteral('{"v": {"s": 1.5}, "s": 1, "t": 2.0}', "t")).toBe(true);
        expect(inexactLiteral('{"i": "s", "s": 1e0}', "s")).toBe(true);
        expect(inexactLiteral('{"n": "a\\"s\\"", "s": 1}', "s")).toBe(false);
        expect(flipY(0)).toBe(0);
        expect(Object.is(flipY(-0), 0)).toBe(true);
        expect(flipY(3)).toBe(-3);
    });
});

describe("CxStructure", () => {
    it("checks the order, the declared counts and the status", () => {
        const report = new ImportReportBuilder("cx2", 100);
        const s = new CxStructure(report);
        s.block("metaData", 1);
        s.element("metaData", { name: "nodes", elementCount: 3 }, 1);
        s.element("metaData", { name: "edges", elementCount: 0 }, 1);
        s.block("nodes", 2);
        s.element("nodes", {}, 2);
        s.block("metaData", 3);
        s.block("edges", 4);
        s.block("metaData", 5);
        s.block("status", 6);
        s.element("status", { success: true, error: "careful" }, 6);
        s.block("x", 7);
        s.checkCounts();
        const issues = report.finish().issues.map((i) => `${i.code}: ${i.message}`);
        expect(issues).toEqual([
            'W_ASPECT_ORDER: the "edges" block comes after the post-metadata, where only status is allowed; it is read',
            "W_ASPECT_ORDER: 3 metaData blocks; a document has at most two (pre and post)",
            "W_STATUS_WARNING: the producer reports a warning: careful",
            'W_ASPECT_ORDER: the "x" block comes after the status block, which must be last; it is read',
            'W_COUNT_MISMATCH: metaData declares 3 "nodes" elements; 1 was read',
        ]);
        expect(s.hasStatus).toBe(true);
        expect(s.statusWellFormed()).toBe(true);
    });

    it("fails on success false with the producer's text", () => {
        const report = new ImportReportBuilder("cx", 100);
        const s = new CxStructure(report);
        s.block("status", 1);
        expect(() => s.element("status", { success: false, error: "disk full" }, 1)).toThrow(ImportError);
        expect(report.issues.map((i) => [i.code, i.message])).toEqual([
            ["E_STATUS_FAILED", "the producer marked the document as failed: disk full"],
        ]);
    });
});
