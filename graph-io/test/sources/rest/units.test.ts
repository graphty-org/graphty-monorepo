/**
 * The REST mapping's parts on their own: selectors, templates (encoding, path injection, the origin
 * lock), the mapping check, paging and the records-to-graph rules (stubs never overwrite a record).
 */

import { describe, expect, it } from "vitest";

import { ImportReportBuilder } from "../../../src/common/report.js";
import { ImportError } from "../../../src/index.js";
import { SOURCE_ENTITY_ATTR, SOURCE_STUB_ATTR } from "../../../src/sources/ids.js";
import {
    checkRestMapping,
    DEPS_DEV_MAPPING,
    OPENALEX_MAPPING,
    type RestMapping,
    STRING_MAPPING,
} from "../../../src/sources/rest/index.js";
import { nextPosition, pageUrl } from "../../../src/sources/rest/paging.js";
import { newState, toRecords } from "../../../src/sources/rest/records.js";
import { select, selectOne, selectRecords } from "../../../src/sources/rest/selectors.js";
import { buildRequest, templateNames } from "../../../src/sources/rest/templates.js";

const report = (): ImportReportBuilder => new ImportReportBuilder("source:rest", 100);

/**
 * The params of the issue a call throws.
 * @param fn - the call
 * @returns the issue's code and params
 */
function thrown(fn: () => unknown): { code: unknown; params: unknown } {
    try {
        fn();
    } catch (err) {
        expect(err).toBeInstanceOf(ImportError);
        return { code: (err as ImportError).issue?.code, params: (err as ImportError).issue?.params };
    }
    throw new Error("expected a throw");
}

describe("selectors", () => {
    const work = {
        id: "W1",
        meta: { next_cursor: "abc" },
        referenced_works: ["W2", "W3"],
        authorships: [
            { author: { id: "A1" }, institutions: [{ id: "I1" }, { id: "I2" }] },
            { author: { id: null }, institutions: [] },
            { author: { id: "A2" } },
        ],
    };

    it("follows dotted paths and flattens arrays with []", () => {
        expect(select(work, "meta.next_cursor")).toEqual(["abc"]);
        expect(select(work, "referenced_works[]")).toEqual(["W2", "W3"]);
        expect(select(work, "authorships[].author.id")).toEqual(["A1", "A2"]);
        expect(select(work, "authorships[].institutions[].id")).toEqual(["I1", "I2"]);
        expect(select(work, "missing.path")).toEqual([]);
        expect(selectOne(work, "id")).toBe("W1");
        expect(select(work, ".")).toEqual([work]);
    });

    it("reads an array of records, or one record", () => {
        expect(selectRecords({ results: [1, 2] }, "results")).toEqual([1, 2]);
        expect(selectRecords([1, 2], ".")).toEqual([1, 2]);
        expect(selectRecords({ a: 1 }, ".")).toEqual([{ a: 1 }]);
    });
});

describe("templates", () => {
    const endpoint = new URL("https://api.example.com/v1");
    const req = { path: "/items/{id}", query: { q: "name:{name}" }, records: ".", entity: "x" };

    it("finds slot names and refuses malformed braces", () => {
        expect(templateNames("/works/{id}/{ids}")).toEqual(["id", "ids"]);
        expect(templateNames("/works/{id")).toBeNull();
        expect(templateNames("/works/{a b}")).toBeNull();
    });

    it("encodes a value for its position and keeps the endpoint's path", () => {
        const { url } = buildRequest(endpoint, req, { id: "a/b c", name: "x&y=z" }, report());
        expect(url.pathname).toBe("/v1/items/a%2Fb%20c");
        expect(url.searchParams.get("q")).toBe("name:x&y=z");
        expect([...url.searchParams.keys()]).toEqual(["q"]);
    });

    it("refuses a value that would climb out of the path", () => {
        for (const id of ["..", ".", ""]) {
            expect(thrown(() => buildRequest(endpoint, req, { id, name: "n" }, report())).params).toEqual({
                name: "path",
                reason: "path",
            });
        }
    });

    it("refuses a missing value", () => {
        expect(thrown(() => buildRequest(endpoint, req, { id: "1" }, report())).params).toEqual({
            name: "name",
            reason: "required",
        });
    });

    it("locks a URL from a body to the endpoint's origin and path", () => {
        const r = report();
        expect(
            pageUrl(new URL("https://api.example.com/v1/x"), { style: "next-url", next: "n" }, "/v1/x?p=2", endpoint, r)
                .href,
        ).toBe("https://api.example.com/v1/x?p=2");
        for (const bad of ["https://evil.example.com/v1/x", "/v2/x", "//evil.example.com/v1"]) {
            expect(
                thrown(() =>
                    pageUrl(
                        new URL("https://api.example.com/v1/x"),
                        { style: "next-url", next: "n" },
                        bad,
                        endpoint,
                        r,
                    ),
                ).params,
            ).toEqual({ name: "url", reason: "origin" });
        }
    });

    it("fills a POST body's string leaves", () => {
        const { init } = buildRequest(
            endpoint,
            { ...req, method: "POST", body: { q: "{name}", n: 1, list: ["{name}"] } },
            { id: "1", name: "ana" },
            report(),
        );
        expect(JSON.parse(init.body as string)).toEqual({ q: "ana", n: 1, list: ["ana"] });
        expect(init.method).toBe("POST");
    });
});

