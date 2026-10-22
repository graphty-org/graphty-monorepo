import {
    detectLocationFormat,
    isLocationError,
    latLonFromColumns,
    type LocationFormat,
    parseLocation,
} from "../src/location/index.js";

// JFK airport in every spelling; each decodes within `tolerance` degrees of these.
const JFK = { lat: 40.6398, lon: -73.7789 };

function near(value: unknown, format: LocationFormat | "auto", expected = JFK, tolerance = 0.01): void {
    const result = parseLocation(value, format);
    if (isLocationError(result)) {
        throw new Error(`${JSON.stringify(value)} as ${format}: ${result.code}`);
    }
    expect(Math.abs(result.lat - expected.lat), `${JSON.stringify(value)} lat`).toBeLessThan(tolerance);
    expect(Math.abs(result.lon - expected.lon), `${JSON.stringify(value)} lon`).toBeLessThan(tolerance);
}

const SPELLINGS: [LocationFormat, unknown][] = [
    ["decimal", "40.6398, -73.7789"],
    ["decimal", [40.6398, -73.7789]],
    ["decimal", { latitude: 40.6398, longitude: -73.7789 }],
    ["lon-lat", "-73.7789, 40.6398"],
    ["lon-lat", [-73.7789, 40.6398]],
    ["geojson", { type: "Point", coordinates: [-73.7789, 40.6398] }],
    ["geojson", '{"type":"Point","coordinates":[-73.7789,40.6398,4]}'],
    ["geojson", { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [-73.7789, 40.6398] } }],
    ["wkt", "POINT(-73.7789 40.6398)"],
    ["wkt", "point z (-73.7789 40.6398 4)"],
    ["wkt", "SRID=4326;POINT (-73.7789 40.6398)"],
    ["iso6709", "+40.6398-073.7789/"],
    ["iso6709", "+4038.388-07346.734/"],
    ["iso6709", "+403823-0734644+4CRSWGS_84/"],
    ["dms", "40 38 23 N, 73 46 44 W"],
    ["dms", "40°38′23″N 73°46′44″W"],
    ["dms", "40deg38'23\"N 73deg46'44\"W"],
    ["dms", "N40 38.383 W73 46.733"],
    ["geohash", "dr5x1n7"],
    ["plus-code", "87G8J6QC+WC"],
    ["mgrs", "18TXK0325499489"],
    ["mgrs", "18T XK 03254 99489"],
    ["utm", "18T 603254 4499489"],
    ["utm", "18T 603254mE 4499489mN"],
];

describe("parseLocation", () => {
    it.each(SPELLINGS)("reads %s %j", (format, value) => {
        near(value, format);
    });

    it.each(SPELLINGS.filter(([format]) => format !== "geohash" && format !== "lon-lat"))(
        "auto-detects %s %j",
        (_format, value) => {
            near(value, "auto");
        },
    );

    it("does not read a lone word as a geohash in auto", () => {
        expect(parseLocation("bed")).toEqual({ code: "syntax", params: { value: "bed" } });
        expect(parseLocation("bed", "geohash")).not.toHaveProperty("code");
    });

    it("reads a decimal pair longitude first only when asked", () => {
        expect(parseLocation("10, 20")).toEqual({ lat: 10, lon: 20 });
        expect(parseLocation("10, 20", "lon-lat")).toEqual({ lat: 20, lon: 10 });
        expect(parseLocation({ lat: 1, lon: 2 }, "lon-lat")).toMatchObject({ code: "syntax" });
    });

    it.each([
        [null, "empty"],
        ["  ", "empty"],
        ["Paris", "syntax"],
        [{ type: "LineString", coordinates: [] }, "syntax"],
        ["95, 10", "range"],
        ['{"type":"Point","coordinates":[10,95]}', "range"],
        ["POINT(200 10)", "range"],
        ["Q2PQ+6V", "short-code"],
    ])("calls %j %s", (value, code) => {
        expect(parseLocation(value)).toEqual({ code, params: { value } });
    });

    it.each([
        ["geojson", "{not json"],
        ["wkt", 42],
        ["iso6709", "+4099-07346/"],
        ["dms", "hello"],
        ["geohash", "dr5x1n7a"],
        ["plus-code", "87G8J6QC+W"],
        ["mgrs", "18TWL123"],
        ["mgrs", "99ZZZ12"],
        ["utm", "61T 603254 4499489"],
        ["utm", "18T 603254"],
        ["decimal", "40.64"],
    ] as [LocationFormat, unknown][])("refuses %s %j", (format, value) => {
        expect(parseLocation(value, format)).toMatchObject({ code: "syntax" });
    });

    it("calls a UTM easting off the zone out of range", () => {
        expect(parseLocation("18T 6032540 4499489", "utm")).toMatchObject({ code: "range" });
    });
});

