import { ArcRotateCamera, BaseTexture, Camera, type Mesh, NullEngine, Scene, Vector3 } from "@babylonjs/core";

import { FlatMap, Globe, type MapSource, mapSources, type TextureLoader } from "../src/index.js";

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
        expect(map.attribution).toEqual(["Natural Earth"]);
        map.update();
        expect(tiles.requests.map((r) => r.url)).toEqual([expect.stringMatching(/natural-earth\.jpg$/)]);
        await tiles.answerAll();
        map.update();
        const [mesh] = shownMeshes(scene);
        expect(mesh.getTotalVertices()).toBe(2 * 33);
        expect(mesh.isPickable).toBe(false);
        const box = mesh.getBoundingInfo().boundingBox;
        expect(box.minimum.x).toBeCloseTo(-50);
        expect(box.maximum.y).toBeCloseTo(50);
        expect(map.status).toEqual({ loading: 0, ready: 1, failed: 0 });
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
        expect(shownMeshes(scene).map((m) => m.name)).toEqual([expect.stringMatching(/0:0\/0\/0$/)]);
        while (tiles.requests.length > 0) {
            await tiles.answerAll();
            map.update();
        }
        const names = shownMeshes(scene).map((m) => m.name);
        expect(names.length).toBeGreaterThan(1);
        expect(names.every((n) => !n.endsWith("0:0/0/0"))).toBe(true);
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
        expect(map.status).toEqual({ loading: 0, ready: 0, failed: 1 });
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
        expect(map.attribution).toEqual(["Natural Earth", "(c) OpenStreetMap contributors"]);
        expect(map.sources).toHaveLength(3);
        map.update();
        await tiles.answerAll();
        map.update();
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
});
