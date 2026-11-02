/**
 * The guarded ctx.fetch: credential binding, TLS, redirects, caching, URL credentials, retries,
 * Retry-After, status mapping, cancellation, timeouts, caps, pacing and the browser's blocked
 * request diagnosis.
 */

import { describe, expect, it } from "vitest";

import { ImportReportBuilder } from "../../src/common/report.js";
import { credentials, replayFetch } from "../../src/index.js";
import { createSourceContext, isLocalNetwork, isLoopback } from "../../src/sources/context.js";
import { bareContext, rejection } from "./helpers.js";

const API = "https://api.example.com";

describe("credential binding", () => {
    it("sends the credential to the endpoint origin only", async () => {
        const fetch = replayFetch([
            { url: `${API}/a`, credential: true, body: {} },
            { url: "https://other.example.org/b", credential: false, body: {} },
        ]);
        const { ctx } = bareContext({ fetch, credential: credentials.bearer("t") }, { endpoint: API });
        await ctx.fetchJson("/a");
        await ctx.fetchJson("https://other.example.org/b");
        expect(fetch.calls.map((c) => c.credential)).toEqual([true, false]);
    });

    it("sends it to the credential's own origins when it names them", async () => {
        const fetch = replayFetch([
            { url: `${API}/a`, credential: false, body: {} },
            { url: "https://auth.example.org/b", credential: true, body: {} },
        ]);
        const credential = credentials.basic("u", "p", { origins: ["https://auth.example.org/ignored/path"] });
        const { ctx } = bareContext({ fetch, credential }, { endpoint: API });
        await ctx.fetchJson("/a");
        await ctx.fetchJson("https://auth.example.org/b");
        expect(fetch.calls.map((c) => c.credential)).toEqual([false, true]);
        expect(credential.origins).toEqual(["https://auth.example.org"]);
    });

    it("refuses a credential over plain http, except to loopback or with allowInsecure", async () => {
        const fetch = replayFetch([
            { url: "http://db.example.com/q", body: {} },
            { url: "http://localhost:7474/q", body: {} },
        ]);
        const credential = credentials.basic("u", "p");
        const refused = await rejection(
            bareContext({ fetch, credential }, { endpoint: "http://db.example.com" }).ctx.fetch("/q"),
        );
        expect(refused.issue?.code).toBe("E_SOURCE_PARAM");
        expect(refused.issue?.params).toEqual({ name: "endpoint", reason: "insecure-endpoint" });
        expect(fetch.calls).toHaveLength(0);
        await bareContext({ fetch, credential }, { endpoint: "http://localhost:7474" }).ctx.fetch("/q");
        await bareContext({ fetch, credential, allowInsecure: true }, { endpoint: "http://db.example.com" }).ctx.fetch(
            "/q",
        );
        expect(fetch.calls).toHaveLength(2);
    });

    it("sends a credentialed request with no-store, omitted cookies and manual redirects in Node", async () => {
        const seen: Request[] = [];
        const fetch = (input: RequestInfo | URL): Promise<Response> => {
            seen.push(input as Request);
            return Promise.resolve(new Response("{}"));
        };
        await bareContext({ fetch, credential: credentials.bearer("t") }, { endpoint: API }).ctx.fetch("/a");
        await bareContext({ fetch }, { endpoint: API }).ctx.fetch("/b");
        expect([seen[0].cache, seen[0].credentials, seen[0].redirect]).toEqual(["no-store", "omit", "manual"]);
        expect(seen[0].headers.get("authorization")).toBe("Bearer t");
        expect([seen[1].cache, seen[1].redirect]).toEqual(["default", "follow"]);
    });

    it("uses redirect error in a browser, where a manual redirect is opaque", async () => {
        const seen: Request[] = [];
        const fetch = (input: RequestInfo | URL): Promise<Response> => {
            seen.push(input as Request);
            return Promise.resolve(new Response("{}"));
        };
        await bareContext(
            { fetch, credential: credentials.bearer("t") },
            { endpoint: API, runtime: "browser" },
        ).ctx.fetch("/a");
        expect(seen[0].redirect).toBe("error");
    });
});

