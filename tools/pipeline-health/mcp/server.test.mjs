// Runs mcp/server.mjs over stdio against a local fake of the read API that serves web/fixtures.
// node --test tools/pipeline-health/mcp/server.test.mjs

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const FIXTURES = fileURLToPath(new URL("../web/fixtures/", import.meta.url));
const SERVER = fileURLToPath(new URL("./server.mjs", import.meta.url));
const fixture = (name) => JSON.parse(readFileSync(FIXTURES + name, "utf8"));

// What the fake answers differently, per test.
const fake = { freshStatus: false, longHistory: false };

// /v1/page/ci/shards?range=28d&kind=full -> ci.shards.full.28d.json; no fixture -> 404.
function fixtureFor(url) {
    const range = url.searchParams.get("range");
    if (url.pathname === "/v1/status") return "status.json";
    if (url.pathname === "/v1/test-history") return "test-history.json";
    const m = /^\/v1\/page\/([\w-]+)(?:\/([\w-]+))?$/.exec(url.pathname);
    if (!m) return null;
    return [m[1], m[2], url.searchParams.get("kind"), range].filter(Boolean).join(".") + ".json";
}

function answer(name) {
    const body = fixture(name);
    if (name === "status.json" && fake.freshStatus) {
        body.generated = new Date().toISOString();
        body.sources = body.sources.map((s) => ({ ...s, lastWrite: new Date().toISOString() }));
    }
    if (name === "test-history.json" && fake.longHistory) {
        body.events = Array.from({ length: 80 }, () => body.events[0]);
    }
    return body;
}

let api;
let base;
before(async () => {
    api = createServer((req, res) => {
        const name = fixtureFor(new URL(req.url, "http://x"));
        if (!name || !existsSync(FIXTURES + name)) {
            res.writeHead(404).end();
            return;
        }
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(answer(name)));
    });
    await new Promise((resolve) => api.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${api.address().port}`;
});
after(() => api.close());

async function withClient(apiUrl, fn) {
    const client = new Client({ name: "test", version: "0" });
    await client.connect(
        new StdioClientTransport({
            command: process.execPath,
            args: [SERVER],
            env: { ...process.env, HEALTH_API_URL: apiUrl },
        }),
    );
    try {
        return await fn(client);
    } finally {
        await client.close();
    }
}

async function call(client, name, args = {}) {
    const res = await client.callTool({ name, arguments: args });
    return { isError: Boolean(res.isError), body: JSON.parse(res.content[0].text) };
}

const CALLS = {
    health_status: {},
    category: { name: "ci" },
    master: {},
    runners: {},
    release_lanes: {},
    pull_requests: { number: 3577 },
    owner_queue: {},
    flaky_hotspots: { range: "28d", level: "test" },
    test_history: { file: "src/x.test.ts" },
    shard_times: { range: "7d", kind: "pr-bins" },
    ci_runs: { range: "6h" },
    costs: {},
    sources: {},
};

test("lists the design's tools and every one returns JSON from the fixtures", async () => {
    await withClient(base, async (client) => {
        const { tools } = await client.listTools();
        assert.deepEqual(tools.map((t) => t.name).sort(), [...Object.keys(CALLS), "run"].sort());
        for (const [name, args] of Object.entries(CALLS)) {
            const { isError, body } = await call(client, name, args);
            assert.equal(isError, false, `${name}: ${JSON.stringify(body)}`);
            assert.equal(typeof body.truncated, "boolean", name);
            assert.ok(Array.isArray(body.freshness.sources), name);
        }
    });
});

test("filters: one pull request's rows, hotspots at a level, one shard", async () => {
    await withClient(base, async (client) => {
        const pr = (await call(client, "pull_requests", { number: 3577 })).body;
        assert.equal(pr.sections.find((s) => s.id === "owner").rows.length, 1);
        const hot = (await call(client, "flaky_hotspots", { range: "28d", level: "file" })).body;
        assert.ok(hot.nodes.length > 0 && hot.nodes.every((n) => n.level === "file"));
        const shard = fixture("ci.shards.full.28d.json").section.rows[0].shard;
        const rows = (await call(client, "shard_times", { shard })).body.rows;
        assert.deepEqual(
            rows.map((r) => r.shard),
            [shard],
        );
    });
});

test("category reads Issues at 28d by default or all, and refuses a 1-hour range there", async () => {
    await withClient(base, async (client) => {
        assert.equal((await call(client, "category", { name: "issues" })).body.range, "28d");
        const all = (await call(client, "category", { name: "issues", range: "all" })).body;
        assert.equal(all.page, "issues");
        assert.equal(all.range, "all");
        assert.equal((await call(client, "category", { name: "issues", range: "1h" })).isError, true);
        assert.equal((await call(client, "category", { name: "costs" })).body.range, "28d");
    });
});

test("caps lists at 50 rows with truncated: true", async () => {
    fake.longHistory = true;
    try {
        await withClient(base, async (client) => {
            const { body } = await call(client, "test_history", { file: "a.test.ts" });
            assert.equal(body.events.length, 50);
            assert.equal(body.truncated, true);
        });
    } finally {
        fake.longHistory = false;
    }
});

test("flags old data stale and fresh data not", async () => {
    await withClient(base, async (client) => {
        const old = (await call(client, "health_status")).body.freshness;
        assert.equal(old.stale, true);
        assert.equal(old.sources.find((s) => s.id === "collector").stale, true);
        assert.equal(old.sources.find((s) => s.id === "flaky-feed").stale, true, "never written");
        assert.ok(old.sources.every((s) => s.stale === (s.ageS === null || s.ageS > s.limitS)));
        assert.equal(old.sources.find((s) => s.id === "local").limitS, 900, "15 min when none is given");
        fake.freshStatus = true;
        try {
            const fresh = (await call(client, "health_status")).body.freshness;
            assert.equal(fresh.stale, false);
            assert.ok(fresh.sources.every((s) => s.stale === false && s.limitS > 0));
        } finally {
            fake.freshStatus = false;
        }
    });
});

test("a 404 route and a refused connection are error results naming the route", async () => {
    await withClient(base, async (client) => {
        const { isError, body } = await call(client, "run", { runId: 123 });
        assert.equal(isError, true);
        assert.equal(body.route, "/v1/run/123");
        assert.equal(body.status, 404);
        const bad = await call(client, "category", { name: "nope" });
        assert.equal(bad.isError, true);
    });
    const closed = createServer();
    await new Promise((resolve) => closed.listen(0, "127.0.0.1", resolve));
    const deadUrl = `http://127.0.0.1:${closed.address().port}`;
    await new Promise((resolve) => closed.close(resolve));
    await withClient(deadUrl, async (client) => {
        const { isError, body } = await call(client, "health_status");
        assert.equal(isError, true);
        assert.equal(body.route, "/v1/status");
        assert.equal(body.status, null);
    });
});
