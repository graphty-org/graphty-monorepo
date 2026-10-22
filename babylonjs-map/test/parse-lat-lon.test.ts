import { isLocationError, parseLatLon } from "../src/location/index.js";

describe("parseLatLon", () => {
    it.each([
        ["40.64, -73.78", { lat: 40.64, lon: -73.78 }],
        ["40.64,-73.78", { lat: 40.64, lon: -73.78 }],
        [" +40.64 ; -73.78 ", { lat: 40.64, lon: -73.78 }],
        ["40.64 -73.78", { lat: 40.64, lon: -73.78 }],
        ["-90, 180", { lat: -90, lon: 180 }],
        [".5, 1.", { lat: 0.5, lon: 1 }],
    ])("reads the string %j", (value, expected) => {
        expect(parseLatLon(value)).toEqual(expected);
    });

    it("reads a [lat, lon] pair", () => {
        expect(parseLatLon([40.64, -73.78])).toEqual({ lat: 40.64, lon: -73.78 });
    });

    it.each([
        { lat: 40.64, lon: -73.78 },
        { latitude: "40.64", longitude: "-73.78" },
        { lat: 40.64, lng: -73.78 },
    ])("reads the object %j", (value) => {
        expect(parseLatLon(value)).toEqual({ lat: 40.64, lon: -73.78 });
    });

    it.each([null, undefined, "", "   "])("calls %j empty", (value) => {
        expect(parseLatLon(value)).toEqual({ code: "empty", params: { value } });
    });

    it.each([
        "40.64",
        "40.64, -73.78, 10",
        "north, west",
        "40.64N, 73.78W",
        [40.64],
        [40.64, "-73.78"],
        [Number.NaN, 0],
        [Infinity, 0],
        { x: 1, y: 2 },
        42,
    ])("calls %j a syntax error", (value) => {
        expect(parseLatLon(value)).toEqual({ code: "syntax", params: { value } });
    });

    it.each(["90.1, 0", "0, -180.5", [-91, 0]])("calls %j out of range", (value) => {
        expect(parseLatLon(value)).toEqual({ code: "range", params: { value } });
    });

    it("tells a point from an error", () => {
        expect(isLocationError(parseLatLon("1, 2"))).toBe(false);
        expect(isLocationError(parseLatLon("x"))).toBe(true);
    });
});
