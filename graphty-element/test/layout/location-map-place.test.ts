/**
 * @file The location map layout's placement, in Node: reading locations from two columns or one,
 * finding them unasked, projecting onto a flat map or a globe, spreading shared places, the tray
 * for nodes with no location, and the warnings.
 */

import { createMapFrame, latLonToSphere } from "babylonjs-map/projection";
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

        const frame = createMapFrame({ projection: "web-mercator", bounds: placed.frame.bounds, size: 100 });
        Object.values(CITIES).forEach(([lat, lon], row) => {
            const { x, y } = frame.toScene({ lat, lon });
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
        assert.deepInclude(unparsed?.params, { missing: 1, unparsed: 1, total: 4 });
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
            assert.closeTo(r, 100.5, 1e-3); // the radius plus half the default node size
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
