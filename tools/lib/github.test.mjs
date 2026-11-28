// Tests of tools/lib/github.mjs against a loopback server: JSON, text and 204 answers, the error message, the
// opt-in rate-limit floor and the body as sent.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";

import { githubRequest } from "./github.mjs";

test("githubRequest: JSON, text, 204, errors and the rate-limit floor", async () => {
    const seen = [];
    const server = createServer((req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
            seen.push({ method: req.method, url: req.url, body, auth: req.headers.authorization });
            const left = { "x-ratelimit-remaining": req.url.includes("low") ? "3" : "4000" };
            if (req.url.endsWith("/empty")) res.writeHead(204, left).end();
            else if (req.url.endsWith("/log"))
                res.writeHead(200, { ...left, "content-type": "text/plain" }).end("a log");
            else if (req.url.endsWith("/missing")) res.writeHead(404, left).end("not found");
            else res.writeHead(200, { ...left, "content-type": "application/json" }).end('{"ok":true}');
        });
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const opts = { base: `http://127.0.0.1:${server.address().port}`, token: "t" };
    try {
        assert.deepEqual(await githubRequest("GET", "/repos/o/r/issues", undefined, opts), { ok: true });
        assert.equal(await githubRequest("DELETE", "/empty", undefined, opts), null);
        assert.equal(await githubRequest("GET", "/log", undefined, opts), "a log");
        await assert.rejects(
            githubRequest("GET", "/missing", undefined, opts),
            /^Error: GET \/missing: 404 not found$/,
        );
        // no floor unless asked for
        assert.deepEqual(await githubRequest("GET", "/low", undefined, opts), { ok: true });
        await assert.rejects(
            githubRequest("GET", "/low", undefined, { ...opts, minRateLeft: 50, timeoutMs: 5_000 }),
            /only 3 API requests left/,
        );
        assert.deepEqual(await githubRequest("POST", "/a", { a: 1 }, opts), { ok: true });
        assert.deepEqual(await githubRequest("PATCH", "/b", '{"state":"closed"}', opts), { ok: true });
    } finally {
        server.close();
    }
    assert.deepEqual(seen.at(-2), { method: "POST", url: "/a", body: '{"a":1}', auth: "Bearer t" });
    assert.deepEqual(seen.at(-1), { method: "PATCH", url: "/b", body: '{"state":"closed"}', auth: "Bearer t" });
});

// #10481: the floor is for the hourly core bucket; search's own bucket never holds more than 30
test("githubRequest: the rate-limit floor reads only the core bucket", async () => {
    const server = createServer((req, res) => {
        const resource = new URL(req.url, "http://x").searchParams.get("resource");
        const headers = { "x-ratelimit-remaining": "30", "content-type": "application/json" };
        if (resource) headers["x-ratelimit-resource"] = resource;
        res.writeHead(200, headers).end('{"ok":true}');
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const opts = { base: `http://127.0.0.1:${server.address().port}`, token: "t", minRateLeft: 300 };
    try {
        assert.deepEqual(await githubRequest("GET", "/search/issues?resource=search", undefined, opts), { ok: true });
        await assert.rejects(githubRequest("GET", "/x?resource=core", undefined, opts), /only 30 API requests left/);
        // no resource header counts as core
        await assert.rejects(githubRequest("GET", "/x", undefined, opts), /only 30 API requests left/);
    } finally {
        server.close();
    }
});
