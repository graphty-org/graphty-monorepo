import { WEB_MERCATOR_MAX_LATITUDE, webMercator } from "../src/index.js";

describe("webMercator", () => {
    it("puts the map's corners and center on the unit square", () => {
        expect(webMercator.forward({ lat: 0, lon: 0 })).toEqual({ x: 0.5, y: 0.5 });
        const nw = webMercator.forward({ lat: WEB_MERCATOR_MAX_LATITUDE, lon: -180 });
        expect(nw.x).toBe(0);
        expect(nw.y).toBeCloseTo(0, 12);
        const se = webMercator.forward({ lat: -WEB_MERCATOR_MAX_LATITUDE, lon: 180 });
        expect(se.x).toBe(1);
        expect(se.y).toBeCloseTo(1, 12);
    });

    it("clamps latitudes beyond the map's edge", () => {
        expect(webMercator.forward({ lat: 90, lon: 0 }).y).toBeCloseTo(0, 12);
        expect(webMercator.forward({ lat: -90, lon: 0 }).y).toBeCloseTo(1, 12);
    });

    it("matches the slippy-map tile of a known place", () => {
        // JFK airport is in zoom-10 tile x 302, y 385 (OpenStreetMap tile numbering)
        const { x, y } = webMercator.forward({ lat: 40.6398, lon: -73.7789 });
        expect(Math.floor(x * 1024)).toBe(302);
        expect(Math.floor(y * 1024)).toBe(385);
    });

    it.each([
        { lat: 40.6398, lon: -73.7789 },
        { lat: -33.9461, lon: 151.1772 },
        { lat: 0, lon: 0 },
        { lat: 85, lon: 179.9 },
    ])("inverts forward for %j", (point) => {
        const back = webMercator.inverse(webMercator.forward(point));
        expect(back.lat).toBeCloseTo(point.lat, 9);
        expect(back.lon).toBeCloseTo(point.lon, 9);
    });
});
