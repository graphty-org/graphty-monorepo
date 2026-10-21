/**
 * The OpenAlex API key in Chromium: the key goes as the api_key query parameter, so a load is a
 * simple request the stand-in (another origin, with CORS headers) answers without a preflight, and
 * a key bound to another origin is never sent. The page's fetch sends what graph-io asks of
 * api.openalex.org to the stand-in.
 */

import { credentials, credentialSlots, listSources, loadFromSource } from "@graphty/graph-io";
import { describe, expect, inject, it } from "vitest";

const KEY = "sentinel-openalex-key-5f1e";
const standInBase = `${inject("corsServer")}/cors/openalex`;

/**
 * Send a request meant for api.openalex.org to the stand-in, query and headers kept.
 * @param input - the request
 * @param init - its init
 * @returns the answer
 */
function standIn(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const request = new Request(input, init);
    const url = new URL(request.url);
    return fetch(`${standInBase}${url.pathname}${url.search}`, { headers: request.headers, credentials: "omit" });
}

/**
 * What the stand-in saw since the last call.
 * @returns one entry per request
 */
async function seen(): Promise<{ apiKey: string | null; authorization: string | null }[]> {
    return (await (await fetch(`${standInBase}/log`)).json()) as {
        apiKey: string | null;
        authorization: string | null;
    }[];
}

describe("the OpenAlex key in a browser", () => {
    const [slot] = credentialSlots(listSources().find((s) => s.id === "openalex")?.descriptor);

    it("goes to the bound origin as api_key on every request, with no Authorization header", async () => {
        await seen();
        const { snapshot } = await loadFromSource(
            "openalex",
            { work: "W1" },
            { fetch: standIn, credential: credentials.forSlot(slot, KEY) },
        );
        expect(snapshot.ids.has("W102")).toBe(true);
        const log = await seen();
        expect(log.length).toBeGreaterThanOrEqual(3);
        expect(log.every((s) => s.apiKey === KEY && s.authorization === null)).toBe(true);
    });

    it("is never sent to an origin it is not bound to", async () => {
        await seen();
        await loadFromSource(
            "openalex",
            { work: "W1" },
            { fetch: standIn, credential: credentials.forSlot(slot, KEY, { origins: ["https://elsewhere.example"] }) },
        );
        const log = await seen();
        expect(log.length).toBeGreaterThan(0);
        expect(log.every((s) => s.apiKey === null)).toBe(true);
    });
});
