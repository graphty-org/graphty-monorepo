import { coordinateSystemOf, GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { neo4jExporter } from "../../../src/formats/neo4j/exporter.js";
import { neo4jImporter } from "../../../src/formats/neo4j/importer.js";
import { NEO4J_ISSUE } from "../../../src/formats/neo4j/index.js";
import { type ImportReport } from "../../../src/types.js";
import { expectSameSnapshot, roundTrip } from "../../helpers/roundtrip.js";

async function load(text: string): Promise<{ s: GraphSnapshot; report: ImportReport }> {
    const builder = new GraphBuilder({ directed: true });
    const report = await neo4jImporter.import(text, builder);
    return { s: builder.freeze(), report };
}

function row(s: GraphSnapshot, id: string): number[] | null {
    const column = s.nodes.byRole("position");
    const i = s.ids.requireIndex(id);
    return column?.isSet(i) === true ? Array.from(column.value(i) as ArrayLike<number>) : null;
}

describe("Neo4j points as node positions", () => {
    it("reads WGS-84 points as a geographic position column: longitude, latitude, height", async () => {
        const { s, report } = await load(
            "id:ID,name,at:point\n" +
                "lax,LAX,\"{longitude:-118.408, latitude:33.9425, crs:'WGS-84'}\"\n" +
                'jfk,JFK,"{x:-73.7789, y:40.6397, srid:4326}"\n' +
                "none,None,\n",
        );
        expect(report.issues).toEqual([]);
        const column = s.nodes.byRole("position");
        expect(column?.meta.name).toBe("at");
        expect(coordinateSystemOf(column?.meta ?? s.nodes.require("name").meta)).toMatchObject({
            kind: "geographic",
            dims: 2,
            units: "degrees",
            datum: "WGS84",
            crs: "wgs-84",
            yAxis: null,
            order: ["longitude", "latitude", "altitude"],
        });
        expect(row(s, "lax")).toEqual([-118.408, 33.9425, 0]);
        expect(row(s, "jfk")).toEqual([-73.7789, 40.6397, 0]);
        expect(row(s, "none")).toBeNull();
    });

    it("reads cartesian 3D points y up, and takes the header's crs for a point that names none", async () => {
        const { s } = await load('id:ID,p:point{crs:cartesian-3d}\na,"{x:1, y:2, z:3}"\nb,"{x:4, y:5}"\n');
        const system = coordinateSystemOf(s.nodes.byRole("position")?.meta ?? s.nodes.require("p").meta);
        expect(system).toMatchObject({ kind: "cartesian", dims: 3, yAxis: "up", crs: null });
        expect(row(s, "a")).toEqual([1, 2, 3]);
        expect(row(s, "b")).toEqual([4, 5, 0]);
    });

    it("drops a point of the other kind and a point that is not one, and keeps a second point property as JSON", async () => {
        const { s, report } = await load(
            "id:ID,p:point,q:point\n" +
                'a,"{x:1, y:2}","{x:9, y:9}"\n' +
                'b,"{latitude:1, longitude:2}",\n' +
                'c,"{x:1, y:2, z:3}",\n' +
                "d,\"{x:1, crs:'mars'}\",\n",
        );
        expect(report.issues.map((i) => i.code)).toEqual([
            NEO4J_ISSUE.POINT_CRS,
            NEO4J_ISSUE.POINT_CRS,
            NEO4J_ISSUE.COLUMN_TYPE,
        ]);
        expect(row(s, "a")).toEqual([1, 2, 0]);
        expect(row(s, "b")).toBeNull();
        expect(row(s, "c")).toEqual([1, 2, 3]);
        expect(s.nodes.value("q", 0)).toEqual({ x: 9, y: 9 });
    });

    it("writes the position back as points in its own crs, y up, and reads it back the same", async () => {
        const { s } = await load(
            "id:ID,q:point,at:point\n" + "a,,\"{longitude:-118.4, latitude:33.9, height:38, crs:'wgs-84-3d'}\"\n",
        );
        // q is the first point header, so the position; at stays JSON
        expect(s.nodes.byRole("position")).toBeNull();
        const geo = await load(
            "id:ID,at:point\n" + "a,\"{longitude:-118.4, latitude:33.9, height:38, crs:'wgs-84-3d'}\"\n",
        );
        const text = await neo4jExporter.exportToString(geo.s, { part: "nodes" });
        expect(text.split("\n")[1]).toBe("a,\"{longitude:-118.4, latitude:33.9, height:38, crs:'wgs-84-3d'}\"");
        expect(neo4jExporter.check(geo.s)).toEqual([]);
        const trip = await roundTrip(geo.s, neo4jExporter, neo4jImporter);
        expectSameSnapshot(geo.s, trip.snapshot);

        // a y-down column (yEd's) is written y up
        const b = new GraphBuilder({ directed: true });
        b.declareNodeColumn({
            name: "position",
            dtype: "f64",
            components: 3,
            role: "position",
            extra: { sourceDims: 2, yAxis: "down" },
        });
        b.setNodeValue("position", b.addNode("n"), [10, 20, 0]);
        const down = await neo4jExporter.exportToString(b.freeze(), { part: "nodes" });
        expect(down.split("\n")[1]).toBe("n,\"{x:10, y:-20, crs:'cartesian'}\"");
    });
});
