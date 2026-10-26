#!/usr/bin/env node
// Actions cache hygiene (#3431), run by ci.yml's "Cache hygiene" job on every green master build.
// A key's family is the key without its trailing content hash or run id and without dotted versions:
// `lfs-graphty-<sha256>` is `lfs-graphty`, `test-durations-graph-io-<run id>-<attempt>` is
// `test-durations-graph-io`, `playwright-Linux-1.57.0` is `playwright-Linux`. Two kinds of cache are
// deleted:
//   - every cache of a closed or merged pull request's ref: nothing but that ref can restore it;
//   - on any other ref, a key of a family that is not the family's most recently READ key there and
//     that nothing has read for KEEP_HOURS. A key's last read, not its creation, says it is live: a
//     pull request with no cache of its own exact-hits its base branch's older key (setup-node's pnpm
//     cache has no restore-keys), and after a revert the older key is the one in use again.
// So a ref keeps one key per family plus whatever was read in the last KEEP_HOURS hours: one LFS key per
// project, one test-select-graphs (import graph) key, one pnpm store per OS, once the old ones go cold.
//
//   node tools/cache-hygiene.mjs <caches.ndjson> <open-prs.txt> [--apply]
//       reads the repository's caches (the API's actions_caches entries, one JSON object per line) and the
//       open pull request numbers (one per line); with --apply deletes the caches above (gh api, needs
//       GH_TOKEN and GITHUB_REPOSITORY), else only lists them. Then prints each family's size against
//       ci-budgets.json (`cache:<family>` per ref, `bytes:actions-cache` in all), counting a cache whose
//       delete failed as still there, with a warning annotation per budget exceeded.
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { budgetFor, loadBudgets } from "./ci-budgets.mjs";

const GB = 1e9;
export const KEEP_HOURS = 24;

/**
 * A cache key's family.
 * @param key an Actions cache key
 * @returns the key without its trailing hashes (16 or more hex digits), run id with attempt, and versions
 */
export function family(key) {
    return key.replace(/(?:-(?:[0-9a-f]{16,}|\d{6,}-\d+))+$/i, "").replaceAll(/-\d+(?:\.\d+)+(?=-|$)/g, "");
}

/**
 * Families whose every run writes a new key and none restores an older one (CodeQL's overlay databases, one
 * key per commit and run): only the newest key per ref is kept, at once, never for the 24-hour window.
 */
const AT_ONCE = /^codeql/i;

const slot = (c) => `${c.ref}\u0000${family(c.key)}`;
const readAt = (c) => Date.parse(c.last_accessed_at ?? c.created_at);
// the newest key of a delete-at-once family is its keeper; elsewhere the most recently read one
const keepBy = (c) => (AT_ONCE.test(family(c.key)) ? Date.parse(c.created_at) : readAt(c));
const prOf = (ref) => /^refs\/pull\/(\d+)\//.exec(ref)?.[1];

/**
 * The caches to delete, each with its reason.
 * @param caches `{ id, key, ref, last_accessed_at, created_at }[]`
 * @param openPrs the open pull request numbers
 * @param now the time to judge "read recently" by, in ms
 * @returns `{ cache, why }[]`
 */
export function toDelete(caches, openPrs, now = Date.now()) {
    const open = new Set([...openPrs].map(String));
    const keeper = new Map();
    for (const c of caches) {
        const k = keeper.get(slot(c));
        if (!k || keepBy(c) > keepBy(k)) keeper.set(slot(c), c);
    }
    const out = [];
    for (const c of caches) {
        const pr = prOf(c.ref);
        if (pr && !open.has(pr)) out.push({ cache: c, why: `pull request #${pr} is closed` });
        else if (keeper.get(slot(c)) === c) continue;
        else if (AT_ONCE.test(family(c.key)))
            out.push({
                cache: c,
                why: `superseded by ${keeper.get(slot(c)).key}, a family no run restores by an older key`,
            });
        else if (now - readAt(c) > KEEP_HOURS * 3600e3)
            out.push({ cache: c, why: `superseded by ${keeper.get(slot(c)).key}, unread for ${KEEP_HOURS} h` });
    }
    return out;
}

