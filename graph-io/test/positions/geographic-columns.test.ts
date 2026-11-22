/**
 * CSV and plain JSON latitude and longitude columns read as a geographic position column (issue #2003); the plain
 * columns stay, and a numeric pair that is not a place on the Earth is left alone.
 */
import { coordinateSystemOf, type GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { checkExport, exportGraphToString, importGraph } from "../../src/index.js";
import { geographicColumnNames } from "../../src/positions/index.js";

const csv = async (text: string): Promise<GraphSnapshot> =>
    (await importGraph(text, { format: "csv", table: "nodes" })).snapshot;
const json = async (doc: unknown): Promise<GraphSnapshot> =>
    (await importGraph(JSON.stringify(doc), { format: "json" })).snapshot;

/**
 * Each node's [longitude, latitude, altitude] in the position column, by id.
 * @param s - the snapshot
 * @returns the triples, null for a node without one
 */
function lonLat(s: GraphSnapshot): Record<string, number[] | null> {
    const column = s.nodes.byRole("position");
    assert.isNotNull(column);
    const out: Record<string, number[] | null> = {};
    for (let row = 0; row < s.nodeCount; row++) {
        out[String(s.ids.idOf(row))] = column.isSet(row) ? Array.from(column.value(row) as ArrayLike<number>) : null;
    }
    return out;
}

describe("latitude and longitude columns", () => {
    it("CSV: lat / lon become a geographic position column, the plain columns kept", async () => {
        const s = await csv("id,name,lat,lon\nsea,Seattle,47.6,-122.3\nlon,London,51.5,-0.1\nx,Nowhere,,\n");
        const column = s.nodes.byRole("position");
        assert.isNotNull(column);
        const system = coordinateSystemOf(column.meta);
        assert.strictEqual(system.kind, "geographic");
        assert.strictEqual(system.dims, 2);
        assert.deepEqual(lonLat(s), { sea: [-122.3, 47.6, 0], lon: [-0.1, 51.5, 0], x: null });
        assert.isNotNull(s.nodes.get("lat"));
        assert.isNotNull(s.nodes.get("lon"));
    });

    it("CSV: Latitude / Longitude / altitude in any case give three dimensions", async () => {
        const s = await csv("id,Latitude,Longitude,altitude\na,10,20,300\n");
        const column = s.nodes.byRole("position");
        assert.isNotNull(column);
        assert.strictEqual(coordinateSystemOf(column.meta).dims, 3);
        assert.deepEqual(lonLat(s), { a: [20, 10, 300] });
    });

    it("JSON: a node list's latitude / lng become a geographic position column", async () => {
        const s = await json({
            nodes: [
                { id: "a", latitude: -33.9, lng: 151.2 },
                { id: "b", latitude: 35.7, lng: 139.7 },
            ],
            links: [{ source: "a", target: "b" }],
        });
        const column = s.nodes.byRole("position");
        assert.isNotNull(column);
        assert.strictEqual(coordinateSystemOf(column.meta).kind, "geographic");
        assert.deepEqual(lonLat(s), { a: [151.2, -33.9, 0], b: [139.7, 35.7, 0] });
    });

    it("CSV: a lat / lon pair out of range is not read as a place", async () => {
        const s = await csv("id,lat,lon\na,120,30\nb,10,20\n");
        assert.isNull(s.nodes.byRole("position"));
    });

    it("JSON: a lon column of text, or only one of the pair, is not read", async () => {
        const text = await json({ nodes: [{ id: "a", lat: 10, lon: "east" }], links: [] });
        assert.isNull(text.nodes.byRole("position"));
        const half = await json({ nodes: [{ id: "a", lat: 10, weight: 20 }], links: [] });
        assert.isNull(half.nodes.byRole("position"));
    });

    it("CSV: an ordinary numeric pair in range is not read as a place", async () => {
        const s = await csv("id,score,rank\na,45,90\nb,12,7\n");
        assert.isNull(s.nodes.byRole("position"));
    });

    it("a saved file writes the latitude and longitude columns once, never the column built from them", async () => {
        const s = await csv("id,lat,lon\na,10,20\nb,11,21\n");
        const text = await exportGraphToString(s, "json");
        assert.notInclude(text, "position");
        assert.include(await exportGraphToString(s, "gexf"), 'value="20"');
        assert.notInclude(await exportGraphToString(s, "gexf"), "viz:position");
        assert.deepEqual(
            checkExport(s, "graphml").map((n) => n.code),
            [],
        );
        // read back from the saved JSON, the pair gives the same column
        assert.deepEqual(lonLat(await json(JSON.parse(text))), lonLat(s));
    });

    it("saving a plain pair as JSON says it reads back as a geographic position column", async () => {
        const plain = (
            await importGraph(
                '<gexf xmlns="http://gexf.net/1.3" version="1.3"><graph><attributes class="node"><attribute id="0" title="latitude" type="double"/><attribute id="1" title="longitude" type="double"/></attributes><nodes><node id="a"><attvalues><attvalue for="0" value="1.5"/><attvalue for="1" value="2.5"/></attvalues></node></nodes><edges/></graph></gexf>',
                { format: "gexf" },
            )
        ).snapshot;
        assert.isNull(plain.nodes.byRole("position"));
        const note = checkExport(plain, "json").find((n) => n.code === "W_ROLE_ASSUMED");
        assert.strictEqual(note?.column, "position");
        assert.strictEqual(note?.count, 1);
    });
});

describe("geographicColumnNames", () => {
    it("finds one latitude and one longitude name in any case, with an altitude", () => {
        assert.deepEqual(geographicColumnNames(["id", "Lat", "lng"]), {
            latitude: "Lat",
            longitude: "lng",
            altitude: null,
        });
        assert.deepEqual(geographicColumnNames(["latitude", "longitude", "alt"]), {
            latitude: "latitude",
            longitude: "longitude",
            altitude: "alt",
        });
    });

    it("reads none when an axis is missing or named twice, and never reads long", () => {
        assert.isNull(geographicColumnNames(["lat"]));
        assert.isNull(geographicColumnNames(["lat", "long"]));
        assert.isNull(geographicColumnNames(["lat", "latitude", "lon"]));
    });
});
