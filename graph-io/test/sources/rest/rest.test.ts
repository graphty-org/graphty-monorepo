/**
 * The REST mapping source and the OpenAlex preset, over responses recorded from the live services
 * (scripts/record-rest.ts) and hand-written ones for the paths a service cannot be made to answer.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
    credentials,
    expandFromSource,
    loadFromSource,
    probeSource,
    type Recording,
    replayFetch,
    validateSource,
} from "../../../src/index.js";
import { SOURCE_STUB_ATTR } from "../../../src/sources/ids.js";
import {
    DEPS_DEV_MAPPING,
    openalexSource,
    REST_DESCRIPTOR,
    type RestMapping,
    restMappingSource,
    restSource,
    STRING_MAPPING,
} from "../../../src/sources/rest/index.js";
import { runSourceConformance } from "../harness.js";
import { rejection } from "../helpers.js";

/**
 * The recordings of one case.
 * @param name - the case
 * @returns the recordings
 */
function recorded(name: string): Recording[] {
    return JSON.parse(readFileSync(new URL(`./recordings/${name}.json`, import.meta.url), "utf8")) as Recording[];
}

const API = "https://api.example.com";

/** A small paged API: people who know people. */
const PEOPLE: RestMapping = {
    version: 1,
    endpoint: API,
    load: "people",
    expand: "knows",
    hydrate: "by-id",
    budgetHeaders: { remaining: "x-left", reset: "x-reset" },
    requests: {
        people: {
            path: "/teams/{team}/people",
            records: "items",
            entity: "person",
            paging: { style: "offset", param: "offset", size: { param: "limit", value: 2 } },
        },
        knows: {
            path: "/people",
            query: { knownBy: "{ids}" },
            batch: { max: 2, join: "," },
            records: "items",
            entity: "person",
        },
        "by-id": {
            path: "/people",
            query: { id: "{ids}" },
            batch: { max: 2, join: "," },
            records: "items",
            entity: "person",
        },
    },
    entities: {
        person: { id: "id", fields: { name: "name" }, edges: [{ to: "knows[]", type: "knows", entity: "person" }] },
    },
};

const people = restSource(PEOPLE, { id: "people", plainName: "People" });

const page = (offset: number, items: unknown[], headers?: Record<string, string>): Recording => ({
    url: `${API}/teams/core/people?offset=${String(offset)}&limit=2`,
    body: { items },
    headers,
});

const PEOPLE_PAGES: Recording[] = [
    page(
        0,
        [
            { id: "ana", name: "Ana", knows: ["bo"] },
            { id: "bo", name: "Bo", knows: ["cy"] },
        ],
        { "x-left": "41", "x-reset": "60" },
    ),
    page(2, [{ id: "cy", name: "Cy", knows: ["dee"] }]),
];

