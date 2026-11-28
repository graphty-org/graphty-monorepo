// Tests of the nx cache Worker against an in-memory stand-in for its R2 bucket.
//
//   node tools/nx-cache-worker/test/index.test.mjs
//
// Not `node --test` in a package.json script, for the reason tools/release-scheduler/test/index.test.mjs gives.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { handle } from "../src/cache.js";
import { DailyCount, dailyCap, FLUSH_EVERY } from "../src/cap.js";

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

// A DailyCount Durable Object behind a stub, as env.DAILY_COUNT gives one; `calls` counts what reached it.
function counter() {
    const data = new Map();
    const object = new DailyCount({
        storage: {
            get: async (k) => structuredClone(data.get(k)),
            put: async (k, v) => data.set(k, structuredClone(v)),
        },
    });
    const binding = {
        calls: 0,
        idFromName: (name) => name,
        get: () => ({
            fetch: (url, init) => {
                binding.calls++;
                return object.fetch(new Request(url, init));
            },
        }),
    };
    return binding;
}

describe("nx cache Worker daily caps", () => {
    const DAY = Date.parse("2026-11-23T12:00:00Z");

    it("answers 429 past a cap and touches no R2 object", async () => {
        const env = { ...envWith(), CAP_R2_CLASS_B: 2 };
        const cap = dailyCap();
        const get = () =>
            handle(new Request("https://c/v1/cache/1", { headers: { authorization: `Bearer ${READ}` } }), env, cap);
        assert.equal((await get()).status, 404);
        assert.equal((await get()).status, 404);
        const refused = await get();
        assert.equal(refused.status, 429);
        assert.match(await refused.text(), /R2_CLASS_B/);
    });

    it("charges only a valid token's requests: health, strangers and bad paths spend no cap", async () => {
        const env = { ...envWith(), CAP_REQUESTS: 1 };
        const cap = dailyCap();
        const call = (path, token) =>
            handle(
                new Request(`https://c${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} }),
                env,
                cap,
            );
        for (let i = 0; i < 3; i++) {
            assert.equal((await call("/v1/health")).status, 200);
            assert.equal((await call("/v1/cache/1")).status, 401);
            assert.equal((await call("/v1/cache/1", "nope")).status, 401);
            assert.equal((await call("/x", READ)).status, 404);
        }
        assert.equal((await call("/v1/cache/1", READ)).status, 404);
        assert.equal((await call("/v1/cache/1", READ)).status, 429);
        assert.equal((await call("/v1/health")).status, 200);
    });

    it("shares the count across isolates through the Durable Object, writing it once per batch", async () => {
        const env = { CAP_REQUESTS: FLUSH_EVERY * 2, DAILY_COUNT: counter() };
        const first = dailyCap();
        for (let i = 0; i < FLUSH_EVERY * 2; i++)
            assert.equal(await first.charge(env, { REQUESTS: 1 }, DAY), undefined);
        // One to learn the day's total, then one per FLUSH_EVERY: a cost of about 2% of the requests counted.
        assert.equal(env.DAILY_COUNT.calls, 3);
        // A new isolate learns the day's total on its first request and refuses the next one.
        const second = dailyCap();
        assert.equal(await second.charge(env, { REQUESTS: 1 }, DAY), "REQUESTS");
    });

    it("starts again at 00:00 UTC", async () => {
        const env = { CAP_REQUESTS: 1 };
        const cap = dailyCap();
        assert.equal(await cap.charge(env, { REQUESTS: 1 }, DAY), undefined);
        assert.equal(await cap.charge(env, { REQUESTS: 1 }, DAY), "REQUESTS");
        assert.equal(await cap.charge(env, { REQUESTS: 1 }, DAY + 86_400_000), undefined);
    });

    it("keeps counting locally when the counter fails, and sends the counts later", async () => {
        const failing = {
            idFromName: () => "x",
            get: () => ({ fetch: async () => new Response("", { status: 500 }) }),
        };
        const env = { CAP_REQUESTS: 2, DAILY_COUNT: failing };
        const cap = dailyCap();
        assert.equal(await cap.charge(env, { REQUESTS: 1 }, DAY), undefined);
        assert.equal(await cap.charge(env, { REQUESTS: 1 }, DAY), undefined);
        assert.equal(await cap.charge(env, { REQUESTS: 1 }, DAY), "REQUESTS");
    });

    // The cheap automatic check of tools/README.md's cloud route rule: every name the Worker counts has its cap
    // in wrangler.toml, and the counter's Durable Object is bound, so no route ships uncapped.
    it("wrangler.toml sets a cap for every counted name and binds the counter", () => {
        const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
        const source = readFileSync(new URL("../src/cache.js", import.meta.url), "utf8");
        const counted = new Set([...source.matchAll(/\b(REQUESTS|R2_CLASS_[AB]):/g)].map((m) => m[1]));
        assert.deepEqual([...counted].sort(), ["R2_CLASS_A", "R2_CLASS_B", "REQUESTS"]);
        for (const name of counted) assert.match(toml, new RegExp(`^CAP_${name} = \\d+$`, "m"), `CAP_${name}`);
        assert.match(toml, /name = "DAILY_COUNT"\s+class_name = "DailyCount"/);
        assert.match(readFileSync(new URL("../src/worker.js", import.meta.url), "utf8"), /export \{ DailyCount \}/);
    });
});
