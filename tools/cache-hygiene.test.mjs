import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { family, sizes, superseded } from "./cache-hygiene.mjs";

const H1 = "2dfccbe85ba0c6ddef93b9c031d83b5261965453bda28474be7bca64cb5b8ac1";
const H2 = "f129b90e7c45e07ed879a18edb56af8655de99040ad9344a5c53e0f567d31eec";
const M = "refs/heads/master";

describe("cache hygiene", () => {
    it("names a key's family without its hashes and run id", () => {
        assert.equal(family(`lfs-graphty-${H1}`), "lfs-graphty");
        assert.equal(family(`lfs-graphty-element-${H1}`), "lfs-graphty-element");
        assert.equal(family(`node-cache-Linux-x64-pnpm-${H1}`), "node-cache-Linux-x64-pnpm");
        assert.equal(family("test-durations-graphty-1-40219937248-1"), "test-durations-graphty-1");
        assert.equal(
            family(
                "codeql-overlay-base-database-1-c801913f1ee29663-javascript-2.27.3-537616d3f8eda502eb177f59bd9fa79639abfe0e-40220025309-1",
            ),
            "codeql-overlay-base-database-1-c801913f1ee29663-javascript-2.27.3",
        );
        // a version is not a hash: the two playwright caches of one path keep their own families
        assert.equal(family("playwright-Linux-1.57.0"), "playwright-Linux-1.57.0");
        assert.equal(family(`playwright-Linux-${H1}`), "playwright-Linux");
    });

    it("keeps the newest key per family and ref and deletes the rest", () => {
        const caches = [
            { id: 1, key: `lfs-graphty-${H1}`, ref: M, created_at: "2026-10-24T19:28:08.86Z" },
            { id: 2, key: `lfs-graphty-${H2}`, ref: M, created_at: "2026-10-25T18:34:56.6404Z" },
            { id: 3, key: `lfs-graphty-${H1}`, ref: "refs/pull/1/merge", created_at: "2026-10-23T00:00:00Z" },
            { id: 4, key: "import-graph-aaaaaaaaaaaaaaaa", ref: M, created_at: "2026-10-25T01:00:00Z" },
            { id: 5, key: "import-graph-bbbbbbbbbbbbbbbb", ref: M, created_at: "2026-10-25T02:00:00Z" },
            { id: 6, key: "test-durations-graph-io-100000-1", ref: M, created_at: "2026-10-25T01:00:00Z" },
            { id: 7, key: "test-durations-graph-io-100001-1", ref: M, created_at: "2026-10-25T02:00:00Z" },
            { id: 8, key: "test-durations-graphty-1-100000-1", ref: M, created_at: "2026-10-25T01:00:00Z" },
            { id: 9, key: "playwright-Linux-1.57.0", ref: M, created_at: "2026-09-28T00:47:46Z" },
            { id: 10, key: `playwright-Linux-${H1}`, ref: M, created_at: "2026-10-25T00:00:00Z" },
        ];
        assert.deepEqual(
            superseded(caches).map((c) => c.id),
            [1, 4, 6],
        );
    });

    it("measures each family and the total against ci-budgets.json", () => {
        const file = {
            budgets: {
                "cache:lfs-*": { gb: 1 },
                "bytes:actions-cache": { gb: 2 },
            },
        };
        const { rows, total } = sizes(
            [
                { key: `lfs-graphty-${H1}`, size_in_bytes: 1.5e9 },
                { key: `node-cache-Linux-x64-pnpm-${H1}`, size_in_bytes: 0.6e9 },
            ],
            file,
        );
        assert.deepEqual(
            rows.map((r) => [r.family, r.gb, r.over]),
            [
                ["lfs-graphty", 1, true],
                ["node-cache-Linux-x64-pnpm", undefined, false],
            ],
        );
        assert.deepEqual(total, { bytes: 2.1e9, gb: 2, over: true });
    });
});
