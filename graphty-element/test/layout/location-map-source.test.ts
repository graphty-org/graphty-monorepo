/**
 * @file Where the location map layout finds its locations, and the facts the session publishes
 * from that one answer: the refusal before Apply, the recommendation, the columns a form lists
 * and the option the 2D view ignores.
 */

import { assert, describe, it } from "vitest";

import { columnFits, type ColumnValues, isLocationRefusal, resolveLocation } from "../../src/layout/locationMap/source";
import { recommendLayout } from "../../src/session/layout";
import { makeSession } from "../session/helpers";

const NONE = { location: null, latitude: null, longitude: null };

/**
 * A resolver's column reader over some columns.
 * @param columns - The columns.
 * @returns The reader.
 */
function reader(columns: readonly ColumnValues[]): (name: string) => readonly unknown[] | null {
    return (name) => columns.find((c) => c.name === name)?.values ?? null;
}

describe("resolveLocation", () => {
    const columns: ColumnValues[] = [
        { name: "label", values: ["NYC", "LON"] },
        { name: "population", values: [8_000_000, 9_000_000] },
        { name: "lat", values: [40.71, 51.51] },
        { name: "lng", values: [-74.0, -0.13] },
    ];

    it("finds both halves by name when no option is set", () => {
        const answer = resolveLocation(NONE, columns, reader(columns));
        assert.isFalse(isLocationRefusal(answer));
        assert.deepInclude(isLocationRefusal(answer) ? {} : answer.source, { latitude: "lat", longitude: "lng" });
    });

    it("fills the half of a pair that was left empty, and says which", () => {
        const answer = resolveLocation({ ...NONE, latitude: "lat" }, columns, reader(columns));
        assert.isFalse(isLocationRefusal(answer));
        if (!isLocationRefusal(answer)) {
            assert.strictEqual(answer.filled, "longitude");
            assert.deepInclude(answer.source, { latitude: "lat", longitude: "lng" });
        }
    });

    it("refuses half a pair it cannot complete, naming the missing half", () => {
        const noLon = columns.filter((c) => c.name !== "lng");
        const answer = resolveLocation({ ...NONE, latitude: "lat" }, noLon, reader(noLon));
        assert.deepStrictEqual(answer, {
            code: "layout.needs-location",
            params: { missing: "longitude", attributes: ["label", "population", "lat"] },
        });
    });

    it("refuses a graph with no location, and a named column no node carries", () => {
        const plain: ColumnValues[] = [{ name: "label", values: ["a", "b"] }];
        assert.deepInclude(resolveLocation(NONE, plain, reader(plain)), { code: "layout.needs-location" });
        assert.deepInclude(resolveLocation({ ...NONE, location: "where" }, plain, reader(plain)), {
            code: "layout.needs-location",
        });
    });

    it("takes a column most of whose values read as locations (the suppliers file: 7 of 10)", () => {
        const where = [
            "22.54, 114.06",
            "5.41, 100.33",
            "51.92, 4.48",
            "25.69, -100.32",
            "35.15, -90.05",
            "51.34, 12.37",
            "24.80 N, 120.97 E",
            undefined,
            "35.10, 129.04",
            "Chennai",
        ];
        const suppliers: ColumnValues[] = [
            { name: "label", values: where.map((_, i) => `supplier ${String(i)}`) },
            { name: "site location", values: where },
        ];
        const answer = resolveLocation(NONE, suppliers, reader(suppliers));
        assert.isFalse(isLocationRefusal(answer));
        assert.deepInclude(isLocationRefusal(answer) ? {} : answer.source, {
            kind: "location",
            column: "site location",
        });
    });

    it("never takes ZIP codes for geohashes", () => {
        const zips: ColumnValues[] = [{ name: "zip", values: ["10001", "94105", "60614", "02139"] }];
        assert.isTrue(isLocationRefusal(resolveLocation(NONE, zips, reader(zips))));
    });
});

describe("columnFits", () => {
    it("lists the columns that read as latitudes first, then the rest", () => {
        const fits = columnFits(
            [
                { name: "id", values: ["a", "b"] },
                { name: "population", values: [500, 900] },
                { name: "latitude", values: [40.7, 51.5] },
            ],
            "latitude",
        );
        assert.deepStrictEqual(
            fits.map((f) => [f.name, f.fits]),
            [
                ["latitude", true],
                ["id", false],
                ["population", false],
            ],
        );
    });
});

describe("recommendLayout with locations", () => {
    it("recommends the map for nodes with locations, with its own code", () => {
        const statistics = { nodeCount: 10, edgeCount: 9 } as Parameters<typeof recommendLayout>[0];
        const advice = recommendLayout(statistics, { locations: true });
        assert.strictEqual(advice?.layout.id, "location-map");
        assert.strictEqual(advice?.fact.code, "recommend.location-map");
        assert.notStrictEqual(recommendLayout(statistics)?.layout.id, "location-map");
    });
});

describe("the session's location facts", () => {
    it("refuses the map before Apply on a graph with no location, and recommends it on one with", () => {
        const plain = makeSession();
        plain.add(
            [
                { id: "a", label: "A" },
                { id: "b", label: "B" },
            ],
            [{ src: "a", dst: "b" }],
        );
        const refused = plain.session.estimate({ op: "layout.set", id: "location-map" });
        assert.isFalse(refused.available);
        assert.strictEqual(refused.refusal?.code, "layout.needs-location");
        assert.deepInclude(refused.refusal?.params, { layout: "location-map", missing: "location" });
        assert.notStrictEqual(plain.session.recommendLayout()?.layout.id, "location-map");
        plain.session.dispose();

        const placed = makeSession();
        placed.add(
            [
                { id: "a", latitude: 40.7, longitude: -74 },
                { id: "b", latitude: 51.5, longitude: -0.1 },
            ],
            [{ src: "a", dst: "b" }],
        );
        assert.isTrue(placed.session.estimate({ op: "layout.set", id: "location-map" }).available);
        assert.strictEqual(placed.session.recommendLayout()?.layout.id, "location-map");
        placed.session.dispose();
    });

    it("lists the columns that fit each location option first, and the rest with why not", async () => {
        const harness = makeSession();
        harness.add(
            [
                { id: "a", label: "A", latitude: 40.7, longitude: -74 },
                { id: "b", label: "B", latitude: 51.5, longitude: -0.1 },
            ],
            [],
        );
        const options = await harness.session.catalog.optionsFor("location-map");
        const latitude = options.find((o) => o.name === "latitude");
        assert.strictEqual(latitude?.values?.[0]?.value, "latitude");
        assert.isUndefined(latitude?.values?.[0]?.refusal);
        const label = latitude?.values?.find((v) => v.value === "label");
        assert.deepStrictEqual(label?.refusal, {
            code: "location.column-unfit",
            params: { role: "latitude", share: 0 },
        });
        harness.session.dispose();
    });

    it("says Surface is not in effect in the 2D view", () => {
        const harness = makeSession();
        const { layout } = harness.session;
        assert.deepInclude(layout.optionInEffect("location-map", "surface", "2d"), {
            inEffect: false,
            code: "setting.notIn2d",
        });
        assert.isTrue(layout.optionInEffect("location-map", "surface", "3d").inEffect);
        assert.isTrue(layout.optionInEffect("location-map", "extent", "2d").inEffect);
        harness.session.dispose();
    });
});
