import {
    ArcRotateCamera,
    BaseTexture,
    Camera,
    type Mesh,
    NullEngine,
    Scene,
    type StandardMaterial,
    UniversalCamera,
    Vector3,
    VertexBuffer,
} from "@babylonjs/core";

import { LAYER_GAP, sunShade } from "../src/globe.js";
import { FlatMap, Globe, latLonToSphere, type MapSource, mapSources, type TextureLoader } from "../src/index.js";

interface Request {
    url: string;
    resolve(): void;
    reject(): void;
}

/** A texture loader the test answers by hand. */
function loader(scene: Scene): { requests: Request[]; load: TextureLoader; answerAll(): Promise<void> } {
    const requests: Request[] = [];
    const load: TextureLoader = (url) =>
        new Promise((resolve, reject) => {
            requests.push({
                url,
                resolve: () => resolve(new BaseTexture(scene)),
                reject: () => reject(new Error("403")),
            });
        });
    return {
        requests,
        load,
        async answerAll() {
            for (const r of requests.splice(0)) {
                r.resolve();
            }
            await settle();
        },
    };
}

/** Lets resolved loads reach the map. */
async function settle(): Promise<void> {
    for (let i = 0; i < 5; i++) {
        await Promise.resolve();
    }
}

const zoomOf = (url: string): number => Number(/\/(\d+)\/\d+\/\d+\.png$/.exec(url)?.[1]);

const shownMeshes = (scene: Scene): Mesh[] =>
    scene.meshes.filter((m) => m.name.includes("-tile-") && m.isEnabled()) as Mesh[];

const OSM: MapSource = mapSources.openstreetmap;