describe("redirects with a credential", () => {
    it("follows a same-origin redirect with the credential re-applied", async () => {
        const fetch = replayFetch([
            { url: `${API}/old`, status: 302, headers: { location: "/new" } },
            { url: `${API}/new`, credential: true, body: { ok: 1 } },
        ]);
        const { ctx } = bareContext({ fetch, credential: credentials.bearer("t") }, { endpoint: API });
        expect(await ctx.fetchJson("/old")).toEqual({ ok: 1 });
        expect(fetch.calls.map((c) => [c.url, c.credential])).toEqual([
            [`${API}/old`, true],
            [`${API}/new`, true],
        ]);
    });

    it("refuses a cross-origin redirect and never sends the credential there", async () => {
        const fetch = replayFetch([
            { url: `${API}/old`, status: 307, headers: { location: "https://evil.example.net/x?k=1" } },
        ]);
        const err = await rejection(
            bareContext({ fetch, credential: credentials.bearer("t") }, { endpoint: API }).ctx.fetch("/old"),
        );
        expect(err.issue?.code).toBe("E_SOURCE_REDIRECT");
        expect(err.issue?.params).toEqual({ from: `${API}/old`, to: "https://evil.example.net/x" });
        expect(fetch.calls).toHaveLength(1);
    });

    it("refuses a custom credential that changes the request's origin", async () => {
        const fetch = replayFetch([]);
        const credential = credentials.custom((r) => new Request("https://evil.example.net/", r), "token");
        const err = await rejection(bareContext({ fetch, credential }, { endpoint: API }).ctx.fetch("/a"));
        expect(err.issue?.code).toBe("E_SOURCE_REDIRECT");
        expect(credential.kind).toBe("token");
        expect(fetch.calls).toHaveLength(0);
    });
});

describe("URLs", () => {
    it("refuses a URL carrying a user name or password", async () => {
        const fetch = replayFetch([]);
        const err = await rejection(
            bareContext({ fetch }, { endpoint: API }).ctx.fetch("https://u:p@api.example.com/a"),
        );
        expect(err.issue?.params).toEqual({ name: "endpoint", reason: "credentials-in-url" });
    });

    it("needs an endpoint for a relative URL", async () => {
        const err = await rejection(bareContext({ fetch: replayFetch([]) }).ctx.fetch("/a"));
        expect(err.issue?.params).toEqual({ name: "endpoint", reason: "missing" });
    });

    it("never puts a query string into a report", async () => {
        const fetch = replayFetch([{ url: `${API}/a?api_key=SECRET`, status: 500 }]);
        const err = await rejection(
            bareContext({ fetch, retry: false }, { endpoint: API }).ctx.fetch("/a?api_key=SECRET"),
        );
        expect(err.issue?.params).toEqual({ url: `${API}/a`, status: 500 });
        expect(JSON.stringify(err.report)).not.toContain("SECRET");
    });

    it("knows loopback and local-network hosts", () => {
        expect(["localhost", "127.0.0.1", "[::1]", "a.localhost"].map(isLoopback)).toEqual([true, true, true, true]);
        expect(["10.1.2.3", "192.168.0.9", "172.20.0.1", "printer.local", "fd12:3456::1"].every(isLocalNetwork)).toBe(
            true,
        );
        expect(["example.com", "172.32.0.1", "8.8.8.8"].some(isLocalNetwork)).toBe(false);
    });
});

