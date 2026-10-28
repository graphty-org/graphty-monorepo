/**
 * The NDEx source over responses recorded from www.ndexbio.org on 2026-10-17
 * (`scripts/record-ndex.ts --write` records them again).
 */

import { readFileSync } from "node:fs";
import { inspect } from "node:util";

import { describe, expect, it } from "vitest";

import {
    credentials,
    expandFromSource,
    listFromSource,
    loadFromSource,
    probeSource,
    type Recording,
    replayFetch,
    validateSource,
} from "../../../src/index.js";
import { ndexSource, parseShareUrl } from "../../../src/sources/ndex/index.js";
import { runSourceConformance } from "../harness.js";
import { rejection, SENTINEL } from "../helpers.js";

const WP5483 = "86719f5b-1439-11f0-9806-005056ae3c32";
const PCNET = "8b4b54fa-e87d-11ee-9621-005056ae23aa";
const NDEX = "https://www.ndexbio.org";
const SUMMARY = `${NDEX}/v3/networks/${WP5483}/summary`;
const EZH2 = 1245568;

/**
 * One recordings file.
 * @param name - its name, without .json
 * @returns the recordings
 */
function recorded(name: string): Recording[] {
    return JSON.parse(readFileSync(new URL(`recordings/${name}.json`, import.meta.url), "utf8")) as Recording[];
}

/** NDEx's 500 for an unknown route, with its Java stack trace, as the answer to the summary. */
const SERVER_ERROR: Recording = { ...recorded("server-error")[0], url: SUMMARY };

runSourceConformance(ndexSource, [
    { name: "WP5483", params: { uuid: WP5483 }, recordings: recorded("wp5483-cx2") },
    { name: "an unknown user", params: { uuid: WP5483 }, recordings: recorded("auth") },
    { name: "a server error", params: { uuid: WP5483 }, recordings: [SERVER_ERROR] },
]);

describe("ndex: loading", () => {
    it("loads WP5483 as 57 nodes and 34 edges from its CX2 download", async () => {
        const fetch = replayFetch(recorded("wp5483-cx2"));
        const progress: [number, number | undefined, string | undefined][] = [];
        const { snapshot, format, report } = await loadFromSource(
            ndexSource,
            { uuid: WP5483 },
            {
                fetch,
                onProgress: (done, total, unit) => progress.push([done, total, unit]),
            },
        );
        expect([snapshot.nodeCount, snapshot.edgeCount, format]).toEqual([57, 34, "cx2"]);
        expect(snapshot.meta.modified).toBe("2025-04-17T00:31:38.620Z");
        expect(snapshot.graph.value("visibility", 0)).toBe("PUBLIC");
        expect(report.source).toMatchObject({
            id: "ndex",
            endpoint: `${NDEX}/`,
            requests: 2,
            next: null,
            validators: { modified: "2025-04-17T00:31:38.620Z" },
        });
        // the total is the summary's bytes plus the cx2FileSize it gives (54,039; the download was 50,338)
        const summaryBytes = String(recorded("wp5483-cx2")[0].body).length;
        expect(progress.at(-1)).toEqual([report.source?.bytes, summaryBytes + 54_039, "bytes"]);
        expect(fetch.calls.map((c) => c.url)).toEqual([SUMMARY, `${NDEX}/v3/networks/${WP5483}`]);
    });

    it("loads the CX download with format cx, through the lazy built-in", async () => {
        const { snapshot, format } = await loadFromSource(
            "ndex",
            { uuid: WP5483, format: "cx" },
            { fetch: replayFetch(recorded("wp5483-cx")) },
        );
        expect([snapshot.nodeCount, snapshot.edgeCount, format]).toEqual([57, 34, "cx"]);
    });

    it("stops PCNet before its first byte when the summary is over maxBytes", async () => {
        const fetch = replayFetch(recorded("pcnet-summary"));
        for (const onLimit of ["stop", "error"] as const) {
            const err = await rejection(
                loadFromSource(ndexSource, { uuid: PCNET }, { fetch, limits: { maxBytes: 100_000_000, onLimit } }),
            );
            expect(err.issue?.code).toBe("E_SOURCE_LIMIT");
            expect(err.issue?.params).toEqual({ limit: "maxBytes", value: 690_606_821 });
        }
        const edges = await rejection(
            loadFromSource(ndexSource, { uuid: PCNET }, { fetch, limits: { maxEdges: 1e6 } }),
        );
        expect(edges.issue?.params).toEqual({ limit: "maxEdges", value: 3_323_928 });
        expect(fetch.calls.every((c) => c.url.endsWith("/summary"))).toBe(true);
    });

    it("answers a 401 with E_SOURCE_AUTH and NDEx's own code", async () => {
        const err = await rejection(
            loadFromSource(
                ndexSource,
                { uuid: WP5483 },
                { fetch: replayFetch(recorded("auth")), credential: credentials.basic("no-such-user", SENTINEL) },
            ),
        );
        expect(err.issue?.code).toBe("E_SOURCE_AUTH");
        expect(err.issue?.params).toEqual({
            origin: NDEX,
            status: 401,
            scheme: null,
            serverCode: "NDEx_Object_Not_Found_Exception",
        });
    });

    it("answers an unknown network with E_SOURCE_NOT_FOUND", async () => {
        const uuid = "00000000-0000-0000-0000-000000000000";
        const err = await rejection(
            loadFromSource(ndexSource, { uuid }, { fetch: replayFetch(recorded("not-found")) }),
        );
        expect(err.issue?.code).toBe("E_SOURCE_NOT_FOUND");
        expect(err.issue?.params).toEqual({ what: "network", value: uuid });
    });

    it("answers a 500 with E_FETCH and keeps its stack trace out of the error", async () => {
        const fetch = replayFetch([SERVER_ERROR]);
        const err = await rejection(loadFromSource(ndexSource, { uuid: WP5483 }, { fetch }));
        expect(err.issue?.code).toBe("E_FETCH");
        expect(err.issue?.params).toEqual({ url: SUMMARY, status: 500 });
        const text = `${JSON.stringify([err.report, err.issue])}${inspect(err, { depth: 20 })}`;
        expect(text).not.toMatch(/stackTrace|java\.|RESTEASY/);
        expect(fetch.calls).toHaveLength(1);
    });

    it("refuses a malformed uuid and an access key in the endpoint before any request", async () => {
        const fetch = replayFetch([]);
        const bad = await rejection(loadFromSource(ndexSource, { uuid: "../admin" }, { fetch }));
        expect(bad.issue?.params).toEqual({ name: "uuid", reason: "format" });
        const keyed = await rejection(loadFromSource(ndexSource, { uuid: `${WP5483}?accesskey=abc` }, { fetch }));
        expect(keyed.issue?.params).toEqual({ name: "uuid", reason: "credentials-in-url" });
        const endpoint = await rejection(
            loadFromSource(ndexSource, { uuid: WP5483 }, { fetch, endpoint: `${NDEX}/?accesskey=abc` }),
        );
        expect(endpoint.issue?.params).toEqual({ name: "endpoint", reason: "credentials-in-url" });
        expect(fetch.calls).toHaveLength(0);
    });
});