describe("FlatMap", () => {
    let scene: Scene;
    let camera: ArcRotateCamera;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
        // looking at the origin from -z, the default side of a left-handed scene
        camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2, 200, Vector3.Zero(), scene);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        scene.getEngine().dispose();
    });

    it("draws the bundled world by default, reprojected onto Web Mercator", async () => {
        const tiles = loader(scene);
        const map = new FlatMap(scene, { loadTexture: tiles.load });
        expect(map.attribution, "nothing drawn, nothing credited").toEqual([]);
        map.update();
        expect(tiles.requests.map((r) => r.url)).toEqual([expect.stringMatching(/natural-earth\.jpg$/)]);
        await tiles.answerAll();
        map.update();
        const [mesh] = shownMeshes(scene);
        expect(mesh.getTotalVertices()).toBe(2 * 33);
        expect(mesh.isPickable).toBe(false);
        expect((mesh.material as StandardMaterial).emissiveFresnelParameters, "a flat map is not shaded").toBeFalsy();
        const box = mesh.getBoundingInfo().boundingBox;
        expect(box.minimum.x).toBeCloseTo(-50);
        expect(box.maximum.y).toBeCloseTo(50);
        expect(map.status).toMatchObject({ loading: 0, ready: 1, failed: 0 });
        // A lone picture has nothing to stack under: its depth is not pushed back at all. A push
        // past the far end of the depth range is clamped there, and a globe's far side then ties
        // with its near side and draws over it in bands.
        expect((mesh.material as StandardMaterial).zOffsetUnits).toBe(0);
        expect(map.attribution).toEqual(["Natural Earth"]);
        expect(map.credits).toEqual([{ text: "Natural Earth", url: "https://www.naturalearthdata.com/" }]);
    });

    it("loads finer tiles as the camera comes closer", async () => {
        const tiles = loader(scene);
        const map = new FlatMap(scene, { sources: [OSM], loadTexture: tiles.load });
        map.update();
        expect(tiles.requests.map((r) => zoomOf(r.url))).toEqual([0]);
        await tiles.answerAll();

        camera.radius = 5;
        map.update();
        const zooms = tiles.requests.map((r) => zoomOf(r.url));
        expect(Math.min(...zooms)).toBeGreaterThanOrEqual(3);
        expect(zooms.length).toBeLessThanOrEqual(6); // the concurrent-load cap
        // the zoom-0 tile stays up until its descendants arrive, so there is never a hole
        expect(shownMeshes(scene).map((m) => m.name)).toEqual([expect.stringMatching(/\|0\|0\/0\/0$/)]);
        while (tiles.requests.length > 0) {
            await tiles.answerAll();
            map.update();
        }
        const names = shownMeshes(scene).map((m) => m.name);
        expect(names.length).toBeGreaterThan(1);
        expect(names.every((n) => !n.endsWith("|0|0/0/0"))).toBe(true);
    });

    it("never requests a tile outside the view or the frame's box", async () => {
        const tiles = loader(scene);
        const map = new FlatMap(scene, {
            sources: [OSM],
            loadTexture: tiles.load,
            maxConcurrentLoads: 100,
            frame: {
                bounds: [
                    [-75, 40],
                    [-73, 41],
                ],
            },
        });
        camera.radius = 60;
        map.update();
        // zoom-7 tile columns 37 and 38 hold 75 W to 73 W (x = (lon + 180) / 360 * 128)
        const urls = tiles.requests.map((r) => r.url);
        expect(urls.length).toBeGreaterThan(0);
        for (const url of urls) {
            const [, z, x] = /\/(\d+)\/(\d+)\/\d+\.png$/.exec(url) ?? [];
            const lonWest = (Number(x) / 2 ** Number(z)) * 360 - 180;
            const lonEast = ((Number(x) + 1) / 2 ** Number(z)) * 360 - 180;
            expect(lonEast, url).toBeGreaterThan(-75);
            expect(lonWest, url).toBeLessThan(-73);
        }
        await tiles.answerAll();
        map.update();
        for (const mesh of shownMeshes(scene)) {
            const { minimum, maximum } = mesh.getBoundingInfo().boundingBox;
            expect(minimum.x).toBeGreaterThanOrEqual(-50.001);
            expect(maximum.x).toBeLessThanOrEqual(50.001);
        }
    });

    it("drops queued requests that left the view before they started", async () => {
        const tiles = loader(scene);
        const map = new FlatMap(scene, { sources: [OSM], loadTexture: tiles.load, maxConcurrentLoads: 1 });
        camera.radius = 3;
        map.update();
        expect(map.status.loading).toBeGreaterThan(2);
        camera.radius = 500;
        map.update();
        // left: the deep tile in flight and the zoom-0 tile now in view; nothing else is fetched
        expect(map.status.loading).toBe(2);
        await tiles.answerAll();
        expect(tiles.requests.map((r) => r.url)).toEqual(["https://tile.openstreetmap.org/0/0/0.png"]);
    });

    it("sizes tiles by the orthographic view in 2D", async () => {
        const tiles = loader(scene);
        const map = new FlatMap(scene, { sources: [OSM], loadTexture: tiles.load, maxConcurrentLoads: 100 });
        camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
        camera.orthoTop = 50;
        camera.orthoBottom = -50;
        camera.orthoLeft = -100;
        camera.orthoRight = 100;
        map.update();
        expect(tiles.requests.map((r) => zoomOf(r.url))).toEqual([0]);
        await tiles.answerAll();
        camera.orthoTop = 1;
        camera.orthoBottom = -1;
        camera.orthoLeft = -2;
        camera.orthoRight = 2;
        map.update();
        // 2 units over 256 pixels: a zoom-6 tile (100 / 64 units) is 200 pixels, under 256
        expect(Math.min(...tiles.requests.map((r) => zoomOf(r.url)))).toBe(6);
    });

    it("reports failed tiles and tells the host to render", async () => {
        const tiles = loader(scene);
        const map = new FlatMap(scene, { sources: [OSM], loadTexture: tiles.load });
        const changed = vi.fn();
        map.onChangedObservable.add(changed);
        map.update();
        tiles.requests[0].reject();
        await settle();
        expect(map.status).toMatchObject({ loading: 0, ready: 0, failed: 1, layers: [{ failed: 1 }] });
        expect(changed).toHaveBeenCalledTimes(1);
    });

    it("disposes the least recently drawn tiles beyond the cache cap", async () => {
        const tiles = loader(scene);
        const map = new FlatMap(scene, {
            sources: [OSM],
            loadTexture: tiles.load,
            maxCachedTiles: 4,
            maxConcurrentLoads: 100,
        });
        const disposed = vi.spyOn(BaseTexture.prototype, "dispose");
        for (const radius of [200, 20, 5, 2]) {
            camera.radius = radius;
            map.update();
            await tiles.answerAll();
            map.update();
        }
        expect(disposed).toHaveBeenCalled();
        expect(map.status.ready).toBeLessThanOrEqual(Math.max(4, shownMeshes(scene).length));
    });

    it("updates itself before a render when the camera moved", async () => {
        const tiles = loader(scene);
        new FlatMap(scene, { sources: [OSM], loadTexture: tiles.load });
        scene.render();
        expect(tiles.requests).toHaveLength(1);
        await tiles.answerAll();
        scene.render();
        expect(shownMeshes(scene)).toHaveLength(1);
        scene.render(); // nothing changed: nothing new asked for
        expect(tiles.requests).toHaveLength(0);
    });

    it("tells the host to render when an update shows a new tile or changes the credits", async () => {
        const tiles = loader(scene);
        const map = new FlatMap(scene, { loadTexture: tiles.load });
        map.update();
        await tiles.answerAll();
        const changed = vi.fn();
        map.onChangedObservable.add(changed);
        map.update(); // the loaded picture becomes a mesh, and its credit is drawn
        expect(changed).toHaveBeenCalledTimes(1);
        map.update(); // nothing new
        expect(changed).toHaveBeenCalledTimes(1);
    });

    it("rebuilds tiles for a new frame and keeps their textures", async () => {
        const tiles = loader(scene);
        const map = new FlatMap(scene, { loadTexture: tiles.load });
        map.update();
        await tiles.answerAll();
        map.update();
        map.frame = { projection: "equirectangular", size: 10 };
        map.update();
        expect(tiles.requests).toHaveLength(0);
        const [mesh] = shownMeshes(scene);
        expect(mesh.getTotalVertices()).toBe(4); // same projection: one quad
        expect(mesh.getBoundingInfo().boundingBox.maximum.x).toBeCloseTo(5);
        expect(map.toScene({ lat: 0, lon: 180 }).x).toBeCloseTo(5);
        expect(map.fromScene({ x: -5, y: 0 }).lon).toBeCloseTo(-180);
    });

    it("lists each source's credit once, draws higher layers on top and cleans up", async () => {
        const tiles = loader(scene);
        const map = new FlatMap(scene, {
            sources: [
                mapSources["natural-earth"],
                OSM,
                { tiles: "https://x/{z}/{x}/{y}.png", attribution: "(c) OpenStreetMap contributors" },
            ],
            loadTexture: tiles.load,
        });
        expect(map.sources).toHaveLength(3);
        map.update();
        await tiles.answerAll();
        map.update();
        expect(map.attribution).toEqual(["Natural Earth", "(c) OpenStreetMap contributors"]);
        const offsets = shownMeshes(scene).map((m) => m.material?.zOffsetUnits ?? 0);
        expect(offsets).toEqual([...offsets].sort((a, b) => b - a));
        expect(new Set(offsets).size).toBe(3);
        map.setSources([]);
        expect(shownMeshes(scene)).toHaveLength(0);
        expect(map.attribution).toEqual([]);
        map.dispose();
        expect(scene.transformNodes).toHaveLength(0);
        map.update(); // a no-op once disposed
    });

    it("ignores a tile that arrives after the map was disposed", async () => {
        const tiles = loader(scene);
        const map = new FlatMap(scene, { loadTexture: tiles.load });
        map.update();
        map.dispose();
        const disposed = vi.spyOn(BaseTexture.prototype, "dispose");
        await tiles.answerAll();
        expect(disposed).toHaveBeenCalledTimes(1);
    });
});