describe("retries", () => {
    it("retries 429, 502, 503 and 504 for a GET, then warns W_SOURCE_RETRIED", async () => {
        const fetch = replayFetch([
            { url: `${API}/a`, status: 503 },
            { url: `${API}/a`, status: 429 },
            { url: `${API}/a`, body: { ok: true } },
        ]);
        const { ctx } = bareContext({ fetch, retry: { baseDelayMs: 1 } }, { endpoint: API });
        expect(await ctx.fetchJson("/a")).toEqual({ ok: true });
        expect(fetch.calls).toHaveLength(3);
        const retried = ctx.report.issues.find((i) => i.code === "W_SOURCE_RETRIED");
        expect(retried?.params).toEqual({ attempts: 3, statuses: [503, 429] });
    });

    it("honors a readable Retry-After instead of the backoff", async () => {
        // a backoff ceiling of an hour: only Retry-After: 0 lets this finish
        const fetch = replayFetch([
            { url: `${API}/a`, status: 503, headers: { "retry-after": "0" } },
            { url: `${API}/a`, body: {} },
        ]);
        const { ctx } = bareContext(
            { fetch, retry: { baseDelayMs: 3_600_000, maxDelayMs: 3_600_000 } },
            { endpoint: API },
        );
        await ctx.fetch("/a");
        expect(fetch.calls).toHaveLength(2);
    });

    it("gives up after the retries: 429 is E_SOURCE_QUOTA, 503 is E_FETCH", async () => {
        const quota = replayFetch([{ url: `${API}/a`, status: 429, headers: { "retry-after": "0" } }]);
        const q = await rejection(
            bareContext({ fetch: quota, retry: { retries: 2 } }, { endpoint: API }).ctx.fetch("/a"),
        );
        expect(q.issue?.code).toBe("E_SOURCE_QUOTA");
        expect(q.issue?.params).toEqual({ origin: API, retryAfterMs: 0 });
        expect(quota.calls).toHaveLength(3);
        const down = replayFetch([{ url: `${API}/a`, status: 503 }]);
        const d = await rejection(
            bareContext({ fetch: down, retry: { retries: 1, baseDelayMs: 1 } }, { endpoint: API }).ctx.fetch("/a"),
        );
        expect(d.issue?.params).toEqual({ url: `${API}/a`, status: 503 });
        expect(down.calls).toHaveLength(2);
    });

    it("never retries a POST unless it is marked idempotent, nor under retry: false", async () => {
        const fetch = replayFetch([{ method: "POST", url: `${API}/q`, status: 503 }]);
        const { ctx } = bareContext({ fetch, retry: { baseDelayMs: 1 } }, { endpoint: API });
        await rejection(ctx.fetch("/q", { method: "POST", body: "{}" }));
        expect(fetch.calls).toHaveLength(1);
        await rejection(ctx.fetch("/q", { method: "POST", body: "{}", idempotent: true }));
        expect(fetch.calls).toHaveLength(5);
        await rejection(
            bareContext({ fetch, retry: false }, { endpoint: API }).ctx.fetch("/q", {
                method: "POST",
                idempotent: true,
            }),
        );
        expect(fetch.calls).toHaveLength(6);
    });

    it("retries a network failure in Node, then reports E_FETCH with a null status", async () => {
        let calls = 0;
        const fetch = (): Promise<Response> => {
            calls++;
            return Promise.reject(new TypeError("fetch failed"));
        };
        const err = await rejection(
            bareContext({ fetch, retry: { retries: 2, baseDelayMs: 1 } }, { endpoint: API }).ctx.fetch("/a"),
        );
        expect(err.issue?.params).toEqual({ url: `${API}/a`, status: null });
        expect(calls).toBe(3);
    });
});