describe("ndex: probe, list, validate", () => {
    it("probes the summary for counts and the download size", async () => {
        const probe = await probeSource(ndexSource, { uuid: PCNET }, { fetch: replayFetch(recorded("pcnet-summary")) });
        expect(probe).toEqual({ ok: true, counts: { nodes: 18_558, edges: 3_323_928, bytes: 690_606_821 } });
    });

    it("searches with NDEx's v2 search", async () => {
        const fetch = replayFetch(recorded("search"));
        const listing = await listFromSource(ndexSource, { params: {}, search: "WP5483", size: 5 }, { fetch });
        expect(listing.total).toBe(1);
        expect(listing.next).toBeNull();
        expect(listing.items).toEqual([
            {
                params: { uuid: WP5483 },
                name: "WP5483 - Hallmark of cancer: non-mutational epigenetic reprogramming - Homo sapiens",
                nodeCount: 57,
                edgeCount: 34,
                modified: "2025-04-17T00:31:38.620Z",
            },
        ]);
    });

    it("pages a search by start", async () => {
        const hit = { externalId: WP5483, name: "a", nodeCount: 1, edgeCount: 0 };
        const fetch = replayFetch([
            {
                method: "POST",
                url: `${NDEX}/v2/search/network?start=10&size=1`,
                body: { numFound: 12, start: 10, networks: [hit] },
            },
        ]);
        const listing = await listFromSource(ndexSource, { params: {}, cursor: { start: 10 }, size: 1 }, { fetch });
        expect(listing.next).toEqual({ start: 11 });
    });

    it("validates by the summary's modificationTime", async () => {
        const options = { fetch: replayFetch(recorded("wp5483-cx2")) };
        const modified = "2025-04-17T00:31:38.620Z";
        await expect(validateSource(ndexSource, { uuid: WP5483 }, { modified }, options)).resolves.toEqual({
            status: "current",
            via: "modified",
            validators: { modified },
        });
        await expect(
            validateSource(ndexSource, { uuid: WP5483 }, { modified: "2020-01-01T00:00:00.000Z" }, options),
        ).resolves.toEqual({ status: "changed", via: "modified", changedAt: modified, validators: { modified } });
        await expect(validateSource(ndexSource, { uuid: WP5483 }, {}, options)).resolves.toMatchObject({
            status: "unverifiable",
        });
    });
});