describe("FlatMap tile recovery and edges", () => {
    let scene: Scene;
    let camera: ArcRotateCamera;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
        camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2, 200, Vector3.Zero(), scene);
        camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        scene.getEngine().dispose();
    });

    /** Shows `half` scene units above and below the center, twice that left and right. */
    function view(half: number): void {
        camera.orthoTop = half;
        camera.orthoBottom = -half;
        camera.orthoLeft = -2 * half;
        camera.orthoRight = 2 * half;
    }

    it("draws a failed tile's parent over its loaded siblings, then the tile once a retry loads it", async () => {
        vi.useFakeTimers();
        const tiles = loader(scene);
        const map = new FlatMap(scene, { sources: [OSM], loadTexture: tiles.load, maxConcurrentLoads: 100 });
        view(50);
        map.update();
        await tiles.answerAll();
        view(25); // a zoom-1 tile is now 256 pixels: four of them
        map.update();
        expect(tiles.requests.map((r) => zoomOf(r.url))).toEqual([1, 1, 1, 1]);
        const [failing, ...rest] = tiles.requests.splice(0);
        failing.reject();
        for (const r of rest) {
            r.resolve();
        }
        await settle();
        map.update();
        expect(shownMeshes(scene).map((m) => m.name)).toEqual([expect.stringMatching(/\|0\|0\/0\/0$/)]);
        expect(map.status.failed).toBe(1);

        // Asked for again only once the backoff is over.
        map.update();
        expect(tiles.requests).toHaveLength(0);
        await vi.advanceTimersByTimeAsync(1000);
        map.update();
        expect(tiles.requests.map((r) => r.url)).toEqual([failing.url]);
        await tiles.answerAll();
        map.update();
        expect(shownMeshes(scene).map((m) => zoomOf(`${m.name.replace(/.*\|/, "/")}.png`))).toEqual([1, 1, 1, 1]);
    });

    it("keeps the finer tiles on screen while zooming out, until the coarser tile arrives", async () => {
        const tiles = loader(scene);
        const map = new FlatMap(scene, { sources: [OSM], loadTexture: tiles.load, maxConcurrentLoads: 100 });
        view(25); // four zoom-1 tiles, no zoom-0 tile ever loaded
        map.update();
        expect(tiles.requests.map((r) => zoomOf(r.url))).toEqual([1, 1, 1, 1]);
        await tiles.answerAll();
        map.update();
        const zooms = (): number[] => shownMeshes(scene).map((m) => zoomOf(`${m.name.replace(/.*\|/, "/")}.png`));
        expect(zooms()).toEqual([1, 1, 1, 1]);

        view(50); // zoomed out: the zoom-0 tile is wanted and not loaded yet
        map.update();
        expect(tiles.requests.map((r) => zoomOf(r.url))).toEqual([0]);
        expect(zooms(), "the zoom-1 tiles stay up, no hole while the zoom-0 tile loads").toEqual([1, 1, 1, 1]);

        await tiles.answerAll();
        map.update();
        expect(zooms()).toEqual([0]);
    });

    it("asks for failed tiles again at once when the browser comes back online", async () => {
        const target = new EventTarget();
        vi.stubGlobal("addEventListener", target.addEventListener.bind(target));
        vi.stubGlobal("removeEventListener", target.removeEventListener.bind(target));
        const tiles = loader(scene);
        const map = new FlatMap(scene, { sources: [OSM], loadTexture: tiles.load });
        const changed = vi.fn();
        map.onChangedObservable.add(changed);
        view(50);
        map.update();
        tiles.requests.splice(0)[0].reject();
        await settle();
        map.update();
        expect(tiles.requests).toHaveLength(0);
        target.dispatchEvent(new Event("online"));
        expect(changed).toHaveBeenCalledTimes(2);
        map.update();
        expect(tiles.requests).toHaveLength(1);
        map.dispose();
    });

    it("keeps the base picture when the tile service over it changes", async () => {
        const tiles = loader(scene);
        const map = new FlatMap(scene, { sources: [mapSources["natural-earth"], OSM], loadTexture: tiles.load });
        view(50);
        map.update();
        await tiles.answerAll();
        map.setSources([mapSources["natural-earth"], mapSources.opentopomap]);
        map.update();
        expect(tiles.requests.map((r) => r.url)).toEqual([expect.stringMatching(/opentopomap/)]);
        expect(shownMeshes(scene).some((m) => m.name.includes("natural-earth"))).toBe(true);
    });

    it.each([
        ["in one hemisphere", -75, -73],
        ["across the antimeridian", 170, 190],
    ] as const)("draws on past a data box %s with beyond: continue, one world wide", async (_, west, east) => {
        const tiles = loader(scene);
        const box = {
            bounds: [
                [west, -10],
                [east, 10],
            ] as const,
        };
        const map = new FlatMap(scene, {
            sources: [OSM],
            loadTexture: tiles.load,
            frame: box,
            beyond: "continue",
            maxConcurrentLoads: 100,
        });
        expect(map.beyond).toBe("continue");
        view(1e6);
        map.update();
        await tiles.answerAll();
        map.update();
        // The map's extent is exactly one world, centered on the data: no copy beside it.
        const boxes = shownMeshes(scene).map((m) => m.getBoundingInfo().boundingBox);
        const world = map.toScene({ lat: 0, lon: 180 }).x - map.toScene({ lat: 0, lon: -180 }).x;
        const left = Math.min(...boxes.map((b) => b.minimum.x));
        const right = Math.max(...boxes.map((b) => b.maximum.x));
        expect(right - left).toBeCloseTo(world, 3);
        expect((left + right) / 2).toBeCloseTo(0, 3);
        map.beyond = "clip";
        map.update();
        expect(Math.max(...shownMeshes(scene).map((m) => m.getBoundingInfo().boundingBox.maximum.x))).toBeCloseTo(
            map.frame.width / 2,
        );
    });

    it("draws a box across the antimeridian from the world's two copies", async () => {
        const tiles = loader(scene);
        const box = {
            bounds: [
                [170, -30],
                [190, -10],
            ] as const,
        };
        const map = new FlatMap(scene, {
            sources: [OSM],
            loadTexture: tiles.load,
            frame: box,
            maxConcurrentLoads: 100,
        });
        view(60);
        const urls: string[] = [];
        for (let round = 0, asked = 1; round < 30 && asked > 0; round++) {
            map.update();
            asked = tiles.requests.length;
            urls.push(...tiles.requests.map((r) => r.url));
            await tiles.answerAll();
        }
        map.update();
        expect(urls.length).toBeGreaterThan(1);
        for (const url of urls) {
            const [, z, x] = /\/(\d+)\/(\d+)\/\d+\.png$/.exec(url) ?? [];
            expect(Number(x), url).toBeLessThan(2 ** Number(z));
        }
        // Both sides of 180 degrees are drawn, edge to edge of the box.
        const half = map.frame.width / 2;
        const boxes = shownMeshes(scene).map((m) => m.getBoundingInfo().boundingBox);
        expect(Math.min(...boxes.map((b) => b.minimum.x))).toBeCloseTo(-half, 3);
        expect(Math.max(...boxes.map((b) => b.maximum.x))).toBeCloseTo(half, 3);
        expect(boxes.some((b) => b.minimum.x < -1) && boxes.some((b) => b.maximum.x > 1)).toBe(true);
    });

    it("loads a gray source's picture through the same loader", async () => {
        const tiles = loader(scene);
        const map = new FlatMap(scene, { sources: [mapSources["natural-earth-gray"]], loadTexture: tiles.load });
        view(50);
        map.update();
        await settle();
        // Without a DOM canvas the picture is loaded as it is.
        expect(tiles.requests.map((r) => r.url)).toEqual([expect.stringMatching(/natural-earth\.jpg$/)]);
    });
});

