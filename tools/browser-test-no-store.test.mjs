// node --test tools/browser-test-no-store.test.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";

import { noStoreFor, noStoreRevalidated } from "./browser-test-no-store.mjs";

test("a response the browser would revalidate becomes no-store; an immutable one is kept", () => {
    assert.equal(noStoreFor(undefined), "no-store");
    assert.equal(noStoreFor("no-cache"), "no-store");
    assert.equal(noStoreFor("max-age=31536000,immutable"), "max-age=31536000,immutable");
});

test("the plugin rewrites a header set before writeHead and one passed to it", async () => {
    let middleware;
    noStoreRevalidated().configureServer({ middlewares: { use: (f) => (middleware = f) } });
    const server = createServer((req, res) => {
        middleware(req, res, () => {
            if (req.url === "/set") {
                res.setHeader("Cache-Control", "no-cache");
                res.end("a");
            } else if (req.url === "/passed") {
                res.writeHead(200, { "cache-control": "no-cache" });
                res.end("b");
            } else {
                res.setHeader("Cache-Control", "max-age=31536000,immutable");
                res.end("c");
            }
        });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        const header = async (path) => (await fetch(base + path)).headers.get("cache-control");
        assert.equal(await header("/set"), "no-store");
        assert.equal(await header("/passed"), "no-store");
        assert.equal(await header("/deps"), "max-age=31536000,immutable");
    } finally {
        server.close();
    }
});
