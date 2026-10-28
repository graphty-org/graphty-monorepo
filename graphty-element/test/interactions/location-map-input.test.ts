/**
 * @file The location map under real input and the camera's rules on a map: a map applied after
 * the camera was turned round is faced again, the preset views look at the map's face, the wheel
 * never takes the camera inside the globe and zooms toward the pointer, a drag turns the globe
 * under the hand, a 2D drag pans with a node selected, an undo brings the map back, a camera with
 * no transition time moves at once, `nodeScale: "screen"` holds node sizes, and a map whose tiles
 * cannot be reached says so and credits only what it drew. Input is made by the browser's own
 * pipeline (test/helpers/real-input.ts) and every outcome read through the element's public API.
 */

import "../../src/graphty-element";

import { Matrix } from "@babylonjs/core";
import { raySphere } from "babylonjs-map/projection";
import { afterEach, assert, describe, it, vi } from "vitest";
import { commands } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { click, drag, type Point, wheel } from "../helpers/real-input";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Holds every request whose URL holds the piece given, unanswered, until it is released. */
        holdRequests: (fragment: string) => Promise<void>;
        /** Once one has come, lets the held requests go: answered, or refused when `refuse`. */
        releaseRequests: (fragment: string, refuse: boolean) => Promise<void>;
    }
}

const WIDTH = 400;
const HEIGHT = 300;
const CENTER: Point = { x: WIDTH / 2, y: HEIGHT / 2 };

/** Ten cities across the United States, a latitude and longitude each. */
const CITIES = [
    { id: "SEA", latitude: 47.61, longitude: -122.33 },
    { id: "SFO", latitude: 37.77, longitude: -122.42 },
    { id: "LAX", latitude: 34.05, longitude: -118.24 },
    { id: "DEN", latitude: 39.74, longitude: -104.99 },
    { id: "DFW", latitude: 32.78, longitude: -96.8 },
    { id: "CHI", latitude: 41.88, longitude: -87.63 },
    { id: "ATL", latitude: 33.75, longitude: -84.39 },
    { id: "MIA", latitude: 25.76, longitude: -80.19 },
    { id: "NYC", latitude: 40.71, longitude: -74.01 },
    { id: "BOS", latitude: 42.36, longitude: -71.06 },
];

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Wait until the element has applied the input just given and the picture has come to rest.
 * @param element - The element.
 */
async function applied(element: Graphty): Promise<void> {
    await drawnFrames(element.graph.getScene(), 1);
    await element.waitForStableFrame();
}

/**
 * Wait until the map under the graph is in a state, and drawing a source when one is named. The
 * element tells every change of the map's state as a `basemap-status` event, so this waits on that
 * event and never on a clock: loading a map's tiles and compiling their shaders take as long as the
 * machine takes.
 * @param element - The element.
 * @param state - The state.
 * @param source - The source, when it matters.
 */
async function basemapIs(element: Graphty, state: string, source?: string): Promise<void> {
    const reached = (): boolean => {
        const status = element.basemapStatus;
        return status.state === state && (source === undefined || status.source === source);
    };
    if (reached()) {
        return;
    }

    await new Promise<void>((resolve) => {
        const listener = (): void => {
            if (reached()) {
                element.removeEventListener("basemap-status", listener);
                resolve();
            }
        };
        element.addEventListener("basemap-status", listener);
    });
}

/**
 * The link the map's credits give, as drawn over the canvas now.
 * @param element - The element.
 * @returns The first credit's link, or null when none is drawn.
 */
function creditLink(element: Graphty): string | null {
    const strip =
        element.querySelector("[data-graphty-attribution]") ??
        element.shadowRoot?.querySelector("[data-graphty-attribution]");
    return strip?.querySelector("a")?.getAttribute("href") ?? null;
}

/**
 * A mounted element holding the cities, laid out on the map.
 * @param viewMode - The view mode.
 * @param options - The layout's options.
 * @returns The element.
 */