describe("Globe", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it.each([
        ["left", -Math.PI / 2],
        ["right", Math.PI / 2],
    ] as const)("in a %s-handed scene loads only the side facing the camera", async (handedness, alpha) => {
        const scene = new Scene(new NullEngine());
        scene.useRightHandedSystem = handedness === "right";
        // the camera on the scene's default side, facing longitude 0
        new ArcRotateCamera("camera", alpha, Math.PI / 2, 130, Vector3.Zero(), scene);
        const tiles = loader(scene);
        const globe = new Globe(scene, { sources: [OSM], loadTexture: tiles.load, maxConcurrentLoads: 1000 });
        expect(globe.handedness).toBe(handedness);
        expect(globe.toScene({ lat: 0, lon: 0 }).z).toBeCloseTo(handedness === "left" ? -100 : 100);
        globe.update();
        const deep = tiles.requests.map((r) => r.url).filter((u) => zoomOf(u) >= 2);
        expect(deep.length).toBeGreaterThan(0);
        for (const url of deep) {
            const [, z, x] = /\/(\d+)\/(\d+)\/\d+\.png$/.exec(url) ?? [];
            const lon = ((Number(x) + 0.5) / 2 ** Number(z)) * 360 - 180;
            expect(Math.abs(lon), url).toBeLessThan(120);
        }
        await tiles.answerAll();
        globe.update();
        const [mesh] = shownMeshes(scene);
        expect(mesh.getBoundingInfo().boundingBox.maximum.length()).toBeLessThanOrEqual(100 * Math.SQRT2 + 1e-6);
        scene.getEngine().dispose();
    });

    it("keeps a layer drawn under a tile service below its tiles everywhere, close to the surface", async () => {
        // The bundled world's patch is facets between points on the sphere, and so are the tiles
        // over it; where its points stood on the sphere they poked through the tiles' facets, and
        // close to the surface the reader saw light diamonds of it over the satellite picture.
        const scene = new Scene(new NullEngine());
        new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2, 104, Vector3.Zero(), scene);
        const tiles = loader(scene);
        const globe = new Globe(scene, {
            sources: [mapSources["natural-earth"], OSM],
            loadTexture: tiles.load,
            maxConcurrentLoads: 1000,
        });
        for (let round = 0; round < 30; round++) {
            globe.update();
            if (tiles.requests.length === 0) {
                break;
            }
            await tiles.answerAll();
        }
        globe.update();
        const radii = (mesh: Mesh): number[] => {
            const p = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
            const out: number[] = [];
            for (let i = 0; i < p.length; i += 3) {
                out.push(Math.hypot(p[i], p[i + 1], p[i + 2]));
            }
            return out;
        };
        // The lowest a facet comes is near its middle: the mean of its three corners.
        const facetMiddles = (mesh: Mesh): number[] => {
            const p = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
            const index = mesh.getIndices() ?? [];
            const out: number[] = [];
            for (let i = 0; i < index.length; i += 3) {
                const [a, b, c] = [index[i] * 3, index[i + 1] * 3, index[i + 2] * 3];
                out.push(
                    Math.hypot(
                        (p[a] + p[b] + p[c]) / 3,
                        (p[a + 1] + p[b + 1] + p[c + 1]) / 3,
                        (p[a + 2] + p[b + 2] + p[c + 2]) / 3,
                    ),
                );
            }
            return out;
        };
        const shown = shownMeshes(scene);
        const base = shown.filter((m) => m.name.includes("natural-earth"));
        const top = shown.filter((m) => m.name.includes("openstreetmap"));
        expect(base.length).toBeGreaterThan(0);
        expect(Math.max(...top.map((t) => Number(/\|(\d+)\/\d+\/\d+$/.exec(t.name)?.[1])))).toBeGreaterThanOrEqual(6);
        const baseHighest = Math.max(...base.flatMap(radii));
        const topLowest = Math.min(...top.flatMap(facetMiddles));
        expect(baseHighest, "the bundled world never reaches the tiles over it").toBeLessThan(topLowest);
        expect(baseHighest).toBeCloseTo(100 * (1 - LAYER_GAP), 6);
        expect(Math.max(...top.flatMap(radii)), "the top layer stays on the sphere").toBeCloseTo(100, 6);
        scene.getEngine().dispose();
    });

    it("wraps the world picture onto a sphere, each point at its own place, shaded round", async () => {
        const scene = new Scene(new NullEngine());
        new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2, 300, Vector3.Zero(), scene);
        const tiles = loader(scene);
        const globe = new Globe(scene, { loadTexture: tiles.load });
        globe.update();
        await tiles.answerAll();
        globe.update();
        const [mesh] = shownMeshes(scene);
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
        const normals = mesh.getVerticesData(VertexBuffer.NormalKind) ?? [];
        const uvs = mesh.getVerticesData(VertexBuffer.UVKind) ?? [];
        expect(positions.length).toBe(3 * 65 * 61);
        const vs: number[] = [];
        for (let i = 0; i < positions.length / 3; i++) {
            const p = new Vector3(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]);
            expect(p.length(), "on the sphere").toBeCloseTo(100, 6);
            expect(normals[3 * i] * 100, "facing out").toBeCloseTo(p.x, 6);
            expect(normals[3 * i + 1] * 100).toBeCloseTo(p.y, 6);
            const { lat, lon } = globe.fromScene(p);
            if (Math.abs(lat) < 89) {
                // the picture's column is the point's longitude (the seam's two ends both fit)
                const u = uvs[2 * i];
                expect(Math.min(Math.abs(u - (lon + 180) / 360), Math.abs(u - 1 - (lon + 180) / 360))).toBeLessThan(
                    1e-6,
                );
            }
            vs.push(uvs[2 * i + 1] - (lat + 90) / 180);
        }
        // the picture's row is the point's latitude, the same way up everywhere
        expect(Math.max(...vs) - Math.min(...vs)).toBeLessThan(1e-6);
        const material = mesh.material as StandardMaterial;
        expect(material.emissiveTexture).toBeInstanceOf(BaseTexture);
        expect(material.emissiveFresnelParameters.isEnabled, "darker toward the rim").toBe(true);
        scene.getEngine().dispose();
    });

    it("reads points back and rebuilds for a new radius", async () => {
        const scene = new Scene(new NullEngine());
        new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2, 300, Vector3.Zero(), scene);
        const tiles = loader(scene);
        const globe = new Globe(scene, { loadTexture: tiles.load });
        expect(globe.radius).toBe(100);
        const back = globe.fromScene(globe.toScene({ lat: 10, lon: 20 }, 5));
        expect(back.lat).toBeCloseTo(10);
        expect(back.lon).toBeCloseTo(20);
        globe.update();
        await tiles.answerAll();
        globe.update();
        // one segment per 3 degrees, at most 64: 64 x 60 for the whole world
        expect(shownMeshes(scene)[0].getTotalVertices()).toBe(65 * 61);
        globe.radius = 10;
        globe.update();
        expect(shownMeshes(scene)[0].getBoundingInfo().boundingBox.maximum.y).toBeCloseTo(10);
        scene.getEngine().dispose();
    });

    it("fills the poles past Web Mercator's edge from the source's coarsest tile", async () => {
        const scene = new Scene(new NullEngine());
        new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2, 300, Vector3.Zero(), scene);
        const tiles = loader(scene);
        const globe = new Globe(scene, { sources: [OSM], loadTexture: tiles.load });
        globe.update();
        await tiles.answerAll();
        globe.update();
        const caps = scene.meshes.filter((m) => m.name.includes("-cap-") && m.isEnabled());
        expect(caps).toHaveLength(2);
        const ys = caps.map((m) => m.getBoundingInfo().boundingBox);
        expect(Math.max(...ys.map((b) => b.maximum.y))).toBeCloseTo(100);
        expect(Math.min(...ys.map((b) => b.minimum.y))).toBeCloseTo(-100);
        expect(globe.attribution).toEqual(["(c) OpenStreetMap contributors"]);
        scene.getEngine().dispose();
    });

    it("loads finer tiles as the camera nears the surface, only around the point below it", async () => {
        const scene = new Scene(
            new NullEngine({
                renderWidth: 1200,
                renderHeight: 900,
                textureSize: 512,
                deterministicLockstep: false,
                lockstepMaxSteps: 4,
            }),
        );
        const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2, 400, Vector3.Zero(), scene);
        camera.minZ = 0.01;
        const tiles = loader(scene);
        const globe = new Globe(scene, { sources: [OSM], loadTexture: tiles.load, maxConcurrentLoads: 1000 });
        const deepest = (): number => Math.max(...tiles.requests.map((r) => zoomOf(r.url)));
        globe.update();
        const far = deepest();
        await tiles.answerAll();

        // 1 unit above the surface at latitude 0, longitude 0 (the radius is 100)
        camera.radius = 101;
        globe.update();
        const near = deepest();
        expect(near, "much finer near the surface").toBeGreaterThanOrEqual(far + 4);
        for (const { url } of tiles.requests.filter((r) => zoomOf(r.url) === near)) {
            const [, z, x] = /\/(\d+)\/(\d+)\/\d+\.png$/.exec(url) ?? [];
            const lon = ((Number(x) + 0.5) / 2 ** Number(z)) * 360 - 180;
            expect(Math.abs(lon), url).toBeLessThan(10);
        }
        await tiles.answerAll();
        globe.update();
        const drawn = shownMeshes(scene).map((m) => Number(/\|(\d+)\/\d+\/\d+$/.exec(m.name)?.[1]));
        expect(Math.max(...drawn), "the fine tiles are drawn once loaded").toBe(near);
        scene.getEngine().dispose();
    });

    // Close to the surface, the camera sees a small cap of the globe. A coarse tile around it was
    // judged by nine points on it: behind the horizon when none of them was in that cap, so the
    // tile and everything finer under it was dropped (a hole), and as far away as the nearest of
    // them, so the tile under the camera was left coarse.
    it.each([
        [20, 20, -67],
        [8, 20, -67],
        [2, 20, -67],
        [2, -31, 112],
        [0.5, 52, 13],
    ])(
        "%s units above (%s, %s): no hole, and the tile below at the level its size on screen asks for",
        async (height, lat, lon) => {
            const H = 900;
            const scene = new Scene(
                new NullEngine({
                    renderWidth: 1200,
                    renderHeight: H,
                    textureSize: 512,
                    deterministicLockstep: false,
                    lockstepMaxSteps: 4,
                }),
            );
            const camera = new UniversalCamera("camera", Vector3.Zero(), scene);
            const at = latLonToSphere({ lat, lon }, 100 + height);
            camera.position.set(at.x, at.y, at.z);
            camera.setTarget(Vector3.Zero());
            camera.minZ = height / 4;
            camera.getViewMatrix(true);
            const tiles = loader(scene);
            const globe = new Globe(scene, { sources: [OSM], loadTexture: tiles.load, maxConcurrentLoads: 1000 });
            for (let round = 0; round < 40; round++) {
                globe.update();
                if (tiles.requests.length === 0) {
                    break;
                }
                await tiles.answerAll();
            }
            globe.update();
            expect(tiles.requests, "every wanted tile was asked for and loaded").toHaveLength(0);

            let seen = 0;
            for (let j = 1; j < 15; j++) {
                for (let i = 1; i < 20; i++) {
                    const ray = scene.createPickingRay((1200 * i) / 20, (H * j) / 15, null, camera);
                    const o = ray.origin;
                    const d = ray.direction;
                    const b = Vector3.Dot(o, d);
                    if (b * b - o.lengthSquared() + 100 * 100 < 0) {
                        continue;
                    }
                    seen++;
                    const hit = scene.pickWithRay(ray, (m) => m.name.includes("-tile-") && m.isEnabled());
                    expect(hit?.hit, `a tile is drawn at pixel ${String(i)}, ${String(j)}`).toBe(true);
                }
            }
            expect(seen).toBeGreaterThan(0);

            // The tile under the middle of the view: a texel at most a pixel, its parent's more.
            const below = scene.pickWithRay(
                scene.createPickingRay(600, H / 2, null, camera),
                (m) => m.name.includes("-tile-") && m.isEnabled(),
            );
            const z = Number(/\|(\d+)\/\d+\/\d+$/.exec(below?.pickedMesh?.name ?? "")?.[1]);
            // A tile's width there: the circumference over 2^z, narrowed by the latitude.
            const pixels = (level: number): number =>
                (((2 * Math.PI * 100 * Math.cos((lat * Math.PI) / 180)) / 2 ** level) * H) /
                (2 * height * Math.tan(camera.fov / 2));
            expect(pixels(z - 1), `level ${String(z)} is fine enough`).toBeGreaterThan(256);
            expect(z, "not finer than the source has").toBeLessThanOrEqual(19);
            scene.getEngine().dispose();
        },
    );

    it("shades the side away from a sun dark, with a soft twilight, and none without one", async () => {
        const scene = new Scene(new NullEngine());
        new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2, 300, Vector3.Zero(), scene);
        const tiles = loader(scene);
        const globe = new Globe(scene, { loadTexture: tiles.load });
        globe.update();
        await tiles.answerAll();
        globe.update();
        expect(shownMeshes(scene)[0].getVerticesData(VertexBuffer.ColorKind), "no sun, no shading").toBeNull();

        globe.sun = { lat: 0, lon: 0 };
        globe.update();
        const [mesh] = shownMeshes(scene);
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
        const colors = mesh.getVerticesData(VertexBuffer.ColorKind) ?? [];
        const sun = latLonToSphere({ lat: 0, lon: 0 }, 1);
        for (let i = 0; i < positions.length / 3; i++) {
            const p = { x: positions[3 * i], y: positions[3 * i + 1], z: positions[3 * i + 2] };
            expect(colors[4 * i]).toBeCloseTo(sunShade(p, sun), 6);
        }
        const at = (lat: number, lon: number): number => sunShade(latLonToSphere({ lat, lon }, 100), sun);
        expect(at(0, 0), "noon").toBe(1);
        expect(at(0, 180), "midnight").toBeCloseTo(0.2);
        expect(at(0, 88)).toBeGreaterThan(at(0, 92));
        expect(at(0, 92)).toBeGreaterThan(at(0, 100));
        scene.getEngine().dispose();
    });

    it("draws the air's glow around the rim when asked, at the globe's radius, and removes it", () => {
        const scene = new Scene(new NullEngine());
        new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2, 300, Vector3.Zero(), scene);
        const globe = new Globe(scene, { atmosphere: true, loadTexture: loader(scene).load });
        const air = (): Mesh | undefined =>
            scene.meshes.find((m) => m.name.endsWith("-atmosphere")) as Mesh | undefined;
        expect(globe.atmosphere).toBe(true);
        expect(air()?.parent).toBe(globe.root);
        expect(air()?.isPickable).toBe(false);
        expect(air()?.scaling.x).toBeCloseTo(106);
        expect((air()?.material as StandardMaterial).alphaMode, "added onto what is behind").toBe(1);
        globe.radius = 10;
        expect(air()?.scaling.x).toBeCloseTo(10.6);
        globe.atmosphere = false;
        expect(air()).toBeUndefined();
        expect(new Globe(scene, { name: "plain", loadTexture: loader(scene).load }).atmosphere, "off by default").toBe(
            false,
        );
        scene.getEngine().dispose();
    });
});