describe("OpenAlex", () => {
    it("loads the seed, the first page of citing works and stubs, and keeps page one on the keyless second page", async () => {
        const fetch = replayFetch(recorded("openalex-w2112090702"));
        const { snapshot, report } = await loadFromSource(openalexSource, { work: "W2112090702" }, { fetch });
        const { ids } = snapshot;
        const seed = ids.requireIndex("W2112090702");
        expect(snapshot.nodes.value("title", seed)).toBe("Collective dynamics of ‘small-world’ networks");
        const stub = (i: number): unknown =>
            snapshot.nodes.has(SOURCE_STUB_ATTR) ? snapshot.nodes.value(SOURCE_STUB_ATTR, i) : null;
        let full = 0;
        let stubs = 0;
        for (let i = 0; i < snapshot.nodeCount; i++) {
            if (stub(i) === true) {
                stubs++;
            } else {
                full++;
            }
        }
        // the seed plus 200 citing works; every other referenced work is a stub
        expect(full).toBe(201);
        expect(stubs).toBeGreaterThan(1000);
        expect(snapshot.directed).toBe(true);
        expect(report.issues.map((i) => i.code)).toContain("W_SOURCE_AUTH");
        expect(report.issues.find((i) => i.code === "W_SOURCE_AUTH")?.params).toEqual({
            origin: "https://api.openalex.org",
            status: 401,
        });
        expect(report.source?.next).toMatchObject({ r: "citing" });
        expect(report.source?.budget?.remaining).toBe(968);
        expect(report.source?.validators?.modified).toMatch(/^2026-/);
        expect(fetch.calls).toHaveLength(3);
    });

    it("continues from the cursor with a key", async () => {
        const first = await loadFromSource(
            openalexSource,
            { work: "W2112090702" },
            { fetch: replayFetch(recorded("openalex-w2112090702")) },
        );
        const cursorUrl = recorded("openalex-w2112090702")[2].url;
        // a hand-written second page: recordings carry no key
        const fetch = replayFetch(
            [
                {
                    url: cursorUrl,
                    credential: true,
                    body: {
                        meta: { next_cursor: null },
                        results: [
                            { id: "https://openalex.org/W9", referenced_works: ["https://openalex.org/W2112090702"] },
                        ],
                    },
                },
            ],
            { secretQuery: ["api_key"] },
        );
        const { snapshot, report } = await loadFromSource(
            openalexSource,
            { work: "W2112090702" },
            {
                fetch,
                cursor: first.report.source?.next ?? undefined,
                credential: credentials.apiKey({ query: "api_key" }, "k"),
            },
        );
        expect(snapshot.ids.has("W9")).toBe(true);
        expect(report.source?.next).toBeNull();
        expect(fetch.calls).toEqual([expect.objectContaining({ credential: true })]);
    });

    it("says where its API key goes, so a form can ask for the key alone", () => {
        expect(openalexSource.descriptor?.apiKey).toEqual({ query: "api_key" });
        const keyed = restSource({ ...PEOPLE, auth: { kind: "api-key", header: "X-Key" } }, { id: "keyed" });
        expect(keyed.descriptor?.apiKey).toEqual({ header: "X-Key" });
        expect(people.descriptor?.apiKey).toBeUndefined();
    });

    it("hydrates stubs: an expansion of depth 0 fetches their records in one batch", async () => {
        const fetch = replayFetch(recorded("openalex-hydrate"));
        const ids = ["W111157985", "W201336350", "W584762224"];
        const { snapshot } = await expandFromSource(
            openalexSource,
            { params: { work: "W2112090702" }, ids, depth: 0 },
            { fetch },
        );
        const stub = (i: number): unknown =>
            snapshot.nodes.has(SOURCE_STUB_ATTR) ? snapshot.nodes.value(SOURCE_STUB_ATTR, i) : null;
        for (const id of ids) {
            const i = snapshot.ids.requireIndex(id);
            expect(snapshot.nodes.value("title", i)).toEqual(expect.any(String));
            expect(stub(i) ?? null).not.toBe(true);
        }
        expect(fetch.calls).toHaveLength(1);
    });

    it("builds the co-authorship graph of an author", async () => {
        const fetch = replayFetch(recorded("openalex-coauthors"));
        const { snapshot, report } = await loadFromSource(
            openalexSource,
            { author: "A5055156518", graph: "coauthorship" },
            { fetch },
        );
        expect(snapshot.directed).toBe(false);
        expect(snapshot.ids.has("A5055156518")).toBe(true);
        const labels = (i: number): unknown => snapshot.nodes.value("labels", i);
        for (let i = 0; i < snapshot.nodeCount; i++) {
            expect(labels(i)).toEqual(["author"]);
        }
        expect(snapshot.edgeCount).toBeGreaterThan(0);
        const type = (i: number): unknown => snapshot.edges.value("type", i);
        expect(type(0)).toBe("coauthor");
        expect(report.source?.next).toBeNull();
    });

    it("includes authors, institutions and topics as nodes when asked", async () => {
        const select =
            "id,display_name,publication_year,cited_by_count,updated_date,referenced_works,authorships,topics";
        const work = {
            id: "https://openalex.org/W1",
            authorships: [
                {
                    author: { id: "https://openalex.org/A1", display_name: "Ana" },
                    institutions: [{ id: "https://openalex.org/I1", display_name: "Uni" }],
                },
            ],
            topics: [{ id: "https://openalex.org/T1", display_name: "Graphs" }],
        };
        const { snapshot } = await loadFromSource(
            openalexSource,
            { work: "https://openalex.org/W1", include: "institutions,topics" },
            {
                fetch: replayFetch([
                    {
                        url: `https://api.openalex.org/works?filter=openalex:W1&per-page=50&select=${select}`,
                        body: { results: [work] },
                    },
                    {
                        url: `https://api.openalex.org/works?filter=cites:W1&per-page=200&select=${select}&cursor=*`,
                        body: { meta: {}, results: [] },
                    },
                ]),
            },
        );
        const label = (id: string): unknown => snapshot.nodes.value("labels", snapshot.ids.requireIndex(id));
        expect([label("A1"), label("I1"), label("T1")]).toEqual([["author"], ["institution"], ["topic"]]);
        const types = Array.from({ length: snapshot.edgeCount }, (_, e) => snapshot.edges.value("type", e)).sort();
        expect(types).toEqual(["affiliated_with", "authored_by", "has_topic"]);
    });

    it("builds the co-authorship graph of one work", async () => {
        const work = {
            id: "https://openalex.org/W1",
            authorships: [
                { author: { id: "https://openalex.org/A1" }, institutions: [{ id: "https://openalex.org/I1" }] },
                { author: { id: "https://openalex.org/A2" }, institutions: [] },
            ],
        };
        const { snapshot } = await loadFromSource(
            openalexSource,
            { work: "W1", graph: "coauthorship", include: ["institutions"] },
            {
                fetch: replayFetch([
                    {
                        url: "https://api.openalex.org/works?filter=openalex:W1&per-page=50&select=id,updated_date,authorships",
                        body: { results: [work] },
                    },
                ]),
            },
        );
        expect([...snapshot.ids].sort()).toEqual(["A1", "A2", "I1"]);
    });

    it("loads by its id from the default registry", async () => {
        const { format, report } = await loadFromSource(
            "openalex",
            { work: "W2112090702" },
            {
                fetch: replayFetch(recorded("openalex-w2112090702")),
            },
        );
        expect(format).toBe("source:openalex");
        expect(report.source?.id).toBe("openalex");
    });

    it("checks its params before any request", async () => {
        const fetch = replayFetch([]);
        for (const [params, reason, name] of [
            [{}, "required", "work"],
            [{ work: "W1", author: "A1" }, "exclusive", "work"],
            [{ work: "W1,cited_by_count:>5" }, "format", "work"],
        ] as const) {
            const err = await rejection(loadFromSource(openalexSource, params, { fetch }));
            expect(err.issue?.params).toEqual({ name, reason });
        }
        const err = await rejection(expandFromSource(openalexSource, { params: {}, ids: ["W1|W2"] }, { fetch }));
        expect(err.issue?.params).toEqual({ name: "ids", reason: "format" });
        expect(fetch.calls).toHaveLength(0);
    });

    it("validates by the newest updated_date", async () => {
        const url = `https://api.openalex.org/works?filter=openalex:W1&per-page=50&select=id,updated_date`;
        const citing = `https://api.openalex.org/works?filter=cites:W1&per-page=200&select=id,updated_date&cursor=*`;
        const answer = (date: string): Recording[] => [
            { url, body: { results: [{ id: "https://openalex.org/W1", updated_date: "2026-01-01T00:00:00" }] } },
            { url: citing, body: { meta: {}, results: [{ id: "https://openalex.org/W2", updated_date: date }] } },
        ];
        const seen = { modified: "2026-05-01T00:00:00" };
        const same = await validateSource(openalexSource, { work: "W1" }, seen, {
            fetch: replayFetch(answer("2026-05-01T00:00:00")),
        });
        expect(same).toMatchObject({ status: "current", via: "modified" });
        const newer = await validateSource(openalexSource, { work: "W1" }, seen, {
            fetch: replayFetch(answer("2026-06-01T00:00:00")),
        });
        expect(newer).toMatchObject({ status: "changed", via: "modified", changedAt: "2026-06-01T00:00:00" });
        const none = await validateSource(
            openalexSource,
            { work: "W1" },
            {},
            { fetch: replayFetch(answer("2026-06-01T00:00:00")) },
        );
        expect(none.status).toBe("unverifiable");
    });
});