describe("plus codes", () => {
    // Google's reference decoding test data (test_data/decoding.csv): code, lat lo, lng lo, lat hi, lng hi
    it.each([
        ["7FG49Q00+", 20.35, 2.75, 20.4, 2.8],
        ["7FG49QCJ+2V", 20.37, 2.782125, 20.370125, 2.78225],
        ["7FG49QCJ+2VX", 20.3701, 2.78221875, 20.370125, 2.78225],
        ["7FG49QCJ+2VXGJ", 20.370113, 2.782234375, 20.370114, 2.78223632813],
        ["8FVC2222+22", 47.0, 8.0, 47.000125, 8.000125],
        ["4VCPPQGP+Q9", -41.273125, 174.785875, -41.273, 174.786],
        ["62G20000+", 0.0, -180.0, 1, -179],
        ["22220000+", -90, -180, -89, -179],
        ["CFX30000+", 89, 1, 90, 2],
        ["CFX3X2X2+X2", 89.999875, 1, 90, 1.000125],
        ["84000000+", 30, -140, 50, -120],
    ])("decodes %s to its area's center", (code, latLo, lonLo, latHi, lonHi) => {
        const result = parseLocation(code, "plus-code");
        expect(result).toMatchObject({});
        if (isLocationError(result)) {
            throw new Error(result.code);
        }
        expect(result.lat).toBeCloseTo(Math.min((latLo + latHi) / 2, 90), 6);
        expect(result.lon).toBeCloseTo((lonLo + lonHi) / 2, 6);
    });

    it("refuses codes beyond the poles or the antimeridian", () => {
        expect(parseLocation("D2220000+", "plus-code")).toMatchObject({ code: "syntax" });
        expect(parseLocation("2W220000+", "plus-code")).toMatchObject({ code: "syntax" });
    });
});

describe("latLonFromColumns", () => {
    it("reads numbers and decimal strings", () => {
        expect(latLonFromColumns(40.64, "-73.78")).toEqual({ lat: 40.64, lon: -73.78 });
    });

    it.each([
        [null, 1, "empty"],
        [1, "", "empty"],
        ["x", 1, "syntax"],
        [91, 1, "range"],
    ])("calls %j, %j %s", (lat, lon, code) => {
        expect(latLonFromColumns(lat, lon)).toEqual({ code, params: { value: [lat, lon] } });
    });
});

describe("detectLocationFormat", () => {
    it("reads a decimal column latitude first", () => {
        expect(detectLocationFormat(["40.6, -73.7", "51.4, -0.4", "", null])).toEqual({
            format: "decimal",
            share: 1,
            sampled: 2,
            alternatives: [],
        });
    });

    it("reads a pair column longitude first when only that fits", () => {
        expect(detectLocationFormat(["-73.7, 40.6", "151.2, -33.9"]).format).toBe("lon-lat");
    });

    it("finds geohashes, which auto never reads one at a time", () => {
        expect(detectLocationFormat(["dr5x1n7", "gcpsvq", "u09tvw"]).format).toBe("geohash");
    });

    it("names formats that read the column as well", () => {
        const result = detectLocationFormat(["+40.6398-073.7789/", "+51.47-000.45/"]);
        expect(result.format).toBe("iso6709");
        expect(result.alternatives).toEqual([]);
        const mixed = detectLocationFormat(["bed", "dr5x1n7", "40.6, -73.7", "51.4, -0.4"]);
        expect(mixed.format).toBe("decimal");
        expect(mixed.share).toBe(0.5);
        expect(mixed.alternatives).toEqual(["geohash"]);
    });

    it("says when nothing reads and stops at the sample limit", () => {
        expect(detectLocationFormat(["Paris", "Lyon"])).toEqual({
            format: null,
            share: 0,
            sampled: 2,
            alternatives: [],
        });
        expect(detectLocationFormat(["1, 2", "3, 4", "5, 6"], 2).sampled).toBe(2);
    });
});
