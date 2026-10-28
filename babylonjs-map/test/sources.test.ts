import { TILE_HOSTS } from "../../vitest.map-tiles.mjs";
import { mapSources, resolveSource } from "../src/sources.js";

describe("the test tile fixture", () => {
    it("answers every host a built-in source loads tiles from, so no test reaches a tile server", () => {
        const hosts = Object.values(mapSources).flatMap((source) =>
            "tiles" in source
                ? (source.subdomains ?? [""]).map((sub) => new URL(source.tiles.replace("{s}", sub)).hostname)
                : [],
        );
        expect(hosts.length).toBeGreaterThan(0);
        expect(TILE_HOSTS).toEqual(expect.arrayContaining(hosts));
    });
});

describe("resolveSource", () => {
    it("fills a Web Mercator XYZ source's defaults and URLs", () => {
        const osm = resolveSource(mapSources.openstreetmap);
        expect(osm.projection.id).toBe("web-mercator");
        expect(osm.tileSize).toBe(256);
        expect(osm.maxZoom).toBe(19);
        expect(osm.roots()).toEqual([{ z: 0, x: 0, y: 0 }]);
        expect(osm.url({ z: 10, x: 302, y: 385 })).toBe("https://tile.openstreetmap.org/10/302/385.png");
        expect(osm.attribution).toBe("(c) OpenStreetMap contributors");
    });

    it("splits a tile into its four children with their squares", () => {
        const osm = resolveSource(mapSources.openstreetmap);
        expect(osm.children({ z: 1, x: 1, y: 0 })).toEqual([
            { z: 2, x: 2, y: 0 },
            { z: 2, x: 3, y: 0 },
            { z: 2, x: 2, y: 1 },
            { z: 2, x: 3, y: 1 },
        ]);
        expect(osm.rect({ z: 2, x: 3, y: 1 })).toEqual({ x0: 0.75, y0: 0.25, x1: 1, y1: 0.5 });
    });

    it("fills subdomains, TMS rows and the retina marker", () => {
        const custom = resolveSource({
            tiles: "https://{s}.example.com/{z}/{x}/{-y}{r}.png",
            subdomains: ["a", "b"],
            attribution: "(c) Example",
            minZoom: 2,
        });
        expect(custom.url({ z: 2, x: 1, y: 0 })).toBe("https://b.example.com/2/1/3.png");
        expect(custom.roots()).toHaveLength(16);
        expect(resolveSource({ tiles: "/{s}/{z}", attribution: "" }).url({ z: 0, x: 0, y: 0 })).toBe("//0");
    });

    it("follows NASA GIBS's equirectangular matrix (2x1, 3x2, 5x3, 10x5 tiles)", () => {
        const gibs = resolveSource(mapSources["nasa-gibs-blue-marble"]);
        expect(gibs.projection.id).toBe("equirectangular");
        expect(gibs.roots()).toEqual([
            { z: 0, x: 0, y: 0 },
            { z: 0, x: 1, y: 0 },
        ]);
        const level = (z: number): number => {
            let tiles = gibs.roots();
            for (let i = 0; i < z; i++) {
                tiles = tiles.flatMap((t) => gibs.children(t));
            }
            return tiles.length;
        };
        expect([level(1), level(2), level(3)]).toEqual([6, 15, 50]);
        // the last column is clipped at 180 E; its texture square is not
        expect(gibs.rect({ z: 0, x: 1, y: 0 })).toEqual({ x0: 0.8, y0: 0, x1: 1, y1: 0.5 });
        expect(gibs.square({ z: 0, x: 1, y: 0 })).toEqual({ x0: 0.8, y0: 0, x1: 1.6, y1: 0.8 });
        expect(gibs.url({ z: 3, x: 9, y: 4 })).toMatch(/\/500m\/3\/4\/9\.jpeg$/);
    });

    it("treats a single image as one tile covering its bounds", () => {
        const world = resolveSource(mapSources["natural-earth"]);
        expect(world.url({ z: 0, x: 0, y: 0 })).toMatch(/assets\/natural-earth\.jpg$/);
        expect(world.rect({ z: 0, x: 0, y: 0 })).toEqual({ x0: 0, y0: 0, x1: 1, y1: 0.5 });
        expect(world.children({ z: 0, x: 0, y: 0 })).toEqual([]);
        const plan = resolveSource({
            image: "plan.png",
            bounds: [
                [-90, 0],
                [0, 45],
            ],
        });
        expect(plan.attribution).toBe("");
        expect(plan.rect({ z: 0, x: 0, y: 0 })).toEqual({ x0: 0.25, y0: 0.125, x1: 0.5, y1: 0.25 });
    });

    it("gives every named source an attribution and a max zoom", () => {
        for (const [id, source] of Object.entries(mapSources)) {
            const resolved = resolveSource(source);
            expect(resolved.attribution, id).not.toBe("");
            expect(resolved.maxZoom, id).toBeGreaterThanOrEqual(0);
        }
    });
});