describe("samples of the rest source", () => {
    it("STRING: TP53's functional partners are 21 proteins and 113 interactions", async () => {
        const sample = REST_DESCRIPTOR.samples?.find((s) => s.id === "string-tp53");
        const { snapshot } = await loadFromSource(restMappingSource, sample?.params as never, {
            fetch: replayFetch(recorded("string-tp53")),
        });
        expect([snapshot.nodeCount, snapshot.edgeCount]).toEqual([21, 113]);
        expect(snapshot.nodes.value("name", snapshot.ids.requireIndex("9606.ENSP00000269305"))).toBe("TP53");
        expect(snapshot.directed).toBe(false);
    });

    it("deps.dev: webpack 5.90.0 resolves to 84 packages and 121 dependencies", async () => {
        const sample = REST_DESCRIPTOR.samples?.find((s) => s.id === "deps-dev-webpack");
        const { snapshot } = await loadFromSource(restMappingSource, sample?.params as never, {
            fetch: replayFetch(recorded("deps-dev-webpack")),
        });
        expect([snapshot.nodeCount, snapshot.edgeCount]).toEqual([84, 121]);
        expect(snapshot.nodes.value("name", snapshot.ids.requireIndex("0"))).toBe("webpack");
    });

    it("the sample mappings are the exported ones", () => {
        expect(REST_DESCRIPTOR.samples?.map((s) => s.params.mapping)).toEqual([STRING_MAPPING, DEPS_DEV_MAPPING]);
    });
});