async function mounted(viewMode: "2d" | "3d", options: Record<string, unknown> = {}): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(CITIES);
    await element.session.data.addEdges([
        { src: "SEA", dst: "NYC" },
        { src: "SFO", dst: "BOS" },
        { src: "LAX", dst: "MIA" },
    ]);
    await element.setViewMode(viewMode);
    await element.session.layout.set("location-map", { options });
    await applied(element);
    await vi.waitFor(() => {
        assert.isNotNull(element.mapFrame, "the map layout published its frame");
    });
    await applied(element);
    return element;
}

/**
 * Where a node is drawn.
 * @param element - The element.
 * @param id - The node.
 * @returns Its center in CSS pixels from the element's top-left corner.
 */
function at(element: Graphty, id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} is drawn`);
    return { x: position.x, y: position.y };
}

/**
 * The direction from the camera's target toward the camera, normalized.
 * @param element - The element.
 * @returns The direction.
 */
function viewDirection(element: Graphty): { x: number; y: number; z: number } {
    const { position, target } = element.getCameraState();
    assert.isDefined(position);
    assert.isDefined(target);
    const d = { x: position.x - target.x, y: position.y - target.y, z: position.z - target.z };
    const length = Math.hypot(d.x, d.y, d.z);
    return { x: d.x / length, y: d.y / length, z: d.z / length };
}

/**
 * The point of a sphere at the origin under a spot of the canvas, in the scene.
 * @param element - The element.
 * @param spot - The spot, in CSS pixels.
 * @param radius - The sphere's radius.
 * @returns The point, or null when the spot misses it.
 */
function onSphere(element: Graphty, spot: Point, radius: number): { x: number; y: number; z: number } | null {
    const scene = element.graph.getScene();
    const { engine } = element.graph;
    const ratio = engine.getRenderWidth() / (engine.getRenderingCanvas()?.clientWidth ?? 1);
    const ray = scene.createPickingRay(spot.x * ratio, spot.y * ratio, Matrix.Identity(), scene.activeCamera);
    return raySphere(ray.origin, ray.direction, radius);
}

describe("the camera on a location map", () => {
    it("faces a map applied after the camera was turned round to its back", async () => {
        const element = await mounted("3d");
        const first = viewDirection(element);
        assert.isBelow(first.z, -0.6, "the first map is seen from its face (-z)");
        assert.isBelow(first.y, -0.6, "at a slant from the south, so its arcs rise above it");
        // Turn the view half way round, as a reader would, by dragging.
        await drag(element, { x: 40, y: CENTER.y }, { x: WIDTH - 20, y: CENTER.y }, 16);
        await drag(element, { x: 40, y: CENTER.y }, { x: WIDTH - 20, y: CENTER.y }, 16);
        await applied(element);
        await element.session.layout.set("location-map", { options: { extent: "world" } });
        await applied(element);
        await vi.waitFor(async () => {
            await applied(element);
            assert.isBelow(viewDirection(element).z, -0.6, "the new map is faced again");
        });
    });

    it("looks at the map's face from Top, from the south from Side, and from its front for Isometric", async () => {
        const element = await mounted("3d");
        await element.applyCameraView("topView");
        assert.isBelow(viewDirection(element).z, -0.99, "Top looks straight at the map");
        await element.applyCameraView("sideView");
        const side = viewDirection(element);
        assert.isBelow(side.y, -0.8, "Side is from the south");
        assert.isBelow(side.z, -0.2, "and above the map's face");
        await element.applyCameraView("isometric");
        const iso = viewDirection(element);
        assert.isBelow(iso.z, -0.5, "Isometric is from the map's front");
        assert.isBelow(iso.y, 0, "and from the south");
    });

    it("never zooms inside the globe, however far the wheel turns", async () => {
        const element = await mounted("3d", { surface: "globe" });
        const frame = element.mapFrame;
        assert.strictEqual(frame?.surface, "globe");
        const radius = frame?.surface === "globe" ? frame.radius : 0;
        for (let notch = 0; notch < 20; notch++) {
            await wheel(element, CENTER, -400);
            await drawnFrames(element.graph.getScene(), 1);
        }
        await applied(element);
        const camera = element.graph.getScene().activeCamera?.globalPosition;
        assert.isDefined(camera);
        assert.isAtLeast(camera.length(), radius * 1.02 - 1e-3, "the camera is outside the globe");
    });

    it("turns the globe under the hand: the place grabbed stays under the pointer", async () => {
        const element = await mounted("3d", { surface: "globe" });
        const frame = element.mapFrame;
        const radius = frame?.surface === "globe" ? frame.radius : 0;
        // A spot on the globe between its middle and its edge.
        const from = { x: CENTER.x - 20, y: CENTER.y + 10 };
        const grabbed = onSphere(element, from, radius);
        assert.isNotNull(grabbed, "the spot is on the globe");
        const to = { x: CENTER.x + 40, y: CENTER.y - 20 };
        await drag(element, from, to, 12);
        await applied(element);
        const under = onSphere(element, to, radius);
        assert.isNotNull(under);
        if (grabbed !== null && under !== null) {
            const apart = Math.hypot(grabbed.x - under.x, grabbed.y - under.y, grabbed.z - under.z);
            assert.isBelow(apart / radius, 0.03, "the grabbed place is under the pointer");
        }
    });

    it("zooms toward the pointer on a map: the city under it stays under it", async () => {
        const element = await mounted("2d");
        const chicago = at(element, "CHI");
        for (let notch = 0; notch < 3; notch++) {
            await wheel(element, chicago, -120);
            await drawnFrames(element.graph.getScene(), 1);
        }
        await applied(element);
        const after = at(element, "CHI");
        assert.isBelow(Math.hypot(after.x - chicago.x, after.y - chicago.y), 4, "Chicago stayed under the pointer");
    });

    it("pans a 2D drag on empty canvas with a node selected, and keeps the pan", async () => {
        const element = await mounted("2d");
        element.layoutBehavior = { camera: { pivotOnSelection: true } };
        await click(element, at(element, "DEN"));
        await applied(element);
        assert.deepStrictEqual(element.session.selection.nodes.map(String), ["DEN"]);
        const before = at(element, "MIA");
        await drag(element, { x: 20, y: 20 }, { x: 120, y: 60 }, 10);
        await applied(element);
        const after = at(element, "MIA");
        assert.isAbove(after.x - before.x, 50, "the drag moved the view");
        assert.deepStrictEqual(element.session.selection.nodes.map(String), ["DEN"], "the selection stayed");
    });

    it("moves at once with no transition time: a preset view lands in the next frame", async () => {
        const element = await mounted("3d");
        element.cameraTransitionDuration = 0;
        await element.applyCameraView("sideView", { animate: true });
        const landed = JSON.stringify(element.getCameraState());
        await applied(element);
        assert.strictEqual(JSON.stringify(element.getCameraState()), landed, "nothing was left to glide");
        assert.isBelow(viewDirection(element).y, -0.8);
    });

    it("opens a globe as the whole sphere, and an undo frames the flat map again", async () => {
        const element = await mounted("3d");
        // How far apart Seattle and Miami are drawn: the share of the view the data fills.
        const spread = (): number => {
            const a = at(element, "SEA");
            const b = at(element, "MIA");
            return Math.hypot(a.x - b.x, a.y - b.y);
        };
        const flat = spread();
        await element.session.layout.set("location-map", { options: { surface: "globe" } });
        await applied(element);
        await vi.waitFor(async () => {
            await applied(element);
            assert.isBelow(spread() / flat, 0.8, "the globe frames the whole sphere, not only the data");
        });
        await element.session.undo();
        await applied(element);
        await vi.waitFor(async () => {
            await applied(element);
            assert.strictEqual(element.mapFrame?.surface, "flat");
            assert.closeTo(spread() / flat, 1, 0.25, "the flat map is framed again");
        });
    });

    it("holds node sizes on screen with nodeScale: screen as the view zooms", async () => {
        const element = await mounted("2d", { nodeScale: "screen" });
        const size = (): number => {
            const node = element.graph.getNode("CHI");
            assert.isDefined(node);
            const camera = element.graph.getScene().activeCamera;
            const height = (camera?.orthoTop ?? 0) - (camera?.orthoBottom ?? 0);
            // drawnRadius is the radius as drawn, its mesh scaling included.
            return (node.drawnRadius * HEIGHT) / height;
        };
        const first = size();
        for (let step = 0; step < 5; step++) {
            await wheel(element, CENTER, -200);
            await applied(element);
            assert.closeTo(size() / first, 1, 0.1, `step ${String(step)}`);
        }
    });
});

/**
 * How many distinct colors a frame holds in a square: a map is a picture of many colors, an empty
 * canvas one.
 * @param element - The element.
 * @param center - The square's center, CSS pixels.
 * @param half - Half its side, CSS pixels.
 * @returns The number of distinct colors.
 */
async function colorsAround(element: Graphty, center: Point, half: number): Promise<number> {
    const { engine } = element.graph;
    element.graph.scene.render();
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const pixels = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
    const scale = width / WIDTH;
    const seen = new Set<number>();
    for (let dy = -half; dy <= half; dy += 2) {
        for (let dx = -half; dx <= half; dx += 2) {
            const x = Math.round((center.x + dx) * scale);
            const y = height - 1 - Math.round((center.y + dy) * scale);
            const o = (y * width + x) * 4;
            seen.add((pixels[o] << 16) | (pixels[o + 1] << 8) | pixels[o + 2]);
        }
    }
    return seen.size;
}

describe("the map under the graph", () => {
    it("is drawn, in the 3D and the 2D view, drawing only on demand", async () => {
        const element = await mounted("3d");
        element.layoutBehavior = { rendering: { onDemand: true } };
        await applied(element);
        // A new map made while the element draws only on demand, its drawn-mesh list frozen.
        await element.session.layout.set("location-map", {
            options: { extent: "world", map: { source: "natural-earth-gray" } },
        });
        await basemapIs(element, "ready", "natural-earth-gray");
        await applied(element);
        assert.isAbove(await colorsAround(element, CENTER, 40), 20, "a picture under the graph in 3D");
        await element.setViewMode("2d");
        await applied(element);
        await basemapIs(element, "ready", "natural-earth-gray");
        await applied(element);
        assert.isAbove(await colorsAround(element, CENTER, 40), 20, "and in 2D");
    });

    it("says it is loading until a tile is drawn, so a reader waiting for ready sees the map", async () => {
        const element = await mounted("3d");
        await applied(element);
        await element.session.layout.set("location-map", { options: { extent: "world" } });
        // Nothing asked for yet is not ready: the status stays loading until a tile has settled.
        await basemapIs(element, "ready");
        await applied(element);
        assert.isAbove(await colorsAround(element, CENTER, 40), 20, "the map is on screen once ready");
    });
});

/**
 * Whether any node or edge is painted an outline: the element's style stack paints none here, so
 * one would be the layout's own.
 * @param element - The element.
 * @returns The nodes and edges painted with an outline.
 */
function outlined(element: Graphty): { nodes: number; edges: number } {
    const painter = element.graph.getStylePainter();
    let nodes = 0;
    let edges = 0;
    for (let index = 0; index < CITIES.length; index++) {
        if (painter.nodePaint(index)?.style.effect?.outline !== undefined) {
            nodes++;
        }
    }
    for (let index = 0; index < 3; index++) {
        if (painter.edgePaint(index)?.style.line?.outline !== undefined) {
            edges++;
        }
    }
    return { nodes, edges };
}

describe("nodes and edges on a map", () => {
    it("are drawn as their style layers paint them, with no outline of the map's own, in 3D and 2D", async () => {
        const element = await mounted("3d", { map: { source: "natural-earth-gray" } });
        assert.deepEqual(outlined(element), { nodes: 0, edges: 0 }, "no outline in 3D");
        await element.setViewMode("2d");
        await applied(element);
        assert.deepEqual(outlined(element), { nodes: 0, edges: 0 }, "nor in 2D");
    });
});

/**
 * The points every edge's line is drawn through, or null for an edge drawn as one straight segment.
 * @param element - The element.
 * @returns The lines.
 */
function edgeLines(element: Graphty): ({ x: number; y: number; z: number }[] | null)[] {
    return [...element.graph.getDataManager().edges.values()].map(
        (edge) => edge.drawnCurve?.map((v) => ({ x: v.x, y: v.y, z: v.z })) ?? null,
    );
}

describe("the surface and the view", () => {
    it("draws straight edges on the flat map in 2D, arcs above it in 3D, and arcs above a sphere on the globe", async () => {
        const element = await mounted("3d");
        for (const line of edgeLines(element)) {
            assert.isNotNull(line, "a 3D flat map draws each edge as an arc");
            const lift = Math.max(...(line ?? []).map((p) => Math.abs(p.z)));
            assert.isAbove(lift, 0, "raised off the map's plane");
        }

        await element.setViewMode("2d");
        await applied(element);
        assert.strictEqual(element.mapFrame?.surface, "flat");
        assert.deepEqual(edgeLines(element), [null, null, null], "the 2D map draws straight edges");

        await element.setViewMode("3d");
        await element.session.layout.set("location-map", { options: { surface: "globe" } });
        await applied(element);
        const frame = element.mapFrame;
        const radius = frame?.surface === "globe" ? frame.radius : 0;
        assert.isAbove(radius, 0, "the globe is drawn");
        for (const line of edgeLines(element)) {
            assert.isNotNull(line, "a globe draws each edge as an arc");
            const highest = Math.max(...(line ?? []).map((p) => Math.hypot(p.x, p.y, p.z)));
            assert.isAbove(highest, radius, "above the sphere");
        }
    });

    it("refuses a globe in the 2D view with a coded refusal, and keeps the flat map", async () => {
        const element = await mounted("2d");
        let details: { option?: unknown; refusal?: unknown } | undefined;
        await element.session.layout.set("location-map", { options: { surface: "globe" } }).catch((error: unknown) => {
            ({ details } = error as { details?: typeof details });
        });
        assert.deepEqual(details?.refusal, { code: "setting.notIn2d", params: { setting: "surface" } });
        assert.strictEqual(details?.option, "surface");
        await applied(element);
        assert.strictEqual(element.mapFrame?.surface, "flat", "the flat map is still drawn");
        assert.notStrictEqual(element.session.layout.options.surface, "globe");
    });
});

/**
 * Where each city is in the scene.
 * @param element - The element.
 * @returns The positions, by id.
 */
function scenePositions(element: Graphty): Record<string, string> {
    return Object.fromEntries(
        CITIES.map(({ id }) => {
            const p = element.graph.getNode(id)?.getPosition();
            return [id, p === undefined ? "missing" : [p.x, p.y, p.z].map((v) => v.toFixed(4)).join(",")];
        }),
    );
}

/**
 * The tiles the globe is drawing: each patch's source and level.
 * @param element - The element.
 * @returns The globe's patches.
 */
function globeTiles(element: Graphty): { source: string; z: number; textured: boolean }[] {
    return element.graph
        .getScene()
        .meshes.filter((m) => m.name.startsWith("graphty-globe-tile-") && m.isEnabled())
        .map((m) => {
            const [source, , tile] = m.name.slice("graphty-globe-tile-".length).split("|");
            const material = m.material as { emissiveTexture?: unknown } | null;
            return { source, z: Number(tile.split("/")[0]), textured: (material?.emissiveTexture ?? null) !== null };
        });
}

describe("the globe's map", () => {
    it("wraps every kind of source onto the sphere, switched live without moving a node, refining as it nears", async () => {
        const element = await mounted("3d", { surface: "globe", extent: "world" });
        await basemapIs(element, "ready");
        const placed = scenePositions(element);
        // One 2 x 1 pixel picture of the whole world, as a reader's own image would be.
        const picture =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAD0lEQVR4nGNQSDhgsMABAAe3AlFeqn87AAAAAElFTkSuQmCC";
        const sources = [
            [{ source: "natural-earth-gray" }, "natural-earth-gray"],
            [{ source: "openstreetmap" }, "openstreetmap"],
            [{ source: "opentopomap" }, "opentopomap"],
            [{ source: "nasa-gibs-blue-marble" }, "nasa-gibs-blue-marble"],
            [{ source: "usgs-imagery" }, "usgs-imagery"],
            [{ source: "eox-s2cloudless-2016" }, "eox-s2cloudless-2016"],
            [{ tiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "My tiles" }, "tiles"],
            [{ image: picture, attribution: "My picture" }, "image"],
        ] as const;
        for (const [map, source] of sources) {
            await element.session.layout.set("location-map", { options: { surface: "globe", extent: "world", map } });
            await basemapIs(element, "ready", source);
            await applied(element);
            const tiles = globeTiles(element);
            assert.isAbove(tiles.length, 0, `${source} is drawn on the globe`);
            assert.isTrue(
                tiles.every((t) => t.textured),
                `${source}: every patch carries its picture`,
            );
            assert.deepEqual(scenePositions(element), placed, `${source}: no node moved`);
        }

        // Street tiles refine as the camera nears the surface.
        await element.session.layout.set("location-map", {
            options: { surface: "globe", extent: "world", map: { source: "openstreetmap" } },
        });
        await basemapIs(element, "ready", "openstreetmap");
        await applied(element);
        const far = Math.max(...globeTiles(element).map((t) => t.z));
        for (let i = 0; i < 12; i++) {
            await wheel(element, CENTER, -400);
        }
        await vi.waitFor(async () => {
            await applied(element);
            assert.isAbove(Math.max(...globeTiles(element).map((t) => t.z)), far, "finer tiles near the surface");
        });

        // The map is saved with the layout.
        const saved = await element.session.project.save({ markSaved: false });
        assert.include(saved.text.replace(/\s/g, ""), '"map":{"source":"openstreetmap"}');
    });
});

describe("the location map's history and map", () => {
    it("draws the map again when an undo brings back a map layout", async () => {
        const element = await mounted("2d");
        await element.session.layout.set("location-map", { options: { extent: "world" } });
        await applied(element);
        await element.session.undo();
        await applied(element);
        assert.strictEqual(element.session.layout.id, "location-map");
        assert.notStrictEqual(element.session.layout.options.extent, "world");
        await vi.waitFor(async () => {
            await applied(element);
            assert.isNotNull(element.mapFrame, "the frame is published again");
            assert.notStrictEqual(element.basemapStatus.state, "off", "the map is drawn");
        });
    });

    it("refuses a map layout on a graph with no location and keeps the layout it had", async () => {
        const element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = `${String(WIDTH)}px`;
        element.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await element.updateComplete;
        await element.session.data.addNodes([
            { id: "a", label: "A" },
            { id: "b", label: "B" },
        ]);
        await applied(element);
        const before = element.session.layout.id;
        let refusal: unknown;
        await element.session.layout.set("location-map").catch((error: unknown) => {
            refusal = (error as { details?: { refusal?: unknown } }).details?.refusal;
        });
        assert.deepInclude(refusal, { code: "layout.needs-location" });
        assert.strictEqual(element.session.layout.id, before);
    });

    it("reads the designated location columns, and finds them itself when none is designated", async () => {
        const element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = `${String(WIDTH)}px`;
        element.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await element.updateComplete;
        // Each city also carries a second place, mirrored east to west, as an unnamed pair.
        await element.session.data.addNodes(CITIES.map((c) => ({ ...c, north: c.latitude, east: -60 - c.longitude })));
        await applied(element);
        const { layout } = element.session;
        assert.deepEqual(layout.locationColumns(), {
            from: "detected",
            location: null,
            latitude: "latitude",
            longitude: "longitude",
            role: "coords",
            within: null,
            kinds: { latitude: "latitude", longitude: "longitude" },
            using: "pair",
            unused: [],
        });

        await layout.set("location-map");
        await vi.waitFor(async () => {
            await applied(element);
            assert.strictEqual(element.mapFrame?.location.kind, "columns");
        });
        const detected = scenePositions(element);

        await element.session.config.set({
            data: { knownFields: { nodeLatitudePath: "north", nodeLongitudePath: "east" } },
        });
        assert.deepEqual(layout.locationColumns(), {
            from: "designated",
            location: null,
            latitude: "north",
            longitude: "east",
            role: "coords",
            within: null,
            kinds: { latitude: "north", longitude: "east" },
            using: "pair",
            unused: [],
        });
        assert.deepEqual(scenePositions(element), detected, "a designation moves no node by itself");

        // The same layout again reads the designated pair.
        await layout.set("location-map");
        await vi.waitFor(async () => {
            await applied(element);
            const location = element.mapFrame?.location;
            assert.deepInclude(location, { kind: "columns", latitude: "north", longitude: "east" });
        });
        assert.notDeepEqual(scenePositions(element), detected, "the nodes moved to the designated places");

        // A designated column no node carries is refused, as a named option is.
        await element.session.config.set({
            data: { knownFields: { nodeLatitudePath: null, nodeLongitudePath: null, nodeLocationPath: "nowhere" } },
        });
        assert.strictEqual(layout.locationColumns().from, "designated");
        assert.strictEqual(
            element.session.estimate({ op: "layout.set", id: "location-map" }).refusal?.code,
            "layout.needs-location",
        );
    });

    it("falls back to the bundled world when tiles cannot be reached, says so, and credits only what it drew", async () => {
        // The map starts as the gray world, made from the bundled picture, so the full-color world a
        // tile service is drawn over has not been loaded yet when the service is set.
        const element = await mounted("2d", { map: { source: "natural-earth-gray" } });
        await basemapIs(element, "ready", "natural-earth-gray");
        // The order a slow machine brings: the service refuses its tiles while the world under them
        // is still on its way.
        await commands.holdRequests("natural-earth.jpg");
        await commands.holdRequests("127.0.0.1:9");
        // The credits drawn when each state is told: a fallback is told once the world it falls back
        // to is drawn, so its credit is already on screen then, not a frame or a picture later.
        const states: { state: string; error?: { code: string }; credit: string | null }[] = [];
        element.addEventListener("basemap-status", (event) => {
            states.push({ ...event.detail, credit: creditLink(element) });
        });
        await element.session.layout.set("location-map", {
            options: { map: { tiles: "http://127.0.0.1:9/{z}/{x}/{y}.png", attribution: "Bad Tiles Co" } },
        });
        await commands.releaseRequests("127.0.0.1:9", true);
        await applied(element);
        await applied(element);
        await commands.releaseRequests("natural-earth.jpg", false);
        await basemapIs(element, "fallback");
        const fallback = states.find((s) => s.state === "fallback");
        assert.deepInclude(fallback?.error, { code: "E_BASEMAP_UNREACHABLE" });
        assert.strictEqual(fallback?.credit, "https://www.naturalearthdata.com/", "the credit is a link when told");
        assert.notInclude(element.basemapStatus.attribution, "Bad Tiles Co");
        await applied(element);
        assert.strictEqual(creditLink(element), "https://www.naturalearthdata.com/", "the credit is a link");
    });
});
