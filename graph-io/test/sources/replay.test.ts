/**
 * replayFetch: matching, order of use, repeats, credentials, bodies, and refusing what it has no
 * recording for; recordingFrom drops secrets.
 */

import { describe, expect, it } from "vitest";

import { recordingFrom, replayFetch } from "../../src/index.js";

describe("replayFetch", () => {
    it("matches the query in any order and ignores secret query values", async () => {
        const fetch = replayFetch([{ url: "https://a.example/x?b=2&a=1", body: { ok: 1 } }], {
            secretQuery: ["api_key"],
        });
        const res = await fetch("https://a.example/x?a=1&api_key=SECRET&b=2");
        expect(await res.json()).toEqual({ ok: 1 });
        expect(res.headers.get("content-type")).toBe("application/json");
        expect(fetch.calls).toEqual([{ method: "GET", url: "https://a.example/x", credential: true }]);
    });

    it("uses recordings in order, then repeats the last match", async () => {
        const fetch = replayFetch([
            { url: "https://a.example/x", status: 503 },
            { url: "https://a.example/x", body: "two" },
        ]);
        expect((await fetch("https://a.example/x")).status).toBe(503);
        expect(await (await fetch("https://a.example/x")).text()).toBe("two");
        expect(await (await fetch("https://a.example/x")).text()).toBe("two");
    });

    it("checks whether a credential was sent, never its value", async () => {
        const fetch = replayFetch([{ url: "https://a.example/x", credential: true, body: "yes" }]);
        await expect(fetch("https://a.example/x")).rejects.toThrow(/no recording for GET https:\/\/a.example\/x/);
        expect(
            await (await fetch("https://a.example/x", { headers: { Authorization: "Bearer anything" } })).text(),
        ).toBe("yes");
    });

    it("matches a POST body as JSON, and a Request input", async () => {
        const fetch = replayFetch([
            { method: "POST", url: "https://a.example/q", requestBody: '{"a":1,"b":[2]}', body: "ok" },
        ]);
        const request = new Request("https://a.example/q", { method: "POST", body: JSON.stringify({ a: 1, b: [2] }) });
        expect(await (await fetch(request)).text()).toBe("ok");
        await expect(fetch("https://a.example/q", { method: "POST", body: "{}" })).rejects.toThrow(/no recording/);
    });

    it("answers a 304 and a redirect without a body", async () => {
        const fetch = replayFetch([
            { url: "https://a.example/v", status: 304 },
            { url: "https://a.example/r", status: 302, headers: { location: "/v" } },
        ]);
        expect((await fetch("https://a.example/v")).body).toBeNull();
        expect((await fetch("https://a.example/r", { redirect: "manual" })).headers.get("location")).toBe("/v");
    });

    it("rejects with the reason of an aborted signal, as fetch does", async () => {
        const fetch = replayFetch([{ url: "https://a.example/v", body: {} }]);
        const controller = new AbortController();
        controller.abort(new Error("stopped"));
        await expect(fetch("https://a.example/v", { signal: controller.signal })).rejects.toThrow("stopped");
        expect(fetch.calls).toHaveLength(0);
    });
});

describe("recordingFrom", () => {
    it("keeps the status, the content type and named headers, and drops secrets", async () => {
        const request = new Request("https://a.example/x?api_key=SECRET&q=1", {
            headers: { Authorization: "Bearer SECRET" },
        });
        const response = new Response('{"a":1}', {
            status: 201,
            headers: { "content-type": "application/json", "set-cookie": "s=SECRET", etag: '"e"' },
        });
        const recording = await recordingFrom(request, response, { keepHeaders: ["etag"], secretQuery: ["api_key"] });
        expect(recording).toEqual({
            method: "GET",
            url: "https://a.example/x?q=1",
            status: 201,
            headers: { "content-type": "application/json", etag: '"e"' },
            body: '{"a":1}',
        });
        expect(JSON.stringify(recording)).not.toContain("SECRET");
    });
});
