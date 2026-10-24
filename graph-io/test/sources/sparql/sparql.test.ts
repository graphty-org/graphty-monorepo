/**
 * The SPARQL source against a local fixture endpoint (fixture.ts): a Wikidata-shaped CONSTRUCT
 * loads, a capped load resumes page by page, an expansion adds a node's triples, validate compares
 * the first page's hash, and the conformance suite over recorded answers.
 */

import { readFileSync } from "node:fs";
import { type Server } from "node:http";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
    expandFromSource,
    type ImportGraphResult,
    loadFromSource,
    probeSource,
    type Recording,
    replayFetch,
    type SourceCursor,
    validateSource,
} from "../../../src/index.js";
import { sparqlSource } from "../../../src/sources/sparql/index.js";
import { localName, parseNTriples } from "../../../src/sources/sparql/ntriples.js";
import { pagedQuery, readQuery } from "../../../src/sources/sparql/query.js";
import { runSourceConformance } from "../harness.js";
import { rejection } from "../helpers.js";
import { answer, startFixture, TRIPLES } from "./fixture.js";

const WD = "http://www.wikidata.org/entity/";

/** What Wikidata answered on 2026-10-20 (scripts/record-sparql.ts). */
const wikidata = JSON.parse(
    readFileSync(new URL("./recordings/wikidata-advisors.json", import.meta.url), "utf8"),
) as Recording[];

/** A caller's CONSTRUCT, as a reader would write it for Wikidata. */
const ADVISORS = `PREFIX wdt: <http://www.wikidata.org/prop/direct/>
CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }`;

let fixture: { server: Server; endpoint: string; queries: string[] };

beforeAll(async () => {
    fixture = await startFixture();
});

afterAll(async () => {
    await new Promise((resolve) => {
        fixture.server.close(resolve);
    });
});

/**
 * A node attribute, or undefined when the column or the node is missing.
 * @param result - the load
 * @param id - the node
 * @param name - the column
 * @returns the value
 */
function attr(result: ImportGraphResult, id: string, name: string): unknown {
    const { snapshot } = result;
    return snapshot.nodes.has(name) ? snapshot.nodes.value(name, snapshot.ids.requireIndex(id)) : undefined;
}

describe("N-Triples and queries", () => {
    it("reads IRIs, blank nodes, tagged and typed literals and escapes", () => {
        const text = [
            "# a comment",
            "",
            '<http://a/x> <http://a/p> "caf\\u00E9 \\"q\\""@EN .',
            '_:b0 <http://a/n> "7"^^<http://www.w3.org/2001/XMLSchema#integer> . # trailing',
            "<http://a/x> <http://a/q> _:b0 .",
        ].join("\n");
        const { triples, badLine } = parseNTriples(text);
        expect(badLine).toBeNull();
        expect(triples).toHaveLength(3);
        expect(triples[0].o).toEqual({
            kind: "literal",
            value: `caf${String.fromCharCode(0xe9)} "q"`,
            lang: "en",
            datatype: "",
        });
        expect(triples[1].s).toEqual({ kind: "bnode", value: "_:b0" });
        expect(triples[2].o).toEqual({ kind: "bnode", value: "_:b0" });
    });

    it("names the first line that is not a triple", () => {
        expect(parseNTriples("<http://a/x> <http://a/p> <http://a/y> .\n@prefix a: <http://a/> .").badLine).toBe(2);
        expect(parseNTriples('"lit" <http://a/p> <http://a/y> .').badLine).toBe(1);
        expect(parseNTriples("<http://a/x> <http://a/p> <http://a/y>").badLine).toBe(1);
    });

    it("names attributes and edge types by the predicate's local name", () => {
        expect(localName("http://www.w3.org/2000/01/rdf-schema#label")).toBe("label");
        expect(localName("http://www.wikidata.org/prop/direct/P184")).toBe("P184");
        expect(localName("urn:isbn:123")).toBe("123");
        expect(localName("http://a/")).toBe("http://a/");
    });

    it("orders a CONSTRUCT by its template variables and leaves a query with its own LIMIT alone", () => {
        const shape = readQuery(ADVISORS);
        expect(shape).toEqual({ form: "construct", ownLimit: false, ordered: false, templateVars: ["?s", "?p", "?o"] });
        expect(pagedQuery(ADVISORS, shape, 10, 20)).toMatch(/\nORDER BY \?s \?p \?o\nLIMIT 10 OFFSET 20$/);
        expect(readQuery(`${ADVISORS} LIMIT 5`).ownLimit).toBe(true);
        expect(readQuery(`${ADVISORS} ORDER BY ?o`).ordered).toBe(true);
        // keywords inside IRIs, strings and comments do not count
        expect(
            readQuery('PREFIX x: <http://select/> # SELECT\nDESCRIBE <http://a/LIMIT> ?x WHERE { ?x x:p "LIMIT" }'),
        ).toMatchObject({ form: "describe", ownLimit: false });
        expect(readQuery("SELECT * WHERE { ?s ?p ?o }").form).toBe("select");
    });
});

