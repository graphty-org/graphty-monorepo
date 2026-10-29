/**
 * @file The location map layout in a real Graph: OpenFlights' airports placed at their latitude
 * and longitude on the projected map, the map drawn under them with its credits, flat in 2D,
 * a flat map or a globe in 3D, raised and great-circle arcs for edges, and nodes with no location
 * put in a tray and reported.
 */

import "../../src/graphty-element";

import type { GraphSnapshot } from "@graphty/graph-format";
import { openflights } from "@graphty/graph-samples/datasets/openflights";
import { createMapFrame, longitudeIn } from "babylonjs-map/projection";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import type { Edge } from "../../src/Edge";
import type { LayoutWarningEvent } from "../../src/events";
import { Graph, operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";

/**
 * OpenFlights from graph-samples' build output, never the network.
 * @returns The response holding the gzipped snapshot.
 */
async function local(): Promise<Response> {
    const served = await import("../../../graph-samples/dist/data/v1/openflights.gsnp.gz?url");
    return fetch(served.default);
}

const FLIGHTS: GraphSnapshot = await openflights({ fetch: local });
/** Enough airports and routes to cover the world, few enough to draw quickly. */
const AIRPORTS = 400;

/**
 * The first airports as node records, with their coordinates.
 * @returns The records.
 */
function airportRecords(): Record<string, unknown>[] {
    return Array.from({ length: AIRPORTS }, (_, row) => ({
        id: String(FLIGHTS.ids.idOf(row)),
        latitude: FLIGHTS.nodes.value("latitude", row),
        longitude: FLIGHTS.nodes.value("longitude", row),
    }));
}

/**
 * Routes between the first airports.
 * @param limit - The most routes.
 * @returns The edge records.
 */
function routeRecords(limit: number): { src: string; dst: string }[] {
    const out: { src: string; dst: string }[] = [];
    for (let e = 0; e < FLIGHTS.edgeCount && out.length < limit; e++) {
        const s = FLIGHTS.edgeSource(e);
        const t = FLIGHTS.edgeTarget(e);
        if (s < AIRPORTS && t < AIRPORTS && s !== t) {
            out.push({ src: String(FLIGHTS.ids.idOf(s)), dst: String(FLIGHTS.ids.idOf(t)) });
        }
    }

    return out;
}

describe("the location map layout", () => {
    let container: HTMLDivElement;
    let graph: Graph;
    let warnings: Omit<LayoutWarningEvent, "type">[];

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "600px";
        container.style.height = "400px";
        container.style.position = "relative";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        warnings = [];
        graph.addListener("layout-warning", (event) => {
            warnings.push({ layoutType: event.layoutType, code: event.code, params: event.params });
        });
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /** Let the element draw until its layout has published its answer. */
    async function settled(): Promise<void> {
        await operationQueueOf(graph).waitForCompletion();
        const manager = graph.getLayoutManager();
        while (!(manager.layoutEngine?.isSettled ?? false) || manager.running) {
            await drawnFrames(graph.getScene(), 1);
        }
    }

    /**
     * Where a node is drawn.
     * @param id - The node.
     * @returns Its position.
     */
    function at(id: string): { x: number; y: number; z: number } {
        const position = graph.getNode(id)?.getPosition();
        assert.isDefined(position, id);
        return { x: position.x, y: position.y, z: position.z };
    }

    /**
     * Load airports (and routes), choose the layout, and wait for it.
     * @param options - The layout's options.
     * @param routes - How many routes.
     */
    async function placeAirports(options: Record<string, unknown> = {}, routes = 0): Promise<void> {
        await graph.addNodes(airportRecords());
        if (routes > 0) {
            await graph.addEdges(routeRecords(routes));
        }

        await graph.setLayout("location-map", options);
        await settled();
    }

    it("places OpenFlights' airports at their projected coordinates in 2D, found with no options", async () => {
        await graph.setViewMode("2d");
        await placeAirports();

        const engine = graph.getLayoutManager().layoutEngine as unknown as {
            geoFrame: { surface: string; bounds: [[number, number], [number, number]] } | null;
        };
        assert.equal(engine.geoFrame?.surface, "flat");
        const bounds = engine.geoFrame?.bounds;
        assert.isDefined(bounds);
        const frame = createMapFrame({ projection: "web-mercator", bounds, size: 100 });
        for (const row of [0, 57, 199, AIRPORTS - 1]) {
            const id = String(FLIGHTS.ids.idOf(row));
            const lat = Number(FLIGHTS.nodes.value("latitude", row));
            const lon = Number(FLIGHTS.nodes.value("longitude", row));
            // the box may run past 180 degrees (the gap rule), so a longitude is shifted into it
            const expected = frame.toScene({ lat, lon: longitudeIn(lon, bounds) });
            const drawn = at(id);
            // co-located airports are spread by up to a few node sizes
            assert.closeTo(drawn.x, expected.x, 3, `${id} x`);
            assert.closeTo(drawn.y, expected.y, 3, `${id} y`);
            assert.equal(drawn.z, 0);
        }

        assert.deepEqual(
            warnings.filter((w) => w.layoutType === "location-map"),
            [],
        );
    });

    it("draws the map under the nodes with its credits, and removes it with another layout", async () => {
        await placeAirports({ latitude: "latitude", longitude: "longitude" });
        // a hang guard for the bundled picture loading, not a pass/fail timing
        await vi.waitFor(
            () => {
                assert.equal(graph.basemapStatus.state, "ready");
            },
            { timeout: 20_000, interval: 100 },
        );
        assert.equal(graph.basemapStatus.source, "natural-earth");
        assert.include(graph.basemapStatus.attribution, "Natural Earth");
        const strip = container.querySelector<HTMLElement>("[data-graphty-attribution]");
        assert.isNotNull(strip);
        // the credit, after the "(c)" button it folds into when it does not fit
        assert.include(strip?.textContent, "Natural Earth");
        assert.notEqual(strip?.style.display, "none");

        await graph.setLayout("circular");
        await settled();
        await drawnFrames(graph.getScene(), 1);
        assert.equal(graph.basemapStatus.state, "off");
        assert.equal(strip?.style.display, "none");
    });

    it("switches between a 2D map and a globe in 3D, with raised arcs and great-circle arcs", async () => {
        await graph.setViewMode("3d");
        await placeAirports({ mapDimension: "2d" }, 60);
        const edges = [...graph.getDataManager().edges.values()];
        assert.isAbove(edges.length, 10);

        // flat 3D: nodes just above the map (toward the camera), edges raised toward the camera
        await drawnFrames(graph.getScene(), 2);
        const id = String(FLIGHTS.ids.idOf(0));
        assert.isBelow(at(id).z, 0);
        const flatArc = longestCurve(edges);
        assert.isNotNull(flatArc);
        const lowest = Math.min(...(flatArc ?? []).map((p) => p.z));
        assert.isBelow(lowest, at(id).z - 0.5, "the arc rises off the map");

        await graph.setLayout("location-map", { mapDimension: "3d" });
        await settled();
        await drawnFrames(graph.getScene(), 2);
        const p = at(id);
        const globe = (graph.getLayoutManager().layoutEngine as unknown as { geoFrame: { radius?: number } | null })
            .geoFrame;
        const radius = globe?.radius ?? Number.NaN;
        // the radius makes the data span `size` units of arc; a node sits half its size above it
        assert.closeTo(Math.hypot(p.x, p.y, p.z), radius, 2, "on the globe's surface");
        const globeArc = longestCurve(edges);
        assert.isNotNull(globeArc);
        const radii = (globeArc ?? []).map((q) => Math.hypot(q.x, q.y, q.z));
        // a thousandth of the radius: 0.1 when the globe's radius was 100
        assert.isAbove(
            Math.max(...radii),
            Math.max(radii[0], radii.at(-1) ?? 0) + radius / 1000,
            "the arc rises off the globe",
        );
        await vi.waitFor(() => {
            assert.notEqual(graph.basemapStatus.state, "off");
        });

        // back to 2D: the flat map, straight edges
        await graph.setViewMode("2d");
        await settled();
        await drawnFrames(graph.getScene(), 2);
        const engine = graph.getLayoutManager().layoutEngine as unknown as { geoFrame: { surface: string } | null };
        assert.equal(engine.geoFrame?.surface, "flat");
        assert.isNull(longestCurve(edges));
    });

    it("draws a globe mapScale times larger under nodes, edges and arcs that keep their size", async () => {
        await graph.setViewMode("3d");
        const id = String(FLIGHTS.ids.idOf(0));
        const edges = (): Edge[] => [...graph.getDataManager().edges.values()];
        /** What the globe and the drawing measure at one mapScale, at the default view. */
        async function measure(
            mapScale: number,
            nodeScale: "scene" | "screen",
        ): Promise<{
            radius: number;
            lift: number;
            nodeWorld: number;
            nodeOverHeight: number;
            widths: number[];
            arcRise: number;
        }> {
            await graph.setLayout("location-map", { mapScale, nodeScale });
            await settled();
            await drawnFrames(graph.getScene(), 2);
            const frame = (graph.getLayoutManager().layoutEngine as unknown as { geoFrame: { radius: number } })
                .geoFrame;
            const p = at(id);
            const mesh = graph.getNode(id)?.mesh;
            assert.isDefined(mesh);
            const curve = longestCurve(edges()) ?? [];
            const first = curve[0];
            const last = curve.at(-1) ?? first;
            const surface = Math.max(Math.hypot(first.x, first.y, first.z), Math.hypot(last.x, last.y, last.z));
            const rise = Math.max(...curve.map((q) => Math.hypot(q.x, q.y, q.z))) - surface;
            const chord = Math.hypot(first.x - last.x, first.y - last.y, first.z - last.z);
            return {
                radius: frame.radius,
                lift: Math.hypot(p.x, p.y, p.z) - frame.radius,
                nodeWorld: mesh.getBoundingInfo().boundingBox.extendSizeWorld.length(),
                // a node's scene size over the camera's height above the globe: what one size on
                // screen holds fixed, however the camera stands
                nodeOverHeight:
                    mesh.getBoundingInfo().boundingBox.extendSizeWorld.length() /
                    ((graph.getScene().activeCamera?.globalPosition.length() ?? Number.NaN) - frame.radius),
                widths: edges().map((e) => e.drawnLine?.width ?? Number.NaN),
                arcRise: rise / chord,
            };
        }

        await placeAirports({}, 60);
        const one = await measure(1, "scene");
        const three = await measure(3, "scene");
        assert.closeTo(three.radius / one.radius, 3, 1e-9, "the globe is three times larger");
        assert.closeTo(three.lift, one.lift, 1e-3, "a node stands the same height above it");
        assert.closeTo(three.nodeWorld, one.nodeWorld, 1e-6, "a node keeps its size in scene units");
        assert.deepEqual(three.widths, one.widths, "an edge keeps its width");
        assert.closeTo(three.arcRise, one.arcRise, 0.02, "an arc still rises in proportion to the distance it spans");

        // on screen: a screen-sized node keeps its size on screen, so it does not grow with the globe
        const screenOne = await measure(1, "screen");
        const screenThree = await measure(3, "screen");
        assert.isAbove(screenOne.nodeOverHeight, 0);
        assert.closeTo(
            screenThree.nodeOverHeight / screenOne.nodeOverHeight,
            1,
            0.01,
            "a node keeps its size on screen",
        );
    });

    it("draws the 2D map mapScale times larger under nodes and edges that keep their size, framed whole", async () => {
        await graph.setViewMode("2d");
        const ids = [String(FLIGHTS.ids.idOf(0)), String(FLIGHTS.ids.idOf(57))];
        /** What the map and the drawing measure at one mapScale, at the default view. */
        async function measure(
            mapScale: number,
            nodeScale: "scene" | "screen",
        ): Promise<{ apart: number; nodeWorld: number; viewHeight: number; mapHeight: number; widths: number[] }> {
            await graph.setLayout("location-map", { mapScale, nodeScale });
            await settled();
            await drawnFrames(graph.getScene(), 2);
            const frame = (
                graph.getLayoutManager().layoutEngine as unknown as { geoFrame: { mapFrame: { height: number } } }
            ).geoFrame;
            const camera = graph.getScene().activeCamera;
            const [a, b] = ids.map((id) => at(id));
            const mesh = graph.getNode(ids[0])?.mesh;
            assert.isDefined(mesh);
            return {
                apart: Math.hypot(a.x - b.x, a.y - b.y),
                nodeWorld: mesh.getBoundingInfo().boundingBox.extendSizeWorld.length(),
                viewHeight: (camera?.orthoTop ?? Number.NaN) - (camera?.orthoBottom ?? Number.NaN),
                mapHeight: frame.mapFrame.height,
                widths: [...graph.getDataManager().edges.values()].map((e) => e.drawnLine?.width ?? Number.NaN),
            };
        }

        await placeAirports({}, 60);
        const one = await measure(1, "scene");
        const six = await measure(6, "scene");
        assert.closeTo(six.apart / one.apart, 6, 0.01, "nodes are drawn six times further apart");
        assert.closeTo(six.mapHeight / one.mapHeight, 6, 1e-6, "on a map six times larger");
        assert.closeTo(six.nodeWorld, one.nodeWorld, 1e-6, "a node keeps its size in scene units");
        assert.deepEqual(six.widths, one.widths, "an edge keeps its width");
        assert.closeTo(six.viewHeight / one.viewHeight, 6, 0.6, "the default view still frames the whole map");
        assert.isAtLeast(six.viewHeight, six.mapHeight, "the whole map is in view");

        // on screen: a screen-sized node keeps its size on screen, so it does not shrink with the map
        const screenOne = await measure(1, "screen");
        const screenSix = await measure(6, "screen");
        assert.closeTo(
            screenSix.nodeWorld / screenSix.viewHeight / (screenOne.nodeWorld / screenOne.viewHeight),
            1,
            0.01,
            "a node keeps its size on screen",
        );
    });

    it("puts nodes with no usable location in a tray and reports them", async () => {
        await graph.addNodes([
            { id: "JFK", where: "40.64, -73.78" },
            { id: "LHR", where: "51.47, -0.45" },
            { id: "lost", where: "somewhere" },
            { id: "blank", where: "" },
        ]);
        await graph.setLayout("location-map", { location: "where" });
        await settled();

        const unparsed = warnings.find((w) => w.code === "W_LOCATION_UNPARSED");
        assert.isDefined(unparsed);
        assert.deepInclude(unparsed?.params, { missing: 1, unparsed: 1, total: 4 });
        const lowestPlaced = Math.min(at("JFK").y, at("LHR").y);
        assert.isBelow(at("lost").y, lowestPlaced);
        assert.isBelow(at("blank").y, lowestPlaced);
        assert.isFalse(at("lost").x === 0 && at("lost").y === 0, "never at latitude 0, longitude 0");
    });

    it("saves the map with the layout, and an undo brings back the map it replaced", async () => {
        await placeAirports();
        const session = graph.getSession();
        await session.layout.set("location-map", { options: { map: { source: "openstreetmap" } } });
        assert.deepEqual(session.layout.options.map, { source: "openstreetmap" });
        const saved = await session.project.save({ markSaved: false });
        assert.include(saved.text.replace(/\s/g, ""), '"map":{"source":"openstreetmap"}');
        await session.undo();
        await settled();
        await drawnFrames(graph.getScene(), 1);
        assert.strictEqual(graph.basemapStatus.source, "natural-earth");
    });
});

/**
 * The points of the edge whose drawn curve has the farthest apart ends, or null when every edge is straight.
 * @param edges - The edges.
 * @returns The points.
 */
function longestCurve(edges: readonly Edge[]): { x: number; y: number; z: number }[] | null {
    let best: { x: number; y: number; z: number }[] | null = null;
    let longest = -1;
    for (const edge of edges) {
        const curve = edge.drawnCurve;
        const first = curve?.[0];
        const last = curve?.at(-1);
        // the farthest apart ends: the arc that rises highest
        const chord = first === undefined || last === undefined ? -1 : first.subtract(last).length();
        if (curve !== null && chord > longest) {
            longest = chord;
            best = curve.map((v) => ({ x: v.x, y: v.y, z: v.z }));
        }
    }

    return best;
}
