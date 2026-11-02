/**
 * @file The location map layout's placement, in Node: reading locations from two columns or one,
 * finding them unasked, projecting onto a flat map or a globe, spreading shared places, the tray
 * for nodes with no location, and the warnings.
 */

import { createMapFrame, latLonToSphere, longitudeIn } from "babylonjs-map/projection";
import { assert, describe, it } from "vitest";

import {
    detectSource,
    type LocationSource,
    placeOnMap,
    type PlaceOptions,
    turn,
} from "../../src/layout/locationMap/place";

const OPTIONS: PlaceOptions = {
    format: "auto",
    surface: "flat",
    projection: "auto",
    extent: "data",
    size: 100,
    mapScale: 1,
    unplaced: "tray",
    overlap: "spread",
    dimensions: 2,
};

const CITIES = {
    JFK: [40.64, -73.78],
    LHR: [51.47, -0.45],
    NRT: [35.77, 140.39],
    SYD: [-33.95, 151.18],
} as const;

const ids = Object.keys(CITIES);
const columns: LocationSource = {
    kind: "columns",
    latitude: "latitude",
    longitude: "longitude",
    lat: Object.values(CITIES).map(([lat]) => lat),
    lon: Object.values(CITIES).map(([, lon]) => lon),
};

/**
 * The nodes the placement reads, with no sizes and nothing placed yet.
 * @param n - How many.
 * @param dim - Numbers per row.
 * @returns The nodes.
 */
function nodes(n: number, dim: number): { ids: string[]; sizes: null; initial: Float32Array } {
    return { ids: ids.slice(0, n), sizes: null, initial: new Float32Array(n * dim).fill(Number.NaN) };
}

describe("placeOnMap on a flat map", () => {
    it("puts each node where the frame projects it, framed to the data", () => {
        const placed = placeOnMap(columns, nodes(4, 2), OPTIONS);
        assert.equal(placed.frame.surface, "flat");
        assert.deepEqual(placed.warnings, []);
        assert.lengthOf(placed.positions, 8);
        if (placed.frame.surface !== "flat") {
            return;
        }

        const { bounds } = placed.frame;
        const frame = createMapFrame({ projection: "web-mercator", bounds, size: 100 });
        Object.values(CITIES).forEach(([lat, lon], row) => {
            // The four cities' narrowest box crosses the date line: a point west of it moves a turn east.
            const { x, y } = frame.toScene({ lat, lon: longitudeIn(lon, bounds) });
            assert.closeTo(placed.positions[2 * row], x, 1e-3);
            assert.closeTo(placed.positions[2 * row + 1], y, 1e-3);
        });
        // fitted to the data with a margin: every node inside the map, none on its edge
        for (let row = 0; row < 4; row++) {
            assert.isBelow(Math.abs(placed.positions[2 * row]), placed.frame.mapFrame.width / 2);
        }
    });

    it("lifts nodes toward the camera (-z) in 3D so they never sink into the map", () => {
        const placed = placeOnMap(columns, nodes(4, 3), { ...OPTIONS, dimensions: 3 });
        for (let row = 0; row < 4; row++) {
            assert.isBelow(placed.positions[3 * row + 2], 0);
        }
    });

    it("draws the 2D view flat even when the globe is asked for", () => {
        const placed = placeOnMap(columns, nodes(4, 2), { ...OPTIONS, surface: "globe" });
        assert.equal(placed.frame.surface, "flat");
    });

    it("reads one location column in any format, latitude first", () => {
        const source: LocationSource = {
            kind: "location",
            column: "where",
            values: ["40.64, -73.78", "51.47, -0.45"],
            named: true,
        };
        const fromColumns = placeOnMap(columns, nodes(2, 2), OPTIONS).positions;
        const fromText = placeOnMap(source, nodes(2, 2), OPTIONS).positions;
        assert.deepEqual([...fromText], [...fromColumns.subarray(0, 4)]);
    });

    it("reads a pair longitude first when latitudes would not fit, and says so", () => {
        const source: LocationSource = {
            kind: "location",
            column: "where",
            values: ["-73.78, 40.64", "151.18, -33.95"],
            named: true,
        };
        const placed = placeOnMap(source, nodes(2, 2), OPTIONS);
        assert.deepEqual(
            placed.warnings.map((w) => w.code),
            ["W_LOCATION_SWAPPED"],
        );
        assert.isTrue(placed.positions.every(Number.isFinite));
    });

    it("puts nodes with no usable location in a tray below the map, never at 0,0, and reports them", () => {
        const source: LocationSource = {
            kind: "location",
            column: "where",
            values: ["40.64, -73.78", "", "nowhere", "51.47, -0.45"],
            named: true,
        };
        const placed = placeOnMap(source, nodes(4, 2), OPTIONS);
        assert.deepEqual(placed.unplacedRows, [1, 2]);
        const unparsed = placed.warnings.find((w) => w.code === "W_LOCATION_UNPARSED");
        assert.deepInclude(unparsed?.params, { missing: 1, unparsed: 1, unplaced: 2, total: 4 });
        assert.deepEqual(unparsed?.params.ids, ["LHR", "NRT"]);
        assert.deepEqual(unparsed?.params.samples, [{ id: "NRT", value: "nowhere", code: "syntax" }]);
        if (placed.frame.surface !== "flat") {
            return;
        }

        const bottom = -placed.frame.mapFrame.height / 2;
        for (const row of [1, 2]) {
            assert.isBelow(placed.positions[2 * row + 1], bottom);
        }
        // side by side, not on top of each other
        assert.notEqual(placed.positions[2], placed.positions[4]);
    });

    it("leaves unplaced nodes where they were with unplaced: leave", () => {
        const source: LocationSource = { kind: "location", column: "where", values: ["", "1, 2"], named: true };
        const initial = new Float32Array([7, 8, Number.NaN, Number.NaN]);
        const placed = placeOnMap(source, { ids: ["a", "b"], sizes: null, initial }, { ...OPTIONS, unplaced: "leave" });
        assert.deepEqual([...placed.positions.subarray(0, 2)], [7, 8]);
    });

    it("reports out-of-range values apart from unreadable ones", () => {
        const placed = placeOnMap(
            { kind: "columns", latitude: "a", longitude: "b", lat: [95, 10], lon: [0, 10] },
            nodes(2, 2),
            OPTIONS,
        );
        assert.deepEqual(
            placed.warnings.map((w) => w.code),
            ["W_LOCATION_OUT_OF_RANGE"],
        );
    });

    it("spreads nodes at one place around it, or stacks them", () => {
        const same: LocationSource = {
            kind: "columns",
            latitude: "a",
            longitude: "b",
            lat: [10, 10, 10],
            lon: [20, 20, 20],
        };
        const spread = placeOnMap(same, nodes(3, 2), OPTIONS).positions;
        const stacked = placeOnMap(same, nodes(3, 2), { ...OPTIONS, overlap: "stack" }).positions;
        assert.notEqual(spread[0], spread[2]);
        assert.equal(spread[0], stacked[0]);
        assert.equal(stacked[0], stacked[2]);
        assert.equal(stacked[1], stacked[5]);
    });
});

