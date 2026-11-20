import assert from "node:assert";

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { describe, it } from "vitest";

import { geographic, type GeographicLayoutOptions, type LayoutResult } from "../../src";

/** Earth's radius in Web Mercator (EPSG:3857), meters. */
const WGS84_A = 6378137;

/** Nodes at the given longitude / latitude pairs, as a declared geographic position column. */
function places(points: readonly (readonly [number, number])[], declared = true): GraphSnapshot {
    return fromEdgeArrays({
        directed: false,
        nodeCount: points.length,
        src: new Uint32Array(0),
        dst: new Uint32Array(0),
        nodeColumns: {
            pos: {
                data: Float64Array.from(points.flat()),
                decl: { components: 2, role: "position", ...(declared ? { coordinates: { kind: "geographic" } } : {}) },
            },
        },
    });
}

const row = (r: LayoutResult, i: number): number[] => Array.from(r.positions.subarray(r.dim * i, r.dim * i + r.dim));

/** Asserts `actual` is within `tolerance` of `expected`, component by component. */
function near(actual: readonly number[], expected: readonly number[], tolerance: number): void {
    assert.equal(actual.length, expected.length);
    actual.forEach((v, k) => {
        assert.ok(Math.abs(v - expected[k]) <= tolerance, `component ${k}: ${v} is not ${expected[k]} +- ${tolerance}`);
    });
}

const run = (points: readonly (readonly [number, number])[], options: GeographicLayoutOptions = {}): LayoutResult =>
    geographic(places(points), options);