/**
 * Each family's size against its budget, which is per ref, and the total against `bytes:actions-cache`.
 * @param caches the caches that remain
 * @param file the parsed ci-budgets.json
 * @returns `{ rows: { family, keys, refs, bytes, perRef, gb, over }[] }` largest first, and `total`
 */
export function sizes(caches, file) {
    const by = new Map();
    for (const c of caches) {
        const f = family(c.key);
        const row = by.get(f) ?? { family: f, keys: 0, bytes: 0, byRef: new Map() };
        row.keys += 1;
        row.bytes += c.size_in_bytes ?? 0;
        row.byRef.set(c.ref, (row.byRef.get(c.ref) ?? 0) + (c.size_in_bytes ?? 0));
        by.set(f, row);
    }
    const rows = [...by.values()]
        .map(({ byRef, ...r }) => {
            const perRef = Math.max(...byRef.values());
            const gb = budgetFor(file, `cache:${r.family}`)?.gb;
            return { ...r, refs: byRef.size, perRef, gb, over: gb !== undefined && perRef > gb * GB };
        })
        .sort((a, b) => b.bytes - a.bytes);
    const bytes = rows.reduce((s, r) => s + r.bytes, 0);
    const gb = budgetFor(file, "bytes:actions-cache")?.gb;
    return { rows, total: { bytes, gb, over: gb !== undefined && bytes > gb * GB } };
}

const fmt = (bytes) => `${(bytes / GB).toFixed(2)} GB`;
const lines = (path) =>
    readFileSync(path, "utf8")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

function deleteCache(id) {
    const r = spawnSync("gh", ["api", "-X", "DELETE", `repos/${process.env.GITHUB_REPOSITORY}/actions/caches/${id}`]);
    return r.status === 0;
}

function main(argv) {
    const apply = argv.includes("--apply");
    const [input, prs] = argv.filter((a) => a !== "--apply");
    if (!input || !prs) {
        console.error("usage: cache-hygiene.mjs <caches.ndjson> <open-prs.txt> [--apply]");
        return 2;
    }
    const caches = lines(input).map((l) => JSON.parse(l));
    const gone = toDelete(caches, lines(prs));
    const failed = new Set();
    for (const { cache, why } of gone) {
        let verb = "would delete";
        if (apply) verb = deleteCache(cache.id) ? "deleted" : "FAILED";
        if (verb === "FAILED") failed.add(cache.id);
        console.log(`${verb} ${cache.ref} ${cache.key}: ${why}`);
    }
    for (const id of failed) console.log(`::warning::cache ${id}: delete failed`);
    const removed = new Set(apply ? gone.map((g) => g.cache.id).filter((id) => !failed.has(id)) : []);
    const { rows, total } = sizes(
        caches.filter((c) => !removed.has(c.id)),
        loadBudgets(),
    );
    const out = [
        apply
            ? `### Actions caches: ${caches.length} keys, ${removed.size} deleted, ${failed.size} failed to delete`
            : `### Actions caches: ${caches.length} keys, ${gone.length} to delete (dry run, nothing deleted)`,
        "",
        `${fmt(total.bytes)} left (budget ${total.gb ?? "none"} GB, bytes:actions-cache)`,
        "",
        "| family | keys | refs | size | largest on one ref | budget per ref |",
        "| --- | --- | --- | --- | --- | --- |",
        ...rows.map(
            (r) =>
                `| ${r.family} | ${r.keys} | ${r.refs} | ${fmt(r.bytes)} | ${fmt(r.perRef)} | ${r.gb ?? "none"} GB${r.over ? " OVER" : ""} |`,
        ),
    ];
    console.log(out.join("\n"));
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${out.join("\n")}\n`);
    for (const r of rows.filter((x) => x.over))
        console.log(
            `::warning::cache family ${r.family} holds ${fmt(r.perRef)} on one ref, over its ${r.gb} GB budget`,
        );
    if (total.over) console.log(`::warning::Actions caches hold ${fmt(total.bytes)}, over the ${total.gb} GB budget`);
    return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
