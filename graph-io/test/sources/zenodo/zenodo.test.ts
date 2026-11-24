/**
 * The Zenodo source over hand-written answers in the shapes zenodo.org's records API gives (no
 * network): a record with its files, a file's content, and a 404.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
    credentials,
    ImportError,
    listFromSource,
    loadFromSource,
    type Recording,
    replayFetch,
} from "../../../src/index.js";
import { parseZenodoUrl, zenodoSource } from "../../../src/sources/zenodo/index.js";
import { runSourceConformance } from "../harness.js";
import { rejection } from "../helpers.js";

const API = "https://zenodo.org/api";
const RECORD = "1234567";
const SAMPLES = new URL("../../../docs/samples/", import.meta.url);
const GRAPHML = readFileSync(new URL("got-network.graphml", SAMPLES), "utf8");

/**
 * A file content answer.
 * @param file - the file's name, encoded
 * @param body - the file's text
 * @returns the recording
 */
function content(file: string, body: string): Recording {
    return {
        url: `${API}/records/${RECORD}/files/${file}/content`,
        headers: { "content-type": "application/octet-stream" },
        body,
    };
}

const RECORD_ANSWER: Recording = {
    url: `${API}/records/${RECORD}`,
    body: {
        id: 1234567,
        files: [
            { key: "README.txt", size: 10 },
            { key: "got.graphml", size: 100 },
            { key: "got.json", size: 100 },
            { key: "edges.csv", size: 100 },
        ],
    },
};

runSourceConformance(zenodoSource, [
    {
        name: "a GraphML file",
        params: { record: RECORD, file: "got.graphml" },
        recordings: [content("got.graphml", GRAPHML)],
    },
    {
        name: "a missing file",
        params: { record: RECORD, file: "nope.graphml" },
        recordings: [{ url: `${API}/records/${RECORD}/files/nope.graphml/content`, status: 404, body: {} }],
    },
]);

describe("zenodo: loading", () => {
    it("loads a file through format detection, by its name and first bytes", async () => {
        const fetch = replayFetch([content("got.graphml", GRAPHML)]);
        const { snapshot, format, report } = await loadFromSource(
            zenodoSource,
            { record: RECORD, file: "got.graphml" },
            { fetch },
        );
        expect(format).toBe("graphml");
        expect(snapshot.nodeCount).toBeGreaterThan(0);
        expect(report.source).toMatchObject({ id: "zenodo", endpoint: `${API}/`, requests: 1 });
    });

    it("encodes the file name as one segment and sends a token only to the API", async () => {
        const fetch = replayFetch([{ ...content("a%2Fb%20c.graphml", GRAPHML), credential: true }]);
        const { format } = await loadFromSource(
            zenodoSource,
            { record: RECORD, file: "a/b c.graphml" },
            { fetch, credential: credentials.bearer("zenodo_example") },
        );
        expect(format).toBe("graphml");
    });

    it("refuses a record that is not a number and a file that is not a name, before any request", async () => {
        for (const [params, name] of [
            [{ record: "../users", file: "a.graphml" }, "record"],
            [{ record: RECORD, file: ".." }, "file"],
        ] as const) {
            const fetch = replayFetch([]);
            const err = await rejection(loadFromSource(zenodoSource, params, { fetch }));
            expect(err.issue?.params).toEqual({ name, reason: "format" });
            expect(fetch.calls).toHaveLength(0);
        }
    });

    it("a missing file is E_SOURCE_NOT_FOUND", async () => {
        const fetch = replayFetch([{ url: `${API}/records/${RECORD}/files/x.gml/content`, status: 404, body: {} }]);
        const err = await rejection(loadFromSource(zenodoSource, { record: RECORD, file: "x.gml" }, { fetch }));
        expect(err.issue?.code).toBe("E_SOURCE_NOT_FOUND");
    });
});

describe("zenodo: list", () => {
    it("lists a record's files in pages, and an item's params load the file", async () => {
        const fetch = replayFetch([RECORD_ANSWER, RECORD_ANSWER, content("got.graphml", GRAPHML)]);
        const first = await listFromSource(zenodoSource, { params: { record: RECORD }, size: 3 }, { fetch });
        expect(first.items.map((item) => item.name)).toEqual(["README.txt", "got.graphml", "got.json"]);
        expect([first.total, first.next]).toEqual([4, { start: 3 }]);
        const second = await listFromSource(
            zenodoSource,
            { params: { record: RECORD }, size: 3, cursor: first.next ?? undefined },
            { fetch },
        );
        expect(second.items).toEqual([{ params: { record: RECORD, file: "edges.csv" }, name: "edges.csv" }]);
        expect(second.next).toBeNull();
        const { format } = await loadFromSource(zenodoSource, first.items[1].params as never, { fetch });
        expect(format).toBe("graphml");
    });

    it("narrows to a search text", async () => {
        const fetch = replayFetch([RECORD_ANSWER]);
        const listing = await listFromSource(zenodoSource, { params: { record: RECORD }, search: "GOT" }, { fetch });
        expect(listing.items.map((item) => item.name)).toEqual(["got.graphml", "got.json"]);
    });

    it("a record answer without files is E_SOURCE_RESPONSE", async () => {
        const fetch = replayFetch([{ ...RECORD_ANSWER, body: { id: 1 } }]);
        const err = await rejection(listFromSource(zenodoSource, { params: { record: RECORD } }, { fetch }));
        expect(err.issue?.code).toBe("E_SOURCE_RESPONSE");
    });
});

/**
 * The params of the error parseZenodoUrl throws for a link.
 * @param url - the link
 * @returns the issue's params
 */
function refusal(url: string): unknown {
    try {
        parseZenodoUrl(url);
    } catch (err) {
        expect(err).toBeInstanceOf(ImportError);
        return (err as ImportError).issue?.params;
    }
    return null;
}

describe("parseZenodoUrl", () => {
    it("reads record, file, API and DOI links", () => {
        expect(parseZenodoUrl("https://zenodo.org/records/1234567")).toEqual({ record: RECORD });
        expect(parseZenodoUrl("https://zenodo.org/record/1234567")).toEqual({ record: RECORD });
        expect(parseZenodoUrl("https://zenodo.org/records/1234567/files/got%20v2.graphml?download=1")).toEqual({
            record: RECORD,
            file: "got v2.graphml",
        });
        expect(parseZenodoUrl("https://zenodo.org/api/records/1234567/files/got.graphml/content")).toEqual({
            record: RECORD,
            file: "got.graphml",
        });
        expect(parseZenodoUrl("https://doi.org/10.5281/zenodo.1234567")).toEqual({ record: RECORD });
    });

    it("refuses other links, and credentials in the link", () => {
        for (const url of [
            "not a url",
            "http://zenodo.org/records/1234567",
            "https://example.org/records/1234567",
            "https://zenodo.org/records/abc",
            "https://zenodo.org/communities/x",
            "https://zenodo.org/records/1234567/versions",
            "https://doi.org/10.1000/xyz",
        ]) {
            expect(refusal(url)).toEqual({ name: "url", reason: "format" });
        }
        expect(refusal("https://user:pw@zenodo.org/records/1")).toEqual({ name: "url", reason: "credentials-in-url" });
    });
});