describe("placeOnMap on a globe", () => {
    it("puts nodes on the sphere, turned so the data's center faces the camera", () => {
        const placed = placeOnMap(columns, nodes(4, 3), { ...OPTIONS, surface: "globe", dimensions: 3 });
        assert.equal(placed.frame.surface, "globe");
        if (placed.frame.surface !== "globe") {
            return;
        }

        for (let row = 0; row < 4; row++) {
            const r = Math.hypot(
                placed.positions[3 * row],
                placed.positions[3 * row + 1],
                placed.positions[3 * row + 2],
            );
            assert.closeTo(r, placed.frame.radius + 0.5, 1e-3); // the radius plus half the default node size
        }

        const { rotation } = placed.frame;
        // the rotation is a proper rotation: it keeps lengths
        const turned = turn(rotation, latLonToSphere({ lat: 10, lon: 20 }, 1));
        assert.closeTo(Math.hypot(...turned), 1, 1e-9);
    });

    it("brings a single place to the front, -z", () => {
        const one: LocationSource = { kind: "columns", latitude: "a", longitude: "b", lat: [40], lon: [100] };
        const placed = placeOnMap(one, nodes(1, 3), { ...OPTIONS, surface: "globe", dimensions: 3 });
        assert.closeTo(placed.positions[0], 0, 1e-3);
        assert.closeTo(placed.positions[1], 0, 1e-3);
        assert.isBelow(placed.positions[2], -100);
    });
});

describe("detectSource", () => {
    it("finds latitude and longitude columns by name", () => {
        const found = detectSource([
            { name: "city", values: ["New York"] },
            { name: "Latitude", values: [40.64] },
            { name: "lng", values: [-73.78] },
        ]);
        assert.deepInclude(found, { kind: "columns", latitude: "Latitude", longitude: "lng" });
    });

    it("finds one column a location format reads", () => {
        const found = detectSource([
            { name: "city", values: ["New York", "London"] },
            { name: "where", values: ["POINT(-73.78 40.64)", "POINT(-0.45 51.47)"] },
        ]);
        assert.deepInclude(found, { kind: "location", column: "where" });
    });

    it("never guesses geohashes from short words", () => {
        assert.isNull(detectSource([{ name: "code", values: ["jfk", "dfw", "sfb"] }]));
    });
});

