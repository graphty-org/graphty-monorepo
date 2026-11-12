/**
 * The `url` source: a graph file at a web address, its format detected or named, its CSV options
 * and `directed` reaching the importer, and a credential bound to the address's origin.
 */

import { describe, expect, it } from "vitest";

import {
    credentials,
    loadFromSource,
    replayFetch,
    sourceEndpoint,
    sourceFileName,
    URL_DESCRIPTOR,
} from "../../src/index.js";
import { urlSource } from "../../src/sources/url/index.js";
import { runSourceConformance } from "./harness.js";
import { rejection } from "./helpers.js";

const HOST = "https://files.example.com";
const CSV = "source,target\na,b\nb,c\n";
const GRAPHML = `<?xml version="1.0"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph edgedefault="undirected"><node id="x"/><node id="y"/><edge source="x" target="y"/></graph>
</graphml>`;

runSourceConformance(urlSource, [
    { name: "a CSV file", params: { url: `${HOST}/c.csv` }, recordings: [{ url: `${HOST}/c.csv`, body: CSV }] },
]);

describe("url source", () => {
    it("loads a .csv address, detecting its format, and records the address as the endpoint", async () => {
        const fetch = replayFetch([{ url: `${HOST}/data/buildings.csv?v=1`, body: CSV }]);
        const { snapshot, format, report } = await loadFromSource(
            "url",
            { url: `${HOST}/data/buildings.csv?v=1` },
            { fetch },
        );
        expect([format, snapshot.nodeCount, snapshot.edgeCount]).toEqual(["csv", 3, 2]);
        expect(report.source?.endpoint).toBe(`${HOST}/data/buildings.csv`);
    });

    it("reports the CSV id column it keyed a node table by in the params to save, and nothing for a given one", async () => {
        const url = `${HOST}/people.csv`;
        const people = "person_id,name\np1,Ann\np2,Bob\n";
        const guessed = await loadFromSource("url", { url }, { fetch: replayFetch([{ url, body: people }]) });
        expect(guessed.snapshot.ids.toArray()).toEqual(["p1", "p2"]);
        expect(guessed.report.source?.params).toEqual({ url, idColumn: "person_id" });
        const given = await loadFromSource(
            "url",
            { url, idColumn: "name" },
            { fetch: replayFetch([{ url, body: people }]) },
        );
        expect(given.snapshot.ids.toArray()).toEqual(["Ann", "Bob"]);
        expect(given.report.source?.params).toBe(undefined);
    });

    it("reads an address with no extension in the format it is given", async () => {
        const fetch = replayFetch([{ url: `${HOST}/export?id=7`, body: GRAPHML }]);
        const { format, snapshot, report } = await loadFromSource(
            "url",
            { url: `${HOST}/export?id=7`, format: "graphml", delimiter: ";", header: "no" },
            { fetch },
        );
        expect([format, snapshot.nodeCount]).toEqual(["graphml", 2]);
        // CSV options never reach another format's importer.
        expect(report.issues.filter((i) => i.code === "W_OPTION_IGNORED")).toEqual([]);
    });

    it("passes the CSV options to the importer", async () => {
        const fetch = replayFetch([{ url: `${HOST}/rows.csv`, body: "1;a;b\n2;b;c\n3;c;a\n" }]);
        const { snapshot } = await loadFromSource(
            "url",
            { url: `${HOST}/rows.csv`, delimiter: ";", header: "no", sourceColumn: "1", targetColumn: "2" },
            { fetch },
        );
        expect([snapshot.nodeCount, snapshot.edgeCount]).toEqual([3, 3]);
        expect(snapshot.ids.toArray().map(String).sort()).toEqual(["a", "b", "c"]);
    });

    it("reads a CSV as undirected when directed is no", async () => {
        const fetch = replayFetch([
            { url: `${HOST}/a.csv`, body: CSV },
            { url: `${HOST}/b.csv`, body: CSV },
        ]);
        const plain = await loadFromSource("url", { url: `${HOST}/a.csv` }, { fetch });
        const undirected = await loadFromSource("url", { url: `${HOST}/b.csv`, directed: "no" }, { fetch });
        expect([plain.snapshot.directed, undirected.snapshot.directed]).toEqual([true, false]);
    });

    it("sends a credential to the address's origin with no endpoint named", async () => {
        const fetch = replayFetch([{ url: `${HOST}/private.csv`, body: CSV, credential: true }]);
        const { snapshot } = await loadFromSource(
            "url",
            { url: `${HOST}/private.csv` },
            { fetch, credential: credentials.bearer("token") },
        );
        expect(snapshot.nodeCount).toBe(3);
        expect(fetch.calls.map((c) => c.credential)).toEqual([true]);
    });

    it("refuses an address that is not http or https before any request", async () => {
        const fetch = replayFetch([]);
        const err = await rejection(loadFromSource("url", { url: "ftp://files.example.com/a.csv" }, { fetch }));
        expect(err.issue?.code).toBe("E_SOURCE_PARAM");
        expect(fetch.calls).toEqual([]);
    });

    it("reports a missing file as not found", async () => {
        const fetch = replayFetch([{ url: `${HOST}/gone.csv`, status: 404, body: "" }]);
        const err = await rejection(loadFromSource("url", { url: `${HOST}/gone.csv` }, { fetch }));
        expect(err.issue?.code).toBe("E_SOURCE_NOT_FOUND");
    });
});

describe("sourceEndpoint", () => {
    it("takes the given endpoint, else the endpoint param, else the default", () => {
        const url = `${HOST}/a.csv`;
        expect(sourceEndpoint(URL_DESCRIPTOR, { url }, "https://other.example.com/")).toBe(
            "https://other.example.com/",
        );
        expect(sourceEndpoint(URL_DESCRIPTOR, { url })).toBe(url);
        expect(sourceEndpoint(URL_DESCRIPTOR, {})).toBeNull();
        expect(sourceEndpoint({ plainName: "x", params: [], defaultEndpoint: HOST }, {})).toBe(HOST);
    });

    it("names a load by its address's last path segment, decoded", () => {
        expect(sourceFileName(URL_DESCRIPTOR, { url: `${HOST}/data/my%20graph.csv?v=2` })).toBe("my graph.csv");
        expect(sourceFileName(URL_DESCRIPTOR, { url: `${HOST}/bad%E0.csv` })).toBe("bad%E0.csv");
        expect(sourceFileName(URL_DESCRIPTOR, { url: `${HOST}/` })).toBeUndefined();
        expect(sourceFileName(URL_DESCRIPTOR, { url: "not a url" })).toBeUndefined();
        expect(sourceFileName({ plainName: "x", params: [] }, { url: `${HOST}/a.csv` })).toBeUndefined();
    });
});
