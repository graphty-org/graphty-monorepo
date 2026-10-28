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
import { commands, userEvent } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderManager } from "../../src/managers/RenderManager";
import { drawnFrames } from "../helpers/drawn-frames";
import { click, drag, nextFrame, type Point, wheel } from "../helpers/real-input";

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
 * Wait until the map reports a state, now or in a later basemap-status event: tiles take as long
 * as they take, so no deadline.
 * @param element - The element.
 * @param state - The state.
 * @param source - The source it must be drawing, when it matters.
 * @param credit - A credit it must be giving, when it matters: a credit follows what is drawn.
 */
function basemapIs(element: Graphty, state: string, source?: string, credit?: string): Promise<void> {
    type Status = { state: string; source: string; attribution: readonly string[] };
    const is = (s: Status): boolean =>
        s.state === state &&
        (source === undefined || s.source === source) &&
        (credit === undefined || s.attribution.includes(credit));
    if (is(element.basemapStatus)) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        const on = (event: CustomEvent<Status>): void => {
            if (is(event.detail)) {
                element.removeEventListener("basemap-status", on);
                resolve();
            }
        };
        element.addEventListener("basemap-status", on);
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
 * A mounted element holding the cities (or other places), laid out on the map.
 * @param viewMode - The view mode.
 * @param options - The layout's options.
 * @param places - The nodes, a latitude and longitude each; routes join the cities only.
 * @returns The element.
 */
async function mounted(
    viewMode: "2d" | "3d",
    options: Record<string, unknown> = {},
    places: readonly { id: string; latitude: number; longitude: number }[] = CITIES,
): Promise<Graphty> {
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
    await element.session.data.addNodes(places);
    if (places === CITIES) {
        await element.session.data.addEdges([
            { src: "SEA", dst: "NYC" },
            { src: "SFO", dst: "BOS" },
            { src: "LAX", dst: "MIA" },
        ]);
    }
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
        const element = await mounted("3d", { mapDimension: "2d" });
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
        const element = await mounted("3d", { mapDimension: "2d" });
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

    it("never zooms inside the globe, however far the wheel turns, and never clips its surface", async () => {
        const element = await mounted("3d", { mapDimension: "3d" });
        const frame = element.mapFrame;
        assert.strictEqual(frame?.mapDimension, "3d");
        const radius = frame?.mapDimension === "3d" ? frame.radius : 0;
        for (let notch = 0; notch < 20; notch++) {
            await wheel(element, CENTER, -400);
            await drawnFrames(element.graph.getScene(), 1);
        }
        await applied(element);
        const camera = element.graph.getScene().activeCamera?.globalPosition;
        assert.isDefined(camera);
        assert.isAtLeast(camera.length(), radius * 1.02 - 1e-3, "the camera is outside the globe");
        const near = element.graph.getScene().activeCamera?.minZ ?? Infinity;
        assert.isBelow(near, camera.length() - radius, "the near clip plane stops short of the surface");
        // The surface fills the view: the map's picture, shaded across it, not the one flat colour
        // of the background a clipped surface would leave.
        assert.isAbove(await colorsAround(element, CENTER, 40), 1, "the map is drawn, not clipped");
    });

    it("turns the globe under the hand: the place grabbed stays under the pointer", async () => {
        const element = await mounted("3d", { mapDimension: "3d" });
        const frame = element.mapFrame;
        const radius = frame?.mapDimension === "3d" ? frame.radius : 0;
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
        const element = await mounted("3d", { mapDimension: "2d" });
        element.cameraTransitionDuration = 0;
        await element.applyCameraView("sideView", { animate: true });
        const landed = JSON.stringify(element.getCameraState());
        await applied(element);
        assert.strictEqual(JSON.stringify(element.getCameraState()), landed, "nothing was left to glide");
        assert.isBelow(viewDirection(element).y, -0.8);
    });

    it("opens a globe as the whole sphere, and an undo frames the flat map again", async () => {
        const element = await mounted("3d", { mapDimension: "2d" });
        // How far apart Seattle and Miami are drawn: the share of the view the data fills.
        const spread = (): number => {
            const a = at(element, "SEA");
            const b = at(element, "MIA");
            return Math.hypot(a.x - b.x, a.y - b.y);
        };
        const flat = spread();
        await element.session.layout.set("location-map", { options: { mapDimension: "3d" } });
        await applied(element);
        await vi.waitFor(async () => {
            await applied(element);
            assert.isBelow(spread() / flat, 0.8, "the globe frames the whole sphere, not only the data");
        });
        await element.session.undo();
        await applied(element);
        await vi.waitFor(async () => {
            await applied(element);
            assert.strictEqual(element.mapFrame?.mapDimension, "2d");
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
        await vi.waitFor(async () => {
            // The globe fills the view, its middle a plain gray ocean: the box takes in land too.
            assert.isAbove(await colorsAround(element, CENTER, 100), 20, "a picture under the graph in 3D");
        });
        await element.setViewMode("2d");
        await applied(element);
        await basemapIs(element, "ready", "natural-earth-gray");
        await applied(element);
        await vi.waitFor(async () => {
            // The 2D view frames the whole world map afresh, its middle the plain gray Atlantic.
            assert.isAbove(await colorsAround(element, CENTER, 100), 20, "and in 2D");
        });
    });

    it("says it is loading until a tile is drawn, so a reader waiting for ready sees the map", async () => {
        const element = await mounted("3d");
        await applied(element);
        await element.session.layout.set("location-map", { options: { extent: "world" } });
        // Nothing asked for yet is not ready: the status stays loading until a tile has settled.
        await basemapIs(element, "ready");
        await applied(element);
        assert.strictEqual(element.basemapStatus.state, "ready");
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

describe("the map's dimension and the view", () => {
    it("draws the globe in 3D by default, the 2D map with straight edges in 2D, and the globe again in 3D", async () => {
        const element = await mounted("3d");
        const globe = element.mapFrame;
        assert.strictEqual(globe?.mapDimension, "3d", "the 3D view draws the 3D map unasked");
        const radius = globe?.mapDimension === "3d" ? globe.radius : 0;
        for (const line of edgeLines(element)) {
            assert.isNotNull(line, "a globe draws each edge as an arc");
            const highest = Math.max(...(line ?? []).map((p) => Math.hypot(p.x, p.y, p.z)));
            assert.isAbove(highest, radius, "above the sphere");
        }

        await element.setViewMode("2d");
        await applied(element);
        assert.strictEqual(element.mapFrame?.mapDimension, "2d", "the 2D view draws the 2D map");
        assert.deepEqual(edgeLines(element), [null, null, null], "with straight edges");

        await element.setViewMode("3d");
        await applied(element);
        assert.strictEqual(element.mapFrame?.mapDimension, "3d", "back in 3D, the globe again");
    });

    it("draws the 2D map with arcs above it in 3D when asked, and keeps that choice across 2D", async () => {
        const element = await mounted("3d", { mapDimension: "2d" });
        assert.strictEqual(element.mapFrame?.mapDimension, "2d");
        for (const line of edgeLines(element)) {
            assert.isNotNull(line, "a 2D map in 3D draws each edge as an arc");
            const lift = Math.max(...(line ?? []).map((p) => Math.abs(p.z)));
            assert.isAbove(lift, 0, "raised off the map's plane");
        }

        await element.setViewMode("2d");
        await applied(element);
        await element.setViewMode("3d");
        await applied(element);
        assert.strictEqual(element.mapFrame?.mapDimension, "2d", "the reader's 2D map is kept");
    });

    it("raises arcs above a map laid out flat (Shape 2D) in the 3D view", async () => {
        // The layout's own shape, dim 2, draws the 2D map; in the 3D view its edges still rise.
        const element = await mounted("3d", { dim: 2 });
        assert.strictEqual(element.mapFrame?.mapDimension, "2d");
        for (const line of edgeLines(element)) {
            assert.isNotNull(line, "each edge is drawn as an arc");
            const lift = Math.max(...(line ?? []).map((p) => -p.z));
            assert.isAbove(lift, 0, "raised off the map's plane, toward the camera");
        }
    });

    it("takes a 3D map asked for in the 2D view and draws the 2D map there", async () => {
        const element = await mounted("2d", { mapDimension: "3d" });
        assert.strictEqual(element.mapFrame?.mapDimension, "2d");
        assert.strictEqual(element.session.layout.options.mapDimension, "3d", "kept for the 3D view");
        assert.deepEqual(element.session.layout.optionInEffect("location-map", "mapDimension"), {
            inEffect: false,
            code: "setting.notIn2d",
            params: { setting: "mapDimension", drawn: "2d" },
        });
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

/**
 * The camera's height above the globe, as a share of its radius, before a key is pressed and after
 * each of the first `count` camera updates it is held for. The key is real input; the render loop
 * is held from the last counted update until the key-up arrives, so the key moves the camera
 * exactly `count` times.
 * @param element - The element, its canvas focused.
 * @param key - The key, as userEvent names it.
 * @param count - How many updates to hold it for.
 * @returns The heights, the one before the press first.
 */
async function heightsWhileHeld(element: Graphty, key: string, count: number): Promise<number[]> {
    const frame = element.mapFrame;
    const radius = frame?.mapDimension === "3d" ? frame.radius : Number.NaN;
    const scene = element.graph.getScene();
    // The camera's own position under the pivot at the globe's center, not its globalPosition:
    // that comes from the world matrix in single precision, about 1e-6 of a height near the
    // surface, which is the closeness these ratios are held to.
    const height = (): number => (scene.activeCamera?.position.length() ?? Number.NaN) / radius - 1;
    const input = (element.graph.camera as unknown as { inputs: Map<string, { update(): void }> }).inputs.get("orbit");
    assert.isDefined(input);
    const { renderManager } = element.graph as unknown as { renderManager: RenderManager };
    const update = input.update.bind(input);
    const heights = [height()];
    let held = false;
    let release = (): void => undefined;
    input.update = (): void => {
        update();
        if (held && heights.length <= count) {
            heights.push(height());
            if (heights.length > count) {
                release = renderManager.holdFrames();
            }
        }
    };
    const press = (): void => {
        held = true;
    };
    element.graph.canvas.addEventListener("keydown", press);
    try {
        await userEvent.keyboard(`{${key}>}`);
        while (heights.length <= count) {
            await nextFrame();
        }
        held = false;
        await userEvent.keyboard(`{/${key}}`);
    } finally {
        release();
        input.update = update;
        element.graph.canvas.removeEventListener("keydown", press);
    }
    await applied(element);
    return heights;
}

describe("W and S on the globe", () => {
    // The camera turns about the globe's center, so its distance from the pivot is the radius plus
    // its height. A zoom by a share of that distance moved the camera near the surface by most of
    // its height in one step: one press jumped it to the surface (and S jumped it far out).
    it("zoom by a share of the camera's height above the surface, slower near it, never jumping", async () => {
        const element = await mounted("3d", { mapDimension: "3d" });
        const frame = element.mapFrame;
        const radius = frame?.mapDimension === "3d" ? frame.radius : 0;
        await click(element, { x: 6, y: 6 });
        await applied(element);
        const start = element.getCameraState().cameraDistance ?? Number.NaN;
        const runs: Record<string, number[]> = {};
        for (const [name, distance] of [
            ["far", start],
            ["near", radius * 1.1],
        ] as const) {
            for (const key of ["w", "s"]) {
                await element.setCameraState({ cameraDistance: distance });
                await applied(element);
                runs[`${key} ${name}`] = await heightsWhileHeld(element, key, 12);
            }
        }

        for (const key of ["w", "s"]) {
            const far = runs[`${key} far`];
            const near = runs[`${key} near`];
            assert.isBelow(near[0], far[0] / 10, "the near run starts close to the surface");
            for (let k = 1; k < near.length; k++) {
                assert.closeTo(
                    near[k] / near[k - 1],
                    far[k] / far[k - 1],
                    1e-6,
                    `${key}, update ${String(k)}: the height changes by the same share near the surface as far out`,
                );
                assert.isBelow(
                    Math.abs(near[k] - near[k - 1]),
                    Math.abs(far[k] - far[k - 1]) + 1e-12,
                    `${key}, update ${String(k)}: the camera moves less near the surface`,
                );
            }
            // The first update holds the press: no more than one wheel notch (1.1) of the height.
            const first = near[1] / near[0];
            assert.isAtLeast(Math.min(first, 1 / first), 1 / 1.1 - 1e-9, `${key}: no jump on the press`);
            assert.notStrictEqual(near.at(-1), near[0], `${key} moved the camera`);
        }
    });
});

describe("zooming a map whose nodes keep their size on screen", () => {
    // With nodeScale: "screen" every zoom step scales every node, and every edge used to be cut
    // back to its nodes' new surfaces on each one: on the OpenFlights sample's 36,906 routes that
    // was about 300 ms a step, so the wheel and W zoomed slow and choppy while turning stayed
    // smooth. The work is counted: edges cut per zoom step.
    it("cuts edges back to the nodes only as the scale drifts, then exactly where the zoom stops", async () => {
        const element = await mounted("3d", { mapDimension: "3d", nodeScale: "screen" });
        const stats = element.getStatsManager();
        stats.enableProfiling();
        cleanups.push(() => {
            stats.disableProfiling();
        });
        const counter = "edges.retrimmedForNodeScale";
        const edges = element.graph.getDataManager().edges.size;
        const scale = (): number => element.graph.getNode("CHI")?.mesh.scaling.x ?? Number.NaN;
        stats.resetCounter(counter);
        const steps = 12;
        let scaledSteps = 0;
        for (let step = 0; step < steps; step++) {
            const before = scale();
            await wheel(element, CENTER, -100);
            // Two drawn frames a notch, as a wheel's notches come: far fewer than a held view's.
            await drawnFrames(element.graph.getScene(), 2);
            scaledSteps += scale() === before ? 0 : 1;
        }

        const whileZooming = stats.getCounter(counter);
        assert.isAtLeast(scaledSteps, steps - 1, "every notch scaled the nodes");
        // Cut on every step, the zoom cut every edge each time: steps * edges.
        assert.isAtMost(whileZooming, (steps * edges) / 2, "edges are cut at most every other step");

        await applied(element);
        assert.isAbove(stats.getCounter(counter), whileZooming, "the edges are cut again once the zoom stops");
        const held = stats.getCounter(counter);
        await applied(element);
        assert.strictEqual(stats.getCounter(counter), held, "and not again while the view holds still");
    });
});

describe("the globe's map", () => {
    it("wraps every kind of source onto the sphere, switched live without moving a node, refining as it nears", async () => {
        const element = await mounted("3d", { mapDimension: "3d", extent: "world" });
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
            await element.session.layout.set("location-map", { options: { mapDimension: "3d", extent: "world", map } });
            await basemapIs(element, "ready", source);
            await applied(element);
            assert.strictEqual(element.basemapStatus.source, source);
            assert.strictEqual(element.basemapStatus.state, "ready", source);
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
            options: { mapDimension: "3d", extent: "world", map: { source: "openstreetmap" } },
        });
        await basemapIs(element, "ready", "openstreetmap");
        await applied(element);
        assert.strictEqual(element.basemapStatus.state, "ready");
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

describe("the globe's map near its surface", () => {
    // Near the surface the camera sees a small cap of the globe, inside one coarse tile and far
    // from the nine points the tile was judged by: the tile was dropped as behind the horizon, so
    // the street tiles under the camera were never asked for and the bundled picture showed.
    it("draws street tiles under the whole view after W is pressed down to the surface", async () => {
        // Two Caribbean cities: the view comes down between the nine points of the coarse tiles
        // around them, about 30 degrees from the nearest, where the cap seen is 11 degrees across.
        const element = await mounted("3d", { mapDimension: "3d", map: { source: "openstreetmap" } }, [
            { id: "SJU", latitude: 18.47, longitude: -66.1 },
            { id: "SDQ", latitude: 18.49, longitude: -69.9 },
        ]);
        const frame = element.mapFrame;
        const radius = frame?.mapDimension === "3d" ? frame.radius : 0;
        await click(element, { x: 6, y: 6 });
        const scene = element.graph.getScene();
        const height = (): number => (scene.activeCamera?.globalPosition.length() ?? Number.NaN) / radius - 1;
        let presses = 0;
        while (height() > 0.021) {
            await userEvent.keyboard("w");
            await applied(element);
            presses++;
            assert.isBelow(presses, 200, "W keeps moving the camera toward the surface");
        }
        while (element.basemapStatus.state !== "ready") {
            await applied(element);
        }

        // Every spot of the view on the globe has a street tile drawn over it.
        const street = (m: { name: string; isEnabled(): boolean }): boolean =>
            m.name.startsWith("graphty-globe-tile-") && m.name.includes("openstreetmap") && m.isEnabled();
        const { engine } = element.graph;
        let seen = 0;
        let covered = 0;
        for (let j = 1; j < 10; j++) {
            for (let i = 1; i < 10; i++) {
                const ray = scene.createPickingRay(
                    (engine.getRenderWidth() * i) / 10,
                    (engine.getRenderHeight() * j) / 10,
                    Matrix.Identity(),
                    scene.activeCamera,
                );
                if (raySphere(ray.origin, ray.direction, radius) === null) {
                    continue;
                }
                seen++;
                covered += scene.pickWithRay(ray, street)?.hit === true ? 1 : 0;
            }
        }
        assert.isAbove(seen, 0, "the view is on the globe");
        assert.strictEqual(covered, seen, "a street tile under every spot of the view");
        assert.isAtLeast(Math.max(...globeTiles(element).map((t) => t.z)), 6, "fine tiles near the surface");
    });
});

describe("the globe's layers near its surface", () => {
    // A tile service is drawn over the bundled world. Both are patches of flat facets between
    // points on the sphere; where the world's points stood on the sphere they poked through the
    // tiles' facets, and zoomed in close the reader saw light diamonds of the world picture over
    // the satellite map (OpenFlights, between Port Moresby and the Solomon Islands).
    it("shows only the tile service over the view after W is pressed down to the surface", async () => {
        const tile = document.createElement("canvas");
        tile.width = 4;
        tile.height = 4;
        const context = tile.getContext("2d");
        assert.isNotNull(context);
        context.fillStyle = "#00ff00";
        context.fillRect(0, 0, 4, 4);
        // Longitude 0, latitude 0 is one of the bundled world's points: the view comes down on it.
        const element = await mounted(
            "3d",
            { mapDimension: "3d", map: { tiles: tile.toDataURL("image/png"), attribution: "green" } },
            [
                { id: "NE", latitude: 10, longitude: 10 },
                { id: "SW", latitude: -10, longitude: -10 },
            ],
        );
        const frame = element.mapFrame;
        const radius = frame?.mapDimension === "3d" ? frame.radius : 0;
        await click(element, { x: 6, y: 6 });
        const scene = element.graph.getScene();
        const height = (): number => (scene.activeCamera?.globalPosition.length() ?? Number.NaN) / radius - 1;
        // Every pixel of the view is the green tile, shaded darker toward the rim: none is the
        // world picture or the background showing through, at each height on the way down.
        const { engine } = element.graph;
        const notTile = async (): Promise<number> => {
            scene.render();
            const width = engine.getRenderWidth();
            const tall = engine.getRenderHeight();
            const pixels = (await engine.readPixels(0, 0, width, tall)) as unknown as Uint8Array;
            let other = 0;
            for (let o = 0; o < pixels.length; o += 4) {
                if (pixels[o] > 40 || pixels[o + 2] > 40 || pixels[o + 1] < 40) {
                    other++;
                }
            }
            return other;
        };
        let presses = 0;
        const counts: Record<string, number> = {};
        for (const stop of [0.3, 0.15, 0.08, 0.04, 0.02]) {
            while (height() > stop) {
                await userEvent.keyboard("w");
                await applied(element);
                presses++;
                assert.isBelow(presses, 200, "W keeps moving the camera toward the surface");
            }
            while (element.basemapStatus.state !== "ready") {
                await applied(element);
            }
            counts[String(stop)] = await notTile();
        }
        assert.deepEqual(
            counts,
            { "0.3": 0, "0.15": 0, "0.08": 0, "0.04": 0, "0.02": 0 },
            "pixels of the view not drawn from the tile service, by height",
        );
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
        assert.strictEqual(element.basemapStatus.state, "fallback");
        const fallback = states.find((s) => s.state === "fallback");
        assert.deepInclude(fallback?.error, { code: "E_BASEMAP_UNREACHABLE" });
        assert.strictEqual(fallback?.credit, "https://www.naturalearthdata.com/", "the credit is a link when told");
        assert.notInclude(element.basemapStatus.attribution, "Bad Tiles Co");
        await applied(element);
        assert.strictEqual(creditLink(element), "https://www.naturalearthdata.com/", "the credit is a link");
    });
});