describe("the sparql source against a local endpoint", () => {
    it("loads a CONSTRUCT: IRI objects are edges, literals attributes, numbers numbers", async () => {
        const result = await loadFromSource(
            sparqlSource,
            { query: ADVISORS, language: "en" },
            { endpoint: fixture.endpoint },
        );
        const { snapshot, report } = result;
        expect(snapshot.directed).toBe(true);
        expect(snapshot.nodeCount).toBe(7);
        expect(snapshot.edgeCount).toBe(4);
        expect(attr(result, `${WD}Q937`, "label")).toBe("Albert Einstein");
        expect(attr(result, `${WD}Q937`, "P1971")).toBe(2);
        expect(attr(result, `${WD}Q556543`, "label")).toBe(`G${String.fromCharCode(0xe9)}rard Mourou`);
        const types = Array.from({ length: snapshot.edgeCount }, (_, e) => snapshot.edges.value("type", e));
        expect(new Set(types)).toEqual(new Set(["P184"]));
        expect(snapshot.edges.value("predicate", 0)).toBe("http://www.wikidata.org/prop/direct/P184");
        expect(report.source?.next).toBeNull();
        expect(report.source?.validators?.contentHash).toMatch(/^[\da-f]{64}$/);
    });

    it("pages a capped load, and Load more resumes where it stopped", async () => {
        const params = { query: ADVISORS, pageSize: 4 };
        const sent = fixture.queries.length;
        const first = await loadFromSource(sparqlSource, params, {
            endpoint: fixture.endpoint,
            limits: { maxNodes: 2 },
        });
        expect(fixture.queries.slice(sent)).toHaveLength(1);
        expect(fixture.queries.at(-1)).toMatch(/ORDER BY \?s \?p \?o\nLIMIT 4$/);
        const cursor = first.report.source?.next;
        expect(cursor).toMatchObject({ offset: 4 });
        const more = await loadFromSource(sparqlSource, params, {
            endpoint: fixture.endpoint,
            limits: { maxNodes: 2 },
            cursor,
        });
        expect(fixture.queries.at(-1)).toMatch(/LIMIT 4 OFFSET 4$/);
        expect(more.snapshot.ids.has(`${WD}Q47480`)).toBe(true);
        expect(first.snapshot.ids.has(`${WD}Q47480`)).toBe(false);
        expect(more.report.source?.validators).toBeUndefined();

        // every page in turn holds exactly the whole load
        const ids = new Set<unknown>();
        let next: SourceCursor | null | undefined = undefined;
        for (let i = 0; i < 10; i++) {
            const part: ImportGraphResult = await loadFromSource(sparqlSource, params, {
                endpoint: fixture.endpoint,
                limits: { maxNodes: 1 },
                cursor: next ?? undefined,
            });
            for (const id of part.snapshot.ids) {
                ids.add(id);
            }
            next = part.report.source?.next;
            if (next === null || next === undefined) {
                break;
            }
        }
        expect(ids.size).toBe(7);
    });

    it("sends a caller's own LIMIT as written, once", async () => {
        const sent = fixture.queries.length;
        const { snapshot, report } = await loadFromSource(
            sparqlSource,
            { query: `${ADVISORS}\nLIMIT 3` },
            { endpoint: fixture.endpoint },
        );
        expect(fixture.queries.slice(sent)).toEqual([`${ADVISORS}\nLIMIT 3`]);
        expect(snapshot.ids.has(`${WD}Q937`)).toBe(true);
        expect(report.source?.next).toBeNull();
    });

    it("loads everything, and the neighborhood of seed IRIs", async () => {
        const all = await loadFromSource(sparqlSource, { mode: "all", language: "en" }, { endpoint: fixture.endpoint });
        expect(all.snapshot.nodeCount).toBe(7);
        expect(fixture.queries.at(-1)).toContain('langMatches(lang(?o), "en")');
        await loadFromSource(
            sparqlSource,
            { mode: "all", predicates: ["http://a/p/"] },
            { endpoint: fixture.endpoint },
        );
        expect(fixture.queries.at(-1)).toContain('FILTER(isLiteral(?o) || STRSTARTS(STR(?p), "http://a/p/"))');
        const around = await loadFromSource(
            sparqlSource,
            { mode: "neighborhood", ids: [`${WD}Q47480`] },
            { endpoint: fixture.endpoint },
        );
        expect([...around.snapshot.ids].sort()).toEqual([`${WD}Q47480`, `${WD}Q7251`, `${WD}Q9095`].sort());
    });

    it("expands a node: its triples out and in", async () => {
        const seed = `${WD}Q47480`;
        const { snapshot, report } = await expandFromSource(
            sparqlSource,
            { params: {}, ids: [seed] },
            { endpoint: fixture.endpoint },
        );
        expect(fixture.queries.at(-1)).toContain(`VALUES ?s { <${seed}> }`);
        expect(fixture.queries.at(-1)).toContain(`VALUES ?o { <${seed}> }`);
        expect(snapshot.edgeCount).toBe(2);
        expect(snapshot.ids.has(`${WD}Q9095`)).toBe(true);
        expect(snapshot.ids.has(`${WD}Q7251`)).toBe(true);
        expect(snapshot.nodes.value("label", snapshot.ids.requireIndex(seed))).toBe("Ralph Fowler");
        expect(report.source?.next).toMatchObject({ offset: 500 });

        const out = await expandFromSource(
            sparqlSource,
            { params: {}, ids: [seed], direction: "out" },
            { endpoint: fixture.endpoint },
        );
        expect(fixture.queries.at(-1)).not.toContain("VALUES ?o");
        expect(out.snapshot.ids.has(`${WD}Q9095`)).toBe(false);
    });

    it("expands two hops, a capped expansion resumes, and relationship types filter edges", async () => {
        const deep = await expandFromSource(
            sparqlSource,
            { params: {}, ids: [`${WD}Q9095`], depth: 2, direction: "out" },
            { endpoint: fixture.endpoint },
        );
        expect(deep.snapshot.ids.has(`${WD}Q7251`)).toBe(true);
        expect(deep.report.source?.next).toBeNull();

        const capped = await expandFromSource(
            sparqlSource,
            { params: {}, ids: [`${WD}Q937`], limit: 2, direction: "out" },
            { endpoint: fixture.endpoint },
        );
        const resumed = await expandFromSource(
            sparqlSource,
            { params: {}, ids: [`${WD}Q937`], limit: 2, direction: "out" },
            { endpoint: fixture.endpoint, cursor: capped.report.source?.next },
        );
        expect(fixture.queries.at(-1)).toMatch(/LIMIT 2 OFFSET 2$/);
        expect(resumed.snapshot.nodes.value("P1971", 0)).toBe(2);

        const typed = await expandFromSource(
            sparqlSource,
            { params: {}, ids: [`${WD}Q47480`], relationshipTypes: ["P999"] },
            { endpoint: fixture.endpoint },
        );
        expect(typed.snapshot.edgeCount).toBe(0);
    });

    it("validates by the first page's hash", async () => {
        const params = { query: ADVISORS, pageSize: 4 };
        const { report } = await loadFromSource(sparqlSource, params, { endpoint: fixture.endpoint });
        const seen = report.source?.validators ?? {};
        const same = await validateSource(sparqlSource, params, seen, { endpoint: fixture.endpoint });
        expect(same).toMatchObject({ status: "current", via: "hash" });
        const other = await validateSource(sparqlSource, params, { contentHash: "0" }, { endpoint: fixture.endpoint });
        expect(other.status).toBe("changed");
        const none = await validateSource(sparqlSource, params, {}, { endpoint: fixture.endpoint });
        expect(none.status).toBe("unverifiable");
    });

    it("probes with a one-solution query", async () => {
        await expect(probeSource(sparqlSource, {}, { endpoint: fixture.endpoint })).resolves.toEqual({ ok: true });
        expect(fixture.queries.at(-1)).toMatch(/LIMIT 1$/);
    });

    it("refuses what it cannot send, before any request", async () => {
        const sent = fixture.queries.length;
        const at = { endpoint: fixture.endpoint };
        const select = await rejection(loadFromSource(sparqlSource, { query: "SELECT * WHERE { ?s ?p ?o }" }, at));
        expect(select.issue?.params).toEqual({ name: "query", reason: "form" });
        const blank = await rejection(loadFromSource(sparqlSource, { mode: "neighborhood", ids: ["_:b0"] }, at));
        expect(blank.issue?.params).toEqual({ name: "ids", reason: "iri" });
        const lang = await rejection(loadFromSource(sparqlSource, { language: 'en") || true || ("' }, at));
        expect(lang.issue?.params).toEqual({ name: "language", reason: "type" });
        const along = await rejection(loadFromSource(sparqlSource, { mode: "all", predicates: ['x") || ("'] }, at));
        expect(along.issue?.params).toEqual({ name: "predicates", reason: "iri" });
        const seeds = await rejection(expandFromSource(sparqlSource, { params: {}, ids: [] }, at));
        expect(seeds.issue?.params).toEqual({ name: "ids", reason: "required" });
        expect(fixture.queries.length).toBe(sent);
    });

    it("passes a refused query's message through as E_SOURCE_QUERY", async () => {
        const err = await rejection(
            loadFromSource(
                sparqlSource,
                { query: "CONSTRUCT { ?s ?p ?o } WHERE { BROKEN }" },
                { endpoint: fixture.endpoint },
            ),
        );
        expect(err.issue?.code).toBe("E_SOURCE_QUERY");
        expect(err.issue?.params).toMatchObject({ serverMessage: expect.stringContaining("BROKEN") });
    });

    it("refuses an answer that is not N-Triples", async () => {
        const endpoint = "https://sparql.example.org/sparql";
        const html = replayFetch([
            { method: "POST", url: endpoint, headers: { "content-type": "text/html" }, body: "<html></html>" },
        ]);
        const err = await rejection(loadFromSource(sparqlSource, { query: ADVISORS }, { endpoint, fetch: html }));
        expect(err.issue?.params).toEqual({ expected: "n-triples", contentType: "text/html" });
        const turtle = replayFetch([{ method: "POST", url: endpoint, body: "@prefix a: <http://a/> .\n" }]);
        const bad = await rejection(loadFromSource(sparqlSource, { query: ADVISORS }, { endpoint, fetch: turtle }));
        expect(bad.issue?.code).toBe("E_SOURCE_RESPONSE");
    });
});

