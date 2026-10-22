import {
    boundsOf,
    createMapFrame,
    equirectangular,
    latLonToSphere,
    projections,
    sphereToLatLon,
    WEB_MERCATOR_MAX_LATITUDE,
    webMercator,
    worldBounds,
} from "../src/projection/index.js";

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

describe("equirectangular", () => {
    it("maps the world to a 2:1 map one unit wide", () => {
        expect(equirectangular.forward({ lat: 90, lon: -180 })).toEqual({ x: 0, y: 0 });
        expect(equirectangular.forward({ lat: -90, lon: 180 })).toEqual({ x: 1, y: 0.5 });
        expect(equirectangular.forward({ lat: 0, lon: 0 })).toEqual({ x: 0.5, y: 0.25 });
        expect(equirectangular.forward({ lat: 100, lon: 0 }).y).toBe(0);
    });

    it("inverts forward", () => {
        const back = equirectangular.inverse(equirectangular.forward({ lat: -33.9, lon: 151.2 }));
        expect(back.lat).toBeCloseTo(-33.9, 12);
        expect(back.lon).toBeCloseTo(151.2, 12);
    });

    it("is listed by id with its world box", () => {
        expect(projections.equirectangular).toBe(equirectangular);
        expect(worldBounds("equirectangular")).toEqual([
            [-180, -90],
            [180, 90],
        ]);
        expect(worldBounds(webMercator)[1][1]).toBe(WEB_MERCATOR_MAX_LATITUDE);
    });
});

describe("boundsOf", () => {
    it("adds the margin on every side", () => {
        const b = boundsOf([
            { lat: 10, lon: 20 },
            { lat: 20, lon: 40 },
        ]);
        expect(b?.[0][0]).toBeCloseTo(18);
        expect(b?.[0][1]).toBeCloseTo(9);
        expect(b?.[1][0]).toBeCloseTo(42);
        expect(b?.[1][1]).toBeCloseTo(21);
    });

    it("gives a single point the minimum span and skips non-finite points", () => {
        const b = boundsOf(
            [
                { lat: 5, lon: 5 },
                { lat: Number.NaN, lon: 0 },
            ],
            { margin: 0, minSpan: 1 },
        );
        expect(b).toEqual([
            [4.5, 4.5],
            [5.5, 5.5],
        ]);
    });

    it("clamps to the world and returns null for no points", () => {
        expect(boundsOf([{ lat: 89, lon: 179 }], { minSpan: 10 })?.[1]).toEqual([180, 90]);
        expect(boundsOf([])).toBeNull();
    });
});

describe("createMapFrame", () => {
    it("fits the box's longer side to size, centered, north up", () => {
        const frame = createMapFrame({
            projection: "equirectangular",
            bounds: [
                [-10, -5],
                [10, 5],
            ],
            size: 40,
        });
        expect(frame.width).toBeCloseTo(40);
        expect(frame.height).toBeCloseTo(20);
        expect(frame.toScene({ lat: 0, lon: 0 })).toEqual({ x: 0, y: 0 });
        const ne = frame.toScene({ lat: 5, lon: 10 });
        expect(ne.x).toBeCloseTo(20);
        expect(ne.y).toBeCloseTo(10);
        const back = frame.fromScene({ x: 20, y: -10 });
        expect(back.lat).toBeCloseTo(-5);
        expect(back.lon).toBeCloseTo(10);
    });

    it("defaults to the whole Web Mercator world, 100 units across", () => {
        const frame = createMapFrame();
        expect(frame.projection).toBe(webMercator);
        expect(frame.width).toBeCloseTo(100);
        expect(frame.height).toBeCloseTo(100);
        expect(frame.toScene({ lat: WEB_MERCATOR_MAX_LATITUDE, lon: 180 }).y).toBeCloseTo(50);
    });

    it("clamps the box to the projection and refuses an empty one", () => {
        expect(createMapFrame({ bounds: worldBounds("equirectangular") }).bounds[1][1]).toBe(WEB_MERCATOR_MAX_LATITUDE);
        expect(() =>
            createMapFrame({
                bounds: [
                    [10, 0],
                    [10, 5],
                ],
            }),
        ).toThrow(RangeError);
    });

    it("keeps street-scale boxes in small scene numbers", () => {
        const frame = createMapFrame({
            bounds: [
                [-73.99, 40.75],
                [-73.98, 40.76],
            ],
            size: 100,
        });
        const p = frame.toScene({ lat: 40.755, lon: -73.985 });
        expect(Math.abs(p.x)).toBeLessThan(1e-6);
        expect(Math.max(frame.width, frame.height)).toBeCloseTo(100);
    });
});

describe("latLonToSphere", () => {
    it("puts the north pole up and longitude 0 toward the default camera", () => {
        const pole = latLonToSphere({ lat: 90, lon: 0 }, 2);
        expect(pole.y).toBeCloseTo(2);
        expect(latLonToSphere({ lat: 0, lon: 0 }, 2)).toEqual({ x: 0, y: 0, z: -2 });
        expect(latLonToSphere({ lat: 0, lon: 0 }, 2, "right")).toEqual({ x: 0, y: 0, z: 2 });
        // east is to the camera's right (+x) in both
        expect(latLonToSphere({ lat: 0, lon: 90 }, 2).x).toBeCloseTo(2);
        expect(latLonToSphere({ lat: 0, lon: 90 }, 2, "right").x).toBeCloseTo(2);
    });

    it.each(["left", "right"] as const)("inverts in a %s-handed scene", (handedness) => {
        const point = { lat: 40.64, lon: -73.78 };
        const back = sphereToLatLon(latLonToSphere(point, 7, handedness), handedness);
        expect(back.lat).toBeCloseTo(point.lat, 10);
        expect(back.lon).toBeCloseTo(point.lon, 10);
    });
});
