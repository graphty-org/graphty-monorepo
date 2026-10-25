import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadBudgets } from "./ci-budgets.mjs";
import { family, KEEP_HOURS, sizes, toDelete } from "./cache-hygiene.mjs";

const H1 = "2dfccbe85ba0c6ddef93b9c031d83b5261965453bda28474be7bca64cb5b8ac1";
const H2 = "f129b90e7c45e07ed879a18edb56af8655de99040ad9344a5c53e0f567d31eec";
const M = "refs/heads/master";
const NOW = Date.parse("2026-10-25T23:00:00Z");
const hoursAgo = (h) => new Date(NOW - h * 3600e3).toISOString();
const cache = (id, key, ref, readHoursAgo, createdHoursAgo = readHoursAgo) => ({
    id,
    key,
    ref,
    last_accessed_at: hoursAgo(readHoursAgo),
    created_at: hoursAgo(createdHoursAgo),
});
const ids = (caches, open = []) => toDelete(caches, open, NOW).map((d) => d.cache.id);

describe("cache hygiene", () => {
    it("names a key's family without its hashes, run id and versions", () => {
        assert.equal(family(`lfs-graphty-${H1}`), "lfs-graphty");
        assert.equal(family(`lfs-graphty-element-${H1}`), "lfs-graphty-element");
        assert.equal(family(`node-cache-Linux-x64-pnpm-${H1}`), "node-cache-Linux-x64-pnpm");
        assert.equal(family("test-durations-graphty-1-40219937248-1"), "test-durations-graphty-1");
        assert.equal(family(`test-select-graphs-${H1}`), "test-select-graphs");
        assert.equal(
            family(
                "codeql-overlay-base-database-1-c801913f1ee29663-javascript-2.27.3-537616d3f8eda502eb177f59bd9fa79639abfe0e-40220025309-1",
            ),
            "codeql-overlay-base-database-1-c801913f1ee29663-javascript",
        );
        // a version upgrade stays in its family, so the new version supersedes the old one
        assert.equal(family("playwright-Linux-1.57.0"), "playwright-Linux");
        assert.equal(family("playwright-Linux-1.64.1"), "playwright-Linux");
        // the lockfile-keyed browsers of the test jobs are another cache than the visual jobs' versioned ones
        assert.equal(family("playwright-lock-Linux-" + "ab".repeat(32)), "playwright-lock-Linux");
        assert.equal(family("playwright-debs-ubuntu24-20261023.334.3-1.57.0"), "playwright-debs-ubuntu24");
    });

    it("keeps an older master key another ref still restores by exact key", () => {
        // a pull request with no pnpm cache of its own read master's older store an hour ago
        const caches = [
            cache(1, `node-cache-Linux-x64-pnpm-${H1}`, M, 1, 30),
            cache(2, `node-cache-Linux-x64-pnpm-${H2}`, M, 0.5, 1),
        ];
        assert.deepEqual(ids(caches), []);
        // once nothing has read it for KEEP_HOURS, it goes
        caches[0].last_accessed_at = hoursAgo(KEEP_HOURS + 1);
        assert.deepEqual(ids(caches), [1]);
    });

    it("keeps the most recently read key after a revert, not the newest created", () => {
        // master moved the baselines H1 -> H2 and reverted to H1: every run reads the older H1 again
        const caches = [cache(1, `lfs-graphty-${H1}`, M, 0.1, 72), cache(2, `lfs-graphty-${H2}`, M, 48, 48)];
        assert.deepEqual(ids(caches), [2]);
    });

    it("deletes every cache of a closed pull request's ref and none of an open one's", () => {
        const caches = [
            cache(1, `lfs-graphty-${H1}`, "refs/pull/3569/merge", 0.1),
            cache(2, "playwright-Linux-1.57.0", "refs/pull/3569/merge", 0.1),
            cache(3, `lfs-graphty-${H1}`, "refs/pull/3571/merge", 0.1),
            cache(4, `lfs-graphty-${H1}`, M, 0.1),
        ];
        assert.deepEqual(ids(caches, ["3571"]), [1, 2]);
        const why = toDelete(caches, ["3571"], NOW).map((d) => d.why);
        assert.match(why[0], /#3569 is closed/);
    });

    it("lets a new version supersede the old one once the old one is unread", () => {
        const caches = [
            cache(1, "playwright-Linux-1.57.0", M, 30, 400),
            cache(2, "playwright-Linux-1.64.1", M, 0.2, 20),
            cache(3, "test-durations-graph-io-100000-1", M, 40),
            cache(4, "test-durations-graph-io-100001-1", M, 1),
            cache(5, "test-durations-graphty-1-100000-1", M, 40),
        ];
        assert.deepEqual(ids(caches), [1, 3]);
    });

    it("measures each family per ref against its budget and the total against bytes:actions-cache", () => {
        const file = { budgets: { "cache:node-cache-*": { gb: 0.7 }, "bytes:actions-cache": { gb: 2 } } };
        const pnpm = (ref) => ({ key: `node-cache-Linux-x64-pnpm-${H1}`, ref, size_in_bytes: 0.6e9 });
        const { rows, total } = sizes([pnpm(M), pnpm("refs/pull/1/merge"), pnpm("refs/pull/2/merge")], file);
        // 1.8 GB over three refs, but 0.6 GB on any one: under its per-ref budget
        assert.deepEqual(
            rows.map((r) => [r.family, r.keys, r.refs, r.perRef, r.gb, r.over]),
            [["node-cache-Linux-x64-pnpm", 3, 3, 0.6e9, 0.7, false]],
        );
        assert.deepEqual(total, { bytes: 1.8e9, gb: 2, over: false });
        const two = sizes([pnpm(M), { ...pnpm(M), key: `node-cache-Linux-x64-pnpm-${H2}` }], file);
        assert.equal(two.rows[0].over, true);
    });

    it("finds a budget row in ci-budgets.json for every real family, the import graphs included", () => {
        const file = loadBudgets();
        const { rows } = sizes(
            [
                { key: `test-select-graphs-${H1}`, ref: M, size_in_bytes: 1e7 },
                { key: `lfs-graphty-${H1}`, ref: M, size_in_bytes: 1 },
                { key: "playwright-Linux-1.57.0", ref: M, size_in_bytes: 1 },
            ],
            file,
        );
        const gb = Object.fromEntries(rows.map((r) => [r.family, r.gb]));
        assert.equal(gb["test-select-graphs"], file.budgets["cache:test-select-graphs"].gb);
        assert.equal(gb["lfs-graphty"], file.budgets["cache:lfs-*"].gb);
        assert.equal(gb["playwright-Linux"], file.budgets["cache:playwright-*"].gb);
        // no cache budget carries a field nothing reads
        for (const [k, v] of Object.entries(file.budgets).filter(([k]) => k.startsWith("cache:")))
            assert.deepEqual(Object.keys(v).sort(), ["gb", "why"], k);
    });
});