describe("checkRestMapping", () => {
    it("accepts the shipped mappings", () => {
        expect(checkRestMapping(OPENALEX_MAPPING)).toEqual([]);
        expect(checkRestMapping(STRING_MAPPING)).toEqual([]);
        expect(checkRestMapping(DEPS_DEV_MAPPING)).toEqual([]);
    });

    it("names every problem and where it is", () => {
        const bad = {
            version: 2,
            endpoint: "https://user:pw@api.example.com",
            load: "nope",
            expand: { in: "list", out: 3 },
            requests: {
                list: {
                    path: "items",
                    query: { q: "{bad name}" },
                    records: "a..b",
                    entity: "ghost",
                    batch: { max: 0, join: "," },
                    paging: { style: "page" },
                },
                second: {
                    path: "/x",
                    records: "a",
                    entity: "item",
                    paging: { style: "offset", param: "o", size: { param: "n", value: -1 } },
                },
            },
            entities: {
                item: {
                    id: "x[",
                    node: true,
                    edges: [
                        { to: "a", type: 1, entity: "ghost" },
                        { pairs: "b..", type: "t" },
                    ],
                    embedded: [{ at: "c", entity: "ghost" }],
                },
            },
            rateLimit: { requests: 0, perMs: 1000 },
            budgetHeaders: { remaining: 1 },
            modified: "",
            directed: "yes",
        };
        const issues = checkRestMapping(bad).map((i) => `${i.code} ${i.at}`);
        expect(issues).toEqual(
            expect.arrayContaining([
                "version version",
                "endpoint endpoint",
                "unknown-request load",
                "missing expand.out",
                "template requests.list.path",
                "template requests.list.query.q",
                "selector requests.list.records",
                "unknown-entity requests.list.entity",
                "batch requests.list.batch",
                "paging requests.list.paging.style",
                "paging requests.second.paging",
                "selector entities.item.id",
                "missing entities.item.node",
                "missing entities.item.edges.0.type",
                "unknown-entity entities.item.edges.0.entity",
                "selector entities.item.edges.1.pairs",
                "unknown-entity entities.item.embedded.0.entity",
                "number rateLimit.requests",
                "missing budgetHeaders",
                "selector modified",
                "missing directed",
            ]),
        );
        expect(checkRestMapping(null)).toEqual([{ code: "missing", at: "" }]);
        expect(checkRestMapping({ version: 1, endpoint: "ftp://x" }).map((i) => i.at)).toEqual(
            expect.arrayContaining(["endpoint", "requests", "entities", "load"]),
        );
    });
});

