/**
 * The gremlin source in a browser, with the runtime detection mocked at the module boundary: a
 * credential over HTTP is refused before any request (Gremlin Server answers every preflight
 * 405), and a request without one carries no Content-Type, so it needs no preflight.
 */

import { describe, expect, it, vi } from "vitest";

import { credentials, loadFromSource, replayFetch } from "../../../src/index.js";
import { gremlinSource } from "../../../src/sources/gremlin/index.js";
import { rejection, SENTINEL } from "../helpers.js";

vi.mock("../../../src/sources/context.js", async (importActual) => ({
    ...(await importActual<typeof import("../../../src/sources/context.js")>()),
    detectRuntime: () => "browser",
}));

const HTTP = "https://gremlin.example.com:8182/gremlin";

describe("the gremlin source in a browser", () => {
    it("refuses a credential over HTTP before any request", async () => {
        const fetch = replayFetch([]);
        const err = await rejection(
            loadFromSource(
                gremlinSource,
                { query: "g.V()" },
                { endpoint: HTTP, fetch, credential: credentials.basic("u", SENTINEL) },
            ),
        );
        expect(err.issue?.params).toEqual({ runtime: "browser", reason: "cors" });
        expect(fetch.calls).toHaveLength(0);
    });

    it("sends the script as text/plain, which needs no preflight", async () => {
        const seen: (string | null)[] = [];
        const fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
            const request = new Request(input, init);
            seen.push(request.headers.get("accept"), request.headers.get("content-type"));
            return Promise.resolve(Response.json({ result: { data: [] } }));
        }) as typeof globalThis.fetch;
        const { snapshot } = await loadFromSource(gremlinSource, { query: "g.V()" }, { endpoint: HTTP, fetch });
        expect(snapshot.nodeCount).toBe(0);
        // a string body with no header goes as text/plain, a CORS-safelisted type
        expect(seen).toEqual(["application/vnd.gremlin-v3.0+json", "text/plain;charset=UTF-8"]);
    });
});
