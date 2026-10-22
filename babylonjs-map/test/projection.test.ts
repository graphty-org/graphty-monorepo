import {
    boundsOf,
    createMapFrame,
    equirectangular,
    type GeoBounds,
    latLonToSphere,
    longitudeIn,
    projections,
    raySphere,
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

    it("clamps latitudes to the poles, lets longitudes pass 180, and returns null for no points", () => {
        expect(boundsOf([{ lat: 89, lon: 179 }], { minSpan: 10 })?.[1]).toEqual([185, 90]);
        expect(boundsOf([])).toBeNull();
    });

    it("gives every node at one point a box 1 degree across by default", () => {
        const b = boundsOf([{ lat: 48.8566, lon: 2.3522 }], { margin: 0 }) as GeoBounds;
        expect(b[1][0] - b[0][0]).toBeCloseTo(1);
        expect(b[1][1] - b[0][1]).toBeCloseTo(1);
    });

    it("keeps data across the antimeridian together", () => {
        // The red team's Pacific: Fiji, Samoa, Tonga, New Zealand, Hawaii, the Aleutians, Kamchatka.
        const pacific = [
            { lat: -18.14, lon: 178.44 },
            { lat: -13.83, lon: -171.76 },
            { lat: -21.14, lon: -175.2 },
            { lat: -36.85, lon: 174.76 },
            { lat: 21.31, lon: -157.86 },
            { lat: 51.88, lon: -176.66 },
            { lat: 53.02, lon: 158.65 },
            { lat: 64.73, lon: 177.51 },
            { lat: 64.5, lon: -165.4 },
        ];
        const b = boundsOf(pacific, { margin: 0 }) as GeoBounds;
        expect(b[1][0] - b[0][0]).toBeLessThan(60);
        expect(b[0][0]).toBeCloseTo(158.65);
        expect(b[1][0]).toBeCloseTo(-157.86 + 360);
        // Suva and Apia, shifted into the box, are 10 degrees apart, not 350.
        expect(longitudeIn(-171.76, b) - longitudeIn(178.44, b)).toBeCloseTo(9.8);
        // Data that does not cross keeps its plain box.
        expect(
            boundsOf(
                [
                    { lat: 0, lon: -10 },
                    { lat: 0, lon: 10 },
                ],
                { margin: 0 },
            ),
        ).toEqual([
            [-10, -0.5],
            [10, 0.5],
        ]);
    });
});

describe("raySphere", () => {
    it("finds the near side of a sphere, and null for a miss", () => {
        expect(raySphere({ x: 0, y: 0, z: -300 }, { x: 0, y: 0, z: 1 }, 100)).toEqual({ x: 0, y: 0, z: -100 });
        expect(raySphere({ x: 0, y: 200, z: -300 }, { x: 0, y: 0, z: 1 }, 100)).toBeNull();
        expect(raySphere({ x: 0, y: 0, z: -300 }, { x: 0, y: 0, z: -1 }, 100)).toBeNull();
        // From inside, the far wall.
        expect(raySphere({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 100)).toEqual({ x: 100, y: 0, z: 0 });
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
