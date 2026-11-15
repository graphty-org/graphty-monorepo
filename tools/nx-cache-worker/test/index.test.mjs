// Tests of the nx cache Worker against an in-memory stand-in for its R2 bucket.
//
//   node tools/nx-cache-worker/test/index.test.mjs
//
// Not `node --test` in a package.json script, for the reason tools/release-scheduler/test/index.test.mjs gives.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import { handle } from "../src/cache.js";

const READ = "read-token-0123456789";
const WRITE = "write-token-0123456789";
const sha = (t) => createHash("sha256").update(t).digest("hex");

function bucket() {
    const objects = new Map();
    return {
        objects,
        head: async (key) => (objects.has(key) ? { key } : null),
        get: async (key) => (objects.has(key) ? { body: new Response(objects.get(key)).body } : null),
        put: async (key, body) => objects.set(key, new Uint8Array(await new Response(body).arrayBuffer())),
    };
}
const envWith = () => ({ CACHE: bucket(), READ_TOKEN_HASHES: `other, ${sha(READ)}`, WRITE_TOKEN_HASHES: sha(WRITE) });
const call = (env, method, path, token, body) =>
    handle(
        new Request(`https://cache.example${path}`, {
            method,
            body,
            headers: token ? { authorization: `Bearer ${token}` } : {},
        }),
        env,
    );

describe("nx cache Worker", () => {
    it("answers /v1/health without a token", async () => {
        const res = await call(envWith(), "GET", "/v1/health");
        assert.equal(res.status, 200);
        assert.deepEqual(await res.json(), { ok: true });
    });

    it("stores an entry written with the write token and serves it to the read token", async () => {
        const env = envWith();
        assert.equal((await call(env, "PUT", "/v1/cache/12345", WRITE, "tarball")).status, 200);
        const res = await call(env, "GET", "/v1/cache/12345", READ);
        assert.equal(res.status, 200);
        assert.equal(res.headers.get("content-type"), "application/octet-stream");
        assert.equal(await res.text(), "tarball");
    });

    it("refuses a write with the read token (403) and stores nothing", async () => {
        const env = envWith();
        assert.equal((await call(env, "PUT", "/v1/cache/12345", READ, "planted")).status, 403);
        assert.equal(env.CACHE.objects.size, 0);
    });

    it("never replaces an entry (409)", async () => {
        const env = envWith();
        await call(env, "PUT", "/v1/cache/1", WRITE, "first");
        assert.equal((await call(env, "PUT", "/v1/cache/1", WRITE, "second")).status, 409);
        assert.equal(await (await call(env, "GET", "/v1/cache/1", WRITE)).text(), "first");
    });

    it("answers 404 for a missing entry", async () => {
        assert.equal((await call(envWith(), "GET", "/v1/cache/999", READ)).status, 404);
    });

    it("refuses a missing or unknown token (401)", async () => {
        const env = envWith();
        assert.equal((await call(env, "GET", "/v1/cache/1")).status, 401);
        assert.equal((await call(env, "GET", "/v1/cache/1", "other")).status, 401);
        assert.equal((await call(env, "PUT", "/v1/cache/1", "nope", "x")).status, 401);
    });

    it("refuses a hash that is not a plain key, and other methods", async () => {
        const env = envWith();
        assert.equal((await call(env, "GET", "/v1/cache/a%2Fb", WRITE)).status, 404);
        assert.equal((await call(env, "GET", "/v1/cache/", WRITE)).status, 404);
        assert.equal((await call(env, "DELETE", "/v1/cache/1", WRITE)).status, 405);
    });

    it("treats unset hash lists as no tokens", async () => {
        const env = { CACHE: bucket() };
        assert.equal((await call(env, "GET", "/v1/cache/1", READ)).status, 401);
    });
});
