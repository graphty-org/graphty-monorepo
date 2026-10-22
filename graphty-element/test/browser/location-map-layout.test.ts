/**
 * @file The location map layout in a real Graph: OpenFlights' airports placed at their latitude
 * and longitude on the projected map, the map drawn under them with its credits, flat in 2D,
 * a flat map or a globe in 3D, raised and great-circle arcs for edges, and nodes with no location
 * put in a tray and reported.
 */

import "../../src/graphty-element";

import type { GraphSnapshot } from "@graphty/graph-format";
import { openflights } from "@graphty/graph-samples/datasets/openflights";
import { createMapFrame } from "babylonjs-map/projection";
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
            const expected = frame.toScene({ lat, lon });
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
        await vi.waitFor(() => {
            assert.notEqual(graph.basemapStatus.state, "off");
        });
        assert.equal(graph.basemapStatus.source, "natural-earth");
        assert.include(graph.basemapStatus.attribution, "Natural Earth");
        const strip = container.querySelector<HTMLElement>("[data-graphty-attribution]");
        assert.isNotNull(strip);
        assert.equal(strip?.textContent, "Natural Earth");
        assert.notEqual(strip?.style.display, "none");

        await graph.setLayout("circular");
        await settled();
        await drawnFrames(graph.getScene(), 1);
        assert.equal(graph.basemapStatus.state, "off");
        assert.equal(strip?.style.display, "none");
    });

    it("switches between a flat map and a globe in 3D, with raised arcs and great-circle arcs", async () => {
        await graph.setViewMode("3d");
        await placeAirports({}, 60);
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

        await graph.setLayout("location-map", { surface: "globe" });
        await settled();
        await drawnFrames(graph.getScene(), 2);
        const p = at(id);
        assert.closeTo(Math.hypot(p.x, p.y, p.z), 100, 2, "on the globe's surface");
        const globeArc = longestCurve(edges);
        assert.isNotNull(globeArc);
        const radii = (globeArc ?? []).map((q) => Math.hypot(q.x, q.y, q.z));
        assert.isAbove(Math.max(...radii), Math.max(radii[0], radii.at(-1) ?? 0) + 0.1, "the arc rises off the globe");
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

    it("saves the basemap with the project", async () => {
        graph.setBasemap({ source: "openstreetmap" });
        await operationQueueOf(graph).waitForCompletion();
        assert.deepEqual(graph.getSession().config.basemap, { source: "openstreetmap" });
        const saved = await graph.getSession().project.save({ markSaved: false });
        assert.include(saved.text.replace(/\s/g, ""), '"basemap":{"source":"openstreetmap"}');
    });
});

/**
 * The points of the edge whose drawn curve has the most points, or null when every edge is straight.
 * @param edges - The edges.
 * @returns The points.
 */
function longestCurve(edges: readonly Edge[]): { x: number; y: number; z: number }[] | null {
    let best: { x: number; y: number; z: number }[] | null = null;
    for (const edge of edges) {
        const curve = edge.drawnCurve;
        if (curve !== null && (best === null || curve.length > best.length)) {
            best = curve.map((v) => ({ x: v.x, y: v.y, z: v.z }));
        }
    }

    return best;
}