describe("Wikidata, recorded on 2026-10-20", () => {
    const sample = sparqlSource.descriptor?.samples?.[0];
    const options = { endpoint: sample?.endpoint, limits: { maxNodes: 150 } };

    it("loads the sample query, Load more adds a page, and expanding a node adds its triples", async () => {
        const fetch = replayFetch(wikidata);
        const first = await loadFromSource(sparqlSource, sample?.params ?? {}, { ...options, fetch });
        expect([first.snapshot.nodeCount, first.snapshot.edgeCount]).toEqual([281, 200]);
        expect(first.report.source?.next).toMatchObject({ offset: 200 });
        const advisor = first.snapshot.edges.value("type", 0);
        expect(advisor).toBe("P184");
        const more = await loadFromSource(sparqlSource, sample?.params ?? {}, {
            ...options,
            fetch,
            cursor: first.report.source?.next,
        });
        expect(more.snapshot.nodeCount).toBe(20);
        expect([...more.snapshot.ids].some((id) => !first.snapshot.ids.has(id))).toBe(true);
        expect(more.report.source?.next).toBeNull();

        const seed = first.snapshot.ids.idOf(0);
        const around = await expandFromSource(
            sparqlSource,
            { params: sample?.params ?? {}, ids: [seed], limit: 40 },
            { endpoint: sample?.endpoint, fetch },
        );
        expect(around.snapshot.edgeCount).toBe(40);
        // only direct claims are followed: the award, the employer, the works that cite the seed
        const types = new Set(Array.from({ length: 40 }, (_, e) => around.snapshot.edges.value("type", e)));
        expect(types.has("P166")).toBe(true);
        expect(around.report.source?.next).toMatchObject({ offset: 40 });
        expect(fetch.calls).toHaveLength(5);
    });
});