describe("the rest source", () => {
    it("refuses a bad mapping before any request, naming the problem", async () => {
        const fetch = replayFetch([]);
        const err = await rejection(
            loadFromSource(restMappingSource, { mapping: { ...PEOPLE, load: "ghost" } }, { fetch }),
        );
        expect(err.issue?.params).toEqual({ name: "mapping", reason: "unknown-request", at: "load" });
        expect(fetch.calls).toHaveLength(0);
    });

    it("refuses an endpoint on another origin than the mapping's", async () => {
        const err = await rejection(
            loadFromSource(
                restMappingSource,
                { mapping: PEOPLE, team: "core" },
                { endpoint: "https://other.example.com", fetch: replayFetch([]) },
            ),
        );
        expect(err.issue?.params).toEqual({ name: "endpoint", reason: "origin" });
    });

    it("restSource refuses a bad mapping when it is made", () => {
        expect(() => restSource({ ...PEOPLE, version: 2 as 1 }, { id: "bad" })).toThrow(
            expect.objectContaining({ issue: expect.objectContaining({ code: "E_SOURCE_INVALID" }) }),
        );
    });

    it("pages by offset and reports the budget", async () => {
        const fetch = replayFetch(PEOPLE_PAGES);
        const { snapshot, report } = await loadFromSource(people, { team: "core" }, { fetch });
        expect([...snapshot.ids].sort()).toEqual(["ana", "bo", "cy", "dee"]);
        expect(report.source?.budget).toEqual({ remaining: 41, resetMs: 60000 });
        expect(fetch.calls).toHaveLength(2);
    });

    it("keeps the earlier pages and warns W_SOURCE_AUTH when a later page answers 401", async () => {
        const fetch = replayFetch([PEOPLE_PAGES[0], { url: `${API}/teams/core/people?offset=2&limit=2`, status: 401 }]);
        const { snapshot, report } = await loadFromSource(people, { team: "core" }, { fetch });
        expect(snapshot.ids.has("ana")).toBe(true);
        expect(report.issues.map((i) => i.code)).toContain("W_SOURCE_AUTH");
        expect(report.source?.next).toMatchObject({ r: "people", at: 2 });
    });

    it("pages by link header and by a next URL in the body", async () => {
        const linked: RestMapping = {
            ...PEOPLE,
            requests: { ...PEOPLE.requests, people: { ...PEOPLE.requests.people, paging: { style: "link-header" } } },
        };
        const byLink = await loadFromSource(
            restSource(linked, { id: "linked" }),
            { team: "core" },
            {
                fetch: replayFetch([
                    {
                        url: `${API}/teams/core/people`,
                        headers: { link: `<${API}/teams/core/people?p=2>; rel="next"` },
                        body: { items: [{ id: "a" }] },
                    },
                    {
                        url: `${API}/teams/core/people?p=2`,
                        headers: { link: `<${API}/teams/core/people>; rel="first"` },
                        body: { items: [{ id: "b" }] },
                    },
                ]),
            },
        );
        expect([...byLink.snapshot.ids]).toEqual(["a", "b"]);
        const nexted: RestMapping = {
            ...PEOPLE,
            requests: {
                ...PEOPLE.requests,
                people: { ...PEOPLE.requests.people, paging: { style: "next-url", next: "next" } },
            },
        };
        const byNext = await loadFromSource(
            restSource(nexted, { id: "nexted" }),
            { team: "core" },
            {
                fetch: replayFetch([
                    { url: `${API}/teams/core/people`, body: { items: [{ id: "a" }], next: "/teams/core/people?p=2" } },
                    {
                        url: `${API}/teams/core/people?p=2`,
                        body: { items: [{ id: "b" }], next: `https://evil.example.com/x` },
                    },
                ]),
            },
        ).catch((e: unknown) => e);
        expect((byNext as { issue?: { params?: unknown } }).issue?.params).toEqual({ name: "url", reason: "origin" });
    });

    it("refuses a body that is not JSON", async () => {
        const err = await rejection(
            loadFromSource(
                people,
                { team: "core" },
                {
                    fetch: replayFetch([
                        { ...PEOPLE_PAGES[0], body: "<html>", headers: { "content-type": "text/html" } },
                    ]),
                },
            ),
        );
        expect(err.issue?.params).toEqual({ expected: "json", contentType: "text/html" });
    });

    it("expands breadth-first with batched {ids}", async () => {
        const fetch = replayFetch([
            {
                url: `${API}/people?knownBy=ana%2Cbo`,
                body: {
                    items: [
                        { id: "cy", knows: ["ana"] },
                        { id: "dee", knows: ["bo"] },
                    ],
                },
            },
            { url: `${API}/people?knownBy=cy%2Cdee`, body: { items: [{ id: "eve", knows: ["cy"] }] } },
        ]);
        const { snapshot } = await expandFromSource(
            people,
            { params: { team: "core" }, ids: ["ana", "bo"], depth: 2 },
            { fetch },
        );
        expect([...snapshot.ids].sort()).toEqual(["ana", "bo", "cy", "dee", "eve"]);
        expect(fetch.calls).toHaveLength(2);
        const stub = (i: number): unknown =>
            snapshot.nodes.has(SOURCE_STUB_ATTR) ? snapshot.nodes.value(SOURCE_STUB_ATTR, i) : null;
        // the seeds are the caller's; they are never written as stubs
        expect(stub(snapshot.ids.requireIndex("ana"))).toBeNull();
    });

    it("caps an expansion at limit new nodes and continues from its cursor", async () => {
        const recordings: Recording[] = [
            { url: `${API}/people?knownBy=a,b`, body: { items: [{ id: "c" }, { id: "d" }] } },
            { url: `${API}/people?knownBy=e`, body: { items: [{ id: "f" }] } },
        ];
        const first = await expandFromSource(
            people,
            { params: {}, ids: ["a", "b", "e"], limit: 2 },
            { fetch: replayFetch(recordings) },
        );
        expect(first.report.issues.find((i) => i.code === "W_SOURCE_LIMIT")?.params).toEqual({
            limit: "limit",
            value: 2,
        });
        const next = first.report.source?.next;
        expect(next).toMatchObject({ x: 0, b: 1, at: null });
        const rest = await expandFromSource(
            people,
            { params: {}, ids: ["a", "b", "e"] },
            { fetch: replayFetch(recordings), cursor: next ?? undefined },
        );
        expect([...rest.snapshot.ids].sort()).toEqual(["f"]);
    });

    it("keeps what an expansion fetched when a later page answers 403", async () => {
        const paged: RestMapping = {
            ...PEOPLE,
            requests: {
                ...PEOPLE.requests,
                knows: { ...PEOPLE.requests.knows, paging: { style: "next-url", next: "next" } },
            },
        };
        const { snapshot, report } = await expandFromSource(
            restSource(paged, { id: "paged" }),
            { params: {}, ids: ["a"] },
            {
                fetch: replayFetch([
                    { url: `${API}/people?knownBy=a`, body: { items: [{ id: "b" }], next: "/people?knownBy=a&p=2" } },
                    { url: `${API}/people?knownBy=a&p=2`, status: 403 },
                ]),
            },
        );
        expect(snapshot.ids.has("b")).toBe(true);
        expect(report.issues.map((i) => i.code)).toContain("W_SOURCE_AUTH");
        expect(report.source?.next).toMatchObject({ x: 0, b: 0 });
        const resumed = await expandFromSource(
            restSource(paged, { id: "paged" }),
            { params: {}, ids: ["a"] },
            {
                cursor: report.source?.next ?? undefined,
                fetch: replayFetch([{ url: `${API}/people?knownBy=a&p=2`, body: { items: [{ id: "c" }] } }]),
            },
        );
        expect([...resumed.snapshot.ids]).toEqual(["c"]);
    });

    it("filters an expansion by relationship type and refuses one with no request", async () => {
        const { snapshot } = await expandFromSource(
            people,
            { params: {}, ids: ["a"], relationshipTypes: ["likes"] },
            {
                fetch: replayFetch([{ url: `${API}/people?knownBy=a`, body: { items: [{ id: "b", knows: ["a"] }] } }]),
            },
        );
        expect(snapshot.edgeCount).toBe(0);
        const bare = restSource({ ...PEOPLE, expand: undefined, hydrate: undefined }, { id: "bare" });
        const err = await rejection(
            expandFromSource(bare, { params: {}, ids: ["a"], depth: 0 }, { fetch: replayFetch([]) }),
        );
        expect(err.issue?.params).toEqual({ feature: "hydrate" });
        const none = await rejection(expandFromSource(people, { params: {}, ids: [] }, { fetch: replayFetch([]) }));
        expect(none.issue?.params).toEqual({ name: "ids", reason: "required" });
    });

    it("validates by ETag: a 304 is current, another tag is changed", async () => {
        const url = `${API}/teams/core/people?offset=0&limit=2`;
        const current = await validateSource(
            people,
            { team: "core" },
            { etag: '"v1"' },
            { fetch: replayFetch([{ url, status: 304 }]) },
        );
        expect(current).toMatchObject({ status: "current", via: "etag" });
        const changed = await validateSource(
            people,
            { team: "core" },
            { etag: '"v1"' },
            {
                fetch: replayFetch([{ url, headers: { etag: '"v2"' }, body: { items: [] } }]),
            },
        );
        expect(changed).toMatchObject({ status: "changed", via: "etag", validators: { etag: '"v2"' } });
    });

    it("probes with the load request's first page", async () => {
        expect(await probeSource(people, { team: "core" }, { fetch: replayFetch(PEOPLE_PAGES) })).toEqual({ ok: true });
        const err = await rejection(probeSource(people, { team: "core" }, { fetch: replayFetch([page(0, [])]) }));
        expect(err.issue?.code).toBe("E_SOURCE_NOT_FOUND");
    });

    it("paces requests under the mapping's own rate limit", async () => {
        const fetch = replayFetch(PEOPLE_PAGES);
        const { snapshot } = await loadFromSource(
            restMappingSource,
            { mapping: { ...PEOPLE, rateLimit: { requests: 1000, perMs: 1 } }, team: "core" },
            { fetch },
        );
        expect(snapshot.nodeCount).toBe(4);
        expect(fetch.calls).toHaveLength(2);
    });

    it("sends a POST request's body", async () => {
        const posted: RestMapping = {
            ...PEOPLE,
            requests: {
                ...PEOPLE.requests,
                people: {
                    path: "/search",
                    method: "POST",
                    body: { team: "{team}" },
                    records: "items",
                    entity: "person",
                },
            },
        };
        const { snapshot } = await loadFromSource(
            restSource(posted, { id: "posted" }),
            { team: "core" },
            {
                fetch: replayFetch([
                    {
                        method: "POST",
                        url: `${API}/search`,
                        requestBody: '{"team":"core"}',
                        body: { items: [{ id: "a" }] },
                    },
                ]),
            },
        );
        expect([...snapshot.ids]).toEqual(["a"]);
    });
});

runSourceConformance(restMappingSource, [
    {
        name: "STRING",
        params: { mapping: STRING_MAPPING, identifiers: "TP53", species: "9606", add_nodes: "20" },
        endpoint: STRING_MAPPING.endpoint,
        recordings: recorded("string-tp53"),
    },
    {
        name: "a paged API",
        params: { mapping: PEOPLE, team: "core" },
        endpoint: API,
        recordings: PEOPLE_PAGES,
        cap: { maxNodes: 1 },
    },
]);

runSourceConformance(openalexSource, [
    {
        name: "W2112090702",
        params: { work: "W2112090702" },
        recordings: recorded("openalex-w2112090702"),
        secretQuery: ["api_key"],
        credential: (secret) => credentials.apiKey({ query: "api_key" }, secret),
    },
]);
