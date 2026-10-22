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

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { click, drag, type Point, wheel } from "../helpers/real-input";

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
        assert.isBelow(viewDirection(element).z, -0.9, "the first map is seen from its face (-z)");
        // Turn the view half way round, as a reader would, by dragging.
        await drag(element, { x: 40, y: CENTER.y }, { x: WIDTH - 20, y: CENTER.y }, 16);
        await drag(element, { x: 40, y: CENTER.y }, { x: WIDTH - 20, y: CENTER.y }, 16);
        await applied(element);
        await element.session.layout.set("location-map", { options: { extent: "world" } });
        await applied(element);
        await vi.waitFor(async () => {
            await applied(element);
            assert.isBelow(viewDirection(element).z, -0.9, "the new map is faced again");
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
        element.basemap = { source: "natural-earth-gray" };
        await element.session.layout.set("location-map", { options: { extent: "world" } });
        await applied(element);
        await vi.waitFor(async () => {
            assert.isAbove(await colorsAround(element, CENTER, 40), 20, "a picture under the graph in 3D");
        });
        await element.setViewMode("2d");
        await applied(element);
        await vi.waitFor(async () => {
            assert.isAbove(await colorsAround(element, CENTER, 40), 20, "and in 2D");
        });
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

    it("falls back to the bundled world when tiles cannot be reached, says so, and credits only what it drew", async () => {
        const element = await mounted("2d");
        const states: { state: string; error?: { code: string } }[] = [];
        element.addEventListener("basemap-status", (event) => {
            states.push(event.detail);
        });
        element.basemap = { tiles: "http://127.0.0.1:9/{z}/{x}/{y}.png", attribution: "Bad Tiles Co" };
        await vi.waitFor(async () => {
            await applied(element);
            assert.strictEqual(element.basemapStatus.state, "fallback");
        });
        assert.deepInclude(states.at(-1)?.error, { code: "E_BASEMAP_UNREACHABLE" });
        assert.notInclude(element.basemapStatus.attribution, "Bad Tiles Co");
        const strip =
            element.querySelector("[data-graphty-attribution]") ??
            element.shadowRoot?.querySelector("[data-graphty-attribution]");
        const link = strip?.querySelector("a");
        assert.strictEqual(link?.getAttribute("href"), "https://www.naturalearthdata.com/", "the credit is a link");
    });
});