/** The recorded answers of a paged CONSTRUCT, three pages of four and the empty one after. */
const CONFORMANCE_ENDPOINT = "https://sparql.example.org/sparql";
const shape = readQuery(ADVISORS);
const pages = [0, 4, 8, 12].map((offset) => {
    const query = pagedQuery(ADVISORS, shape, 4, offset);
    return {
        method: "POST",
        url: CONFORMANCE_ENDPOINT,
        requestBody: new URLSearchParams({ query }).toString(),
        headers: { "content-type": "application/n-triples" },
        body: answer(query).body,
    };
});

it("records answers the fixture would give", () => {
    expect(pages.map((p) => p.body.split("\n").filter(Boolean).length)).toEqual([4, 4, 4, 0]);
    expect(TRIPLES).toHaveLength(12);
});

runSourceConformance(sparqlSource, [
    {
        name: "a paged CONSTRUCT",
        params: { query: ADVISORS, pageSize: 4 },
        endpoint: CONFORMANCE_ENDPOINT,
        cap: { maxNodes: 1 },
        recordings: pages,
    },
    {
        name: "an auth failure",
        params: { query: ADVISORS, pageSize: 4 },
        endpoint: CONFORMANCE_ENDPOINT,
        recordings: [{ method: "POST", url: CONFORMANCE_ENDPOINT, status: 401 }],
    },
]);