describe("placeOnMap's edges of the world", () => {
    it("puts points past Web Mercator's reach in the tray and counts them out of range", () => {
        const polar: LocationSource = {
            kind: "columns",
            latitude: "a",
            longitude: "b",
            lat: [90, -89.9, 40.7, 51.5],
            lon: [0, 0, -74, -0.1],
        };
        const placed = placeOnMap(polar, nodes(4, 2), OPTIONS);
        assert.deepEqual(placed.unplacedRows, [0, 1]);
        const range = placed.warnings.find((w) => w.code === "W_LOCATION_OUT_OF_RANGE");
        assert.deepInclude(range?.params, { count: 2, unplaced: 2, total: 4 });
        // On a globe the poles are places like any other.
        const globe = placeOnMap(polar, nodes(4, 3), { ...OPTIONS, surface: "globe", dimensions: 3 });
        assert.deepEqual(globe.unplacedRows, []);
    });

    it("keeps data across the date line together: Suva to Apia is a short line", () => {
        const pacific: LocationSource = {
            kind: "columns",
            latitude: "a",
            longitude: "b",
            // The red team's Pacific: Suva, Apia, Nuku'alofa, Auckland, Honolulu, Adak,
            // Petropavlovsk, Anadyr, Nome.
            lat: [-18.14, -13.83, -21.14, -36.85, 21.31, 51.88, 53.02, 64.73, 64.5],
            lon: [178.44, -171.76, -175.2, 174.76, -157.86, -176.66, 158.65, 177.51, -165.4],
        };
        const n = 9;
        const placed = placeOnMap(
            pacific,
            { ids: Array.from({ length: n }, (_, i) => i), sizes: null, initial: new Float32Array(2 * n) },
            OPTIONS,
        );
        if (placed.frame.surface !== "flat") {
            assert.fail("flat");
            return;
        }

        const span = placed.frame.bounds[1][0] - placed.frame.bounds[0][0];
        assert.isBelow(span, 60);
        // Suva to Apia is 10 of the box's 52 degrees, not the whole map.
        const dx = placed.positions[2] - placed.positions[0];
        assert.isBelow(Math.abs(dx), placed.frame.mapFrame.width / 4);
        assert.isAbove(dx, 0, "Apia is east of Suva");
    });

    it("gives all nodes at one point the region around it, 10 degrees across", () => {
        const one: LocationSource = {
            kind: "columns",
            latitude: "a",
            longitude: "b",
            lat: [48.86, 48.86],
            lon: [2.35, 2.35],
        };
        const placed = placeOnMap(one, nodes(2, 2), OPTIONS);
        assert.strictEqual(placed.frame.surface, "flat");
        if (placed.frame.surface === "flat") {
            const [[west, south], [east, north]] = placed.frame.bounds;
            assert.isAtLeast(east - west, 10);
            assert.isAtLeast(north - south, 10);
            assert.isBelow(east - west, 20, "a region, not the world");
        }
    });

    it("frames a city's data at its own size, not at a degree", () => {
        const city: LocationSource = {
            kind: "columns",
            latitude: "a",
            longitude: "b",
            lat: [45.43, 45.45, 45.5],
            lon: [12.3, 12.35, 12.4],
        };
        const placed = placeOnMap(city, nodes(3, 2), OPTIONS);
        assert.strictEqual(placed.frame.surface, "flat");
        if (placed.frame.surface === "flat") {
            const [[west], [east]] = placed.frame.bounds;
            assert.isBelow(east - west, 0.2, "the box hugs the 0.1 degrees of data");
        }
    });

    it("lines the tray up in one row", () => {
        const many: LocationSource = {
            kind: "location",
            column: "where",
            values: ["40.64, -73.78", ...Array.from({ length: 30 }, () => "")],
            named: true,
        };
        const n = 31;
        const placed = placeOnMap(
            many,
            { ids: Array.from({ length: n }, (_, i) => i), sizes: null, initial: new Float32Array(2 * n) },
            OPTIONS,
        );
        const ys = new Set(placed.unplacedRows.map((row) => placed.positions[2 * row + 1]));
        assert.strictEqual(ys.size, 1);
    });

    it("flags European capitals written longitude first as ambiguous, and reads them as asked", () => {
        const europe: LocationSource = {
            kind: "location",
            column: "coords",
            values: ["2.3522, 48.8566", "13.405, 52.52", "-3.7038, 40.4168", "12.4964, 41.9028"],
            named: true,
        };
        const auto = placeOnMap(europe, nodes(4, 2), OPTIONS);
        assert.deepInclude(auto.warnings.find((w) => w.code === "W_LOCATION_AMBIGUOUS")?.params, {
            formats: ["decimal", "lon-lat"],
            column: "coords",
        });
        const asked = placeOnMap(europe, nodes(4, 2), { ...OPTIONS, format: "lon-lat" });
        assert.deepEqual(asked.warnings, []);
        assert.deepInclude(asked.frame.location, { kind: "location", column: "coords", format: "lon-lat" });
        if (asked.frame.surface === "flat") {
            // Paris sits in France: west of Berlin, north of Madrid.
            assert.isBelow(asked.positions[0], asked.positions[2]);
            assert.isAbove(asked.positions[1], asked.positions[5]);
        }
    });

    it("reads hemisphere letters and decimal commas in latitude and longitude columns", () => {
        const text: LocationSource = {
            kind: "columns",
            latitude: "latitude",
            longitude: "longitude",
            lat: ["40.7128", "51.5074 N", "48,8566", "-33.87"],
            lon: ["-74.0060", "0.1278 W", "2,3522", "151.21"],
        };
        assert.deepEqual(placeOnMap(text, nodes(4, 2), OPTIONS).unplacedRows, []);
    });

    it("draws the globe mapScale times larger, its nodes still half their size above it", () => {
        const globe = { ...OPTIONS, surface: "globe" as const, dimensions: 3 as const };
        const one = placeOnMap(columns, nodes(4, 3), globe);
        const three = placeOnMap(columns, nodes(4, 3), { ...globe, mapScale: 3 });
        assert.equal(three.frame.surface, "globe");
        if (one.frame.surface !== "globe" || three.frame.surface !== "globe") {
            return;
        }

        assert.closeTo(three.frame.radius, 3 * one.frame.radius, 1e-9);
        assert.strictEqual(three.frame.mapScale, 3);
        for (let row = 0; row < 4; row++) {
            const r = Math.hypot(three.positions[3 * row], three.positions[3 * row + 1], three.positions[3 * row + 2]);
            assert.closeTo(r, three.frame.radius + 0.5, 1e-3, "a node of size 1 still stands half its size above");
        }
    });

    it("draws the flat map mapScale times larger, its nodes as far in front of it", () => {
        const flat3d = { ...OPTIONS, dimensions: 3 as const };
        const one = placeOnMap(columns, nodes(4, 3), flat3d);
        const six = placeOnMap(columns, nodes(4, 3), { ...flat3d, mapScale: 6 });
        assert.equal(six.frame.surface, "flat");
        if (one.frame.surface !== "flat" || six.frame.surface !== "flat") {
            return;
        }

        assert.strictEqual(six.frame.mapScale, 6);
        assert.closeTo(six.frame.size, 6 * one.frame.size, 1e-9, "the map is six times wider");
        assert.closeTo(six.frame.mapFrame.width, 6 * one.frame.mapFrame.width, 1e-6);
        assert.closeTo(six.frame.mapFrame.height, 6 * one.frame.mapFrame.height, 1e-6);
        for (let row = 0; row < 4; row++) {
            assert.closeTo(six.positions[3 * row], 6 * one.positions[3 * row], 1e-3, "x spreads six times");
            assert.closeTo(six.positions[3 * row + 1], 6 * one.positions[3 * row + 1], 1e-3, "y spreads six times");
            assert.strictEqual(six.positions[3 * row + 2], one.positions[3 * row + 2], "a node stands as far in front");
        }
    });

    it("sizes the globe so the data spans the same scene units as on the flat map", () => {
        const usa: LocationSource = {
            kind: "columns",
            latitude: "a",
            longitude: "b",
            lat: [47.6, 25.8, 40.7, 34.1],
            lon: [-122.3, -80.2, -74.0, -118.2],
        };
        const globe = placeOnMap(usa, nodes(4, 3), { ...OPTIONS, surface: "globe", dimensions: 3 });
        if (globe.frame.surface === "globe") {
            // About 50 degrees of longitude at 37 N, plus the margin: far bigger than 100 units of radius.
            assert.isAbove(globe.frame.radius, 100);
        }
    });
});
