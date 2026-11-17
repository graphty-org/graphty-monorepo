// Tests of tools/lib/git.mjs and tools/lib/github.mjs: a failed git call throws or answers null, never "", and the
// GitHub client handles 204, text answers, errors and the rate-limit floor, against a loopback server.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { git, gitOrNull, gitRun } from "./git.mjs";
import { githubRequest, repoApi } from "./github.mjs";

test("git throws on failure, gitOrNull answers null, gitRun keeps the code", () => {
    const dir = mkdtempSync(join(tmpdir(), "lib-git-"));
    try {
        git(["init", "-q"], { cwd: dir });
        assert.equal(git(["rev-parse", "--is-inside-work-tree"], { cwd: dir }), "true");
        assert.throws(() => git(["rev-parse", "--verify", "HEAD"], { cwd: dir }), /git rev-parse --verify HEAD failed/);
        assert.equal(gitOrNull(["rev-parse", "-q", "--verify", "HEAD"], { cwd: dir }), null);
        assert.notEqual(gitRun(["rev-parse", "-q", "--verify", "HEAD"], { cwd: dir }).code, 0);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

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
    const base = `http://127.0.0.1:${server.address().port}`;
    const opts = { base, token: "t" };
    try {
        assert.deepEqual(await githubRequest("GET", "/repos/o/r/issues", undefined, opts), { ok: true });
        assert.equal(await githubRequest("DELETE", "/empty", undefined, opts), null);
        assert.equal(await githubRequest("GET", "/log", undefined, opts), "a log");
        await assert.rejects(githubRequest("GET", "/missing", undefined, opts), /GET \/missing: 404 not found/);
        await assert.rejects(githubRequest("GET", "/low", undefined, opts), /only 3 API requests left/);
        // a write that happened is not reported as failed
        assert.deepEqual(await githubRequest("POST", "/low", { a: 1 }, opts), { ok: true });
        assert.deepEqual(await repoApi("o/r", opts)("/issues/1", { method: "PATCH", body: '{"state":"closed"}' }), {
            ok: true,
        });
    } finally {
        server.close();
    }
    assert.deepEqual(seen.at(-2), { method: "POST", url: "/low", body: '{"a":1}', auth: "Bearer t" });
    assert.deepEqual(seen.at(-1), {
        method: "PATCH",
        url: "/repos/o/r/issues/1",
        body: '{"state":"closed"}',
        auth: "Bearer t",
    });
});