describe("status mapping", () => {
    it.each([
        [401, "E_SOURCE_AUTH", { origin: API, status: 401, scheme: "Basic", serverCode: null }],
        [403, "E_SOURCE_FORBIDDEN", { origin: API, status: 403, serverCode: null }],
        [404, "E_SOURCE_NOT_FOUND", { origin: API, what: "url", value: `${API}/a` }],
        [400, "E_FETCH", { url: `${API}/a`, status: 400 }],
    ])("maps %i to %s", async (status, code, params) => {
        const fetch = replayFetch([{ url: `${API}/a`, status, headers: { "www-authenticate": 'Basic realm="x"' } }]);
        const err = await rejection(bareContext({ fetch }, { endpoint: API }).ctx.fetch("/a"));
        expect(err.issue?.code).toBe(code);
        expect(err.issue?.params).toEqual(params);
    });

    it("returns a status the source asks for, and every 304", async () => {
        const fetch = replayFetch([
            { url: `${API}/q`, status: 400, body: { errors: [] } },
            { url: `${API}/v`, status: 304 },
        ]);
        const { ctx } = bareContext({ fetch }, { endpoint: API });
        expect((await ctx.fetch("/q", { allowStatus: [400] })).status).toBe(400);
        expect((await ctx.fetch("/v")).status).toBe(304);
    });

    it("refuses a body that is not JSON", async () => {
        const fetch = replayFetch([{ url: `${API}/a`, body: "<html>", headers: { "content-type": "text/html" } }]);
        const err = await rejection(bareContext({ fetch }, { endpoint: API }).ctx.fetchJson("/a"));
        expect(err.issue?.params).toEqual({ origin: API, expected: "json", contentType: "text/html" });
    });
});

describe("cancellation and timeouts", () => {
    it("rejects with the signal's reason", async () => {
        const controller = new AbortController();
        const reason = new Error("stop");
        controller.abort(reason);
        const fetch = replayFetch([{ url: `${API}/a`, body: {} }]);
        await expect(bareContext({ fetch, signal: controller.signal }, { endpoint: API }).ctx.fetch("/a")).rejects.toBe(
            reason,
        );
        expect(fetch.calls).toHaveLength(0);
    });

    it("aborts a request in flight with the signal's reason", async () => {
        const controller = new AbortController();
        const fetch = (input: RequestInfo | URL): Promise<Response> =>
            new Promise((_resolve, reject) => {
                const { signal } = input as Request;
                signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
                controller.abort("user");
            });
        await expect(bareContext({ fetch, signal: controller.signal }, { endpoint: API }).ctx.fetch("/a")).rejects.toBe(
            "user",
        );
    });

    it("fails with E_SOURCE_TIMEOUT once timeoutMs passes", async () => {
        const fetch = (input: RequestInfo | URL): Promise<Response> =>
            new Promise((_resolve, reject) => {
                (input as Request).signal.addEventListener("abort", () =>
                    reject(new DOMException("aborted", "AbortError")),
                );
            });
        const created = bareContext({ fetch, limits: { timeoutMs: 5 } }, { endpoint: API });
        const err = await rejection(created.ctx.fetch("/a"));
        created.dispose();
        expect(err.issue?.code).toBe("E_SOURCE_TIMEOUT");
        expect(err.issue?.params).toEqual({ origin: API, timeoutMs: 5, serverSide: false });
    });
});

