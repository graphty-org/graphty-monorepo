/**
 * The type mapper (design section 10): 2^53 + 1 survives where the wire keeps it (typed JSON, the
 * driver's lossless Integer) under `long: "string"`, and is rounded with W_PRECISION under "f64";
 * temporals, points, lists, maps and bytes map by the rules for every transport.
 */

import neo4j from "neo4j-driver";
import { describe, expect, it } from "vitest";

import { ImportReportBuilder } from "../../../src/common/report.js";
import {
    fromDriver,
    fromNeptune,
    fromTypedJson,
    GraphNode,
    GraphRel,
    type MapContext,
} from "../../../src/sources/cypher/types-map.js";

const BIG = "9007199254740993"; // 2^53 + 1

/**
 * A map context and its report.
 * @param long - the long choice
 * @returns the context
 */
function context(long: "f64" | "string"): MapContext {
    return { long, report: new ImportReportBuilder("source:test", 100) };
}

/**
 * The codes a context's report holds.
 * @param m - the context
 * @returns the codes
 */
function codes(m: MapContext): string[] {
    return m.report.finish().issues.map((i) => i.code);
}

describe("integers past 2^53", () => {
    it("typed JSON keeps every digit under long: string", () => {
        const m = context("string");
        expect(fromTypedJson({ $type: "Integer", _value: BIG }, "big", m)).toBe(BIG);
        expect(codes(m)).toEqual([]);
    });

    it("typed JSON rounds under long: f64 and warns once per column", () => {
        const m = context("f64");
        expect(fromTypedJson({ $type: "Integer", _value: BIG }, "big", m)).toBe(9007199254740992);
        fromTypedJson({ $type: "Integer", _value: BIG }, "big", m);
        expect(codes(m)).toEqual(["W_PRECISION"]);
    });

    it("the driver's lossless Integer keeps every digit too", () => {
        const m = context("string");
        expect(fromDriver(neo4j.int(BIG), "big", m, neo4j)).toBe(BIG);
        expect(fromDriver(neo4j.int(42), "small", m, neo4j)).toBe(42);
    });

    it("Neptune's plain JSON was rounded on the wire, so it warns", () => {
        const m = context("f64");
        expect(fromNeptune(Number(BIG), "big", m)).toBe(9007199254740992);
        expect(codes(m)).toEqual(["W_PRECISION"]);
    });
});

describe("other values", () => {
    it("maps typed JSON temporals, points, lists, maps and bytes", () => {
        const m = context("f64");
        const t = (type: string, value: unknown): unknown => fromTypedJson({ $type: type, _value: value }, "c", m);
        expect(t("Date", "2026-10-17")).toBe(Date.UTC(2026, 9, 17));
        expect(t("OffsetDateTime", "2026-10-17T18:50:13.571Z")).toBe(Date.UTC(2026, 9, 17, 18, 50, 13, 571));
        expect(t("ZonedDateTime", "2015-11-21T21:40:32.142+01:00[Europe/Stockholm]")).toBe(
            Date.UTC(2015, 10, 21, 20, 40, 32, 142),
        );
        expect(t("Duration", "P1D")).toBe("P1D");
        expect(t("Point", "SRID=7203;POINT (1.0 2.0)")).toEqual({ srid: 7203, x: 1, y: 2 });
        expect(t("Point", "SRID=4979;POINT Z (1.5 2.5 3.5)")).toEqual({ srid: 4979, x: 1.5, y: 2.5, z: 3.5 });
        expect(
            t("List", [
                { $type: "Integer", _value: "1" },
                { $type: "String", _value: "a" },
            ]),
        ).toEqual([1, "a"]);
        expect(t("Map", { a: { $type: "Float", _value: "1.5" } })).toEqual({ a: 1.5 });
        expect(t("Base64", "AAE=")).toBeUndefined();
        expect(m.report.finish().issues.map((i) => i.params)).toEqual([{ type: "Base64", column: "c", as: "dropped" }]);
    });

    it("maps driver nodes, relationships, paths and temporals", () => {
        const m = context("f64");
        const a = new neo4j.types.Node(neo4j.int(1), ["A"], { n: neo4j.int(3) }, "4:x:1");
        const b = new neo4j.types.Node(neo4j.int(2), ["B"], {}, "4:x:2");
        const r = new neo4j.types.Relationship(
            neo4j.int(9),
            neo4j.int(1),
            neo4j.int(2),
            "R",
            {},
            "5:x:9",
            "4:x:1",
            "4:x:2",
        );
        const path = new neo4j.types.Path(a, b, [new neo4j.types.PathSegment(a, r, b)]);
        const mapped = fromDriver(path, "p", m, neo4j) as unknown[];
        expect(mapped).toEqual([
            new GraphNode("4:x:1", ["A"], { n: 3 }),
            new GraphRel("5:x:9", "4:x:1", "4:x:2", "R", {}),
            new GraphNode("4:x:2", ["B"], {}),
        ]);
        expect(fromDriver(new neo4j.types.Date(2026, 10, 17), "d", m, neo4j)).toBe(Date.UTC(2026, 9, 17));
        expect(fromDriver(new neo4j.types.Point(7203, 1, 2), "pt", m, neo4j)).toEqual({ srid: 7203, x: 1, y: 2 });
        expect(fromDriver(new Uint8Array([1]), "bytes", m, neo4j)).toBeUndefined();
    });

    it("maps Neptune nodes and relationships", () => {
        const m = context("f64");
        expect(
            fromNeptune(
                { "~id": "22", "~entityType": "node", "~labels": ["airport"], "~properties": { code: "SEA" } },
                "n",
                m,
            ),
        ).toEqual(new GraphNode("22", ["airport"], { code: "SEA" }));
        expect(
            fromNeptune(
                {
                    "~id": "e1",
                    "~entityType": "relationship",
                    "~start": "22",
                    "~end": "151",
                    "~type": "route",
                    "~properties": { dist: 956 },
                },
                "r",
                m,
            ),
        ).toEqual(new GraphRel("e1", "22", "151", "route", { dist: 956 }));
    });
});
