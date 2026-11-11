/**
 * A position column's coordinate system (design section 5.2): declared through ColumnDecl.coordinates,
 * resolved with defaults, read by coordinateSystemOf(), and carried through freeze, derived graphs,
 * a rename and the wire form.
 */

import { describe, expect, it } from "vitest";

import {
    type CoordinateSystemInput,
    coordinateSystemOf,
    fromBytes,
    GraphBuilder,
    GraphFormatError,
} from "../../src/index.js";

function build(
    coordinates: CoordinateSystemInput | undefined,
    extra?: Record<string, unknown>,
): ReturnType<GraphBuilder["freeze"]> {
    const b = new GraphBuilder({ directed: true });
    b.addEdge("a", "b");
    b.addEdge("b", "c");
    b.declareNodeColumn({ name: "pos", dtype: "f64", components: 3, role: "position", coordinates, extra });
    b.setNodeValue("pos", 0, [1, 2, 0]);
    return b.freeze();
}

describe("coordinate systems", () => {
    it("reads an undeclared column as cartesian, file units, y up, 3 dims", () => {
        const { meta } = build(undefined).nodes.require("pos");
        expect(meta.coordinates).toBeNull();
        expect(coordinateSystemOf(meta)).toEqual({
            kind: "cartesian",
            dims: 3,
            units: "file",
            yAxis: "up",
            datum: null,
            crs: null,
            order: ["x", "y", "z"],
        });
    });

    it("reads the older extra spelling when nothing is declared", () => {
        const { meta } = build(undefined, { sourceDims: 2, units: "scene", yAxis: "down" }).nodes.require("pos");
        expect(coordinateSystemOf(meta)).toMatchObject({ dims: 2, units: "scene", yAxis: "down" });
    });

    it("resolves a geographic declaration to degrees on WGS84", () => {
        const { meta } = build({ kind: "geographic", dims: 3, crs: "wgs-84-3d" }).nodes.require("pos");
        expect(meta.coordinates).toEqual({
            kind: "geographic",
            dims: 3,
            units: "degrees",
            yAxis: null,
            datum: "WGS84",
            crs: "wgs-84-3d",
            order: ["longitude", "latitude", "altitude"],
        });
        expect(coordinateSystemOf(meta)).toBe(meta.coordinates);
    });

    it("takes dims from extra.sourceDims when the declaration has none", () => {
        const { meta } = build({ yAxis: "down" }, { sourceDims: 2 }).nodes.require("pos");
        expect(meta.coordinates).toMatchObject({ kind: "cartesian", dims: 2, yAxis: "down", units: "file" });
    });

    it("survives a derived graph, a rename and the wire form", () => {
        const snapshot = build({ kind: "cartesian", units: "scene", yAxis: "down" });
        const want = snapshot.nodes.require("pos").meta.coordinates;
        expect(snapshot.inducedSubgraph(Uint32Array.of(0, 1)).snapshot.nodes.require("pos").meta.coordinates).toEqual(
            want,
        );
        const back = fromBytes(snapshot.toBytes());
        expect(back.nodes.require("pos").meta.coordinates).toEqual(want);
        back.nodes.rename("pos", "where");
        expect(back.nodes.require("where").meta.coordinates).toEqual(want);
    });

    it.each<[string, CoordinateSystemInput]>([
        ["an unknown kind", { kind: "polar" as never }],
        ["degrees on a cartesian system", { units: "degrees" }],
        ["a y axis on a geographic system", { kind: "geographic", yAxis: "up" }],
        ["a datum on a cartesian system", { datum: "WGS84" }],
        ["dims other than 2 or 3", { dims: 4 as never }],
    ])("rejects %s", (_label, coordinates) => {
        expect(() => build(coordinates)).toThrow(GraphFormatError);
    });

    it("rejects coordinates on a column that cannot hold them", () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode("a");
        try {
            b.declareNodeColumn({ name: "label", dtype: "string", coordinates: {} });
            expect.unreachable("declared");
        } catch (err) {
            expect(err).toBeInstanceOf(GraphFormatError);
            expect((err as GraphFormatError).code).toBe("E_COLUMN_TYPE");
        }
    });
});