describe("ndex: expand", () => {
    it("fetches the neighborhood of a node by its id, in the ids of the CX2 download", async () => {
        const fetch = replayFetch(recorded("expand"));
        const { snapshot } = await expandFromSource(ndexSource, { params: { uuid: WP5483 }, ids: [EZH2] }, { fetch });
        expect([snapshot.nodeCount, snapshot.edgeCount]).toEqual([2, 1]);
        expect(snapshot.ids.has(EZH2)).toBe(true);
        const whole = await loadFromSource(
            ndexSource,
            { uuid: WP5483 },
            { fetch: replayFetch(recorded("wp5483-cx2")) },
        );
        expect([...snapshot.ids].every((id) => whole.snapshot.ids.has(id))).toBe(true);
    });

    it("seeds by an attribute and passes the limit as NDEx's edge limit", async () => {
        const [{ body }] = recorded("expand");
        const fetch = replayFetch([
            {
                method: "POST",
                url: `${NDEX}/v2/search/network/${WP5483}/query`,
                requestBody: JSON.stringify({
                    searchString: 'name:"EZH2" name:"a \\"b\\""',
                    searchDepth: 2,
                    edgeLimit: 5,
                    errorWhenLimitIsOver: false,
                }),
                body,
            },
        ]);
        const { snapshot } = await expandFromSource(
            ndexSource,
            { params: { uuid: WP5483, idAttribute: "name" }, ids: ["EZH2", 'a "b"'], depth: 2, limit: 5 },
            { fetch },
        );
        expect(snapshot.nodeCount).toBe(2);
    });

    it("refuses what NDEx's query cannot do before any request", async () => {
        const fetch = replayFetch([]);
        const cases: [Record<string, unknown>, string, Record<string, unknown>][] = [
            [{ ids: [EZH2], depth: 11 }, "E_SOURCE_PARAM", { name: "depth", reason: "range" }],
            [{ ids: [] }, "E_SOURCE_PARAM", { name: "ids", reason: "required" }],
            [{ ids: ["EZH2"] }, "E_SOURCE_PARAM", { name: "ids", reason: "type" }],
            [{ ids: [EZH2], direction: "out" }, "E_SOURCE_UNSUPPORTED", { feature: "direction", needs: "both" }],
            [{ ids: [EZH2], relationshipTypes: ["Arrow"] }, "E_SOURCE_UNSUPPORTED", { feature: "relationshipTypes" }],
        ];
        for (const [request, code, params] of cases) {
            const err = await rejection(
                expandFromSource(ndexSource, { params: { uuid: WP5483 }, ids: [], ...request }, { fetch }),
            );
            expect([err.issue?.code, err.issue?.params]).toEqual([code, params]);
        }
        const attr = await rejection(
            expandFromSource(ndexSource, { params: { uuid: WP5483, idAttribute: "a b" }, ids: ["x"] }, { fetch }),
        );
        expect(attr.issue?.params).toEqual({ name: "idAttribute", reason: "identifier" });
        expect(fetch.calls).toHaveLength(0);
    });
});

describe("ndex: share links", () => {
    it("turns a viewer link's access key into a credential bound to its server", async () => {
        const link = parseShareUrl(
            `https://www.ndexbio.org/viewer/networks/${WP5483.toUpperCase()}?accesskey=${SENTINEL}`,
        );
        expect(link.params).toEqual({ uuid: WP5483 });
        expect(link.endpoint).toBe(`${NDEX}/`);
        expect(link.credential).toMatchObject({ kind: "api-key", origins: [NDEX] });
        expect(`${JSON.stringify(link)}${inspect(link, { depth: 10, showHidden: true })}`).not.toContain(SENTINEL);

        const fetch = replayFetch(
            recorded("wp5483-cx2").map((r) => ({ ...r, credential: true })),
            { secretQuery: ["accesskey"] },
        );
        const { snapshot } = await loadFromSource(ndexSource, link.params, {
            endpoint: link.endpoint,
            credential: link.credential,
            fetch,
        });
        expect(snapshot.nodeCount).toBe(57);
        expect(fetch.calls.every((c) => c.credential)).toBe(true);
    });

    it("reads the older hash link, the bare host and a link with no key", () => {
        const old = parseShareUrl(`https://ndexbio.org/#/network/${WP5483}?accesskey=k`);
        expect(old.endpoint).toBe(`${NDEX}/`);
        expect(old.credential?.kind).toBe("api-key");
        const plain = parseShareUrl(`https://www.ndexbio.org/v3/networks/${WP5483}`);
        expect(plain).toEqual({ params: { uuid: WP5483 }, endpoint: `${NDEX}/` });
        expect(parseShareUrl(`https://ndex.example.org/viewer/networks/${WP5483}`).endpoint).toBe(
            "https://ndex.example.org/",
        );
    });

    it("refuses text that names no network, and a user name in the link", () => {
        for (const [url, reason] of [
            ["not a url", "format"],
            ["https://www.ndexbio.org/viewer/networks/123", "format"],
            [`ftp://www.ndexbio.org/${WP5483}`, "format"],
            [`https://me:pw@www.ndexbio.org/viewer/networks/${WP5483}`, "credentials-in-url"],
        ]) {
            let issue: unknown;
            try {
                parseShareUrl(url);
            } catch (err) {
                issue = (err as { issue?: { params?: unknown } }).issue?.params;
            }
            expect(issue).toEqual({ name: "url", reason });
        }
    });
});
