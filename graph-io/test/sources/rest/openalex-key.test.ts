/**
 * The OpenAlex API key as an optional credential slot: the descriptor declares it, a key made for
 * the slot goes out as the `api_key` query parameter on every request of a load and an expansion,
 * a load without one sends none, and nothing a load reports carries the key. A loopback HTTP
 * server stands in for api.openalex.org; the load's fetch sends each request there.
 */

import { createServer, type Server } from "node:http";
import { type AddressInfo } from "node:net";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
    credentials,
    credentialSlots,
    expandFromSource,
    listSources,
    loadFromSource,
    OPENALEX_SOURCE_ID,
} from "../../../src/index.js";
import { OPENALEX_MAPPING, restSource } from "../../../src/sources/rest/index.js";
import { openalexAnswer } from "./openalex-fixture.js";

/** What the stand-in server saw of one request. */
interface Seen {
    readonly path: string;
    readonly apiKey: string | null;
    readonly authorization: string | null;
}

const KEY = "sentinel-openalex-key-5f1e";
let server: Server;
let local = "";
const seen: Seen[] = [];

beforeAll(async () => {
    server = createServer((req, res) => {
        const url = new URL(req.url ?? "/", "http://stand-in");
        seen.push({
            path: url.pathname,
            apiKey: url.searchParams.get("api_key"),
            authorization: req.headers.authorization ?? null,
        });
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(openalexAnswer(url)));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    local = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
});

afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

/**
 * A fetch that sends what graph-io asked of api.openalex.org to the stand-in, query and headers kept.
 * @param input - the request
 * @param init - its init
 * @returns the stand-in's answer
 */
function standIn(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const request = new Request(input, init);
    const url = new URL(request.url);
    return fetch(`${local}${url.pathname}${url.search}`, { method: request.method, headers: request.headers });
}

/** The OpenAlex slot, as the registry describes it. */
function slot(): ReturnType<typeof credentialSlots>[number] {
    const info = listSources().find((s) => s.id === OPENALEX_SOURCE_ID);
    return credentialSlots(info?.descriptor)[0];
}

describe("the OpenAlex credential slot", () => {
    it("is described by the registry: one optional api_key slot", () => {
        const info = listSources().find((s) => s.id === OPENALEX_SOURCE_ID);
        expect(info?.descriptor.credentials).toMatchObject([{ name: "api_key", kind: "api-key", required: false }]);
        expect(slot().send).toEqual({ query: "api_key" });
    });

    it("sends the key as api_key on the first page, the next page, an expansion and a hydrate, never as a header", async () => {
        seen.length = 0;
        const credential = credentials.forSlot(slot(), KEY);
        const { snapshot, report } = await loadFromSource(
            OPENALEX_SOURCE_ID,
            { work: "W1" },
            { fetch: standIn, credential },
        );
        expect(snapshot.ids.has("W101")).toBe(true);
        expect(snapshot.ids.has("W102")).toBe(true);
        await expandFromSource(
            OPENALEX_SOURCE_ID,
            { params: { work: "W1" }, ids: ["W101"] },
            { fetch: standIn, credential },
        );
        await expandFromSource(
            OPENALEX_SOURCE_ID,
            { params: { work: "W1" }, ids: ["W7"], depth: 0 },
            { fetch: standIn, credential },
        );
        // seed, citing page 1, citing page 2, expansion in and out, hydrate
        expect(seen.length).toBeGreaterThanOrEqual(5);
        expect(seen.every((s) => s.apiKey === KEY)).toBe(true);
        expect(seen.every((s) => s.authorization === null)).toBe(true);
        const told = JSON.stringify({ source: report.source, issues: report.issues });
        expect(told).not.toContain(KEY);
    });

    it("loads without a key and sends no api_key", async () => {
        seen.length = 0;
        const { snapshot } = await loadFromSource(OPENALEX_SOURCE_ID, { work: "W1" }, { fetch: standIn });
        expect(snapshot.ids.has("W102")).toBe(true);
        expect(seen.length).toBeGreaterThan(0);
        expect(seen.every((s) => s.apiKey === null && s.authorization === null)).toBe(true);
    });

    it("keeps the key off a request to an origin it is not bound to", async () => {
        seen.length = 0;
        const credential = credentials.forSlot(slot(), KEY, { origins: ["https://elsewhere.example"] });
        await loadFromSource(OPENALEX_SOURCE_ID, { work: "W1" }, { fetch: standIn, credential });
        expect(seen.every((s) => s.apiKey === null)).toBe(true);
    });
});

describe("credential slots", () => {
    it("derives a REST mapping's slot from its auth, and gives a source that declares none one default slot", () => {
        const people = restSource(OPENALEX_MAPPING, { id: "slot-people" });
        expect(people.descriptor?.credentials).toEqual([
            { name: "api_key", kind: "api-key", required: false, send: { query: "api_key" } },
        ]);
        const byHeader = restSource(
            { ...OPENALEX_MAPPING, auth: { kind: "api-key", header: "X-Api-Key" } },
            { id: "slot-header" },
        );
        expect(credentialSlots(byHeader.descriptor)).toEqual([
            { name: "x-api-key", kind: "api-key", required: false, send: { header: "X-Api-Key" } },
        ]);
        expect(credentialSlots({ plainName: "x", params: [], auth: ["basic"], authRequired: "required" })).toEqual([
            { name: "default", kind: "basic", required: true },
        ]);
        expect(credentialSlots({ plainName: "x", params: [] })).toEqual([]);
    });

    it("makes a bearer and a basic credential for their slots, and refuses a value a slot cannot take", () => {
        expect(credentials.forSlot({ name: "default", kind: "bearer" }, "t").kind).toBe("bearer");
        const basic = credentials.forSlot({ name: "default", kind: "basic" }, { username: "u", password: "p" });
        expect(basic.username).toBe("u");
        expect(() => credentials.forSlot({ name: "default", kind: "basic" }, "p")).toThrow(/cannot take/);
        expect(() => credentials.forSlot({ name: "default", kind: "aws-sigv4" }, "p")).toThrow(/cannot take/);
    });
});