describe("geographic layout", () => {
    it("equirectangular: longitude and latitude in radians, y north", () => {
        const r = run([
            [90, 45],
            [-180, -90],
        ]);
        near(row(r, 0), [Math.PI / 2, Math.PI / 4], 1e-6);
        near(row(r, 1), [-Math.PI, -Math.PI / 2], 1e-6);
    });

    it("web-mercator: the EPSG:3857 meters of known points", () => {
        const r = run(
            [
                [180, 0],
                [0, 45],
                [-74.006, 40.7128],
                [0, 89],
            ],
            { projection: "web-mercator", scale: WGS84_A },
        );
        near(row(r, 0), [20037508.342789244, 0], 4);
        near(row(r, 1), [0, 5621521.486192066], 4);
        // New York City, as EPSG:3857 tools give it
        near(row(r, 2), [-8238310.24, 4970071.58], 4);
        // clamped at 85.0511 degrees: the square world's top edge
        near(row(r, 3), [0, 20037508.342789244], 4);
    });

    it("equal-earth: the world's extents, 2.05 times as wide as tall (Savric et al. 2018)", () => {
        const r = run(
            [
                [180, 0],
                [0, 90],
                [0, 0],
            ],
            { projection: "equal-earth" },
        );
        // on the equator theta is 0, so x = 2 sqrt(3) PI / (3 A1); at the pole theta is PI / 3
        near(row(r, 0), [(2 * Math.sqrt(3) * Math.PI) / (3 * 1.340264), 0], 1e-6);
        near(row(r, 1), [0, 1.31736], 1e-5);
        near(row(r, 2), [0, 0], 1e-9);
        near([row(r, 0)[0] / row(r, 1)[1]], [2.0546], 1e-3);
    });

    it("equal-earth keeps areas: equal cells of the globe get equal map areas", () => {
        // the area of a 1 x 1 degree cell is proportional to sin(lat + 1) - sin(lat); on the map it is the cell's
        // projected quadrilateral
        const cell = (lon: number, lat: number): number => {
            const r = run(
                [
                    [lon, lat],
                    [lon + 1, lat],
                    [lon + 1, lat + 1],
                    [lon, lat + 1],
                ],
                { projection: "equal-earth" },
            );
            const p = [0, 1, 2, 3].map((i) => row(r, i));
            let twice = 0;
            for (let i = 0; i < 4; i++) {
                const [x0, y0] = p[i];
                const [x1, y1] = p[(i + 1) % 4];
                twice += x0 * y1 - x1 * y0;
            }
            const sphere = ((Math.sin(((lat + 1) * Math.PI) / 180) - Math.sin((lat * Math.PI) / 180)) * Math.PI) / 180;
            return Math.abs(twice) / 2 / sphere;
        };
        for (const [lon, lat] of [
            [0, 0],
            [100, 30],
            [-150, 60],
            [170, -75],
        ]) {
            near([cell(lon, lat)], [1], 2e-3);
        }
    });

    it("scale and center place the map", () => {
        const r = run([[90, 0]], { scale: 2, center: [10, -5] });
        near(row(r, 0), [10 + Math.PI, -5], 1e-5);
    });

    it("3D rows lie in the plane of the center's z", () => {
        const r = run([[90, 45]], { dim: 3, center: [0, 0, 7] });
        near(row(r, 0), [Math.PI / 2, Math.PI / 4, 7], 1e-6);
    });

    it("a node with no coordinates, or a latitude past a pole, is unplaced", () => {
        const r = run([
            [Number.NaN, 10],
            [10, 91],
            [10, 10],
        ]);
        assert.ok(row(r, 0).every(Number.isNaN));
        assert.ok(row(r, 1).every(Number.isNaN));
        assert.ok(row(r, 2).every(Number.isFinite));
    });

    describe("the antimeridian", () => {
        const pacific: [number, number][] = [
            [170, 0],
            [-170, 0],
        ];

        it("by default draws Greenwich at the center, so the two sides of 180 are a map apart", () => {
            const r = run(pacific);
            near([row(r, 1)[0] - row(r, 0)[0]], [(-340 * Math.PI) / 180], 1e-5);
        });

        it("centralMeridian: 'auto' draws them the short way, side by side", () => {
            const r = run(pacific, { centralMeridian: "auto" });
            near(row(r, 0), [(-10 * Math.PI) / 180, 0], 1e-6);
            near(row(r, 1), [(10 * Math.PI) / 180, 0], 1e-6);
        });

        it("a numeric central meridian rotates the map", () => {
            const r = run([[-170, 0]], { centralMeridian: 180 });
            near(row(r, 0), [(10 * Math.PI) / 180, 0], 1e-6);
        });
    });

    describe("where the coordinates come from", () => {
        it("named longitude and latitude columns", () => {
            const s = fromEdgeArrays({
                directed: false,
                nodeCount: 1,
                src: new Uint32Array(0),
                dst: new Uint32Array(0),
                nodeColumns: { lon: Float64Array.of(90), lat: Float64Array.of(45) },
            });
            near(row(geographic(s, { longitude: "lon", latitude: "lat" }), 0), [Math.PI / 2, Math.PI / 4], 1e-6);
        });

        it("a named column without a declared coordinate system", () => {
            near(row(geographic(places([[90, 45]], false), { position: "pos" }), 0), [Math.PI / 2, Math.PI / 4], 1e-6);
        });

        it("refuses a snapshot with no geographic column, and only one of longitude and latitude", () => {
            assert.throws(() => geographic(places([[0, 0]], false)), { code: "E_UNKNOWN_COLUMN" });
            assert.throws(() => geographic(places([[0, 0]]), { longitude: "pos" }), { code: "E_BAD_OPTION" });
            assert.throws(() => geographic(places([[0, 0]]), { position: "nope" }), { code: "E_UNKNOWN_COLUMN" });
        });

        it("refuses an unknown projection and a non-finite central meridian", () => {
            assert.throws(() => run([[0, 0]], { projection: "mollweide" as "equal-earth" }), { code: "E_BAD_OPTION" });
            assert.throws(() => run([[0, 0]], { centralMeridian: Number.NaN }), { code: "E_BAD_OPTION" });
        });
    });
});
