import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { serveDist } from "./serve-dist.mjs";

async function withServer(opts, fn) {
    const root = mkdtempSync(join(tmpdir(), "serve-dist-"));
    const dist = join(root, "dist");
    mkdirSync(dist);
    mkdirSync(join(root, "graphty/sites"), { recursive: true });
    writeFileSync(join(root, "graphty/sites/production.json"), '{"channel":"production"}');
    writeFileSync(join(dist, "app.js"), "x");
    const http = createServer(serveDist(dist, { repo: root, ...opts }));
    await new Promise((ok) => http.listen(0, "127.0.0.1", ok));
    const get = (p) => fetch(`http://127.0.0.1:${http.address().port}${p}`);
    try {
        await fn({ dist, get });
    } finally {
        http.close();
        rmSync(root, { recursive: true, force: true });
    }
}

test("a malformed %-sequence is a 400 and the server keeps serving", () =>
    withServer({}, async ({ get }) => {
        assert.equal((await get("/%E0%A4%A")).status, 400);
        assert.equal((await get("/app.js")).status, 200);
    }));

test("no index.html during a rebuild is a 503, not a crash; then the page is served", () =>
    withServer({}, async ({ dist, get }) => {
        assert.equal((await get("/some/route")).status, 503);
        writeFileSync(join(dist, "index.html"), "<p>app</p>");
        const r = await get("/some/route");
        assert.equal(r.status, 200);
        assert.equal(r.headers.get("content-type"), "text/html");
        assert.equal((await get("/missing.png")).status, 404);
    }));

test("site.json falls back to the production site, and a site answer wins", async () => {
    await withServer({}, async ({ get }) =>
        assert.deepEqual(await (await get("/site.json")).json(), { channel: "production" }),
    );
    await withServer({ site: (p) => (p === "/site.json" ? '{"features":["assistant"]}' : null) }, async ({ get }) =>
        assert.deepEqual(await (await get("/site.json")).json(), { features: ["assistant"] }),
    );
});
