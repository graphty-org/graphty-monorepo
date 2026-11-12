/**
 * @file Place names as locations: a city column narrowed by a country column, found unasked and
 * placed through the gazetteer; a fixed "within" country; names nothing matches or several places
 * match, reported as data issues; and `nodeLocationRole: "none"`, which stops the search. The
 * gazetteer is a few places of the real files (fixtures/), served by a stubbed fetch: no test here
 * reaches the network.
 */

import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { Edge } from "../../../src/Edge";
import { layoutEngineInternals } from "../../../src/layout/LayoutEngine";
import { loadGazetteer, normalizePlace, readPlaces } from "../../../src/layout/locationMap/gazetteer";
import type { LocationMapFrame } from "../../../src/layout/locationMap/place";
import { LocationMapLayout } from "../../../src/layout/LocationMapLayoutEngine";
import type { Node } from "../../../src/Node";

/** The address the stubbed fetch answers; anything else is refused. */
const BASE = "https://gazetteer.test/v1/";
const FIXTURES = join(import.meta.dirname, "fixtures");

let fetched: string[] = [];
const sessions: GraphSession[] = [];

beforeEach(() => {
    fetched = [];
    vi.stubGlobal("fetch", (input: string | URL) => {
        const url = String(input);
        fetched.push(url);
        if (!url.startsWith(BASE)) {
            return Promise.reject(new Error(`no network in tests: ${url}`));
        }

        return Promise.resolve(new Response(readFileSync(join(FIXTURES, basename(url)))));
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

/**
 * A session holding a CSV of nodes.
 * @param csv - The file's text.
 * @returns The session.
 */
async function loaded(csv: string): Promise<GraphSession> {
    const session = createGraphSession();
    sessions.push(session);
    await session.data.import({
        type: "csv",
        config: { file: new File([csv], "places.csv", { type: "text/csv" }) },
        name: "places.csv",
    });
    return session;
}

/**
 * Run the location map over a session's nodes, as the element does, reading its `data.knownFields`.
 * @param session - The session.
 * @param options - The layout's options.
 * @returns Each node's position, and the frame the run published.
 */
async function place(
    session: GraphSession,
    options: Record<string, unknown> = {},
): Promise<{ at: (id: string) => { x: number; y: number }; frame: LocationMapFrame | null }> {
    const parentGraph = { getStyles: () => ({ config: session.config }) };
    const nodes = session.data
        .nodes()
        .map((record) => ({ id: record.id, index: -1, data: record, parentGraph }) as unknown as Node);
    const layout = new LocationMapLayout({ gazetteer: BASE, dim: 2, ...options });
    layoutEngineInternals.addNodes(layout, nodes);
    layoutEngineInternals.addEdges(layout, [] as Edge[]);
    await layout.init();
    await vi.waitFor(() => {
        layout.getNodePosition(nodes[0]);
        assert.isTrue(layout.isSettled);
    });
    return {
        at: (id) => {
            const node = nodes.find((n) => n.id === id);
            if (node === undefined) {
                assert.fail(`no node ${id}`);
            }

            const p = layout.getNodePosition(node);
            return { x: p.x, y: p.y };
        },
        frame: layout.geoFrame,
    };
}

/**
 * Where a latitude and longitude land on a flat frame.
 * @param frame - The frame.
 * @param lat - The latitude.
 * @param lon - The longitude.
 * @returns The scene point.
 */
function sceneOf(frame: LocationMapFrame | null, lat: number, lon: number): { x: number; y: number } {
    assert.strictEqual(frame?.surface, "flat");
    const flat = frame as Extract<LocationMapFrame, { surface: "flat" }>;
    return flat.mapFrame.toScene({ lat, lon });
}

describe("place names as locations", () => {
    it("places a city,country CSV: Paris in France, and Paris within US in Texas", async () => {
        const session = await loaded("id,city,country\np1,Paris,France\np2,Paris,US\nlyon,Lyon,FR\n");
        assert.deepEqual(session.layout.locationColumns(), {
            from: "detected",
            location: "city",
            latitude: null,
            longitude: null,
            role: "city",
            within: "country",
            kinds: { city: "city", country: "country" },
            using: "city",
            unused: [],
        });

        const { at, frame } = await place(session);
        assert.deepEqual(frame?.location, {
            kind: "place",
            column: "city",
            role: "city",
            within: "country",
            attribution: [{ text: "GeoNames", url: "https://www.geonames.org/" }],
        });
        const france = sceneOf(frame, 48.8534, 2.3488);
        const texas = sceneOf(frame, 33.6609, -95.5555);
        assert.closeTo(at("p1").x, france.x, 1e-3);
        assert.closeTo(at("p1").y, france.y, 1e-3);
        assert.closeTo(at("p2").x, texas.x, 1e-3);
        assert.closeTo(at("p2").y, texas.y, 1e-3);
        assert.isTrue(fetched.every((url) => url.startsWith(BASE)));
    });

    it("narrows every name by a fixed country code (nodeLocationWithin)", async () => {
        const session = await loaded("id,city\np,Paris\nd,Dallas\n");
        await session.config.set({ data: { knownFields: { nodeLocationPath: "city", nodeLocationRole: "city" } } });
        const unnarrowed = await place(session);
        // Paris alone is the most populous Paris; Dallas alone the one in Texas.
        assert.closeTo(unnarrowed.at("p").x, sceneOf(unnarrowed.frame, 48.8534, 2.3488).x, 1e-3);

        await session.config.set({ data: { knownFields: { nodeLocationWithin: "US" } } });
        const { at, frame } = await place(session);
        assert.closeTo(at("p").x, sceneOf(frame, 33.6609, -95.5555).x, 1e-3);
        assert.closeTo(at("p").y, sceneOf(frame, 33.6609, -95.5555).y, 1e-3);
    });

    it("reports names nothing matches, and names several places match, as data issues", async () => {
        const session = await loaded("id,city\na,Paris\nb,Gondor\nc,Gondor\nd,London\ne,Minas Tirith\n");
        await place(session);
        const issues = session.data.issues();
        const unmatched = issues.find((i) => i.code === "location-unmatched");
        assert.deepInclude(unmatched, {
            id: "location-unmatched:node:city",
            column: { kind: "node", name: "city" },
            count: 3,
            fixes: [],
        });
        assert.deepEqual(unmatched?.params, { examples: ["Gondor", "Minas Tirith"] });
        const ambiguous = issues.find((i) => i.code === "location-ambiguous");
        assert.strictEqual(ambiguous?.count, 2, "Paris (France, Texas) and London (England, Ontario)");
        assert.deepEqual(ambiguous?.params, { examples: ["Paris", "London"] });
    });

    it('stops looking for a location with nodeLocationRole "none"', async () => {
        const session = await loaded("id,city,country\np1,Paris,France\n");
        assert.strictEqual(session.layout.locationColumns().from, "detected");

        await session.config.set({ data: { knownFields: { nodeLocationRole: "none" } } });
        assert.deepEqual(session.layout.locationColumns(), {
            from: "none",
            location: null,
            latitude: null,
            longitude: null,
            role: null,
            within: null,
            kinds: {},
            using: null,
            unused: [],
        });
        const estimate = session.estimate({ op: "layout.set", id: "location-map" });
        assert.isFalse(estimate.available);
        assert.strictEqual(estimate.refusal?.code, "layout.needs-location");
    });
});

describe("one role per kind of location (data.setRole)", () => {
    it("reads a city narrowed by the region listed, and lists a country it does not read as unused", async () => {
        const session = await loaded("id,town,area,nation\np1,Paris,Texas,US\np2,Lyon,,FR\n");
        await session.data.setRole({ kind: "node", name: "town" }, "city");
        await session.data.setRole({ kind: "node", name: "area" }, "region");
        await session.data.setRole({ kind: "node", name: "nation" }, "country");
        assert.deepInclude(session.layout.locationColumns(), {
            from: "designated",
            location: "town",
            role: "city",
            within: "area",
            kinds: { city: "town", region: "area", country: "nation" },
            using: "city",
            unused: [{ code: "location.unused", params: { kind: "country", using: "city" } }],
        });
        const roles = session.data.attributes().find((a) => a.kind === "node" && a.name === "town")?.roles;
        assert.deepEqual(roles, ["city"]);
    });

    it("prefers a full pair, keeps the refusal for half of one, and stops finding once the last kind goes", async () => {
        const session = await loaded("id,city,north,east\np1,Paris,48.85,2.35\n");
        assert.strictEqual(session.layout.locationColumns().using, "city");

        // A detected city stays listed beside the latitude picked next.
        await session.data.setRole({ kind: "node", name: "north" }, "latitude");
        const half = session.layout.locationColumns();
        assert.deepEqual(half.kinds, { latitude: "north", city: "city" });
        assert.strictEqual(half.using, "city");
        assert.deepEqual(half.unused, [{ code: "location.unused", params: { kind: "latitude", using: "city" } }]);

        await session.data.setRole({ kind: "node", name: "east" }, "longitude");
        const pair = session.layout.locationColumns();
        assert.strictEqual(pair.using, "pair");
        assert.deepEqual(
            pair.unused.map((fact) => fact.params.kind),
            ["city"],
        );

        await session.data.setRole({ kind: "node", name: "city" }, null);
        await session.data.setRole({ kind: "node", name: "east" }, null);
        const refused = session.estimate({ op: "layout.set", id: "location-map" });
        assert.strictEqual(refused.refusal?.code, "layout.needs-location");
        assert.deepEqual(session.layout.locationColumns().kinds, { latitude: "north" });

        await session.data.setRole({ kind: "node", name: "north" }, null);
        assert.strictEqual(session.layout.locationColumns().from, "none", "removing the last kind stops the search");
    });

    it("keeps reading the single-entry form of earlier projects", async () => {
        const session = await loaded("id,place,country\np1,Paris,FR\n");
        await session.config.set({
            data: {
                knownFields: { nodeLocationPath: "place", nodeLocationRole: "city", nodeLocationWithinPath: "country" },
            },
        });
        assert.deepInclude(session.layout.locationColumns(), {
            from: "designated",
            kinds: { city: "place", country: "country" },
            using: "city",
        });
    });
});

describe("the gazetteer", () => {
    it("matches names whatever their case and accents, and a country by name or code", async () => {
        const g = await loadGazetteer(BASE, "auto");
        assert.strictEqual(normalizePlace("  Sao-Paulo "), normalizePlace("SAO PAULO"));
        const countries = readPlaces(["France", "FRA", "fr", "United Kingdom", "UK", "Narnia"], "auto", null, g);
        assert.strictEqual(countries.role, "country");
        assert.deepEqual(countries.unmatched, [5]);
        assert.strictEqual(countries.lat[0], countries.lat[1]);
        assert.strictEqual(countries.lat[0], countries.lat[2]);
        assert.strictEqual(countries.lat[3], countries.lat[4]);
    });

    it('splits "City, CC" at its last comma under auto, and narrows a city by a region name', async () => {
        const g = await loadGazetteer(BASE, "auto");
        const split = readPlaces(["Lyon, FR", "London, Canada"], "auto", null, g);
        assert.strictEqual(split.role, "city");
        assert.deepEqual(split.unmatched, []);
        assert.deepEqual(split.ambiguous, []);
        assert.closeTo(split.lon[1] ?? 0, -81.2, 0.1, "London, Ontario");

        const byRegion = readPlaces(["Paris", "Dallas"], "city", "Texas", g);
        assert.deepEqual(byRegion.ambiguous, []);
        assert.closeTo(byRegion.lat[0] ?? 0, 33.66, 0.01);
        assert.closeTo(byRegion.lat[1] ?? 0, 32.78, 0.01);
    });
});