describe("caps", () => {
    it("stops at maxBytes under stop, and fails with E_SOURCE_LIMIT under error", async () => {
        const fetch = replayFetch([{ url: `${API}/a`, body: "x".repeat(100) }]);
        const stop = bareContext({ fetch, limits: { maxBytes: 10 } }, { endpoint: API });
        await expect((await stop.ctx.fetch("/a")).text()).rejects.toMatchObject({
            name: "LimitStop",
            limit: "maxBytes",
        });
        expect(stop.ctx.report.issues.map((i) => i.code)).toEqual(["W_SOURCE_LIMIT"]);
        const error = bareContext({ fetch, limits: { maxBytes: 10, onLimit: "error" } }, { endpoint: API });
        const err = await rejection((await error.ctx.fetch("/a")).text());
        expect(err.issue?.code).toBe("E_SOURCE_LIMIT");
        expect(err.issue?.params).toEqual({ limit: "maxBytes", value: 100 });
    });

    it("sends no more than maxRequests", async () => {
        const fetch = replayFetch([{ url: `${API}/a`, body: {} }]);
        const { ctx, state } = bareContext({ fetch, limits: { maxRequests: 1 } }, { endpoint: API });
        await ctx.fetch("/a");
        await expect(ctx.fetch("/a")).rejects.toMatchObject({ name: "LimitStop", limit: "maxRequests" });
        expect(state.requests).toBe(1);
        expect(ctx.limits.reached()).toBe(true);
    });

    it("counts decoded bytes and reports byte progress for a file source", async () => {
        const progress: [number, number | undefined, string | undefined][] = [];
        const fetch = replayFetch([{ url: `${API}/f`, body: "abcdef" }]);
        const file = createSourceContext({
            id: "f",
            descriptor: undefined,
            options: { fetch, onProgress: (d, t, u) => progress.push([d, t, u]) },
            report: new ImportReportBuilder("source:f", 100),
            endpoint: new URL(API),
            cursor: null,
            unit: "bytes",
            counts: () => ({ nodes: 0, edges: 0 }),
        });
        file.ctx.progress(0, 6, "bytes");
        await (await file.ctx.fetch("/f")).text();
        expect(file.state.bytes).toBe(6);
        expect(progress.at(-1)).toEqual([6, 6, "bytes"]);
    });
});

describe("pacing", () => {
    it("keeps at most `concurrent` requests in flight per source and origin", async () => {
        let active = 0;
        let peak = 0;
        const release: (() => void)[] = [];
        const fetch = (): Promise<Response> => {
            active++;
            peak = Math.max(peak, active);
            return new Promise((resolve) => {
                release.push(() => {
                    active--;
                    resolve(new Response("{}"));
                });
            });
        };
        const { ctx } = bareContext(
            { fetch },
            {
                endpoint: API,
                id: "paced",
                descriptor: { plainName: "P", params: [], rateLimit: { requests: 100, perMs: 1000, concurrent: 2 } },
            },
        );
        const all = Promise.all([1, 2, 3, 4].map(() => ctx.fetch("/a")));
        // drain one at a time, each release letting one waiting request in
        for (let i = 0; i < 4; i++) {
            await Promise.resolve();
            await new Promise((r) => setImmediate(r));
            release.shift()?.();
        }
        await all;
        expect(peak).toBe(2);
    });
});

describe("the blocked request diagnosis (browser)", () => {
    it("reports cors when the origin answers an opaque no-cors probe, after one retry", async () => {
        const modes: string[] = [];
        const fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const mode = init?.mode ?? (input as Request).mode;
            modes.push(mode);
            return mode === "no-cors"
                ? Promise.resolve(new Response(null, { status: 200 }))
                : Promise.reject(new TypeError("Failed to fetch"));
        };
        const err = await rejection(
            bareContext({ fetch, retry: { baseDelayMs: 1 } }, { endpoint: API, runtime: "browser" }).ctx.fetch("/a"),
        );
        expect(err.issue?.code).toBe("E_SOURCE_BLOCKED");
        expect(err.issue?.params).toEqual({ url: `${API}/a`, cause: "cors" });
        expect(modes).toEqual(["cors", "no-cors", "cors", "no-cors"]);
    });

    it("reports unreachable when the probe fails too, and unknown under retry: false (no probe)", async () => {
        const fetch = (): Promise<Response> => Promise.reject(new TypeError("Failed to fetch"));
        const a = await rejection(bareContext({ fetch }, { endpoint: API, runtime: "browser" }).ctx.fetch("/a"));
        expect(a.issue?.params).toEqual({ url: `${API}/a`, cause: "unreachable" });
        let calls = 0;
        const counted = (): Promise<Response> => {
            calls++;
            return Promise.reject(new TypeError("Failed to fetch"));
        };
        const b = await rejection(
            bareContext({ fetch: counted, retry: false }, { endpoint: API, runtime: "browser" }).ctx.fetch("/a"),
        );
        expect(b.issue?.params).toEqual({ url: `${API}/a`, cause: "unknown" });
        expect(calls).toBe(1);
    });
});