describe("paging", () => {
    const endpoint = new URL("https://api.example.com");
    const page = (over: Partial<Parameters<typeof nextPosition>[2]>): Parameters<typeof nextPosition>[2] => ({
        body: {},
        headers: new Headers(),
        url: new URL("https://api.example.com/items"),
        records: 10,
        runtime: "node",
        ...over,
    });

    it("moves an offset by items or pages and stops on a short page", () => {
        const items = { style: "offset", param: "o", size: { param: "n", value: 10 } } as const;
        expect(nextPosition(items, 0, page({}), endpoint, report())).toBe(10);
        expect(nextPosition({ ...items, unit: "pages" }, 1, page({}), endpoint, report())).toBe(2);
        expect(nextPosition(items, 0, page({ records: 3 }), endpoint, report())).toBeNull();
    });

    it("reads a cursor from the body", () => {
        const cursor = { style: "cursor", param: "c", first: "*", next: "meta.next" } as const;
        expect(nextPosition(cursor, "*", page({ body: { meta: { next: "abc" } } }), endpoint, report())).toBe("abc");
        expect(nextPosition(cursor, "*", page({ body: { meta: { next: null } } }), endpoint, report())).toBeNull();
    });

    it("follows a Link header, and refuses a hidden one in a browser", () => {
        const link = { style: "link-header" } as const;
        const headers = new Headers({
            link: '<https://api.example.com/items?page=2>; rel="next", <https://api.example.com/items?page=9>; rel="last"',
        });
        expect(nextPosition(link, null, page({ headers }), endpoint, report())).toBe(
            "https://api.example.com/items?page=2",
        );
        expect(
            nextPosition(link, null, page({ headers: new Headers({ link: '<x>; rel="prev"' }) }), endpoint, report()),
        ).toBeNull();
        expect(nextPosition(link, null, page({}), endpoint, report())).toBeNull();
        expect(thrown(() => nextPosition(link, null, page({ runtime: "browser" }), endpoint, report()))).toEqual({
            code: "E_SOURCE_RESPONSE",
            params: { expected: "link-header", contentType: null },
        });
        const evil = new Headers({ link: '<https://evil.example.com/items?page=2>; rel="next"' });
        expect(thrown(() => nextPosition(link, null, page({ headers: evil }), endpoint, report())).params).toEqual({
            name: "url",
            reason: "origin",
        });
    });
});

describe("records to nodes and edges", () => {
    const mapping: RestMapping = {
        version: 1,
        endpoint: "https://api.example.com",
        load: "list",
        requests: { list: { path: "/w", records: ".", entity: "work" } },
        entities: {
            work: {
                id: "id",
                stripPrefix: "x:",
                fields: { title: "t", tags: "tags[]" },
                edges: [
                    { to: "refs[]", type: "cites", entity: "work" },
                    { pairs: "authors[].id", type: "coauthor", entity: "author" },
                ],
                embedded: [{ at: "authors[]", entity: "author" }],
            },
            author: { id: "id" },
        },
    };

    it("writes stubs for unknown targets, and a later record replaces a stub, never the reverse", () => {
        const state = newState();
        const one = toRecords(
            mapping,
            [{ records: [{ id: "x:1", t: "One", tags: ["a"], refs: ["x:2", "x:1"] }], entity: "work" }],
            state,
        );
        expect(one.nodes).toEqual([
            { id: "1", labels: ["work"], title: "One", tags: ["a"] },
            { id: "2", [SOURCE_STUB_ATTR]: true, [SOURCE_ENTITY_ATTR]: "work" },
        ]);
        expect(one.edges.map((e) => `${e.source}>${e.target}`)).toEqual(["1>2", "1>1"]);
        const two = toRecords(mapping, [{ records: [{ id: "x:2", t: "Two", refs: ["x:1"] }], entity: "work" }], state);
        expect(two.nodes).toEqual([{ id: "2", labels: ["work"], title: "Two", tags: [], [SOURCE_STUB_ATTR]: false }]);
        const three = toRecords(mapping, [{ records: [{ id: "x:3", refs: ["x:2"] }], entity: "work" }], state);
        expect(three.nodes.map((n) => n.id)).toEqual(["3"]);
    });

    it("joins every two ids of a pairs rule and keeps embedded records' fields", () => {
        const out = toRecords(
            mapping,
            [
                {
                    records: [{ id: "x:1", authors: [{ id: "a", name: "Ana" }, { id: "b" }, { id: "c" }] }],
                    entity: "work",
                },
            ],
            newState(),
        );
        expect(out.edges.filter((e) => e.type === "coauthor").map((e) => `${e.source}-${e.target}`)).toEqual([
            "a-b",
            "a-c",
            "b-c",
        ]);
        expect(out.nodes.find((n) => n.id === "a")).toEqual({ id: "a", labels: ["author"], name: "Ana" });
    });

    it("never stubs an id the caller holds", () => {
        const out = toRecords(mapping, [{ records: [{ id: "x:1", refs: ["x:9"] }], entity: "work" }], newState(["9"]));
        expect(out.nodes.map((n) => n.id)).toEqual(["1"]);
        expect(out.edges).toHaveLength(1);
    });
});
